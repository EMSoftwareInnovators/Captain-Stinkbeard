/** Build flags. Debug tools exist only in dev builds (or when explicitly enabled). */
export const IS_DEV = import.meta.env?.DEV === true;
export const DEBUG_ENABLED = IS_DEV || import.meta.env?.VITE_ENABLE_DEBUG === 'true';
