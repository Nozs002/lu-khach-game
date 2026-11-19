export interface SpriteSheetConfig {
    readonly source: string;
    readonly cols: number;
    readonly rows: number;
}

export interface Character {
    id: string;
    source: string;
    name: string;
    desc: string;
    walkSource: string;
}

export const CHARACTERS: Character[] = [
    {
        id: 'knight',
        source: 'knight.png',
        name: 'Hiệp sĩ',
        walkSource: 'knightwalk.png',
        desc: 'Hiệp sĩ sở hữu lượng máu (HP) và phòng thủ (Defense/Armor) rất cao, cùng với mức sát thương cận chiến ổn định hoặc thiên về chống chịu.'
    },

    {
        id: 'hunter',
        source: 'hunter.png',
        name: 'Thợ săn',
        walkSource: 'hunterwalk.png',
        desc: 'Thợ săn sở hữu tầm nhìn rộng và khả năng di chuyển nhanh, cùng với mức sát thương xa ổn định hoặc thiên về bạo kích.'
    },

    {
        id: 'fighter',
        source: 'fighter.png',
        name: 'Chiến binh',
        walkSource: 'fighterwalk.png',
        desc: 'Chiến binh sở hữu sức mạnh tấn công cao và khả năng chịu đựng tốt, cùng với mức sát thương cận chiến mạnh mẽ.'
    },

    {
        id: 'lion',
        source: 'lion.png',
        name: 'Sư tử',
        walkSource: 'lionwalk.png',
        desc: 'Sư tử sở hữu sức mạnh tấn công cao và khả năng chịu đựng tốt, cùng với mức sát thương cận chiến mạnh mẽ.'
    },
];


// Hàm trả về đường dẫn ảnh của nhân vật
// nếu nhân vật không tồn tại thì mặc định trả về knight 
export function getCharacterSource(id: string): string {
    const character = CHARACTERS.find(character => character.id === id);
    return `/assets/characters/${character?.source ?? 'knight.png'}`;
}

// Hàm trả về cấu hình sprite sheet đi bộ 4x4 của nhân vật tương ứng
export function getCharacterWalkSheet(id: string): SpriteSheetConfig {
    const character = CHARACTERS.find(character => character.id === id);
    return {
        source: `/assets/characters/${character?.walkSource ?? 'knightwalk.png'}`,
        cols: 4,
        rows: 4
    };
}