import type { WorldItem } from '../data/items';
import type { MapData } from '../data/maps';
import type { Player } from '../data/player';
import type { HandlerContext, WorldEventCallbacks } from './handlers/HandlerContext';
import { WelcomeHandler } from './handlers/WelcomeHandler';
import { PlayerJoinedHandler } from './handlers/PlayerJoinedHandler';
import { PlayerLeftHandler } from './handlers/PlayerLeftHandler';
import { StateUpdateHandler } from './handlers/StateUpdateHandler';
import { ErrorHandler } from './handlers/ErrorHandler';

export class WebSocketClient {
    private ws: WebSocket | null = null;
    private tickAnchorTime = 0;
    private tickAnchorValue = 0;

    public myId: string | null = null;
    public players: Map<string, Player> = new Map();
    public items: Map<string, WorldItem> = new Map();
    public map: MapData | null = null;
    public currentTick = 0;
    public tickDurationMs = 100;

    /**
     * Ước lượng tick hiện tại mượt giữa các bản tin để đồng hồ đếm ngược 3 giây mượt trên client,
     * đồng thời luôn bám chuẩn mốc tick từ server gửi về.
     */
    public getEstimatedTick(now: number = performance.now()): number {
        if (this.tickAnchorTime <= 0 || this.tickDurationMs <= 0) {
            return this.currentTick;
        }
        const elapsedTicks = Math.max(0, (now - this.tickAnchorTime) / this.tickDurationMs);
        return Math.max(this.currentTick, this.tickAnchorValue + elapsedTicks);
    }

    private syncServerTick(tick: unknown): void {
        if (typeof tick === 'number' && Number.isFinite(tick) && tick >= this.currentTick) {
            this.currentTick = tick;
            this.tickAnchorValue = tick;
            this.tickAnchorTime = performance.now();
        }
    }

    private sendJson(payload: Record<string, unknown>): boolean {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
        this.ws.send(JSON.stringify(payload));
        return true;
    }

    sendMoveTo(x: number, y: number): boolean {
        return this.sendJson({ type: 'MOVE_TO', x, y });
    }

    sendChat(text: string): boolean {
        return this.sendJson({ type: 'CHAT', text });
    }

    sendLoot(itemId: string): boolean {
        return this.sendJson({ type: 'LOOT', itemId });
    }

    sendRespawn(): boolean {
        return this.sendJson({ type: 'RESPAWN' });
    }

    sendSimulateDamage(amount: number): boolean {
        return this.sendJson({ type: 'SIMULATE_DAMAGE', amount });
    }

    sendSimulateSpawnPotion(): boolean {
        return this.sendJson({ type: 'SIMULATE_SPAWN_POTION' });
    }

    disconnect(): void {
        this.ws?.close();
    }

    connect(
        name: string,
        characterId: string,
        onReady: () => void,
        onLog: (message: string) => void,
        onPlayersUpdate: (players: Map<string, Player>, myId: string | null) => void,
        onStatusChange: (online: boolean, text: string) => void,
        onError: (message: string) => void,
        onCommandError?: () => void,
        events?: WorldEventCallbacks
    ) {
        if (this.ws && this.ws.readyState <= WebSocket.OPEN) {
            this.ws.close();
        }
        this.myId = null;
        this.players.clear();
        this.items.clear();
        this.map = null;
        this.currentTick = 0;
        this.tickDurationMs = 100;
        this.tickAnchorTime = 0;
        this.tickAnchorValue = 0;

        const host = location.hostname || 'localhost';
        const wsUrl = (window as unknown as { GAME_WS_URL?: string }).GAME_WS_URL || `ws://${host}:8080`;
        const socket = new WebSocket(wsUrl);
        this.ws = socket;

        const context: HandlerContext = {
            state: this,
            name,
            onReady,
            onLog,
            onPlayersUpdate,
            onError,
            onCommandError,
            events,
            close: () => socket.close()
        };

        const welcomeHandler = new WelcomeHandler(context);
        const playerJoinedHandler = new PlayerJoinedHandler(context);
        const playerLeftHandler = new PlayerLeftHandler(context);
        const stateUpdateHandler = new StateUpdateHandler(context);
        const errorHandler = new ErrorHandler(context);

        window.addEventListener('offline', () => {
            if (this.ws === socket) {
                onStatusChange(false, 'Mất mạng (Offline)!');
                if (socket.readyState === WebSocket.OPEN) {
                    socket.close();
                }
            }
        });

        socket.onopen = () => {
            if (this.ws !== socket) return;
            socket.send(JSON.stringify({ type: 'JOIN', name, characterId }));
            onStatusChange(true, 'Đã kết nối');
        };

        socket.onmessage = (event) => {
            if (this.ws !== socket) return;
            const data = JSON.parse(event.data);
            this.syncServerTick(data.tick);

            switch (data.type) {
                case 'WELCOME':
                    welcomeHandler.handle(data);
                    break;

                case 'PLAYER_JOINED':
                    playerJoinedHandler.handle(data);
                    events?.onWorldUpdate?.();
                    break;

                case 'PLAYER_LEFT':
                    playerLeftHandler.handle(data);
                    events?.onWorldUpdate?.();
                    break;

                case 'STATE_UPDATE':
                    stateUpdateHandler.handle(data);
                    break;

                case 'CHAT':
                    if (data.payload) {
                        events?.onChat?.({ ...data.payload, tick: data.tick });
                    }
                    break;

                case 'DAMAGE':
                    if (data.payload) {
                        events?.onDamage?.({ ...data.payload, tick: data.tick });
                    }
                    break;

                case 'ENTITY_SPAWN':
                    if (data.payload) {
                        events?.onEntitySpawn?.({ ...data.payload, tick: data.tick });
                    }
                    break;

                case 'ENTITY_DESPAWN':
                    if (data.payload) {
                        events?.onEntityDespawn?.({ ...data.payload, tick: data.tick });
                    }
                    break;

                case 'ACK':
                    if (data.payload?.commandType) {
                        events?.onAck?.(data.payload.commandType, data.tick);
                    }
                    break;

                case 'ERROR':
                    errorHandler.handle(data);
                    break;
            }
        };

        socket.onclose = () => {
            if (this.ws !== socket) return;
            onStatusChange(false, 'Mất kết nối!');
            onLog('[Hệ thống] Đã ngắt kết nối với máy chủ.');
        };
    }
}
