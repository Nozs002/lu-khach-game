import {
    ChatBubble,
    FloatingTextEffect,
    ItemData,
    MapData,
    MobData,
    PlayerData
} from '../types/protocol';

/**
 * Bộ kết xuất đồ họa 2D Pixel-Art trên HTML5 Canvas.
 * Sử dụng trực tiếp các sprite chuẩn từ Ninja Adventure Asset Pack trong /public/assets/manifest.json:
 * - /assets/items/health-potion.png (9x11)
 * - /assets/characters/player.png (frame 16x16), /assets/characters/player-dead.png (16x16)
 * - /assets/mobs/slime.png (frame 16x16)
 */
export class CanvasRenderer {
    private ctx: CanvasRenderingContext2D;
    private imageCache: Map<string, HTMLImageElement> = new Map();
    private floatingTexts: FloatingTextEffect[] = [];
    private chatBubbles: Map<string, ChatBubble> = new Map();

    constructor(private canvas: HTMLCanvasElement) {
        this.ctx = canvas.getContext('2d')!;
        this.ctx.imageSmoothingEnabled = false;
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

    /**
     * Quy đổi tọa độ click chuột trên Canvas sang ô lưới (x, y) theo Mục 5 docs/game-design.md.
     */
    public screenToGrid(clientX: number, clientY: number, map: MapData): { x: number; y: number } {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const canvasX = (clientX - rect.left) * scaleX;
        const canvasY = (clientY - rect.top) * scaleY;
        const tileSize = map.tileSize || 24;

        return {
            x: Math.max(0, Math.min(map.width - 1, Math.floor(canvasX / tileSize))),
            y: Math.max(0, Math.min(map.height - 1, Math.floor(canvasY / tileSize)))
        };
    }

    public render(
        players: Map<string, PlayerData>,
        myId: string | null,
        map?: MapData,
        mobs?: Map<string, MobData>,
        items?: Map<string, ItemData>,
        currentTick = 0,
        pendingLootId: string | null = null
    ) {
        const tileSize = map?.tileSize || 24;
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 1. Vẽ nền bản đồ & lưới 32x24
        this.renderMapAndSafeZone(map, tileSize);

        // 2. Vẽ Bình máu (HEALTH_POTION) — Phần 4
        if (items) {
            this.renderItems(items, tileSize, currentTick, pendingLootId);
        }

        // 3. Vẽ Quái Slime (sống & đếm ngược hồi sinh khi chết)
        if (mobs) {
            this.renderMobs(mobs, tileSize, currentTick);
        }

        // 4. Vẽ Người chơi (sống & trạng thái chết player-dead.png) & Bong bóng Chat
        this.renderPlayers(players, myId, tileSize);

        // 5. Vẽ hiệu ứng chữ bay (+30 HP, sát thương, thông báo)
        this.renderFloatingTexts(tileSize);
    }

    private renderMapAndSafeZone(map: MapData | undefined, tileSize: number) {
        const width = map?.width || 32;
        const height = map?.height || 24;

        // Nền cỏ thảo nguyên tối màu dễ nhìn
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                this.ctx.fillStyle = (x + y) % 2 === 0 ? '#243428' : '#202f24';
                this.ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
            }
        }

        // Vẽ Khu An Toàn (SafeZone: x=2..7, y=2..7) nơi người chơi hồi sinh
        if (map?.safeZone) {
            const sz = map.safeZone;
            this.ctx.fillStyle = 'rgba(46, 204, 113, 0.16)';
            this.ctx.fillRect(sz.x * tileSize, sz.y * tileSize, sz.width * tileSize, sz.height * tileSize);

            this.ctx.strokeStyle = 'rgba(46, 204, 113, 0.75)';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([4, 3]);
            this.ctx.strokeRect(sz.x * tileSize + 1, sz.y * tileSize + 1, sz.width * tileSize - 2, sz.height * tileSize - 2);
            this.ctx.setLineDash([]);

            this.ctx.fillStyle = 'rgba(163, 247, 191, 0.85)';
            this.ctx.font = 'bold 10px "Courier New", monospace';
            this.ctx.textAlign = 'left';
            this.ctx.fillText('KHU AN TOÀN (HỒI SINH)', sz.x * tileSize + 4, sz.y * tileSize + 12);
        }

        // Vẽ các ô vật cản (Collisions)
        if (map?.collisions) {
            for (const index of map.collisions) {
                const cx = index % width;
                const cy = Math.floor(index / width);
                const isBorder = cx === 0 || cy === 0 || cx === width - 1 || cy === height - 1;
                this.ctx.fillStyle = isBorder ? '#1b2420' : '#3d4c41';
                this.ctx.fillRect(cx * tileSize, cy * tileSize, tileSize, tileSize);
                if (!isBorder) {
                    this.ctx.strokeStyle = '#576b5c';
                    this.ctx.lineWidth = 1;
                    this.ctx.strokeRect(cx * tileSize + 2, cy * tileSize + 2, tileSize - 4, tileSize - 4);
                }
            }
        }
    }

    private renderItems(
        items: Map<string, ItemData>,
        tileSize: number,
        currentTick: number,
        pendingLootId: string | null
    ) {
        const potionImg = this.getImage('/assets/items/health-potion.png');
        const now = performance.now();

        items.forEach((item) => {
            const remainingTicks = Math.max(0, item.expiresTick - currentTick);
            // Nhấp nháy nhanh khi bình máu còn dưới 5 giây (50 ticks) trước khi biến mất
            if (remainingTicks <= 50 && Math.floor(now / 150) % 2 === 0) {
                return;
            }

            const px = item.x * tileSize;
            const py = item.y * tileSize;
            const bobOffset = Math.sin(now / 220) * 2;

            // Vòng sáng dưới chân bình máu
            this.ctx.fillStyle = pendingLootId === item.id
                ? 'rgba(241, 196, 15, 0.45)'
                : 'rgba(231, 76, 60, 0.28)';
            this.ctx.beginPath();
            this.ctx.arc(px + tileSize / 2, py + tileSize / 2 + 3, tileSize * 0.38, 0, Math.PI * 2);
            this.ctx.fill();

            if (pendingLootId === item.id) {
                this.ctx.strokeStyle = '#f1c40f';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(px + 1, py + 1, tileSize - 2, tileSize - 2);
            }

            // Vẽ sprite bình máu chuẩn 9x11 từ manifest.json (phóng lên 15x18 ở giữa ô 24x24)
            if (potionImg.complete && potionImg.naturalWidth > 0) {
                this.ctx.drawImage(
                    potionImg,
                    0, 0, 9, 11,
                    px + 4, py + 3 + bobOffset, 15, 18
                );
            } else {
                this.ctx.fillStyle = '#e74c3c';
                this.ctx.fillRect(px + 6, py + 5, 12, 14);
            }

            // Hiển thị nhãn +30 HP và thời gian còn lại
            const remainSec = Math.ceil(remainingTicks * 0.1);
            this.ctx.fillStyle = '#ff9ff3';
            this.ctx.font = 'bold 9px "Courier New", monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`+30HP (${remainSec}s)`, px + tileSize / 2, py - 2);
        });
    }

    private renderMobs(mobs: Map<string, MobData>, tileSize: number, currentTick: number) {
        const slimeImg = this.getImage('/assets/mobs/slime.png');

        mobs.forEach((mob) => {
            const px = mob.x * tileSize;
            const py = mob.y * tileSize;

            if (mob.state === 'DEAD') {
                // Vẽ dấu vết nơi quái chết & đếm ngược hồi sinh (150 ticks = 15s)
                this.ctx.strokeStyle = 'rgba(149, 165, 166, 0.45)';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(px + 4, py + 4, tileSize - 8, tileSize - 8);

                this.ctx.fillStyle = '#95a5a6';
                this.ctx.font = '9px "Courier New", monospace';
                this.ctx.textAlign = 'center';
                const remainSec = mob.respawnReadyTick
                    ? Math.max(0, Math.ceil((mob.respawnReadyTick - currentTick) * 0.1))
                    : 15;
                this.ctx.fillText(`Slime hồi sinh: ${remainSec}s`, px + tileSize / 2, py + tileSize / 2 + 3);
                return;
            }

            // Vẽ frame đầu (0, 0, 16, 16) của slime.png từ manifest.json
            if (slimeImg.complete && slimeImg.naturalWidth > 0) {
                this.ctx.drawImage(
                    slimeImg,
                    0, 0, 16, 16,
                    px + 1, py + 2, tileSize - 2, tileSize - 2
                );
            } else {
                this.ctx.fillStyle = '#27ae60';
                this.ctx.fillRect(px + 3, py + 3, tileSize - 6, tileSize - 6);
            }

            // Thanh máu của Slime (HP / 40)
            this.drawHealthBar(px, py - 6, tileSize, 4, mob.hp, mob.maxHp, '#e74c3c');

            this.ctx.fillStyle = '#a3cb38';
            this.ctx.font = 'bold 9px "Courier New", monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`Slime (${mob.hp}/${mob.maxHp})`, px + tileSize / 2, py - 9);
        });
    }

    private renderPlayers(players: Map<string, PlayerData>, myId: string | null, tileSize: number) {
        const deadImg = this.getImage('/assets/characters/player-dead.png');
        const defaultPlayerImg = this.getImage('/assets/characters/player.png');
        const now = performance.now();

        players.forEach((player) => {
            const isMe = player.id === myId;
            const px = player.x * tileSize;
            const py = player.y * tileSize;
            const isDead = player.state === 'DEAD' || player.hp <= 0;

            if (isDead) {
                // Vẽ sprite nhân vật gục ngã (/assets/characters/player-dead.png 16x16)
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
                    // Nếu là sheet 64x16 (như player.png) thì cắt frame 16x16 đầu tiên
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

            // Thanh máu của người chơi (HP / 100)
            this.drawHealthBar(
                px - 2,
                py - 7,
                tileSize + 4,
                4,
                player.hp,
                player.maxHp,
                isMe ? '#2ecc71' : '#3498db'
            );

            // Tên người chơi + trạng thái
            this.ctx.fillStyle = isDead ? '#ff6b6b' : (isMe ? '#f1c40f' : '#ffffff');
            this.ctx.font = 'bold 10px "Courier New", monospace';
            this.ctx.textAlign = 'center';
            const statusSuffix = isDead ? ' [ĐÃ CHẾT]' : (isMe ? ' (Bạn)' : '');
            this.ctx.fillText(`${player.name}${statusSuffix}`, px + tileSize / 2, py - 10);

            // Vẽ Bong bóng Chat trên đầu nhân vật nếu vừa gửi tin nhắn
            const bubble = this.chatBubbles.get(player.id);
            if (bubble) {
                if (now > bubble.expiresAt) {
                    this.chatBubbles.delete(player.id);
                } else {
                    this.drawChatBubble(px + tileSize / 2, py - 24, bubble.text);
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
        const display = text.length > 34 ? text.slice(0, 34) + '…' : text;
        this.ctx.font = '11px "Courier New", monospace';
        const metrics = this.ctx.measureText(display);
        const padX = 6;
        const boxW = Math.max(36, metrics.width + padX * 2);
        const boxH = 18;
        const boxX = Math.max(4, Math.min(this.canvas.width - boxW - 4, centerX - boxW / 2));
        const boxY = Math.max(4, bottomY - boxH);

        this.ctx.fillStyle = 'rgba(15, 20, 25, 0.92)';
        this.ctx.fillRect(boxX, boxY, boxW, boxH);
        this.ctx.strokeStyle = '#f1c40f';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(boxX, boxY, boxW, boxH);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(display, boxX + boxW / 2, boxY + 13);
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
            this.ctx.fillText(ft.text, x, y);
            this.ctx.restore();
        }
    }
}
