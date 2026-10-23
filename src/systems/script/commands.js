import { asArray } from '../../core/util.js';
import { evaluateCondition, splitObjectiveRef } from '../conditions/conditions.js';
import { parseLine } from './parseLine.js';
import { tvDef, setPower, setChannel, setTvCondition, programDef, programEpisode } from '../tv/tv.js';
import { setDeadCenterLocation } from '../hazards/deadCenter.js';
import { setSharkstormState, setSharkstormFlare, endSharkstormFlare } from '../hazards/sharkstorm.js';
import { stabilityDef, readStability, writePressure, addPressure, effectOf, promptOptions, incidentDef } from '../stability.js';
import { nextCustomer, scaleLabel, tellerScore } from '../bank.js';
import { setAtmosphere, clearRoomAtmospheres } from '../atmosphere.js';
import { addBeardTag, removeBeardTag, beardDef } from '../beard.js';
import { fartZoneDef, enqueue, enter as fzEnter, setDoor, setPortholes, release as fzRelease, ventilate, complete as fzComplete, resetZone, releaseProblems } from '../fartZone.js';
import { noveltyDef, attempt as noveltyAttempt } from '../novelty.js';
import { proceedingDef, answerEffect, hearingPassed, pitchRound } from '../proceedings.js';
import { creditDef, appraisalScore, creditClass, welcomeBonus, conversion } from '../credit.js';
import { setHornets } from '../hazards/hornets.js';
import { challengeConfig } from '../challenge/config.js';
import { ChallengeRun, runChallenge, challengeLog, chapterOf } from '../challenge/runner.js';
import { captureCheckpoint } from '../challenge/checkpoint.js';
import { normalizePrefs } from '../challenge/difficulty.js';
import { shipTuning, resolveRepair, repairIdFor, affordableAttempts, sumItems } from '../ship/integrity.js';
import { hazardData, fireRoom } from '../ship/hazards.js';
import { responseOptions, patchWaste, roomLabel } from '../ship/response.js';
import { airRoom } from '../ship/air.js';
import { airOptions, airReport, sealWaste, mendWaste } from '../ship/airResponse.js';
import { subjectDef, stageInfo, pressureData } from '../ship/pressure.js';
import { subjectOptions, pressureGroups, pressureReport } from '../ship/pressureResponse.js';
import { beardData } from '../ship/beard.js';
import { beardOptions, beardReport, sniffReport } from '../ship/beardResponse.js';
import { tunedTensionDef } from '../tension.js';

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

/**
 * A step that opted into a challenge (docs/gameplay-overhaul/07-challenge-outcomes.md):
 * its config, or null for a legacy step. The test harness may supply one for
 * a legacy step through ctx.challengeOverride, to walk the campaign with
 * failures injected; the game never does.
 */
function stepChallengeConfig(ctx, kind, step, frame) {
  const spec = step.challenge ?? ctx.challengeOverride?.(kind, step, frame) ?? null;
  if (spec === null) return null;
  const content = ctx.session.content ?? ctx.content;
  // Resolved once, for the difficulty the player is on now: the whole challenge keeps it (ChallengeRun).
  return challengeConfig(content, spec, { kind, id: `${frame?.id ?? '(inline)'}/${kind}`, difficulty: challengePrefs(ctx).difficulty });
}

/** The player's difficulty and assists (Settings.challengePrefs), or the defaults (a headless run, a test). */
function challengePrefs(ctx) {
  return normalizePrefs(ctx.challengePrefs?.() ?? null);
}

/**
 * Runs one opted-in challenge step to its end: attempts through the
 * mechanic, failures through the outcome prompt (retry, carry on, go back),
 * then the step's own follow-ups: "outcomeValue" (the outcome in a story
 * value) and "ifSuccess" / "ifPartial" / "ifFailure" (steps or a node).
 * Returns what the command returns (a goto when one applies).
 */
async function runStepChallenge(ctx, frame, step, cfg, attempt) {
  const { record, goto } = await playChallenge(ctx, frame, cfg, attempt);
  return challengeFollowUp(ctx, frame, step, cfg, record, goto);
}

/** Plays a challenge to its final outcome (the runner, with the game's prompt, consequence steps and restore). */
async function playChallenge(ctx, frame, cfg, attempt, settle = null) {
  const run = new ChallengeRun({ session: ctx.session, config: cfg, chapter: chapterOf(frame?.id), event: frame?.id ?? null, script: frame?.id ?? null, prefs: () => challengePrefs(ctx), content: ctx.session.content ?? ctx.content });
  const hooks = {
    attempt,
    decide: (record, options) => service(ctx, 'ui', 'challengeOutcome').challengeOutcome(record, options),
    // Cost and consequence steps know which challenge they belong to (a resolved one can't damage the ship again).
    // Each charge of a cost, and each consequence list, is its own event scope (Prompt 6: retry-safe damage events).
    runSteps: (steps, meta) => ctx.runner.run(steps, { ...ctx, challenge: run.record, eventScope: `${run.id}:${meta?.scope ?? `attempt${run.record.attempt}`}` }),
    onRestored: (cp) => ctx.services?.world?.restoreCheckpoint?.(cp),
    settle,
  };
  return runChallenge(run, hooks);
}

/** After the outcome: the toast, "outcomeValue", then a "go back" or the step's if-branch. */
async function challengeFollowUp(ctx, frame, step, cfg, record, goto) {
  if (cfg.announce && record.outcome !== 'failure') await ctx.services?.ui?.notify?.({ kind: 'challenge', record });
  if (step.outcomeValue) ctx.session.story.setValue(step.outcomeValue, record.outcome);
  if (goto) return { goto };
  const branch = { success: step.ifSuccess, partial: step.ifPartial, failure: step.ifFailure }[record.outcome];
  return branch === undefined ? null : ctx.runner.execBranch(branch, ctx, frame);
}

// --- Ship Integrity (overhaul Prompt 5, docs/gameplay-overhaul/09-ship-integrity.md) -----------

const itemName = (content, id) => content.items?.get?.(id)?.name ?? id;
const itemList = (content, list) => list.map((c) => `${c.count} ${itemName(content, c.item)}`).join(', ');

/** Tells the player about the ship (a toast in the game; nothing in a headless run). */
async function shipNotice(ctx, text) {
  await ctx.services?.ui?.notify?.({ kind: 'ship', text });
}

/**
 * An event id as the ship records it (docs/gameplay-overhaul/10-flooding-and-fire.md,
 * "Retry-safe damage events"): inside a challenge's costs or consequences it
 * belongs to that charge or list ("bilge:cost:2:hit"); elsewhere in a
 * challenge to its attempt ("bilge#3:hit"); outside one, as written. The ids
 * applied are saved and checkpointed with the ship, so a retried attempt can
 * take the same hit again and a repeated callback can't.
 */
export function scopedEventId(ctx, id) {
  if (id === null || id === undefined) return null;
  if (ctx.eventScope) return `${ctx.eventScope}:${id}`;
  if (ctx.challenge) return `${ctx.challenge.id}#${ctx.challenge.attempt}:${id}`;
  return id;
}

/** The challenge a step belongs to: running, or over once its run has closed (a partial's consequences still run inside it). */
function challengeStateOf(ctx) {
  const ch = ctx.challenge ?? null;
  if (!ch) return null;
  return challengeLog(ctx.session).active.get(ch.id)?.record === ch ? 'running' : 'resolved';
}

/** Takes a whole bill or nothing. */
function takeAll(inventory, items) {
  const need = sumItems(items);
  if (need.some((c) => inventory.count(c.item) < c.count)) return false;
  const taken = [];
  for (const c of need) {
    if (!inventory.remove(c.item, c.count)) {
      for (const t of taken) inventory.add(t.item, t.count);
      return false;
    }
    taken.push(c);
  }
  return true;
}

/** A step of emergency work: the progress shown, one tick of hazard time (the rest of the ship goes on meanwhile). */
async function workTick(ctx, label, done, of) {
  ctx.services?.ui?.work?.({ label, done, of });
  await ctx.wait(hazardData(ctx.session.content ?? ctx.content)?.tickMs ?? 1000);
  ctx.session.ship.tick(shipTuning(ctx.session.content ?? ctx.content, challengePrefs(ctx).difficulty));
}

/** A step that starts a hazard, if its event (scoped as above) hasn't happened and its challenge hasn't resolved. */
function claimHazardEvent(ctx, step) {
  if (challengeStateOf(ctx) === 'resolved' && step.authorized !== true) return false;
  return ctx.session.ship.claimEvent(scopedEventId(ctx, step.eventId ?? null));
}

/** Runs `fn` with the hazards' own notices held back when the step says "announce": false. */
function quietly(ctx, step, fn) {
  const { hazards: hz, air, pressure, beard } = ctx.session.ship;
  const was = [hz.quiet, air.quiet, pressure.quiet, beard.quiet];
  hz.quiet = step.announce === false;
  air.quiet = step.announce === false;
  pressure.quiet = step.announce === false;
  beard.quiet = step.announce === false;
  try {
    return fn();
  } finally {
    [hz.quiet, air.quiet, pressure.quiet, beard.quiet] = was;
  }
}

/** The ship tuning of the difficulty in play. */
function tuningOf(ctx) {
  return shipTuning(ctx.session.content ?? ctx.content, challengePrefs(ctx).difficulty);
}

function shipDamageText(ctx, r) {
  const sec = ctx.session.ship.section(r.section);
  const by = (ctx.session.content ?? ctx.content).ship?.categories?.[r.category]?.label ?? r.category;
  if (r.reason === 'immune') return `<k>${sec.name}: no harm from ${by}.</>`;
  const mark = sec.state === 'disabled' ? '<r>' : sec.state === 'critical' ? '<o>' : '<y>';
  return `${sec.name} hit by ${by}: ${mark}${sec.pct}% ${sec.label.toUpperCase()}</>${r.crossed ? '!' : ''}`;
}

/**
 * Can this section be repaired here and now, and with what? Everything the
 * Ship page and the shipRepair command show and check, without changing
 * anything.
 */
export function repairPlan(session, sectionId, { difficulty = 'captain', anywhere = false, repairId = null } = {}) {
  const content = session.content;
  const ship = session.ship;
  const sec = ship.section(sectionId);
  if (!sec) return { ok: false, reason: 'unknown', message: `There is no "${sectionId}" to repair.` };
  if (!sec.repairable) return { ok: false, reason: 'unrepairable', section: sec, message: `The ${sec.name.toLowerCase()} can't be repaired.` };
  if (sec.hp >= sec.max) return { ok: false, reason: 'whole', section: sec, message: `The ${sec.name.toLowerCase()} needs no repair.` };
  const def = content.ship.sections[sectionId];
  const repair = resolveRepair(content, repairId ?? repairIdFor(def, sec.hp), difficulty);
  if (!repair) return { ok: false, reason: 'unknown', section: sec, message: 'No repair is known for that.' };
  const room = session.location?.map ?? null;
  const here = anywhere || sec.rooms.includes(room);
  const missing = repair.worst.filter((c) => session.inventory.count(c.item) < c.count).map((c) => ({ ...c, have: session.inventory.count(c.item) }));
  const attempts = affordableAttempts(repair, (id) => session.inventory.count(id));
  const rooms = sec.rooms.map((m) => content.maps.get(m)?.name ?? m);
  // Prompt 6: water where he works makes a repair restore less (none when it's too deep), and a burning section can't be repaired.
  const water = ship.hazards.waterIn(room);
  const efficiency = water.stage.repair ?? 1;
  const burning = ship.hazards.fires.find((f) => (fireRoom(content, f.room)?.burns ?? []).some((b) => b.section === sectionId)) ?? null;
  if (ship.isLocked(sectionId)) return { ok: false, reason: 'busy', section: sec, repair, missing, attempts, here, rooms, efficiency, message: 'That repair is already under way.' };
  if (!here) return { ok: false, reason: 'elsewhere', section: sec, repair, missing, attempts, here, rooms, efficiency, message: `Work on the ${sec.name.toLowerCase()} from: ${rooms.join(', ')}.` };
  if (burning) return { ok: false, reason: 'burning', section: sec, repair, missing, attempts, here, rooms, efficiency, message: `Put out the fire in ${roomLabel(session, burning.room)} first.` };
  if (water.stage.canWork === false) return { ok: false, reason: 'flooded', section: sec, repair, missing, attempts, here, rooms, efficiency, message: `Too deep to work in ${roomLabel(session, room)}: pump it down first.` };
  if (missing.length) return { ok: false, reason: 'materials', section: sec, repair, missing, attempts, here, rooms, efficiency, message: `Not enough materials: ${missing.map((c) => `${itemName(content, c.item)} ${c.have}/${c.count}`).join(', ')}.` };
  return { ok: true, section: sec, repair, missing, attempts, here, rooms, efficiency };
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
      const content = ctx.session.content ?? ctx.content;
      // Story Phase 17: a temporary flare (the Fire-Sharkstorm) over the state it's in, and its end.
      if (step.sharkstorm === 'end_flare') return void endSharkstormFlare(content, ctx.session);
      if (step.flare) return void setSharkstormFlare(content, ctx.session, step.sharkstorm);
      setSharkstormState(content, ctx.session, step.sharkstorm);
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
        // Story Phase 17: a beat can distort the set ("crt": "wobble" | "jitter" | "roll"); the next beat without it clears it.
        ctx.services.cinema?.crt?.(layer, b.crt ?? null);
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
    joinParty: async (step, ctx) => {
      // Story Phase 17: "level": "leader" joins at the captain's level (Ledger and Tilda, centuries late).
      // Joining twice is a no-op: the party never holds anyone twice.
      const party = ctx.session.party;
      if (party.has(step.joinParty)) return;
      const member = party.add(step.joinParty);
      const level = step.level === 'leader' ? party.leader()?.level : step.level;
      if (typeof level === 'number' && level > member.level) {
        member.setLevel(level);
        member.fullHeal();
      }
      if (!step.silent) await ctx.services.ui?.notify?.({ kind: 'partyJoined', name: party.nameOf(step.joinParty) });
    },
    learnAbility: async (step, ctx) => {
      const member = ctx.session.party.get(step.character);
      if (!member || member.abilities.includes(step.learnAbility)) return;
      member.abilities.push(step.learnAbility);
      const content = ctx.session.content ?? ctx.content;
      const ab = content?.abilities?.get?.(step.learnAbility);
      if (!step.silent) await ctx.services.ui?.notify?.({ kind: 'abilityLearned', name: member.name, ability: ab?.name ?? step.learnAbility });
    },
    beardPuff: (step, ctx) => {
      ctx.services.world?.beardPuff?.(step.beardPuff, step.line ?? null);
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
      const p = service(ctx, 'world', 'fly').fly(step.fly, { to: step.to, duration: step.duration, arc: step.arc, land: step.land, alt: step.alt, from: step.from, fromAlt: step.fromAlt, spin: step.spin });
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
    /**
     * A quick hammering prompt; the number of clean strikes can go in a
     * variable. With "challenge" it is a real test (src/systems/timingBar.js
     * strict mode): it can be failed, retried and graded.
     */
    repair: async (step, ctx, frame) => {
      const opts = { kind: step.repair, strikes: step.strikes ?? 3, title: step.title ?? null, speed: step.speed ?? 1, zone: step.zone ?? 26 };
      const cfg = stepChallengeConfig(ctx, 'repair', step, frame);
      if (!cfg) {
        const clean = await service(ctx, 'ui', 'repair').repair(opts);
        if (step.var) ctx.session.story.setVar(step.var, clean ?? 0);
        return null;
      }
      let last = null;
      const result = await runStepChallenge(ctx, frame, step, cfg, async (info) => {
        last = await service(ctx, 'ui', 'timingBar').timingBar({ ...opts, challenge: info });
        return last;
      });
      if (step.var) ctx.session.story.setVar(step.var, last?.clean ?? 0);
      return result;
    },
    // --- Story Phases 11-13 ---------------------------------------------------------
    /**
     * The Sash Tension interaction (data/story/tension): hold the band for the
     * def's seconds, then let go. Never fails; "var" keeps how many times it was
     * caught out of the band, "releasedVar" 1 if the release was pressed (0 if the
     * hands slipped).
     */
    sashTension: async (step, ctx, frame) => {
      const content = ctx.session.content ?? ctx.content;
      const def = content.tension?.get?.(step.sashTension);
      if (!def) throw new Error(`No sash tension definition "${step.sashTension}"`);
      const cfg = stepChallengeConfig(ctx, 'sashTension', step, frame);
      if (!cfg) {
        const r = await service(ctx, 'ui', 'sashTension').sashTension({ id: step.sashTension, ...def });
        if (step.var) ctx.session.story.setVar(step.var, r?.slips ?? 0);
        if (step.releasedVar) ctx.session.story.setVar(step.releasedVar, r?.released === 'slipped' ? 0 : 1);
        return null;
      }
      // Opted in: the def's own numbers with the challenge's "strict" settings (grip, slips, tearing, letting go early),
      // its difficulty's feel (band, grace, sway) and the attempt's assist.
      let last = null;
      const result = await runStepChallenge(ctx, frame, step, cfg, async (info) => {
        const strict = info.strict ? { ...info.mechanics } : null;
        const tuned = tunedTensionDef({ ...def, strict }, { tuning: info.mechanics, assist: info.assist?.tension, cues: !!info.assist?.cues });
        last = await service(ctx, 'ui', 'holdTension').holdTension({ id: step.sashTension, ...tuned, strict, challenge: info });
        return last;
      });
      if (step.var) ctx.session.story.setVar(step.var, last?.slips ?? 0);
      if (step.releasedVar) ctx.session.story.setVar(step.releasedVar, last?.cause === 'accident' ? 0 : 1);
      return result;
    },
    /**
     * Damages the ship (docs/gameplay-overhaul/09-ship-integrity.md): one
     * section or several (a broadside, a great blast), by "amount" before the
     * difficulty's scaling ("scale": false for an amount written for this
     * difficulty already), of a "category" (impact, shark, cannon, ...).
     * "eventId" makes a callback apply once (scoped to its challenge
     * attempt or cost charge: scopedEventId). Inside a challenge's costs or
     * consequences it belongs to that challenge, and is refused once the
     * challenge has resolved unless "authorized". "announce": false is silent.
     * "breach": true (Prompt 6) lets the blow hole the hull: a leak as bad as
     * the section's condition allows, into "room" or the section's own.
     */
    shipDamage: async (step, ctx) => {
      const ship = ctx.session.ship;
      const tuning = shipTuning(ctx.session.content ?? ctx.content, challengePrefs(ctx).difficulty);
      const sections = Array.isArray(step.shipDamage) ? step.shipDamage : [step.shipDamage];
      const ch = ctx.challenge ?? null;
      const challengeState = challengeStateOf(ctx);
      for (const section of sections) {
        const r = quietly(ctx, step, () => ship.applyDamage({
          section, amount: step.amount, category: step.category ?? 'impact', source: step.source ?? ch?.id ?? null, event: ch?.id ?? null,
          eventId: scopedEventId(ctx, step.eventId ?? null), tuning, scale: step.scale !== false, challengeState, authorized: step.authorized === true,
          breach: step.breach === true, room: step.room ?? null,
        }));
        if (!r.ok) {
          // Content validation catches bad targets; at run time a refused blow changes nothing and says why (a repeated callback is quiet).
          if (r.reason !== 'duplicate event') console.warn(`shipDamage ${section}: ${r.reason}`);
          continue;
        }
        if (step.announce !== false) await shipNotice(ctx, shipDamageText(ctx, r));
      }
    },
    /** Restores a section without materials (the crew fixed it in a scene). Never past its maximum. */
    shipRestore: async (step, ctx) => {
      const r = ctx.session.ship.restore(step.shipRestore, step.amount, { source: step.source ?? 'script' });
      if (!r.ok) throw new Error(`shipRestore ${step.shipRestore}: ${r.reason}`);
      if (step.announce) {
        const sec = ctx.session.ship.section(r.section);
        await shipNotice(ctx, `${sec.name} repaired: <g>${sec.pct}% ${sec.label.toUpperCase()}</>`);
      }
    },
    /**
     * A repair the player makes (the Ship page, or a station's script): the
     * section must be damaged and repairable, the captain in one of its rooms
     * (or "anywhere": true), and the hold must have the materials for the
     * repair's worst outcome. Then, in this order:
     *   1. the section is locked (a second press can't start another repair)
     *   2. the repair's challenge plays (a timing bar; its checkpoint holds the
     *      ship and the hold). Each failed attempt wastes its materials, a cost
     *      that survives "Try again"; the tries are limited to what the hold
     *      can pay for. Giving up runs the failure's damage.
     *   3. the outcome is committed before the run closes: success and partial
     *      take their materials (all or nothing) and restore the section; a
     *      failure takes nothing more
     *   4. the lock is released, the player is told, then "outcomeValue" and
     *      the if-branches (they see the repaired ship)
     * A plan that can't start (no materials, the wrong room, nothing to fix)
     * changes nothing and says why.
     */
    shipRepair: async (step, ctx, frame) => {
      const session = ctx.session;
      const content = session.content ?? ctx.content;
      const ship = session.ship;
      const prefs = challengePrefs(ctx);
      const plan = repairPlan(session, step.shipRepair, { difficulty: prefs.difficulty, anywhere: step.anywhere === true, repairId: step.repair ?? null });
      if (!plan.ok) {
        if (step.announce !== false) await shipNotice(ctx, `<r>${plan.message}</>`);
        if (step.outcomeValue) session.story.setValue(step.outcomeValue, 'refused');
        return null;
      }
      const section = plan.section.id;
      if (!ship.lock(section)) return null;
      try {
        const repair = plan.repair;
        const base = challengeConfig(content, step.challenge ?? repair.challenge, { kind: 'repair', id: `ship:${section}:${repair.id}`, difficulty: prefs.difficulty });
        const waste = repair.results.failure.waste.map((c) => ({ takeItem: c.item, count: c.count, silent: true }));
        const damage = repair.results.failure.damage ? [{ shipDamage: section, amount: repair.results.failure.damage, category: 'botched', scale: false, announce: true }] : [];
        const limit = Number.isFinite(plan.attempts) ? plan.attempts : null;
        const cfg = {
          ...base,
          retry: { ...base.retry, maxAttempts: base.retry.maxAttempts === null ? limit : limit === null ? base.retry.maxAttempts : Math.min(base.retry.maxAttempts, limit) },
          onFailure: { ...base.onFailure, mustRetry: false, continue: true, costs: [...base.onFailure.costs, ...waste], consequences: [...base.onFailure.consequences, ...damage] },
        };
        // 3. The commitment: what the final outcome earns, before the run closes (its record then shows it).
        let committed = null;
        const settle = async (rec) => {
          if (rec.outcome !== 'success' && rec.outcome !== 'partial') return;
          const res = repair.results[rec.outcome];
          const items = rec.outcome === 'partial' ? sumItems(repair.cost, res.extra) : repair.cost;
          // Water where he works makes the work poorer (plan.efficiency: 1 when dry).
          const restore = Math.max(1, Math.round(res.restore * (plan.efficiency ?? 1)));
          committed = { items, done: ship.commitRepair({ section, restore, items, inventory: session.inventory, source: `repair:${repair.id}` }) };
          if (!committed.done.ok) throw new Error(`shipRepair ${section}: ${committed.done.reason} (the plan said there was enough)`);
        };
        const attempt = (info) => service(ctx, 'ui', 'timingBar').timingBar({ kind: repair.kind, strikes: repair.strikes, title: repair.title, speed: 1, zone: 26, challenge: info });
        const { record, goto } = await playChallenge(ctx, frame, cfg, attempt, settle);
        if (committed) {
          const items = committed.items;
          const sec = ship.section(section);
          const tone = record.outcome === 'success' ? '<g>' : '<y>';
          if (step.announce !== false) await shipNotice(ctx, `${tone}${record.outcome === 'success' ? 'Repaired' : 'Rough repair'}:</> ${sec.name} ${sec.pct}% ${sec.label.toUpperCase()}. <k>Used ${itemList(content, items)}.</>`);
        } else if (step.announce !== false) {
          const wasted = record.consequences.costs ? sumItems(...Array.from({ length: record.consequences.costs }, () => repair.results.failure.waste)) : [];
          await shipNotice(ctx, `<r>The repair failed.</>${wasted.length ? ` <k>Wasted ${itemList(content, wasted)}.</>` : ''}`);
        }
        return challengeFollowUp(ctx, frame, step, cfg, record, goto);
      } finally {
        ship.unlock(section);
      }
    },
    // --- Ship hazards (overhaul Prompt 6, docs/gameplay-overhaul/10-flooding-and-fire.md) -------
    // None of these run unless a script asks: no chapter does yet. "eventId" makes a step happen once
    // (scoped like shipDamage's); inside a resolved challenge they're refused unless "authorized".
    /** Opens a leak in a section ("severity": seep | leak | breach; "room": one of its floodable rooms). */
    leak: (step, ctx) => {
      if (!claimHazardEvent(ctx, step)) return null;
      const r = quietly(ctx, step, () => ctx.session.ship.hazards.openLeak({ section: step.leak, room: step.room ?? null, severity: step.severity ?? 'leak', source: step.source ?? ctx.challenge?.id ?? 'script' }));
      if (!r.ok) throw new Error(`leak ${step.leak}: ${r.reason}`);
      return null;
    },
    /** Water straight into a compartment (a wave over the side, a burst cask). */
    flood: (step, ctx) => {
      if (!claimHazardEvent(ctx, step)) return null;
      if (!ctx.session.ship.hazards.waterIn(step.flood).floodable) throw new Error(`flood ${step.flood}: not a compartment`);
      ctx.session.ship.hazards.addWater(step.flood, step.amount);
      return null;
    },
    /** Water out of a compartment without work (the crew pumped it in a scene). */
    drain: (step, ctx) => {
      ctx.session.ship.hazards.removeWater(step.drain, step.amount);
      return null;
    },
    /** Starts a fire ("intensity", default the data's ignition; "spread": false keeps it in its room). */
    ignite: (step, ctx) => {
      if (!claimHazardEvent(ctx, step)) return null;
      const r = quietly(ctx, step, () => ctx.session.ship.hazards.ignite({ room: step.ignite, intensity: step.intensity ?? null, spread: step.spread !== false, smoke: step.smoke === true, source: step.source ?? ctx.challenge?.id ?? 'script' }));
      // Awash or burnt out: nothing catches (not a content error: the state decides).
      if (!r.ok && r.reason !== 'too wet to burn' && r.reason !== 'nothing left to burn') throw new Error(`ignite ${step.ignite}: ${r.reason}`);
      return null;
    },
    /** Puts a fire out without work (the crew did it in a scene). */
    extinguish: (step, ctx) => {
      quietly(ctx, step, () => ctx.session.ship.hazards.extinguish(step.extinguish));
      return null;
    },
    /** The leaks of a section (in one "room", or all) are gone (a scene's repair). The water stays. */
    sealLeak: (step, ctx) => {
      ctx.session.ship.hazards.sealLeaks(step.sealLeak, step.room ?? null);
      return null;
    },
    /** Hazard time passes during an authored sequence (seconds): normally scenes stop the clock. */
    hazardClock: (step, ctx) => {
      const tuning = shipTuning(ctx.session.content ?? ctx.content, challengePrefs(ctx).difficulty);
      for (let i = 0; i < Math.max(0, Math.floor(step.hazardClock)); i++) ctx.session.ship.tick(tuning);
      return null;
    },
    /**
     * Emergency work where the captain stands (src/systems/ship/response.js):
     * pump, bail, fetch (fill the buckets), douse, smother. It takes its
     * seconds of hazard time, tick by tick, while the rest of the ship's
     * emergencies go on; pumping and bailing lower the water as it goes; a
     * douse or smother lands at the end. Materials are taken when it starts.
     * One action at a time. Refused (and said why) when it can't be done.
     */
    hazardAction: async (step, ctx) => {
      const session = ctx.session;
      const content = session.content ?? ctx.content;
      const hz = session.ship.hazards;
      const prefs = challengePrefs(ctx);
      const tuning = shipTuning(content, prefs.difficulty);
      const room = step.room ?? session.location?.map;
      const opt = responseOptions(session, room, { difficulty: prefs.difficulty }).find((o) => o.action === step.hazardAction && (!step.station || o.station === step.station));
      if (!opt?.ok) {
        if (step.announce !== false) await shipNotice(ctx, `<r>${opt?.reason ?? 'Nothing to do that to here.'}</>`);
        if (step.outcomeValue) session.story.setValue(step.outcomeValue, 'refused');
        return null;
      }
      const actions = hazardData(content).actions;
      const a = actions[opt.action];
      if (opt.cost?.length && !takeAll(session.inventory, opt.cost)) throw new Error(`hazardAction ${opt.action}: materials gone (the plan said there were enough)`);
      hz.working = true;
      try {
        const per = ((a.amount ?? 0) * tuning.responseScale) / opt.seconds;
        let moved = 0;
        // Pumping draws from the deepest compartment it drains, each tick; bailing from the room he's in.
        const deepest = () => asArray(opt.target).map((r) => hz.waterIn(r)).filter((w) => w.units > 0).sort((x, y) => y.exact - x.exact)[0]?.room ?? null;
        for (let i = 0; i < opt.seconds; i++) {
          await workTick(ctx, a.label, i, opt.seconds);
          const from = opt.action === 'pump' ? deepest() : opt.action === 'bail' ? opt.target : null;
          if (from) moved += hz.removeWater(from, per);
        }
        let text = '';
        if (opt.action === 'pump' || opt.action === 'bail') {
          const w = hz.waterIn(opt.action === 'pump' ? asArray(opt.target)[0] : opt.target);
          text = `${opt.action === 'pump' ? 'Pumped' : 'Bailed'} ${Math.round(moved)}: ${roomLabel(session, w.room).replace(/^the /, '')} water ${w.pct}% ${w.stage.label.toUpperCase()}.`;
        } else if (opt.action === 'fetch') {
          const n = hz.fillBuckets(room, actions.fetch.buckets);
          text = n ? `Buckets filled: ${hz.buckets}/${actions.fetch.buckets}.` : 'No water to fill them with.';
        } else if (hz.fireIn(room)) {
          if (opt.action === 'douse') {
            const at = hz.waterAtHand(room);
            if (!at && hz.buckets > 0) hz.buckets -= 1;
            else if (at === 'flood') hz.removeWater(room, actions.fetch.fromFlood);
          }
          const r = hz.douse(room, a.amount * tuning.responseScale);
          const f = hz.fireIn(room);
          text = r.out ? '' : `The fire in ${roomLabel(session, room)}: ${Math.round(f.intensity)}% ${f.stage.label.toUpperCase()}.`;
        }
        if (text && step.announce !== false) await shipNotice(ctx, text);
        if (step.outcomeValue) session.story.setValue(step.outcomeValue, 'done');
      } finally {
        hz.working = false;
        ctx.services?.ui?.work?.(null);
      }
      return null;
    },
    /**
     * Patches the worst open leak where the captain stands (or the leak
     * named): materials and the repair's timing bar (the ship_repair profile,
     * or "challenge"). A failed try wastes a nail (a cost "Try again" keeps);
     * the tries are what the hold can pay for. Success closes the leak, a
     * rough patch halves it; then the patching work takes its seconds of
     * hazard time with the leak still open. The hull and the water stay as
     * they are: that's a repair, and pumping.
     */
    patchLeak: async (step, ctx, frame) => {
      const session = ctx.session;
      const content = session.content ?? ctx.content;
      const hz = session.ship.hazards;
      const prefs = challengePrefs(ctx);
      const room = step.room ?? session.location?.map;
      const opt = responseOptions(session, room, { difficulty: prefs.difficulty }).find((o) => o.action === 'patch' && (typeof step.patchLeak !== 'string' || o.leak === step.patchLeak));
      if (!opt?.ok) {
        if (step.announce !== false) await shipNotice(ctx, `<r>${opt?.reason ?? 'No open leak here.'}</>`);
        if (step.outcomeValue) session.story.setValue(step.outcomeValue, 'refused');
        return null;
      }
      const pdef = hazardData(content).actions.patch;
      const leakId = opt.leak;
      const waste = patchWaste(content, prefs.difficulty);
      const get = (list, item) => list.find((c) => c.item === item)?.count ?? 0;
      const worst = [...new Set([...opt.cost, ...waste].map((c) => c.item))].map((item) => ({ item, count: Math.max(get(opt.cost, item), get(waste, item)) }));
      const attempts = affordableAttempts({ worst, results: { failure: { waste } } }, (id) => session.inventory.count(id));
      hz.working = true;
      try {
        const base = challengeConfig(content, step.challenge ?? pdef.challenge, { kind: 'repair', id: `leak:${leakId}`, difficulty: prefs.difficulty });
        const limit = Number.isFinite(attempts) ? attempts : null;
        const cfg = {
          ...base,
          retry: { ...base.retry, maxAttempts: base.retry.maxAttempts === null ? limit : limit === null ? base.retry.maxAttempts : Math.min(base.retry.maxAttempts, limit) },
          onFailure: { ...base.onFailure, mustRetry: false, continue: true, costs: [...base.onFailure.costs, ...waste.map((c) => ({ takeItem: c.item, count: c.count, silent: true }))] },
        };
        let committed = null;
        const settle = async (rec) => {
          if (rec.outcome !== 'success' && rec.outcome !== 'partial') return;
          // The work takes its time with the leak still pouring, then the patch goes on.
          const seconds = opt.seconds;
          for (let i = 0; i < seconds; i++) await workTick(ctx, pdef.label, i, seconds);
          if (!hz.leaks.some((l) => l.id === leakId && l.state === 'open')) return;
          if (!takeAll(session.inventory, opt.cost)) throw new Error(`patchLeak ${leakId}: materials gone (the plan said there were enough)`);
          committed = hz.patchLeak(leakId, rec.outcome);
        };
        const attempt = (info) => service(ctx, 'ui', 'timingBar').timingBar({ kind: pdef.kind, strikes: pdef.strikes, title: pdef.title, speed: 1, zone: 26, challenge: info });
        const { record, goto } = await playChallenge(ctx, frame, cfg, attempt, settle);
        if (committed && step.announce !== false) await shipNotice(ctx, `<k>Used ${itemList(content, opt.cost)}.</>`);
        else if (!committed && step.announce !== false && record.outcome === 'failure') {
          const wasted = record.consequences.costs ? sumItems(...Array.from({ length: record.consequences.costs }, () => waste)) : [];
          await shipNotice(ctx, `<r>The patch failed.</>${wasted.length ? ` <k>Wasted ${itemList(content, wasted)}.</>` : ''}`);
        }
        return challengeFollowUp(ctx, frame, step, cfg, record, goto);
      } finally {
        hz.working = false;
        ctx.services?.ui?.work?.(null);
      }
    },
    /**
     * "What can I do here?": the emergency actions in the captain's room
     * (the world's Respond button, the Ship page), as a choice; the chosen one
     * runs. One that can't be done says why. "Leave it" does nothing.
     */
    emergency: async (step, ctx, frame) => {
      const session = ctx.session;
      const prefs = challengePrefs(ctx);
      const room = session.location?.map;
      const hazardOpts = responseOptions(session, room, { difficulty: prefs.difficulty });
      // Prompt 8: a Grand Stenchmaster in the room (docs/gameplay-overhaul/12-pressure-and-eruptions.md); the air's actions are offered with him, to prepare.
      const pGroups = pressureGroups(session, room);
      // Prompt 7: the air's actions in this room (docs/gameplay-overhaul/11-atmosphere-and-ventilation.md).
      const airOpts = airOptions(session, room, { difficulty: prefs.difficulty, always: pGroups.length > 0 });
      // Prompt 9: the captain's own beard, wherever he is, while that system is on (docs/gameplay-overhaul/13-beard-saturation.md).
      const beardOpts = beardOptions(session, { difficulty: prefs.difficulty });
      if (!hazardOpts.length && !airOpts.length && !pGroups.length && !beardOpts.length) {
        if (step.announce !== false) await shipNotice(ctx, '<k>Nothing to do about an emergency here.</>');
        return null;
      }
      const hz = session.ship.hazards;
      const bits = [];
      const f = hz.fireIn(room);
      if (f) bits.push(`<o>FIRE ${f.stage.label.toUpperCase()}</>`);
      const w = hz.waterIn(room);
      if (w.units > 0) bits.push(`water ${w.pct}% ${w.stage.label.toUpperCase()}`);
      const open = hz.leaksIn(room).filter((l) => l.state === 'open');
      if (open.length) bits.push(`<r>${open.length === 1 ? 'a leak' : `${open.length} leaks`}</>`);
      const a = session.ship.air.airIn(room);
      if (a.quality.id !== 'clean') bits.push(`air ${a.quality.label.toUpperCase()}`);
      const prompt = parseLine(`${(session.content.maps?.get?.(room)?.name ?? room)}${bits.length ? `: ${bits.join(', ')}` : ''}`);
      const choose = async (opts) => {
        const index = await service(ctx, 'dialogue', 'choice').choose({
          prompt,
          options: [...opts.map((o) => ({ text: o.ok ? o.label : `<k>${o.label}</>` })), { text: 'Leave it' }],
          cancelIndex: opts.length,
        });
        return opts[index] ?? null;
      };
      // More than one kind of trouble here: which first (short lists, not one long one).
      const groups = [...pGroups, ...(hazardOpts.length ? [{ label: 'Fight the emergency', ok: true, list: hazardOpts }] : []), ...(airOpts.length ? [{ label: 'Air and vents', ok: true, list: airOpts }] : []), ...(beardOpts.length ? [{ label: 'Your beard', ok: true, list: beardOpts }] : [])];
      let opts = groups[0].list;
      if (groups.length > 1) {
        const pick = await choose(groups);
        if (!pick) {
          await ctx.services?.dialogue?.close?.();
          return null;
        }
        opts = pick.list;
      }
      const picked = await choose(opts);
      if (!picked) {
        await ctx.services?.dialogue?.close?.();
        return null;
      }
      if (!picked.ok) {
        await ctx.services?.dialogue?.close?.();
        await shipNotice(ctx, `<r>${picked.reason}</>`);
        return null;
      }
      await ctx.services?.dialogue?.close?.();
      let next;
      if (picked.action === 'patch') next = { patchLeak: picked.leak };
      else if (picked.action === 'check') next = { airCheck: true };
      else if (picked.action === 'seal') next = { airSeal: picked.connection };
      else if (picked.action === 'mend') next = { airMend: picked.connection };
      else if (picked.action === 'pcheck') next = { pressureCheck: picked.subject };
      else if (picked.action === 'soothe') next = { pressureSoothe: picked.subject };
      else if (picked.action === 'restrain') next = { pressureRestrain: picked.subject };
      else if (picked.action === 'release') next = { pressureRelease: picked.subject };
      else if (picked.action === 'inspect') next = { beardInspect: true };
      else if (picked.action === 'sniff') next = { beardSniff: true };
      else if (picked.action === 'wring') next = { beardWring: true };
      else if (picked.action === 'rinse' || picked.action === 'scrub') next = { beardCare: picked.action };
      else if (picked.action === 'wear' || picked.action === 'remove') next = { beardWear: picked.item, remove: picked.action === 'remove' };
      else if (picked.connection) next = { airControl: picked.connection, state: picked.to };
      else next = { hazardAction: picked.action, ...(picked.station ? { station: picked.station } : {}) };
      return ctx.runner.execBranch([next], ctx, frame);
    },
    // --- Prompt 7: the ship's air (docs/gameplay-overhaul/11-atmosphere-and-ventilation.md) ---
    /** Starts a gas source: { "airSource": room, "substance", "rate" (units a second), "amount" and/or "seconds", "id"?, "label"? }. */
    airSource: (step, ctx) => {
      if (!claimHazardEvent(ctx, step)) return null;
      const r = quietly(ctx, step, () => ctx.session.ship.air.startSource({ id: step.id ?? null, room: step.airSource, substance: step.substance, rate: step.rate, amount: step.amount ?? null, seconds: step.seconds ?? null, label: step.label ?? null, source: step.source ?? ctx.challenge?.id ?? 'script' }));
      // Already pouring, or too many at once: the state decides, not the content (nothing changes).
      if (!r.ok && r.reason !== 'already pouring' && r.reason !== 'too many sources') throw new Error(`airSource ${step.airSource}: ${r.reason}`);
      if (step.outcomeValue) ctx.session.story.setValue(step.outcomeValue, r.ok ? 'started' : 'refused');
      return null;
    },
    /** Stops a source: { "airStop": "id" }, or every source in a room: { "airStop": true, "room": room }. */
    airStop: (step, ctx) => {
      ctx.session.ship.air.stopSource(typeof step.airStop === 'string' ? step.airStop : null, step.airStop === true ? step.room : null);
      return null;
    },
    /** Gas straight into a room: { "airAdd": room, "substance", "pct" } (points of the room's air; never past full). */
    airAdd: (step, ctx) => {
      if (!claimHazardEvent(ctx, step)) return null;
      const air = ctx.session.ship.air;
      air.addGas(step.airAdd, step.substance, (step.pct * air.volume(step.airAdd)) / 100);
      return null;
    },
    /** The crew airs a room out (a scene): { "airVent": room, "share"? } (0 to 1 of its gas leaves the ship; default all). */
    airVent: (step, ctx) => {
      ctx.session.ship.air.ventRoom(step.airVent, step.share ?? 1);
      return null;
    },
    /**
     * A scene opens, shuts, seals or damages an opening, at once:
     * { "airConnection": id, "state"?, "damaged"? }. Sealing an open one
     * shuts it first; a damaged one can't be sealed (nothing changes).
     */
    airConnection: (step, ctx) => {
      const air = ctx.session.ship.air;
      if (step.state === 'sealed' && air.connectionState(step.airConnection)?.state === 'open') air.setConnection(step.airConnection, 'closed');
      const r = air.setConnection(step.airConnection, step.state ?? null, { damaged: step.damaged ?? null });
      if (step.outcomeValue) ctx.session.story.setValue(step.outcomeValue, r.ok ? 'done' : 'refused');
      return null;
    },
    /** "Check the air" where the captain stands: the report, in the dialogue box. */
    airCheck: async (step, ctx) => {
      const room = step.room ?? ctx.session.location?.map;
      if (!airRoom(ctx.session.content, room)) {
        await shipNotice(ctx, '<k>No ship air to check here.</>');
        return null;
      }
      for (const text of airReport(ctx.session, room)) await service(ctx, 'dialogue', 'narrate').say({ speaker: null, expression: null, text });
      await ctx.services?.dialogue?.close?.();
      return null;
    },
    /**
     * The captain opens, shuts or unseals an opening of the room he is in:
     * { "airControl": id, "state": "open" | "closed" }. It takes its seconds
     * (hazard time runs: the gas goes on meanwhile); refused, it says why.
     */
    airControl: async (step, ctx) => {
      const session = ctx.session;
      const prefs = challengePrefs(ctx);
      const room = step.room ?? session.location?.map;
      const opt = airOptions(session, room, { difficulty: prefs.difficulty, always: true }).find((o) => o.connection === step.airControl && o.action !== 'seal' && (!step.state || o.to === step.state));
      if (!opt?.ok) {
        if (step.announce !== false) await shipNotice(ctx, `<r>${opt?.reason ?? "Nothing to do to that from here."}</>`);
        if (step.outcomeValue) session.story.setValue(step.outcomeValue, 'refused');
        return null;
      }
      const hz = session.ship.hazards;
      const air = session.ship.air;
      const c = air.connectionState(opt.connection);
      hz.working = true;
      try {
        const label = `${{ open: 'Opening', close: 'Closing', unseal: 'Unsealing' }[opt.action]} ${c.label.replace(/^the /, 'the ')}`;
        for (let i = 0; i < opt.seconds; i++) await workTick(ctx, label, i, opt.seconds);
        const r = air.setConnection(opt.connection, opt.to);
        if (r.ok && step.announce !== false) await shipNotice(ctx, `${{ open: 'Opened', close: 'Closed', unseal: 'Unsealed' }[opt.action]} ${c.label}.`);
        if (step.outcomeValue) session.story.setValue(step.outcomeValue, r.ok ? 'done' : 'refused');
      } finally {
        hz.working = false;
        ctx.services?.ui?.work?.(null);
      }
      return null;
    },
    /**
     * Seals a closed door or hatch of the captain's room (sailcloth and
     * nails, on the repair bar: the ship_repair profile, or "challenge"). A
     * failed try wastes a nail (a cost "Try again" keeps); the tries are what
     * the hold can pay for. Success or a rough job seals it after its seconds.
     */
    airSeal: async (step, ctx, frame) => {
      const session = ctx.session;
      const content = session.content ?? ctx.content;
      const prefs = challengePrefs(ctx);
      const room = step.room ?? session.location?.map;
      const opt = airOptions(session, room, { difficulty: prefs.difficulty, always: true }).find((o) => o.action === 'seal' && o.connection === step.airSeal);
      if (!opt?.ok) {
        if (step.announce !== false) await shipNotice(ctx, `<r>${opt?.reason ?? "That can't be sealed from here."}</>`);
        if (step.outcomeValue) session.story.setValue(step.outcomeValue, 'refused');
        return null;
      }
      const sdef = content.shipAir.actions.seal;
      const hz = session.ship.hazards;
      const air = session.ship.air;
      const c = air.connectionState(opt.connection);
      const waste = sealWaste(content, prefs.difficulty);
      const get = (list, item) => list.find((x) => x.item === item)?.count ?? 0;
      const worst = [...new Set([...opt.cost, ...waste].map((x) => x.item))].map((item) => ({ item, count: Math.max(get(opt.cost, item), get(waste, item)) }));
      const attempts = affordableAttempts({ worst, results: { failure: { waste } } }, (id) => session.inventory.count(id));
      hz.working = true;
      try {
        const base = challengeConfig(content, step.challenge ?? sdef.challenge, { kind: 'repair', id: `seal:${opt.connection}`, difficulty: prefs.difficulty });
        const limit = Number.isFinite(attempts) ? attempts : null;
        const cfg = {
          ...base,
          retry: { ...base.retry, maxAttempts: base.retry.maxAttempts === null ? limit : limit === null ? base.retry.maxAttempts : Math.min(base.retry.maxAttempts, limit) },
          onFailure: { ...base.onFailure, mustRetry: false, continue: true, costs: [...base.onFailure.costs, ...waste.map((x) => ({ takeItem: x.item, count: x.count, silent: true }))] },
        };
        let committed = null;
        const settle = async (rec) => {
          if (rec.outcome !== 'success' && rec.outcome !== 'partial') return;
          for (let i = 0; i < opt.seconds; i++) await workTick(ctx, `Sealing ${c.label}`, i, opt.seconds);
          if (air.connectionState(opt.connection).state !== 'closed') return;
          if (!takeAll(session.inventory, opt.cost)) throw new Error(`airSeal ${opt.connection}: materials gone (the plan said there were enough)`);
          committed = air.setConnection(opt.connection, 'sealed');
        };
        const attempt = (info) => service(ctx, 'ui', 'timingBar').timingBar({ kind: sdef.kind, strikes: sdef.strikes, title: sdef.title, speed: 1, zone: 26, challenge: info });
        const { record, goto } = await playChallenge(ctx, frame, cfg, attempt, settle);
        if (committed?.ok && step.announce !== false) await shipNotice(ctx, `<g>Sealed</> ${c.label}. <k>Used ${itemList(content, opt.cost)}.</>`);
        else if (!committed?.ok && step.announce !== false && record.outcome === 'failure') {
          const wasted = record.consequences.costs ? sumItems(...Array.from({ length: record.consequences.costs }, () => waste)) : [];
          await shipNotice(ctx, `<r>The seal didn't take.</>${wasted.length ? ` <k>Wasted ${itemList(content, wasted)}.</>` : ''}`);
        }
        return challengeFollowUp(ctx, frame, step, cfg, record, goto);
      } finally {
        hz.working = false;
        ctx.services?.ui?.work?.(null);
      }
    },
    /**
     * Prompt 8: mends a door or hatch a blast damaged, in the captain's room
     * (planks and nails, on the repair bar, like a seal). A failed try wastes
     * a nail; success or a rough job mends it after its seconds.
     */
    airMend: async (step, ctx, frame) => {
      const session = ctx.session;
      const content = session.content ?? ctx.content;
      const prefs = challengePrefs(ctx);
      const room = step.room ?? session.location?.map;
      const opt = airOptions(session, room, { difficulty: prefs.difficulty, always: true }).find((o) => o.action === 'mend' && o.connection === step.airMend);
      if (!opt?.ok) {
        if (step.announce !== false) await shipNotice(ctx, `<r>${opt?.reason ?? 'Nothing to mend there from here.'}</>`);
        if (step.outcomeValue) session.story.setValue(step.outcomeValue, 'refused');
        return null;
      }
      const mdef = content.shipAir.actions.mend;
      const hz = session.ship.hazards;
      const air = session.ship.air;
      const c = air.connectionState(opt.connection);
      const waste = mendWaste(content, prefs.difficulty);
      const get = (list, item) => list.find((x) => x.item === item)?.count ?? 0;
      const worst = [...new Set([...opt.cost, ...waste].map((x) => x.item))].map((item) => ({ item, count: Math.max(get(opt.cost, item), get(waste, item)) }));
      const attempts = affordableAttempts({ worst, results: { failure: { waste } } }, (id) => session.inventory.count(id));
      hz.working = true;
      try {
        const base = challengeConfig(content, step.challenge ?? mdef.challenge, { kind: 'repair', id: `mend:${opt.connection}`, difficulty: prefs.difficulty });
        const limit = Number.isFinite(attempts) ? attempts : null;
        const cfg = {
          ...base,
          retry: { ...base.retry, maxAttempts: base.retry.maxAttempts === null ? limit : limit === null ? base.retry.maxAttempts : Math.min(base.retry.maxAttempts, limit) },
          onFailure: { ...base.onFailure, mustRetry: false, continue: true, costs: [...base.onFailure.costs, ...waste.map((x) => ({ takeItem: x.item, count: x.count, silent: true }))] },
        };
        let committed = null;
        const settle = async (rec) => {
          if (rec.outcome !== 'success' && rec.outcome !== 'partial') return;
          for (let i = 0; i < opt.seconds; i++) await workTick(ctx, `Mending ${c.label}`, i, opt.seconds);
          if (!air.connectionState(opt.connection).damaged) return;
          if (!takeAll(session.inventory, opt.cost)) throw new Error(`airMend ${opt.connection}: materials gone (the plan said there were enough)`);
          committed = air.setConnection(opt.connection, null, { damaged: false });
        };
        const attempt = (info) => service(ctx, 'ui', 'timingBar').timingBar({ kind: mdef.kind, strikes: mdef.strikes, title: mdef.title, speed: 1, zone: 26, challenge: info });
        const { record, goto } = await playChallenge(ctx, frame, cfg, attempt, settle);
        if (committed?.ok && step.announce !== false) await shipNotice(ctx, `<g>Mended</> ${c.label}. <k>Used ${itemList(content, opt.cost)}.</>`);
        else if (!committed?.ok && step.announce !== false && record.outcome === 'failure') {
          const wasted = record.consequences.costs ? sumItems(...Array.from({ length: record.consequences.costs }, () => waste)) : [];
          await shipNotice(ctx, `<r>It didn't hold.</>${wasted.length ? ` <k>Wasted ${itemList(content, wasted)}.</>` : ''}`);
        }
        return challengeFollowUp(ctx, frame, step, cfg, record, goto);
      } finally {
        hz.working = false;
        ctx.services?.ui?.work?.(null);
      }
    },
    // --- Prompt 8: Grand Stenchmaster pressure (docs/gameplay-overhaul/12-pressure-and-eruptions.md) ---
    /** Switches a subject's pressure on or off: { "pressureSubject": "garrick", "on": true }. Opt-in: no chapter does. */
    pressureSubject: (step, ctx) => {
      const r = ctx.session.ship.pressure.enable(step.pressureSubject, step.on !== false);
      if (!r.ok) throw new Error(`pressureSubject ${step.pressureSubject}: ${r.reason}`);
      return null;
    },
    /**
     * A named trigger: { "pressureTrigger": subject, "trigger": id, "eventId"? }.
     * Brogath's are his Stability's (its line is said unless "quiet"). Refused
     * (off, away, a scene owns him): nothing changes ("outcomeValue": refused).
     */
    pressureTrigger: async (step, ctx) => {
      if (!claimHazardEvent(ctx, step)) return null;
      const r = quietly(ctx, step, () => ctx.session.ship.pressure.trigger(step.pressureTrigger, step.trigger, tuningOf(ctx)));
      if (step.outcomeValue) ctx.session.story.setValue(step.outcomeValue, r.ok ? 'done' : 'refused');
      if (!r.ok) return null;
      if (r.effect?.sfx) ctx.services?.audio?.sfx?.(r.effect.sfx, { volume: r.effect.volume ?? 0.7 });
      if (r.effect?.line && !step.quiet) await service(ctx, 'dialogue', 'pressure').say(parseLine(r.effect.line));
      return null;
    },
    /** A named calm (scaled by the difficulty and his stage): { "pressureCalm": subject, "calm": id }. */
    pressureCalm: async (step, ctx) => {
      const r = quietly(ctx, step, () => ctx.session.ship.pressure.calm(step.pressureCalm, step.calm, tuningOf(ctx)));
      if (step.outcomeValue) ctx.session.story.setValue(step.outcomeValue, r.ok ? 'done' : 'refused');
      if (r.ok && r.effect?.line && !step.quiet) await service(ctx, 'dialogue', 'pressure').say(parseLine(r.effect.line));
      return null;
    },
    /**
     * A scene's suppression: { "pressureHold": subject, "amount"? }. He holds
     * it in (default: his hold's amount): lower now, stored up for later,
     * and strained; no lock (that is the captain's own try).
     */
    pressureHold: (step, ctx) => {
      const pr = ctx.session.ship.pressure;
      if (!pr.ready(step.pressureHold).ok) return null;
      quietly(ctx, step, () => pr.restrained(step.pressureHold, tuningOf(ctx), { amount: step.amount ?? null, lock: false }));
      return null;
    },
    /** A scripted amount: { "pressureAdd": subject, "amount": n } (a rise is scaled like any; a fall isn't). */
    pressureAdd: (step, ctx) => {
      if (!claimHazardEvent(ctx, step)) return null;
      quietly(ctx, step, () => ctx.session.ship.pressure.add(step.pressureAdd, step.amount, tuningOf(ctx)));
      return null;
    },
    /** A temporary modifier from the subject's table: { "pressureModifier": subject, "modifier": id, "remove"? }. */
    pressureModifier: (step, ctx) => {
      const pr = ctx.session.ship.pressure;
      if (step.remove) pr.removeModifier(step.pressureModifier, step.modifier);
      else if (pr.ready(step.pressureModifier).ok) quietly(ctx, step, () => pr.addModifier(step.pressureModifier, step.modifier));
      return null;
    },
    /**
     * A release now: { "pressureErupt": subject, "profile"?, "controlled"?,
     * "room"?, "eventId"? }. Its size comes from his pressure and what he
     * held unless a profile is named; "room" (a room with ship air) overrides
     * where he is. Applied once per event id (scoped like any hazard event).
     */
    pressureErupt: (step, ctx) => {
      if (challengeStateOf(ctx) === 'resolved' && step.authorized !== true) return null;
      const pr = ctx.session.ship.pressure;
      const ready = pr.ready(step.pressureErupt);
      if (!ready.ok) {
        if (step.outcomeValue) ctx.session.story.setValue(step.outcomeValue, 'refused');
        return null;
      }
      const r = quietly(ctx, step, () => pr.erupt(step.pressureErupt, { controlled: step.controlled === true, profile: step.profile ?? null, room: step.room ?? null, eventId: scopedEventId(ctx, step.eventId ?? null), tuning: tuningOf(ctx) }));
      if (step.outcomeValue) ctx.session.story.setValue(step.outcomeValue, r.ok ? r.level : 'refused');
      return null;
    },
    /** Back to calm after a scene: { "pressureSettle": subject, "pressure"? } (nothing held, pending or building). */
    pressureSettle: (step, ctx) => {
      ctx.session.ship.pressure.settle(step.pressureSettle, step.pressure ?? null);
      return null;
    },
    /** A failed hold, as a challenge cost (kept through a retry): { "pressureSetback": subject, "action": "restrain" }. */
    pressureSetback: (step, ctx) => {
      quietly(ctx, step, () => ctx.session.ship.pressure.setback(step.pressureSetback, step.action ?? 'restrain', tuningOf(ctx)));
      return null;
    },
    /** "Check on him": the report, in the dialogue box. */
    pressureCheck: async (step, ctx) => {
      const lines = pressureReport(ctx.session, step.pressureCheck);
      if (!lines.length) return null;
      for (const text of lines) await service(ctx, 'dialogue', 'narrate').say({ speaker: null, expression: null, text });
      await ctx.services?.dialogue?.close?.();
      return null;
    },
    /**
     * The captain calms him, up close: Brogath with the right words (his
     * Stability's reassurance prompt: a wrong answer sets him off), Garrick by
     * settling him down (seconds of work, while the rest goes on). Either way
     * a lock follows: no calming on every press.
     */
    pressureSoothe: async (step, ctx) => {
      const session = ctx.session;
      const id = step.pressureSoothe;
      const opt = subjectOptions(session, id).find((o) => o.action === 'soothe');
      if (!opt?.ok) {
        if (step.announce !== false) await shipNotice(ctx, `<r>${opt?.reason ?? 'Nobody to calm here.'}</>`);
        if (step.outcomeValue) session.story.setValue(step.outcomeValue, 'refused');
        return null;
      }
      const def = subjectDef(session.content, id);
      const pr = session.ship.pressure;
      const st = pr.state(id);
      const T = tuningOf(ctx);
      const stageWords = () => {
        const si = stageInfo(session.content, pr.stage(id));
        return `<${si.tone}>${si.label.toUpperCase()}</>`;
      };
      let calmed = false;
      if (def.soothe.kind === 'prompt') {
        const set = def.legacy.prompts[def.soothe.set];
        const opts = promptOptions(def.legacy, def.soothe.set, st.turn);
        st.turn += 1;
        const dialogue = service(ctx, 'dialogue', 'reassure');
        const index = await dialogue.choose({ prompt: parseLine(`${def.name}: ${stageWords()}. What do you say?`), options: opts.map((o) => ({ text: o.text })), cancelIndex: null });
        const o = opts[index] ?? opts[0];
        if (set.echo !== false) await dialogue.say(parseLine(`${set.speaker ?? 'captain'}: ${o.say ?? o.text}`));
        // Even the wrong words use up the moment.
        st.calmLock = def.soothe.lock;
        const r = o.calm ? pr.calm(id, o.calm, T) : pr.trigger(id, o.trigger, T);
        calmed = !!o.calm && r.ok;
        const e = r.effect;
        if (e?.sfx) ctx.services?.audio?.sfx?.(e.sfx, { volume: e.volume ?? 0.7 });
        const reply = o.reply ?? e?.line;
        if (reply) await dialogue.say(parseLine(reply));
        await ctx.services?.dialogue?.close?.();
      } else {
        const hz = session.ship.hazards;
        hz.working = true;
        try {
          for (let i = 0; i < opt.seconds; i++) await workTick(ctx, `Settling ${def.name}`, i, opt.seconds);
        } finally {
          hz.working = false;
          ctx.services?.ui?.work?.(null);
        }
        st.calmLock = def.soothe.lock;
        // Still here and still in a state to listen?
        const again = subjectOptions(session, id).find((o) => o.action === 'soothe');
        if (pr.ready(id).ok && !again?.reason?.includes('mid-ceremony')) calmed = pr.calm(id, def.soothe.calm, T).ok;
      }
      if (step.announce !== false) await shipNotice(ctx, calmed ? `<g>${def.name} calms down a little.</> <k>Now:</> ${stageWords()}` : `<r>That made it worse.</> <k>${def.name}:</> ${stageWords()}`);
      if (step.outcomeValue) session.story.setValue(step.outcomeValue, calmed ? 'calmed' : 'worse');
      return null;
    },
    /**
     * The captain coaches him to hold it in (the timing bar: data
     * actions.restrain). Held, the pressure falls now and comes back bigger
     * at the release; failed, he is worse and can't try again for a while (a
     * cost "Try again" keeps).
     */
    pressureRestrain: async (step, ctx, frame) => {
      const session = ctx.session;
      const content = session.content ?? ctx.content;
      const id = step.pressureRestrain;
      const opt = subjectOptions(session, id).find((o) => o.action === 'restrain');
      if (!opt?.ok) {
        if (step.announce !== false) await shipNotice(ctx, `<r>${opt?.reason ?? 'Nobody to hold it in here.'}</>`);
        if (step.outcomeValue) session.story.setValue(step.outcomeValue, 'refused');
        return null;
      }
      const prefs = challengePrefs(ctx);
      const act = pressureData(content).actions.restrain;
      const def = subjectDef(content, id);
      const pr = session.ship.pressure;
      const hz = session.ship.hazards;
      hz.working = true;
      try {
        const base = challengeConfig(content, step.challenge ?? act.challenge, { kind: 'repair', id: `restrain:${id}`, difficulty: prefs.difficulty });
        const cfg = { ...base, onFailure: { ...base.onFailure, mustRetry: false, continue: true, costs: [...base.onFailure.costs, { pressureSetback: id, action: 'restrain' }] } };
        let held = null;
        const settle = async (rec) => {
          if (rec.outcome !== 'success' && rec.outcome !== 'partial') return;
          if (pr.ready(id).ok) held = pr.restrained(id, tuningOf(ctx));
        };
        const attempt = (info) => service(ctx, 'ui', 'timingBar').timingBar({ kind: act.kind, strikes: act.strikes, title: act.title, speed: 1, zone: 26, challenge: info });
        const { record, goto } = await playChallenge(ctx, frame, cfg, attempt, settle);
        if (!held && step.announce !== false && record.outcome === 'failure') await shipNotice(ctx, `<r>He couldn't hold it.</> <k>${def.name} is worse, and won't try again for a while.</>`);
        return challengeFollowUp(ctx, frame, step, cfg, record, goto);
      } finally {
        hz.working = false;
        ctx.services?.ui?.work?.(null);
      }
    },
    /**
     * The captain helps him let it out, here and now (seconds of work): a
     * controlled release, smaller than an eruption. Open a porthole first.
     * If the countdown runs out while they work, the eruption came first.
     */
    pressureRelease: async (step, ctx) => {
      const session = ctx.session;
      const id = step.pressureRelease;
      const opt = subjectOptions(session, id).find((o) => o.action === 'release');
      if (!opt?.ok) {
        if (step.announce !== false) await shipNotice(ctx, `<r>${opt?.reason ?? 'Nobody to help here.'}</>`);
        if (step.outcomeValue) session.story.setValue(step.outcomeValue, 'refused');
        return null;
      }
      const def = subjectDef(session.content, id);
      const pr = session.ship.pressure;
      const before = pr.state(id).count;
      const hz = session.ship.hazards;
      hz.working = true;
      try {
        for (let i = 0; i < opt.seconds; i++) await workTick(ctx, `Easing ${def.name}`, i, opt.seconds);
      } finally {
        hz.working = false;
        ctx.services?.ui?.work?.(null);
      }
      if (pr.state(id).count !== before) {
        if (step.announce !== false) await shipNotice(ctx, `<r>Too late.</> <k>${def.name} went first.</>`);
        if (step.outcomeValue) session.story.setValue(step.outcomeValue, 'late');
        return null;
      }
      const r = pr.ready(id).ok ? pr.erupt(id, { controlled: true, tuning: tuningOf(ctx) }) : { ok: false };
      if (step.outcomeValue) session.story.setValue(step.outcomeValue, r.ok ? r.level : 'refused');
      return null;
    },
    // --- Prompt 9: the Stink Beard (docs/gameplay-overhaul/13-beard-saturation.md) ---
    /** Switches Beard Saturation on or off: { "beardSaturation": true }. Opt-in: no chapter does. Off keeps what it holds. */
    beardSaturation: (step, ctx) => {
      const r = ctx.session.ship.beard.enable(step.beardSaturation !== false);
      if (!r.ok) throw new Error(`beardSaturation: ${r.reason}`);
      return null;
    },
    /**
     * A deposit that isn't from the air (an event, a splash): { "beardAdd":
     * contaminant, "amount", "eventId"? }. Never past capacity (the rest is
     * refused); once per event id; off, nothing happens.
     */
    beardAdd: (step, ctx) => {
      if (challengeStateOf(ctx) === 'resolved' && step.authorized !== true) return null;
      const r = quietly(ctx, step, () => ctx.session.ship.beard.deposit(step.beardAdd, step.amount, tuningOf(ctx), { eventId: scopedEventId(ctx, step.eventId ?? null) }));
      if (!r.ok && r.reason !== 'off' && r.reason !== 'duplicate event') throw new Error(`beardAdd ${step.beardAdd}: ${r.reason}`);
      return null;
    },
    /** A scripted wash: { "beardClean": true } (everything) or { "beardClean": contaminant }, "share"? (0 to 1, exactly that). */
    beardClean: (step, ctx) => {
      const r = quietly(ctx, step, () => ctx.session.ship.beard.clean({ share: step.share ?? 1, contaminant: step.beardClean === true ? null : step.beardClean }, tuningOf(ctx)));
      if (!r.ok) throw new Error(`beardClean: ${r.reason}`);
      return null;
    },
    /** A condition by an event: { "beardStatus": id, "seconds"? }, or { "beardStatus": id, "remove": true }. Never a derived one. */
    beardStatus: (step, ctx) => {
      const b = ctx.session.ship.beard;
      const r = quietly(ctx, step, () => (step.remove ? b.removeStatus(step.beardStatus, tuningOf(ctx)) : b.applyStatus(step.beardStatus, step.seconds ?? null, tuningOf(ctx))));
      if (!r.ok && r.reason !== 'off') throw new Error(`beardStatus ${step.beardStatus}: ${r.reason}`);
      return null;
    },
    /**
     * A purge now: { "beardPurge": "controlled" | "overload" | "catastrophic",
     * "room"?, "eventId"? }: its share into the room (or the open), then the
     * cooldown. Once per event id; nothing in it, or off: refused.
     */
    beardPurge: (step, ctx) => {
      if (challengeStateOf(ctx) === 'resolved' && step.authorized !== true) return null;
      const b = ctx.session.ship.beard;
      const r = quietly(ctx, step, () => b.purge(step.beardPurge, tuningOf(ctx), { room: step.room ?? null, eventId: scopedEventId(ctx, step.eventId ?? null) }));
      if (step.outcomeValue) ctx.session.story.setValue(step.outcomeValue, r.ok ? 'purged' : 'refused');
      return null;
    },
    /** "Look at your beard": the report, in the dialogue box (broad: no figures). */
    beardInspect: async (step, ctx) => {
      if (!ctx.session.ship.beard.on || !beardData(ctx.session.content)) {
        await shipNotice(ctx, '<k>A magnificent beard. Nothing more to say about it.</>');
        return null;
      }
      for (const text of beardReport(ctx.session, tuningOf(ctx))) await service(ctx, 'dialogue', 'narrate').say({ speaker: null, expression: null, text });
      await ctx.services?.dialogue?.close?.();
      return null;
    },
    /** "Sniff your beard": the detail an inspection doesn't give, at a price (a whiff into his lungs, a gag), then a lock. */
    beardSniff: async (step, ctx) => {
      const r = quietly(ctx, step, () => ctx.session.ship.beard.sniff(tuningOf(ctx)));
      if (!r.ok) {
        if (step.announce !== false) await shipNotice(ctx, `<r>${r.reason === 'off' ? 'Just a beard.' : r.reason}</>`);
        if (step.outcomeValue) ctx.session.story.setValue(step.outcomeValue, 'refused');
        return null;
      }
      if (step.announce !== false) {
        for (const text of sniffReport(ctx.session, r, tuningOf(ctx))) await service(ctx, 'dialogue', 'narrate').say({ speaker: null, expression: null, text });
        await ctx.services?.dialogue?.close?.();
      }
      if (step.outcomeValue) ctx.session.story.setValue(step.outcomeValue, r.gag ? 'gagged' : 'sniffed');
      return null;
    },
    /**
     * The captain wrings his beard out, here (seconds of work, while the
     * rest goes on): a controlled purge into this room. If it purged by
     * itself while he worked, that came first.
     */
    beardWring: async (step, ctx) => {
      const session = ctx.session;
      const opt = beardOptions(session, { difficulty: challengePrefs(ctx).difficulty }).find((o) => o.action === 'wring');
      if (!opt?.ok) {
        if (step.announce !== false) await shipNotice(ctx, `<r>${opt?.reason ?? 'Just a beard.'}</>`);
        if (step.outcomeValue) session.story.setValue(step.outcomeValue, 'refused');
        return null;
      }
      const b = session.ship.beard;
      const before = b.count;
      const hz = session.ship.hazards;
      hz.working = true;
      try {
        for (let i = 0; i < opt.seconds; i++) await workTick(ctx, 'Wringing out your beard', i, opt.seconds);
      } finally {
        hz.working = false;
        ctx.services?.ui?.work?.(null);
      }
      if (b.count !== before) {
        if (step.outcomeValue) session.story.setValue(step.outcomeValue, 'late');
        return null;
      }
      const r = b.on && b.phase !== 'cooldown' ? quietly(ctx, step, () => b.purge('controlled', tuningOf(ctx))) : { ok: false };
      if (step.outcomeValue) session.story.setValue(step.outcomeValue, r.ok ? 'wrung' : 'refused');
      return null;
    },
    /**
     * Beard care at a station (the washroom tub or basin): { "beardCare":
     * "rinse" } (water and seconds of work) or { "beardCare": "scrub" } (a
     * sailcloth rag on the timing bar: success, partial or failure take
     * their shares out; a failed try wastes the rag and stirs the stink up,
     * a cost "Try again" keeps). Refused away from a station, in deep water
     * or foul air.
     */
    beardCare: async (step, ctx, frame) => {
      const session = ctx.session;
      const content = session.content ?? ctx.content;
      const prefs = challengePrefs(ctx);
      const action = step.beardCare;
      const opt = beardOptions(session, { difficulty: prefs.difficulty }).find((o) => o.action === action);
      if (!opt?.ok) {
        if (step.announce !== false) await shipNotice(ctx, `<r>${opt?.reason ?? 'Just a beard.'}</>`);
        if (step.outcomeValue) session.story.setValue(step.outcomeValue, 'refused');
        return null;
      }
      const b = session.ship.beard;
      const care = beardData(content).care;
      const hz = session.ship.hazards;
      const pctNow = () => Math.floor(b.pct(tuningOf(ctx)));
      if (action === 'rinse') {
        hz.working = true;
        try {
          for (let i = 0; i < opt.seconds; i++) await workTick(ctx, 'Rinsing your beard', i, opt.seconds);
        } finally {
          hz.working = false;
          ctx.services?.ui?.work?.(null);
        }
        const r = b.on ? quietly(ctx, step, () => b.clean({ share: care.rinse.share, care: true }, tuningOf(ctx))) : { ok: false };
        if (r.ok && step.announce !== false) await shipNotice(ctx, `<g>Rinsed.</> <k>Your beard is ${pctNow()}% full.</>`);
        if (step.outcomeValue) session.story.setValue(step.outcomeValue, r.ok ? 'rinsed' : 'refused');
        return null;
      }
      const sdef = care.scrub;
      const cost = opt.cost;
      const attempts = affordableAttempts({ worst: cost, results: { failure: { waste: cost } } }, (id) => session.inventory.count(id));
      hz.working = true;
      try {
        const base = challengeConfig(content, step.challenge ?? sdef.challenge, { kind: 'repair', id: 'beard:scrub', difficulty: prefs.difficulty });
        const limit = Number.isFinite(attempts) ? attempts : null;
        const cfg = {
          ...base,
          retry: { ...base.retry, maxAttempts: base.retry.maxAttempts === null ? limit : limit === null ? base.retry.maxAttempts : Math.min(base.retry.maxAttempts, limit) },
          onFailure: { ...base.onFailure, mustRetry: false, continue: true, costs: [...base.onFailure.costs, ...cost.map((x) => ({ takeItem: x.item, count: x.count, silent: true })), { beardSetback: 'scrub' }] },
        };
        let committed = null;
        const settle = async (rec) => {
          if (rec.outcome !== 'success' && rec.outcome !== 'partial') return;
          for (let i = 0; i < opt.seconds; i++) await workTick(ctx, 'Scrubbing your beard', i, opt.seconds);
          if (!b.on) return;
          if (!takeAll(session.inventory, cost)) throw new Error('beardCare scrub: the rag is gone (the plan said there was one)');
          committed = quietly(ctx, step, () => b.clean({ share: sdef.results[rec.outcome], care: true }, tuningOf(ctx)));
          // A scrub gets the hornets out too.
          for (const s of b.statusList(tuningOf(ctx))) if (beardData(content).statuses[s.id]?.clearedBy?.scrub) quietly(ctx, step, () => b.removeStatus(s.id, tuningOf(ctx)));
        };
        const attempt = (info) => service(ctx, 'ui', 'timingBar').timingBar({ kind: sdef.kind, strikes: sdef.strikes, title: sdef.title, speed: 1, zone: 26, challenge: info });
        const { record, goto } = await playChallenge(ctx, frame, cfg, attempt, settle);
        if (committed?.ok && step.announce !== false) await shipNotice(ctx, `<g>Scrubbed${record.outcome === 'partial' ? ', roughly' : ''}.</> <k>Your beard is ${pctNow()}% full. Used ${itemList(content, cost)}.</>`);
        else if (!committed?.ok && step.announce !== false && record.outcome === 'failure') {
          const wasted = record.consequences.costs ? sumItems(...Array.from({ length: record.consequences.costs }, () => cost)) : [];
          await shipNotice(ctx, `<r>It only stirred the stink up.</>${wasted.length ? ` <k>Wasted ${itemList(content, wasted)}.</>` : ''}`);
        }
        return challengeFollowUp(ctx, frame, step, cfg, record, goto);
      } finally {
        hz.working = false;
        ctx.services?.ui?.work?.(null);
      }
    },
    /** A failed scrub, as a challenge cost (kept through a retry): the rag's little bit out, and a gag. */
    beardSetback: (step, ctx) => {
      const b = ctx.session.ship.beard;
      if (!b.on) return null;
      const share = beardData(ctx.session.content)?.care?.scrub?.results?.failure ?? 0;
      if (share > 0) quietly(ctx, step, () => b.clean({ share, care: true }, tuningOf(ctx)));
      if (b.fume > 0) b.bus?.emit('beard:gag', { cause: 'scrub' });
      return null;
    },
    /** Wears an item over the beard (one the data maps, one he carries), or takes it off: { "beardWear": item, "remove"? }. */
    beardWear: async (step, ctx) => {
      const r = ctx.session.ship.beard.wear(step.beardWear, step.remove !== true);
      if (!r.ok) {
        if (step.announce !== false) await shipNotice(ctx, `<r>${r.reason}</>`);
        if (step.outcomeValue) ctx.session.story.setValue(step.outcomeValue, 'refused');
        return null;
      }
      if (step.announce !== false) await shipNotice(ctx, step.remove ? `Took off ${r.label}.` : `Wearing ${r.label} over your beard.`);
      if (step.outcomeValue) ctx.session.story.setValue(step.outcomeValue, step.remove ? 'removed' : 'worn');
      return null;
    },
    /**
     * A named checkpoint for a sequence (docs/gameplay-overhaul/07-challenge-outcomes.md):
     * a later challenge in this script whose config names it ("onFailure":
     * { "fallback": name }) can offer to go back here, resuming at "resume".
     * Per-play only; never saved.
     */
    checkpoint: (step, ctx, frame) => {
      challengeLog(ctx.session).addCheckpoint(captureCheckpoint(ctx.session, { id: step.checkpoint, label: step.label ?? null, extra: { resume: step.resume ?? null, script: frame?.id ?? null } }));
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
      // { "atmosphere": "SHIP", "clearRooms": true } only hands the rooms back.
      if (step.clearRooms) clearRoomAtmospheres(content, ctx.session);
      if (!(step.clearRooms && step.atmosphere === 'SHIP' && !step.room)) setAtmosphere(content, ctx.session, step.atmosphere, { room: step.room ?? null });
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
