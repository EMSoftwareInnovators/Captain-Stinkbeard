import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { SaveManager } from '../src/systems/save/SaveManager.js';
import { MemoryStorage } from '../src/platform/storage.js';
import { SAVE_VERSION } from '../src/config/constants.js';
import { STABILITY_STATES, stabilityDef, stateFor, stageIndex, readStability, writePressure, addPressure, promptOptions, incidentDef, stepIncident } from '../src/systems/stability.js';
import { bankScale, scaleLabel, intensityValue, nextCustomer, createTeller, stepTeller, autoTeller, tellerScore } from '../src/systems/bank.js';
import { stabilitySubject, bankDef } from '../src/systems/script/commands.js';
import { placementChoices, roomGuard } from '../src/world/placements.js';
import { resolvePreset } from '../src/debug/presets.js';
import { DEBUG_BROGATH } from '../src/debug/brogathDebug.js';
import { makeStory } from './storyHarness.js';

/**
 * Story Phase 14, the systems: Brogath Stability (states, triggers and
 * calms, prompts, incidents, the scripted anger, settling after a
 * catastrophe), the Grand Bank's teller window, the Grand Currency (bought
 * once, never gold), where Brogath may be put, the debug tab, and saves.
 */

const brogath = (content) => stabilitySubject(content, 'brogath');
const run = (s, steps) => s.run(steps);

describe('Brogath Stability: the rules', () => {
  const s = makeStory({ preset: 'p14_containment' });
  const def = brogath(s.content);

  it('has the seven states, low to high, with ANGRY apart from the pressure', () => {
    expect(STABILITY_STATES).toEqual(['PLEASED', 'CALM', 'BASHFUL', 'EMBARRASSED', 'PRESSURIZED', 'CRITICAL', 'ANGRY']);
    expect([-5, 0, 20, 50, 70, 90].map((p) => stateFor(def, p))).toEqual(['PLEASED', 'CALM', 'BASHFUL', 'EMBARRASSED', 'PRESSURIZED', 'CRITICAL']);
    for (const p of [-20, 10, 99]) expect(stateFor(def, p, true)).toBe('ANGRY');
  });

  it('every trigger raises him and every calm steadies him, by the amounts in the data (no dice)', () => {
    expect(Object.keys(def.triggers).length).toBeGreaterThanOrEqual(15);
    expect(Object.keys(def.calms).length).toBeGreaterThanOrEqual(10);
    for (const [id, t] of Object.entries(def.triggers)) expect(t.pressure, id).toBeGreaterThanOrEqual(0);
    for (const [id, c] of Object.entries(def.calms)) expect(c.pressure, id).toBeLessThan(0);
    // (The cardboard's idle creaks are timed loosely; the pressure never is.)
    expect(fs.readFileSync(path.resolve('src/systems/stability.js'), 'utf8')).not.toMatch(/Math\.random/);
  });

  it('pressure is clamped, rounded and saved with the state it means', () => {
    const t = makeStory({ preset: 'p14_containment' });
    expect(writePressure(def, t.session, 250)).toMatchObject({ to: def.max, state: 'CRITICAL' });
    expect(t.session.story.getValue(def.stateValue)).toBe('CRITICAL');
    expect(addPressure(def, t.session, -1000)).toMatchObject({ to: def.min, state: 'PLEASED' });
    writePressure(def, t.session, 41.6);
    expect(readStability(def, t.session)).toMatchObject({ pressure: 42, state: 'EMBARRASSED', stage: stageIndex(def, 42) });
  });

  it('every prompt offers at least one calming answer, the same one for the same moment', () => {
    for (const set of Object.keys(def.prompts)) {
      for (let turn = 0; turn < 12; turn++) {
        const a = promptOptions(def, set, turn);
        expect(a.some((o) => o.calm), `${set} turn ${turn}`).toBe(true);
        expect(a.length).toBe(Math.min(def.prompts[set].options.length, def.prompts[set].show ?? 3));
        expect(promptOptions(def, set, turn)).toEqual(a);
      }
    }
    // Over a run, every option of the main prompt turns up.
    const seen = new Set();
    for (let turn = 0; turn < 24; turn++) promptOptions(def, 'general', turn).forEach((o) => seen.add(o.text));
    expect(seen.size).toBe(def.prompts.general.options.length);
  });

  it('a running incident climbs steadily to the top and erupts once', () => {
    const inc = incidentDef(def, 'fl_napkin');
    let live = inc.start;
    let erupts = 0;
    let seconds = 0;
    while (live < def.max && seconds < 120) {
      const r = stepIncident(def, inc, live, 0.5);
      live = r.live;
      if (r.erupt) erupts += 1;
      seconds += 0.5;
    }
    expect(erupts).toBe(1);
    expect(seconds).toBeCloseTo((def.max - inc.start) / inc.rate, 0);
    expect(stepIncident(def, inc, def.max, 1).erupt).toBe(false);
    for (const id of Object.keys(def.incidents)) expect(s.content.scripts.get(incidentDef(def, id).erupt), id).toBeTruthy();
  });
});

describe('Brogath Stability: the script commands', () => {
  it('anger is scripted, shows as ANGRY whatever the pressure, and settling puts everything back', async () => {
    const s = makeStory({ preset: 'p14_grand_bank' });
    const def = brogath(s.content);
    await run(s, [{ stability: 'set', subject: 'brogath', pressure: 5 }, { stability: 'anger', subject: 'brogath' }, { stability: 'incident', subject: 'brogath', id: 'advert' }, { stability: 'meter', subject: 'brogath', show: 'show' }]);
    expect(readStability(def, s.session)).toMatchObject({ angry: true, state: 'ANGRY', incident: 'advert', meter: 'show' });
    await run(s, [{ stability: 'settle', subject: 'brogath' }]);
    expect(readStability(def, s.session)).toMatchObject({ angry: false, pressure: def.settleTo, state: stateFor(def, def.settleTo), incident: null, meter: null });
  });

  it('a trigger says its line (unless quiet); a calm brings him down', async () => {
    const s = makeStory({ preset: 'p14_flutter_lessons' });
    const def = brogath(s.content);
    await run(s, [{ stability: 'set', subject: 'brogath', pressure: 20 }]);
    const before = s.log.length;
    await run(s, [{ stability: 'trigger', subject: 'brogath', id: 'flutter' }]);
    expect(readStability(def, s.session).pressure).toBe(20 + def.triggers.flutter.pressure);
    expect(s.log.length).toBe(before + (def.triggers.flutter.line ? 1 : 0));
    await run(s, [{ stability: 'trigger', subject: 'brogath', id: 'flutter', quiet: true }, { stability: 'calm', subject: 'brogath', id: 'distinguished', quiet: true }]);
    expect(readStability(def, s.session).pressure).toBe(20 + 2 * def.triggers.flutter.pressure + def.calms.distinguished.pressure);
  });
});

describe('The Grand Bank: rules', () => {
  const s = makeStory({ preset: 'p14_teller_shift' });
  const bank = bankDef(s.content, 'grand_bank');

  it('has the 1-10 scale and the 10+ beyond it', () => {
    expect(bankScale(bank).map((e) => String(e.n))).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '10+']);
    expect(scaleLabel(bank, '10+')).toMatch(/^10\+ — ABSOLUTELY NOT$/);
    expect(intensityValue('10+')).toBe(11);
  });

  it('every depositor is data: a known class, offered among the ledger\'s choices, with a brace to time', () => {
    const all = Object.values(bank.queues).flatMap((q) => q.customers);
    expect(all.length).toBeGreaterThanOrEqual(19);
    for (const id of all) {
      const c = s.content.bankCustomers.get(id);
      expect(c, id).toBeTruthy();
      expect(bankScale(bank).some((e) => String(e.n) === String(c.intensity)), id).toBe(true);
      if (c.classify) expect(c.classify.map(String), id).toContain(String(c.intensity));
    }
    expect(s.content.bankCustomers.get('gustilda').intensity).toBe('10+');
  });

  it('the queue moves in order', () => {
    const t = makeStory({ preset: 'p14_teller_shift' });
    expect(nextCustomer(bank, 'regular', t.session)).toBe(bank.queues.regular.customers[0]);
    t.session.story.setVar(bank.queues.regular.servedVar, 3);
    expect(nextCustomer(bank, 'regular', t.session)).toBe(bank.queues.regular.customers[3]);
    t.session.story.setVar(bank.queues.regular.servedVar, bank.queues.regular.customers.length);
    expect(nextCustomer(bank, 'regular', t.session)).toBe(null);
  });

  it('a well-timed teller banks every deposit cleanly; a missed brace is blown back, never failed', () => {
    for (const id of ['windabella', 'gary', 'gustilda']) {
      const st = createTeller({ id, ...s.content.bankCustomers.get(id) });
      for (let n = 0; n < 4000 && !st.done; n++) stepTeller(st, 1 / 60, autoTeller(st));
      expect(st.done, id).toBe(true);
      expect(tellerScore(st.grades), id).toBe(2);
    }
    const st = createTeller({ id: 'gary', ...s.content.bankCustomers.get('gary') });
    const events = [];
    for (let n = 0; n < 4000 && !st.done; n++) events.push(...stepTeller(st, 1 / 60, { held: true, pressed: false }));
    expect(st.done).toBe(true);
    expect(st.grades).toContain('miss');
    expect(tellerScore(st.grades)).toBe(0);
    expect(events.some((e) => e.type === 'done')).toBe(true);
  });

  it('pressing early only locks the button for a moment (no mashing, no grade)', () => {
    const st = createTeller({ id: 't', pattern: [{ brace: 'BRACE!', ring: 1000, window: 170 }] });
    stepTeller(st, 0);
    const ev = stepTeller(st, 0.1, { pressed: true });
    expect(ev.map((e) => e.type)).toContain('early');
    expect(st.grades).toEqual([]);
    const again = stepTeller(st, 0.1, { pressed: true });
    expect(again.map((e) => e.type)).not.toContain('early');
  });
});

describe('The Grand Currency: twenty thousand tokens, ten real doubloons, once', () => {
  it('the purchase takes exactly ten doubloons from the purse and gives tokens that are not gold', async () => {
    const s = makeStory({ preset: 'p14_bad_money' });
    const cur = bankDef(s.content, 'grand_bank').currency;
    const gold = s.session.inventory.gold;
    expect(gold).toBeGreaterThanOrEqual(10);
    await run(s, [{ grandCurrency: 'purchase' }]);
    expect(s.session.inventory.gold).toBe(gold - 10);
    expect(s.session.story.getVar(cur.var)).toBe(20000);
    expect(s.session.story.getVar(cur.paidVar)).toBe(10);
    // Again: nothing.
    await run(s, [{ grandCurrency: 'purchase' }, { grandCurrency: 'purchase' }]);
    expect(s.session.inventory.gold).toBe(gold - 10);
    expect(s.session.story.getVar(cur.var)).toBe(20000);
  });

  it('a purse with fewer than ten pays what it has', async () => {
    const s = makeStory({ preset: 'p14_bad_money' });
    s.session.inventory.spendGold(s.session.inventory.gold - 4);
    await run(s, [{ grandCurrency: 'purchase' }]);
    expect(s.session.inventory.gold).toBe(0);
    expect(s.session.story.getVar('grand_currency_gold_paid')).toBe(4);
  });

  it('the tokens buy nothing: no value, a key item, and nothing spends the variable', () => {
    const s = makeStory({ preset: 'p14_oat_security' });
    const item = s.content.items.get('grand_currency');
    expect(item).toMatchObject({ type: 'key', value: 0 });
    const scripts = JSON.stringify([...s.content.scripts.map.values()]);
    expect(scripts).not.toMatch(/"(spendGold|addGold|giveGold|gold)":\s*"?\{?num:grand_currency/);
    expect(scripts).not.toMatch(/"(setVar|addVar)":"grand_currency_tokens"/);
    const shops = JSON.stringify(s.content.shops?.list?.() ?? []);
    expect(shops).not.toMatch(/grand_currency/);
  });
});

describe('Where Brogath may be', () => {
  it('his data lists his rooms, and none of them is the hold, the treasure room or the Fart-Free Zone', () => {
    const s = makeStory({ preset: 'p14_complete' });
    const rooms = s.content.npcs.require('brogath').rooms;
    expect(rooms).toEqual(['crew_quarters', 'galley', 'main_deck']);
    for (const m of ['cargo_hold', 'treasure_hold', 'fart_free_zone']) expect(rooms).not.toContain(m);
  });

  it('no placement anywhere puts him outside them', () => {
    const s = makeStory({ preset: 'p14_complete' });
    const rooms = s.content.npcs.require('brogath').rooms;
    for (const map of s.content.maps.ids()) {
      const placed = s.content.maps.require(map).objects.filter((o) => o.type === 'npc' && o.npc === 'brogath' && !o.absent);
      if (!rooms.includes(map)) expect(placed.map((o) => o.id), map).toEqual([]);
    }
  });

  it('and the world refuses one anyway (the room guard)', () => {
    const s = makeStory({ preset: 'p14_complete' });
    const objects = [{ id: 'x', type: 'npc', npc: 'brogath', x: 3, y: 3 }, { id: 'y', type: 'npc', npc: 'pete', x: 4, y: 3 }];
    const inHold = placementChoices(objects, s.session, roomGuard(s.content.npcs, 'cargo_hold'));
    expect(inHold.get('brogath')).toBe(null);
    expect(inHold.get('pete')?.id).toBe('y');
    expect(placementChoices(objects, s.session, roomGuard(s.content.npcs, 'galley')).get('brogath')?.id).toBe('x');
  });
});

describe('Story Phase 14 debug tools', () => {
  it('every jump in the F2 Brogath tab is a preset, in story order, and the chain starts at the end of Phase 13', () => {
    const s = makeStory({ preset: 'p14_start' });
    const ids = DEBUG_BROGATH.jumps.map(([, id]) => id);
    const presets = s.content.debugPresets.list().filter((p) => p.id.startsWith('p14_')).map((p) => p.id);
    expect(ids).toEqual(presets);
    expect(s.content.debugPresets.get('p14_start').after).toBe('p13_complete');
    expect(resolvePreset(s.content, 'p14_start').gold).toBeGreaterThanOrEqual(10);
  });

  it('every debug scene is a script the runner knows', async () => {
    const s = makeStory({ preset: 'p14_complete' });
    for (const [label, steps] of DEBUG_BROGATH.scenes) {
      for (const st of steps) {
        if (st.call) expect(s.content.scripts.get(st.call), label).toBeTruthy();
        if (st.stability === 'incident') expect(() => incidentDef(brogath(s.content), st.id), label).not.toThrow();
        if (st.bankDeposit) expect(s.content.bankCustomers.get(st.bankDeposit), label).toBeTruthy();
      }
    }
  });
});

describe('Saves (version 14)', () => {
  it('the save version is 14, and a version 13 save migrates unchanged in layout', () => {
    expect(SAVE_VERSION).toBe(14);
    const s = makeStory({ preset: 'p13_complete' });
    const storage = new MemoryStorage();
    expect(new SaveManager({ storage, content: s.content, version: 13 }).save(1, s.session).ok).toBe(true);
    const read = new SaveManager({ storage, content: s.content }).read(1);
    expect(read.ok).toBe(true);
    const t = makeStory({ state: read.state });
    expect(t.session.story.allFlags().sort()).toEqual(s.session.story.allFlags().sort());
    expect(t.session.inventory.gold).toBe(s.session.inventory.gold);
  });

  it('Brogath\'s pressure, the tokens and the bank\'s queue are plain story state, and survive a save', () => {
    const s = makeStory({ preset: 'p14_gustilda' });
    s.session.story.setVar('brogath_pressure', 37);
    const storage = new MemoryStorage();
    new SaveManager({ storage, content: s.content }).save(2, s.session);
    const t = makeStory({ state: new SaveManager({ storage, content: s.content }).read(2).state });
    for (const v of ['brogath_pressure', 'grand_currency_tokens', 'grand_currency_gold_paid', 'bank_served', 'brogath_rules']) {
      expect(t.session.story.getVar(v), v).toBe(s.session.story.getVar(v));
    }
    expect(t.session.inventory.gold).toBe(s.session.inventory.gold);
  });
});
