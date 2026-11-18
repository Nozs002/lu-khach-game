// Run against a test server: node statics/map-design/check_world_socket.mjs ws://localhost:8081
import assert from 'node:assert/strict';
import fs from 'node:fs';
const world = JSON.parse(fs.readFileSync(new URL('../../source/server/src/main/resources/maps/world.generated.json', import.meta.url)));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const socket = new WebSocket(process.argv[2] || 'ws://localhost:8081');
let me;
let id;
const timeout = setTimeout(() => { console.error('Timed out'); process.exit(1); }, 15000);
try {
    await new Promise((resolve, reject) => {
        socket.onerror = reject;
        socket.onopen = () => socket.send(JSON.stringify({ type: 'JOIN', name: 'Map integration check', characterId: 'knight' }));
        socket.onmessage = event => {
            const data = JSON.parse(event.data);
            if (data.type === 'WELCOME') { id = data.id; me = data.payload.find(p => p.id === id); resolve(); }
            if (data.type === 'STATE_UPDATE') me = data.payload.find(p => p.id === id);
        };
    });
    const size = world.tileSize;
    assert.equal(me.x, world.spawns[0].x * size);
    assert.equal(me.y, world.spawns[0].y * size);
    // Find the nearest reachable cell with an adjacent authored obstacle.
    const queue = [{ x: me.x / size, y: me.y / size, path: [] }];
    const visited = new Set();
    let target;
    const steps = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let i = 0; i < queue.length && !target; i++) {
        const cell = queue[i];
        for (const [dx, dy] of steps) {
            const x = cell.x + dx, y = cell.y + dy;
            if (x < 0 || y < 0 || x >= world.width || y >= world.height) continue;
            if (world.collision[y][x]) { target = { ...cell, blocked: [dx, dy] }; break; }
            const key = `${x},${y}`;
            if (!visited.has(key)) { visited.add(key); queue.push({ x, y, path: [...cell.path, [dx, dy]] }); }
        }
    }
    assert.ok(target);
    for (const [dx, dy] of target.path) {
        socket.send(JSON.stringify({ type: 'MOVE', dx, dy }));
        await sleep(180);
    }
    assert.equal(me.x, target.x * size);
    assert.equal(me.y, target.y * size);
    const before = { x: me.x, y: me.y };
    socket.send(JSON.stringify({ type: 'MOVE', dx: target.blocked[0], dy: target.blocked[1] }));
    await sleep(200);
    assert.equal(me.x, before.x);
    assert.equal(me.y, before.y);
    // A subsequent accepted move confirms the connection and authoritative state still work.
    const back = target.path.length ? target.path.at(-1).map(v => -v) : steps.find(([dx, dy]) => !world.collision[target.y + dy]?.[target.x + dx]);
    socket.send(JSON.stringify({ type: 'MOVE', dx: back[0], dy: back[1] }));
    await sleep(200);
    assert.equal(me.x, before.x + back[0] * size);
    assert.equal(me.y, before.y + back[1] * size);
    console.log(`PASS: WebSocket spawn, ${target.path.length} moves, blocked tile rejection and next valid move`);
} finally {
    clearTimeout(timeout);
    socket.close();
}
