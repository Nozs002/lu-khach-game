export type Tile = Readonly<{ x: number; y: number }>;
export type Zone = Tile & Readonly<{ width: number; height: number }>;
export type Exit = Readonly<{ side: 'left' | 'right' | 'top' | 'bottom'; cells: readonly Tile[]; targetMap: string; arrivals: readonly Tile[] }>;
export type MapData = Readonly<{ id: string; width: number; height: number; tileSize: number; collisions: readonly number[]; safeZone: Zone; spawn: Tile; exits: readonly Exit[]; visuals?: import('./TileAtlas.js').MapVisuals }>;
export type Entity = Tile & Readonly<{ id: string; mapId: string }>;
export type Snapshot = Readonly<{ tick: number; entities: readonly Entity[] }>;
export const sameTile = (a: Tile, b: Tile): boolean => a.x === b.x && a.y === b.y;
export const isTile = (v: unknown): v is Tile => typeof v === 'object' && v !== null && Number.isSafeInteger((v as Tile).x) && Number.isSafeInteger((v as Tile).y);
