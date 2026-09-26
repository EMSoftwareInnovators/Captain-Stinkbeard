import { describe, expect, it } from 'vitest';
import { loadContent } from '../src/content/loadContent.js';
import { validateContent } from '../src/content/validateContent.js';
import { compileMap } from '../src/maps/compileMap.js';

describe('shipped game content', () => {
  const db = loadContent();
  const result = validateContent(db);

  it('loads every data file into a registry', () => {
    expect(db.loadErrors).toEqual([]);
    expect(db.maps.size).toBeGreaterThanOrEqual(6);
    expect(db.npcs.size).toBeGreaterThanOrEqual(8);
    expect(db.quests.size).toBeGreaterThanOrEqual(2);
  });

  it('passes cross-reference validation with no errors', () => {
    expect(result.errors).toEqual([]);
  });

  it('has no unused story flags', () => {
    expect(result.warnings.filter((w) => w.includes('never referenced'))).toEqual([]);
  });

  it('compiles every map with consistent dimensions and spawns', () => {
    for (const def of db.maps.list()) {
      const model = compileMap(def, db.tilesets.get(def.tileset), db.props);
      expect(model.width * model.height).toBe(model.ground.length);
      expect(Object.keys(model.spawns).length).toBeGreaterThan(0);
    }
  });
});
