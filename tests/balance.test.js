import { describe, expect, it } from 'vitest';
import { loadContent } from '../src/content/loadContent.js';
import { EventBus } from '../src/core/EventBus.js';
import { GameSession } from '../src/systems/GameSession.js';
import { BattleEngine } from '../src/systems/battle/BattleEngine.js';
import { Rng } from '../src/core/Rng.js';

const content = loadContent();

/**
 * A deliberately plain player: attacks the weakest enemy, eats or drinks the
 * supplies they start with below 35% HP, never uses timed hits, guards or
 * orders.
 */
function fight(session, encounterId, seed, timing = 'none') {
  const engine = new BattleEngine({ content, session, encounterId, rng: new Rng(seed) });
  engine.start();
  for (let i = 0; i < 300 && !engine.outcome; i++) {
    const { actor } = engine.nextTurn();
    if (!actor) break;
    let action;
    if (actor.side === 'party') {
      const heal = actor.hp < actor.maxHp * 0.35 && ['hardtack', 'healing_tonic'].find((it) => session.inventory.has(it));
      const target = engine.enemies.filter((e) => e.isAlive()).sort((a, b) => a.hp - b.hp)[0];
      action = heal ? { type: 'item', item: heal, targets: [actor.uid] } : { type: 'ability', ability: 'cutlass_slash', targets: [target.uid] };
    } else action = engine.chooseEnemyAction(actor);
    engine.execute(actor, action, actor.side === 'party' ? { timing } : {});
    engine.endTurn(actor);
  }
  engine.finish();
  if (engine.outcome === 'win') session.grantRewards(engine.rewards());
  return engine.outcome;
}

describe('prologue balance', () => {
  it('the three hold fights are winnable in a row without timed hits', () => {
    let wins = 0;
    const runs = 100;
    for (let seed = 1; seed <= runs; seed++) {
      const session = GameSession.newGame({ content, bus: new EventBus() });
      const results = ['hold_rats_1', 'hold_rats_2', 'hold_rats_nest'].map((id, i) => fight(session, id, seed * 31 + i));
      if (results.every((r) => r === 'win')) wins++;
    }
    // Losing is possible (it is a fight) but should be rare for a player who
    // uses the supplies the prologue hands out.
    expect(wins / runs).toBeGreaterThanOrEqual(0.95);
  });

  it('perfect timing makes the fights noticeably shorter', () => {
    const turns = (timing) => {
      let total = 0;
      for (let seed = 1; seed <= 20; seed++) {
        const session = GameSession.newGame({ content, bus: new EventBus() });
        const engine = new BattleEngine({ content, session, encounterId: 'hold_rats_2', rng: new Rng(seed) });
        engine.start();
        while (!engine.outcome) {
          const { actor } = engine.nextTurn();
          if (!actor) break;
          const target = engine.enemies.find((e) => e.isAlive());
          const action = actor.side === 'party' ? { type: 'ability', ability: 'cutlass_slash', targets: [target.uid] } : engine.chooseEnemyAction(actor);
          engine.execute(actor, action, actor.side === 'party' ? { timing } : {});
          engine.endTurn(actor);
        }
        total += engine.turnCount;
      }
      return total;
    };
    expect(turns('perfect')).toBeLessThan(turns('none') * 0.8);
  });
});
