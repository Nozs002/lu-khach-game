import type { Player } from '../../data/player';
import type { HandlerContext } from './HandlerContext';

export class StateUpdateHandler {
    constructor(private context: HandlerContext) {}

    handle(data: { payload: Player[] }): void {
        const { state, onPlayersUpdate } = this.context;
        state.players.clear();
        data.payload.forEach((player) => {
            state.players.set(player.id, player);
        });
        onPlayersUpdate(state.players, state.myId);
    }
}
