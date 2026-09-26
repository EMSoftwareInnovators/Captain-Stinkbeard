import { describe, expect, it } from 'vitest';
import { ContentDB } from '../src/content/ContentDB.js';
import { validateContent } from '../src/content/validateContent.js';

const SHIPPED = import.meta.glob('/data/**/*.json', { eager: true, import: 'default' });

/** Validates the shipped content after `mutate(files)` breaks something on purpose. */
function validateWith(mutate) {
  const files = structuredClone(SHIPPED);
  mutate(files);
  const db = new ContentDB(files);
  return [...db.loadErrors, ...validateContent(db).errors].join('\n');
}

const find = (list, id) => list.find((e) => e.id === id);

describe('content validation fails loudly', () => {
  it('accepts the shipped content', () => {
    expect(validateWith(() => {})).toBe('');
  });

  it('catches duplicate ids', () => {
    const errors = validateWith((f) => {
      const items = f['/data/items/consumables.json'];
      items.push({ ...items[0] });
    });
    expect(errors).toMatch(/duplicate/i);
    expect(errors).toMatch(/hardtack/);
  });

  it('catches dialogue that jumps to a missing node', () => {
    const errors = validateWith((f) => {
      f['/data/dialogue/prologue/hale.json']['hale.rounds_intro'].start.push({ goto: 'nowhere' });
    });
    expect(errors).toMatch(/nowhere/);
  });

  it('catches unknown speakers and expressions', () => {
    const errors = validateWith((f) => {
      f['/data/dialogue/prologue/hale.json']['hale.rats_hint'].push('ghost: Boo.', 'hale[giddy]: Wheee.');
    });
    expect(errors).toMatch(/ghost/);
    expect(errors).toMatch(/giddy/);
  });

  it('catches quest objectives that point at nothing', () => {
    const errors = validateWith((f) => {
      const q = find(f['/data/quests/prologue.json'], 'captains_rounds');
      q.objectives[0].target = 'nobody_at_all';
      q.objectives[4].after.push('no_such_objective');
    });
    expect(errors).toMatch(/nobody_at_all/);
    expect(errors).toMatch(/no_such_objective/);
  });

  it('catches encounters with missing enemies and missing reward items', () => {
    const errors = validateWith((f) => {
      f['/data/encounters/prologue.json'][0].enemies.push('kraken');
      find(f['/data/quests/prologue.json'], 'rats_in_the_hold').rewards.items.push({ id: 'golden_spoon', count: 1 });
    });
    expect(errors).toMatch(/kraken/);
    expect(errors).toMatch(/golden_spoon/);
  });

  it('catches broken map transitions', () => {
    const errors = validateWith((f) => {
      const map = f['/data/maps/ship/galley.json'];
      find(map.objects, 'to_deck').to = { map: 'main_deck', spawn: 'crows_nest' };
      find(map.objects, 'to_crew').to = { map: 'davy_jones_locker', spawn: 'x' };
    });
    expect(errors).toMatch(/crows_nest/);
    expect(errors).toMatch(/davy_jones_locker/);
  });

  it('catches invalid equipment', () => {
    const errors = validateWith((f) => {
      const gear = f['/data/items/equipment.json'];
      gear.push({ id: 'hat_of_holding', name: 'Hat', type: 'equipment', slot: 'head', stats: { charisma: 5 }, value: 1 });
      find(f['/data/characters/party.json'], 'blackbeard').startEquipment.weapon = 'sea_boots';
    });
    expect(errors).toMatch(/hat_of_holding/);
    expect(errors).toMatch(/sea_boots/);
  });

  it('catches undeclared story flags used by scripts', () => {
    const errors = validateWith((f) => {
      f['/data/dialogue/prologue/hale.json']['hale.rats_hint'].push({ setFlag: 'totally_new_flag' });
    });
    expect(errors).toMatch(/totally_new_flag/);
  });
});
