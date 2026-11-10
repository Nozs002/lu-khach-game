export type AtlasTile = Readonly<{ atlas: 'floor' | 'nature'; rect: readonly [number, number, number, number] }>;
export type MapVisuals = Readonly<{ ground: readonly AtlasTile[]; road: AtlasTile; obstacles: readonly AtlasTile[]; border: readonly AtlasTile[]; terrain: readonly number[] }>;
export type TileAtlas = Readonly<{ floor: HTMLImageElement; nature: HTMLImageElement }>;

/** Load the original sheets; never resize or rewrite the source PNGs. */
export async function loadTileAtlas(base: URL = new URL('../../../public/assets/tiles/', import.meta.url)): Promise<TileAtlas> {
  const load = async (name: string) => {
    const image = new Image();
    image.src = new URL(`${name}.png`, base).href;
    await image.decode();
    return image;
  };
  const [floor, nature] = await Promise.all([load('floor'), load('nature')]);
  return { floor, nature };
}

export function validateVisuals(v: MapVisuals): void {
  if (!v || !Array.isArray(v.ground) || !v.ground.length || !Array.isArray(v.obstacles) || !v.obstacles.length || !Array.isArray(v.border) || !v.border.length || !Array.isArray(v.terrain) || v.terrain.length !== 768 || v.terrain.some(n => !Number.isInteger(n) || n < -1 || n >= v.ground.length)) throw new Error('INVALID_MAP_VISUALS');
  for (const tile of [...v.ground, v.road, ...v.obstacles, ...v.border]) {
    if (!tile || !['floor', 'nature'].includes(tile.atlas) || !Array.isArray(tile.rect) || tile.rect.length !== 4 || tile.rect.some((n: number) => !Number.isInteger(n) || n < 0)) throw new Error('INVALID_ATLAS_TILE');
    const [x, y, w, h] = tile.rect, bounds = tile.atlas === 'floor' ? [352, 417] : [384, 336];
    if (!w || !h || x + w > bounds[0] || y + h > bounds[1]) throw new Error('ATLAS_TILE_OUT_OF_BOUNDS');
  }
}
