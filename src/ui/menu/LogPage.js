import { addPanel } from '../Panel.js';
import { addText, centerText, UI_COLORS } from '../text.js';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../../config/constants.js';
import { ListMenu } from '../ListMenu.js';
import { TextReader } from './TextReader.js';
import { UiLayer } from './UiLayer.js';
import { logEntries, unseenEntryIds, markEntrySeen, severityMarkup } from '../../systems/logs/logbook.js';
import { resolveVariant } from '../../systems/story/progress.js';

/**
 * A logbook (data/logs): entries down the left, the selected entry's
 * fields below (location, severity, probable source, notes...). Entries the
 * captain hasn't read yet are marked NEW. Used as a pause-menu page and on
 * its own when the book is opened in the world.
 */
export class LogPage {
  constructor(scene, rect, { logId, entry = null } = {}) {
    this.scene = scene;
    this.app = scene.game.app;
    this.rect = rect;
    this.logId = logId;
    this.log = this.app.content.logs.require(logId);
    this.layer = new UiLayer(scene);
    this.detail = new UiLayer(scene);
    this.menu = null;
    this.focused = false;
    this.startEntry = entry;
  }

  get session() {
    return this.app.session;
  }

  render() {
    this.layer.clear();
    this.menu?.destroy();
    const { scene, layer, rect, log } = this;
    const D = 20;
    layer.add(addText(scene, rect.x + 10, rect.y + 8, log.title, { font: 'bold', color: UI_COLORS.heading, depth: D + 1 }));
    const keeper = log.keeper ? this.app.content.npcs.get(log.keeper) : null;
    const byline = log.byline ?? (keeper ? `<k>Kept by</> ${resolveVariant(keeper, this.session).name}` : '');
    if (byline) layer.add(addText(scene, rect.x + 10, rect.y + 21, byline, { depth: D + 1, maxWidth: rect.w - 20 }));
    this.entries = logEntries(log, this.session);
    const unseen = new Set(unseenEntryIds(log, this.logId, this.session));
    const listTop = rect.y + 38;
    const rows = Math.max(4, Math.floor((rect.h - 138) / 12));
    if (!this.entries.length) layer.add(addText(scene, rect.x + 16, listTop, '<k>No entries yet.</>', { depth: D + 1 }));
    const items = this.entries.map((e) => ({ label: e.title, value: e.id, right: unseen.has(e.id) ? '<y>NEW</>' : '' }));
    let index = 0;
    if (this.startEntry) index = Math.max(0, this.entries.findIndex((e) => e.id === this.startEntry));
    else if (unseen.size) index = Math.max(0, this.entries.findIndex((e) => unseen.has(e.id)));
    this.menu = new ListMenu(scene, {
      x: rect.x + 24,
      y: listTop,
      width: rect.w - 34,
      rows,
      depth: D + 1,
      items,
      index,
      onChange: () => this.describe(),
      onSelect: () => {},
      onCancel: () => {
        this.exitRequested = true;
      },
    });
    this.menu.setFocused(this.focused);
    this.menu.setVisible(items.length > 0);
    this.detailTop = listTop + rows * 12 + 4;
    layer.add(addPanel(scene, rect.x + 4, this.detailTop, rect.w - 8, rect.y + rect.h - this.detailTop - 4, { style: 'inset', depth: D }));
    this.describe();
  }

  describe() {
    this.detail.clear();
    const e = this.entries?.[this.menu?.index ?? 0];
    if (!e) return;
    const { scene, rect, log } = this;
    const D = 21;
    // Reading an entry clears its NEW mark.
    if (this.focused || this.startEntry) {
      markEntrySeen(this.session, this.logId, e.id);
      const item = this.menu.items[this.menu.index];
      if (item?.right) {
        item.right = '';
        this.menu.refreshLabels();
      }
    }
    const x = rect.x + 12;
    const w = rect.w - 24;
    const lines = (log.fields ?? []).map((f) => {
      const raw = e[f.id];
      if (raw === undefined || raw === null || raw === '') return null;
      const value = f.id === 'severity' || f.scale ? severityMarkup(log, raw) : f.quote ? `"${raw}"` : raw;
      return `<k>${f.label}</>  ${value}`;
    }).filter(Boolean);
    this.fields = [...lines];
    // A title too long for the list shows whole here, first.
    if (this.menu.items[this.menu.index]?.clipped) lines.unshift(`<y>${e.title}</>`);
    // Fit what fits in the panel; the rest is a Confirm away (the whole entry, a page at a time).
    const bottom = rect.y + rect.h - 8;
    const fit = (limit) => {
      this.detail.clear();
      let y = this.detailTop + 6;
      for (const line of lines) {
        const room = Math.floor((limit - y) / 11);
        if (room < 1) return true;
        const t = this.detail.add(addText(scene, x, y, line, { depth: D, maxWidth: w, maxLines: room }));
        if (t.truncated) return true;
        y += Math.max(1, t.text.split('\n').length) * 11 + 2;
      }
      return false;
    };
    this.truncated = fit(e.insert ? bottom - 12 : bottom);
    if (this.truncated && !e.insert) this.truncated = fit(bottom - 12);
    // An entry with a picture (a crayon forecast map) can be looked at full size.
    const label = this.truncated ? 'Read all' : e.insert ? log.viewLabel ?? 'View the map' : null;
    if (label) {
      const hint = this.detail.add(addText(scene, 0, rect.y + rect.h - 18, `{btn:confirm} ${label}`, { depth: D, color: UI_COLORS.gold }));
      hint.x = rect.x + rect.w - 12 - hint.textWidth;
    }
  }

  /** The whole entry, a page at a time (then its picture, if it has one). */
  openReader(e) {
    this.reader = new TextReader(this.scene, {
      title: e.title,
      paragraphs: this.fields,
      closeLabel: e.insert ? this.log.viewLabel ?? 'View the map' : null,
    });
  }

  /** The selected entry's picture, full size over the menu; any button closes it. */
  openPicture(e) {
    const { scene } = this;
    const D = 900;
    const dim = scene.add.rectangle(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 0x05040a, 0.94).setOrigin(0).setDepth(D);
    const img = scene.add.image(SCREEN_WIDTH / 2, 10, 'inserts', e.insert).setOrigin(0.5, 0).setDepth(D + 1);
    const parts = [dim, img];
    const caption = e.caption ?? e.title;
    if (caption) {
      const t = addText(scene, 0, Math.min(SCREEN_HEIGHT - 30, img.y + img.height + 6), caption, { color: 0xfff4e0, depth: D + 2, maxWidth: SCREEN_WIDTH - 40 });
      centerText(t, SCREEN_WIDTH / 2);
      parts.push(t);
    }
    const close = addText(scene, 0, SCREEN_HEIGHT - 14, '{btn:confirm}', { depth: D + 2 });
    close.x = SCREEN_WIDTH - close.textWidth - 8;
    parts.push(close);
    parts.forEach((p) => p.setAlpha(0));
    scene.tweens.add({ targets: parts, alpha: (t) => (t === dim ? 0.94 : 1), duration: 160 });
    this.app.audio.ui('confirm');
    this.picture = { parts, lock: 220 };
  }

  closePicture() {
    this.picture?.parts.forEach((p) => p.destroy());
    this.picture = null;
    this.app.audio.ui('cancel');
  }

  focus() {
    if (!this.entries?.length) return false;
    this.focused = true;
    this.exitRequested = false;
    this.menu?.setFocused(true);
    this.describe();
    return true;
  }

  blur() {
    this.focused = false;
    this.menu?.setFocused(false);
  }

  update(input) {
    if (this.reader) {
      const done = this.reader.update(input);
      if (done) {
        this.reader.destroy();
        this.reader = null;
        const e = this.entries?.[this.menu?.index ?? 0];
        if (done === 'confirm' && e?.insert) this.openPicture(e);
      }
      return null;
    }
    if (this.picture) {
      this.picture.lock -= 16;
      if (this.picture.lock <= 0 && (input.pressed('confirm') || input.pressed('cancel'))) {
        input.consume('confirm');
        input.consume('cancel');
        this.closePicture();
      }
      return null;
    }
    const e = this.entries?.[this.menu?.index ?? 0];
    if (this.focused && (e?.insert || this.truncated) && input.pressed('confirm')) {
      input.consume('confirm');
      if (this.truncated) this.openReader(e);
      else this.openPicture(e);
      return null;
    }
    this.menu?.update(input);
    if (this.exitRequested || (!this.menu?.visible && input.pressed('cancel'))) {
      input.consume('cancel');
      this.exitRequested = false;
      return 'exit';
    }
    return null;
  }

  destroy() {
    this.reader?.destroy();
    this.reader = null;
    if (this.picture) this.picture.parts.forEach((p) => p.destroy());
    this.picture = null;
    this.layer.clear();
    this.detail.clear();
    this.menu?.destroy();
  }
}
