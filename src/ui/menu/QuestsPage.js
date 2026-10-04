import { addPanel } from '../Panel.js';
import { addText, UI_COLORS } from '../text.js';
import { ListMenu } from '../ListMenu.js';
import { UiLayer } from './UiLayer.js';
import { TabBar } from './TabBar.js';
import { TextReader } from './TextReader.js';
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
      // The whole quest, when the panel below can't show all of it.
      onSelect: () => this.openReader(),
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
    // Everything that fits; if something doesn't, lay it out again leaving a line for "Read all".
    this.cut = this.layoutDetail(quest, 0);
    if (this.cut) {
      this.detail.clear();
      this.layoutDetail(quest, 12);
      const { scene, rect } = this;
      const hint = this.detail.add(addText(scene, 0, this.hintY, '{btn:confirm} Read all', { depth: 21, color: UI_COLORS.gold }));
      hint.x = rect.x + rect.w - 12 - hint.textWidth;
    }
  }

  /** Lays out a quest's details in the panel, `reserve` px short at the bottom. Returns true if anything was cut. */
  layoutDetail(quest, reserve) {
    const { scene, rect } = this;
    const D = 21;
    const qs = this.app.session.quests;
    const x = rect.x + 12;
    let y = rect.y + 89;
    const width = rect.w - 24;
    const title = this.detail.add(addText(scene, x, y, quest.title, { font: 'bold', color: UI_COLORS.heading, depth: D, maxWidth: width, maxLines: 2 }));
    if (lineCount(title) > 1) y += 12; // a long title takes two lines
    const npc = quest.giver ? this.app.content.npcs.get(quest.giver) : null;
    const giver = !quest.giver ? null : npc ? resolveVariant(npc, this.app.session).name : this.app.session?.party.nameOf(quest.giver);
    if (giver) {
      // Beside the title when there's room, else on the line under it.
      const g = this.detail.add(addText(scene, 0, y + 1, `<k>from</> ${giver}`, { depth: D, clipWidth: width }));
      if (lineCount(title) === 1 && title.textWidth + g.textWidth + 10 <= width) g.x = rect.x + rect.w - 12 - g.textWidth;
      else {
        g.x = x;
        g.y = y + 13;
        y += 11;
      }
    }
    y += 14;
    const bottom = rect.y + rect.h - 6 - reserve;
    // Long objectives and rewards wrap (under their mark), so size them first
    // and give the description whatever room is left.
    const r = quest.rewards ?? {};
    const parts = [];
    if (r.xp) parts.push(`${r.xp} XP`);
    if (r.gold) parts.push(`${r.gold} gold`);
    for (const it of r.items ?? []) parts.push(this.app.content.items.get(it.id)?.name ?? it.id);
    const rewardLine = parts.length ? `<k>Reward:</> ${parts.join(', ')}` : null;
    const reward = rewardLine ? this.detail.add(addText(scene, x, 0, rewardLine, { maxWidth: width, maxLines: 2, depth: D })) : null;
    const rewardH = reward ? lineCount(reward) * 11 + 2 : 0;
    const objectiveLines = [];
    const lines = qs.visibleObjectives(quest.id).map((o) => {
      const count = o.count > 1 ? ` (${Math.min(o.progress, o.count)}/${o.count})` : '';
      const text = o.done ? `<k>${o.def.text}${count}</>` : `${o.def.text}${count}`;
      objectiveLines.push(`${o.done ? '<g>✓</>' : '<y>▶</>'} ${text}`);
      const mark = this.detail.add(addText(scene, x, 0, o.done ? '<g>✓</>' : '<y>▶</>', { depth: D }));
      const t = this.detail.add(addText(scene, x + 10, 0, text, { maxWidth: width - 10, depth: D }));
      return { mark, t, h: lineCount(t) * 11 };
    });
    const objectivesH = lines.reduce((n, l) => n + l.h, 0);
    const room = bottom - rewardH - y - objectivesH - 5;
    const fullDesc = quest.description ?? quest.summary ?? '';
    let descText = fullDesc;
    const probe = addText(scene, -1000, -1000, descText, { maxWidth: width });
    if (lineCount(probe) * 11 > room && quest.summary) descText = quest.summary;
    probe.destroy();
    // Not enough room for the full description and every objective: the summary, cut to fit.
    const descLines = Math.max(1, Math.floor(Math.max(room, 11) / 11));
    const desc = this.detail.add(addText(scene, x, y, descText, { maxWidth: width, maxLines: descLines, depth: D, color: 0xdcd4c4 }));
    let cut = desc.truncated || descText !== fullDesc;
    y += lineCount(desc) * 11 + 5;
    let full = false;
    for (const l of lines) {
      const fits = !full && y + l.h <= bottom - rewardH;
      full = !fits;
      l.mark.setVisible(fits).y = y;
      l.t.setVisible(fits).y = y;
      if (fits) y += l.h;
      else cut = true;
    }
    if (reward) reward.y = bottom - rewardH + 2;
    this.hintY = bottom + 2;
    // What's cut short can be read whole (Confirm).
    this.fullText = { title: quest.title, paragraphs: [giver ? `<k>from</> ${giver}` : null, fullDesc, ...objectiveLines, rewardLine] };
    return cut;
  }

  openReader() {
    if (!this.cut || !this.fullText) return;
    this.app.audio.ui('confirm');
    this.reader = new TextReader(this.scene, this.fullText);
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
    if (this.reader) {
      if (this.reader.update(input)) {
        this.reader.destroy();
        this.reader = null;
      }
      return null;
    }
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
    this.reader?.destroy();
    this.reader = null;
    this.layer.clear();
    this.detail.clear();
    this.menu?.destroy();
    this.tabs?.destroy();
  }
}
