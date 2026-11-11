import { GridMap } from '../features/movement/GridMap';
import { AtlasTile, TileAtlas } from '../features/movement/TileAtlas';
import { Tile } from '../features/movement/types';
import {
    ChatBubble,
    FloatingTextEffect,
    ItemData,
    MobData,
    PlayerData
} from '../types/protocol';

export class CanvasRenderer {
    private ctx: CanvasRenderingContext2D;
    private imageCache: Map<string, HTMLImageElement> = new Map();
    private floatingTexts: FloatingTextEffect[] = [];
    private chatBubbles: Map<string, ChatBubble> = new Map();

    private backgrounds = new Map<string, HTMLCanvasElement>();
    private tileAtlas?: TileAtlas;

    constructor(private canvas: HTMLCanvasElement) {
        this.ctx = canvas.getContext('2d')!;
        this.ctx.imageSmoothingEnabled = false;
    }

    public setTileAtlas(atlas: TileAtlas) {
        this.tileAtlas = atlas;
        this.backgrounds.clear();
    }

    private getImage(path: string): HTMLImageElement {
        if (!this.imageCache.has(path)) {
            const img = new Image();
            img.src = path;
            this.imageCache.set(path, img);
        }
        return this.imageCache.get(path)!;
    }

    public addFloatingText(gridX: number, gridY: number, text: string, color = '#2ecc71') {
        this.floatingTexts.push({
            id: `${Date.now()}-${Math.random()}`,
            gridX,
            gridY,
            text,
            color,
            createdAt: performance.now(),
            durationMs: 1400
        });
    }

    public addChatBubble(playerId: string, text: string) {
        this.chatBubbles.set(playerId, {
            playerId,
            text,
            expiresAt: performance.now() + 4500
        });
    }

    public screenToGrid(clientX: number, clientY: number): { x: number; y: number } {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const canvasX = (clientX - rect.left) * scaleX;
        const canvasY = (clientY - rect.top) * scaleY;
        const tileSize = 24;

        return {
            x: Math.max(0, Math.min(31, Math.floor(canvasX / tileSize))),
            y: Math.max(0, Math.min(23, Math.floor(canvasY / tileSize)))
        };
    }

    public render(
        currentMapId: string,
        mapObj: GridMap | undefined,
        players: Map<string, PlayerData>,
        myId: string | null,
        mobs: Map<string, MobData>,
        items: Map<string, ItemData>,
        currentTick: number,
        pathPreview: readonly Tile[] = [],
        targetTile: Tile | null = null,
        pendingLootId: string | null = null
    ) {
        const tileSize = 24;
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 1. Vẽ bản đồ (Terrain từ tileset của Feature 2 - Vũ)
        this.renderMapBackground(currentMapId, mapObj);

        // 2. Vẽ đường đi dự kiến (A* Path preview) và ô mục tiêu
        this.renderPathAndTarget(pathPreview, targetTile, tileSize);

        // 3. Vẽ Bình máu trên map hiện tại (Feature 4 - Hoàng)
        this.renderItems(items, currentMapId, tileSize, currentTick, pendingLootId);

        // 4. Vẽ Quái Slime trên map hiện tại (Feature 3)
        this.renderMobs(mobs, currentMapId, tileSize, currentTick);

        // 5. Vẽ Người chơi trên map hiện tại (Feature 1, 2, 4)
        this.renderPlayers(players, myId, currentMapId, tileSize);

        // 6. Hiệu ứng chữ bay sát thương & hồi máu
        this.renderFloatingTexts(tileSize);
    }

    private renderMapBackground(mapId: string, gridMap: GridMap | undefined) {
        if (!gridMap) {
            // Nền tối dự phòng
            this.ctx.fillStyle = '#202f24';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            return;
        }

        // Render sẵn ra offscreen canvas để tối ưu 60 FPS
        if (!this.backgrounds.has(mapId)) {
            const bgCanvas = document.createElement('canvas');
            bgCanvas.width = 768;
            bgCanvas.height = 576;
            const bgCtx = bgCanvas.getContext('2d')!;
            bgCtx.imageSmoothingEnabled = false;

            const d = gridMap.data;
            const visuals = d.visuals;

            if (this.tileAtlas && visuals) {
                const tile = (sprite: AtlasTile, x: number, y: number) => {
                    const [sx, sy, sw, sh] = sprite.rect;
                    bgCtx.drawImage(this.tileAtlas![sprite.atlas], sx, sy, sw, sh, x * 24, y * 24, 24, 24);
                };

                for (let y = 0; y < 24; y++) {
                    for (let x = 0; x < 32; x++) {
                        const index = y * 32 + x;
                        const variant = visuals.terrain[index];
                        tile(visuals.ground[Math.max(0, variant)], x, y);
                        if (variant === -1 && gridMap.walkable({ x, y })) {
                            tile(visuals.road, x, y);
                        }
                    }
                }

                for (let y = 0; y < 24; y++) {
                    for (let x = 0; x < 32; x++) {
                        if (!gridMap.walkable({ x, y })) {
                            const sprites = (x === 0 || x === 31 || y === 0 || y === 23)
                                ? visuals.border
                                : visuals.obstacles;
                            tile(sprites[(x * 7 + y * 11) % sprites.length], x, y);
                        }
                    }
                }
            } else {
                for (let y = 0; y < 24; y++) {
                    for (let x = 0; x < 32; x++) {
                        bgCtx.fillStyle = !gridMap.walkable({ x, y })
                            ? '#273d43'
                            : (x + y) % 2 === 0 ? '#486b53' : '#3e5c46';
                        bgCtx.fillRect(x * 24, y * 24, 24, 24);
                    }
                }
            }

            // Vẽ Safe Zone
            const z = d.safeZone;
            bgCtx.fillStyle = 'rgba(46, 204, 113, 0.18)';
            bgCtx.fillRect(z.x * 24, z.y * 24, z.width * 24, z.height * 24);
            bgCtx.strokeStyle = 'rgba(46, 204, 113, 0.85)';
            bgCtx.lineWidth = 1;
            bgCtx.setLineDash([4, 4]);
            bgCtx.strokeRect(z.x * 24 + 1, z.y * 24 + 1, z.width * 24 - 2, z.height * 24 - 2);
            bgCtx.setLineDash([]);

            // Nhãn Khu an toàn
            bgCtx.fillStyle = 'rgba(230, 255, 235, 0.9)';
            bgCtx.font = 'bold 9px "Courier New", monospace';
            bgCtx.fillText('KHU AN TOÀN', z.x * 24 + 4, z.y * 24 + 12);

            // Vẽ Cổng chuyển map (Exits) với mũi tên chỉ hướng
            for (const exit of d.exits) {
                for (const cell of exit.cells) {
                    bgCtx.fillStyle = 'rgba(52, 152, 219, 0.55)';
                    bgCtx.fillRect(cell.x * 24 + 1, cell.y * 24 + 1, 22, 22);
                    bgCtx.strokeStyle = '#00d2d3';
                    bgCtx.lineWidth = 2;
                    bgCtx.strokeRect(cell.x * 24 + 2, cell.y * 24 + 2, 20, 20);

                    bgCtx.fillStyle = '#ffffff';
                    bgCtx.font = 'bold 14px "Courier New", monospace';
                    bgCtx.textAlign = 'center';
                    bgCtx.textBaseline = 'middle';
                    const arrow = ({ left: '←', right: '→', top: '↑', bottom: '↓' } as Record<string, string>)[exit.side] || '⚑';
                    bgCtx.fillText(arrow, cell.x * 24 + 12, cell.y * 24 + 12);
                }
            }

            this.backgrounds.set(mapId, bgCanvas);
        }

        this.ctx.drawImage(this.backgrounds.get(mapId)!, 0, 0);
    }

    private renderPathAndTarget(path: readonly Tile[], target: Tile | null, tileSize: number) {
        if (path && path.length > 0) {
            this.ctx.fillStyle = 'rgba(241, 196, 15, 0.65)';
            for (const p of path) {
                this.ctx.fillRect(p.x * tileSize + 9, p.y * tileSize + 9, 6, 6);
            }
        }
        if (target) {
            this.ctx.strokeStyle = '#f1c40f';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(target.x * tileSize + 2, target.y * tileSize + 2, tileSize - 4, tileSize - 4);
        }
    }

    private renderItems(
        items: Map<string, ItemData>,
        currentMapId: string,
        tileSize: number,
        currentTick: number,
        pendingLootId: string | null
    ) {
        const potionImg = this.getImage('/assets/items/health-potion.png');
        const now = performance.now();

        items.forEach((item) => {
            if (item.mapId !== currentMapId) return;

            const remainingTicks = Math.max(0, item.expiresTick - currentTick);
            // Nhấp nháy nhanh khi còn dưới 5 giây (50 ticks)
            if (remainingTicks <= 50 && Math.floor(now / 150) % 2 === 0) {
                return;
            }

            const px = item.x * tileSize;
            const py = item.y * tileSize;
            const bobOffset = Math.sin(now / 220) * 2;

            this.ctx.fillStyle = pendingLootId === item.id
                ? 'rgba(241, 196, 15, 0.55)'
                : 'rgba(231, 76, 60, 0.35)';
            this.ctx.beginPath();
            this.ctx.arc(px + tileSize / 2, py + tileSize / 2 + 3, tileSize * 0.38, 0, Math.PI * 2);
            this.ctx.fill();

            if (pendingLootId === item.id) {
                this.ctx.strokeStyle = '#f1c40f';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(px + 1, py + 1, tileSize - 2, tileSize - 2);
            }

            if (potionImg.complete && potionImg.naturalWidth > 0) {
                this.ctx.drawImage(potionImg, 0, 0, 9, 11, px + 4, py + 3 + bobOffset, 15, 18);
            } else {
                this.ctx.fillStyle = '#e74c3c';
                this.ctx.fillRect(px + 6, py + 5, 12, 14);
            }

            const remainSec = Math.ceil(remainingTicks * 0.1);
            this.ctx.fillStyle = '#ff9ff3';
            this.ctx.font = 'bold 9px "Courier New", monospace';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'alphabetic';
            this.ctx.fillText(`+30HP (${remainSec}s)`, px + tileSize / 2, py - 2);
        });
    }

    private renderMobs(
        mobs: Map<string, MobData>,
        currentMapId: string,
        tileSize: number,
        currentTick: number
    ) {
        const slimeImg = this.getImage('/assets/mobs/slime.png');

        mobs.forEach((mob) => {
            if (mob.mapId !== currentMapId) return;

            const px = mob.x * tileSize;
            const py = mob.y * tileSize;

            if (mob.state === 'DEAD') {
                this.ctx.strokeStyle = 'rgba(149, 165, 166, 0.45)';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(px + 4, py + 4, tileSize - 8, tileSize - 8);

                this.ctx.fillStyle = '#95a5a6';
                this.ctx.font = '9px "Courier New", monospace';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                const remainSec = mob.respawnReadyTick
                    ? Math.max(0, Math.ceil((mob.respawnReadyTick - currentTick) * 0.1))
                    : 15;
                this.ctx.fillText(`${remainSec}s`, px + tileSize / 2, py + tileSize / 2);
                return;
            }

            if (slimeImg.complete && slimeImg.naturalWidth > 0) {
                this.ctx.drawImage(slimeImg, 0, 0, 16, 16, px + 2, py + 2, tileSize - 4, tileSize - 4);
            } else {
                this.ctx.fillStyle = '#27ae60';
                this.ctx.fillRect(px + 3, py + 3, tileSize - 6, tileSize - 6);
            }

            this.drawHealthBar(px, py - 5, tileSize, 4, mob.hp, mob.maxHp, '#e74c3c');

            this.ctx.fillStyle = '#a3cb38';
            this.ctx.font = 'bold 9px "Courier New", monospace';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'alphabetic';
            this.ctx.fillText(`Slime (${mob.hp}/${mob.maxHp})`, px + tileSize / 2, py - 8);
        });
    }

    private renderPlayers(
        players: Map<string, PlayerData>,
        myId: string | null,
        currentMapId: string,
        tileSize: number
    ) {
        const deadImg = this.getImage('/assets/characters/player-dead.png');
        const defaultPlayerImg = this.getImage('/assets/characters/player.png');
        const now = performance.now();

        players.forEach((player) => {
            if (player.mapId !== currentMapId) return;

            const isMe = player.id === myId;
            const px = player.x * tileSize;
            const py = player.y * tileSize;
            const isDead = player.state === 'DEAD' || player.hp <= 0;

            if (isDead) {
                if (deadImg.complete && deadImg.naturalWidth > 0) {
                    this.ctx.drawImage(deadImg, 0, 0, 16, 16, px, py, tileSize, tileSize);
                } else {
                    this.ctx.fillStyle = '#7f8c8d';
                    this.ctx.fillRect(px + 2, py + 2, tileSize - 4, tileSize - 4);
                }
                this.ctx.strokeStyle = '#e74c3c';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(px, py, tileSize, tileSize);
            } else {
                const avatarImg = this.getImage(`/assets/characters/${player.avatar || 'knight'}.png`);
                if (avatarImg.complete && avatarImg.naturalWidth > 0) {
                    const srcW = avatarImg.naturalWidth >= 64 && avatarImg.naturalHeight === 16 ? 16 : avatarImg.naturalWidth;
                    const srcH = avatarImg.naturalHeight;
                    this.ctx.drawImage(avatarImg, 0, 0, srcW, srcH, px, py, tileSize, tileSize);
                } else if (defaultPlayerImg.complete && defaultPlayerImg.naturalWidth > 0) {
                    this.ctx.drawImage(defaultPlayerImg, 0, 0, 16, 16, px, py, tileSize, tileSize);
                } else {
                    this.ctx.fillStyle = isMe ? '#f1c40f' : '#3498db';
                    this.ctx.fillRect(px + 2, py + 2, tileSize - 4, tileSize - 4);
                }

                if (isMe) {
                    this.ctx.strokeStyle = '#f1c40f';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(px, py, tileSize, tileSize);
                }
            }

            this.drawHealthBar(
                px - 2,
                py - 6,
                tileSize + 4,
                4,
                player.hp,
                player.maxHp,
                isMe ? '#2ecc71' : '#3498db'
            );

            this.ctx.fillStyle = isDead ? '#ff6b6b' : (isMe ? '#f1c40f' : '#ffffff');
            this.ctx.font = 'bold 10px "Courier New", monospace';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'alphabetic';
            const statusSuffix = isDead ? ' [CHẾT]' : (isMe ? ' (Bạn)' : '');
            this.ctx.fillText(`${player.name}${statusSuffix}`, px + tileSize / 2, py - 9);

            const bubble = this.chatBubbles.get(player.id);
            if (bubble) {
                if (now > bubble.expiresAt) {
                    this.chatBubbles.delete(player.id);
                } else {
                    this.drawChatBubble(px + tileSize / 2, py - 22, bubble.text);
                }
            }
        });
    }

    private drawHealthBar(
        x: number,
        y: number,
        width: number,
        height: number,
        hp: number,
        maxHp: number,
        fillColor: string
    ) {
        const ratio = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        this.ctx.fillRect(x, y, width, height);
        this.ctx.fillStyle = fillColor;
        this.ctx.fillRect(x, y, Math.round(width * ratio), height);
    }

    private drawChatBubble(centerX: number, bottomY: number, text: string) {
        const display = text.length > 30 ? text.slice(0, 30) + '…' : text;
        this.ctx.font = '11px "Courier New", monospace';
        const metrics = this.ctx.measureText(display);
        const padX = 6;
        const boxW = Math.max(36, metrics.width + padX * 2);
        const boxH = 18;
        const boxX = Math.max(4, Math.min(this.canvas.width - boxW - 4, centerX - boxW / 2));
        const boxY = Math.max(4, bottomY - boxH);

        this.ctx.fillStyle = 'rgba(15, 20, 25, 0.94)';
        this.ctx.fillRect(boxX, boxY, boxW, boxH);
        this.ctx.strokeStyle = '#f1c40f';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(boxX, boxY, boxW, boxH);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(display, boxX + boxW / 2, boxY + boxH / 2);
    }

    private renderFloatingTexts(tileSize: number) {
        const now = performance.now();
        this.floatingTexts = this.floatingTexts.filter((ft) => now - ft.createdAt < ft.durationMs);

        for (const ft of this.floatingTexts) {
            const progress = (now - ft.createdAt) / ft.durationMs;
            const alpha = Math.max(0, 1 - progress);
            const x = ft.gridX * tileSize + tileSize / 2;
            const y = ft.gridY * tileSize - progress * 22;

            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = ft.color;
            this.ctx.font = 'bold 12px "Courier New", monospace';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(ft.text, x, y);
            this.ctx.restore();
        }
    }
}
