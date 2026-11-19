// Run on an empty test server: node statics/map-design/check_world_socket.mjs ws://localhost:8081
import assert from 'node:assert/strict';
import fs from 'node:fs';
const world = JSON.parse(fs.readFileSync(new URL('../../source/server/src/main/resources/maps/world.generated.json', import.meta.url)));
const socket = new WebSocket(process.argv[2] || 'ws://localhost:8081');
let me, id, map;
const errors = [];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const timeout = setTimeout(() => { console.error('Timed out'); process.exit(1); }, 15000);
async function waitFor(predicate) {
    for (let i = 0; i < 100; i++) { if (predicate()) return; await sleep(30); }
    throw new Error('Missing expected server update');
}
try {
    await new Promise((resolve, reject) => {
        socket.onerror = reject;
        socket.onopen = () => socket.send(JSON.stringify({ type: 'JOIN', name: 'AStar integration check', characterId: 'knight' }));
        socket.onmessage = event => {
            const data = JSON.parse(event.data);
            if (data.type === 'WELCOME') { id = data.id; map = data.map; me = data.payload.find(p => p.id === id); resolve(); }
            if (data.type === 'ERROR') errors.push(data.code);
            if (data.type === 'STATE_UPDATE') {
                const next = data.payload.find(p => p.id === id);
                assert.ok(Math.abs(next.x - me.x) + Math.abs(next.y - me.y) <= 1, 'No teleport between ticks');
                assert.equal(world.collision[next.y][next.x], 0);
                me = next;
            }
        };
    });
    assert.equal(me.x, world.spawns[0].x);
    assert.equal(me.y, world.spawns[0].y);
    assert.deepEqual(map.tiles, world.collision);
    assert.equal(map.tileSize, world.tileSize);
    // MOVE_TO must replace keyboard MOVE; check a nearby target.
    const start = { x: me.x, y: me.y };
    const target = { x: me.x, y: me.y + 1 };
    assert.equal(world.collision[target.y][target.x], 0);
    socket.send(JSON.stringify({ type: 'MOVE_TO', ...target }));
    await waitFor(() => me.x === target.x && me.y === target.y);
    const blockedIndex = world.collision.flat().findIndex(Boolean);
    socket.send(JSON.stringify({ type: 'MOVE_TO', x: blockedIndex % world.width, y: Math.floor(blockedIndex / world.width) }));
    await waitFor(() => errors.includes('BLOCKED_TILE'));
    assert.equal(me.x, target.x); assert.equal(me.y, target.y);
    socket.send(JSON.stringify({ type: 'MOVE', dx: 1, dy: 0 }));
    await waitFor(() => errors.includes('UNSUPPORTED_COMMAND'));
    socket.send(JSON.stringify({ type: 'MOVE_TO', ...start }));
    await waitFor(() => me.x === start.x && me.y === start.y);
    console.log('PASS: Tiled spawn/collision, A* MOVE_TO ticks, blocked target rejection, legacy MOVE disabled');
} finally {
    clearTimeout(timeout);
    socket.close();
}
