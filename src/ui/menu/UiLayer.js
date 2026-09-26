/** Tracks a group of game objects so a page can redraw or tear down in one call. */
export class UiLayer {
  constructor(scene) {
    this.scene = scene;
    this.objects = [];
  }

  add(obj) {
    this.objects.push(obj);
    return obj;
  }

  clear() {
    for (const o of this.objects) o.destroy();
    this.objects = [];
  }
}
