import { AUTOSAVE_SLOT, MANUAL_SAVE_SLOTS, SAVE_VERSION, STORAGE_PREFIX } from '../../config/constants.js';
import { checksum } from '../../core/util.js';
import { MIGRATIONS, migrateState } from './migrations.js';

export const SAVE_FORMAT = 'captain-stinkbeard-save';

/**
 * Save slots in browser storage.
 *
 * Record layout (JSON):
 *   { format, version, savedAt, slot, checksum, summary, state }
 * - `version` is the save schema version (see migrations.js)
 * - `checksum` covers the serialized `state` and detects corruption/tampering
 * - `summary` is display-only (slot list) and never trusted for gameplay
 *
 * Loading never throws: it returns { ok:false, reason } for missing, corrupt,
 * newer-version or invalid saves so menus can show a friendly message.
 */
export class SaveManager {
  constructor({ storage, content = null, version = SAVE_VERSION, migrations = MIGRATIONS, prefix = STORAGE_PREFIX }) {
    this.storage = storage;
    this.content = content;
    this.version = version;
    this.migrations = migrations;
    this.prefix = prefix;
  }

  key(slot) {
    return `${this.prefix}.save.${slot}`;
  }

  allSlots() {
    return [AUTOSAVE_SLOT, ...MANUAL_SAVE_SLOTS];
  }

  buildRecord(slot, session, extraSummary = {}) {
    const state = session.serialize();
    const stateJson = JSON.stringify(state);
    const leader = session.party.leader();
    const mapDef = this.content?.maps.get(state.location.map);
    return {
      format: SAVE_FORMAT,
      version: this.version,
      savedAt: new Date().toISOString(),
      slot,
      checksum: checksum(stateJson),
      summary: {
        location: mapDef?.name ?? state.location.map,
        playTime: state.playTime,
        leader: leader?.name ?? '?',
        level: leader?.level ?? 1,
        gold: state.inventory.gold,
        chapter: this.content?.game?.chapterName ?? '',
        ...extraSummary,
      },
      state,
    };
  }

  /** Writes a slot. Returns { ok, reason? } — storage can be full or blocked. */
  save(slot, session, extraSummary) {
    try {
      const record = this.buildRecord(slot, session, extraSummary);
      this.storage.setItem(this.key(slot), JSON.stringify(record));
      return { ok: true, record };
    } catch (err) {
      console.error('Save failed', err);
      return { ok: false, reason: 'Could not write save data (storage full or blocked).' };
    }
  }

  delete(slot) {
    this.storage.removeItem(this.key(slot));
  }

  /** Reads and verifies a slot without building a session. */
  read(slot) {
    let raw;
    try {
      raw = this.storage.getItem(this.key(slot));
    } catch {
      return { ok: false, status: 'corrupt', reason: 'Storage could not be read.' };
    }
    if (raw === null || raw === undefined) return { ok: false, status: 'empty', reason: 'Empty slot.' };

    let record;
    try {
      record = JSON.parse(raw);
    } catch {
      return { ok: false, status: 'corrupt', reason: 'Save data is damaged (not valid JSON).' };
    }
    if (!record || record.format !== SAVE_FORMAT || typeof record.state !== 'object' || record.state === null) {
      return { ok: false, status: 'corrupt', reason: 'Not a Captain Stinkbeard save.' };
    }
    if (!Number.isInteger(record.version) || record.version < 1) {
      return { ok: false, status: 'corrupt', reason: 'Save has no valid version number.' };
    }
    if (record.version > this.version) {
      return { ok: false, status: 'incompatible', reason: 'Save was made by a newer version of the game.', summary: record.summary };
    }
    if (checksum(JSON.stringify(record.state)) !== record.checksum) {
      return { ok: false, status: 'corrupt', reason: 'Save data is damaged (checksum mismatch).', summary: record.summary };
    }

    let state = record.state;
    if (record.version < this.version) {
      try {
        state = migrateState(state, record.version, this.version, this.migrations);
      } catch (err) {
        return { ok: false, status: 'incompatible', reason: `Save is too old to upgrade (${err.message}).`, summary: record.summary };
      }
    }

    const problem = this.validateState(state);
    if (problem) return { ok: false, status: 'corrupt', reason: problem, summary: record.summary };
    return { ok: true, status: 'ok', state, summary: record.summary, savedAt: record.savedAt, version: record.version };
  }

  /** Structural checks that must hold before a state is handed to GameSession.load. */
  validateState(state) {
    const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
    if (!isObj(state.story) || !Array.isArray(state.story.flags)) return 'Save is missing story data.';
    if (!isObj(state.inventory)) return 'Save is missing inventory data.';
    if (!Array.isArray(state.party) || state.party.length === 0) return 'Save has no party.';
    if (!isObj(state.quests)) return 'Save is missing quest data.';
    if (!isObj(state.location) || typeof state.location.map !== 'string') return 'Save has no location.';
    if (this.content && !this.content.maps.has(state.location.map)) {
      return `Save points at an unknown map ("${state.location.map}").`;
    }
    return null;
  }

  /** Slot overview for menus. */
  listSlots() {
    return this.allSlots().map((slot) => {
      const res = this.read(slot);
      return { slot, status: res.status, summary: res.summary ?? null, savedAt: res.savedAt ?? null, reason: res.reason ?? null };
    });
  }

  /** Most recently written loadable slot, or null. Used by "Continue". */
  latestSlot() {
    let best = null;
    for (const info of this.listSlots()) {
      if (info.status !== 'ok') continue;
      if (!best || info.savedAt > best.savedAt) best = info;
    }
    return best ? best.slot : null;
  }

  hasAnySave() {
    return this.latestSlot() !== null;
  }
}
