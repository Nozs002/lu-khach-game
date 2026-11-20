import { ExplorationMap, explorationStorageKey } from '../data/ExplorationMap';
import type { MapData } from '../data/maps';
import type { Player } from '../data/player';
import { WORLD } from '../data/tiledWorld';
import { imageCache } from './ImageCache';
import { drawWorld } from './TiledWorldRenderer';

export interface MapViewport { x: number; y: number; width: number; height: number }

export class MinimapRenderer {
    private readonly ctx: CanvasRenderingContext2D;
    private readonly terrain = document.createElement('canvas');
    private readonly discovered = document.createElement('canvas');
    private map: MapData | null = null;
    private exploration: ExplorationMap | null = null;
    private storageKey = '';
    private dirty = false;
    private saveTimer: ReturnType<typeof setTimeout> | null = null;
    private lastViewport = '';
    private expanded = false;
    private viewportWidth = 32;
    private viewportHeight = 24;
    private imageState = '';
    private lastDraw = -Infinity;
    private readonly onPageHide = () => this.save();

    constructor(private readonly canvas: HTMLCanvasElement, private readonly status: HTMLElement) {
        this.ctx = canvas.getContext('2d')!;
        window.addEventListener('pagehide', this.onPageHide);
    }

    setMap(map: MapData, playerName: string): void {
        this.save();
        this.dirty = false;
        this.map = map;
        this.storageKey = explorationStorageKey(map, playerName);
        let saved: string | null = null;
        try { saved = localStorage.getItem(this.storageKey); } catch { /* Discovery still works without storage. */ }
        this.exploration = new ExplorationMap(map.width, map.height, saved);
        this.lastViewport = '';
        this.imageState = '';
        this.lastDraw = -Infinity;
        this.terrain.width = this.discovered.width = map.width * 2;
        this.terrain.height = this.discovered.height = map.height * 2;
        this.resizeCanvas();
        this.rebuildTerrain();
        this.rebuildDiscovery();
    }

    render(player: Player | undefined, viewport: MapViewport, timestamp: number): void {
        const map = this.map;
        const exploration = this.exploration;
        if (!map || !exploration || !player || timestamp - this.lastDraw < 100) return;
        this.lastDraw = timestamp;
        this.viewportWidth = viewport.width;
        this.viewportHeight = viewport.height;
        this.resizeCanvas();
        let changed = false;
        const viewKey = `${viewport.x},${viewport.y},${viewport.width},${viewport.height}`;
        if (viewKey !== this.lastViewport) {
            this.lastViewport = viewKey;
            changed = exploration.revealViewport(viewport.x, viewport.y, viewport.width, viewport.height);
            if (changed) {
                this.dirty = true;
                if (this.saveTimer === null) this.saveTimer = setTimeout(() => this.save(), 1000);
            }
        }
        const imageState = WORLD.tilesets.map(t => {
            const image = imageCache.get(t.image);
            return image.complete && image.naturalWidth > 0 ? '1' : '0';
        }).join('');
        if (imageState !== this.imageState) {
            this.imageState = imageState;
            this.rebuildTerrain();
            changed = true;
        }
        if (changed) this.rebuildDiscovery();
        const ctx = this.ctx;
        ctx.imageSmoothingEnabled = false;
        // Keep the current game frame in the middle of a 3 x 3 frame overview.
        // Do not clamp at world edges: the padding preserves that centered frame.
        const originX = this.expanded ? 0 : viewport.x - viewport.width;
        const originY = this.expanded ? 0 : viewport.y - viewport.height;
        ctx.fillStyle = '#080d12';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.drawImage(this.discovered, -originX * 2, -originY * 2);
        // The outline matches the displayed game viewport and its newly discovered area.
        ctx.strokeStyle = '#ffffff80';
        ctx.lineWidth = 1;
        ctx.strokeRect((viewport.x - originX) * 2, (viewport.y - originY) * 2, viewport.width * 2, viewport.height * 2);
        ctx.fillStyle = '#f1c40f';
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc((player.x + 0.5 - originX) * 2, (player.y + 0.5 - originY) * 2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        this.status.textContent = `Đã khám phá ${exploration.percentage.toFixed(1)}% · Vị trí ${player.x}, ${player.y}`;
    }

    setExpanded(expanded: boolean): void {
        this.expanded = expanded;
        this.resizeCanvas();
        this.lastDraw = -Infinity;
    }

    private resizeCanvas(): void {
        if (!this.map) return;
        const width = this.expanded ? this.map.width * 2 : Math.ceil(this.viewportWidth * 6);
        const height = this.expanded ? this.map.height * 2 : Math.ceil(this.viewportHeight * 6);
        if (this.canvas.width !== width) this.canvas.width = width;
        if (this.canvas.height !== height) this.canvas.height = height;
    }

    private rebuildTerrain(): void {
        if (!this.map) return;
        const ctx = this.terrain.getContext('2d')!;
        ctx.fillStyle = '#263e2b';
        ctx.fillRect(0, 0, this.terrain.width, this.terrain.height);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.scale(2 / this.map.tileSize, 2 / this.map.tileSize);
        const width = this.map.width * this.map.tileSize;
        const height = this.map.height * this.map.tileSize;
        drawWorld(ctx, 0, 0, width, height, false);
        drawWorld(ctx, 0, 0, width, height, true);
        ctx.restore();
    }

    private rebuildDiscovery(): void {
        if (!this.map || !this.exploration) return;
        const ctx = this.discovered.getContext('2d')!;
        ctx.fillStyle = '#080d12';
        ctx.fillRect(0, 0, this.discovered.width, this.discovered.height);
        // Copy only discovered row segments; hidden terrain never reaches the minimap.
        for (let y = 0; y < this.map.height; y++) {
            let x = 0;
            while (x < this.map.width) {
                if (!this.exploration.isExplored(x, y)) { x++; continue; }
                const start = x;
                while (x < this.map.width && this.exploration.isExplored(x, y)) x++;
                ctx.drawImage(this.terrain, start * 2, y * 2, (x - start) * 2, 2,
                    start * 2, y * 2, (x - start) * 2, 2);
            }
        }
    }

    private save(): void {
        if (this.saveTimer !== null) clearTimeout(this.saveTimer);
        this.saveTimer = null;
        if (!this.dirty || !this.exploration) return;
        try {
            localStorage.setItem(this.storageKey, this.exploration.serialize());
            this.dirty = false;
        } catch { /* A full/disabled storage must not interrupt gameplay. */ }
    }

    destroy(): void {
        this.save();
        window.removeEventListener('pagehide', this.onPageHide);
    }
}
