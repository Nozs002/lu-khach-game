import { ITEMS } from '../data/items';

export function updateEquipmentSlot(weaponId: string | null | undefined): void {
    const slot = document.getElementById('weapon-slot')!;
    const icon = document.getElementById('weapon-slot-icon') as HTMLImageElement;
    const weapon = ITEMS.find(item => item.id === weaponId && item.id !== 'health-potion');
    slot.classList.toggle('is-equipped', !!weapon);
    slot.setAttribute('aria-label', weapon ? `Vũ khí đang trang bị: ${weapon.name}` : 'Ô vũ khí trống');
    icon.hidden = !weapon;
    if (weapon) {
        if (icon.getAttribute('src') !== weapon.icon) icon.src = weapon.icon;
    } else {
        icon.removeAttribute('src');
    }
    document.getElementById('weapon-slot-empty')!.hidden = !!weapon;
    document.getElementById('weapon-slot-name')!.textContent = weapon?.name ?? 'Chưa trang bị';
    document.getElementById('weapon-slot-state')!.textContent = weapon ? 'Đang trang bị' : 'Ô vũ khí trống';
}
