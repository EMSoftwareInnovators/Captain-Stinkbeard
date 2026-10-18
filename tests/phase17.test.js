import { describe, expect, it } from 'vitest';
import { SaveManager } from '../src/systems/save/SaveManager.js';
import { MemoryStorage } from '../src/platform/storage.js';
import { SAVE_VERSION } from '../src/config/constants.js';
import { migrateState } from '../src/systems/save/migrations.js';
import { BattleEngine } from '../src/systems/battle/BattleEngine.js';
import { Rng } from '../src/core/Rng.js';
import { stabilityDef, readStability, pendingReadout } from '../src/systems/stability.js';
import { sharkstormState, sharkstormBaseState, setSharkstormFlare, endSharkstormFlare, tickSharkstormFlare, sharkstormFlare } from '../src/systems/hazards/sharkstorm.js';
import { beardPuffDef, puffReaction } from '../src/systems/beard.js';
import { actorAlias, resolveSpeaker, resolveActorLook } from '../src/systems/story/aliases.js';
import { atmosphereId } from '../src/systems/atmosphere.js';
import { evaluateCondition } from '../src/systems/conditions/conditions.js';
import { resolvePreset } from '../src/debug/presets.js';
import { DEBUG_CREW } from '../src/debug/crewDebug.js';
import { paintCrewSheet, paintCutoutProp } from '../src/art/characters/cardboardCrewPainter.js';
import { PHASE17_PROPS } from '../src/art/props/phase17Props.js';
import { makeStory, reloadStory } from './storyHarness.js';

/**
 * Story Phase 17 (THE RETURN OF THE ANCIENT CREW AND THE COFFIN SOCK
 * CATASTROPHE) systems: Ledger and Tilda as party members (they join once, at
 * the captain's level, with cardboard traits that matter in battle), the
 * cut-outs (two come back; three stay cardboard and never move), the door
 * sealed a second time, the temporary Fire-Sharkstorm, Brogath's pending
 * Coffin Sock readout, the beard's own puffs, the paranoia spiral's aliases
 * (presentation only), the converter's ban, saves (v17), and the F2 Crew tab.
 */

const brogath = (content) => stabilityDef({ id: 'brogath', ...content.stability.get('brogath') });
const ids = (s) => s.session.party.members.map((m) => m.id);

describe('Ledger and Tilda join the party', () => {
  it('once, at the captain\'s level, with their own abilities; joining again adds nobody', async () => {
    const s = makeStory({ preset: 'p17_resurrection' });
    expect(ids(s)).toEqual(['blackbeard']);
    const lvl = s.session.party.leader().level;
    await s.run([{ joinParty: 'ledger', level: 'leader' }, { joinParty: 'tilda', level: 'leader' }, { joinParty: 'ledger', level: 'leader' }, { joinParty: 'tilda', level: 'leader' }]);
    expect(ids(s)).toEqual(['blackbeard', 'ledger', 'tilda']);
    const ledger = s.session.party.get('ledger');
    const tilda = s.session.party.get('tilda');
    expect(ledger.level).toBe(lvl);
    expect(tilda.level).toBe(lvl);
    expect(ledger.hp).toBe(ledger.maxHp);
    expect(ledger.abilities).toEqual(expect.arrayContaining(['creative_accounting', 'reconcile', 'projected_profits', 'questionable_valuation']));
    expect(tilda.abilities).toEqual(expect.arrayContaining(['brogath_stop', 'no_nonsense', 'hold_the_line', 'authoritative_rebuke', 'first_mates_orders']));
    // CAPTAIN MINUTES is learned in the story (chapter 214), once
    await s.run([{ learnAbility: 'captain_minutes', character: 'ledger' }, { learnAbility: 'captain_minutes', character: 'ledger' }]);
    expect(ledger.abilities.filter((a) => a === 'captain_minutes')).toHaveLength(1);
  });

  it('every preset from the reunion on has both of them, exactly once', () => {
    for (const id of ['p17_financial_review', 'p17_converter', 'p17_bbk_special', 'p17_rescued', 'p17_complete']) {
      const s = makeStory({ preset: id });
      expect(ids(s), id).toEqual(['blackbeard', 'ledger', 'tilda']);
    }
    expect(makeStory({ preset: 'p17_bbk_special' }).session.party.get('ledger').abilities).toContain('captain_minutes');
    expect(ids(makeStory({ preset: 'p17_reunion' }))).toEqual(['blackbeard']);
  });

  it('a save that lists a member twice loads them once (the version 17 migration and the party itself)', () => {
    const s = makeStory({ preset: 'p17_complete' });
    const state = JSON.parse(JSON.stringify(s.session.serialize()));
    state.party = [...state.party, state.party.find((m) => m.id === 'ledger')];
    const migrated = migrateState(JSON.parse(JSON.stringify(state)), 16, 17);
    expect(migrated.party.filter((m) => m.id === 'ledger')).toHaveLength(1);
    const t = makeStory({ state: migrated });
    expect(ids(t)).toEqual(['blackbeard', 'ledger', 'tilda']);
  });

  it('they speak as themselves: the party record and the NPC are one speaker', () => {
    const s = makeStory({ preset: 'p17_complete' });
    expect(s.content.speakerErrors ?? []).toEqual([]);
    expect(s.content.speaker('ledger').name).toBe('Ledger Billiam');
    expect(s.content.speaker('tilda').name).toBe('No-Nonsense Tilda');
    expect(s.content.characters.get('ledger').npc).toBe('ledger');
  });
});

describe('Cardboard in battle', () => {
  const drill = (seed = 5) => {
    const s = makeStory({ preset: 'p17_financial_review' });
    const engine = new BattleEngine({ content: s.content, session: s.session, encounterId: 'ancient_drill', rng: new Rng(seed) });
    return { s, engine };
  };

  it('flat, fume-animated, light and flammable: harder to hit, immune to sickness, fire hurts more', () => {
    const { engine } = drill();
    const ledger = engine.party.find((c) => c.def.id === 'ledger');
    const tilda = engine.party.find((c) => c.def.id === 'tilda');
    const captain = engine.party.find((c) => c.def.id === 'blackbeard');
    for (const c of [ledger, tilda]) {
      expect(c.traits.map((t) => t.id ?? t.label).length).toBe(5);
      expect(c.traitEvade()).toBeGreaterThan(0);
      expect(c.resists('sickened')).toBe(true);
      expect(c.traitMultiplier('fire')).toBeGreaterThan(1);
      expect(c.traitMultiplier('physical')).toBe(1);
    }
    expect(captain.traitEvade()).toBe(0);
    expect(captain.resists('sickened')).toBe(false);
    expect(ledger.resource?.short).toBe('ACC');
    expect(tilda.resource?.short).toBe('AUTH');
  });

  it("Tilda's drill can be won or lost, and is never fatal or fled", () => {
    const { s, engine } = drill(11);
    expect(engine.encounter.canFlee).toBe(false);
    engine.start();
    for (let i = 0; i < 300 && !engine.outcome; i++) {
      const { actor } = engine.nextTurn();
      if (!actor) break;
      let action;
      if (actor.side === 'party') {
        const { attack } = engine.availableActions(actor);
        action = { type: 'ability', ability: attack.id, targets: [engine.enemies.find((e) => e.isAlive()).uid] };
      } else action = engine.chooseEnemyAction(actor);
      engine.execute(actor, action, actor.side === 'party' ? { timing: 'great' } : {});
      engine.endTurn(actor);
    }
    expect(['win', 'lose']).toContain(engine.outcome);
    engine.finish();
    // knocked flat, they stand back up: nobody leaves the party
    expect(ids(s)).toEqual(['blackbeard', 'ledger', 'tilda']);
  });

  it('a staggered combatant loses its turn (a status that skips turns)', () => {
    const { s } = drill();
    expect(s.content.statuses.get('staggered').skipsTurn).toBe(true);
  });
});

describe('The cut-outs', () => {
  it('two come back; Jeb, Ned and Elsie stay cardboard (records that can\'t come back, and nobody to talk to)', () => {
    const s = makeStory({ preset: 'p17_complete' });
    for (const [id, m] of s.content.ancientCrew.map.entries()) {
      expect(m.reincarnationAllowed, id).toBe(['ledger_billiam', 'nononsense_tilda'].includes(id));
    }
    for (const id of ['jeb', 'ned_rattle', 'elsie', 'old_jeb', 'wobbly_ned', 'elsie_beanwright']) expect(s.content.npcs.get(id)?.appearance?.startsWith?.('cutout') ?? false, id).toBe(false);
    expect(s.has('ledger_billiam_reincarnated')).toBe(true);
    expect(s.has('tilda_reincarnated')).toBe(true);
    expect(s.has('other_old_crew_cutouts_prepared')).toBe(true);
  });

  it('the three that stay cardboard are still props: one still frame each, never an animation', () => {
    for (const k of ['cutout_jeb', 'cutout_ned', 'cutout_elsie']) {
      const c = PHASE17_PROPS[k]();
      expect(c.frames, k).toBeUndefined();
      expect([c.width, c.height], k).toEqual([32, 46]);
    }
    const s = makeStory({ preset: 'p17_complete' });
    const props = s.content.maps.require('crew_quarters').props.filter((p) => /^cutout_(jeb|ned|elsie)$/.test(p.prop));
    expect(props.map((p) => p.prop).sort()).toEqual(['cutout_elsie', 'cutout_jeb', 'cutout_ned']);
    expect(props.every((p) => !p.if || evaluateCondition(p.if, s.session))).toBe(true);
  });

  it('Ledger and Tilda use ordinary 32x48 frames on the ordinary grid (cardboard animation never changes collision)', () => {
    for (const who of ['ledger', 'tilda']) {
      const { frames, anims } = paintCrewSheet({ who });
      for (const [name, f] of Object.entries(frames)) expect([f.width, f.height], name).toEqual([32, 48]);
      for (const a of ['idle_down', 'walk_down', 'spin_down', 'flat_down', 'flutter_down', 'wake_down']) expect(anims[a]?.length, `${who} ${a}`).toBeGreaterThan(0);
    }
    expect(paintCutoutProp('tilda').width).toBe(32);
  });
});

describe('The treasure-room door', () => {
  it('cracks once, is sealed again (reinforced), and stays shut: the door is still a door, with nothing behind it to reach', () => {
    const s = makeStory({ preset: 'p17_complete' });
    expect(s.session.story.getValue('treasure_room_state')).toBe('sealed_reinforced');
    expect(s.has('p17_door_resealed')).toBe(true);
    const hold = s.content.maps.require('cargo_hold');
    const look = hold.objects.find((o) => o.id === 'p17_door_look');
    expect(evaluateCondition(look.if, s.session)).toBe(true);
    // the door that applies now (the newest one laid over the old) is locked
    const door = hold.objects.find((o) => o.type === 'warp' && o.to?.map === 'treasure_hold' && (!o.when || evaluateCondition(o.when, s.session)));
    expect(door.if && !evaluateCondition(door.if, s.session), door.id).toBe(true);
    expect(s.has('treasure_room_sealed')).toBe(true);
  });
});

describe('The Fire-Sharkstorm (temporary)', () => {
  it('a flare over the saved state: it shows instead of the state, the state underneath is kept, and it burns out after ten rooms', () => {
    const s = makeStory({ preset: 'p17_ignition_prep' });
    const { content, session } = s;
    const base = sharkstormBaseState(content, session);
    expect(base).toBe('rough_turbulence');
    setSharkstormFlare(content, session, 'fire_sharkstorm');
    expect(sharkstormFlare(content, session)).toBe('fire_sharkstorm');
    expect(sharkstormState(content, session)).toBe('fire_sharkstorm');
    expect(sharkstormBaseState(content, session)).toBe(base);
    expect(evaluateCondition({ sharkstorm: base }, session), 'conditions read the saved state').toBe(true);
    for (let i = 0; i < 9; i++) tickSharkstormFlare(content, session);
    expect(sharkstormFlare(content, session)).toBe('fire_sharkstorm');
    tickSharkstormFlare(content, session);
    expect(sharkstormFlare(content, session)).toBe(null);
    expect(sharkstormState(content, session)).toBe(base);
  });

  it('the story puts it out, and it survives a save while it burns', async () => {
    const s = makeStory({ preset: 'p17_chicken_town' });
    expect(sharkstormFlare(s.content, s.session)).toBe('fire_sharkstorm');
    const t = reloadStory(s);
    expect(sharkstormFlare(t.content, t.session)).toBe('fire_sharkstorm');
    await t.run([{ sharkstorm: 'end_flare' }]);
    expect(sharkstormFlare(t.content, t.session)).toBe(null);
    const end = makeStory({ preset: 'p17_complete' });
    expect(sharkstormFlare(end.content, end.session)).toBe(null);
    expect(sharkstormState(end.content, end.session)).toBe('rough_turbulence');
  });
});

describe('Brogath: COFFIN SOCK EVENT, PENDING', () => {
  it('the meter reads PENDING with a countdown, then IMMINENT, and nothing once it has gone', () => {
    const s = makeStory({ preset: 'p17_coffin_brewing' });
    const def = brogath(s.content);
    s.session.story.setValue('brogath_pending', 'COFFIN_SOCK');
    s.session.story.setVar('coffin_sock_countdown', 3);
    let r = pendingReadout(def, readStability(def, s.session));
    expect(r.label).toBe('COFFIN SOCK EVENT');
    expect(r.word).toBe('PENDING');
    expect(r.stage).toMatch(/3/);
    s.session.story.setVar('coffin_sock_countdown', 0);
    r = pendingReadout(def, readStability(def, s.session));
    expect(r.stage).toMatch(/IMMINENT/);
    const end = makeStory({ preset: 'p17_complete' });
    expect(pendingReadout(def, readStability(def, end.session))).toBe(null);
  });
});

describe('The beard puffs on its own', () => {
  it('only while beard_puffing is set, never often, and the nearest crewmate\'s reaction is short and repeatable', () => {
    const s = makeStory({ preset: 'p17_coffin_brewing' });
    const def = beardPuffDef(s.content);
    expect(def.every[0]).toBeGreaterThanOrEqual(8000);
    expect(evaluateCondition(def.if, s.session)).toBe(true);
    expect(evaluateCondition(def.if, makeStory({ preset: 'p17_rescued' }).session)).toBe(false);
    for (const who of ['pete', 'tilda', 'ledger', 'garrick', 'nobody_in_particular']) {
      const a = puffReaction(def, who, 3);
      expect(a, who).toBe(puffReaction(def, who, 3));
      if (a) expect(a.length, who).toBeLessThanOrEqual(60);
    }
  });
});

describe('The paranoia spiral changes what the captain sees, never who people are', () => {
  it('Jim is PRINCESS STENCHALINA THE PERFUMED to him while it lasts; his id, his dialogue and his save record stay Jim', () => {
    const s = makeStory({ preset: 'p17_stenchalina' });
    expect(s.has('p17_grand_paranoia')).toBe(true);
    const alias = actorAlias(s.content, s.session, 'jim');
    expect(alias?.name).toBe('PRINCESS STENCHALINA THE PERFUMED');
    const sp = resolveSpeaker(s.content, s.session, 'jim');
    expect(sp.name).toBe('PRINCESS STENCHALINA THE PERFUMED');
    expect(sp.realName).toBe(s.content.npcs.get('jim').name);
    expect(resolveActorLook(s.content, s.session, s.content.npcs.get('jim')).appearance).toBe('jim_stenchalina');
    expect(s.content.npcs.get('jim').id).toBe('jim');
    const t = reloadStory(s);
    expect(t.session.party.members.map((m) => m.id)).toEqual(ids(s));
    const end = makeStory({ preset: 'p17_complete' });
    expect(actorAlias(end.content, end.session, 'jim')?.name ?? null).not.toBe('PRINCESS STENCHALINA THE PERFUMED');
  });
});

describe('The converter and Captain Minutes: no money from anywhere', () => {
  it('conversions are banned (the machine planked over); Captain Minutes are a count, not gold or an item', () => {
    const s = makeStory({ preset: 'p17_complete' });
    expect(s.session.story.getValue('converter_state')).toBe('banned');
    const q = s.content.maps.require('crew_quarters');
    const planked = q.props.find((p) => p.prop === 'converter_planked');
    expect(planked && (!planked.if || evaluateCondition(planked.if, s.session))).toBeTruthy();
    expect(s.content.items.get('captain_minutes')).toBeFalsy();
    expect(s.session.story.getVar('captain_minutes', 0)).toBeGreaterThan(0);
    const before = makeStory({ preset: 'p17_converter' }).session.inventory.gold;
    expect(s.session.inventory.gold).toBe(before);
  });

  it('one permit, ever', () => {
    const s = makeStory({ preset: 'p17_complete' });
    expect(s.session.inventory.count('tilda_ignition_permit')).toBe(1);
    expect(s.has('tilda_ignition_application_approved')).toBe(true);
  });
});

describe('Saves (version 17)', () => {
  it('the save version is 17, and a version 16 save loads with its story intact', () => {
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(17);
    const s = makeStory({ preset: 'p16_complete' });
    const storage = new MemoryStorage();
    expect(new SaveManager({ storage, content: s.content, version: 16 }).save(1, s.session).ok).toBe(true);
    const read = new SaveManager({ storage, content: s.content }).read(1);
    expect(read.ok).toBe(true);
    const t = makeStory({ state: read.state });
    expect(t.session.story.allFlags().sort()).toEqual(s.session.story.allFlags().sort());
    expect(t.has('p16_complete')).toBe(true);
    expect(t.has('p17_started')).toBe(false);
  });

  it("the phase's state is plain story state and the party: it survives a save (singed Tilda, frazzled Agnes, the beard, Greyhook pending)", () => {
    const s = makeStory({ preset: 'p17_complete' });
    const t = reloadStory(s);
    expect(ids(t)).toEqual(['blackbeard', 'ledger', 'tilda']);
    expect(t.session.party.get('tilda').look.appearance).toBe('tilda_singed');
    for (const v of ['treasure_room_state', 'greyhook_expedition', 'tilda_condition', 'agnes_condition', 'converter_state', 'ship_atmosphere', 'ledger_status', 'tilda_status']) {
      expect(t.session.story.getValue(v), v).toBe(s.session.story.getValue(v));
    }
    for (const f of ['ledger_billiam_reincarnated', 'tilda_reincarnated', 'tilda_cardboard_singed', 'tilda_cigarette_lit', 'agnes_post_rescue_condition',
      'beard_thunderbottom_legendary', 'beard_coffin_sock_catastrophe', 'major_coffin_sock_release_complete', 'greyhook_expedition_blocked', 'p17_complete']) {
      expect(t.has(f), f).toBe(true);
    }
    expect(t.quest('the_great_ledger_expedition')).toBe('active');
    expect(atmosphereId(t.content, t.session)).toBe('COFFIN_SOCK');
  });
});

describe('Story Phase 17 debug tools', () => {
  it('every jump in the F2 Crew tab is a preset, in story order (27 of them), chained from the end of Phase 16', () => {
    const s = makeStory({ preset: 'p16_complete' });
    const jumps = DEBUG_CREW.jumps.map(([, id]) => id);
    const presets = s.content.debugPresets.list().filter((p) => p.id.startsWith('p17_')).map((p) => p.id);
    expect(jumps).toEqual(presets);
    expect(jumps).toHaveLength(27);
    expect(s.content.debugPresets.get('p17_start').after).toBe('p16_complete');
    expect(resolvePreset(s.content, 'p17_complete').flags).toContain('p17_complete');
  });

  it('every debug scene runs (from the end of the phase)', async () => {
    for (const [label, steps] of DEBUG_CREW.scenes) {
      if (typeof steps === 'string') continue;
      const s = makeStory({ preset: 'p17_complete' });
      await expect(s.run(steps), label).resolves.not.toThrow();
    }
  });
});
