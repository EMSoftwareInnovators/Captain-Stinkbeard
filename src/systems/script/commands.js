import { asArray } from '../../core/util.js';
import { evaluateCondition, splitObjectiveRef } from '../conditions/conditions.js';
import { parseLine } from './parseLine.js';
import { tvDef, setPower, setChannel, setTvCondition, programDef, programEpisode } from '../tv/tv.js';
import { setDeadCenterLocation } from '../hazards/deadCenter.js';
import { setSharkstormState } from '../hazards/sharkstorm.js';
import { stabilityDef, readStability, writePressure, addPressure, effectOf, promptOptions, incidentDef } from '../stability.js';
import { nextCustomer, scaleLabel, tellerScore } from '../bank.js';
import { setAtmosphere, clearRoomAtmospheres } from '../atmosphere.js';
import { addBeardTag, removeBeardTag, beardDef } from '../beard.js';
import { fartZoneDef, enqueue, enter as fzEnter, setDoor, setPortholes, release as fzRelease, ventilate, complete as fzComplete, resetZone, releaseProblems } from '../fartZone.js';
import { noveltyDef, attempt as noveltyAttempt } from '../novelty.js';
import { proceedingDef, answerEffect, hearingPassed, pitchRound } from '../proceedings.js';
import { creditDef, appraisalScore, creditClass, welcomeBonus, conversion } from '../credit.js';
import { setHornets } from '../hazards/hornets.js';

/** Story Phase 14: a stability subject (data/story/stability) with its defaults. */
export function stabilitySubject(content, id = 'brogath') {
  const raw = content.stability?.get?.(id);
  if (!raw) throw new Error(`No stability subject "${id}" (data/story/stability)`);
  return stabilityDef({ id, ...raw });
}

/** Story Phase 14: a bank (data/story/bank) by id. */
export function bankDef(content, id = 'grand_bank') {
  const b = content.banks?.get?.(id);
  if (!b) throw new Error(`No bank "${id}" (data/story/bank)`);
  return { id, ...b };
}

const fill = (str, vars) => String(str ?? '').replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));

/**
 * Story Phase 14: serves one depositor at the Grand Bank, from arrival to the
 * vault: their arrival script, the teller's window (take the sash, hold it,
 * brace), what happened (the grade goes in the bank's gradeVar), their after
 * script, the ledger (the teller picks a class; right or wrong, it's stamped),
 * then the queue moves on. Nothing can be failed.
 */
async function serveCustomer(ctx, id, queueId = null, { observe = false } = {}) {
  const content = ctx.session.content ?? ctx.content;
  const c = content.bankCustomers?.get?.(id);
  if (!c) throw new Error(`No bank customer "${id}"`);
  const bank = bankDef(content, c.bank ?? 'grand_bank');
  const story = ctx.session.story;
  if (c.intro) await ctx.runner.run(c.intro, ctx);
  // Story Phase 15: served by the branch's own teller (the captain is in bed, watching): the
  // customer's "observed" script (or the bank's) plays instead of the teller's window and the
  // ledger; their after script and the queue are the same.
  if (observe) {
    const watched = c.observed ?? bank.observed;
    if (watched) await ctx.runner.run(watched, ctx);
    if (c.after) await ctx.runner.run(c.after, ctx);
    advanceQueue(ctx, bank, id, queueId);
    return;
  }
  // Story Phase 16: the counter takes other payments (the Grand Dispensary, the Bureau). A customer
  // paying in Grand Tokens or with a Grand Check doesn't need the window: the tokens go into the
  // till (a story variable), the check is shown and stamped. A credit applicant ("application")
  // pays nothing: the sash is appraised.
  if (c.payment === 'tokens' || c.payment === 'check' || c.payment === 'application') {
    const dialogue = service(ctx, 'dialogue', 'bankDeposit');
    if (c.payment === 'tokens' && bank.tillVar) story.addVar(bank.tillVar, c.tokens ?? 0);
    if (c.payment === 'check' && c.check) await ctx.runner.run([{ insert: c.check }], ctx);
    if (c.payment !== 'application') ctx.services.audio?.sfx(bank.registerSfx ?? 'spectral_register', { volume: 0.7 });
    const line = { tokens: bank.tokenLine, check: bank.checkLine, application: bank.applicationLine }[c.payment];
    if (line) await dialogue.say(parseLine(fill(line, { name: c.short ?? c.name, tokens: (c.tokens ?? 0).toLocaleString('en-US') })));
    if (c.after) await ctx.runner.run(c.after, ctx);
    if (c.appraise) await ctx.runner.run([{ appraise: c.appraise.credit ?? 'sashback', bias: c.appraise.bias ?? 0, bonusVar: c.appraise.bonusVar }], ctx);
    advanceQueue(ctx, bank, id, queueId);
    return;
  }
  const r = await service(ctx, 'ui', 'teller').teller({ id, ...c }, bank);
  const score = tellerScore(r?.grades ?? []);
  if (bank.gradeVar) story.setVar(bank.gradeVar, score);
  if (bank.slipsVar) story.setVar(bank.slipsVar, r?.slips ?? 0);
  ctx.bus?.emit('bank:deposited', { customer: id, score, grades: r?.grades ?? [] });
  if (c.after) await ctx.runner.run(c.after, ctx);
  if (c.appraise) await ctx.runner.run([{ appraise: c.appraise.credit ?? 'sashback', bias: c.appraise.bias ?? 0, bonusVar: c.appraise.bonusVar }], ctx);
  // Story Phase 15: a depositor Brogath is watching (a sash he shouldn't see) sets him off a little (much less while he's mellow).
  if ((c.modifiers ?? []).includes('brogath_risk') && content.stability?.get?.('brogath')) {
    const def = stabilitySubject(content, 'brogath');
    const r = addPressure(def, ctx.session, effectOf(def, 'trigger', c.brogathTrigger ?? 'flutter').pressure ?? 0);
    ctx.bus?.emit('stability:changed', { subject: def.id, kind: 'trigger', ...r });
  }
  // The ledger: what class was that?
  const opts = c.classify ?? [c.intensity];
  const dialogue = service(ctx, 'dialogue', 'bankDeposit');
  const picked = await dialogue.choose({
    prompt: bank.classifyPrompt ? parseLine(fill(bank.classifyPrompt, { name: c.short ?? c.name })) : null,
    options: opts.map((n) => ({ text: scaleLabel(bank, n) })),
    cancelIndex: null,
  });
  const right = String(opts[picked] ?? opts[0]) === String(c.intensity);
  if (right && bank.ledgerVar) story.addVar(bank.ledgerVar, 1);
  const line = right ? bank.classifyRight : bank.classifyWrong;
  if (line) await dialogue.say(parseLine(fill(line, { name: c.short ?? c.name, class: scaleLabel(bank, c.intensity) })));
  if (c.vault) await ctx.runner.run(c.vault, ctx);
  else if (bank.vault) await ctx.runner.run(bank.vault, ctx);
  advanceQueue(ctx, bank, id, queueId);
}

/** The queue moves on (never backwards: a customer served again after a load doesn't count twice). */
function advanceQueue(ctx, bank, id, queueId) {
  const story = ctx.session.story;
  const qid = queueId ?? Object.keys(bank.queues ?? {}).find((k) => bank.queues[k].customers.includes(id));
  const q = qid ? bank.queues[qid] : null;
  if (q) {
    const at = q.customers.indexOf(id);
    if (story.getVar(q.servedVar, 0) <= at) story.setVar(q.servedVar, at + 1);
    if (q.event) ctx.bus?.emit('script:event', { name: q.event });
  }
}

/**
 * Story Phase 16: plays a proceeding (systems/proceedings.js) as choices.
 * Forms file every answer (asking a "required" question again on an invalid
 * one) with the page number climbing; hearings total the points and pass or
 * go back to the first question (after two failed hearings the council passes
 * it anyway, out of exhaustion); pitches run rounds against the pressure,
 * each argument usable once, and start over from a checkpoint if the
 * pressure tops out (the clock is longer each time, so it always ends).
 */
async function runProceeding(def, step, ctx) {
  const story = ctx.session.story;
  const dialogue = service(ctx, 'dialogue', 'proceeding');
  const run = (x) => (x ? ctx.runner.run(asArray(x), ctx) : null);
  const ask = async (q) => {
    const i = await dialogue.choose({ prompt: q.prompt ? parseLine(q.prompt) : null, options: q.options.map((o) => ({ text: o.text })), cancelIndex: null });
    return { i, e: answerEffect(q, i) };
  };
  const page = (n) => {
    if (def.pageVar) story.setVar(def.pageVar, n);
    return ctx.services.ui?.notify({ kind: 'text', text: `PAGE <y>${n}</> OF ${def.pages ?? '?'}` });
  };
  if (def.kind === 'form') {
    for (const q of def.questions ?? []) {
      if (q.montage) {
        for (const n of q.montage) await page(n);
        await run(q.lines);
        continue;
      }
      if (q.page) await page(q.page);
      for (let tries = 0; ; tries++) {
        const { i, e } = await ask(q);
        if (e.flag) story.set(e.flag);
        await run(e.reply);
        if (!e.again || tries >= 3) {
          if (def.answerPrefix) story.setVar(`${def.answerPrefix}${q.id}`, i);
          break;
        }
        await run(q.again);
      }
    }
    if (def.pageVar) story.setVar(def.pageVar, def.pages ?? 0);
    await run(def.done);
    return null;
  }
  if (def.kind === 'hearing') {
    for (let attemptNo = 0; ; attemptNo++) {
      let total = 0;
      for (const q of def.questions ?? []) {
        await run(q.before);
        const { e } = await ask(q);
        total += e.points;
        await run(e.reply);
      }
      if (def.scoreVar) story.setVar(def.scoreVar, total);
      if (hearingPassed(def, total)) {
        await run(def.passed);
        return null;
      }
      if (attemptNo >= 1) {
        await run(def.mercy ?? def.passed);
        return null;
      }
      await run(def.retry);
    }
  }
  if (def.kind === 'pitch') {
    const args = def.arguments ?? [];
    let extra = 0;
    for (let attemptNo = 0; ; attemptNo++) {
      let convinced = 0;
      let pressure = 0;
      const used = new Set();
      const gauge = async (p) => {
        if (def.pressureVar) story.setVar(def.pressureVar, p);
        if (def.gauge) await ctx.runner.run([{ vistaFrame: def.gauge.layer, frame: `${def.gauge.prefix}${Math.min(def.gauge.frames - 1, p)}` }], ctx);
      };
      await gauge(0);
      while (true) {
        const open = args.filter((a) => !used.has(a.id));
        if (!open.length) break;
        const shown = open.slice(0, def.show ?? 4);
        const i = await dialogue.choose({ prompt: def.prompt ? parseLine(def.prompt) : null, options: shown.map((a) => ({ text: a.text })), cancelIndex: null });
        const a = shown[i] ?? shown[0];
        used.add(a.id);
        await run(a.reply);
        if (a.lighter) await ctx.runner.run([{ lighter: a.lighter, attempts: a.attempts ?? 3, until: a.until ?? null, montage: true }], ctx);
        const r = pitchRound({ ...def, max: (def.max ?? Infinity) + extra }, convinced, pressure, a.points ?? 0);
        convinced = r.convinced;
        pressure = r.pressure;
        if (def.convincedVar) story.setVar(def.convincedVar, convinced);
        await gauge(pressure);
        if (r.won) {
          await run(def.won);
          return null;
        }
        if (r.lost) break;
        await run(def.stages?.[pressure]);
      }
      // The pressure topped out (or he ran out of arguments): the checkpoint. A longer clock next time.
      await run(def.fail);
      extra += args.length;
    }
  }
  throw new Error(`Unknown proceeding kind "${def.kind}"`);
}

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
    tv: (step, ctx) => service(ctx, 'ui', 'tv').tv(step.tv, { mode: step.mode ?? 'normal', panel: step.panel ?? null }),
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
      // from/to are beat indexes, both inclusive ({ from: 6, to: 7 } plays beats 6 and 7).
      for (const b of (ep.beats ?? []).slice(step.from ?? 0, step.to === undefined ? undefined : step.to + 1)) {
        if (b.frames?.length) service(ctx, 'cinema', 'tvProgram').frames(layer, b.frames, b.frameMs ?? 300);
        if (b.sfx) service(ctx, 'audio', 'tvProgram').sfx(b.sfx);
        if (b.laugh) service(ctx, 'audio', 'tvProgram').sfx(prog.laugh ?? 'ftm_laugh', { volume: 0.8 });
        // Story Phase 13: Stench-O-Vision (the set named by "tv" puffs out of its vent).
        if (b.aroma && step.tv) ctx.bus?.emit('tv:aroma', { tv: step.tv });
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
    token: (step, ctx) => {
      const p = service(ctx, 'world', 'token').dropToken(step.token, step.x, step.y, { id: step.id, max: step.max, sfx: step.sfx });
      return step.async ? null : p;
    },
    clearTokens: (step, ctx) => {
      service(ctx, 'world', 'clearTokens').clearTokens();
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
    // --- Story Phases 11-13 ---------------------------------------------------------
    /**
     * The Sash Tension interaction (data/story/tension): hold the band for the
     * def's seconds, then let go. Never fails; "var" keeps how many times it was
     * caught out of the band, "releasedVar" 1 if the release was pressed (0 if the
     * hands slipped).
     */
    sashTension: async (step, ctx) => {
      const content = ctx.session.content ?? ctx.content;
      const def = content.tension?.get?.(step.sashTension);
      if (!def) throw new Error(`No sash tension definition "${step.sashTension}"`);
      const r = await service(ctx, 'ui', 'sashTension').sashTension({ id: step.sashTension, ...def });
      if (step.var) ctx.session.story.setVar(step.var, r?.slips ?? 0);
      if (step.releasedVar) ctx.session.story.setVar(step.releasedVar, r?.released === 'slipped' ? 0 : 1);
    },
    /** A large die, rolled for the story (data/story/dice). The result is always the script's. */
    dice: (step, ctx) => {
      const content = ctx.session.content ?? ctx.content;
      const id = step.die ?? 'grand_dice';
      const def = content.dice?.get?.(id);
      if (!def) throw new Error(`No die "${id}"`);
      const p = service(ctx, 'ui', 'dice').dice(step.dice, { def: { id, ...def }, result: step.result, bounces: step.bounces, to: step.to, hops: step.hops, seconds: step.seconds, face: step.face });
      return step.async ? null : p;
    },
    /**
     * A fragile item wears (data/items: "wear": { value, stages }): its story
     * value moves on one stage (or "to" a named one), never past the last and
     * never backwards. The item itself is never taken.
     */
    wear: (step, ctx) => {
      const content = ctx.session.content ?? ctx.content;
      const item = content.items.get(step.wear);
      const w = item?.wear;
      if (!w) throw new Error(`Item "${step.wear}" has no "wear"`);
      const cur = ctx.session.story.getValue(w.value) ?? w.stages[0];
      const at = Math.max(0, w.stages.indexOf(cur));
      const want = step.to ? w.stages.indexOf(step.to) : at + 1;
      const next = Math.min(w.stages.length - 1, Math.max(at, want));
      ctx.session.story.setValue(w.value, w.stages[next]);
    },
    // --- Story Phase 14 ---------------------------------------------------------
    /**
     * Brogath Stability (systems/stability.js). trigger/calm apply a data
     * entry (its line is said unless "quiet"); set/add move the pressure;
     * anger turns the scripted ANGRY state on or off; meter shows, hides or
     * hands the meter back to the world ("auto"); incident starts a rising
     * incident (the world raises it while the captain has control), secure
     * stops the rise, settle puts everything back after a scripted
     * catastrophe (no anger, no incident, settled pressure, meter auto).
     */
    stability: async (step, ctx) => {
      const content = ctx.session.content ?? ctx.content;
      const def = stabilitySubject(content, step.subject);
      const s = ctx.session;
      const story = s.story;
      // A live incident keeps its rising pressure in the world: write it back first.
      ctx.bus?.emit('stability:sync', { subject: def.id });
      const emit = (r, kind) => ctx.bus?.emit('stability:changed', { subject: def.id, kind, ...r });
      const op = step.stability;
      if (op === 'trigger' || op === 'calm') {
        const e = effectOf(def, op, step.id);
        const r = addPressure(def, s, e.pressure ?? 0);
        emit(r, op);
        if (e.sfx) ctx.services.audio?.sfx(e.sfx, { volume: e.volume ?? 0.7 });
        if (e.line && !step.quiet) await service(ctx, 'dialogue', 'stability').say(parseLine(e.line));
        return null;
      }
      if (op === 'set') emit(writePressure(def, s, step.pressure ?? def.settleTo), op);
      else if (op === 'add') emit(addPressure(def, s, step.pressure ?? 0), op);
      else if (op === 'anger') {
        if (!def.angerFlag) throw new Error(`Stability subject "${def.id}" has no angerFlag`);
        if (step.on === false) story.clear(def.angerFlag);
        else story.set(def.angerFlag);
        emit(writePressure(def, s, readStability(def, s).pressure), op);
      } else if (op === 'recover') {
        // Story Phase 16: in (or out of) recovery after a big release.
        if (!def.recoverFlag) throw new Error(`Stability subject "${def.id}" has no recoverFlag`);
        if (step.on === false) story.clear(def.recoverFlag);
        else story.set(def.recoverFlag);
        emit(writePressure(def, s, readStability(def, s).pressure), op);
      } else if (op === 'meter') {
        if (def.meterValue) story.setValue(def.meterValue, step.show === 'auto' || !step.show ? null : step.show);
        ctx.bus?.emit('stability:changed', { subject: def.id, kind: op });
      } else if (op === 'incident') {
        const inc = incidentDef(def, step.id);
        story.setValue(def.incidentValue, step.id);
        const cur = readStability(def, s).pressure;
        emit(writePressure(def, s, inc.start != null ? Math.max(cur, inc.start) : cur), op);
      } else if (op === 'secure') {
        if (def.incidentValue) story.setValue(def.incidentValue, null);
        ctx.bus?.emit('stability:changed', { subject: def.id, kind: op });
      } else if (op === 'settle') {
        if (def.angerFlag) story.clear(def.angerFlag);
        if (def.recoverFlag) story.clear(def.recoverFlag);
        if (def.incidentValue) story.setValue(def.incidentValue, null);
        if (def.meterValue) story.setValue(def.meterValue, null);
        emit(writePressure(def, s, step.pressure ?? def.settleTo), op);
      } else throw new Error(`Unknown stability op "${op}"`);
      return null;
    },
    /**
     * A reassurance prompt: the subject's prompt set offers a few things to
     * say (always at least one that calms); the captain says it, it calms or
     * triggers by the data, and the reply follows. "var" is 1 if it calmed.
     */
    reassure: async (step, ctx) => {
      const content = ctx.session.content ?? ctx.content;
      const def = stabilitySubject(content, step.subject);
      const story = ctx.session.story;
      ctx.bus?.emit('stability:sync', { subject: def.id });
      const turnVar = def.turnVar ?? `${def.id}_reassure_turn`;
      const opts = promptOptions(def, step.reassure, story.getVar(turnVar, 0));
      story.addVar(turnVar, 1);
      const dialogue = service(ctx, 'dialogue', 'reassure');
      const index = await dialogue.choose({ prompt: step.prompt ? parseLine(step.prompt) : null, options: opts.map((o) => ({ text: o.text })), cancelIndex: null });
      const o = opts[index] ?? opts[0];
      const set = def.prompts[step.reassure];
      if (set.echo !== false) await dialogue.say(parseLine(`${set.speaker ?? 'captain'}: ${o.say ?? o.text}`));
      const kind = o.calm ? 'calm' : 'trigger';
      const e = effectOf(def, kind, o.calm ?? o.trigger);
      const r = addPressure(def, ctx.session, e.pressure ?? 0);
      ctx.bus?.emit('stability:changed', { subject: def.id, kind, ...r });
      if (e.sfx) ctx.services.audio?.sfx(e.sfx, { volume: e.volume ?? 0.7 });
      const reply = o.reply ?? e.line;
      if (reply) await dialogue.say(parseLine(reply));
      if (step.var) story.setVar(step.var, o.calm ? 1 : 0);
      return null;
    },
    /**
     * The Grand Bank: "next" serves the next depositor in a queue (nothing when it's empty).
     * Story Phase 15: "observe": true has the branch's own teller serve them (no window, no ledger).
     */
    bank: async (step, ctx) => {
      const content = ctx.session.content ?? ctx.content;
      const bank = bankDef(content, step.bankId);
      if (step.bank !== 'next') throw new Error(`Unknown bank op "${step.bank}"`);
      const queue = step.queue ?? Object.keys(bank.queues ?? {})[0];
      const id = nextCustomer(bank, queue, ctx.session);
      if (id) await serveCustomer(ctx, id, queue, { observe: !!step.observe });
      return null;
    },
    bankDeposit: async (step, ctx) => {
      await serveCustomer(ctx, step.bankDeposit);
      return null;
    },
    /**
     * Story Phase 14: the Grand Currency purchase. Exactly once (the bank's
     * currency flag): the real doubloons come out of the captain's purse (all
     * he has, if he has fewer), and the tokens go into their own variable,
     * never the purse. Running it again does nothing.
     */
    // --- Story Phase 15 ------------------------------------------------------------
    /**
     * The ship's atmosphere (systems/atmosphere.js). Anyone whose stability
     * reads it (Brogath, mellow) has his state written again at once.
     */
    atmosphere: (step, ctx) => {
      const content = ctx.session.content ?? ctx.content;
      // Story Phase 16: { "atmosphere": "COFFIN_SOCK", "room": "galley" } gives one room its own air;
      // { "atmosphere": "SHIP", "room": "galley" } hands it back; "clearRooms": true hands every room back.
      if (step.clearRooms) clearRoomAtmospheres(content, ctx.session);
      setAtmosphere(content, ctx.session, step.atmosphere, { room: step.room ?? null });
      for (const [id, raw] of content.stability?.map ?? []) {
        if (!raw.mellow) continue;
        const def = stabilityDef({ id, ...raw });
        const r = writePressure(def, ctx.session, readStability(def, ctx.session).pressure);
        ctx.bus?.emit('stability:changed', { subject: id, kind: 'atmosphere', ...r });
      }
      ctx.bus?.emit('atmosphere:changed', { id: step.atmosphere });
      return null;
    },
    /**
     * A Stenchmaster Channel episode (data: a programme's episode with
     * "segments"): its beats in runs, commercials cut in where the data puts
     * them (the advert's beats, then the trigger it sets off and the prompt
     * to steady him), and Brogath's live reactions (scripts) between. The
     * episode may hold the set in a state while it plays (it can't be turned
     * off), and marks itself seen. Built from the ordinary steps, so it plays
     * the same in every runner.
     */
    channelEpisode: async (step, ctx) => {
      const content = ctx.session.content ?? ctx.content;
      const progId = step.program ?? 'stenchmaster_channel';
      const prog = programDef(content, progId);
      const ep = (prog?.episodes ?? []).find((e) => e.id === step.channelEpisode);
      if (!ep) throw new Error(`Programme "${progId}" has no episode "${step.channelEpisode}"`);
      const tv = step.tv ?? ep.tv ?? null;
      const layer = step.layer ?? 'screen';
      const steps = [];
      if (ep.tvState && tv) steps.push({ tvSet: tv, state: ep.tvState });
      const segments = ep.segments ?? [{ beats: [0, (ep.beats ?? []).length - 1] }];
      for (const seg of segments) {
        if (seg.beats) steps.push({ tvProgram: progId, episode: ep.id, from: seg.beats[0], to: seg.beats[1], layer, ...(tv ? { tv } : {}) });
        const ad = seg.commercial;
        if (ad) {
          steps.push({ tvProgram: ad.program ?? 'bbk_sash_ads', episode: ad.episode, layer, ...(tv ? { tv } : {}) });
          if (ad.trigger) steps.push({ stability: 'trigger', id: ad.trigger, quiet: !!ad.quiet });
          if (ad.reassure) steps.push({ reassure: ad.reassure, ...(ad.prompt ? { prompt: ad.prompt } : {}) });
        }
        if (seg.script) steps.push({ call: seg.script });
      }
      await ctx.runner.run(steps, ctx);
      if (ep.doneFlag) ctx.session.story.set(ep.doneFlag);
      return null;
    },
    /**
     * A one-time conversion (data/story/conversions.json): story variables
     * emptied into others, items taken, behind one flag. Running it again
     * does nothing (no save-and-load doubling). Never touches the purse
     * unless the data names it (it doesn't).
     */
    convert: async (step, ctx) => {
      const content = ctx.session.content ?? ctx.content;
      const def = content.conversions?.get?.(step.convert);
      if (!def) throw new Error(`No conversion "${step.convert}" (data/story/conversions)`);
      const story = ctx.session.story;
      if (story.has(def.flag)) return null;
      for (const f of def.from ?? []) {
        const had = story.getVar(f.var, 0);
        if (f.recordVar) story.setVar(f.recordVar, had);
        story.setVar(f.var, f.leave ?? 0);
      }
      for (const id of def.takeItems ?? []) {
        const n = ctx.session.inventory.count(id);
        if (n) ctx.session.inventory.remove(id, n);
      }
      for (const to of def.to ?? []) story.addVar(to.var, to.add ?? 0);
      for (const id of def.giveItems ?? []) if (!ctx.session.inventory.count(id)) ctx.session.inventory.add(id, 1);
      story.set(def.flag);
      if (def.notify && !step.silent) await ctx.services.ui?.notify({ kind: 'text', text: def.notify });
      return null;
    },
    grandCurrency: async (step, ctx) => {
      const content = ctx.session.content ?? ctx.content;
      const cur = bankDef(content, step.bankId).currency;
      if (!cur) throw new Error('This bank has no "currency"');
      if (step.grandCurrency !== 'purchase') throw new Error(`Unknown grandCurrency op "${step.grandCurrency}"`);
      const s = ctx.session;
      if (s.story.has(cur.flag)) return null;
      const paid = Math.min(cur.gold ?? 0, s.inventory.gold);
      if (paid > 0) s.inventory.spendGold(paid);
      if (cur.paidVar) s.story.setVar(cur.paidVar, paid);
      s.story.setVar(cur.var, s.story.getVar(cur.var, 0) + cur.amount);
      s.story.set(cur.flag);
      if (!step.silent) {
        if (paid > 0) await ctx.services.ui?.notify({ kind: 'goldLost', amount: paid });
        if (cur.notify) await ctx.services.ui?.notify({ kind: 'text', text: cur.notify });
      }
      return null;
    },
    // --- Story Phase 16 ------------------------------------------------------------
    /** The captain's beard: { "beard": "add", "tag": "COFFIN_SOCK" } (or "remove", for a temporary one). */
    beard: async (step, ctx) => {
      const content = ctx.session.content ?? ctx.content;
      const tag = step.tag;
      const changed = step.beard === 'remove' ? removeBeardTag(content, ctx.session, tag) : addBeardTag(content, ctx.session, tag);
      ctx.bus?.emit('beard:changed', { tag, op: step.beard });
      if (changed && step.beard !== 'remove' && !step.quiet) {
        const t = beardDef(content).tags[tag];
        await ctx.services.ui?.notify({ kind: 'text', text: `BEARD: <y>+${t.label ?? tag}</>` });
      }
      return null;
    },
    /**
     * The Stenchmaster Fart Zone (systems/fartZone.js): { "fartZone": "queue", "who": "brogath" },
     * "enter" (who?), "door"/"portholes" ("value": open|closed), "release" ("release": id, once; the
     * room's own air becomes the release's smell), "ventilate", "complete", "reset".
     */
    fartZone: async (step, ctx) => {
      const content = ctx.session.content ?? ctx.content;
      const def = fartZoneDef(content);
      if (!def) throw new Error('No Stenchmaster Fart Zone (data/story/fart_zone.json)');
      const s = ctx.session;
      const op = step.fartZone;
      if (op === 'queue') enqueue(def, s, step.who);
      else if (op === 'enter') fzEnter(def, s, step.who ?? null);
      else if (op === 'door') setDoor(def, s, step.value);
      else if (op === 'portholes') setPortholes(def, s, step.value);
      else if (op === 'prepare') s.story.setValue(def.stateValue ?? 'fz_state', 'PREPARING');
      else if (op === 'release') {
        const problems = releaseProblems(def, s);
        if (problems.length && !step.force) throw new Error(`Fart Zone release "${step.release}" against procedure: ${problems.join(', ')}`);
        const r = fzRelease(def, s, step.release);
        if (r.done && r.odor && def.map) setAtmosphere(content, s, r.odor, { room: def.map });
      } else if (op === 'ventilate') {
        ventilate(def, s);
        if (def.map) setAtmosphere(content, s, 'CLEARING', { room: def.map });
      } else if (op === 'complete') {
        fzComplete(def, s);
        if (def.map) setAtmosphere(content, s, 'SHIP', { room: def.map });
      } else if (op === 'reset') resetZone(def, s);
      else throw new Error(`Unknown fartZone op "${op}"`);
      ctx.bus?.emit('fartzone:changed', { op });
      ctx.bus?.emit('atmosphere:changed', {});
      return null;
    },
    /**
     * A novelty device (systems/novelty.js): { "lighter": "grand_smokes", "attempts": 6, "until": "flame" }.
     * Each attempt says what happened (and plays its sound); "montage": true runs them together in one line.
     */
    lighter: async (step, ctx) => {
      const content = ctx.session.content ?? ctx.content;
      const def = noveltyDef(content, step.lighter);
      const outs = noveltyAttempt(def, ctx.session, step.attempts ?? 1, step.until ?? null);
      const dialogue = service(ctx, 'dialogue', 'lighter');
      if (step.montage) {
        for (const o of outs) {
          const e = def.outcomes[o];
          if (e.sfx) ctx.services.audio?.sfx(e.sfx, { volume: e.volume ?? 0.7 });
        }
        const words = outs.map((o) => def.outcomes[o].short ?? def.outcomes[o].text);
        if (!step.quiet) await dialogue.say(parseLine(words.join(' ')));
      } else {
        for (const o of outs) {
          const e = def.outcomes[o];
          if (e.sfx) ctx.services.audio?.sfx(e.sfx, { volume: e.volume ?? 0.7 });
          if (!step.quiet) await dialogue.say(parseLine(e.text));
        }
      }
      if (step.var) ctx.session.story.setValue(step.var, outs[outs.length - 1] ?? null);
      ctx.bus?.emit('novelty:used', { device: step.lighter, outcomes: outs });
      return null;
    },
    /** A form, a hearing or a pitch (systems/proceedings.js; data/story/proceedings). */
    proceeding: async (step, ctx) => {
      const content = ctx.session.content ?? ctx.content;
      const def = proceedingDef(content, step.proceeding);
      return runProceeding(def, step, ctx);
    },
    /**
     * GRAND SASHBACK appraisal (systems/credit.js): the captain sniffs a sash, note by note, and the bank
     * turns it into a score. { "appraise": "sashback", "bias": 120, "bonusVar": "rancidella_bonus" }.
     */
    appraise: async (step, ctx) => {
      const content = ctx.session.content ?? ctx.content;
      const def = creditDef(content, step.appraise);
      const dialogue = service(ctx, 'dialogue', 'appraise');
      const picks = [];
      for (const n of def.notes ?? []) {
        const i = await dialogue.choose({ prompt: n.prompt ? parseLine(n.prompt) : null, options: n.options.map((o) => ({ text: o.text })), cancelIndex: null });
        picks.push(i);
        const reply = n.options[i]?.reply;
        if (reply) await ctx.runner.run(asArray(reply), ctx);
      }
      const score = appraisalScore(def, picks, step.bias ?? 0);
      const cls = creditClass(def, score);
      const story = ctx.session.story;
      if (def.scoreVar) story.setVar(def.scoreVar, score);
      if (def.classValue) story.setValue(def.classValue, cls);
      const bonus = welcomeBonus(def, score);
      if (step.bonusVar) story.setVar(step.bonusVar, bonus);
      if (def.issuedVar) story.addVar(def.issuedVar, bonus);
      if (def.cardsVar) story.addVar(def.cardsVar, 1);
      ctx.services.audio?.sfx(def.sfx ?? 'credit_chime', { volume: 0.8 });
      if (!step.quiet) await dialogue.say(parseLine(`GRAND CREDIT SCORE: ${score}. ${cls}. WELCOME BONUS: ${bonus.toLocaleString('en-US')} GRAND TOKENS.`));
      return null;
    },
    /**
     * THE GRAND CURRENCY CONVERTER (systems/credit.js): tokens in from a story variable, Coffin Sock out.
     * { "currencyConverter": "converter", "from": "till_tokens", "amount": 1 } (or "all"). It never pays
     * gold; "blastValue" says how bad it was (puff, blast, catastrophe) for the scene to show.
     */
    currencyConverter: async (step, ctx) => {
      const content = ctx.session.content ?? ctx.content;
      const def = creditDef(content, step.currencyConverter);
      const story = ctx.session.story;
      const have = Math.max(0, story.getVar(step.from, 0));
      const offered = step.amount === 'all' ? have : Math.min(have, step.amount ?? 1);
      const r = conversion(def, ctx.session, offered);
      story.setVar(step.from, have - r.amount);
      if (def.convertedVar) story.addVar(def.convertedVar, r.amount);
      if (def.usesVar) story.addVar(def.usesVar, 1);
      story.setValue(def.blastValue ?? 'converter_last_blast', r.blast);
      if (r.capped && def.cappedValue) story.setValue(def.cappedValue, 'yes');
      ctx.bus?.emit('converter:used', { amount: r.amount, blast: r.blast, capped: r.capped });
      return null;
    },
    /** The hornet swarm (systems/hazards/hornets.js): { "hornets": "SWARMING" }. */
    hornets: (step, ctx) => {
      const content = ctx.session.content ?? ctx.content;
      setHornets(content, ctx.session, step.hornets);
      ctx.bus?.emit('hornets:changed', { state: step.hornets });
      return null;
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
