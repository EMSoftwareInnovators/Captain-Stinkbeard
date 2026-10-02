import { asArray } from '../../core/util.js';
import { evaluateCondition, splitObjectiveRef } from '../conditions/conditions.js';
import { parseLine } from './parseLine.js';
import { tvDef, setPower, setChannel, setTvCondition, programDef, programEpisode } from '../tv/tv.js';
import { setDeadCenterLocation } from '../hazards/deadCenter.js';
import { setSharkstormState } from '../hazards/sharkstorm.js';

/**
 * Implementations of every script command.
 *
 * Commands never touch Phaser directly. They call *services* supplied in the
 * script context by whichever scene runs the script:
 *
 *   ctx.services.dialogue  say(line) · choose({prompt, options, cancelIndex}) · close() · tutorial({title,text})
 *   ctx.services.ui        notify(event) · banner(text, sub) · openShop(id)
 *   ctx.services.audio     sfx(id) · music(id, opts) · ambience(id)
 *   ctx.services.world     move/face/anim/emote/spawn/despawn/place/restage/camera/shake/flash/fade/transition/...
 *   ctx.services.battle    start(encounterId) -> 'win' | 'lose' | 'flee'
 *   ctx.services.saves     autosave()
 *   ctx.services.cinema    show/end/move/frame/fx/insert (vistas: CinemaScene)
 *
 * This keeps scripts runnable in unit tests with mock services.
 */

function service(ctx, name, command) {
  const svc = ctx.services?.[name];
  if (!svc) throw new Error(`Command "${command}" needs the "${name}" service, which is unavailable here`);
  return svc;
}

function objectiveRef(ref) {
  const [quest, objective] = splitObjectiveRef(ref);
  if (!objective) throw new Error(`Objective reference must be "quest.objective", got "${ref}"`);
  return [quest, objective];
}

export function createCommandImplementations() {
  return {
    // --- flow -----------------------------------------------------------
    goto: (step) => ({ goto: step.goto }),
    end: () => ({ end: true }),
    call: async (step, ctx) => {
      await ctx.runner.run(step.call, ctx);
      return null;
    },
    wait: (step, ctx) => ctx.wait(step.wait),
    parallel: async (step, ctx, frame) => {
      await Promise.all(step.parallel.map((branch) => ctx.runner.execSteps(branch, ctx, frame, 'parallel')));
      return null;
    },
    choice: async (step, ctx, frame) => {
      const options = step.choice.filter((opt) => evaluateCondition(opt.if, ctx.session));
      if (options.length === 0) return null;
      let cancelIndex = step.cancel === undefined ? -1 : step.cancel;
      if (cancelIndex !== null && cancelIndex < 0) cancelIndex = options.length + cancelIndex;
      const prompt = step.prompt ? parseLine(step.prompt) : null;
      const index = await service(ctx, 'dialogue', 'choice').choose({
        prompt,
        options: options.map((o) => ({ text: o.text })),
        cancelIndex,
      });
      const picked = options[index];
      if (!picked) return null;
      if (picked.goto) return { goto: picked.goto };
      if (picked.end) return { end: true };
      if (picked.then) return ctx.runner.execBranch(picked.then, ctx, frame);
      return null;
    },

    // --- dialogue / presentation ---------------------------------------
    say: (step, ctx) => {
      const line = parseLine(step.say);
      if ('speaker' in step) line.speaker = step.speaker;
      if (step.expr) line.expression = step.expr;
      if (step.name) line.name = step.name;
      return service(ctx, 'dialogue', 'say').say(line);
    },
    narrate: (step, ctx) => service(ctx, 'dialogue', 'narrate').say({ speaker: null, expression: null, text: step.narrate }),
    close: (step, ctx) => service(ctx, 'dialogue', 'close').close(),
    tutorial: (step, ctx) => service(ctx, 'dialogue', 'tutorial').tutorial({ title: step.title ?? 'Tip', text: step.tutorial }),
    banner: (step, ctx) => service(ctx, 'ui', 'banner').banner(step.banner, step.sub),

    // --- story state ------------------------------------------------------
    setFlag: (step, ctx) => {
      asArray(step.setFlag).forEach((f) => ctx.session.story.set(f));
    },
    clearFlag: (step, ctx) => {
      asArray(step.clearFlag).forEach((f) => ctx.session.story.clear(f));
    },
    /** Where the Dead Center is now (a location id, or "none"). */
    /** Story Phase 6: moves the Great Sharkstorm to a state (and its distance with it). */
    sharkstorm: (step, ctx) => {
      setSharkstormState(ctx.session.content ?? ctx.content, ctx.session, step.sharkstorm);
      return null;
    },
    deadCenter: (step, ctx) => {
      setDeadCenterLocation(ctx.session, step.deadCenter);
      return null;
    },
    /** The bell protocol: rings (and shows) alarm level 1-4. Carries on unless "wait". */
    alarm: (step, ctx) => {
      const p = service(ctx, 'ui', 'alarm').alarm(step.alarm, { where: step.where ?? null });
      return step.wait ? p : null;
    },
    /** The course dial: show, drift the heading (waits unless async), hide. */
    course: (step, ctx) => {
      const p = service(ctx, 'ui', 'course').course(step.course, { heading: step.heading, target: step.target, to: step.to, duration: step.duration, label: step.label ?? null });
      return step.async ? null : p;
    },
    /** Operate a television (data/tv): opens the close-up and waits until the captain steps away. */
    tv: (step, ctx) => service(ctx, 'ui', 'tv').tv(step.tv, { mode: step.mode ?? 'normal' }),
    /**
     * Story Phase 6: plays a programme's episode on a vista's screen layer,
     * beat by beat (frames, sound, the laugh track, and each line said like
     * any other line). "from" / "to" pick a run of beats.
     */
    tvProgram: async (step, ctx) => {
      const content = ctx.session.content ?? ctx.content;
      const prog = programDef(content, step.tvProgram);
      if (!prog) throw new Error(`No programme "${step.tvProgram}"`);
      const ep = programEpisode(prog, ctx.session, step.episode ?? null);
      if (!ep) throw new Error(`Programme "${step.tvProgram}" has no episode "${step.episode}"`);
      const layer = step.layer ?? 'screen';
      for (const b of (ep.beats ?? []).slice(step.from ?? 0, step.to ?? undefined)) {
        if (b.frames?.length) service(ctx, 'cinema', 'tvProgram').frames(layer, b.frames, b.frameMs ?? 300);
        if (b.sfx) service(ctx, 'audio', 'tvProgram').sfx(b.sfx);
        if (b.laugh) service(ctx, 'audio', 'tvProgram').sfx(prog.laugh ?? 'ftm_laugh', { volume: 0.8 });
        if (b.line) await service(ctx, 'dialogue', 'say').say(parseLine(b.line));
        else await ctx.wait(b.ms ?? 1200);
      }
      return null;
    },
    /** Sets a television's channel and/or power from a scene (the deck set follows). */
    tvSet: (step, ctx) => {
      const def = tvDef(ctx.session.content ?? ctx.content, step.tvSet);
      if (!def) throw new Error(`No television "${step.tvSet}"`);
      if (step.power !== undefined) setPower(def, ctx.session, step.power);
      if (step.channel !== undefined) setChannel(def, ctx.session, step.channel);
      if (step.state !== undefined) setTvCondition(def, ctx.session, step.state);
    },
    /** Clears the rail at once: "stop" ends the current Shark Duty wave of sharks (they retreat). */
    sharkDuty: (step, ctx) => service(ctx, 'world', 'sharkDuty').sharkDuty(step.sharkDuty),
    setValue: (step, ctx) => {
      ctx.session.story.setValue(step.setValue, step.value ?? null);
    },
    setVar: (step, ctx) => {
      ctx.session.story.setVar(step.setVar, step.value);
    },
    addVar: (step, ctx) => {
      ctx.session.story.addVar(step.addVar, step.value);
    },
    giveItem: async (step, ctx) => {
      const count = step.count ?? 1;
      const added = ctx.session.inventory.add(step.giveItem, count);
      if (!step.silent) await ctx.services.ui?.notify({ kind: 'itemGained', id: step.giveItem, count: added, wanted: count });
    },
    takeItem: async (step, ctx) => {
      const count = step.count ?? 1;
      const ok = ctx.session.inventory.remove(step.takeItem, count);
      if (ok && !step.silent) await ctx.services.ui?.notify({ kind: 'itemLost', id: step.takeItem, count });
    },
    giveGold: async (step, ctx) => {
      const added = ctx.session.inventory.addGold(step.giveGold);
      if (!step.silent) await ctx.services.ui?.notify({ kind: 'goldGained', amount: added });
    },
    takeGold: async (step, ctx) => {
      const ok = ctx.session.inventory.spendGold(step.takeGold);
      if (ok && !step.silent) await ctx.services.ui?.notify({ kind: 'goldLost', amount: step.takeGold });
    },
    startQuest: (step, ctx) => {
      ctx.session.quests.start(step.startQuest);
    },
    completeObjective: (step, ctx) => {
      const [q, o] = objectiveRef(step.completeObjective);
      ctx.session.quests.completeObjective(q, o, { force: true });
    },
    advanceObjective: (step, ctx) => {
      const [q, o] = objectiveRef(step.advanceObjective);
      ctx.session.quests.advanceObjective(q, o, step.amount ?? 1);
    },
    completeQuest: (step, ctx) => {
      ctx.session.quests.complete(step.completeQuest);
    },
    heal: (step, ctx) => {
      if (step.heal === 'party') ctx.session.party.healAll();
      else ctx.session.party.get(step.heal)?.fullHeal();
    },
    giveXp: (step, ctx) => {
      ctx.session.grantRewards({ xp: step.giveXp });
    },
    event: (step, ctx) => {
      ctx.bus?.emit('script:event', { name: step.event });
    },
    markObject: (step, ctx) => {
      for (const [prop, value] of Object.entries(step.set)) ctx.session.world.set(step.markObject, prop, value);
    },
    joinParty: (step, ctx) => {
      ctx.session.party.add(step.joinParty);
    },
    leaveParty: (step, ctx) => {
      ctx.session.party.remove(step.leaveParty);
    },
    save: (step, ctx) => ctx.services.saves?.autosave(),

    // --- audio -----------------------------------------------------------
    sfx: (step, ctx) => {
      const opts = {};
      if (step.volume !== undefined) opts.volume = step.volume;
      if (step.rate !== undefined) opts.rate = step.rate;
      if (step.pan !== undefined) opts.pan = step.pan;
      ctx.services.audio?.sfx(step.sfx, opts);
    },
    music: (step, ctx) => {
      ctx.services.audio?.music(step.music, { fade: step.fade });
    },
    ambience: (step, ctx) => {
      ctx.services.audio?.ambience(step.ambience);
    },

    // --- world / cutscene -------------------------------------------------
    move: (step, ctx) => {
      const p = service(ctx, 'world', 'move').move(step.move, { path: step.path, to: step.to, speed: step.speed, face: step.face });
      return step.async ? null : p;
    },
    face: (step, ctx) => service(ctx, 'world', 'face').face(step.face, step.dir),
    anim: (step, ctx) => service(ctx, 'world', 'anim').anim(step.anim, step.name, step.duration),
    emote: (step, ctx) => {
      const p = service(ctx, 'world', 'emote').emote(step.emote, step.icon, step.duration);
      return step.async ? null : p;
    },
    spawn: (step, ctx) => service(ctx, 'world', 'spawn').spawn(step.spawn, { id: step.id, x: step.x, y: step.y, facing: step.facing }),
    despawn: (step, ctx) => service(ctx, 'world', 'despawn').despawn(step.despawn),
    place: (step, ctx) => service(ctx, 'world', 'place').place(step.place, step.x, step.y, step.facing),
    restage: (step, ctx) => {
      const p = service(ctx, 'world', 'restage').restage(step.restage);
      return step.async ? null : p;
    },
    camera: (step, ctx) =>
      service(ctx, 'world', 'camera').camera(step.camera, { x: step.x, y: step.y, actor: step.actor, duration: step.duration }),
    shake: (step, ctx) => {
      const p = service(ctx, 'world', 'shake').shake(step.shake, step.duration, { to: step.to ?? null });
      return step.async ? null : p;
    },
    flash: (step, ctx) => service(ctx, 'world', 'flash').flash(step.flash, step.duration),
    fade: (step, ctx) => service(ctx, 'world', 'fade').fade(step.fade, { duration: step.duration, color: step.color }),
    transition: (step, ctx) =>
      service(ctx, 'world', 'transition').transition(step.transition, {
        spawn: step.spawn, x: step.x, y: step.y, facing: step.facing, then: step.then, hidePlayer: step.hidePlayer,
        fade: step.fade, keepMusic: step.keepMusic, noAutosave: step.noAutosave,
      }),
    showObject: (step, ctx) => service(ctx, 'world', 'showObject').setObjectVisible(step.showObject, true),
    hideObject: (step, ctx) => service(ctx, 'world', 'hideObject').setObjectVisible(step.hideObject, false),
    effect: (step, ctx) => service(ctx, 'world', 'effect').effect(step.effect, { actor: step.actor, x: step.x, y: step.y }),
    fly: (step, ctx) => {
      const p = service(ctx, 'world', 'fly').fly(step.fly, { to: step.to, duration: step.duration, arc: step.arc, land: step.land, alt: step.alt, from: step.from, fromAlt: step.fromAlt });
      return step.async ? null : p;
    },
    hop: (step, ctx) => {
      const p = service(ctx, 'world', 'hop').hop(step.hop, { height: step.height, duration: step.duration });
      return step.async ? null : p;
    },
    bark: (step, ctx) => {
      service(ctx, 'world', 'bark').bark(step.bark === 'none' ? null : step.bark, step.text, { duration: step.duration, shout: step.shout, x: step.x, y: step.y });
    },
    burst: (step, ctx) => {
      service(ctx, 'world', 'burst').burst(step.burst, step);
    },
    propFx: (step, ctx) => {
      const p = service(ctx, 'world', 'propFx').propFx(step.propFx, step);
      return step.async ? null : p;
    },
    roll: (step, ctx) => {
      const p = service(ctx, 'world', 'roll').roll(step.roll, step.duration);
      return step.async ? null : p;
    },
    sprite: (step, ctx) => {
      service(ctx, 'world', 'sprite').sprite(step.sprite, step);
    },
    moveSprite: (step, ctx) => {
      const p = service(ctx, 'world', 'moveSprite').moveSprite(step.moveSprite, step);
      return step.async ? null : p;
    },
    spriteFrame: (step, ctx) => {
      service(ctx, 'world', 'spriteFrame').spriteFrame(step.spriteFrame, step.frame);
    },
    removeSprite: (step, ctx) => {
      service(ctx, 'world', 'removeSprite').removeSprite(step.removeSprite);
    },
    tether: (step, ctx) => {
      service(ctx, 'world', 'tether').tether(step.tether === 'on', { x: step.x, y: step.y });
    },
    respawn: (step, ctx) => {
      service(ctx, 'world', 'respawn').respawn(step.respawn);
    },
    fumeCloud: (step, ctx) => {
      const p = service(ctx, 'world', 'fumeCloud').fumeCloud(step.fumeCloud, step);
      return step.async ? null : p;
    },
    vista: (step, ctx) => service(ctx, 'cinema', 'vista').show(step.vista, { mask: step.mask, fade: step.fade, caption: step.caption }),
    vistaEnd: (step, ctx) => service(ctx, 'cinema', 'vistaEnd').end({ fade: step.fade }),
    vistaMove: (step, ctx) => {
      const p = service(ctx, 'cinema', 'vistaMove').move(step.vistaMove, step);
      return step.async ? null : p;
    },
    vistaFrame: (step, ctx) => {
      service(ctx, 'cinema', 'vistaFrame').frame(step.vistaFrame, step.frame);
    },
    vistaFx: (step, ctx) => {
      service(ctx, 'cinema', 'vistaFx').fx(step.vistaFx, step);
    },
    /** Story Phase 6: spins an orbit layer (the Great Sharkstorm) faster or slower. */
    vistaSpin: (step, ctx) => {
      service(ctx, 'cinema', 'vistaSpin').spin(step.vistaSpin, step.speed ?? 1);
    },
    vistaShow: (step, ctx) => {
      service(ctx, 'cinema', 'vistaShow').setVisible(step.vistaShow, step.visible !== false);
    },
    insert: (step, ctx) => service(ctx, 'cinema', 'insert').insert(step.insert, { caption: step.caption, hold: step.hold }),

    // --- Story Phase 3 ---------------------------------------------------------
    /** Opens a logbook (the Stench Log) and waits until it is closed. */
    logbook: (step, ctx) => service(ctx, 'ui', 'logbook').openLog(step.logbook, step.entry ?? null),
    /** Every one of an item becomes another ("all the rum is Frog Grog now"). */
    swapItem: async (step, ctx) => {
      const inv = ctx.session.inventory;
      const n = inv.count(step.swapItem);
      if (n > 0) inv.remove(step.swapItem, n);
      const give = n + (step.bonus ?? 0);
      if (give <= 0) return;
      const added = inv.add(step.to, give);
      if (!step.silent) await ctx.services.ui?.notify({ kind: 'itemGained', id: step.to, count: added, wanted: give });
    },
    tint: (step, ctx) => {
      const p = service(ctx, 'world', 'tint').tint(step.tint, step.color, step.duration ?? 900);
      return step.async ? null : p;
    },
    /** Holds a shark level for a scene ("auto" hands it back to the map). */
    sharks: (step, ctx) => {
      service(ctx, 'world', 'sharks').sharks(step.sharks === 'auto' ? null : step.sharks, { crowd: step.crowd ?? null });
    },
    sharkEvent: (step, ctx) => {
      const p = service(ctx, 'world', 'sharkEvent').sharkEvent(step.sharkEvent, { x: step.x, y: step.y, duration: step.duration });
      return step.async ? null : p;
    },
    /** A quick hammering prompt; the number of clean strikes can go in a variable. */
    repair: async (step, ctx) => {
      const clean = await service(ctx, 'ui', 'repair').repair({ kind: step.repair, strikes: step.strikes ?? 3, title: step.title ?? null, speed: step.speed ?? 1, zone: step.zone ?? 26 });
      if (step.var) ctx.session.story.setVar(step.var, clean ?? 0);
    },
    battle: async (step, ctx, frame) => {
      const result = await service(ctx, 'battle', 'battle').start(step.battle);
      if (result === 'win' && step.win) return ctx.runner.execBranch(step.win, ctx, frame);
      if (result === 'lose' && step.lose) return ctx.runner.execBranch(step.lose, ctx, frame);
      return null;
    },
    shop: (step, ctx) => service(ctx, 'ui', 'shop').openShop(step.shop),
  };
}
