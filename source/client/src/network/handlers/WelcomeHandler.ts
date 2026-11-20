import type { WorldItem } from '../../data/items';
import type { MapData } from '../../data/maps';
import type { Player } from '../../data/player';
import type { HandlerContext } from './HandlerContext';

export class WelcomeHandler {
    constructor(private context: HandlerContext) {}

    handle(data: {
        id: string;
        payload: Player[];
        map?: MapData;
        items?: WorldItem[];
        tick?: number;
        tickDurationMs?: number;
    }): void {
        const { state, onReady, onPlayersUpdate, onLog, events } = this.context;
        if (!data.map) {
            this.context.onError('Máy chủ chưa gửi dữ liệu bản đồ.');
            this.context.close();
            return;
        }
        state.map = data.map;
        state.players.clear();
        state.items.clear();
        state.myId = data.id;
        if (typeof data.tick === 'number') {
            state.currentTick = data.tick;
        }
        if (typeof data.tickDurationMs === 'number' && data.tickDurationMs > 0) {
            state.tickDurationMs = data.tickDurationMs;
        }
        data.payload.forEach((player) => {
            state.players.set(player.id, player);
        });
        if (Array.isArray(data.items)) {
            data.items.forEach((item) => {
                state.items.set(item.id, item);
            });
        }
        onReady();
        onPlayersUpdate(state.players, state.myId);
        events?.onWorldUpdate?.();
        onLog(`[Hệ thống] Chào mừng! ID của bạn là ${state.myId}`);
    }
}
