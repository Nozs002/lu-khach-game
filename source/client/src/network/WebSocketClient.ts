import type { MapData } from '../data/maps';
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

    public map: MapData | null = null;

    sendMoveTo(x: number, y: number): boolean {
        if (this.ws?.readyState !== WebSocket.OPEN) return false;
        this.ws.send(JSON.stringify({ type: 'MOVE_TO', x, y }));
        return true;
    }

    disconnect(): void { this.ws?.close(); }

    connect(
        name: string,
        characterId: string,
        onReady: () => void,
        onLog: (message: string) => void,

        onPlayersUpdate: (players: Map<string, Player>, myId: string | null) => void,
        onStatusChange: (online: boolean, text: string) => void,
        onError: (message: string) => void,
        onCommandError?: () => void
    ) {
        this.myId = null;
        this.players.clear();
        this.map = null;
        // mở cổng kết nối
        this.ws = new WebSocket('ws://localhost:8080');

        // đóng gói context để truyền tham số cho hàm
        const context: HandlerContext = {
            state: this,
            name,
            onReady,
            onLog,

            onPlayersUpdate,
            onError,
            onCommandError,
            close: () => this.ws.close()
        };

        const welcomeHandler = new WelcomeHandler(context);
        const playerJoinedHandler = new PlayerJoinedHandler(context);
        const playerLeftHandler = new PlayerLeftHandler(context);
        const stateUpdateHandler = new StateUpdateHandler(context);
        const errorHandler = new ErrorHandler(context);

        // xử lý khi mất mạng, đóng kết nối
        window.addEventListener('offline', () => {
            onStatusChange(false, 'Mất mạng (Offline)!');
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.close();
            }
        });

        // Gửi kết nối
        this.ws.onopen = () => {
            this.ws.send(JSON.stringify({ type: 'JOIN', name, characterId }));
            onStatusChange(true, 'Đã kết nối');
        };

        // Nhận thông tin từ server
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

        // đóng kết nối
        this.ws.onclose = () => {
            onStatusChange(false, 'Mất kết nối!');
            onLog('[Hệ thống] Đã ngắt kết nối với máy chủ.');
        };
    }
}
