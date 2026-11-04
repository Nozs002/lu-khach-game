import assert from 'node:assert/strict';

const url = process.env.GAME_SERVER_URL ?? 'ws://127.0.0.1:8080/game';
const clients = [];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function connect() {
  const ws = new WebSocket(url);
  const inbox = [];
  const waiting = [];
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    const index = waiting.findIndex(wait => wait.predicate(message));
    if (index >= 0) {
      const [wait] = waiting.splice(index, 1);
      clearTimeout(wait.timer); wait.resolve(message);
    } else inbox.push(message);
  });
  const client = {
    ws, inbox,
    send: data => ws.send(JSON.stringify(data)),
    next(predicate) {
      const index = inbox.findIndex(predicate);
      if (index >= 0) return Promise.resolve(inbox.splice(index, 1)[0]);
      return new Promise((resolve, reject) => {
        const wait = { predicate, resolve, timer: undefined };
        wait.timer = setTimeout(() => {
          waiting.splice(waiting.indexOf(wait), 1);
          reject(new Error('Timed out waiting for server event'));
        }, 3000);
        waiting.push(wait);
      });
    },
    type(type) { return this.next(message => message.type === type); }
  };
  clients.push(client);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Connection timed out')), 3000);
    ws.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
    ws.addEventListener('error', () => { clearTimeout(timer); reject(new Error(`Cannot connect to ${url}`)); }, { once: true });
  });
  return client;
}

try {
  const a = await connect();
  a.send({ type: 'MOVE', direction: 'RIGHT' });
  assert.equal((await a.type('ERROR')).code, 'JOIN_REQUIRED');
  a.ws.send('{bad-json');
  assert.equal((await a.type('ERROR')).code, 'INVALID_MESSAGE');
  a.send({ type: 'JOIN', name: 'An' });
  const first = await a.type('WELCOME');
  assert.equal(first.players.length, 1, 'Use an empty server for this test');
  assert(first.map.blocked.some(([x, y]) => x === 0 && y === 0));
  const b = await connect();
  b.send({ type: 'JOIN', name: 'Bình' });
  const second = await b.type('WELCOME');
  assert.equal(second.players.length, 2);
  assert(second.players.some(player => player.id === first.you));
  assert.equal((await a.next(event => event.type === 'PLAYER_JOINED' && event.player.id === second.you)).player.name, 'Bình');
  console.log('PASS JOIN, snapshot, player joined, invalid JSON and pre-JOIN validation');

  a.send({ type: 'MOVE', direction: 'RIGHT' });
  const moveA = await a.type('PLAYER_MOVED');
  const moveB = await b.type('PLAYER_MOVED');
  assert.deepEqual(moveA, moveB);
  assert.equal(moveA.x, first.players[0].x + 1);
  assert.equal(moveA.id, first.you);
  a.send({ type: 'MOVE', direction: 'RIGHT' });
  await pause(200);
  assert(!b.inbox.some(event => event.type === 'PLAYER_MOVED'), 'Rapid second move must be ignored');

  a.send({ type: 'MOVE', direction: 'UP' });
  assert.equal((await a.type('PLAYER_MOVED')).y, 1);
  await b.type('PLAYER_MOVED');
  await pause(180);
  a.send({ type: 'MOVE', direction: 'UP' });
  await pause(180);
  assert(!b.inbox.some(event => event.type === 'PLAYER_MOVED'), 'Wall must block movement');
  const observer = await connect();
  observer.send({ type: 'JOIN', name: 'Observer' });
  const snapshot = await observer.type('WELCOME');
  const current = snapshot.players.find(player => player.id === first.you);
  assert.equal(current.y, 1); assert.equal(current.x, moveA.x);
  console.log('PASS movement broadcast, rate limit and wall collision verified by fresh snapshot');

  a.send({ type: 'MOVE', direction: 'TELEPORT', x: 999, y: 999 });
  assert.equal((await a.type('ERROR')).code, 'INVALID_DIRECTION');
  a.send({ type: 'JOIN', name: 'Again' });
  assert.equal((await a.type('ERROR')).code, 'ALREADY_JOINED');
  a.send({ type: 'CHAT', text: 'x'.repeat(201) });
  assert.equal((await a.type('ERROR')).code, 'INVALID_CHAT');
  a.send({ type: 'CHAT', text: 'Xin chào <b>thế giới</b>' });
  const chatA = await a.type('CHAT');
  const chatB = await b.type('CHAT');
  assert.deepEqual(chatA, chatB);
  assert.equal(chatB.text, 'Xin chào <b>thế giới</b>');
  assert.equal(chatB.name, 'An');
  b.ws.close();
  assert.equal((await a.next(event => event.type === 'PLAYER_LEFT' && event.id === second.you)).id, second.you);
  console.log('PASS direction/name session validation, chat and disconnect');
} finally {
  await Promise.all(clients.map(({ ws }) => new Promise(resolve => {
    if (ws.readyState === WebSocket.CLOSED) return resolve();
    ws.addEventListener('close', resolve, { once: true });
    ws.close();
    setTimeout(resolve, 1000).unref();
  })));
}
