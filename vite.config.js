import { defineConfig, loadEnv } from 'vite';

/**
 * Release builds never ship the F2 debug overlay or the test hooks. The code
 * paths are already dead (see src/platform/env.js); this also drops the
 * orphaned lazy chunks Rollup would otherwise still emit.
 */
function stripDebugChunks(keep) {
  return {
    name: 'strip-debug-chunks',
    apply: 'build',
    generateBundle(_options, bundle) {
      if (keep) return;
      for (const [file, chunk] of Object.entries(bundle)) {
        if (chunk.type !== 'chunk' || chunk.isEntry) continue;
        // Lazy debug entries, and chunks shared only between them (presets).
        const debugOnly = chunk.moduleIds.length > 0 && chunk.moduleIds.every((id) => id.includes('/src/debug/'));
        if ((chunk.isDynamicEntry && chunk.facadeModuleId?.includes('/src/debug/')) || debugOnly) delete bundle[file];
      }
    },
  };
}

// Vite handles the dev server and production build; Vitest reuses this config
// so `import.meta.glob` content discovery works identically in tests.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: './',
    server: { port: 5173, strictPort: false },
    preview: { port: 4173 },
    plugins: [stripDebugChunks(env.VITE_ENABLE_DEBUG === 'true')],
    build: {
      target: 'es2022',
      outDir: 'dist',
      assetsInlineLimit: 0,
      // One bundle: the engine plus every story phase's content JSON (the art
      // and music are generated from code at startup). About 0.8 MB gzipped.
      chunkSizeWarningLimit: 3500,
    },
    test: {
      include: ['tests/**/*.test.js'],
      environment: 'node',
    },
  };
});
