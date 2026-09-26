import { describe, expect, it } from 'vitest';
import { makeSession } from './fixtures.js';
import { BattleEngine } from '../src/systems/battle/BattleEngine.js';
import { Rng } from '../src/core/Rng.js';
import { computeDamage } from '../src/systems/battle/damage.js';
import { gradeTiming } from '../src/systems/battle/timing.js';

function battle(encounterId = 'two_rats', seed = 7, advantage = 'normal') {
  const { session, content, bus } = makeSession();
  const engine = new BattleEngine({ content, session, encounterId, rng: new Rng(seed), advantage });
  return { engine, session, content, bus };
}

/** Plays a battle where the party always attacks the first living enemy. */
function autoplay(engine, timing = 'none', maxTurns = 200) {
  engine.start();
  for (let i = 0; i < maxTurns && !engine.outcome; i++) {
    const { actor } = engine.nextTurn();
    if (!actor) break;
    const action =
      actor.side === 'party'
        ? { type: 'ability', ability: 'slash', targets: [engine.enemies.find((e) => e.isAlive()).uid] }
        : engine.chooseEnemyAction(actor);
    engine.execute(actor, action, actor.side === 'party' ? { timing } : {});
    engine.endTurn(actor);
  }
  return engine.outcome;
}

describe('battle math', () => {
  it('computes deterministic integer damage with timing and status multipliers', () => {
    const base = computeDamage({ attack: 20, defense: 6, power: 100, rng: null });
    expect(base).toBe(17);
    expect(computeDamage({ attack: 20, defense: 6, power: 100, rng: null, timingMult: 1.5 })).toBe(25);
    expect(computeDamage({ attack: 20, defense: 6, power: 100, rng: null, crit: true })).toBe(25);
    expect(computeDamage({ attack: 20, defense: 6, power: 100, rng: null, takenMult: 0.5 })).toBe(8);
    expect(computeDamage({ attack: 1, defense: 99, power: 100, rng: null })).toBe(1);
  });

  it('grades timed presses by distance from the impact', () => {
    const mech = { windows: { perfect: 40, great: 90, good: 150 } };
    expect(gradeTiming(mech, 0)).toBe('perfect');
    expect(gradeTiming(mech, -60)).toBe('great');
    expect(gradeTiming(mech, 140)).toBe('good');
    expect(gradeTiming(mech, 400)).toBe('none');
    expect(gradeTiming(mech, null)).toBe('none');
  });
});

describe('BattleEngine', () => {
  it('names duplicate enemies and orders turns by speed', () => {
    const { engine } = battle();
    expect(engine.enemies.map((e) => e.name)).toEqual(['Rat A', 'Rat B']);
    const { actor, events } = engine.nextTurn();
    expect(events[0].type).toBe('round');
    expect(actor.side).toBe('party'); // hero speed 8 vs rats 6
  });

  it('wins a fight, grants rewards and writes HP back', () => {
    const { engine, session } = battle();
    const outcome = autoplay(engine, 'perfect');
    expect(outcome).toBe('win');
    const rewards = engine.rewards();
    expect(rewards.xp).toBe(12);
    expect(rewards.gold).toBeGreaterThanOrEqual(4);
    expect(rewards.items).toEqual([{ id: 'biscuit', count: 2 }]);
    engine.finish();
    const hero = session.party.get('hero');
    expect(hero.hp).toBe(engine.party[0].hp);
    expect(engine.defeatedEnemies).toEqual(['rat', 'rat']);
  });

  it('perfect timing deals more damage than no timing and builds command points', () => {
    const a = battle('two_rats', 3);
    const b = battle('two_rats', 3);
    for (const { engine } of [a, b]) {
      engine.start();
      engine.nextTurn();
    }
    const hero = a.engine.party[0];
    const before = hero.resource.current;
    const plain = a.engine.execute(a.engine.party[0], { type: 'ability', ability: 'slash', targets: ['e0'] }, { timing: 'none' });
    const perfect = b.engine.execute(b.engine.party[0], { type: 'ability', ability: 'slash', targets: ['e0'] }, { timing: 'perfect' });
    const dmg = (res) => res.events.find((e) => e.type === 'damage').amount;
    expect(dmg(perfect)).toBeGreaterThan(dmg(plain));
    expect(b.engine.party[0].resource.current).toBe(before + 1);
    expect(hero.resource.current).toBe(before);
  });

  it('applies orders, statuses, costs and expiry', () => {
    const { engine } = battle();
    engine.start();
    const { actor } = engine.nextTurn();
    const cp = actor.resource.current;
    const res = engine.execute(actor, { type: 'ability', ability: 'brace', targets: [] });
    expect(actor.resource.current).toBe(cp - 1);
    expect(actor.hasStatus('braced')).toBe(true);
    expect(res.events.some((e) => e.type === 'status' && e.status === 'braced')).toBe(true);
    const defBefore = actor.baseStats.defense;
    expect(actor.stat('defense')).toBe(Math.floor(defBefore * 1.5));
    engine.endTurn(actor); // fresh this turn: no countdown yet
    expect(actor.statuses.get('braced').turns).toBe(3);
    for (let i = 0; i < 3; i++) {
      actor.actedThisTurn = true;
      engine.endTurn(actor);
    }
    expect(actor.hasStatus('braced')).toBe(false);
  });

  it('defending halves damage until the next turn and grants command', () => {
    const { engine } = battle();
    engine.start();
    const { actor } = engine.nextTurn();
    const cp = actor.resource.current;
    engine.execute(actor, { type: 'defend' });
    expect(actor.resource.current).toBe(cp + 1);
    expect(actor.damageTakenMultiplier()).toBe(0.5);
    engine.endTurn(actor);
    // next time this actor's turn starts, guarding ends
    engine.queue = [actor];
    const next = engine.nextTurn();
    expect(next.actor).toBe(actor);
    expect(actor.hasStatus('defending')).toBe(false);
  });

  it('uses items from the shared inventory', () => {
    const { engine, session } = battle();
    engine.start();
    const { actor } = engine.nextTurn();
    actor.hp = 10;
    const res = engine.execute(actor, { type: 'item', item: 'biscuit', targets: [actor.uid] });
    expect(res.events.find((e) => e.type === 'heal').amount).toBe(10);
    expect(session.inventory.count('biscuit')).toBe(1);
  });

  it('respects preemptive and ambush advantage', () => {
    const pre = battle('two_rats', 1, 'preemptive');
    pre.engine.start();
    const firstRound = pre.engine.nextTurn();
    expect(firstRound.events[0].order.every((uid) => uid.startsWith('p'))).toBe(true);
    const amb = battle('two_rats', 1, 'ambush');
    amb.engine.start();
    const r = amb.engine.nextTurn();
    expect(r.events[0].order.every((uid) => uid.startsWith('e'))).toBe(true);
  });

  it('enemy AI summons when allowed and cannot flee boss fights', () => {
    const { engine } = battle('boss');
    engine.start();
    const bigRat = engine.enemies[0];
    const action = engine.chooseEnemyAction(bigRat);
    expect(action.ability).toBe('squeal');
    const res = engine.execute(bigRat, action);
    expect(res.events.some((e) => e.type === 'summon')).toBe(true);
    expect(engine.enemies.length).toBe(2);
    const flee = engine.execute(engine.party[0], { type: 'flee' });
    expect(flee.events[0]).toMatchObject({ type: 'flee', success: false, blocked: true });
  });

  it('can lose', () => {
    const { engine, session } = battle('boss', 11);
    session.party.get('hero').hp = 1;
    const e = new BattleEngine({ content: engine.content, session, encounterId: 'boss', rng: new Rng(11) });
    e.start();
    for (let i = 0; i < 50 && !e.outcome; i++) {
      const { actor } = e.nextTurn();
      if (!actor) break;
      const act = actor.side === 'party' ? { type: 'defend' } : { type: 'ability', ability: 'bite', targets: ['p0'] };
      e.execute(actor, act);
      e.endTurn(actor);
    }
    expect(e.outcome).toBe('lose');
  });
});
