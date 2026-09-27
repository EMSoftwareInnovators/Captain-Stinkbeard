import { StoryState } from './story/StoryState.js';
import { WorldState } from './world/WorldState.js';
import { Inventory } from './inventory/Inventory.js';
import { Party } from './party/Party.js';
import { QuestSystem } from './quests/QuestSystem.js';
import { deepClone } from '../core/util.js';

/**
 * Everything that belongs to one playthrough. Scenes read and mutate game
 * state only through this object, and saves are just `session.serialize()`.
 */
export class GameSession {
  constructor({ content, bus, strictFlags = false }) {
    this.content = content;
    this.bus = bus;
    this.story = new StoryState({ bus, knownFlags: content.flagIds, strict: strictFlags });
    this.world = new WorldState({ bus });
    this.inventory = new Inventory({ items: content.items, bus });
    this.party = new Party({ characters: content.characters, progression: content.progression, items: content.items, bus });
    this.location = { map: null, x: 0, y: 0, facing: 'down' };
    this.quests = new QuestSystem({ quests: content.quests, session: this, bus });
    this.playTime = 0; // seconds
    this.createdAt = new Date().toISOString();
    // Per-play state that is deliberately never saved (fume exposure...).
    this.transient = {};
  }

  /** Creates a fresh playthrough from data/game.json → newGame. */
  static newGame({ content, bus, strictFlags = false }) {
    const session = new GameSession({ content, bus, strictFlags });
    const setup = content.game.newGame;
    for (const id of setup.party) session.party.add(id);
    session.inventory.addGold(setup.gold ?? 0);
    for (const { id, count } of setup.items ?? []) session.inventory.add(id, count ?? 1);
    for (const flag of setup.flags ?? []) session.story.set(flag);
    session.location = { map: setup.map, x: setup.x, y: setup.y, facing: setup.facing ?? 'down', spawn: setup.spawn ?? null };
    return session;
  }

  static fromState({ content, bus, state, strictFlags = false, onWarning = console.warn }) {
    const session = new GameSession({ content, bus, strictFlags });
    session.load(state, onWarning);
    return session;
  }

  /**
   * Grants rewards and returns a summary for the UI.
   * @param {{xp?:number, gold?:number, items?:Array<{id,count}>, flags?:string[]}} rewards
   */
  grantRewards(rewards = {}) {
    const summary = { xp: 0, gold: 0, items: [], levelUps: [] };
    if (rewards.xp) {
      summary.xp = rewards.xp;
      for (const member of this.party.members) {
        if (!member.isAlive() && !rewards.xpToFallen) continue;
        for (const lv of member.gainXp(rewards.xp)) summary.levelUps.push({ character: member.id, ...lv });
      }
    }
    if (rewards.gold) summary.gold = this.inventory.addGold(rewards.gold);
    for (const { id, count = 1 } of rewards.items ?? []) {
      const added = this.inventory.add(id, count);
      if (added > 0) summary.items.push({ id, count: added });
    }
    for (const flag of rewards.flags ?? []) this.story.set(flag);
    if (summary.levelUps.length) this.bus?.emit('party:levelUp', { levelUps: summary.levelUps, source: rewards.source ?? null });
    return summary;
  }

  addPlayTime(seconds) {
    this.playTime += seconds;
  }

  /** Plain JSON snapshot of all persistent state. */
  serialize() {
    return {
      story: this.story.serialize(),
      world: this.world.serialize(),
      inventory: this.inventory.serialize(),
      party: this.party.serialize(),
      quests: this.quests.serialize(),
      location: { ...this.location },
      playTime: Math.floor(this.playTime),
      createdAt: this.createdAt,
    };
  }

  load(state, onWarning = console.warn) {
    const s = deepClone(state);
    this.story.load(s.story);
    this.world.load(s.world);
    this.inventory.load(s.inventory, onWarning);
    this.party.load(s.party, onWarning);
    this.quests.load(s.quests, onWarning);
    this.location = { map: s.location?.map ?? null, x: s.location?.x ?? 0, y: s.location?.y ?? 0, facing: s.location?.facing ?? 'down' };
    this.playTime = Number.isFinite(s.playTime) ? s.playTime : 0;
    this.createdAt = s.createdAt ?? this.createdAt;
    // Objectives that follow saved state (items held, enemies beaten...) are
    // re-checked, so saves made before a content fix pick up their progress.
    this.quests.refreshStateObjectives();
  }

  /** Stops listening to the shared event bus (call when abandoning this session). */
  destroy() {
    this.quests.detach();
  }
}
