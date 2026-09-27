import { PixelCanvas } from '../PixelCanvas.js';
import { GridSheet } from '../atlas.js';
import { resolveLook, paintCharacterFrame, FIELD_POSES, FIELD_DIRS, FRAME_W, FRAME_H, EXTRA_POSES, EXTRA_POSE_RATES } from './characterPainter.js';
import { paintParrotSheet, PARROT_RATES } from './parrotPainter.js';
import { paintBattleFrame, BATTLE_POSE_NAMES, BATTLE_W, BATTLE_H } from './battlePoses.js';

function mirror(pc) {
  const m = new PixelCanvas(pc.width, pc.height);
  m.blit(pc, 0, 0, { flipX: true });
  return m;
}

/**
 * Field sprite sheet for one appearance: every FIELD_POSES animation in
 * four directions. Frame names: "<anim>_<dir>_<i>", animations "<anim>_<dir>".
 */
export function buildCharacterSheet(appearance) {
  if (appearance.painter === 'parrot') {
    const { frames, anims } = paintParrotSheet(appearance);
    const sheet = new GridSheet(FRAME_W, FRAME_H, 16);
    for (const [name, f] of Object.entries(frames)) sheet.add(name, f);
    return { ...sheet.build(), anims, rates: PARROT_RATES };
  }
  const L = resolveLook(appearance);
  const sheet = new GridSheet(FRAME_W, FRAME_H, 16);
  const anims = {};
  const all = { ...FIELD_POSES };
  for (const name of appearance.poses ?? []) if (EXTRA_POSES[name]) all[name] = EXTRA_POSES[name];
  for (const [anim, poses] of Object.entries(all)) {
    for (const dir of FIELD_DIRS) {
      const names = [];
      poses.forEach((pose, i) => {
        let frame = paintCharacterFrame(L, dir === 'right' ? 'left' : dir, pose);
        if (dir === 'right') frame = mirror(frame);
        const name = `${anim}_${dir}_${i}`;
        sheet.add(name, frame);
        names.push(name);
      });
      anims[`${anim}_${dir}`] = names;
    }
  }
  return { ...sheet.build(), anims, rates: EXTRA_POSE_RATES };
}

/** Battle sheet (side view, facing left) for party members. */
export function buildBattleSheet(appearance) {
  const L = resolveLook(appearance);
  const sheet = new GridSheet(BATTLE_W, BATTLE_H, 8);
  for (const pose of BATTLE_POSE_NAMES) sheet.add(pose, paintBattleFrame(L, pose));
  return sheet.build();
}
