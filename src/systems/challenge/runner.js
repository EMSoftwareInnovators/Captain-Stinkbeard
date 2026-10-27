import { deepClone } from '../../core/util.js';
import { createRecord, evaluateOutcome, gradeFor, pushHistory } from './outcome.js';
import { captureCheckpoint, restoreCheckpoint, diffStates } from './checkpoint.js';
import { supportedOutcomes } from './kinds.js';
import { attemptSeed } from './rng.js';
import { configRules } from './config.js';
import { resolveAssists, normalizePrefs, DEFAULT_PREFS } from './difficulty.js';

/**
 * Running a challenge that opted in (docs/gameplay-overhaul/07-challenge-outcomes.md):
 * checkpoint, attempt, judge, and after a failure retry, carry on with
 * consequences, or go back to an earlier checkpoint, as the config allows.
 * Engine-agnostic: the mechanic, the decision prompt and the consequence
 * steps come in as hooks, so the game and the headless story harness run
 * the same code.
 *
 * Everything here is per-play state (session.transient), never saved: a
 * save holds the story as it is, never a half-finished attempt.
 */

/** The session's challenge bookkeeping: what's running, recent records, named checkpoints. */
export class ChallengeLog {
  constructor({ records = 24, checkpoints = 4 } = {}) {
    this.limit = { records, checkpoints };
    this.active = new Map();
    this.records = [];
    this.checkpoints = new Map();
  }

  begin(run) {
    if (this.active.has(run.id)) throw new Error(`Challenge "${run.id}" is already running`);
    this.active.set(run.id, run);
  }

  end(run) {
    if (this.active.get(run.id) === run) this.active.delete(run.id);
    this.records.push(deepClone(run.record));
    if (this.records.length > this.limit.records) this.records.splice(0, this.records.length - this.limit.records);
  }

  /** The latest record for a challenge id (or the latest of all). */
  last(id = null) {
    for (let i = this.records.length - 1; i >= 0; i--) if (!id || this.records[i].id === id) return this.records[i];
    return null;
  }

  /** A named sequence checkpoint ("checkpoint" script command); the oldest go first. */
  addCheckpoint(cp) {
    this.checkpoints.delete(cp.id);
    this.checkpoints.set(cp.id, cp);
    while (this.checkpoints.size > this.limit.checkpoints) this.checkpoints.delete(this.checkpoints.keys().next().value);
  }

  checkpoint(id) {
    return this.checkpoints.get(id) ?? null;
  }
}

export function challengeLog(session) {
  session.transient ??= {};
  session.transient.challengeLog ??= new ChallengeLog();
  return session.transient.challengeLog;
}

/** A script id's chapter ("p12c3.trial" -> "p12c3"). */
export function chapterOf(scriptId) {
  return typeof scriptId === 'string' && scriptId !== '(inline)' ? scriptId.split('.')[0] : null;
}

/** The labels the decision prompt shows. */
export const DECISION_LABELS = Object.freeze({ retry: 'Try again', continue: 'Carry on', fallback: 'Go back' });

/**
 * One challenge, from its checkpoint to its final outcome. Use runChallenge
 * for anything that is one prompt (the timing bar, the sash tension); a
 * long-running challenge (Shark Duty) drives the steps itself.
 */
export class ChallengeRun {
  /**
   * @param {object} o
   * @param {object} o.session
   * @param {object} o.config  from challengeConfig (never null: legacy steps don't make runs)
   * @param {object|() => object} [o.prefs]  the player's difficulty and assists (Settings.challengePrefs)
   *
   * The difficulty is the config's, resolved once when the challenge starts:
   * its rules hold for every attempt and retry, so changing the difficulty
   * mid-challenge can't change a pending retry, its costs or its limits (the
   * change applies from the next challenge). Assists are read at the start of
   * each attempt (an assist turned on between attempts helps the next one),
   * and each attempt's history line says which helped.
   */
  constructor({ session, config, chapter = null, event = null, script = null, prefs = null, content = null }) {
    if (!config) throw new Error('ChallengeRun needs a config (legacy challenges never make one)');
    this.session = session;
    this.content = content ?? session?.content ?? null;
    this.config = config;
    this.id = config.id;
    this.kind = config.kind;
    this.prefs = typeof prefs === 'function' ? prefs : () => prefs ?? DEFAULT_PREFS;
    this.record = createRecord({ id: config.id, kind: config.kind, chapter, event, script, enabled: true, failureEnabled: config.failure, legacy: false, maxAttempts: config.retry.maxAttempts ?? null });
    this.record.intent = config.intent;
    this.record.difficulty = config.difficulty ?? null;
    this.record.rules = configRules(config);
    this.assist = null;
    this.checkpoint = null;
    this.charged = 0;
    // Prompt 11: how many times "Try again" was chosen (its consequences are kept through every later retry).
    this.retries = 0;
    this.start = null;
  }

  get strict() {
    return this.config.failure;
  }

  begin() {
    challengeLog(this.session).begin(this);
    this.start = this.session.serialize();
    if (this.config.checkpoint !== false) {
      this.checkpoint = captureCheckpoint(this.session, { id: this.id, domains: this.config.checkpoint.domains, extra: { kind: this.kind } });
      this.record.checkpoint = this.checkpoint.id;
    }
    this.nextAttempt();
    return this;
  }

  nextAttempt() {
    const r = this.record;
    r.attempt += 1;
    r.state = 'running';
    r.outcome = null;
    r.reason = null;
    r.options = [];
    r.retryAvailable = false;
    r.decision = null;
    r.retried = r.attempt > 1;
    this.seed = attemptSeed(this.id, r.attempt);
    // The player's assists, as they are now (layer 5: on top of the resolved rules).
    this.assist = resolveAssists(this.content, this.kind, normalizePrefs(this.prefs()), { strict: this.strict, allowClassic: this.config.assists?.classic !== false, ownAssist: !!this.config.mechanics?.assist });
    r.assists = [...this.assist.applied];
  }

  /** What the mechanic needs for this attempt: the rules, the seed, and the assists that help it. */
  attemptInfo() {
    return { id: this.id, attempt: this.record.attempt, seed: this.seed, strict: this.strict, mechanics: this.config.mechanics, intent: this.config.intent, difficulty: this.config.difficulty ?? null, assist: this.assist };
  }

  /**
   * Judges an attempt from the mechanic's metrics. A failure (only when
   * failure is enabled) leaves the run "awaiting" a decision; anything else
   * resolves it.
   */
  finish(metrics) {
    const r = this.record;
    const cfg = this.config;
    const supported = supportedOutcomes(this.kind, { strict: true }).filter((o) => cfg.failure || o !== 'failure');
    const { outcome, matched } = evaluateOutcome(cfg.outcomes, metrics, supported);
    r.outcome = outcome;
    r.metrics = { ...metrics };
    r.score = cfg.score && Number.isFinite(metrics[cfg.score]) ? metrics[cfg.score] : null;
    r.grade = gradeFor(r.score, cfg.grades);
    r.reason = outcome === 'failure' ? metrics.reason ?? (matched ? `the ${matched} rule held` : 'failed') : null;
    if (metrics.ceremony !== undefined) r.narrative = { ceremony: metrics.ceremony, early: !!metrics.early };
    r.cause = metrics.cause ?? null;
    pushHistory(r, { attempt: r.attempt, outcome, reason: r.reason, score: r.score, difficulty: r.difficulty, assists: [...r.assists] });
    if (outcome === 'failure') {
      r.state = 'awaiting';
      r.options = this.options();
      r.retryAvailable = r.options.some((o) => o.id === 'retry');
    } else {
      r.state = 'resolved';
    }
    return r;
  }

  /** What the player may do after this failure. There is always at least one way forward. */
  options() {
    const cfg = this.config;
    const f = cfg.onFailure;
    const opts = [];
    const left = cfg.retry.maxAttempts === null || cfg.retry.maxAttempts === undefined || this.record.attempt < cfg.retry.maxAttempts;
    if (cfg.retry.policy !== 'none' && left) opts.push({ id: 'retry', label: DECISION_LABELS.retry });
    if (f.fallback) {
      const cp = challengeLog(this.session).checkpoint(f.fallback);
      // Only a checkpoint that can really be gone back to: this map, and a place in this script to resume.
      if (cp && cp.map === this.session.location.map && cp.extra?.resume && cp.extra?.script === this.record.event) opts.push({ id: 'fallback', label: `${DECISION_LABELS.fallback}: ${cp.label ?? cp.id}` });
    }
    if (!f.mustRetry && (f.continue || !opts.length)) opts.push({ id: 'continue', label: DECISION_LABELS.continue, ...(f.continue ? {} : { forced: true }) });
    return opts;
  }

  /**
   * A decision that needs no prompt (retry policy "auto", or "prompt": false),
   * or null to ask. With one way forward the prompt still comes: it is how
   * the player learns the attempt failed.
   */
  autoDecision() {
    const ids = this.record.options.map((o) => o.id);
    if (this.config.retry.policy === 'auto' || this.config.onFailure.prompt === false) return ids.includes('retry') ? 'retry' : ids[0];
    return null;
  }

  /** The failure's sticky costs: paid now, and again after every restore (a retry is not a free undo). */
  async chargeCosts(hooks) {
    if (!this.config.onFailure.costs.length) return;
    // Each charge is its own event scope: a cost's damage event lands once per charge, replays included (Prompt 6).
    await hooks.runSteps?.(this.config.onFailure.costs, { scope: `cost:${this.charged + 1}` });
    this.charged += 1;
    this.record.consequences.costs = this.charged;
  }

  async replayCosts(hooks) {
    for (let i = 0; i < this.charged; i++) await hooks.runSteps?.(this.config.onFailure.costs, { scope: `cost:${i + 1}` });
    // Prompt 11: each earlier "Try again"'s consequences are kept like a cost (charged again after the restore, each once).
    const kept = this.config.onRetry?.consequences ?? [];
    if (kept.length) for (let i = 0; i < this.retries; i++) await hooks.runSteps?.(kept, { scope: `retry:${i + 1}` });
  }

  /** Prompt 11: a restore undid what the ledger was given so far (the record says so; the sticky ones are charged again after it). */
  undoLedger() {
    for (const x of this.record.consequences.ledger ?? []) x.undone = true;
  }

  /**
   * Prompt 11: the failed attempt's own consequences (an outcome table's
   * "failure"), in that attempt's scope: Try again restores the checkpoint
   * and so undoes them; carrying on keeps them.
   */
  async failAttempt(hooks) {
    const steps = this.config.onFailedAttempt?.consequences ?? [];
    if (!steps.length) return;
    await hooks.runSteps?.(steps, { scope: `failed:${this.record.attempt}` });
    this.record.consequences.applied.push(`onFailedAttempt:${this.record.attempt}`);
  }

  /** Back to the checkpoint (as configured), costs re-applied, and a fresh attempt. */
  async retry(hooks = {}) {
    this.record.decision = 'retry';
    if (this.config.retry.restore && this.checkpoint) {
      restoreCheckpoint(this.session, this.checkpoint, { keep: this.config.keep });
      this.undoLedger();
      await this.replayCosts(hooks);
      await hooks.onRestored?.(this.checkpoint);
    }
    // Prompt 11: what choosing to try again costs (an outcome table's "retry"), kept through every later retry.
    const steps = this.config.onRetry?.consequences ?? [];
    this.retries += 1;
    if (steps.length) {
      await hooks.runSteps?.(steps, { scope: `retry:${this.retries}` });
      this.record.consequences.applied.push(`onRetry:${this.retries}`);
    }
    this.nextAttempt();
  }

  /** Back to an earlier sequence checkpoint; returns the label to resume at. */
  async fallback(hooks = {}) {
    const cp = challengeLog(this.session).checkpoint(this.config.onFailure.fallback);
    this.record.decision = 'fallback';
    restoreCheckpoint(this.session, cp, { keep: this.config.keep });
    this.undoLedger();
    await this.replayCosts(hooks);
    await hooks.onRestored?.(cp);
    // Prompt 11: going back is a choice too (an outcome table's "fallback"), once.
    const steps = this.config.onFallback?.consequences ?? [];
    if (steps.length) {
      await hooks.runSteps?.(steps, { scope: 'onFallback' });
      this.record.consequences.applied.push('onFallback');
    }
    this.record.state = 'resolved';
    return cp.extra.resume;
  }

  /** Carry on after a failure: the consequences run and the story goes on. */
  async accept(hooks = {}) {
    this.record.decision = 'continue';
    this.record.accepted = true;
    const steps = this.config.onFailure.consequences;
    if (steps.length) {
      await hooks.runSteps?.(steps, { scope: 'onFailure' });
      this.record.consequences.onFailure = steps.length;
      this.record.consequences.applied.push('onFailure');
    }
    this.record.state = 'resolved';
  }

  /** A partial outcome's consequences (it isn't a failure, but it isn't free). */
  async settlePartial(hooks = {}) {
    const steps = this.config.onPartial.consequences;
    if (!steps.length) return;
    await hooks.runSteps?.(steps, { scope: 'onPartial' });
    this.record.consequences.applied.push('onPartial');
  }

  /** Prompt 11: a success's consequences (an advantage earned), once, before the run closes. */
  async settleSuccess(hooks = {}) {
    const steps = this.config.onSuccess?.consequences ?? [];
    if (!steps.length) return;
    await hooks.runSteps?.(steps, { scope: 'onSuccess' });
    this.record.consequences.applied.push('onSuccess');
  }

  /** Given up without an outcome (a watch left behind for good): no outcome is invented. */
  abandon() {
    this.record.decision = 'abandoned';
    this.close();
  }

  /** Done: what the challenge changed in the story, the checkpoint let go, the record logged. */
  close() {
    this.record.transitions = diffStates(this.start, this.session.serialize());
    this.record.state = 'resolved';
    this.checkpoint = null;
    challengeLog(this.session).end(this);
    this.session.bus?.emit('challenge:resolved', { record: this.record });
  }
}

/** Attempts a run can take before something is clearly wrong (a bot that never wins, a broken hook). */
export const ATTEMPT_GUARD = 500;

/**
 * Runs a one-prompt challenge to its end.
 * @param {ChallengeRun} run
 * @param {object} hooks
 * @param {(info) => Promise<object>} hooks.attempt   plays one attempt, returns the mechanic's metrics
 * @param {(record, options) => Promise<string>} hooks.decide   asks the player (an option id)
 * @param {(steps, meta) => Promise<void>} [hooks.runSteps]  runs consequence / cost steps; `meta.scope` names the
 *   charge or list (cost:1, cost:2, onFailure, onPartial; Prompt 11: onSuccess, failed:N, retry:N, onFallback), so a
 *   damage event or a consequence in them lands once per charge
 * @param {(checkpoint) => Promise<void>} [hooks.onRestored]  puts the world back (the captain's tile, input)
 * @param {(record) => Promise<void>} [hooks.settle]  commits what the final outcome earns (a ship repair takes its
 *   materials and restores the section), after the outcome and its consequences and before the run closes, so the
 *   record's transitions include it
 * @returns {Promise<{ record: object, goto: string|null }>}
 */
export async function runChallenge(run, hooks) {
  run.begin();
  let goto = null;
  try {
    for (let guard = 0; ; guard++) {
      if (guard >= ATTEMPT_GUARD) throw new Error(`Challenge "${run.id}" didn't resolve in ${ATTEMPT_GUARD} attempts`);
      const metrics = await hooks.attempt(run.attemptInfo());
      const rec = run.finish(metrics);
      if (rec.state === 'resolved') {
        if (rec.outcome === 'partial') await run.settlePartial(hooks);
        else if (rec.outcome === 'success') await run.settleSuccess(hooks);
        break;
      }
      await run.chargeCosts(hooks);
      await run.failAttempt(hooks);
      const wanted = run.autoDecision() ?? (await hooks.decide(rec, rec.options));
      // Only an option that was offered can be taken (a stale or doubled input can't pick another).
      const choice = rec.options.some((o) => o.id === wanted) ? wanted : rec.options[0].id;
      if (choice === 'retry') {
        await run.retry(hooks);
        continue;
      }
      if (choice === 'fallback') {
        goto = await run.fallback(hooks);
        break;
      }
      await run.accept(hooks);
      break;
    }
    await hooks.settle?.(run.record);
  } finally {
    run.close();
  }
  return { record: run.record, goto };
}
