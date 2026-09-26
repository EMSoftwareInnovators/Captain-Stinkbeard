import fs from 'node:fs';
import path from 'node:path';
import { ContentDB } from '../../src/content/ContentDB.js';

/** Loads /data the same way the game does (import.meta.glob), but from Node. */
export function loadContentFromDisk(root = process.cwd()) {
  const files = {};
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.json')) files[`/${path.relative(root, full).split(path.sep).join('/')}`] = JSON.parse(fs.readFileSync(full, 'utf8'));
    }
  };
  walk(path.join(root, 'data'));
  return new ContentDB(files);
}
