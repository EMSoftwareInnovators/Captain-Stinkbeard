import { BaseScene } from './BaseScene.js';
import { BattleEngine } from '../systems/battle/BattleEngine.js';
import { BattlerView } from '../battle/BattlerView.js';
import { BattleHud, HUD_Y } from '../battle/BattleHud.js';
import { getTimingPresenter } from '../battle/timing/index.js';
import { Rng } from '../core/Rng.js';
import { ENGINE_FLAGS } from '../config/engineFlags.js';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../config/constants.js';

/** Enemy formation (feet positions) by encounter size; extra/summoned foes use SPARE_SLOTS. */
const ENEMY_LAYOUTS = {
  1: [[84, 134]],
  2: [[100, 124], [56, 146]],
  3: [[104, 116], [52, 128], [100, 150]],
  4: [[108, 112], [60, 118], [104, 150], [52, 148]],
};
const SPARE_SLOTS = [[40, 104], [140, 138], [132, 104], [28, 136]];
const PARTY_SLOTS = [[238, 136], [268, 116], [270, 152]];

/**
 * Turn-based battle presentation.
 *
 * The rules live in BattleEngine (pure JS). This scene asks it for turns,
 * collects the player's choices, plays animations and timed-input
 * mini-games, and animates the events the engine reports. Started by the
 * world with { encounter, advantage, onEnd(result) }.
 */
export class BattleScene extends BaseScene {
  constructor() {
    super('Battle');
  }

  init(data) {
    this.params = data || {};
  }

  /** Camera shake scaled by the Screen shake option (skipped when off). */
  shakeCam(duration, intensity) {
    const k = this.app.settings.shakeScale();
    if (k > 0) this.cameras.main.shake(duration, intensity * k);
  }

  create() {
    const app = this.app;
    this.content = app.content;
    this.encounter = this.content.encounters.require(this.params.encounter);
    this.frameHooks = new Set();
    this.inputHandler = null;
    this.views = new Map();
    this.lastTarget = null;
    this.lastCommand = 0;
    this.ended = false;

    const seed = this.params.seed ?? Math.floor(Math.random() * 0xffffffff);
    this.engine = new BattleEngine({
      content: this.content,
      session: this.session,
      encounterId: this.encounter.id,
      rng: new Rng(seed),
      advantage: this.params.advantage ?? 'normal',
    });

    this.cameras.main.setBackgroundColor('#07060b');
    const backdrop = `backdrop_${this.encounter.backdrop ?? 'cargo_hold'}`;
    this.add.image(0, 0, this.textures.exists(backdrop) ? backdrop : 'backdrop_cargo_hold').setOrigin(0).setDepth(0);
    this.add.rectangle(0, HUD_Y, SCREEN_WIDTH, SCREEN_HEIGHT - HUD_Y, 0x07060b).setOrigin(0).setDepth(1);

    const layout = ENEMY_LAYOUTS[this.engine.enemies.length] ?? ENEMY_LAYOUTS[4];
    this.freeSlots = [...layout.slice(this.engine.enemies.length), ...SPARE_SLOTS];
    this.engine.enemies.forEach((c, i) => {
      const [x, y] = layout[i] ?? this.freeSlots.shift();
      this.views.set(c.uid, new BattlerView(this, c, { x, y }));
    });
    this.engine.party.forEach((c, i) => {
      const [x, y] = PARTY_SLOTS[i] ?? PARTY_SLOTS[0];
      this.views.set(c.uid, new BattlerView(this, c, { x, y }));
    });
    this.hud = new BattleHud(this, this.engine);

    const audio = app.audio;
    audio.setMusicFilter(null);
    audio.setAmbience(null);
    audio.playMusic(this.encounter.music ?? 'battle', { fade: 0.15, restart: true });

    this.run().catch((err) => {
      console.error(err);
      app.overlay.toasts.push({ text: `<r>Battle error:</> ${String(err.message).slice(0, 60)}`, hold: 4000 });
      this.end('flee');
    });
  }

  // ---------------------------------------------------------------------------
  // Frame loop plumbing

  update() {
    for (const hook of [...this.frameHooks]) hook();
    if (this.inputHandler) this.inputHandler(this.controls);
  }

  addFrameHook(fn) {
    this.frameHooks.add(fn);
  }

  removeFrameHook(fn) {
    this.frameHooks.delete(fn);
  }

  waitUntil(time) {
    return this.wait(Math.max(0, time - this.time.now));
  }

  /** Resolves on the next confirm press. */
  waitConfirm() {
    return new Promise((resolve) => {
      this.inputHandler = (input) => {
        if (input.pressed('confirm') || input.pressed('cancel')) {
          input.consume('confirm');
          input.consume('cancel');
          this.inputHandler = null;
          resolve();
        }
      };
    });
  }

  view(c) {
    return c ? this.views.get(c.uid ?? c) : null;
  }

  // ---------------------------------------------------------------------------
  // Main loop

  async run() {
    await this.intro();
    await this.present(this.engine.start());
    await this.maybeTutorial();
    while (!this.engine.outcome) {
      const { actor, events } = this.engine.nextTurn();
      await this.present(events);
      if (!actor) break;
      this.hud.setTurnOrder(actor, this.engine.upcoming());
      this.hud.setActive(actor.uid);
      const action = actor.side === 'party' ? await this.playerTurn(actor) : this.engine.chooseEnemyAction(actor);
      await this.perform(actor, action);
      if (this.engine.outcome) break;
      await this.present(this.engine.endTurn(actor));
      this.hud.setActive(null);
      await this.wait(140);
    }
    await this.conclude(this.engine.outcome ?? 'lose');
  }

  async intro() {
    this.app.overlay.fadeIn(220);
    const tweens = [];
    for (const v of this.views.values()) {
      const from = v.isParty ? v.homeX + 110 : v.homeX - 130;
      v.sprite.x = from;
      v.updateDepth();
      tweens.push(v.moveTo(v.homeX, v.homeY, 420, 'Quad.Out'));
    }
    await Promise.all(tweens);
    for (const v of this.views.values()) v.idle();
    const names = this.engine.enemies.map((e) => e.def.name);
    const first = names[0];
    const count = names.filter((n) => n === first).length;
    const text = names.every((n) => n === first) && count > 1 ? `${count} ${first}s attack!` : `${first}${names.length > 1 ? ' and company' : ''} attack!`;
    this.hud.message(this.encounter.intro ?? text);
    await this.wait(900);
    this.hud.clearMessage();
  }

  async maybeTutorial() {
    const story = this.session.story;
    if (!this.encounter.tutorial || story.has(ENGINE_FLAGS.battleTutorial)) return;
    story.set(ENGINE_FLAGS.battleTutorial);
    const overlay = this.app.overlay;
    await overlay.tutorial({
      title: 'Timed Hits',
      text: 'When you Attack, a ring closes in on the target. Press {btn:confirm} as it meets the gold ring and the blade lands for a <y>GOOD</>, <y>GREAT</> or <y>PERFECT</> strike.',
    });
    await overlay.tutorial({
      title: 'Guarding',
      text: "When an enemy lunges at you, press {btn:confirm} just as the blow lands to guard and take less damage. Mashing early won't work.",
    });
    await overlay.tutorial({
      title: "Captain's Orders",
      text: "Great strikes and Defending earn <y>Command</> (the gold pips). Spend it on Orders: <y>BRACE!</> toughens your side, <y>FOCUS FIRE!</> marks a foe to take extra damage.",
    });
  }

  // ---------------------------------------------------------------------------
  // Player input

  async playerTurn(actor) {
    const v = this.view(actor);
    v.sprite.y = v.homeY;
    for (;;) {
      const actions = this.engine.availableActions(actor);
      const inputDone = this.enableMenuInput();
      const cmd = await this.hud.openCommands(actor, {
        canFlee: actions.canFlee,
        hasItems: actions.items.length > 0,
        hasOrders: actions.orders.length > 0,
        index: this.lastCommand,
      });
      inputDone();
      this.lastCommand = ['attack', 'orders', 'items', 'defend', 'flee'].indexOf(cmd);
      this.hud.closeCommands();
      this.hud.refreshEnemies();
      this.hud.clearMessage();
      if (cmd === 'attack') {
        const targets = await this.selectTargets(actor, actions.attack.target);
        if (targets) return { type: 'ability', ability: actions.attack.id, targets };
      } else if (cmd === 'orders') {
        const ab = await this.pickOrder(actor, actions.orders);
        if (!ab) continue;
        const targets = await this.selectTargets(actor, ab.target);
        if (targets) return { type: 'ability', ability: ab.id, targets };
      } else if (cmd === 'items') {
        const item = await this.pickItem(actions.items);
        if (!item) continue;
        const targets = await this.selectTargets(actor, item.use?.target ?? 'ally');
        if (targets) return { type: 'item', item: item.id, targets };
      } else if (cmd === 'defend') {
        return { type: 'defend' };
      } else if (cmd === 'flee') {
        return { type: 'flee' };
      }
    }
  }

  /** Routes frame input to the HUD menus while a menu promise is pending. */
  enableMenuInput() {
    this.inputHandler = (input) => this.hud.update(input);
    return () => {
      this.inputHandler = null;
    };
  }

  async pickOrder(actor, orders) {
    const res = actor.resource;
    const entries = orders.map(({ ability, affordable }) => ({
      label: ability.name,
      value: ability.id,
      disabled: !affordable,
      right: `${ability.cost?.[res?.id] ?? 0} CMD`,
      rightColor: affordable ? 0xf8d86c : undefined,
      description: ability.description,
    }));
    const done = this.enableMenuInput();
    const id = await this.hud.openSubmenu({
      title: `Orders  (${res?.current ?? 0}/${res?.max ?? 0} CMD)`,
      entries,
      describe: (e) => this.hud.message(e?.description ?? '', { small: true }),
    });
    done();
    this.hud.closeSubmenu();
    this.hud.clearMessage();
    return id ? this.engine.ability(id) : null;
  }

  async pickItem(itemEntries) {
    const entries = itemEntries.map((e) => ({
      label: e.def.name,
      value: e.id,
      icon: e.def.icon,
      right: `×${e.count}`,
      description: e.def.description,
    }));
    const done = this.enableMenuInput();
    const id = await this.hud.openSubmenu({
      title: 'Items',
      entries,
      describe: (e) => this.hud.message(e?.description ?? '', { small: true }),
    });
    done();
    this.hud.closeSubmenu();
    this.hud.clearMessage();
    return id ? this.content.items.require(id) : null;
  }

  /**
   * Target selection with a pointing glove. Single targets cycle with the
   * direction buttons; group targets highlight everyone at once.
   * Resolves with a uid list, or null if cancelled.
   */
  selectTargets(actor, type) {
    if (type === 'self') return Promise.resolve([actor.uid]);
    const pool = this.engine.targetsFor(actor, type);
    if (pool.length === 0) return Promise.resolve(null);
    const group = type === 'enemies' || type === 'allies';
    const sorted = [...pool].sort((a, b) => this.view(a).homeY - this.view(b).homeY || this.view(a).homeX - this.view(b).homeX);
    let index = Math.max(0, sorted.findIndex((c) => c.uid === this.lastTarget));
    const cursors = [];
    const draw = () => {
      cursors.forEach((c) => c.destroy());
      cursors.length = 0;
      const shown = group ? sorted : [sorted[index]];
      for (const c of shown) {
        const v = this.view(c);
        const left = !v.isParty;
        const x = left ? v.x + v.sprite.displayWidth / 2 - 2 : v.x - v.sprite.displayWidth / 2 - 12;
        const cur = this.add.image(Math.round(x), v.hitY - 5, 'ui', 'cursor').setOrigin(0, 0).setDepth(960).setFlipX(left);
        this.tweens.add({ targets: cur, x: left ? '+=2' : '-=2', duration: 260, yoyo: true, repeat: -1 });
        cursors.push(cur);
        if (!v.isParty) v.showHp(0);
      }
      for (const e of this.engine.enemies) if (!shown.includes(e)) this.view(e)?.hideHp();
      const label = group ? (type === 'enemies' ? 'All enemies' : 'All allies') : sorted[index].name;
      this.hud.message(label);
      this.hud.refreshEnemies(group ? null : sorted[index].uid);
    };
    draw();
    return new Promise((resolve) => {
      const finish = (value) => {
        this.inputHandler = null;
        cursors.forEach((c) => c.destroy());
        for (const e of this.engine.enemies) this.view(e)?.hideHp();
        this.hud.clearMessage();
        this.hud.refreshEnemies();
        resolve(value);
      };
      this.inputHandler = (input) => {
        if (!group) {
          let d = 0;
          if (input.repeat('down') || input.repeat('right')) d = 1;
          if (input.repeat('up') || input.repeat('left')) d = -1;
          if (d) {
            index = (index + d + sorted.length) % sorted.length;
            this.app.audio.ui('cursor');
            draw();
          }
        }
        if (input.pressed('confirm')) {
          input.consume('confirm');
          this.app.audio.ui('confirm');
          if (!group) this.lastTarget = sorted[index].uid;
          finish(group ? sorted.map((c) => c.uid) : [sorted[index].uid]);
        } else if (input.pressed('cancel')) {
          input.consume('cancel');
          this.app.audio.ui('cancel');
          finish(null);
        }
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Actions

  async perform(actor, action) {
    switch (action.type) {
      case 'ability': {
        const ab = this.engine.ability(action.ability);
        if (ab.kind === 'order') return this.performOrder(actor, ab, action);
        if (ab.kind === 'summon') return this.performSummon(actor, ab, action);
        if (actor.side === 'party') return this.performPartyAttack(actor, ab, action);
        return this.performEnemyAction(actor, ab, action);
      }
      case 'item':
        return this.performItem(actor, action);
      case 'defend':
        return this.performDefend(actor, action);
      case 'flee':
        return this.performFlee(actor, action);
      default:
        throw new Error(`Unknown action ${action.type}`);
    }
  }

  firstAlive(list) {
    return list.find((c) => c.isAlive()) ?? null;
  }

  async performPartyAttack(actor, ab, action) {
    const v = this.view(actor);
    let target = this.engine.get(action.targets?.[0]);
    if (!target?.isAlive()) target = this.firstAlive(this.engine.enemies);
    if (!target) return;
    action = { ...action, targets: [target.uid] };
    const tv = this.view(target);
    this.hud.message(ab.name);
    await v.moveTo(tv.x + Math.round(tv.sprite.displayWidth / 2) + 14, tv.homeY + 1, 260, 'Quad.Out');
    v.pose('windup');
    const mechanic = ab.timing ? this.content.timing.get(ab.timing) : null;
    let grade = 'none';
    const impact = () => {
      v.pose('swing');
      this.time.delayedCall(50, () => v.pose('strike'));
      this.app.audio.sfx('sword_swing');
      this.spawnFx(ab.anim ?? 'slash', tv.hitX, tv.hitY);
    };
    if (mechanic) {
      const presenter = getTimingPresenter(mechanic.type);
      const r = await presenter.run(this, { mechanic, target: tv, actor: v, hooks: { impact } });
      grade = r.grade;
      if (r.early) this.hud.popup(v, 'Too early', 'info', { dy: -8 });
    } else {
      await this.wait(260);
      impact();
    }
    if (grade !== 'none') {
      this.hud.grade(tv, grade);
      this.app.audio.sfx(`timing_${grade}`);
    }
    const { events } = this.engine.execute(actor, action, { timing: grade });
    await this.present(events);
    await this.wait(200);
    this.hud.clearMessage();
    v.pose('ready');
    await v.returnHome(240);
    v.idle();
  }

  async performEnemyAction(actor, ab, action) {
    const v = this.view(actor);
    const targets = (action.targets || []).map((u) => this.engine.get(u)).filter(Boolean);
    let target = targets[0];
    if (target && !target.isAlive() && target.side === 'party') target = this.firstAlive(this.engine.party);
    const tv = target ? this.view(target) : null;
    this.hud.message(`${actor.name}: ${ab.name}`);
    if ((ab.power ?? 0) > 0 && tv && target.side === 'party') {
      // Tell, lunge and a guard window on impact.
      this.spawnTell(v);
      await v.moveTo(v.x - 5, v.y, 170, 'Quad.Out');
      const lungeMs = 250;
      const impactAt = this.time.now + lungeMs;
      const guardMech = this.content.timing.get(target.def.battle?.guard ?? 'guard');
      const guardP = guardMech ? getTimingPresenter(guardMech.type).run(this, { mechanic: guardMech, target: tv, impactAt }) : Promise.resolve({ grade: 'none' });
      v.pose('attack');
      const destX = tv.x - Math.round(v.sprite.displayWidth / 2) - 10;
      await v.moveTo(destX, tv.homeY + 2, lungeMs, 'Quad.In');
      this.spawnFx('bite', tv.hitX - 6, tv.hitY);
      const guard = await guardP;
      if (guard.grade !== 'none') {
        tv.pose('defend');
        this.spawnShield(tv);
        this.hud.grade(tv, guard.grade === 'perfect' ? 'perfect' : 'good');
        this.app.audio.sfx('defend');
      }
      const { events } = this.engine.execute(actor, action, { guard: guard.grade });
      await this.present(events);
      await this.wait(180);
      await v.returnHome(260);
      v.idle();
      if (target.isAlive()) tv.idle();
    } else {
      v.pose('attack');
      await v.moveTo(v.x + 6, v.y, 140, 'Quad.Out');
      if (ab.sfx) this.app.audio.sfx(ab.sfx);
      const { events } = this.engine.execute(actor, action);
      await this.present(events);
      await this.wait(200);
      await v.returnHome(200);
      v.idle();
    }
    this.hud.clearMessage();
  }

  async performOrder(actor, ab, action) {
    const v = this.view(actor);
    v.pose('order');
    this.app.audio.sfx('order');
    this.hud.shout(v, ab.shout ?? ab.name);
    this.shakeCam(120, 0.004);
    await this.wait(620);
    const { events } = this.engine.execute(actor, action);
    await this.present(events);
    await this.wait(250);
    v.idle();
  }

  async performSummon(actor, ab, action) {
    const v = this.view(actor);
    this.hud.message(`${actor.name}: ${ab.name}`);
    v.pose('attack');
    if (ab.sfx) this.app.audio.sfx(ab.sfx);
    this.shakeCam(160, 0.005);
    await this.wait(420);
    const { events } = this.engine.execute(actor, action);
    await this.present(events);
    v.idle();
    this.hud.clearMessage();
  }

  async performItem(actor, action) {
    const v = this.view(actor);
    const def = this.content.items.require(action.item);
    this.hud.message(def.name);
    v.pose('item');
    await this.wait(380);
    const { events } = this.engine.execute(actor, action);
    await this.present(events);
    await this.wait(250);
    v.idle();
    this.hud.clearMessage();
  }

  async performDefend(actor, action) {
    const v = this.view(actor);
    this.hud.message('Defend');
    v.pose('defend');
    this.app.audio.sfx('defend');
    const { events } = this.engine.execute(actor, action);
    await this.present(events);
    await this.wait(300);
    this.hud.clearMessage();
  }

  async performFlee(actor, action) {
    const { events } = this.engine.execute(actor, action);
    const ev = events.find((e) => e.type === 'flee');
    if (ev?.success) {
      this.app.audio.sfx('flee');
      this.hud.message('Got away safely!');
      const runs = this.engine.party.filter((c) => c.isAlive()).map((c) => {
        const pv = this.view(c);
        pv.sprite.setFlipX(true);
        return pv.moveTo(SCREEN_WIDTH + 40, pv.homeY, 520, 'Quad.In');
      });
      await Promise.all(runs);
    } else {
      this.app.audio.ui('buzzer');
      this.hud.message(ev?.blocked ? "There's no escape from this fight!" : "Couldn't get away!");
      await this.wait(900);
      this.hud.clearMessage();
    }
    await this.present(events.filter((e) => e.type !== 'flee'));
  }

  // ---------------------------------------------------------------------------
  // Event presentation

  async present(events) {
    for (const ev of events) await this.presentEvent(ev);
  }

  async presentEvent(ev) {
    const audio = this.app.audio;
    switch (ev.type) {
      case 'message':
        this.hud.message(ev.text);
        await this.wait(1000);
        this.hud.clearMessage();
        break;
      case 'damage': {
        const tv = this.view(ev.target);
        const target = this.engine.get(ev.target);
        tv.hurt();
        if (target.side === 'enemy') {
          audio.sfx(ev.crit ? 'crit_hit' : 'sword_hit');
          tv.showHp();
        } else {
          audio.sfx(ev.guard !== 'none' ? 'thud' : 'hurt');
          this.hud.updateParty();
          if (ev.guard === 'none') this.shakeCam(140, 0.006);
        }
        if (ev.crit) {
          this.cameras.main.flash(90, 255, 250, 220);
          this.hud.popup(tv, 'CRITICAL!', 'buff', { dy: -12 });
        }
        this.hud.popup(tv, ev.amount, ev.crit ? 'crit' : 'damage');
        tv.refreshStatuses();
        await this.wait(ev.killed ? 260 : 380);
        break;
      }
      case 'miss': {
        const tv = this.view(ev.target);
        audio.sfx('miss');
        this.hud.popup(tv, 'Miss', 'miss');
        if (!tv.isParty) this.tweens.add({ targets: tv.sprite, x: tv.homeX - 8, duration: 90, yoyo: true });
        await this.wait(380);
        break;
      }
      case 'ko': {
        const tv = this.view(ev.target);
        const target = this.engine.get(ev.target);
        if (target.side === 'enemy') {
          audio.sfx('enemy_die');
          const slot = [tv.homeX, tv.homeY];
          await tv.ko();
          this.freeSlots.unshift(slot);
          this.hud.refreshEnemies();
        } else {
          audio.sfx('hurt');
          await tv.ko();
          this.hud.updateParty();
          this.hud.message(`${target.name} is down!`);
          await this.wait(700);
          this.hud.clearMessage();
        }
        break;
      }
      case 'heal':
      case 'revive': {
        const tv = this.view(ev.target);
        audio.sfx('heal');
        this.spawnFx('sparkle', tv.hitX, tv.hitY - 4);
        this.hud.popup(tv, ev.amount, 'heal');
        if (ev.type === 'revive') tv.revive();
        this.hud.updateParty();
        if (!tv.isParty) tv.showHp();
        await this.wait(420);
        break;
      }
      case 'cure': {
        const tv = this.view(ev.target);
        this.hud.popup(tv, 'Cured', 'buff');
        tv.refreshStatuses();
        await this.wait(300);
        break;
      }
      case 'status': {
        const tv = this.view(ev.target);
        const def = this.content.statuses.get(ev.status);
        if (ev.resisted || !ev.applied) {
          this.hud.popup(tv, 'Resisted', 'info');
        } else {
          const debuff = def?.kind === 'debuff';
          audio.sfx(debuff ? 'debuff' : 'buff');
          this.spawnFx(debuff ? 'debuff' : 'buff', tv.hitX, tv.hitY);
          this.hud.popup(tv, def?.name ?? ev.status, debuff ? 'debuff' : 'buff');
        }
        tv.refreshStatuses();
        await this.wait(420);
        break;
      }
      case 'statusEnd': {
        const tv = this.view(ev.target);
        tv.refreshStatuses();
        if (ev.status === 'defending') tv.idle();
        break;
      }
      case 'tick': {
        const tv = this.view(ev.target);
        const target = this.engine.get(ev.target);
        audio.sfx('hurt', { volume: 0.6 });
        tv.flash(0xc080e0, 90);
        this.hud.popup(tv, ev.amount, 'tick');
        if (target.side === 'party') this.hud.updateParty();
        else tv.showHp();
        await this.wait(420);
        break;
      }
      case 'resource': {
        this.hud.updateParty();
        if (ev.gained) {
          const tv = this.view(ev.target);
          this.hud.flashPips(ev.target);
          this.hud.popup(tv, `+${ev.gained} CMD`, 'buff', { dy: -10 });
          await this.wait(200);
        }
        break;
      }
      case 'summon': {
        const c = this.engine.get(ev.target);
        const [x, y] = this.freeSlots.shift() ?? SPARE_SLOTS[0];
        const v = new BattlerView(this, c, { x, y });
        this.views.set(c.uid, v);
        v.sprite.x = -40;
        v.updateDepth();
        this.app.audio.sfx('squeak');
        await v.moveTo(x, y, 380, 'Quad.Out');
        v.idle();
        this.hud.message(`${c.name} scurries out!`);
        this.hud.refreshEnemies();
        await this.wait(800);
        this.hud.clearMessage();
        break;
      }
      case 'round':
      case 'turn':
      case 'use':
      case 'useItem':
      case 'defend':
      case 'flee':
      case 'start':
      case 'outcome':
        break;
      default:
        break;
    }
  }

  spawnFx(anim, x, y) {
    const key = `fx:${anim}`;
    if (!this.anims.exists(key)) return null;
    const s = this.add.sprite(Math.round(x), Math.round(y), 'fx').setDepth(940);
    s.play(key);
    s.once('animationcomplete', () => s.destroy());
    return s;
  }

  spawnShield(tv) {
    const s = this.add.image(tv.x - 18, tv.hitY, 'fx', 'shield_0').setDepth(945);
    this.time.delayedCall(50, () => s.setFrame('shield_1'));
    this.time.delayedCall(110, () => s.setFrame('shield_2'));
    this.tweens.add({ targets: s, alpha: 0, delay: 380, duration: 200, onComplete: () => s.destroy() });
  }

  spawnTell(v) {
    const s = this.add.image(v.hitX + 6, v.headY + 2, 'fx', 'tell').setOrigin(0.5, 1).setDepth(946);
    s.setScale(1, 0.3);
    this.tweens.add({ targets: s, scaleY: 1, duration: 90, ease: 'Back.Out' });
    this.time.delayedCall(360, () => s.destroy());
  }

  // ---------------------------------------------------------------------------
  // Ending

  async conclude(outcome) {
    this.hud.closeCommands();
    this.hud.closeSubmenu();
    this.hud.setActive(null);
    this.hud.setTurnOrder(null, []);
    const engine = this.engine;
    const session = this.session;
    if (outcome === 'win') {
      await this.wait(300);
      engine.finish();
      this.app.audio.playMusic('victory', { fade: 0.1, restart: true });
      for (const c of engine.party) this.view(c).playVictory();
      const rewards = engine.rewards();
      const summary = session.grantRewards({ ...rewards, source: 'battle' });
      this.app.bus.emit('battle:won', { encounter: this.encounter.id, tags: this.encounter.tags ?? [], enemies: [...engine.defeatedEnemies] });
      this.hud.updateParty();
      await this.wait(500);
      const results = this.hud.showResults(summary, this.content);
      if (summary.levelUps.length) this.app.audio.sfx('level_up');
      await this.waitConfirm();
      this.app.audio.ui('confirm');
      results.parts.forEach((p) => p.destroy());
      return this.end('win');
    }
    if (outcome === 'fled') {
      engine.finish();
      return this.end('flee');
    }
    // Defeat.
    engine.finish();
    if (this.encounter.nonLethal) {
      for (const m of session.party.members) m.hp = Math.max(1, m.hp);
      this.hud.message(this.encounter.loseText ?? 'You yield!');
      await this.wait(1400);
      return this.end('lose');
    }
    this.app.audio.stopMusic({ fade: 1.2 });
    this.hud.message('Blackbeard has fallen...');
    await this.wait(1500);
    await this.app.overlay.fadeOut(900);
    this.scene.stop('World');
    this.scene.start('GameOver');
  }

  async end(result) {
    if (this.ended) return;
    this.ended = true;
    this.inputHandler = null;
    this.frameHooks.clear();
    await this.app.overlay.fadeOut(320);
    const onEnd = this.params.onEnd;
    this.scene.stop();
    onEnd?.(result);
  }
}
