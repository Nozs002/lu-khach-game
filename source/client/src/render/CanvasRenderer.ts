import { getCharacter, getCharacterSpriteSource } from '../data/characters';
import type { Player } from '../data/player';
import { imageCache } from './ImageCache';
import { WORLD as WORLD_GROUND, WORLD_VIEWS } from '../data/tiledWorld';
import { drawWorld } from './TiledWorldRenderer';

export class CanvasRenderer {
    private ctx: CanvasRenderingContext2D;
    private gridVisible = true;
    private followPlayer = true;
    private cameraX = WORLD_GROUND.spawns[0].x * WORLD_GROUND.tileSize;
    private cameraY = WORLD_GROUND.spawns[0].y * WORLD_GROUND.tileSize;

    constructor(private canvas: HTMLCanvasElement) {
        this.ctx = canvas.getContext('2d')!;
        canvas.width = 32 * WORLD_GROUND.tileSize;
        canvas.height = 24 * WORLD_GROUND.tileSize;
        this.ctx.imageSmoothingEnabled = false;
        WORLD_GROUND.tilesets.forEach(t => imageCache.get(t.image));
    }

    setGridVisible(visible: boolean) {
        this.gridVisible = visible;
    }

    setGroundView(id: string) {
        this.followPlayer = id === 'spawn';
        const view = WORLD_VIEWS.find(view => view.id === id);
        if (!view) return;
        const size = WORLD_GROUND.tileSize;
        this.cameraX = Math.max(0, Math.min(view.x * size, WORLD_GROUND.width * size - this.canvas.width));
        this.cameraY = Math.max(0, Math.min(view.y * size, WORLD_GROUND.height * size - this.canvas.height));
    }

    private drawMap() {
        this.ctx.fillStyle = '#17251b';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        drawWorld(this.ctx, this.cameraX, this.cameraY, this.canvas.width, this.canvas.height, false);
        if (this.gridVisible) {
            const size = WORLD_GROUND.tileSize;
            this.ctx.strokeStyle = 'rgba(10, 25, 10, 0.22)';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            for (let x = -(this.cameraX % size); x < this.canvas.width; x += size) {
                this.ctx.moveTo(x + 0.5, 0);
                this.ctx.lineTo(x + 0.5, this.canvas.height);
            }
            for (let y = -(this.cameraY % size); y < this.canvas.height; y += size) {
                this.ctx.moveTo(0, y + 0.5);
                this.ctx.lineTo(this.canvas.width, y + 0.5);
            }
            this.ctx.stroke();
        }
    }

    render(players: Map<string, Player>, myId: string | null) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const me = myId ? players.get(myId) : undefined;
        if (me && this.followPlayer) {
            this.cameraX = Math.max(0, Math.min(me.x - this.canvas.width / 2, WORLD_GROUND.width * WORLD_GROUND.tileSize - this.canvas.width));
            this.cameraY = Math.max(0, Math.min(me.y - this.canvas.height / 2, WORLD_GROUND.height * WORLD_GROUND.tileSize - this.canvas.height));
        }
        this.drawMap();

        // Vẽ từng người chơi
        players.forEach((player) => {
            const isMe = player.id === myId;
            const character = getCharacter(player.characterId);
            const source = getCharacterSpriteSource(player.characterId);
            const img = imageCache.get(source);
            const size = WORLD_GROUND.tileSize;
            // Server coordinates are world pixels from the Tiled map.
            const screenX = player.x - this.cameraX;
            const screenY = player.y - this.cameraY;
            if (screenX + size < 0 || screenY + size < 0
                || screenX >= this.canvas.width || screenY >= this.canvas.height) return;

            // Draw a character in one map cell.
            if (img.complete && img.naturalWidth !== 0) {
                const frame = character.spriteFrame;
                this.ctx.drawImage(img, frame.x, frame.y, frame.width, frame.height,
                    screenX, screenY, size, size);
            } else {
                // Ô màu dự phòng trong lúc ảnh đang nạp
                this.ctx.fillStyle = isMe ? '#f1c40f' : '#e74c3c';
                this.ctx.fillRect(screenX, screenY, size, size);
            }

            // Viền vàng quanh nhân vật của bản thân
            if (isMe) {
                this.ctx.strokeStyle = '#f1c40f';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(screenX, screenY, size, size);
            }

            // Vẽ Username ngay chính giữa trên đầu nhân vật
            this.ctx.fillStyle = isMe ? '#f1c40f' : '#ffffff';
            this.ctx.font = 'bold 12px "Courier New", monospace';
            this.ctx.textAlign = 'center';
            this.ctx.shadowColor = '#000000';
            this.ctx.shadowBlur = 4;

            const displayName = player.name + (isMe ? ' (Bạn)' : '');
            this.ctx.fillText(displayName, screenX + size / 2, screenY - 6);
            this.ctx.shadowBlur = 0;
        });
        drawWorld(this.ctx, this.cameraX, this.cameraY, this.canvas.width, this.canvas.height, true);
    }
}
