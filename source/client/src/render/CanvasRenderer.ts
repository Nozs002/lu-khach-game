import { WORLD, WORLD_VIEWS } from '../data/tiledWorld';
import { drawWorld } from './TiledWorldRenderer';
import { getCharacterAttackSheet, getCharacterWalkSheet } from '../data/characters';
import { getItemDefinition, type WorldItem } from '../data/items';
import type { MapData } from '../data/maps';
import type { Player } from '../data/player';
import type { GridPoint } from '../pathfinding/AStarPathfinder';
import { imageCache } from './ImageCache';
import { drawNpcs, preloadNpcs } from './NpcRenderer';
import type { CombatView } from '../features/combat/CombatView';

interface ChatBubble {
    text: string;
    expiresAt: number;
}

interface FloatingText {
    gridX: number;
    gridY: number;
    text: string;
    color: string;
    createdAt: number;
    durationMs: number;
}

const SPRITE_SIZE = 16;
const WALK_FRAME_DURATION_MS = 125; // Thời gian mỗi frame hoạt ảnh đi bộ (ms)
export const ATTACK_FRAME_COUNT = 4;
export const ATTACK_FRAME_DURATION_MS = 75; // 4 frame * 75ms = 300ms cho một đòn đánh
const EDGE_PAN_MARGIN_PX = 48; // Vùng mép trong của canvas kích hoạt lia camera (tọa độ canvas)
const EDGE_PAN_SPEED_PX_PER_SEC = 520; // Tốc độ lia camera tối đa (pixel/giây)
const MAX_FRAME_DELTA_MS = 100; // Giới hạn delta time tránh giật khung hình khi chuyển tab

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
    attackStartedAt: number | null;
    attackFlipX: boolean;
}

/**
 * Tính chỉ số frame (0..frameCount-1) của hoạt ảnh đánh theo timestamp.
 * Trả về null khi chưa đánh hoặc đã chạy xong toàn bộ frame.
 */
export function computeAttackFrame(
    attackStartedAt: number | null,
    now: number,
    frameCount: number = ATTACK_FRAME_COUNT,
    frameDurationMs: number = ATTACK_FRAME_DURATION_MS
): number | null {
    if (attackStartedAt === null) return null;
    const elapsed = now - attackStartedAt;
    if (elapsed < 0) return 0;
    const frameIndex = Math.floor(elapsed / frameDurationMs);
    if (frameIndex >= frameCount) return null;
    return frameIndex;
}

export class CanvasRenderer {
    private ctx: CanvasRenderingContext2D;
    private gridVisible = true;
    private followPlayer = true;
    private freeCamera = false;
    private cameraX = 0;
    private cameraY = 0;
    private map: MapData | null = null;
    private lastRenderAt: number | null = null;
    private pointerCanvasX: number | null = null;
    private pointerCanvasY: number | null = null;
    private onCameraModeChange?: (freeCamera: boolean) => void;
    private readonly renderPositions = new Map<string, RenderPosition>();
    private readonly chatBubbles = new Map<string, ChatBubble>();
    private floatingTexts: FloatingText[] = [];
    private combatView: CombatView | null = null;

    public setCombatView(view: CombatView | null): void {
        this.combatView = view;
    }

    public getRenderedPlayerPosition(id: string): GridPoint | undefined {
        const position = this.renderPositions.get(id);
        return position ? { x: position.x, y: position.y } : undefined;
    }

    public triggerPlayerAttack(
        attackerId: string,
        targetPoint?: GridPoint,
        now: number = performance.now()
    ): boolean {
        const position = this.renderPositions.get(attackerId);
        if (!position) return false;

        if (targetPoint) {
            const dx = targetPoint.x - position.x;
            const dy = targetPoint.y - position.y;
            if (dx !== 0 || dy !== 0) {
                position.direction = this.resolveDirection(dx, dy, position.direction);
            }
            position.attackFlipX = dx < 0;
        } else {
            position.attackFlipX = position.direction === DirectionColumn.Left;
        }

        // Đặt lại mốc bắt đầu để khởi động lại từ frame 0 nếu nhận DAMAGE liên tiếp
        position.attackStartedAt = now;
        return true;
    }

    public getWorldPointAtClientPosition(clientX: number, clientY: number): GridPoint | null {
        if (!this.map) return null;
        const point = this.clientToCanvasPoint(clientX, clientY);
        if (!point) return null;
        const x = (point.x + this.cameraX) / this.map.tileSize;
        const y = (point.y + this.cameraY) / this.map.tileSize;
        return x >= 0 && y >= 0 && x < this.map.width && y < this.map.height ? { x, y } : null;
    }

    constructor(private canvas: HTMLCanvasElement) {
        this.ctx = canvas.getContext('2d')!;
        canvas.width = 32 * WORLD.tileSize;
        canvas.height = 24 * WORLD.tileSize;
        this.ctx.imageSmoothingEnabled = false;
        WORLD.tilesets.forEach(t => imageCache.get(t.image));
        imageCache.get('/assets/items/health-potion.png');
        preloadNpcs();
    }

    public addChatBubble(playerId: string, text: string, durationMs = 4500): void {
        this.chatBubbles.set(playerId, {
            text,
            expiresAt: performance.now() + durationMs
        });
    }

    public addFloatingText(gridX: number, gridY: number, text: string, color = '#4ade80', durationMs = 1400): void {
        this.floatingTexts.push({
            gridX,
            gridY,
            text,
            color,
            createdAt: performance.now(),
            durationMs
        });
    }

    public clearEffects(): void {
        this.chatBubbles.clear();
        this.floatingTexts = [];
    }

    setGridVisible(visible: boolean): void { this.gridVisible = visible; }

    public setCameraModeChangeListener(listener?: (freeCamera: boolean) => void): void {
        this.onCameraModeChange = listener;
    }

    public isFreeCamera(): boolean {
        return this.freeCamera;
    }

    public toggleFreeCamera(myId: string | null = null): boolean {
        return this.setFreeCamera(!this.freeCamera, myId);
    }

    public setFreeCamera(enabled: boolean, myId: string | null = null): boolean {
        if (this.freeCamera === enabled) {
            if (!enabled) {
                this.followPlayer = true;
                this.snapCameraToPlayer(myId);
            }
            return this.freeCamera;
        }

        this.freeCamera = enabled;
        this.followPlayer = !enabled;
        if (!enabled) {
            this.snapCameraToPlayer(myId);
        }
        this.onCameraModeChange?.(this.freeCamera);
        return this.freeCamera;
    }

    public centerOnPlayer(myId: string | null): void {
        this.snapCameraToPlayer(myId);
    }

    public centerOnWorldTile(x: number, y: number): void {
        if (!this.map) return;
        this.setFreeCamera(true);
        this.setCameraClamped((x + 0.5) * this.map.tileSize - this.canvas.width / 2,
            (y + 0.5) * this.map.tileSize - this.canvas.height / 2, this.map);
        this.clearPointerPosition();
    }

    public updatePointerClientPosition(clientX: number, clientY: number): void {
        const point = this.clientToCanvasPoint(clientX, clientY);
        if (!point) {
            this.clearPointerPosition();
            return;
        }
        this.pointerCanvasX = point.x;
        this.pointerCanvasY = point.y;
    }

    public clearPointerPosition(): void {
        this.pointerCanvasX = null;
        this.pointerCanvasY = null;
    }

    setGroundView(id: string, myId: string | null = null): void {
        const isSpawn = id === 'spawn';
        this.followPlayer = isSpawn;
        this.freeCamera = !isSpawn;
        this.onCameraModeChange?.(this.freeCamera);

        if (isSpawn) {
            this.snapCameraToPlayer(myId);
            return;
        }

        const view = WORLD_VIEWS.find(view => view.id === id);
        if (!view) return;
        this.setCameraClamped(view.x * WORLD.tileSize, view.y * WORLD.tileSize, this.map);
    }

    public getCanvas(): HTMLCanvasElement {
        return this.canvas;
    }

    public getMapViewport(): { x: number; y: number; width: number; height: number } {
        const size = this.map?.tileSize ?? WORLD.tileSize;
        return { x: this.cameraX / size, y: this.cameraY / size,
            width: this.canvas.width / size, height: this.canvas.height / size };
    }

    private clientToCanvasPoint(clientX: number, clientY: number): GridPoint | null {
        const rect = this.canvas.getBoundingClientRect();
        const clientWidth = this.canvas.clientWidth;
        const clientHeight = this.canvas.clientHeight;
        if (clientWidth === 0 || clientHeight === 0) return null;

        const canvasX = (clientX - rect.left - this.canvas.clientLeft) * this.canvas.width / clientWidth;
        const canvasY = (clientY - rect.top - this.canvas.clientTop) * this.canvas.height / clientHeight;
        if (canvasX < 0 || canvasX >= this.canvas.width || canvasY < 0 || canvasY >= this.canvas.height) {
            return null;
        }
        return { x: canvasX, y: canvasY };
    }

    public getTileAtClientPosition(clientX: number, clientY: number): GridPoint | null {
        const map = this.map;
        if (!map) return null;

        const canvasPoint = this.clientToCanvasPoint(clientX, clientY);
        if (!canvasPoint) return null;

        const x = Math.floor((canvasPoint.x + this.cameraX) / map.tileSize);
        const y = Math.floor((canvasPoint.y + this.cameraY) / map.tileSize);
        if (x < 0 || x >= map.width || y < 0 || y >= map.height) return null;
        return { x, y };
    }

    render(
        players: Map<string, Player>,
        myId: string | null,
        previewPath: readonly GridPoint[] = [],
        map: MapData | null = null,
        timestamp: number = performance.now(),
        items?: Map<string, WorldItem>
    ): void {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (!map) return;

        const deltaMs = this.lastRenderAt === null
            ? 0
            : Math.min(MAX_FRAME_DELTA_MS, Math.max(0, timestamp - this.lastRenderAt));
        this.lastRenderAt = timestamp;

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
        if (this.freeCamera) {
            this.updateEdgePanCamera(deltaMs, map);
        } else if (this.followPlayer) {
            this.updateCamera(myPosition, map);
        }

        this.ctx.fillStyle = '#17251b';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        drawWorld(this.ctx, this.cameraX, this.cameraY, this.canvas.width, this.canvas.height, false);
        if (this.gridVisible) this.drawGrid(map);
        this.drawPreview(previewPath, map, myPosition);
        if (items && items.size > 0) {
            this.drawItems(items, map, timestamp);
        }
        drawNpcs(this.ctx, this.cameraX, this.cameraY, this.canvas.width, this.canvas.height, map.tileSize);
        this.drawPlayers(players, myId, map, timestamp);
        drawWorld(this.ctx, this.cameraX, this.cameraY, this.canvas.width, this.canvas.height, true);
        this.combatView?.drawOverlay(this.ctx, map, this.cameraX, this.cameraY, timestamp);
        this.drawChatBubbles(players, map, timestamp);
        this.drawFloatingTexts(map, timestamp);
    }

    private snapCameraToPlayer(myId: string | null): void {
        if (!myId || !this.map) return;
        const myPosition = this.renderPositions.get(myId);
        if (myPosition) {
            this.updateCamera(myPosition, this.map);
        }
    }

    private setCameraClamped(targetX: number, targetY: number, map: MapData | null): void {
        const worldWidthPx = map ? map.width * map.tileSize : WORLD.width * WORLD.tileSize;
        const worldHeightPx = map ? map.height * map.tileSize : WORLD.height * WORLD.tileSize;
        const maxX = Math.max(0, worldWidthPx - this.canvas.width);
        const maxY = Math.max(0, worldHeightPx - this.canvas.height);
        this.cameraX = Math.max(0, Math.min(targetX, maxX));
        this.cameraY = Math.max(0, Math.min(targetY, maxY));
    }

    private updateEdgePanCamera(deltaMs: number, map: MapData): void {
        if (deltaMs <= 0 || this.pointerCanvasX === null || this.pointerCanvasY === null) return;

        const margin = Math.min(EDGE_PAN_MARGIN_PX, this.canvas.width / 2, this.canvas.height / 2);
        if (margin <= 0) return;

        let dirX = 0;
        if (this.pointerCanvasX < margin) {
            dirX = -(1 - this.pointerCanvasX / margin);
        } else if (this.pointerCanvasX > this.canvas.width - margin) {
            dirX = (this.pointerCanvasX - (this.canvas.width - margin)) / margin;
        }

        let dirY = 0;
        if (this.pointerCanvasY < margin) {
            dirY = -(1 - this.pointerCanvasY / margin);
        } else if (this.pointerCanvasY > this.canvas.height - margin) {
            dirY = (this.pointerCanvasY - (this.canvas.height - margin)) / margin;
        }

        if (dirX === 0 && dirY === 0) return;

        const dtSeconds = deltaMs / 1000;
        const nextX = this.cameraX + dirX * EDGE_PAN_SPEED_PX_PER_SEC * dtSeconds;
        const nextY = this.cameraY + dirY * EDGE_PAN_SPEED_PX_PER_SEC * dtSeconds;
        this.setCameraClamped(nextX, nextY, map);
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
                lastTickAt: now,
                attackStartedAt: null,
                attackFlipX: false
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
            if (Math.abs(dx) + Math.abs(dy) > 2) {
                // Dịch chuyển tức thời (ví dụ: hồi sinh về làng) -> snap trực tiếp không trượt dài trên bản đồ
                position.x = player.x;
                position.y = player.y;
                position.fromX = player.x;
                position.fromY = player.y;
                position.targetX = player.x;
                position.targetY = player.y;
                position.startedAt = now;
            } else {
                position.direction = this.resolveDirection(dx, dy, position.direction);
                position.fromX = position.x;
                position.fromY = position.y;
                position.targetX = player.x;
                position.targetY = player.y;
                position.startedAt = now;
            }
        }

        if (player.state === 'DEAD') {
            position.attackStartedAt = null;
        } else if (
            position.attackStartedAt !== null
            && computeAttackFrame(position.attackStartedAt, now) === null
        ) {
            position.attackStartedAt = null;
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

        const centerX = (player.x + 0.5) * map.tileSize - this.canvas.width / 2;
        const centerY = (player.y + 0.5) * map.tileSize - this.canvas.height / 2;
        this.setCameraClamped(centerX, centerY, map);
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

    private drawItems(items: Map<string, WorldItem>, map: MapData, timestamp: number): void {
        const tileSize = map.tileSize;
        const bobOffset = Math.sin(timestamp / 240) * 2;
        items.forEach(item => {
            const worldX = item.x * tileSize - this.cameraX;
            const worldY = item.y * tileSize - this.cameraY;
            if (worldX < -tileSize || worldY < -tileSize || worldX > this.canvas.width + tileSize || worldY > this.canvas.height + tileSize) {
                return;
            }

            const centerX = worldX + tileSize / 2;
            const centerY = worldY + tileSize / 2;

            this.ctx.save();
            // Vòng sáng nền đỏ hồng giúp dễ nhận diện bình máu trên nền cỏ Tiled
            this.ctx.fillStyle = 'rgba(231, 76, 60, 0.25)';
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY + 2, tileSize * 0.45, 0, Math.PI * 2);
            this.ctx.fill();

            const def = getItemDefinition(item.kind);
            const iconPath = def?.icon ?? '/assets/items/health-potion.png';
            const img = imageCache.get(iconPath);
            const drawSize = Math.max(14, Math.floor(tileSize * 0.85));
            const drawX = Math.round(centerX - drawSize / 2);
            const drawY = Math.round(centerY - drawSize / 2 + bobOffset);

            if (img.complete && img.naturalWidth !== 0) {
                this.ctx.drawImage(img, drawX, drawY, drawSize, drawSize);
            } else {
                this.ctx.fillStyle = '#e74c3c';
                this.ctx.fillRect(drawX + 2, drawY + 2, drawSize - 4, drawSize - 4);
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 1.5;
                this.ctx.strokeRect(drawX + 2, drawY + 2, drawSize - 4, drawSize - 4);
            }
            this.ctx.restore();
        });
    }

    private drawPlayers(players: Map<string, Player>, myId: string | null, map: MapData, timestamp: number): void {
        const drawables = this.combatView?.getMobDrawables(
            this.ctx, map, this.cameraX, this.cameraY, timestamp
        ) ?? [];
        players.forEach(player => {
            const position = this.renderPositions.get(player.id);
            if (!position) return;
            const isDead = player.state === 'DEAD' || (typeof player.hp === 'number' && player.hp <= 0);
            drawables.push({ y: position.y, draw: () => {
                this.ctx.save();
                if (isDead) this.ctx.globalAlpha = 0.35;
                const isMe = player.id === myId;
                const characterId = player.characterId && player.characterId !== 'undefined'
                    ? player.characterId
                    : 'knight';

                const attackFrame = player.state === 'DEAD'
                    ? null
                    : computeAttackFrame(position.attackStartedAt, timestamp);
                const attackSheet = attackFrame !== null ? getCharacterAttackSheet(characterId) : null;
                const walkSheet = getCharacterWalkSheet(characterId);
                const isMoving = !isDead && (position.x !== position.targetX || position.y !== position.targetY);
                const img = imageCache.get(attackSheet ? attackSheet.source : walkSheet.source);

                const offset = this.combatView?.getAttackOffset(player.id, timestamp) ?? { x: 0, y: 0 };
                const pixelX = (position.x + offset.x) * map.tileSize
                    + (map.tileSize - SPRITE_SIZE) / 2 - this.cameraX;
                const pixelY = (position.y + offset.y) * map.tileSize
                    + map.tileSize - SPRITE_SIZE - this.cameraY;

                this.ctx.imageSmoothingEnabled = false;
                if (img.complete && img.naturalWidth !== 0) {
                    if (attackSheet && attackFrame !== null) {
                        const frameWidth = img.naturalWidth / attackSheet.cols;
                        const frameHeight = img.naturalHeight / attackSheet.rows;
                        const sx = attackFrame * frameWidth;
                        const sy = 0;

                        if (position.attackFlipX) {
                            this.ctx.save();
                            this.ctx.translate(pixelX + SPRITE_SIZE / 2, pixelY);
                            this.ctx.scale(-1, 1);
                            this.ctx.drawImage(
                                img,
                                sx,
                                sy,
                                frameWidth,
                                frameHeight,
                                -SPRITE_SIZE / 2,
                                0,
                                SPRITE_SIZE,
                                SPRITE_SIZE
                            );
                            this.ctx.restore();
                        } else {
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
                        }
                    } else {
                        const frameWidth = img.naturalWidth / walkSheet.cols;
                        const frameHeight = img.naturalHeight / walkSheet.rows;
                        const frameIndex = isMoving ? position.animFrame : 0;
                        const sx = position.direction * frameWidth;
                        const sy = frameIndex * frameHeight;
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
                    }
                } else {
                    this.ctx.fillStyle = isMe ? '#f1c40f' : '#e74c3c';
                    this.ctx.fillRect(pixelX, pixelY, SPRITE_SIZE, SPRITE_SIZE);
                }

                if (isMe) {
                    this.ctx.strokeStyle = isDead ? '#ef4444' : '#f1c40f';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(pixelX, pixelY, SPRITE_SIZE, SPRITE_SIZE);
                }

                this.ctx.fillStyle = isDead ? '#f87171' : isMe ? '#f1c40f' : '#ffffff';
                this.ctx.font = 'bold 12px "Courier New", monospace';
                this.ctx.textAlign = 'center';
                this.ctx.shadowColor = '#000000';
                this.ctx.shadowBlur = 4;
                const suffix = isDead ? ' [CHẾT]' : isMe ? ' (Bạn)' : '';
                this.ctx.fillText(player.name + suffix, pixelX + SPRITE_SIZE / 2, pixelY - 8);
                this.ctx.shadowBlur = 0;
                this.ctx.restore();
            }});
        });
        drawables.sort((a, b) => a.y - b.y).forEach(drawable => drawable.draw());
    }

    private drawChatBubbles(players: Map<string, Player>, map: MapData, timestamp: number): void {
        if (this.chatBubbles.size === 0) return;

        this.ctx.save();
        this.ctx.font = '11px "Courier New", monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        this.chatBubbles.forEach((bubble, playerId) => {
            if (timestamp >= bubble.expiresAt) {
                this.chatBubbles.delete(playerId);
                return;
            }
            const player = players.get(playerId);
            const position = this.renderPositions.get(playerId);
            if (!player || !position) return;

            const centerX = position.x * map.tileSize + map.tileSize / 2 - this.cameraX;
            const baseY = position.y * map.tileSize + map.tileSize - SPRITE_SIZE - this.cameraY - 26;
            const displayText = bubble.text.length > 34 ? `${bubble.text.slice(0, 33)}…` : bubble.text;
            const textWidth = this.ctx.measureText(displayText).width;
            const padX = 8;
            const boxW = Math.ceil(textWidth + padX * 2);
            const boxH = 20;
            const boxX = Math.max(4, Math.min(this.canvas.width - boxW - 4, Math.round(centerX - boxW / 2)));
            const boxY = Math.max(4, Math.round(baseY - boxH));

            this.ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
            this.ctx.fillRect(boxX, boxY, boxW, boxH);
            this.ctx.strokeStyle = '#f1c40f';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(boxX, boxY, boxW, boxH);

            this.ctx.fillStyle = '#f8fafc';
            this.ctx.fillText(displayText, boxX + boxW / 2, boxY + boxH / 2 + 0.5);
        });
        this.ctx.restore();
    }

    private drawFloatingTexts(map: MapData, timestamp: number): void {
        if (this.floatingTexts.length === 0) return;

        const remaining: FloatingText[] = [];
        this.ctx.save();
        this.ctx.font = 'bold 13px "Courier New", monospace';
        this.ctx.textAlign = 'center';
        this.ctx.shadowColor = '#000000';
        this.ctx.shadowBlur = 4;

        for (const effect of this.floatingTexts) {
            const elapsed = timestamp - effect.createdAt;
            if (elapsed >= effect.durationMs) continue;
            remaining.push(effect);

            const progress = Math.max(0, Math.min(1, elapsed / effect.durationMs));
            const x = (effect.gridX + 0.5) * map.tileSize - this.cameraX;
            const y = effect.gridY * map.tileSize - this.cameraY - 12 - progress * 24;

            this.ctx.globalAlpha = 1 - progress * 0.85;
            this.ctx.fillStyle = effect.color;
            this.ctx.fillText(effect.text, x, y);
        }

        this.ctx.restore();
        this.floatingTexts = remaining;
    }
}
