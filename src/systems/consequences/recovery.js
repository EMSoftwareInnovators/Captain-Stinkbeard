import { asArray } from '../../core/util.js';
import { captainFactors } from '../ship/airResponse.js';
import { roomLabel } from '../ship/response.js';
import {
  ledgerData,
  consequenceDef,
  categoryDef,
  methodDef,
  methodIds,
  methodTargets,
  methodBill,
  methodSeconds,
  consequenceTuning,
  recoveriesOf,
  MODIFIERS,
  NEUTRAL,
} from './ledger.js';

/**
 * The captain's side of the consequence ledger (overhaul Prompt 11,
 * docs/gameplay-overhaul/15-consequences-and-recovery.md): the recoveries
 * and preparations Respond offers where he stands, what each needs and
 * whether it can be done now, and the words the notices and the Captain's
 * Journal use. Pure: reads the session, changes nothing.
 */

const itemName = (content, id) => content.items?.get?.(id)?.name ?? id;
const itemList = (content, list) => list.map((c) => `${c.count} ${itemName(content, c.item)}`).join(', ');

/** m:ss of hazard time. */
export function clock(seconds) {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Seconds a method takes where he stands: a rest its own (being tired never slows a rest), work longer in deep water and with his condition. */
export function methodSecondsHere(session, methodId, level = 1, { difficulty = 'captain' } = {}) {
  const m = methodDef(session.content, methodId);
  const base = methodSeconds(session.content, methodId, level, consequenceTuning(session.content, difficulty));
  if (!m || m.kind === 'rest') return base;
  const room = session.location?.map;
  const water = room ? session.ship.hazards.waterIn(room).stage.work ?? 1 : 1;
  return Math.max(1, Math.round(base * water * captainFactors(session).work));
}

/**
 * What a method would do now: the held consequences it ends or eases
 * ([{ id, result: recover | contain, level }]), or the advantage it earns
 * ([{ id, result: earn }], only while the ledger's interactive layer is on).
 */
export function methodWork(session, methodId) {
  const L = session.consequences;
  const out = [];
  for (const t of methodTargets(session.content, methodId)) {
    if (t.result === 'earn') {
      if (L.on) out.push(t);
      continue;
    }
    const e = L.held(t.id);
    if (!e || (t.result === 'contain' && e.state === 'contained')) continue;
    out.push({ ...t, level: e.level });
  }
  return out;
}

/** What's missing from a method's bill (the pack only: the captain pays for his own recovery). */
export function billMissing(session, bill) {
  return bill.filter((c) => session.inventory.count(c.item) < c.count).map((c) => ({ ...c, have: session.inventory.count(c.item) }));
}

/** Why a method can't be done here and now (null when it can). */
export function methodBlocked(session, methodId, { difficulty = 'captain', anywhere = false } = {}) {
  const content = session.content;
  const m = methodDef(content, methodId);
  if (!m) return 'Nothing to do that with.';
  if (m.kind === 'provision') return 'Eat it from Items.';
  const room = session.location?.map;
  if (!anywhere && room !== m.room) return `Only ${m.where}.`;
  const hz = session.ship.hazards;
  if (hz.working) return 'Already at work.';
  if (room && hz.fireIn(room)) return 'Not with a fire in here.';
  if (m.kind !== 'rest' && room && hz.waterIn(room).stage.canWork === false) return 'Too deep in here: pump it down first.';
  const missing = billMissing(session, methodBill(content, methodId, consequenceTuning(content, difficulty)));
  if (missing.length) return `Not enough: ${missing.map((c) => `${itemName(content, c.item)} ${c.have}/${c.count}`).join(', ')}.`;
  return null;
}

/**
 * The recoveries and preparations where the captain stands, for the
 * Respond choice: [{ action: recover | prepare, method, label, ok, reason,
 * seconds, bill, targets }]. Empty when there is nothing to put right here
 * and nothing to prepare (every chapter: the ledger is empty and off).
 */
export function consequenceOptions(session, { difficulty = 'captain' } = {}) {
  const content = session.content;
  if (!ledgerData(content) || !session.consequences) return [];
  const room = session.location?.map;
  const tuning = consequenceTuning(content, difficulty);
  const out = [];
  for (const id of methodIds(content)) {
    const m = methodDef(content, id);
    if (m.kind === 'provision' || m.room !== room) continue;
    const work = methodWork(session, id);
    if (!work.length) continue;
    const level = Math.max(1, ...work.map((w) => w.level ?? 1));
    const seconds = methodSecondsHere(session, id, level, { difficulty });
    const bill = methodBill(content, id, tuning);
    const reason = methodBlocked(session, id, { difficulty });
    out.push({ action: m.kind === 'prepare' ? 'prepare' : 'recover', method: id, label: `${m.label} (${seconds}s${bill.length ? `, ${itemList(content, bill)}` : ''})`, ok: !reason, reason, seconds, bill, targets: work });
  }
  return out;
}

/** True when a recovery or a preparation can be offered here (the world shows Respond). */
export function consequencesHere(session) {
  return consequenceOptions(session).length > 0;
}

/** A meal the captain carries that a provision method accepts (an item whose use starts a supplies effect of its group), or null. */
export function mealInPack(session, methodId) {
  const content = session.content;
  const m = methodDef(content, methodId);
  if (!m || m.kind !== 'provision') return null;
  for (const e of session.inventory.entries()) {
    const fx = asArray(content.items.get(e.id)?.use?.effects).find((f) => f.type === 'shipEffect' && f.effect);
    if (fx && content.shipSupplies?.effects?.[fx.effect]?.group === m.group) return e.id;
  }
  return null;
}

/** The supplies effect groups a provision method eases (for the effect path: eating a meal of that group). */
export function provisionMethodsFor(content, effectId) {
  const group = content?.shipSupplies?.effects?.[effectId]?.group;
  if (!group) return [];
  return methodIds(content).filter((id) => methodDef(content, id).kind === 'provision' && methodDef(content, id).group === group);
}

// --- words -----------------------------------------------------------------

const TONE = { negative: 'r', positive: 'g', narrative: 'y' };

/** A consequence's name for a notice: its title in capitals, in its tone. */
function tag(content, id) {
  const def = consequenceDef(content, id);
  return `<${TONE[def?.kind] ?? 'y'}>${(def?.title ?? id).toUpperCase()}</>`;
}

/** The level's word ("Rattled"), or "" for a one-level consequence. */
export function levelLabel(def, level) {
  if (!def || asArray(def.levels).length <= 1 || !(level >= 1)) return '';
  return asArray(def.levels)[Math.min(level, def.levels.length) - 1]?.label ?? '';
}

/** How an ending reads ("rested it off", "wore off"). */
export function endingWords(content, how) {
  const m = methodDef(content, how);
  if (m) return m.done ?? m.label.toLowerCase();
  return { expired: 'wore off', 'used up': 'used up', milestone: 'passed with the chapter', superseded: 'put behind you', cleared: 'cleared' }[how] ?? how;
}

/** A short notice for what a change did (a toast), or '' for nothing worth saying. */
export function consequenceNotice(content, r) {
  if (!r?.ok) return '';
  const def = consequenceDef(content, r.id);
  if (!def) return '';
  const name = tag(content, r.id);
  const lv = levelLabel(def, r.level);
  const word = lv ? ` <k>(${lv})</>` : '';
  switch (r.op) {
    case 'applied':
      // The level is the Journal's to show; the notice says what it does.
      return def.kind === 'narrative' ? `${name} <k>noted in the Journal.</>` : `${name}: ${def.effect.replace(/^./, (c) => c.toLowerCase())}`;
    case 'worsened':
      return `${name} worse${word}.`;
    case 'capped':
      return `${name} again${word}.`;
    case 'refreshed':
      return `${name} again.`;
    case 'flared':
      return `${name} back${word}.`;
    case 'eased':
      return `${name} eased${word}.`;
    case 'contained':
      return `${name} contained: no effect for now.`;
    case 'recovered':
    case 'resolved':
      return `${name} <k>${endingWords(content, r.how)}.</>`;
    default:
      return '';
  }
}

/** What an entry's modifiers do, in words with numbers ("Green -4", "Work +35%"). */
export function modifierWords(mods) {
  const out = [];
  for (const [key, v] of Object.entries(mods)) {
    if (v === undefined || v === NEUTRAL[key]) continue;
    const bad = Math.sign(v - NEUTRAL[key]) === MODIFIERS[key].worse;
    const tone = bad ? 'r' : 'g';
    const pct = `${v > 1 ? '+' : '-'}${Math.round(Math.abs(v - 1) * 100)}%`;
    if (key === 'zone') out.push(`<${tone}>Green ${v > 0 ? '+' : ''}${v}</>`);
    else if (key === 'costAdd') out.push(`<${tone}>${v > 0 ? '+' : ''}${v} material</>`);
    else out.push(`<${tone}>${MODIFIERS[key].label.replace(/^./, (c) => c.toUpperCase())} ${pct}</>`);
  }
  return out.join(', ');
}

/** Whether a recovery can be done right now, in words. */
function recoveryNow(session, r, difficulty) {
  const content = session.content;
  if (r.def.kind === 'provision') {
    if (!session.ship.supplies?.on) return '<k>No galley meals this voyage.</>';
    return mealInPack(session, r.method) ? '<g>You have one.</>' : '<y>Cook one first.</>';
  }
  const blocked = methodBlocked(session, r.method, { difficulty });
  if (!blocked) return '<g>Here, now.</>';
  if (session.location?.map !== r.def.room) return `<k>Go to ${roomLabel(session, r.def.room)}.</>`;
  return `<y>${blocked}</>`;
}

/** The Journal's lines for a held consequence: state, words, effect, how to put it right (and whether that can be done now), how it ends. */
export function heldLines(session, e, { difficulty = 'captain' } = {}) {
  const content = session.content;
  const def = consequenceDef(content, e.id);
  const tone = TONE[def.kind] ?? 'y';
  const lines = [];
  const lv = levelLabel(def, e.level);
  if (e.state === 'contained') lines.push('<k>State</>  <y>Contained</>: no effect for now; another slip brings it back.');
  else if (def.kind === 'narrative') lines.push(`<k>State</>  <y>${def.permanent ? 'Decided' : 'Remembered'}</>`);
  else lines.push(`<k>State</>  <${tone}>${def.kind === 'positive' ? 'In your favour' : 'Active'}</>${lv ? `: ${lv} (${e.level} of ${e.cap})` : ''}`);
  lines.push(`"${def.description}"`);
  const mods = session.consequences.entryModifiers(e);
  const nums = modifierWords(mods);
  lines.push(`<k>Effect</>  ${def.effect}${nums ? ` ${nums}.` : ''}`);
  const recov = recoveriesOf(content, e.id);
  recov.forEach((r, i) => {
    const what = r.result === 'contain' ? 'eases it' : 'ends it';
    const bill = methodBill(content, r.method, consequenceTuning(content, difficulty));
    const secs = r.def.kind === 'provision' ? '' : ` (${methodSecondsHere(session, r.method, e.level, { difficulty })}s${bill.length ? `, ${itemList(content, bill)}` : ''})`;
    lines.push(`<k>${i ? 'Or' : 'Recover'}</>  ${r.def.label}, ${r.def.where}${secs}: ${what}. ${recoveryNow(session, r, difficulty)}`);
  });
  const ends = [];
  if (e.left !== null) ends.push(`in ${clock(e.left)}`);
  if (e.miles !== null) ends.push(`after ${e.miles} more chapter${e.miles === 1 ? '' : 's'}`);
  if (e.uses !== null) ends.push(`after ${e.uses} more repair bar${e.uses === 1 ? '' : 's'}`);
  if (ends.length) lines.push(`<k>Ends</>  By itself ${ends.join(', or ')}.`);
  else if (def.permanent) lines.push('<k>Ends</>  Never. It stands.');
  else if (!recov.length) lines.push('<k>Ends</>  When the story says so.');
  else lines.push('<k>Ends</>  Not by itself: put it right.');
  return lines;
}

/** The Journal's lines for something that has ended. */
export function endedLines(session, h) {
  const content = session.content;
  const def = consequenceDef(content, h.id);
  const lines = [];
  lines.push(`<k>Ended</>  ${h.state === 'recovered' ? '<g>Recovered</>' : 'Resolved'}: ${endingWords(content, h.how)}.`);
  lines.push(`"${def.description}"`);
  const worst = levelLabel(def, h.peak);
  if (worst) lines.push(`<k>At worst</>  ${worst} (${h.peak})`);
  return lines;
}

/**
 * The ledger's entries for the Captain's Journal: what is held (in the
 * Journal's order), then what has ended, newest first. Each is
 * { id, consequence, title, held, tone, unseen, right, lines }.
 */
export function journalEntries(session, { difficulty = 'captain', ended = 8 } = {}) {
  const content = session.content;
  const L = session.consequences;
  if (!L || !ledgerData(content)) return [];
  const out = [];
  for (const e of L.list()) {
    const def = consequenceDef(content, e.id);
    if (!def || def.visibility === 'hidden') continue;
    const cat = categoryDef(content, def.category)?.label ?? def.category;
    out.push({ id: `cq:${e.id}`, consequence: e.id, title: def.title, held: true, tone: TONE[def.kind] ?? 'y', unseen: !e.noted, right: e.state === 'contained' ? '<k>eased</>' : `<k>${cat}</>`, lines: heldLines(session, e, { difficulty }) });
  }
  const past = [...L.history].reverse().filter((h) => consequenceDef(content, h.id)?.visibility !== 'hidden').slice(0, ended);
  for (const h of past) out.push({ id: `cq:${h.id}:${h.n}`, consequence: h.id, title: consequenceDef(content, h.id).title, held: false, tone: 'k', unseen: false, right: '<k>past</>', lines: endedLines(session, h) });
  return out;
}

/** True when the ledger has something for the Journal to show. */
export function hasJournalEntries(session) {
  const L = session?.consequences;
  if (!L || !ledgerData(session.content)) return false;
  return [...L.entries.values(), ...L.history].some((e) => consequenceDef(session.content, e.id)?.visibility !== 'hidden');
}
