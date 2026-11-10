import {
    createDefaultMapFixture,
    createWelcomeFixture
} from '../mock/fixtures';
import {
    AckPayload,
    ChatEventPayload,
    ClientCommandType,
    DamageEventPayload,
    EntityDespawnPayload,
    EntitySpawnPayload,
    ErrorPayload,
    ItemData,
    MapData,
    MobData,
    PlayerData,
    WelcomePayload,
    WorldState
} from '../types/protocol';

export type { PlayerData, MobData, ItemData, MapData, WorldState };

export interface NetworkCallbacks {
    onReady: () => void;
    onLog: (msg: string) => void;
    onDialogue: (name: string, text: string) => void;
    onPlayersUpdate: () => void;
    onStatusChange: (online: boolean, text: string) => void;
    onChatReceived?: (event: ChatEventPayload, tick: number) => void;
    onAckReceived?: (ack: AckPayload, requestId: number | null, tick: number) => void;
    onErrorReceived?: (err: ErrorPayload, requestId: number | null, tick: number) => void;
    onDamageReceived?: (dmg: DamageEventPayload, tick: number) => void;
    onEntitySpawn?: (spawn: EntitySpawnPayload, tick: number) => void;
    onEntityDespawn?: (despawn: EntityDespawnPayload, tick: number) => void;
    onWorldTick?: (tick: number) => void;
}

/**
 * Lớp quản lý kết nối WebSocket theo đúng chuẩn docs/protocol-v1.md:
 * - Phong bì lệnh: {v: 1, type, requestId, payload} (requestId tự tăng từ 1 trên mỗi kết nối).
 * - Hỗ trợ cả Server thật (ws://localhost:8080) lẫn Chế độ Dữ liệu giả định (Mock Fixture Mode)
 *   để Phần 4 không bao giờ phải chờ các phần khác mới chạy và kiểm thử được.
 */
export class WebSocketClient {
    private ws: WebSocket | null = null;
    private requestIdCounter = 0;
    private mockTimer: number | null = null;
    private lastMockChatMs = 0;
    private mockItemSeq = 2;

    public isMockMode = false;
    public myId: string | null = null;
    public currentTick = 0;
    public map: MapData = createDefaultMapFixture();

    public players: Map<string, PlayerData> = new Map();
    public mobs: Map<string, MobData> = new Map();
    public items: Map<string, ItemData> = new Map();

    private callbacks!: NetworkCallbacks;

    public connect(
        name: string,
        avatar: string,
        onReady: () => void,
        onLog: (msg: string) => void,
        onDialogue: (name: string, text: string) => void,
        onPlayersUpdate: () => void,
        onStatusChange: (online: boolean, text: string) => void,
        extraCallbacks?: Partial<NetworkCallbacks>,
        forceMock = false
    ) {
        this.cleanup();
        this.requestIdCounter = 0;
        this.currentTick = 0;

        this.callbacks = {
            onReady,
            onLog,
            onDialogue,
            onPlayersUpdate,
            onStatusChange,
            ...extraCallbacks
        };

        if (forceMock) {
            this.startMockSession(name, avatar);
            return;
        }

        const wsUrl = (window as unknown as { GAME_WS_URL?: string }).GAME_WS_URL || 'ws://localhost:8080';
        try {
            this.ws = new WebSocket(wsUrl);
        } catch {
            onLog('[Hệ thống] Không mở được WebSocket, chuyển sang Chế độ Dữ liệu giả định (Mock Fixture).');
            this.startMockSession(name, avatar);
            return;
        }

        const activeSocket = this.ws;

        window.addEventListener('offline', () => {
            if (this.ws === activeSocket) {
                this.callbacks.onStatusChange(false, 'Mất mạng (Offline)!');
                if (activeSocket.readyState === WebSocket.OPEN) {
                    activeSocket.close();
                }
            }
        });

        activeSocket.onopen = () => {
            if (this.ws !== activeSocket) return;
            this.isMockMode = false;
            this.callbacks.onStatusChange(true, 'Đã kết nối Server (ws://localhost:8080)');
            this.sendCommand('JOIN', { name, avatar });
        };

        activeSocket.onmessage = (event) => {
            if (this.ws !== activeSocket) return;
            this.handleServerMessage(event.data);
        };

        activeSocket.onerror = () => {
            if (this.ws !== activeSocket) return;
            this.callbacks.onLog('[Cảnh báo] Không kết nối được Server Java tại cổng 8080.');
        };

        activeSocket.onclose = () => {
            if (this.ws !== activeSocket) return;
            this.callbacks.onStatusChange(false, 'Mất kết nối!');
            this.callbacks.onLog('[Hệ thống] Đã ngắt kết nối với máy chủ.');
        };
    }

    /**
     * Khởi chạy phiên chơi với Dữ liệu giả định (Fixtures ở Mục 6-8 docs/protocol-v1.md)
     * để bạn test độc lập toàn bộ Phần 4 ngay trên trình duyệt mà không cần chờ Server/P1/P2/P3.
     */
    public startMockSession(name: string, avatar: string) {
        this.cleanup();
        this.isMockMode = true;
        this.requestIdCounter = 1;
        this.currentTick = 0;

        const welcome = createWelcomeFixture(name, avatar);
        this.applyWelcome(welcome, 1, 0);
        this.callbacks.onStatusChange(true, 'Chế độ Giả định (Fixture Mode - Độc lập)');
        this.callbacks.onLog('[Fixture] Đã nạp dữ liệu giả định từ docs/protocol-v1.md (Map 32x24, 5 Slime, 2 Bình máu).');

        // Mô phỏng đồng hồ tick 100ms (10 ticks/giây) giống hệt Server Java
        this.mockTimer = window.setInterval(() => {
            this.runMockWorldTick();
        }, 100);
    }

    public cleanup() {
        if (this.mockTimer !== null) {
            clearInterval(this.mockTimer);
            this.mockTimer = null;
        }
        if (this.ws) {
            const old = this.ws;
            this.ws = null;
            if (old.readyState === WebSocket.OPEN || old.readyState === WebSocket.CONNECTING) {
                old.close();
            }
        }
    }

    /**
     * Gửi command chuẩn giao thức v1: {v: 1, type, requestId, payload}.
     */
    public sendCommand(type: ClientCommandType, payload: Record<string, unknown> = {}): number {
        const requestId = ++this.requestIdCounter;

        if (this.isMockMode) {
            this.handleMockCommand(type, payload, requestId);
            return requestId;
        }

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const envelope = {
                v: 1,
                type,
                requestId,
                // Giữ kèm các trường cấp ngoài cho JOIN để tương thích cả server nhánh P1 (origin/tuan)
                ...(type === 'JOIN' ? payload : {}),
                payload
            };
            this.ws.send(JSON.stringify(envelope));
        }
        return requestId;
    }

    // Các phương thức tiện ích cho Phần 4 và điều khiển cơ bản
    public sendChat(text: string): number {
        return this.sendCommand('CHAT', { text });
    }

    public sendLoot(itemId: string): number {
        return this.sendCommand('LOOT', { itemId });
    }

    public sendRespawn(): number {
        return this.sendCommand('RESPAWN', {});
    }

    public sendMoveTo(x: number, y: number): number {
        return this.sendCommand('MOVE_TO', { x: Math.round(x), y: Math.round(y) });
    }

    public sendAttack(targetId: string | null): number {
        return this.sendCommand('ATTACK', { targetId });
    }

    public sendMove(dx: number, dy: number) {
        const me = this.getMyPlayer();
        if (!me || me.state === 'DEAD') return;
        const nextX = Math.max(1, Math.min(this.map.width - 2, me.x + Math.sign(dx)));
        const nextY = Math.max(1, Math.min(this.map.height - 2, me.y + Math.sign(dy)));
        this.sendMoveTo(nextX, nextY);
    }

    public getMyPlayer(): PlayerData | undefined {
        return this.myId ? this.players.get(this.myId) : undefined;
    }

    private handleServerMessage(rawJson: string) {
        let data: Record<string, unknown>;
        try {
            data = JSON.parse(rawJson);
        } catch {
            return;
        }

        const type = data.type as string;
        const tick = typeof data.tick === 'number' ? data.tick : this.currentTick;
        const requestId = typeof data.requestId === 'number' ? data.requestId : null;
        const payload = (data.payload ?? {}) as Record<string, unknown>;

        switch (type) {
            case 'WELCOME': {
                // Hỗ trợ cả gói WELCOME chuẩn protocol-v1.md và gói WELCOME phẳng của P1
                if (Array.isArray(data.payload)) {
                    this.myId = (data.id as string) || 'p-1';
                    this.players.clear();
                    (data.payload as PlayerData[]).forEach((p) => {
                        this.players.set(p.id, this.normalizePlayer(p));
                    });
                    this.callbacks.onReady();
                    this.callbacks.onPlayersUpdate();
                    this.callbacks.onLog(`[Hệ thống] Chào mừng! ID của bạn là ${this.myId}`);
                } else {
                    this.applyWelcome(payload as unknown as WelcomePayload, requestId, tick);
                }
                break;
            }

            case 'WORLD_STATE': {
                // Bỏ qua snapshot có tick <= tick đã áp dụng theo Mục 5 docs/protocol-v1.md
                if (typeof data.tick === 'number' && data.tick <= this.currentTick && this.currentTick > 0) {
                    return;
                }
                this.currentTick = tick;
                this.applyWorldState(payload as unknown as WorldState);
                this.callbacks.onPlayersUpdate();
                this.callbacks.onWorldTick?.(this.currentTick);
                break;
            }

            case 'STATE_UPDATE': {
                if (Array.isArray(data.payload)) {
                    this.players.clear();
                    (data.payload as PlayerData[]).forEach((p) => {
                        this.players.set(p.id, this.normalizePlayer(p));
                    });
                    this.callbacks.onPlayersUpdate();
                }
                break;
            }

            case 'CHAT': {
                this.currentTick = Math.max(this.currentTick, tick);
                const chatPayload: ChatEventPayload = {
                    playerId: (payload.playerId as string) || (data.id as string) || '',
                    name: (payload.name as string) || (data.name as string) || 'Lữ Khách',
                    text: (payload.text as string) || (data.text as string) || ''
                };
                this.callbacks.onChatReceived?.(chatPayload, this.currentTick);
                this.callbacks.onDialogue(chatPayload.name, chatPayload.text);
                break;
            }

            case 'ACK': {
                this.currentTick = Math.max(this.currentTick, tick);
                const ackPayload: AckPayload = {
                    commandType: (payload.commandType as string) || ''
                };
                this.callbacks.onAckReceived?.(ackPayload, requestId, this.currentTick);
                break;
            }

            case 'ERROR': {
                this.currentTick = Math.max(this.currentTick, tick);
                const errPayload: ErrorPayload = typeof data.payload === 'string'
                    ? { code: 'ERROR', message: data.payload }
                    : {
                        code: (payload.code as string) || 'ERROR',
                        message: (payload.message as string) || (data.message as string) || 'Lỗi không xác định'
                    };
                this.callbacks.onErrorReceived?.(errPayload, requestId, this.currentTick);
                break;
            }

            case 'DAMAGE': {
                this.currentTick = Math.max(this.currentTick, tick);
                const dmgPayload: DamageEventPayload = {
                    attackerId: (payload.attackerId as string) || '',
                    targetId: (payload.targetId as string) || '',
                    amount: Number(payload.amount ?? 0)
                };
                this.callbacks.onDamageReceived?.(dmgPayload, this.currentTick);
                break;
            }

            case 'ENTITY_SPAWN': {
                this.currentTick = Math.max(this.currentTick, tick);
                const spawnPayload: EntitySpawnPayload = {
                    id: (payload.id as string) || '',
                    kind: (payload.kind as 'PLAYER' | 'MOB' | 'ITEM') || 'ITEM',
                    spawnGeneration: typeof payload.spawnGeneration === 'number' ? payload.spawnGeneration : null
                };
                this.callbacks.onEntitySpawn?.(spawnPayload, this.currentTick);
                break;
            }

            case 'ENTITY_DESPAWN': {
                this.currentTick = Math.max(this.currentTick, tick);
                const despawnPayload: EntityDespawnPayload = {
                    id: (payload.id as string) || '',
                    reason: (payload.reason as 'DEAD' | 'LOOTED' | 'EXPIRED' | 'DISCONNECTED') || 'LOOTED'
                };
                this.callbacks.onEntityDespawn?.(despawnPayload, this.currentTick);
                break;
            }

            case 'PLAYER_JOINED': {
                const joined = this.normalizePlayer(payload as unknown as PlayerData);
                this.players.set(joined.id, joined);
                this.callbacks.onPlayersUpdate();
                this.callbacks.onLog(`[Sự kiện] ${joined.name} vừa vào làng.`);
                break;
            }

            case 'PLAYER_LEFT': {
                const leaveId = (data.id as string) || (payload.id as string);
                const leaver = this.players.get(leaveId);
                const leaverName = leaver ? leaver.name : 'Một người chơi';
                this.players.delete(leaveId);
                this.callbacks.onPlayersUpdate();
                this.callbacks.onLog(`[Sự kiện] ${leaverName} đã rời đi.`);
                break;
            }

            case 'PING': {
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                    this.ws.send(JSON.stringify({ v: 1, type: 'PONG', requestId: ++this.requestIdCounter, payload: {} }));
                }
                break;
            }
        }
    }

    private applyWelcome(welcome: WelcomePayload, _requestId: number | null, tick: number) {
        this.myId = welcome.playerId;
        this.currentTick = tick;
        if (welcome.map) {
            this.map = welcome.map;
        }
        if (welcome.state) {
            this.applyWorldState(welcome.state);
        }
        const me = this.getMyPlayer();
        this.callbacks.onReady();
        this.callbacks.onPlayersUpdate();
        this.callbacks.onLog(`[Hệ thống] Chào mừng ${me?.name || ''}! Mã nhân vật: ${this.myId}`);
        this.callbacks.onDialogue('Hệ Thống', `Chào mừng ${me?.name || 'Lữ Khách'}! Click chuột để đi/nhặt bình máu, nhấn Enter để Chat.`);
    }

    private applyWorldState(state: WorldState) {
        if (Array.isArray(state.players)) {
            this.players.clear();
            state.players.forEach((p) => {
                const norm = this.normalizePlayer(p);
                this.players.set(norm.id, norm);
            });
        }
        if (Array.isArray(state.mobs)) {
            this.mobs.clear();
            state.mobs.forEach((m) => {
                this.mobs.set(m.id, m);
            });
        }
        if (Array.isArray(state.items)) {
            this.items.clear();
            state.items.forEach((item) => {
                this.items.set(item.id, item);
            });
        }
    }

    private normalizePlayer(raw: Partial<PlayerData>): PlayerData {
        const rawX = Number(raw.x ?? 4);
        const rawY = Number(raw.y ?? 4);
        // Nếu server P1 gửi tọa độ pixel (> 32), quy đổi về ô lưới (tileSize = 24)
        const gridX = rawX >= 32 ? Math.max(1, Math.min(30, Math.round(rawX / 24))) : rawX;
        const gridY = rawY >= 24 ? Math.max(1, Math.min(22, Math.round(rawY / 24))) : rawY;

        return {
            id: raw.id || 'p-1',
            name: raw.name || 'Lữ Khách',
            avatar: raw.avatar || 'knight',
            x: gridX,
            y: gridY,
            hp: typeof raw.hp === 'number' ? raw.hp : 100,
            maxHp: typeof raw.maxHp === 'number' ? raw.maxHp : 100,
            state: raw.state || 'IDLE',
            targetId: raw.targetId ?? null,
            respawnReadyTick: raw.respawnReadyTick ?? null
        };
    }

    // =========================================================================
    // BỘ MÔ PHỎNG SERVER NỘI BỘ (MOCK FIXTURE ENGINE) KHI CHẠY ĐỘC LẬP
    // Tuân thủ đúng 100% luật của LootRespawnSystem.java ở Server
    // =========================================================================
    private handleMockCommand(type: ClientCommandType, payload: Record<string, unknown>, requestId: number) {
        const me = this.getMyPlayer();
        if (!me) return;

        switch (type) {
            case 'CHAT': {
                const rawText = typeof payload.text === 'string' ? payload.text : '';
                if (rawText.includes('\n') || rawText.includes('\r')) {
                    this.callbacks.onErrorReceived?.(
                        { code: 'INVALID_MESSAGE', message: 'Tin nhắn chat chỉ được phép trên một dòng' },
                        requestId,
                        this.currentTick
                    );
                    return;
                }
                const trimmed = rawText.trim();
                const codePoints = Array.from(trimmed).length;
                if (codePoints < 1 || codePoints > 120) {
                    this.callbacks.onErrorReceived?.(
                        { code: 'INVALID_MESSAGE', message: 'Tin nhắn chat phải từ 1 đến 120 ký tự' },
                        requestId,
                        this.currentTick
                    );
                    return;
                }
                const now = Date.now();
                if (this.lastMockChatMs > 0 && now - this.lastMockChatMs < 1000) {
                    this.callbacks.onErrorReceived?.(
                        { code: 'RATE_LIMITED', message: 'Bạn gửi tin nhắn quá nhanh (tối đa 1 tin/giây)' },
                        requestId,
                        this.currentTick
                    );
                    return;
                }
                this.lastMockChatMs = now;
                this.callbacks.onAckReceived?.({ commandType: 'CHAT' }, requestId, this.currentTick);
                const chatEvent: ChatEventPayload = { playerId: me.id, name: me.name, text: trimmed };
                this.callbacks.onChatReceived?.(chatEvent, this.currentTick);
                this.callbacks.onDialogue(me.name, trimmed);
                break;
            }

            case 'LOOT': {
                if (me.state === 'DEAD' || me.hp <= 0) {
                    this.callbacks.onErrorReceived?.(
                        { code: 'PLAYER_DEAD', message: 'Nhân vật đã chết, không thể nhặt bình máu' },
                        requestId,
                        this.currentTick
                    );
                    return;
                }
                const itemId = String(payload.itemId || '');
                const item = this.items.get(itemId);
                if (!item || this.currentTick >= item.expiresTick) {
                    this.items.delete(itemId);
                    this.callbacks.onErrorReceived?.(
                        { code: 'ITEM_UNAVAILABLE', message: 'Bình máu không còn tồn tại hoặc đã có người khác nhặt' },
                        requestId,
                        this.currentTick
                    );
                    return;
                }
                const dist = Math.abs(me.x - item.x) + Math.abs(me.y - item.y);
                if (dist > 1) {
                    this.callbacks.onErrorReceived?.(
                        { code: 'OUT_OF_RANGE', message: 'Bạn đứng quá xa bình máu (khoảng cách Manhattan > 1)' },
                        requestId,
                        this.currentTick
                    );
                    return;
                }
                if (me.hp >= me.maxHp) {
                    this.callbacks.onErrorReceived?.(
                        { code: 'HP_FULL', message: 'Máu của bạn đã đầy (100/100), bình máu được giữ lại' },
                        requestId,
                        this.currentTick
                    );
                    return;
                }

                // Nhặt một lần: xóa bình máu và hồi +30 HP (tối đa 100)
                this.items.delete(itemId);
                me.hp = Math.min(me.maxHp, me.hp + 30);
                this.callbacks.onAckReceived?.({ commandType: 'LOOT' }, requestId, this.currentTick);
                this.callbacks.onEntityDespawn?.({ id: itemId, reason: 'LOOTED' }, this.currentTick);
                this.callbacks.onPlayersUpdate();
                break;
            }

            case 'RESPAWN': {
                if (me.state !== 'DEAD') {
                    this.callbacks.onErrorReceived?.(
                        { code: 'INVALID_MESSAGE', message: 'Nhân vật đang sống, không cần hồi sinh' },
                        requestId,
                        this.currentTick
                    );
                    return;
                }
                if (me.respawnReadyTick !== null && this.currentTick < me.respawnReadyTick) {
                    const remainSec = ((me.respawnReadyTick - this.currentTick) * 0.1).toFixed(1);
                    this.callbacks.onErrorReceived?.(
                        { code: 'RESPAWN_NOT_READY', message: `Chưa hết thời gian chờ hồi sinh (còn ${remainSec}s)` },
                        requestId,
                        this.currentTick
                    );
                    return;
                }

                // Hồi sinh về khu an toàn (safeZone), đầy 100 HP
                me.x = 4;
                me.y = 4;
                me.hp = me.maxHp;
                me.state = 'IDLE';
                me.targetId = null;
                me.respawnReadyTick = null;
                this.callbacks.onAckReceived?.({ commandType: 'RESPAWN' }, requestId, this.currentTick);
                this.callbacks.onEntitySpawn?.({ id: me.id, kind: 'PLAYER', spawnGeneration: null }, this.currentTick);
                this.callbacks.onPlayersUpdate();
                break;
            }

            case 'MOVE_TO': {
                if (me.state === 'DEAD') {
                    this.callbacks.onErrorReceived?.(
                        { code: 'PLAYER_DEAD', message: 'Nhân vật đã chết, không thể di chuyển' },
                        requestId,
                        this.currentTick
                    );
                    return;
                }
                const tx = Number(payload.x);
                const ty = Number(payload.y);
                if (tx < 0 || tx >= this.map.width || ty < 0 || ty >= this.map.height) {
                    this.callbacks.onErrorReceived?.(
                        { code: 'INVALID_TARGET', message: 'Ô đích nằm ngoài bản đồ' },
                        requestId,
                        this.currentTick
                    );
                    return;
                }
                if (this.map.collisions.includes(ty * this.map.width + tx)) {
                    this.callbacks.onErrorReceived?.(
                        { code: 'BLOCKED_TILE', message: 'Ô đích bị chặn bởi vật cản' },
                        requestId,
                        this.currentTick
                    );
                    return;
                }
                me.x = tx;
                me.y = ty;
                me.targetId = null;
                me.state = 'IDLE';
                this.callbacks.onAckReceived?.({ commandType: 'MOVE_TO' }, requestId, this.currentTick);
                this.callbacks.onPlayersUpdate();
                break;
            }

            case 'ATTACK': {
                if (me.state === 'DEAD') {
                    this.callbacks.onErrorReceived?.(
                        { code: 'PLAYER_DEAD', message: 'Nhân vật đã chết, không thể tấn công' },
                        requestId,
                        this.currentTick
                    );
                    return;
                }
                const targetId = payload.targetId as string | null;
                if (!targetId) {
                    me.targetId = null;
                    me.state = 'IDLE';
                    this.callbacks.onAckReceived?.({ commandType: 'ATTACK' }, requestId, this.currentTick);
                    return;
                }
                const mob = this.mobs.get(targetId);
                if (!mob || mob.state === 'DEAD') {
                    this.callbacks.onErrorReceived?.(
                        { code: 'INVALID_TARGET', message: 'Mục tiêu quái không hợp lệ hoặc đã chết' },
                        requestId,
                        this.currentTick
                    );
                    return;
                }
                me.targetId = targetId;
                me.state = 'ATTACKING';
                this.callbacks.onAckReceived?.({ commandType: 'ATTACK' }, requestId, this.currentTick);
                break;
            }

            case 'SIMULATE_DAMAGE': {
                const amount = Number(payload.amount ?? 40);
                if (me.state === 'DEAD') return;
                const actual = Math.min(me.hp, amount);
                me.hp -= actual;
                this.callbacks.onDamageReceived?.({ attackerId: 'm-1', targetId: me.id, amount: actual }, this.currentTick);
                if (me.hp <= 0) {
                    me.hp = 0;
                    me.state = 'DEAD';
                    me.targetId = null;
                    me.respawnReadyTick = this.currentTick + 30; // 3 giây = 30 ticks
                    this.callbacks.onEntityDespawn?.({ id: me.id, reason: 'DEAD' }, this.currentTick);
                }
                this.callbacks.onAckReceived?.({ commandType: 'SIMULATE_DAMAGE' }, requestId, this.currentTick);
                this.callbacks.onPlayersUpdate();
                break;
            }

            case 'SIMULATE_KILL_MOB': {
                const aliveMob = Array.from(this.mobs.values()).find((m) => m.state !== 'DEAD');
                if (!aliveMob) {
                    this.callbacks.onErrorReceived?.(
                        { code: 'INVALID_TARGET', message: 'Tất cả Slime đều đang chờ hồi sinh (15s)' },
                        requestId,
                        this.currentTick
                    );
                    return;
                }
                this.killMockMob(aliveMob, Boolean(payload.forceDrop ?? true));
                this.callbacks.onAckReceived?.({ commandType: 'SIMULATE_KILL_MOB' }, requestId, this.currentTick);
                this.callbacks.onPlayersUpdate();
                break;
            }

            case 'SIMULATE_SPAWN_POTION': {
                const newItemId = `i-${++this.mockItemSeq}`;
                const newItem: ItemData = {
                    id: newItemId,
                    kind: 'HEALTH_POTION',
                    x: me.x,
                    y: me.y,
                    expiresTick: this.currentTick + 200
                };
                this.items.set(newItemId, newItem);
                this.callbacks.onEntitySpawn?.({ id: newItemId, kind: 'ITEM', spawnGeneration: null }, this.currentTick);
                this.callbacks.onAckReceived?.({ commandType: 'SIMULATE_SPAWN_POTION' }, requestId, this.currentTick);
                break;
            }
        }
    }

    private killMockMob(mob: MobData, forceDrop = false) {
        if (mob.state === 'DEAD') return;
        const dmg = mob.hp;
        mob.hp = 0;
        mob.state = 'DEAD';
        mob.targetId = null;
        mob.respawnReadyTick = this.currentTick + 150; // 15 giây = 150 ticks

        this.callbacks.onDamageReceived?.({ attackerId: this.myId || 'p-1', targetId: mob.id, amount: dmg }, this.currentTick);
        this.callbacks.onEntityDespawn?.({ id: mob.id, reason: 'DEAD' }, this.currentTick);

        if (forceDrop || Math.random() < 0.5) {
            const newItemId = `i-${++this.mockItemSeq}`;
            const item: ItemData = {
                id: newItemId,
                kind: 'HEALTH_POTION',
                x: mob.x,
                y: mob.y,
                expiresTick: this.currentTick + 200 // 20 giây = 200 ticks
            };
            this.items.set(newItemId, item);
            this.callbacks.onEntitySpawn?.({ id: newItemId, kind: 'ITEM', spawnGeneration: null }, this.currentTick);
        }
    }

    private runMockWorldTick() {
        this.currentTick += 1;
        const me = this.getMyPlayer();

        // Tự động đánh quái nếu đang chọn mục tiêu ở ô kề cạnh (mỗi 6 ticks = 600ms)
        if (me && me.state !== 'DEAD' && me.targetId && this.currentTick % 6 === 0) {
            const mob = this.mobs.get(me.targetId);
            if (!mob || mob.state === 'DEAD') {
                me.targetId = null;
                me.state = 'IDLE';
            } else {
                const dist = Math.abs(me.x - mob.x) + Math.abs(me.y - mob.y);
                if (dist <= 1) {
                    const dmg = Math.min(mob.hp, 15);
                    mob.hp -= dmg;
                    this.callbacks.onDamageReceived?.({ attackerId: me.id, targetId: mob.id, amount: dmg }, this.currentTick);
                    if (mob.hp <= 0) {
                        this.killMockMob(mob, false);
                        me.targetId = null;
                        me.state = 'IDLE';
                    }
                }
            }
        }

        // 1. Kiểm tra bình máu hết hạn sau 200 ticks (20 giây)
        for (const [id, item] of Array.from(this.items.entries())) {
            if (this.currentTick >= item.expiresTick) {
                this.items.delete(id);
                this.callbacks.onEntityDespawn?.({ id, reason: 'EXPIRED' }, this.currentTick);
            }
        }

        // 2. Kiểm tra hồi sinh quái sau 150 ticks (15 giây)
        for (const mob of this.mobs.values()) {
            if (mob.state === 'DEAD' && mob.respawnReadyTick && this.currentTick >= mob.respawnReadyTick) {
                mob.x = mob.homeX ?? mob.x;
                mob.y = mob.homeY ?? mob.y;
                mob.hp = mob.maxHp;
                mob.state = 'IDLE';
                mob.targetId = null;
                mob.respawnReadyTick = null;
                mob.spawnGeneration += 1;
                this.callbacks.onEntitySpawn?.(
                    { id: mob.id, kind: 'MOB', spawnGeneration: mob.spawnGeneration },
                    this.currentTick
                );
            }
        }

        this.callbacks.onWorldTick?.(this.currentTick);
    }
}
