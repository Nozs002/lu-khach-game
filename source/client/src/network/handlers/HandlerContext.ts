import type { Player } from '../../data/player';

export interface PlayerState {
    myId: string | null;
    players: Map<string, Player>;
}

export interface HandlerContext {
    state: PlayerState;
    name: string;
    onReady: () => void;
    onLog: (message: string) => void;
    onDialogue: (name: string, text: string) => void;
    onPlayersUpdate: (players: Map<string, Player>, myId: string | null) => void;
    onError: (message: string) => void;
    close: () => void;
}
