import { WebSocketClient } from '../network/WebSocketClient';
import { CanvasRenderer } from '../render/CanvasRenderer';
import { MovementController } from '../input/MovementController';
import { selectedCharacterId } from '../ui/CharacterSelection';
import { WORLD_VIEWS } from '../data/tiledWorld';
import { bindJoin, getPlayerName, showError, showInfo, showGame, addLog, updatePlayers, updateStatus } from '../ui/GameUI';

export function initGameController(net: WebSocketClient, renderer: CanvasRenderer) {
    const movement = new MovementController(renderer, net, showInfo);
    bindJoin(connectGame);
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
            showError,
            () => movement.clearPreview()
        );
    }

    function onGameReady() {
        if (!net.map) return showError('Máy chủ chưa gửi dữ liệu bản đồ.');
        try {
            movement.setMap(net.map);
        } catch (error) {
            showError(error instanceof Error ? error.message : 'Dữ liệu bản đồ không hợp lệ.');
            net.disconnect();
            return;
        }
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
        renderer.render(net.players, net.myId, movement.getPreviewPath(), net.map);
        requestAnimationFrame(gameLoop);
    }
}
