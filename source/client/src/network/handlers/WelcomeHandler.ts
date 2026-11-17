import type { Player } from '../../data/player';
import type { HandlerContext } from './HandlerContext';

export class WelcomeHandler {
    constructor(private context: HandlerContext) {}

    handle(data: { id: string; payload: Player[] }): void {
        const { state, name, onReady, onPlayersUpdate, onLog, onDialogue } = this.context;
        state.myId = data.id;
        data.payload.forEach(player => state.players.set(player.id, player));
        onReady();
        onPlayersUpdate(state.players, state.myId);
        onLog(`[Hệ thống] Chào mừng! ID của bạn là ${state.myId}`);
        onDialogue('Hệ Thống', `Chào mừng ${name} đã gia nhập sảnh chờ!`);
    }
}
