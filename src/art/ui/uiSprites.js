import { PixelCanvas } from '../PixelCanvas.js';
import { PAL } from '../palette.js';
import { ShelfAtlas } from '../atlas.js';

/**
 * Small UI sprites: cursor, dialogue arrow, interaction markers, emotes,
 * gauges, status and item icons. Returned as one atlas ("ui").
 */
const glove = {
  '.': null,
  o: PAL.black,
  W: '#ffffff',
  w: '#d6d2e4',
  s: '#9a94b4',
  g: PAL.gold3,
  G: PAL.gold1,
};

const CURSOR = [
  '....oooo.....',
  '..oowWWWoooo.',
  '.owWWWWWWWWWo',
  'oswWWWWoooooo',
  'oswWWWWWWWo..',
  'oswWWWWoooo..',
  'ogswWWWWWo...',
  'oGgswwwwoo...',
  '.ooGooooo....',
  '...ooo.......',
];

function cursorFrames() {
  const a = new PixelCanvas(13, 10).stamp(CURSOR, 0, 0, glove);
  return { cursor: a };
}

function nextArrow() {
  const frames = {};
  for (let i = 0; i < 2; i++) {
    const c = new PixelCanvas(9, 7);
    const col = i === 0 ? PAL.gold4 : PAL.gold3;
    c.stamp(['ooooooooo', 'oyyyyyyyo', '.oyyyyyo.', '..oyyyo..', '...oyo...', '....o....'], 0, 0, { o: PAL.black, y: col });
    c.set(2, 1, PAL.gold5);
    frames[`next_${i}`] = c;
  }
  return frames;
}

/** Interaction markers shown above a usable thing: speech (NPC) / look (object) / door. */
function markers() {
  const out = {};
  const bubble = (draw) => {
    const c = new PixelCanvas(13, 12);
    c.rect(1, 0, 11, 9, PAL.black);
    c.rect(0, 1, 13, 7, PAL.black);
    c.rect(1, 1, 11, 7, '#ffffff');
    c.set(4, 9, PAL.black); c.set(5, 9, PAL.black); c.set(6, 9, PAL.black);
    c.set(5, 8, '#ffffff'); c.set(4, 8, '#ffffff');
    c.set(4, 10, PAL.black); c.set(5, 10, PAL.black);
    c.set(4, 11, PAL.black);
    c.hline(2, 10, 7, '#c8c4dc');
    draw(c);
    return c;
  };
  out.mark_talk = bubble((c) => {
    for (const x of [3, 6, 9]) c.rect(x, 3, 2, 2, PAL.ink);
  });
  out.mark_look = bubble((c) => {
    c.rect(5, 2, 3, 1, PAL.ink); c.rect(4, 3, 1, 3, PAL.ink); c.rect(8, 3, 1, 3, PAL.ink); c.rect(5, 6, 3, 1, PAL.ink);
    c.set(9, 6, PAL.ink); c.set(10, 7, PAL.ink);
    c.set(5, 3, '#9ad0f0');
  });
  out.mark_door = bubble((c) => {
    c.rect(5, 2, 3, 5, PAL.wood2); c.strokeRect(4, 2, 5, 6, PAL.ink); c.set(7, 4, PAL.gold3);
  });
  return out;
}

const EMOTE_DRAW = {
  exclaim: (c) => { c.rect(6, 2, 2, 5, PAL.red3); c.rect(6, 8, 2, 2, PAL.red3); },
  question: (c) => {
    c.stamp(['.###.', '#...#', '...#.', '..#..', '.....', '..#..'], 4, 2, { '#': PAL.navy3 });
    c.set(4, 3, PAL.navy3);
  },
  ellipsis: (c) => { for (const x of [3, 6, 9]) c.rect(x, 6, 2, 2, PAL.ink); },
  anger: (c) => c.stamp(['.#.#.', '##.##', '.....', '##.##', '.#.#.'], 4, 3, { '#': PAL.red3 }),
  sweat: (c) => c.stamp(['..#..', '.###.', '#####', '#####', '.###.'], 4, 3, { '#': PAL.sea4 }),
  note: (c) => c.stamp(['...##', '..#.#', '..#..', '###..', '###..'], 4, 3, { '#': PAL.plum3 }),
  heart: (c) => c.stamp(['.#.#.', '#####', '#####', '.###.', '..#..'], 4, 3, { '#': PAL.red3 }),
  zzz: (c) => c.stamp(['####.', '..#..', '.#...', '####.', '.....'], 4, 3, { '#': PAL.navy3 }),
};

function emotes() {
  const out = {};
  for (const [name, draw] of Object.entries(EMOTE_DRAW)) {
    const c = new PixelCanvas(14, 14);
    c.ellipse(7, 6.5, 6.5, 6, PAL.black);
    c.ellipse(7, 6.5, 5.5, 5, '#ffffff');
    c.set(4, 12, PAL.black); c.set(3, 13, PAL.black); c.set(4, 11, '#ffffff'); c.set(5, 12, PAL.black);
    draw(c);
    out[`emote_${name}`] = c;
  }
  return out;
}

/** Gauge pieces: frame and fills are cropped at runtime to show values. */
function gauges() {
  const out = {};
  const fill = (name, ramp) => {
    const c = new PixelCanvas(48, 4);
    for (let x = 0; x < 48; x++) {
      c.set(x, 0, ramp[2]);
      c.set(x, 1, ramp[1]);
      c.set(x, 2, ramp[1]);
      c.set(x, 3, ramp[0]);
    }
    out[name] = c;
  };
  fill('gauge_hp', [PAL.green2, PAL.green3, PAL.green4]);
  fill('gauge_hp_low', [PAL.red2, PAL.red3, PAL.red4]);
  fill('gauge_hp_mid', [PAL.gold1, PAL.gold3, PAL.gold4]);
  fill('gauge_xp', [PAL.navy2, PAL.navy3, PAL.navy4]);
  const frame = new PixelCanvas(50, 6);
  frame.rect(0, 0, 50, 6, PAL.black);
  frame.rect(1, 1, 48, 4, '#2a1c2a');
  out.gauge_frame = frame;
  // Command pip (filled / empty)
  const pip = (on) => {
    const c = new PixelCanvas(7, 7);
    c.stamp(['.ooooo.', 'ogggggo', 'ogGGGgo', 'ogGGGgo', 'ogGGGgo', 'ogggggo', '.ooooo.'], 0, 0, {
      o: PAL.black, g: on ? PAL.gold2 : PAL.ui2, G: on ? PAL.gold4 : PAL.ui1,
    });
    if (on) c.set(2, 2, PAL.gold5);
    return c;
  };
  out.pip_on = pip(true);
  out.pip_off = pip(false);
  return out;
}

const STATUS_ICONS = {
  braced: ['..oo..', '.oGGo.', 'oGggGo', 'oGggGo', '.oGgo.', '..oo..'],
  defending: ['oooooo', 'oBbbBo', 'oBbbBo', 'oBbbBo', '.oBBo.', '..oo..'],
  marked: ['.oooo.', 'or..ro', 'o.rr.o', 'o.rr.o', 'or..ro', '.oooo.'],
  sickened: ['.oooo.', 'oGGGGo', 'oGoGoo', 'oGGGGo', '.oGGo.', '.o..o.'],
  emboldened: ['..oo..', '.oRRo.', 'oRRRRo', '..RR..', '..RR..', '..oo..'],
  rattled: ['oo..oo', '.oYYo.', '..oo..', '.oYYo.', 'oYYYYo', 'oooooo'],
  // Frog Grog's surprises
  warmed_up: ['..R...', '.RR.R.', '.RRRR.', 'RRYYRR', 'RYYYYR', '.oooo.'],
  stench_proof: ['oooooo', 'oGggGo', 'oGggGo', 'oGggGo', '.oGGo.', '..oo..'],
  belching: ['.YY...', 'YYYY.Y', '.YYYYY', '..YYY.', '.YYYY.', '..YY..'],
  dizzy: ['.BBBB.', 'B....B', 'B.BB.B', 'B.B..B', 'B.BBB.', 'B.....'],
};

function statusIcons() {
  const out = {};
  const colors = {
    o: PAL.black, G: PAL.gold3, g: PAL.gold4, B: PAL.navy3, b: PAL.navy4, r: PAL.red3,
    R: PAL.red3, Y: PAL.gold3, '.': null,
  };
  for (const [id, rows] of Object.entries(STATUS_ICONS)) {
    const c = new PixelCanvas(6, 6).stamp(rows, 0, 0, colors);
    if (id === 'sickened' || id === 'stench_proof') c.replace(PAL.gold3, PAL.green3);
    if (id === 'belching') c.replace(PAL.gold3, '#d8d060');
    out[`status_${id}`] = c;
  }
  return out;
}

export function buildUiAtlas(itemIcons = {}) {
  const atlas = new ShelfAtlas(512, 1);
  const groups = [cursorFrames(), nextArrow(), markers(), emotes(), gauges(), statusIcons(), itemIcons];
  for (const g of groups) for (const [name, canvas] of Object.entries(g)) atlas.add(name, canvas);
  return atlas.build();
}
