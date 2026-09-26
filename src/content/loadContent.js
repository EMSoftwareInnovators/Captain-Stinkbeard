import { ContentDB } from './ContentDB.js';

/**
 * Bundles every JSON file under /data at build time (Vite glob import) and
 * builds the ContentDB. Works in the browser and in Vitest.
 */
export function loadContent() {
  const files = import.meta.glob('/data/**/*.json', { eager: true, import: 'default' });
  return new ContentDB(files);
}
