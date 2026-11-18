import { WebSocketClient } from '../network/WebSocketClient';
import { CanvasRenderer } from '../render/CanvasRenderer';
import { selectedCharacterId } from '../ui/CharacterSelection';
import { WORLD_VIEWS } from '../data/tiledWorld';
import { bindJoin, getPlayerName, showError, showGame, addLog, updatePlayers, updateStatus } from '../ui/GameUI';

export function initGameController(net: WebSocketClient, renderer: CanvasRenderer) {
    bindJoin(connectGame);
    window.addEventListener('keydown', event => {
        if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
        const directions: Record<string, [number, number]> = {
            ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1],
            ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0],
        };
        const direction = directions[event.key];
        if (direction && net.myId) {
            event.preventDefault();
            renderer.setGroundView('spawn');
            groundView.value = 'spawn';
            net.move(...direction);
        }
    });
    const groundView = document.getElementById('ground-view') as HTMLSelectElement;
    WORLD_VIEWS.forEach(view => {
        const option = document.createElement('option');
        option.value = view.id;
        option.textContent = view.name;
        groundView.appendChild(option);
    });
    groundView.addEventListener('change', () => {
        renderer.setGroundView(groundView.value);
    });
    document.getElementById('grid-toggle')?.addEventListener('click', event => {
        const button = event.currentTarget as HTMLButtonElement;
        const visible = button.getAttribute('aria-pressed') !== 'true';
        button.setAttribute('aria-pressed', String(visible));
        button.textContent = visible ? 'Ẩn lưới ô' : 'Hiện lưới ô';
        renderer.setGridVisible(visible);
    });

    function connectGame() {
        const name = getPlayerName();
        if (!name) return showError('Vui lòng nhập tên!');
        net.connect(
            name,
            selectedCharacterId,
            onGameReady,
            addLog,

            updatePlayers,
            updateStatus,
            showError
        );
    }

    function onGameReady() {
        showGame();
        start();
    }

    let running = false;
    function start() {
        if (running) return;
        running = true;
        requestAnimationFrame(gameLoop);
    }

    function gameLoop() {
        renderer.render(net.players, net.myId);
        requestAnimationFrame(gameLoop);
    }
}
