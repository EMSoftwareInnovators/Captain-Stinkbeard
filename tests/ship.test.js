import { describe, it, expect, vi } from 'vitest';

// The Ship page is drawn with stand-in game objects below (no Phaser in Node).
vi.mock('phaser', () => ({ TintModes: { MULTIPLY: 0 } }));

import { loadContent } from '../src/content/loadContent.js';
import { ContentDB } from '../src/content/ContentDB.js';
import { validateContent } from '../src/content/validateContent.js';
import { EventBus } from '../src/core/EventBus.js';
import { GameSession } from '../src/systems/GameSession.js';
import { SaveManager } from '../src/systems/save/SaveManager.js';
import { MemoryStorage } from '../src/platform/storage.js';
import { evaluateCondition } from '../src/systems/conditions/conditions.js';
import { challengeConfig } from '../src/systems/challenge/config.js';
import { ChallengeRun, runChallenge, challengeLog } from '../src/systems/challenge/runner.js';
import { captureCheckpoint, restoreCheckpoint } from '../src/systems/challenge/checkpoint.js';
import { repairPlan, createCommandImplementations } from '../src/systems/script/commands.js';
import {
  SHIP_TUNING, sectionIds, sectionDef, thresholdList, thresholdFor, shipTuning, resolveRepair, repairIdFor, shipDataProblems,
} from '../src/systems/ship/integrity.js';
import { resolvePreset, applyPresetPlan } from '../src/debug/presets.js';
import { DEBUG_SHIP } from '../src/debug/shipDebug.js';
import { InputManager } from '../src/platform/input/InputManager.js';
import { buildFonts } from '../src/art/font/buildFont.js';
import { ShipPage } from '../src/ui/menu/ShipPage.js';
import { wrap, parseMarkup } from '../src/ui/text.js';
import { TOAST_TEXT_WIDTH } from '../src/ui/Toasts.js';
import { SAVE_VERSION, SCREEN_WIDTH, SCREEN_HEIGHT } from '../src/config/constants.js';
import { PHASES, sessionAt } from './regression/world.js';
import { NON_CHALLENGE_COMMANDS } from './regression/harness.js';
import { CHALLENGE_KINDS as REGISTRY } from './regression/challenges.js';
import { makeStory, reloadStory } from './storyHarness.js';
import { playPhase17 } from './phase17Play.js';

/**
 * Ship Integrity (docs/gameplay-overhaul/09-ship-integrity.md): sections,
 * damage, thresholds, material repairs played as challenges, difficulty,
 * checkpoints and saves (version 18, now 19). Deterministic: repairs are the game's
 * own timing bar played by simulated hands (tests/challengeBots.js) on fixed
 * seeds. The numbered blocks follow the 27 checks Prompt 5 asked for; the
 * browser half (the Ship page, the HUD, keyboard and pad) is e2e/ship.spec.js.
 * No chapter uses any of it: every damage here is the test's own.
 */
const content = loadContent();
const FILES = import.meta.glob('/data/**/*.json', { eager: true, import: 'default' });
const MATERIALS = ['planks', 'nails', 'rope', 'sailcloth'];
const WHOLE = { hull_port: 100, hull_starboard: 100, bow: 80, stern: 80, deck: 60, rigging: 60 };
const DIFFS = ['deckhand', 'captain', 'brutal'];

function session(preset = 'p17_complete') {
  const s = GameSession.newGame({ content, bus: new EventBus(), strictFlags: true });
  applyPresetPlan(s, resolvePreset(content, preset));
  return s;
}
const story = (opts = {}) => makeStory({ preset: 'p17_complete', ...opts });
/** Every section's integrity. */
const hps = (s) => s.ship.serialize().sections;
const hp = (s, id) => s.ship.section(id).hp;
/** What the hold has of each material. */
const held = (s) => Object.fromEntries(MATERIALS.map((m) => [m, s.inventory.count(m)]));
const stock = (s, counts) => {
  for (const [m, n] of Object.entries(counts)) s.inventory.add(m, n);
};
const TEN = { planks: 10, nails: 10, rope: 10, sailcloth: 10 };
/** The pause menu's page (MenuScene PANE). */
const PANE = { x: 96, y: 4, w: SCREEN_WIDTH - 100, h: SCREEN_HEIGHT - 8 };
const texts = (st) => st.notices.filter((n) => n.kind === 'ship').map((n) => n.text);

/** A strict repair config, as a chapter would write it inline (for challenges that aren't repairs of the ship). */
const STRICT_REPAIR = (over = {}) => ({
  failure: true,
  mechanics: { maxFumbles: 1 },
  outcomes: { failure: { completed: false }, success: { fumbles: 0 }, fallback: 'partial' },
  score: 'accuracy',
  ...over,
});
const FAIL = { completed: false, fumbles: 2, clean: 0, strikes: 3, reason: 'fumbles' };
const WIN = { completed: true, fumbles: 0, clean: 3, strikes: 3, accuracy: 100 };

/** A challenge driven directly (tests/challenges.test.js): attempts' metrics in order, `during` runs as each starts. */
async function direct(s, cfg, attempts, { during = () => {}, decisions = [] } = {}) {
  const run = new ChallengeRun({ session: s, config: challengeConfig(content, cfg, { kind: 'repair', id: cfg.id ?? 'fixture_direct' }) });
  const { record } = await runChallenge(run, {
    attempt: async (info) => {
      during(info);
      return attempts[Math.min(info.attempt, attempts.length) - 1];
    },
    decide: async () => decisions.shift() ?? 'retry',
    runSteps: async () => {},
  });
  return record;
}

// ---------------------------------------------------------------------------------------------
describe('1. a new ship', () => {
  it('starts whole: every section at its maximum, healthy and working; nothing damaged, nothing sinking', () => {
    const s = GameSession.newGame({ content, bus: new EventBus(), strictFlags: true });
    expect(hps(s)).toEqual(WHOLE);
    expect(s.ship.pristine).toBe(true);
    expect(s.ship.destroyed).toBe(false);
    for (const sec of s.ship.sections()) {
      expect(sec).toMatchObject({ hp: sec.max, pct: 100, state: 'healthy', label: 'Healthy', operational: true, efficiency: 1, repairable: true });
      expect(sec.rooms.length).toBeGreaterThan(0);
    }
    expect(s.ship.overall()).toMatchObject({ hp: 480, max: 480, pct: 100, state: 'healthy', destroyed: false, damaged: 0, worst: null });
    expect(s.ship.sections().filter((x) => x.vital).map((x) => x.id)).toEqual(['hull_port', 'hull_starboard']);
    // The campaign's starting points and the demo: whole too.
    for (const id of ['prologue_done', 'p17_complete', 'ship_demo']) expect(session(id).ship.pristine, id).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------
describe('2. sections have stable ids, never tiles; bad ship data is rejected', () => {
  it('six sections, each mapped to rooms by map id and to its repairs', () => {
    expect(sectionIds(content)).toEqual(['hull_port', 'hull_starboard', 'bow', 'stern', 'deck', 'rigging']);
    for (const id of sectionIds(content)) {
      const def = sectionDef(content, id);
      for (const k of ['x', 'y', 'tiles', 'tile']) expect(def, `${id} has no ${k}`).not.toHaveProperty(k);
      for (const room of def.rooms) expect(content.maps.has(room), `${id}: ${room}`).toBe(true);
      expect(content.ship.repairs[def.repair], `${id}: repair`).toBeTruthy();
      expect(content.ship.repairs[def.rebuild], `${id}: rebuild`).toBeTruthy();
    }
    expect(shipDataProblems(content)).toEqual([]);
    expect(validateContent(content).errors).toEqual([]);
  });

  it('bad sections, thresholds, repairs, tuning and script steps are content errors', () => {
    const files = structuredClone(FILES);
    const ship = files['/data/ship/integrity.json'];
    ship.sections.hull_port.x = 3;
    ship.sections.bow.rooms = [...ship.sections.bow.rooms, 'nowhere_room'];
    ship.sections.deck.resist.storm = 5;
    ship.sections.rigging.repair = 'nope';
    ship.sections.Keel = { name: 'Keel', max: 0, repairable: false };
    ship.thresholds = ship.thresholds.filter((t) => t.id !== 'disabled');
    ship.repairs.deck_mend.cost.push({ item: 'hardtack', count: 1 });
    ship.repairs.hull_patch.results.partial.restore = 50;
    ship.repairs.rudder_fix.challenge = { profile: 'ship_repair', failure: false };
    files['/data/difficulty/presets.json'].brutal.ship.damageScale = 3;
    files['/data/items/materials.json'][0].use = { heal: 5 };
    files['/data/story/cutscenes/zz_ship_fixture.json'] = {
      'zz.ship_bad': [
        { shipDamage: 'keel', amount: 5 },
        { shipDamage: 'hull_port', amount: 5, category: 'lava' },
        { shipDamage: 'deck', amount: 0 },
        { shipRepair: 'hull_port', repair: 'nope' },
        { if: { ship: { section: 'mast', operational: false } }, then: [{ wait: 1 }] },
        { if: { ship: { section: 'deck', state: 'sunk' } }, then: [{ wait: 1 }] },
      ],
    };
    const errors = validateContent(new ContentDB(files)).errors.join('\n');
    expect(errors).toMatch(/sections.hull_port\): a section is never placed by tile coordinates/);
    expect(errors).toMatch(/sections.bow\): unknown room "nowhere_room"/);
    expect(errors).toMatch(/sections.deck\): resist.storm must be 0 \(immune\) to 3/);
    expect(errors).toMatch(/sections.rigging\): unknown repair "nope"/);
    expect(errors).toMatch(/sections.Keel\): a section id is lower_snake_case/);
    expect(errors).toMatch(/sections.Keel\): "max" must be a whole number from 1 to 1000/);
    expect(errors).toMatch(/the lowest threshold must have "min": 0/);
    expect(errors).toMatch(/repairs.deck_mend\): cost must name a material \("hardtack" is consumable\)/);
    expect(errors).toMatch(/repairs.hull_patch\): results.partial must restore 0 up to the success's amount/);
    expect(errors).toMatch(/repairs.rudder_fix\): \[deckhand\] a ship repair's challenge must be able to fail/);
    expect(errors).toMatch(/brutal.ship\): damageScale must be from 0.5 to 1.5/);
    expect(errors).toMatch(/a material is used up by work/);
    expect(errors).toMatch(/unknown ship section "keel"/);
    expect(errors).toMatch(/unknown damage category "lava"/);
    expect(errors).toMatch(/shipDamage: "amount" must be a number above 0/);
    expect(errors).toMatch(/unknown ship repair "nope"/);
    expect(errors).toMatch(/ship condition: unknown section "mast"/);
    expect(errors).toMatch(/ship condition: unknown state "sunk"/);
    expect(Object.keys(SHIP_TUNING)).toEqual(['damageScale', 'repairScale', 'costScale', 'leakScale', 'fireScale', 'responseScale', 'exposureScale', 'recoveryScale', 'ventScale', 'pressureScale', 'warnScale', 'calmScale', 'holdScale', 'releaseScale']);
  });
});

// ---------------------------------------------------------------------------------------------
describe('3. damage', () => {
  it('lands by category and each section\'s resistance, and is announced', async () => {
    const bus = new EventBus();
    const s = GameSession.newGame({ content, bus, strictFlags: true });
    const events = [];
    bus.on('ship:damaged', (e) => events.push(e));
    expect(s.ship.applyDamage({ section: 'hull_port', amount: 40, category: 'shark', source: 'test' })).toMatchObject({
      ok: true, section: 'hull_port', category: 'shark', source: 'test', requested: 40, applied: 40, before: 100, after: 60, from: 'healthy', to: 'worn', crossed: true, destroyed: false,
    });
    expect(s.ship.applyDamage({ section: 'bow', amount: 40, category: 'shark' })).toMatchObject({ applied: 20, after: 60 }); // bow: shark x0.5
    expect(s.ship.applyDamage({ section: 'hull_starboard', amount: 20, category: 'cannon' })).toMatchObject({ applied: 25, after: 75 }); // hull: cannon x1.25
    expect(s.ship.applyDamage({ section: 'rigging', amount: 40, category: 'shark' })).toMatchObject({ ok: true, reason: 'immune', applied: 0, after: 60 });
    expect(s.ship.applyDamage({ section: 'deck', amount: 0.2 })).toMatchObject({ category: 'impact', applied: 1, after: 59 }); // a blow always does something
    expect(events.map((e) => [e.section, e.applied])).toEqual([['hull_port', 40], ['bow', 20], ['hull_starboard', 25], ['deck', 1]]);

    // The script command: one blow to several sections, scaled by the difficulty (Captain: as written), told to the player.
    const t = story();
    await t.run([{ shipDamage: ['deck', 'stern'], amount: 10, category: 'storm', source: 'test' }]);
    expect(hps(t.session)).toEqual({ ...WHOLE, deck: 47, stern: 72 }); // deck: storm x1.25 (13); stern: x0.75 (8)
    expect(texts(t)).toEqual(['Main deck hit by the storm: <y>78% WORN</>!', 'Stern and rudder hit by the storm: <y>90% HEALTHY</>']);
    await t.run([{ shipDamage: 'hull_port', amount: 5, announce: false }]);
    expect(hp(t.session, 'hull_port')).toBe(95);
    expect(texts(t).length).toBe(2);
  });
});

// ---------------------------------------------------------------------------------------------
describe('4. thresholds', () => {
  it('come from data, by percentage: 0 is always out of action, anything above it never is', () => {
    const list = thresholdList(content);
    expect(list.map((t) => [t.id, t.min, t.operational, t.efficiency])).toEqual([
      ['healthy', 85, true, 1], ['worn', 60, true, 1], ['damaged', 30, true, 0.75], ['critical', 1, true, 0.4], ['disabled', 0, false, 0],
    ]);
    const at = (h, max = 100) => thresholdFor(list, h, max).id;
    expect([100, 85, 84, 60, 59, 30, 29, 1, 0].map((h) => at(h))).toEqual(['healthy', 'healthy', 'worn', 'worn', 'damaged', 'damaged', 'critical', 'critical', 'disabled']);
    expect([at(51, 60), at(50, 60)]).toEqual(['healthy', 'worn']);
    expect(at(1, 1000)).toBe('critical');
  });

  it('a crossing is an event, once, either way; a blow that stays within one isn\'t', () => {
    const bus = new EventBus();
    const s = GameSession.newGame({ content, bus, strictFlags: true });
    const crossings = [];
    bus.on('ship:threshold', (e) => crossings.push(e));
    s.ship.applyDamage({ section: 'hull_port', amount: 10 }); // 90: still healthy
    s.ship.applyDamage({ section: 'hull_port', amount: 10 }); // 80: worn
    s.ship.applyDamage({ section: 'hull_port', amount: 60 }); // 20: critical (damaged passed over)
    s.ship.restore('hull_port', 70); // 90: healthy
    expect(crossings).toEqual([
      { section: 'hull_port', from: 'healthy', to: 'worn', direction: 'down' },
      { section: 'hull_port', from: 'worn', to: 'critical', direction: 'down' },
      { section: 'hull_port', from: 'critical', to: 'healthy', direction: 'up' },
    ]);
  });
});

// ---------------------------------------------------------------------------------------------
describe('5. the overall condition', () => {
  it('is the sum of the sections (bigger sections weigh more), with the worst one named', () => {
    const s = session();
    s.ship.applyDamage({ section: 'hull_port', amount: 48 });
    expect(s.ship.overall()).toMatchObject({ hp: 432, max: 480, pct: 90, state: 'healthy', damaged: 1 });
    expect(s.ship.overall().worst.id).toBe('hull_port');
    s.ship.applyDamage({ section: 'rigging', amount: 30 });
    expect(s.ship.overall()).toMatchObject({ hp: 402, pct: 84, state: 'worn', damaged: 2 });
    expect(s.ship.overall().worst.id).toBe('rigging'); // 50% beats 52%
    // The same blow to a hull and to the deck costs the ship the same.
    const a = session();
    const b = session();
    a.ship.applyDamage({ section: 'hull_starboard', amount: 30 });
    b.ship.applyDamage({ section: 'deck', amount: 30 });
    expect(a.ship.overall().pct).toBe(b.ship.overall().pct);
    expect(a.ship.section('hull_starboard').state).not.toBe(b.ship.section('deck').state);
  });
});

// ---------------------------------------------------------------------------------------------
describe('6. critical and disabled', () => {
  it('one blow can\'t take a section that is holding straight to nothing (except on Brutal); a vital one at 0 sinks her, once', () => {
    const bus = new EventBus();
    const s = GameSession.newGame({ content, bus, strictFlags: true });
    const sunk = [];
    bus.on('ship:destroyed', (e) => sunk.push(e));
    const captain = shipTuning(content, 'captain');
    expect(s.ship.applyDamage({ section: 'hull_port', amount: 500, category: 'cannon', tuning: captain })).toMatchObject({ after: 1, to: 'critical', destroyed: false });
    expect(s.ship.section('hull_port')).toMatchObject({ state: 'critical', operational: true, efficiency: 0.4 });
    expect(s.ship.applyDamage({ section: 'hull_port', amount: 5, tuning: captain })).toMatchObject({ after: 0, to: 'disabled', destroyed: true, becameDestroyed: true });
    expect(s.ship.section('hull_port')).toMatchObject({ state: 'disabled', operational: false, efficiency: 0 });
    expect(s.ship.destroyed).toBe(true);
    expect(evaluateCondition({ ship: { destroyed: true } }, s)).toBe(true);
    s.ship.applyDamage({ section: 'hull_port', amount: 5 });
    s.ship.applyDamage({ section: 'hull_starboard', amount: 500, tuning: captain });
    s.ship.applyDamage({ section: 'hull_starboard', amount: 500, tuning: captain });
    expect(sunk).toEqual([{ section: 'hull_port' }]);
    // The campaign has no defeat for it: the world runs this hook's script if content ever gives one.
    expect(content.ship.onDestroyed).toBeUndefined();

    // A section that isn't vital, at 0: out of action, the ship still afloat. Brutal has no grace.
    const t = session();
    expect(t.ship.applyDamage({ section: 'rigging', amount: 500, category: 'storm', tuning: shipTuning(content, 'brutal') })).toMatchObject({ after: 0, to: 'disabled', destroyed: false });
    expect(t.ship.isOperational('rigging')).toBe(false);
    expect(t.ship.efficiency('rigging')).toBe(0);
    expect(t.ship.destroyed).toBe(false);
    // A section at 0 needs its rebuild, not a patch.
    expect(repairIdFor(sectionDef(content, 'rigging'), 0)).toBe('rigging_rebuild');
    expect(repairIdFor(sectionDef(content, 'rigging'), 1)).toBe('rigging_splice');
    expect(repairPlan(t, 'rigging', { anywhere: true }).repair.id).toBe('rigging_rebuild');
  });
});

// ---------------------------------------------------------------------------------------------
describe('7. invalid operations change nothing', () => {
  it('bad targets, categories and amounts are refused; integrity stays within 0 and the maximum', () => {
    const bus = new EventBus();
    const s = GameSession.newGame({ content, bus, strictFlags: true });
    const changed = [];
    bus.on('ship:changed', (e) => changed.push(e));
    const bad = [
      [{ section: 'keel', amount: 5 }, 'unknown section'],
      [{ section: '//', amount: 5 }, 'unknown section'],
      [{ amount: 5 }, 'unknown section'],
      [{ section: 'hull_port', amount: 5, category: 'lava' }, 'unknown category'],
      [{ section: 'hull_port', amount: 0 }, 'invalid amount'],
      [{ section: 'hull_port', amount: -5 }, 'invalid amount'],
      [{ section: 'hull_port', amount: Number.NaN }, 'invalid amount'],
      [{ section: 'hull_port', amount: 'lots' }, 'invalid amount'],
      [{ section: 'hull_port', amount: Infinity }, 'invalid amount'],
    ];
    for (const [req, reason] of bad) expect(s.ship.applyDamage(req)).toMatchObject({ ok: false, reason, applied: 0 });
    expect(s.ship.restore('keel', 5)).toMatchObject({ ok: false, reason: 'unknown section' });
    expect(s.ship.restore('hull_port', -1)).toMatchObject({ ok: false, reason: 'invalid amount' });
    expect(s.ship.restore('hull_port', 0)).toMatchObject({ ok: false, reason: 'invalid amount' });
    expect(hps(s)).toEqual(WHOLE);
    expect(changed).toEqual([]);
    // Never below 0, never past the maximum.
    expect(s.ship.applyDamage({ section: 'deck', amount: 1e9, tuning: { grace: false } })).toMatchObject({ applied: 60, after: 0 });
    expect(s.ship.applyDamage({ section: 'deck', amount: 5 })).toMatchObject({ ok: true, applied: 0, after: 0 });
    expect(s.ship.restore('deck', 1e9)).toMatchObject({ restored: 60, after: 60 });
    expect(s.ship.restore('deck', 5)).toMatchObject({ restored: 0, after: 60 });
  });

  it('one event lands once however often its callback fires; repeated real attacks all land; a resolved challenge can\'t deal more', async () => {
    const s = session();
    const bite = { section: 'hull_port', amount: 10, category: 'shark', eventId: 'shark_7:bite_1' };
    expect(s.ship.applyDamage(bite).ok).toBe(true);
    expect(s.ship.applyDamage(bite)).toMatchObject({ ok: false, reason: 'duplicate event' });
    expect(s.ship.applyDamage({ ...bite, eventId: 'shark_7:bite_2' }).ok).toBe(true);
    s.ship.applyDamage({ section: 'hull_port', amount: 10 });
    s.ship.applyDamage({ section: 'hull_port', amount: 10 });
    expect(hp(s, 'hull_port')).toBe(60);
    expect(s.ship.applyDamage({ section: 'bow', amount: 10, challengeState: 'resolved' })).toMatchObject({ ok: false, reason: 'challenge already resolved' });
    expect(s.ship.applyDamage({ section: 'bow', amount: 10, challengeState: 'resolved', authorized: true }).ok).toBe(true);
    expect(s.ship.applyDamage({ section: 'bow', amount: 10, challengeState: 'awaiting' }).ok).toBe(true);
    expect(hp(s, 'bow')).toBe(60);

    // The command: a refused blow changes nothing and the script goes on; a step that can't be right is an error.
    const t = story();
    await t.run([{ shipDamage: 'hull_port', amount: 10, eventId: 'fx_once' }, { shipDamage: 'hull_port', amount: 10, eventId: 'fx_once' }, { setVar: 'fx_after', value: 1 }]);
    expect(hp(t.session, 'hull_port')).toBe(90);
    expect(texts(t).length).toBe(1);
    expect(t.session.story.getVar('fx_after')).toBe(1);
    await expect(t.run([{ shipRestore: 'keel', amount: 5 }])).rejects.toThrow(/unknown section/);
  });
});

// ---------------------------------------------------------------------------------------------
describe('8. repairing', () => {
  it('needs a damaged section, the right room (or a station that allows anywhere) and the materials; never past the maximum', async () => {
    const s = story();
    stock(s.session, TEN);
    s.session.ship.applyDamage({ section: 'hull_port', amount: 40 });
    expect(s.map).toBe('crew_quarters');
    expect(repairPlan(s.session, 'hull_port')).toMatchObject({ ok: true, here: true, attempts: 8, repair: { id: 'hull_patch' } });
    await s.run([{ shipRepair: 'hull_port' }]);
    expect(hp(s.session, 'hull_port')).toBe(95);
    await s.run([{ shipRepair: 'hull_port' }]);
    expect(hp(s.session, 'hull_port')).toBe(100); // 95 + 35, kept to the maximum
    expect(s.challengeRecords.length).toBe(2);
    // Nothing to repair: refused before anything starts.
    await s.run([{ shipRepair: 'hull_port', outcomeValue: 'fx_ship_out' }]);
    expect(s.session.story.getValue('fx_ship_out')).toBe('refused');
    expect(s.challengeRecords.length).toBe(2);
    expect(texts(s).at(-1)).toBe('<r>The port hull needs no repair.</>');
    // The deck is worked on deck.
    s.session.ship.applyDamage({ section: 'deck', amount: 30 });
    const deck = content.maps.get('main_deck').name;
    expect(repairPlan(s.session, 'deck')).toMatchObject({ ok: false, reason: 'elsewhere', message: `Work on the main deck from: ${deck}.` });
    const before = held(s.session);
    await s.run([{ shipRepair: 'deck' }]);
    expect(hp(s.session, 'deck')).toBe(30);
    expect(held(s.session)).toEqual(before);
    await s.run([{ shipRepair: 'deck', anywhere: true }]);
    expect(hp(s.session, 'deck')).toBe(60);
    expect(s.challengeRecords.at(-1)).toMatchObject({ id: 'ship:deck:deck_mend', kind: 'repair', outcome: 'success' });
    // An unknown section is refused, too.
    expect(repairPlan(s.session, 'keel')).toMatchObject({ ok: false, reason: 'unknown' });
  });
});

// ---------------------------------------------------------------------------------------------
describe('9. materials are consumed', () => {
  it('a repair takes exactly its bill, and the record shows the materials and the section changing together', async () => {
    const s = story();
    stock(s.session, TEN);
    s.session.ship.applyDamage({ section: 'hull_port', amount: 40 });
    const others = () => Object.entries(s.session.inventory.serialize().items).filter(([id]) => !MATERIALS.includes(id));
    const rest = JSON.stringify(others());
    await s.run([{ shipRepair: 'hull_port' }]);
    expect(held(s.session)).toEqual({ planks: 8, nails: 8, rope: 10, sailcloth: 10 });
    expect(s.challengeRecords[0].transitions).toMatchObject({ items: { planks: -2, nails: -2 }, ship: { hull_port: [60, 95] } });
    // A rough repair also takes its extra.
    s.session.ship.applyDamage({ section: 'hull_port', amount: 40 });
    s.playHands({ fumbles: 1 });
    await s.run([{ shipRepair: 'hull_port' }]);
    expect(s.challengeRecords[1].outcome).toBe('partial');
    expect(held(s.session)).toEqual({ planks: 6, nails: 5, rope: 10, sailcloth: 10 });
    // Rope and canvas for the rigging.
    s.session.ship.applyDamage({ section: 'rigging', amount: 30 });
    await s.run([{ shipRepair: 'rigging', anywhere: true }]);
    expect(held(s.session)).toEqual({ planks: 6, nails: 5, rope: 8, sailcloth: 9 });
    expect(JSON.stringify(others())).toBe(rest);
  });
});

// ---------------------------------------------------------------------------------------------
describe('10. not enough materials', () => {
  it('is said plainly, and nothing starts: no bar, no record, nothing taken', async () => {
    const s = story();
    s.session.ship.applyDamage({ section: 'hull_port', amount: 40 });
    stock(s.session, { planks: 2, nails: 2 });
    // The bill is there, but not a rough repair's extra nail: a repair must be able to pay for its worst outcome.
    expect(repairPlan(s.session, 'hull_port')).toMatchObject({ ok: false, reason: 'materials', missing: [{ item: 'nails', count: 3, have: 2 }], attempts: 0, message: 'Not enough materials: Nails 2/3.' });
    await s.run([{ shipRepair: 'hull_port', outcomeValue: 'fx_out' }]);
    expect(texts(s)).toEqual(['<r>Not enough materials: Nails 2/3.</>']);
    expect(s.session.story.getValue('fx_out')).toBe('refused');
    expect(s.challengeAttempts).toEqual([]);
    expect(s.challengeRecords).toEqual([]);
    expect(held(s.session)).toEqual({ planks: 2, nails: 2, rope: 0, sailcloth: 0 });
    expect(hp(s.session, 'hull_port')).toBe(60);
    // Nothing at all.
    s.session.ship.applyDamage({ section: 'rigging', amount: 30 });
    expect(repairPlan(s.session, 'rigging', { anywhere: true }).message).toBe('Not enough materials: Rope 0/3, Sailcloth 0/1.');
  });
});

// ---------------------------------------------------------------------------------------------
describe('11. a repair is all or nothing', () => {
  it('missing materials, or an inventory that fails half-way, leave the hold and the section as they were', () => {
    const s = session();
    s.ship.applyDamage({ section: 'hull_port', amount: 40 });
    stock(s, { planks: 2, nails: 1 });
    const bill = [{ item: 'planks', count: 2 }, { item: 'nails', count: 2 }];
    expect(s.ship.commitRepair({ section: 'hull_port', restore: 35, items: bill, inventory: s.inventory })).toMatchObject({ ok: false, reason: 'materials', missing: [{ item: 'nails', count: 2, have: 1 }] });
    expect(held(s)).toMatchObject({ planks: 2, nails: 1 });
    expect(hp(s, 'hull_port')).toBe(60);
    // The inventory refuses the second item: the first is put back, nothing restored.
    stock(s, { nails: 5 });
    const flaky = { count: (id) => s.inventory.count(id), remove: (id, n) => (id === 'nails' ? false : s.inventory.remove(id, n)), add: (id, n) => s.inventory.add(id, n) };
    expect(s.ship.commitRepair({ section: 'hull_port', restore: 35, items: bill, inventory: flaky }).ok).toBe(false);
    expect(held(s)).toMatchObject({ planks: 2, nails: 6 });
    expect(hp(s, 'hull_port')).toBe(60);
    // One item named twice is one bill: 8 nails, not 4 twice.
    expect(s.ship.commitRepair({ section: 'hull_port', restore: 10, items: [{ item: 'nails', count: 4 }, { item: 'nails', count: 4 }], inventory: s.inventory }).ok).toBe(false);
    expect(held(s)).toMatchObject({ nails: 6 });
    // A good bill: all taken, then restored.
    expect(s.ship.commitRepair({ section: 'hull_port', restore: 35, items: bill, inventory: s.inventory })).toMatchObject({ ok: true, restored: 35, after: 95, spent: bill });
    expect(held(s)).toMatchObject({ planks: 0, nails: 4 });
    expect(s.ship.commitRepair({ section: 'keel', restore: 5, items: [], inventory: s.inventory })).toMatchObject({ ok: false, reason: 'unknown section' });
  });
});

// ---------------------------------------------------------------------------------------------
describe('12. repeated input', () => {
  it('two presses start one repair: one bar, one bill, the lock let go after', async () => {
    const s = story();
    stock(s.session, TEN);
    s.session.ship.applyDamage({ section: 'hull_port', amount: 40 });
    await Promise.all([s.run([{ shipRepair: 'hull_port' }]), s.run([{ shipRepair: 'hull_port' }])]);
    expect(s.challengeRecords.length).toBe(1);
    expect(s.challengeAttempts.length).toBe(1);
    expect(hp(s.session, 'hull_port')).toBe(95);
    expect(held(s.session)).toMatchObject({ planks: 8, nails: 8 });
    expect(s.session.ship.isLocked('hull_port')).toBe(false);
    // While one is under way the plan says so.
    s.onAttempt(() => {
      expect(repairPlan(s.session, 'hull_port')).toMatchObject({ ok: false, reason: 'busy' });
    });
    await s.run([{ shipRepair: 'hull_port' }]);
    expect(s.session.ship.isLocked('hull_port')).toBe(false);
  });

  it('the lock is let go even when the repair breaks', async () => {
    const s = story();
    stock(s.session, TEN);
    s.session.ship.applyDamage({ section: 'hull_port', amount: 40 });
    s.onAttempt(() => {
      throw new Error('the bar broke');
    });
    await expect(s.run([{ shipRepair: 'hull_port' }])).rejects.toThrow(/the bar broke/);
    expect(s.session.ship.isLocked('hull_port')).toBe(false);
    expect(held(s.session)).toMatchObject({ planks: 10, nails: 10 });
    expect(hp(s.session, 'hull_port')).toBe(60);
  });
});

// ---------------------------------------------------------------------------------------------
describe('13-15. a repair\'s outcomes come from the timing bar', () => {
  it('13. success: the full amount for the bill, then the branch sees the repaired ship', async () => {
    const s = story();
    stock(s.session, TEN);
    s.session.ship.applyDamage({ section: 'hull_port', amount: 40 });
    await s.run([{
      shipRepair: 'hull_port', outcomeValue: 'fx_out',
      ifSuccess: [{ if: { ship: { section: 'hull_port', state: 'healthy' } }, then: [{ setVar: 'fx_saw', value: 1 }] }],
    }]);
    expect(s.challengeRecords[0]).toMatchObject({ id: 'ship:hull_port:hull_patch', kind: 'repair', difficulty: 'captain', outcome: 'success', attempt: 1 });
    expect(s.session.story.getValue('fx_out')).toBe('success');
    expect(s.session.story.getVar('fx_saw')).toBe(1);
    expect(texts(s).at(-1)).toBe('<g>Repaired:</> Port hull 95% HEALTHY. <k>Used 2 Planks, 2 Nails.</>');
  });

  it('14. partial: done with fumbles, half the amount and an extra nail', async () => {
    const s = story();
    stock(s.session, TEN);
    s.session.ship.applyDamage({ section: 'hull_port', amount: 40 });
    s.playHands({ fumbles: 1 });
    await s.run([{ shipRepair: 'hull_port', outcomeValue: 'fx_out', ifPartial: [{ setVar: 'fx_rough', value: 1 }] }]);
    expect(s.challengeRecords[0].outcome).toBe('partial');
    expect(hp(s.session, 'hull_port')).toBe(78);
    expect(held(s.session)).toMatchObject({ planks: 8, nails: 7 });
    expect(s.session.story.getVar('fx_rough')).toBe(1);
    expect(texts(s).at(-1)).toBe('<y>Rough repair:</> Port hull 78% WORN. <k>Used 2 Planks, 3 Nails.</>');
  });

  it('15. failure: each try wastes its nail, the tries end with the materials, and giving up costs a little more hull', async () => {
    const s = story();
    s.session.ship.applyDamage({ section: 'hull_port', amount: 40 });
    stock(s.session, { planks: 2, nails: 4 });
    expect(repairPlan(s.session, 'hull_port').attempts).toBe(2);
    s.playHands('fumble', 'fumble');
    await s.run([{ shipRepair: 'hull_port', outcomeValue: 'fx_out', ifFailure: [{ setVar: 'fx_failed', value: 1 }] }]);
    const rec = s.challengeRecords[0];
    expect(rec).toMatchObject({ outcome: 'failure', attempt: 2, maxAttempts: 2, decision: 'continue' });
    expect(s.challengeDecisions.map((d) => [d.options, d.choice])).toEqual([[['retry', 'continue'], 'retry'], [['continue'], 'continue']]);
    expect(held(s.session)).toMatchObject({ planks: 2, nails: 2 }); // two nails wasted, the bill never taken
    expect(hp(s.session, 'hull_port')).toBe(56); // 60, less the botched repair's 4
    expect(s.session.story.getValue('fx_out')).toBe('failure');
    expect(s.session.story.getVar('fx_failed')).toBe(1);
    expect(texts(s)).toEqual(['Port hull hit by a botched repair: <y>56% DAMAGED</>!', '<r>The repair failed.</> <k>Wasted 2 Nails.</>']);
    // A repair is never won by default: the worst hand can't finish the bar.
    expect(s.challengeAttempts.every((a) => a.completed === false)).toBe(true);
    // Giving up at once: one nail and the damage.
    const t = story();
    t.session.ship.applyDamage({ section: 'hull_port', amount: 40 });
    stock(t.session, TEN);
    t.playHands('fumble');
    t.decideChallenges('continue');
    await t.run([{ shipRepair: 'hull_port' }]);
    expect(held(t.session)).toMatchObject({ planks: 10, nails: 9 });
    expect(hp(t.session, 'hull_port')).toBe(56);
    // A stale or doubled input can only take an option that was offered (here: the first, "Try again").
    const u = story();
    u.session.ship.applyDamage({ section: 'hull_port', amount: 40 });
    stock(u.session, TEN);
    u.playHands('fumble', 'perfect');
    u.decideChallenges('fallback');
    await u.run([{ shipRepair: 'hull_port' }]);
    expect(u.challengeRecords[0]).toMatchObject({ outcome: 'success', attempt: 2 });
  });
});

// ---------------------------------------------------------------------------------------------
describe('16-18. checkpoints and retries', () => {
  it('16. damage taken in a failed attempt is undone with it; a checkpoint taken while damaged comes back damaged', async () => {
    const s = session();
    s.ship.applyDamage({ section: 'hull_port', amount: 20 });
    const rec = await direct(s, STRICT_REPAIR({ id: 'fx_cp_damage' }), [FAIL, WIN], {
      during: (info) => info.attempt === 1 && s.ship.applyDamage({ section: 'hull_port', amount: 30 }),
    });
    expect(rec).toMatchObject({ outcome: 'success', attempt: 2 });
    expect(hp(s, 'hull_port')).toBe(80);
    const cp = captureCheckpoint(s, { id: 'fx' });
    s.ship.restore('hull_port', 20);
    s.ship.applyDamage({ section: 'deck', amount: 10 });
    s.ship.applyDamage({ section: 'hull_starboard', amount: 500, tuning: { grace: false } });
    expect(s.ship.destroyed).toBe(true);
    restoreCheckpoint(s, cp);
    expect(hps(s)).toEqual({ ...WHOLE, hull_port: 80 });
    expect(s.ship.destroyed).toBe(false);

    // The same through a script step (the game's command path): the hit during attempt 1 is gone after the retry.
    const t = story();
    t.onAttempt((info) => info.id === 'fx_cp_step' && info.attempt === 1 && t.session.ship.applyDamage({ section: 'bow', amount: 30 }));
    t.playHands('fumble', 'perfect');
    await t.run([{ repair: 'hull', strikes: 3, challenge: STRICT_REPAIR({ id: 'fx_cp_step', onFailure: { mustRetry: true } }) }]);
    expect(t.challengeRecords[0]).toMatchObject({ outcome: 'success', attempt: 2 });
    expect(hps(t.session)).toEqual(WHOLE);
  });

  it('17. a checkpoint from before a repair brings back the damage and the materials together; a finished repair outlives a later retry', async () => {
    const s = session();
    s.ship.applyDamage({ section: 'hull_port', amount: 40 });
    stock(s, TEN);
    const cp = captureCheckpoint(s, { id: 'before' });
    s.ship.commitRepair({ section: 'hull_port', restore: 35, items: [{ item: 'planks', count: 2 }, { item: 'nails', count: 2 }], inventory: s.inventory });
    expect([hp(s, 'hull_port'), held(s).planks]).toEqual([95, 8]);
    restoreCheckpoint(s, cp);
    expect([hp(s, 'hull_port'), held(s).planks, held(s).nails]).toEqual([60, 10, 10]);

    const t = story();
    stock(t.session, TEN);
    t.session.ship.applyDamage({ section: 'hull_port', amount: 40 });
    await t.run([{ shipRepair: 'hull_port' }]);
    t.playHands('fumble', 'perfect');
    await t.run([{ repair: 'hull', strikes: 3, challenge: STRICT_REPAIR({ id: 'fx_later', onFailure: { mustRetry: true } }) }]);
    expect(t.challengeRecords[1]).toMatchObject({ outcome: 'success', attempt: 2 });
    expect(hp(t.session, 'hull_port')).toBe(95);
    expect(held(t.session)).toMatchObject({ planks: 8, nails: 8 });
  });

  it('18. what is meant to last survives "Try again", once: wasted materials, and damage a challenge names as its failure\'s cost', async () => {
    const s = story();
    stock(s.session, TEN);
    s.session.ship.applyDamage({ section: 'hull_port', amount: 40 });
    s.playHands('fumble', 'perfect');
    await s.run([{ shipRepair: 'hull_port' }]);
    expect(s.challengeRecords[0]).toMatchObject({ outcome: 'success', attempt: 2 });
    expect(s.challengeRecords[0].consequences.costs).toBe(1);
    expect(held(s.session)).toMatchObject({ planks: 8, nails: 7 }); // one wasted, two for the bill
    expect(hp(s.session, 'hull_port')).toBe(95);

    const t = story();
    t.playHands('fumble', 'fumble', 'perfect');
    await t.run([{
      repair: 'hull', strikes: 3,
      challenge: STRICT_REPAIR({ id: 'fx_sticky', onFailure: { mustRetry: true, costs: [{ shipDamage: 'hull_starboard', amount: 10, category: 'impact', scale: false, announce: false }] } }),
    }]);
    expect(t.challengeRecords[0]).toMatchObject({ outcome: 'success', attempt: 3 });
    expect(hp(t.session, 'hull_starboard')).toBe(80); // two failures, ten each: never undone, never doubled

    // A partial's consequences run inside the challenge, so they land; a callback after the run has closed doesn't.
    const u = story();
    u.playHands({ fumbles: 1 });
    await u.run([{
      repair: 'hull', strikes: 3,
      challenge: STRICT_REPAIR({ id: 'fx_partial_cost', onPartial: { consequences: [{ shipDamage: 'bow', amount: 10, scale: false, announce: false }] } }),
    }]);
    expect(u.challengeRecords[0].outcome).toBe('partial');
    expect(hp(u.session, 'bow')).toBe(70);
    const cmd = createCommandImplementations().shipDamage;
    const late = { session: u.session, content, challenge: u.challengeRecords[0], challengePrefs: () => ({ difficulty: 'captain' }) };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await cmd({ shipDamage: 'bow', amount: 10, scale: false, announce: false }, late);
    expect(hp(u.session, 'bow')).toBe(70);
    expect(warn).toHaveBeenCalledWith('shipDamage bow: challenge already resolved');
    warn.mockRestore();
    await cmd({ shipDamage: 'bow', amount: 10, scale: false, announce: false, authorized: true }, late);
    expect(hp(u.session, 'bow')).toBe(60);
  });
});

// ---------------------------------------------------------------------------------------------
describe('19. difficulty', () => {
  it('scales damage, repairs, materials, penalties and the bar, from the one difficulty system', async () => {
    // (Prompt 6 added the hazards' leakScale, fireScale and responseScale: tests/hazards.test.js.)
    expect(shipTuning(content, 'deckhand')).toMatchObject({ damageScale: 0.75, repairScale: 1.25, costScale: 0.5, grace: true });
    expect(shipTuning(content, 'captain')).toMatchObject({ damageScale: 1, repairScale: 1, costScale: 1, grace: true });
    expect(shipTuning(content, 'brutal')).toMatchObject({ damageScale: 1.25, repairScale: 0.85, costScale: 1.5, grace: false });
    expect(shipTuning(content, 'nightmare')).toEqual(shipTuning(content, 'captain'));
    const want = {
      deckhand: { cost: [1, 1], success: 44, partial: 23, extra: 1, waste: 1, damage: 3, maxFumbles: 3, hit: 30, after: 100, left: [9, 9] },
      captain: { cost: [2, 2], success: 35, partial: 18, extra: 1, waste: 1, damage: 4, maxFumbles: 2, hit: 40, after: 95, left: [8, 8] },
      brutal: { cost: [3, 3], success: 30, partial: 15, extra: 2, waste: 2, damage: 5, maxFumbles: 1, hit: 50, after: 80, left: [7, 7] },
    };
    for (const d of DIFFS) {
      const w = want[d];
      const r = resolveRepair(content, 'hull_patch', d);
      expect([d, r.cost.map((c) => c.count), r.results.success.restore, r.results.partial.restore, r.results.partial.extra[0].count, r.results.failure.waste[0].count, r.results.failure.damage])
        .toEqual([d, w.cost, w.success, w.partial, w.extra, w.waste, w.damage]);
      const s = story({ prefs: { difficulty: d } });
      stock(s.session, TEN);
      await s.run([{ shipDamage: 'hull_port', amount: 40, category: 'shark' }]);
      expect([d, hp(s.session, 'hull_port')]).toEqual([d, 100 - w.hit]);
      await s.run([{ shipRepair: 'hull_port' }]);
      expect([d, hp(s.session, 'hull_port'), held(s.session).planks, held(s.session).nails]).toEqual([d, w.after, ...w.left]);
      expect([d, s.challengeRecords[0].difficulty, s.challengeAttempts[0].bar.maxFumbles]).toEqual([d, d, w.maxFumbles]);
      // How close to nothing one blow can take a section.
      const t = session();
      t.ship.applyDamage({ section: 'hull_port', amount: 500, tuning: shipTuning(content, d) });
      expect([d, hp(t, 'hull_port')]).toEqual([d, d === 'brutal' ? 0 : 1]);
    }
  });

  it('a repair keeps the difficulty it started on', async () => {
    const s = story();
    stock(s.session, TEN);
    s.session.ship.applyDamage({ section: 'hull_port', amount: 40 });
    s.onAttempt(() => s.setPrefs({ difficulty: 'brutal' }));
    await s.run([{ shipRepair: 'hull_port' }]);
    expect(s.challengeRecords[0].difficulty).toBe('captain');
    expect(hp(s.session, 'hull_port')).toBe(95);
    expect(held(s.session)).toMatchObject({ planks: 8, nails: 8 });
  });
});

// ---------------------------------------------------------------------------------------------
describe('20. the timing assist', () => {
  const play = async (prefs, hand = 'perfect') => {
    const s = story({ prefs: { difficulty: 'captain', ...prefs } });
    stock(s.session, TEN);
    s.session.ship.applyDamage({ section: 'hull_port', amount: 40 });
    s.playHands(hand);
    s.decideChallenges('continue');
    await s.run([{ shipRepair: 'hull_port' }]);
    return { hp: hps(s.session), held: held(s.session), bar: s.challengeAttempts[0].bar, assists: s.challengeAttempts[0].assists, outcome: s.challengeRecords[0].outcome };
  };

  it('eases the repair\'s bar and nothing else: the same hand restores the same and costs the same', async () => {
    const off = await play({ timingAssist: 'off' });
    for (const level of ['light', 'strong']) {
      const on = await play({ timingAssist: level });
      expect(off.assists).toEqual([]);
      expect(on.assists).toEqual([`timingAssist:${level}`]);
      expect(on.bar.zone).toBeGreaterThan(off.bar.zone);
      expect(on.bar.speed).toBeLessThan(off.bar.speed);
      expect(on.bar.maxFumbles).toBe(off.bar.maxFumbles);
      expect([on.outcome, on.hp, on.held]).toEqual([off.outcome, off.hp, off.held]);
    }
    // A hand that can't find the green fails with or without it: the assist is time and room, not a free repair.
    expect((await play({ timingAssist: 'strong' }, 'fumble')).outcome).toBe('failure');
  });

  it('the classic bar (an accessibility option for strict bars) helps after a miss, and a repair can still fail', async () => {
    const rough = await play({ classicBar: true }, { fumbles: 1 });
    expect(rough.assists).toEqual(['classicBar']);
    expect(rough.bar.assist).toMatchObject({ widenAfter: 1, steadyAfter: 2 });
    expect(rough.bar.maxFumbles).toBe(2);
    expect([rough.outcome, rough.hp.hull_port, rough.held.nails]).toEqual(['partial', 78, 7]);
    expect((await play({ classicBar: true }, 'fumble')).outcome).toBe('failure');
  });
});

// ---------------------------------------------------------------------------------------------
describe('21-23. saves (version 18, since Prompt 6 19)', () => {
  /** A save as version 17 wrote it: no ship. */
  function v17Save(s, storage) {
    const saves = new SaveManager({ storage, content, version: 17 });
    const serialize = s.serialize.bind(s);
    s.serialize = () => {
      const state = serialize();
      delete state.ship;
      return state;
    };
    const out = saves.save(1, s);
    s.serialize = serialize;
    return out;
  }

  it('21. a version 17 save loads with a whole ship and everything else as it was', () => {
    expect(SAVE_VERSION).toBe(21);
    const s = session();
    stock(s, { planks: 3 });
    s.story.setVar('fx_kept', 7);
    const storage = new MemoryStorage();
    const wrote = v17Save(s, storage);
    expect(wrote.ok).toBe(true);
    expect(wrote.record.version).toBe(17);
    expect(wrote.record.state.ship).toBeUndefined();
    const read = new SaveManager({ storage, content }).read(1);
    expect(read.ok).toBe(true);
    expect(read.state.ship).toEqual({ sections: {} });
    const loaded = GameSession.fromState({ content, bus: new EventBus(), state: read.state });
    expect(hps(loaded)).toEqual(WHOLE); // nothing invented
    const strip = (st) => {
      const { ship, playTime, ...rest } = st;
      void ship;
      void playTime;
      return rest;
    };
    // Everything else is what the same game saved as the current version loads as.
    const now = new SaveManager({ storage: new MemoryStorage(), content });
    now.save(1, s);
    const same = GameSession.fromState({ content, bus: new EventBus(), state: now.read(1).state });
    expect(strip(loaded.serialize())).toEqual(strip(same.serialize()));
    expect(loaded.story.getVar('fx_kept')).toBe(7);
    expect(loaded.inventory.count('planks')).toBe(3);
    // A version 17 state with something odd where the ship would be: still whole.
    for (const odd of [null, 7, 'ship', [1, 2], { sections: 'none' }]) {
      const st = structuredClone(wrote.record.state);
      st.ship = odd;
      const store = new MemoryStorage();
      const m = new SaveManager({ storage: store, content });
      // Written the way the game writes a save (its checksum over this state).
      const as = Object.create(s);
      as.serialize = () => st;
      const fixed = new SaveManager({ storage: store, content, version: 17 }).buildRecord(1, as);
      store.setItem(m.key(1), JSON.stringify(fixed));
      const r = m.read(1);
      expect([odd, r.ok]).toEqual([odd, true]);
      expect(hps(GameSession.fromState({ content, bus: new EventBus(), state: r.state }))).toEqual(WHOLE);
    }
  });

  it('22. the current version saves the ship and loads it back exactly; a damaged number is made safe', async () => {
    const s = story();
    s.session.ship.applyDamage({ section: 'hull_port', amount: 40 });
    s.session.ship.applyDamage({ section: 'rigging', amount: 500, tuning: { grace: false } });
    s.session.ship.applyDamage({ section: 'deck', amount: 12, eventId: 'fx_ev' });
    const t = reloadStory(s);
    expect(t.record.version).toBe(21);
    expect(t.record.state.ship.sections).toEqual({ ...WHOLE, hull_port: 60, rigging: 0, deck: 48 });
    // Since Prompt 6 the ship also saves its emergencies (none here) and the damage events applied (retry-safe, tests/hazards.test.js).
    expect(t.record.state.ship.hazards).toMatchObject({ leaks: [], water: {}, fires: [] });
    expect(t.record.state.ship.events).toEqual(['fx_ev']);
    expect(JSON.stringify(t.record.state.ship)).not.toMatch(/locks|seen/);
    expect(hps(t.session)).toEqual(hps(s.session));
    expect(t.session.ship.isOperational('rigging')).toBe(false);
    const warnings = [];
    const x = session();
    x.ship.load({ sections: { hull_port: -50, deck: 999, rigging: 'x', keel: 5, bow: 33.6 } }, (w) => warnings.push(w));
    expect(hps(x)).toEqual({ ...WHOLE, hull_port: 0, deck: 60, bow: 34 });
    expect(warnings).toEqual(['ship: section "rigging" had no number; it is whole again', 'ship: dropped unknown section "keel"']);
  });

  it('23. no save, load or retry makes or keeps a half-done repair, and nothing doubles', async () => {
    const s = story();
    s.session.ship.applyDamage({ section: 'hull_port', amount: 40 });
    stock(s.session, TEN);
    const storage = new MemoryStorage();
    const saves = new SaveManager({ storage, content });
    s.onAttempt((info) => {
      expect(saves.save(info.attempt, s.session).ok).toBe(true);
    });
    s.playHands('fumble', 'perfect');
    await s.run([{ shipRepair: 'hull_port' }]);
    expect(held(s.session)).toMatchObject({ planks: 8, nails: 7 });
    expect(hp(s.session, 'hull_port')).toBe(95);
    const load = (slot) => GameSession.fromState({ content, bus: new EventBus(), state: saves.read(slot).state });
    // Saved as the first try began: nothing spent, nothing restored, no repair under way.
    const one = load(1);
    expect([held(one).planks, held(one).nails, hp(one, 'hull_port')]).toEqual([10, 10, 60]);
    expect(one.ship.isLocked('hull_port')).toBe(false);
    expect(challengeLog(one).active.size).toBe(0);
    expect(repairPlan(one, 'hull_port').ok).toBe(true);
    // Saved as the second try began: the wasted nail stays wasted; the repair still to do.
    const two = load(2);
    expect([held(two).planks, held(two).nails, hp(two, 'hull_port')]).toEqual([10, 9, 60]);
    // After the repair: the same, however many times it's loaded.
    saves.save(3, s.session);
    const a = load(3);
    const b = load(3);
    for (const x of [a, b]) expect([held(x), hps(x)]).toEqual([held(s.session), hps(s.session)]);
  });
});

// ---------------------------------------------------------------------------------------------
describe('24-25. the campaign is unchanged', () => {
  it('24. no chapter damages, repairs or checks the ship, or hands out materials; legacy repairs take nothing', async () => {
    const campaign = Object.entries(FILES).filter(([p]) => !/^\/data\/(ship|debug|difficulty)\//.test(p) && p !== '/data/items/materials.json');
    expect(campaign.length).toBeGreaterThan(100);
    const text = campaign.map(([, v]) => JSON.stringify(v)).join('\n');
    expect(text).not.toMatch(/"ship(Damage|Restore|Repair)"/);
    expect(text).not.toMatch(/"ship":\{"(section|overall|destroyed|operational|state|integrity)"/);
    // No item reference anywhere names a material (giving, taking, checking, shops, drops, rewards).
    const refs = [];
    const visit = (v, at) => {
      if (Array.isArray(v)) v.forEach((x) => visit(x, at));
      else if (v && typeof v === 'object') {
        for (const k of ['giveItem', 'takeItem', 'hasItem', 'swapItem', 'item']) if (MATERIALS.includes(v[k])) refs.push(`${at}: ${k} ${v[k]}`);
        if (v.swapItem && MATERIALS.includes(v.to)) refs.push(`${at}: swapItem to ${v.to}`);
        for (const i of Array.isArray(v.items) ? v.items : []) {
          const id = typeof i === 'string' ? i : i?.id ?? i?.item;
          if (MATERIALS.includes(id)) refs.push(`${at}: items ${id}`);
        }
        Object.values(v).forEach((x) => visit(x, at));
      }
    };
    for (const [p, v] of campaign) visit(v, p);
    expect(refs).toEqual([]);
    // The ship_repair profile is the only new challenge profile, and only ship repairs use it.
    expect(text).not.toMatch(/"profile":"ship_repair"/);
    // A legacy repair step: its old bar, its var, no record, no materials, no ship.
    const s = story();
    stock(s.session, TEN);
    s.setRepairScore(2);
    await s.run([{ repair: 'hull', strikes: 3, var: 'fx_legacy' }]);
    expect(s.session.story.getVar('fx_legacy')).toBe(2);
    expect(s.challengeRecords).toEqual([]);
    expect(held(s.session)).toEqual(TEN);
    expect(s.session.ship.pristine).toBe(true);
  });

  it('24. a whole phase played through (Phase 17) never touches the ship', async () => {
    const { s } = await playPhase17('first');
    expect(s.session.ship.pristine).toBe(true);
    expect(texts(s)).toEqual([]);
    expect(MATERIALS.map((m) => s.session.inventory.count(m))).toEqual([0, 0, 0, 0]);
  }, 300000);

  it('25. every phase ends with a whole ship, in the approved snapshots and the presets they come from', () => {
    const baselines = import.meta.glob('/tests/regression/baselines/phase-*.json', { eager: true, import: 'default' });
    expect(Object.keys(baselines).length).toBe(17);
    for (const [file, snap] of Object.entries(baselines)) {
      expect([file, snap.gameplay.systems.ship]).toEqual([file, { destroyed: false, overall: 100, sections: WHOLE, hazards: { leaks: 0, fires: [], water: [], stability: 'steady', buckets: 0 }, air: { rooms: [], sources: 0, links: [], exposure: 0 }, pressure: { subjects: [], on: [], pending: [] } }]);
      expect(Object.keys(snap.gameplay.unsupported)).not.toContain('shipIntegrity');
    }
    for (const phase of PHASES) expect([phase.n, sessionAt(content, phase.preset).ship.pristine]).toEqual([phase.n, true]);
    // The registry knows the new commands: a repair is a challenge (no chapter uses it), damage and restore are not.
    expect(REGISTRY.shipRepair.commands).toEqual(['shipRepair']);
    expect(NON_CHALLENGE_COMMANDS).toEqual(expect.arrayContaining(['shipDamage', 'shipRestore']));
  });
});

/** Stand-in game objects: every call chains; text keeps what it's given. */
function stubScene(app) {
  const make = ([x = 0, y = 0] = []) => {
    const store = {
      x, y, visible: true, text: '', textWidth: 30, width: 30, height: 10,
      destroy() {},
      setText(v) {
        this.text = v;
        return this;
      },
    };
    const p = new Proxy(store, {
      get: (t, k) => (k in t ? t[k] : k === 'then' ? undefined : () => p),
      set: (t, k, v) => {
        t[k] = v;
        return true;
      },
    });
    store.scene = scene;
    return p;
  };
  const scene = {
    game: { app },
    add: new Proxy({}, { get: () => (...args) => make(args) }),
    tweens: new Proxy({}, { get: () => () => make() }),
    time: new Proxy({}, { get: () => () => make() }),
    textures: { exists: () => true },
    closed: [],
    close(opts) {
      this.closed.push(opts);
    },
  };
  return scene;
}

// ---------------------------------------------------------------------------------------------
describe('26. the Ship page with the keyboard and with a pad', () => {

  let pads = [];
  let now = 0;
  function rig(s) {
    const input = new InputManager({ target: {} });
    const sounds = [];
    const app = {
      session: s, content, input, fontMetrics: buildFonts().fonts,
      settings: { challengePrefs: () => ({ difficulty: 'captain', timingAssist: 'off', classicBar: false }) },
      audio: { ui: (n) => sounds.push(n), sfx: () => {} },
    };
    const scene = stubScene(app);
    const page = new ShipPage(scene, PANE);
    page.render();
    page.focus();
    input.update((now += 16));
    return { input, page, scene, sounds };
  }
  const frame = (r) => {
    now += 16;
    r.input.update(now);
    return r.page.update(r.input);
  };
  const key = (r, code) => {
    r.input.onKeyDown({ code, preventDefault() {} });
    const out = frame(r);
    r.input.onKeyUp({ code });
    frame(r);
    return out;
  };
  const button = (r, b) => {
    pads[0].buttons[b].pressed = true;
    pads[0].buttons[b].value = 1;
    const out = frame(r);
    pads[0].buttons[b].pressed = false;
    pads[0].buttons[b].value = 0;
    frame(r);
    return out;
  };
  const padRig = () => {
    const pad = { id: 'Test Pad (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false })) };
    pads = [pad];
    Object.defineProperty(globalThis, 'navigator', { value: { getGamepads: () => pads }, configurable: true, writable: true });
  };

  it('lists every section with its condition in words; Z (or pad A) on a damaged one starts one repair, once', () => {
    padRig();
    for (const device of ['keyboard', 'pad']) {
      const s = session();
      stock(s, TEN);
      s.ship.applyDamage({ section: 'hull_port', amount: 40 });
      s.ship.applyDamage({ section: 'deck', amount: 30 });
      const r = rig(s);
      expect(r.page.menu.items.map((i) => [i.value, i.right])).toEqual([
        ['hull_port', '60% WORN'], ['hull_starboard', '100% HEALTHY'], ['bow', '100% HEALTHY'], ['stern', '100% HEALTHY'], ['deck', '50% DAMAGED'], ['rigging', '100% HEALTHY'],
      ]);
      const confirm = () => (device === 'keyboard' ? key(r, 'KeyZ') : button(r, 0));
      const down = () => (device === 'keyboard' ? key(r, 'ArrowDown') : button(r, 13));
      const back = () => (device === 'keyboard' ? key(r, 'KeyX') : button(r, 1));
      // A whole section: a buzzer, nothing closes.
      down();
      expect(r.page.menu.selected.value).toBe('hull_starboard');
      confirm();
      expect(r.scene.closed).toEqual([]);
      expect(r.sounds).toContain('buzzer');
      // The deck from the crew quarters: refused (worked from the main deck).
      for (let i = 0; i < 3; i++) down();
      expect(r.page.menu.selected.value).toBe('deck');
      confirm();
      expect(r.scene.closed).toEqual([]);
      // The port hull: one press closes the menu and hands the world one repair; a second press does nothing.
      for (let i = 0; i < 2; i++) down();
      expect(r.page.menu.selected.value).toBe('hull_port');
      confirm();
      confirm();
      expect(r.scene.closed.length).toBe(1);
      const ran = [];
      r.scene.closed[0].then({ runScript: (steps) => ran.push(steps) });
      expect(ran).toEqual([[{ shipRepair: 'hull_port' }]]);
      expect(back()).toBe('exit');
      expect(s.ship.serialize().sections.hull_port).toBe(60); // the page itself changes nothing
    }
  });

  it('says what a repair needs against what the hold has, and when there isn\'t enough', () => {
    const s = session();
    s.ship.applyDamage({ section: 'hull_port', amount: 40 });
    stock(s, { planks: 1 });
    const r = rig(s);
    const lines = () => r.page.detail.objects.map((o) => o.text.replace(/\n/g, ' ')).filter(Boolean);
    expect(lines().join('\n')).toMatch(/Port hull 60\/100 \(vital\)/);
    expect(lines().join('\n')).toMatch(/WORKING/);
    expect(lines().join('\n')).toMatch(/Patch the hull: 2 Planks \(1\), 2 Nails \(0\)/);
    expect(lines().join('\n')).toMatch(/Not enough materials: Planks 1\/2, Nails 0\/3\./);
    key(r, 'KeyZ');
    expect(r.scene.closed).toEqual([]);
    expect(r.sounds).toContain('buzzer');
    stock(s, TEN);
    r.page.renderDetail();
    expect(lines().join('\n')).toMatch(/Repair \(8 tries\)/);
  });
});

// ---------------------------------------------------------------------------------------------
describe('the ship\'s words fit where the game shows them', () => {
  const { fonts } = buildFonts();
  const plain = (t) => parseMarkup(String(t).replace(/\{[^{}]+\}/g, 'XXXXXXXX')).text;

  it('every damage and repair notice wraps to at most four toast lines', async () => {
    const bad = [];
    const check = (st) => {
      for (const t of texts(st)) if (wrap(fonts.main, plain(t), TOAST_TEXT_WIDTH).split('\n').length > 4) bad.push(t);
    };
    // Every section, every category, every condition (and immune).
    const s = story();
    for (const id of sectionIds(content)) {
      for (const category of Object.keys(content.ship.categories)) {
        for (const amount of [1, 30, 45, 70, 200]) {
          await s.run([{ shipDamage: id, amount, category, scale: false }]);
          s.session.ship.restore(id, 1000);
        }
        await s.run([{ shipDamage: id, amount: 200, category, scale: false }, { shipDamage: id, amount: 200, category, scale: false }]);
        s.session.ship.restore(id, 1000);
      }
    }
    check(s);
    expect(texts(s).length).toBeGreaterThan(200);
    // Every repair and rebuild, on every difficulty, each outcome; and every refusal.
    for (const d of DIFFS) {
      const t = story({ prefs: { difficulty: d } });
      for (const id of sectionIds(content)) {
        for (const [hit, hand] of [[40, 'perfect'], [40, { fumbles: 1 }], [40, 'fumble'], [1000, 'perfect']]) {
          stock(t.session, { planks: 20, nails: 40, rope: 20, sailcloth: 15 });
          t.session.ship.applyDamage({ section: id, amount: hit, tuning: { grace: false } });
          t.playHands(hand);
          if (hand === 'fumble') t.decideChallenges('continue');
          await t.run([{ shipRepair: id, anywhere: true }]);
          t.session.ship.restore(id, 1000);
          for (const m of MATERIALS) t.session.inventory.remove(m, t.session.inventory.count(m));
        }
        t.session.ship.applyDamage({ section: id, amount: 1000, tuning: { grace: false } });
        await t.run([{ shipRepair: id, anywhere: true }]);
        t.session.location.map = 'treasure_hold';
        await t.run([{ shipRepair: id }]);
        t.session.location.map = 'crew_quarters';
        t.session.ship.restore(id, 1000);
        await t.run([{ shipRepair: id }]);
      }
      check(t);
    }
    expect(bad).toEqual([]);
  });

  it('the Ship page: no list row cut short, and every section\'s detail stays inside its panel, in every state', () => {
    const bottom = PANE.y + PANE.h - 4;
    const width = PANE.w - 24;
    const over = [];
    for (const room of ['crew_quarters', 'main_deck', 'treasure_hold']) {
      for (const hold of [{}, { planks: 1 }, { planks: 30, nails: 60, rope: 30, sailcloth: 20 }]) {
        for (const hit of [0, 30, 1000]) {
          const s = session();
          s.location.map = room;
          stock(s, hold);
          for (const id of sectionIds(content)) if (hit) s.ship.applyDamage({ section: id, amount: hit, tuning: { grace: false } });
          const input = new InputManager({ target: {} });
          const app = { session: s, content, input, fontMetrics: fonts, settings: { challengePrefs: () => ({ difficulty: 'brutal' }) }, audio: { ui: () => {}, sfx: () => {} } };
          const page = new ShipPage(stubScene(app), PANE);
          page.render();
          for (const item of page.menu.items) if (item.clipped) over.push(`row ${item.value}`);
          for (let i = 0; i < page.menu.items.length; i++) {
            page.menu.index = i;
            page.renderDetail();
            const objs = page.detail.objects;
            const last = objs.at(-1);
            const end = last.y + last.text.split('\n').length * 11;
            if (end > bottom) over.push(`${room} ${JSON.stringify(hold)} hit ${hit} ${page.menu.items[i].value}: ends at ${end}, panel ${bottom}`);
            for (const o of objs) if (o.textWidth > width) over.push(`${page.menu.items[i].value}: "${o.text}" is ${o.textWidth} wide`);
          }
        }
      }
    }
    expect(over).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------
describe('27. damage changes what the ship can do, and a repair gives it back', () => {
  it('the demo: hoist the mainsail, lose the rigging, can\'t hoist, rebuild it, hoist (badly), splice it, hoist', async () => {
    const scene = (label) => DEBUG_SHIP.scenes.find(([l]) => l.startsWith(label))[1];
    const s = makeStory({ preset: 'ship_demo' });
    expect(held(s.session)).toEqual({ planks: 6, nails: 6, rope: 4, sailcloth: 2 });
    const said = () => s.log.at(-1);
    await s.run(scene('Try to hoist'));
    expect(said()).toBe('-: Up goes the mainsail. The rigging holds.');
    await s.run(scene('The storm tears the rigging'));
    expect(s.session.ship.section('rigging')).toMatchObject({ hp: 0, state: 'disabled', operational: false });
    expect(evaluateCondition({ ship: { section: 'rigging', operational: false } }, s.session)).toBe(true);
    await s.run(scene('Try to hoist'));
    expect(said()).toMatch(/hangs in tatters/);
    // Rebuilt (from the deck): rope and canvas, and it works again, badly.
    await s.run([{ shipRepair: 'rigging', anywhere: true }]);
    expect(s.challengeRecords.at(-1)).toMatchObject({ id: 'ship:rigging:rigging_rebuild', outcome: 'success' });
    expect(s.session.ship.section('rigging')).toMatchObject({ hp: 30, state: 'damaged', operational: true, efficiency: 0.75 });
    expect(held(s.session)).toMatchObject({ rope: 1, sailcloth: 0 });
    await s.run(scene('Try to hoist'));
    expect(said()).toMatch(/goes up slowly/);
    // Nothing left to splice it with: said so.
    expect(repairPlan(s.session, 'rigging', { anywhere: true })).toMatchObject({ ok: false, reason: 'materials' });
    await s.run(scene('Give repair materials'));
    await s.run([{ shipRepair: 'rigging', anywhere: true }]);
    expect(s.session.ship.section('rigging')).toMatchObject({ hp: 60, state: 'healthy' });
    await s.run(scene('Try to hoist'));
    expect(said()).toBe('-: Up goes the mainsail. The rigging holds.');
  });
});
