import Phaser from 'phaser';
import './style.css';

type Player = { id: string; name: string; x: number; y: number };
type WorldMap = { width: number; height: number; tileSize: number; blocked: [number, number][] };
type ServerEvent =
  | { type: 'WELCOME'; you: string; map: WorldMap; players: Player[] }
  | { type: 'PLAYER_JOINED'; player: Player }
  | { type: 'PLAYER_MOVED'; id: string; x: number; y: number }
  | { type: 'PLAYER_LEFT'; id: string; name: string }
  | { type: 'CHAT'; id: string; name: string; text: string }
  | { type: 'ERROR'; code: string; message: string };
const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const players = new Map<string, Player>();
let socket: WebSocket | undefined;
let you = '';
let world: WorldMap | undefined;
let scene: WorldScene;
const notice = (text: string) => { element('notice').textContent = text; };
function line(text: string) {
  const list = element('messages');
  const item = document.createElement('li');
  item.textContent = text;
  list.append(item);
  while (list.children.length > 100) list.firstElementChild?.remove();
  list.scrollTop = list.scrollHeight;
}
function send(value: object) {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(value));
}
function refresh() {
  element('population').textContent = `${players.size} người chơi`;
  scene?.drawPlayers();
}
function connected(active: boolean) {
  element<HTMLInputElement>('message').disabled = !active;
  element<HTMLButtonElement>('send').disabled = !active;
  element<HTMLButtonElement>('join-button').disabled = active;
  element<HTMLInputElement>('name').disabled = active;
}

class WorldScene extends Phaser.Scene {
  private terrain!: Phaser.GameObjects.Graphics;
  private actors!: Phaser.GameObjects.Container;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private lastMove = 0;
  create() {
    scene = this;
    this.terrain = this.add.graphics();
    this.actors = this.add.container();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as typeof this.keys;
    this.input.keyboard!.removeCapture(['W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE']);
    this.drawMap(); this.drawPlayers();
  }
  drawMap() {
    if (!this.terrain) return;
    this.terrain.clear();
    const map = world ?? { width: 24, height: 16, tileSize: 32, blocked: [] };
    const tile = map.tileSize;
    for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
      this.terrain.fillStyle((x + y) % 2 ? 0x527349 : 0x56784c);
      this.terrain.fillRect(x * tile, y * tile, tile, tile);
      if ((x * 7 + y * 11) % 9 === 0) {
        this.terrain.fillStyle(0x78915a, .65).fillRect(x * tile + 9, y * tile + 19, 3, 4);
      }
      if (y === 8 || y === 9) {
        this.terrain.fillStyle((x + y) % 2 ? 0x9d9569 : 0xa49b70).fillRect(x * tile, y * tile, tile, tile);
      }
    }
    for (const [x, y] of map.blocked) {
      this.terrain.fillStyle(0x273d31).fillRoundedRect(x * tile + 2, y * tile + 5, tile - 4, tile - 4, 7);
      this.terrain.fillStyle(0x36583c).fillRoundedRect(x * tile + 1, y * tile, tile - 2, tile - 6, 7);
      this.terrain.fillStyle(0x486b44).fillRect(x * tile + 6, y * tile + 5, 12, 4);
    }
  }
  drawPlayers() {
    if (!this.actors) return;
    this.actors.removeAll(true);
    const tile = world?.tileSize ?? 32;
    for (const player of players.values()) {
      const x = player.x * tile + tile / 2, y = player.y * tile + tile / 2;
      const art = this.add.graphics();
      art.fillStyle(0x15281d, .4).fillEllipse(x, y + 10, 25, 10);
      art.fillStyle(player.id === you ? 0xe9c76b : 0x9cc9da).fillRect(x - 8, y - 2, 16, 14);
      art.fillStyle(0xe9c4a0).fillRect(x - 6, y - 13, 12, 12);
      art.fillStyle(0x42382e).fillRect(x - 7, y - 15, 14, 5);
      art.fillStyle(0x25382c).fillRect(x - 6, y + 12, 5, 4).fillRect(x + 2, y + 12, 5, 4);
      const label = this.add.text(x, y - 27, player.name + (player.id === you ? ' •' : ''), {
        fontFamily: 'system-ui', fontSize: '11px', color: '#fff7db', backgroundColor: '#24372c', padding: { x: 4, y: 2 }
      }).setOrigin(.5);
      this.actors.add([art, label]);
    }
  }
  update(time: number) {
    if (!you || time - this.lastMove < 160 || ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName ?? '') || !document.hasFocus()) return;
    let direction: string | undefined;
    if (this.keys.W.isDown || this.keys.UP.isDown) direction = 'UP';
    else if (this.keys.S.isDown || this.keys.DOWN.isDown) direction = 'DOWN';
    else if (this.keys.A.isDown || this.keys.LEFT.isDown) direction = 'LEFT';
    else if (this.keys.D.isDown || this.keys.RIGHT.isDown) direction = 'RIGHT';
    if (direction) { send({ type: 'MOVE', direction }); this.lastMove = time; }
  }
}
new Phaser.Game({ type: Phaser.AUTO, parent: 'game', width: 768, height: 512, pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: WorldScene,
  backgroundColor: '#527349' });

element<HTMLFormElement>('join').addEventListener('submit', event => {
  event.preventDefault();
  const name = element<HTMLInputElement>('name').value.trim();
  if (!name) { notice('Hãy nhập tên nhân vật.'); return; }
  element<HTMLButtonElement>('join-button').disabled = true;
  const url = new URLSearchParams(location.search).get('server') ?? `ws://${location.hostname || '127.0.0.1'}:8080/game`;
  try { socket = new WebSocket(url); }
  catch { connected(false); notice('Địa chỉ WebSocket không hợp lệ.'); return; }
  element('status').textContent = 'Đang kết nối…';
  const current = socket;
  const timeout = window.setTimeout(() => {
    if (!you) { current.close(); notice('Kết nối quá lâu. Hãy thử lại.'); }
  }, 8000);
  current.onopen = () => send({ type: 'JOIN', name });
  current.onmessage = message => {
    let data: ServerEvent;
    try { data = JSON.parse(message.data) as ServerEvent; } catch { return; }
    switch (data.type) {
      case 'WELCOME':
        clearTimeout(timeout); you = data.you; world = data.map; players.clear();
        data.players.forEach(player => players.set(player.id, player));
        scene?.drawMap(); connected(true); element('status').textContent = '● Đã kết nối';
        notice('Bạn đã vào thế giới. Dùng WASD hoặc phím mũi tên để khám phá.');
        element<HTMLInputElement>('name').blur(); break;
      case 'PLAYER_JOINED':
        if (!players.has(data.player.id)) line(`${data.player.name} đã vào thế giới.`);
        players.set(data.player.id, data.player); break;
      case 'PLAYER_MOVED': {
        const player = players.get(data.id);
        if (player) { player.x = data.x; player.y = data.y; } break;
      }
      case 'PLAYER_LEFT': players.delete(data.id); line(`${data.name} đã rời thế giới.`); break;
      case 'CHAT': line(`${data.name}: ${data.text}`); break;
      case 'ERROR': notice(data.message); if (!you) current.close(); break;
    }
    refresh();
  };
  current.onerror = () => notice('Không kết nối được. Kiểm tra server Java và địa chỉ WebSocket.');
  current.onclose = () => {
    clearTimeout(timeout); you = ''; players.clear(); refresh(); connected(false);
    element('status').textContent = 'Đã ngắt kết nối';
    line('Kết nối đã đóng. Bấm Vào thế giới để kết nối lại.');
  };
});
element<HTMLFormElement>('chat').addEventListener('submit', event => {
  event.preventDefault();
  const input = element<HTMLInputElement>('message');
  if (input.value.trim()) send({ type: 'CHAT', text: input.value.trim() });
  input.value = ''; input.blur();
});
window.addEventListener('keydown', event => {
  if (you && event.key === 'Enter' && document.activeElement?.tagName !== 'INPUT') {
    event.preventDefault(); element('message').focus();
  }
  if (you && document.activeElement?.tagName !== 'INPUT' && event.key.startsWith('Arrow')) event.preventDefault();
});
window.addEventListener('pagehide', () => socket?.close());
