import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GridMap } from '../movement-build/features/movement/GridMap.js';
import { findPath } from '../movement-build/features/movement/AStar.js';
import { EntityInterpolator } from '../movement-build/features/movement/EntityInterpolator.js';
import { pointerTile, ClickMoveController } from '../movement-build/features/movement/ClickMoveController.js';
import { isTile } from '../movement-build/features/movement/types.js';
const load = name => JSON.parse(readFileSync(new URL(`../../common/${name}`, import.meta.url), 'utf8'));
const raw = load('maps/world-01.json'), map = new GridMap(raw);
const maps = new Map([['world-01', map], ['world-02', new GridMap(load('maps/world-02.json'))], ['world-03', new GridMap(load('maps/world-03.json'))]]);
GridMap.validateWorld(maps);
for (const world of maps.values()) {
  assert.equal(world.data.width, 52);
  assert.equal(world.data.height, 24);
  assert.equal(world.data.visuals.terrain.length, 52 * 24);
  for (const exit of world.data.exits) for (const cell of exit.cells) {
    assert.notEqual(findPath(world, world.data.spawn, cell), null, `${world.data.id}: reachable ${exit.side} gate`);
  }
}
assert.equal(findPath(maps.get('world-02'), { x: 3, y: 3 }, { x: 25, y: 12 }), null, 'lake island is separated by water');
for (const [id, start, goal] of [
  ['world-01', { x: 11, y: 8 }, { x: 17, y: 8 }],
  ['world-03', { x: 8, y: 6 }, { x: 8, y: 11 }],
  ['world-03', { x: 26, y: 11 }, { x: 26, y: 15 }],
  ['world-03', { x: 39, y: 11 }, { x: 39, y: 17 }],
]) assert.notEqual(findPath(maps.get(id), start, goal), null, `${id}: bridge has connected shores`);
const sealedGate = structuredClone(raw);
sealedGate.collisions = [...new Set([...sealedGate.collisions, 11 * 52 + 1, 12 * 52 + 1])];
assert.throws(() => new GridMap(sealedGate), /UNREACHABLE_EXIT/, 'sealed gate is rejected');
for (const payload of load('fixtures/movement/invalid-commands.json')) assert.ok(!isTile(payload) || !map.inside(payload));
for (const fixture of load('fixtures/movement/paths.json')) assert.deepEqual(findPath(map, fixture.start, fixture.goal), fixture.path, fixture.name);
for (const fixture of load('fixtures/movement/invalid-maps.json')) assert.throws(() => new GridMap({ ...raw, ...fixture.patch }), undefined, fixture.name);
assert.throws(() => GridMap.validateWorld(new Map([['world-01', map]])));
const badRect = structuredClone(raw); badRect.visuals.ground[0].rect = [352, 0, 16, 16];
assert.throws(() => new GridMap(badRect), /OUT_OF_BOUNDS/);
const badLayer = structuredClone(raw); badLayer.visuals.terrain = [0];
assert.throws(() => new GridMap(badLayer), /INVALID_MAP_VISUALS/);
raw.collisions.length = 0;
assert.equal(map.walkable({ x: 0, y: 0 }), false, 'map detached from mutable caller data');
assert.throws(() => { map.data.collisions.push(5); });
assert.equal(map.walkable({ x: NaN, y: 0 }), false);
assert.equal(map.walkable({ x: 4.5, y: 3 }), false);
const canvas = { width: 1248, height: 576, getBoundingClientRect: () => ({ left: 10, top: 20, right: 634, bottom: 308, width: 624, height: 288 }) };
assert.deepEqual(pointerTile(canvas, 28, 50), { x: 1, y: 2 });
assert.equal(pointerTile(canvas, 634, 50), null);
assert.equal(pointerTile(canvas, 5, 50), null);
assert.deepEqual(pointerTile(canvas, 616, 50), { x: 50, y: 2 }, 'right half uses 52 columns');
assert.deepEqual(pointerTile(canvas, 633, 307), { x: 51, y: 23 }, 'last cell');
assert.equal(map.inside({ x: 52, y: 3 }), false);
let listener, sent = [];
canvas.addEventListener = (_name, fn) => { listener = fn; };
canvas.removeEventListener = (_name, fn) => assert.equal(fn, listener);
const controller = new ClickMoveController(canvas, () => map, () => ({ x: 3, y: 3 }), p => sent.push(p), () => {});
for (let i = 0; i < 10000; i++) listener({ button: 0, clientX: 10 + (4 + i % 3) * 12 + 1, clientY: 20 + 3 * 12 + 1 });
controller.flush(0); controller.flush(1);
assert.deepEqual(sent, [{ x: 4, y: 3 }], 'coalesces clicks into one command');
listener({ button: 0, clientX: 71, clientY: 57 }); controller.reset(); controller.flush(200);
assert.equal(sent.length, 1, 'map switch clears pending input'); controller.dispose();
const interpolation = new EntityInterpolator();
const snap = (tick, x, y = 3, mapId = 'world-01') => ({ tick, entities: [{ id: 'p', x, y, mapId }] });
const first = snap(1, 3); interpolation.push(first, 0); interpolation.push(snap(2, 4), 100);
assert.equal(interpolation.sample(150)[0].x, 3.5);
assert.equal(first.entities[0].x, 3, 'never mutates authoritative snapshot');
interpolation.push(snap(1, 20), 150); assert.equal(interpolation.sample(150)[0].x, 3.5, 'stale snapshot ignored');
interpolation.push(snap(3, 4, 4), 200);
assert.deepEqual({ x: interpolation.sample(250)[0].x, y: interpolation.sample(250)[0].y }, { x: 4, y: 3.5 }, 'does not cut corner');
interpolation.push(snap(4, 30, 11, 'world-02'), 300);
assert.equal(interpolation.sample(350)[0].mapId, 'world-02', 'map transition snaps rendering');
interpolation.clear(); assert.deepEqual(interpolation.sample(9999), []);
console.log('TS: shared paths, invalid maps, CSS scale, click coalescing, interpolation passed');
