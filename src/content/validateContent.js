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
    else if (kind === 'var') continue;
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
  if (name === 'repair' && step.strikes !== undefined && (step.strikes < 1 || step.strikes > 8)) check.error('repair strikes must be 1..8');
  if (name === 'swapItem' && step.swapItem === step.to) check.error('swapItem needs two different items');
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
const AMBIENT_KINDS = ['wake', 'gulls', 'smoke', 'perchedGull', 'sailShadow', 'glitter', 'voice', 'rain', 'sailPuff', 'ratPeek', 'odorTrail', 'fins'];
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
    if (item.type === 'equipment') {
      if (!EQUIPMENT_SLOTS.includes(item.slot)) c.error(`equipment slot must be one of ${EQUIPMENT_SLOTS.join(', ')}`);
      validateStats(item.stats || {}, c, { required: false });
      (item.equipBy || []).forEach((id) => c.character(id));
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
    validateVariants(ch.variants, c);
  }

  for (const st of db.statuses.list()) {
    const c = C(`${db.statuses.sourceOf(st.id)} (${st.id})`);
    if (!['buff', 'debuff'].includes(st.kind)) c.error('status kind must be buff or debuff');
    for (const k of Object.keys(st.modifiers || {})) if (!STAT_KEYS.includes(k) && k !== 'damageTaken') c.error(`unknown modifier "${k}"`);
    if (st.expires && st.expires !== 'turnStart') c.error('expires may only be "turnStart"');
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
          break;
        }
        case 'npc':
          oc.npc(obj.npc);
          if (obj.absent) break;
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
      const EFFECTS = ['louder', 'flip', 'tint', 'slow', 'shrink', 'frog', 'noop', 'off', 'roll', 'shriek', 'tune', 'glimpse'];
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
      if (typeof st === 'object' && quest) (st.done || []).forEach((o) => c.objective(`${q}.${o}`));
      else if (!['active', 'completed'].includes(st)) c.error(`quest state for "${q}" must be "active", "completed" or { done: [...] }`);
    }
    (pr.items || []).forEach((it) => c.item(typeof it === 'string' ? it : it.id));
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
