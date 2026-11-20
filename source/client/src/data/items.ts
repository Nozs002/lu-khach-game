export interface ItemDefinition {
    readonly id: string;
    readonly name: string;
    readonly desc: string;
    readonly icon: string;
}

// Danh mục vật phẩm cố định; số lượng trong túi thuộc trạng thái người chơi.
export const ITEMS: readonly ItemDefinition[] = [
    { id: 'health-potion', name: 'Bình máu', desc: 'Bình hồi máu.', icon: '/assets/items/health-potion.png' },
    { id: 'cancau', name: 'Cần câu', desc: 'Vũ khí cần câu.', icon: '/assets/items/cancau.png' },
    { id: 'xuong', name: 'Xương', desc: 'Vũ khí xương.', icon: '/assets/items/xuong.png' },
    { id: 'riu', name: 'Rìu', desc: 'Vũ khí rìu.', icon: '/assets/items/riu.png' },
    { id: 'gay', name: 'Gậy', desc: 'Vũ khí gậy.', icon: '/assets/items/gay.png' },
    { id: 'daikiem', name: 'Đại kiếm', desc: 'Vũ khí đại kiếm.', icon: '/assets/items/daikiem.png' },
];

export interface GroundItem {
    id: string;
    itemId: string;
    x: number;
    y: number;
}

export function replaceDropSnapshot(store: Map<string, GroundItem>, raw: unknown): void {
    if (!Array.isArray(raw)) return;
    const next = new Map<string, GroundItem>();
    for (const entry of raw) {
        if (!entry || typeof entry.id !== 'string'
            || !ITEMS.some(item => item.id === entry.itemId)
            || !Number.isInteger(entry.x) || !Number.isInteger(entry.y)) return;
        next.set(entry.id, { id: entry.id, itemId: entry.itemId, x: entry.x, y: entry.y });
    }
    store.clear();
    next.forEach((item, id) => store.set(id, item));
}
