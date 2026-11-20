import type { WorldItem } from '../../data/items';
import type { MovementController } from '../../input/MovementController';
import type { WebSocketClient } from '../../network/WebSocketClient';
import type {
    ChatEvent,
    DamageEvent,
    EntityDespawnEvent,
    EntitySpawnEvent
} from '../../network/handlers/HandlerContext';
import type { GridPoint } from '../../pathfinding/AStarPathfinder';
import type { CanvasRenderer } from '../../render/CanvasRenderer';
import { showError, showInfo, showSuccess } from '../../ui/Toast';

const MAX_CHAT_CODE_POINTS = 120;
const AUTO_WALK_LOOT_MAX_DISTANCE = 12;

export class LootRespawnFeature {
    private pendingLootId: string | null = null;
    private lootRequestInFlight = false;
    private respawnRequestInFlight = false;
    private wasDead = false;

    private readonly chatMessagesEl: HTMLElement | null;
    private readonly chatInputEl: HTMLInputElement | null;
    private readonly chatSendBtn: HTMLButtonElement | null;
    private readonly hpValueEl: HTMLElement | null;
    private readonly hpTrackEl: HTMLElement | null;
    private readonly hpFillEl: HTMLElement | null;
    private readonly hpNoteEl: HTMLElement | null;
    private readonly deathOverlayEl: HTMLElement | null;
    private readonly deathCountdownEl: HTMLElement | null;
    private readonly respawnBtn: HTMLButtonElement | null;
    private readonly testSpawnPotionBtn: HTMLButtonElement | null;
    private readonly testDamage40Btn: HTMLButtonElement | null;
    private readonly testSuicideBtn: HTMLButtonElement | null;

    private readonly onChatSendClick = () => this.submitChat();
    private readonly onChatInputKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
            this.submitChat();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            this.chatInputEl?.blur();
        }
    };
    private readonly onRespawnClick = () => this.requestRespawn();
    private readonly onTestSpawnPotionClick = () => {
        if (!this.net.sendSimulateSpawnPotion()) {
            showError('Chưa kết nối máy chủ.');
        }
    };
    private readonly onTestDamage40Click = () => {
        if (!this.net.sendSimulateDamage(40)) {
            showError('Chưa kết nối máy chủ.');
        }
    };
    private readonly onTestSuicideClick = () => {
        if (!this.net.sendSimulateDamage(100)) {
            showError('Chưa kết nối máy chủ.');
        }
    };

    constructor(
        private readonly net: WebSocketClient,
        private readonly renderer: CanvasRenderer,
        private readonly movement: MovementController,
        private readonly onLog: (message: string) => void
    ) {
        this.chatMessagesEl = document.getElementById('chatMessages');
        this.chatInputEl = document.getElementById('chatInput') as HTMLInputElement | null;
        this.chatSendBtn = document.getElementById('chatSendBtn') as HTMLButtonElement | null;
        this.hpValueEl = document.getElementById('player-hp');
        this.hpTrackEl = document.getElementById('player-hp-bar');
        this.hpFillEl = document.getElementById('player-hp-fill');
        this.hpNoteEl = document.getElementById('player-combat-state');
        this.deathOverlayEl = document.getElementById('deathOverlay');
        this.deathCountdownEl = document.getElementById('deathCountdown');
        this.respawnBtn = document.getElementById('respawnBtn') as HTMLButtonElement | null;
        this.testSpawnPotionBtn = document.getElementById('testSpawnPotionBtn') as HTMLButtonElement | null;
        this.testDamage40Btn = document.getElementById('testDamage40Btn') as HTMLButtonElement | null;
        this.testSuicideBtn = document.getElementById('testSuicideBtn') as HTMLButtonElement | null;

        this.chatSendBtn?.addEventListener('click', this.onChatSendClick);
        this.chatInputEl?.addEventListener('keydown', this.onChatInputKeyDown);
        this.respawnBtn?.addEventListener('click', this.onRespawnClick);
        this.testSpawnPotionBtn?.addEventListener('click', this.onTestSpawnPotionClick);
        this.testDamage40Btn?.addEventListener('click', this.onTestDamage40Click);
        this.testSuicideBtn?.addEventListener('click', this.onTestSuicideClick);
    }

    public reset(): void {
        this.pendingLootId = null;
        this.lootRequestInFlight = false;
        this.respawnRequestInFlight = false;
        this.wasDead = false;
        this.renderer.clearEffects();
        if (this.chatMessagesEl) {
            this.chatMessagesEl.replaceChildren();
        }
        if (this.deathOverlayEl) {
            this.deathOverlayEl.hidden = true;
        }
    }

    public cancelPendingLoot(): void {
        this.pendingLootId = null;
    }

    public focusChatInput(): boolean {
        if (!this.chatInputEl) return false;
        this.chatInputEl.focus();
        return true;
    }

    public isChatFocused(): boolean {
        return Boolean(this.chatInputEl && document.activeElement === this.chatInputEl);
    }

    /**
     * Xử lý phím tắt Phần 4 khi người chơi đang ở màn hình game và không gõ trong input:
     * - Enter: mở/focus ô chat
     * - E: nhặt bình máu gần nhất
     * - R: bấm nhanh Hồi sinh khi đã hết đếm ngược
     */
    public handleGlobalKeyDown(event: KeyboardEvent): boolean {
        if (event.code === 'Enter' && !event.repeat) {
            event.preventDefault();
            return this.focusChatInput();
        }
        if (event.code === 'KeyE' && !event.repeat) {
            event.preventDefault();
            this.tryLootNearest();
            return true;
        }
        if (event.code === 'KeyR' && !event.repeat) {
            const me = this.net.myId ? this.net.players.get(this.net.myId) : undefined;
            if (me?.state === 'DEAD' && this.respawnBtn && !this.respawnBtn.disabled) {
                event.preventDefault();
                this.requestRespawn();
                return true;
            }
        }
        return false;
    }

    /**
     * Chặn click Canvas nếu người chơi click trúng ô có bình máu.
     */
    public handleTileClick(tile: GridPoint): boolean {
        const clickedItem = this.findItemAt(tile.x, tile.y);
        if (!clickedItem) {
            return false;
        }
        this.interactWithItem(clickedItem);
        return true;
    }

    public tryLootNearest(): void {
        const me = this.net.myId ? this.net.players.get(this.net.myId) : undefined;
        if (!me) return;
        if (me.state === 'DEAD') {
            showInfo('Bạn đã chết, không thể nhặt vật phẩm.');
            return;
        }
        let nearest: WorldItem | null = null;
        let bestDist = Infinity;
        this.net.items.forEach(item => {
            const dist = Math.abs(me.x - item.x) + Math.abs(me.y - item.y);
            if (dist < bestDist) {
                bestDist = dist;
                nearest = item;
            }
        });
        if (!nearest) {
            showInfo('Không có bình máu nào trên bản đồ.');
            return;
        }
        if (bestDist > AUTO_WALK_LOOT_MAX_DISTANCE) {
            showInfo('Bình máu gần nhất đang ở khá xa — hãy click trực tiếp vào bình máu để chạy tới.');
            return;
        }
        this.interactWithItem(nearest);
    }

    private interactWithItem(item: WorldItem): void {
        const me = this.net.myId ? this.net.players.get(this.net.myId) : undefined;
        if (!me) return;
        if (me.state === 'DEAD') {
            showInfo('Bạn đã chết, không thể nhặt bình máu.');
            return;
        }
        const dist = Math.abs(me.x - item.x) + Math.abs(me.y - item.y);
        if (dist <= 1) {
            this.pendingLootId = null;
            this.dispatchLoot(item.id);
            return;
        }
        this.pendingLootId = item.id;
        if (this.movement.moveToTile({ x: item.x, y: item.y }, true)) {
            showInfo('Đang di chuyển tới bình máu để nhặt...');
        } else {
            this.pendingLootId = null;
        }
    }

    private dispatchLoot(itemId: string): void {
        if (this.lootRequestInFlight) return;
        if (this.net.sendLoot(itemId)) {
            this.lootRequestInFlight = true;
        } else {
            showError('Chưa kết nối máy chủ.');
        }
    }

    private findItemAt(x: number, y: number): WorldItem | null {
        for (const item of this.net.items.values()) {
            if (item.x === x && item.y === y) {
                return item;
            }
        }
        return null;
    }

    private submitChat(): void {
        if (!this.chatInputEl) return;
        const raw = this.chatInputEl.value;
        const trimmed = raw.trim();
        if (!trimmed) {
            this.chatInputEl.blur();
            return;
        }
        const codePoints = Array.from(trimmed).length;
        if (codePoints > MAX_CHAT_CODE_POINTS) {
            showError(`Tin nhắn tối đa ${MAX_CHAT_CODE_POINTS} ký tự.`);
            return;
        }
        if (this.net.sendChat(trimmed)) {
            this.chatInputEl.value = '';
            this.chatInputEl.blur();
        } else {
            showError('Chưa kết nối máy chủ; không thể gửi tin nhắn.');
        }
    }

    private requestRespawn(): void {
        if (this.respawnRequestInFlight) return;
        if (this.net.sendRespawn()) {
            this.respawnRequestInFlight = true;
            if (this.respawnBtn) {
                this.respawnBtn.disabled = true;
            }
        } else {
            showError('Chưa kết nối máy chủ.');
        }
    }

    public handleChatEvent(event: ChatEvent): void {
        this.renderer.addChatBubble(event.playerId, event.text);
        if (!this.chatMessagesEl) return;

        const row = document.createElement('div');
        row.className = 'chat-entry' + (event.playerId === this.net.myId ? ' is-me' : '');

        const timeEl = document.createElement('time');
        const now = new Date();
        timeEl.dateTime = now.toISOString();
        timeEl.textContent = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

        const authorEl = document.createElement('strong');
        authorEl.textContent = `${event.name}: `;

        const bodyEl = document.createElement('span');
        // Bắt buộc dùng textContent để chống XSS (AC10)
        bodyEl.textContent = event.text;

        const contentWrap = document.createElement('div');
        contentWrap.className = 'chat-text';
        contentWrap.append(authorEl, bodyEl);

        row.append(timeEl, contentWrap);
        this.chatMessagesEl.appendChild(row);
        while (this.chatMessagesEl.childElementCount > 100) {
            this.chatMessagesEl.firstElementChild?.remove();
        }
        this.chatMessagesEl.scrollTop = this.chatMessagesEl.scrollHeight;
    }

    public handleDamageEvent(event: DamageEvent): void {
        const target = this.net.players.get(event.targetId);
        const gx = typeof event.x === 'number' ? event.x : target?.x;
        const gy = typeof event.y === 'number' ? event.y : target?.y;
        if (typeof gx === 'number' && typeof gy === 'number') {
            this.renderer.addFloatingText(gx, gy, `-${event.amount} HP`, '#f87171');
        }
        if (event.targetId === this.net.myId) {
            this.onLog(`[Chiến đấu] Bạn nhận ${event.amount} sát thương.`);
        }
    }

    public handleEntitySpawn(event: EntitySpawnEvent): void {
        if (event.kind === 'ITEM') {
            this.onLog(`[Vật phẩm] Một bình máu xuất hiện tại (${event.x ?? '?'}, ${event.y ?? '?'}).`);
        } else if (event.kind === 'PLAYER' && event.id === this.net.myId) {
            this.respawnRequestInFlight = false;
            this.renderer.centerOnPlayer(this.net.myId);
            const maxHp = this.net.players.get(this.net.myId)?.maxHp;
            showSuccess(`Bạn đã hồi sinh tại Làng Bến Cỏ${typeof maxHp === 'number' ? ` (${maxHp}/${maxHp} HP)` : ''}!`);
            this.onLog('[Hồi sinh] Bạn đã hồi sinh đầy máu tại điểm xuất phát.');
        }
    }

    public handleEntityDespawn(event: EntityDespawnEvent): void {
        if (event.id === this.pendingLootId) {
            this.pendingLootId = null;
        }
        if (event.reason === 'LOOTED') {
            const healed = typeof event.healedAmount === 'number' ? event.healedAmount : 30;
            if (event.lootedBy === this.net.myId) {
                this.lootRequestInFlight = false;
                const me = this.net.players.get(this.net.myId);
                const fx = me?.x ?? event.x ?? 0;
                const fy = me?.y ?? event.y ?? 0;
                this.renderer.addFloatingText(fx, fy, `+${healed} HP`, '#4ade80');
                showSuccess(`Đã nhặt bình máu (+${healed} HP)!`);
                this.onLog(`[Vật phẩm] Bạn nhặt bình máu và hồi +${healed} HP.`);
            } else if (event.lootedByName) {
                this.onLog(`[Vật phẩm] ${event.lootedByName} đã nhặt bình máu.`);
            }
        } else if (event.reason === 'EXPIRED') {
            this.onLog('[Vật phẩm] Một bình máu trên bản đồ đã hết hạn.');
        } else if (event.reason === 'DEAD' && event.id === this.net.myId) {
            this.pendingLootId = null;
            this.movement.clearPreview();
            this.onLog('[Tử trận] Bạn đã bị hạ gục! Chờ 3 giây để hồi sinh.');
        }
    }

    public handleAck(commandType: string): void {
        if (commandType === 'LOOT') {
            this.lootRequestInFlight = false;
        } else if (commandType === 'RESPAWN') {
            this.respawnRequestInFlight = false;
            this.renderer.centerOnPlayer(this.net.myId);
        }
    }

    public handleErrorCode(code: string | undefined): void {
        this.lootRequestInFlight = false;
        this.respawnRequestInFlight = false;
        if (code === 'ITEM_UNAVAILABLE' || code === 'HP_FULL' || code === 'PLAYER_DEAD') {
            this.pendingLootId = null;
        }
    }

    public syncState(): void {
        const me = this.net.myId ? this.net.players.get(this.net.myId) : undefined;
        this.updateHpHud(me);

        // Kiểm tra auto-loot nếu người chơi đã chạy đủ gần bình máu đang chờ
        if (me && me.state !== 'DEAD' && this.pendingLootId) {
            const targetItem = this.net.items.get(this.pendingLootId);
            if (!targetItem) {
                this.pendingLootId = null;
            } else {
                const dist = Math.abs(me.x - targetItem.x) + Math.abs(me.y - targetItem.y);
                if (dist <= 1) {
                    const idToLoot = targetItem.id;
                    this.pendingLootId = null;
                    this.dispatchLoot(idToLoot);
                }
            }
        }

        const isDead = Boolean(me && (me.state === 'DEAD' || (typeof me.hp === 'number' && me.hp <= 0)));
        if (isDead && !this.wasDead) {
            this.pendingLootId = null;
            this.movement.clearPreview();
        }
        this.wasDead = isDead;
        this.updateDeathOverlay(performance.now());
    }

    public onFrame(timestamp: number): void {
        this.updateDeathOverlay(timestamp);
    }

    private updateHpHud(me?: { hp?: number; maxHp?: number; state?: string }): void {
        const hp = typeof me?.hp === 'number' ? me.hp : null;
        const maxHp = typeof me?.maxHp === 'number' ? me.maxHp : null;

        if (this.hpValueEl) {
            this.hpValueEl.textContent = hp !== null && maxHp !== null ? `${hp} / ${maxHp}` : '— / —';
        }
        if (this.hpTrackEl && this.hpFillEl) {
            if (hp !== null && maxHp !== null && maxHp > 0) {
                this.hpTrackEl.classList.remove('unavailable');
                this.hpTrackEl.setAttribute('aria-label', `Máu hiện tại ${hp} trên ${maxHp}`);
                const pct = Math.max(0, Math.min(100, Math.round((hp / maxHp) * 100)));
                this.hpFillEl.style.width = `${pct}%`;
                this.hpFillEl.dataset.level = pct > 50 ? 'high' : pct > 25 ? 'mid' : 'low';
            } else {
                this.hpTrackEl.classList.add('unavailable');
                this.hpFillEl.style.width = '0%';
            }
        }
        if (this.hpNoteEl) {
            const potionCount = this.net.items.size;
            const statusText = me?.state === 'DEAD' ? 'Trạng thái: Đã tử trận' : 'Trạng thái: Sẵn sàng';
            this.hpNoteEl.textContent = `${statusText} · Bình máu trên map: ${potionCount}`;
        }
    }

    private updateDeathOverlay(timestamp: number): void {
        if (!this.deathOverlayEl || !this.deathCountdownEl || !this.respawnBtn) return;

        const me = this.net.myId ? this.net.players.get(this.net.myId) : undefined;
        const isDead = Boolean(me && (me.state === 'DEAD' || (typeof me.hp === 'number' && me.hp <= 0)));
        if (!isDead) {
            this.deathOverlayEl.hidden = true;
            this.respawnRequestInFlight = false;
            return;
        }

        this.deathOverlayEl.hidden = false;
        const readyTick = typeof me?.respawnReadyTick === 'number' ? me.respawnReadyTick : this.net.currentTick;
        const estimatedTick = this.net.getEstimatedTick(timestamp);
        const remainingTicks = Math.max(0, readyTick - estimatedTick);
        const remainingSec = (remainingTicks * this.net.tickDurationMs) / 1000;

        if (remainingTicks > 0.05) {
            this.deathCountdownEl.textContent = `Có thể hồi sinh sau ${remainingSec.toFixed(1)} giây...`;
            this.respawnBtn.disabled = true;
            this.respawnBtn.textContent = `CHỜ (${Math.ceil(remainingSec)}s)`;
        } else {
            this.deathCountdownEl.textContent = 'Đã sẵn sàng trở về Làng Bến Cỏ với đầy máu.';
            this.respawnBtn.disabled = this.respawnRequestInFlight;
            this.respawnBtn.textContent = this.respawnRequestInFlight ? 'ĐANG HỒI SINH...' : 'HỒI SINH (R)';
        }
    }

    public destroy(): void {
        this.chatSendBtn?.removeEventListener('click', this.onChatSendClick);
        this.chatInputEl?.removeEventListener('keydown', this.onChatInputKeyDown);
        this.respawnBtn?.removeEventListener('click', this.onRespawnClick);
        this.testSpawnPotionBtn?.removeEventListener('click', this.onTestSpawnPotionClick);
        this.testDamage40Btn?.removeEventListener('click', this.onTestDamage40Click);
        this.testSuicideBtn?.removeEventListener('click', this.onTestSuicideClick);
    }
}
