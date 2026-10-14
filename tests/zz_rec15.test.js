import fs from 'node:fs';
import { it } from 'vitest';
import { playPhase15 } from './phase15Play.js';
import { makeStory } from './storyHarness.js';

it('record p15 chapter starts', async () => {
  const pick = process.env.PICK || 'first';
  const from = makeStory({ pick, preset: 'p14_complete' });
  const snaps = [];
  const seen = new Set();
  const snap = (id) => {
    const st = from.staging;
    snaps.push({ id, map: from.map, player: st.player, story: from.session.story.serialize(), quests: from.session.quests.serialize(), inv: from.session.inventory.serialize() });
  };
  snap('start');
  const sc = from.content.scripts;
  for (const name of ['get', 'require']) {
    if (typeof sc[name] !== 'function') continue;
    const orig = sc[name].bind(sc);
    sc[name] = (id) => {
      if (/^p15c\d+\.begin$/.test(id) && id !== 'p15c1.begin' && !seen.has(id)) { seen.add(id); snap(id); }
      return orig(id);
    };
  }
  const { s } = await playPhase15(pick, { from });
  snap('end');
  fs.writeFileSync(`tmp/rec15.${pick}.json`, JSON.stringify(snaps, null, 1));
}, 120000);
