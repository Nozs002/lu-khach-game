import { MOB_NAMES, type DamageEvent, type Mob } from '../../data/mob';
import type { WebSocketClient } from '../../network/WebSocketClient';
import type { CanvasRenderer } from '../../render/CanvasRenderer';
import { CombatView } from './CombatView';

export class CombatController {
    public readonly view: CombatView;
    private readonly canvas: HTMLCanvasElement;
    private lastPanel = '';

    constructor(private readonly renderer: CanvasRenderer, private readonly net: WebSocketClient,
                private readonly notify: (text: string) => void, private readonly clearPreview: () => void) {
        this.canvas = renderer.getCanvas();
        this.view = new CombatView(renderer, net);
        renderer.setCombatView(this.view);
        this.canvas.addEventListener('click', this.handleClick, true);
        net.damageListeners.add(this.handleDamage);
        net.resetListeners.add(this.handleReset);
        document.getElementById('view-nearest-mob')?.addEventListener('click', this.viewNearest);
        document.getElementById('stop-attack')?.addEventListener('click', this.stopAttack);
    }

    private handleDamage = (event: DamageEvent): void => { this.view.addDamage(event); };
    private handleReset = (): void => { this.view.reset(); this.lastPanel = ''; };

    private handleClick = (event: MouseEvent): void => {
        const player = this.net.myId ? this.net.players.get(this.net.myId) : undefined;
        if (!player) return;
        if (player.state === 'DEAD' || player.hp <= 0) {
            event.stopImmediatePropagation();
            this.notify('Nhân vật đã chết.');
            return;
        }
        const mob = this.view.pickMob(event.clientX, event.clientY);
        if (!mob) return; // Click đất vẫn do MovementController xử lý.
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!this.net.sendAttack(mob.id)) return this.notify('Chưa kết nối máy chủ.');
        this.view.selectedId = mob.id;
        this.clearPreview();
    };

    stopAttack = (): void => {
        if (!this.net.sendAttack(null)) return;
        this.view.selectedId = null;
        this.clearPreview();
    };

    clearSelection(): void { this.view.selectedId = null; }

    private nearestMob(): Mob | undefined {
        const player = this.net.myId ? this.net.players.get(this.net.myId) : undefined;
        if (!player) return undefined;
        return [...this.net.mobs.values()].filter(mob => mob.hp > 0 && mob.state !== 'DEAD')
            .sort((a, b) => (Math.abs(a.x - player.x) + Math.abs(a.y - player.y))
                - (Math.abs(b.x - player.x) + Math.abs(b.y - player.y)))[0];
    }

    private viewNearest = (): void => {
        const mob = this.nearestMob();
        if (!mob) return this.notify('Hiện không có quái còn sống.');
        this.renderer.centerOnWorldTile(mob.x, mob.y);
        this.view.selectedId = mob.id;
        this.notify('Đang xem bãi quái. Tự di chuyển đến ô kề rồi click quái để đánh; Space để xem nhân vật.');
    };

    update(): void {
        let target = this.view.selectedId ? this.net.mobs.get(this.view.selectedId) : undefined;
        if (target && target.hp <= 0) {
            this.view.selectedId = null;
            target = undefined;
        }
        const player = this.net.myId ? this.net.players.get(this.net.myId) : undefined;
        const nearest = this.nearestMob();
        const distance = nearest && player ? Math.abs(nearest.x - player.x) + Math.abs(nearest.y - player.y) : null;
        const targetDistance = target && player ? Math.abs(target.x - player.x) + Math.abs(target.y - player.y) : null;
        const hint = player?.state === 'DEAD' ? 'Nhân vật đã chết; chưa có hồi sinh.'
            : target ? targetDistance === 1 ? 'Đứng kề quái để đánh · Click đất hoặc Esc để dừng.'
                : 'Ngoài tầm đánh. Tự di chuyển đến ô kề rồi click quái để đánh.'
            : nearest ? `Quái gần nhất cách ${distance} ô. Click quái để chọn; đứng kề để đánh.`
            : 'Hiện không có quái còn sống.';
        const key = `${target?.id}|${target?.hp}|${target?.maxHp}|${hint}|${Boolean(player?.targetId)}`;
        if (key === this.lastPanel) return;
        this.lastPanel = key;
        document.getElementById('combat-target')!.hidden = !target;
        document.getElementById('combat-hint')!.textContent = hint;
        document.getElementById('stop-attack')!.hidden = !player?.targetId;
        (document.getElementById('view-nearest-mob') as HTMLButtonElement).disabled = !nearest;
        if (target) {
            document.getElementById('target-name')!.textContent = MOB_NAMES[target.kind] ?? target.kind;
            document.getElementById('target-hp')!.textContent = `${target.hp} / ${target.maxHp} HP`;
            const avatar = document.getElementById('target-avatar') as HTMLImageElement;
            const source = `/assets/mobs/${target.kind}-face.png`;
            if (avatar.getAttribute('src') !== source) avatar.src = source;
        }
    }

    destroy(): void {
        this.canvas.removeEventListener('click', this.handleClick, true);
        this.net.damageListeners.delete(this.handleDamage);
        this.net.resetListeners.delete(this.handleReset);
        document.getElementById('view-nearest-mob')?.removeEventListener('click', this.viewNearest);
        document.getElementById('stop-attack')?.removeEventListener('click', this.stopAttack);
        this.renderer.setCombatView(null);
        this.view.reset();
    }
}
