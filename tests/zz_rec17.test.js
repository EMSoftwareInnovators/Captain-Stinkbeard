import fs from 'node:fs';
import { it } from 'vitest';
import { playPhase17 } from './phase17Play.js';
import { makeStory } from './storyHarness.js';

// Records the state at each Phase 17 chapter start (and nine mid-chapter moments) for the debug presets
// (scratchpad presets17.py turns tmp/rec17.first.json into data/debug/presets.json entries).
const MOMENTS = ['the_forbidden_door.plume', 'grand_restraint.restraint', 'fire_sharkstorm.deploy', 'thunderbottom.defend', 'grand_fart_chamber.after',
  'beard_exhales.procedures', 'beard_joint.grog', 'beard_joint.spiral', 'coffin_sock_catastrophe.release'];
it('record p17 chapter starts', async () => {
  const pick = process.env.PICK || 'first';
  const from = makeStory({ pick, preset: 'p16_complete' });
  const snaps = [];
  const seen = new Set();
  const snap = (id) => {
    const st = from.staging;
    // (copied now: the serialised state shares objects with the live session)
    snaps.push(JSON.parse(JSON.stringify({ id, map: from.map, player: st.player, story: from.session.story.serialize(), quests: from.session.quests.serialize(),
      inv: from.session.inventory.serialize(), party: from.session.party.serialize() })));
  };
  snap('start');
  const sc = from.content.scripts;
  for (const name of ['get', 'require']) {
    if (typeof sc[name] !== 'function') continue;
    const orig = sc[name].bind(sc);
    sc[name] = (id) => {
      if (/^p17c\d+\.begin$/.test(id) && id !== 'p17c1.begin' && !seen.has(id)) { seen.add(id); snap(id); }
      return orig(id);
    };
  }
  await playPhase17(pick, { from, onStep: (ref) => { if (MOMENTS.includes(ref) && !seen.has(ref)) { seen.add(ref); snap(ref); } } });
  snap('end');
  fs.mkdirSync('tmp', { recursive: true });
  fs.writeFileSync(`tmp/rec17.${pick}.json`, JSON.stringify(snaps, null, 1));
}, 300000);
