export interface ItemDefinition {
    readonly id: string;
    readonly name: string;
    readonly desc: string;
}

// Danh mục vật phẩm cố định; số lượng trong túi thuộc trạng thái người chơi.
export const ITEMS: readonly ItemDefinition[] = [];
