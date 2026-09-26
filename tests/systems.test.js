import { describe, expect, it } from 'vitest';
import { makeSession, makeContent } from './fixtures.js';
import { equip, unequip, previewEquip } from '../src/systems/party/equipment.js';
import { applyEffects, wouldAffect } from '../src/systems/effects/effects.js';

describe('Inventory', () => {
  it('adds, removes, caps stacks and tracks gold', () => {
    const { session } = makeSession();
    const inv = session.inventory;
    expect(inv.count('biscuit')).toBe(2);
    inv.add('biscuit', 200);
    expect(inv.count('biscuit')).toBe(99);
    expect(inv.remove('biscuit', 100)).toBe(false);
    expect(inv.remove('biscuit', 9)).toBe(true);
    expect(inv.count('biscuit')).toBe(90);
    inv.add('key', 3);
    expect(inv.count('key')).toBe(1);
    expect(inv.spendGold(11)).toBe(false);
    expect(inv.spendGold(10)).toBe(true);
    expect(inv.gold).toBe(0);
    expect(() => inv.add('nope')).toThrow(/Unknown item/);
    expect(inv.entries({ type: 'key' }).map((e) => e.id)).toEqual(['key']);
  });
});

describe('Character, leveling and equipment', () => {
  it('derives stats from level, growth and gear', () => {
    const { session } = makeSession();
    const hero = session.party.get('hero');
    expect(hero.level).toBe(1);
    expect(hero.stat('attack')).toBe(12 + 5); // base + sword
    expect(hero.abilities).toEqual(['brace']);
    const ups = hero.gainXp(35); // crosses level 2 (10) and 3 (30)
    expect(ups.map((u) => u.level)).toEqual([2, 3]);
    expect(hero.level).toBe(3);
    expect(hero.stat('attack')).toBe(12 + 4 + 5);
    expect(hero.abilities).toContain('focus');
    expect(ups[1].learned).toEqual(['focus']);
  });

  it('equips and unequips through the inventory', () => {
    const { session } = makeSession();
    const hero = session.party.get('hero');
    const inv = session.inventory;
    inv.add('axe');
    inv.add('coat');
    const preview = previewEquip(hero, 'weapon', 'axe');
    expect(preview.diff.attack).toBe(3);
    expect(preview.diff.speed).toBe(-1);
    const prev = equip(hero, 'axe', inv);
    expect(prev).toBe('sword');
    expect(inv.count('sword')).toBe(1);
    expect(inv.count('axe')).toBe(0);
    equip(hero, 'coat', inv);
    expect(hero.maxHp).toBe(60);
    hero.fullHeal();
    unequip(hero, 'body', inv);
    expect(hero.maxHp).toBe(50);
    expect(hero.hp).toBe(50); // clamped
    expect(() => equip(hero, 'biscuit', inv)).toThrow();
  });
});

describe('effects', () => {
  it('heals and knows when an item would do nothing', () => {
    const { session } = makeSession();
    const hero = session.party.get('hero');
    expect(wouldAffect([{ type: 'heal', amount: 10 }], hero)).toBe(false);
    hero.hp = 20;
    expect(wouldAffect([{ type: 'heal', amount: 10 }], hero)).toBe(true);
    const [res] = applyEffects([{ type: 'heal', percent: 50 }], hero);
    expect(res.amount).toBe(25);
    expect(hero.hp).toBe(45);
  });
});

describe('QuestSystem', () => {
  it('progresses objectives from events, respects prerequisites and grants rewards', () => {
    const { session, bus } = makeSession();
    const q = session.quests;
    const log = [];
    bus.on('quest:objectiveCompleted', (e) => log.push(e.objective.id));
    bus.on('quest:completed', (e) => log.push(`done:${e.quest.id}`));

    bus.emit('npc:talked', { npc: 'mate' }); // quest not started: ignored
    expect(q.status('rounds')).toBe('inactive');
    q.start('rounds');
    bus.emit('npc:talked', { npc: 'mate' });
    expect(q.isObjectiveDone('rounds', 'talk')).toBe(true);
    expect(q.isObjectiveDone('rounds', 'report')).toBe(false); // prerequisites not met

    bus.emit('object:inspected', { id: 'deck:wheel', tags: [] });
    bus.emit('map:entered', { map: 'galley' });
    expect(q.isObjectiveAvailable('rounds', 'report')).toBe(true);
    const xpBefore = session.party.get('hero').xp;
    bus.emit('npc:talked', { npc: 'mate' });
    expect(q.status('rounds')).toBe('completed');
    expect(session.party.get('hero').xp).toBe(xpBefore + 12);
    expect(session.inventory.count('tonic')).toBe(1);
    expect(session.story.has('rounds_done')).toBe(true);
    expect(log).toEqual(['talk', 'look', 'visit', 'report', 'done:rounds']);
  });

  it('counts defeat objectives and checks obtain objectives against the inventory', () => {
    const { session, bus } = makeSession();
    const q = session.quests;
    session.inventory.add('key'); // already owned before the objective unlocks
    q.start('rats');
    bus.emit('battle:won', { encounter: 'two_rats', tags: ['rats'], enemies: ['rat', 'rat'] });
    expect(q.objState('rats', 'kill').progress).toBe(1);
    bus.emit('battle:won', { encounter: 'boss', tags: ['rats'], enemies: ['big_rat'] });
    expect(q.isObjectiveDone('rats', 'kill')).toBe(true);
    // obtain objective became available and is satisfied immediately
    expect(q.status('rats')).toBe('completed');
  });

  it('serializes and restores state', () => {
    const { session, content } = makeSession();
    session.quests.start('rounds');
    session.quests.completeObjective('rounds', 'look');
    const data = session.quests.serialize();
    const { session: other } = makeSession(content);
    other.quests.load(data);
    expect(other.quests.isObjectiveDone('rounds', 'look')).toBe(true);
    expect(other.quests.status('rounds')).toBe('active');
  });
});
