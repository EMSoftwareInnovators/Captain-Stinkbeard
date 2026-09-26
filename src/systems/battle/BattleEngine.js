import { Combatant } from './Combatant.js';
import { computeDamage, critChance, fleeChance, hitChance } from './damage.js';
import { timingMultiplier } from './timing.js';
import { applyEffect } from '../effects/effects.js';
import { asArray } from '../../core/util.js';

/**
 * Turn-based battle rules, independent of any rendering.
 *
 * The battle scene drives it step by step:
 *
 *   engine.start()                       -> events
 *   loop:
 *     { actor } = engine.nextTurn()       (null actor = battle over)
 *     action = actor is party ? <player menu> : engine.chooseEnemyAction(actor)
 *     { events } = engine.execute(actor, action, { timing, guard })
 *     events = engine.endTurn(actor)
 *   engine.outcome                        'win' | 'lose' | 'fled'
 *   engine.rewards()                      on win
 *   engine.finish()                       writes HP back to the party
 *
 * Every mutation is reported as a presentation event so the scene can animate
 * it; the engine itself never waits for anything.
 */
export class BattleEngine {
  constructor({ content, session, encounterId, rng, advantage = 'normal' }) {
    this.content = content;
    this.session = session;
    this.encounter = content.encounters.require(encounterId);
    this.rng = rng;
    this.advantage = advantage; // 'normal' | 'preemptive' | 'ambush'
    this.round = 0;
    this.queue = [];
    this.outcome = null;
    this.fleeAttempts = 0;
    this.turnCount = 0;
    this.defeatedEnemies = [];
    this.enemyCounter = 0;

    this.party = session.party.members.map((ch, i) => this.createPartyCombatant(ch, i));
    this.enemies = [];
    for (const enemyId of this.encounter.enemies) this.addEnemy(enemyId);
  }

  createPartyCombatant(character, index) {
    const def = character.def;
    const abilities = [def.battle?.attack, ...character.abilities].filter(Boolean);
    return new Combatant({
      uid: `p${index}`,
      side: 'party',
      name: character.name,
      def,
      stats: character.stats(),
      hp: character.hp,
      abilities: [...new Set(abilities)],
      statuses: this.content.statuses,
      character,
      resource: def.battle?.resource ?? null,
      index,
    });
  }

  addEnemy(enemyId) {
    const def = this.content.enemies.require(enemyId);
    const sameKind = this.enemies.filter((e) => e.def.id === enemyId).length;
    const c = new Combatant({
      uid: `e${this.enemyCounter++}`,
      side: 'enemy',
      name: def.name,
      def,
      stats: { ...def.stats },
      hp: def.stats.maxHp,
      abilities: def.abilities,
      statuses: this.content.statuses,
      index: this.enemies.length,
    });
    c.letter = sameKind; // used for "Bilge Rat B" style naming
    this.enemies.push(c);
    this.relabelEnemies();
    return c;
  }

  /** Duplicate enemy names get letters: Bilge Rat A, Bilge Rat B. */
  relabelEnemies() {
    const counts = {};
    for (const e of this.enemies) counts[e.def.id] = (counts[e.def.id] || 0) + 1;
    const seen = {};
    for (const e of this.enemies) {
      if (counts[e.def.id] > 1) {
        const n = seen[e.def.id] || 0;
        seen[e.def.id] = n + 1;
        e.name = `${e.def.name} ${String.fromCharCode(65 + n)}`;
      } else {
        e.name = e.def.name;
      }
    }
  }

  all() {
    return [...this.party, ...this.enemies];
  }

  get(uid) {
    return this.all().find((c) => c.uid === uid) || null;
  }

  opponentsOf(c) {
    return c.side === 'party' ? this.enemies : this.party;
  }

  alliesOf(c) {
    return c.side === 'party' ? this.party : this.enemies;
  }

  start() {
    const events = [{ type: 'start', advantage: this.advantage }];
    if (this.advantage === 'preemptive') events.push({ type: 'message', text: 'Preemptive strike! The enemy is caught off guard!' });
    if (this.advantage === 'ambush') events.push({ type: 'message', text: 'Ambushed! The enemy strikes first!' });
    return events;
  }

  /** Initiative = speed plus up to +20% random swing; party wins ties. */
  buildQueue() {
    let pool = this.all().filter((c) => c.isAlive());
    if (this.round === 1 && this.advantage === 'preemptive') pool = pool.filter((c) => c.side === 'party');
    if (this.round === 1 && this.advantage === 'ambush') pool = pool.filter((c) => c.side === 'enemy');
    const rolled = pool.map((c) => ({ c, init: Math.floor((c.stat('speed') * this.rng.int(100, 120)) / 100) }));
    rolled.sort((a, b) => b.init - a.init || (a.c.side === 'party' ? -1 : 1) || a.c.index - b.c.index);
    return rolled.map((r) => r.c);
  }

  /** Upcoming actors (for the turn-order display). */
  upcoming() {
    return this.queue.filter((c) => c.isAlive());
  }

  nextTurn() {
    const events = [];
    if (this.outcome) return { actor: null, events };
    while (true) {
      if (this.queue.length === 0) {
        this.round += 1;
        this.queue = this.buildQueue();
        events.push({ type: 'round', round: this.round, order: this.queue.map((c) => c.uid) });
        if (this.queue.length === 0) {
          this.outcome = this.checkOutcome() ?? 'lose';
          return { actor: null, events };
        }
      }
      const actor = this.queue.shift();
      if (!actor.isAlive()) continue;
      this.turnCount += 1;
      actor.turnsTaken = (actor.turnsTaken || 0) + 1;
      actor.actedThisTurn = true;
      // Statuses that last "until your next turn" (e.g. guarding) end now.
      for (const id of actor.statusIds()) {
        if (this.content.statuses.get(id)?.expires === 'turnStart') {
          actor.removeStatus(id);
          events.push({ type: 'statusEnd', target: actor.uid, status: id });
        }
      }
      events.push({ type: 'turn', actor: actor.uid });
      return { actor, events };
    }
  }

  ability(id) {
    return this.content.abilities.require(id);
  }

  /** Menu options for a party member. */
  availableActions(actor) {
    const attackId = actor.def.battle?.attack ?? actor.abilities[0];
    const orders = actor.abilities
      .filter((id) => id !== attackId)
      .map((id) => this.ability(id))
      .map((ab) => ({ ability: ab, affordable: actor.canAfford(ab.cost) }));
    const items = this.session.inventory
      .entries({ type: 'consumable' })
      .filter((e) => asArray(e.def.use?.context ?? ['field', 'battle']).includes('battle'));
    return { attack: this.ability(attackId), orders, items, canFlee: this.encounter.canFlee !== false };
  }

  /** Candidate targets for a target type, from the actor's point of view. */
  targetsFor(actor, targetType) {
    switch (targetType) {
      case 'self':
        return [actor];
      case 'ally':
      case 'allies':
        return this.alliesOf(actor).filter((c) => c.isAlive());
      case 'allyAny':
        return this.alliesOf(actor);
      case 'enemy':
      case 'enemies':
        return this.opponentsOf(actor).filter((c) => c.isAlive());
      default:
        throw new Error(`Unknown target type "${targetType}"`);
    }
  }

  /** Picks an enemy action from its weighted, conditional AI table. */
  chooseEnemyAction(actor) {
    const table = actor.def.ai?.length ? actor.def.ai : actor.abilities.map((a) => ({ ability: a, weight: 1 }));
    const options = [];
    for (const entry of table) {
      const ab = this.ability(entry.ability);
      if (!actor.canAfford(ab.cost)) continue;
      const cond = entry.if || {};
      const hpPct = Math.floor((actor.hp * 100) / actor.maxHp);
      if (cond.selfHpBelow !== undefined && !(hpPct < cond.selfHpBelow)) continue;
      if (cond.selfHpAbove !== undefined && !(hpPct > cond.selfHpAbove)) continue;
      const alliesAlive = this.alliesOf(actor).filter((c) => c.isAlive()).length;
      if (cond.alliesAliveBelow !== undefined && !(alliesAlive < cond.alliesAliveBelow)) continue;
      if (cond.turnMultiple !== undefined && (actor.turnsTaken || 0) % cond.turnMultiple !== 0) continue;
      if (cond.chance !== undefined && !this.rng.chance(cond.chance / 100)) continue;
      let targets = this.targetsFor(actor, ab.target === 'self' ? 'self' : ab.target);
      if (cond.targetLacksStatus) targets = targets.filter((t) => !t.hasStatus(cond.targetLacksStatus));
      if (ab.kind !== 'summon' && targets.length === 0) continue;
      if (ab.kind === 'summon' && this.enemies.filter((e) => e.isAlive()).length >= (ab.maxAllies ?? 4)) continue;
      options.push({ weight: entry.weight ?? 1, ability: ab, targets });
    }
    if (options.length === 0) return { type: 'defend' };
    const pick = this.rng.weighted(options);
    const single = ['enemy', 'ally'].includes(pick.ability.target);
    const targets = single ? [this.rng.pick(pick.targets)] : pick.targets;
    return { type: 'ability', ability: pick.ability.id, targets: targets.map((t) => t.uid) };
  }

  /**
   * Resolves an action.
   * @param {Combatant} actor
   * @param {{type:'ability'|'item'|'defend'|'flee', ability?:string, item?:string, targets?:string[]}} action
   * @param {{timing?:string, guard?:string}} opts timing grade of the actor's
   *   timed input, and guard grade of a defending party member.
   */
  execute(actor, action, opts = {}) {
    if (this.outcome) return { events: [] };
    let events;
    switch (action.type) {
      case 'ability':
        events = this.executeAbility(actor, this.ability(action.ability), action.targets || [], opts);
        break;
      case 'item':
        events = this.executeItem(actor, action.item, action.targets || []);
        break;
      case 'defend':
        events = this.executeDefend(actor);
        break;
      case 'flee':
        events = this.executeFlee(actor);
        break;
      default:
        throw new Error(`Unknown battle action "${action.type}"`);
    }
    const outcome = this.checkOutcome();
    if (outcome && !this.outcome) {
      this.outcome = outcome;
      events.push({ type: 'outcome', outcome });
    }
    return { events };
  }

  resolveTargets(actor, ability, uids) {
    let targets = uids.map((u) => this.get(u)).filter(Boolean);
    const type = ability.target;
    if (type === 'enemies' || type === 'allies') return this.targetsFor(actor, type);
    if (type === 'self') return [actor];
    // Single target died before this action resolved: retarget like classic RPGs.
    if (targets.length === 0 || !targets[0].isAlive()) {
      const pool = this.targetsFor(actor, type === 'ally' ? 'ally' : 'enemy');
      targets = pool.length ? [this.rng.pick(pool)] : [];
    }
    return targets;
  }

  executeAbility(actor, ability, uids, opts) {
    const events = [];
    if (!actor.canAfford(ability.cost)) {
      events.push({ type: 'message', text: `Not enough ${actor.resource?.name ?? 'resources'}!` });
      return events;
    }
    actor.spend(ability.cost);
    if (ability.cost && actor.resource) {
      events.push({ type: 'resource', target: actor.uid, value: actor.resource.current });
    }
    events.push({ type: 'use', actor: actor.uid, ability: ability.id, kind: ability.kind });

    if (ability.kind === 'summon') {
      const alive = this.enemies.filter((e) => e.isAlive()).length;
      if (alive < (ability.maxAllies ?? 4)) {
        const c = this.addEnemy(ability.summon);
        events.push({ type: 'summon', target: c.uid, enemy: ability.summon });
      } else {
        events.push({ type: 'message', text: 'But nobody came.' });
      }
      return events;
    }

    const targets = this.resolveTargets(actor, ability, uids);
    const mechanic = ability.timing ? this.content.timing.get(ability.timing) : null;
    const grade = opts.timing ?? 'none';

    for (const target of targets) {
      const hits = ability.hits ?? 1;
      for (let h = 0; h < hits && target.isAlive(); h++) {
        if ((ability.power ?? 0) > 0) {
          const timed = mechanic && grade !== 'none';
          const acc = ability.accuracy ?? 95;
          const hitPct = hitChance(acc, actor.stat('luck'), target.stat('luck'));
          if (!timed && !ability.sureHit && this.rng.int(1, 100) > hitPct) {
            events.push({ type: 'miss', actor: actor.uid, target: target.uid });
            continue;
          }
          const crit = this.rng.int(1, 100) <= critChance(actor.stat('luck'), ability.critBonus ?? 0) || (timed && grade === 'perfect' && mechanic.perfectCrits);
          let takenMult = target.damageTakenMultiplier();
          if (target.side === 'party' && opts.guard && opts.guard !== 'none') {
            const guard = this.content.timing.get('guard');
            takenMult *= guard?.reduction?.[opts.guard] ?? 1;
          }
          const amount = computeDamage({
            attack: actor.stat('attack'),
            defense: target.stat('defense'),
            power: ability.power,
            rng: this.rng,
            crit,
            timingMult: timingMultiplier(mechanic, grade),
            takenMult,
          });
          const dealt = target.takeDamage(amount);
          events.push({
            type: 'damage', actor: actor.uid, target: target.uid, amount: dealt, crit, grade, guard: opts.guard ?? 'none', killed: !target.isAlive(),
          });
          if (!target.isAlive()) this.onKnockedOut(target, events);
        }
        if (target.isAlive() || (ability.effects || []).some((e) => e.type === 'revive')) {
          for (const effect of ability.effects || []) {
            const res = applyEffect(effect, target, { rng: this.rng, statuses: this.content.statuses });
            events.push(this.effectEvent(target, res));
          }
        }
      }
    }

    // Timed hits build the actor's command resource.
    const gain = actor.resource?.onTiming?.[grade];
    if (gain) {
      const got = actor.restoreResource(actor.resource.id, gain);
      if (got) events.push({ type: 'resource', target: actor.uid, value: actor.resource.current, gained: got });
    }
    return events.filter(Boolean);
  }

  effectEvent(target, res) {
    switch (res.type) {
      case 'heal':
        return { type: 'heal', target: target.uid, amount: res.amount };
      case 'revive':
        return { type: 'revive', target: target.uid, amount: res.amount };
      case 'cure':
        return res.removed.length ? { type: 'cure', target: target.uid, statuses: res.removed } : null;
      case 'status':
        return { type: 'status', target: target.uid, status: res.status, applied: res.applied, resisted: !!res.resisted };
      case 'restore':
        return { type: 'resource', target: target.uid, value: target.resource?.current ?? 0, gained: res.amount };
      default:
        return null;
    }
  }

  onKnockedOut(target, events) {
    events.push({ type: 'ko', target: target.uid });
    if (target.side === 'enemy') this.defeatedEnemies.push(target.def.id);
    this.queue = this.queue.filter((c) => c !== target);
  }

  executeItem(actor, itemId, uids) {
    const events = [];
    const def = this.content.items.require(itemId);
    if (!this.session.inventory.remove(itemId, 1)) {
      events.push({ type: 'message', text: `No ${def.name} left!` });
      return events;
    }
    events.push({ type: 'useItem', actor: actor.uid, item: itemId });
    const targetType = def.use?.target ?? 'ally';
    let targets;
    if (targetType === 'allies') targets = this.targetsFor(actor, 'allies');
    else if (targetType === 'enemies') targets = this.targetsFor(actor, 'enemies');
    else {
      targets = uids.map((u) => this.get(u)).filter(Boolean);
      if (targets.length === 0) targets = [actor];
    }
    for (const target of targets) {
      for (const effect of def.use?.effects || []) {
        const res = applyEffect(effect, target, { rng: this.rng, statuses: this.content.statuses });
        events.push(this.effectEvent(target, res));
      }
    }
    return events.filter(Boolean);
  }

  executeDefend(actor) {
    actor.addStatus('defending', 1);
    const events = [{ type: 'defend', actor: actor.uid }];
    const gain = actor.resource?.onDefend;
    if (gain) {
      const got = actor.restoreResource(actor.resource.id, gain);
      if (got) events.push({ type: 'resource', target: actor.uid, value: actor.resource.current, gained: got });
    }
    return events;
  }

  executeFlee(actor) {
    if (this.encounter.canFlee === false) return [{ type: 'flee', actor: actor.uid, success: false, blocked: true }];
    const avg = (list) => Math.floor(list.reduce((s, c) => s + c.stat('speed'), 0) / Math.max(1, list.length));
    const chance = fleeChance(avg(this.party.filter((c) => c.isAlive())), avg(this.enemies.filter((c) => c.isAlive())), this.fleeAttempts);
    this.fleeAttempts += 1;
    const success = this.rng.int(1, 100) <= chance;
    if (success) this.outcome = 'fled';
    return [{ type: 'flee', actor: actor.uid, success }];
  }

  /** End-of-turn upkeep: damage-over-time ticks and status countdowns. */
  endTurn(actor) {
    const events = [];
    if (actor.isAlive()) {
      for (const id of actor.statusIds()) {
        const def = this.content.statuses.get(id);
        if (def?.tick?.damagePercent) {
          const amount = Math.max(def.tick.min ?? 1, Math.floor((actor.maxHp * def.tick.damagePercent) / 100));
          const dealt = actor.takeDamage(amount);
          events.push({ type: 'tick', target: actor.uid, status: id, amount: dealt, killed: !actor.isAlive() });
          if (!actor.isAlive()) {
            this.onKnockedOut(actor, events);
            break;
          }
        }
      }
      for (const [id, st] of [...actor.statuses.entries()]) {
        const def = this.content.statuses.get(id);
        if (def?.expires === 'turnStart') continue;
        if (st.fresh) {
          st.fresh = false;
          continue;
        }
        st.turns -= 1;
        if (st.turns <= 0) {
          actor.removeStatus(id);
          events.push({ type: 'statusEnd', target: actor.uid, status: id });
        }
      }
    }
    actor.actedThisTurn = false;
    const outcome = this.checkOutcome();
    if (outcome && !this.outcome) {
      this.outcome = outcome;
      events.push({ type: 'outcome', outcome });
    }
    return events;
  }

  checkOutcome() {
    if (this.outcome) return this.outcome;
    if (this.party.every((c) => !c.isAlive())) return 'lose';
    if (this.enemies.every((c) => !c.isAlive())) return 'win';
    return null;
  }

  /** XP, gold and drops for a won battle (drops rolled once, here). */
  rewards() {
    if (this.cachedRewards) return this.cachedRewards;
    let xp = 0;
    let gold = 0;
    const items = [];
    const luck = Math.max(...this.party.map((c) => c.stat('luck')), 0);
    for (const e of this.enemies) {
      xp += e.def.xp ?? 0;
      const [min, max] = asArray(e.def.gold ?? [0, 0]);
      gold += this.rng.int(min ?? 0, max ?? min ?? 0);
      for (const drop of e.def.drops || []) {
        const pct = Math.min(100, Math.floor(drop.chance * 100) + Math.floor(luck / 3));
        if (this.rng.int(1, 100) <= pct) {
          const existing = items.find((i) => i.id === drop.item);
          if (existing) existing.count += drop.count ?? 1;
          else items.push({ id: drop.item, count: drop.count ?? 1 });
        }
      }
    }
    this.cachedRewards = { xp, gold, items };
    return this.cachedRewards;
  }

  /** Copies battle HP back onto the party. Knocked-out members recover 1 HP after a win or escape. */
  finish() {
    for (const c of this.party) {
      if (!c.character) continue;
      c.character.hp = this.outcome === 'lose' ? c.hp : Math.max(1, c.hp);
      c.character.clampHp();
    }
  }
}
