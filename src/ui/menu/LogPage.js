import { addPanel } from '../Panel.js';
import { addText, UI_COLORS } from '../text.js';
import { ListMenu } from '../ListMenu.js';
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
    let y = this.detailTop + 6;
    const x = rect.x + 12;
    const w = rect.w - 24;
    for (const f of log.fields ?? []) {
      const raw = e[f.id];
      if (raw === undefined || raw === null || raw === '') continue;
      const value = f.id === 'severity' ? severityMarkup(log, raw) : f.quote ? `"${raw}"` : raw;
      const t = this.detail.add(addText(scene, x, y, `<k>${f.label}</>  ${value}`, { depth: D, maxWidth: w }));
      y += Math.max(1, t.text.split('\n').length) * 11 + 2;
    }
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
    this.menu?.update(input);
    if (this.exitRequested || (!this.menu?.visible && input.pressed('cancel'))) {
      input.consume('cancel');
      this.exitRequested = false;
      return 'exit';
    }
    return null;
  }

  destroy() {
    this.layer.clear();
    this.detail.clear();
    this.menu?.destroy();
  }
}
