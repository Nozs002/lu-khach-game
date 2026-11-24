import { getCharacterAvatarSource } from '../data/characters';
import type { Player } from '../data/player';
import { selectedCharacterId } from './CharacterSelection';
import { showInfo } from './Toast';
import { updatePlayerStats } from './PlayerStats';
import { updateEquipmentSlot } from './EquipmentSlot';

export function bindJoin(handler: () => void) {
    document.getElementById('leaveBtn')?.addEventListener('click', () => window.location.reload());
    const log = document.getElementById('systemLog')!;
    const newLogButton = document.getElementById('new-log-button')!;
    newLogButton.addEventListener('click', () => {
        log.scrollTop = log.scrollHeight;
        newLogButton.hidden = true;
    });
    log.addEventListener('scroll', () => {
        if (log.scrollHeight - log.scrollTop - log.clientHeight < 20) {
            newLogButton.hidden = true;
        }
    });
    document.getElementById('joinBtn')?.addEventListener('click', handler);
    document.getElementById('playerName')?.addEventListener('keydown', event => {
        if (event.key === 'Enter') handler();
    });
}

export function getPlayerName(): string {
    return (document.getElementById('playerName') as HTMLInputElement).value.trim();
}

export { showError, showSuccess, showInfo, showToast } from './Toast';

export function showGame() {
    document.getElementById('loginUI')!.style.display = 'none';
    document.getElementById('gameUI')!.style.display = 'block';
    document.getElementById('player-name')!.textContent = `${getPlayerName()} (Bạn)`;
    (document.getElementById('player-avatar') as HTMLImageElement).src = getCharacterAvatarSource(selectedCharacterId);
    showInfo(`Chào mừng ${getPlayerName()} vào game!`);
}

export function addLog(message: string) {
    const logDiv = document.getElementById('systemLog')!;
    const followLatest = logDiv.scrollHeight - logDiv.scrollTop - logDiv.clientHeight < 20;
    const oldHeight = logDiv.scrollHeight;
    const oldTop = logDiv.scrollTop;
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    const now = new Date();
    const time = document.createElement('time');
    time.dateTime = now.toISOString();
    time.textContent = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const content = document.createElement('span');
    content.textContent = message;
    entry.append(time, content);
    logDiv.appendChild(entry);
    const addedHeight = logDiv.scrollHeight - oldHeight;
    while (logDiv.childElementCount > 200) logDiv.firstElementChild?.remove();
    if (followLatest) {
        logDiv.scrollTop = logDiv.scrollHeight;
        document.getElementById('new-log-button')!.hidden = true;
    } else {
        // Compensate for rows removed from the beginning of a full journal.
        logDiv.scrollTop = Math.max(0, oldTop - (oldHeight + addedHeight - logDiv.scrollHeight));
        document.getElementById('new-log-button')!.hidden = false;
    }
}

export function updatePlayers(players: Map<string, Player>, myId: string | null) {
    const list = document.getElementById('players')!;
    list.replaceChildren();
    document.getElementById('player-count')!.textContent = `(${players.size})`;
    const me = myId ? players.get(myId) : undefined;
    updatePlayerStats(me);
    updateEquipmentSlot(me?.equippedWeaponId);
    if (me) {
        document.getElementById('player-name')!.textContent = `${me.name} (Bạn)`;
        (document.getElementById('player-avatar') as HTMLImageElement).src = getCharacterAvatarSource(me.characterId);
        document.getElementById('player-combat-state')!.textContent = me.state === 'DEAD'
            ? 'Nhân vật đã tử trận · Chờ 3 giây để hồi sinh.' : 'Trạng thái: Sẵn sàng';
    }
    players.forEach((player, id) => {
        const li = document.createElement('li');
        const isMe = id === myId;
        const isDead = player.state === 'DEAD' || (typeof player.hp === 'number' && player.hp <= 0);
        const hpSuffix = isDead
            ? ' [CHẾT]'
            : typeof player.hp === 'number' && typeof player.maxHp === 'number'
                ? ` (${player.hp}/${player.maxHp} HP)`
                : '';
        li.textContent = `${player.name}${isMe ? ' (Bạn)' : ''}${hpSuffix}`;
        if (isDead) li.className = 'is-dead';
        else if (isMe) li.className = 'is-me';
        list.appendChild(li);
    });
}

export function updateStatus(online: boolean, text: string) {
    const statusEl = document.getElementById('status')!;
    statusEl.innerText = text;
    statusEl.className = online ? 'status-online' : 'status-offline';
}
