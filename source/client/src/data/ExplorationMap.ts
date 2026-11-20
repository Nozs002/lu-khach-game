import type { MapData } from './maps';

/** Stores every world tile that has appeared in the game viewport. */
export class ExplorationMap {
    private readonly explored: Uint8Array;
    private count = 0;

    constructor(readonly width: number, readonly height: number, saved?: string | null) {
        this.explored = new Uint8Array(width * height);
        if (saved?.length === this.explored.length && /^[01]+$/.test(saved)) {
            for (let i = 0; i < saved.length; i++) {
                this.explored[i] = saved[i] === '1' ? 1 : 0;
                this.count += this.explored[i];
            }
        }
    }

    get percentage(): number { return this.count / this.explored.length * 100; }

    isExplored(x: number, y: number): boolean {
        return x >= 0 && y >= 0 && x < this.width && y < this.height
            && this.explored[y * this.width + x] === 1;
    }

    revealViewport(x: number, y: number, width: number, height: number): boolean {
        if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return false;
        const left = Math.max(0, Math.floor(x));
        const top = Math.max(0, Math.floor(y));
        const right = Math.min(this.width, Math.ceil(x + width));
        const bottom = Math.min(this.height, Math.ceil(y + height));
        let changed = false;
        for (let row = top; row < bottom; row++) {
            for (let col = left; col < right; col++) {
                const index = row * this.width + col;
                if (this.explored[index]) continue;
                this.explored[index] = 1;
                this.count++;
                changed = true;
            }
        }
        return changed;
    }

    serialize(): string { return this.explored.join(''); }
}

export function explorationStorageKey(map: MapData, playerId: string): string {
    // A changed collision layout must not inherit discoveries from an old world.
    let hash = 2166136261;
    for (const row of map.tiles) for (const tile of row) hash = Math.imul(hash ^ tile, 16777619);
    return `lu-khach:exploration:v2:${encodeURIComponent(playerId)}:${map.id}:${map.width}x${map.height}:${hash >>> 0}`;
}
