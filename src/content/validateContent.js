import { EQUIPMENT_SLOTS, STAT_KEYS, ITEM_TYPES, DIRECTIONS } from '../config/constants.js';
import { isPlainObject, asArray } from '../core/util.js';
import { validateCondition, COMPARE_KEYS, splitObjectiveRef } from '../systems/conditions/conditions.js';
import { COMMAND_SCHEMAS, STEP_MODIFIERS, EMOTES, isCommentKey, commandNameOf, PARTICLE_BURSTS, PROP_FX, ASYNC_COMMANDS } from '../systems/script/commandSchemas.js';
import { FUME_LEVELS, HAZE_LEVELS } from '../systems/hazards/fumes.js';
import { SHARK_LEVELS, SHARK_EVENTS } from '../systems/hazards/sharks.js';
import { DEAD_CENTER_NONE, deadCenterLocations } from '../systems/hazards/deadCenter.js';
import { sharkstormStates } from '../systems/hazards/sharkstorm.js';
import { alarmLevel, alarmLevels } from '../systems/hazards/alarms.js';
import { parseLine } from '../systems/script/parseLine.js';
import { normalizeScript } from '../systems/script/ScriptRunner.js';
import { OBJECTIVE_TYPES } from '../systems/quests/QuestSystem.js';
import { EFFECT_TYPES } from '../systems/effects/effects.js';
import { compileMap, isSolid, bedsAt, BED_POSES } from '../maps/compileMap.js';
import { checkStaging } from './staging.js';
import { ACTIONS } from '../platform/input/bindings.js';
import { ART_REGISTRY } from '../art/registry.js';
import { ENGINE_FLAGS } from '../config/engineFlags.js';
import { REPAIR_KINDS, REPAIR_SOUND_KEYS } from '../systems/repairKinds.js';
import { STABILITY_STATES } from '../systems/stability.js';
import { ATMOSPHERE_STATES } from '../systems/atmosphere.js';
import { TELLER_MODIFIERS } from '../systems/bank.js';
import { challengeProblems, challengeConfig, specKeyProblems, PROFILE_KEYS } from '../systems/challenge/config.js';
import { difficultyDataProblems, DIFFICULTIES } from '../systems/challenge/difficulty.js';
import { shipDataProblems } from '../systems/ship/integrity.js';
import { hazardDataProblems, compartment, compartmentIds, fireRoom, flammableRooms, leakSections, leakSeverity } from '../systems/ship/hazards.js';
import { airDataProblems, airRoom, substance, connection, connectionKind, AIR_STATES } from '../systems/ship/air.js';
import { pressureDataProblems, subjectDef, subjectIds, profileDef, profileIds } from '../systems/ship/pressure.js';
import { beardDataProblems, contaminant as beardContaminant, contaminantIds, beardStatus, beardStatusIds, CARE_ACTIONS, PURGE_PROFILES } from '../systems/ship/beard.js';
import { DutyPlan } from '../systems/hazards/sharkDuty.js';
import { suppliesDataProblems, shipEffectProblems, storeDef, storeIds, sourceDef, sourceIds, recipeDef, recipeIds, effectDef, effectIds, gearDef, gearIds, classOf, supplyLimits, SOURCE_OPS } from '../systems/ship/supplies.js';

/** The least time a shark on an opted-in watch may give before it bites (a walk across the deck). */
const MIN_SHARK_WINDOW_MS = 3000;

/**
 * Cross-reference validation for all content. Returns { errors, warnings }.
 * Run by tests (tests/content.test.js), at boot in development and by
 * `npm run validate`. Errors mean the content is broken; fix them.
 */
class Checker {
  constructor(ctx, path) {
    this.ctx = ctx;
    this.path = path;
  }

  at(sub) {
    return new Checker(this.ctx, `${this.path} › ${sub}`);
  }

  error(msg) {
    this.ctx.errors.push(`${this.path}: ${msg}`);
  }

  warn(msg) {
    this.ctx.warnings.push(`${this.path}: ${msg}`);
  }

  ref(kind, id, registry) {
    if (typeof id !== 'string' || !registry.has(id)) this.error(`unknown ${kind} "${id}"`);
  }

  flag(id) {
    this.ctx.usedFlags.add(id);
    if (!this.ctx.db.flags.has(id)) this.error(`unknown story flag "${id}" (declare it in data/story/flags/)`);
  }
  quest(id) { this.ref('quest', id, this.ctx.db.quests); }
  item(id) { this.ref('item', id, this.ctx.db.items); }
  character(id) { this.ref('character', id, this.ctx.db.characters); }
  npc(id) { this.ref('npc', id, this.ctx.db.npcs); }
  map(id) { this.ref('map', id, this.ctx.db.maps); }
  script(id) {
    this.ctx.usedScripts.add(id);
    this.ref('script', id, this.ctx.db.scripts);
  }
  sfx(id) { this.ref('sound effect', id, this.ctx.db.sfx); }
  music(id) {
    if (id === null) return;
    this.ref('music track', id, this.ctx.db.music);
  }
  ambience(id) {
    if (id === null) return;
    this.ref('ambience', id, this.ctx.db.ambience);
  }
  encounter(id) { this.ref('encounter', id, this.ctx.db.encounters); }
  enemy(id) { this.ref('enemy', id, this.ctx.db.enemies); }
  ability(id) { this.ref('ability', id, this.ctx.db.abilities); }
  status(id) { this.ref('status', id, this.ctx.db.statuses); }
  shop(id) { this.ref('shop', id, this.ctx.db.shops); }
  prop(id) { this.ref('prop', id, this.ctx.db.props); }
  appearance(id) { this.ref('appearance', id, this.ctx.db.appearances); }
  portrait(id) { this.ref('portrait', id, this.ctx.db.portraits); }
  timing(id) { this.ref('timing mechanic', id, this.ctx.db.timing); }
  vista(id) { this.ref('vista', id, this.ctx.db.vistas); }
  /** A Dead Center location (data/hazards/dead_center.json), or "none". */
  deadCenter(id) {
    if (id === DEAD_CENTER_NONE) return;
    const locations = deadCenterLocations(this.ctx.db);
    if (typeof id !== 'string' || !(id in locations)) this.error(`unknown Dead Center location "${id}" (see data/hazards/dead_center.json)`);
  }

  sharkstorm(id) {
    if (id === 'end_flare') return; // Story Phase 17: puts out a temporary flare
    const states = sharkstormStates(this.ctx.db);
    if (typeof id !== 'string' || !(id in states)) this.error(`unknown Great Sharkstorm state "${id}" (see data/hazards/sharkstorm.json)`);
  }

  objective(ref) {
    const [q, o] = splitObjectiveRef(ref);
    if (!o) {
      this.error(`objective reference "${ref}" must be "quest.objective"`);
      return;
    }
    const quest = this.ctx.db.quests.get(q);
    if (!quest) this.error(`unknown quest "${q}" in objective "${ref}"`);
    else if (!quest.objectives?.some((ob) => ob.id === o)) this.error(`quest "${q}" has no objective "${o}"`);
  }

  speaker(id) {
    if (!this.ctx.db.speaker(id)) this.error(`unknown speaker "${id}"`);
  }

  comparison(spec) {
    if (typeof spec === 'number') return;
    if (!isPlainObject(spec)) {
      this.error(`comparison must be a number or { gte|lte|... }, got ${JSON.stringify(spec)}`);
      return;
    }
    for (const [k, v] of Object.entries(spec)) {
      if (!COMPARE_KEYS.includes(k)) this.error(`unknown comparison "${k}"`);
      else if (typeof v !== 'number') this.error(`comparison "${k}" needs a number`);
    }
  }

  condition(cond) {
    validateCondition(cond, this);
  }
}

// ---------------------------------------------------------------------------
// Text & scripts

const TEXT_TOKEN = /\{([^{}]+)\}/g;

function validateText(text, check) {
  if (typeof text !== 'string') {
    check.error(`text must be a string, got ${JSON.stringify(text)}`);
    return;
  }
  for (const m of text.matchAll(TEXT_TOKEN)) {
    const token = m[1];
    const [kind, arg] = token.includes(':') ? [token.slice(0, token.indexOf(':')), token.slice(token.indexOf(':') + 1)] : [token, null];
    if (arg === null) {
      if (['player', 'gold', 'leader', 'captain', 'deadCenter'].includes(kind)) continue;
      if (check.ctx.db.game?.constants && kind in check.ctx.db.game.constants) continue;
      check.error(`unknown text token "{${token}}"`);
    } else if (kind === 'item') check.item(arg);
    else if (kind === 'var' || kind === 'num') continue;
    else if (kind === 'btn') {
      if (![...ACTIONS, 'move', 'start', 'enter'].includes(arg)) check.error(`unknown button "{btn:${arg}}"`);
    } else check.error(`unknown text token "{${token}}"`);
  }
  // Colour markup must be balanced: <y>…</>
  const opens = (text.match(/<[a-z]+>/g) || []).length;
  const closes = (text.match(/<\/>/g) || []).length;
  if (opens !== closes) check.error(`unbalanced colour tags in "${text}"`);
}

function validateLine(str, check) {
  const line = parseLine(str);
  if (line.speaker) {
    const sp = check.ctx.db.speaker(line.speaker);
    if (!sp) {
      check.error(`unknown speaker "${line.speaker}" in line "${str.slice(0, 40)}"`);
    } else if (line.expression) {
      const portrait = sp.portrait ? check.ctx.db.portraits.get(sp.portrait) : null;
      if (!portrait) check.error(`speaker "${line.speaker}" has no portrait, so expression "${line.expression}" is invalid`);
      else if (!portrait.expressions?.includes(line.expression)) {
        check.error(`portrait "${sp.portrait}" has no expression "${line.expression}" (has: ${portrait.expressions?.join(', ')})`);
      }
      // Every look the speaker can have must be able to make the face too.
      for (const v of sp.variants ?? []) {
        const vp = v.portrait ? check.ctx.db.portraits.get(v.portrait) : null;
        if (vp && !vp.expressions?.includes(line.expression)) check.error(`portrait "${v.portrait}" (a variant of "${line.speaker}") has no expression "${line.expression}"`);
      }
    }
  }
  validateText(line.text, check);
}

const PARAM_CHECKS = {
  string: (v) => typeof v === 'string',
  number: (v) => typeof v === 'number' && Number.isFinite(v),
  boolean: (v) => typeof v === 'boolean',
  array: (v) => Array.isArray(v),
  object: (v) => isPlainObject(v),
  any: () => true,
};

function validateParam(type, value, check, sctx) {
  switch (type) {
    case 'string':
    case 'number':
    case 'boolean':
    case 'array':
    case 'object':
    case 'any':
      if (!PARAM_CHECKS[type](value)) check.error(`expected ${type}, got ${JSON.stringify(value)}`);
      return;
    case 'label':
      if (typeof value !== 'string' || !(value in sctx.nodes)) check.error(`goto target "${value}" is not a node in this script`);
      return;
    case 'steps':
      if (typeof value === 'string') validateParam('label', value, check, sctx);
      else if (Array.isArray(value)) validateSteps(value, check, sctx);
      else check.error('expected a list of steps or a node label');
      return;
    case 'flags':
      asArray(value).forEach((f) => check.flag(f));
      return;
    case 'flag': return check.flag(value);
    case 'item': return check.item(value);
    case 'quest': return check.quest(value);
    case 'objective': return check.objective(value);
    case 'map': return check.map(value);
    case 'npc': return check.npc(value);
    case 'script': return check.script(value);
    case 'sfx': return check.sfx(value);
    case 'music': return check.music(value);
    case 'ambience': return check.ambience(value);
    case 'encounter': return check.encounter(value);
    case 'shop': return check.shop(value);
    case 'character': return check.character(value);
    case 'vista': return check.vista(value);
    case 'log': return check.ref('logbook', value, check.ctx.db.logs);
    case 'tv': return check.ref('television', value, check.ctx.db.tv);
    case 'shipSection':
      if (!check.ctx.db.ship?.sections?.[value]) check.error(`unknown ship section "${value}" (data/ship/integrity.json: ${Object.keys(check.ctx.db.ship?.sections ?? {}).join(', ')})`);
      return;
    case 'shipSections':
      if (Array.isArray(value) && !value.length) check.error('expected at least one ship section');
      asArray(value).forEach((v) => validateParam('shipSection', v, check, sctx));
      return;
    case 'shipCategory':
      if (!check.ctx.db.ship?.categories?.[value]) check.error(`unknown damage category "${value}" (data/ship/integrity.json: ${Object.keys(check.ctx.db.ship?.categories ?? {}).join(', ')})`);
      return;
    case 'shipRepair':
      if (!check.ctx.db.ship?.repairs?.[value]) check.error(`unknown ship repair "${value}"`);
      return;
    // Prompt 6 hazards (data/ship/hazards.json): rooms that can flood or burn, sections that can leak.
    case 'floodRoom':
      if (!compartment(check.ctx.db, value)) check.error(`"${value}" can't hold water (data/ship/hazards.json compartments: ${compartmentIds(check.ctx.db).join(', ')})`);
      return;
    case 'fireRoom':
      if (!fireRoom(check.ctx.db, value)) check.error(`"${value}" can't burn (data/ship/hazards.json fire.rooms: ${flammableRooms(check.ctx.db).join(', ')})`);
      return;
    case 'leakSection':
      if (!check.ctx.db.shipHazards?.leaks?.sections?.[value]) check.error(`the ${value} can't leak (data/ship/hazards.json leaks.sections: ${leakSections(check.ctx.db).join(', ')})`);
      return;
    case 'leakSeverity':
      if (!leakSeverity(check.ctx.db.shipHazards, value)) check.error(`unknown leak severity "${value}"`);
      return;
    case 'hazardAction':
      if (!['pump', 'bail', 'fetch', 'douse', 'smother'].includes(value)) check.error(`unknown emergency action "${value}" (pump, bail, fetch, douse, smother; patching is patchLeak)`);
      return;
    // Prompt 7 air (data/ship/air.json): rooms with air, substances, openings and their states.
    case 'airRoom':
      if (!airRoom(check.ctx.db, value)) check.error(`"${value}" has no ship air (data/ship/air.json rooms)`);
      return;
    case 'airSubstance':
      if (!substance(check.ctx.db, value)) check.error(`unknown substance "${value}" (data/ship/air.json substances)`);
      return;
    case 'airConnection':
      if (!connection(check.ctx.db, value)) check.error(`unknown opening "${value}" (data/ship/air.json connections)`);
      return;
    case 'airState':
      if (!AIR_STATES.includes(value)) check.error(`an opening is ${AIR_STATES.join(', ')} (got "${value}")`);
      return;
    // Prompt 8 pressure (data/ship/pressure.json): subjects and release profiles.
    case 'pressureSubject':
      if (!subjectDef(check.ctx.db, value)) check.error(`unknown pressure subject "${value}" (data/ship/pressure.json subjects: ${subjectIds(check.ctx.db).join(', ')})`);
      return;
    case 'pressureProfile':
      if (!profileDef(check.ctx.db, value)) check.error(`unknown release profile "${value}" (data/ship/pressure.json profiles: ${profileIds(check.ctx.db).join(', ')})`);
      return;
    // Prompt 9 beard (data/ship/beard.json): contaminants (never a debug-only one in content), statuses, purges, care, what can be worn.
    case 'beardContaminant': {
      const c = beardContaminant(check.ctx.db, value);
      if (!c) check.error(`unknown beard contaminant "${value}" (data/ship/beard.json contaminants: ${contaminantIds(check.ctx.db).join(', ')})`);
      else if (c.debugOnly) check.error(`beard contaminant "${value}" is for the debug demo and tests only, never story content`);
      return;
    }
    case 'beardStatus':
      if (!beardStatus(check.ctx.db, value)) check.error(`unknown beard status "${value}" (data/ship/beard.json statuses: ${beardStatusIds(check.ctx.db).join(', ')})`);
      return;
    case 'beardPurge':
      if (!PURGE_PROFILES.includes(value)) check.error(`a beard purge is ${PURGE_PROFILES.join(', ')} (got "${value}")`);
      return;
    case 'beardCare':
      if (!CARE_ACTIONS.includes(value)) check.error(`beard care is ${CARE_ACTIONS.join(' or ')} (got "${value}")`);
      return;
    case 'beardItem':
      if (!check.ctx.db.shipBeard?.equipment?.[value] || String(value).startsWith('//')) check.error(`"${value}" isn't mapped to wear over the beard (data/ship/beard.json equipment)`);
      return;
    // Prompt 10 supplies (data/ship/supplies.json): stores, sources, recipes, effects, gear; an item the supplies may handle (never a key item).
    case 'supplyStore':
      if (!storeDef(check.ctx.db, value)) check.error(`unknown store "${value}" (data/ship/supplies.json stores: ${storeIds(check.ctx.db).join(', ')})`);
      return;
    case 'supplySource':
      if (!sourceDef(check.ctx.db, value)) check.error(`unknown supply source "${value}" (data/ship/supplies.json sources: ${sourceIds(check.ctx.db).join(', ')})`);
      return;
    case 'supplyRecipe':
      if (!recipeDef(check.ctx.db, value)) check.error(`unknown recipe "${value}" (data/ship/supplies.json recipes: ${recipeIds(check.ctx.db).join(', ')})`);
      return;
    case 'supplyEffect':
      if (!effectDef(check.ctx.db, value)) check.error(`unknown supply effect "${value}" (data/ship/supplies.json effects: ${effectIds(check.ctx.db).join(', ')})`);
      return;
    case 'gearItem':
      if (!gearDef(check.ctx.db, value)) check.error(`"${value}" isn't gear (data/ship/supplies.json gear.items: ${gearIds(check.ctx.db).join(', ')})`);
      return;
    case 'supplyItem': {
      const it = check.ctx.db.items.get(value);
      if (!it) check.error(`unknown item "${value}"`);
      else if (it.type === 'key') check.error(`"${value}" is a story key item: the supplies never move or use it`);
      else if (!classOf(check.ctx.db, value)) check.error(`"${value}" isn't a supply (data/ship/supplies.json classes)`);
      return;
    }
    case 'supplyBill': {
      if (!Array.isArray(value) || !value.length) return check.error('expected a list of { item, count }');
      const seen = new Set();
      for (const c of value) {
        const it = check.ctx.db.items.get(c?.item);
        if (!it) check.error(`unknown item "${c?.item}"`);
        else if (it.type === 'key') check.error(`"${c.item}" is a story key item: never stored`);
        if (!(Number.isInteger(c?.count ?? 1) && (c?.count ?? 1) >= 1 && (c?.count ?? 1) <= supplyLimits(check.ctx.db).give)) check.error(`"${c?.item}": count must be a whole number 1 to ${supplyLimits(check.ctx.db).give}`);
        if (seen.has(c?.item)) check.error(`"${c?.item}" twice (one entry per item)`);
        seen.add(c?.item);
      }
      return;
    }
    case 'supplyTo':
      if (!['store', 'pack'].includes(value)) check.error(`"to" is store or pack (got "${value}")`);
      return;
    case 'supplyMenu':
      if (!['deposit', 'withdraw'].includes(value)) check.error(`supplyMenu is deposit or withdraw (got "${value}")`);
      return;
    case 'supplyOp':
      if (!SOURCE_OPS.includes(value)) check.error(`a source op is ${SOURCE_OPS.join(', ')} (got "${value}")`);
      return;
    case 'challenge':
      // The shape here; the rules (and the steps they run) in validateChallenge.
      if (typeof value === 'string') return check.ref('challenge profile', value, check.ctx.db.challenges);
      if (!isPlainObject(value)) check.error('a "challenge" must be a profile id (data/challenges) or an object');
      return;
    case 'speaker':
      if (value !== null) check.speaker(value);
      return;
    case 'line':
      if (typeof value !== 'string') check.error('expected a dialogue line string');
      else validateLine(value, check);
      return;
    case 'dir':
      if (!DIRECTIONS.includes(value)) check.error(`invalid direction "${value}"`);
      return;
    case 'emote':
      if (!EMOTES.includes(value)) check.error(`unknown emote "${value}" (use: ${EMOTES.join(', ')})`);
      return;
    case 'actor':
      if (typeof value !== 'string') check.error('actor must be a string id');
      else if (value !== 'player' && !check.ctx.db.npcs.has(value) && !sctx.spawned.has(value)) check.error(`unknown actor "${value}"`);
      return;
    default:
      check.error(`validator has no rule for param type "${type}"`);
  }
}

/**
 * A challenge spec on a step, or a profile (docs/gameplay-overhaul/07-challenge-outcomes.md):
 * its rules, the softlock rules, and the steps it runs (costs, consequences).
 */
function validateChallenge(spec, kind, check, sctx, step = {}) {
  if (typeof spec !== 'string' && !isPlainObject(spec)) return;
  if (typeof spec === 'string' && !check.ctx.db.challenges?.has?.(spec)) return;
  for (const problem of challengeProblems(check.ctx.db, spec, { kind, step })) check.error(problem);
  let cfg = null;
  try {
    cfg = challengeConfig(check.ctx.db, spec, { kind, id: 'check' });
  } catch {
    return;
  }
  if (!cfg || typeof spec === 'string') return;
  const steps = { 'onFailure.costs': spec.onFailure?.costs, 'onFailure.consequences': spec.onFailure?.consequences, 'onPartial.consequences': spec.onPartial?.consequences };
  // A difficulty can bring its own costs and consequences: they are steps like any other.
  for (const [d, block] of Object.entries(isPlainObject(spec.difficulty) ? spec.difficulty : {})) {
    if (!isPlainObject(block)) continue;
    Object.assign(steps, { [`difficulty.${d}.onFailure.costs`]: block.onFailure?.costs, [`difficulty.${d}.onFailure.consequences`]: block.onFailure?.consequences, [`difficulty.${d}.onPartial.consequences`]: block.onPartial?.consequences });
  }
  for (const [path, list] of Object.entries(steps)) if (list !== undefined) validateParam('steps', list, check.at(path), sctx);
  for (const f of cfg.keep.flags) check.flag(f);
}

function validateStep(step, check, sctx) {
  if (typeof step === 'string') {
    validateLine(step, check);
    return;
  }
  if (!isPlainObject(step)) {
    check.error(`step must be a string or object, got ${JSON.stringify(step)}`);
    return;
  }
  let name;
  try {
    name = commandNameOf(step);
  } catch (err) {
    check.error(err.message);
    return;
  }
  if ('if' in step) check.condition(step.if);
  if (name === 'if') {
    for (const k of Object.keys(step)) if (!STEP_MODIFIERS.has(k) && !isCommentKey(k)) check.error(`unexpected key "${k}" in branch`);
    for (const branch of ['then', 'else']) {
      if (branch in step) validateParam('steps', step[branch], check.at(branch), sctx);
    }
    return;
  }
  const schema = COMMAND_SCHEMAS[name];
  for (const key of Object.keys(step)) {
    if (isCommentKey(key) || key === 'if') continue;
    if (!(key in schema)) check.error(`command "${name}" has unknown parameter "${key}"`);
  }
  for (const [key, typeSpec] of Object.entries(schema)) {
    const optional = typeSpec.endsWith('?');
    const type = optional ? typeSpec.slice(0, -1) : typeSpec;
    if (!(key in step)) {
      if (!optional) check.error(`command "${name}" is missing "${key}"`);
      continue;
    }
    if (name === 'music' && key === 'music' && step.music === null) continue;
    if (name === 'ambience' && key === 'ambience' && step.ambience === null) continue;
    validateParam(type, step[key], check.at(`${name}.${key}`), sctx);
  }
  if (name === 'spawn' && step.id) sctx.spawned.add(step.id);
  if (name === 'spawn') sctx.spawned.add(step.spawn);
  if (name === 'choice' && Array.isArray(step.choice)) {
    step.choice.forEach((opt, i) => {
      const oc = check.at(`choice[${i}]`);
      if (!isPlainObject(opt)) return oc.error('choice option must be an object');
      for (const k of Object.keys(opt)) if (!['text', 'if', 'goto', 'then', 'end'].includes(k) && !isCommentKey(k)) oc.error(`unknown option key "${k}"`);
      if (typeof opt.text !== 'string') oc.error('choice option needs "text"');
      else validateText(opt.text, oc);
      if ('if' in opt) oc.condition(opt.if);
      if ('goto' in opt) validateParam('label', opt.goto, oc, sctx);
      if ('then' in opt) validateParam('steps', opt.then, oc, sctx);
    });
  }
  if (name === 'parallel' && Array.isArray(step.parallel)) {
    step.parallel.forEach((branch, i) => {
      if (!Array.isArray(branch)) check.error(`parallel[${i}] must be a list of steps`);
      else validateSteps(branch, check.at(`parallel[${i}]`), sctx);
    });
  }
  if (name === 'camera' && !['pan', 'follow', 'reset'].includes(step.camera)) check.error(`camera mode must be pan|follow|reset`);
  if (name === 'deadCenter') check.deadCenter(step.deadCenter);
  if (name === 'sharkstorm') check.sharkstorm(step.sharkstorm);
  if (name === 'tv' && step.mode !== undefined && !['normal', 'knobs'].includes(step.mode)) check.error('tv mode must be normal or knobs');
  if (name === 'tv' && step.mode === 'knobs' && !step.panel && !check.ctx.db.tv?.get?.(step.tv)?.knobs) check.error(`television "${step.tv}" has no knobs`);
  if (name === 'tv' && step.panel && !check.ctx.db.tv?.get?.(step.tv)?.knobPanels?.[step.panel]) check.error(`television "${step.tv}" has no knob panel "${step.panel}"`);
  if (name === 'tvSet' && step.state !== undefined) {
    const st = check.ctx.db.tv?.get?.(step.tvSet)?.states ?? {};
    if (step.state !== 'working' && !st[step.state]) check.error(`television "${step.tvSet}" has no state "${step.state}"`);
  }
  if (name === 'tvProgram') {
    const prog = check.ctx.db.tvPrograms?.get?.(step.tvProgram);
    if (!prog) check.error(`unknown programme "${step.tvProgram}"`);
    else if (step.episode && !(prog.episodes ?? []).some((e) => e.id === step.episode)) check.error(`programme "${step.tvProgram}" has no episode "${step.episode}"`);
  }
  if (name === 'course' && !['show', 'drift', 'hide'].includes(step.course)) check.error('course must be show, drift or hide');
  if (name === 'sharkDuty' && step.sharkDuty !== 'clear') check.error('sharkDuty must be "clear"');
  if (name === 'alarm' && !alarmLevel(check.ctx.db, step.alarm)) check.error(`alarm level must be one of ${Object.keys(alarmLevels(check.ctx.db)).join(', ')}`);
  if (name === 'alarm' && step.where) validateText(step.where, check.at('alarm.where'));
  if (name === 'restage' && !['walk', 'cut'].includes(step.restage)) check.error('restage must be "walk" or "cut"');
  // respawn puts the CAPTAIN at a spawn point ("safe", or a spawn's id): it is not a way to re-place an NPC
  // (placements follow the story by themselves).
  if (name === 'respawn' && step.respawn !== 'safe' && !spawnIds(check.ctx.db).has(step.respawn)) {
    check.error(`respawn "${step.respawn}" is not a spawn point ("safe" or a map spawn id); NPCs re-place themselves when the story changes`);
  }
  if (name === 'burst' && !PARTICLE_BURSTS.includes(step.burst)) check.error(`unknown burst "${step.burst}" (use: ${PARTICLE_BURSTS.join(', ')})`);
  if (name === 'propFx' && !PROP_FX.includes(step.propFx)) check.error(`unknown propFx "${step.propFx}" (use: ${PROP_FX.join(', ')})`);
  if (name === 'propFx' && !step.prop && !step.area) check.error('propFx needs "prop" or "area"');
  if (name === 'tether' && !['on', 'off'].includes(step.tether)) check.error('tether must be "on" or "off"');
  if (name === 'tether' && step.tether === 'on' && (step.x === undefined || step.y === undefined)) check.error('tether "on" needs x and y');
  if (name === 'fumeCloud' && step.level && !FUME_LEVELS.includes(step.level)) check.error(`fume level must be one of ${FUME_LEVELS.join(', ')}`);
  if (name === 'bark' && step.bark !== 'none') validateParam('actor', step.bark, check.at('bark'), sctx);
  if (name === 'bark' && step.bark === 'none' && (step.x === undefined || step.y === undefined)) check.error('a bark with no speaker needs x and y');
  if (name === 'bark') validateText(step.text, check.at('bark.text'));
  if (name === 'sprite' || name === 'spriteFrame') {
    const frame = step.frame;
    if (!check.ctx.art.stage.has(frame) && !check.ctx.art.props.has(frame) && !check.ctx.art.fx.has(frame)) check.error(`no stage/prop/fx art "${frame}"`);
  }
  if (name === 'token' && !check.ctx.art.stage.has(step.token) && !check.ctx.art.props.has(step.token)) check.error(`no stage/prop art "${step.token}" for the token`);
  if (name === 'insert' && !check.ctx.art.inserts.has(step.insert)) check.error(`no insert art "${step.insert}"`);
  if ('async' in step && step.async && !ASYNC_COMMANDS.has(name)) check.error(`"${name}" cannot run async`);
  if (name === 'fade' && !['in', 'out'].includes(step.fade)) check.error('fade must be "in" or "out"');
  if (name === 'sharks' && step.sharks !== 'auto' && !SHARK_LEVELS.includes(step.sharks)) check.error(`shark level must be "auto" or one of ${SHARK_LEVELS.join(', ')}`);
  if (name === 'sharkEvent') {
    if (!SHARK_EVENTS.includes(step.sharkEvent)) check.error(`unknown shark event "${step.sharkEvent}" (use: ${SHARK_EVENTS.join(', ')})`);
    if (['bite', 'flop', 'lure'].includes(step.sharkEvent) && (step.x === undefined || step.y === undefined)) check.error(`shark event "${step.sharkEvent}" needs x and y`);
  }
  if (name === 'tint' && !/^#[0-9a-fA-F]{6}$/.test(step.color ?? '')) check.error('tint color must be "#rrggbb"');
  if (name === 'repair' && !REPAIR_KINDS[step.repair]) check.error(`unknown timing-bar kind "${step.repair}" (see src/systems/repairKinds.js)`);
  if ((name === 'repair' || name === 'sashTension') && step.challenge !== undefined) validateChallenge(step.challenge, name, check.at(`${name}.challenge`), sctx, step);
  // A ship repair is always a challenge (its repair's, or this step's own).
  if (name === 'shipRepair' && step.challenge !== undefined) validateChallenge(step.challenge, 'repair', check.at('shipRepair.challenge'), sctx, { strikes: check.ctx.db.ship?.repairs?.[step.repair]?.strikes });
  if ((name === 'shipDamage' || name === 'shipRestore' || name === 'flood' || name === 'drain') && !(step.amount > 0)) check.error(`${name}: "amount" must be a number above 0`);
  // Prompt 6: a breach lands in one of the section's own floodable rooms; a patch is a challenge like a repair.
  if (name === 'shipDamage' && step.room !== undefined) {
    for (const sec of asArray(step.shipDamage)) if (!asArray(check.ctx.db.ship?.sections?.[sec]?.rooms).includes(step.room)) check.error(`shipDamage: "${step.room}" isn't one of the ${sec}'s rooms`);
    if (step.breach !== true) check.error('shipDamage: "room" only matters with "breach": true');
  }
  if (name === 'leak' && step.room !== undefined && !asArray(check.ctx.db.ship?.sections?.[step.leak]?.rooms).includes(step.room)) check.error(`leak: "${step.room}" isn't one of the ${step.leak}'s rooms`);
  if (name === 'ignite' && step.intensity !== undefined && !(step.intensity > 0 && step.intensity <= 100)) check.error('ignite: "intensity" must be 1 to 100');
  if (name === 'patchLeak' && step.patchLeak !== true && typeof step.patchLeak !== 'string') check.error('patchLeak: true (the worst leak here) or a leak id');
  if (name === 'patchLeak' && step.challenge !== undefined) validateChallenge(step.challenge, 'repair', check.at('patchLeak.challenge'), sctx, { strikes: check.ctx.db.shipHazards?.actions?.patch?.strikes });
  if (name === 'hazardAction' && step.station !== undefined && !check.ctx.db.shipHazards?.stations?.[step.station]) check.error(`hazardAction: unknown station "${step.station}"`);
  // Prompt 7: a source must end and stay within the limits; amounts and shares in range; a state the opening has; a seal is a challenge.
  if (name.startsWith('air')) {
    const lim = check.ctx.db.shipAir?.limits ?? {};
    if (name === 'airSource') {
      if (!(step.rate > 0 && step.rate <= (lim.rate ?? 20))) check.error(`airSource: "rate" must be above 0, at most ${lim.rate ?? 20} a second`);
      if (step.amount === undefined && step.seconds === undefined) check.error('airSource: a source must end: give it "amount" or "seconds"');
      if (step.amount !== undefined && !(step.amount > 0)) check.error('airSource: "amount" must be above 0');
      if (step.seconds !== undefined && !(Number.isInteger(step.seconds) && step.seconds > 0 && step.seconds <= (lim.seconds ?? 600))) check.error(`airSource: "seconds" must be whole, 1 to ${lim.seconds ?? 600}`);
    }
    if (name === 'airAdd' && !(step.pct > 0 && step.pct <= 100)) check.error('airAdd: "pct" must be above 0, at most 100');
    if (name === 'airVent' && step.share !== undefined && !(step.share > 0 && step.share <= 1)) check.error('airVent: "share" must be above 0, at most 1');
    if (name === 'airStop' && !(typeof step.airStop === 'string' || (step.airStop === true && step.room !== undefined))) check.error('airStop: a source id, or true with a "room"');
    if ((name === 'airConnection' || name === 'airControl') && step.state !== undefined) {
      const kd = connectionKind(check.ctx.db, step[name]);
      if (kd && !asArray(kd.states).includes(step.state)) check.error(`${name}: ${connection(check.ctx.db, step[name])?.label} can't be ${step.state} (${asArray(kd.states).join(', ')})`);
    }
    if (name === 'airControl' && step.state === 'sealed') check.error('airControl: sealing is airSeal (materials and the repair bar)');
    if (name === 'airConnection' && step.state === undefined && step.damaged === undefined) check.error('airConnection: give a "state" or "damaged"');
    if (name === 'airSeal') {
      const kd = connectionKind(check.ctx.db, step.airSeal);
      if (kd && !asArray(kd.states).includes('sealed')) check.error(`airSeal: ${connection(check.ctx.db, step.airSeal)?.label} can't be sealed`);
      if (step.challenge !== undefined) validateChallenge(step.challenge, 'repair', check.at('airSeal.challenge'), sctx, { strikes: check.ctx.db.shipAir?.actions?.seal?.strikes });
    }
  }
  if (name === 'airMend' && step.challenge !== undefined) validateChallenge(step.challenge, 'repair', check.at('airMend.challenge'), sctx, { strikes: check.ctx.db.shipAir?.actions?.mend?.strikes });
  if (name === 'airMend') {
    const kd = connectionKind(check.ctx.db, step.airMend);
    if (kd && !(asArray(kd.states).length > 1)) check.error(`airMend: ${connection(check.ctx.db, step.airMend)?.label} can't be damaged (nothing to mend)`);
  }
  // Prompt 8: a subject's own triggers, calms and modifiers; amounts within its range; a hold is a challenge.
  if (name.startsWith('pressure')) {
    const def = subjectDef(check.ctx.db, step[name]);
    if (def) {
      const span = def.max - def.min;
      if (name === 'pressureTrigger' && !def.triggers[step.trigger]) check.error(`pressureTrigger: ${def.name} has no trigger "${step.trigger}" (${Object.keys(def.triggers).filter((k) => !k.startsWith('//')).join(', ')})`);
      if (name === 'pressureCalm' && !def.calms[step.calm]) check.error(`pressureCalm: ${def.name} has no calm "${step.calm}" (${Object.keys(def.calms).filter((k) => !k.startsWith('//')).join(', ')})`);
      if (name === 'pressureModifier' && !def.modifiers[step.modifier]) check.error(`pressureModifier: ${def.name} has no modifier "${step.modifier}"`);
      if (name === 'pressureAdd' && !(Number.isFinite(step.amount) && step.amount !== 0 && Math.abs(step.amount) <= span)) check.error(`pressureAdd: "amount" must be a number other than 0, at most ${span} either way`);
      if (name === 'pressureHold' && step.amount !== undefined && !(Number.isFinite(step.amount) && step.amount > 0 && step.amount <= span / 2)) check.error(`pressureHold: "amount" must be above 0, at most ${span / 2}`);
      if (name === 'pressureSettle' && step.pressure !== undefined && !(Number.isFinite(step.pressure) && step.pressure >= def.min && step.pressure < def.max)) check.error(`pressureSettle: "pressure" must be from ${def.min} to below ${def.max}`);
    }
    if (name === 'pressureSetback' && step.action !== undefined && step.action !== 'restrain') check.error('pressureSetback: "action" is "restrain"');
    if (name === 'pressureErupt' && step.controlled === true && step.profile !== undefined) check.error('pressureErupt: a controlled release takes its size from him; give "profile" or "controlled", not both');
    if (name === 'pressureRestrain' && step.challenge !== undefined) validateChallenge(step.challenge, 'repair', check.at('pressureRestrain.challenge'), sctx, { strikes: check.ctx.db.shipPressure?.actions?.restrain?.strikes });
  }
  // Prompt 10: whole, positive amounts; a transfer the store would refuse; only a salvage or a stir is a challenge.
  if (['supplyTransfer', 'supplySource', 'supplyTake', 'supplySetback', 'cook'].includes(name)) {
    const db = check.ctx.db;
    const lim = supplyLimits(db);
    if (step.count !== undefined && !(Number.isInteger(step.count) && step.count >= 1 && step.count <= lim.give)) check.error(`${name}: "count" must be a whole number 1 to ${lim.give}`);
    if (name === 'supplyTransfer' && step.to === 'store' && storeDef(db, step.supplyTransfer)) {
      const cls = classOf(db, step.item);
      if (cls && !storeDef(db, step.supplyTransfer).accepts.includes(cls)) check.error(`supplyTransfer: ${storeDef(db, step.supplyTransfer).label} doesn't take ${cls}`);
    }
    if (name === 'supplySource' && step.op !== 'restock' && step.count !== undefined) check.error('supplySource: "count" is only for a restock');
    if (name === 'supplyTake' && step.challenge !== undefined) {
      if (sourceDef(db, step.supplyTake)?.type !== 'salvage') check.error('supplyTake: only a salvage is a challenge (a search or a recovery is time)');
      else validateChallenge(step.challenge, 'repair', check.at('supplyTake.challenge'), sctx, { strikes: sourceDef(db, step.supplyTake).action.strikes });
    }
    if (name === 'cook' && step.challenge !== undefined) validateChallenge(step.challenge, 'repair', check.at('cook.challenge'), sctx, { strikes: recipeDef(db, step.cook)?.action?.strikes });
    if (name === 'supplySetback') {
      if (!['salvage', 'cook'].includes(step.supplySetback)) check.error('supplySetback: "salvage" (a knock) or "cook" (scorched), as a challenge cost');
      if (step.supplySetback === 'salvage' && !step.source) check.error('supplySetback salvage needs "source"');
      if (step.supplySetback === 'cook' && !step.recipe) check.error('supplySetback cook needs "recipe"');
    }
  }
  if (name === 'suppliesSystem' && typeof step.suppliesSystem !== 'boolean') check.error('suppliesSystem: true or false');
  // Prompt 10: an item the story takes or swaps is quest-critical: the supplies must never store, spend or cook it.
  if (name === 'takeItem' || name === 'swapItem') {
    const cls = classOf(check.ctx.db, step[name]);
    if (cls && cls !== 'equipment') check.error(`${name} "${step[name]}": a story step needs it, so it can't be a supply (${cls} in data/ship/supplies.json classes): the stores could hold it when the story looks for it`);
  }
  // Prompt 9: amounts within limits; a derived status can't be applied; scrubbing is a challenge, rinsing isn't.
  if (name.startsWith('beard') && name !== 'beard' && name !== 'beardPuff') {
    const bd = check.ctx.db.shipBeard;
    const most = bd?.limits?.addAmount ?? 100;
    if (name === 'beardAdd' && !(Number.isFinite(step.amount) && step.amount > 0 && step.amount <= most)) check.error(`beardAdd: "amount" must be above 0, at most ${most}`);
    if (name === 'beardClean') {
      if (step.beardClean !== true && !beardContaminant(check.ctx.db, step.beardClean)) check.error('beardClean: true (everything) or a contaminant of data/ship/beard.json');
      if (step.share !== undefined && !(Number.isFinite(step.share) && step.share > 0 && step.share <= 1)) check.error('beardClean: "share" must be above 0, at most 1');
    }
    if (name === 'beardStatus') {
      const st = beardStatus(check.ctx.db, step.beardStatus);
      if (st?.kind === 'derived' && !step.remove) check.error(`beardStatus: ${st.label} comes from what the beard holds; it can't be applied`);
      const lim = bd?.limits?.statusSeconds ?? 600;
      if (step.seconds !== undefined && !(Number.isInteger(step.seconds) && step.seconds >= 1 && step.seconds <= lim)) check.error(`beardStatus: "seconds" must be whole, 1 to ${lim}`);
    }
    if (name === 'beardSaturation' && typeof step.beardSaturation !== 'boolean') check.error('beardSaturation: true or false');
    if (name === 'beardSetback' && step.beardSetback !== 'scrub') check.error('beardSetback: "scrub" (a failed scrub, as a challenge cost)');
    if (name === 'beardCare' && step.challenge !== undefined) {
      if (step.beardCare !== 'scrub') check.error('beardCare: only a scrub is a challenge (a rinse is water and time)');
      else validateChallenge(step.challenge, 'repair', check.at('beardCare.challenge'), sctx, { strikes: bd?.care?.scrub?.strikes });
    }
  }
  if ((name === 'repair' || name === 'sashTension') && step.challenge === undefined && ['outcomeValue', 'ifSuccess', 'ifPartial', 'ifFailure'].some((k) => k in step)) {
    check.error('outcomeValue / ifSuccess / ifPartial / ifFailure need a "challenge" (a legacy step always succeeds)');
  }
  // Story Phases 11-13: the sash tension, the dice, fragile items.
  if (name === 'sashTension' && !check.ctx.db.tension?.has?.(step.sashTension)) check.error(`unknown sash tension "${step.sashTension}" (data/story/tension)`);
  if (name === 'dice') {
    if (!['show', 'roll', 'hop', 'hold', 'hide'].includes(step.dice)) check.error(`dice must be show, roll, hop, hold or hide (got "${step.dice}")`);
    if (!check.ctx.db.dice?.has?.(step.die ?? 'grand_dice')) check.error(`unknown die "${step.die ?? 'grand_dice'}" (data/story/dice)`);
    if (step.dice === 'roll' && !(Number.isInteger(step.result) && step.result >= 1 && step.result <= 6)) check.error('a dice roll needs "result": 1-6 (the story decides; it is never random)');
    if (step.dice === 'hop' && !(Number.isInteger(step.to) && step.to >= 1 && step.to <= 6)) check.error('a dice hop needs "to": 1-6');
  }
  if (name === 'wear') {
    const item = check.ctx.db.items.get(step.wear);
    if (item && !item.wear) check.error(`item "${step.wear}" has no "wear" stages`);
    if (item?.wear && step.to && !item.wear.stages.includes(step.to)) check.error(`"${step.to}" is not one of ${step.wear}'s wear stages`);
  }
  if (name === 'repair' && step.strikes !== undefined && (step.strikes < 1 || step.strikes > 8)) check.error('repair strikes must be 1..8');
  // Story Phase 14: stability, reassurance, the Grand Bank, the Grand Currency.
  if (name === 'stability' || name === 'reassure') {
    const sid = step.subject ?? 'brogath';
    const subj = check.ctx.db.stability?.get?.(sid);
    if (!subj) check.error(`unknown stability subject "${sid}" (data/story/stability)`);
    else if (name === 'reassure') {
      if (!subj.prompts?.[step.reassure]) check.error(`stability subject "${sid}" has no prompt set "${step.reassure}"`);
    } else {
      const op = step.stability;
      const ops = ['trigger', 'calm', 'set', 'add', 'anger', 'recover', 'meter', 'incident', 'secure', 'settle'];
      if (!ops.includes(op)) check.error(`stability must be one of ${ops.join(', ')} (got "${op}")`);
      if (op === 'trigger' && !subj.triggers?.[step.id]) check.error(`stability subject "${sid}" has no trigger "${step.id}"`);
      if (op === 'calm' && !subj.calms?.[step.id]) check.error(`stability subject "${sid}" has no calm "${step.id}"`);
      if (op === 'incident' && !subj.incidents?.[step.id]) check.error(`stability subject "${sid}" has no incident "${step.id}"`);
      if ((op === 'set' || op === 'add') && typeof step.pressure !== 'number') check.error(`stability "${op}" needs a number "pressure"`);
      if (op === 'meter' && !['show', 'hide', 'auto'].includes(step.show)) check.error('stability "meter" needs "show": show, hide or auto');
      if (op === 'anger' && !subj.angerFlag) check.error(`stability subject "${sid}" has no angerFlag`);
      if (op === 'recover' && !subj.recoverFlag) check.error(`stability subject "${sid}" has no recoverFlag`);
    }
  }
  if (name === 'bank' || name === 'bankDeposit' || name === 'grandCurrency') {
    const bid = step.bankId ?? 'grand_bank';
    if (name === 'bankDeposit') {
      const cust = check.ctx.db.bankCustomers?.get?.(step.bankDeposit);
      if (!cust) check.error(`unknown bank customer "${step.bankDeposit}" (data/story/bank)`);
    } else {
      const bank = check.ctx.db.banks?.get?.(bid);
      if (!bank) check.error(`unknown bank "${bid}" (data/story/bank)`);
      else if (name === 'bank') {
        if (step.bank !== 'next') check.error('bank must be "next"');
        if (step.queue && !bank.queues?.[step.queue]) check.error(`bank "${bid}" has no queue "${step.queue}"`);
      } else {
        if (step.grandCurrency !== 'purchase') check.error('grandCurrency must be "purchase"');
        if (!bank.currency) check.error(`bank "${bid}" has no "currency"`);
      }
    }
  }
  if (name === 'swapItem' && step.swapItem === step.to) check.error('swapItem needs two different items');
  // Story Phase 15: the ship's atmosphere, Stenchmaster Channel episodes, one-time conversions.
  if (name === 'atmosphere') {
    const ship = check.ctx.db.atmosphere?.get?.('ship');
    if (!ship) check.error('no ship atmosphere (data/story/atmosphere.json)');
    else if (!((step.room || step.clearRooms) && step.atmosphere === 'SHIP') && !ship.states?.[step.atmosphere]) check.error(`unknown atmosphere state "${step.atmosphere}"`);
    if (step.room && ship && ship.maps && !ship.maps.includes(step.room)) check.error(`"${step.room}" is not one of the ship's maps`);
  }
  // Story Phase 16: the beard, the Fart Zone, novelty devices, proceedings, credit, the converter, hornets.
  if (name === 'beard') {
    const def = check.ctx.db.beard?.get?.('beard');
    if (!['add', 'remove'].includes(step.beard)) check.error('beard must be "add" or "remove"');
    if (!def?.tags?.[step.tag]) check.error(`unknown beard tag "${step.tag}" (data/story/beard.json)`);
    else if (step.beard === 'remove' && def.tags[step.tag].permanent !== false) check.error(`beard tag "${step.tag}" is permanent: it can't be removed`);
  }
  if (name === 'fartZone') {
    const def = check.ctx.db.fartZone?.get?.('zone');
    const ops = ['queue', 'enter', 'door', 'portholes', 'prepare', 'release', 'ventilate', 'complete', 'reset'];
    if (!def) check.error('no Stenchmaster Fart Zone (data/story/fart_zone.json)');
    if (!ops.includes(step.fartZone)) check.error(`fartZone must be one of ${ops.join(', ')}`);
    if ((step.fartZone === 'door' || step.fartZone === 'portholes') && !['open', 'closed'].includes(step.value)) check.error(`fartZone "${step.fartZone}" needs "value": open or closed`);
    if (step.fartZone === 'queue' && !step.who) check.error('fartZone "queue" needs "who"');
    if (step.fartZone === 'release' && !def?.releases?.[step.release]) check.error(`the Fart Zone has no release "${step.release}"`);
  }
  if (name === 'lighter') {
    const def = check.ctx.db.novelty?.get?.(step.lighter);
    if (!def) check.error(`unknown novelty device "${step.lighter}" (data/story/novelty.json)`);
    else if (step.until && !def.outcomes?.[step.until]) check.error(`novelty "${step.lighter}" has no outcome "${step.until}"`);
  }
  if (name === 'proceeding' && !check.ctx.db.proceedings?.get?.(step.proceeding)) check.error(`unknown proceeding "${step.proceeding}" (data/story/proceedings)`);
  if ((name === 'appraise' || name === 'currencyConverter') && !check.ctx.db.credit?.get?.(step[name])) check.error(`unknown credit definition "${step[name]}" (data/story/credit.json)`);
  if (name === 'currencyConverter' && step.amount !== undefined && step.amount !== 'all' && !(Number.isInteger(step.amount) && step.amount > 0)) check.error('currencyConverter "amount" is a positive whole number or "all"');
  if (name === 'hornets') {
    const def = check.ctx.db.hazards?.get?.('hornets');
    if (!def?.states?.[step.hornets]) check.error(`unknown hornet state "${step.hornets}" (data/hazards/hornets.json)`);
  }
  // Story Phase 17: party joins, learned abilities, beard puffs, the Sharkstorm's flare.
  if (name === 'joinParty' && step.level !== undefined && step.level !== 'leader' && !(Number.isInteger(step.level) && step.level >= 1)) check.error('joinParty "level" is "leader" or a whole number');
  if (name === 'learnAbility' && !check.ctx.db.abilities.has(step.learnAbility)) check.error(`unknown ability "${step.learnAbility}"`);
  if (name === 'beardPuff' && !['small', 'big'].includes(step.beardPuff)) check.error('beardPuff must be "small" or "big"');
  if (name === 'beardPuff' && !check.ctx.db.beard?.get?.('beard')?.puffs) check.error('beardPuff needs "puffs" in data/story/beard.json');
  if (name === 'sharkstorm' && step.flare && !sharkstormStates(check.ctx.db)[step.sharkstorm]?.temporary) check.error(`"${step.sharkstorm}" isn't a temporary Sharkstorm state (a flare needs "temporary")`);
  if (name === 'sharkstorm' && !step.flare && step.sharkstorm !== 'end_flare' && sharkstormStates(check.ctx.db)[step.sharkstorm]?.temporary) check.error(`"${step.sharkstorm}" is temporary: use it as a flare ("flare": true)`);
  if (name === 'channelEpisode') {
    const db = check.ctx.db;
    const progId = step.program ?? 'stenchmaster_channel';
    const ep = (db.tvPrograms?.get?.(progId)?.episodes ?? []).find((e) => e.id === step.channelEpisode);
    if (!ep) check.error(`programme "${progId}" has no episode "${step.channelEpisode}"`);
    else {
      const n = (ep.beats ?? []).length;
      for (const [i, seg] of (ep.segments ?? []).entries()) {
        const sc = check.at(`${step.channelEpisode}.segments[${i}]`);
        if (seg.beats && (!Array.isArray(seg.beats) || seg.beats[0] < 0 || seg.beats[1] >= n || seg.beats[0] > seg.beats[1])) sc.error(`beats must be [from, to] within the episode's ${n} beats`);
        if (seg.script) sc.script(seg.script);
        if (seg.commercial) {
          const ad = seg.commercial;
          const adProg = db.tvPrograms?.get?.(ad.program ?? 'bbk_sash_ads');
          if (!(adProg?.episodes ?? []).some((e) => e.id === ad.episode)) sc.error(`no commercial "${ad.program ?? 'bbk_sash_ads'}/${ad.episode}"`);
          const subj = db.stability?.get?.('brogath');
          if (ad.trigger && !subj?.triggers?.[ad.trigger]) sc.error(`Brogath has no trigger "${ad.trigger}"`);
          if (ad.reassure && !subj?.prompts?.[ad.reassure]) sc.error(`Brogath has no prompt set "${ad.reassure}"`);
        }
      }
      const tvId = step.tv ?? ep.tv;
      if (ep.tvState && tvId && !db.tv?.get?.(tvId)?.states?.[ep.tvState]) check.error(`television "${tvId}" has no state "${ep.tvState}"`);
    }
  }
  if (name === 'convert' && !check.ctx.db.conversions?.get?.(step.convert)) check.error(`unknown conversion "${step.convert}" (data/story/conversions)`);
}

function validateSteps(steps, check, sctx) {
  if (!Array.isArray(steps)) {
    check.error('expected a list of steps');
    return;
  }
  steps.forEach((s, i) => validateStep(s, check.at(`#${i}`), sctx));
}

export function validateScript(id, script, check) {
  let nodes;
  try {
    nodes = normalizeScript(script);
  } catch (err) {
    check.error(err.message);
    return;
  }
  if (!nodes.start) check.error(`script "${id}" has no "start" node`);
  const sctx = { nodes, spawned: new Set() };
  for (const [label, steps] of Object.entries(nodes)) validateSteps(steps, check.at(label), sctx);
}

// ---------------------------------------------------------------------------
// Per-kind validators

function validateStats(stats, check, { required = true } = {}) {
  if (!isPlainObject(stats)) {
    if (required) check.error('stats must be an object');
    return;
  }
  for (const k of Object.keys(stats)) if (!STAT_KEYS.includes(k)) check.error(`unknown stat "${k}"`);
  if (required) for (const k of STAT_KEYS) if (typeof stats[k] !== 'number') check.error(`missing numeric stat "${k}"`);
}

function validateEffects(effects, check) {
  asArray(effects).forEach((e, i) => {
    const ec = check.at(`effect[${i}]`);
    if (!EFFECT_TYPES.includes(e?.type)) return ec.error(`unknown effect type "${e?.type}"`);
    if (e.type === 'applyStatus') ec.status(e.status);
    if (e.type === 'cure') asArray(e.status).forEach((s) => s !== 'debuffs' && ec.status(s));
    if (e.type === 'fumeWard') {
      if (typeof e.seconds !== 'number' || e.seconds <= 0) ec.error('fumeWard needs positive "seconds"');
      if (e.scale !== undefined && (typeof e.scale !== 'number' || e.scale < 0 || e.scale > 1)) ec.error('fumeWard "scale" must be 0..1');
    }
    if (e.type === 'shipEffect') for (const p of shipEffectProblems(check.ctx.db, e)) ec.error(p);
    if (e.type === 'sideEffect') {
      if (!Array.isArray(e.table) || e.table.length === 0) return ec.error('sideEffect needs a non-empty "table"');
      e.table.forEach((row, j) => {
        const rc = ec.at(`table[${j}]`);
        if (!row.id) rc.error('side effect needs an id');
        if (row.weight !== undefined && (typeof row.weight !== 'number' || row.weight <= 0)) rc.error('weight must be a positive number');
        if (row.status) rc.status(row.status);
        if (row.duration !== undefined && (row.duration < 1 || row.duration > 5)) rc.error('side effect duration must be 1..5 turns (keep them short)');
        if (row.text) validateText(row.text, rc);
        if (row.field) validateEffects(row.field, rc.at('field'));
      });
    }
  });
}

const TARGET_TYPES = ['self', 'ally', 'allies', 'enemy', 'enemies', 'allyAny'];
const AMBIENT_KINDS = ['wake', 'gulls', 'smoke', 'perchedGull', 'sailShadow', 'glitter', 'voice', 'rain', 'sailPuff', 'ratPeek', 'odorTrail', 'fins', 'fumeProp'];
const OBJECT_TYPES = ['spawn', 'warp', 'npc', 'enemy', 'inspect', 'chest', 'trigger', 'block'];

function validateBehavior(b, check, model) {
  if (!b) return;
  const types = ['stand', 'wander', 'routine', 'work', 'sit', 'still'];
  if (!types.includes(b.type)) check.error(`unknown behaviour "${b.type}" (use ${types.join('/')})`);
  if (b.type === 'routine') {
    if (!Array.isArray(b.steps) || b.steps.length === 0) check.error('routine behaviour needs "steps"');
    for (const [i, s] of (b.steps || []).entries()) {
      const keys = Object.keys(s);
      const known = ['go', 'wait', 'face', 'anim', 'ms', 'emote'];
      for (const k of keys) if (!known.includes(k)) check.error(`routine step ${i} has unknown key "${k}"`);
      if (s.go && model && isSolid(model, s.go[0], s.go[1])) check.error(`routine step ${i} goes to solid tile ${s.go}`);
      if (s.face && !DIRECTIONS.includes(s.face)) check.error(`routine step ${i} bad direction "${s.face}"`);
      if (s.emote && !EMOTES.includes(s.emote)) check.error(`routine step ${i} unknown emote "${s.emote}"`);
    }
  }
}

function validateDialogueSelectors(list, check) {
  if (list === undefined) return;
  if (!Array.isArray(list)) {
    check.error('dialogue must be a list of { if?, script | cycle }');
    return;
  }
  list.forEach((entry, i) => {
    const c = check.at(`dialogue[${i}]`);
    if ('if' in entry) c.condition(entry.if);
    if (entry.script) c.script(entry.script);
    else if (Array.isArray(entry.cycle)) entry.cycle.forEach((s) => c.script(s));
    else c.error('selector needs "script" or "cycle"');
  });
}

function validateVariants(list, c) {
  if (list === undefined || list === null) return;
  if (!Array.isArray(list)) {
    c.error('"variants" must be a list of { if, appearance?, portrait?, name? }');
    return;
  }
  list.forEach((v, i) => {
    const vc = c.at(`variants[${i}]`);
    if (!isPlainObject(v)) return vc.error('variant must be an object');
    if (!('if' in v)) vc.error('variant needs "if"');
    else vc.condition(v.if);
    if (v.appearance) vc.appearance(v.appearance);
    if (v.portrait) vc.portrait(v.portrait);
    for (const k of Object.keys(v)) if (!['if', 'appearance', 'portrait', 'name', 'title', 'voice', 'shadow'].includes(k) && !isCommentKey(k)) vc.error(`unknown variant field "${k}"`);
  });
}

function validateFumeZones(model, c) {
  const ids = new Set();
  (model.meta.fumes || []).forEach((z, i) => {
    const zc = c.at(`fumes[${i}]`);
    if (!z.id) zc.error('fume zone needs an id');
    else if (ids.has(z.id)) zc.error(`duplicate fume zone id "${z.id}"`);
    ids.add(z.id);
    if (!FUME_LEVELS.includes(z.level)) zc.error(`fume level must be one of ${FUME_LEVELS.join(', ')}`);
    for (const k of ['x', 'y', 'w', 'h']) if (typeof z[k] !== 'number') zc.error(`fume zone needs numeric ${k}`);
    if ('if' in z) zc.condition(z.if);
    if (z.severity !== undefined && !(typeof z.severity === 'number' && z.severity > 0 && z.severity <= 1)) zc.error('fume zone severity must be a number in (0, 1]');
    if (z.path !== undefined) {
      if (!Array.isArray(z.path) || z.path.length < 2 || !z.path.every((pt) => Array.isArray(pt) && pt.length === 2)) zc.error('fume path must be a list of [x, y] points');
    }
  });
  (model.meta.haze || []).forEach((h, i) => {
    const hc = c.at(`haze[${i}]`);
    if ('if' in h) hc.condition(h.if);
    if (!HAZE_LEVELS.includes(h.level)) hc.error(`haze level must be one of ${HAZE_LEVELS.join(', ')}`);
  });
  if (model.meta.fumeCollapse) c.script(model.meta.fumeCollapse);
  if (model.meta.fumeSafeSpawn && !model.spawns[model.meta.fumeSafeSpawn]) c.error(`fumeSafeSpawn "${model.meta.fumeSafeSpawn}" is not a spawn on this map`);
}

/** Every spawn id on any map (what `respawn` may name). */
function spawnIds(db) {
  if (!db.spawnIdCache) {
    db.spawnIdCache = new Set();
    for (const [, map] of db.maps.map ?? []) for (const o of map.objects ?? []) if (o.type === 'spawn') db.spawnIdCache.add(o.id);
  }
  return db.spawnIdCache;
}

export function validateContent(db, { art = ART_REGISTRY } = {}) {
  const ctx = { db, art, errors: [...db.loadErrors, ...(db.speakerErrors || [])], warnings: [], usedFlags: new Set(), usedScripts: new Set() };
  const C = (path) => new Checker(ctx, path);

  // game.json
  const g = db.game;
  if (g) {
    const c = C('data/game.json');
    const ng = g.newGame || {};
    if (!Array.isArray(ng.party) || ng.party.length === 0) c.error('newGame.party must list at least one character');
    (ng.party || []).forEach((id) => c.character(id));
    (ng.items || []).forEach((it) => c.item(it.id));
    (ng.flags || []).forEach((f) => c.flag(f));
    c.map(ng.map);
    if (ng.startScript) c.script(ng.startScript);
    if (g.titleMusic) c.music(g.titleMusic);
    (g.chapters || []).forEach((ch, i) => {
      const cc = c.at(`chapters[${i}]`);
      if (typeof ch.name !== 'string') cc.error('chapter needs a name');
      if ('if' in ch) cc.condition(ch.if);
    });
    (g.timeOfDay || []).forEach((t, i) => {
      const tc = c.at(`timeOfDay[${i}]`);
      if (!t.id) tc.error('time of day needs an id');
      if (t.grade !== undefined && t.grade !== null && !/^#[0-9a-fA-F]{6}$/.test(t.grade)) tc.error('grade must be "#rrggbb"');
      if ('if' in t) tc.condition(t.if);
    });
  }

  // The timing bar's kinds play these sounds.
  for (const [id, K] of Object.entries(REPAIR_KINDS)) {
    for (const key of REPAIR_SOUND_KEYS) if (!db.sfx.has(K[key])) ctx.errors.push(`src/systems/repairKinds.js (${id}): unknown ${key} sfx "${K[key]}"`);
  }

  for (const item of db.items.list()) {
    const c = C(`${db.items.sourceOf(item.id)} (${item.id})`);
    if (typeof item.name !== 'string') c.error('item needs a name');
    if (typeof item.description !== 'string') c.error('item needs a description');
    if (!ITEM_TYPES.includes(item.type)) c.error(`item type must be one of ${ITEM_TYPES.join(', ')}`);
    if (typeof item.value !== 'number' || item.value < 0) c.error('item needs a non-negative "value"');
    if (item.icon && !art.icons.has(item.icon)) c.error(`unknown icon "${item.icon}"`);
    if (item.type === 'consumable') {
      if (!item.use) c.error('consumable needs "use"');
      else {
        if (!['ally', 'allies', 'enemy', 'enemies', 'self'].includes(item.use.target ?? 'ally')) c.error(`bad use.target "${item.use.target}"`);
        asArray(item.use.context ?? []).forEach((ctxName) => ['field', 'battle'].includes(ctxName) || c.error(`bad use.context "${ctxName}"`));
        validateEffects(item.use.effects, c);
      }
      if (item.useSfx) c.sfx(item.useSfx);
    }
    if (item.type === 'material' && item.use) c.error('a material is used up by work (a ship repair), not from the menu: no "use"');
    if (item.type === 'equipment') {
      if (!EQUIPMENT_SLOTS.includes(item.slot)) c.error(`equipment slot must be one of ${EQUIPMENT_SLOTS.join(', ')}`);
      validateStats(item.stats || {}, c, { required: false });
      (item.equipBy || []).forEach((id) => c.character(id));
    }
    // Story Phase 11: a fragile item wears through stages (a story value) and reads differently at each.
    if (item.wear) {
      if (typeof item.wear.value !== 'string' || !Array.isArray(item.wear.stages) || item.wear.stages.length < 2) c.error('"wear" needs { value, stages: [two or more] }');
    }
    (item.variants || []).forEach((v, i) => {
      const vc = c.at(`variants[${i}]`);
      vc.condition(v.if);
      if (v.icon && !art.icons.has(v.icon)) vc.error(`unknown icon "${v.icon}"`);
      for (const k of Object.keys(v)) if (!['if', 'name', 'description', 'icon'].includes(k) && !isCommentKey(k)) vc.error(`unknown item variant field "${k}"`);
    });
  }

  // Challenge profiles (data/challenges): shared rules a step can opt into by id.
  for (const [id, prof] of db.challenges?.map ?? []) {
    const c = C(`${db.challenges.sourceOf(id)} (${id})`);
    if (!prof.kind) {
      c.error('a challenge profile needs "kind" (repair, sashTension or sharkDuty)');
      continue;
    }
    validateChallenge({ profile: id }, prof.kind, c, { nodes: {}, spawned: new Set() });
    const lists = { 'onFailure.costs': prof.onFailure?.costs, 'onFailure.consequences': prof.onFailure?.consequences, 'onPartial.consequences': prof.onPartial?.consequences };
    for (const [d, block] of Object.entries(isPlainObject(prof.difficulty) ? prof.difficulty : {})) {
      if (isPlainObject(block)) Object.assign(lists, { [`difficulty.${d}.onFailure.costs`]: block.onFailure?.costs, [`difficulty.${d}.onFailure.consequences`]: block.onFailure?.consequences, [`difficulty.${d}.onPartial.consequences`]: block.onPartial?.consequences });
    }
    for (const [path, list] of Object.entries(lists)) {
      if (list !== undefined) validateParam('steps', list, c.at(path), { nodes: {}, spawned: new Set() });
    }
    for (const problem of specKeyProblems(prof, prof.kind)) c.error(problem);
    for (const key of Object.keys(prof)) if (!isCommentKey(key) && !PROFILE_KEYS.includes(key)) c.error(`unknown challenge profile field "${key}"`);
  }

  // Difficulty presets and timing assists (data/difficulty): the known difficulties, every adjustment within its bounds.
  for (const problem of difficultyDataProblems(db)) C('data/difficulty').error(problem);

  // Ship Integrity (data/ship/integrity.json): sections, thresholds, repairs and their challenges.
  for (const problem of shipDataProblems(db)) C('data/ship').error(problem);
  // Ship hazards (data/ship/hazards.json): rooms and links from the maps, sections, materials, the patch's challenge.
  for (const problem of hazardDataProblems(db)) C('data/ship').error(problem);
  for (const problem of airDataProblems(db)) C('data/ship').error(problem);
  for (const problem of pressureDataProblems(db)) C('data/ship').error(problem);
  for (const problem of beardDataProblems(db)) C('data/ship').error(problem);
  for (const problem of suppliesDataProblems(db)) C('data/ship').error(problem);
  // A subject's "available" is a story condition like any other.
  for (const id of subjectIds(db)) {
    const cond = db.shipPressure.subjects[id].available;
    if (cond !== undefined) C('data/ship/pressure.json').at(`subjects.${id}.available`).condition(cond);
  }
  if (db.shipHazards?.actions?.patch) {
    const c = C('data/ship/hazards.json (actions.patch)');
    const spec = db.shipHazards.actions.patch.challenge ?? { profile: 'ship_repair' };
    for (const problem of challengeProblems(db, spec, { kind: 'repair', step: { strikes: db.shipHazards.actions.patch.strikes } })) c.error(`challenge: ${problem}`);
    for (const d of DIFFICULTIES) {
      let cfg = null;
      try {
        cfg = challengeConfig(db, spec, { kind: 'repair', id: 'check', difficulty: d });
      } catch {
        break;
      }
      if (!cfg?.failure) c.error(`[${d}] a patch's challenge must be able to fail ("failure": true)`);
      else if (cfg.onFailure.mustRetry) c.error(`[${d}] a patch can't be must-win: the materials may run out`);
    }
  }
  for (const [id, r] of Object.entries(db.ship?.repairs ?? {})) {
    if (id.startsWith('//')) continue;
    const c = C(`data/ship/integrity.json (repairs.${id})`);
    const spec = r.challenge ?? { profile: 'ship_repair' };
    for (const problem of challengeProblems(db, spec, { kind: 'repair', step: { strikes: r.strikes } })) c.error(`challenge: ${problem}`);
    // A repair's tries are limited by the materials, so it must always be possible to give up.
    for (const d of DIFFICULTIES) {
      let cfg = null;
      try {
        cfg = challengeConfig(db, spec, { kind: 'repair', id: 'check', difficulty: d });
      } catch {
        break;
      }
      if (!cfg?.failure) c.error(`[${d}] a ship repair's challenge must be able to fail ("failure": true)`);
      else if (cfg.onFailure.mustRetry) c.error(`[${d}] a ship repair can't be must-win: the materials may run out`);
    }
  }

  // Prompt 9: the beard scrub's challenge: a rag per try, so it must always be possible to give up.
  if (db.shipBeard?.care?.scrub) {
    const c = C('data/ship/beard.json (care.scrub)');
    const spec = db.shipBeard.care.scrub.challenge ?? { profile: 'ship_repair' };
    for (const problem of challengeProblems(db, spec, { kind: 'repair', step: { strikes: db.shipBeard.care.scrub.strikes } })) c.error(`challenge: ${problem}`);
    for (const d of DIFFICULTIES) {
      let cfg = null;
      try {
        cfg = challengeConfig(db, spec, { kind: 'repair', id: 'check', difficulty: d });
      } catch {
        break;
      }
      if (!cfg?.failure) c.error(`[${d}] a scrub's challenge must be able to fail ("failure": true)`);
      else if (cfg.onFailure.mustRetry) c.error(`[${d}] a scrub can't be must-win: the rags may run out`);
    }
  }

  // Prompt 10: a salvage's and a stir's challenge: each failure costs something, so it must always be possible to give up.
  const supplyBars = [...sourceIds(db).filter((id) => sourceDef(db, id).type === 'salvage').map((id) => [`sources.${id}`, sourceDef(db, id).action]), ...recipeIds(db).map((id) => [`recipes.${id}`, recipeDef(db, id).action])];
  for (const [where, action] of supplyBars) {
    const c = C(`data/ship/supplies.json (${where})`);
    const spec = action?.challenge ?? { profile: 'ship_repair' };
    for (const problem of challengeProblems(db, spec, { kind: 'repair', step: { strikes: action?.strikes } })) c.error(`challenge: ${problem}`);
    for (const d of DIFFICULTIES) {
      let cfg = null;
      try {
        cfg = challengeConfig(db, spec, { kind: 'repair', id: 'check', difficulty: d });
      } catch {
        break;
      }
      if (!cfg?.failure) c.error(`[${d}] its challenge must be able to fail ("failure": true)`);
      else if (cfg.onFailure.mustRetry) c.error(`[${d}] it can't be must-win: what it costs may run out`);
    }
  }

  // Story Phase 12: sash tension definitions (data/story/tension)
  for (const [id, t] of db.tension?.map ?? []) {
    const c = C(`${db.tension.sourceOf(id)} (${id})`);
    if (!(t.seconds > 0)) c.error('"seconds" must be a positive number');
    const band = t.band ?? [38, 68];
    if (!Array.isArray(band) || band.length !== 2 || !(band[0] >= 0 && band[0] < band[1] && band[1] <= 100)) c.error('"band" must be [lo, hi] with 0 <= lo < hi <= 100');
    (t.milestones ?? []).forEach((m, i) => {
      const mc = c.at(`milestones[${i}]`);
      if (!(m.at >= 0 && m.at <= t.seconds)) mc.error('"at" must be within the seconds');
      if (m.sfx) mc.sfx(m.sfx);
      if (m.text) validateText(m.text, mc);
      if (m.band && !(m.band[0] < m.band[1])) mc.error('a milestone "band" must be [lo, hi]');
    });
    for (const k of ['tightSfx', 'slackSfx', 'surgeSfx', 'gustSfx', 'caughtSfx']) if (t[k]) c.sfx(t[k]);
    if (t.count?.sfx) c.sfx(t.count.sfx);
    if (t.release?.sfx) c.sfx(t.release.sfx);
    if (t.release?.cueSfx) c.sfx(t.release.cueSfx);
    if (!(t.release?.auto > 0)) c.error('"release.auto" (ms before the hands slip by themselves) is required: the trial must always end');
  }

  // Story Phase 12: dice (data/story/dice)
  for (const [id, d] of db.dice?.map ?? []) {
    const c = C(`${db.dice.sourceOf(id)} (${id})`);
    const a = d.art ?? 'gdie';
    for (const f of [1, 2, 3, 4, 5, 6].map((n) => `${a}_${n}`).concat([0, 1, 2, 3].map((n) => `${a}_tumble_${n}`), [`${a}_shadow`])) if (!art.vista.has(f)) c.error(`no vista art "${f}"`);
    for (const n of ['1', '2', '3', '4', '5', '6']) if (typeof d.faces?.[n] !== 'string') c.error(`face ${n} needs a label ("faces")`);
    for (const snd of Object.values(d.sfx ?? {})) c.sfx(snd);
  }

  // Story Phase 14: stability subjects (data/story/stability)
  for (const [id, d] of db.stability?.map ?? []) {
    const c = C(`${db.stability.sourceOf(id)} (${id})`);
    for (const k of ['pressureVar', 'stateValue']) if (typeof d[k] !== 'string') c.error(`"${k}" is required`);
    if (d.angerFlag) c.flag(d.angerFlag);
    if (d.recoverFlag) c.flag(d.recoverFlag);
    if (d.pending && typeof d.pendingValue !== 'string') c.error('"pending" readouts need a "pendingValue"');
    for (const [pid, pr] of Object.entries(d.pending ?? {})) if (typeof pr.label !== 'string') c.at(`pending.${pid}`).error('needs a "label"');
    (d.bands ?? []).forEach((b, i) => {
      if (!STABILITY_STATES.includes(b.state)) c.at(`bands[${i}]`).error(`unknown state "${b.state}"`);
    });
    (d.stages ?? []).forEach((st, i) => {
      const sc = c.at(`stages[${i}]`);
      if (typeof st.at !== 'number') sc.error('a stage needs "at"');
      if (st.sfx) sc.sfx(st.sfx);
    });
    for (const kind of ['triggers', 'calms']) {
      for (const [eid, e] of Object.entries(d[kind] ?? {})) {
        const ec = c.at(`${kind}.${eid}`);
        if (typeof e.pressure !== 'number') ec.error('needs a number "pressure"');
        else if (kind === 'calms' && e.pressure > 0) ec.error('a calm must not raise the pressure');
        else if (kind === 'triggers' && e.pressure < 0) ec.error('a trigger must not lower the pressure');
        if (e.sfx) ec.sfx(e.sfx);
        if (e.line) validateLine(e.line, ec);
      }
    }
    for (const [pid, set] of Object.entries(d.prompts ?? {})) {
      const pc = c.at(`prompts.${pid}`);
      if (!(set.options ?? []).some((o) => o.calm)) pc.error('a prompt set needs at least one option that calms');
      (set.options ?? []).forEach((o, i) => {
        const oc = pc.at(`options[${i}]`);
        if (typeof o.text !== 'string') oc.error('an option needs "text"');
        if (!!o.calm === !!o.trigger) oc.error('an option names exactly one of "calm" or "trigger"');
        if (o.calm && !d.calms?.[o.calm]) oc.error(`no calm "${o.calm}"`);
        if (o.trigger && !d.triggers?.[o.trigger]) oc.error(`no trigger "${o.trigger}"`);
        if (o.reply) validateLine(o.reply, oc);
      });
    }
    for (const [iid, inc] of Object.entries(d.incidents ?? {})) {
      const ic = c.at(`incidents.${iid}`);
      if (!(inc.rate > 0)) ic.error('an incident needs a positive "rate"');
      if (!inc.erupt) ic.error('an incident needs an "erupt" script (what happens if it is left too long: it must be safe)');
      else ic.script(inc.erupt);
    }
  }

  // Story Phase 14: banks and their depositors (data/story/bank)
  for (const [id, b] of db.banks?.map ?? []) {
    const c = C(`${db.banks.sourceOf(id)} (${id})`);
    if (b.openFlag) c.flag(b.openFlag);
    const scale = b.scale ?? [];
    if (scale.length !== 10 || scale.some((e, i) => e.n !== i + 1 || typeof e.name !== 'string')) c.error('"scale" must be ten entries, n 1..10, each with a name');
    for (const [qid, q] of Object.entries(b.queues ?? {})) {
      const qc = c.at(`queues.${qid}`);
      if (typeof q.servedVar !== 'string') qc.error('a queue needs "servedVar"');
      (q.customers ?? []).forEach((cid) => {
        const cust = db.bankCustomers?.get?.(cid);
        if (!cust) qc.error(`unknown customer "${cid}"`);
        else if ((cust.bank ?? 'grand_bank') !== id) qc.error(`customer "${cid}" banks with "${cust.bank}"`);
      });
    }
    for (const k of ['classifyRight', 'classifyWrong']) if (b[k]) validateLine(b[k].replace(/\{(name|class)\}/g, 'x'), c.at(k));
    if (b.vault) c.script(b.vault);
    if (b.observed) c.script(b.observed);
    if (b.stateValue && typeof b.stateValue !== 'string') c.error('"stateValue" names a story value');
    if (b.currency) {
      const cc = c.at('currency');
      cc.flag(b.currency.flag);
      if (typeof b.currency.var !== 'string' || !(b.currency.amount > 0)) cc.error('currency needs "var" and a positive "amount"');
      if (!(b.currency.gold >= 0)) cc.error('currency needs "gold" (real doubloons paid)');
    }
  }
  for (const [id, cu] of db.bankCustomers?.map ?? []) {
    const c = C(`${db.bankCustomers.sourceOf(id)} (${id})`);
    const bank = db.banks?.get?.(cu.bank ?? 'grand_bank');
    if (!bank) c.error(`unknown bank "${cu.bank ?? 'grand_bank'}"`);
    if (cu.npc) c.npc(cu.npc);
    if (typeof cu.name !== 'string') c.error('a depositor needs a "name"');
    const valid = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, '10+'];
    if (!valid.includes(cu.intensity)) c.error('"intensity" must be 1..10 or "10+"');
    if (cu.classify && !cu.classify.some((n) => String(n) === String(cu.intensity))) c.error('"classify" must include the right intensity');
    (cu.classify ?? []).forEach((n) => { if (!valid.includes(n)) c.error(`classify option ${n} is not on the scale`); });
    (cu.pattern ?? []).forEach((beat, i) => {
      const bc = c.at(`pattern[${i}]`);
      const kinds = ['take', 'hold', 'wait', 'brace', 'puff'].filter((k) => k in beat);
      if (kinds.length !== 1) bc.error('a beat is exactly one of take, hold, wait, brace, puff');
      if ('hold' in beat && !(beat.hold > 0)) bc.error('"hold" is seconds (> 0)');
      if ('wait' in beat && !(beat.wait > 0)) bc.error('"wait" is milliseconds (> 0)');
      if (beat.text) validateText(beat.text, bc);
      if (beat.sfx) bc.sfx(beat.sfx);
    });
    if (!(cu.pattern ?? []).some((beat) => 'brace' in beat)) c.warn('no "brace" beat: one is added at the end');
    for (const k of ['intro', 'after', 'vault', 'observed']) if (cu[k]) c.script(cu[k]);
    (cu.modifiers ?? []).forEach((m) => { if (!TELLER_MODIFIERS.includes(m)) c.error(`unknown teller modifier "${m}" (use: ${TELLER_MODIFIERS.join(', ')})`); });
    if (cu.brogathTrigger && !db.stability?.get?.('brogath')?.triggers?.[cu.brogathTrigger]) c.error(`Brogath has no trigger "${cu.brogathTrigger}"`);
    // Story Phase 16: other ways to pay at the counter, and credit applications.
    if (cu.payment !== undefined && !['tokens', 'check', 'application'].includes(cu.payment)) c.error('"payment" must be tokens, check or application');
    if (cu.payment === 'tokens' && !(cu.tokens >= 0)) c.error('a token payment needs "tokens" (>= 0)');
    if (cu.check && art?.inserts && !art.inserts.has(cu.check)) c.error(`unknown insert "${cu.check}" (the check)`);
    if (cu.appraise && !db.credit?.get?.(cu.appraise.credit ?? 'sashback')) c.error(`unknown credit "${cu.appraise.credit ?? 'sashback'}"`);
  }

  // Story Phase 15: the ship's atmosphere, one-time conversions, Brogath's ancient crew (lore)
  for (const [id, a] of db.atmosphere?.map ?? []) {
    const c = C(`${db.atmosphere.sourceOf(id)} (${id})`);
    if (typeof a.value !== 'string') c.error('the atmosphere needs a story "value"');
    if (!a.states?.[a.default ?? 'NORMAL']) c.error(`no default state "${a.default ?? 'NORMAL'}"`);
    for (const m of a.maps ?? []) if (!db.maps.has(m)) c.error(`unknown map "${m}"`);
    for (const [sid, s] of Object.entries(a.states ?? {})) {
      const sc = c.at(`states.${sid}`);
      if (!ATMOSPHERE_STATES.includes(sid)) sc.error(`unknown state (use: ${ATMOSPHERE_STATES.join(', ')})`);
      if (s.haze && !['faint', 'light', 'dense'].includes(s.haze.level)) sc.error('haze.level must be faint, light or dense');
      if (s.haze?.color && !/^#[0-9a-fA-F]{6}$/.test(s.haze.color)) sc.error('haze.color must be "#rrggbb"');
      if (s.music && !db.music.has(s.music)) sc.error(`unknown music "${s.music}"`);
      if (s.ambience && !db.ambience.has(s.ambience)) sc.error(`unknown ambience "${s.ambience}"`);
      if (s.npcPace !== undefined && !(s.npcPace > 0 && s.npcPace <= 2)) sc.error('npcPace must be in (0, 2]');
    }
  }
  // Story Phase 16: the beard, the Fart Zone, novelty devices, proceedings, credit, hornets.
  for (const [id, b] of db.beard?.map ?? []) {
    const c = C(`${db.beard.sourceOf(id)} (${id})`);
    for (const [tid, t] of Object.entries(b.tags ?? {})) {
      if (!/^[A-Z_]+$/.test(tid)) c.error(`beard tag "${tid}" should be UPPER_CASE`);
      if (typeof t.label !== 'string') c.error(`beard tag "${tid}" needs a "label"`);
      c.flag(`${b.flagPrefix ?? 'beard_'}${tid.toLowerCase()}`);
    }
    // Story Phase 17: the beard's puffs
    if (b.puffs) {
      const pc = c.at('puffs');
      const pf = b.puffs;
      if (pf.if) pc.condition(pf.if);
      if (!Array.isArray(pf.every) || pf.every.length !== 2 || pf.every[0] < 8000) pc.error('"every" must be [min, max] ms, at least 8000 (a puff, not a fog)');
      for (const f of [pf.sfx ?? []].flat()) pc.sfx(f);
      for (const [who, lines] of Object.entries(pf.reactions ?? {})) {
        if (who !== '*' && !db.npcs.has(who)) pc.error(`reactions: unknown NPC "${who}"`);
        if (!Array.isArray(lines) || !lines.length) pc.error(`reactions.${who} needs lines`);
        for (const l of lines ?? []) if (typeof l !== 'string' || l.length > 60) pc.error(`reactions.${who}: a bark is a short string (60 characters at most): "${l}"`);
      }
      if (pf.exposure && !(pf.exposure.alpha > 0 && pf.exposure.alpha <= 0.3)) pc.error('exposure.alpha must be in (0, 0.3]: a tint, never a fog');
    }
  }
  for (const [id, z] of db.fartZone?.map ?? []) {
    const c = C(`${db.fartZone.sourceOf(id)} (${id})`);
    if (z.map && !db.maps.has(z.map)) c.error(`unknown map "${z.map}"`);
    for (const [rid, r] of Object.entries(z.releases ?? {})) {
      if (r.odor && !db.atmosphere?.get?.('ship')?.states?.[r.odor]) c.error(`release "${rid}": unknown atmosphere "${r.odor}"`);
      c.flag(`${z.doneFlagPrefix ?? 'fz_done_'}${rid}`);
    }
  }
  for (const [id, n] of db.novelty?.map ?? []) {
    const c = C(`${db.novelty.sourceOf(id)} (${id})`);
    if (n.item && !db.items.has(n.item)) c.error(`unknown item "${n.item}"`);
    if (!(n.sequence ?? []).length) c.error('a novelty device needs a "sequence"');
    for (const o of n.sequence ?? []) if (!n.outcomes?.[o]) c.error(`sequence names unknown outcome "${o}"`);
    for (const [oid, o] of Object.entries(n.outcomes ?? {})) {
      if (typeof o.text !== 'string') c.error(`outcome "${oid}" needs "text"`);
      if (o.sfx && !db.sfx.has(o.sfx)) c.error(`outcome "${oid}": unknown sfx "${o.sfx}"`);
    }
  }
  for (const [id, pr] of db.proceedings?.map ?? []) {
    const c = C(`${db.proceedings.sourceOf(id)} (${id})`);
    if (!['form', 'hearing', 'pitch'].includes(pr.kind)) c.error('kind must be form, hearing or pitch');
    const qs = pr.kind === 'pitch' ? [] : pr.questions ?? [];
    for (const q of qs) {
      if (q.montage) continue;
      if (!(q.options ?? []).length) c.error(`question "${q.id}" has no options`);
      for (const o of q.options ?? []) if (o.flag) c.flag(o.flag);
    }
    // The scripts it plays are ordinary step lists (lines included).
    const steps = (x, where) => {
      if (x === undefined) return;
      const sctx = { nodes: { start: [] }, spawned: new Set() };
      validateSteps(Array.isArray(x) ? x : [x], c.at(where), sctx);
    };
    for (const k of ['done', 'passed', 'retry', 'mercy', 'won', 'fail']) steps(pr[k], k);
    for (const [p, st] of Object.entries(pr.stages ?? {})) steps(st, `stages.${p}`);
    for (const q of pr.questions ?? []) {
      for (const k of ['before', 'again', 'lines']) steps(q[k], `${q.id}.${k}`);
      (q.options ?? []).forEach((o, i) => steps(o.reply, `${q.id}.options[${i}].reply`));
    }
    for (const a of pr.arguments ?? []) steps(a.reply, `${a.id}.reply`);
    if (pr.kind === 'hearing') {
      const best = qs.reduce((t, q) => t + Math.max(0, ...(q.options ?? []).map((o) => o.points ?? 0)), 0);
      if (best < (pr.pass ?? 0)) c.error(`the best answers total ${best}, short of "pass" ${pr.pass}`);
    }
    if (pr.kind === 'pitch') {
      const total = (pr.arguments ?? []).reduce((t, a) => t + Math.max(0, a.points ?? 0), 0);
      if (total < (pr.goal ?? 1)) c.error(`every argument together is worth ${total}, short of "goal" ${pr.goal}: the pitch could never be won`);
      for (const a of pr.arguments ?? []) if (a.lighter && !db.novelty?.get?.(a.lighter)) c.error(`argument "${a.id}": unknown novelty device "${a.lighter}"`);
    }
  }
  for (const [id, cr] of db.credit?.map ?? []) {
    const c = C(`${db.credit.sourceOf(id)} (${id})`);
    if (cr.policyFlag) c.flag(cr.policyFlag);
    for (const n of cr.notes ?? []) if (!(n.options ?? []).length) c.error(`note "${n.id}" has no options`);
  }
  {
    const h = db.hazards?.get?.('hornets');
    if (h) {
      const c = C('hazards/hornets');
      for (const [sid, st] of Object.entries(h.states ?? {})) {
        if (!['DORMANT', 'SCATTERED', 'ALERT', 'SWARMING', 'BEARD_ATTRACTED', 'BANK_INVADING', 'BUNKER_SIEGE', 'DISPERSING'].includes(sid)) c.error(`unknown hornet state "${sid}"`);
        for (const m of Object.keys(st.maps ?? {})) if (!db.maps.has(m)) c.error(`${sid}: unknown map "${m}"`);
      }
      if (h.buzz && !db.sfx.has(h.buzz)) c.error(`unknown sfx "${h.buzz}"`);
    }
  }
  for (const [id, cv] of db.conversions?.map ?? []) {
    const c = C(`${db.conversions.sourceOf(id)} (${id})`);
    c.flag(cv.flag);
    if (!(cv.from ?? []).length || !(cv.to ?? []).length) c.error('a conversion needs "from" and "to"');
    for (const f of cv.from ?? []) if (typeof f.var !== 'string') c.error('each "from" names a story "var"');
    for (const k of [...(cv.takeItems ?? []), ...(cv.giveItems ?? [])]) if (!db.items.has(k)) c.error(`unknown item "${k}"`);
    if ((cv.from ?? []).some((f) => f.var === 'gold')) c.error('a conversion never takes the purse');
  }
  for (const [id, m] of db.ancientCrew?.map ?? []) {
    const c = C(`${db.ancientCrew.sourceOf(id)} (${id})`);
    for (const k of ['displayName', 'role', 'summary']) if (typeof m[k] !== 'string') c.error(`"${k}" is required`);
    // Story Phase 17: two of them came back (Ledger and Tilda). A record may allow it only with the
    // reincarnation that did it: its flag, the NPC it became and the party member it is.
    if (m.reincarnationAllowed === true) {
      const r = m.reincarnation;
      if (!r || typeof r.flag !== 'string') c.error('reincarnationAllowed needs a "reincarnation" with its "flag"');
      else {
        c.flag(r.flag);
        if (!db.npcs.has(r.npc)) c.error(`reincarnation.npc "${r.npc}" is not an NPC`);
        if (r.character && !db.characters.has(r.character)) c.error(`reincarnation.character "${r.character}" is not a party character`);
      }
    } else if (m.reincarnationAllowed !== false) c.error('reincarnationAllowed must be true (with its reincarnation) or false');
    else if (m.reincarnation) c.error('a record that can\'t come back has no "reincarnation"');
    for (const f of m.storyUnlockFlags ?? []) c.flag(f);
  }

  // Story Phase 13: alias sets (data/story/aliases)
  for (const [id, set] of db.aliases?.map ?? []) {
    const c = C(`${db.aliases.sourceOf(id)} (${id})`);
    c.condition(set.if);
    if (set.overlay?.tint && !/^#[0-9a-fA-F]{6}$/.test(set.overlay.tint)) c.error('overlay.tint must be "#rrggbb"');
    for (const [who, a] of Object.entries(set.actors ?? {})) {
      const ac = c.at(`actors.${who}`);
      if (!db.speaker(who)) ac.error(`"${who}" is not a speaker`);
      if (typeof a.name !== 'string' || !a.name) ac.error('an alias needs a "name"');
      if (a.portrait) ac.portrait(a.portrait);
      if (a.appearance) ac.appearance(a.appearance);
    }
  }

  for (const ch of db.characters.list()) {
    const c = C(`${db.characters.sourceOf(ch.id)} (${ch.id})`);
    validateStats(ch.baseStats, c);
    validateStats(ch.growth || {}, c.at('growth'), { required: false });
    if (ch.portrait) c.portrait(ch.portrait);
    if (ch.appearance) c.appearance(ch.appearance);
    for (const [slot, itemId] of Object.entries(ch.startEquipment || {})) {
      if (!EQUIPMENT_SLOTS.includes(slot)) c.error(`unknown equipment slot "${slot}"`);
      if (!itemId) continue;
      const def = db.items.get(itemId);
      if (!def) c.error(`start equipment "${itemId}" does not exist`);
      else if (def.type !== 'equipment' || def.slot !== slot) c.error(`start equipment "${itemId}" does not fit slot "${slot}"`);
    }
    (ch.learnset || []).forEach((l) => c.ability(l.ability));
    if (ch.battle?.attack) c.ability(ch.battle.attack);
    // Story Phase 17: traits (data/story/traits.json)
    for (const t of ch.traits ?? []) if (!db.traits?.has?.(t)) c.error(`unknown trait "${t}" (data/story/traits.json)`);
    validateVariants(ch.variants, c);
  }
  for (const [id, t] of db.traits?.map ?? []) {
    const c = C(`${db.traits.sourceOf(id)} (${id})`);
    if (!/^[A-Z_]+$/.test(id)) c.error('a trait id is UPPER_CASE');
    if (typeof t.label !== 'string' || typeof t.description !== 'string') c.error('a trait needs "label" and "description"');
    for (const st of t.battle?.immune ?? []) if (!db.statuses.has(st)) c.error(`immune: unknown status "${st}"`);
    for (const [el, m] of Object.entries(t.battle?.damageTaken ?? {})) if (!(m > 0 && m <= 3)) c.error(`damageTaken.${el} must be in (0, 3]`);
    if (t.battle?.evade !== undefined && !(t.battle.evade >= 0 && t.battle.evade <= 25)) c.error('evade is 0..25 (percent)');
  }

  for (const st of db.statuses.list()) {
    const c = C(`${db.statuses.sourceOf(st.id)} (${st.id})`);
    if (!['buff', 'debuff'].includes(st.kind)) c.error('status kind must be buff or debuff');
    for (const k of Object.keys(st.modifiers || {})) if (!STAT_KEYS.includes(k) && k !== 'damageTaken') c.error(`unknown modifier "${k}"`);
    if (st.expires && st.expires !== 'turnStart') c.error('expires may only be "turnStart"');
    if (st.skipsTurn !== undefined && (st.skipsTurn !== true || st.kind !== 'debuff')) c.error('skipsTurn is true, on a debuff');
    if (!art.statusIcons.has(st.id) && !st.hidden) c.warn(`status "${st.id}" has no icon`);
  }

  for (const [id, mech] of db.timing.map) {
    const c = C(`data/battle/timing.json (${id})`);
    if (!art.timingTypes.has(mech.type)) c.error(`unknown timing mechanic type "${mech.type}"`);
    if (!isPlainObject(mech.windows)) c.error('timing mechanic needs "windows"');
  }

  for (const ab of db.abilities.list()) {
    const c = C(`${db.abilities.sourceOf(ab.id)} (${ab.id})`);
    if (!['attack', 'order', 'skill', 'summon'].includes(ab.kind)) c.error(`ability kind "${ab.kind}" invalid`);
    if (!TARGET_TYPES.includes(ab.target)) c.error(`ability target "${ab.target}" invalid`);
    validateEffects(ab.effects, c);
    if (ab.timing) c.timing(ab.timing);
    if (ab.summon) c.enemy(ab.summon);
    if (ab.sfx) c.sfx(ab.sfx);
  }

  for (const en of db.enemies.list()) {
    const c = C(`${db.enemies.sourceOf(en.id)} (${en.id})`);
    validateStats(en.stats, c);
    (en.abilities || []).forEach((a) => c.ability(a));
    (en.ai || []).forEach((entry, i) => {
      c.ability(entry.ability);
      if (!(en.abilities || []).includes(entry.ability)) c.error(`ai[${i}] uses "${entry.ability}" which the enemy does not have`);
    });
    (en.drops || []).forEach((d) => {
      c.item(d.item);
      if (typeof d.chance !== 'number' || d.chance < 0 || d.chance > 1) c.error(`drop chance for "${d.item}" must be 0..1`);
    });
    if (!art.enemies.has(en.sprite ?? en.id)) c.error(`no enemy art "${en.sprite ?? en.id}"`);
  }

  const encounterTags = new Set();
  for (const enc of db.encounters.list()) {
    const c = C(`${db.encounters.sourceOf(enc.id)} (${enc.id})`);
    if (!Array.isArray(enc.enemies) || enc.enemies.length === 0) c.error('encounter needs enemies');
    (enc.enemies || []).forEach((e) => c.enemy(e));
    if (enc.music) c.music(enc.music);
    if (!art.backdrops.has(enc.backdrop)) c.error(`unknown battle backdrop "${enc.backdrop}"`);
    (enc.tags || []).forEach((t) => encounterTags.add(t));
  }

  for (const shop of db.shops.list()) {
    const c = C(`${db.shops.sourceOf(shop.id)} (${shop.id})`);
    (shop.items || []).forEach((it, i) => {
      c.item(typeof it === 'string' ? it : it.id);
      if (typeof it === 'object' && 'if' in it) c.at(`items[${i}]`).condition(it.if);
    });
    if (shop.keeper) c.speaker(shop.keeper);
  }

  for (const p of db.portraits.list()) {
    const c = C(`${db.portraits.sourceOf(p.id)} (${p.id})`);
    if (!Array.isArray(p.expressions) || !p.expressions.includes('neutral')) c.error('portrait needs an expressions list including "neutral"');
    if (p.painter && !art.portraitPainters.has(p.painter)) c.error(`unknown portrait painter "${p.painter}"`);
    if (!p.painter && p.appearance !== undefined) c.appearance(p.appearance);
    const known = art.expressions;
    (p.expressions || []).forEach((e) => {
      if (!p.painter && !known.has(e)) c.error(`unknown expression "${e}"`);
    });
  }

  for (const a of db.appearances.list()) {
    const c = C(`${db.appearances.sourceOf(a.id)} (${a.id})`);
    if (a.painter && !art.characterPainters.has(a.painter)) c.error(`unknown character painter "${a.painter}"`);
    (a.poses || []).forEach((pose) => { if (!art.extraPoses.has(pose)) c.error(`unknown extra pose "${pose}"`); });
  }

  for (const pr of db.props.list()) {
    const c = C(`${db.props.sourceOf(pr.id)} (${pr.id})`);
    if (!art.props.has(pr.sprite ?? pr.id)) c.error(`no prop art "${pr.sprite ?? pr.id}"`);
    if (pr.inspect) asArray(pr.inspect).forEach((line) => validateLine(line, c));
    if (pr.layer && !['floor', 'object', 'wall', 'overhead'].includes(pr.layer)) c.error(`bad prop layer "${pr.layer}"`);
    if (pr.bed !== undefined && typeof pr.bed !== 'boolean') c.error('"bed" must be true or false');
    if (pr.sling !== undefined) {
      const ok = Array.isArray(pr.sling) && pr.sling.length === 4 && pr.sling.every(Number.isInteger) && pr.sling[0] < pr.sling[1];
      if (!ok) c.error('"sling" must be [x0, x1, y, sag]: where a hammock\'s canvas starts and ends, its top edge at the ends, and its sag (image pixels)');
      if (!pr.bed) c.error('"sling" is for beds ("bed": true)');
    }
  }

  for (const npc of db.npcs.list()) {
    const c = C(`${db.npcs.sourceOf(npc.id)} (${npc.id})`);
    if (typeof npc.name !== 'string') c.error('npc needs a name');
    c.appearance(npc.appearance ?? npc.id);
    if (npc.portrait) c.portrait(npc.portrait);
    validateDialogueSelectors(npc.dialogue, c);
    validateBehavior(npc.behavior, c.at('behavior'), null);
    validateVariants(npc.variants, c);
    // Story Phase 14: the only rooms a character is ever placed in (Brogath: never the hold).
    if (npc.rooms !== undefined) {
      if (!Array.isArray(npc.rooms) || !npc.rooms.length) c.error('"rooms" must be a non-empty list of map ids');
      else for (const m of npc.rooms) if (!db.maps.has(m)) c.error(`"rooms" names unknown map "${m}"`);
    }
  }

  // Maps (compile each, then check objects/warps against compiled targets).
  const compiled = new Map();
  for (const def of db.maps.list()) {
    const c = C(`${db.maps.sourceOf(def.id)} (${def.id})`);
    try {
      compiled.set(def.id, compileMap(def, db.tilesets.get(def.tileset), db.props));
    } catch (err) {
      c.error(err.message);
    }
  }
  // Where scripts put people, against the walls and fixed furniture of their room.
  checkStaging(db, compiled, (script, map, msg) => C(`${db.scripts.sourceOf?.(script) ?? 'scripts'} (${script})`).error(`staging on ${map}: ${msg}`));
  for (const [id, model] of compiled) {
    const def = db.maps.get(id);
    const c = C(`${db.maps.sourceOf(id)} (${id})`);
    if (def.music !== undefined) c.music(def.music);
    if (def.ambience !== undefined) c.ambience(def.ambience);
    // Shark Duty entries; one may opt the watch into a challenge (docs/gameplay-overhaul/07-challenge-outcomes.md).
    (def.sharkDuty || []).forEach((e, i) => {
      const ec = c.at(`sharkDuty[${i}]`);
      if ('if' in e) ec.condition(e.if);
      if (e.session && !db.hazards?.get?.('shark_duty')?.sessions?.[e.session]) ec.error(`unknown Shark Duty session "${e.session}" (data/hazards/shark_duty.json)`);
      if (e.challenge !== undefined) {
        validateParam('challenge', e.challenge, ec.at('challenge'), { nodes: {}, spawned: new Set() });
        validateChallenge(e.challenge, 'sharkDuty', ec.at('challenge'), { nodes: {}, spawned: new Set() });
        // On every difficulty, the hardest shark still gives the captain time to reach the rail.
        const session = db.hazards?.get?.('shark_duty')?.sessions?.[e.session];
        for (const d of session ? DIFFICULTIES : []) {
          let cfg = null;
          try {
            cfg = challengeConfig(db, e.challenge, { kind: 'sharkDuty', id: 'check', difficulty: d });
          } catch {
            break;
          }
          const plan = new DutyPlan(session, null, { reactionScale: cfg?.mechanics.reactionScale });
          const shortest = Math.min(...(session.waves ?? [{}]).map((w) => plan.tuning(w, plan.ramp.over).window));
          if (shortest < MIN_SHARK_WINDOW_MS) ec.at('challenge').error(`[${d}] the hardest shark bites after ${shortest} ms: under ${MIN_SHARK_WINDOW_MS} ms nobody can reach the rail in time`);
        }
      }
    });
    (def.onEnter || []).forEach((e, i) => {
      if ('if' in e) c.at(`onEnter[${i}]`).condition(e.if);
      c.at(`onEnter[${i}]`).script(e.script);
    });
    model.meta.musicVariants.forEach((v, i) => {
      const vc = c.at(`musicVariants[${i}]`);
      vc.condition(v.if);
      if ('music' in v) vc.music(v.music);
      if ('ambience' in v) vc.ambience(v.ambience);
    });
    model.meta.lightingVariants.forEach((v, i) => {
      const vc = c.at(`lightingVariants[${i}]`);
      vc.condition(v.if);
      if (!model.meta.lighting) vc.error('lightingVariants need the map to have "lighting"');
    });
    model.props.forEach((p) => {
      if ('if' in p) c.at(`prop "${p.uid}"`).condition(p.if);
    });
    validateFumeZones(model, c);
    (model.meta.sharks || []).forEach((v, i) => {
      const vc = c.at(`sharks[${i}]`);
      if ('if' in v) vc.condition(v.if);
      if (!SHARK_LEVELS.includes(v.level)) vc.error(`shark level must be one of ${SHARK_LEVELS.join(', ')}`);
      if (!v.below && v.level !== 'none' && model.meta.background !== 'ocean') vc.error('fins need open water: use "below": true on a map without an ocean background');
    });
    (def.ambient || []).forEach((a, i) => {
      const ac = c.at(`ambient[${i}]`);
      if (!AMBIENT_KINDS.includes(a.kind)) ac.error(`unknown ambient kind "${a.kind}" (use: ${AMBIENT_KINDS.join(', ')})`);
      if ('if' in a) ac.condition(a.if);
      if (a.sfx) ac.sfx(a.sfx);
      if (a.kind === 'voice') (a.lines || []).forEach((l) => validateText(l, ac));
      if (a.kind === 'fumeProp') {
        if (!Array.isArray(a.sounds) || !a.sounds.length) ac.error('a fumeProp needs "sounds": [{ sfx, text }]');
        for (const snd of a.sounds ?? []) {
          if (snd.sfx) ac.sfx(snd.sfx);
          if (snd.text) validateText(snd.text, ac);
        }
        if (a.prop && !model.props.some((p) => p.uid === a.prop || p.prop === a.prop)) ac.error(`fumeProp names prop "${a.prop}", which this map does not have`);
      }
      if (a.kind === 'sailPuff' && !model.props.some((p) => p.uid === a.prop || p.prop === a.prop)) ac.error(`sailPuff names prop "${a.prop}", which this map does not have`);
      if (a.kind === 'odorTrail' && a.actor && a.actor !== 'player' && !db.npcs.has(a.actor)) ac.error(`odorTrail actor "${a.actor}" is not an NPC`);
      if (a.kind === 'odorTrail' && a.fx && !PARTICLE_BURSTS.includes(a.fx)) ac.error(`odorTrail fx "${a.fx}" is not a particle kind (${PARTICLE_BURSTS.join(', ')})`);
      if (a.tint && !/^#[0-9a-fA-F]{6}$/.test(a.tint)) ac.error('tint must be "#rrggbb"');
    });
    (model.meta.nameVariants || []).forEach((v, i) => {
      const nc = c.at(`nameVariants[${i}]`);
      nc.condition(v.if);
      if (typeof v.name !== 'string' || !v.name) nc.error('a name variant needs "if" and a "name"');
    });
    model.meta.regions.forEach((r, i) => {
      const rc = c.at(`regions[${i}]`);
      if (!r.id) rc.error('region needs an id');
      const ints = ['x', 'y', 'w', 'h'].every((k) => Number.isInteger(r[k]));
      if (!ints) rc.error('region needs integer x, y, w, h');
      else if (r.x < 0 || r.y < 0 || r.w < 1 || r.h < 1 || r.x + r.w > model.width || r.y + r.h > model.height) rc.error('region lies outside the map');
      if ('name' in r && (typeof r.name !== 'string' || !r.name)) rc.error('a region\'s "name" must be a non-empty string (its location title)');
    });
    if (model.meta.playerVehicle) {
      const base = model.meta.playerVehicle;
      for (const d of DIRECTIONS) {
        if (!ART_REGISTRY.stage.has(`${base}_${d}`)) c.error(`playerVehicle "${base}" needs a stage frame "${base}_${d}"`);
      }
    }
    const ids = new Set();
    for (const obj of model.objects) {
      const oc = c.at(`object "${obj.id}"`);
      if (!obj.id) oc.error('object needs an id');
      else if (ids.has(obj.id) && obj.type !== 'npc') oc.error('duplicate object id in map');
      ids.add(obj.id);
      if (!OBJECT_TYPES.includes(obj.type)) oc.error(`unknown object type "${obj.type}"`);
      if (!Number.isInteger(obj.x) || !Number.isInteger(obj.y) || obj.x < 0 || obj.y < 0 || obj.x >= model.width || obj.y >= model.height) {
        oc.error(`position ${obj.x},${obj.y} is outside the map`);
        continue;
      }
      if ('if' in obj) oc.condition(obj.if);
      const walkable = !isSolid(model, obj.x, obj.y);
      switch (obj.type) {
        case 'spawn':
          if (!walkable) oc.error('spawn point is on a solid tile');
          if (obj.facing && !DIRECTIONS.includes(obj.facing)) oc.error(`bad facing "${obj.facing}"`);
          break;
        case 'warp': {
          for (let j = 0; j < (obj.h || 1); j++) for (let k = 0; k < (obj.w || 1); k++) {
            if (isSolid(model, obj.x + k, obj.y + j)) oc.error(`warp tile ${obj.x + k},${obj.y + j} is solid (unreachable)`);
          }
          const to = obj.to || {};
          const target = compiled.get(to.map);
          if (!db.maps.has(to.map)) oc.error(`warp to unknown map "${to.map}"`);
          else if (target && to.spawn && !target.spawns[to.spawn]) oc.error(`map "${to.map}" has no spawn "${to.spawn}"`);
          else if (target && !to.spawn && (to.x === undefined || to.y === undefined)) oc.error('warp needs to.spawn or to.x/to.y');
          if (obj.sfx) oc.sfx(obj.sfx);
          if (obj.locked) oc.script(obj.locked);
          if ('when' in obj) oc.condition(obj.when);
          break;
        }
        case 'npc': {
          oc.npc(obj.npc);
          if (obj.absent) break;
          const rooms = db.npcs.get(obj.npc)?.rooms;
          if (Array.isArray(rooms) && !rooms.includes(id)) oc.error(`${obj.npc} may only be placed in ${rooms.join(', ')} (its "rooms"), not ${id}`);
          // Asleep in a hammock or a bedroll: on one of its tiles (a hammock may be over a crate), and keeping still.
          if (BED_POSES.includes(obj.pose)) {
            if (!bedsAt(model, obj.x, obj.y).length) oc.error(`npc posed "${obj.pose}" needs a bed under it (a prop with "bed": true at ${obj.x},${obj.y})`);
            const still = obj.behavior?.type ?? db.npcs.get(obj.npc)?.behavior?.type ?? 'stand';
            if (!['stand', 'sit'].includes(still)) oc.error(`npc posed "${obj.pose}" must stand or sit still (behavior "${still}")`);
          } else if (!walkable) oc.error('npc stands on a solid tile');
          if (obj.blocks !== undefined && typeof obj.blocks !== 'boolean') oc.error('"blocks" must be true or false');
          if (obj.behavior) validateBehavior(obj.behavior, oc.at('behavior'), model);
          else validateBehavior(db.npcs.get(obj.npc)?.behavior, oc.at('behavior'), model);
          break;
        }
        case 'enemy':
          oc.encounter(obj.encounter);
          if (!walkable) oc.error('enemy placed on a solid tile');
          if (!art.enemies.has(obj.sprite ?? db.encounters.get(obj.encounter)?.enemies?.[0])) oc.error('enemy object has no field sprite');
          break;
        case 'inspect':
          if (obj.script) oc.script(obj.script);
          else if (obj.text) asArray(obj.text).forEach((line) => validateLine(line, oc));
          else if (obj.dialogue) validateDialogueSelectors(obj.dialogue, oc);
          else oc.error('inspect object needs "text", "script" or "dialogue"');
          break;
        case 'chest':
          (obj.items || []).forEach((it) => oc.item(it.id));
          if (obj.prop) oc.prop(obj.prop);
          break;
        case 'trigger':
          oc.script(obj.script);
          break;
        default:
          break;
      }
    }
  }

  // Quests
  for (const q of db.quests.list()) {
    const c = C(`${db.quests.sourceOf(q.id)} (${q.id})`);
    if (typeof q.title !== 'string') c.error('quest needs a title');
    if (!Array.isArray(q.objectives) || q.objectives.length === 0) {
      c.error('quest needs objectives');
      continue;
    }
    const oids = new Set();
    for (const o of q.objectives) {
      const oc = c.at(`objective "${o.id}"`);
      if (oids.has(o.id)) oc.error('duplicate objective id');
      oids.add(o.id);
      if (!OBJECTIVE_TYPES.includes(o.type)) oc.error(`unknown objective type "${o.type}"`);
      if (typeof o.text !== 'string') oc.error('objective needs text');
      switch (o.type) {
        case 'talk': oc.npc(o.target); break;
        case 'inspect':
          if (o.tag) break;
          if (typeof o.target !== 'string' || !o.target.includes(':')) oc.error('inspect target must be "map:object" (or use "tag")');
          else {
            const [mapId, objId] = o.target.split(':');
            const m = compiled.get(mapId);
            if (!m) oc.error(`inspect target map "${mapId}" unknown`);
            else if (!m.objects.some((ob) => ob.id === objId)) oc.error(`map "${mapId}" has no object "${objId}"`);
          }
          break;
        case 'visit':
          if (!db.maps.has(o.target) && ![...compiled.values()].some((m) => m.meta.regions.some((r) => r.id === o.target))) oc.error(`visit target "${o.target}" is not a map or region`);
          break;
        case 'defeat':
          if (o.objects) {
            // Map enemies counted from saved world state ("map:object").
            if (!Array.isArray(o.objects) || o.objects.length === 0) oc.error('"objects" must be a non-empty list of "map:object" enemies');
            else {
              for (const ref of o.objects) {
                const [mapId, objId] = String(ref).split(':');
                const m = compiled.get(mapId);
                const obj = m?.objects.find((x) => x.id === objId);
                if (!m) oc.error(`defeat object "${ref}": unknown map "${mapId}"`);
                else if (!obj || obj.type !== 'enemy') oc.error(`defeat object "${ref}" is not an enemy on map "${mapId}"`);
              }
              if ((o.count ?? o.objects.length) > o.objects.length) oc.error('count is larger than the number of listed enemies');
            }
          } else if (o.enemy) oc.enemy(o.enemy);
          else if (o.tag) { if (!encounterTags.has(o.tag)) oc.error(`no encounter has tag "${o.tag}"`); }
          else oc.encounter(o.target);
          break;
        case 'obtain': oc.item(o.item); break;
        case 'flag': oc.flag(o.target); break;
        default: break;
      }
    }
    for (const o of q.objectives) for (const pre of asArray(o.after)) if (!oids.has(pre)) c.error(`objective "${o.id}" waits for unknown objective "${pre}"`);
    // cycle check
    const visiting = new Set();
    const done = new Set();
    const byId = Object.fromEntries(q.objectives.map((o) => [o.id, o]));
    const visit = (id) => {
      if (done.has(id)) return;
      if (visiting.has(id)) {
        c.error(`objective prerequisites form a cycle at "${id}"`);
        return;
      }
      visiting.add(id);
      asArray(byId[id]?.after).forEach(visit);
      visiting.delete(id);
      done.add(id);
    };
    q.objectives.forEach((o) => visit(o.id));
    const r = q.rewards || {};
    (r.items || []).forEach((it) => c.item(it.id));
    (r.flags || []).forEach((f) => c.flag(f));
    if (q.onComplete) c.script(q.onComplete);
  }

  for (const [id, script] of db.scripts.map) validateScript(id, script, C(`${db.scripts.sourceOf(id)} (${id})`));

  for (const [id, song] of db.music.map) {
    const c = C(`${db.music.sourceOf(id)} (${id})`);
    if (!song.channels || !song.patterns || !Array.isArray(song.sequence)) c.error('song needs channels, patterns and sequence');
    for (const pat of song.sequence || []) if (!song.patterns?.[pat]) c.error(`sequence references unknown pattern "${pat}"`);
    for (const ch of Object.values(song.channels || {})) if (!db.instruments.has(ch.instrument)) c.error(`unknown instrument "${ch.instrument}"`);
  }

  for (const t of db.storyTriggers.list()) {
    const c = C(`${db.storyTriggers.sourceOf(t.id)} (${t.id})`);
    if (!('if' in t)) c.error('story trigger needs "if"');
    else c.condition(t.if);
    c.script(t.script);
  }

  for (const [id, v] of db.vistas.map) {
    const c = C(`${db.vistas.sourceOf(id)} (${id})`);
    if (v.sky && !art.vistaSkies.has(v.sky)) c.error(`unknown vista sky "${v.sky}"`);
    if (v.dock !== undefined && v.dock !== 'top' && v.dock !== 'bottom') c.error('vista "dock" is "top" or "bottom"');
    const ids = new Set();
    (v.layers || []).forEach((l, i) => {
      const lc = c.at(`layers[${i}]`);
      if (!l.id) lc.error('vista layer needs an id');
      else if (ids.has(l.id)) lc.error(`duplicate layer id "${l.id}"`);
      ids.add(l.id);
      if (l.school) {
        // A crowd layer: frames, a count and an area to scatter them over.
        const sc = l.school;
        if (!Array.isArray(sc.frames) || !sc.frames.length) lc.error('school needs "frames"');
        else sc.frames.forEach((f) => { if (!art.vista.has(f)) lc.error(`no vista art "${f}"`); });
        if (!Number.isInteger(sc.count) || sc.count < 1 || sc.count > 400) lc.error('school "count" must be 1-400');
        if (sc.area && !(Array.isArray(sc.area) && sc.area.length === 4)) lc.error('school "area" is [x, y, w, h]');
        return;
      }
      if (l.orbit) {
        // Story Phase 6: a column of copies circling (the Great Sharkstorm).
        const o = l.orbit;
        if (!Array.isArray(o.frames) || !o.frames.length) lc.error('orbit needs "frames"');
        else o.frames.forEach((f) => { if (!art.vista.has(f)) lc.error(`no vista art "${f}"`); });
        if (!Number.isInteger(o.count) || o.count < 1 || o.count > 400) lc.error('orbit "count" must be 1-400');
        return;
      }
      if (!art.vista.has(l.frame)) lc.error(`no vista art "${l.frame}"`);
      (l.frames || []).forEach((f) => { if (!art.vista.has(f)) lc.error(`no vista art "${f}"`); });
    });
  }

  checkVistaCommands(db, art, C);

  // Televisions (the Stenchmaster Entertainment System)
  for (const [id, tv] of db.tv?.map ?? []) {
    const c = C(`${db.tv.sourceOf(id)} (${id})`);
    if (typeof tv.name !== 'string') c.error('television needs a name');
    for (const key of ['open', 'wiring', 'power', 'slap']) if (tv.flags?.[key]) c.flag(tv.flags[key]);
    const looks = (v, where) => {
      if (v === undefined) return;
      const lists = Array.isArray(v) && Array.isArray(v[0]) ? v : [v];
      lists.forEach((list, i) => (Array.isArray(list) ? list : []).forEach((l) => validateLine(l, c.at(`${where}[${i}]`))));
    };
    const ids = new Set();
    if (!Array.isArray(tv.channels) || !tv.channels.length) c.error('television needs "channels"');
    (tv.channels || []).forEach((ch, i) => {
      const cc = c.at(`channels[${i}]`);
      if (!Number.isInteger(ch.id)) cc.error('channel needs an integer "id"');
      else if (ids.has(ch.id)) cc.error(`duplicate channel ${ch.id}`);
      ids.add(ch.id);
      if (!Array.isArray(ch.frames) || !ch.frames.length) cc.error('channel needs "frames"');
      (ch.frames || []).forEach((f) => { if (!art.vista.has(f)) cc.error(`no vista art "${f}"`); });
      if (ch.hum && !db.sfx.has(ch.hum)) cc.error(`unknown sfx "${ch.hum}"`);
      if ('if' in ch) cc.condition(ch.if);
      looks(ch.comments, `channels[${i}].comments`);
    });
    looks(tv.offComments, 'offComments');
    looks(tv.wiring, 'wiring');
    looks(tv.powerSource, 'powerSource');
    looks(tv.slap, 'slap');
    looks(tv.failures?.lines, 'failures.lines');
    for (const k of tv.failures?.kinds ?? []) if (!['roll', 'spark', 'buzz', 'smoke'].includes(k)) c.error(`unknown failure "${k}"`);
    for (const f of ['ses_bezel', 'ses_back', 'ses_power_source', 'tv_off', 'tv_scan', 'tv_glare', 'tv_smoke', 'tv_spark_0']) if (!art.vista.has(f)) c.error(`no vista art "${f}"`);
    // Story Phase 7: a set can wear its own art (S.E.S. Mark II)
    for (const k of ['bezel', 'back', 'powerFrame']) if (tv[k] && !art.vista.has(tv[k])) c.error(`no vista art "${tv[k]}" (${k})`);
    (tv.channels || []).forEach((ch, i) => {
      if (ch.program && !db.tvPrograms?.has?.(ch.program)) c.at(`channels[${i}]`).error(`unknown programme "${ch.program}"`);
    });
    // Story Phase 13: Stench-O-Vision. The vent's tiles name real maps; its sound exists.
    if (tv.vent) {
      const vc = c.at('vent');
      if (tv.vent.sfx && !db.sfx.has(tv.vent.sfx)) vc.error(`unknown sfx "${tv.vent.sfx}"`);
      if ('if' in tv.vent) vc.condition(tv.vent.if);
      for (const [m, at] of Object.entries(tv.vent.tiles ?? {})) {
        vc.map(m);
        if (!Array.isArray(at) || at.length !== 2) vc.error(`vent.tiles.${m} must be [x, y]`);
      }
    }
    // Story Phase 6: conditions, the knob panel
    for (const [sid, st] of Object.entries(tv.states ?? {})) {
      const sc = c.at(`states.${sid}`);
      for (const f of [st.bezel, st.back, st.glass, ...(st.flicker?.frames ?? []), ...(st.frames ?? [])]) if (f && !art.vista.has(f)) sc.error(`no vista art "${f}"`);
      if (st.frames !== undefined && (!Array.isArray(st.frames) || !st.frames.length)) sc.error('"frames" must be a non-empty list of vista frames');
      if (st.flicker?.sfx && !db.sfx.has(st.flicker.sfx)) sc.error(`unknown sfx "${st.flicker.sfx}"`);
      looks(st.lookComments, `states.${sid}.lookComments`);
      looks(st.flicker?.lines, `states.${sid}.flicker.lines`);
    }
    // The knob panel, and (Story Phase 10) any further named panels ("knobPanels").
    const panels = [...(tv.knobs ? [['knobs', tv.knobs]] : []), ...Object.entries(tv.knobPanels ?? {}).map(([pid, kp]) => [`knobPanels.${pid}`, kp])];
    for (const [where, knobs] of panels) {
      const EFFECTS = ['louder', 'flip', 'tint', 'slow', 'shrink', 'frog', 'noop', 'off', 'roll', 'shriek', 'tune', 'glimpse', 'stretch', 'mute'];
      const list = knobs.list ?? [];
      // An ending knob that waits ("after") is still reachable if some knob is there from the start (knobs turn as often as you like).
      const ends = list.filter((k) => k.effect === 'off' || k.effect === 'tune');
      if (!ends.some((k) => !k.after || list.some((o) => !o.after))) {
        c.error(`${where}: the knob panel needs a knob with "effect": "off" or "tune" it can reach (or it could never be finished)`);
      }
      if (knobs.doneFlag) c.flag(knobs.doneFlag);
      looks(knobs.openLines, `${where}.openLines`);
      list.forEach((k, i) => {
        const kc = c.at(`${where}.list[${i}]`);
        if (k.effect === 'glimpse') for (const f of k.frames ?? []) if (!art.vista.has(f)) kc.error(`no vista art "${f}" (glimpse)`);
        if (k.after !== undefined && (!Number.isInteger(k.after) || k.after < 1)) kc.error('"after" is how many other turns first (a whole number, 1 or more)');
        if (!k.id || !k.label) kc.error('a knob needs an id and a label');
        if (!EFFECTS.includes(k.effect)) kc.error(`unknown knob effect "${k.effect}" (${EFFECTS.join(', ')})`);
        if (k.sfx && !db.sfx.has(k.sfx)) kc.error(`unknown sfx "${k.sfx}"`);
        if (k.doneSfx && !db.sfx.has(k.doneSfx)) kc.error(`unknown sfx "${k.doneSfx}"`);
        if (k.effect === 'tune' && k.channel !== undefined && !ids.has(k.channel)) kc.error(`a "tune" knob names channel ${k.channel}, which the set doesn't have`);
        looks(k.lines, `${where}.list[${i}].lines`);
        looks(k.doneLines, `${where}.list[${i}].doneLines`);
      });
    }
  }

  // The Great Sharkstorm's states (Story Phase 6; flying-shark shapes and below-decks thuds from Phase 7)
  {
    const states = sharkstormStates(db);
    for (const [sid, st] of Object.entries(states)) {
      const c = C(`data/hazards/sharkstorm.json (great_sharkstorm.states.${sid})`);
      // Story Phase 17: a temporary flare must burn itself out
      if (st.temporary && !(Number.isInteger(st.temporary.expiresAfterRooms) && st.temporary.expiresAfterRooms >= 1 && st.temporary.expiresAfterRooms <= 12)) c.error('temporary.expiresAfterRooms must be 1..12');
      for (const v of st.flying?.variants ?? []) for (const f of [`${v}_0`, `${v}_1`]) if (!art.stage.has(f)) c.error(`no stage art "${f}" (flying.variants)`);
      if (st.rumble?.sfx && !db.sfx.has(st.rumble.sfx)) c.error(`unknown sfx "${st.rumble.sfx}"`);
      if (st.below) {
        for (const m of st.below.maps ?? []) c.map(m);
        for (const f of st.below.sfx ?? []) if (!db.sfx.has(f)) c.error(`unknown sfx "${f}" (below)`);
      }
      for (const m of st.maps ?? []) c.map(m);
      // Story Phase 10: the Bling Bling King's prizes, and the gentle drift once the ship is inside
      if (st.tokens) {
        const t = st.tokens;
        if (!Array.isArray(t.frames) || !t.frames.length) c.error('tokens need "frames"');
        for (const f of t.frames ?? []) if (!art.stage.has(f) && !art.props.has(f)) c.error(`no stage/prop art "${f}" (tokens.frames)`);
        for (const m of t.maps ?? []) c.map(m);
        if (t.sfx && !db.sfx.has(t.sfx)) c.error(`unknown sfx "${t.sfx}" (tokens)`);
        if (t.max !== undefined && (!Number.isInteger(t.max) || t.max < 1 || t.max > 8)) c.error('tokens.max must be 1..8 (they are scenery, not clutter)');
        if (!Array.isArray(t.every) || t.every.length !== 2 || t.every[0] < 3000) c.error('tokens.every must be [min, max] ms, at least 3000');
      }
      if (st.sway) {
        for (const m of st.sway.maps ?? []) c.map(m);
        if ((st.sway.drift ?? 1.5) > 3) c.error('sway.drift must be 3 px or less (a gentle drift, never seasickness)');
        if ((st.sway.period ?? 5200) < 3000) c.error('sway.period must be at least 3000 ms');
      }
    }
  }

  // Television programmes (Story Phase 6: The Frog Tax Man)
  for (const [id, prog] of db.tvPrograms?.map ?? []) {
    const c = C(`${db.tvPrograms.sourceOf(id)} (${id})`);
    if (typeof prog.title !== 'string') c.error('programme needs a title');
    if (prog.laugh && !db.sfx.has(prog.laugh)) c.error(`unknown sfx "${prog.laugh}"`);
    for (const f of prog.closeup ?? []) if (!art.vista.has(f)) c.error(`no vista art "${f}"`);
    if (!Array.isArray(prog.episodes) || !prog.episodes.length) c.error('programme needs episodes');
    const seen = new Set();
    (prog.episodes ?? []).forEach((ep, i) => {
      const ec = c.at(`episodes[${i}]`);
      if (!ep.id || seen.has(ep.id)) ec.error('episode needs a unique id');
      seen.add(ep.id);
      if ('if' in ep) ec.condition(ep.if);
      if (!Array.isArray(ep.beats) || !ep.beats.length) ec.error('episode needs beats');
      (ep.beats ?? []).forEach((b, j) => {
        const bc = ec.at(`beats[${j}]`);
        for (const f of b.frames ?? []) if (!art.vista.has(f)) bc.error(`no vista art "${f}"`);
        if (b.sfx && !db.sfx.has(b.sfx)) bc.error(`unknown sfx "${b.sfx}"`);
        if (b.line) validateLine(b.line, bc);
        if (b.crt !== undefined && !['wobble', 'jitter', 'roll'].includes(b.crt)) bc.error('crt must be wobble, jitter or roll');
      });
    });
  }

  // Logbooks (the Stench Log)
  for (const [id, log] of db.logs.map) {
    const c = C(`${db.logs.sourceOf(id)} (${id})`);
    if (typeof log.title !== 'string') c.error('log needs a title');
    if ('if' in log) c.condition(log.if);
    if (log.keeper) c.npc(log.keeper);
    if (log.icon && !art.icons.has(log.icon)) c.error(`unknown icon "${log.icon}"`);
    if (!Array.isArray(log.fields) || !log.fields.length) c.error('log needs "fields": [{ id, label }]');
    const fieldIds = new Set((log.fields || []).map((f) => f.id));
    const scaled = new Set((log.fields || []).filter((f) => f.id === 'severity' || f.scale).map((f) => f.id));
    const ids = new Set();
    (log.entries || []).forEach((e, i) => {
      const ec = c.at(`entries[${i}]`);
      if (!e.id) ec.error('log entry needs an id');
      else if (ids.has(e.id)) ec.error(`duplicate log entry "${e.id}"`);
      ids.add(e.id);
      if (typeof e.title !== 'string') ec.error('log entry needs a title');
      if ('if' in e) ec.condition(e.if);
      const texts = [e, ...(e.variants || [])];
      for (const t of texts) {
        for (const [k, v] of Object.entries(t)) {
          if (['id', 'title', 'if', 'variants'].includes(k) || isCommentKey(k)) continue;
          // An entry can carry a picture to look at (a crayon forecast map).
          if (k === 'insert') {
            if (!art.inserts.has(v)) ec.error(`no insert art "${v}"`);
            continue;
          }
          if (k === 'caption') {
            validateText(v, ec);
            continue;
          }
          if (!fieldIds.has(k)) ec.error(`unknown log field "${k}" (fields: ${[...fieldIds].join(', ')})`);
          else if (typeof v === 'string') validateText(v, ec);
          if (scaled.has(k) && log.severities && !(v in log.severities)) ec.error(`${k} "${v}" is not one of ${Object.keys(log.severities).join(', ')}`);
        }
      }
      (e.variants || []).forEach((v, j) => {
        if (!('if' in v)) ec.at(`variants[${j}]`).error('variant needs "if"');
        else ec.at(`variants[${j}]`).condition(v.if);
      });
    });
  }

  for (const pr of db.debugPresets.list()) {
    const c = C(`${db.debugPresets.sourceOf(pr.id)} (${pr.id})`);
    if (typeof pr.name !== 'string') c.error('preset needs a name');
    (pr.flags || []).forEach((f) => c.flag(f));
    (pr.clearFlags || []).forEach((f) => c.flag(f));
    for (const [q, st] of Object.entries(pr.quests || {})) {
      c.quest(q);
      const quest = db.quests.get(q);
      if (typeof st === 'object' && quest) {
        (st.done || []).forEach((o) => c.objective(`${q}.${o}`));
        for (const [o, n] of Object.entries(st.progress || {})) {
          c.objective(`${q}.${o}`);
          const count = quest.objectives?.find((x) => x.id === o)?.count ?? 1;
          if (!Number.isInteger(n) || n < 1 || n >= count) c.error(`progress for "${q}.${o}" must be a whole number from 1 to ${count - 1}`);
        }
      } else if (!['active', 'completed'].includes(st)) c.error(`quest state for "${q}" must be "active", "completed" or { done: [...], progress: {...} }`);
    }
    (pr.items || []).forEach((it) => c.item(typeof it === 'string' ? it : it.id));
    (pr.takeItems || []).forEach((it) => c.item(it));
    if (pr.gold !== undefined && !(Number.isInteger(pr.gold) && pr.gold >= 0)) c.error('"gold" must be a whole number of doubloons');
    for (const m of pr.party || []) {
      const id = typeof m === 'string' ? m : m?.id;
      if (!db.characters.get(id)) c.error(`party member "${id}" is not a character`);
      for (const a of (typeof m === 'object' && m?.learn) || []) if (!db.abilities.get(a)) c.error(`party member "${id}" learns unknown ability "${a}"`);
    }
    c.map(pr.map);
    const m = compiled.get(pr.map);
    if (m && pr.spawn && !m.spawns[pr.spawn]) c.error(`map "${pr.map}" has no spawn "${pr.spawn}"`);
    if (pr.script) c.script(pr.script);
    if (pr.after) c.ref('debug preset', pr.after, db.debugPresets);
  }

  const engine = C('src/config/engineFlags.js');
  for (const flag of Object.values(ENGINE_FLAGS)) engine.flag(flag);
  for (const f of db.flags.list()) {
    if (!ctx.usedFlags.has(f.id)) ctx.warnings.push(`${db.flags.sourceOf(f.id)}: flag "${f.id}" is declared but never referenced`);
  }

  return { errors: ctx.errors, warnings: ctx.warnings };
}

/**
 * Vista layer commands (vistaMove, vistaFrame, vistaShow, vistaSpin, and a
 * programme played onto a vista's screen) must name a layer of the vista
 * that is up: the cinema throws on a missing one. Each script is followed
 * from its first step with the vista its own "vista" commands put up (and
 * into the scripts it calls); where no vista is known yet (a script called
 * from elsewhere), the layer must at least exist in some vista. A debug
 * preset's script starts with nothing up (a preset that drops into the middle
 * of a scene puts its vista back up first). vistaFrame's frame must be vista
 * art.
 */
function checkVistaCommands(db, art, C) {
  const layersOf = new Map([...db.vistas.map].map(([id, v]) => [id, new Set((v.layers || []).map((l) => l.id))]));
  const anyLayer = new Set([...layersOf.values()].flatMap((ids) => [...ids]));
  const NONE = '(none)';
  const seen = new Set();
  const checkLayer = (layer, vista, cmd, c) => {
    if (vista === NONE) c.error(`${cmd} "${layer}" with no vista up`);
    else if (vista) {
      if (!layersOf.get(vista)?.has(layer)) c.error(`${cmd}: vista "${vista}" has no layer "${layer}"`);
    } else if (!anyLayer.has(layer)) c.error(`${cmd}: no vista has a layer "${layer}"`);
  };
  const run = (steps, vista, c, sid) => {
    if (!Array.isArray(steps)) return vista;
    steps.forEach((step, i) => {
      if (!isPlainObject(step)) return;
      const sc = c.at(`#${i}`);
      if (typeof step.vista === 'string') vista = step.vista;
      if (step.vistaEnd) vista = NONE;
      for (const cmd of ['vistaMove', 'vistaFrame', 'vistaShow', 'vistaSpin']) if (typeof step[cmd] === 'string') checkLayer(step[cmd], vista, cmd, sc);
      if (typeof step.tvProgram === 'string' && vista && vista !== NONE) checkLayer(step.layer ?? 'screen', vista, 'tvProgram', sc);
      // A channel episode always plays in a vista's screen layer (Story Phase 15).
      if (typeof step.channelEpisode === 'string' && vista) checkLayer(step.layer ?? 'screen', vista, 'channelEpisode', sc);
      if (typeof step.vistaFrame === 'string' && typeof step.frame === 'string' && !art.vista.has(step.frame)) sc.error(`no vista art "${step.frame}"`);
      if (typeof step.call === 'string') walk(step.call, vista, sid);
      // A branch that puts a vista up (or takes it down) leaves it unknown afterwards.
      const after = [];
      for (const k of ['then', 'else', 'steps']) if (Array.isArray(step[k])) after.push(run(step[k], vista, sc.at(k), sid));
      if (Array.isArray(step.parallel)) step.parallel.forEach((b, j) => after.push(run(b, vista, sc.at(`parallel[${j}]`), sid)));
      if (Array.isArray(step.choice)) step.choice.forEach((o, j) => after.push(run(o?.then, vista, sc.at(`choice[${j}]`), sid)));
      if (after.some((v) => v !== vista)) vista = null;
    });
    return vista;
  };
  const walk = (sid, vista, from = null) => {
    const key = `${sid}@${vista ?? ''}`;
    if (seen.has(key) || !db.scripts.has(sid)) return;
    seen.add(key);
    let nodes;
    try {
      nodes = normalizeScript(db.scripts.get(sid));
    } catch {
      return;
    }
    const up = vista === NONE ? 'no vista up' : `vista "${vista}" up`;
    const c = C(`${db.scripts.sourceOf?.(sid) ?? 'scripts'} (${sid}${vista ? `, from ${from} with ${up}` : ''})`);
    for (const [label, steps] of Object.entries(nodes)) run(steps, vista, c.at(label), sid);
  };
  for (const id of db.scripts.map.keys()) walk(id, null);
  for (const pr of db.debugPresets.list()) if (typeof pr.script === 'string') walk(pr.script, NONE, `debug preset "${pr.id}"`);
}
