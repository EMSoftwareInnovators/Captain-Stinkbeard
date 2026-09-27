/**
 * Declarative schemas for every script command.
 *
 * Content validation uses these (no engine needed) to reject unknown commands,
 * missing/typoed parameters and dangling references. Implementations are
 * registered separately by the systems/scenes that own them.
 *
 * Param types: string number boolean array object any condition steps label
 *   flag flags item quest objective map npc actor script sfx music ambience
 *   encounter shop character dir speaker line emote vista
 * A trailing "?" marks a param optional. The command's own key is listed too.
 */
export const COMMAND_SCHEMAS = {
  // --- flow -------------------------------------------------------------
  goto: { goto: 'label' },
  end: { end: 'boolean' },
  call: { call: 'script' },
  wait: { wait: 'number' },
  parallel: { parallel: 'array' },
  choice: { choice: 'array', prompt: 'line?', cancel: 'number?' },

  // --- dialogue / presentation -----------------------------------------
  say: { say: 'line', speaker: 'speaker?', expr: 'string?', name: 'string?' },
  narrate: { narrate: 'string' },
  close: { close: 'boolean' },
  tutorial: { tutorial: 'string', title: 'string?' },
  banner: { banner: 'string', sub: 'string?' },

  // --- story state --------------------------------------------------------
  setFlag: { setFlag: 'flags' },
  clearFlag: { clearFlag: 'flags' },
  setVar: { setVar: 'string', value: 'number' },
  addVar: { addVar: 'string', value: 'number' },
  giveItem: { giveItem: 'item', count: 'number?', silent: 'boolean?' },
  takeItem: { takeItem: 'item', count: 'number?', silent: 'boolean?' },
  giveGold: { giveGold: 'number', silent: 'boolean?' },
  takeGold: { takeGold: 'number', silent: 'boolean?' },
  startQuest: { startQuest: 'quest', silent: 'boolean?' },
  completeObjective: { completeObjective: 'objective' },
  advanceObjective: { advanceObjective: 'objective', amount: 'number?' },
  completeQuest: { completeQuest: 'quest' },
  heal: { heal: 'string' },
  giveXp: { giveXp: 'number' },
  event: { event: 'string' },
  markObject: { markObject: 'string', set: 'object' },
  joinParty: { joinParty: 'character' },
  leaveParty: { leaveParty: 'character' },
  save: { save: 'string' },

  // --- audio --------------------------------------------------------------
  sfx: { sfx: 'sfx', volume: 'number?', rate: 'number?', pan: 'number?' },
  music: { music: 'music', fade: 'number?' },
  ambience: { ambience: 'ambience' },

  // --- world / cutscene (implemented by the exploration scene) ------------
  move: { move: 'actor', path: 'array?', to: 'array?', speed: 'any?', face: 'dir?', async: 'boolean?' },
  face: { face: 'actor', dir: 'string' },
  anim: { anim: 'actor', name: 'string', duration: 'number?' },
  emote: { emote: 'actor', icon: 'emote', duration: 'number?', async: 'boolean?' },
  spawn: { spawn: 'npc', id: 'string?', x: 'number', y: 'number', facing: 'dir?' },
  despawn: { despawn: 'actor' },
  place: { place: 'actor', x: 'number', y: 'number', facing: 'dir?' },
  camera: { camera: 'string', x: 'number?', y: 'number?', actor: 'actor?', duration: 'number?' },
  shake: { shake: 'number', duration: 'number?', to: 'number?', async: 'boolean?' },
  flash: { flash: 'string', duration: 'number?' },
  fade: { fade: 'string', duration: 'number?', color: 'string?' },
  transition: { transition: 'map', spawn: 'string?', x: 'number?', y: 'number?', facing: 'dir?', then: 'script?', hidePlayer: 'boolean?', fade: 'number?', keepMusic: 'boolean?', noAutosave: 'boolean?' },
  showObject: { showObject: 'string' },
  hideObject: { hideObject: 'string' },
  effect: { effect: 'string', actor: 'actor?', x: 'number?', y: 'number?' },
  battle: { battle: 'encounter', win: 'steps?', lose: 'steps?' },
  shop: { shop: 'shop' },

  // --- set-pieces (Phase 2 onward) ------------------------------------------
  fly: { fly: 'actor', to: 'array', duration: 'number?', arc: 'number?', land: 'boolean?', alt: 'number?', from: 'array?', fromAlt: 'number?', async: 'boolean?' },
  hop: { hop: 'actor', height: 'number?', duration: 'number?', async: 'boolean?' },
  bark: { bark: 'string', text: 'string', duration: 'number?', shout: 'boolean?', x: 'number?', y: 'number?' },
  burst: { burst: 'string', actor: 'actor?', x: 'number?', y: 'number?', count: 'number?', speed: 'any?', up: 'number?', dir: 'number?', cone: 'number?', spread: 'number?' },
  propFx: { propFx: 'string', prop: 'string?', area: 'array?', duration: 'number?', intensity: 'number?', frame: 'string?', dx: 'number?', dy: 'number?', async: 'boolean?' },
  roll: { roll: 'number', duration: 'number?', async: 'boolean?' },
  sprite: { sprite: 'string', frame: 'string', x: 'number', y: 'number', depth: 'number?', flip: 'boolean?', anim: 'string?', alpha: 'number?', bob: 'number?', below: 'boolean?' },
  moveSprite: { moveSprite: 'string', x: 'number?', y: 'number?', duration: 'number?', ease: 'string?', alpha: 'number?', scale: 'number?', angle: 'number?', async: 'boolean?' },
  spriteFrame: { spriteFrame: 'string', frame: 'string' },
  removeSprite: { removeSprite: 'string' },
  tether: { tether: 'string', x: 'number?', y: 'number?' },
  respawn: { respawn: 'string' },
  fumeCloud: { fumeCloud: 'string', level: 'string?', x: 'number?', y: 'number?', w: 'number?', h: 'number?', grow: 'number?', remove: 'boolean?', async: 'boolean?' },
  vista: { vista: 'vista', mask: 'string?', fade: 'number?', caption: 'string?' },
  vistaEnd: { vistaEnd: 'boolean', fade: 'number?' },
  vistaMove: { vistaMove: 'string', x: 'number?', y: 'number?', duration: 'number?', ease: 'string?', alpha: 'number?', scale: 'number?', flip: 'boolean?', async: 'boolean?' },
  vistaFrame: { vistaFrame: 'string', frame: 'string' },
  vistaFx: { vistaFx: 'string', x: 'number', y: 'number', count: 'number?' },
  vistaShow: { vistaShow: 'string', visible: 'boolean?' },
  insert: { insert: 'string', caption: 'string?', hold: 'number?' },
};

/** Commands that may carry "async": true (start and continue without waiting). */
export const ASYNC_COMMANDS = new Set(['move', 'fly', 'hop', 'propFx', 'roll', 'moveSprite', 'fumeCloud', 'vistaMove', 'shake', 'emote']);

export const PARTICLE_BURSTS = ['coins', 'gems', 'splinters', 'feathers', 'sparkle', 'fume', 'odor', 'splash', 'dust', 'dishes'];
export const PROP_FX = ['jiggle', 'swing', 'fall', 'frame'];

/** Keys that may appear on any step without being a command. */
export const STEP_MODIFIERS = new Set(['if', 'then', 'else']);

export const EMOTES = ['exclaim', 'question', 'ellipsis', 'anger', 'sweat', 'note', 'heart', 'zzz'];

export function isCommentKey(key) {
  return key.startsWith('//') || key.startsWith('_');
}

/** Returns the command name of an object step, or throws a helpful error. */
export function commandNameOf(step, known = COMMAND_SCHEMAS) {
  const names = Object.keys(step).filter((k) => !STEP_MODIFIERS.has(k) && !isCommentKey(k) && k in known);
  if (names.length === 1) return names[0];
  if (names.length > 1) {
    // Some parameters share a name with a command ("face" on move, "fade" on
    // transition, "spawn" on transition, "anim" on sprite). The command is
    // the one whose schema lists every other command-named key.
    const owners = names.filter((n) => names.every((other) => other === n || other in (known[n] ?? {})));
    if (owners.length === 1) return owners[0];
  }
  if (names.length === 0) {
    if ('then' in step || 'else' in step) return 'if';
    const unknown = Object.keys(step).filter((k) => !STEP_MODIFIERS.has(k) && !isCommentKey(k));
    throw new Error(`Unknown script command in step ${JSON.stringify(step)} (keys: ${unknown.join(', ')})`);
  }
  throw new Error(`Script step has several commands (${names.join(', ')}): ${JSON.stringify(step)}`);
}
