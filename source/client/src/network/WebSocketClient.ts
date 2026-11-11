import {
    AckPayload,
    ChatEventPayload,
    ClientCommandType,
    DamageEventPayload,
    EntityDespawnPayload,
    EntitySpawnPayload,
    ErrorPayload,
    ItemData,
    MobData,
    PlayerData,
    WelcomePayload,
    WorldState
} from '../types/protocol';

export type { PlayerData, MobData, ItemData, WorldState };

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

export class WebSocketClient {
    private ws: WebSocket | null = null;
    private requestIdCounter = 0;

    public myId: string | null = null;
    public currentMapId = 'world-01';
    public currentTick = 0;

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
        extraCallbacks?: Partial<NetworkCallbacks>
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

        const host = location.hostname || 'localhost';
        const wsUrl = (window as unknown as { GAME_WS_URL?: string }).GAME_WS_URL || `ws://${host}:8080`;

        try {
            this.ws = new WebSocket(wsUrl);
        } catch {
            this.callbacks.onStatusChange(false, 'Không mở được kết nối WebSocket');
            this.callbacks.onLog('[Lỗi] Không thể kết nối WebSocket máy chủ tại cổng 8080.');
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
            this.callbacks.onStatusChange(true, `Đã kết nối (${wsUrl})`);
            this.sendCommand('JOIN', { name, avatar });
        };

        activeSocket.onmessage = (event) => {
            if (this.ws !== activeSocket) return;
            this.handleServerMessage(event.data);
        };

        activeSocket.onerror = () => {
            if (this.ws !== activeSocket) return;
            this.callbacks.onLog('[Cảnh báo] Lỗi kết nối máy chủ cổng 8080.');
        };

        activeSocket.onclose = () => {
            if (this.ws !== activeSocket) return;
            this.callbacks.onStatusChange(false, 'Mất kết nối!');
            this.callbacks.onLog('[Hệ thống] Đã ngắt kết nối với máy chủ.');
        };
    }

    public cleanup() {
        if (this.ws) {
            const old = this.ws;
            this.ws = null;
            if (old.readyState === WebSocket.OPEN || old.readyState === WebSocket.CONNECTING) {
                old.close();
            }
        }
    }

    public sendCommand(type: ClientCommandType, payload: Record<string, unknown> = {}): number {
        const requestId = ++this.requestIdCounter;
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const envelope = {
                v: 1,
                type,
                requestId,
                payload
            };
            this.ws.send(JSON.stringify(envelope));
        }
        return requestId;
    }

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
                const welcome = (payload as unknown as WelcomePayload) || {};
                this.myId = welcome.playerId || (data.id as string) || 'p-1';
                this.currentTick = tick;
                if (welcome.mapId) {
                    this.currentMapId = welcome.mapId;
                }
                if (welcome.state) {
                    this.applyWorldState(welcome.state);
                }
                const me = this.getMyPlayer();
                if (me) {
                    this.currentMapId = me.mapId;
                }
                this.callbacks.onReady();
                this.callbacks.onPlayersUpdate();
                this.callbacks.onLog(`[Hệ thống] Chào mừng ${me?.name || 'Lữ Khách'}! Mã ID: ${this.myId}`);
                this.callbacks.onDialogue('Hệ Thống', `Chào mừng ${me?.name || 'Lữ Khách'}! Click để di chuyển, click quái để đánh, click bình máu để nhặt, Enter để Chat.`);
                break;
            }

            case 'WORLD_STATE': {
                if (typeof data.tick === 'number' && data.tick <= this.currentTick && this.currentTick > 0) {
                    return;
                }
                this.currentTick = tick;
                this.applyWorldState(payload as unknown as WorldState);
                const me = this.getMyPlayer();
                if (me && me.mapId !== this.currentMapId) {
                    this.currentMapId = me.mapId;
                    this.callbacks.onLog(`[Chuyển Map] Bạn đã bước qua cổng sang bản đồ ${this.currentMapId}!`);
                }
                this.callbacks.onPlayersUpdate();
                this.callbacks.onWorldTick?.(this.currentTick);
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
                const errPayload: ErrorPayload = {
                    code: (payload.code as string) || 'ERROR',
                    message: (payload.message as string) || 'Lỗi không xác định'
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
                    mapId: (payload.mapId as string) || 'world-01',
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

    private applyWorldState(state: WorldState) {
        if (!state) return;
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
                const mapId = m.mapId || 'world-01';
                this.mobs.set(m.id, { ...m, mapId });
            });
        }
        if (Array.isArray(state.items)) {
            this.items.clear();
            state.items.forEach((item) => {
                const mapId = item.mapId || 'world-01';
                this.items.set(item.id, { ...item, mapId });
            });
        }
    }

    private normalizePlayer(raw: Partial<PlayerData>): PlayerData {
        return {
            id: raw.id || 'p-1',
            name: raw.name || 'Lữ Khách',
            avatar: raw.avatar || 'knight',
            mapId: raw.mapId || 'world-01',
            x: Number(raw.x ?? 3),
            y: Number(raw.y ?? 3),
            hp: typeof raw.hp === 'number' ? raw.hp : 100,
            maxHp: typeof raw.maxHp === 'number' ? raw.maxHp : 100,
            state: raw.state || 'IDLE',
            targetId: raw.targetId ?? null,
            respawnReadyTick: raw.respawnReadyTick ?? null
        };
    }
}
