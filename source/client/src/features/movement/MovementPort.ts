import type { Snapshot, Tile } from './types.js';

/** Adapter supplied by feature 1. Core alone owns transport, IDs and state store. */
export interface MovementPort {
  readonly playerId: string;
  sendCommand(type: 'MOVE_TO', payload: Tile): void;
  getSnapshot(): Snapshot;
  onSnapshot(handler: (snapshot: Snapshot) => void): () => void;
  onDisconnect(handler: () => void): () => void;
  onError(handler: (code: string) => void): () => void;
}
