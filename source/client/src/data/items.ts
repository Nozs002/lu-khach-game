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

// Danh mục vật phẩm cố định; vật phẩm rơi trên bản đồ được đồng bộ từ máy chủ qua WorldItem.
export const ITEMS: readonly ItemDefinition[] = [
    {
        id: 'HEALTH_POTION',
        name: 'Bình máu',
        desc: 'Hồi phục ngay 30 HP (tối đa 100 HP). Tồn tại 20 giây trên mặt đất.',
        icon: '/assets/items/health-potion.png',
        healAmount: 30
    }
];

export function getItemDefinition(kind: string): ItemDefinition | undefined {
    return ITEMS.find(item => item.id === kind);
}
