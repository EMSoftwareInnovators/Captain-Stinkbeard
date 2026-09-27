import { BaseScene } from '../scenes/BaseScene.js';
import { addText, UI_COLORS } from '../ui/text.js';
import { ListMenu } from '../ui/ListMenu.js';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../config/constants.js';
import { currentChapter } from '../systems/story/progress.js';
import { startPreset } from './startPreset.js';

const TABS = ['Info', 'Story', 'Warp', 'Flags', 'Quests', 'Items', 'Party', 'Battle', 'Tools'];
const GAMEPLAY_SCENES = ['Title', 'World', 'Battle', 'Menu', 'GameOver', 'Overlay'];

/**
 * Developer overlay, toggled with F2. Only bundled when DEBUG_ENABLED
 * (dev server, or builds with VITE_ENABLE_DEBUG=true); see src/main.js.
 *
 * While open it pauses the running gameplay scenes so its menus own the
 * input, then resumes exactly the scenes it paused.
 */
export class DebugScene extends BaseScene {
  constructor() {
    super('Debug');
  }

  create() {
    this.open = false;
    this.tab = 0;
    this.parts = [];
    this.menu = null;
    this.subMenu = null;
    this.pausedByDebug = [];
    this.hud = addText(this, 2, SCREEN_HEIGHT - 11, '', { depth: 10, color: 0x9affc0 }).setVisible(false);
    this.fps = 0;
  }

  get world() {
    const w = this.game.scene.getScene('World');
    return w && (this.scene.isActive('World') || this.scene.isPaused('World')) && w.player ? w : null;
  }

  update(_time, delta) {
    const input = this.controls;
    this.fps = this.fps * 0.9 + (1000 / Math.max(1, delta)) * 0.1;
    if (this.app.flags.infoHud && !this.open) this.updateHud();
    else this.hud.setVisible(false);
    if (input.pressed('debug')) {
      input.consume('debug');
      if (this.open) this.close();
      else this.show();
      return;
    }
    if (!this.open) return;
    if (this.subMenu) {
      this.subMenu.update(input);
      return;
    }
    if (input.pressed('pageLeft') || input.pressed('pageRight') || input.repeat('left') || input.repeat('right')) {
      const d = input.pressed('pageRight') || input.isDown('right') ? 1 : -1;
      input.consume('pageLeft');
      input.consume('pageRight');
      this.tab = (this.tab + d + TABS.length) % TABS.length;
      this.render();
      return;
    }
    if (input.pressed('cancel') || input.pressed('menu')) {
      input.consumeAll();
      this.close();
      return;
    }
    this.menu?.update(input);
  }

  updateHud() {
    const w = this.world;
    const parts = [`${Math.round(this.fps)}fps`];
    if (w) parts.push(`${w.model.id} ${w.player.tx},${w.player.ty} ${w.player.facing}`);
    this.hud.setText(parts.join('  ')).setVisible(true);
  }

  show() {
    this.open = true;
    this.pausedByDebug = GAMEPLAY_SCENES.filter((k) => this.scene.isActive(k));
    for (const k of this.pausedByDebug) this.scene.pause(k);
    this.scene.bringToTop();
    this.controls.consumeAll();
    this.render();
  }

  close() {
    this.open = false;
    this.clear();
    for (const k of this.pausedByDebug) if (this.scene.isPaused(k)) this.scene.resume(k);
    this.pausedByDebug = [];
    this.controls.consumeAll();
  }

  clear() {
    this.parts.forEach((p) => p.destroy());
    this.parts = [];
    this.menu?.destroy();
    this.menu = null;
    this.closeSub();
  }

  closeSub() {
    this.subMenu?.destroy();
    this.subMenu = null;
    this.subParts?.forEach((p) => p.destroy());
    this.subParts = null;
    this.menu?.setFocused(true);
  }

  text(x, y, str, opts = {}) {
    const t = addText(this, x, y, str, { depth: 101, ...opts });
    this.parts.push(t);
    return t;
  }

  render() {
    this.clear();
    this.parts.push(this.add.rectangle(4, 4, SCREEN_WIDTH - 8, SCREEN_HEIGHT - 8, 0x05040a, 0.9).setOrigin(0).setDepth(100));
    this.parts.push(this.add.rectangle(4, 4, SCREEN_WIDTH - 8, 1, 0x4ade80).setOrigin(0).setDepth(101));
    let x = 10;
    TABS.forEach((name, i) => {
      const t = this.text(x, 8, name, { color: i === this.tab ? 0x4ade80 : UI_COLORS.dim });
      x += t.textWidth + 9;
    });
    this.text(10, SCREEN_HEIGHT - 16, '<k>◀▶ tab   Z select   X/F2 close</>');
    const items = this[`items${TABS[this.tab]}`]();
    if (!items) return;
    this.menu = new ListMenu(this, {
      x: 24,
      y: 24,
      width: SCREEN_WIDTH - 40,
      rows: 14,
      rowHeight: 12,
      depth: 101,
      items,
      onSelect: (item) => item.action?.(),
    });
  }

  // --- tabs ------------------------------------------------------------------

  itemsInfo() {
    const app = this.app;
    const w = this.world;
    const s = app.session;
    const lines = [
      `FPS ${Math.round(this.fps)}   Scenes: ${this.game.scene.getScenes(false).filter((sc) => sc.sys.isActive() || sc.sys.isPaused()).map((sc) => sc.scene.key).join(', ')}`,
      w ? `Map ${w.model.id} (${w.model.width}x${w.model.height})   Player ${w.player.tx},${w.player.ty} facing ${w.player.facing}` : 'No map loaded',
      s ? `Gold ${s.inventory.gold}   Play time ${Math.floor(s.playTime)}s   Flags ${s.story.allFlags().length}` : 'No session',
      s ? `Chapter: ${currentChapter(app.content.game, s).name}   Exposure ${Math.round(s.transient?.exposure?.value ?? 0)}` : '',
      `Content errors ${app.validation.errors.length}   warnings ${app.validation.warnings.length}`,
      `Maps ${app.content.maps.size}  NPCs ${app.content.npcs.size}  Quests ${app.content.quests.size}  Items ${app.content.items.size}`,
    ];
    lines.forEach((l, i) => this.text(12, 26 + i * 12, l));
    if (s) this.text(12, 26 + lines.length * 12 + 6, `<k>Flags:</> ${s.story.allFlags().join(', ') || '—'}`, { maxWidth: SCREEN_WIDTH - 30 });
    return null;
  }

  /** Story presets: start a fresh game at any point of the story. */
  itemsStory() {
    const presets = this.app.content.debugPresets.list();
    if (!presets.length) return [{ label: '<k>No presets (data/debug/)</>' }];
    return presets.map((p) => ({
      label: p.name,
      right: p.id,
      action: () => {
        this.close();
        try {
          startPreset(this.game, p.id);
        } catch (err) {
          console.error(err);
        }
      },
    }));
  }

  itemsWarp() {
    return this.app.content.maps.list().map((m) => ({
      label: m.name,
      right: m.id,
      action: () => this.pickSpawn(m),
    }));
  }

  pickSpawn(m) {
    const model = this.app.map(m.id);
    const spawns = Object.keys(model.spawns);
    this.openSub(spawns.map((sp) => ({ label: sp, action: () => this.warp(m.id, sp) })));
  }

  warp(map, spawn) {
    const w = this.world;
    if (!w) return this.flash('Start a game first.');
    this.close();
    w.transitionTo(map, { spawn, noAutosave: true });
    return null;
  }

  itemsFlags() {
    const s = this.app.session;
    if (!s) return [{ label: '<k>No session</>' }];
    return this.app.content.flags.list().map((f) => ({
      label: `${s.story.has(f.id) ? '<g>[x]</>' : '[ ]'} ${f.id}`,
      action: () => {
        s.story.toggle(f.id);
        this.rerender();
      },
    }));
  }

  itemsQuests() {
    const s = this.app.session;
    if (!s) return [{ label: '<k>No session</>' }];
    return this.app.content.quests.list().map((q) => ({
      label: q.title,
      right: s.quests.status(q.id),
      action: () => this.openSub([
        { label: 'Start', action: () => this.questOp(() => s.quests.start(q.id)) },
        { label: 'Complete next objective', action: () => this.questOp(() => this.completeNext(q)) },
        { label: 'Complete quest', action: () => this.questOp(() => {
          if (s.quests.status(q.id) === 'inactive') s.quests.start(q.id);
          for (const o of q.objectives) s.quests.completeObjective(q.id, o.id, { force: true });
          if (s.quests.status(q.id) !== 'completed') s.quests.complete(q.id);
        }) },
        { label: 'Reset', action: () => this.questOp(() => s.quests.reset(q.id)) },
      ]),
    }));
  }

  completeNext(q) {
    const s = this.app.session;
    if (s.quests.status(q.id) === 'inactive') s.quests.start(q.id);
    const next = s.quests.visibleObjectives(q.id).find((o) => !o.done);
    if (next) s.quests.completeObjective(q.id, next.def.id, { force: true });
  }

  questOp(fn) {
    try {
      fn();
    } catch (err) {
      this.flash(err.message);
    }
    this.closeSub();
    this.rerender();
  }

  itemsItems() {
    const s = this.app.session;
    if (!s) return [{ label: '<k>No session</>' }];
    const out = [
      { label: '<y>+100 gold</>', right: `${s.inventory.gold}`, action: () => { s.inventory.addGold(100); this.rerender(); } },
    ];
    for (const def of this.app.content.items.list()) {
      out.push({ label: def.name, icon: def.icon, right: `${def.type} ×${s.inventory.count(def.id)}`, action: () => { s.inventory.add(def.id, 1); this.rerender(); } });
    }
    return out;
  }

  itemsParty() {
    const s = this.app.session;
    if (!s) return [{ label: '<k>No session</>' }];
    const ch = s.party.leader();
    return [
      { label: 'Heal party', right: `${ch.hp}/${ch.maxHp}`, action: () => { s.party.healAll(); this.rerender(); } },
      { label: 'HP to 1', action: () => { for (const m of s.party.members) m.hp = 1; this.rerender(); } },
      { label: 'Level +1', right: `Lv ${ch.level}`, action: () => { for (const m of s.party.members) m.setLevel(m.level + 1); s.party.healAll(); this.rerender(); } },
      { label: '+50 XP', right: `${ch.xp} XP`, action: () => { s.grantRewards({ xp: 50 }); this.rerender(); } },
      { label: 'Reset to level 1', action: () => { for (const m of s.party.members) m.setLevel(1); this.rerender(); } },
    ];
  }

  itemsBattle() {
    return this.app.content.encounters.list().map((enc) => ({
      label: enc.id,
      right: enc.enemies.join(', ').slice(0, 30),
      action: () => {
        const w = this.world;
        if (!w || !this.pausedByDebug.includes('World') || w.isBusy()) return this.flash('Needs the world map, not busy.');
        this.close();
        w.scriptDepth += 1;
        w.startBattle(enc.id).then(() => {
          w.scriptDepth -= 1;
        });
        return null;
      },
    }));
  }

  itemsTools() {
    const f = this.app.flags;
    const onOff = (v) => (v ? '<g>ON</>' : '<k>off</>');
    return [
      { label: 'Collision view', right: onOff(f.collisionView), action: () => { f.collisionView = !f.collisionView; this.rerender(); } },
      { label: 'Show triggers & warps', right: onOff(f.showTriggers), action: () => { f.showTriggers = !f.showTriggers; this.rerender(); } },
      { label: 'Walk through walls (noclip)', right: onOff(f.noclip), action: () => { f.noclip = !f.noclip; this.rerender(); } },
      { label: 'Fume immunity', right: onOff(f.fumeImmunity), action: () => { f.fumeImmunity = !f.fumeImmunity; this.rerender(); } },
      { label: 'Clear fume exposure', action: () => { this.app.session?.transient?.exposure?.reset(); this.flash('Exposure cleared.'); } },
      { label: 'Auto timed hits (perfect)', right: onOff(f.autoTiming !== null), action: () => { f.autoTiming = f.autoTiming === null ? 0 : null; this.rerender(); } },
      { label: 'Info HUD (fps, coords)', right: onOff(f.infoHud), action: () => { f.infoHud = !f.infoHud; this.rerender(); } },
      { label: 'Reload current map', action: () => this.reloadMap() },
      { label: 'Autosave now', action: () => { const w = this.world; if (w) { w.autosave(); this.flash('Autosaved.'); } } },
    ];
  }

  reloadMap() {
    const w = this.world;
    if (!w) return this.flash('No map loaded.');
    const { tx, ty, facing } = w.player;
    this.app.mapCache.delete(w.model.id);
    this.close();
    w.transitionTo(w.model.id, { x: tx, y: ty, facing, noAutosave: true, keepMusic: true });
    return null;
  }

  // --- helpers ---------------------------------------------------------------

  rerender() {
    const index = this.menu?.index ?? 0;
    const scroll = this.menu?.scroll ?? 0;
    this.render();
    if (this.menu) {
      this.menu.scroll = scroll;
      this.menu.setItems(this.menu.items, index);
    }
  }

  openSub(items) {
    this.menu.setFocused(false);
    const h = Math.min(10, items.length) * 12 + 10;
    this.subParts = [this.add.rectangle(150, 40, 160, h, 0x151228, 0.98).setOrigin(0).setDepth(110).setStrokeStyle(1, 0x4ade80)];
    this.subMenu = new ListMenu(this, {
      x: 166,
      y: 45,
      width: 136,
      rows: Math.min(10, items.length),
      rowHeight: 12,
      depth: 111,
      items,
      onSelect: (item) => item.action?.(),
      onCancel: () => this.closeSub(),
    });
  }

  flash(msg) {
    const t = addText(this, 12, SCREEN_HEIGHT - 30, `<r>${msg}</>`, { depth: 120 });
    this.time.delayedCall(1800, () => t.destroy());
    return null;
  }
}
