import { isPlainObject, asArray } from '../../core/util.js';
import { SHIP_TUNING_DEFAULTS, SHIP_TUNING } from './integrity.js';
import { airRoom, airData } from './air.js';
import { beardData, contaminantIds, contaminant, contaminantFromAir, beardStatusIds, beardStatus, stageForPct, stageIndex, BEARD_PHASES } from './beard.js';

/**
 * The captain's Stink Beard, as a filter and a store (docs/gameplay-overhaul/13-beard-saturation.md):
 * what it holds of each contaminant, where that puts it (clean to
 * overloaded), the conditions that come of it, what he wears over it, and
 * where it is in the purge cycle. Part of the ship's state (`ship.beard`):
 * saved and checkpointed with it, moved by the same clock (`ship.tick()`
 * ticks it last, after the air it breathes). Engine-agnostic and
 * deterministic.
 *
 * Opt-in: nothing happens until a script switches it on (beardSaturation),
 * and no chapter does. Not the Story Phase 16 contamination tags (story
 * flags "beard_*", systems/beard.js) or the Phase 17 cosmetic puffs: those
 * are the story's and are never read here, so an old save's tags never
 * turn into contamination.
 *
 * The chain, each second the captain breathes (AirState.breathe):
 *   room air -> the beard catches a share of each gas it can take (that
 *   gas leaves the room, counted as "absorbed") -> the rest reaches his
 *   lungs, through the wet cloth, Frog Grog and the fume hazard option as
 *   before. A fuller beard catches less (the stage's "absorb"); a full one
 *   catches nothing. At heavy and worse it gives off what it holds into his
 *   lungs ("offgas"), which slows his recovery in clean air and adds to it
 *   in bad air. It keeps what it holds until it is washed out (care) or
 *   purged back into the room he is in, as a finite gas source never larger
 *   than what left the beard.
 *
 * Event deposits (scripts, an eruption's residue) are a second source, not
 * from the air: never both for the same stuff.
 *
 * Events: hazard:notice (keys "beard:..."), hazard:changed, beard:gag (a
 * gagging fit: the world stops him a moment), beard:puff (a warning puff:
 * a cue only, no gas), beard:hallucinate (a false alert, always marked
 * "(?)"), beard:hornets (the hornet hook), beard:purged (what was released).
 */
const EPS = 1e-6;
const TRACE = 0.005;
const LOCK_MAX = 120;
const TIMER_MAX = 60;

export class BeardState {
  constructor({ ship = null, bus = null } = {}) {
    this.ship = ship;
    this.bus = bus;
    // The session (set by GameSession): the content, the inventory (what can be worn), where the captain is.
    this.session = null;
    // Per play, set by the world: the fume hazard option (0 when it is off: no gagging fits, and the lungs take
    // nothing from the beard, as from the air). Notices held back. The last ship tuning seen (the HUD's capacity).
    this.fume = 1;
    this.quiet = false;
    this.tuning = SHIP_TUNING_DEFAULTS;
    this.reset();
  }

  reset() {
    this.on = false;
    this.held = {};
    this.phase = 'idle';
    this.left = 0;
    // Statuses that are kept (a contaminant's lingering, an applied one's time): { id: { left } }. Derived ones are read from what is held.
    this.statuses = {};
    // Seconds to an effect's next fit, alert or buzz, by status id ("puff": the warning puffs).
    this.timers = {};
    this.sniffLock = 0;
    this.sniffClear = 0;
    this.worn = [];
    this.count = 0;
    this.visions = 0;
    // Per play: what moved (conservation is checked on these), and what was last announced.
    this.deposited = {};
    this.cleaned = {};
    this.released = {};
    this.taken = {};
    this.seenStage = null;
    this.seenStatus = new Set();
    this.prevTotal = 0;
    this.trend = 'steady';
  }

  get content() {
    return this.session?.content ?? null;
  }

  get data() {
    return this.content ? beardData(this.content) : null;
  }

  // --- reading ---------------------------------------------------------------

  /** All it holds (the sum of its contents: never kept separately). */
  get total() {
    let n = 0;
    for (const q of Object.values(this.held)) n += q;
    return n;
  }

  amount(id) {
    return this.held[id] ?? 0;
  }

  /** What it can hold on this difficulty. */
  capacity(tuning = this.tuning) {
    return (this.data?.capacity ?? 100) * (tuning?.beardCapacityScale ?? 1);
  }

  /** How full, in percent (100 when it can take no more). */
  pct(tuning = this.tuning) {
    const cap = this.capacity(tuning);
    const t = this.total;
    return t >= cap - EPS ? 100 : (t / cap) * 100;
  }

  stage(tuning = this.tuning) {
    return stageForPct(this.content, this.pct(tuning));
  }

  get full() {
    return this.total >= this.capacity(this.tuning) - EPS;
  }

  /** Nothing has ever been asked of it. */
  get untouched() {
    return !this.on && !Object.keys(this.held).length && !Object.keys(this.statuses).length && this.phase === 'idle' && !this.worn.length && !this.count && !this.visions && !this.sniffLock && !this.sniffClear;
  }

  /** Something to move on the hazard clock: switched on, and holding something, a condition, a cycle or a lock. */
  get active() {
    return this.on && !!this.data && (this.total > 0 || Object.keys(this.statuses).length > 0 || this.phase !== 'idle' || this.sniffLock > 0 || this.sniffClear > 0);
  }

  /** It takes gas in now: on, not overloaded, not in the cooldown after a purge. */
  get absorbing() {
    return this.on && !!this.data && this.phase !== 'cooldown' && !this.full;
  }

  /** The items worn over it that still count (still carried), and their combined effect on `key`. */
  wornItems() {
    const inv = this.session?.inventory;
    return this.worn.filter((item) => !!this.data?.equipment?.[item] && (!inv || inv.count(item) > 0));
  }

  wornFactor(key) {
    let k = 1;
    for (const item of this.wornItems()) {
      const v = this.data.equipment[item][key];
      if (typeof v === 'number') k *= v;
    }
    return k;
  }

  /** What reaches his lungs through what he wears (1: nothing worn that protects them). The world takes the smaller of this and the rescue gear's. */
  get lungFactor() {
    return this.on ? this.wornFactor('lungs') : 1;
  }

  /** The share of a breath of `sub` it would catch now (0 when it takes none of it). */
  catchShare(sub, tuning = this.tuning) {
    if (!this.absorbing) return 0;
    const cid = contaminantFromAir(this.content, sub);
    if (!cid) return 0;
    return Math.min(0.9, this.stage(tuning).absorb * (contaminant(this.content, cid).absorb ?? 0) * this.wornFactor('absorb'));
  }

  /** How well it protects (the share of smoke it catches): what the HUD and the Ship page call protection. */
  protection(tuning = this.tuning) {
    return this.absorbing ? Math.min(0.9, this.stage(tuning).absorb * this.wornFactor('absorb')) : 0;
  }

  /** Percent of capacity held of contaminants with a flag ("irritant", "paranoia"); irritant through the goggles. */
  flagPct(flag, tuning = this.tuning) {
    let n = 0;
    for (const [id, q] of Object.entries(this.held)) if (contaminant(this.content, id)?.[flag]) n += q;
    if (flag === 'irritant') n *= this.wornFactor('irritant');
    return (n / this.capacity(tuning)) * 100;
  }

  /** Whether a status is on now (derived ones from what is held, the rest kept). */
  statusOn(id, tuning = this.tuning) {
    const def = beardStatus(this.content, id);
    if (!def || !this.on) return false;
    if (def.kind === 'derived') {
      if (def.atStage) return stageIndex(this.content, this.stage(tuning).id) >= stageIndex(this.content, def.atStage);
      return this.flagPct('irritant', tuning) >= def.irritant;
    }
    return !!this.statuses[id];
  }

  /** The statuses on now: [{ id, label, short, tone, kind, left, note, effects, suppressed }]. */
  statusList(tuning = this.tuning) {
    const out = [];
    for (const id of beardStatusIds(this.content)) {
      if (!this.statusOn(id, tuning)) continue;
      const def = beardStatus(this.content, id);
      const kept = this.statuses[id];
      // The sniff interrupts paranoia's perception for a while; the status itself stays until the stuff is gone.
      const suppressed = !!def.effects?.perception && this.sniffClear > 0;
      out.push({ id, label: def.label, short: def.short, tone: def.tone, kind: def.kind, left: kept ? kept.left : null, note: def.note, effects: def.effects ?? {}, suppressed });
    }
    return out;
  }

  /** How much slower he works and walks (1 when clean): the stage times each status. */
  factors(tuning = this.tuning) {
    if (!this.on || !this.data) return { work: 1, walk: 1 };
    const st = this.stage(tuning);
    let work = st.work ?? 1;
    let walk = st.walk ?? 1;
    for (const s of this.statusList(tuning)) {
      work *= s.effects.work ?? 1;
      walk *= s.effects.walk ?? 1;
    }
    return { work, walk };
  }

  /** What it gives off into his lungs a second (before the fume option and the difficulty): held x potency x the stage's offgas. */
  offgas(tuning = this.tuning) {
    if (!this.on || !this.data) return 0;
    const k = this.stage(tuning).offgas ?? 0;
    if (!(k > 0)) return 0;
    let n = 0;
    for (const [id, q] of Object.entries(this.held)) n += q * (contaminant(this.content, id)?.potency ?? 0);
    return n * k;
  }

  /** Its contents, most first: [{ id, label, short, amount, pct (of capacity), share (of what it holds) }]. */
  contents(tuning = this.tuning) {
    const total = this.total;
    const cap = this.capacity(tuning);
    return contaminantIds(this.content)
      .filter((id) => this.amount(id) > 0)
      .map((id) => {
        const c = contaminant(this.content, id);
        return { id, label: c.label, short: c.short, amount: this.amount(id), pct: (this.amount(id) / cap) * 100, share: total > 0 ? this.amount(id) / total : 0, supernatural: !!c.supernatural };
      })
      .sort((a, b) => b.amount - a.amount || a.id.localeCompare(b.id));
  }

  /** Seconds of warning before an overload purge on this difficulty (never under 4). */
  warnSeconds(tuning = this.tuning) {
    return Math.max(4, Math.min(30, Math.round((this.data?.purge?.overload?.warn ?? 10) * (tuning?.warnScale ?? 1))));
  }

  /** Everything the HUD, the Ship page and the reports need. */
  info(tuning = this.tuning) {
    const st = this.stage(tuning);
    return {
      on: this.on,
      total: this.total,
      capacity: this.capacity(tuning),
      pct: this.pct(tuning),
      shown: Math.floor(this.pct(tuning)),
      stage: st.id,
      label: st.label,
      tone: st.tone,
      rank: stageIndex(this.content, st.id),
      contents: this.contents(tuning),
      statuses: this.statusList(tuning),
      phase: this.phase,
      left: this.left,
      absorbing: this.absorbing,
      protection: this.protection(tuning),
      offgas: this.offgas(tuning),
      factors: this.factors(tuning),
      worn: this.wornItems(),
      sniffLock: this.sniffLock,
      sniffClear: this.sniffClear,
      trend: this.trend,
      // Purge risk: the countdown, or how close it is (critical: next to full).
      risk: this.phase === 'overload' ? 'purging' : st.id === 'critical' || st.id === 'overloaded' ? 'high' : st.id === 'heavy' ? 'some' : 'none',
    };
  }

  /** The HUD line's entry (saturated or worse, a condition, or a countdown), or nothing. */
  emergencies(tuning = this.tuning) {
    if (!this.on || !this.data) return [];
    const i = this.info(tuning);
    const kept = i.statuses.filter((s) => s.kind !== 'derived');
    const sat = stageIndex(this.content, 'saturated');
    if (i.phase !== 'overload' && i.rank < sat && !kept.length && !i.statuses.some((s) => s.id === 'gagging')) return [];
    const weights = { saturated: 60, heavy: 100, critical: 150, overloaded: 200 };
    const weight = i.phase === 'overload' ? 250 : (weights[i.stage] ?? 40) + kept.length * 5;
    return [{ kind: 'beard', id: 'beard', room: this.captainRoom(), stage: i.stage, label: i.label, tone: i.phase === 'overload' ? 'r' : i.tone, pct: i.shown, left: i.phase === 'overload' ? i.left : null, statuses: i.statuses.filter((s) => s.id !== 'saturated').map((s) => s.short), weight }];
  }

  captainRoom() {
    return this.ship?.air?.where?.() ?? this.session?.location?.map ?? null;
  }

  // --- the air ---------------------------------------------------------------

  /**
   * One breath through the beard (AirState.breathe calls it, once a second,
   * with the room's air before he breathes it): for each gas it can take, a
   * share of what passes (the stage's absorb x the contaminant's x what he
   * wears), never more than it has room for or the room holds. What it
   * takes leaves the room (counted as absorbed there). Returns { [substance]:
   * the share of his breath of it that was caught } for his lungs.
   */
  absorb(room, air, tuning = this.tuning) {
    const out = {};
    if (!this.absorbing || !air?.known) return out;
    const data = this.data;
    let free = this.capacity(tuning) - this.total;
    for (const s of air.subs) {
      if (!(free > EPS)) break;
      const share = this.catchShare(s.id, tuning);
      if (!(share > 0)) continue;
      const breathed = (data.breath * s.pct) / 100;
      if (!(breathed > 0)) continue;
      const got = this.ship.air.takeGas(room, s.id, Math.min(breathed * share, free));
      if (!(got > 0)) continue;
      const cid = contaminantFromAir(this.content, s.id);
      this.held[cid] = this.amount(cid) + got;
      this.taken[cid] = (this.taken[cid] ?? 0) + got;
      free -= got;
      out[s.id] = got / breathed;
    }
    if (Object.keys(out).length) this.settleCheck(tuning);
    return out;
  }

  // --- changing --------------------------------------------------------------

  /** Switches the system on or off. Off: it stops; what it holds is kept, and no purge is left pending. */
  enable(on = true) {
    if (!this.data) return { ok: false, reason: 'no beard data' };
    this.on = !!on;
    if (!on && this.phase === 'overload') {
      this.phase = 'idle';
      this.left = 0;
    }
    this.seenStage = this.stage().id;
    this.seenStatus = new Set(this.statusList().map((s) => s.id));
    this.changed();
    return { ok: true };
  }

  /**
   * A deposit that isn't from the air (a script, an eruption's residue):
   * never past capacity (the rest is refused, not lost into anything), once
   * per event id. Returns { ok, reason?, added, refused }.
   */
  deposit(id, amount, tuning = this.tuning, { eventId = null } = {}) {
    const c = contaminant(this.content, id);
    const n = Number(amount);
    const fail = (reason) => ({ ok: false, reason, added: 0, refused: Number.isFinite(n) ? n : 0 });
    if (!c) return fail(`unknown contaminant "${id}"`);
    if (!this.on) return fail('off');
    if (!(Number.isFinite(n) && n > 0)) return fail('amount must be above 0');
    if (n > (this.data.limits?.addAmount ?? 100)) return fail(`at most ${this.data.limits?.addAmount ?? 100} at once`);
    if (!this.ship.claimEvent(eventId)) return fail('duplicate event');
    const room = Math.max(0, this.capacity(tuning) - this.total);
    const added = Math.min(n, room);
    if (added > 0) {
      this.held[id] = this.amount(id) + added;
      this.deposited[id] = (this.deposited[id] ?? 0) + added;
    }
    this.settleCheck(tuning);
    return { ok: true, added, refused: n - added };
  }

  /**
   * A contamination event (an eruption's residue, a scripted splash): only
   * if the captain is in `room` (and within `reach` tiles of `at`, if given),
   * `amount` x `intensity`. Returns { ok, reason?, added }.
   */
  contaminate({ source = null, room, at = null, reach = null, intensity = 1, contaminant: id, amount, eventId = null }, tuning = this.tuning) {
    if (!this.on) return { ok: false, reason: 'off', added: 0 };
    const loc = this.session?.location ?? {};
    if (!room || loc.map !== room) return { ok: true, reason: 'not there', added: 0, source };
    if (at && reach !== null && Math.max(Math.abs((loc.x ?? 0) - at.x), Math.abs((loc.y ?? 0) - at.y)) > reach) return { ok: true, reason: 'out of reach', added: 0, source };
    const k = Math.max(0.25, Math.min(2, Number(intensity) || 1));
    const lim = this.data.limits?.addAmount ?? 100;
    const r = this.deposit(id, Math.min(lim, Math.max(0.01, amount * k)), tuning, { eventId });
    if (r.ok && r.added > 0) this.notice(`beard:contaminated:${eventId ?? this.total}`, `<o>Your beard caught ${contaminant(this.content, id).label.toLowerCase()}.</>`, 'o');
    return { ...r, source };
  }

  /**
   * Cleaning. `share` of each contaminant (or the one named), times its
   * "cleans" and the difficulty's cleanScale when `care` (the captain's
   * washing); a script's is exact. Returns { ok, removed, by: { id: n } }.
   */
  clean({ share = 1, contaminant: only = null, care = false } = {}, tuning = this.tuning) {
    if (only && !contaminant(this.content, only)) return { ok: false, reason: `unknown contaminant "${only}"`, removed: 0, by: {} };
    const k0 = Math.max(0, Math.min(1, Number(share) || 0));
    const by = {};
    let removed = 0;
    for (const id of Object.keys(this.held)) {
      if (only && id !== only) continue;
      const c = contaminant(this.content, id);
      const k = care ? Math.min(1, k0 * (c?.cleans ?? 1) * (tuning?.cleanScale ?? 1)) : k0;
      const n = this.held[id] * k;
      if (!(n > 0)) continue;
      this.held[id] -= n;
      this.cleaned[id] = (this.cleaned[id] ?? 0) + n;
      by[id] = n;
      removed += n;
    }
    this.tidy();
    this.settleCheck(tuning);
    return { ok: true, removed, by };
  }

  /** A status by a script or an event (not a derived one: those come from what is held). Paranoia this way is an explicit event, never smoke. */
  applyStatus(id, seconds = null, tuning = this.tuning) {
    const def = beardStatus(this.content, id);
    if (!def) return { ok: false, reason: `unknown status "${id}"` };
    if (def.kind === 'derived') return { ok: false, reason: `${def.label} comes from what the beard holds` };
    if (!this.on) return { ok: false, reason: 'off' };
    const most = this.data.limits?.statusSeconds ?? 600;
    const s = Math.round(Number(seconds ?? (def.kind === 'applied' ? def.seconds : def.linger || 30)));
    if (!(Number.isFinite(s) && s >= 1 && s <= most)) return { ok: false, reason: `seconds must be 1 to ${most}` };
    const had = this.statuses[id];
    this.statuses[id] = { left: Math.max(had?.left ?? 0, s) };
    this.settleCheck(tuning);
    // What it holds may end it at once (hornets into a beard full of smoke).
    return { ok: true, left: this.statuses[id]?.left ?? 0, cleared: !this.statuses[id] };
  }

  removeStatus(id, tuning = this.tuning) {
    if (!beardStatus(this.content, id)) return { ok: false, reason: `unknown status "${id}"` };
    delete this.statuses[id];
    delete this.timers[id];
    this.settleCheck(tuning);
    return { ok: true };
  }

  /** Wears an item over the beard, or takes it off (only an item the data maps, and only one he carries). */
  wear(item, on = true) {
    const e = this.data?.equipment?.[item];
    if (!e || item.startsWith('//')) return { ok: false, reason: `${item} isn't something to wear over a beard` };
    if (on) {
      if ((this.session?.inventory?.count(item) ?? 0) <= 0) return { ok: false, reason: `You don't have ${e.label}.` };
      if (!this.worn.includes(item)) this.worn.push(item);
    } else this.worn = this.worn.filter((x) => x !== item);
    this.changed();
    return { ok: true, label: e.label };
  }

  /**
   * A purge (profile: overload, controlled, catastrophic): its share of
   * each contaminant leaves the beard and pours into the room he is in as
   * finite sources of what it becomes (never more than left the beard;
   * where there's no ship air, into the open, counted as vented). Then a
   * cooldown in which it takes nothing in (no release-and-reabsorb loop).
   * Once per event id. Returns { ok, reason?, released: { substance: n }, room }.
   */
  purge(profile, tuning = this.tuning, { room = null, eventId = null } = {}) {
    const pd = this.data?.purge?.[profile];
    const fail = (reason) => ({ ok: false, reason, released: {} });
    if (!pd) return fail(`unknown purge "${profile}"`);
    if (!this.on) return fail('off');
    if (!(this.total > TRACE)) return fail('nothing to purge');
    const eid = eventId ?? `beard:purge:${this.count + 1}`;
    if (!this.ship.claimEvent(eid)) return fail('duplicate event');
    this.count += 1;
    const where = room ?? this.captainRoom();
    const bySub = {};
    for (const id of contaminantIds(this.content)) {
      const q = this.amount(id);
      if (!(q > 0)) continue;
      const n = q * pd.share;
      this.held[id] = q - n;
      const sub = contaminant(this.content, id).release;
      bySub[sub] = (bySub[sub] ?? 0) + n;
    }
    this.tidy();
    const air = this.ship.air;
    const sources = [];
    const rate = Math.min(pd.rate, airData(this.content)?.limits?.rate ?? 20);
    const wasQuiet = air.quiet;
    air.quiet = true;
    try {
      for (const [sub, n] of Object.entries(bySub)) {
        this.released[sub] = (this.released[sub] ?? 0) + n;
        if (!where || !airRoom(this.content, where)) {
          air.vented[sub] = (air.vented[sub] ?? 0) + n;
          continue;
        }
        const sid = `beard_${this.count}_${sub}`;
        const r = air.startSource({ id: sid, room: where, substance: sub, rate, amount: n, label: 'your beard', source: 'beard' });
        if (r.ok) sources.push(sid);
        else {
          // Every source slot taken: all of it at once, never past full; what doesn't fit goes out into the open.
          const put = air.addGas(where, sub, n);
          if (n - put > 0) air.vented[sub] = (air.vented[sub] ?? 0) + (n - put);
        }
      }
    } finally {
      air.quiet = wasQuiet;
    }
    this.phase = 'cooldown';
    this.left = pd.cooldown;
    delete this.timers.puff;
    const total = Object.values(bySub).reduce((a, b) => a + b, 0);
    const bad = profile !== 'controlled';
    this.notice(`beard:purge:${this.count}`, `${bad ? '<r>' : '<y>'}Your beard: ${pd.label}!</> <k>${Math.round(total)} into ${where && airRoom(this.content, where) ? this.ship.air.roomName(where) : 'the open air'}. It takes nothing in for ${pd.cooldown} s.</>`, bad ? 'r' : 'y');
    const out = { ok: true, profile, room: where, released: bySub, total, sources, eventId: eid };
    this.bus?.emit('beard:purged', out);
    this.settleCheck(tuning, { silent: true });
    return out;
  }

  /**
   * The sniff: a close look at what it holds (the detail an inspection
   * doesn't give), at a price: a concentrated whiff into his lungs (what it
   * holds x potency x sniff.exposure, through the fume option), a gag if
   * there's irritant in it, and a lock before the next. It snaps him out of
   * paranoia's visions for a while (the paranoia itself stays until the
   * stuff is gone). Returns { ok, reason?, dose, gag, cleared }.
   */
  sniff(tuning = this.tuning) {
    if (!this.on || !this.data) return { ok: false, reason: 'off' };
    if (this.sniffLock > 0) return { ok: false, reason: `Give your nose a moment (${this.sniffLock} s).` };
    const s = this.data.sniff;
    this.sniffLock = Math.min(LOCK_MAX, s.lock);
    let whiff = 0;
    for (const [id, q] of Object.entries(this.held)) whiff += q * (contaminant(this.content, id)?.potency ?? 0);
    const dose = this.ship.air.inhale(whiff * s.exposure, tuning);
    const gag = this.flagPct('irritant', tuning) >= 5 && this.fume > 0;
    if (gag) this.bus?.emit('beard:gag', { cause: 'sniff' });
    const cleared = this.statusList(tuning).some((x) => x.effects.perception);
    if (cleared) {
      this.sniffClear = Math.min(LOCK_MAX, s.interrupt);
      delete this.timers.paranoid;
      this.notice('beard:sniff:clear', '<g>The reek snaps you out of it.</> <k>For now.</>', 'g');
    }
    this.changed();
    return { ok: true, dose, gag, cleared };
  }

  // --- time ------------------------------------------------------------------

  /**
   * One step of hazard time, after the air (which did the breathing): locks
   * run down; kept statuses count down (a contaminant's lingers while its
   * stuff stays); effects fire on their intervals (a gagging fit, a vision,
   * a buzz); the warning puffs; the overload countdown and, at zero, the
   * involuntary purge; the cooldown after a purge. Returns true if it was in play.
   */
  tick(tuning = SHIP_TUNING_DEFAULTS) {
    this.tuning = tuning;
    if (!this.active) return false;
    // A countdown or cooldown that begins during this second starts counting next second.
    const was = this.phase;
    if (this.sniffLock > 0) this.sniffLock -= 1;
    if (this.sniffClear > 0) this.sniffClear -= 1;
    this.keepStatuses(tuning, true);
    for (const s of this.statusList(tuning)) this.effects(s);
    const st = this.stage(tuning);
    // Warning puffs at critical and worse (a cue only: no gas).
    if (st.puffs) {
      this.timers.puff = (this.timers.puff ?? st.puffs) - 1;
      if (this.timers.puff <= 0) {
        this.timers.puff = st.puffs;
        this.bus?.emit('beard:puff', { stage: st.id });
      }
    } else delete this.timers.puff;
    if (this.phase === 'overload' && was === 'overload') {
      this.left -= 1;
      if (this.left <= 0) this.purge('overload', tuning);
      else if (this.left <= 3) this.notice(`beard:overload:${this.count}:${this.left}`, `<r>BEARD PURGE IN ${this.left}!</>`, 'r');
    } else if (this.phase === 'cooldown' && was === 'cooldown') {
      this.left -= 1;
      if (this.left <= 0) {
        this.phase = 'idle';
        this.left = 0;
      }
    }
    this.settleCheck(tuning);
    this.trend = this.total > this.prevTotal + 0.05 ? 'rising' : this.total < this.prevTotal - 0.05 ? 'falling' : 'steady';
    this.prevTotal = this.total;
    return true;
  }

  /** Kept statuses: a contaminant's is held up while enough is held, then lingers; an applied one runs down, or smoke drives it out. */
  keepStatuses(tuning, second = false) {
    for (const id of beardStatusIds(this.content)) {
      const def = beardStatus(this.content, id);
      if (def.kind === 'contaminant') {
        if (this.flagPct('paranoia', tuning) >= def.paranoia) this.statuses[id] = { left: Math.max(this.statuses[id]?.left ?? 0, def.linger) };
        else if (second && this.statuses[id]) {
          this.statuses[id].left -= 1;
          if (this.statuses[id].left <= 0) this.endStatus(id);
        }
      } else if (def.kind === 'applied' && this.statuses[id]) {
        const smoke = def.clearedBy?.smoke;
        if (smoke && (this.amount('smoke') / this.capacity(tuning)) * 100 >= smoke) {
          this.endStatus(id);
          this.notice(`beard:${id}:smoked`, `<g>The smoke drives them out:</> <k>no longer ${def.label.toLowerCase()}.</>`, 'g');
          continue;
        }
        if (second) {
          this.statuses[id].left -= 1;
          if (this.statuses[id].left <= 0) this.endStatus(id);
        }
      }
    }
  }

  endStatus(id) {
    delete this.statuses[id];
    delete this.timers[id];
  }

  /** A status's effects, each on its own interval (the first a full interval after it starts). */
  effects(s) {
    const e = s.effects;
    const every = e.gagEvery ?? (e.perception ? e.alertEvery : null) ?? e.buzzEvery ?? null;
    if (!every) return;
    if (e.gagEvery && !(this.fume > 0)) return;
    if (s.suppressed) return;
    this.timers[s.id] = (this.timers[s.id] ?? every) - 1;
    if (this.timers[s.id] > 0) return;
    this.timers[s.id] = every;
    if (e.gagEvery) this.bus?.emit('beard:gag', { cause: s.id });
    else if (e.perception) {
      const visions = asArray(beardStatus(this.content, s.id)?.visions);
      const text = visions[this.visions % visions.length];
      this.visions += 1;
      this.bus?.emit('beard:hallucinate', { status: s.id, text, n: this.visions });
    } else if (e.hook) this.bus?.emit(e.hook, { status: s.id });
  }

  /** After any change: the overload countdown starts at full, stops once it's well below; statuses kept; what changed, said once. */
  settleCheck(tuning = this.tuning, { silent = false } = {}) {
    if (!this.on) return;
    this.keepStatuses(tuning);
    if (this.phase === 'idle' && this.full) {
      this.phase = 'overload';
      this.left = this.warnSeconds(tuning);
      this.notice(`beard:overload:${this.count}`, `<r>YOUR BEARD IS OVERLOADED!</> <k>It purges in ${this.left} s: wring it out where it can go, or wash it.</>`, 'r');
    } else if (this.phase === 'overload' && this.pct(tuning) < 95) {
      this.phase = 'idle';
      this.left = 0;
      this.notice(`beard:overload:${this.count}:eased`, '<g>Your beard settles.</> <k>No purge.</>', 'g');
    }
    this.announce(tuning, silent);
    this.changed();
  }

  /** A stage or status change, said once (rising into saturated or worse, back to clean; statuses on and off). */
  announce(tuning = this.tuning, silent = false) {
    const st = this.stage(tuning);
    const was = this.seenStage ?? 'clean';
    if (st.id !== was) {
      this.seenStage = st.id;
      const up = stageIndex(this.content, st.id) > stageIndex(this.content, was);
      const sat = stageIndex(this.content, 'saturated');
      const hint = { saturated: 'It holds less and protects less.', heavy: 'It gives off what it holds.', critical: 'Close to purging: wring it out or wash it.', overloaded: '' }[st.id] ?? '';
      if (!silent && up && stageIndex(this.content, st.id) >= sat && st.id !== 'overloaded') this.notice(`beard:stage:${st.id}`, `<${st.tone}>Your beard: ${st.label.toUpperCase()} (${Math.floor(this.pct(tuning))}%).</>${hint ? ` <k>${hint}</>` : ''}`, st.tone);
      else if (!silent && !up && st.id === 'clean') this.notice('beard:stage:clean', '<g>Your beard is clean.</>', 'g');
    }
    const now = new Set(this.statusList(tuning).map((s) => s.id));
    for (const id of now) {
      if (this.seenStatus.has(id) || id === 'saturated') continue;
      const def = beardStatus(this.content, id);
      if (!silent) this.notice(`beard:status:${id}`, `<${def.tone}>${def.short}:</> <k>${def.note}</>`, def.tone);
    }
    for (const id of this.seenStatus) {
      if (now.has(id) || id === 'saturated') continue;
      const def = beardStatus(this.content, id);
      if (!silent && def) this.notice(`beard:status:${id}:off`, `<g>No longer ${def.label.toLowerCase()}.</>`, 'g');
    }
    this.seenStatus = now;
  }

  tidy() {
    for (const id of Object.keys(this.held)) {
      if (this.held[id] > TRACE) continue;
      if (this.held[id] > 0) this.cleaned[id] = (this.cleaned[id] ?? 0) + this.held[id];
      delete this.held[id];
    }
  }

  notice(key, text, tone) {
    if (this.quiet) return;
    this.bus?.emit('hazard:notice', { key, text, tone });
  }

  changed() {
    this.bus?.emit('hazard:changed', {});
  }

  // --- saving ----------------------------------------------------------------

  /** Full precision (a loaded game goes on exactly as the saved one would have); nothing at all while it has never been used. */
  serialize() {
    if (this.untouched) return {};
    return {
      on: this.on,
      held: { ...this.held },
      phase: this.phase,
      left: this.left,
      statuses: Object.fromEntries(Object.entries(this.statuses).map(([k, v]) => [k, { left: v.left }])),
      timers: { ...this.timers },
      sniffLock: this.sniffLock,
      sniffClear: this.sniffClear,
      worn: [...this.worn],
      count: this.count,
      visions: this.visions,
    };
  }

  /**
   * From a save or a checkpoint. A save from before version 22 has none:
   * off and clean, nothing invented (the old beard tags are the story's and
   * are not read). Unknown contaminants, statuses and items are dropped
   * with a warning, numbers clamped, an unknown phase is idle; a beard
   * holding more than the largest capacity any difficulty gives is scaled
   * down. Nothing replays: the stage and statuses are taken as announced.
   */
  load(state, onWarning = () => {}) {
    this.reset();
    const data = this.data;
    if (!isPlainObject(state) || !data) return;
    const n = (v, lo, hi, d = lo) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Math.max(lo, Math.min(hi, Number(v))) : d);
    this.on = state.on === true;
    for (const [id, q] of Object.entries(isPlainObject(state.held) ? state.held : {})) {
      if (!contaminant(this.content, id) || !Number.isFinite(q)) {
        onWarning(`beard: dropped "${id}"`);
        continue;
      }
      if (q > TRACE) this.held[id] = q;
    }
    const most = data.capacity * (SHIP_TUNING.beardCapacityScale?.[1] ?? 1.5);
    const sum = this.total;
    if (sum > most) {
      onWarning('beard: held more than any beard can: scaled down');
      for (const id of Object.keys(this.held)) this.held[id] *= most / sum;
    }
    this.phase = BEARD_PHASES.includes(state.phase) ? state.phase : 'idle';
    if (state.phase !== undefined && !BEARD_PHASES.includes(state.phase)) onWarning(`beard: unknown phase "${state.phase}"; it is idle`);
    const longest = Math.max(...Object.values(data.purge ?? {}).map((p) => p.cooldown ?? 0), 30);
    this.left = this.phase === 'idle' ? 0 : Math.round(n(state.left, 1, this.phase === 'overload' ? 30 : longest, 1));
    const lim = data.limits?.statusSeconds ?? 600;
    for (const [id, v] of Object.entries(isPlainObject(state.statuses) ? state.statuses : {})) {
      const def = beardStatus(this.content, id);
      if (!def || def.kind === 'derived' || !isPlainObject(v)) {
        onWarning(`beard: dropped status "${id}"`);
        continue;
      }
      this.statuses[id] = { left: Math.round(n(v.left, 1, lim, 1)) };
    }
    for (const [id, v] of Object.entries(isPlainObject(state.timers) ? state.timers : {})) {
      if (id !== 'puff' && !beardStatus(this.content, id)) continue;
      this.timers[id] = Math.round(n(v, 1, TIMER_MAX, 1));
    }
    this.sniffLock = Math.round(n(state.sniffLock, 0, LOCK_MAX, 0));
    this.sniffClear = Math.round(n(state.sniffClear, 0, LOCK_MAX, 0));
    for (const item of asArray(state.worn)) {
      if (typeof item !== 'string' || !data.equipment?.[item] || item.startsWith('//')) {
        onWarning(`beard: dropped worn "${item}"`);
        continue;
      }
      if (!this.worn.includes(item)) this.worn.push(item);
    }
    this.count = Math.round(n(state.count, 0, 1e6, 0));
    this.visions = Math.round(n(state.visions, 0, 1e6, 0));
    this.prevTotal = this.total;
    // What the notices compare against: the loaded state, so loading announces nothing.
    this.seenStage = this.stage().id;
    this.seenStatus = new Set(this.statusList().map((s) => s.id));
  }
}

