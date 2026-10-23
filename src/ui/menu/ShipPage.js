import { addPanel } from '../Panel.js';
import { addText, UI_COLORS } from '../text.js';
import { ListMenu } from '../ListMenu.js';
import { UiLayer } from './UiLayer.js';
import { repairPlan } from '../../systems/script/commands.js';
import { responseOptions, advice, roomLabel } from '../../systems/ship/response.js';
import { fireRoom, leakSeverity } from '../../systems/ship/hazards.js';
import { airOptions, airAdvice, exposureFactors, shortName } from '../../systems/ship/airResponse.js';
import { pressureAdvice, pressureHere } from '../../systems/ship/pressureResponse.js';
import { beardHere, scrubCost } from '../../systems/ship/beardResponse.js';
import { careRooms } from '../../systems/ship/beard.js';
import { shipTuning } from '../../systems/ship/integrity.js';
import { supplyData, storeIds, storeDef, sourcesHere, sourceDef, recipeIds, recipeDef, gearSlots, gearDef } from '../../systems/ship/supplies.js';
import { suppliesHere, missingFor, itemList } from '../../systems/ship/supplyResponse.js';

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
 *
 * Prompt 6 (docs/gameplay-overhaul/10-flooding-and-fire.md): below the
 * sections, every emergency (fires, water, leaks) with what it's doing and
 * what to do about it; Confirm on one in the captain's room closes the menu
 * and opens the Respond choice there.
 *
 * Prompt 7 (docs/gameplay-overhaul/11-atmosphere-and-ventilation.md): rooms
 * whose air is foul or worse are emergencies too (what's in it, where it
 * comes from, the room's openings), and the captain's own lungs while
 * they're short of clear.
 *
 * Prompt 9 (docs/gameplay-overhaul/13-beard-saturation.md): while the Stink
 * Beard system is on (no chapter turns it on), the captain's beard is a row:
 * how full, what it holds (broadly), its conditions, how well it protects,
 * the purge risk, and where and with what it can be cleaned.
 *
 * Prompt 10 (docs/gameplay-overhaul/14-resources-and-cooking.md): while the
 * supplies system is on (no chapter turns it on), rows for the ship's stores
 * (what is in them, by class), his gear (each slot, how wet the cloth is),
 * the galley (the pot, the recipes and what each is missing), the food and
 * draught effects running, and the places to search in this room.
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
    // The emergencies, worst first: words for what they are (not only colour).
    const place = (r) => this.app.content.maps.get(r)?.name?.replace(/^The /, '') ?? r;
    for (const e of ship.hazards.emergencies()) {
      const kind = e.kind === 'fire' ? 'Fire' : e.kind === 'flood' ? 'Water' : 'Leak';
      const right = e.kind === 'fire' ? `${e.intensity}% ${e.label.toUpperCase()}` : e.kind === 'flood' ? `${e.pct}% ${e.label.toUpperCase()}` : e.label.toUpperCase();
      const color = e.kind === 'fire' ? 0xf8a040 : e.kind === 'leak' ? (e.open ? 0xf07860 : 0x8cd46a) : e.pct >= 65 ? 0xf07860 : 0xf8d86c;
      items.push({ label: `${kind}: ${place(e.room)}`, value: `hz:${e.id}`, right, rightColor: color });
    }
    // The ship's air: rooms foul or worse, then his lungs.
    const airColor = { foul: 0xf8d86c, toxic: 0xf8a040, deadly: 0xf07860 };
    for (const e of ship.air.emergencies()) items.push({ label: `Air: ${place(e.room)}`, value: `hz:${e.id}`, right: `${e.substance} ${e.pct}% ${e.label.toUpperCase()}`, rightColor: airColor[e.stage] ?? 0xf8d86c });
    const lungs = ship.air.exposureNow();
    if (lungs.value > 0) items.push({ label: 'Your lungs', value: 'hz:lungs', right: `${lungs.pct}% ${lungs.stage.label.toUpperCase()}`, rightColor: lungs.rank >= 3 ? 0xf07860 : lungs.rank >= 2 ? 0xf8a040 : 0xf8d86c });
    // Prompt 8: a Grand Stenchmaster building up (words for the stage, not only colour).
    const toneColor = { g: 0x8cd46a, w: 0xffffff, y: 0xf8d86c, o: 0xf8a040, r: 0xf07860 };
    for (const e of ship.pressure.emergencies()) items.push({ label: `Pressure: ${e.name}`, value: `hz:${e.id}`, right: `${e.label.toUpperCase()}${e.held ? ' HELD' : ''}${e.left !== null ? ` ${e.left}s` : ''}`, rightColor: toneColor[e.tone] ?? 0xf8d86c });
    // Prompt 9: his beard, whenever that system is on (clean included: it's where it is cleaned from).
    if (ship.beard.on) {
      const b = ship.beard.info(this.tuning());
      const right = b.phase === 'overload' ? `PURGE ${b.left}s` : `${b.shown}% ${b.stage === 'heavy' ? 'HEAVY' : b.label.toUpperCase()}`;
      items.push({ label: 'Your beard', value: 'hz:beard', right, rightColor: toneColor[b.phase === 'overload' ? 'r' : b.tone] ?? 0xffffff });
    }
    // Prompt 10: the supplies, whenever that system is on.
    const sup = ship.supplies;
    if (sup.on && supplyData(this.app.content)) {
      for (const st of storeIds(this.app.content)) items.push({ label: 'Ship\'s stores', value: `sup:store:${st}`, right: `${sup.storeTotal(st)}/${storeDef(this.app.content, st).capacity}`, rightColor: 0xffffff });
      const worn = sup.wornGear();
      items.push({ label: 'Your gear', value: 'sup:gear', right: worn.length ? `${worn.length} WORN` : 'NONE', rightColor: worn.some((i) => sup.spent(i)) ? 0xf8d86c : 0xffffff });
      const pot = sup.cooking;
      const known = recipeIds(this.app.content).filter((r) => sup.knows(r)).length;
      items.push({ label: 'Galley', value: 'sup:galley', right: pot ? (sup.ready ? 'READY' : `COOKING ${pot.left}s`) : `${known} RECIPES`, rightColor: pot && sup.ready ? 0x8cd46a : 0xffffff });
      const fx = sup.effectList();
      if (fx.length) items.push({ label: 'Food & draughts', value: 'sup:effects', right: fx.map((e) => `${e.short} ${e.left}s`).join(' '), rightColor: 0x8cd46a });
      const here = sourcesHere(this.app.content, this.session.location);
      if (here.length) items.push({ label: 'To search here', value: 'sup:here', right: `${here.filter((id) => sup.available(id).ok).length}/${here.length} READY`, rightColor: 0xffffff });
    }
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
    if (id?.startsWith('hz:')) {
      this.renderHazard(id.slice(3));
      return;
    }
    if (id?.startsWith('sup:')) {
      this.renderSupplies(id.slice(4));
      return;
    }
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
    // Prompt 10: what's short in the pack but in the ship's stores (repairs pay from the pack: fetch it).
    const sup = this.session.ship.supplies;
    if (sup.on) {
      const stored = plan.repair.cost.filter((c) => have(c) < c.count).map((c) => ({ c, n: storeIds(this.app.content).reduce((k, st) => k + sup.storeCount(st, c.item), 0) })).filter((x) => x.n > 0);
      if (stored.length) line(`<y>In the stores:</> ${stored.map((x) => `${x.n} ${name(x.c)}`).join(', ')} <k>(fetch it)</>`);
    }
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

  /** An emergency's detail: where, how bad, what it does, what to do, and Respond if it's here. */
  renderHazard(hid) {
    if (hid === 'lungs' || hid.startsWith('air:')) {
      this.renderAir(hid);
      return;
    }
    if (hid.startsWith('pressure:')) {
      this.renderPressure(hid.slice(9));
      return;
    }
    if (hid === 'beard') {
      this.renderBeard();
      return;
    }
    const { scene, rect } = this;
    const hz = this.session.ship.hazards;
    const e = hz.emergencies().find((x) => x.id === hid);
    if (!e) return;
    const D = 21;
    const x = rect.x + 12;
    const width = rect.w - 24;
    let y = rect.y + 117;
    const line = (text) => {
      const t = this.detail.add(addText(scene, x, y, text, { depth: D, maxWidth: width }));
      y += t.text.split('\n').length * 11 + 2;
    };
    const content = this.app.content;
    const where = roomLabel(this.session, e.room);
    if (e.kind === 'fire') {
      line(`<o>Fire</> in ${where}: <o>${e.intensity}% ${e.label.toUpperCase()}</>`);
      const burns = (fireRoom(content, e.room)?.burns ?? []).map((b) => this.session.ship.section(b.section)?.name).filter(Boolean);
      if (burns.length) line(`<k>Burning:</> ${[...new Set(burns)].join(', ')}`);
    } else if (e.kind === 'flood') {
      const w = hz.waterIn(e.room);
      line(`<y>Water</> in ${where}: ${w.pct}% ${w.stage.label.toUpperCase()}`);
      const slow = w.stage.work > 1 ? `work ${Math.round((w.stage.work - 1) * 100)}% slower, repairs ${Math.round(w.stage.repair * 100)}%` : 'no effect yet';
      line(`<k>${w.stage.canWork ? slow : 'Too deep to work in: pump it down'}</>`);
    } else {
      const sev = leakSeverity(hz.def, e.stage)?.label ?? e.label;
      line(`<r>${e.open ? sev : 'Patched leak'}</> in the ${this.session.ship.section(e.section).name.toLowerCase()}, into ${where}`);
    }
    line(`<k>${advice(this.session, e)}</>`);
    const here = this.session.location?.map === e.room;
    const opts = here ? responseOptions(this.session, e.room, { difficulty: this.app.settings.challengePrefs().difficulty }) : [];
    if (opts.length) line(`{btn:confirm} <y>Respond here</>`);
    else line(`<k>${here ? 'Nothing to do about it from here.' : `Go to ${where} to deal with it.`}</>`);
  }

  /** A room's air or the captain's lungs: what's in it, where from, its openings, what to do; Respond if it's here. */
  renderAir(hid) {
    const { scene, rect } = this;
    const session = this.session;
    const air = session.ship.air;
    const D = 21;
    const x = rect.x + 12;
    const width = rect.w - 24;
    let y = rect.y + 117;
    const line = (text) => {
      const t = this.detail.add(addText(scene, x, y, text, { depth: D, maxWidth: width }));
      y += t.text.split('\n').length * 11 + 2;
    };
    if (hid === 'lungs') {
      const ex = air.exposureNow();
      const f = exposureFactors(session);
      line(`<y>Your lungs:</> exposure ${ex.pct}% ${ex.stage.label.toUpperCase()}`);
      const effects = [f.work > 1 ? `work ${Math.round((f.work - 1) * 100)}% slower` : null, f.walk > 1 ? `walking ${Math.round((f.walk - 1) * 100)}% slower` : null, ex.stage.cough ? 'coughing fits' : null, ex.stage.hurt ? 'losing HP' : null].filter(Boolean);
      line(`<k>${effects.length ? effects.join(', ') : 'No effect yet'}.</>`);
      line('<k>Breathe clean air to clear them: it takes a while.</>');
      return;
    }
    const room = hid.slice(4);
    const a = air.airIn(room);
    const where = roomLabel(session, room);
    const tone = { foul: 'y', toxic: 'o', deadly: 'r' }[a.quality.id] ?? 'w';
    const trend = a.trend === 'rising' ? ', worse' : a.trend === 'falling' ? ', clearing' : '';
    // The room is the row's own label: here, what's in it, its openings in two short groups, what to do (the
    // full report, damage and all, is "Check the air" in the room).
    line(`<${tone}>${a.quality.label.toUpperCase()}</>${trend}: ${a.subs.map((sub) => `${sub.short} ${sub.shown}%`).join(', ')}.`);
    const ops = air.connectionsIn(room).filter((c) => c.changeable);
    const named = (list) => list.map((c) => shortName(c.label)).join(', ');
    const opened = ops.filter((c) => c.state === 'open');
    const shut = ops.filter((c) => c.state !== 'open');
    line(`<k>${[opened.length ? `Open: ${named(opened)}.` : '', shut.length ? `Shut: ${named(shut)}.` : ''].filter(Boolean).join(' ')}</>`);
    line(`<k>${a.sources.length ? 'Still pouring in. ' : ''}${airAdvice(session, room)}</>`);
    const here = session.location?.map === room;
    line(here ? `{btn:confirm} <y>Respond here</>` : `<k>Go there to deal with it.</>`);
  }

  /** A Grand Stenchmaster: how bad, what builds him up, what he holds, the countdown, what to do; Respond if he's here. */
  renderPressure(id) {
    const { scene, rect } = this;
    const session = this.session;
    const i = session.ship.pressure.info(id);
    if (!i) return;
    const D = 21;
    const x = rect.x + 12;
    const width = rect.w - 24;
    let y = rect.y + 117;
    const line = (text) => {
      const t = this.detail.add(addText(scene, x, y, text, { depth: D, maxWidth: width }));
      y += t.text.split('\n').length * 11 + 2;
    };
    const where = roomLabel(session, i.room);
    line(`<${i.tone}>${i.label.toUpperCase()}</> (${i.pct}%) in ${where}.${i.phase === 'imminent' ? ` <r>${i.left} s!</>` : ''}`);
    const bits = [i.mods.length ? `Building: ${i.mods.map((m) => m.label).join(', ')}.` : '', i.held > 0 ? `Held in: ${Math.round(i.held)}.` : ''].filter(Boolean);
    if (bits.length) line(`<k>${bits.join(' ')}</>`);
    line(`<k>${pressureAdvice(session, id)}</>`);
    line(session.location?.map === i.room ? `{btn:confirm} <y>Respond here</>` : `<k>Go to ${where} to deal with him.</>`);
  }

  /** The ship tuning of the difficulty in play (the beard's capacity). */
  tuning() {
    return shipTuning(this.app.content, this.app.settings.challengePrefs().difficulty);
  }

  /** The captain's beard: how full, what it holds (broadly), conditions, protection, purge risk, where and with what to clean it. */
  renderBeard() {
    const { scene, rect } = this;
    const session = this.session;
    const t = this.tuning();
    const i = session.ship.beard.info(t);
    const D = 21;
    const x = rect.x + 12;
    const width = rect.w - 24;
    let y = rect.y + 117;
    const line = (text) => {
      const tx = this.detail.add(addText(scene, x, y, text, { depth: D, maxWidth: width }));
      y += tx.text.split('\n').length * 11 + 2;
    };
    const trend = i.trend === 'rising' ? ', filling' : i.trend === 'falling' ? ', clearing' : '';
    const held = i.contents.filter((c) => c.share >= 0.1).map((c) => c.short);
    line(`<${i.tone}>${i.label.toUpperCase()}</> ${i.shown}%${trend}.${held.length ? ` <k>Holds:</> ${held.join(', ')}.` : ''}`);
    const st = i.statuses.filter((s) => s.id !== 'saturated');
    const risk = i.phase === 'overload' ? `<r>PURGE IN ${i.left} s.</>` : i.risk === 'high' ? '<r>Close to purging.</>' : i.phase === 'cooldown' ? `<k>Just purged (${i.left} s).</>` : '';
    line(`${st.length ? `${st.map((s) => `<${s.tone}>${s.short}</>${s.left !== null ? ` ${s.left}s` : ''}`).join(', ')}. ` : ''}<k>Catches ~${Math.round(i.protection * 100)}% of smoke.</> ${risk}`);
    const rag = scrubCost(session.content, this.app.settings.challengePrefs().difficulty).map((c) => `${c.count} ${this.app.content.items.get(c.item)?.name ?? c.item} (${session.inventory.count(c.item)})`).join(', ');
    line(`<k>Wash it at the ${careRooms(session.content).map((r) => this.app.content.maps.get(r)?.name?.replace(/^The /, '') ?? r).join(', ')} tub: rinse, or scrub (${rag}).</>`);
    // The risk is in the line above; what to do about it is Respond (the full report is "Look at your beard").
    line(beardHere(session) ? `{btn:confirm} <y>Respond</>` : '');
  }

  /** Prompt 10: the supplies' rows: the stores, his gear, the galley, food and draughts, and what can be searched here. */
  renderSupplies(what) {
    const { scene, rect } = this;
    const session = this.session;
    const content = this.app.content;
    const sup = session.ship.supplies;
    const D = 21;
    const x = rect.x + 12;
    const width = rect.w - 24;
    let y = rect.y + 117;
    const bottom = rect.y + rect.h - 8;
    const line = (text) => {
      const left = Math.floor((bottom - y) / 11);
      if (left < 1 || !text) return;
      const tx = this.detail.add(addText(scene, x, y, text, { depth: D, maxWidth: width, maxLines: left }));
      y += tx.text.split('\n').length * 11 + 2;
    };
    const name = (id) => content.items.get(id)?.name ?? id;
    const place = (r) => (content.maps.get(r)?.name ?? r).replace(/^The /, '');
    if (what.startsWith('store:')) {
      const st = what.slice(6);
      const def = storeDef(content, st);
      line(`<y>The ship's stores</> (${place(def.room)}): ${sup.storeTotal(st)}/${def.capacity}.`);
      const items = sup.storeItems(st);
      const byClass = {};
      for (const i of items) (byClass[i.cls] ??= []).push(i);
      const classes = supplyData(content).classes;
      if (!items.length) line('<k>Empty.</>');
      for (const [cls, list] of Object.entries(byClass)) line(`<k>${classes[cls]?.label ?? cls}:</> ${itemList(content, list)}`);
      line('<k>Repairs use what you carry: fetch from here. The galley cooks from it.</>');
    } else if (what === 'gear') {
      const slots = gearSlots(content).map((slot) => {
        const item = sup.wornIn(slot);
        const c = item ? gearDef(content, item).charges : null;
        const wet = c ? ` (${sup.spent(item) ? `<y>${c.empty.toUpperCase()}</>` : `${c.label} ${Math.round((sup.charge(item) / c.max) * 100)}%`})` : '';
        return `${supplyData(content).gear.slots[slot]}: ${item ? `<g>${name(item)}</>${wet}` : '<k>-</>'}`;
      });
      // Two slots to a line (a slot and what's in it never split across lines).
      for (let i = 0; i < slots.length; i += 2) line(slots.slice(i, i + 2).join('   '));
      const worn = sup.wornGear().filter((i) => gearDef(content, i));
      if (worn.length) line(`<k>${worn.map((i) => gearDef(content, i).note).join(' ')}</>`);
      line(suppliesHere(session) ? '{btn:confirm} <y>Respond</> <k>(wear, take off)</>' : '<k>Wear or take off what you carry with Respond.</>');
    } else if (what === 'galley') {
      if (sup.cooking) {
        const r = recipeDef(content, sup.cooking.recipe);
        line(sup.ready ? `<g>${r.name} is ready:</> ${sup.cooking.serves} to serve at the stove.` : `<y>${r.name}</> on the stove: ${sup.cooking.left}s to go (${sup.cooking.serves} to serve).`);
      }
      for (const id of recipeIds(content)) {
        if (!sup.knows(id)) continue;
        const r = recipeDef(content, id);
        const missing = missingFor(session, id, 'galley');
        line(`${r.name}: ${missing.length ? `<r>missing ${missing.map((m) => `${name(m.item)} ${m.have}/${m.need}`).join(', ')}</>` : '<g>can cook</>'} <k>(${r.simmer}s)</>`);
      }
    } else if (what === 'effects') {
      for (const e of sup.effectList()) line(`<g>${e.label}</> ${e.left}s: <k>${e.note}</>`);
    } else if (what === 'here') {
      for (const id of sourcesHere(content, session.location)) {
        const def = sourceDef(content, id);
        const a = sup.available(id);
        const st = sup.sourceState(id);
        const state = a.ok ? (Number.isFinite(st.left) ? `<g>${st.left} left</>` : '<g>ready</>') : a.wait ? `<k>picked clean ${a.wait}s</>` : st.restockIn > 0 ? `<k>empty, more in ${st.restockIn}s</>` : '<k>empty</>';
        line(`${def.label.replace(/^the /, '').replace(/^./, (c) => c.toUpperCase())}: ${state}`);
      }
      line(suppliesHere(session) ? '{btn:confirm} <y>Respond</>' : '');
    }
  }

  /** Confirm on an emergency in this room: close the menu and open the Respond choice in the world. */
  respond(hid) {
    if (this.started) return;
    const room = this.session.location?.map;
    if (hid === 'beard') {
      if (!beardHere(this.session)) {
        this.app.audio.ui('buzzer');
        return;
      }
      this.started = true;
      this.app.audio.ui('confirm');
      this.scene.close({ then: (world) => world.runScript([{ emergency: true }]) });
      return;
    }
    if (hid.startsWith('pressure:')) {
      const i = this.session.ship.pressure.info(hid.slice(9));
      if (!(i && i.room === room && pressureHere(this.session, room))) {
        this.app.audio.ui('buzzer');
        return;
      }
      this.started = true;
      this.app.audio.ui('confirm');
      this.scene.close({ then: (world) => world.runScript([{ emergency: true }]) });
      return;
    }
    if (hid === 'lungs' || hid.startsWith('air:')) {
      const ok = hid !== 'lungs' && hid.slice(4) === room && airOptions(this.session, room).length > 0;
      if (!ok) {
        this.app.audio.ui('buzzer');
        return;
      }
      this.started = true;
      this.app.audio.ui('confirm');
      this.scene.close({ then: (world) => world.runScript([{ emergency: true }]) });
      return;
    }
    const e = this.session.ship.hazards.emergencies().find((x) => x.id === hid);
    const here = e && this.session.location?.map === e.room && responseOptions(this.session, e.room).length > 0;
    if (!here) {
      this.app.audio.ui('buzzer');
      return;
    }
    this.started = true;
    this.app.audio.ui('confirm');
    this.scene.close({ then: (world) => world.runScript([{ emergency: true }]) });
  }

  /** Confirm: a repair that can start here closes the menu and starts in the world; anything else says why. */
  repair(id) {
    if (id?.startsWith('hz:')) {
      this.respond(id.slice(3));
      return;
    }
    // Prompt 10: a supplies row opens Respond where he stands, when there's something to do there.
    if (id?.startsWith('sup:')) {
      if (this.started || !suppliesHere(this.session)) {
        this.app.audio.ui('buzzer');
        return;
      }
      this.started = true;
      this.app.audio.ui('confirm');
      this.scene.close({ then: (world) => world.runScript([{ emergency: true }]) });
      return;
    }
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
