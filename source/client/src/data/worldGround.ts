import world from '../../../common/maps/world-ground.json';
import tileset from '../../../common/maps/world-ground-tileset.json';

/** Ground only: tile IDs describe art, never collision or spawn rules. */
export const WORLD_GROUND = world;
export const WORLD_GROUND_TILESET = tileset;

// Temporary bridge for the current server's M0-local pixel coordinates.
export const M0_WORLD_ORIGIN = { x: 12, y: 258 } as const;

// Ground review cameras, not player teleports or runtime portal destinations.
export const WORLD_VIEWS = [
    { id: 'M0', name: 'M0 · Bến Cỏ', ...M0_WORLD_ORIGIN },
    { id: 'M1', name: 'M1 · Đồng cỏ', x: 48, y: 264 },
    { id: 'M2', name: 'M2 · Rừng Qua Suối', x: 82, y: 258 },
    { id: 'M3', name: 'M3 · Trạm Gác Cũ', x: 86, y: 234 },
    { id: 'M5', name: 'M5 · Rừng Sâu', x: 90, y: 160 },
    { id: 'M6', name: 'M6 · Bờ Biển', x: 16, y: 176 },
    { id: 'M7', name: 'M7 · Sa Mạc', x: 104, y: 42 }
] as const;

export function getGroundTile(x: number, y: number): number | undefined {
    if (!Number.isInteger(x) || !Number.isInteger(y)
        || x < 0 || y < 0 || x >= world.width || y >= world.height) return undefined;
    return world.layers.ground[y][x];
}
