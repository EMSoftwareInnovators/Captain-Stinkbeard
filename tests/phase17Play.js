import { expect } from 'vitest';
import { currentChapter } from '../src/systems/story/progress.js';
import { stabilityDef, promptOptions } from '../src/systems/stability.js';
import { placementChoices, roomGuard } from '../src/world/placements.js';
import { makeStory } from './storyHarness.js';
import { go as go16, FZ } from './phase16Play.js';

/**
 * Story Phase 17 (THE RETURN OF THE ANCIENT CREW AND THE COFFIN SOCK
 * CATASTROPHE), walked the way a player would (tests/phase17_story.test.js and
 * the debug presets' recorder share it): from the end of Phase 16, every open
 * objective in turn, until everyone is furious. People are found where the
 * placement tables put them, the way a player finds them (whereIs). Where a
 * scene asks the same question again after a wrong answer (listening for
 * Agnes in the Fart Zone), walking 'last' options tries a wrong answer first.
 * The optional drill and the shave are left to tests/phase17.test.js.
 */

export const PHASE17_QUESTS = ['brogath_remembers', 'the_cardboard_crew', 'the_forbidden_door', 'the_ancient_reunion', 'the_geniuses', 'tilda_application',
  'old_crew_documentary', 'great_ledger_proposal', 'captain_minutes', 'new_dead_idiots', 'grand_restraint', 'fire_sharkstorm', 'thunderbottom',
  'grand_fart_chamber', 'beard_exhales', 'beard_joint', 'coffin_sock_catastrophe'];

const D = 'main_deck';
const G = 'galley';
const H = 'cargo_hold';
const Q = 'crew_quarters';
const Z = 'fart_free_zone';
export { FZ };

/** Gets the captain to a room (the Fart Zone is down the ladder under the cargo grating). */
export const go = go16;

/** Where an NPC is standing right now (the placement tables, as the game reads them). */
export function whereIs(s, npc, prefer = []) {
  const maps = [...prefer, s.map, ...s.content.maps.ids()];
  for (const map of maps) {
    const objects = s.content.maps.require(map).objects ?? [];
    if (placementChoices(objects, s.session, roomGuard(s.content.npcs, map)).get(npc)) return map;
  }
  return null;
}

async function talk(s, who) {
  const map = whereIs(s, who);
  if (!map) throw new Error(`${who} isn't anywhere aboard (${s.map})`);
  await go(s, map);
  return s.talk(who);
}

async function look(s, map, id) {
  await go(s, map);
  await s.inspect(id);
}

const firstMissing = (s, ids, prefix) => ids.find((id) => !s.has(`${prefix}${id}`));
const order = (s, list) => (s.pickLast ? list.slice().reverse() : list);

/** Queues the calming answer for a run of reassurance prompts (sets, in order). */
function queueSteady(s, sets) {
  const def = stabilityDef({ id: 'brogath', ...s.content.stability.get('brogath') });
  const turn0 = s.session.story.getVar(def.turnVar ?? 'brogath_reassure_turn', 0);
  sets.forEach((set, k) => s.choices.push(promptOptions(def, set, turn0 + k).findIndex((o) => o.calm)));
}

const CREW = ['ledger', 'tilda', 'jeb', 'ned', 'elsie'];

/** A menu of things still to say, then '(Later.)': walking 'last' takes the last thing still to say, not '(Later.)'. */
function pickBeforeLater(s, flags) {
  const left = flags.filter((f) => !s.has(f)).length;
  s.choices.push(s.pickLast ? left - 1 : 0);
}

/** First open objective wins; each step does what a player would do about it. */
export const STEPS17 = [
  // 206: Brogath remembers (the Fart-Free Zone)
  ['brogath_remembers.hear', async (s) => talk(s, 'brogath')],
  ['brogath_remembers.memories', async (s) => look(s, Z, `p17_memory_${firstMissing(s, order(s, ['slate', 'sash', 'book']), 'p17_memory_')}`)],
  ['brogath_remembers.names', async (s) => {
    pickBeforeLater(s, CREW.map((n) => `p17_crew_${n}`));
    if (CREW.filter((n) => !s.has(`p17_crew_${n}`)).length === 1) queueSteady(s, ['old_crew']);
    await talk(s, 'brogath');
  }],
  ['brogath_remembers.pete', async (s) => talk(s, 'pete')],
  ['brogath_remembers.theory', async (s) => talk(s, 'brogath')],
  ['brogath_remembers.dissuade', async (s) => talk(s, 'brogath')],
  // 207: the cardboard crew (the old quarters)
  ['the_cardboard_crew.find', async (s) => talk(s, 'brogath')],
  ['the_cardboard_crew.cutouts', async (s) => look(s, Q, `p17_cutout_${firstMissing(s, order(s, ['jeb', 'ledger', 'tilda', 'ned', 'elsie']), 'p17_cutout_')}`)],
  ['the_cardboard_crew.eyebrows', async (s) => talk(s, 'brogath')],
  ['the_cardboard_crew.door', async (s) => talk(s, 'brogath')],
  ['the_cardboard_crew.guard', async (s) => talk(s, 'pete')],
  ['the_cardboard_crew.run', async (s) => go(s, H)],
  // 208: the forbidden door (the hold)
  ['the_forbidden_door.stop', async (s) => look(s, H, 'p17_door_stop')],
  ['the_forbidden_door.shut', async (s) => look(s, H, 'p17_door_shut')],
  ['the_forbidden_door.plume', async (s) => look(s, H, s.pickLast ? 'p17_plume_r' : 'p17_plume_l')],
  // 209: the reunion
  ['the_ancient_reunion.ledger', async (s) => talk(s, 'ledger')],
  ['the_ancient_reunion.tilda', async (s) => talk(s, 'tilda')],
  ['the_ancient_reunion.reunion', async (s) => talk(s, 'brogath')],
  // 210: the geniuses
  ['the_geniuses.review', async (s) => talk(s, 'ledger')],
  ['the_geniuses.entries', async (s) => {
    pickBeforeLater(s, ['assets', 'storm', 'currency', 'maybe'].map((e) => `p17_entry_${e}`));
    await look(s, G, 'p17_entries');
  }],
  ['the_geniuses.orders', async (s) => talk(s, firstMissing(s, order(s, ['gristle', 'bob']), 'p17_orders_'))],
  ['the_geniuses.barrels', async (s) => look(s, D, `p17_barrel_${firstMissing(s, order(s, ['wheel', 'rail']), 'p17_barrel_')}`)],
  ['the_geniuses.roster', async (s) => look(s, Q, 'p17_roster')],
  ['the_geniuses.brogath', async (s) => talk(s, 'brogath')],
  ['the_geniuses.authority', async (s) => talk(s, 'tilda')],
  // 211: Tilda's application
  ['tilda_application.bureau', async (s) => talk(s, 'tilda')],
  ['tilda_application.lighter', async (s) => talk(s, 'tilda')],
  ['tilda_application.form', async (s) => look(s, Q, 'p17_tilda_form')],
  // 212: the documentary
  ['old_crew_documentary.set', async (s) => look(s, G, 'p17_doc_set')],
  ['old_crew_documentary.watch', async (s) => look(s, G, 'p17_doc_watch')],
  ['old_crew_documentary.after', async (s) => talk(s, 'brogath')],
  // 213: Greyhook, and the helm
  ['great_ledger_proposal.books', async (s) => talk(s, 'ledger')],
  ['great_ledger_proposal.argue', async (s) => talk(s, 'ledger')],
  ['great_ledger_proposal.helm', async (s) => go(s, D)],
  ['great_ledger_proposal.countermand', async (s) => talk(s, firstMissing(s, order(s, ['gristle', 'bob']), 'p17_cm_'))],
  ['great_ledger_proposal.pete', async (s) => talk(s, 'pete')],
  ['great_ledger_proposal.log', async (s) => look(s, D, 'p17_log')],
  ['great_ledger_proposal.wheel', async (s) => look(s, D, 'p17_wheel')],
  ['great_ledger_proposal.explain', async (s) => talk(s, 'tilda')],
  // 214: Captain Minutes
  ['captain_minutes.token', async (s) => talk(s, 'ledger')],
  ['captain_minutes.stop', async (s) => look(s, Q, 'p17_stop')],
  ['captain_minutes.ban', async (s) => look(s, Q, 'p17_ban')],
  ['captain_minutes.research', async (s) => talk(s, 'ledger')],
  // 215: the late-night special
  ['new_dead_idiots.set', async (s) => look(s, G, 'p17_special_set')],
  ['new_dead_idiots.watch', async (s) => look(s, G, 'p17_special_watch')],
  // 216: the Grand Restraint
  ['grand_restraint.permit', async (s) => talk(s, 'tilda')],
  ['grand_restraint.points', async (s) => {
    pickBeforeLater(s, ['lungs', 'card', 'fire', 'warned', 'lighter'].map((e) => `p17_point_${e}`));
    await talk(s, 'tilda');
  }],
  ['grand_restraint.conditions', async (s) => talk(s, 'tilda')],
  ['grand_restraint.prep', async (s) => {
    const next = firstMissing(s, order(s, ['portholes', 'agnes', 'bucket']), 'p17_prep_');
    if (next === 'portholes') await look(s, FZ, 'p17_prep_portholes');
    else await talk(s, next === 'agnes' ? 'agnes_second' : 'pete');
  }],
  ['grand_restraint.restraint', async (s) => look(s, FZ, 'p17_restraint')],
  // 217: the Fire-Sharkstorm
  ['fire_sharkstorm.agnes', async (s) => talk(s, 'agnes_second')],
  ['fire_sharkstorm.deploy', async (s) => { await go(s, D); await go(s, FZ); }],
  ['fire_sharkstorm.mellow', async (s) => {
    const who = firstMissing(s, order(s, ['brogath', 'ledger', 'tilda', 'pete', 'visitors', 'garrick', 'jim']), 'p17_mellow_');
    await talk(s, who === 'visitors' ? 'visitor_one' : who);
  }],
  ['fire_sharkstorm.inhale', async (s) => look(s, D, 'p17_inhale')],
  // 218: Lord Thunderbottom
  ['thunderbottom.bell', async (s) => look(s, Q, 'p17_bell')],
  ['thunderbottom.serve', async (s) => talk(s, 'thunderbottom')],
  ['thunderbottom.defend', async (s) => talk(s, 'thunderbottom')],
  ['thunderbottom.lead', async (s) => {
    await go(s, D);
    if (s.session.quests.isObjectiveAvailable('thunderbottom', 'lead')) await talk(s, 'agnes_second');
  }],
  ['thunderbottom.farther', async (s) => look(s, Z, 'p17_cushion')],
  // 219: the Grand Fart Chamber (listening for her: walking 'last' guesses wrong once, then listens properly)
  ['grand_fart_chamber.approach', async (s) => {
    s.choices.push(...(s.pickLast ? [2, 1] : [1]));
    await look(s, D, 'p17_grating');
  }],
  ['grand_fart_chamber.after', async (s) => talk(s, 'agnes_second')],
  // 220: the beard
  ['beard_exhales.puff', async (s) => go(s, Q)],
  ['beard_exhales.brogath', async (s) => talk(s, 'brogath')],
  ['beard_exhales.procedures', async (s) => {
    const next = firstMissing(s, order(s, ['tilda', 'ledger', 'agnes', 'board']), 'p17_proc_');
    if (next === 'board') await look(s, Q, 'p17_board');
    else await talk(s, next === 'agnes' ? 'agnes_second' : next);
  }],
  // 221: the Beard Joint and the Grand Paranoia Spiral
  ['beard_joint.scissors', async (s) => talk(s, 'garrick')],
  ['beard_joint.vision', async (s) => talk(s, firstMissing(s, order(s, ['pete', 'gristle', 'bob', 'jim']), 'p17_vision_'))],
  ['beard_joint.grog', async (s) => talk(s, 'garrick')],
  ['beard_joint.spiral', async (s) => talk(s, firstMissing(s, order(s, ['garrick', 'ledger', 'tilda', 'brogath', 'pete']), 'p17_suspect_'))],
  // 222: the Coffin Sock catastrophe
  ['coffin_sock_catastrophe.princess', async (s) => talk(s, 'jim')],
  ['coffin_sock_catastrophe.release', async (s) => talk(s, 'brogath')],
  ['coffin_sock_catastrophe.after', async (s) => talk(s, firstMissing(s, order(s, ['ledger', 'pete', 'brogath']), 'p17_after_'))],
];

/** Plays on from wherever Phase 17 is until everyone is furious. */
export async function playToEndP17(s, { onStep = () => {} } = {}) {
  for (let n = 0; n < 800 && !s.has('p17_complete'); n++) {
    const next = STEPS17.find(([ref]) => {
      const [q, o] = ref.split('.');
      return s.session.quests.isObjectiveAvailable(q, o);
    });
    if (!next) {
      const open = PHASE17_QUESTS.map((q) => `${q}:${s.quest(q)}`).join(' ');
      throw new Error(`stuck on ${s.map} (${open}): no open Phase 17 objective the player can act on`);
    }
    onStep(next[0], s);
    await next[1](s);
  }
  expect(s.has('p17_complete'), 'Story Phase 17 reaches its end').toBe(true);
}

/** From "Phase 16 complete": Phase 17 starts when the captain goes down to the Fart-Free Zone. */
export async function playPhase17(pick, { onStep = () => {}, preset = 'p16_complete', from = null } = {}) {
  const s = from ?? makeStory({ pick, preset });
  s.pickLast = pick === 'last';
  expect(s.has('p17_started'), 'Phase 17 waits for the captain').toBe(false);
  await go(s, Z);
  expect(s.has('p17_started')).toBe(true);
  const chapters = ['p17c1'];
  await playToEndP17(s, {
    onStep: (ref, st) => {
      const ch = currentChapter(st.content.game, st.session).id;
      if (chapters[chapters.length - 1] !== ch) chapters.push(ch);
      onStep(ref, st);
    },
  });
  return { s, chapters };
}
