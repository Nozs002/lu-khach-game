import { WebSocketClient } from '../network/WebSocketClient';
import { CanvasRenderer } from '../render/CanvasRenderer';
import { MovementController } from '../input/MovementController';
import { selectedCharacterId } from '../ui/CharacterSelection';
import { bindJoin, getPlayerName, showError, showGame, showInfo, addLog, updateDialogue, updatePlayers, updateStatus } from '../ui/GameUI';

export function initGameController(net: WebSocketClient, renderer: CanvasRenderer) {
    const movement = new MovementController(renderer, net, showInfo);
    bindJoin(connectGame); // khi người chơi nhấn nút "Join", gọi hàm connectGame ở dưới

    function connectGame() {
        const name = getPlayerName();
        if (!name) return showError('Vui lòng nhập tên!');
        net.connect(
            name,
            selectedCharacterId,
            onGameReady,
            addLog,
            updateDialogue,
            updatePlayers,
            updateStatus,
            showError,
            () => movement.clearPreview()
        );
    }

    function onGameReady() {
        if (!net.map) {
            showError('Máy chủ chưa gửi dữ liệu bản đồ.');
            return;
        }
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
