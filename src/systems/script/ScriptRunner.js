import { evaluateCondition } from '../conditions/conditions.js';
import { commandNameOf } from './commandSchemas.js';

/**
 * Executes scripts: the shared runtime for dialogue, cutscenes, inspections
 * and scripted events.
 *
 * A script is either an array of steps (one node called "start") or an
 * object of labelled nodes { "start": [...], "crew": [...] }. Steps are:
 *   - strings: dialogue lines ("hale[annoyed]: ...")
 *   - branches: { "if": cond, "then": steps|label, "else": steps|label }
 *   - commands: { "<command>": value, ...params } with an optional "if" guard
 *
 * Command implementations are async functions registered per command name.
 * They may return { goto: label } or { end: true } to redirect flow.
 */
export class CommandRegistry {
  constructor() {
    this.impls = new Map();
  }

  register(name, impl) {
    this.impls.set(name, impl);
    return this;
  }

  registerAll(map) {
    for (const [name, impl] of Object.entries(map)) this.register(name, impl);
    return this;
  }

  unregister(name) {
    this.impls.delete(name);
  }

  get(name) {
    return this.impls.get(name);
  }

  has(name) {
    return this.impls.has(name);
  }
}

const MAX_STEPS_PER_RUN = 10000;

export function normalizeScript(script) {
  if (Array.isArray(script)) return { start: script };
  if (script && typeof script === 'object') return script;
  throw new Error(`Invalid script: ${JSON.stringify(script)}`);
}

export class ScriptRunner {
  /**
   * @param {object} opts
   * @param {CommandRegistry} opts.registry
   * @param {(id:string) => any} opts.getScript
   */
  constructor({ registry, getScript }) {
    this.registry = registry;
    this.getScript = getScript;
  }

  /**
   * Runs a script to completion.
   * @param {string|Array|object} scriptRef - script id or inline script
   * @param {object} ctx - shared context: { session, bus, services, wait(ms) }
   * @returns {Promise<'completed'|'ended'|'aborted'>}
   */
  async run(scriptRef, ctx) {
    const id = typeof scriptRef === 'string' ? scriptRef : ctx.scriptId ?? '(inline)';
    const script = typeof scriptRef === 'string' ? this.getScript(scriptRef) : scriptRef;
    if (!script) throw new Error(`Unknown script "${scriptRef}"`);
    const frame = { id, nodes: normalizeScript(script), steps: 0 };
    ctx.runner = this;
    ctx.aborted = ctx.aborted ?? false;

    let label = 'start';
    while (label) {
      const steps = frame.nodes[label];
      if (!steps) throw new Error(`Script "${id}" has no node "${label}"`);
      const result = await this.execSteps(steps, ctx, frame, label);
      if (ctx.aborted) return 'aborted';
      if (result?.goto) {
        label = result.goto;
        continue;
      }
      return result?.end ? 'ended' : 'completed';
    }
    return 'completed';
  }

  async execSteps(steps, ctx, frame, label) {
    for (let i = 0; i < steps.length; i++) {
      if (ctx.aborted) return { end: true };
      if (++frame.steps > MAX_STEPS_PER_RUN) {
        throw new Error(`Script "${frame.id}" exceeded ${MAX_STEPS_PER_RUN} steps (infinite goto loop?)`);
      }
      let result;
      try {
        result = await this.execStep(steps[i], ctx, frame);
      } catch (err) {
        if (!err.scriptLocation) {
          err.scriptLocation = `${frame.id} › ${label} › step ${i}`;
          err.message = `[script ${err.scriptLocation}] ${err.message}`;
        }
        throw err;
      }
      if (result && (result.goto || result.end)) return result;
    }
    return null;
  }

  /** Runs a nested branch: either an inline list of steps or a label to jump to. */
  async execBranch(branch, ctx, frame) {
    if (branch === undefined || branch === null) return null;
    if (typeof branch === 'string') return { goto: branch };
    return this.execSteps(branch, ctx, frame, 'branch');
  }

  async execStep(step, ctx, frame) {
    if (typeof step === 'string') return this.invoke('say', { say: step }, ctx, frame);
    if (step === null || typeof step !== 'object') throw new Error(`Invalid step ${JSON.stringify(step)}`);

    const name = commandNameOf(step, ctx.schemas ?? undefined);
    if (name === 'if') {
      const ok = evaluateCondition(step.if, ctx.session);
      return this.execBranch(ok ? step.then : step.else, ctx, frame);
    }
    if ('if' in step && !evaluateCondition(step.if, ctx.session)) return null;
    return this.invoke(name, step, ctx, frame);
  }

  async invoke(name, step, ctx, frame) {
    const impl = this.registry.get(name);
    if (!impl) throw new Error(`No implementation registered for script command "${name}"`);
    return impl(step, ctx, frame);
  }
}
