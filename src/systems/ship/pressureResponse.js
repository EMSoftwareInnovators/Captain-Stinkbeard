import { subjectDef, stageRank, stageInfo } from './pressure.js';
import { airSeconds, shortName, stateWords } from './airResponse.js';

/**
 * What the captain can do about a Grand Stenchmaster where he stands
 * (docs/gameplay-overhaul/12-pressure-and-eruptions.md, "Player
 * intervention"). Pure: reads the session, changes nothing. Respond, the
 * pressure commands and the Ship page all use it, so what's offered is what
 * can be done.
 *
 * Only a subject in the captain's own room, switched on and aboard, and
 * never while a scene owns him. Calming and holding it in are done up
 * close (the subject's "reach" in tiles); each has a lock afterwards, so a
 * press can't be repeated into safety:
 *   check     how he is, what is building him up, what helps
 *   soothe    Brogath: the right words (his reassurance prompt); Garrick: settle him down (seconds of work)
 *   restrain  hold it in (the timing bar): lower now, bigger later
 *   release   a controlled release, here, now (seconds of work): smaller than an eruption
 * Opening a porthole or shutting a door first is the air's own actions
 * (offered with these while he is in the room), and walking away is always allowed.
 */

const NAME_STAGE = (i) => `${i.name} (${i.label.toUpperCase()})`;

/** The subjects switched on, aboard, in `room`, and not held by a scene. */
export function subjectsHere(session, room = session.location?.map) {
  const pr = session.ship.pressure;
  return Object.keys(pr.subjects)
    .map((id) => pr.info(id))
    .filter((i) => i?.on && i.available && !i.legacyOwned && i.room === room);
}

/**
 * The actions for one subject: [{ action, subject, label, ok, reason, seconds }].
 * Not-ok entries say why.
 */
export function subjectOptions(session, id) {
  const pr = session.ship.pressure;
  const content = session.content;
  const def = subjectDef(content, id);
  const i = pr.info(id);
  if (!def || !i) return [];
  const room = i.room;
  const near = pr.nearCaptain(id);
  const busy = session.ship.hazards.working ? 'Already at work.' : null;
  const deep = session.ship.hazards.waterIn(room).stage.canWork === false ? 'Too deep to work in here: pump it down first.' : null;
  const cooling = i.phase === 'cooldown' ? `${def.name} has only just let go (${i.left} s).` : null;
  const out = [{ action: 'pcheck', subject: id, label: `Check on ${def.name}`, ok: true, reason: null, seconds: 0 }];
  // Calm him.
  const so = def.soothe;
  const ritual = so.refuseWhile && i.mods.some((m) => def.modifiers[m.id]?.[so.refuseWhile]);
  const soSecs = so.kind === 'work' ? airSeconds(session, room, so.seconds) : 0;
  const soReason = busy ?? (near.ok ? null : near.reason) ?? (i.calmLock > 0 ? `${def.name} needs a moment (${i.calmLock} s).` : null) ?? (ritual ? `${def.name} is mid-ceremony: he won't be settled.` : null) ?? (i.stage === 'stable' ? `${def.name} is fine.` : null) ?? (so.kind === 'work' ? deep : null);
  out.push({ action: 'soothe', subject: id, label: so.kind === 'work' ? `${so.label} (${soSecs} s)` : so.label, ok: !soReason, reason: soReason, seconds: soSecs });
  // Hold it in.
  const re = def.restrain;
  const reReason = busy ?? (near.ok ? null : near.reason) ?? cooling ?? (i.restrainLock > 0 ? `Not again yet (${i.restrainLock} s).` : null) ?? (i.strain >= re.maxStrain ? `${def.name} can't hold any more in.` : null) ?? (stageRank(i.stage) < stageRank(re.minStage) ? 'Nothing to hold in yet.' : null);
  out.push({ action: 'restrain', subject: id, label: re.label, ok: !reReason, reason: reReason, seconds: 0 });
  // Let it out, carefully.
  const rel = def.release;
  const relSecs = airSeconds(session, room, rel.seconds);
  const relReason = busy ?? (near.ok ? null : near.reason) ?? deep ?? cooling ?? (stageRank(i.stage) < stageRank(rel.minStage) ? 'Nothing much to let out.' : null);
  out.push({ action: 'release', subject: id, label: `${rel.label} (${relSecs} s)`, ok: !relReason, reason: relReason, seconds: relSecs });
  return out;
}

/** Respond's groups for the subjects here: [{ label, ok, subject, list }]. */
export function pressureGroups(session, room = session.location?.map) {
  return subjectsHere(session, room).map((i) => ({ label: NAME_STAGE(i), ok: true, subject: i.id, list: subjectOptions(session, i.id) }));
}

/** True if a subject in play is in this room (Respond is offered; the air's own actions are too, to prepare). */
export function pressureHere(session, room = session.location?.map) {
  return subjectsHere(session, room).length > 0;
}

/** The HUD's words for a pressure emergency ("GARRICK CRITICAL HELD", "BROGATH IMMINENT 6s"). */
export function pressureWord(e) {
  return `<${e.tone}>${e.name.toUpperCase()}</> ${e.label.toUpperCase()}${e.held ? ' <k>HELD</>' : ''}${e.left !== null ? ` <r>${e.left}s</>` : ''}`;
}

/** What to do about a subject, in words (the Ship page, the report). */
export function pressureAdvice(session, id) {
  const def = subjectDef(session.content, id);
  const i = session.ship.pressure.info(id);
  if (!def || !i) return '';
  if (i.phase === 'imminent') return `Calm him, hold it in, or get out of ${session.ship.pressure.roomName(i.room)}.`;
  if (i.phase === 'cooldown') return 'Clear the air while he recovers.';
  const calm = def.soothe.kind === 'prompt' ? 'Reassure him (the right words)' : 'Settle him down';
  return `${calm}, or let it out where you've opened a porthole. Held in, it comes back bigger.`;
}

/**
 * "Check on him": lines for the dialogue box. His stage and trend, what is
 * building him up, what he holds in, a countdown or recovery, the room's
 * openings (to prepare), and what helps.
 */
export function pressureReport(session, id) {
  const pr = session.ship.pressure;
  const def = subjectDef(session.content, id);
  const i = pr.info(id);
  if (!def || !i) return [];
  const lines = [];
  const si = stageInfo(session.content, i.stage);
  lines.push(`${def.name}: <${si.tone}>${si.label.toUpperCase()}</> (${i.pct}%).${i.phase === 'imminent' ? ` <r>ABOUT TO BLOW: ${i.left} s.</>` : i.phase === 'cooldown' ? ` <k>Recovering: ${i.left} s.</>` : ''}`);
  if (i.mods.length) lines.push(`<y>Building him up:</> ${i.mods.map((m) => `${m.label} (${m.left} s)`).join(', ')}.`);
  if (i.held > 0) lines.push(`<o>Held in:</> ${Math.round(i.held)}, strained ${i.strain}/${i.maxStrain}. <k>It will come out bigger.</>`);
  const ops = session.ship.air.connectionsIn(i.room).filter((c) => c.changeable).map((c) => `${shortName(c.label)} ${stateWords(c)}`);
  if (ops.length) lines.push(`<k>Openings here:</> ${ops.join(', ')}.`);
  lines.push(`<k>${pressureAdvice(session, id)}</>`);
  return lines;
}
