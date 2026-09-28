import { EventBus } from '../core/EventBus.js';
import { loadContent } from '../content/loadContent.js';
import { validateContent } from '../content/validateContent.js';
import { createStorage } from '../platform/storage.js';
import { Settings } from '../systems/settings/Settings.js';
import { SaveManager } from '../systems/save/SaveManager.js';
import { InputManager } from '../platform/input/InputManager.js';
import { GameSession } from '../systems/GameSession.js';
import { AudioEngine } from '../audio/AudioEngine.js';
import { IS_DEV } from '../platform/env.js';
import { compileMap } from '../maps/compileMap.js';

/**
 * Application-wide services shared by every scene. Scenes reach it through
 * `this.game.app` (see scenes/BaseScene.js). Nothing here depends on Phaser.
 */
export class App {
  constructor() {
    this.bus = new EventBus();
    this.content = loadContent();
    this.validation = validateContent(this.content);
    if (this.validation.errors.length) {
      console.error(`Content validation found ${this.validation.errors.length} problem(s):\n${this.validation.errors.join('\n')}`);
    }
    for (const w of this.validation.warnings) console.warn(w);
    this.storage = createStorage();
    this.settings = new Settings({ storage: this.storage, bus: this.bus });
    this.saves = new SaveManager({ storage: this.storage, content: this.content });
    this.input = new InputManager({ bus: this.bus, customLayouts: () => this.settings.get('padLayouts') });
    this.audio = new AudioEngine({ content: this.content, settings: this.settings, bus: this.bus });
    this.session = null;
    this.mapCache = new Map();
    this.flags = { collisionView: false, noclip: false, showTriggers: false, autoTiming: null, infoHud: false };
  }

  /** Compiled (cached) map model by id. */
  map(id) {
    if (!this.mapCache.has(id)) {
      const def = this.content.maps.require(id);
      const tileset = this.content.tilesets.require(def.tileset);
      this.mapCache.set(id, compileMap(def, tileset, this.content.props));
    }
    return this.mapCache.get(id);
  }

  startNewGame() {
    this.session?.destroy();
    this.session = GameSession.newGame({ content: this.content, bus: this.bus, strictFlags: IS_DEV });
    this.bus.emit('session:started', { session: this.session, fresh: true });
    return this.session;
  }

  /** Ends the running game (returning to the title). */
  endSession() {
    this.session?.destroy();
    this.session = null;
  }

  /** Loads a save slot into a new session. Returns { ok, reason }. */
  loadGame(slot) {
    const res = this.saves.read(slot);
    if (!res.ok) return res;
    const warnings = [];
    this.session?.destroy();
    this.session = GameSession.fromState({
      content: this.content, bus: this.bus, state: res.state, strictFlags: false, onWarning: (w) => warnings.push(w),
    });
    if (warnings.length) console.warn('Save loaded with warnings:\n' + warnings.join('\n'));
    this.bus.emit('session:started', { session: this.session, fresh: false });
    return { ok: true, warnings };
  }
}
