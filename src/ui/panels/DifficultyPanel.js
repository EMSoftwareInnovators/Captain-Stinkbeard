import { addPanel } from '../Panel.js';
import { addText, setText, centerText, UI_COLORS } from '../text.js';
import { difficultyList, classicBarDef, TIMING_ASSIST_LEVELS, DEFAULT_DIFFICULTY } from '../../systems/challenge/difficulty.js';
import { challengeLog } from '../../systems/challenge/runner.js';

/**
 * Difficulty and timing assists (docs/gameplay-overhaul/08-difficulty-and-accessibility.md).
 * Keyboard and pad only; one press is one action.
 *
 *   mode 'new'      before a new game: Deckhand / Captain / Brutal, Captain
 *                   highlighted whatever was played last. Confirm sets sail
 *                   (onPick), Cancel goes back to the title.
 *   mode 'options'  from Options (title or pause menu): the difficulty and the
 *                   two timing assists, left / right to change, saved at once.
 *
 * The campaign is being rebuilt chapter by chapter, so the panel says plainly
 * that difficulty only reaches the challenges built for it.
 */
export const DIFFICULTY_NOTICE = 'Only challenges rebuilt so far follow it. The rest of the voyage plays as it always has, for now.';
export const ASSIST_NOTICE = 'Assists go with any difficulty. They ease the timing; fumbles and slips still count.';
export const ACTIVE_NOTICE = '<y>A challenge is under way:</> a new difficulty applies to the next one, an assist to the next try.';

/** What the description area says for a row's current value (exported for the text-fit test). */
export function difficultyTexts(content) {
  const out = difficultyList(content).map((d) => d.summary);
  for (const lv of TIMING_ASSIST_LEVELS) out.push(assistLevel(content, lv)?.summary ?? '');
  const classic = classicBarDef(content)?.summary ?? {};
  out.push(classic.on ?? '', classic.off ?? '');
  return out.filter(Boolean);
}

const OPEN_LOCK_MS = 150;

/** A timing-assist level's entry in data/difficulty/assists.json ("off" included). */
const assistLevel = (content, level) => content?.assists?.get?.('timingAssist')?.[level] ?? null;

export class DifficultyPanel {
  constructor(scene, { mode = 'options', onPick = null, onClose = null, depth = 300 } = {}) {
    this.scene = scene;
    this.app = scene.game.app;
    this.mode = mode;
    this.onPick = onPick;
    this.onClose = onClose;
    this.depth = depth;
    this.done = false;
    this.openedAt = null;
    this.list = difficultyList(this.app.content);
    const x = 20;
    const w = 280;
    const h = 168;
    const y = Math.round((224 - h) / 2);
    this.box = { x, y, w, h };
    this.parts = [addPanel(scene, x, y, w, h, { depth })];
    const title = addText(scene, 0, y + 8, mode === 'new' ? 'CHOOSE YOUR DIFFICULTY' : 'DIFFICULTY AND ASSISTS', { font: 'bold', color: UI_COLORS.heading, depth: depth + 1 });
    centerText(title, x + w / 2);
    this.parts.push(title);
    this.rows = (mode === 'new' ? this.newRows() : this.optionRows()).map((row, i) => {
      const ry = y + 26 + i * 13;
      const label = addText(scene, x + 22, ry, row.label, { depth: depth + 1 });
      const value = addText(scene, x + 112, ry, '', { depth: depth + 1 });
      this.parts.push(label, value);
      return { ...row, label, value, y: ry };
    });
    this.index = mode === 'new' ? Math.max(0, this.rows.findIndex((r) => r.id === DEFAULT_DIFFICULTY)) : 0;
    this.cursor = scene.add.image(x + 6, 0, 'ui', 'cursor').setOrigin(0).setDepth(depth + 2);
    this.desc = addText(scene, x + 12, y + 72, '', { depth: depth + 1, maxWidth: w - 24, maxLines: 4 });
    this.notice = addText(scene, x + 12, y + 120, '', { color: UI_COLORS.dim, depth: depth + 1, maxWidth: w - 24, maxLines: 2 });
    this.help = addText(scene, 0, y + h - 14, '', { color: UI_COLORS.dim, depth: depth + 1 });
    this.parts.push(this.cursor, this.desc, this.notice, this.help);
    this.refresh();
  }

  newRows() {
    return this.list.map((d) => ({ id: d.id, kind: 'pick', label: d.label, tagline: d.tagline, isDefault: d.default }));
  }

  optionRows() {
    return [
      { id: 'difficulty', kind: 'choice', label: 'Difficulty', values: this.list.map((d) => d.id) },
      { id: 'timingAssist', kind: 'choice', label: 'Timing assist', values: [...TIMING_ASSIST_LEVELS] },
      { id: 'classicBar', kind: 'toggle', label: 'Classic bar' },
    ];
  }

  /** A challenge is running right now (an opted-in Shark Duty watch: the captain can pause during one). */
  challengeActive() {
    const s = this.app.session;
    return !!s && (challengeLog(s).active.size > 0);
  }

  valueText(row) {
    const s = this.app.settings;
    if (row.kind === 'pick') return `<k>${row.tagline}</>${row.isDefault ? '  <y>(default)</>' : ''}`;
    if (row.id === 'difficulty') return this.list.find((d) => d.id === s.get('difficulty'))?.label ?? s.get('difficulty');
    if (row.id === 'timingAssist') return assistLevel(this.app.content, s.get('timingAssist'))?.label ?? s.get('timingAssist');
    return s.get('classicBar') ? 'On' : 'Off';
  }

  description(row) {
    const s = this.app.settings;
    const c = this.app.content;
    if (row.kind === 'pick') return this.list.find((d) => d.id === row.id)?.summary ?? '';
    if (row.id === 'difficulty') return this.list.find((d) => d.id === s.get('difficulty'))?.summary ?? '';
    if (row.id === 'timingAssist') return assistLevel(c, s.get('timingAssist'))?.summary ?? '';
    return classicBarDef(c)?.summary?.[s.get('classicBar') ? 'on' : 'off'] ?? '';
  }

  refresh() {
    this.rows.forEach((row, i) => {
      const sel = i === this.index;
      const text = row.kind === 'pick' ? this.valueText(row) : `◀ ${this.valueText(row)} ▶`;
      setText(row.value, text, { color: row.kind === 'pick' ? UI_COLORS.text : sel ? UI_COLORS.gold : UI_COLORS.text });
      row.label.setTint(sel ? UI_COLORS.gold : UI_COLORS.text);
    });
    this.cursor.y = this.rows[this.index].y - 1;
    const row = this.rows[this.index];
    setText(this.desc, this.description(row));
    const notice = this.challengeActive() ? ACTIVE_NOTICE : row.id === 'timingAssist' || row.id === 'classicBar' ? ASSIST_NOTICE : DIFFICULTY_NOTICE;
    setText(this.notice, notice, { color: UI_COLORS.dim });
    setText(this.help, this.mode === 'new' ? '{btn:confirm} Set sail   {btn:cancel} Back' : '◀▶ Change   {btn:cancel} Back', { color: UI_COLORS.dim });
    centerText(this.help, this.box.x + this.box.w / 2);
  }

  change(dir) {
    const row = this.rows[this.index];
    const s = this.app.settings;
    if (row.kind === 'toggle') s.set(row.id, !s.get(row.id));
    else {
      const i = row.values.indexOf(s.get(row.id));
      s.set(row.id, row.values[(i + dir + row.values.length) % row.values.length]);
    }
    this.app.audio.ui('confirm');
    this.refresh();
  }

  close(picked = null) {
    if (this.done) return;
    this.done = true;
    this.destroy();
    if (picked) this.onPick?.(picked);
    else this.onClose?.();
  }

  update(input) {
    if (this.done) return;
    // The press that opened the panel (and a bounce of it) never counts here.
    this.openedAt ??= input.now ?? 0;
    const settling = (input.now ?? 0) - this.openedAt < OPEN_LOCK_MS;
    if (input.repeat('up')) {
      this.index = (this.index + this.rows.length - 1) % this.rows.length;
      this.app.audio.ui('cursor');
      this.refresh();
    } else if (input.repeat('down')) {
      this.index = (this.index + 1) % this.rows.length;
      this.app.audio.ui('cursor');
      this.refresh();
    } else if (this.mode === 'options' && input.repeat('left')) this.change(-1);
    else if (this.mode === 'options' && (input.repeat('right') || (input.pressed('confirm') && !settling))) {
      input.consume('confirm');
      this.change(1);
    } else if (this.mode === 'new' && input.pressed('confirm') && !settling) {
      input.consume('confirm');
      const id = this.rows[this.index].id;
      this.app.settings.set('difficulty', id);
      this.app.audio.ui('confirm');
      this.close(id);
    } else if ((input.pressed('cancel') || input.pressed('menu')) && !settling) {
      input.consume('cancel');
      input.consume('menu');
      this.app.audio.ui('cancel');
      this.close();
    }
  }

  destroy() {
    this.parts.forEach((p) => p.destroy());
    this.parts = [];
  }
}
