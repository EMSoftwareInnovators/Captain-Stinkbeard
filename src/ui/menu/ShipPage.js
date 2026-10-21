import { addPanel } from '../Panel.js';
import { addText, UI_COLORS } from '../text.js';
import { ListMenu } from '../ListMenu.js';
import { UiLayer } from './UiLayer.js';
import { repairPlan } from '../../systems/script/commands.js';

/** A condition's colour mark (the word beside it always says the same thing). */
const TONE = { healthy: 'g', worn: 'w', damaged: 'y', critical: 'o', disabled: 'r' };

/**
 * Pause > Ship (overhaul Prompt 5, docs/gameplay-overhaul/09-ship-integrity.md):
 * the ship's overall condition, each section's condition in words and
 * figures, what it does and whether it still does it, and what a repair
 * needs against what's in the hold. Confirm on a section that can be
 * repaired here closes the menu and starts the repair in the world (the
 * shipRepair command: materials, a timing bar, the outcome). Keyboard and
 * pad, like every page; one press starts one repair.
 */
export class ShipPage {
  constructor(scene, rect) {
    this.scene = scene;
    this.app = scene.game.app;
    this.rect = rect;
    this.layer = new UiLayer(scene);
    this.detail = new UiLayer(scene);
    this.menu = null;
    this.index = 0;
    this.focused = false;
    this.started = false;
  }

  get session() {
    return this.app.session;
  }

  plan(id) {
    return repairPlan(this.session, id, { difficulty: this.app.settings.challengePrefs().difficulty });
  }

  render() {
    this.layer.clear();
    this.menu?.destroy();
    const { scene, layer, rect } = this;
    const D = 20;
    const ship = this.session.ship;
    const o = ship.overall();
    const tone = o.destroyed ? 'r' : TONE[o.worst?.state ?? o.state] ?? 'w';
    layer.add(addText(scene, rect.x + 12, rect.y + 9, 'THE SHIP', { font: 'bold', color: UI_COLORS.heading, depth: D + 1 }));
    const hit = o.damaged === 1 ? '1 SECTION HIT' : `${o.damaged} SECTIONS HIT`;
    const head = layer.add(addText(scene, 0, rect.y + 10, `<${tone}>${o.pct}% ${o.destroyed ? 'SINKING' : o.damaged ? hit : 'SOUND'}</>`, { depth: D + 1 }));
    head.x = rect.x + rect.w - 12 - head.textWidth;
    // The overall bar: its length and its colour say the same thing as the words.
    const bw = rect.w - 24;
    layer.add(scene.add.rectangle(rect.x + 12, rect.y + 24, bw, 4, 0x1a1320).setOrigin(0).setDepth(D + 1));
    layer.add(scene.add.rectangle(rect.x + 12, rect.y + 24, Math.max(1, Math.round((bw * o.pct) / 100)), 4, { g: 0x8cd46a, w: 0xd8d4e8, y: 0xf8d86c, o: 0xf8a040, r: 0xf07860 }[tone]).setOrigin(0).setDepth(D + 2));
    const items = ship.sections().map((s) => ({ label: s.name, value: s.id, right: `${s.pct}% ${s.label.toUpperCase()}`, rightColor: { g: 0x8cd46a, w: 0xffffff, y: 0xf8d86c, o: 0xf8a040, r: 0xf07860 }[TONE[s.state]] }));
    this.menu = new ListMenu(scene, {
      x: rect.x + 24,
      y: rect.y + 34,
      width: rect.w - 34,
      rows: 6,
      rowHeight: 12,
      depth: D + 1,
      items,
      index: Math.min(this.index, items.length - 1),
      onChange: (_item, i) => {
        this.index = i;
        this.renderDetail();
      },
      onSelect: (item) => this.repair(item.value),
      onCancel: () => {
        this.exitRequested = true;
      },
    });
    this.menu.setFocused(this.focused);
    layer.add(addPanel(scene, rect.x + 4, rect.y + 110, rect.w - 8, rect.h - 114, { style: 'inset', depth: D }));
    this.renderDetail();
  }

  renderDetail() {
    this.detail.clear();
    const id = this.menu?.selected?.value;
    const sec = id ? this.session.ship.section(id) : null;
    if (!sec) return;
    const { scene, rect } = this;
    const D = 21;
    const x = rect.x + 12;
    const width = rect.w - 24;
    let y = rect.y + 117;
    const line = (text, opts = {}) => {
      const t = this.detail.add(addText(scene, x, y, text, { depth: D, maxWidth: width, ...opts }));
      y += t.text.split('\n').length * 11 + 2;
      return t;
    };
    const works = !sec.operational ? '<r>OUT OF ACTION</>' : sec.efficiency < 1 ? `<y>WORKS, BADLY (${Math.round(sec.efficiency * 100)}%)</>` : '<g>WORKING</>';
    line(`<y>${sec.name}</> <k>${sec.hp}/${sec.max}${sec.vital ? ' (vital)' : ''}</>`);
    line(`${sec.functionLabel ? `${sec.functionLabel[0].toUpperCase()}${sec.functionLabel.slice(1)}: ` : ''}${works}`);
    const plan = this.plan(id);
    if (plan.reason === 'whole') {
      line('<k>Nothing to repair.</>');
      return;
    }
    if (!plan.repair) {
      line(`<k>${plan.message}</>`);
      return;
    }
    const have = (c) => this.session.inventory.count(c.item);
    const name = (c) => this.app.content.items.get(c.item)?.name ?? c.item;
    const needs = plan.repair.cost.map((c) => `${have(c) >= c.count ? '' : '<r>'}${c.count} ${name(c)} (${have(c)})${have(c) >= c.count ? '' : '</>'}`).join(', ');
    line(`<k>${plan.repair.label}:</> ${needs}`);
    const extra = plan.repair.results.partial.extra;
    if (extra.length) line(`<k>Rough work: +${extra.map((c) => `${c.count} ${name(c)}`).join(', ')}</>`);
    if (plan.ok) {
      const tries = Number.isFinite(plan.attempts) ? ` (${plan.attempts} ${plan.attempts === 1 ? 'try' : 'tries'})` : '';
      line(`{btn:confirm} <y>Repair${tries}</>`);
    } else if (plan.reason === 'elsewhere') {
      // The section is named above: just where to go (a hull lists four rooms).
      line(`<r>Work on it from: ${plan.rooms.join(', ')}.</>`);
    } else {
      line(`<r>${plan.message}</>`);
    }
  }

  /** Confirm: a repair that can start here closes the menu and starts in the world; anything else says why. */
  repair(id) {
    if (this.started) return;
    const plan = this.plan(id);
    if (!plan.ok) {
      this.app.audio.ui('buzzer');
      this.renderDetail();
      return;
    }
    this.started = true;
    this.app.audio.ui('confirm');
    this.scene.close({ then: (world) => world.runScript([{ shipRepair: id }]) });
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
    this.menu?.update(input);
    if (this.exitRequested) {
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
    this.menu = null;
  }
}
