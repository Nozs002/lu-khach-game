import { GridMap } from './features/movement/GridMap.js';
import { findPath } from './features/movement/AStar.js';
import { MovementModule } from './features/movement/MovementModule.js';
import type { MovementPort } from './features/movement/MovementPort.js';
import { sameTile, type Entity, type Snapshot, type Tile } from './features/movement/types.js';
import { loadTileAtlas } from './features/movement/TileAtlas.js';

const status = document.querySelector<HTMLDivElement>('#status')!;
const report = (message: string) => { document.querySelector('#message')!.textContent = message; };
async function start(): Promise<void> {
  const maps = new Map<string, GridMap>();
  for (const id of ['world-01', 'world-02']) {
    const response = await fetch(`../common/maps/${id}.json`);
    if (!response.ok) throw new Error(`Không nạp được ${id}`);
    const map = new GridMap(await response.json()); maps.set(id, map);
  }
  GridMap.validateWorld(maps);
  // Local fake world only. No socket, server, session IDs or protocol envelopes.
  const players = new Map<string, Entity>([['demo-self', { id: 'demo-self', mapId: 'world-01', x: 3, y: 3 }], ['demo-peer', { id: 'demo-peer', mapId: 'world-01', x: 6, y: 5 }]]);
  const paths = new Map<string, Tile[]>(), nextStep = new Map<string, number>();
  const subscribers = new Set<(s: Snapshot) => void>(), disconnects = new Set<() => void>(), errors = new Set<(s: string) => void>();
  let tick = 0, connected = true;
  let snapshot: Snapshot = { tick, entities: [...players.values()] };
  const subscribe = <T>(set: Set<T>, fn: T) => { set.add(fn); return () => { set.delete(fn); }; };
  function move(id: string, target: Tile): void {
    const p = players.get(id); if (!connected || !p) return;
    const path = findPath(maps.get(p.mapId)!, p, target);
    if (path === null) { errors.forEach(fn => fn('Đích bị chặn hoặc không có đường')); return; }
    if (id === 'demo-self') report('');
    paths.set(id, path); // one bounded path per player; cooldown survives clicks
  }
  const port: MovementPort = {
    playerId: 'demo-self', sendCommand: (_type, payload) => move('demo-self', payload), getSnapshot: () => snapshot,
    onSnapshot: fn => subscribe(subscribers, fn), onDisconnect: fn => subscribe(disconnects, fn), onError: fn => subscribe(errors, fn),
  };
  const tiles = await loadTileAtlas();
  const module = new MovementModule(port, document.querySelector('canvas')!, maps, report, tiles);
  move('demo-peer', { x: 28, y: 16 });
  for (const id of players.keys()) nextStep.set(id, performance.now() + 200);
  const timer = window.setInterval(() => {
    const now = performance.now();
    for (const [id, p] of players) {
      const path = paths.get(id); if (!path?.length || now < (nextStep.get(id) ?? Infinity)) continue;
      const tile = path.shift()!, map = maps.get(p.mapId)!;
      let next: Entity = { ...p, ...tile };
      for (const exit of map.data.exits) {
        const i = exit.cells.findIndex(c => sameTile(c, tile));
        if (i >= 0) { next = { ...next, mapId: exit.targetMap, ...exit.arrivals[i] }; path.length = 0; break; }
      }
      players.set(id, next); nextStep.set(id, now + 200);
    }
    snapshot = { tick: ++tick, entities: [...players.values()] }; subscribers.forEach(fn => fn(snapshot));
    const self = players.get('demo-self')!;
    status.textContent = `Bản đồ: ${self.mapId} · Vị trí (${self.x}, ${self.y}) · Tick ${tick} · 2 nhân vật giả`;
  }, 100);
  let frame = 0;
  const draw = (now: number) => { module.render(now); frame = requestAnimationFrame(draw); }; frame = requestAnimationFrame(draw);
  const disconnect = () => {
    if (!connected) return; connected = false;
    clearInterval(timer); cancelAnimationFrame(frame); paths.clear(); nextStep.clear(); players.clear();
    snapshot = { tick: ++tick, entities: [] }; disconnects.forEach(fn => fn());
    subscribers.clear(); errors.clear(); disconnects.clear(); status.textContent = 'Đã rời demo; đường đi và trạng thái đã được dọn.';
  };
  document.querySelector('#disconnect')!.addEventListener('click', disconnect, { once: true });
  window.addEventListener('pagehide', disconnect, { once: true });
}
start().catch(error => report(String(error)));
