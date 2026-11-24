export interface ItemDefinition {
    readonly id: string;
    readonly name: string;
    readonly desc: string;
    readonly icon: string;
    readonly healAmount?: number;
}

export interface WorldItem {
    id: string;
    kind: 'HEALTH_POTION' | string;
    x: number;
    y: number;
    expiresTick: number;
}

export interface GroundItem {
    id: string;
    itemId: string;
    x: number;
    y: number;
}

// Danh mục vật phẩm cố định; bình máu dùng WorldItem (LootRespawnSystem), vũ khí rơi dùng GroundItem (LootSystem).
export const ITEMS: readonly ItemDefinition[] = [
    {
        id: 'HEALTH_POTION',
        name: 'Bình máu',
        desc: 'Hồi phục ngay 30 HP (tối đa 100 HP). Tồn tại 20 giây trên mặt đất.',
        icon: '/assets/items/health-potion.png',
        healAmount: 30
    },
    { id: 'cancau', name: 'Cần câu', desc: 'Vũ khí cần câu.', icon: '/assets/items/cancau.png' },
    { id: 'xuong', name: 'Xương', desc: 'Vũ khí xương.', icon: '/assets/items/xuong.png' },
    { id: 'riu', name: 'Rìu', desc: 'Vũ khí rìu.', icon: '/assets/items/riu.png' },
    { id: 'gay', name: 'Gậy', desc: 'Vũ khí gậy.', icon: '/assets/items/gay.png' },
    { id: 'daikiem', name: 'Đại kiếm', desc: 'Vũ khí đại kiếm.', icon: '/assets/items/daikiem.png' }
];

export function getItemDefinition(kind: string): ItemDefinition | undefined {
    return ITEMS.find(item => item.id === kind);
}

export function isWeaponItemId(id: string): boolean {
    return ITEMS.some(item => item.id === id && item.id !== 'HEALTH_POTION');
}

export function replaceDropSnapshot(store: Map<string, GroundItem>, raw: unknown): void {
    if (!Array.isArray(raw)) return;
    const next = new Map<string, GroundItem>();
    for (const entry of raw) {
        if (!entry || typeof entry.id !== 'string'
            || typeof entry.itemId !== 'string'
            || !isWeaponItemId(entry.itemId)
            || !Number.isInteger(entry.x) || !Number.isInteger(entry.y)) {
            return;
        }
        next.set(entry.id, { id: entry.id, itemId: entry.itemId, x: entry.x, y: entry.y });
    }
    store.clear();
    next.forEach((item, id) => store.set(id, item));
}
