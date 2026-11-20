import { WORLD } from '../data/tiledWorld';
import manifest from '../../public/assets/manifest.json';
import { imageCache } from './ImageCache';

const appearances: Record<string, { sprite: string; sourceRect: number[] }> = manifest.npcTypes;
const directions: Record<string, number> = { down: 0, up: 1, left: 2, right: 3 };

export function preloadNpcs(): void {
    for (const npc of WORLD.npcs) {
        const appearance = appearances[npc.characterId];
        if (appearance) imageCache.get(`/assets/${appearance.sprite}`);
    }
}

export function drawNpcs(
    ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number,
    viewportWidth: number, viewportHeight: number, tileSize: number
): void {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (const npc of WORLD.npcs) {
        const size = 16;
        const x = npc.x * tileSize + (tileSize - size) / 2 - cameraX;
        const y = npc.y * tileSize + tileSize - size - cameraY;
        if (x + size < 0 || y + size < 0 || x >= viewportWidth || y >= viewportHeight) continue;

        const appearance = appearances[npc.characterId];
        const image = appearance ? imageCache.get(`/assets/${appearance.sprite}`) : undefined;
        if (image?.complete && image.naturalWidth > 0) {
            const [sx, sy, width, height] = appearance.sourceRect;
            const direction = directions[npc.facing] ?? 0;
            ctx.drawImage(image, sx + direction * width, sy, width, height, x, y, size, size);
        } else {
            // Remain visible while the sprite is loading or if an asset fails.
            ctx.fillStyle = '#70d8c0';
            ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
        }

        ctx.font = '10px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#101810';
        ctx.strokeText(npc.displayName, x + size / 2, y - 5);
        ctx.fillStyle = '#9ef0d5';
        ctx.fillText(npc.displayName, x + size / 2, y - 5);
    }
    ctx.restore();
}
