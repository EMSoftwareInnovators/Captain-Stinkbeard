import { BaseScene } from './BaseScene.js';
import { addPanel } from '../ui/Panel.js';
import { addText, UI_COLORS } from '../ui/text.js';
import { ListMenu } from '../ui/ListMenu.js';
import { UiLayer } from '../ui/menu/UiLayer.js';
import { StatusPage } from '../ui/menu/StatusPage.js';
import { ItemsPage } from '../ui/menu/ItemsPage.js';
import { EquipPage } from '../ui/menu/EquipPage.js';
import { QuestsPage } from '../ui/menu/QuestsPage.js';
import { LogPage } from '../ui/menu/LogPage.js';
import { logAvailable } from '../systems/logs/logbook.js';
import { ShopView } from '../ui/menu/ShopView.js';
import { ConfirmPrompt } from '../ui/menu/Prompts.js';
import { OptionsPanel } from '../ui/panels/OptionsPanel.js';
import { SaveLoadPanel } from '../ui/panels/SaveLoadPanel.js';
import { formatPlayTime } from '../core/util.js';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../config/constants.js';

const NAV = [
  { label: 'Status', value: 'status', page: StatusPage },
  { label: 'Items', value: 'items', page: ItemsPage },
  { label: 'Equip', value: 'equip', page: EquipPage },
  { label: 'Quests', value: 'quests', page: QuestsPage },
  { label: 'Options', value: 'options' },
  { label: 'Save', value: 'save' },
  { label: 'Return', value: 'return' },
  { label: 'Quit to Title', value: 'quit' },
];

const PANE = { x: 96, y: 4, w: SCREEN_WIDTH - 100, h: SCREEN_HEIGHT - 8 };
/** A logbook opened in the world (the Stench Log on its barrel). */
const BOOK = { x: 24, y: 8, w: SCREEN_WIDTH - 48, h: SCREEN_HEIGHT - 16 };

/**
 * The pause menu (party status, items, equipment, quest log, options, save)
 * and shops. Runs on top of the paused world; closing resumes it.
 *   scene.launch('Menu', { mode: 'pause' })
 *   scene.launch('Menu', { mode: 'shop', shop: 'galley_stores' })
 */
export class MenuScene extends BaseScene {
  constructor() {
    super('Menu');
  }

  init(data) {
    this.params = data || {};
  }

  create() {
    // Phaser reuses this scene object every time the menu opens, so every
    // per-visit field must be reset here (a stale shop view once kept
    // receiving input and drew itself over the pause menu).
    this.closing = false;
    this.modal = null;
    this.page = null;
    this.pageFocused = false;
    this.shopView = null;
    this.nav = null;
    this.hint = null;
    this.playTime = null;
    this.bookMode = false;
    this.navList = NAV;
    this.side = new UiLayer(this);
    this.app.overlay.setHint(null);
    this.backdrop = this.add.rectangle(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 0x07060b, 0.55).setOrigin(0).setDepth(0);
    if (this.params.mode === 'shop') {
      this.shopView = new ShopView(this, this.params.shop, { onClose: () => this.close() });
      return;
    }
    if (this.params.mode === 'log') {
      this.buildBook();
      return;
    }
    this.buildPause();
  }

  /** The pause menu's entries: the fixed ones plus any logbook the story has opened. */
  navEntries() {
    const logs = [];
    for (const [id, log] of this.app.content.logs.map) {
      if (logAvailable(log, this.session)) logs.push({ label: log.menuLabel ?? log.title, value: `log:${id}`, page: LogPage, args: { logId: id } });
    }
    const at = NAV.findIndex((n) => n.value === 'quests') + 1;
    return [...NAV.slice(0, at), ...logs, ...NAV.slice(at)];
  }

  buildPause() {
    this.navList = this.navEntries();
    addPanel(this, 4, 4, 88, this.navList.length * 12 + 12, { depth: 10 });
    this.nav = new ListMenu(this, {
      x: 22,
      y: 10,
      width: 66,
      rows: this.navList.length,
      depth: 11,
      items: this.navList.map((n) => ({ label: n.label, value: n.value, color: n.value === 'quit' ? UI_COLORS.dim : undefined })),
      index: Math.min(this.app.menuIndex ?? 0, this.navList.length - 1),
      onChange: (item) => this.preview(item.value),
      onSelect: (item) => this.choose(item.value),
      onCancel: () => this.close(),
    });
    addPanel(this, PANE.x, PANE.y, PANE.w, PANE.h, { depth: 10 });
    this.refreshSide();
    this.preview(this.navList[this.nav.index].value);
  }

  /** A logbook on its own, opened from the world; cancel closes it. */
  buildBook() {
    addPanel(this, BOOK.x, BOOK.y, BOOK.w, BOOK.h, { depth: 10 });
    this.page = new LogPage(this, BOOK, { logId: this.params.log, entry: this.params.entry ?? null });
    this.page.render();
    this.pageFocused = this.page.focus();
    this.bookMode = true;
    this.app.audio.ui('menu_open');
  }

  /** Gold, play time and location in the lower-left box. */
  refreshSide() {
    const s = this.session;
    this.side.clear();
    const y = this.navList.length * 12 + 20;
    const h = SCREEN_HEIGHT - y - 4;
    this.side.add(addPanel(this, 4, y, 88, h, { depth: 10 }));
    this.side.add(this.add.image(10, y + 7, 'ui', 'icon_gold').setOrigin(0).setDepth(11));
    this.side.add(addText(this, 30, y + 11, `<y>${s.inventory.gold}</>`, { depth: 11 }));
    this.side.add(addText(this, 10, y + 28, '<k>Time</>', { depth: 11 }));
    this.playTime = this.side.add(addText(this, 10, y + 39, formatPlayTime(s.playTime), { depth: 11 }));
    const mapName = this.app.content.maps.get(s.location?.map)?.name ?? '';
    this.side.add(addText(this, 10, y + 56, '<k>Location</>', { depth: 11 }));
    this.side.add(addText(this, 10, y + 67, mapName, { maxWidth: 76, depth: 11 }));
  }

  preview(value) {
    this.app.menuIndex = this.nav.index;
    this.page?.destroy();
    this.page = null;
    this.hint?.destroy();
    this.hint = null;
    const entry = this.navList.find((n) => n.value === value);
    if (entry?.page) {
      this.page = new entry.page(this, PANE, entry.args);
      this.page.render();
    } else {
      const text = {
        options: 'Sound, text speed, controls feel and display.',
        save: 'Write your progress to one of three save slots.',
        return: 'Back to the ship.',
        quit: 'Return to the title screen. Unsaved progress is lost.',
      }[value];
      this.hint = addText(this, PANE.x + 14, PANE.y + 14, text ?? '', { maxWidth: PANE.w - 28, color: UI_COLORS.dim, depth: 20 });
    }
  }

  choose(value) {
    const entry = this.navList.find((n) => n.value === value);
    if (entry?.page && this.page) {
      if (this.page.focus()) {
        this.pageFocused = true;
        this.nav.setFocused(false);
      }
      return;
    }
    if (value === 'return') this.close();
    if (value === 'options') {
      this.nav.setFocused(false);
      this.modal = new OptionsPanel(this, { depth: 300, onClose: () => this.closeModal() });
    }
    if (value === 'save') {
      this.nav.setFocused(false);
      this.modal = new SaveLoadPanel(this, {
        mode: 'save',
        depth: 300,
        onPick: (slot) => this.saveTo(slot),
        onClose: () => this.closeModal(),
      });
    }
    if (value === 'quit') this.confirmQuit();
  }

  closeModal() {
    this.modal = null;
    this.nav.setFocused(true);
  }

  saveTo(slot) {
    const res = this.app.saves.save(slot, this.session);
    this.modal?.destroy?.();
    this.closeModal();
    if (res.ok) {
      this.app.audio.ui('save');
      this.app.overlay.toasts.push({ text: `Saved to <y>Slot ${slot}</>.`, icon: 'ledger' });
    } else {
      this.app.audio.ui('buzzer');
      this.app.overlay.toasts.push({ text: `<r>Save failed:</> ${res.reason}`, hold: 3500 });
    }
  }

  async confirmQuit() {
    this.nav.setFocused(false);
    this.modal = new ConfirmPrompt(this, { text: 'Quit to the title screen?\nProgress since your last save will be lost.', depth: 400 });
    const yes = await this.modal.promise;
    this.modal = null;
    if (!yes) {
      this.nav.setFocused(true);
      return;
    }
    this.closing = true;
    this.app.audio.stopMusic({ fade: 0.6 });
    this.app.audio.setAmbience(null);
    await this.app.overlay.fadeOut(500);
    this.app.overlay.reset();
    this.app.endSession();
    this.scene.stop('World');
    this.scene.start('Title');
  }

  close() {
    if (this.closing) return;
    this.closing = true;
    this.app.audio.ui('menu_close');
    this.page?.destroy();
    this.page = null;
    this.shopView?.destroy();
    this.shopView = null;
    this.scene.stop();
    this.scene.resume('World');
  }

  update() {
    if (this.closing) return;
    const input = this.controls;
    if (this.shopView) {
      this.shopView.update(input);
      return;
    }
    if (this.playTime) this.playTime.setText(formatPlayTime(this.session.playTime));
    if (this.modal) {
      this.modal.update(input);
      return;
    }
    if (this.bookMode) {
      if (this.page.update(input) === 'exit' || (input.pressed('menu') && !input.pressed('cancel'))) {
        input.consume('menu');
        this.close();
      }
      return;
    }
    if (this.pageFocused) {
      if (this.page.update(input) === 'exit') {
        this.pageFocused = false;
        this.page.blur?.();
        this.nav.setFocused(true);
      }
      return;
    }
    if (input.pressed('menu') && !input.pressed('cancel')) {
      input.consume('menu');
      this.close();
      return;
    }
    this.nav.update(input);
  }
}
