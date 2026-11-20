import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const moduleUrl = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext }
}).outputText).toString('base64');
const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const mobUrl = moduleUrl(read('../src/data/mob.ts'));
const { replaceMobSnapshot, parseDamage } = await import(mobUrl);
const imageUrl = moduleUrl('export const imageCache = { get: () => ({ complete: false }) };');
const viewUrl = moduleUrl(read('../src/features/combat/CombatView.ts').replace('../../render/ImageCache', imageUrl));
const { CombatView } = await import(viewUrl);
const controllerUrl = moduleUrl(read('../src/features/combat/CombatController.ts')
    .replace('../../data/mob', mobUrl).replace('./CombatView', viewUrl));
const { CombatController } = await import(controllerUrl);

const mob = (extra = {}) => ({ id: 'm-1', kind: 'slime', x: 4, y: 5, hp: 40, maxHp: 40,
    state: 'IDLE', spawnGeneration: 1, ...extra });

test('mob snapshots replace world state and preserve DEAD until the server removes it', () => {
    const store = new Map();
    replaceMobSnapshot(store, [mob()]);
    assert.equal(store.size, 1);
    replaceMobSnapshot(store, [mob({ hp: 0, state: 'DEAD' })]);
    assert.equal(store.get('m-1').hp, 0);
    assert.equal(store.get('m-1').state, 'DEAD');
    replaceMobSnapshot(store, [mob({ x: 8, spawnGeneration: 2 })]);
    assert.equal(store.get('m-1').spawnGeneration, 2);
    replaceMobSnapshot(store, []);
    assert.equal(store.size, 0);
});

test('malformed snapshots and damage cannot corrupt combat state', () => {
    const store = new Map([['m-1', mob()]]);
    for (const invalid of [null, {}, [mob({ hp: -1 })], [mob({ kind: '../secret' })], [mob({ x: 0.5 })]]) {
        replaceMobSnapshot(store, invalid);
        assert.equal(store.get('m-1').hp, 40);
    }
    assert.equal(parseDamage({ attackerId: 'p-1', targetId: 'm-1', amount: 15 }).amount, 15);
    for (const invalid of [null, {}, { attackerId: 'p-1', targetId: 'm-1', amount: -15 },
        { attackerId: 'p-1', targetId: 'm-1', amount: '15' }]) assert.equal(parseDamage(invalid), null);
});

test('DAMAGE creates effects without subtracting snapshot HP; dead mobs cannot be selected', () => {
    let pointer = { x: 4.5, y: 5.5 };
    const target = mob();
    const player = { id: 'p-1', x: 3, y: 5, hp: 100 };
    const renderer = { getWorldPointAtClientPosition: () => pointer,
        getRenderedPlayerPosition: () => undefined };
    const net = { mobs: new Map([['m-1', target]]), players: new Map([['p-1', player]]) };
    const view = new CombatView(renderer, net);
    assert.equal(view.pickMob(0, 0).id, 'm-1');
    view.addDamage({ attackerId: 'p-1', targetId: 'm-1', amount: 15 });
    assert.equal(target.hp, 40);
    assert.equal(player.hp, 100);
    target.hp = 0;
    target.state = 'DEAD';
    assert.equal(view.pickMob(0, 0), undefined);
    const ctx = { canvas: { width: 500, height: 500 } };
    view.getMobDrawables(ctx, { tileSize: 16 }, 0, 0, 1000);
    Object.assign(target, { hp: 40, state: 'IDLE', x: 9, spawnGeneration: 2 });
    view.getMobDrawables(ctx, { tileSize: 16 }, 0, 0, 1100);
    assert.equal(view.pickMob(0, 0), undefined);
    pointer = { x: 9.5, y: 5.5 };
    assert.equal(view.pickMob(0, 0).id, 'm-1');
});

test('clicking a mob sends ATTACK and consumes the click; ground movement is left alone', () => {
    const previousDocument = globalThis.document;
    const elements = new Map();
    globalThis.document = { getElementById: id => {
        if (!elements.has(id)) elements.set(id, { addEventListener() {}, removeEventListener() {} });
        return elements.get(id);
    }};
    let click, pointer = { x: 4.5, y: 5.5 }, cleared = 0, stopped = false;
    const attacks = [];
    const canvas = { addEventListener: (type, listener, capture) => {
        if (type === 'click' && capture) click = listener;
    }, removeEventListener() {} };
    const renderer = { getCanvas: () => canvas, setCombatView() {},
        getWorldPointAtClientPosition: () => pointer };
    const player = { id: 'p-1', x: 3, y: 5, hp: 100, state: 'IDLE' };
    const net = { myId: 'p-1', players: new Map([['p-1', player]]), mobs: new Map([['m-1', mob()]]),
        damageListeners: new Set(), resetListeners: new Set(),
        sendAttack: id => { attacks.push(id); return true; } };
    let controller;
    try {
        controller = new CombatController(renderer, net, () => {}, () => cleared++);
        const event = { clientX: 0, clientY: 0, preventDefault() {}, stopImmediatePropagation() { stopped = true; } };
        click(event);
        assert.deepEqual(attacks, ['m-1']);
        assert.equal(stopped, true);
        assert.equal(cleared, 1);
        pointer = { x: 0, y: 0 };
        stopped = false;
        click(event);
        assert.equal(stopped, false);
        assert.equal(attacks.length, 1);
        controller.stopAttack();
        assert.deepEqual(attacks, ['m-1', null]);
        player.hp = 0;
        player.state = 'DEAD';
        stopped = false;
        click(event);
        assert.equal(stopped, true);
        assert.equal(attacks.length, 2);
        net.resetListeners.forEach(listener => listener());
        assert.equal(controller.view.selectedId, null);
    } finally {
        controller?.destroy();
        globalThis.document = previousDocument;
    }
    assert.equal(net.damageListeners.size, 0);
    assert.equal(net.resetListeners.size, 0);
});
