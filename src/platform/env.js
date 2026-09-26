/**
 * Build flags. Debug tools exist only in dev builds, or in builds made with
 * VITE_ENABLE_DEBUG=true. Written without optional chaining so Vite can
 * replace them with literals and drop the debug chunks from release builds.
 */
export const IS_DEV = import.meta.env.DEV === true;
export const DEBUG_ENABLED = IS_DEV || import.meta.env.VITE_ENABLE_DEBUG === 'true';
