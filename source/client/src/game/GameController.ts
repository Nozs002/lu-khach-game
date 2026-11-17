import { WebSocketClient } from '../network/WebSocketClient';
import { CanvasRenderer } from '../render/CanvasRenderer';
import { selectedCharacterId } from '../ui/CharacterSelection';
import { bindJoin, getPlayerName, showError, showGame, addLog, updateDialogue, updatePlayers, updateStatus } from '../ui/GameUI';

export function initGameController(net: WebSocketClient, renderer: CanvasRenderer) {
    bindJoin(connectGame);

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
