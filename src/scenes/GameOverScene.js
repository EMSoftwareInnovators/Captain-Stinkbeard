import { BaseScene } from './BaseScene.js';
import { loadSlotAndEnter } from './sceneFlow.js';
import { addPanel } from '../ui/Panel.js';
import { addText, centerText, UI_COLORS } from '../ui/text.js';
import { ListMenu } from '../ui/ListMenu.js';
import { SaveLoadPanel } from '../ui/panels/SaveLoadPanel.js';
import { SCREEN_WIDTH, SCREEN_HEIGHT, AUTOSAVE_SLOT } from '../config/constants.js';

/**
 * Shown when the party falls in a real (lethal) battle. Offers a retry from
 * the autosave, loading another save, or returning to the title.
 */
export class GameOverScene extends BaseScene {
  constructor() {
    super('GameOver');
  }

  create() {
    const app = this.app;
    this.state = 'intro';
    this.panel = null;
    app.overlay.reset();
    this.cameras.main.setBackgroundColor('#07060b');
    this.add.image(0, 0, 'backdrop_main_deck').setOrigin(0).setTint(0x302838).setAlpha(0.55);
    this.add.rectangle(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 0x07060b, 0.55).setOrigin(0);
    const title = addText(this, 0, 58, 'GAME OVER', { font: 'big', color: 0xe05a48 });
    centerText(title, SCREEN_WIDTH / 2);
    const sub = addText(this, 0, 86, 'The crew will tell this one differently.', { color: 0xbcb0c0 });
    centerText(sub, SCREEN_WIDTH / 2);
    [title, sub].forEach((p) => p.setAlpha(0));
    this.tweens.add({ targets: [title, sub], alpha: 1, duration: 900 });
    app.audio.playMusic('game_over', { fade: 0.2, restart: true });
    app.overlay.fadeIn(600);

    const statuses = new Map(app.saves.listSlots().map((i) => [i.slot, i.status]));
    const hasAuto = statuses.get(AUTOSAVE_SLOT) === 'ok';
    const hasAny = [...statuses.values()].some((s) => s === 'ok');
    const items = [
      { label: 'Try Again', value: 'retry', disabled: !hasAuto },
      { label: 'Load Game', value: 'load', disabled: !hasAny },
      { label: 'Title Screen', value: 'title' },
    ];
    this.time.delayedCall(900, () => {
      this.menuPanel = addPanel(this, SCREEN_WIDTH / 2 - 56, 120, 112, 48, { depth: 5 });
      this.menu = new ListMenu(this, {
        x: SCREEN_WIDTH / 2 - 34,
        y: 128,
        width: 84,
        rows: 3,
        depth: 6,
        items,
        index: hasAuto ? 0 : 2,
        onSelect: (item) => this.choose(item.value),
      });
      this.state = 'menu';
      this.controls.consumeAll();
    });
    if (hasAuto) {
      const note = addText(this, 0, 176, 'Try Again resumes from your last autosave.', { color: UI_COLORS.dim });
      centerText(note, SCREEN_WIDTH / 2);
    }
  }

  async choose(value) {
    if (value === 'retry') this.loadSlot(AUTOSAVE_SLOT);
    if (value === 'load') {
      this.menu.setFocused(false);
      this.panel = new SaveLoadPanel(this, {
        mode: 'load',
        depth: 20,
        onPick: (slot) => this.loadSlot(slot),
        onClose: () => {
          this.panel = null;
          this.menu.setFocused(true);
        },
      });
    }
    if (value === 'title') {
      this.state = 'leaving';
      this.app.audio.stopMusic({ fade: 0.6 });
      await this.app.overlay.fadeOut(500);
      this.app.endSession();
      this.scene.start('Title');
    }
  }

  async loadSlot(slot) {
    if (this.state === 'leaving') return;
    this.state = 'leaving';
    const ok = await loadSlotAndEnter(this, slot);
    if (!ok) this.state = 'menu';
  }

  update() {
    if (this.state !== 'menu') return;
    const input = this.controls;
    if (this.panel) this.panel.update(input);
    else this.menu.update(input);
  }
}
