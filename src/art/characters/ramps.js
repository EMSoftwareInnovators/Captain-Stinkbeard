import { PAL, SKIN, HAIR } from '../palette.js';

/**
 * Named colour ramps for character appearances ([dark, base, light]).
 * Appearance data (data/appearances) refers to these names.
 */
export const CLOTH = {
  red: [PAL.red1, PAL.red2, PAL.red3],
  crimson: ['#4a0e18', '#7a1826', '#a8283a'],
  navy: [PAL.navy1, PAL.navy2, PAL.navy3],
  blue: ['#1c3060', '#2c4c8c', '#4a70b4'],
  teal: [PAL.teal1, PAL.teal2, PAL.teal3],
  green: [PAL.green1, PAL.green2, PAL.green3],
  olive: ['#2e3418', '#4a5226', '#6a7438'],
  plum: [PAL.plum1, PAL.plum2, PAL.plum3],
  black: ['#141018', '#241e2c', '#383044'],
  charcoal: ['#22222a', '#34343e', '#4c4c58'],
  grey: ['#3e3e48', '#5c5c68', '#7e7e8c'],
  brown: [PAL.lea1, PAL.lea2, PAL.lea3],
  tan: [PAL.rope1, PAL.rope2, PAL.rope3],
  cloth: [PAL.cloth1, PAL.cloth2, PAL.cloth3],
  white: [PAL.cloth2, PAL.cloth3, PAL.cloth4],
  mustard: ['#6a5010', '#9a7a1c', '#c8a030'],
  rust: ['#5a2410', '#86401c', '#b0602c'],
  leather: [PAL.lea1, PAL.lea3, PAL.lea4],
  gold: [PAL.gold1, PAL.gold3, PAL.gold4],
  iron: [PAL.iron1, PAL.iron3, PAL.iron4],
  seagreen: ['#173a36', '#2a5f56', '#4a8a78'], // battered, sun-faded frock coat
  burgundy: ['#2e0c18', '#521828', '#74283a'],
  wool: ['#7a3a2a', '#b4583a', '#dc8456'], // hand-knitted
  stained: ['#3a3014', '#6a5a22', '#8e7a34'], // good boots, forever changed
  bilious: ['#3a5a14', '#6a9a24', '#a8cc48'], // the Grand Stenchmaster Suit's green, which should not be on clothes
};

export function skinRamp(name) {
  const s = SKIN[name] || SKIN.tan;
  return { D: s[3], d: s[0], s: s[1], S: s[2] };
}

export function hairRamp(name) {
  return HAIR[name] || HAIR.brown;
}

export function clothRamp(name) {
  return CLOTH[name] || CLOTH.cloth;
}
