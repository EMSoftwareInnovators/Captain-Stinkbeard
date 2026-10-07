import { expect } from '@playwright/test';
import { GameDriver } from './driver.js';

/**
 * Helpers shared by the Story Phase 11-13 specs: open the game, find the way
 * between the ship's rooms, stand in front of a map object and look at it,
 * work a television close-up, and walk the open objectives the way the
 * headless walks do (tests/phase1xPlay.js). Every choice takes the first
 * option (the headless 'first' walk) unless a step says otherwise.
 */

export async function open(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/');
  const g = new GameDriver(page);
  await g.waitFor(() => !!window.__GAME__?.app);
  expect(await g.eval(() => window.__GAME__.app.validation.errors)).toEqual([]);
  return { g, errors };
}

export const D = 'main_deck';
export const G = 'galley';
export const H = 'cargo_hold';
export const C = 'captains_quarters';
export const Q = 'crew_quarters';

/** First option at every choice, however many come up. */
export const FIRST = Array(60).fill(0);

export const onMap = (g) => g.eval(() => window.__GAME__.game.scene.getScene('World').model.id);
export const value = (g, name) => g.eval((n) => window.__GAME__.app.session.story.getValue(n), name);
export const variable = (g, name) => g.eval((n) => window.__GAME__.app.session.story.getVar(n), name);
export const has = async (g, flag) => new Set((await g.state()).flags).has(flag);
export const firstMissing = async (g, ids, prefix) => {
  const flags = new Set((await g.state()).flags);
  return ids.find((id) => !flags.has(`${prefix}${id}`));
};

// The way through: the hold is off the galley, the cabin off the deck; the old quarters join the galley and the deck once open.
const VIA = { [H]: G, [C]: D };

/** Walks to another room, one doorway at a time (the nearest working warp to the next room). */
export async function go(g, map) {
  for (let hop = 0; hop < 5; hop++) {
    const here = await onMap(g);
    if (here === map) return;
    const warpTo = (to) => g.eval((dest) => {
      const w = window.__GAME__.game.scene.getScene('World');
      let best = null;
      for (const o of w.model.objects) {
        if (o.type !== 'warp' || o.to?.map !== dest || w.warpAt(o.x, o.y) !== o) continue;
        const path = window.__GAME__.test.pathTo(o.x, o.y);
        if (path && (!best || path.length < best.n)) best = { at: [o.x, o.y], n: path.length };
      }
      return best?.at ?? null;
    }, to);
    let next = map;
    let at = VIA[here] && VIA[here] !== map ? null : await warpTo(map);
    if (!at) {
      next = VIA[here] ?? VIA[map] ?? (here === D ? G : D);
      at = await warpTo(next);
    }
    if (!at) throw new Error(`no way from ${here} toward ${map}`);
    await g.travel(at[0], at[1], next);
    await g.skip(...FIRST);
  }
  throw new Error(`never reached ${map}`);
}

/** Where to stand to look at a map object (by id): the nearest open tile just outside it, and which way to face. */
export async function standFor(g, id) {
  for (let tries = 0; tries < 20; tries++) {
    const at = await g.eval((oid) => {
      const w = window.__GAME__.game.scene.getScene('World');
      const o = w.model.objects.find((x) => x.id === oid);
      if (!o) return null;
      const inside = (x, y) => x >= o.x && x < o.x + (o.w || 1) && y >= o.y && y < o.y + (o.h || 1);
      const p = w.player;
      let best = null;
      for (let y = o.y; y < o.y + (o.h || 1); y++) {
        for (let x = o.x; x < o.x + (o.w || 1); x++) {
          for (const [face, dx, dy] of [['up', 0, 1], ['down', 0, -1], ['left', 1, 0], ['right', -1, 0]]) {
            const sx = x + dx;
            const sy = y + dy;
            if (inside(sx, sy) || w.warpAt(sx, sy)) continue;
            const here = p.tx === sx && p.ty === sy;
            if (!here && w.isBlocked(sx, sy, p)) continue;
            const path = here ? [] : window.__GAME__.test.pathTo(sx, sy);
            if (path && (!best || path.length < best.n)) best = { stand: [sx, sy], face, n: path.length };
          }
        }
      }
      return best;
    }, id);
    if (at) return at;
    await g.wait(300);
  }
  throw new Error(`nowhere to stand for ${id} on ${await onMap(g)}`);
}

/** Faces a map object and presses Confirm, without playing anything out. */
export async function touch(g, id) {
  const { stand, face } = await standFor(g, id);
  await g.goto(stand[0], stand[1]);
  await g.eval((dir) => window.__GAME__.game.scene.getScene('World').player.face(dir), face);
  await g.wait(60);
  await g.tap('KeyZ', 50, 250);
}

/** Looks at a map object and plays out what it starts (first option at every choice unless picks are given). */
export async function inspect(g, id, ...picks) {
  await touch(g, id);
  await g.skip(...(picks.length ? picks : FIRST));
}

export async function talk(g, who, ...picks) {
  await g.interact(who, ...(picks.length ? picks : FIRST));
}

/** Plays lines until the television close-up is up (skip would step away from it). */
export async function untilTv(g) {
  for (let i = 0; i < 300; i++) {
    const st = await g.uiState();
    if (st === 'tv') return;
    if (st === 'line' || st === 'tutorial' || st === 'insert') await g.tap('KeyZ', 45, 60);
    if (st === 'choice') await g.tap('KeyZ', 45, 120);
    await g.wait(100);
  }
  throw new Error('the television never opened');
}

/** Looks at a set, works its knobs in this order, and plays out the rest once the close-up shuts itself. */
export async function knobs(g, id, list) {
  await touch(g, id);
  await untilTv(g);
  await g.tv(...list.map((k) => `knob:${k}`));
  await g.waitFor(() => !window.__GAME__.app.overlay.tvOpen, null, 20000);
  await g.skip(...FIRST);
}

/**
 * Walks open objectives until `done` holds: each turn, the first step whose
 * objective is open. A step that keeps coming back means the player is stuck.
 */
export async function walk(g, steps, done, label) {
  let last = null;
  let repeats = 0;
  for (let n = 0; n < 400 && !(await done(g)); n++) {
    const ref = await g.eval((list) => list.find((r) => {
      const [q, o] = r.split('.');
      return window.__GAME__.app.session.quests.isObjectiveAvailable(q, o);
    }), steps.map(([r]) => r));
    if (!ref) throw new Error(`stuck on ${await onMap(g)}: no open ${label} objective the player can act on`);
    repeats = ref === last ? repeats + 1 : 0;
    last = ref;
    if (repeats >= 12) {
      const st = await g.state();
      throw new Error(`${ref} never gets done (on ${st.map} at ${st.x},${st.y}, facing ${st.facing})`);
    }
    await steps.find(([r]) => r === ref)[1](g);
  }
}

/** Every preset of a phase loads and its scene plays out without an error. */
export async function everyPreset(g, errors, prefix, count) {
  const ids = await g.eval((p) => window.__GAME__.app.content.debugPresets.list().map((x) => x.id).filter((id) => id.startsWith(p)), prefix);
  expect(ids.length).toBe(count);
  for (const id of ids) {
    await g.preset(id);
    await g.skip(...FIRST);
    expect(errors, id).toEqual([]);
  }
}
