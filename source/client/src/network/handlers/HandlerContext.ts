import type { MapData } from '../../data/maps';
import type { Player } from '../../data/player';

export interface PlayerState {
    myId: string | null;
    players: Map<string, Player>;
    map: MapData | null;
}

export interface HandlerContext {
    state: PlayerState;
    name: string;
    onReady: () => void;
    onLog: (message: string) => void;
    onDialogue: (name: string, text: string) => void;
    onPlayersUpdate: (players: Map<string, Player>, myId: string | null) => void;
    onError: (message: string) => void;
    onCommandError?: () => void;
    close: () => void;
}
