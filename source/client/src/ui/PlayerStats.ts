import type { Player } from '../data/player';

export function updatePlayerStats(player: Player | undefined): void {
    const text = document.getElementById('player-hp')!;
    const bar = document.getElementById('player-hp-bar')!;
    const fill = document.getElementById('player-hp-fill')!;
    const validHp = player && Number.isFinite(player.hp) && Number.isFinite(player.maxHp) && player.maxHp > 0;
    const hp = validHp ? Math.min(player.maxHp, Math.max(0, player.hp)) : 0;
    text.textContent = validHp ? `${hp} / ${player.maxHp}` : '— / —';
    fill.style.width = validHp ? `${hp / player.maxHp * 100}%` : '0%';
    bar.classList.toggle('unavailable', !validHp);
    bar.setAttribute('aria-valuemax', validHp ? String(player.maxHp) : '100');
    bar.setAttribute('aria-valuenow', String(hp));
    bar.setAttribute('aria-valuetext', validHp ? `${hp} / ${player.maxHp}` : 'Chưa có dữ liệu máu');
    document.getElementById('player-damage')!.textContent = player && Number.isFinite(player.damage) ? String(player.damage) : '—';
    document.getElementById('player-armor')!.textContent = player && Number.isFinite(player.armor) ? String(player.armor) : '—';
}
