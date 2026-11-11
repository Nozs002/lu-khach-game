import { WebSocketClient } from '../../network/WebSocketClient';
import { CanvasRenderer } from '../../render/CanvasRenderer';
import {
    AckPayload,
    ChatEventPayload,
    DamageEventPayload,
    EntityDespawnPayload,
    EntitySpawnPayload,
    ErrorPayload,
    ItemData
} from '../../types/protocol';

/**
 * MODULE PHẦN 4 (Hoàng) — Chat, Vật phẩm (Hiển thị/Nhặt bình máu) và Hồi sinh (Màn chết & Respawn).
 *
 * Bám sát đặc tả docs/protocol-v1.md và docs/game-design.md:
 * 1. Chat thời gian thực:
 *    - Nhấn Enter mở ô chat, Enter lần nữa gửi lệnh CHAT, Escape đóng ô chat.
 *    - Khi focus ô chat, các phím WASD/phím tắt nhân vật bị khóa.
 *    - Dùng textContent 100% để chống thực thi HTML/XSS (AC10).
 * 2. Hiển thị & Nhặt bình máu (LOOT):
 *    - Click vào bình máu trên bản đồ hoặc nhấn phím E:
 *      + Nếu khoảng cách Manhattan <= 1 -> gửi LOOT {itemId} ngay.
 *      + Nếu ở xa (Manhattan > 1) -> lưu pendingLootId, gửi MOVE_TO tới ô bình máu và tự gửi LOOT khi tới gần.
 *      + Hủy pendingLootId khi người chơi đi hướng khác, đánh quái, chết hoặc bình máu biến mất.
 * 3. Màn hình chết & Hồi sinh (RESPAWN):
 *    - Khi player.state === 'DEAD', phủ màn hình chết đếm ngược từ respawnReadyTick của server (3 giây = 30 ticks).
 *    - Nút Hồi sinh chỉ bật khi đã hết thời gian chờ; bấm gửi RESPAWN {} để về Khu an toàn với 100/100 HP.
 */
export class LootRespawnFeature {
    public pendingLootId: string | null = null;

    private chatMessagesEl: HTMLElement;
    private chatInputEl: HTMLInputElement;
    private chatSendBtn: HTMLButtonElement;

    private deathOverlayEl: HTMLElement;
    private deathCountdownEl: HTMLElement;
    private respawnBtn: HTMLButtonElement;

    private hpValueEl: HTMLElement;
    private hpBarFillEl: HTMLElement;
    private itemCountEl: HTMLElement;
    private feedbackBannerEl: HTMLElement;

    constructor(
        private net: WebSocketClient,
        private renderer: CanvasRenderer,
        private onLog: (msg: string) => void
    ) {
        this.chatMessagesEl = document.getElementById('chatMessages')!;
        this.chatInputEl = document.getElementById('chatInput') as HTMLInputElement;
        this.chatSendBtn = document.getElementById('chatSendBtn') as HTMLButtonElement;

        this.deathOverlayEl = document.getElementById('deathOverlay')!;
        this.deathCountdownEl = document.getElementById('deathCountdown')!;
        this.respawnBtn = document.getElementById('respawnBtn') as HTMLButtonElement;

        this.hpValueEl = document.getElementById('hpValue')!;
        this.hpBarFillEl = document.getElementById('hpBarFill')!;
        this.itemCountEl = document.getElementById('itemCount')!;
        this.feedbackBannerEl = document.getElementById('feedbackBanner')!;

        this.bindEvents();
    }

    public isChatInputFocused(): boolean {
        return document.activeElement === this.chatInputEl;
    }

    public cancelPendingLoot() {
        this.pendingLootId = null;
    }

    private bindEvents() {
        // 1. Sự kiện nút Gửi Chat
        this.chatSendBtn?.addEventListener('click', () => {
            this.submitChat();
        });

        // 2. Phím tắt Enter / Escape cho khung Chat theo đúng bảng thao tác Mục 3 game-design.md
        window.addEventListener('keydown', (e) => {
            const gameUI = document.getElementById('gameUI');
            if (!gameUI || gameUI.style.display === 'none') return;

            if (e.key === 'Enter') {
                if (this.isChatInputFocused()) {
                    e.preventDefault();
                    this.submitChat();
                } else {
                    e.preventDefault();
                    this.chatInputEl.focus();
                }
                return;
            }

            if (e.key === 'Escape') {
                if (this.isChatInputFocused()) {
                    e.preventDefault();
                    this.chatInputEl.blur();
                } else {
                    this.cancelPendingLoot();
                    this.net.sendAttack(null);
                }
                return;
            }

            // Phím E để nhặt nhanh bình máu ở gần khi không gõ chat
            if ((e.key === 'e' || e.key === 'E') && !this.isChatInputFocused()) {
                e.preventDefault();
                this.tryLootNearestPotion();
            }
        });

        // 3. Sự kiện nút Hồi sinh trên Màn hình chết
        this.respawnBtn?.addEventListener('click', () => {
            const me = this.net.getMyPlayer();
            if (!me || me.state !== 'DEAD') return;
            this.net.sendRespawn();
        });

        // 4. Các nút trong Bảng công cụ Test / Demo Phần 4
        document.getElementById('btnLootNearest')?.addEventListener('click', () => {
            this.tryLootNearestPotion();
        });

        document.getElementById('btnSimDamage')?.addEventListener('click', () => {
            this.net.sendCommand('SIMULATE_DAMAGE', { amount: 40 });
        });

        document.getElementById('btnSimDie')?.addEventListener('click', () => {
            this.net.sendCommand('SIMULATE_DAMAGE', { amount: 100 });
        });

        document.getElementById('btnSimKillMob')?.addEventListener('click', () => {
            this.net.sendCommand('SIMULATE_KILL_MOB', { forceDrop: true });
        });

        document.getElementById('btnSimSpawnPotion')?.addEventListener('click', () => {
            this.net.sendCommand('SIMULATE_SPAWN_POTION', {});
        });
    }

    /**
     * Gửi tin nhắn chat lên Server.
     */
    public submitChat() {
        const raw = this.chatInputEl.value;
        const trimmed = raw.trim();
        if (!trimmed) {
            this.chatInputEl.blur();
            return;
        }
        this.net.sendChat(trimmed);
        this.chatInputEl.value = '';
        this.chatInputEl.blur();
    }

    /**
     * Xử lý khi người chơi click vào một bình máu trên Canvas:
     * - Nếu khoảng cách Manhattan <= 1: gửi LOOT {itemId} ngay.
     * - Nếu ở xa: đặt pendingLootId = item.id và gửi MOVE_TO tới ô bình máu.
     */
    public requestLootItem(item: ItemData) {
        const me = this.net.getMyPlayer();
        if (!me) return;
        if (me.state === 'DEAD' || me.hp <= 0) {
            this.showFeedback('Nhân vật đã chết, không thể nhặt bình máu!', true);
            return;
        }

        const dist = Math.abs(me.x - item.x) + Math.abs(me.y - item.y);
        if (dist <= 1) {
            this.pendingLootId = null;
            this.net.sendLoot(item.id);
        } else {
            this.pendingLootId = item.id;
            this.showFeedback(`Đang di chuyển tới nhặt bình máu (${item.id})...`, false);
            this.net.sendMoveTo(item.x, item.y);
        }
    }

    /**
     * Tìm và nhặt bình máu gần nhất trên bản đồ.
     */
    public tryLootNearestPotion() {
        const me = this.net.getMyPlayer();
        if (!me) return;
        if (me.state === 'DEAD' || me.hp <= 0) {
            this.showFeedback('Bạn đang chết, hãy chờ Hồi sinh trước!', true);
            return;
        }

        let nearest: ItemData | null = null;
        let bestDist = Number.MAX_SAFE_INTEGER;
        this.net.items.forEach((item) => {
            if (item.mapId && item.mapId !== me.mapId) return;
            const d = Math.abs(me.x - item.x) + Math.abs(me.y - item.y);
            if (d < bestDist) {
                bestDist = d;
                nearest = item;
            }
        });

        if (!nearest) {
            this.showFeedback('Hiện không có bình máu nào trên bản đồ!', true);
            return;
        }
        this.requestLootItem(nearest);
    }

    /**
     * Nhận gói tin CHAT broadcast từ Server.
     * Bắt buộc dùng textContent để chống XSS / HTML injection (AC10).
     */
    public handleChatEvent(chat: ChatEventPayload, _tick: number) {
        const row = document.createElement('div');
        row.className = 'chat-item';

        const authorSpan = document.createElement('span');
        authorSpan.className = chat.playerId === this.net.myId ? 'chat-author me' : 'chat-author';
        authorSpan.textContent = `${chat.name}: `;

        const textSpan = document.createElement('span');
        textSpan.className = 'chat-text';
        textSpan.textContent = chat.text; // An toàn 100% với HTML/script

        row.appendChild(authorSpan);
        row.appendChild(textSpan);
        this.chatMessagesEl.appendChild(row);
        this.chatMessagesEl.scrollTop = this.chatMessagesEl.scrollHeight;

        if (chat.playerId) {
            this.renderer.addChatBubble(chat.playerId, chat.text);
        }
    }

    /**
     * Nhận gói tin ACK từ Server.
     */
    public handleAckEvent(ack: AckPayload, _requestId: number | null, _tick: number) {
        const me = this.net.getMyPlayer();
        switch (ack.commandType) {
            case 'LOOT':
                this.pendingLootId = null;
                if (me) {
                    this.renderer.addFloatingText(me.x, me.y, '+30 HP', '#2ecc71');
                }
                this.showFeedback('Đã nhặt và sử dụng Bình máu (+30 HP)!', false);
                this.onLog('[Vật phẩm] Nhặt bình máu thành công (+30 HP).');
                break;

            case 'RESPAWN':
                if (me) {
                    this.renderer.addFloatingText(me.x, me.y, 'HỒI SINH (100 HP)', '#00d2d3');
                }
                this.showFeedback('Đã hồi sinh tại Khu an toàn (100/100 HP)!', false);
                this.onLog('[Hồi sinh] Nhân vật đã hồi sinh tại Khu an toàn.');
                break;
        }
        this.syncHudAndDeathOverlay();
    }

    /**
     * Nhận gói tin ERROR từ Server (HP_FULL, ITEM_UNAVAILABLE, OUT_OF_RANGE, RESPAWN_NOT_READY, RATE_LIMITED...).
     */
    public handleErrorEvent(err: ErrorPayload, _requestId: number | null, _tick: number) {
        const me = this.net.getMyPlayer();
        if (err.code === 'ITEM_UNAVAILABLE' || err.code === 'HP_FULL' || err.code === 'PLAYER_DEAD') {
            this.pendingLootId = null;
        }
        if (me) {
            const shortLabel = err.code === 'HP_FULL'
                ? 'ĐẦY MÁU!'
                : err.code === 'OUT_OF_RANGE'
                    ? 'QUÁ XA!'
                    : err.code === 'ITEM_UNAVAILABLE'
                        ? 'ĐÃ MẤT!'
                        : err.code;
            this.renderer.addFloatingText(me.x, me.y, shortLabel, '#ff6b6b');
        }
        this.showFeedback(`[${err.code}] ${err.message}`, true);
        this.onLog(`[Từ chối - ${err.code}] ${err.message}`);
    }

    /**
     * Nhận sự kiện sát thương (DAMAGE).
     */
    public handleDamageEvent(dmg: DamageEventPayload, _tick: number) {
        const targetPlayer = this.net.players.get(dmg.targetId);
        if (targetPlayer) {
            this.renderer.addFloatingText(targetPlayer.x, targetPlayer.y, `-${dmg.amount} HP`, '#ff4757');
        } else {
            const targetMob = this.net.mobs.get(dmg.targetId);
            if (targetMob) {
                this.renderer.addFloatingText(targetMob.x, targetMob.y, `-${dmg.amount}`, '#ffa502');
            }
        }
        this.syncHudAndDeathOverlay();
    }

    /**
     * Nhận sự kiện xuất hiện thực thể (ENTITY_SPAWN: bình máu rơi, quái hồi sinh, player hồi sinh).
     */
    public handleEntitySpawn(spawn: EntitySpawnPayload, _tick: number) {
        if (spawn.kind === 'ITEM') {
            this.onLog(`[Rơi đồ] Bình máu (${spawn.id}) vừa xuất hiện trên bản đồ!`);
            this.showFeedback(`Quái rơi Bình máu (${spawn.id})! Click vào bình máu hoặc nhấn E để nhặt.`, false);
        } else if (spawn.kind === 'MOB') {
            this.onLog(`[Hồi sinh Quái] Quái ${spawn.id} đã hồi sinh (thế hệ #${spawn.spawnGeneration ?? 1}).`);
        }
        this.syncHudAndDeathOverlay();
    }

    /**
     * Nhận sự kiện biến mất thực thể (ENTITY_DESPAWN: DEAD, LOOTED, EXPIRED, DISCONNECTED).
     */
    public handleEntityDespawn(despawn: EntityDespawnPayload, _tick: number) {
        if (this.pendingLootId === despawn.id) {
            this.pendingLootId = null;
        }
        if (despawn.reason === 'EXPIRED') {
            this.onLog(`[Vật phẩm] Bình máu ${despawn.id} đã hết hạn sau 20 giây và biến mất.`);
        } else if (despawn.reason === 'DEAD') {
            if (despawn.id === this.net.myId) {
                this.onLog('[Cảnh báo] Bạn đã hết máu! Chờ 3 giây để Hồi sinh về Khu an toàn.');
            } else if (despawn.id.startsWith('m-')) {
                this.onLog(`[Chiến đấu] Quái ${despawn.id} đã bị hạ gục (sẽ hồi sinh sau 15 giây).`);
            }
        }
        this.syncHudAndDeathOverlay();
    }

    /**
     * Được gọi mỗi tick của thế giới (100ms):
     * - Kiểm tra nếu đang có pendingLootId và đã đứng cạnh bình máu (Manhattan <= 1) thì tự gửi LOOT.
     * - Cập nhật thanh máu HUD và đồng hồ đếm ngược trên Màn hình chết.
     */
    public onWorldTick(_tick: number) {
        const me = this.net.getMyPlayer();
        if (me) {
            if (me.state === 'DEAD' || me.hp <= 0) {
                this.pendingLootId = null;
            } else if (this.pendingLootId) {
                const item = this.net.items.get(this.pendingLootId);
                if (!item || (item.mapId && item.mapId !== me.mapId)) {
                    this.pendingLootId = null;
                } else {
                    const dist = Math.abs(me.x - item.x) + Math.abs(me.y - item.y);
                    if (dist <= 1) {
                        const targetItemId = this.pendingLootId;
                        this.pendingLootId = null;
                        this.net.sendLoot(targetItemId);
                    }
                }
            }
        }
        this.syncHudAndDeathOverlay();
    }

    /**
     * Đồng bộ thanh máu trên Top Bar và Màn hình chết (Death Overlay + nút Hồi sinh).
     */
    public syncHudAndDeathOverlay() {
        const me = this.net.getMyPlayer();
        if (this.itemCountEl) {
            this.itemCountEl.textContent = String(this.net.items.size);
        }
        if (!me) return;

        // Cập nhật thanh HP trên Top Bar
        const hpPercent = Math.max(0, Math.min(100, Math.round((me.hp / me.maxHp) * 100)));
        if (this.hpValueEl) {
            this.hpValueEl.textContent = `${me.hp}/${me.maxHp}`;
        }
        if (this.hpBarFillEl) {
            this.hpBarFillEl.style.width = `${hpPercent}%`;
            this.hpBarFillEl.style.backgroundColor = hpPercent > 50 ? '#2ecc71' : hpPercent > 25 ? '#f39c12' : '#e74c3c';
        }

        // Cập nhật Màn hình chết (Death Overlay)
        const isDead = me.state === 'DEAD' || me.hp <= 0;
        if (!isDead) {
            this.deathOverlayEl.style.display = 'none';
            return;
        }

        this.deathOverlayEl.style.display = 'flex';
        const readyTick = me.respawnReadyTick ?? this.net.currentTick;
        const remainingTicks = Math.max(0, readyTick - this.net.currentTick);
        const remainingSeconds = (remainingTicks * 0.1).toFixed(1);

        if (remainingTicks > 0) {
            this.deathCountdownEl.textContent = `Có thể hồi sinh sau: ${remainingSeconds} giây (${remainingTicks} tick)`;
            this.respawnBtn.disabled = true;
            this.respawnBtn.textContent = `CHỜ HỒI SINH (${remainingSeconds}s)...`;
        } else {
            this.deathCountdownEl.textContent = 'Đã đủ thời gian chờ! Bạn có thể hồi sinh về Khu an toàn.';
            this.respawnBtn.disabled = false;
            this.respawnBtn.textContent = 'HỒI SINH NGAY (Về Khu An Toàn - 100 HP)';
        }
    }

    public showFeedback(text: string, isError: boolean) {
        if (!this.feedbackBannerEl) return;
        this.feedbackBannerEl.textContent = text;
        this.feedbackBannerEl.className = isError ? 'feedback-banner error' : 'feedback-banner info';
    }
}
