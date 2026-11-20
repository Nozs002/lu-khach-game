import type { WorldItem } from '../../data/items';
import type { MapData } from '../../data/maps';
import type { Player } from '../../data/player';

export interface ChatEvent {
    playerId: string;
    name: string;
    text: string;
    tick?: number;
}

export interface DamageEvent {
    attackerId: string;
    targetId: string;
    amount: number;
    x?: number;
    y?: number;
    tick?: number;
}

export interface EntitySpawnEvent {
    id: string;
    kind: 'PLAYER' | 'MOB' | 'ITEM' | string;
    spawnGeneration?: number | null;
    x?: number;
    y?: number;
    tick?: number;
}

export interface EntityDespawnEvent {
    id: string;
    reason: 'DEAD' | 'LOOTED' | 'EXPIRED' | 'DISCONNECTED' | string;
    lootedBy?: string;
    lootedByName?: string;
    healedAmount?: number;
    x?: number;
    y?: number;
    tick?: number;
}

export interface PlayerState {
    myId: string | null;
    players: Map<string, Player>;
    items: Map<string, WorldItem>;
    map: MapData | null;
    currentTick: number;
    tickDurationMs: number;
}

export interface WorldEventCallbacks {
    onWorldUpdate?: () => void;
    onChat?: (event: ChatEvent) => void;
    onDamage?: (event: DamageEvent) => void;
    onEntitySpawn?: (event: EntitySpawnEvent) => void;
    onEntityDespawn?: (event: EntityDespawnEvent) => void;
    onAck?: (commandType: string, tick?: number) => void;
    onErrorCode?: (code: string | undefined, message: string) => void;
}

export interface HandlerContext {
    state: PlayerState;
    name: string;
    onReady: () => void;
    onLog: (message: string) => void;
    onPlayersUpdate: (players: Map<string, Player>, myId: string | null) => void;
    onError: (message: string) => void;
    onCommandError?: () => void;
    events?: WorldEventCallbacks;
    close: () => void;
}
