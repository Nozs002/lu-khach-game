import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const moduleUrl = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
}).outputText).toString('base64');
const pathfinderUrl = moduleUrl(fs.readFileSync(new URL('../src/pathfinding/AStarPathfinder.ts', import.meta.url), 'utf8'));
const { AStarPathfinder } = await import(pathfinderUrl);
const controllerSource = fs.readFileSync(new URL('../src/input/MovementController.ts', import.meta.url), 'utf8')
    .replace('../pathfinding/AStarPathfinder', pathfinderUrl);
const { MovementController } = await import(moduleUrl(controllerSource));

test('A* takes the shortest detour and rejects blocked/unreachable targets', () => {
    const finder = new AStarPathfinder({ width: 3, height: 3, tiles: [[0, 1, 0], [0, 1, 0], [0, 0, 0]] });
    assert.equal(finder.findPath({ x: 0, y: 0 }, { x: 2, y: 0 }).length, 6);
    assert.equal(finder.findPath({ x: 0, y: 0 }, { x: 1, y: 0 }), null);
    assert.equal(finder.findPath({ x: 0, y: 0 }, { x: -1, y: 0 }), null);
    const isolated = new AStarPathfinder({ width: 3, height: 1, tiles: [[0, 1, 0]] });
    assert.equal(isolated.findPath({ x: 0, y: 0 }, { x: 2, y: 0 }), null);
});

test('click sends tile destination, trims preview, and current-cell click cancels path', () => {
    let click, goal = { x: 2, y: 0 };
    const sent = [];
    const me = { id: 'me', x: 0, y: 0 };
    const renderer = {
        getCanvas: () => ({ addEventListener: (_name, handler) => { click = handler; } }),
        getTileAtClientPosition: () => goal,
    };
    const net = { myId: 'me', players: new Map([['me', me]]), sendMoveTo: (x, y) => { sent.push({ x, y }); return true; } };
    const controller = new MovementController(renderer, net);
    controller.setMap({ width: 3, height: 2, tileSize: 16, safeZone: { x: 0, y: 0, width: 1, height: 1 }, tiles: [[0, 0, 0], [1, 1, 1]] });
    click({ clientX: 10, clientY: 20 });
    assert.deepEqual(sent, [{ x: 2, y: 0 }]);
    assert.equal(controller.getPreviewPath().length, 2);
    me.x = 1;
    assert.deepEqual(controller.getPreviewPath(), [{ x: 2, y: 0 }]);
    goal = { x: 1, y: 0 };
    click({ clientX: 10, clientY: 20 });
    assert.deepEqual(sent.at(-1), goal);
    assert.deepEqual(controller.getPreviewPath(), []);
    goal = { x: 0, y: 1 };
    click({ clientX: 10, clientY: 20 });
    assert.equal(sent.length, 2);
});
