/**
 * Master palette. Every generated asset draws from these named colours so the
 * whole game shares one restrained, 16-bit-style look. Ramps run dark → light.
 *
 * Retro note: most sprites stay within ~15 colours + transparency, matching a
 * Genesis/SNES sprite palette line (see docs/RETRO_PORT_NOTES.md).
 */
export const PAL = {
  clear: 'transparent',
  black: '#0c0a10',
  ink: '#1a1320',
  shadow: '#140e18',
  white: '#fff8ec',

  // Weathered deck planks
  deck0: '#2e2019',
  deck1: '#4a3427',
  deck2: '#6b4e38',
  deck3: '#8c6a4b',
  deck4: '#ab8963',
  deck5: '#c9a980',

  // Warm interior wood (walls, furniture)
  wood0: '#26140d',
  wood1: '#44251a',
  wood2: '#643922',
  wood3: '#86522f',
  wood4: '#a86e3e',
  wood5: '#c99056',

  // Dark hull / beam wood
  hull0: '#150c0a',
  hull1: '#2a1a14',
  hull2: '#3f281d',
  hull3: '#583a2a',
  hull4: '#77503a',

  // Sea
  sea0: '#0a1a33',
  sea1: '#0f2b52',
  sea2: '#16416f',
  sea3: '#21598e',
  sea4: '#3278ad',
  sea5: '#5aa2cc',
  sea6: '#9bd3e6',
  foam: '#e6f5f8',

  // Sky (title screen)
  sky0: '#1a1030',
  sky1: '#3a1c48',
  sky2: '#6c2a52',
  sky3: '#b0454c',
  sky4: '#e87a48',
  sky5: '#fcc070',

  // Brass / gold
  gold0: '#4a2e0c',
  gold1: '#7e5214',
  gold2: '#b57f22',
  gold3: '#e0ad38',
  gold4: '#f8d86c',
  gold5: '#fff4b8',

  // Iron / steel
  iron0: '#17161e',
  iron1: '#2c2b36',
  iron2: '#46465a',
  iron3: '#6a6a80',
  iron4: '#9898ac',
  iron5: '#d4d4e2',

  // Reds
  red0: '#300a12',
  red1: '#5c1220',
  red2: '#8e1f2c',
  red3: '#c0343a',
  red4: '#e46452',
  red5: '#f8a080',

  // Navy / blue cloth
  navy0: '#0e1226',
  navy1: '#1a2244',
  navy2: '#28366a',
  navy3: '#3e5292',
  navy4: '#6278b8',

  // Teal cloth
  teal0: '#0c2426',
  teal1: '#16403e',
  teal2: '#22605a',
  teal3: '#34887a',
  teal4: '#5ab09c',

  // Greens
  green0: '#0f2416',
  green1: '#1c4226',
  green2: '#2f6436',
  green3: '#4c8a44',
  green4: '#7cb45a',

  // Purple
  plum0: '#1e1026',
  plum1: '#361c44',
  plum2: '#553066',
  plum3: '#7a4a8a',
  plum4: '#a676b0',

  // Canvas / linen (sails, shirts, parchment)
  cloth0: '#5e4c3c',
  cloth1: '#8c7860',
  cloth2: '#b8a484',
  cloth3: '#dccca8',
  cloth4: '#f4e8cc',

  // Rope / straw / tan leather
  rope0: '#4a3218',
  rope1: '#7a5628',
  rope2: '#a67c3e',
  rope3: '#cca660',
  rope4: '#e8cc8c',

  // Leather (belts, boots)
  lea0: '#1c110c',
  lea1: '#352016',
  lea2: '#553220',
  lea3: '#774a2e',
  lea4: '#9a6640',

  // Fire / lantern light
  fire0: '#8a2408',
  fire1: '#d4540e',
  fire2: '#f49426',
  fire3: '#fcd058',
  fire4: '#fff6c2',

  // UI window
  ui0: '#070b18',
  ui1: '#0e1830',
  ui2: '#152548',
  ui3: '#1f3564',
  ui4: '#2c4a84',
};

/** Skin tone ramps: [shadow, base, highlight, deep shadow]. */
export const SKIN = {
  pale: ['#b87a68', '#e8b096', '#fad6bc', '#7e4c42'],
  light: ['#a86a50', '#dc9c76', '#f6c8a0', '#6e3e30'],
  tan: ['#8c5234', '#c07e50', '#e4a878', '#5a321f'],
  olive: ['#7a4c2c', '#aa7446', '#d09c68', '#4e2e1a'],
  brown: ['#5c3420', '#8a5534', '#b47a50', '#3a1e12'],
  dark: ['#3a2016', '#603826', '#8a5838', '#24120c'],
};

/** Hair / beard ramps: [dark, mid, light]. */
export const HAIR = {
  black: ['#0e0c12', '#221c26', '#3c3444'],
  darkbrown: ['#1e120c', '#3c2416', '#5e3a22'],
  brown: ['#3a2212', '#643e20', '#8e5e32'],
  ginger: ['#6a2410', '#a8441a', '#d8702e'],
  blond: ['#8a6a2a', '#c8a048', '#ecd07a'],
  grey: ['#4a4a52', '#7c7c86', '#b0b0ba'],
  white: ['#8a8a94', '#c4c4cc', '#f0f0f4'],
  salt: ['#2c2a30', '#5e5c64', '#9e9ca6'], // salt-and-pepper
  crimson: ['#5a1414', '#962a22', '#c85236'], // Garrick's famous sideburns
  stinkblack: ['#12120a', '#262814', '#4a4c26'], // a black beard that went through the Dead Center
  frazzled: ['#6a2410', '#a8442a', '#d8864a'], // sideburns after an hour with sharks
};

const cache = new Map();

/** Converts '#rrggbb' / '#rrggbbaa' / 'transparent' into a packed little-endian RGBA uint32. */
export function rgba(color) {
  if (typeof color === 'number') return color >>> 0;
  if (cache.has(color)) return cache.get(color);
  let value = 0;
  if (color && color !== 'transparent') {
    const hex = color.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = hex.length >= 8 ? parseInt(hex.slice(6, 8), 16) : 255;
    value = ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
  }
  cache.set(color, value);
  return value;
}

export function unpack(c) {
  return { r: c & 255, g: (c >>> 8) & 255, b: (c >>> 16) & 255, a: (c >>> 24) & 255 };
}

export function pack(r, g, b, a = 255) {
  return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

/** Hex string for a packed colour (for Phaser tints etc). */
export function hexNumber(color) {
  const { r, g, b } = unpack(rgba(color));
  return (r << 16) | (g << 8) | b;
}

/** Linear blend of two colours, t in 0..1 (used sparingly; results snap to 8-bit). */
export function mix(a, b, t) {
  const A = unpack(rgba(a));
  const B = unpack(rgba(b));
  const l = (x, y) => Math.round(x + (y - x) * t);
  return pack(l(A.r, B.r), l(A.g, B.g), l(A.b, B.b), l(A.a, B.a));
}
