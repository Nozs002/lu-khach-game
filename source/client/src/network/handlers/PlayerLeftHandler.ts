import type { HandlerContext } from './HandlerContext';

export class PlayerLeftHandler {
    constructor(private context: HandlerContext) {}

    handle(data: { id: string }): void {
        const { state, onPlayersUpdate, onLog } = this.context;
        const leaver = state.players.get(data.id);
        const leaverName = leaver ? leaver.name : 'Một người chơi';
        state.players.delete(data.id);
        onPlayersUpdate(state.players, state.myId);
        onLog(`[Sự kiện] ${leaverName} đã rời đi.`);

    }
}
