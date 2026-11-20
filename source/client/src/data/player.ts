export type PlayerStateKind = 'IDLE' | 'MOVING' | 'ATTACKING' | 'DEAD';

export interface Player {
    id: string;
    name: string;
    characterId: string;
    x: number;
    y: number;
    hp?: number;
    maxHp?: number;
    state?: PlayerStateKind;
    respawnReadyTick?: number | null;
}
