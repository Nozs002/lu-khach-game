import { getCharacterSource } from '../data/characters';
import type { Player } from '../data/player';
import { selectedCharacterId } from './CharacterSelection';

export function bindJoin(handler: () => void) {
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
}

export function addLog(message: string) {
    const logDiv = document.getElementById('systemLog')!;
    logDiv.innerHTML += `<div>${message}</div>`;
    logDiv.scrollTop = logDiv.scrollHeight;
}

export function updateDialogue(name: string, text: string) {
    document.getElementById('dialogue-name')!.innerText = name;
    document.getElementById('dialogue-text')!.innerText = text;
    const dialogAvatar = document.querySelector('.dialogue-box .avatar') as HTMLImageElement;
    if (dialogAvatar) dialogAvatar.src = getCharacterSource(selectedCharacterId);
}

export function updatePlayers(players: Map<string, Player>, myId: string | null) {
    const list = document.getElementById('players')!;
    list.innerHTML = '';
    players.forEach((player, id) => {
        const li = document.createElement('li');
        const isMe = id === myId;
        li.innerText = `${player.name} ${isMe ? '(Bạn)' : ''}`;
        if (isMe) li.style.color = '#f1c40f';
        list.appendChild(li);
    });
}

export function updateStatus(online: boolean, text: string) {
    const statusEl = document.getElementById('status')!;
    statusEl.innerText = text;
    statusEl.className = online ? 'status-online' : 'status-offline';
}
