import { isTile, type MapData, type Tile } from './types.js';
import { validateVisuals } from './TileAtlas.js';

export class GridMap {
  readonly data: MapData;
  private readonly blocked: Set<number>;
  constructor(raw: unknown) {
    // Clone first: callers cannot invalidate collision/exit checks after validation.
    const d = structuredClone(raw) as MapData;
    if (!d || typeof d.id !== 'string' || !/^[a-z0-9-]+$/.test(d.id) || d.width !== 32 || d.height !== 24 || d.tileSize !== 24 || !Array.isArray(d.collisions)) throw new Error('INVALID_MAP');
    if (d.collisions.some(n => !Number.isInteger(n) || n < 0 || n >= 768) || new Set(d.collisions).size !== d.collisions.length) throw new Error('INVALID_COLLISIONS');
    this.blocked = new Set(d.collisions);
    this.data = d;
    if (d.visuals !== undefined) validateVisuals(d.visuals);
    const z = d.safeZone;
    if (!isTile(z) || !Number.isSafeInteger(z.width) || !Number.isSafeInteger(z.height) || z.width < 1 || z.height < 1 || !this.inside(z) || !this.inside({ x: z.x + z.width - 1, y: z.y + z.height - 1 })) throw new Error('INVALID_SAFE_ZONE');
    for (let y = z.y; y < z.y + z.height; y++) for (let x = z.x; x < z.x + z.width; x++) if (!this.walkable({ x, y })) throw new Error('BLOCKED_SAFE_ZONE');
    if (!this.walkable(d.spawn) || d.spawn.x < z.x || d.spawn.y < z.y || d.spawn.x >= z.x + z.width || d.spawn.y >= z.y + z.height) throw new Error('INVALID_SPAWN');
    if (!Array.isArray(d.exits) || d.exits.length !== 4) throw new Error('INVALID_EXITS');
    const expected: Record<string, Tile[]> = { left: [{ x: 0, y: 11 }, { x: 0, y: 12 }], right: [{ x: 31, y: 11 }, { x: 31, y: 12 }], top: [{ x: 15, y: 0 }, { x: 16, y: 0 }], bottom: [{ x: 15, y: 23 }, { x: 16, y: 23 }] };
    const sides = new Set<string>();
    for (const e of d.exits) {
      if (!e || !expected[e.side] || sides.has(e.side) || typeof e.targetMap !== 'string' || !/^[a-z0-9-]+$/.test(e.targetMap) || !Array.isArray(e.cells) || !Array.isArray(e.arrivals) || e.cells.length !== 2 || e.arrivals.length !== 2) throw new Error('INVALID_EXIT');
      sides.add(e.side);
      e.cells.forEach((c: Tile, i: number) => { if (!isTile(c) || c.x !== expected[e.side][i].x || c.y !== expected[e.side][i].y || !this.walkable(c) || !isTile(e.arrivals[i]) || e.arrivals[i].x < 1 || e.arrivals[i].x > 30 || e.arrivals[i].y < 1 || e.arrivals[i].y > 22) throw new Error('INVALID_EXIT'); });
    }
    const gates = new Set(d.exits.flatMap(e => e.cells.map((c: Tile) => c.y * 32 + c.x)));
    for (let y = 0; y < 24; y++) for (let x = 0; x < 32; x++) if ((x === 0 || x === 31 || y === 0 || y === 23) && this.walkable({ x, y }) !== gates.has(y * 32 + x)) throw new Error('INVALID_BOUNDARY');
    if (gates.has(d.spawn.y * 32 + d.spawn.x)) throw new Error('PORTAL_SPAWN');
    const reached = new Set<number>([d.spawn.y * 32 + d.spawn.x]), queue: Tile[] = [d.spawn];
    for (let i = 0; i < queue.length; i++) {
      const p = queue[i];
      if (gates.has(p.y * 32 + p.x)) continue;
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
        const n = { x: p.x + dx, y: p.y + dy }, key = n.y * 32 + n.x;
        if (this.walkable(n) && !reached.has(key)) { reached.add(key); queue.push(n); }
      }
    }
    if ([...gates].some(gate => !reached.has(gate))) throw new Error('UNREACHABLE_EXIT');
    const freeze = (v: unknown): void => { if (v && typeof v === 'object') { Object.values(v).forEach(freeze); Object.freeze(v); } }; freeze(d);
  }
  inside(p: Tile): boolean { return isTile(p) && p.x >= 0 && p.y >= 0 && p.x < 32 && p.y < 24; }
  walkable(p: Tile): boolean { return this.inside(p) && !this.blocked.has(p.y * 32 + p.x); }
  static validateWorld(maps: ReadonlyMap<string, GridMap>): void {
    for (const [id, map] of maps) {
      if (id !== map.data.id) throw new Error('INVALID_MAP_KEY');
      for (const e of map.data.exits) { const target = maps.get(e.targetMap); if (!target || e.arrivals.some(p => !target.walkable(p))) throw new Error('INVALID_MAP_LINK'); }
    }
  }
}
