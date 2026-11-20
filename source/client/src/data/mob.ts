export interface Mob {
    id: string;
    kind: string;
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    state: 'IDLE' | 'CHASE' | 'ATTACK' | 'RETURN' | 'DEAD';
    targetId?: string | null;
    spawnGeneration: number;
}

export interface DamageEvent {
    attackerId: string;
    targetId: string;
    amount: number;
}

export const MOB_NAMES: Record<string, string> = {
    slime: 'Slime', slime2: 'Slime xanh', mushroom: 'Nấm', snake: 'Rắn',
    bamboo: 'Tinh tre', bamboo_yellow: 'Tinh tre vàng', kappa_green: 'Kappa',
    lizard: 'Thằn lằn', mole: 'Chuột chũi', mollusc: 'Ốc', octopus: 'Bạch tuộc',
    owl2: 'Cú', panda: 'Gấu trúc', skull: 'Đầu lâu', spider_yellow: 'Nhện vàng', spirit: 'Linh hồn'
};

export function replaceMobSnapshot(store: Map<string, Mob>, snapshot: unknown): void {
    if (!Array.isArray(snapshot)) return;
    const states = ['IDLE', 'CHASE', 'ATTACK', 'RETURN', 'DEAD'];
    const valid = snapshot.every((mob): mob is Mob => mob && typeof mob === 'object'
        && typeof mob.id === 'string' && typeof mob.kind === 'string'
        && /^[a-z0-9_]+$/.test(mob.kind)
        && Number.isInteger(mob.x) && Number.isInteger(mob.y)
        && Number.isInteger(mob.hp) && Number.isInteger(mob.maxHp)
        && mob.maxHp > 0 && mob.hp >= 0 && mob.hp <= mob.maxHp
        && states.includes(mob.state) && Number.isInteger(mob.spawnGeneration));
    if (!valid) return;
    store.clear();
    for (const mob of snapshot) store.set(mob.id, mob);
}

export function parseDamage(value: unknown): DamageEvent | null {
    if (!value || typeof value !== 'object') return null;
    const event = value as DamageEvent;
    return typeof event.attackerId === 'string' && typeof event.targetId === 'string'
        && Number.isInteger(event.amount) && event.amount > 0 ? event : null;
}
