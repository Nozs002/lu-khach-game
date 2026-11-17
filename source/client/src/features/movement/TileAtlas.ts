export type AtlasTile = Readonly<{ atlas: 'floor' | 'nature' | 'water'; rect: readonly [number, number, number, number] }>;
export type Decoration = Readonly<{ sprite: AtlasTile; x: number; y: number; width: number; height: number; rotation?: number }>;
export type MapVisuals = Readonly<{ ground: readonly AtlasTile[]; road: AtlasTile; obstacles: readonly AtlasTile[]; border: readonly AtlasTile[]; terrain: readonly number[]; decorations?: readonly Decoration[] }>;
export type TileAtlas = Readonly<Record<AtlasTile['atlas'], HTMLImageElement>>;

/** Load the original sheets; never resize or rewrite the source PNGs. */
export async function loadTileAtlas(base: URL = new URL('../../../public/assets/tiles/', import.meta.url)): Promise<TileAtlas> {
  const load = async (name: string) => {
    const image = new Image();
    image.src = new URL(`${name}.png`, base).href;
    await image.decode();
    return image;
  };
  const [floor, nature, water] = await Promise.all([load('floor'), load('nature'), load('water')]);
  return { floor, nature, water };
}

export function validateVisuals(v: MapVisuals): void {
  if (!v || !Array.isArray(v.ground) || !v.ground.length || !Array.isArray(v.obstacles) || !v.obstacles.length || !Array.isArray(v.border) || !v.border.length || !Array.isArray(v.terrain) || v.terrain.length !== 1248 || v.terrain.some(n => !Number.isInteger(n) || n < -1 || n >= v.ground.length)) throw new Error('INVALID_MAP_VISUALS');
  if (v.decorations !== undefined && (!Array.isArray(v.decorations) || v.decorations.some(d => !d || ![d.x, d.y, d.width, d.height].every(Number.isFinite) || (d.rotation !== undefined && ![0,90,180,270].includes(d.rotation)) || d.width <= 0 || d.height <= 0 || d.width > 52 || d.height > 24 || d.x < -4 || d.y < -4 || d.x >= 52 || d.y >= 24))) throw new Error('INVALID_DECORATION');
  const sizes = { floor: [352, 417], nature: [384, 336], water: [448, 272] };
  for (const tile of [...v.ground, v.road, ...v.obstacles, ...v.border, ...(v.decorations ?? []).map(d => d.sprite)]) {
    if (!tile || !Object.hasOwn(sizes, tile.atlas) || !Array.isArray(tile.rect) || tile.rect.length !== 4 || tile.rect.some((n: number) => !Number.isInteger(n) || n < 0)) throw new Error('INVALID_ATLAS_TILE');
    const [x, y, w, h] = tile.rect, bounds = sizes[tile.atlas as AtlasTile['atlas']];
    if (!w || !h || x + w > bounds[0] || y + h > bounds[1]) throw new Error('ATLAS_TILE_OUT_OF_BOUNDS');
  }
}
