import { WORLD_GROUND, WORLD_GROUND_TILESET } from '../data/worldGround';
import { imageCache } from './ImageCache';

/** Draw only the visible ground cells. Camera coordinates use world pixels. */
export function drawGroundLayer(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    cameraY: number,
    viewportWidth: number,
    viewportHeight: number
): void {
    const atlas = imageCache.get(WORLD_GROUND_TILESET.image);
    if (!atlas.complete || !atlas.naturalWidth) return;
    const size = WORLD_GROUND.tileSize;
    const sourceSize = WORLD_GROUND_TILESET.sourceTileSize;
    const columns = WORLD_GROUND_TILESET.columns;
    const left = Math.max(0, Math.floor(cameraX / size));
    const top = Math.max(0, Math.floor(cameraY / size));
    const right = Math.min(WORLD_GROUND.width, Math.ceil((cameraX + viewportWidth) / size));
    const bottom = Math.min(WORLD_GROUND.height, Math.ceil((cameraY + viewportHeight) / size));
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, viewportWidth, viewportHeight);
    ctx.clip();
    ctx.imageSmoothingEnabled = false;
    for (let y = top; y < bottom; y++) {
        for (let x = left; x < right; x++) {
            const id = WORLD_GROUND.layers.ground[y][x];
            if (id === 0) continue;
            ctx.drawImage(atlas,
                (id % columns) * sourceSize, Math.floor(id / columns) * sourceSize,
                sourceSize, sourceSize,
                x * size - cameraX, y * size - cameraY, size, size);
        }
    }
    ctx.restore();
}
