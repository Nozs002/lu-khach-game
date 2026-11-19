import { WORLD, WORLD_VIEWS } from '../data/tiledWorld';
import { drawWorld } from './TiledWorldRenderer';
import { getCharacter, getCharacterSpriteSource, getCharacterWalkSheet } from '../data/characters';
import type { MapData } from '../data/maps';
import type { Player } from '../data/player';
import type { GridPoint } from '../pathfinding/AStarPathfinder';
import { imageCache } from './ImageCache';

const SPRITE_SIZE = 16;
const WALK_FRAME_DURATION_MS = 125; // Thời gian mỗi frame hoạt ảnh (ms)

// Cột 0: xuống, Cột 1: lên, Cột 2: trái, Cột 3: phải
const enum DirectionColumn {
    Down = 0,
    Up = 1,
    Left = 2,
    Right = 3
}

interface RenderPosition {
    x: number;
    y: number;
    fromX: number;
    fromY: number;
    targetX: number;
    targetY: number;
    startedAt: number;
    direction: DirectionColumn;
    animFrame: number;
    animElapsedMs: number;
    lastTickAt: number;
}

export class CanvasRenderer {
    private ctx: CanvasRenderingContext2D;
    private gridVisible = true;
    private followPlayer = true;
    private cameraX = 0;
    private cameraY = 0;
    private map: MapData | null = null;
    private readonly renderPositions = new Map<string, RenderPosition>();

    constructor(private canvas: HTMLCanvasElement) {
        this.ctx = canvas.getContext('2d')!;
        canvas.width = 32 * WORLD.tileSize;
        canvas.height = 24 * WORLD.tileSize;
        this.ctx.imageSmoothingEnabled = false;
        WORLD.tilesets.forEach(t => imageCache.get(t.image));
    }

    setGridVisible(visible: boolean): void { this.gridVisible = visible; }

    setGroundView(id: string): void {
        this.followPlayer = id === 'spawn';
        const view = WORLD_VIEWS.find(view => view.id === id);
        if (!view) return;
        this.cameraX = Math.max(0, Math.min(view.x * WORLD.tileSize, WORLD.width * WORLD.tileSize - this.canvas.width));
        this.cameraY = Math.max(0, Math.min(view.y * WORLD.tileSize, WORLD.height * WORLD.tileSize - this.canvas.height));
    }

    public getCanvas(): HTMLCanvasElement {
        return this.canvas;
    }

    public getTileAtClientPosition(clientX: number, clientY: number): GridPoint | null {
        const map = this.map;
        const rect = this.canvas.getBoundingClientRect();
        const clientWidth = this.canvas.clientWidth;
        const clientHeight = this.canvas.clientHeight;
        if (!map || clientWidth === 0 || clientHeight === 0) return null;

        const canvasX = (clientX - rect.left - this.canvas.clientLeft) * this.canvas.width / clientWidth;
        const canvasY = (clientY - rect.top - this.canvas.clientTop) * this.canvas.height / clientHeight;
        if (canvasX < 0 || canvasX >= this.canvas.width || canvasY < 0 || canvasY >= this.canvas.height) {
            return null;
        }

        const x = Math.floor((canvasX + this.cameraX) / map.tileSize);
        const y = Math.floor((canvasY + this.cameraY) / map.tileSize);
        if (x < 0 || x >= map.width || y < 0 || y >= map.height) return null;
        return { x, y };
    }

    render(
        players: Map<string, Player>,
        myId: string | null,
        previewPath: readonly GridPoint[] = [],
        map: MapData | null = null,
        timestamp: number = performance.now()
    ): void {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (!map) return;

        if (this.map !== map) {
            this.map = map;
            this.renderPositions.clear();
            this.cameraX = 0;
            this.cameraY = 0;
        }

        const activeIds = new Set<string>();
        players.forEach(player => {
            activeIds.add(player.id);
            this.updateRenderPosition(player, timestamp);
        });
        this.renderPositions.forEach((_position, id) => {
            if (!activeIds.has(id)) this.renderPositions.delete(id);
        });

        const myPosition = myId ? this.renderPositions.get(myId) : undefined;
        if (this.followPlayer) this.updateCamera(myPosition, map);
        this.ctx.fillStyle = '#17251b';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        drawWorld(this.ctx, this.cameraX, this.cameraY, this.canvas.width, this.canvas.height, false);
        if (this.gridVisible) this.drawGrid(map);
        this.drawPreview(previewPath, map, myPosition);
        this.drawPlayers(players, myId, map);
        drawWorld(this.ctx, this.cameraX, this.cameraY, this.canvas.width, this.canvas.height, true);
    }

    private resolveDirection(dx: number, dy: number, fallback: DirectionColumn): DirectionColumn {
        if (dx === 0 && dy === 0) return fallback;
        if (Math.abs(dx) > Math.abs(dy)) {
            return dx < 0 ? DirectionColumn.Left : DirectionColumn.Right;
        }
        return dy < 0 ? DirectionColumn.Up : DirectionColumn.Down;
    }

    private updateRenderPosition(player: Player, now: number): void {
        let position = this.renderPositions.get(player.id);
        if (!position) {
            position = {
                x: player.x,
                y: player.y,
                fromX: player.x,
                fromY: player.y,
                targetX: player.x,
                targetY: player.y,
                startedAt: now,
                direction: DirectionColumn.Down,
                animFrame: 0,
                animElapsedMs: 0,
                lastTickAt: now
            };
            this.renderPositions.set(player.id, position);
            return;
        }

        const deltaMs = Math.max(0, now - position.lastTickAt);
        position.lastTickAt = now;

        this.interpolate(position, now);

        if (position.targetX !== player.x || position.targetY !== player.y) {
            const dx = player.x - position.x;
            const dy = player.y - position.y;
            position.direction = this.resolveDirection(dx, dy, position.direction);
            position.fromX = position.x;
            position.fromY = position.y;
            position.targetX = player.x;
            position.targetY = player.y;
            position.startedAt = now;
        }

        const isMoving = position.x !== position.targetX || position.y !== position.targetY;
        if (isMoving) {
            position.animElapsedMs += deltaMs;
            if (position.animElapsedMs >= WALK_FRAME_DURATION_MS) {
                const steps = Math.floor(position.animElapsedMs / WALK_FRAME_DURATION_MS);
                position.animFrame = (position.animFrame + steps) % 4;
                position.animElapsedMs %= WALK_FRAME_DURATION_MS;
            }
        } else {
            // Đứng yên: dừng đổi frame, giữ nguyên hướng nhìn gần nhất
            position.animFrame = 0;
            position.animElapsedMs = 0;
        }
    }

    private interpolate(position: RenderPosition, now: number): void {
        const progress = Math.min(1, Math.max(0, (now - position.startedAt) / 200));
        position.x = position.fromX + (position.targetX - position.fromX) * progress;
        position.y = position.fromY + (position.targetY - position.fromY) * progress;
        if (progress === 1) {
            position.fromX = position.targetX;
            position.fromY = position.targetY;
        }
    }

    private updateCamera(player: RenderPosition | undefined, map: MapData): void {
        if (!player) return;

        const maxX = Math.max(0, map.width * map.tileSize - this.canvas.width);
        const maxY = Math.max(0, map.height * map.tileSize - this.canvas.height);
        const centerX = (player.x + 0.5) * map.tileSize - this.canvas.width / 2;
        const centerY = (player.y + 0.5) * map.tileSize - this.canvas.height / 2;
        this.cameraX = Math.max(0, Math.min(centerX, maxX));
        this.cameraY = Math.max(0, Math.min(centerY, maxY));
    }

    private drawGrid(map: MapData): void {
        const tileSize = map.tileSize;
        const firstX = Math.floor(this.cameraX / tileSize) * tileSize - this.cameraX;
        const firstY = Math.floor(this.cameraY / tileSize) * tileSize - this.cameraY;
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        this.ctx.lineWidth = 1;
        for (let x = firstX; x <= this.canvas.width; x += tileSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        for (let y = firstY; y <= this.canvas.height; y += tileSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    private drawPreview(path: readonly GridPoint[], map: MapData, player?: RenderPosition): void {
        if (path.length === 0) return;
        const tileSize = map.tileSize;
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(46, 204, 113, 0.28)';
        this.ctx.strokeStyle = '#2ecc71';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([4, 4]);
        this.ctx.beginPath();

        if (player) {
            this.ctx.moveTo(
                (player.x + 0.5) * tileSize - this.cameraX,
                (player.y + 0.5) * tileSize - this.cameraY
            );
        }
        path.forEach((point, index) => {
            const centerX = (point.x + 0.5) * tileSize - this.cameraX;
            const centerY = (point.y + 0.5) * tileSize - this.cameraY;
            this.ctx.fillRect(point.x * tileSize - this.cameraX, point.y * tileSize - this.cameraY, tileSize, tileSize);
            if (!player && index === 0) this.ctx.moveTo(centerX, centerY);
            else this.ctx.lineTo(centerX, centerY);
        });
        this.ctx.stroke();

        const destination = path[path.length - 1];
        this.ctx.setLineDash([]);
        this.ctx.strokeStyle = '#f1c40f';
        this.ctx.strokeRect(
            destination.x * tileSize - this.cameraX + 2,
            destination.y * tileSize - this.cameraY + 2,
            tileSize - 4,
            tileSize - 4
        );
        this.ctx.restore();
    }

    private drawPlayers(players: Map<string, Player>, myId: string | null, map: MapData): void {
        players.forEach(player => {
            const position = this.renderPositions.get(player.id);
            if (!position) return;
            const isMe = player.id === myId;
            const characterId = (player.characterId && player.characterId !== 'undefined')
                ? player.characterId
                : 'knight';
            const character = getCharacter(characterId);
            const walkSheet = getCharacterWalkSheet(characterId);
            const isMoving = position.x !== position.targetX || position.y !== position.targetY;
            const source = isMoving ? walkSheet.source : getCharacterSpriteSource(characterId);
            const img = imageCache.get(source);
            const pixelX = position.x * map.tileSize + (map.tileSize - SPRITE_SIZE) / 2 - this.cameraX;
            const pixelY = position.y * map.tileSize + map.tileSize - SPRITE_SIZE - this.cameraY;

            if (img.complete && img.naturalWidth !== 0) {
                if (isMoving) {
                    const frameWidth = img.naturalWidth / walkSheet.cols;
                    const frameHeight = img.naturalHeight / walkSheet.rows;
                    const sx = position.direction * frameWidth;
                    const sy = position.animFrame * frameHeight;
                    this.ctx.drawImage(
                        img,
                        sx,
                        sy,
                        frameWidth,
                        frameHeight,
                        pixelX,
                        pixelY,
                        SPRITE_SIZE,
                        SPRITE_SIZE
                    );
                } else {
                    const frame = character.spriteFrame;
                    this.ctx.drawImage(
                        img,
                        frame.x,
                        frame.y,
                        frame.width,
                        frame.height,
                        pixelX,
                        pixelY,
                        SPRITE_SIZE,
                        SPRITE_SIZE
                    );
                }
            } else {
                this.ctx.fillStyle = isMe ? '#f1c40f' : '#e74c3c';
                this.ctx.fillRect(pixelX, pixelY, SPRITE_SIZE, SPRITE_SIZE);
            }

            if (isMe) {
                this.ctx.strokeStyle = '#f1c40f';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(pixelX, pixelY, SPRITE_SIZE, SPRITE_SIZE);
            }

            this.ctx.fillStyle = isMe ? '#f1c40f' : '#ffffff';
            this.ctx.font = 'bold 12px "Courier New", monospace';
            this.ctx.textAlign = 'center';
            this.ctx.shadowColor = '#000000';
            this.ctx.shadowBlur = 4;
            const displayName = player.name + (isMe ? ' (Bạn)' : '');
            this.ctx.fillText(displayName, pixelX + SPRITE_SIZE / 2, pixelY - 8);
            this.ctx.shadowBlur = 0;
        });
    }
}