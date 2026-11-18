import { WORLD } from '../data/tiledWorld';
import { imageCache } from './ImageCache';

const tilesetsByDescendingGid = [...WORLD.tilesets].reverse();

export function drawWorld(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, width: number, height: number, foreground: boolean) {
    const size = WORLD.tileSize;
    for (const layer of WORLD.layers) {
        if (!layer.visible || (layer.name === 'foreground') !== foreground) continue;
        ctx.save();
        ctx.globalAlpha = layer.opacity;
        for (let y = Math.max(0, Math.floor(cameraY / size)); y < Math.min(WORLD.height, Math.ceil((cameraY + height) / size)); y++) {
            for (let x = Math.max(0, Math.floor(cameraX / size)); x < Math.min(WORLD.width, Math.ceil((cameraX + width) / size)); x++) {
                const raw = layer.data[y * WORLD.width + x];
                const gid = raw & 0x0fffffff;
                if (!gid) continue;
                const tileset = tilesetsByDescendingGid.find(t => t.firstgid <= gid);
                if (!tileset) continue;
                const image = imageCache.get(tileset.image);
                if (!image.complete || !image.naturalWidth) continue;
                const local = gid - tileset.firstgid;
                ctx.save();
                ctx.translate(x * size - cameraX + size / 2, y * size - cameraY + size / 2);
                ctx.scale(raw & 0x80000000 ? -1 : 1, raw & 0x40000000 ? -1 : 1);
                if (raw & 0x20000000) ctx.transform(0, 1, 1, 0, 0, 0);
                ctx.drawImage(image,
                    tileset.margin + (local % tileset.columns) * (tileset.tilewidth + tileset.spacing),
                    tileset.margin + Math.floor(local / tileset.columns) * (tileset.tileheight + tileset.spacing),
                    tileset.tilewidth, tileset.tileheight, -size / 2, -size / 2, size, size);
                ctx.restore();
            }
        }
        ctx.restore();
    }
}
