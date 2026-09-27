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
  { prefix: 'hazards/', kind: 'hazards', shape: 'map' },
  { prefix: 'debug/', kind: 'debugPresets', shape: 'list' },
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
const MAP_PATCH_PREPEND = ['objects', 'musicVariants', 'lightingVariants', 'haze'];
const MAP_PATCH_APPEND = ['props', 'onEnter', 'regions', 'ambient', 'fumes', 'collision'];

const SINGLE_FILES = {
  'game.json': 'game',
  'progression/leveling.json': 'leveling',
};

export const REGISTRY_KINDS = [
  'characters', 'extraSpeakers', 'npcs', 'enemies', 'abilities', 'statuses', 'items', 'shops', 'quests',
  'encounters', 'props', 'appearances', 'portraits', 'scripts', 'flags', 'maps', 'tilesets', 'music',
  'sfx', 'instruments', 'ambience', 'timing', 'backdrops', 'vistas', 'storyTriggers', 'hazards', 'debugPresets',
  'mapPatches',
];

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
    this.files = Object.keys(files).map(relativePath).sort();

    for (const [path, json] of Object.entries(files).sort(([a], [b]) => a.localeCompare(b))) {
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
          registry.add(id, rec, source);
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

  /** Merges map patches and NPC/character extensions into their base records. */
  applyExtensions() {
    for (const ext of this.extensions) {
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
      const allowed = new Set(['id', 'patch', 'lights', 'fumeCollapse', 'fumeSafeSpawn', ...MAP_PATCH_PREPEND, ...MAP_PATCH_APPEND]);
      for (const key of Object.keys(patch)) {
        if (!allowed.has(key) && !key.startsWith('//')) this.loadErrors.push(`${source}: a map patch cannot change "${key}"`);
      }
      this.maps.map.set(base.id, merged);
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
