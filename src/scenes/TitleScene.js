import { BaseScene } from './BaseScene.js';
import { loadSlotAndEnter } from './sceneFlow.js';
import { addText, centerText, UI_COLORS } from '../ui/text.js';
import { addPanel } from '../ui/Panel.js';
import { ListMenu } from '../ui/ListMenu.js';
import { OptionsPanel } from '../ui/panels/OptionsPanel.js';
import { SaveLoadPanel } from '../ui/panels/SaveLoadPanel.js';
import { ControllerSetupPanel } from '../ui/panels/ControllerSetupPanel.js';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../config/constants.js';

/**
 * Title screen: sunset over the sea, the ship sailing, the logo, then
 * New Game / Continue / Load Game / Options.
 */
export class TitleScene extends BaseScene {
  constructor() {
    super('Title');
  }

  create() {
    this.app.overlay?.reset();
    this.app.overlay?.fadeIn(0);
    this.app.audio.setAmbience(null);
    this.app.audio.setMusicFilter(null);
    this.cameras.main.setBackgroundColor('#1a1030');
    this.add.image(0, 0, 'title_sky').setOrigin(0);
    this.sea = this.add.image(0, SCREEN_HEIGHT - 74, 'title_sea', 0).setOrigin(0);
    this.ship = this.add.image(18, 62, 'title_ship').setOrigin(0);
    this.time.addEvent({ delay: 420, loop: true, callback: () => this.sea.setFrame(this.sea.frame.name === 0 ? 1 : 0) });
    this.tweens.add({ targets: this.ship, y: '+=2', duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.tweens.add({ targets: this.ship, x: '+=6', duration: 9000, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    // drifting gulls
    for (let i = 0; i < 3; i++) {
      const g = this.add.sprite(-20 - i * 40, 40 + i * 14, 'fx', 'gull_0').play('fx:gull').setAlpha(0.8);
      this.tweens.add({ targets: g, x: SCREEN_WIDTH + 30, duration: 16000 + i * 3000, repeat: -1, delay: i * 2500 });
    }
    this.logo = this.add.image(SCREEN_WIDTH / 2, 50, 'logo').setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: this.logo, alpha: 1, y: 54, duration: 900, ease: 'Quad.Out' });
    this.version = addText(this, 4, SCREEN_HEIGHT - 12, 'Story Phase 5 build 0.5.0', { color: 0x6c5a70 });
    this.state = 'press';
    this.press = addText(this, 0, 160, 'Press {btn:confirm}', { color: 0xfff4e0 });
    centerText(this.press, SCREEN_WIDTH / 2);
    this.blink = this.tweens.add({ targets: this.press, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });
    this.panel = null;
    this.input.keyboard?.enabled;
    this.app.bus.on('input:device', this.onDevice, this);
    this.events.once('shutdown', () => this.app.bus.off('input:device', this.onDevice, this));
    if (this.app.titleSeen) this.showMenu();
  }

  onDevice() {
    if (this.state === 'press') {
      this.press.setText('');
      this.press.destroy();
      this.press = addText(this, 0, 160, 'Press {btn:confirm}', { color: 0xfff4e0 });
      centerText(this.press, SCREEN_WIDTH / 2);
      this.blink.remove();
      this.blink = this.tweens.add({ targets: this.press, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });
    }
  }

  showMenu() {
    this.app.titleSeen = true;
    this.state = 'menu';
    this.blink?.remove();
    this.press?.destroy();
    this.app.audio.unlock();
    this.app.audio.playMusic(this.app.content.game.titleMusic, { fade: 0.5 });
    const hasSave = this.app.saves.hasAnySave();
    const items = [
      { label: 'New Game', value: 'new' },
      { label: 'Continue', value: 'continue', disabled: !hasSave },
      { label: 'Load Game', value: 'load', disabled: !hasSave },
      { label: 'Options', value: 'options' },
    ];
    this.menuPanel = addPanel(this, SCREEN_WIDTH / 2 - 52, 128, 104, 60, { depth: 5 });
    this.menu = new ListMenu(this, {
      x: SCREEN_WIDTH / 2 - 32,
      y: 136,
      width: 80,
      rows: 4,
      depth: 6,
      items,
      index: hasSave ? 1 : 0,
      onSelect: (item) => this.choose(item.value),
    });
  }

  choose(value) {
    if (value === 'new') this.startNew();
    if (value === 'continue') this.loadSlot(this.app.saves.latestSlot());
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
    if (value === 'options') {
      this.menu.setFocused(false);
      this.panel = new OptionsPanel(this, {
        depth: 20,
        onClose: () => {
          this.panel = null;
          this.menu.setFocused(true);
        },
      });
    }
  }

  async startNew() {
    this.state = 'leaving';
    const session = this.app.startNewGame();
    this.app.audio.stopMusic({ fade: 0.8 });
    await this.app.overlay.fadeOut(600);
    const loc = session.location;
    this.scene.start('World', { map: loc.map, spawn: loc.spawn, x: loc.x, y: loc.y, facing: loc.facing, newGame: true, fadeIn: false });
  }

  async loadSlot(slot) {
    if (this.state === 'leaving') return;
    this.state = 'leaving';
    const ok = await loadSlotAndEnter(this, slot);
    if (!ok) this.state = 'menu';
  }

  /**
   * A controller the browser doesn't map to the standard layout, and nobody
   * has set up: its first button press opens the controller setup (once per
   * controller per visit; declining keeps the automatic layout for good).
   */
  offerControllerSetup(input) {
    const press = input.padPresses?.find((p) => !p.recognised);
    if (!press || this.panel || this.state === 'leaving') return false;
    this.offered ??= new Set();
    if (this.offered.has(press.id)) return false;
    this.offered.add(press.id);
    input.consumeAll();
    if (this.state === 'press') this.showMenu();
    this.menu.setFocused(false);
    this.panel = new ControllerSetupPanel(this, {
      depth: 30,
      padId: press.id,
      offered: true,
      onClose: () => {
        this.panel = null;
        this.menu.setFocused(true);
      },
    });
    return true;
  }

  update() {
    const input = this.controls;
    if (this.offerControllerSetup(input)) return;
    if (this.state === 'press') {
      if (input.pressed('confirm') || input.pressed('menu')) {
        input.consumeAll();
        this.app.audio.unlock();
        this.showMenu();
        this.app.audio.ui('confirm');
      }
      return;
    }
    if (this.state !== 'menu') return;
    if (this.panel) this.panel.update(input);
    else this.menu.update(input);
  }
}
