import { defineConfig } from 'vitest/config';

// Vite handles the dev server and production build; Vitest reuses this config
// so `import.meta.glob` content discovery works identically in tests.
export default defineConfig({
  base: './',
  server: { port: 5173, strictPort: false },
  preview: { port: 4173 },
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2500,
  },
  test: {
    include: ['tests/**/*.test.js'],
    environment: 'node',
  },
});
