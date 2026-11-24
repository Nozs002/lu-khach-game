import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const moduleUrl = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext }
}).outputText).toString('base64');
const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const { ITEMS, replaceDropSnapshot, isWeaponItemId } = await import(moduleUrl(read('../src/data/items.ts')));

test('drop snapshots accept weapons, reject health-potion or unknown assets, and keep state safe', () => {
    const store = new Map();
    const drops = [
        { id: 'weapon-1', itemId: 'riu', x: 8, y: 9 },
        { id: 'weapon-2', itemId: 'daikiem', x: 10, y: 12 }
    ];
    replaceDropSnapshot(store, drops);
    assert.equal(store.size, 2);

    // Không nhận health-potion hoặc path lạ vào store vũ khí
    replaceDropSnapshot(store, [{ id: 'bad-1', itemId: 'health-potion', x: 8, y: 9 }]);
    assert.equal(store.size, 2);
    replaceDropSnapshot(store, [{ id: 'bad-2', itemId: 'HEALTH_POTION', x: 8, y: 9 }]);
    assert.equal(store.size, 2);
    replaceDropSnapshot(store, [{ id: 'bad-3', itemId: '../unknown', x: 8, y: 9 }]);
    assert.equal(store.size, 2);

    replaceDropSnapshot(store, []);
    assert.equal(store.size, 0);

    assert.equal(isWeaponItemId('HEALTH_POTION'), false);
    assert.equal(isWeaponItemId('riu'), true);
    assert.ok(ITEMS.some(item => item.id === 'HEALTH_POTION'));
    for (const item of ITEMS) {
        assert.ok(fs.existsSync(new URL('../public' + item.icon, import.meta.url)), `Missing icon for ${item.id}`);
    }
});

test('CombatView draws weapon drops using item sprite assets', async () => {
    const imageUrl = moduleUrl('export const imageCache = { get: () => ({ complete: true, naturalWidth: 16, naturalHeight: 16 }) };');
    const { CombatView } = await import(moduleUrl(read('../src/features/combat/CombatView.ts')
        .replace('../../render/ImageCache', imageUrl)));
    const drops = new Map([['w', { id: 'w', itemId: 'riu', x: 8, y: 9 }]]);
    const draws = [];
    const ctx = {
        canvas: { width: 500, height: 500 },
        save() {},
        restore() {},
        beginPath() {},
        ellipse() {},
        fill() {},
        fillRect() {},
        drawImage(...args) { draws.push(args); }
    };
    new CombatView({}, { drops }).drawDrops(ctx, { tileSize: 24 }, 0, 0);
    assert.equal(draws.length, 1);
});
