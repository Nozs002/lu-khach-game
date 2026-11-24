import { ITEMS } from '../data/items';

export function updateEquipmentSlot(weaponId: string | null | undefined): void {
    const slot = document.getElementById('weapon-slot');
    const icon = document.getElementById('weapon-slot-icon') as HTMLImageElement | null;
    const empty = document.getElementById('weapon-slot-empty');
    const nameEl = document.getElementById('weapon-slot-name');
    const stateEl = document.getElementById('weapon-slot-state');
    if (!slot || !icon || !empty || !nameEl || !stateEl) return;

    const weapon = ITEMS.find(item => item.id === weaponId && item.id !== 'HEALTH_POTION');
    slot.classList.toggle('is-equipped', !!weapon);
    slot.setAttribute('aria-label', weapon ? `Vũ khí đang trang bị: ${weapon.name}` : 'Ô vũ khí trống');
    icon.hidden = !weapon;
    if (weapon) {
        if (icon.getAttribute('src') !== weapon.icon) icon.src = weapon.icon;
    } else {
        icon.removeAttribute('src');
    }
    empty.hidden = !!weapon;
    nameEl.textContent = weapon?.name ?? 'Chưa trang bị';
    stateEl.textContent = weapon ? 'Đang trang bị' : 'Ô vũ khí trống';
}
