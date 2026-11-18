export interface Character {
    id: string;
    avatarSource: string; // Ảnh chân dung, dùng cho chọn nhân vật và sidebar.
    spriteSource: string; // Sprite sheet toàn thân, dùng để vẽ trên map.
    spriteFrame: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
    name: string;
    desc: string;
}

export const CHARACTERS: Character[] = [
    {
        id: 'knight',
        avatarSource: 'knight.png',
        spriteSource: 'knight-idle.png',
        spriteFrame: { x: 0, y: 0, width: 16, height: 16 },
        name: 'Hiệp sĩ',
        desc: 'Hiệp sĩ sở hữu lượng máu (HP) và phòng thủ (Defense/Armor) rất cao, cùng với mức sát thương cận chiến ổn định hoặc thiên về chống chịu.'
    },

    {
        id: 'hunter',
        avatarSource: 'hunter.png',
        spriteSource: 'hunter-idle.png',
        spriteFrame: { x: 0, y: 0, width: 16, height: 16 },
        name: 'Thợ săn',
        desc: 'Thợ săn sở hữu tầm nhìn rộng và khả năng di chuyển nhanh, cùng với mức sát thương xa ổn định hoặc thiên về bạo kích.'
    },

    {
        id: 'fighter',
        avatarSource: 'fighter.png',
        spriteSource: 'fighter-idle.png',
        spriteFrame: { x: 0, y: 0, width: 16, height: 16 },
        name: 'Chiến binh',
        desc: 'Chiến binh sở hữu sức mạnh tấn công cao và khả năng chịu đựng tốt, cùng với mức sát thương cận chiến mạnh mẽ.'
    },

    {
        id: 'lion',
        avatarSource: 'lion.png',
        spriteSource: 'lion-idle.png',
        spriteFrame: { x: 0, y: 0, width: 16, height: 16 },
        name: 'Sư tử',
        desc: 'Sư tử sở hữu sức mạnh tấn công cao và khả năng chịu đựng tốt, cùng với mức sát thương cận chiến mạnh mẽ.'
    },
];


// ID không hợp lệ dùng Hiệp sĩ cho cả avatar lẫn sprite.
export function getCharacter(id: string): Character {
    return CHARACTERS.find(character => character.id === id) ?? CHARACTERS[0];
}

export function getCharacterAvatarSource(id: string): string {
    return `/assets/characters/${getCharacter(id).avatarSource}`;
}

export function getCharacterSpriteSource(id: string): string {
    return `/assets/characters/${getCharacter(id).spriteSource}`;
}
