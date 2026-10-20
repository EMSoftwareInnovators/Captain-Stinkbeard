import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { test } from '@playwright/test';
import { GameDriver } from '../e2e/driver.js';
import { formatReport } from './report.js';

/**
 * Performance baseline of the heaviest scenes (docs/gameplay-overhaul/06-regression-harness.md,
 * "Performance"). For each scene: how long the room takes to build, frame
 * times standing still and walking, what the scene holds (display objects,
 * actors, props, interactive objects), and the JavaScript heap.
 *
 * The scenes are the rooms the regression snapshots measure as the most
 * crowded (people and story props per room, tests/regression/baselines/).
 * Measurements are diagnostic only: they are compared with DIAGNOSTIC and
 * reported, never failed, because the browser here renders in software
 * (SwiftShader) and frame times depend on the machine.
 *
 * Results: tmp/perf/perf-results.json and tmp/perf/perf.md.
 */
const SCENES = [
  { preset: 'p6_complete', rooms: ['main_deck'], why: 'most crew on deck (16) with 59 story props' },
  { preset: 'p8_complete', rooms: ['cargo_hold'], why: 'the shelter: 18 people in the hold' },
  { preset: 'p10_complete', rooms: ['main_deck'], why: 'inside the Great Sharkstorm (storm sky, shark layer)' },
  { preset: 'p13_complete', rooms: ['main_deck', 'cargo_hold'], why: 'most story props on deck (75); 11 crew in the hold' },
  { preset: 'p17_complete', rooms: ['crew_quarters', 'main_deck', 'cargo_hold', 'galley'], why: 'the end of the game: every room at its fullest' },
];

/** Diagnostic limits: a measurement past one is flagged in the report, nothing fails. */
const DIAGNOSTIC = {
  frameP95Ms: 25, // two 60 Hz frames would be 33.3
  workP95Ms: 12, // time spent in the game's own update and render, per frame
  longFrameShare: 0.05, // frames over 33.3 ms
  buildMs: 400, // building a room (World scene create)
  heapMB: 400,
};

const RUNS = Math.max(1, Number(process.env.PERF_RUNS) || 1);
/** PERF_ONLY=p17_complete,p8_complete measures only those presets' scenes. */
const ONLY = process.env.PERF_ONLY ? process.env.PERF_ONLY.split(',').map((x) => x.trim()) : null;
const IDLE_MS = Number(process.env.PERF_IDLE_MS) || 4000;
const WALK_MS = Number(process.env.PERF_WALK_MS) || 4000;
const OUT_DIR = path.resolve('tmp/perf');

function stats(values) {
  const s = [...values].sort((a, b) => a - b);
  if (!s.length) return null;
  const q = (p) => s[Math.min(s.length - 1, Math.round(p * (s.length - 1)))];
  const round = (x) => Math.round(x * 100) / 100;
  return {
    n: s.length,
    avg: round(s.reduce((a, b) => a + b, 0) / s.length),
    p50: round(q(0.5)),
    p95: round(q(0.95)),
    p99: round(q(0.99)),
    max: round(s[s.length - 1]),
    over33: s.filter((x) => x > 1000 / 30).length,
    over50: s.filter((x) => x > 50).length,
  };
}

/** Installs the in-page samplers: requestAnimationFrame intervals, and time spent inside Phaser's step (update + render). */
async function installSamplers(driver) {
  await driver.eval(() => {
    if (window.__PERF__) return;
    const loop = window.__GAME__.game.loop;
    const inner = loop.callback;
    const perf = {
      on: false,
      frames: [],
      work: [],
      start() {
        this.frames = [];
        this.work = [];
        this.on = true;
        let last = null;
        const tick = (t) => {
          if (!this.on) return;
          if (last !== null) this.frames.push(t - last);
          last = t;
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      stop() {
        this.on = false;
        return { frames: this.frames, work: this.work };
      },
    };
    loop.callback = (time, delta) => {
      const t0 = performance.now();
      inner(time, delta);
      if (perf.on) perf.work.push(performance.now() - t0);
    };
    window.__PERF__ = perf;
  });
}

/** What the current scene holds. Interactive objects are the ones the captain could use now (live conditions checked). */
function sceneCounts(driver) {
  return driver.eval(async () => {
    const { evaluateCondition } = await import('/src/systems/conditions/conditions.js');
    const g = window.__GAME__;
    const w = g.game.scene.getScene('World');
    const s = g.app.session;
    const live = (o) => !o.if || evaluateCondition(o.if, s);
    const objects = w.objects ?? [];
    const byType = {};
    for (const o of objects) if (live(o)) byType[o.type] = (byType[o.type] ?? 0) + 1;
    const countDeep = (list) => list.reduce((n, c) => n + 1 + (c.list ? countDeep(c.list) : 0), 0);
    const active = g.game.scene.getScenes(true);
    return {
      map: w.model.id,
      tiles: `${w.model.width}x${w.model.height}`,
      displayObjects: countDeep(w.children.list),
      displayObjectsVisible: w.children.list.filter((c) => c.visible !== false).length,
      displayObjectsAllScenes: active.reduce((n, sc) => n + countDeep(sc.children.list), 0),
      actors: w.actors.size,
      npcs: [...w.actors.values()].filter((a) => a.npc).length,
      enemies: w.enemies.length,
      props: w.props.length,
      propsShown: w.props.filter((r) => r.visible !== false && r.sprite?.visible !== false).length,
      interactive: (byType.inspect ?? 0) + (byType.chest ?? 0) + [...w.actors.values()].filter((a) => a.npc && a.sprite?.visible !== false).length,
      liveObjectsByType: byType,
      fumeZones: w.fumeField?.zones?.length ?? null,
      tweens: w.tweens.tweens?.length ?? null,
      timers: w.time.getAllEvents?.().length ?? null,
      busy: w.isBusy(),
    };
  });
}

async function heap(page, cdp) {
  try {
    await cdp.send('HeapProfiler.collectGarbage');
    const { metrics } = await cdp.send('Performance.getMetrics');
    const m = Object.fromEntries(metrics.map((x) => [x.name, x.value]));
    return { source: 'cdp', usedMB: Math.round((m.JSHeapUsedSize / 1048576) * 10) / 10, totalMB: Math.round((m.JSHeapTotalSize / 1048576) * 10) / 10, domNodes: m.Nodes };
  } catch {
    const mem = await page.evaluate(() => performance.memory && { used: performance.memory.usedJSHeapSize, total: performance.memory.totalJSHeapSize });
    return mem ? { source: 'performance.memory', usedMB: Math.round((mem.used / 1048576) * 10) / 10, totalMB: Math.round((mem.total / 1048576) * 10) / 10 } : null;
  }
}

/**
 * Rebuilds the World scene on `map` (no fade, no autosave) and times it:
 * buildMs is the scene's create() alone; totalMs runs from the restart
 * request to the second frame drawn after it (the queued restart, the old
 * room's shutdown, create and the first renders).
 */
function loadRoom(driver, map) {
  return driver.eval(async (m) => {
    const w = window.__GAME__.game.scene.getScene('World');
    const create = w.create;
    let buildMs = null;
    w.create = function timedCreate(...args) {
      w.create = create;
      const s = performance.now();
      const r = create.apply(this, args);
      buildMs = performance.now() - s;
      return r;
    };
    const t0 = performance.now();
    const created = new Promise((resolve) => w.sys.events.once('create', resolve));
    w.scene.restart({ map: m, noAutosave: true });
    await created;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const round = (x) => Math.round(x * 10) / 10;
    return { buildMs: round(buildMs), totalMs: round(performance.now() - t0) };
  }, map);
}

async function waitIdle(driver, ms) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    if ((await driver.uiState()) === 'idle') return true;
    await driver.wait(150);
  }
  return false;
}

/**
 * In-page: the free tiles (no wall, person, door or live step-on trigger) and,
 * from the captain, the shortest path to the nearest tile with a clear
 * straight run of at least `minRun` tiles. Returns { path: [dirs], dir, run,
 * runs: { dir: length } } or null.
 */
function findPatrolSpot(driver, minRun) {
  return driver.eval(async (need) => {
    const { evaluateCondition } = await import('/src/systems/conditions/conditions.js');
    const w = window.__GAME__.game.scene.getScene('World');
    const p = w.player;
    // Only triggers whose condition holds now: rooms keep spent story triggers across their doorways.
    const triggers = (w.objects ?? []).filter((o) => o.type === 'trigger' && (!o.if || evaluateCondition(o.if, window.__GAME__.app.session)));
    const triggerAt = (x, y) => triggers.some((o) => x >= o.x && x < o.x + (o.w ?? 1) && y >= o.y && y < o.y + (o.h ?? 1));
    const free = (x, y) => !w.isBlocked(x, y, p) && !w.warpAt(x, y) && !triggerAt(x, y);
    const dirs = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
    const runFrom = (x, y) => {
      let best = null;
      const runs = {};
      for (const [d, v] of Object.entries(dirs)) {
        let n = 0;
        for (let i = 1; i <= 5 && free(x + v[0] * i, y + v[1] * i); i++) n = i;
        runs[d] = n;
        if (n >= need && (!best || n > best.run)) best = { dir: d, run: n };
      }
      return best && { ...best, runs };
    };
    const start = { x: p.tx, y: p.ty, path: [] };
    const seen = new Set([`${start.x},${start.y}`]);
    const queue = [start];
    for (let head = 0; head < queue.length && head < 2000; head++) {
      const cur = queue[head];
      const run = runFrom(cur.x, cur.y);
      if (run) return { path: cur.path, ...run };
      for (const [d, v] of Object.entries(dirs)) {
        const nx = cur.x + v[0];
        const ny = cur.y + v[1];
        if (seen.has(`${nx},${ny}`) || !free(nx, ny)) continue;
        seen.add(`${nx},${ny}`);
        queue.push({ x: nx, y: ny, path: [...cur.path, d] });
      }
    }
    return null;
  }, minRun);
}

const KEYS = { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown' };

/** One tile, the way the E2E driver steps: press until the move starts, release, wait for it to end. */
async function stepOnce(driver, dir) {
  await driver.page.keyboard.down(KEYS[dir]);
  await driver.waitFor(() => window.__GAME__.game.scene.getScene('World').player.moving, null, 2000).catch(() => {});
  await driver.page.keyboard.up(KEYS[dir]);
  await driver.waitFor(() => !window.__GAME__.game.scene.getScene('World').player.moving, null, 2000).catch(() => {});
}

/**
 * Walks to the nearest spot with a clear run of three tiles (one step at a
 * time, before the samplers start), so every room gets a walking sample.
 */
async function goToPatrolSpot(driver) {
  const spot = await findPatrolSpot(driver, 3);
  if (!spot) return null;
  for (const d of spot.path) await stepOnce(driver, d);
  return { steps: spot.path.length };
}

/**
 * Walks while the samplers run: back and forth along the longest clear run
 * (one tile short of it, so a late key release can't step onto anything),
 * re-planned every leg because people move. When the run is blocked it
 * steps toward the nearest clear run instead; crowded rooms fall back to
 * runs of two tiles. Returns how many tiles it walked.
 */
async function patrol(driver, ms) {
  const opposite = { left: 'right', right: 'left', up: 'down', down: 'up' };
  let tiles = 0;
  let last = null;
  const until = Date.now() + ms;
  while (Date.now() < until) {
    const spot = (await findPatrolSpot(driver, 3)) ?? (await findPatrolSpot(driver, 2));
    if (!spot) {
      await driver.wait(250);
      continue;
    }
    if (spot.path.length) {
      await stepOnce(driver, spot.path[0]);
      tiles += 1;
      continue;
    }
    // Turn back the way he came when he can, so the captain stays near his spot.
    const back = last && spot.runs[opposite[last]] >= 2 ? opposite[last] : null;
    const dir = back ?? spot.dir;
    const run = Math.max(1, spot.runs[dir] - 1);
    await driver.page.keyboard.down(KEYS[dir]);
    await driver.wait(run * 140 + 40);
    await driver.page.keyboard.up(KEYS[dir]);
    await driver.waitFor(() => !window.__GAME__.game.scene.getScene('World').player.moving, null, 2000).catch(() => {});
    tiles += run;
    last = dir;
  }
  return tiles;
}

async function measureRoom(driver, page, cdp, scene, room, run) {
  const record = { preset: scene.preset, room, run };
  record.load = await loadRoom(driver, room);
  record.loadAgain = await loadRoom(driver, room);
  record.settled = await waitIdle(driver, 3000);
  if (!record.settled) {
    // The room's on-enter scene (or one the preset left waiting): play it out, as a player would.
    record.onEnter = await driver.uiState();
    await driver.skip().catch(() => {});
    record.settled = await waitIdle(driver, 8000);
  }
  record.measuredRoom = (await driver.state()).map;
  await driver.wait(800);
  if (record.settled) record.patrolSpot = await goToPatrolSpot(driver);
  record.counts = await sceneCounts(driver);
  record.heap = await heap(page, cdp);
  await driver.eval(() => window.__PERF__.start());
  await driver.wait(IDLE_MS);
  const idle = await driver.eval(() => window.__PERF__.stop());
  await driver.eval(() => window.__PERF__.start());
  // Arrow keys during a running scene would work its menus instead: stand still then.
  record.walkTiles = record.settled ? await patrol(driver, WALK_MS) : (await driver.wait(WALK_MS), 0);
  const walk = await driver.eval(() => window.__PERF__.stop());
  record.stillInRoom = (await driver.state()).map === room;
  record.sceneDuringWalk = record.walkTiles > 0 && (await driver.uiState()) !== 'idle';
  record.idle = { frameMs: stats(idle.frames), workMs: stats(idle.work) };
  record.walk = { frameMs: stats(walk.frames), workMs: stats(walk.work) };
  record.flags = diagnostics(record);
  return record;
}

function diagnostics(r) {
  const out = [];
  for (const [mode, s] of [['idle', r.idle], ['walk', r.walk]]) {
    if (!s.frameMs) continue;
    if (s.frameMs.p95 > DIAGNOSTIC.frameP95Ms) out.push(`${mode} frame p95 ${s.frameMs.p95} ms > ${DIAGNOSTIC.frameP95Ms}`);
    if (s.workMs && s.workMs.p95 > DIAGNOSTIC.workP95Ms) out.push(`${mode} work p95 ${s.workMs.p95} ms > ${DIAGNOSTIC.workP95Ms}`);
    if (s.frameMs.over33 / s.frameMs.n > DIAGNOSTIC.longFrameShare) out.push(`${mode} long frames ${s.frameMs.over33}/${s.frameMs.n}`);
  }
  if (r.load.buildMs > DIAGNOSTIC.buildMs) out.push(`room build ${r.load.buildMs} ms > ${DIAGNOSTIC.buildMs}`);
  if (r.heap?.usedMB > DIAGNOSTIC.heapMB) out.push(`heap ${r.heap.usedMB} MB > ${DIAGNOSTIC.heapMB}`);
  if (!r.settled) out.push('the room never went idle (a scene was running while measuring)');
  if (!r.walkTiles) out.push('no walking sample: the captain stood still (no clear run reachable)');
  if (r.measuredRoom !== r.room) out.push(`the on-enter scene moved the captain to ${r.measuredRoom}: these numbers are that room`);
  if (!r.stillInRoom) out.push('the walk left the room: walking numbers are not this room');
  if (r.sceneDuringWalk) out.push('a scene started during the walk');
  return out;
}

test.describe('performance @perf', () => {
  test('heaviest scenes: room build, frame times, entities, memory', async ({ page, browser }) => {
    const driver = new GameDriver(page);
    const t0 = Date.now();
    await page.goto('/');
    await driver.waitFor(() => window.__GAME__?.game.scene.isActive('Title'), null, 180000);
    const bootMs = Date.now() - t0;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');
    const records = [];
    for (let run = 1; run <= RUNS; run++) {
      for (const scene of SCENES.filter((sc) => !ONLY || ONLY.includes(sc.preset))) {
        await driver.preset(scene.preset);
        await installSamplers(driver);
        for (const room of scene.rooms) {
          const r = await measureRoom(driver, page, cdp, scene, room, run);
          records.push(r);
          console.log(`${scene.preset} ${room}: build ${r.load.buildMs} ms (total ${r.load.totalMs})${r.onEnter ? `, played out an on-enter scene (${r.onEnter})` : ''}, still p95 ${r.idle.frameMs.p95} ms (work ${r.idle.workMs?.p95}), walk p95 ${r.walk.frameMs.p95} ms, ${r.counts.displayObjects} display objects, ${r.counts.actors} actors, heap ${r.heap?.usedMB} MB${r.flags.length ? ` [${r.flags.join('; ')}]` : ''}`);
        }
      }
    }
    let commit = null;
    try {
      commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    } catch {
      commit = null;
    }
    const meta = {
      date: new Date().toISOString(),
      commit,
      browser: `Chromium ${browser.version()}`,
      renderer: 'ANGLE SwiftShader (software)',
      cpus: os.cpus().length,
      runs: RUNS,
      idleMs: IDLE_MS,
      walkMs: WALK_MS,
      bootMs,
      diagnostic: DIAGNOSTIC,
      scenes: SCENES,
    };
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, 'perf-results.json'), `${JSON.stringify({ meta, records }, null, 2)}\n`);
    fs.writeFileSync(path.join(OUT_DIR, 'perf.md'), formatReport(meta, records));
    console.log(`\nWrote ${path.join(OUT_DIR, 'perf.md')} and perf-results.json`);
  });
});
