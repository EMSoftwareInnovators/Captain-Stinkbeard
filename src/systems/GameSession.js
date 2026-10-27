import { StoryState } from './story/StoryState.js';
import { WorldState } from './world/WorldState.js';
import { Inventory } from './inventory/Inventory.js';
import { Party } from './party/Party.js';
import { QuestSystem } from './quests/QuestSystem.js';
import { ShipState } from './ship/ShipState.js';
import { ConsequenceLedger } from './consequences/ConsequenceLedger.js';
import { resolveVariant } from './story/progress.js';
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
    // Names and titles follow the story (Blackbeard becomes Stinkbeard by flag).
    this.party = new Party({ characters: content.characters, progression: content.progression, items: content.items, bus, resolve: (def) => resolveVariant(def, this) });
    this.location = { map: null, x: 0, y: 0, facing: 'down' };
    this.quests = new QuestSystem({ quests: content.quests, session: this, bus });
    // Overhaul Prompt 5: the ship's structural condition (docs/gameplay-overhaul/09-ship-integrity.md).
    this.ship = new ShipState({ def: content.ship, hazards: content.shipHazards, air: content.shipAir, pressure: content.shipPressure, bus });
    // Prompt 6: emergencies name rooms by their map names ("the Cargo Hold").
    this.ship.hazards.nameOf = (room) => content.maps?.get?.(room)?.name ?? null;
    // Prompt 7: the air knows where the captain breathes, and how bad air hurts him (docs/gameplay-overhaul/11-atmosphere-and-ventilation.md).
    this.ship.air.nameOf = this.ship.hazards.nameOf;
    this.ship.air.where = () => this.location?.map ?? null;
    // Prompt 10: a warm belly takes the edge off (the supplies' hurt factor: 1 while that system is off).
    this.ship.air.hurt = (hp, floor) => this.chokeLeader(hp * this.ship.supplies.factor('hurt'), floor);
    // Prompt 8: the Grand Stenchmasters' pressure reads the story (where they are; Brogath's Stability) (docs/gameplay-overhaul/12-pressure-and-eruptions.md).
    this.ship.pressure.session = this;
    // Prompt 9: the Stink Beard reads the content, what the captain carries (what he can wear over it) and where he is (docs/gameplay-overhaul/13-beard-saturation.md).
    this.ship.beard.session = this;
    // Prompt 10: the supplies read the content, the pack and where the captain is (docs/gameplay-overhaul/14-resources-and-cooking.md).
    this.ship.supplies.session = this;
    // Prompt 11: the consequence ledger, what mistakes and preparation leave behind (docs/gameplay-overhaul/15-consequences-and-recovery.md).
    this.consequences = new ConsequenceLedger({ bus });
    this.consequences.session = this;
    this.playTime = 0; // seconds
    this.createdAt = new Date().toISOString();
    // Per-play state that is deliberately never saved (fume exposure...).
    this.transient = {};
  }

  /**
   * Bad air takes `hp` from the captain (the party's leader), never below
   * `floor` of his maximum HP (and never below 1): it never kills. Returns
   * the HP lost.
   */
  chokeLeader(hp, floor) {
    const m = this.party.members[0];
    if (!m) return 0;
    const min = Math.max(1, Math.ceil(m.maxHp * floor));
    const lost = Math.max(0, Math.min(Math.floor(hp), m.hp - min));
    if (lost > 0) m.hp -= lost;
    return lost;
  }

  /**
   * One second of hazard time, the one clock (Prompt 6): the ship's
   * emergencies, air, pressure, beard and supplies, then the consequence
   * ledger's timed entries (Prompt 11). The world calls it while the captain
   * is free, the emergency work tick by tick, "hazardClock" on purpose.
   */
  tickHazards(tuning) {
    const a = this.ship.tick(tuning);
    const b = this.consequences.tick();
    return a || b;
  }

  /** Something to move on the hazard clock: anything environmental, or a consequence running down. */
  get hazardsActive() {
    return this.ship.envActive || this.consequences.active;
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
      ship: this.ship.serialize(),
      consequences: this.consequences.serialize(),
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
    this.ship.load(s.ship, onWarning);
    // Prompt 11: a save from before version 24 has no ledger: empty, nothing invented.
    this.consequences.load(s.consequences, onWarning);
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
