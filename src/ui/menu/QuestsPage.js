import { addPanel } from '../Panel.js';
import { addText, UI_COLORS } from '../text.js';
import { ListMenu } from '../ListMenu.js';
import { UiLayer } from './UiLayer.js';
import { TabBar } from './TabBar.js';
import { resolveVariant } from '../../systems/story/progress.js';

const lineCount = (t) => t.text.split('\n').length;

const TABS = [
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
];

/** Quest log: active / completed lists with objectives and rewards. */
export class QuestsPage {
  constructor(scene, rect) {
    this.scene = scene;
    this.app = scene.game.app;
    this.rect = rect;
    this.layer = new UiLayer(scene);
    this.detail = new UiLayer(scene);
    this.tabIndex = 0;
    this.index = 0;
    this.menu = null;
    this.tabs = null;
    this.focused = false;
  }

  quests() {
    const q = this.app.session.quests;
    const list = this.tabIndex === 0 ? q.activeQuests() : q.completedQuests();
    // Main story first, then side quests.
    return [...list].sort((a, b) => (a.category === 'main' ? 0 : 1) - (b.category === 'main' ? 0 : 1));
  }

  render() {
    this.layer.clear();
    this.menu?.destroy();
    this.menu = null;
    this.tabs?.destroy();
    const { scene, layer, rect } = this;
    const D = 20;
    this.tabs = new TabBar(scene, {
      x: rect.x + 4,
      y: rect.y + 8,
      width: rect.w - 8,
      tabs: TABS,
      index: this.tabIndex,
      depth: D + 1,
      onChange: (_t, i) => {
        this.tabIndex = i;
        this.index = 0;
        this.render();
      },
    });
    const quests = this.quests();
    const items = quests.map((q) => ({ label: `${q.category === 'main' ? '<y>★</> ' : '<k>•</> '}${q.title}`, value: q.id }));
    if (!items.length) layer.add(addText(scene, rect.x + 16, rect.y + 32, this.tabIndex === 0 ? '<k>No quests in progress.</>' : '<k>Nothing finished yet.</>', { depth: D + 1 }));
    this.menu = new ListMenu(scene, {
      x: rect.x + 24,
      y: rect.y + 30,
      width: rect.w - 34,
      rows: 4,
      rowHeight: 12,
      depth: D + 1,
      items,
      index: Math.min(this.index, Math.max(0, items.length - 1)),
      onChange: (_item, i) => {
        this.index = i;
        this.renderDetail();
      },
      onSelect: () => {},
      onCancel: () => {
        this.exitRequested = true;
      },
    });
    this.menu.sound = true;
    this.menu.setFocused(this.focused);
    this.menu.setVisible(items.length > 0);
    layer.add(addPanel(scene, rect.x + 4, rect.y + 82, rect.w - 8, rect.h - 86, { style: 'inset', depth: D }));
    this.renderDetail();
  }

  renderDetail() {
    this.detail.clear();
    const quest = this.quests()[this.menu?.index ?? 0];
    if (!quest) return;
    const { scene, rect } = this;
    const D = 21;
    const qs = this.app.session.quests;
    const x = rect.x + 12;
    let y = rect.y + 89;
    this.detail.add(addText(scene, x, y, quest.title, { font: 'bold', color: UI_COLORS.heading, depth: D }));
    const npc = quest.giver ? this.app.content.npcs.get(quest.giver) : null;
    const giver = !quest.giver ? null : npc ? resolveVariant(npc, this.app.session).name : this.app.session?.party.nameOf(quest.giver);
    if (giver) {
      const g = this.detail.add(addText(scene, 0, y + 1, `<k>from</> ${giver}`, { depth: D }));
      g.x = rect.x + rect.w - 12 - g.textWidth;
    }
    y += 14;
    const width = rect.w - 24;
    const bottom = rect.y + rect.h - 6;
    // Long objectives and rewards wrap (under their mark), so size them first
    // and give the description whatever room is left.
    const r = quest.rewards ?? {};
    const parts = [];
    if (r.xp) parts.push(`${r.xp} XP`);
    if (r.gold) parts.push(`${r.gold} gold`);
    for (const it of r.items ?? []) parts.push(this.app.content.items.get(it.id)?.name ?? it.id);
    const reward = parts.length ? this.detail.add(addText(scene, x, 0, `<k>Reward:</> ${parts.join(', ')}`, { maxWidth: width, depth: D })) : null;
    const rewardH = reward ? lineCount(reward) * 11 + 2 : 0;
    const lines = qs.visibleObjectives(quest.id).map((o) => {
      const count = o.count > 1 ? ` (${Math.min(o.progress, o.count)}/${o.count})` : '';
      const mark = this.detail.add(addText(scene, x, 0, o.done ? '<g>✓</>' : '<y>▶</>', { depth: D }));
      const t = this.detail.add(addText(scene, x + 10, 0, o.done ? `<k>${o.def.text}${count}</>` : `${o.def.text}${count}`, { maxWidth: width - 10, depth: D }));
      return { mark, t, h: lineCount(t) * 11 };
    });
    const objectivesH = lines.reduce((n, l) => n + l.h, 0);
    const room = bottom - rewardH - y - objectivesH - 5;
    let desc = this.detail.add(addText(scene, x, y, quest.description ?? quest.summary ?? '', { maxWidth: width, depth: D, color: 0xdcd4c4 }));
    if (lineCount(desc) * 11 > room && quest.summary) {
      // Not enough room for the full description and every objective: use the summary.
      desc.destroy();
      desc = this.detail.add(addText(scene, x, y, quest.summary, { maxWidth: width, depth: D, color: 0xdcd4c4 }));
    }
    y += lineCount(desc) * 11 + 5;
    let full = false;
    for (const l of lines) {
      const fits = !full && y + l.h <= bottom - rewardH;
      full = !fits;
      l.mark.setVisible(fits).y = y;
      l.t.setVisible(fits).y = y;
      if (fits) y += l.h;
    }
    if (reward) reward.y = bottom - rewardH + 2;
  }

  focus() {
    this.focused = true;
    this.exitRequested = false;
    this.menu?.setFocused(true);
    return true;
  }

  blur() {
    this.focused = false;
    this.menu?.setFocused(false);
  }

  update(input) {
    if (this.tabs.update(input, { useArrows: true })) return null;
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
    this.tabs?.destroy();
  }
}
