import { Registry } from './Registry.js';
import { Progression } from '../systems/party/progression.js';

/**
 * All game content, indexed and ready to query.
 *
 * Built from a { "/data/path/file.json": parsedJson } map, so the same code
 * runs in the browser (Vite glob import), in Vitest and in Node tools.
 * The folder a file lives in decides what it contains — adding
 * data/dialogue/chapter8/*.json requires no code changes anywhere.
 */

/** Folder rules: first matching prefix wins. `shape` says how the file is laid out. */
const FOLDER_RULES = [
  { prefix: 'characters/speakers', kind: 'extraSpeakers', shape: 'list' },
  { prefix: 'characters/', kind: 'characters', shape: 'list' },
  { prefix: 'npcs/', kind: 'npcs', shape: 'list' },
  { prefix: 'enemies/', kind: 'enemies', shape: 'list' },
  { prefix: 'abilities/', kind: 'abilities', shape: 'list' },
  { prefix: 'statuses/', kind: 'statuses', shape: 'list' },
  { prefix: 'items/', kind: 'items', shape: 'list' },
  { prefix: 'shops/', kind: 'shops', shape: 'list' },
  { prefix: 'quests/', kind: 'quests', shape: 'list' },
  { prefix: 'encounters/', kind: 'encounters', shape: 'list' },
  { prefix: 'props/', kind: 'props', shape: 'list' },
  { prefix: 'appearances/', kind: 'appearances', shape: 'list' },
  { prefix: 'portraits/', kind: 'portraits', shape: 'list' },
  { prefix: 'dialogue/', kind: 'scripts', shape: 'map' },
  { prefix: 'story/cutscenes/', kind: 'scripts', shape: 'map' },
  { prefix: 'story/flags/', kind: 'flags', shape: 'flags' },
  { prefix: 'maps/', kind: 'maps', shape: 'single' },
  { prefix: 'tilesets/', kind: 'tilesets', shape: 'single' },
  { prefix: 'audio/music/', kind: 'music', shape: 'single' },
  { prefix: 'audio/sfx', kind: 'sfx', shape: 'map' },
  { prefix: 'audio/instruments', kind: 'instruments', shape: 'map' },
  { prefix: 'audio/ambience', kind: 'ambience', shape: 'map' },
  { prefix: 'battle/timing', kind: 'timing', shape: 'map' },
  { prefix: 'battle/backdrops', kind: 'backdrops', shape: 'list' },
  { prefix: 'story/vistas/', kind: 'vistas', shape: 'map' },
  { prefix: 'story/triggers/', kind: 'storyTriggers', shape: 'list' },
  { prefix: 'story/tension/', kind: 'tension', shape: 'map' },
  { prefix: 'story/dice/', kind: 'dice', shape: 'map' },
  { prefix: 'story/aliases/', kind: 'aliases', shape: 'map' },
  // Story Phase 14: Brogath's stability (and any later subject's), the Grand Bank and its depositors.
  { prefix: 'story/stability/', kind: 'stability', shape: 'map' },
  { prefix: 'story/bank/customers', kind: 'bankCustomers', shape: 'map' },
  { prefix: 'story/bank/', kind: 'banks', shape: 'map' },
  { prefix: 'hazards/', kind: 'hazards', shape: 'map' },
  { prefix: 'debug/', kind: 'debugPresets', shape: 'list' },
  { prefix: 'logs/', kind: 'logs', shape: 'map' },
  { prefix: 'tv/programs/', kind: 'tvPrograms', shape: 'map' },
  { prefix: 'tv/', kind: 'tv', shape: 'map' },
];

/**
 * Chapters extend earlier content without editing it:
 *   - a map file with "patch": "<mapId>" adds objects (checked before the
 *     base map's, so a conditional placement can override an older one),
 *     props, onEnter scripts, regions, ambient life, fume zones, lights and
 *     music/lighting variants to that map;
 *   - an NPC or character record with "extend": "<id>" puts its dialogue
 *     selectors ahead of the original ones and adds look variants.
 */
const MAP_PATCH_PREPEND = ['objects', 'musicVariants', 'lightingVariants', 'nameVariants', 'backgroundVariants', 'haze', 'sharks', 'sharkDuty'];
const MAP_PATCH_APPEND = ['props', 'onEnter', 'regions', 'ambient', 'fumes', 'collision', 'decor'];
/** A later chapter can retire an earlier chapter's prop, fume zone or ambient entry by id (its "if" gains the extra one). */
const MAP_PATCH_CONDITIONS = [['propConditions', 'props', 'prop'], ['fumeConditions', 'fumes', 'fume zone'], ['ambientConditions', 'ambient', 'ambient entry']];

/**
 * Story Phase 13: decor slots. A map (or patch) lists { value, prop, spots }:
 * the story value names which spot the piece stands in (the player chose
 * it, so it's saved like any other value), and each spot becomes an ordinary
 * conditional prop, with an inspect object on it when the slot has a
 * script. Unset: the first spot, unless the slot says "default": null.
 *
 *   "decor": [{ "value": "standee_brogath", "prop": "standee_brogath", "if": { "flag": "standees_out" },
 *               "inspect": "p13.inspect.standee_brogath",
 *               "spots": { "porthole": [3, 4], "door": { "x": 9, "y": 4, "flip": true } } }]
 */
export function expandDecor(decor = []) {
  const props = [];
  const objects = [];
  for (const slot of decor) {
    const spots = Object.entries(slot.spots ?? {});
    const fallback = slot.default === undefined ? spots[0]?.[0] : slot.default;
    for (const [spot, at] of spots) {
      const [x, y] = Array.isArray(at) ? at : [at.x, at.y];
      const chosen = { value: { name: slot.value, eq: spot } };
      const here = spot === fallback ? { any: [chosen, { value: { name: slot.value, set: false } }] } : chosen;
      const cond = slot.if ? { all: [slot.if, here] } : here;
      const prop = { prop: slot.prop, x, y, if: cond, id: `decor_${slot.value}_${spot}` };
      if (!Array.isArray(at) && at.flip) prop.flip = true;
      if (!Array.isArray(at) && at.frame) prop.frame = at.frame;
      props.push(prop);
      if (slot.inspect) objects.push({ id: `decor_${slot.value}_${spot}`, type: 'inspect', x, y, if: cond, script: slot.inspect });
    }
  }
  return { props, objects };
}

const SINGLE_FILES = {
  'game.json': 'game',
  'progression/leveling.json': 'leveling',
};

export const REGISTRY_KINDS = [
  'characters', 'extraSpeakers', 'npcs', 'enemies', 'abilities', 'statuses', 'items', 'shops', 'quests',
  'encounters', 'props', 'appearances', 'portraits', 'scripts', 'flags', 'maps', 'tilesets', 'music',
  'sfx', 'instruments', 'ambience', 'timing', 'backdrops', 'vistas', 'storyTriggers', 'hazards', 'debugPresets',
  'mapPatches', 'logs', 'tv', 'tvPrograms', 'tension', 'dice', 'aliases', 'stability', 'bankCustomers', 'banks',
];

/** Content paths in load order: numbers compare as numbers ("phase9" before "phase10"). */
const byPath = (a, b) => a.localeCompare(b, 'en', { numeric: true });

function relativePath(path) {
  const idx = path.indexOf('data/');
  return idx >= 0 ? path.slice(idx + 5) : path;
}

export class ContentDB {
  constructor(files) {
    for (const kind of REGISTRY_KINDS) this[kind] = new Registry(kind);
    this.game = null;
    this.leveling = null;
    this.loadErrors = [];
    this.extensions = []; // { kind: 'npcs'|'characters', rec, source }
    this.files = Object.keys(files).map(relativePath).sort(byPath);

    // Numeric-aware: "phase10" loads after "phase9", so a later phase's
    // patches and extensions go on top of the earlier ones (Story Phase 10).
    for (const [path, json] of Object.entries(files).sort(([a], [b]) => byPath(a, b))) {
      this.ingest(relativePath(path), json);
    }
    this.applyExtensions();

    for (const kind of REGISTRY_KINDS) this.loadErrors.push(...this[kind].duplicates);
    if (!this.game) this.loadErrors.push('data/game.json is missing');
    if (!this.leveling) this.loadErrors.push('data/progression/leveling.json is missing');

    this.progression = this.leveling ? new Progression(this.leveling) : null;
    this.flagIds = new Set(this.flags.ids());
    this.buildSpeakers();
  }

  ingest(rel, json) {
    if (SINGLE_FILES[rel]) {
      this[SINGLE_FILES[rel]] = json;
      return;
    }
    const rule = FOLDER_RULES.find((r) => rel.startsWith(r.prefix));
    if (!rule) {
      this.loadErrors.push(`data/${rel}: file is not in a recognised content folder`);
      return;
    }
    let registry = this[rule.kind];
    const source = `data/${rel}`;
    switch (rule.shape) {
      case 'list': {
        if (!Array.isArray(json)) {
          this.loadErrors.push(`${source}: expected a JSON array of records`);
          return;
        }
        json.forEach((rec, i) => {
          if (rec && typeof rec.extend === 'string' && (rule.kind === 'npcs' || rule.kind === 'characters')) {
            this.extensions.push({ kind: rule.kind, rec, source: `${source}[${i}]` });
          } else registry.add(rec?.id, rec, `${source}[${i}]`);
        });
        break;
      }
      case 'map': {
        if (!json || typeof json !== 'object' || Array.isArray(json)) {
          this.loadErrors.push(`${source}: expected a JSON object of { id: definition }`);
          return;
        }
        for (const [id, rec] of Object.entries(json)) {
          if (id.startsWith('//') || id.startsWith('_')) continue; // comment keys
          // Story Phase 10: a later logbook record can extend an earlier one ("extend": "<id>").
          if (rule.kind === 'logs' && rec && typeof rec.extend === 'string') this.extensions.push({ kind: 'logs', rec, source: `${source} (${id})` });
          else registry.add(id, rec, source);
        }
        break;
      }
      case 'single': {
        if (rule.kind === 'maps' && json && typeof json.patch === 'string') registry = this.mapPatches;
        registry.add(json?.id, json, source);
        break;
      }
      case 'flags': {
        if (!Array.isArray(json)) {
          this.loadErrors.push(`${source}: expected an array of flags`);
          return;
        }
        json.forEach((f, i) => {
          const rec = typeof f === 'string' ? { id: f, description: '' } : f;
          registry.add(rec?.id, rec, `${source}[${i}]`);
        });
        break;
      }
      default:
        break;
    }
  }

  /**
   * A logbook extension (Story Phase 10): its "entries" are added to the
   * logbook; an entry whose id the logbook already has instead puts its
   * "variants" ahead of the old ones (the newest state of an entry wins).
   * New "severities" (labels for scaled fields) are added to the old ones.
   */
  extendLog(ext) {
    const base = this.logs.get(ext.rec.extend);
    if (!base) {
      this.loadErrors.push(`${ext.source}: "extend" names unknown logbook "${ext.rec.extend}"`);
      return;
    }
    for (const key of Object.keys(ext.rec)) {
      if (!['extend', 'entries', 'severities'].includes(key) && !key.startsWith('//')) this.loadErrors.push(`${ext.source}: a logbook extension may only add "entries" and "severities" (found "${key}")`);
    }
    const entries = [...(base.entries ?? [])];
    for (const e of ext.rec.entries ?? []) {
      const i = entries.findIndex((o) => o.id === e.id);
      if (i < 0) {
        entries.push(e);
        continue;
      }
      for (const key of Object.keys(e)) {
        if (!['id', 'variants'].includes(key) && !key.startsWith('//')) this.loadErrors.push(`${ext.source}: entry "${e.id}" already exists; an extension may only add "variants" to it (found "${key}")`);
      }
      entries[i] = { ...entries[i], variants: [...(e.variants ?? []), ...(entries[i].variants ?? [])] };
    }
    const severities = ext.rec.severities ? { ...(base.severities ?? {}), ...ext.rec.severities } : base.severities;
    this.logs.map.set(ext.rec.extend, { ...base, entries, ...(severities ? { severities } : {}) });
  }

  /** Merges map patches and NPC/character extensions into their base records. */
  applyExtensions() {
    for (const ext of this.extensions) {
      if (ext.kind === 'logs') {
        this.extendLog(ext);
        continue;
      }
      const registry = this[ext.kind];
      const base = registry.get(ext.rec.extend);
      if (!base) {
        this.loadErrors.push(`${ext.source}: "extend" names unknown ${ext.kind === 'npcs' ? 'NPC' : 'character'} "${ext.rec.extend}"`);
        continue;
      }
      const merged = { ...base };
      if (ext.rec.dialogue) merged.dialogue = [...ext.rec.dialogue, ...(base.dialogue ?? [])];
      if (ext.rec.variants) merged.variants = [...ext.rec.variants, ...(base.variants ?? [])];
      for (const key of Object.keys(ext.rec)) {
        if (!['extend', 'dialogue', 'variants'].includes(key) && !key.startsWith('//')) {
          this.loadErrors.push(`${ext.source}: an extension may only add "dialogue" and "variants" (found "${key}")`);
        }
      }
      registry.map.set(base.id, merged);
      (this.extendedBy ??= new Map()).set(base.id, [...(this.extendedBy.get(base.id) ?? []), ext.source]);
    }
    for (const patch of this.mapPatches.list()) {
      const source = this.mapPatches.sourceOf(patch.id);
      const base = this.maps.get(patch.patch);
      if (!base) {
        this.loadErrors.push(`${source}: "patch" names unknown map "${patch.patch}"`);
        continue;
      }
      const merged = { ...base };
      for (const key of MAP_PATCH_PREPEND) if (patch[key]) merged[key] = [...patch[key], ...(base[key] ?? [])];
      for (const key of MAP_PATCH_APPEND) if (patch[key]) merged[key] = [...(base[key] ?? []), ...patch[key]];
      if (patch.lights) merged.lighting = { ...(base.lighting ?? {}), lights: [...(base.lighting?.lights ?? []), ...patch.lights] };
      for (const key of ['fumeCollapse', 'fumeSafeSpawn']) if (patch[key]) merged[key] = patch[key];
      // A later chapter can retire an earlier chapter's prop (Story Phase 13:
      // or fume zone, or ambient entry) without editing it: its condition
      // gains the extra "if" (both must hold).
      for (const [key, list, what] of MAP_PATCH_CONDITIONS) {
        for (const pc of patch[key] ?? []) {
          // Story Phase 14: a base map's plain prop ("card_table 10 10", no id) can be named by its string too.
          const norm = (str) => str.trim().split(/\s+/).join(' ');
          const i = (merged[list] ?? []).findIndex((p) => (p && typeof p === 'object' && p.id === pc.id) || (list === 'props' && typeof p === 'string' && norm(p) === norm(pc.id)));
          if (i < 0) {
            // Story Phase 14: a decor slot's prop (decor_<value>_<spot>) doesn't exist until the slots expand (below).
            if (list === 'props' && expandDecor(merged.decor ?? []).props.some((p) => p.id === pc.id)) {
              merged.decorConditions = [...(merged.decorConditions ?? []), pc];
              continue;
            }
            this.loadErrors.push(`${source}: ${key} names ${what} id "${pc.id}", which ${patch.patch} does not have`);
            continue;
          }
          let item = merged[list][i];
          if (typeof item === 'string') {
            const [prop, x, y, ...rest] = norm(item).split(' ');
            item = { prop, x: Number(x), y: Number(y), ...(rest.includes('flip') ? { flip: true } : {}) };
          }
          merged[list] = [...merged[list]];
          merged[list][i] = { ...item, if: item.if ? { all: [item.if, pc.if] } : pc.if };
        }
      }
      const allowed = new Set(['id', 'patch', 'lights', 'fumeCollapse', 'fumeSafeSpawn', ...MAP_PATCH_CONDITIONS.map(([k]) => k), ...MAP_PATCH_PREPEND, ...MAP_PATCH_APPEND]);
      for (const key of Object.keys(patch)) {
        if (!allowed.has(key) && !key.startsWith('//')) this.loadErrors.push(`${source}: a map patch cannot change "${key}"`);
      }
      this.maps.map.set(base.id, merged);
    }
    // Story Phase 13: decor slots become conditional props (and inspect objects).
    for (const map of this.maps.list()) {
      if (!map.decor?.length) continue;
      const { props, objects } = expandDecor(map.decor);
      // A later chapter's propConditions on a decor prop (Story Phase 14: the standees taken down) apply now.
      for (const pc of map.decorConditions ?? []) {
        for (const list of [props, objects]) {
          const k = list.findIndex((p) => p.id === pc.id);
          if (k >= 0) list[k] = { ...list[k], if: list[k].if ? { all: [list[k].if, pc.if] } : pc.if };
        }
      }
      this.maps.map.set(map.id, { ...map, props: [...(map.props ?? []), ...props], objects: [...objects, ...(map.objects ?? [])] });
    }
  }

  /**
   * Speakers = party characters + NPCs + extra speakers, plus aliases
   * (e.g. "captain" → "blackbeard"). Each has { id, name, portrait, voice }.
   */
  buildSpeakers() {
    this.speakers = new Map();
    this.speakerErrors = [];
    const add = (id, rec, source) => {
      if (this.speakers.has(id)) {
        this.speakerErrors.push(`${source}: speaker id "${id}" is already used`);
        return;
      }
      this.speakers.set(id, rec);
    };
    const addFrom = (def, source) => {
      const rec = { id: def.id, name: def.name, portrait: def.portrait ?? null, voice: def.voice ?? null, variants: def.variants ?? null };
      add(def.id, rec, source);
      for (const alias of def.aliases ?? []) add(alias, rec, source);
    };
    for (const def of this.characters.list()) addFrom(def, this.characters.sourceOf(def.id));
    for (const def of this.npcs.list()) addFrom(def, this.npcs.sourceOf(def.id));
    for (const def of this.extraSpeakers.list()) addFrom(def, this.extraSpeakers.sourceOf(def.id));
  }

  speaker(id) {
    return this.speakers.get(id) || null;
  }

  constant(name) {
    return this.game?.constants?.[name];
  }
}
