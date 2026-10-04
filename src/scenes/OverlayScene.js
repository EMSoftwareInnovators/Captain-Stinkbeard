import { BaseScene } from './BaseScene.js';
import { padDisplayName } from '../ui/panels/ControllerSetupPanel.js';
import { DialogueBox } from '../ui/DialogueBox.js';
import { Toasts, TOAST_TEXT_WIDTH } from '../ui/Toasts.js';
import { addPanel } from '../ui/Panel.js';
import { addText, centerText, setText, UI_COLORS } from '../ui/text.js';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../config/constants.js';
import { alarmLevel, alarmColor } from '../systems/hazards/alarms.js';
import { TvView } from '../ui/TvView.js';

/**
 * The timing bar's variants: title, prompt, sounds, and the captain's stat it
 * leans on (see SKILL_STATS): heaving and hammering on Muscle (attack), knots
 * and fiddly work on Hands (speed), keeping your feet on Footing (defense).
 */
const REPAIR_KINDS = {
  hull: { title: 'PATCH THE HULL', hint: 'Strike on the green!', stat: 'attack', hit: 'hammer_hit', miss: 'hammer_miss', done: 'repair_done' },
  shark: { title: 'REPEL THE SHARK', hint: 'Shove on the green!', stat: 'attack', hit: 'pole_strike', miss: 'pole_whiff', done: 'shark_repelled', speed: 170 },
  rope: { title: 'SECURE THE ROPE', hint: 'Haul on the green!', stat: 'speed', hit: 'rope_haul', miss: 'hammer_miss', done: 'repair_done' },
  helm: { title: 'BRING HER ABOUT', hint: 'Hold her on the mark!', stat: 'defense', hit: 'wheel_turn', miss: 'hammer_miss', done: 'repair_done', speed: 120 },
  // Story Phase 6
  smother: { title: 'SMOTHER IT', hint: 'Pat it out on the green!', stat: 'speed', hit: 'smother', miss: 'ember_hiss', done: 'repair_done', speed: 110 },
  brace: { title: 'BRACE!', hint: 'Haul on the green!', stat: 'defense', hit: 'rope_haul', miss: 'hammer_miss', done: 'repair_done', speed: 140 },
  heave: { title: 'HEAVE!', hint: 'Push together on the green!', stat: 'attack', hit: 'heave', miss: 'shark_flop', done: 'splash_big', speed: 150 },
  barrel: { title: 'LAUNCH THE BARREL', hint: 'Let go on the green!', stat: 'attack', hit: 'barrel_launch', miss: 'barrel_roll', done: 'grog_burst', speed: 130 },
  // Story Phase 7
  clear: { title: 'CLEAR THE DEBRIS', hint: 'Heave on the green!', stat: 'attack', hit: 'wood_crack', miss: 'hammer_miss', done: 'repair_done', speed: 130 },
  reef: { title: 'REEF THE MAINSAIL', hint: 'Haul on the green!', stat: 'speed', hit: 'rope_haul', miss: 'sail_snap', done: 'repair_done', speed: 135 },
  knot: { title: 'TIE IT OFF', hint: 'Pull tight on the green!', stat: 'speed', hit: 'rope_haul', miss: 'hammer_miss', done: 'repair_done', speed: 145 },
  carry: { title: 'LIFT!', hint: 'Lift on the green!', stat: 'attack', hit: 'heave', miss: 'thud', done: 'thud_heavy', speed: 120 },
  lash: { title: 'LASH THE WHEEL', hint: 'Make fast on the green!', stat: 'speed', hit: 'wheel_turn', miss: 'hammer_miss', done: 'repair_done', speed: 130 },
  assemble: { title: 'HOLD IT STEADY', hint: 'Steady on the green!', stat: 'speed', hit: 'spoon_tink', miss: 'mk2_rattle', done: 'mk2_tube_ping', speed: 110 },
  // Story Phase 8
  nail: { title: 'NAIL IT UP', hint: 'Strike on the green!', stat: 'attack', hit: 'hammer_hit', miss: 'hammer_miss', done: 'repair_done', speed: 125 },
  hang: { title: 'HANG IT', hint: 'Pull on the green!', stat: 'speed', hit: 'sash_swish', miss: 'hammer_miss', done: 'hammock_creak', speed: 130 },
  // Story Phase 9
  dig: { title: 'DIG!', hint: 'Bite in on the green!', stat: 'attack', hit: 'shovel_dig', miss: 'shovel_clank', done: 'dirt_heap', speed: 135 },
  pick: { title: 'BREAK THE STONE', hint: 'Swing on the green!', stat: 'attack', hit: 'pick_strike', miss: 'shovel_clank', done: 'stone_crack', speed: 150 },
  pry: { title: 'PRY IT UP', hint: 'Lever on the green!', stat: 'defense', hit: 'stone_scrape', miss: 'shovel_clank', done: 'stone_crack', speed: 120 },
  vines: { title: 'CUT THE VINES', hint: 'Slash on the green!', stat: 'speed', hit: 'vine_slash', miss: 'hammer_miss', done: 'vine_fall', speed: 140 },
  throw: { title: 'THROW!', hint: 'Let fly on the green!', stat: 'attack', hit: 'heave', miss: 'thud', done: 'splash_big', speed: 140 },
  lower: { title: 'LOWER AWAY', hint: 'Pay out on the green!', stat: 'speed', hit: 'rope_haul', miss: 'hammer_miss', done: 'splash', speed: 125 },
};

/**
 * How a stat helps a timing bar. `ref` is about where the captain starts;
 * every point above it widens the green and slows the marker a little (and
 * below it, the other way), so levels and gear show. Luck forgives the odd
 * fumble.
 */
const SKILL_STATS = {
  attack: { label: 'MUSCLE', ref: 20 },
  speed: { label: 'HANDS', ref: 10 },
  defense: { label: 'FOOTING', ref: 14 },
};
/** XP for each clean strike (no fumbles before it), and for a clean sweep. */
const SKILL_XP = { clean: 2, sweep: 3 };
/** A fumble locks the bar this long: pressing wildly is slower than waiting for the green. */
const FUMBLE_MS = 480;

/**
 * Always-on-top scene for UI shared by every other scene: dialogue,
 * tutorials, toasts, banners, context hints and full-screen fades. It also
 * turns game events (items, quests, level ups) into notifications.
 */
export class OverlayScene extends BaseScene {
  constructor() {
    super('Overlay');
  }

  create() {
    this.app.overlay = this;
    this.dialogue = new DialogueBox(this);
    this.toasts = new Toasts(this, { top: () => this.clearBelowHud(6, 6, 6 + TOAST_TEXT_WIDTH + 30) });
    this.fader = this.add.rectangle(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 0x000000).setOrigin(0).setDepth(50).setAlpha(0);
    this.tutorialOpen = null;
    this.hint = null;
    this.subscriptions = [];
    const on = (ev, fn) => this.subscriptions.push(this.app.bus.on(ev, fn, this));
    on('quest:started', ({ quest }) => this.toasts.push({ text: `New quest: <y>${quest.title}</>`, icon: 'ledger', sound: 'quest_new', hold: 2800 }));
    on('quest:objectiveCompleted', ({ quest, objective }) => {
      if (quest.objectives.filter((o) => !o.optional).every((o) => this.app.session?.quests.isObjectiveDone(quest.id, o.id))) return;
      this.toasts.push({ text: `★ ${objective.text}`, sound: 'quest_objective' });
    });
    on('quest:objectiveProgress', ({ objective, progress, count }) => {
      if (count > 1 && progress < count) this.toasts.push({ text: `${objective.text} (${progress}/${count})`, sound: 'quest_objective', hold: 1600 });
    });
    on('quest:completed', ({ quest, rewards }) => {
      this.toasts.push({ text: `Quest complete: <y>${quest.title}</>`, icon: 'ledger', sound: 'quest_complete', hold: 3200 });
      if (rewards) this.rewardToasts(rewards);
    });
    // A controller the game can read (shown once per pad; its name without the browser's id decoration).
    on('input:pad', ({ id, recognised }) => {
      const name = padDisplayName(id).slice(0, 28);
      if (recognised) this.toasts.push({ text: `Controller ready: <y>${name}</>`, hold: 2400 });
      else this.toasts.push({ text: `<y>${name}</>: set it up in Options > Controller`, hold: 4200 });
    });
    on('party:levelUp', ({ levelUps, source }) => {
      if (source === 'battle') return; // the battle results screen announces these itself
      for (const lv of levelUps) {
        const name = this.app.session?.party.nameOf(lv.character) ?? lv.character;
        this.toasts.push({ text: `<y>${name}</> reached level ${lv.level}!`, sound: 'level_up', hold: 2600 });
        for (const ab of lv.learned) {
          this.toasts.push({ text: `Learned <c>${this.app.content.abilities.get(ab)?.name ?? ab}</>`, hold: 2600 });
        }
      }
    });
    this.events.on('shutdown', () => this.subscriptions.forEach((off) => off()));
  }

  rewardToasts(r) {
    const parts = [];
    if (r.xp) parts.push(`${r.xp} XP`);
    if (r.gold) parts.push(`${r.gold} gold`);
    if (parts.length) this.toasts.push({ text: `+ ${parts.join(', ')}`, icon: 'gold', hold: 2600 });
    for (const it of r.items || []) {
      const def = this.app.content.items.get(it.id);
      this.toasts.push({ text: `Received <y>${def.name}</>${it.count > 1 ? ` ×${it.count}` : ''}`, icon: def.icon, hold: 2600 });
    }
  }

  /** Script/UI notification entry point (see systems/script/commands.js). */
  notify(n) {
    const items = this.app.content.items;
    switch (n.kind) {
      case 'itemGained': {
        const def = items.get(n.id);
        if (n.count <= 0) {
          this.toasts.push({ text: `No room for more ${def.name}.`, icon: def.icon, sound: 'buzzer' });
          break;
        }
        this.toasts.push({ text: `Received <y>${def.name}</>${n.count > 1 ? ` ×${n.count}` : ''}`, icon: def.icon, sound: 'item_get' });
        break;
      }
      case 'itemLost': {
        const def = items.get(n.id);
        this.toasts.push({ text: `Handed over <y>${def.name}</>${n.count > 1 ? ` ×${n.count}` : ''}`, icon: def.icon });
        break;
      }
      case 'goldGained':
        this.toasts.push({ text: `Received <y>${n.amount}</> gold`, icon: 'gold', sound: 'gold' });
        break;
      case 'goldLost':
        this.toasts.push({ text: `Paid <y>${n.amount}</> gold`, icon: 'gold' });
        break;
      default:
        this.toasts.push({ text: String(n.text ?? n.kind) });
    }
  }

  get busy() {
    return this.dialogue.busy || !!this.tutorialOpen || !!this.repairOpen || !!this.tvOpen;
  }

  update(time, delta) {
    const input = this.controls;
    this.toasts.relayout();
    this.relayoutAlarm();
    if (this.repairOpen) {
      this.updateRepair(delta, input);
      return;
    }
    if (this.tvOpen) {
      this.tvOpen.update(delta, input);
      return;
    }
    if (this.tutorialOpen) {
      if (input.pressed('confirm') || input.pressed('cancel')) {
        input.consume('confirm');
        input.consume('cancel');
        this.app.audio.ui('confirm');
        const t = this.tutorialOpen;
        this.tutorialOpen = null;
        t.parts.forEach((p) => p.destroy());
        t.resolve();
      }
      return;
    }
    this.dialogue.update(delta, input);
  }

  /** A television close-up you operate (ui/TvView.js); resolves when you step away. */
  tv(def, { present, mode = 'normal' } = {}) {
    return new Promise((resolve) => {
      this.app.audio.ui('menu_open');
      this.tvOpen = new TvView(this, def, {
        present,
        mode,
        onClose: () => {
          this.tvOpen = null;
          resolve();
        },
      });
    });
  }

  /** Parchment tip box; resolves when dismissed. */
  tutorial({ title = 'Tip', text }) {
    return new Promise((resolve) => {
      const w = 264;
      const bodyW = w - 28;
      // Dark ink without a drop shadow: crisp on the light parchment.
      const body = addText(this, 0, 0, text, { font: 'ink', color: 0x1e1008, maxWidth: bodyW, depth: 702 });
      const lines = body.text.split('\n').length;
      const lineH = 12;
      body.setLineSpacing?.(lineH - 11);
      const h = 36 + lines * lineH + 12;
      const x = Math.round((SCREEN_WIDTH - w) / 2);
      // Below a bell alarm that is still up, so the instruction and the alarm both read.
      const below = this.alarmParts ? Math.min(this.alarmBottom + 4, SCREEN_HEIGHT - h - 4) : 0;
      const y = Math.max(Math.round((SCREEN_HEIGHT - h) / 2) - 16, below);
      const panel = addPanel(this, x, y, w, h, { style: 'parchment', depth: 700 });
      const head = addText(this, 0, y + 10, title.toUpperCase(), { font: 'ink', color: 0x8a1c10, depth: 702 });
      centerText(head, SCREEN_WIDTH / 2);
      const rule = this.add.rectangle(Math.round(SCREEN_WIDTH / 2 - head.textWidth / 2 - 6), y + 21, head.textWidth + 12, 1, 0x8a1c10, 0.6).setOrigin(0).setDepth(702);
      body.x = x + 14;
      body.y = y + 28;
      const hint = addText(this, 0, y + h - 15, '{btn:confirm}', { depth: 702 });
      hint.x = x + w - hint.textWidth - 10;
      const parts = [panel, head, rule, body, hint];
      parts.forEach((p) => (p.alpha = 0));
      this.tweens.add({ targets: parts, alpha: 1, duration: 150 });
      this.app.audio.ui('menu_open');
      this.tutorialOpen = { parts, resolve };
    });
  }

  /**
   * A quick timing prompt: a marker swings along a bar; press Confirm as it
   * crosses the green. It's a skill check on one of the captain's stats (the
   * kind's `stat`, shown on the panel): a better stat makes the green wider
   * and the marker slower. Pressing off the green is a fumble: the bar locks
   * for a moment, so hammering the button is slower than waiting for the
   * green. Nothing can fail: three fumbles in a row and the green widens,
   * five and it's steadied for you. Clean strikes (no fumble before them)
   * earn a little XP. Resolves with the number of clean strikes.
   * `speed` scales the marker and `zone` is the green zone's width in px
   * (Shark Duty makes each shark harder).
   */
  repair({ kind = 'hull', strikes = 3, title = null, speed = 1, zone: zoneWidth = 26 } = {}) {
    const K = REPAIR_KINDS[kind] ?? REPAIR_KINDS.hull;
    const skill = this.skillFor(K.stat);
    return new Promise((resolve) => {
      const w = 208;
      const h = 64;
      const x = Math.round((SCREEN_WIDTH - w) / 2);
      const y = 132;
      const D = 720;
      const panel = addPanel(this, x, y, w, h, { depth: D });
      const head = addText(this, 0, y + 7, title ?? K.title, { font: 'bold', color: UI_COLORS.gold, depth: D + 2, maxWidth: w - 16 });
      centerText(head, SCREEN_WIDTH / 2);
      const barX = x + 24;
      const barW = w - 48;
      const barY = y + 26;
      const back = this.add.rectangle(barX, barY, barW, 8, 0x1a1320).setOrigin(0).setDepth(D + 1);
      const zone = this.add.rectangle(barX, barY, 26, 8, 0x7cb45a).setOrigin(0).setDepth(D + 2);
      const mark = this.add.rectangle(barX, barY - 3, 3, 14, 0xfff4e0).setOrigin(0.5, 0).setDepth(D + 3);
      const hint = addText(this, 0, y + 41, `{btn:confirm} ${K.hint}`, { depth: D + 2, maxWidth: w - 12 });
      centerText(hint, SCREEN_WIDTH / 2);
      const nails = [];
      for (let i = 0; i < strikes; i++) {
        nails.push(this.add.rectangle(x + w / 2 - (strikes * 10) / 2 + i * 10 + 2, y + h - 9, 6, 4, 0x6a6a80).setOrigin(0).setDepth(D + 2));
      }
      const parts = [panel, head, back, zone, mark, hint, ...nails];
      if (skill) {
        // Which stat this leans on, and whether it's helping (green) or not (grey).
        const color = skill.bonus > 0.05 ? '<g>' : skill.bonus < -0.05 ? '<r>' : '<w>';
        const tag = addText(this, x + 7, y + h - 13, `${skill.label} ${color}${skill.value}</>`, { depth: D + 2 });
        parts.push(tag);
      }
      parts.forEach((p) => p.setAlpha(0));
      this.tweens.add({ targets: parts, alpha: 1, duration: 150 });
      this.app.audio.ui('menu_open');
      const bonus = skill?.bonus ?? 0;
      this.repairOpen = {
        parts, resolve, zone, mark, nails, hint, barX, barW, strikes, K, skill,
        done: 0, clean: 0, misses: 0, t: 0, dir: 1, pos: 0,
        speed: (K.speed ?? 150) * speed * (1 - bonus * 0.25),
        zoneW: Math.max(8, Math.round(zoneWidth * (1 + bonus))),
        lock: 250,
      };
      this.placeRepairZone();
    });
  }

  /** The prompt under the bar, kept centred. */
  setRepairHint(r, text) {
    setText(r.hint, text);
    centerText(r.hint, SCREEN_WIDTH / 2);
  }

  /** The leader's stat a timing bar leans on, and how much it helps (-0.25 .. +0.6: a level or two shows). */
  skillFor(stat) {
    const def = SKILL_STATS[stat];
    const leader = this.app.session?.party?.leader?.();
    if (!def || !leader) return null;
    const value = leader.stat(stat);
    const luck = leader.stat('luck') ?? 0;
    return { stat, label: def.label, value, luck, bonus: Math.max(-0.25, Math.min(0.6, (value - def.ref) / (def.ref * 3))) };
  }

  placeRepairZone() {
    const r = this.repairOpen;
    const steadied = r.misses >= 5 || this.app.flags?.autoTiming;
    const widened = !steadied && r.misses >= 3;
    const zw = steadied ? r.barW : Math.min(r.barW - 24, Math.round(r.zoneW * (widened ? 1.6 : 1)));
    r.zone.width = zw;
    r.zone.x = steadied ? r.barX : r.barX + 12 + Math.floor(Math.random() * (r.barW - zw - 24));
    r.zone.setFillStyle(steadied || widened ? 0x9ad07a : 0x7cb45a);
    if (steadied && r.misses >= 5) this.setRepairHint(r, '<g>Steady... now!</>');
    else if (widened) this.setRepairHint(r, '<g>Easy. Wait for it...</>');
  }

  updateRepair(delta, input) {
    const r = this.repairOpen;
    r.lock -= delta;
    if (r.lock <= 0 && r.fumbled) {
      r.fumbled = false;
      r.mark.setFillStyle(0xfff4e0);
    }
    // The marker stands still while fumbled (you've dropped the hammer).
    if (!r.fumbled) {
      r.pos += r.dir * r.speed * (delta / 1000);
      if (r.pos >= r.barW) { r.pos = r.barW; r.dir = -1; }
      if (r.pos <= 0) { r.pos = 0; r.dir = 1; }
      r.mark.x = Math.round(r.barX + r.pos);
    }
    if (!input.pressed('confirm')) return;
    input.consume('confirm');
    if (r.lock > 0) return;
    r.lock = 160;
    const hit = r.mark.x >= r.zone.x - 2 && r.mark.x <= r.zone.x + r.zone.width + 2;
    if (!hit) {
      // Luck: now and then a bad swing comes good anyway (no fumble).
      if (r.skill && Math.random() * 100 < r.skill.luck) {
        this.setRepairHint(r, '<y>Lucky!</> Again!');
        this.app.audio.sfx(r.K.miss, { rate: 1.2 });
        return;
      }
      r.misses += 1;
      r.fumbles = (r.fumbles ?? 0) + 1;
      r.lock = FUMBLE_MS;
      r.fumbled = true;
      r.mark.setFillStyle(0xd04040);
      this.app.audio.sfx(r.K.miss);
      this.tweens.add({ targets: r.mark, alpha: 0.3, duration: 80, yoyo: true });
      this.setRepairHint(r, '<r>Fumbled!</> Wait for the green.');
      this.placeRepairZone();
      return;
    }
    this.app.audio.sfx(r.K.hit, { rate: 0.95 + r.done * 0.06 });
    if (r.misses === 0) r.clean += 1;
    r.nails[r.done].setFillStyle(r.misses === 0 ? 0xe0ad38 : 0xa08a5a);
    r.done += 1;
    r.misses = 0;
    const k = this.app.settings.shakeScale?.() ?? 1;
    if (k > 0) this.scene.get('World')?.cameras?.main?.shake(90, 0.004 * k);
    if (r.done < r.strikes) {
      r.speed += 22;
      this.setRepairHint(r, `{btn:confirm} ${r.K.hint}`);
      this.placeRepairZone();
      return;
    }
    this.repairOpen = null;
    this.app.audio.sfx(r.K.done);
    this.skillReward(r);
    // The story carries on once the panel has gone, so the next line never
    // opens underneath it.
    this.tweens.add({
      targets: r.parts, alpha: 0, delay: 250, duration: 160,
      onComplete: () => { r.parts.forEach((p) => p.destroy()); r.resolve(r.clean); },
    });
  }

  /** Clean work earns a little experience (a clean sweep a little more). */
  skillReward(r) {
    const session = this.app.session;
    if (!session || !r.clean) return;
    const xp = r.clean * SKILL_XP.clean + (r.clean === r.strikes ? SKILL_XP.sweep : 0);
    session.grantRewards({ xp, source: 'skill' });
    this.toasts.push({ text: r.clean === r.strikes ? `Clean work! <y>+${xp} XP</>` : `<y>+${xp} XP</>`, hold: 1400 });
  }

  /**
   * The course dial (Phase 4: the helm is blocked and the ship drifts): a
   * small compass at the top left with the ordered course in gold and the
   * ship's heading as a red needle, and how far off course she is, in words
   * and degrees.
   *   course('show', { heading, target }) · course('drift', { to, duration }) · course('hide')
   */
  course(mode, { heading, target, to, duration = 4000, label = null } = {}) {
    if (mode === 'hide') {
      const c = this.courseDial;
      this.courseDial = null;
      if (c) this.tweens.add({ targets: c.parts, alpha: 0, duration: 250, onComplete: () => c.parts.forEach((p) => p.destroy()) });
      return Promise.resolve();
    }
    if (!this.courseDial) {
      const D = 440;
      const x = 6;
      const y = 30;
      const panel = addPanel(this, x, y, 96, 58, { depth: D });
      const g = this.add.graphics().setDepth(D + 1);
      const title = addText(this, x + 46, y + 6, 'COURSE', { font: 'bold', color: UI_COLORS.gold, depth: D + 1 });
      const text = addText(this, x + 46, y + 20, '', { depth: D + 1, maxWidth: 46 });
      this.courseDial = { parts: [panel, g, title, text], g, text, x, y, rect: { x, y, w: 96, h: 58 }, heading: heading ?? 0, target: target ?? 0, label };
      this.courseDial.parts.forEach((p) => p.setAlpha(0));
      this.tweens.add({ targets: this.courseDial.parts, alpha: 1, duration: 200 });
    }
    const c = this.courseDial;
    if (heading !== undefined) c.heading = heading;
    if (target !== undefined) c.target = target;
    if (label !== null) c.label = label;
    this.drawCourse();
    if (mode !== 'drift' || to === undefined) return Promise.resolve();
    return new Promise((resolve) => {
      this.tweens.add({
        targets: c, heading: to, duration, ease: 'Sine.InOut',
        onUpdate: () => this.drawCourse(),
        onComplete: () => {
          this.drawCourse();
          resolve();
        },
      });
    });
  }

  drawCourse() {
    const c = this.courseDial;
    if (!c) return;
    const cx = c.x + 24;
    const cy = c.y + 30;
    const r = 18;
    const g = c.g;
    g.clear();
    g.fillStyle(0x0e1622, 1).fillCircle(cx, cy, r);
    g.lineStyle(1, 0x8a7a5a, 1).strokeCircle(cx, cy, r);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const k = i % 2 ? 0.8 : 0.66;
      g.lineStyle(1, 0x6a5a48, 1).lineBetween(cx + Math.sin(a) * r * k, cy - Math.cos(a) * r * k, cx + Math.sin(a) * r, cy - Math.cos(a) * r);
    }
    const at = (deg, len) => [cx + Math.sin((deg * Math.PI) / 180) * len, cy - Math.cos((deg * Math.PI) / 180) * len];
    const [tx, ty] = at(c.target, r - 2);
    g.lineStyle(2, 0xe0ad38, 1).lineBetween(cx, cy, tx, ty);
    const [hx, hy] = at(c.heading, r - 3);
    g.lineStyle(2, 0xe44c3a, 1).lineBetween(cx, cy, hx, hy);
    g.fillStyle(0xfff4e0, 1).fillCircle(cx, cy, 1.5);
    const off = Math.round(Math.abs(((c.heading - c.target + 540) % 360) - 180));
    const words = c.label ?? (off < 4 ? '<g>On course</>' : off < 20 ? '<y>Drifting</>' : '<r>Off course</>');
    setText(c.text, `${words}\n<k>${off}°</>`);
  }

  /**
   * The Shark Duty board (top centre, between the rails): the duty's
   * name, how many sharks have been seen off, and how many are at the rail
   * now. Null hides it.
   */
  setDutyBoard(state) {
    if (!state) {
      this.dutyBoard?.parts.forEach((p) => p.destroy());
      this.dutyBoard = null;
      return;
    }
    const D = 430;
    if (!this.dutyBoard) {
      const panel = addPanel(this, 0, 0, 10, 10, { depth: D });
      const head = addText(this, 0, 0, '', { font: 'bold', color: 0xe86050, depth: D + 1 });
      const body = addText(this, 0, 0, '', { depth: D + 1 });
      const at = addText(this, 0, 0, '', { depth: D + 1 });
      this.dutyBoard = { parts: [panel, head, body, at], panel, head, body, at };
    }
    const b = this.dutyBoard;
    setText(b.head, state.title);
    setText(b.body, state.text ?? '');
    const pace = state.pace ? `  <k>Sharks: ${state.pace}</>` : '';
    setText(b.at, (state.sharks ? `<r>At the rail: ${state.sharks}</>` : '<k>Rail clear</>') + pace);
    const w = Math.max(b.head.textWidth, b.body.textWidth, b.at.textWidth) + 16;
    const h = 44;
    // Top centre: clear of both rails, which run down the screen's edges.
    const x = Math.round((SCREEN_WIDTH - w) / 2);
    const y = 30;
    b.panel.destroy();
    b.panel = addPanel(this, x, y, w, h, { depth: D });
    b.parts[0] = b.panel;
    b.rect = { x, y, w, h };
    b.head.setPosition(x + 8, y + 5);
    b.body.setPosition(x + 8, y + 18);
    b.at.setPosition(x + 8, y + 29);
  }

  /** Chapter / notice banner across the middle of the screen. */
  banner(text, sub = null, { hold = 1900 } = {}) {
    return new Promise((resolve) => {
      // A long title wraps onto a second line, centred; one that still
      // doesn't fit drops to the smaller heading font.
      const maxW = SCREEN_WIDTH - 24;
      let big = addText(this, 0, 0, text, { font: 'big', color: UI_COLORS.gold, maxWidth: maxW, depth: 902 });
      if (big.textWidth > maxW || big.text.split('\n').length > 2) {
        big.destroy();
        big = addText(this, 0, 0, text, { font: 'bold', color: UI_COLORS.gold, maxWidth: maxW, depth: 902 });
      }
      big.setCenterAlign?.();
      const lineH = this.app.fontMetrics[big.fontName].lineHeight;
      const extra = (big.text.split('\n').length - 1) * lineH;
      const h = (sub ? 48 : 34) + extra;
      const y = Math.round(78 - extra / 2);
      big.y = y + 7;
      const band = this.add.rectangle(0, y, SCREEN_WIDTH, h, 0x07060c, 0.82).setOrigin(0).setDepth(900);
      const line1 = this.add.rectangle(0, y, SCREEN_WIDTH, 1, 0xb57f22).setOrigin(0).setDepth(901);
      const line2 = this.add.rectangle(0, y + h - 1, SCREEN_WIDTH, 1, 0xb57f22).setOrigin(0).setDepth(901);
      centerText(big, SCREEN_WIDTH / 2);
      const parts = [band, line1, line2, big];
      if (sub) {
        const small = addText(this, 0, y + 33 + extra, sub, { color: 0xdccca8, maxWidth: maxW, depth: 902 });
        centerText(small, SCREEN_WIDTH / 2);
        parts.push(small);
      }
      parts.forEach((p) => (p.alpha = 0));
      this.tweens.add({
        targets: parts,
        alpha: { from: 0, to: (t) => (t === band ? 0.82 : 1) },
        duration: 400,
        hold,
        yoyo: true,
        onComplete: () => {
          parts.forEach((p) => p.destroy());
          resolve();
        },
      });
    });
  }

  /**
   * The bell protocol (Phase 4): plays the level's bell pattern and shows,
   * below the FUMES meter, the bells, what they mean, where, and the sound
   * written out, with the screen's edges pulsing once per bell. Never relies
   * on sound alone. Resolves when the warning has had its moment.
   */
  alarm(level, { where = null, hold = 2600 } = {}) {
    const def = alarmLevel(this.app.content, level);
    if (!def) return Promise.resolve();
    this.alarmParts?.forEach((p) => p.destroy());
    this.alarmParts = null;
    const D = 860;
    const col = alarmColor(def);
    const bells = Math.max(1, Math.min(6, def.bells ?? Number(level)));
    const head = addText(this, 0, 0, def.label, { font: 'bold', color: col, depth: D + 2 });
    const detail = addText(this, 0, 0, where ? `${def.text} <k>(${where})</>` : def.text, { maxWidth: SCREEN_WIDTH - 48, depth: D + 2 });
    const sound = def.sound ? addText(this, 0, 0, `<k>${def.sound}</>`, { depth: D + 2 }) : null;
    const iconsW = bells * 13;
    const w = Math.min(SCREEN_WIDTH - 16, Math.max(iconsW + head.textWidth + 26, detail.textWidth + 20, (sound?.textWidth ?? 0) + 20));
    const lines = detail.text.split('\n').length;
    const h = 36 + lines * 11 + (sound ? 11 : 0);
    const x = Math.round((SCREEN_WIDTH - w) / 2);
    const y = this.alarmTop();
    const panel = addPanel(this, x, y, w, h, { depth: D });
    this.alarmY = y;
    this.alarmBottom = y + h;
    const rule = this.add.rectangle(x + 3, y + 3, w - 6, 2, col).setOrigin(0).setDepth(D + 1);
    const icons = [];
    const startX = Math.round(SCREEN_WIDTH / 2 - (iconsW + 6 + head.textWidth) / 2);
    for (let i = 0; i < bells; i++) icons.push(this.add.image(startX + i * 13, y + 8, 'ui', 'icon_bell').setOrigin(0).setDepth(D + 2));
    head.setPosition(startX + iconsW + 6, y + 11);
    detail.setPosition(x + 10, y + 27);
    centerText(detail, SCREEN_WIDTH / 2);
    if (sound) {
      sound.y = y + 27 + lines * 11;
      centerText(sound, SCREEN_WIDTH / 2);
    }
    // The edges of the screen pulse once per bell (softer with Reduced effects).
    const reduced = this.app.settings.reducedEffects?.();
    const t = 3;
    const edges = [
      this.add.rectangle(0, 0, SCREEN_WIDTH, t, col),
      this.add.rectangle(0, SCREEN_HEIGHT - t, SCREEN_WIDTH, t, col),
      this.add.rectangle(0, 0, t, SCREEN_HEIGHT, col),
      this.add.rectangle(SCREEN_WIDTH - t, 0, t, SCREEN_HEIGHT, col),
    ].map((r) => r.setOrigin(0).setDepth(D - 1).setAlpha(0));
    const parts = [panel, rule, head, detail, ...(sound ? [sound] : []), ...icons];
    this.alarmPanel = parts;
    this.alarmParts = [...parts, ...edges];
    parts.forEach((p) => p.setAlpha(0));
    this.tweens.add({ targets: parts, alpha: 1, duration: 160 });
    this.tweens.add({ targets: edges, alpha: { from: 0, to: reduced ? 0.35 : 0.8 }, duration: 180, yoyo: true, hold: 60, repeat: bells - 1, repeatDelay: 180 });
    // Each bell swings as it rings.
    icons.forEach((ic, i) => this.tweens.add({ targets: ic, angle: { from: -18, to: 18 }, duration: 150, yoyo: true, repeat: 2, delay: i * 240 }));
    if (def.sfx) this.app.audio.sfx(def.sfx);
    const mine = this.alarmParts;
    return new Promise((resolve) => {
      this.time.delayedCall(hold, () => {
        if (this.alarmParts !== mine) return resolve();
        this.tweens.add({ targets: mine, alpha: 0, duration: 320, onComplete: () => {
          mine.forEach((p) => p.destroy());
          if (this.alarmParts === mine) this.alarmParts = null;
          resolve();
        } });
      });
    });
  }

  /** Under the dialogue window when it is docked along the top, so neither hides the other. */
  alarmTop() {
    return this.dialogue.open && this.dialogue.dock === 'top' ? this.dialogue.boxY + 68 : 34;
  }

  /** Follows the dialogue window: back up to the top once a top-docked window closes. */
  relayoutAlarm() {
    if (!this.alarmParts) return;
    const y = this.alarmTop();
    if (y === this.alarmY) return;
    const dy = y - this.alarmY;
    this.alarmY = y;
    this.alarmBottom += dy;
    for (const p of this.alarmPanel) p.y += dy;
  }

  /** Top edge for corner notices: below the dialogue window while it is docked along the top. */
  topClear(pad) {
    return this.dialogue.open && this.dialogue.dock === 'top' ? this.dialogue.boxY + 66 : pad;
  }

  /**
   * Top edge for something in the columns x0..x1 at the top of the screen
   * (toasts on the left, the room's name on the right): below the dialogue
   * window when it's docked at the top, and below any HUD panel showing in
   * those columns (the FUMES meter, the course dial, the Shark Duty board).
   */
  clearBelowHud(pad, x0, x1) {
    let top = this.topClear(pad);
    for (const h of [this.meter, this.courseDial, this.dutyBoard]) {
      const r = h?.rect;
      // (one fading out still counts until it's gone)
      if (!r || r.x >= x1 || r.x + r.w <= x0) continue;
      top = Math.max(top, r.y + r.h + 3);
    }
    return top;
  }

  /** Small location title shown when entering a map (top-right, clear of toasts and the HUD). */
  locationTitle(name) {
    this.locationParts?.forEach((p) => p.destroy());
    // Room for toasts on the left (TOAST_TEXT_WIDTH): a long name wraps.
    const t = addText(this, 0, 0, name, { font: 'bold', color: 0xfff4e0, depth: 850, maxWidth: SCREEN_WIDTH - TOAST_TEXT_WIDTH - 52 });
    const w = t.textWidth + 24;
    const x = SCREEN_WIDTH - w - 6;
    const top = this.clearBelowHud(5, x, SCREEN_WIDTH);
    const panel = addPanel(this, x, top, w, 8 + t.text.split('\n').length * 12, { depth: 849 });
    t.x = x + 12;
    t.y = top + 5;
    const parts = [panel, t];
    this.locationParts = parts;
    parts.forEach((p) => (p.alpha = 0));
    this.tweens.add({
      targets: parts,
      alpha: 1,
      duration: 250,
      hold: 1500,
      yoyo: true,
      onComplete: () => parts.forEach((p) => p.destroy()),
    });
  }

  /** Context hint at the bottom-right, e.g. "{btn:confirm} Talk". Null hides it. */
  setHint(text) {
    if (this.hintText === text) return;
    this.hintText = text;
    this.hint?.forEach((p) => p.destroy());
    this.hint = null;
    if (!text) return;
    const t = addText(this, 0, SCREEN_HEIGHT - 15, text, { depth: 400 });
    t.x = SCREEN_WIDTH - t.textWidth - 7;
    const bg = this.add.rectangle(t.x - 4, SCREEN_HEIGHT - 17, t.textWidth + 8, 14, 0x07060c, 0.6).setOrigin(0).setDepth(399);
    this.hint = [bg, t];
  }

  /**
   * The FUMES meter (top centre). `state` is { value: 0..1, level } or null
   * to hide it. It appears only when exposure matters.
   */
  setExposure(state) {
    if (!state) {
      if (this.meter && !this.meter.hiding) {
        this.meter.hiding = true;
        const m = this.meter;
        this.tweens.add({ targets: m.parts, alpha: 0, duration: 300, onComplete: () => {
          m.parts.forEach((p) => p.destroy());
          if (this.meter === m) this.meter = null;
        } });
      }
      return;
    }
    if (!this.meter || this.meter.hiding) {
      if (this.meter) this.meter.parts.forEach((p) => p.destroy());
      const w = 96;
      const x = Math.round((SCREEN_WIDTH - w) / 2);
      const y = 5;
      const panel = addPanel(this, x, y, w, 26, { depth: 420 });
      const label = addText(this, x + 7, y + 4, 'FUMES', { font: 'bold', color: 0xf0d860, depth: 421 });
      const barBack = this.add.rectangle(x + 8, y + 17, w - 16, 4, 0x1a1320).setOrigin(0).setDepth(421);
      const bar = this.add.rectangle(x + 8, y + 17, 1, 4, 0x7cb45a).setOrigin(0).setDepth(422);
      const tag = addText(this, x + 48, y + 5, '', { color: 0xdccca8, depth: 421 });
      const parts = [panel, label, barBack, bar, tag];
      parts.forEach((p) => p.setAlpha(0));
      this.tweens.add({ targets: parts, alpha: 1, duration: 200 });
      this.meter = { parts, bar, tag, barW: w - 16, level: undefined, t: 0, rect: { x, y, w, h: 26 } };
    }
    const m = this.meter;
    const v = Math.max(0, Math.min(1, state.value));
    m.bar.width = Math.max(1, Math.round(m.barW * v));
    const col = v < 0.35 ? 0x7cb45a : v < 0.6 ? 0xe0ad38 : v < 0.8 ? 0xe07a28 : 0xe43c3a;
    m.bar.setFillStyle(col);
    if (m.level !== state.level) {
      m.level = state.level;
      const names = { light: '<k>light</>', dense: '<o>DENSE</>', center: '<r>DEAD CENTER</>' };
      setText(m.tag, names[state.level] ?? '');
    }
    // Pulse when close to collapsing.
    m.t += 16;
    const pulse = v > 0.7 ? 0.55 + 0.45 * Math.abs(Math.sin(m.t / 140)) : 1;
    m.bar.setAlpha(pulse);
  }

  refreshHint() {
    const text = this.hintText;
    this.hintText = null;
    this.setHint(text);
  }

  fadeOut(duration = 300, color = 0x000000) {
    this.fader.setFillStyle(color);
    this.tweens.killTweensOf(this.fader);
    if (duration <= 0) {
      this.fader.setAlpha(1);
      return Promise.resolve();
    }
    return this.tweenAsync({ targets: this.fader, alpha: 1, duration });
  }

  fadeIn(duration = 300) {
    this.tweens.killTweensOf(this.fader);
    if (duration <= 0) {
      this.fader.setAlpha(0);
      return Promise.resolve();
    }
    return this.tweenAsync({ targets: this.fader, alpha: 0, duration });
  }

  /** Clears anything left on screen (used when returning to the title). */
  reset() {
    this.dialogue.forceClose();
    this.toasts.clear();
    this.setHint(null);
    this.setExposure(null);
    this.app.cinema?.reset();
    if (this.tutorialOpen) {
      this.tutorialOpen.parts.forEach((p) => p.destroy());
      this.tutorialOpen = null;
    }
    if (this.repairOpen) {
      this.repairOpen.parts.forEach((p) => p.destroy());
      this.repairOpen = null;
    }
  }
}
