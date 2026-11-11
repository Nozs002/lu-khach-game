/**
 * Định nghĩa kiểu dữ liệu Giao thức v1 theo đúng hợp đồng docs/protocol-v1.md và docs/game-design.md.
 * Mở rộng hỗ trợ đa bản đồ (world-01, world-02).
 */

export type PlayerState = 'IDLE' | 'MOVING' | 'ATTACKING' | 'DEAD';
export type MobState = 'IDLE' | 'CHASE' | 'ATTACK' | 'RETURN' | 'DEAD';

export type ErrorCode =
    | 'INVALID_MESSAGE'
    | 'UNSUPPORTED_VERSION'
    | 'JOIN_REQUIRED'
    | 'ALREADY_JOINED'
    | 'WORLD_FULL'
    | 'INVALID_NAME'
    | 'INVALID_TARGET'
    | 'BLOCKED_TILE'
    | 'NO_PATH'
    | 'PLAYER_DEAD'
    | 'OUT_OF_RANGE'
    | 'ITEM_UNAVAILABLE'
    | 'HP_FULL'
    | 'RESPAWN_NOT_READY'
    | 'RATE_LIMITED'
    | 'STALE_REQUEST';

export interface SafeZone {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface MapData {
    id: string;
    width: number;
    height: number;
    tileSize: number;
    collisions: number[];
    safeZone: SafeZone;
}

export interface PlayerData {
    id: string;
    name: string;
    avatar: string;
    mapId: string;
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    state: PlayerState;
    targetId: string | null;
    respawnReadyTick: number | null;
}

export interface MobData {
    id: string;
    kind: string;
    mapId: string;
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    state: MobState;
    targetId: string | null;
    spawnGeneration: number;
    respawnReadyTick?: number | null;
    homeX?: number;
    homeY?: number;
}

export interface ItemData {
    id: string;
    kind: 'HEALTH_POTION' | string;
    mapId: string;
    x: number;
    y: number;
    expiresTick: number;
}

export interface WorldState {
    players: PlayerData[];
    mobs: MobData[];
    items: ItemData[];
}

export type ClientCommandType =
    | 'JOIN'
    | 'CHAT'
    | 'PING'
    | 'MOVE_TO'
    | 'ATTACK'
    | 'LOOT'
    | 'RESPAWN'
    | 'SIMULATE_DAMAGE'
    | 'SIMULATE_KILL_MOB'
    | 'SIMULATE_SPAWN_POTION';

export interface ClientEnvelope<T = Record<string, unknown>> {
    v: 1;
    type: ClientCommandType;
    requestId: number;
    payload: T;
}

export interface WelcomePayload {
    playerId: string;
    tickDurationMs: number;
    mapId?: string;
    state: WorldState;
}

export interface ChatEventPayload {
    playerId: string;
    name: string;
    text: string;
}

export interface DamageEventPayload {
    attackerId: string;
    targetId: string;
    amount: number;
}

export interface EntitySpawnPayload {
    id: string;
    kind: 'PLAYER' | 'MOB' | 'ITEM';
    mapId?: string;
    spawnGeneration: number | null;
}

export interface EntityDespawnPayload {
    id: string;
    reason: 'DEAD' | 'LOOTED' | 'EXPIRED' | 'DISCONNECTED';
}

export interface AckPayload {
    commandType: string;
}

export interface ErrorPayload {
    code: ErrorCode | string;
    message: string;
}

export interface FloatingTextEffect {
    id: string;
    gridX: number;
    gridY: number;
    text: string;
    color: string;
    createdAt: number;
    durationMs: number;
}

export interface ChatBubble {
    playerId: string;
    text: string;
    expiresAt: number;
}
