import type { Player } from '../../data/player';
import type { HandlerContext } from './HandlerContext';

export class PlayerJoinedHandler {
    constructor(private context: HandlerContext) {}

    handle(data: { payload: Player }): void {
        const { state, onPlayersUpdate, onLog, onDialogue } = this.context;
        state.players.set(data.payload.id, data.payload);
        onPlayersUpdate(state.players, state.myId);
        onLog(`[Sự kiện] ${data.payload.name} vừa vào làng.`);
        onDialogue('Thông Báo', `${data.payload.name} vừa mới gia nhập.`);
    }
}
