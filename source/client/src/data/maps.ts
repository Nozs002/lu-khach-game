export interface MapDefinition {
    readonly id: string;
    readonly name: string;
    readonly desc: string;
}

// Bổ sung khi dữ liệu bản đồ được triển khai; không chứa trạng thái phiên chơi.
export const MAPS: readonly MapDefinition[] = [];
