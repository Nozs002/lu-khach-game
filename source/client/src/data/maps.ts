export interface SafeZone {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}

export interface MapData {
    readonly id: string;
    readonly width: number;
    readonly height: number;
    readonly tileSize: number;
    readonly tiles: readonly (readonly number[])[];
    readonly safeZone: SafeZone;
}

export interface MapDefinition extends MapData {
    readonly name: string;
    readonly desc: string;
}

// Danh mục tĩnh tùy chọn; map runtime được nhận từ server.
export const MAPS: readonly MapDefinition[] = [];
