import { asArray } from '../../core/util.js';

/**
 * Quest tracking.
 *
 * Quests are pure data (data/quests/*.json). Objectives progress automatically
 * from game events, so content never needs code to advance a quest:
 *
 *   talk     'npc:talked'        { npc }            target = npc id
 *   inspect  'object:inspected'  { id, tags }       target = "map:object" or tag
 *   visit    'map:entered'       { map }            target = map id
 *            'region:entered'    { region }         target = region id
 *   defeat   'battle:won'        { encounter, tags, enemies }
 *                                target = encounter id | tag | enemy (+count)
 *            or world state      objects = ["map:enemyObject", ...] (+count):
 *                                counts map enemies already beaten, so
 *                                fights before the objective opens still count
 *   obtain   inventory count of `item` >= count (checked continuously)
 *   event    'script:event'      { name }           target = event name
 *   flag     story flag `target` is set
 *   manual   only via the completeObjective script command
 *
 * An objective only progresses while it is *available*: quest active,
 * prerequisites (`after`) complete, and not already done. One event advances
 * only objectives that were available *before* it, so a single conversation
 * can't tick off a whole chain of "talk to X" steps at once.
 */
export const OBJECTIVE_TYPES = ['talk', 'inspect', 'visit', 'defeat', 'obtain', 'event', 'flag', 'manual'];

export class QuestSystem {
  constructor({ quests, session, bus }) {
    this.defs = quests; // registry
    this.session = session;
    this.bus = bus;
    this.state = new Map(); // questId -> { status, objectives: { oid: { progress, done } } }
    this.unsubscribers = [];
    if (bus) this.attach(bus);
  }

  attach(bus) {
    const on = (event, fn) => this.unsubscribers.push(bus.on(event, fn, this));
    on('npc:talked', (e) => this.onEvent('talk', (o) => o.target === e.npc));
    on('object:inspected', (e) =>
      this.onEvent('inspect', (o) => o.target === e.id || (o.tag && asArray(e.tags).includes(o.tag))),
    );
    on('map:entered', (e) => this.onEvent('visit', (o) => o.target === e.map));
    on('region:entered', (e) => this.onEvent('visit', (o) => o.target === e.region));
    on('battle:won', (e) => this.onBattleWon(e));
    on('script:event', (e) => this.onEvent('event', (o) => o.target === e.name));
    on('story:flagSet', () => this.refreshStateObjectives());
    on('inventory:changed', () => this.refreshStateObjectives());
    on('world:objectChanged', () => this.refreshStateObjectives());
  }

  detach() {
    this.unsubscribers.forEach((off) => off());
    this.unsubscribers = [];
  }

  def(id) {
    const def = this.defs.get(id);
    if (!def) throw new Error(`Unknown quest "${id}"`);
    return def;
  }

  objectiveDef(questId, objectiveId) {
    const obj = this.def(questId).objectives.find((o) => o.id === objectiveId);
    if (!obj) throw new Error(`Quest "${questId}" has no objective "${objectiveId}"`);
    return obj;
  }

  status(id) {
    this.def(id);
    return this.state.get(id)?.status ?? 'inactive';
  }

  isActive(id) {
    return this.status(id) === 'active';
  }

  isCompleted(id) {
    return this.status(id) === 'completed';
  }

  objState(questId, objectiveId) {
    return this.state.get(questId)?.objectives?.[objectiveId] ?? { progress: 0, done: false };
  }

  isObjectiveDone(questId, objectiveId) {
    this.objectiveDef(questId, objectiveId);
    return this.objState(questId, objectiveId).done === true;
  }

  isObjectiveAvailable(questId, objectiveId) {
    if (this.status(questId) !== 'active') return false;
    const obj = this.objectiveDef(questId, objectiveId);
    if (this.objState(questId, objectiveId).done) return false;
    return asArray(obj.after).every((pre) => this.objState(questId, pre).done);
  }

  /** Objectives to display in the quest log (hidden ones appear once available). */
  visibleObjectives(questId) {
    const def = this.def(questId);
    const status = this.status(questId);
    return def.objectives
      .map((o) => {
        const st = this.objState(questId, o.id);
        const available = status === 'active' && !st.done && asArray(o.after).every((pre) => this.objState(questId, pre).done);
        return { def: o, done: st.done, progress: st.progress, count: o.count ?? 1, available };
      })
      .filter((o) => o.done || o.available);
  }

  activeQuests() {
    return this.defs.list().filter((q) => this.status(q.id) === 'active');
  }

  completedQuests() {
    return this.defs.list().filter((q) => this.status(q.id) === 'completed');
  }

  start(id) {
    const def = this.def(id);
    if (this.status(id) !== 'inactive') return false;
    const objectives = {};
    for (const o of def.objectives) objectives[o.id] = { progress: 0, done: false };
    this.state.set(id, { status: 'active', objectives });
    this.bus?.emit('quest:started', { quest: def });
    this.refreshStateObjectives();
    return true;
  }

  /** Adds progress to an objective; completes it when progress reaches `count`. */
  advanceObjective(questId, objectiveId, amount = 1) {
    if (!this.isObjectiveAvailable(questId, objectiveId)) return false;
    const obj = this.objectiveDef(questId, objectiveId);
    const st = this.state.get(questId).objectives[objectiveId];
    const count = obj.count ?? 1;
    st.progress = Math.min(count, st.progress + amount);
    this.bus?.emit('quest:objectiveProgress', { quest: this.def(questId), objective: obj, progress: st.progress, count });
    if (st.progress >= count) this.finishObjective(questId, objectiveId);
    return true;
  }

  /** Forces an objective complete (script command / debug). Prerequisites are not required. */
  completeObjective(questId, objectiveId, { force = false } = {}) {
    if (this.status(questId) !== 'active') return false;
    const obj = this.objectiveDef(questId, objectiveId);
    const st = this.state.get(questId).objectives[objectiveId];
    if (st.done) return false;
    if (!force && !asArray(obj.after).every((pre) => this.objState(questId, pre).done)) return false;
    st.progress = obj.count ?? 1;
    this.finishObjective(questId, objectiveId);
    return true;
  }

  finishObjective(questId, objectiveId) {
    const def = this.def(questId);
    const obj = this.objectiveDef(questId, objectiveId);
    const st = this.state.get(questId).objectives[objectiveId];
    if (st.done) return;
    st.done = true;
    this.bus?.emit('quest:objectiveCompleted', { quest: def, objective: obj });
    const required = def.objectives.filter((o) => !o.optional);
    const allDone = required.every((o) => this.objState(questId, o.id).done);
    if (allDone && def.autoComplete !== false) this.complete(questId);
    else this.refreshStateObjectives();
  }

  complete(questId) {
    const def = this.def(questId);
    const status = this.status(questId);
    if (status === 'completed') return false;
    if (status === 'inactive') this.start(questId);
    const entry = this.state.get(questId);
    entry.status = 'completed';
    for (const o of def.objectives) {
      if (!o.optional) entry.objectives[o.id] = { progress: o.count ?? 1, done: true };
    }
    const rewards = this.session?.grantRewards ? this.session.grantRewards(def.rewards || {}) : null;
    this.bus?.emit('quest:completed', { quest: def, rewards });
    this.refreshStateObjectives();
    return true;
  }

  reset(questId) {
    this.def(questId);
    this.state.delete(questId);
    this.bus?.emit('quest:reset', { quest: this.def(questId) });
  }

  /** Objectives available right now (snapshot taken before an event is applied). */
  availableObjectives(filter) {
    const out = [];
    for (const quest of this.activeQuests()) {
      for (const obj of quest.objectives) {
        if (filter(obj) && this.isObjectiveAvailable(quest.id, obj.id)) out.push([quest, obj]);
      }
    }
    return out;
  }

  onEvent(type, matches) {
    for (const [quest, obj] of this.availableObjectives((o) => o.type === type && matches(o))) {
      if (this.isObjectiveAvailable(quest.id, obj.id)) this.advanceObjective(quest.id, obj.id, 1);
    }
  }

  onBattleWon({ encounter, tags = [], enemies = [] }) {
    // Objectives listing map `objects` count from world state instead.
    for (const [quest, obj] of this.availableObjectives((o) => o.type === 'defeat' && !o.objects)) {
      if (!this.isObjectiveAvailable(quest.id, obj.id)) continue;
      let amount = 0;
      if (obj.enemy) amount = enemies.filter((e) => e === obj.enemy).length;
      else if (obj.tag) amount = tags.includes(obj.tag) ? 1 : 0;
      else if (obj.target) amount = obj.target === encounter ? 1 : 0;
      if (amount > 0) this.advanceObjective(quest.id, obj.id, amount);
    }
  }

  /**
   * Re-checks objectives that depend on current state rather than a one-off
   * event (items held, flags set, current map). Called whenever state that
   * could satisfy them changes.
   */
  refreshStateObjectives() {
    if (this.refreshing) return;
    this.refreshing = true;
    try {
      let changed = true;
      while (changed) {
        changed = false;
        for (const quest of this.activeQuests()) {
          for (const obj of quest.objectives) {
            if (!this.isObjectiveAvailable(quest.id, obj.id)) continue;
            if (obj.type === 'obtain') {
              const have = this.session?.inventory?.count(obj.item) ?? 0;
              const st = this.state.get(quest.id).objectives[obj.id];
              const count = obj.count ?? 1;
              const progress = Math.min(have, count);
              if (progress !== st.progress) {
                st.progress = progress;
                this.bus?.emit('quest:objectiveProgress', { quest, objective: obj, progress, count });
              }
              if (have >= count) {
                this.finishObjective(quest.id, obj.id);
                changed = true;
              }
            } else if (obj.type === 'flag' && this.session?.story?.has(obj.target)) {
              this.finishObjective(quest.id, obj.id);
              changed = true;
            } else if (obj.type === 'visit' && this.session?.location?.map === obj.target) {
              this.finishObjective(quest.id, obj.id);
              changed = true;
            } else if (obj.type === 'defeat' && obj.objects && this.session?.world) {
              const beaten = obj.objects.filter((ref) => this.session.world.isDefeated(ref)).length;
              const st = this.state.get(quest.id).objectives[obj.id];
              const count = obj.count ?? obj.objects.length;
              const progress = Math.min(beaten, count);
              if (progress !== st.progress) {
                st.progress = progress;
                this.bus?.emit('quest:objectiveProgress', { quest, objective: obj, progress, count });
              }
              if (beaten >= count) {
                this.finishObjective(quest.id, obj.id);
                changed = true;
              }
            }
          }
        }
      }
    } finally {
      this.refreshing = false;
    }
  }

  serialize() {
    const out = {};
    for (const [id, entry] of this.state) out[id] = { status: entry.status, objectives: entry.objectives };
    return out;
  }

  load(data = {}, onWarning = console.warn) {
    this.state = new Map();
    for (const [id, entry] of Object.entries(data)) {
      if (!this.defs.has(id)) {
        onWarning(`Save references unknown quest "${id}" — dropped.`);
        continue;
      }
      const def = this.defs.get(id);
      const objectives = {};
      for (const o of def.objectives) {
        const saved = entry.objectives?.[o.id];
        objectives[o.id] = { progress: saved?.progress ?? 0, done: saved?.done === true };
      }
      const status = entry.status === 'completed' ? 'completed' : 'active';
      this.state.set(id, { status, objectives });
    }
  }
}
