import type { DamageEvent, Mob } from '../../data/mob';
import type { MapData } from '../../data/maps';
import type { WebSocketClient } from '../../network/WebSocketClient';
import type { CanvasRenderer } from '../../render/CanvasRenderer';
import { imageCache } from '../../render/ImageCache';

interface Point { x: number; y: number }
interface Pose extends Point {
    fromX: number; fromY: number; targetX: number; targetY: number;
    startedAt: number; generation: number; deadAt: number | null;
}
interface Hit {
    attackerId: string; targetId: string; source: Point; target: Point;
    amount: number; startedAt: number;
}
export interface CombatDrawable { y: number; draw(): void }

export class CombatView {
    public selectedId: string | null = null;
    private readonly poses = new Map<string, Pose>();
    private hits: Hit[] = [];

    drawDrops(ctx: CanvasRenderingContext2D, map: MapData, cameraX: number, cameraY: number): void {
        if (!this.net.drops || this.net.drops.size === 0) return;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        for (const drop of this.net.drops.values()) {
            // Lệch nhẹ sang phải (+3px) để nhìn thấy cả vũ khí lẫn bình máu nếu rơi cùng ô.
            const x = (drop.x + 0.5) * map.tileSize - cameraX + 3;
            const y = (drop.y + 0.5) * map.tileSize - cameraY - 2;
            if (x < -16 || y < -16 || x > ctx.canvas.width + 16 || y > ctx.canvas.height + 16) continue;
            ctx.fillStyle = '#ffd166';
            ctx.globalAlpha = 0.4;
            ctx.beginPath();
            ctx.ellipse(x, y + 7, 7, 3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            const image = imageCache.get(`/assets/items/${drop.itemId}.png`);
            if (image.complete && image.naturalWidth > 0) {
                const scale = Math.min(13 / image.naturalWidth, 13 / image.naturalHeight);
                const width = image.naturalWidth * scale;
                const height = image.naturalHeight * scale;
                ctx.drawImage(image, x - width / 2, y + 6 - height, width, height);
            } else {
                ctx.fillStyle = '#ffd166';
                ctx.fillRect(x - 4, y - 4, 8, 8);
            }
        }
        ctx.restore();
    }

    constructor(private readonly renderer: CanvasRenderer, private readonly net: WebSocketClient) {}

    reset(): void {
        this.selectedId = null;
        this.poses.clear();
        this.hits = [];
    }

    addDamage(event: DamageEvent): void {
        const source = this.entityPosition(event.attackerId);
        const target = this.entityPosition(event.targetId);
        if (!source || !target) return;
        this.hits.push({ ...event, source: { ...source }, target: { ...target }, startedAt: performance.now() });
        if (this.hits.length > 200) this.hits.shift();
    }

    pickMob(clientX: number, clientY: number): Mob | undefined {
        const point = this.renderer.getWorldPointAtClientPosition(clientX, clientY);
        if (!point) return undefined;
        return [...this.net.mobs.values()]
            .filter(mob => mob.hp > 0 && mob.state !== 'DEAD')
            .map(mob => {
                const pose = this.poses.get(mob.id) ?? mob;
                return { mob, distance: Math.hypot(point.x - pose.x - 0.5, point.y - pose.y - 0.5) };
            })
            .filter(entry => entry.distance <= 0.65)
            .sort((a, b) => a.distance - b.distance)[0]?.mob;
    }

    getAttackOffset(id: string, now: number): Point {
        const hit = [...this.hits].reverse().find(event => event.attackerId === id && now - event.startedAt < 180);
        if (!hit) return { x: 0, y: 0 };
        const dx = hit.target.x - hit.source.x, dy = hit.target.y - hit.source.y;
        const length = Math.hypot(dx, dy) || 1;
        const step = Math.sin((now - hit.startedAt) / 180 * Math.PI) * 0.18;
        return { x: dx / length * step, y: dy / length * step };
    }

    getMobDrawables(ctx: CanvasRenderingContext2D, map: MapData,
                    cameraX: number, cameraY: number, now: number): CombatDrawable[] {
        for (const id of this.poses.keys()) if (!this.net.mobs.has(id)) this.poses.delete(id);
        const drawables: CombatDrawable[] = [];
        for (const mob of this.net.mobs.values()) {
            const pose = this.updatePose(mob, now);
            const deadAge = pose.deadAt === null ? 0 : now - pose.deadAt;
            if (pose.deadAt !== null && deadAge > 700) continue;
            const offset = this.getAttackOffset(mob.id, now);
            const x = (pose.x + offset.x) * map.tileSize + (map.tileSize - 16) / 2 - cameraX;
            const moving = pose.x !== pose.targetX || pose.y !== pose.targetY;
            const bob = moving && mob.hp > 0 ? Math.sin(now / 70) * 1.2 : 0;
            const y = (pose.y + offset.y) * map.tileSize + map.tileSize - 16 - cameraY + bob;
            if (x < -20 || y < -20 || x > ctx.canvas.width + 20 || y > ctx.canvas.height + 20) continue;
            drawables.push({ y: pose.y, draw: () => {
                const image = imageCache.get(`/assets/mobs/${mob.kind}.png`);
                ctx.save();
                ctx.imageSmoothingEnabled = false;
                if (pose.deadAt !== null) ctx.globalAlpha = Math.max(0, 1 - deadAge / 700);
                if (image.complete && image.naturalWidth > 0) {
                    // Frame đứng đầu tiên; hiệu ứng bước/đánh không phụ thuộc thứ tự sheet.
                    ctx.drawImage(image, 0, 0, 16, 16, x, y, 16, 16);
                } else {
                    ctx.fillStyle = '#cf6761';
                    ctx.fillRect(x, y, 16, 16);
                }
                ctx.restore();
            }});
        }
        return drawables;
    }

    drawOverlay(ctx: CanvasRenderingContext2D, map: MapData,
                cameraX: number, cameraY: number, now: number): void {
        const size = map.tileSize;
        ctx.save();
        for (const mob of this.net.mobs.values()) {
            if (mob.hp <= 0 || mob.state === 'DEAD') continue;
            const pose = this.poses.get(mob.id) ?? mob;
            const x = (pose.x + 0.5) * size - cameraX, y = pose.y * size - cameraY;
            if (x < -30 || y < -30 || x > ctx.canvas.width + 30 || y > ctx.canvas.height + 30) continue;
            if (mob.id === this.selectedId) {
                ctx.strokeStyle = '#ffd166';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.ellipse(x, y + size - 1, size * 0.6, size * 0.25, 0, 0, Math.PI * 2);
                ctx.stroke();
            }
            this.healthBar(ctx, x - 10, y - 5, 20, mob.hp, mob.maxHp, '#ed7470');
        }
        for (const player of this.net.players.values()) {
            if (!Number.isFinite(player.hp) || player.maxHp <= 0) continue;
            const point = this.renderer.getRenderedPlayerPosition(player.id) ?? player;
            const x = (point.x + 0.5) * size - cameraX, y = point.y * size - cameraY;
            this.healthBar(ctx, x - 12, y - 18, 24, player.hp, player.maxHp, '#68cc8a');
            if (player.state === 'DEAD') {
                ctx.fillStyle = '#ff8c8c';
                ctx.font = 'bold 9px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('ĐÃ CHẾT', x, y + size + 10);
            }
        }
        this.hits = this.hits.filter(hit => now - hit.startedAt < 700);
        for (const hit of this.hits) {
            const age = now - hit.startedAt;
            const source = this.entityPosition(hit.attackerId) ?? hit.source;
            const target = this.entityPosition(hit.targetId) ?? hit.target;
            const sx = (source.x + 0.5) * size - cameraX, sy = (source.y + 0.5) * size - cameraY;
            const tx = (target.x + 0.5) * size - cameraX, ty = (target.y + 0.5) * size - cameraY;
            if (age < 180) {
                const angle = Math.atan2(ty - sy, tx - sx);
                ctx.globalAlpha = 1 - age / 180;
                ctx.strokeStyle = '#ffe2a8';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(sx, sy, size * 0.8, angle - 0.8 + age / 250, angle + 0.5 + age / 250);
                ctx.stroke();
                ctx.globalAlpha *= 0.6;
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(tx, ty, size * 0.45, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = Math.max(0, 1 - age / 700);
            ctx.fillStyle = '#ffcc77';
            ctx.strokeStyle = '#181818';
            ctx.lineWidth = 2;
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.strokeText(`-${hit.amount}`, tx, ty - size - age * 0.025);
            ctx.fillText(`-${hit.amount}`, tx, ty - size - age * 0.025);
        }
        ctx.restore();
    }

    private updatePose(mob: Mob, now: number): Pose {
        let pose = this.poses.get(mob.id);
        if (!pose || pose.generation !== mob.spawnGeneration) {
            pose = { x: mob.x, y: mob.y, fromX: mob.x, fromY: mob.y,
                targetX: mob.x, targetY: mob.y, startedAt: now, generation: mob.spawnGeneration,
                deadAt: mob.hp <= 0 ? now : null };
            this.poses.set(mob.id, pose);
            return pose;
        }
        const progress = Math.max(0, Math.min(1, (now - pose.startedAt) / 400));
        pose.x = pose.fromX + (pose.targetX - pose.fromX) * progress;
        pose.y = pose.fromY + (pose.targetY - pose.fromY) * progress;
        if (pose.targetX !== mob.x || pose.targetY !== mob.y) {
            pose.fromX = pose.x; pose.fromY = pose.y;
            pose.targetX = mob.x; pose.targetY = mob.y; pose.startedAt = now;
        }
        if (mob.hp <= 0 && pose.deadAt === null) pose.deadAt = now;
        return pose;
    }

    private entityPosition(id: string): Point | undefined {
        const player = this.net.players.get(id);
        return player ? this.renderer.getRenderedPlayerPosition(id) ?? player
            : this.poses.get(id) ?? this.net.mobs.get(id);
    }

    private healthBar(ctx: CanvasRenderingContext2D, x: number, y: number,
                      width: number, hp: number, maxHp: number, color: string): void {
        ctx.fillStyle = '#171b22';
        ctx.fillRect(x - 1, y - 1, width + 2, 4);
        ctx.fillStyle = color;
        ctx.fillRect(x, y, width * Math.max(0, Math.min(1, hp / maxHp)), 2);
    }
}
