export interface PlayerData {
    id: string;
    name: string;
    avatar: string;
    x: number;
    y: number;
}

export class WebSocketClient {
    private ws!: WebSocket;
    public myId: string | null = null;
    public players: Map<string, PlayerData> = new Map();

    connect(
        name: string,
        avatar: string,
        onReady: () => void,
        onLog: (msg: string) => void,
        onDialogue: (name: string, text: string) => void,
        onPlayersUpdate: () => void,
        onStatusChange: (online: boolean, text: string) => void
    ) {
        this.ws = new WebSocket('ws://localhost:8080');

        window.addEventListener('offline', () => {
            onStatusChange(false, 'Mất mạng (Offline)!');
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.close();
            }
        });

        this.ws.onopen = () => {
            this.ws.send(JSON.stringify({ type: 'JOIN', name, avatar }));
            onStatusChange(true, 'Đã kết nối');
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            switch (data.type) {
                case 'WELCOME':
                    this.myId = data.id;
                    data.payload.forEach((p: PlayerData) => this.players.set(p.id, p));
                    onReady();
                    onPlayersUpdate();
                    onLog(`[Hệ thống] Chào mừng! ID của bạn là ${this.myId}`);
                    onDialogue('Hệ Thống', `Chào mừng ${name} đã gia nhập sảnh chờ!`);
                    break;

                case 'PLAYER_JOINED':
                    this.players.set(data.payload.id, data.payload);
                    onPlayersUpdate();
                    onLog(`[Sự kiện] ${data.payload.name} vừa vào làng.`);
                    onDialogue('Thông Báo', `${data.payload.name} vừa mới gia nhập.`);
                    break;

                case 'PLAYER_LEFT':
                    const leaver = this.players.get(data.id);
                    const leaverName = leaver ? leaver.name : 'Một người chơi';
                    this.players.delete(data.id);
                    onPlayersUpdate();
                    onLog(`[Sự kiện] ${leaverName} đã rời đi.`);
                    onDialogue('Thông Báo', `${leaverName} đã rời khỏi khu vực.`);
                    break;

                case 'STATE_UPDATE':
                    this.players.clear();
                    data.payload.forEach((p: PlayerData) => this.players.set(p.id, p));
                    onPlayersUpdate();
                    break;

                case 'PING':
                    this.ws.send(JSON.stringify({ type: 'PONG' }));
                    break;

                case 'ERROR':
                    alert(data.payload || data.message);
                    this.ws.close();
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