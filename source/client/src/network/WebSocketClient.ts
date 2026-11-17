import type { Player } from '../data/player';
import type { HandlerContext } from './handlers/HandlerContext';
import { WelcomeHandler } from './handlers/WelcomeHandler';
import { PlayerJoinedHandler } from './handlers/PlayerJoinedHandler';
import { PlayerLeftHandler } from './handlers/PlayerLeftHandler';
import { StateUpdateHandler } from './handlers/StateUpdateHandler';
import { ErrorHandler } from './handlers/ErrorHandler';

export class WebSocketClient {
    private ws!: WebSocket;
    public myId: string | null = null;
    public players: Map<string, Player> = new Map();

    connect(
        name: string,
        characterId: string,
        onReady: () => void,
        onLog: (message: string) => void,
        onDialogue: (name: string, text: string) => void,
        onPlayersUpdate: (players: Map<string, Player>, myId: string | null) => void,
        onStatusChange: (online: boolean, text: string) => void,
        onError: (message: string) => void
    ) {
        this.ws = new WebSocket('ws://localhost:8080');
        const context: HandlerContext = {
            state: this,
            name,
            onReady,
            onLog,
            onDialogue,
            onPlayersUpdate,
            onError,
            close: () => this.ws.close()
        };
        const welcomeHandler = new WelcomeHandler(context);
        const playerJoinedHandler = new PlayerJoinedHandler(context);
        const playerLeftHandler = new PlayerLeftHandler(context);
        const stateUpdateHandler = new StateUpdateHandler(context);
        const errorHandler = new ErrorHandler(context);

        window.addEventListener('offline', () => {
            onStatusChange(false, 'Mất mạng (Offline)!');
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.close();
            }
        });

        this.ws.onopen = () => {
            this.ws.send(JSON.stringify({ type: 'JOIN', name, characterId }));
            onStatusChange(true, 'Đã kết nối');
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            switch (data.type) {
                case 'WELCOME':
                    welcomeHandler.handle(data);
                    break;

                case 'PLAYER_JOINED':
                    playerJoinedHandler.handle(data);
                    break;

                case 'PLAYER_LEFT':
                    playerLeftHandler.handle(data);
                    break;

                case 'STATE_UPDATE':
                    stateUpdateHandler.handle(data);
                    break;

                case 'ERROR':
                    errorHandler.handle(data);
                    break;
            }
        };

        this.ws.onclose = () => {
            onStatusChange(false, 'Mất kết nối!');
            onLog('[Hệ thống] Đã ngắt kết nối với máy chủ.');
        };
    }

    sendMove(dx: number, dy: number) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'MOVE', dx, dy }));
        }
    }
}
