/**
 * Watches the confirm button around an impact moment (scene clock, ms).
 *
 * Resolves with { delta, early }: `delta` is press time minus impact time,
 * or null if nothing was pressed before the window closed. A press more than
 * `lockoutMs` before the impact is a whiff (`early: true`) and ends tracking,
 * so mashing never pays off.
 */
export function trackPress(scene, { impactAt, lockoutMs = 250, closeMs = 150, action = 'confirm' }) {
  // Debug/test aid (F2 menu): press automatically with a fixed offset.
  const auto = scene.game.app.flags.autoTiming;
  return new Promise((resolve) => {
    const hook = () => {
      const now = scene.time.now;
      const input = scene.controls;
      if (auto !== null && auto !== undefined) {
        if (now >= impactAt + auto) finish({ delta: auto, early: false });
        return;
      }
      if (input.pressed(action)) {
        input.consume(action);
        const delta = now - impactAt;
        finish(delta < -lockoutMs ? { delta: null, early: true } : { delta, early: false });
        return;
      }
      if (now > impactAt + closeMs) finish({ delta: null, early: false });
    };
    const finish = (result) => {
      scene.removeFrameHook(hook);
      resolve(result);
    };
    scene.addFrameHook(hook);
  });
}
