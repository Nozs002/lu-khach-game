import { WebSocketClient } from '../network/WebSocketClient';
import { CanvasRenderer } from '../render/CanvasRenderer';
import { MovementController } from '../input/MovementController';
import { selectedCharacterId } from '../ui/CharacterSelection';
import { WORLD_VIEWS } from '../data/tiledWorld';
import { bindJoin, getPlayerName, showError, showInfo, showGame, addLog, updatePlayers, updateStatus } from '../ui/GameUI';

function isEditableElement(target: EventTarget | null): boolean {
    const element = target instanceof HTMLElement ? target : document.activeElement;
    if (!(element instanceof HTMLElement)) return false;
    const tag = element.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    return element.isContentEditable;
}

function isGameScreenVisible(): boolean {
    const gameUI = document.getElementById('gameUI');
    return Boolean(gameUI && gameUI.style.display !== 'none');
}

export interface GameControllerHandle {
    destroy(): void;
}

export function initGameController(net: WebSocketClient, renderer: CanvasRenderer): GameControllerHandle {
    const movement = new MovementController(renderer, net, showInfo);
    const canvas = renderer.getCanvas();
    bindJoin(connectGame);

    const groundView = document.getElementById('ground-view') as HTMLSelectElement | null;
    if (groundView) {
        groundView.replaceChildren();
        WORLD_VIEWS.forEach(view => {
            const option = document.createElement('option');
            option.value = view.id;
            option.textContent = view.name;
            groundView.appendChild(option);
        });
    }

    const handleGroundViewChange = () => {
        if (!groundView) return;
        renderer.setGroundView(groundView.value, net.myId);
    };
    groundView?.addEventListener('change', handleGroundViewChange);

    const gridToggle = document.getElementById('grid-toggle') as HTMLButtonElement | null;
    const handleGridToggleClick = (event: MouseEvent) => {
        const button = event.currentTarget as HTMLButtonElement;
        const visible = button.getAttribute('aria-pressed') !== 'true';
        button.setAttribute('aria-pressed', String(visible));
        button.textContent = visible ? 'Ẩn lưới ô' : 'Hiện lưới ô';
        renderer.setGridVisible(visible);
    };
    gridToggle?.addEventListener('click', handleGridToggleClick);

    renderer.setCameraModeChangeListener(freeCamera => {
        if (!freeCamera && groundView && groundView.value !== 'spawn') {
            groundView.value = 'spawn';
        }
    });

    const handleCanvasMouseMove = (event: MouseEvent) => {
        if (!isGameScreenVisible()) {
            renderer.clearPointerPosition();
            return;
        }
        renderer.updatePointerClientPosition(event.clientX, event.clientY);
    };

    const handleCanvasMouseLeave = () => {
        renderer.clearPointerPosition();
    };

    const handleWindowBlur = () => {
        renderer.clearPointerPosition();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
        if (!isGameScreenVisible()) return;
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        if (isEditableElement(event.target)) return;

        if (event.code === 'KeyY' && !event.repeat) {
            const freeCamera = renderer.toggleFreeCamera(net.myId);
            showInfo(freeCamera
                ? 'Đã bật camera tự do (Y để tắt, Space để về nhân vật).'
                : 'Đã khóa camera theo nhân vật.');
            return;
        }

        if (event.code === 'Space' && renderer.isFreeCamera()) {
            event.preventDefault();
            renderer.centerOnPlayer(net.myId);
        }
    };

    canvas.addEventListener('mousemove', handleCanvasMouseMove);
    canvas.addEventListener('mouseleave', handleCanvasMouseLeave);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('keydown', handleKeyDown);

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
        renderer.setFreeCamera(false, net.myId);
        if (groundView) groundView.value = 'spawn';
        showGame();
        start();
    }

    let running = false;
    let rafId: number | null = null;
    function start() {
        if (running) return;
        running = true;
        rafId = requestAnimationFrame(gameLoop);
    }

    function gameLoop(timestamp: number) {
        if (!running) return;
        renderer.render(net.players, net.myId, movement.getPreviewPath(), net.map, timestamp);
        rafId = requestAnimationFrame(gameLoop);
    }

    return {
        destroy(): void {
            running = false;
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
            movement.destroy();
            renderer.setCameraModeChangeListener(undefined);
            groundView?.removeEventListener('change', handleGroundViewChange);
            gridToggle?.removeEventListener('click', handleGridToggleClick);
            canvas.removeEventListener('mousemove', handleCanvasMouseMove);
            canvas.removeEventListener('mouseleave', handleCanvasMouseLeave);
            window.removeEventListener('blur', handleWindowBlur);
            window.removeEventListener('keydown', handleKeyDown);
        }
    };
}