export interface Player {
    id: string;
    name: string;
    characterId: string;
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    state: 'IDLE' | 'MOVING' | 'ATTACKING' | 'DEAD';
    targetId?: string | null;
}
