import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const moduleUrl = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
}).outputText).toString('base64');

const pathfinderUrl = moduleUrl(fs.readFileSync(new URL('../src/pathfinding/AStarPathfinder.ts', import.meta.url), 'utf8'));
const controllerSource = fs.readFileSync(new URL('../src/input/MovementController.ts', import.meta.url), 'utf8')
    .replace('../pathfinding/AStarPathfinder', pathfinderUrl);
const { MovementController } = await import(moduleUrl(controllerSource));

test('MovementController blocks clicks when player is DEAD and supports tile click interceptor for LOOT', () => {
    let click;
    let goal = { x: 1, y: 0 };
    const sent = [];
    const intercepted = [];
    const me = { id: 'me', x: 0, y: 0, hp: 100, maxHp: 100, state: 'IDLE' };
    const renderer = {
        getCanvas: () => ({ addEventListener: (_name, handler) => { click = handler; } }),
        getTileAtClientPosition: () => goal,
    };
    const net = {
        myId: 'me',
        players: new Map([['me', me]]),
        sendMoveTo: (x, y) => { sent.push({ x, y }); return true; },
    };

    const controller = new MovementController(renderer, net);
    controller.setMap({ width: 3, height: 2, tileSize: 16, safeZone: { x: 0, y: 0, width: 1, height: 1 }, tiles: [[0, 0, 0], [0, 0, 0]] });
    controller.setTileClickInterceptor(tile => {
        if (tile.x === 1 && tile.y === 0) {
            intercepted.push(tile);
            return true;
        }
        return false;
    });

    // Click lên ô có bình máu (1,0) -> bị chặn để xử lý LOOT, không gửi MOVE_TO
    click({ clientX: 10, clientY: 10 });
    assert.deepEqual(intercepted, [{ x: 1, y: 0 }]);
    assert.equal(sent.length, 0);

    // Click lên ô trống (2,0) -> gửi MOVE_TO bình thường
    goal = { x: 2, y: 0 };
    click({ clientX: 20, clientY: 10 });
    assert.deepEqual(sent, [{ x: 2, y: 0 }]);

    // Khi nhân vật DEAD -> chặn toàn bộ di chuyển và xóa previewPath
    me.state = 'DEAD';
    me.hp = 0;
    goal = { x: 0, y: 1 };
    click({ clientX: 10, clientY: 20 });
    assert.equal(sent.length, 1);
    assert.deepEqual(controller.getPreviewPath(), []);
});
