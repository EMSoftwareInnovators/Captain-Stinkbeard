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
];

const SINGLE_FILES = {
  'game.json': 'game',
  'progression/leveling.json': 'leveling',
};

export const REGISTRY_KINDS = [
  'characters', 'extraSpeakers', 'npcs', 'enemies', 'abilities', 'statuses', 'items', 'shops', 'quests',
  'encounters', 'props', 'appearances', 'portraits', 'scripts', 'flags', 'maps', 'tilesets', 'music',
  'sfx', 'instruments', 'ambience', 'timing', 'backdrops',
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
    this.files = Object.keys(files).map(relativePath).sort();

    for (const [path, json] of Object.entries(files).sort(([a], [b]) => a.localeCompare(b))) {
      this.ingest(relativePath(path), json);
    }

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
    const registry = this[rule.kind];
    const source = `data/${rel}`;
    switch (rule.shape) {
      case 'list': {
        if (!Array.isArray(json)) {
          this.loadErrors.push(`${source}: expected a JSON array of records`);
          return;
        }
        json.forEach((rec, i) => registry.add(rec?.id, rec, `${source}[${i}]`));
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
      const rec = { id: def.id, name: def.name, portrait: def.portrait ?? null, voice: def.voice ?? null };
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
