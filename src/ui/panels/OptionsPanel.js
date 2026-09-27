import { addPanel } from '../Panel.js';
import { addText, setText, centerText, UI_COLORS } from '../text.js';
import { TEXT_SPEEDS, SHAKE_LEVELS, EFFECT_LEVELS, FUME_HAZARD_LEVELS } from '../../systems/settings/Settings.js';
import { DisplayScaler } from '../../platform/display.js';

const ROWS = [
  { key: 'masterVolume', label: 'Master volume', type: 'volume' },
  { key: 'musicVolume', label: 'Music volume', type: 'volume' },
  { key: 'ambienceVolume', label: 'Ambience volume', type: 'volume' },
  { key: 'sfxVolume', label: 'Sound effects', type: 'volume' },
  { key: 'textSpeed', label: 'Text speed', type: 'choice', values: TEXT_SPEEDS, names: { slow: 'Slow', normal: 'Normal', fast: 'Fast', instant: 'Instant' } },
  { key: 'textSound', label: 'Text sounds', type: 'toggle' },
  { key: 'alwaysRun', label: 'Always run', type: 'toggle' },
  { key: 'screenShake', label: 'Screen shake', type: 'choice', values: SHAKE_LEVELS, names: { full: 'Full', reduced: 'Reduced', off: 'Off' } },
  { key: 'effects', label: 'Visual effects', type: 'choice', values: EFFECT_LEVELS, names: { full: 'Full', reduced: 'Reduced' } },
  { key: 'fumeHazard', label: 'Fume hazard', type: 'choice', values: FUME_HAZARD_LEVELS, names: { normal: 'Normal', gentle: 'Gentle', off: 'Off' } },
  { key: 'scaleMode', label: 'Scaling', type: 'choice', values: ['integer', 'fit'], names: { integer: 'Pixel-perfect', fit: 'Fill screen' } },
  { key: 'fullscreen', label: 'Fullscreen', type: 'toggle' },
];

/**
 * Options screen usable from the title and the pause menu.
 * Up/down selects, left/right changes, cancel closes. Changes apply and
 * persist immediately.
 */
export class OptionsPanel {
  constructor(scene, { onClose, depth = 300 }) {
    this.scene = scene;
    this.app = scene.game.app;
    this.onClose = onClose;
    this.depth = depth;
    this.index = 0;
    const x = 40;
    const w = 240;
    const rowH = 14;
    const h = 24 + ROWS.length * rowH + 20;
    const y = Math.max(4, Math.round((224 - h) / 2));
    this.parts = [addPanel(scene, x, y, w, h, { depth })];
    const title = addText(scene, 0, y + 8, 'OPTIONS', { font: 'bold', color: UI_COLORS.heading, depth: depth + 1 });
    centerText(title, x + w / 2);
    this.parts.push(title);
    this.rows = ROWS.map((row, i) => {
      const ry = y + 26 + i * rowH;
      const label = addText(scene, x + 22, ry, row.label, { depth: depth + 1 });
      const value = addText(scene, x + 130, ry, '', { depth: depth + 1 });
      this.parts.push(label, value);
      return { ...row, label, value, y: ry };
    });
    this.cursor = scene.add.image(x + 6, 0, 'ui', 'cursor').setOrigin(0).setDepth(depth + 2);
    this.help = addText(scene, x + 10, y + h - 14, '', { color: UI_COLORS.dim, depth: depth + 1 });
    this.parts.push(this.cursor, this.help);
    this.refresh();
  }

  valueText(row) {
    const v = this.app.settings.get(row.key);
    if (row.type === 'volume') {
      const n = Math.round(v * 10);
      return `${'■'.repeat(0)}${'|'.repeat(n)}${'.'.repeat(10 - n)} ${Math.round(v * 100)}%`;
    }
    if (row.type === 'toggle') return v ? 'On' : 'Off';
    return row.names?.[v] ?? String(v);
  }

  refresh() {
    this.rows.forEach((row, i) => {
      setText(row.value, `◀ ${this.valueText(row)} ▶`, { color: i === this.index ? UI_COLORS.gold : UI_COLORS.text });
      row.label.setTint(i === this.index ? UI_COLORS.gold : UI_COLORS.text);
    });
    this.cursor.y = this.rows[this.index].y - 1;
    setText(this.help, '{btn:left}{btn:right} Change   {btn:cancel} Back'.replace('{btn:left}{btn:right}', '◀▶'), { color: UI_COLORS.dim });
  }

  change(dir) {
    const row = this.rows[this.index];
    const s = this.app.settings;
    const v = s.get(row.key);
    if (row.type === 'volume') s.set(row.key, Math.max(0, Math.min(1, Math.round((v + dir * 0.1) * 10) / 10)));
    else if (row.type === 'toggle') s.set(row.key, !v);
    else {
      const i = row.values.indexOf(v);
      s.set(row.key, row.values[(i + dir + row.values.length) % row.values.length]);
    }
    if (row.key === 'scaleMode') this.app.display?.setMode(s.get('scaleMode'));
    if (row.key === 'fullscreen') {
      this.app.display?.setFullscreen(s.get('fullscreen')).then((ok) => {
        if (!ok && s.get('fullscreen')) s.set('fullscreen', false);
        this.refresh();
      });
    }
    this.app.audio.ui(row.type === 'volume' ? 'cursor' : 'confirm', { volume: row.key === 'sfxVolume' || row.key === 'masterVolume' ? 1.2 : 1 });
    this.refresh();
  }

  update(input) {
    if (input.repeat('up')) {
      this.index = (this.index + this.rows.length - 1) % this.rows.length;
      this.app.audio.ui('cursor');
      this.refresh();
    } else if (input.repeat('down')) {
      this.index = (this.index + 1) % this.rows.length;
      this.app.audio.ui('cursor');
      this.refresh();
    } else if (input.repeat('left')) this.change(-1);
    else if (input.repeat('right') || input.pressed('confirm')) {
      input.consume('confirm');
      this.change(1);
    } else if (input.pressed('cancel') || input.pressed('menu')) {
      input.consume('cancel');
      input.consume('menu');
      this.app.audio.ui('cancel');
      this.destroy();
      this.onClose?.();
    }
  }

  destroy() {
    this.parts.forEach((p) => p.destroy());
  }
}

export { DisplayScaler };
