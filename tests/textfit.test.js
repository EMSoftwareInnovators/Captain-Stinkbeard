import { describe, it, expect, vi } from 'vitest';

vi.mock('phaser', () => ({ TintModes: { MULTIPLY: 0 } }));

const { loadContent } = await import('../src/content/loadContent.js');
const { buildFonts } = await import('../src/art/font/buildFont.js');
const { wrap, measure, parseMarkup } = await import('../src/ui/text.js');
const { TOAST_TEXT_WIDTH } = await import('../src/ui/Toasts.js');
const { SCREEN_WIDTH } = await import('../src/config/constants.js');

/**
 * Every piece of text the game's panels show, measured with the real pixel
 * fonts against the room each panel gives it: nothing should run off the
 * screen or need cutting short. (The panels cut what doesn't fit with "…"
 * and offer the whole thing, so a failure here means text a player would
 * see cut, not text off the screen; e2e/text.spec.js checks the screen.)
 */
const content = loadContent();
const { fonts } = buildFonts();
const plain = (s) => parseMarkup(String(s).replace(/\{[^{}]+\}/g, 'XXXXXXXX')).text;
const width = (s, font = fonts.main) => measure(font, plain(s));
const lines = (s, w, font = fonts.main) => wrap(font, plain(s), w).split('\n');
const longest = (s, w, font = fonts.main) => Math.max(...lines(s, w, font).map((l) => measure(font, l)));

// The pause menu's page (MenuScene PANE) and what each page leaves for text.
const PANE_W = SCREEN_WIDTH - 100;
const DETAIL_W = PANE_W - 24;
const CHOICE_W = SCREEN_WIDTH - 12 - 26 - 4;

const walk = (v, fn) => {
  if (Array.isArray(v)) v.forEach((x) => walk(x, fn));
  else if (v && typeof v === 'object') {
    fn(v);
    Object.values(v).forEach((x) => walk(x, fn));
  }
};

describe('text fits where the game shows it', () => {
  it('quest notifications wrap to at most four lines, no word wider than a toast', () => {
    const bad = [];
    for (const q of content.quests.list()) {
      const texts = [`New quest: ${q.title}`, `Quest complete: ${q.title}`, ...(q.objectives ?? []).map((o) => `★ ${o.text}`)];
      for (const t of texts) {
        if (lines(t, TOAST_TEXT_WIDTH).length > 4 || longest(t, TOAST_TEXT_WIDTH) > TOAST_TEXT_WIDTH) bad.push(t);
      }
    }
    expect(bad).toEqual([]);
  });

  it('quest titles fit the quest log in two lines (the list row cuts a long one short)', () => {
    const bad = content.quests.list().filter((q) => lines(q.title, DETAIL_W, fonts.bold).length > 2 || longest(q.title, DETAIL_W, fonts.bold) > DETAIL_W).map((q) => q.title);
    expect(bad).toEqual([]);
  });

  it('item names fit their row and descriptions fit the five-line box', () => {
    const bad = [];
    for (const it of content.items.list()) {
      if (width(it.name) > PANE_W - 36 - 18 - 24) bad.push(`name: ${it.name}`);
      if (it.description && lines(it.description, DETAIL_W).length > 5) bad.push(`description: ${it.id}`);
    }
    expect(bad).toEqual([]);
  });

  it('room names fit the corner title (two lines) and the pause menu box (three)', () => {
    const bad = [];
    for (const m of content.maps.list()) {
      const names = [m.name, ...(m.nameVariants ?? []).map((v) => v.name)].filter(Boolean);
      for (const n of names) {
        if (lines(n, SCREEN_WIDTH - TOAST_TEXT_WIDTH - 52, fonts.bold).length > 2) bad.push(`title: ${n}`);
        if (lines(n, 76).length > 3) bad.push(`menu: ${n}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('dialogue choices fit the choice box on one line', () => {
    const bad = new Set();
    for (const id of content.scripts.ids()) {
      walk(content.scripts.get(id), (step) => {
        if (Array.isArray(step.choice)) for (const o of step.choice) if (o.text && width(o.text) > CHOICE_W) bad.add(o.text);
      });
    }
    expect([...bad]).toEqual([]);
  });

  it('speaker names fit the name tag', () => {
    const bad = [];
    for (const n of content.npcs.list()) if (width(n.name) > 150) bad.push(n.name);
    expect(bad).toEqual([]);
  });
});
