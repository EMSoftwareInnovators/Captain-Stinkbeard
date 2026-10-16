import fs from 'node:fs';
import { it } from 'vitest';
import { playPhase16 } from './phase16Play.js';
import { makeStory } from './storyHarness.js';

// Records the state at each Phase 16 chapter start (and three mid-chapter moments) for the debug presets
// (scratchpad presets16.py turns tmp/rec16.first.json into data/debug/presets.json entries).
const MOMENTS = ['vindictas_emergency.rescue', 'hornet_fart.release', 'hornet_credit_boom.epidemic'];
it('record p16 chapter starts', async () => {
  const pick = process.env.PICK || 'first';
  const from = makeStory({ pick, preset: 'p15_complete' });
  const snaps = [];
  const seen = new Set();
  const snap = (id) => {
    const st = from.staging;
    // (copied now: the serialised state shares objects with the live session)
    snaps.push(JSON.parse(JSON.stringify({ id, map: from.map, player: st.player, story: from.session.story.serialize(), quests: from.session.quests.serialize(), inv: from.session.inventory.serialize() })));
  };
  snap('start');
  const sc = from.content.scripts;
  for (const name of ['get', 'require']) {
    if (typeof sc[name] !== 'function') continue;
    const orig = sc[name].bind(sc);
    sc[name] = (id) => {
      if (/^p16c\d+\.begin$/.test(id) && id !== 'p16c1.begin' && !seen.has(id)) { seen.add(id); snap(id); }
      return orig(id);
    };
  }
  await playPhase16(pick, { from, onStep: (ref) => { if (MOMENTS.includes(ref) && !seen.has(ref)) { seen.add(ref); snap(ref); } } });
  snap('end');
  fs.writeFileSync(`tmp/rec16.${pick}.json`, JSON.stringify(snaps, null, 1));
}, 120000);
