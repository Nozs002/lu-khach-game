import type { GridMap } from './GridMap.js';
import type { Entity, Tile } from './types.js';
import { loadTileAtlas, type AtlasTile, type TileAtlas } from './TileAtlas.js';

export class MapRenderer {
  private tiles?: TileAtlas;
  private readonly backgrounds = new WeakMap<GridMap, HTMLCanvasElement>();
  constructor(private readonly ctx: CanvasRenderingContext2D, tiles?: TileAtlas) {
    this.tiles = tiles;
    if (!tiles) void loadTileAtlas().then(loaded => { this.tiles = loaded; }).catch(() => { /* Host may supply its own atlas base; retain fallback until then. */ });
  }
  private background(map: GridMap): HTMLCanvasElement {
    const cached = this.backgrounds.get(map); if (cached) return cached;
    const layer = document.createElement('canvas'); layer.width = 768; layer.height = 576;
    const c = layer.getContext('2d')!; c.imageSmoothingEnabled = false;
    const d = map.data, visuals = d.visuals!;
    const tile = (sprite: AtlasTile, x: number, y: number) => {
      const [sx, sy, sw, sh] = sprite.rect;
      c.drawImage(this.tiles![sprite.atlas], sx, sy, sw, sh, x * 24, y * 24, 24, 24);
    };
    for (let y = 0; y < 24; y++) for (let x = 0; x < 32; x++) {
      const index = y * 32 + x, variant = visuals.terrain[index];
      tile(visuals.ground[Math.max(0, variant)], x, y);
      if (variant === -1 && map.walkable({ x, y })) tile(visuals.road, x, y);
    }
    for (let y = 0; y < 24; y++) for (let x = 0; x < 32; x++) if (!map.walkable({ x, y })) {
      const sprites = x === 0 || x === 31 || y === 0 || y === 23 ? visuals.border : visuals.obstacles;
      tile(sprites[(x * 7 + y * 11) % sprites.length], x, y);
    }
    const z = d.safeZone;
    c.fillStyle = '#72dccc1c'; c.fillRect(z.x * 24, z.y * 24, z.width * 24, z.height * 24);
    c.strokeStyle = '#b6e9bb'; c.lineWidth = 1; c.setLineDash([4, 5]); c.strokeRect(z.x * 24 + 2, z.y * 24 + 2, z.width * 24 - 4, z.height * 24 - 4); c.setLineDash([]);
    this.backgrounds.set(map, layer); return layer;
  }
  draw(map: GridMap, entities: readonly Entity[], path: readonly Tile[], target: Tile | null, selfId: string): void {
    const c = this.ctx, d = map.data;
    c.clearRect(0, 0, 768, 576);
    c.imageSmoothingEnabled = false;
    if (this.tiles && d.visuals) c.drawImage(this.background(map), 0, 0);
    else {
    for (let y = 0; y < 24; y++) for (let x = 0; x < 32; x++) {
      const safe = x >= d.safeZone.x && y >= d.safeZone.y && x < d.safeZone.x + d.safeZone.width && y < d.safeZone.y + d.safeZone.height;
      c.fillStyle = !map.walkable({ x, y }) ? '#273d43' : safe ? '#486b53' : (x + y) % 2 ? '#8ba579' : '#91ac80';
      c.fillRect(x * 24, y * 24, 24, 24);
    }
    }
    for (const e of d.exits) for (const p of e.cells) {
      c.fillStyle = '#72dccc88'; c.fillRect(p.x * 24 + 1, p.y * 24 + 1, 22, 22);
      c.strokeStyle = '#d4fff3'; c.lineWidth = 2; c.strokeRect(p.x * 24 + 2, p.y * 24 + 2, 20, 20);
      c.fillStyle = '#163d39'; c.font = 'bold 18px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(({ left: '←', right: '→', top: '↑', bottom: '↓' })[e.side], p.x * 24 + 12, p.y * 24 + 12);
    }
    c.fillStyle = '#f5e9a8a0'; for (const p of path) c.fillRect(p.x * 24 + 9, p.y * 24 + 9, 6, 6);
    if (target) { c.strokeStyle = '#fff1a6'; c.lineWidth = 2; c.strokeRect(target.x * 24 + 3, target.y * 24 + 3, 18, 18); }
    for (const e of entities) if (e.mapId === d.id) {
      c.beginPath(); c.fillStyle = e.id === selfId ? '#ffe49b' : '#b4c9ff'; c.arc(e.x * 24 + 12, e.y * 24 + 12, 8, 0, Math.PI * 2); c.fill();
    }
  }
}
