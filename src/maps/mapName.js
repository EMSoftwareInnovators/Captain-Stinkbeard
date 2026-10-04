import { evaluateCondition } from '../systems/conditions/conditions.js';

/**
 * What a room is called right now. A map (or a patch) may rename it as the
 * story changes it: "nameVariants": [{ "if": ..., "name": "Lower Hull Barracks" }],
 * first match wins (patches' variants come first). Works on a map definition
 * or a compiled map (meta.nameVariants).
 */
export function mapDisplayName(map, session) {
  if (!map) return '';
  const variants = map.nameVariants ?? map.meta?.nameVariants ?? [];
  const v = variants.find((n) => evaluateCondition(n.if, session));
  return v?.name ?? map.name ?? '';
}
