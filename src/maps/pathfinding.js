/**
 * Breadth-first path search on the tile grid (4-directional). Maps are small,
 * so BFS is fast and always finds the shortest route.
 * @param {(x:number, y:number) => boolean} blocked
 * @returns {Array<'up'|'down'|'left'|'right'>|null}
 */
export function findPath(width, height, from, to, blocked, maxNodes = 4000) {
  if (from.x === to.x && from.y === to.y) return [];
  const key = (x, y) => y * width + x;
  const prev = new Map([[key(from.x, from.y), null]]);
  const queue = [from];
  const dirs = [
    ['up', 0, -1],
    ['down', 0, 1],
    ['left', -1, 0],
    ['right', 1, 0],
  ];
  let head = 0;
  while (head < queue.length && prev.size < maxNodes) {
    const cur = queue[head++];
    for (const [dir, dx, dy] of dirs) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const k = key(nx, ny);
      if (prev.has(k)) continue;
      const isGoal = nx === to.x && ny === to.y;
      if (!isGoal && blocked(nx, ny)) continue;
      prev.set(k, { from: cur, dir });
      if (isGoal) {
        const path = [];
        let node = { x: nx, y: ny };
        let link = prev.get(k);
        while (link) {
          path.unshift(link.dir);
          node = link.from;
          link = prev.get(key(node.x, node.y));
        }
        return path;
      }
      queue.push({ x: nx, y: ny });
    }
  }
  return null;
}
