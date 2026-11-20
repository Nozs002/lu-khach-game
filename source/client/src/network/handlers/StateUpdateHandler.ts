import type { WorldItem } from '../../data/items';
import type { Player } from '../../data/player';
import type { HandlerContext } from './HandlerContext';

export class StateUpdateHandler {
    constructor(private context: HandlerContext) {}

    handle(data: { payload: Player[]; items?: WorldItem[]; tick?: number }): void {
        const { state, onPlayersUpdate, events } = this.context;
        if (typeof data.tick === 'number') {
            if (data.tick < state.currentTick) {
                return;
            }
            state.currentTick = data.tick;
        }
        state.players.clear();
        data.payload.forEach((player) => {
            state.players.set(player.id, player);
        });
        if (Array.isArray(data.items)) {
            state.items.clear();
            data.items.forEach((item) => {
                state.items.set(item.id, item);
            });
        }
        onPlayersUpdate(state.players, state.myId);
        events?.onWorldUpdate?.();
    }
}
