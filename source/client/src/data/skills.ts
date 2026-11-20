export interface SkillDefinition {
    readonly id: string;
    readonly name: string;
    readonly desc: string;
}

// Danh mục kỹ năng cố định; thời gian hồi chiêu hiện tại thuộc trạng thái game.
export const SKILLS: readonly SkillDefinition[] = [];
