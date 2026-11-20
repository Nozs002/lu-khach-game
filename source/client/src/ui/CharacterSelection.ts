import { CHARACTERS, getCharacterAvatarSource } from '../data/characters';

export let selectedCharacterId = CHARACTERS[0].id;

// Hàm hiển thị giao diện chọn nhân vật
export function renderCharacterSelection() {
    const listContainer = document.getElementById('character-list')!;
    const descBox = document.getElementById('character-desc')!;
    listContainer.innerHTML = '';

    CHARACTERS.forEach((char) => {
        const charCard = document.createElement('div');
        charCard.className = `char-card ${char.id === selectedCharacterId ? 'selected' : ''}`;
        charCard.innerHTML = `
            <img src="${getCharacterAvatarSource(char.id)}" alt="${char.name}" onerror="this.onerror=null; this.style.display='none';">
            <h4>${char.name}</h4>
        `;

        charCard.addEventListener('click', () => {
            selectedCharacterId = char.id;
            descBox.innerText = char.desc; // Cập nhật mô tả
            renderCharacterSelection(); // Render lại để cập nhật class 'selected'
        });

        listContainer.appendChild(charCard);
    });

    // Cập nhật mô tả cho nhân vật đang chọn
    const selectedChar = CHARACTERS.find(c => c.id === selectedCharacterId);
    if (selectedChar) descBox.innerText = selectedChar.desc;
}
