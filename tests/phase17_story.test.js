import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { evaluateCondition } from '../src/systems/conditions/conditions.js';
import { atmosphereId } from '../src/systems/atmosphere.js';
import { sharkstormState, sharkstormFlare } from '../src/systems/hazards/sharkstorm.js';
import { readFartZone, fartZoneDef } from '../src/systems/fartZone.js';
import { makeStory, reloadStory } from './storyHarness.js';
import { PHASE17_QUESTS, STEPS17, playPhase17, playToEndP17, go } from './phase17Play.js';
import { BANNED_LIST } from './bannedNames.js';

/**
 * Story Phase 17, THE RETURN OF THE ANCIENT CREW AND THE COFFIN SOCK
 * CATASTROPHE (chapters 206-222), played headless from the end of Phase 16:
 * Brogath remembers his crew, the cut-outs, the forbidden door, the reunion,
 * the geniuses, Tilda's application, the documentary, Greyhook (blocked), the
 * converter and Captain Minutes, the late-night special, the Grand Restraint,
 * the Fire-Sharkstorm, Lord Thunderbottom and Agnes's rescue, the beard, the
 * Beard Joint and the paranoia spiral, and the Coffin Sock catastrophe. From
 * every preset too, and across a save and load.
 */

const CHAPTERS = Array.from({ length: 17 }, (_, i) => `p17c${i + 1}`);
const propLive = (s, map, id) => {
  const p = s.content.maps.require(map).props.find((x) => x.id === id);
  if (!p) throw new Error(`no prop ${id} on ${map}`);
  return !p.if || evaluateCondition(p.if, s.session);
};
const partyIds = (s) => s.session.party.members.map((m) => m.id);

/** A preset as the F2 jump starts it: the state, the chapter's opening scene, the room. */
async function fromPreset(preset) {
  const s = makeStory({ preset });
  const p = s.content.debugPresets.get(preset);
  if (p.script) await s.run(p.script);
  await s.enter(s.map);
  return s;
}

async function playUntil(s, ref) {
  for (let n = 0; n < 600; n++) {
    const step = STEPS17.find(([r]) => {
      const [q, o] = r.split('.');
      return s.session.quests.isObjectiveAvailable(q, o);
    });
    if (!step) throw new Error(`ran out of objectives before ${ref}`);
    if (step[0] === ref) return;
    await step[1](s);
  }
  throw new Error(`never reached ${ref}`);
}

describe('Story Phase 17 can be played start to finish (headless)', () => {
  let first;
  it('taking the first option at every choice', async () => {
    const gold = makeStory({ preset: 'p16_complete' }).session.inventory.gold;
    const { s, chapters } = await playPhase17('first');
    first = s;
    expect(chapters).toEqual(CHAPTERS);
    for (const q of PHASE17_QUESTS) expect(s.quest(q), q).toBe('completed');
    expect(s.stagingIssues.join('\n')).toBe('');
    expect(s.session.inventory.gold, 'Captain Minutes are not money: nothing in the phase touches the purse').toBe(gold);
  }, 180000);

  it('taking the last option at every choice (a wrong guess in the Fart Zone first); it converges', async () => {
    const { s, chapters } = await playPhase17('last');
    expect(chapters).toEqual(CHAPTERS);
    for (const q of PHASE17_QUESTS) expect(s.quest(q), q).toBe('completed');
    expect(s.stagingIssues.join('\n')).toBe('');
  }, 180000);

  it('ends where the source ends: the world state the phase leaves behind', () => {
    const s = first;
    const v = (name) => s.session.story.getValue(name);
    expect(s.has('p17_complete')).toBe(true);
    // Ledger and Tilda: alive again as cardboard, aboard for good, in the party once
    expect(v('ledger_status')).toBe('reincarnated_cardboard');
    expect(v('tilda_status')).toBe('reincarnated_cardboard');
    expect(partyIds(s)).toEqual(['blackbeard', 'ledger', 'tilda']);
    expect(s.has('old_crew_reunion_completed')).toBe(true);
    // three cut-outs left as they were; the door sealed again, reinforced
    expect(s.has('other_old_crew_cutouts_prepared')).toBe(true);
    expect(v('treasure_room_state')).toBe('sealed_reinforced');
    // Greyhook: proposed, believed, blocked, and still open
    expect(v('greyhook_expedition')).toBe('blocked');
    expect(s.quest('the_great_ledger_expedition')).toBe('active');
    expect(s.has('captain_minutes_invented')).toBe(true);
    expect(s.has('ledger_accounting_introduced')).toBe(true);
    expect(s.has('tilda_command_conflict_resolved')).toBe(true);
    expect(s.has('tilda_ignition_application_approved')).toBe(true);
    expect(s.session.inventory.count('tilda_ignition_permit')).toBe(1);
    // Tilda's cigarette lit through a catastrophic Fire-Waft; her corner singed for good
    expect(s.has('tilda_cigarette_lit')).toBe(true);
    expect(s.has('tilda_cardboard_singed')).toBe(true);
    expect(s.session.party.get('tilda').look.appearance).toBe('tilda_singed');
    // the storm overhead was briefly on fire and is going round as before
    expect(s.has('fire_sharkstorm_occurred')).toBe(true);
    expect(sharkstormFlare(s.content, s.session)).toBe(null);
    expect(sharkstormState(s.content, s.session)).toBe('rough_turbulence');
    // Agnes: survived, frazzled, persistent
    expect(s.has('agnes_post_rescue_condition')).toBe(true);
    expect(v('agnes_condition')).toBe('frazzled');
    expect(s.content.npcs.get('agnes_second').variants?.some((x) => x.appearance === 'agnes_frazzled') ?? true).toBe(true);
    // Thunderbottom: history now
    expect(v('thunderbottom_state')).toBe('departed');
    // the beard: Thunderbottom's release and the catastrophe in it
    expect(s.has('beard_thunderbottom_legendary')).toBe(true);
    expect(s.has('beard_coffin_sock_catastrophe')).toBe(true);
    // the Fart Zone worn but usable; the Fart-Free Zone still padded; Garrick still Grand Stenchmaster
    const fz = readFartZone(fartZoneDef(s.content), s.session);
    expect(fz.damage).toBeGreaterThan(0);
    expect(['COMPLETE', 'IDLE']).toContain(fz.state);
    expect(s.has('fart_free_zone_reinforced')).toBe(true);
    expect(s.has('garrick_regalia_restored')).toBe(true);
    // the green haze displaced by Coffin Sock; the big one released; the paranoia only partly better
    expect(atmosphereId(s.content, s.session)).toBe('COFFIN_SOCK');
    expect(s.has('major_coffin_sock_release_complete')).toBe(true);
    expect(s.has('stinkbeard_paranoia_residue')).toBe(true);
  });

  it('the ship remembers: the cut-outs in the gallery, the door, the board, the planked converter, the scorch, the feathers, the sash, the books, the helm log', () => {
    const s = first;
    for (const [map, id] of [['crew_quarters', 'p17_cutout_jeb'], ['crew_quarters', 'p17_cutout_ned'], ['crew_quarters', 'p17_cutout_elsie'], ['cargo_hold', 'p17_door_reinforced'],
      ['crew_quarters', 'p17_pending_board_blown'], ['crew_quarters', 'p17_converter_planked'], ['stenchmaster_fart_zone', 'p17_fz_scorch'], ['stenchmaster_fart_zone', 'p17_fz_feathers'],
      ['fart_free_zone', 'p17_knotted_sash'], ['galley', 'p17_ledger_books'], ['main_deck', 'p17_helm_log']]) {
      expect(propLive(s, map, id), `${map} ${id}`).toBe(true);
    }
    for (const [map, id] of [['crew_quarters', 'p17_cutout_ledger'], ['crew_quarters', 'p17_cutout_tilda'], ['crew_quarters', 'p17_pending_board']]) {
      expect(propLive(s, map, id), `${map} ${id} (gone)`).toBe(false);
    }
  });
});

describe('While it plays', () => {
  it('the Fire-Sharkstorm burns over the deck, the Chicken-Town waft puts it out, and the Coffin Sock replaces the green haze', async () => {
    const s = await fromPreset('p17_fire_sharkstorm');
    expect(sharkstormFlare(s.content, s.session)).toBe('fire_sharkstorm');
    expect(s.session.story.getValue('room_atmosphere_stenchmaster_fart_zone')).toBe('FIRE_WAFT');
    await playUntil(s, 'fire_sharkstorm.mellow');
    expect(sharkstormFlare(s.content, s.session)).toBe(null);
    expect(atmosphereId(s.content, s.session)).toBe('MELLOW_HAZE');
    await playToEndP17(s);
    expect(atmosphereId(s.content, s.session)).toBe('COFFIN_SOCK');
  }, 180000);

  it('the Fire-Sharkstorm burns itself out after ten rooms if nobody puts it out (and a save keeps the count)', async () => {
    const hop = (st) => go(st, st.map === 'main_deck' ? 'galley' : 'main_deck');
    const s = await fromPreset('p17_fire_sharkstorm'); // arriving in the Fart Zone: one room
    for (let i = 0; i < 4; i++) await hop(s); // five
    expect(sharkstormFlare(s.content, s.session)).toBe('fire_sharkstorm');
    const t = reloadStory(s);
    for (let i = 0; i < 4; i++) await hop(t); // nine
    expect(sharkstormFlare(t.content, t.session)).toBe('fire_sharkstorm');
    await hop(t); // ten
    expect(sharkstormFlare(t.content, t.session)).toBe(null);
    expect(sharkstormState(t.content, t.session)).toBe('rough_turbulence');
  }, 120000);

  it('a save in the Fart-Free Zone before the rescue picks up at the grating, and Agnes always comes out', async () => {
    const s = await fromPreset('p17_agnes_fart_zone');
    const t = reloadStory(s);
    expect(t.session.quests.isObjectiveAvailable('grand_fart_chamber', 'approach')).toBe(true);
    t.pickLast = true;
    await playUntil(t, 'grand_fart_chamber.after');
    expect(t.has('agnes_thunderbottom_rescue_complete')).toBe(true);
    await playToEndP17(t);
    expect(t.has('agnes_post_rescue_condition')).toBe(true);
  }, 180000);

  it("Thunderbottom can't softlock: every way of standing up to him ends with 'please'", async () => {
    for (const pick of [false, true]) {
      const s = await fromPreset('p17_tb_threat');
      s.pickLast = pick;
      await playUntil(s, 'thunderbottom.lead');
      expect(s.has('p17_please')).toBe(true);
    }
  }, 120000);

  it('Ledger and Tilda come back exactly once (the door scene can\'t be played again)', async () => {
    const s = await fromPreset('p17_reunion');
    const hold = s.content.maps.require('cargo_hold').objects;
    for (const id of ['p17_door_stop', 'p17_door_shut', 'p17_plume_l', 'p17_plume_r']) {
      const o = hold.find((x) => x.id === id);
      expect(evaluateCondition(o.if, s.session), id).toBe(false);
    }
    await playToEndP17(s);
    expect(partyIds(s)).toEqual(['blackbeard', 'ledger', 'tilda']);
  }, 180000);

  it('plays to the end from every preset', async () => {
    const ids = makeStory({ preset: 'p16_complete' }).content.debugPresets.list().map((p) => p.id).filter((id) => id.startsWith('p17_'));
    expect(ids).toHaveLength(27);
    for (const preset of ids) {
      const s = await fromPreset(preset);
      if (preset === 'p17_start') expect(s.has('p17_started'), preset).toBe(true);
      await playToEndP17(s);
      expect(s.stagingIssues.join('\n'), preset).toBe('');
      expect(partyIds(s), preset).toEqual(['blackbeard', 'ledger', 'tilda']);
    }
  }, 900000);
});

describe('Story Phase 17 stays inside its brief', () => {
  const files = [
    'data/story/cutscenes/phase17', 'data/dialogue/phase17', 'data/npcs/phase17.json', 'data/npcs/phase17_crew.json', 'data/npcs/phase17_talk.json',
    'data/quests/phase17.json', 'data/items/phase17.json', 'data/story/flags/phase17.json', 'data/story/triggers/phase17.json', 'data/maps/ship/phase17',
    'data/logs/phase17.json', 'data/props/phase17.json', 'data/story/proceedings/tilda_application.json', 'data/story/aliases/phase17.json',
    'data/story/traits.json', 'data/abilities/ancient_crew.json', 'data/statuses/phase17.json', 'data/characters/phase17.json', 'data/characters/speakers_phase17.json',
    'data/appearances/phase17.json', 'data/tv/programs/old_crew_documentary.json', 'data/tv/programs/bbk_sharkstorm_special.json', 'data/story/vistas/phase17.json',
    'src/debug/crewDebug.js',
  ];
  const text = files.flatMap((f) => {
    const p = path.resolve(f);
    const list = fs.statSync(p).isDirectory() ? fs.readdirSync(p).map((n) => path.join(p, n)) : [p];
    return list.map((x) => fs.readFileSync(x, 'utf8'));
  }).join('\n');

  it("uses its own names (and none of the source's): GARRICK GRUMBLEGUT, the Sharkstorm, Captain Stinkbeard", () => {
    for (const banned of [...BANNED_LIST, /nintendo/i, /\bnado\b/i, /guzzlegut/i, /must?ache/i]) expect(text).not.toMatch(banned);
    for (const name of ['Garrick', 'Brogath', 'Ledger Billiam', 'No-Nonsense Tilda', 'Old Jeb', 'Wobbly Ned', 'Elsie', 'Agnes the Second', 'Sharkstorm', 'Stinkbeard',
      "Queen Anne's Revenge", 'Fart-Free Zone', 'Greyhook Cove', 'CAPTAIN MINUTES', 'Lord Vaporious Thunderbottom the Seventh', 'PRINCESS STENCHALINA THE PERFUMED',
      'COFFIN SOCK', 'Violeta Wrathwaft', 'LEDGER BILLIAM', 'KNOWS MONEY', 'BROGATH, STOP', 'Cheap-O-Rama']) {
      expect(text, name).toContain(name);
    }
    expect(text).not.toMatch(/Garrick Grumbleguts|Garric\b/);
  });

  it('keeps it fictional and non-instructional: the Beard Joint and Frog Grog are gags, never a method', () => {
    for (const bad of [/\b(dosage|doses?|grams?|ounces?|bongs?|cultivat\w*|extraction|recipes?|temperatures?|wiring|voltage|butane|lighter fluid)\b/i,
      /\broll(s|ing|ed)?\b[^."]{0,24}\bjoints?\b/i, /\bjoints?\b[^."]{0,24}\broll(s|ing|ed)?\b/i, /\bhow to (make|build|smoke)\b/i, /\b(grind|dry|cure)\b[^."]{0,24}\b(herb|weed|beard)\b/i]) {
      expect(text).not.toMatch(bad);
    }
  });

  it('invents nothing after the source: Greyhook not reached, no other crew back, the storm going round, Agnes kept, Brogath still bashful, the beard kept', () => {
    const s = makeStory({ preset: 'p17_complete' });
    const scripts = JSON.stringify([...s.content.scripts.map.entries()].filter(([id]) => /^p17/.test(id)).map(([, sc]) => sc));
    for (const f of ['revenge_out_of_sharkstorm', 'greyhook_voyage_begun', 'ledger_ledgers_found', 'old_jeb_reincarnated', 'wobbly_ned_reincarnated', 'elsie_reincarnated',
      'great_sharkstorm_dealt_with', 'agnes_second_missing_in_sharkstorm', 'brogath_bashfulness_cured', 'beard_shaved', 'beard_removed', 'garrick_resigned', 'p18_started', 'p17_ch223_started']) {
      expect(scripts, f).not.toMatch(new RegExp(`"setFlag":"${f}"`));
    }
    expect(s.content.game.chapters.some((c) => /Chapter 223/.test(c.name))).toBe(false);
    for (const id of ['old_jeb', 'wobbly_ned', 'elsie_beanwright']) expect(s.content.ancientCrew.get(id).reincarnationAllowed, id).toBe(false);
    expect(s.has('brogath_permanent')).toBe(true);
    expect(s.has('p17_shave_joke')).toBe(false); // the walk never took the optional shave; even when taken it's a joke (tests/phase17.test.js)
  });

  it("Agnes is never hurt, and Thunderbottom's threat is never graphic", () => {
    expect(text).not.toMatch(/agnes[^."]{0,40}\b(dead|died|killed|cooked|roast(ed)?|toasted|plucked|wrung)\b/i);
    const tb = text.split('\n').filter((l) => /thunderbottom\[/.test(l)).join('\n');
    expect(tb).not.toMatch(/\b(kill|blood|neck|wring|slaughter|butcher|knife|axe|chop)\w*/i);
  });
});
