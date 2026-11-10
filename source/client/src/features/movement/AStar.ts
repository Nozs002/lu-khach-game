import { GridMap } from './GridMap.js';
import { sameTile, type Tile } from './types.js';

/** Deterministic four-way A*: ties use insertion order; result excludes start. */
export function findPath(map: GridMap, start: Tile, goal: Tile): Tile[] | null {
  if (!map.walkable(start) || !map.walkable(goal)) return null;
  if (sameTile(start, goal)) return [];
  const key = (p: Tile) => p.y * 32 + p.x;
  const h = (p: Tile) => Math.abs(p.x - goal.x) + Math.abs(p.y - goal.y);
  const open = [{ p: start, g: 0, f: h(start), order: 0 }];
  const cost = new Map([[key(start), 0]]), parent = new Map<number, Tile>();
  let order = 1;
  while (open.length) {
    open.sort((a, b) => a.f - b.f || a.order - b.order);
    const n = open.shift()!;
    if (n.g !== cost.get(key(n.p))) continue;
    if (sameTile(n.p, goal)) {
      const result: Tile[] = []; let p = goal;
      while (!sameTile(p, start)) { result.push(p); p = parent.get(key(p))!; }
      return result.reverse();
    }
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const p = { x: n.p.x + dx, y: n.p.y + dy }, g = n.g + 1;
      // A portal is an endpoint, never a shortcut along a map boundary.
      if (!map.walkable(p) || (!sameTile(p, goal) && map.data.exits.some(e => e.cells.some(c => sameTile(c, p)))) || g >= (cost.get(key(p)) ?? Infinity)) continue;
      cost.set(key(p), g); parent.set(key(p), n.p); open.push({ p, g, f: g + h(p), order: order++ });
    }
  }
  return null;
}
