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
  setValue: { setValue: 'string', value: 'any' },
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
  restage: { restage: 'string', async: 'boolean?' },
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
  // Story Phase 10: one of the Bling Bling King's cheap prizes falls onto a tile and lies there.
  token: { token: 'string', x: 'number', y: 'number', id: 'string?', max: 'number?', sfx: 'string?', async: 'boolean?' },
  clearTokens: { clearTokens: 'boolean' },
  tether: { tether: 'string', x: 'number?', y: 'number?' },
  respawn: { respawn: 'string' },
  fumeCloud: { fumeCloud: 'string', level: 'string?', x: 'number?', y: 'number?', w: 'number?', h: 'number?', grow: 'number?', remove: 'boolean?', async: 'boolean?' },
  vista: { vista: 'vista', mask: 'string?', fade: 'number?', caption: 'string?' },
  vistaEnd: { vistaEnd: 'boolean', fade: 'number?' },
  vistaMove: { vistaMove: 'string', x: 'number?', y: 'number?', duration: 'number?', ease: 'string?', alpha: 'number?', scale: 'number?', flip: 'boolean?', async: 'boolean?' },
  vistaFrame: { vistaFrame: 'string', frame: 'string' },
  vistaFx: { vistaFx: 'string', x: 'number', y: 'number', count: 'number?' },
  vistaShow: { vistaShow: 'string', visible: 'boolean?' },
  vistaSpin: { vistaSpin: 'string', speed: 'number?' },
  insert: { insert: 'string', caption: 'string?', hold: 'number?' },

  // --- Story Phase 3 -----------------------------------------------------------
  logbook: { logbook: 'log', entry: 'string?' },
  swapItem: { swapItem: 'item', to: 'item', bonus: 'number?', silent: 'boolean?' },
  tint: { tint: 'actor', color: 'string', duration: 'number?', async: 'boolean?' },
  sharks: { sharks: 'string', crowd: 'number?' },
  sharkEvent: { sharkEvent: 'string', x: 'number?', y: 'number?', duration: 'number?', async: 'boolean?' },
  repair: { repair: 'string', strikes: 'number?', title: 'string?', var: 'string?', speed: 'number?', zone: 'number?' },

  // --- Story Phase 4 -----------------------------------------------------------
  deadCenter: { deadCenter: 'string' },
  sharkstorm: { sharkstorm: 'string' },
  alarm: { alarm: 'number', where: 'string?', wait: 'boolean?' },
  course: { course: 'string', heading: 'number?', target: 'number?', to: 'number?', duration: 'number?', label: 'string?', async: 'boolean?' },
  sharkDuty: { sharkDuty: 'string' },
  tv: { tv: 'tv', mode: 'string?', panel: 'string?' },
  tvSet: { tvSet: 'tv', channel: 'number?', power: 'boolean?', state: 'string?' },
  tvProgram: { tvProgram: 'string', episode: 'string?', layer: 'string?', from: 'number?', to: 'number?', tv: 'tv?' },

  // --- Story Phases 11-13 ------------------------------------------------------
  sashTension: { sashTension: 'string', var: 'string?', releasedVar: 'string?' },
  dice: { dice: 'string', die: 'string?', result: 'number?', bounces: 'number?', to: 'number?', hops: 'number?', seconds: 'number?', face: 'number?', async: 'boolean?' },
  wear: { wear: 'item', to: 'string?' },

  // --- Story Phase 14 ---------------------------------------------------------------
  // Brogath Stability (data/story/stability): trigger | calm | set | add | anger | meter | incident | secure | settle.
  stability: { stability: 'string', subject: 'string?', id: 'string?', pressure: 'number?', on: 'boolean?', show: 'string?', quiet: 'boolean?' },
  // A reassurance prompt: the captain picks what to say from the subject's prompt set.
  reassure: { reassure: 'string', subject: 'string?', var: 'string?', prompt: 'line?' },
  // The Grand Bank: serve the next depositor in a queue, or a named one.
  bank: { bank: 'string', queue: 'string?', bankId: 'string?' },
  bankDeposit: { bankDeposit: 'string' },
  // The Grand Currency purchase (exactly once: ten real doubloons out, twenty thousand tokens in; never gold).
  grandCurrency: { grandCurrency: 'string', bankId: 'string?', silent: 'boolean?' },
};

/** Commands that may carry "async": true (start and continue without waiting). */
export const ASYNC_COMMANDS = new Set(['token', 'move', 'fly', 'hop', 'propFx', 'roll', 'moveSprite', 'fumeCloud', 'vistaMove', 'shake', 'emote', 'tint', 'sharkEvent', 'course', 'restage', 'dice']);

export const PARTICLE_BURSTS = ['coins', 'gems', 'splinters', 'feathers', 'sparkle', 'fume', 'odor', 'splash', 'dust', 'dishes', 'falldust', 'suitpuff', 'beans', 'confetti', 'papers', 'cards', 'oats', 'tokens', 'embers'];
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
