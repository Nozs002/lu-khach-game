import type { MapData } from '../../data/maps';
import type { Player } from '../../data/player';
import type { HandlerContext } from './HandlerContext';

export class WelcomeHandler {
    constructor(private context: HandlerContext) {}

    handle(data: { id: string; payload: Player[]; map?: MapData }): void {
        const { state, onReady, onPlayersUpdate, onLog } = this.context;
        if (!data.map) {
            this.context.onError('Máy chủ chưa gửi dữ liệu bản đồ.');
            this.context.close();
            return;
        }
        state.map = data.map;
        state.players.clear();
        state.myId = data.id;
        data.payload.forEach((player) => {
            state.players.set(player.id, player);
        });
        onReady();
        onPlayersUpdate(state.players, state.myId);
        onLog(`[Hệ thống] Chào mừng! ID của bạn là ${state.myId}`);

    }
}
