import { asArray } from '../../core/util.js';
import { evaluateCondition, splitObjectiveRef } from '../conditions/conditions.js';
import { parseLine } from './parseLine.js';

/**
 * Implementations of every script command.
 *
 * Commands never touch Phaser directly. They call *services* supplied in the
 * script context by whichever scene runs the script:
 *
 *   ctx.services.dialogue  say(line) · choose({prompt, options, cancelIndex}) · close() · tutorial({title,text})
 *   ctx.services.ui        notify(event) · banner(text, sub) · openShop(id)
 *   ctx.services.audio     sfx(id) · music(id, opts) · ambience(id)
 *   ctx.services.world     move/face/anim/emote/spawn/despawn/place/camera/shake/flash/fade/transition/...
 *   ctx.services.battle    start(encounterId) -> 'win' | 'lose' | 'flee'
 *   ctx.services.saves     autosave()
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
      ctx.services.audio?.sfx(step.sfx);
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
    emote: (step, ctx) => service(ctx, 'world', 'emote').emote(step.emote, step.icon, step.duration),
    spawn: (step, ctx) => service(ctx, 'world', 'spawn').spawn(step.spawn, { id: step.id, x: step.x, y: step.y, facing: step.facing }),
    despawn: (step, ctx) => service(ctx, 'world', 'despawn').despawn(step.despawn),
    place: (step, ctx) => service(ctx, 'world', 'place').place(step.place, step.x, step.y, step.facing),
    camera: (step, ctx) =>
      service(ctx, 'world', 'camera').camera(step.camera, { x: step.x, y: step.y, actor: step.actor, duration: step.duration }),
    shake: (step, ctx) => service(ctx, 'world', 'shake').shake(step.shake, step.duration),
    flash: (step, ctx) => service(ctx, 'world', 'flash').flash(step.flash, step.duration),
    fade: (step, ctx) => service(ctx, 'world', 'fade').fade(step.fade, { duration: step.duration, color: step.color }),
    transition: (step, ctx) =>
      service(ctx, 'world', 'transition').transition(step.transition, { spawn: step.spawn, x: step.x, y: step.y, facing: step.facing }),
    showObject: (step, ctx) => service(ctx, 'world', 'showObject').setObjectVisible(step.showObject, true),
    hideObject: (step, ctx) => service(ctx, 'world', 'hideObject').setObjectVisible(step.hideObject, false),
    effect: (step, ctx) => service(ctx, 'world', 'effect').effect(step.effect, { actor: step.actor, x: step.x, y: step.y }),
    battle: async (step, ctx, frame) => {
      const result = await service(ctx, 'battle', 'battle').start(step.battle);
      if (result === 'win' && step.win) return ctx.runner.execBranch(step.win, ctx, frame);
      if (result === 'lose' && step.lose) return ctx.runner.execBranch(step.lose, ctx, frame);
      return null;
    },
    shop: (step, ctx) => service(ctx, 'ui', 'shop').openShop(step.shop),
  };
}
