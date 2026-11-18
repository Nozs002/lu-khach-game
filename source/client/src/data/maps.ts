import village from './m0.generated.json';

export interface MapObject {
    readonly x: number;
    readonly y: number;
    readonly kind: string;
    readonly tiles: readonly (readonly number[])[];
}

export interface MapDefinition {
    readonly id: string;
    readonly name: string;
    readonly desc: string;
    readonly width: number;
    readonly height: number;
    readonly tileSize: number;
    readonly atlas: string;
    readonly atlasColumns: number;
    readonly sourceTileSize: number;
    readonly ground: readonly (readonly number[])[];
    readonly collision: readonly (readonly number[])[];
    readonly objects: readonly MapObject[];
    readonly spawns: readonly { readonly x: number; readonly y: number }[];
    readonly matrix: readonly (readonly number[])[];
    readonly tileTypes: Readonly<Record<string, {
        readonly name: string;
        readonly ground: string;
        readonly walkable: boolean;
        readonly spawn: boolean;
    }>>;
}

export const START_MAP: MapDefinition = {
    ...village,
    desc: 'Map khởi đầu · Khu vực an toàn',
};

export const MAPS: readonly MapDefinition[] = [START_MAP];

/** Tile coordinates, independent of screen scale and sprite appearance. */
export function isWalkable(map: MapDefinition, x: number, y: number): boolean {
    return Number.isInteger(x) && Number.isInteger(y)
        && x >= 0 && y >= 0 && x < map.width && y < map.height
        && map.tileTypes[map.matrix[y][x]].walkable;
}
