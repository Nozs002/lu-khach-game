import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const endpoint = process.env.GAME_SERVER_URL ?? 'ws://127.0.0.1:8080/';
const clients = [];
const map = JSON.parse(fs.readFileSync('../server/maps/world_server.json', 'utf8'));
const blocked = new Set(map.collisions);
const valid = (x, y) => x > 0 && y > 0 && x < map.width && y < map.height && !blocked.has(y * map.width + x);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const compiled = fs.readFileSync('public/js/gameclient.js', 'utf8');
const shared = fs.readFileSync('public/shared/js/gametypes.js', 'utf8');

function queue() {
  const inbox = [], waiting = [];
  return {
    inbox,
    push(event) {
      const index = waiting.findIndex(wait => wait.predicate(event));
      if (index < 0) inbox.push(event);
      else {
        const [wait] = waiting.splice(index, 1);
        clearTimeout(wait.timer); wait.resolve(event);
      }
    },
    next(predicate) {
      const index = inbox.findIndex(predicate);
      if (index >= 0) return Promise.resolve(inbox.splice(index, 1)[0]);
      return new Promise((resolve, reject) => {
        const waiter = { predicate, resolve, timer: undefined };
        waiter.timer = setTimeout(() => {
          waiting.splice(waiting.indexOf(waiter), 1);
          reject(new Error('Timed out waiting for packet'));
        }, 4000);
        waiting.push(waiter);
      });
    }
  };
}

async function connect(name) {
  const events = queue();
  let Constructor;
  class Player {
    constructor(id, name) { this.id = id; this.name = name; }
  }
  const factory = {
    createEntity(kind, id, entityName = '') {
      const entity = kind === 1 ? new Player(id, entityName) : { id, name: entityName };
      entity.kind = kind;
      return entity;
    }
  };
  const context = {
    WebSocket, URLSearchParams, console,
    location: { protocol: 'http:', search: '?server=' + encodeURIComponent(endpoint) },
    document: { getElementById: () => null },
    define(dependencies, callback) {
      assert.deepEqual(Array.from(dependencies), ['player', 'entityfactory']);
      Constructor = callback(Player, factory);
    }
  };
  vm.runInNewContext(shared, context);
  vm.runInNewContext(compiled, context);
  const client = new Constructor('127.0.0.1', 8080);
  const state = { client, events, entities: new Map() };
  const spawn = (entity, x, y) => {
    state.entities.set(entity.id, { ...entity, x, y });
    events.push({ type: 'SPAWN', id: entity.id, kind: entity.kind, x, y, name: entity.name });
  };
  client.onConnected(() => client.sendHello({ name, getSpriteName: () => 'clotharmor', getWeaponName: () => 'sword1' }));
  client.onWelcome((id, name, x, y, hp) => {
    state.id = id; state.x = x; state.y = y;
    events.push({ type: 'WELCOME', id, name, x, y, hp });
  });
  client.onEntityList(ids => {
    events.push({ type: 'LIST', ids: Array.from(ids) });
    client.sendWho(Array.from(ids).filter(id => !state.entities.has(id)));
  });
  client.onSpawnCharacter(spawn); client.onSpawnItem(spawn); client.onSpawnChest(spawn);
  client.onEntityMove((id, x, y) => events.push({ type: 'MOVE', id, x, y }));
  client.onChatMessage((id, text) => events.push({ type: 'CHAT', id, text }));
  client.onDespawnEntity(id => events.push({ type: 'DESPAWN', id }));
  client.onPlayerDamageMob((id, points) => events.push({ type: 'DAMAGE', id, points }));
  client.onPlayerKillMob(kind => events.push({ type: 'KILL', kind }));
  client.onDisconnected(reason => events.push({ type: 'CLOSED', reason }));
  clients.push(state);
  client.connect();
  state.welcome = await events.next(event => event.type === 'WELCOME');
  return state;
}

async function malformed(packet) {
  const socket = new WebSocket(endpoint);
  clients.push({ client: { connection: socket } });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Malformed packet was not rejected')), 3000);
    socket.onmessage = event => { if (event.data === 'go') socket.send(packet); };
    socket.onclose = event => { clearTimeout(timer); resolve(event.code); };
    socket.onerror = () => { clearTimeout(timer); reject(new Error('Socket error')); };
  });
}

try {
  assert.equal(await malformed('{bad-json'), 1008);
  assert.equal(await malformed('[4,10,10]'), 1008);
  console.log('PASS malformed JSON and actions before HELLO are rejected');

  const a = await connect('An');
  const b = await connect('Binh');
  assert.equal(a.welcome.hp, 80);
  assert(valid(a.x, a.y));
  await a.events.next(event => event.type === 'SPAWN' && event.id === b.id);
  await b.events.next(event => event.type === 'SPAWN' && event.id === a.id);
  assert(a.entities.size > 2, 'Original world NPC/mob/item spawns must be delivered');
  console.log('PASS compiled TypeScript client → Java handshake, original world LIST/WHO/SPAWN and player gear decoding');

  const point = [[1,0],[-1,0],[0,1],[0,-1]].map(([dx, dy]) => [a.x + dx, a.y + dy]).find(([x,y]) => valid(x,y));
  assert(point);
  a.client.sendMove(...point);
  const moved = await b.events.next(event => event.type === 'MOVE' && event.id === a.id);
  assert.equal(moved.x, point[0]); assert.equal(moved.y, point[1]);
  a.x = point[0]; a.y = point[1];
  a.client.sendChat('Xin chao <b>web</b>');
  const chatA = await a.events.next(event => event.type === 'CHAT' && event.id === a.id);
  const chatB = await b.events.next(event => event.type === 'CHAT' && event.id === a.id);
  assert.deepEqual(chatA, chatB);
  assert.equal(chatA.text, 'Xin chao &lt;b&gt;web&lt;/b&gt;');
  console.log('PASS BrowserQuest MOVE and escaped CHAT through the TypeScript callback API');

  // Find a reachable rat using the original collision data; approach and fight it.
  const rats = new Map([...a.entities.values()].filter(entity => entity.kind === 2).map(entity => [entity.y * map.width + entity.x, entity]));
  const pending = [[a.x, a.y]], visited = new Set([a.y * map.width + a.x]);
  let encounter;
  for (let cursor = 0; cursor < pending.length && cursor < 7000 && !encounter; cursor++) {
    const [x,y] = pending[cursor];
    for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const rat = rats.get((y+dy) * map.width + x+dx);
      if (rat && Math.abs(x-a.x)+Math.abs(y-a.y) <= 64) { encounter = { rat, x, y }; break; }
      const nx=x+dx, ny=y+dy, key=ny*map.width+nx;
      if (valid(nx,ny) && !visited.has(key)) { visited.add(key); pending.push([nx,ny]); }
    }
  }
  assert(encounter, 'Original world should contain an approachable rat');
  a.client.sendMove(encounter.x, encounter.y);
  await b.events.next(event => event.type === 'MOVE' && event.id === a.id);
  a.client.sendAttack(encounter.rat);
  a.client.sendHit(encounter.rat);
  const damage = await a.events.next(event => event.type === 'DAMAGE' && event.id === encounter.rat.id);
  assert(damage.points > 0);
  console.log('PASS original mob stats and Java-validated combat damage');

  b.client.connection.close();
  await a.events.next(event => event.type === 'DESPAWN' && event.id === b.id);
  a.client.sendMove(0, 0);
  await a.events.next(event => event.type === 'CLOSED');
  console.log('PASS disconnect and wall destination rejection');
} finally {
  await Promise.all(clients.map(({ client }) => new Promise(resolve => {
    const socket = client.connection;
    if (!socket || socket.readyState === WebSocket.CLOSED) return resolve();
    socket.addEventListener('close', resolve, { once: true }); socket.close();
    setTimeout(resolve, 1000).unref();
  })));
}
