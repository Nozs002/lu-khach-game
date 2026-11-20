import { initGameController } from './game/GameController';
import { WebSocketClient } from './network/WebSocketClient';
import { CanvasRenderer } from './render/CanvasRenderer';
import { renderCharacterSelection } from './ui/CharacterSelection';

renderCharacterSelection();

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
initGameController(new WebSocketClient(), new CanvasRenderer(canvas));
