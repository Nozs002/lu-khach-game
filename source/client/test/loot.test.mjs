import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const moduleUrl = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext }
}).outputText).toString('base64');
const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const { ITEMS, replaceDropSnapshot } = await import(moduleUrl(read('../src/data/items.ts')));

test('drop snapshots include both items and reject unknown assets without corrupting state', () => {
    const store = new Map();
    const drops = [{ id: 'health', itemId: 'health-potion', x: 8, y: 9 },
        { id: 'weapon', itemId: 'riu', x: 8, y: 9 }];
    replaceDropSnapshot(store, drops);
    assert.equal(store.size, 2);
    replaceDropSnapshot(store, [{ ...drops[0], itemId: '../unknown' }]);
    assert.equal(store.size, 2);
    replaceDropSnapshot(store, []);
    assert.equal(store.size, 0);
    for (const item of ITEMS) assert.ok(fs.existsSync(new URL('../public' + item.icon, import.meta.url)));
});

test('health and weapon draw separately on the same tile using their assets', async () => {
    const imageUrl = moduleUrl('export const imageCache = { get: () => ({ complete: true, naturalWidth: 16, naturalHeight: 16 }) };');
    const { CombatView } = await import(moduleUrl(read('../src/features/combat/CombatView.ts')
        .replace('../../render/ImageCache', imageUrl)));
    const drops = new Map([['h', { itemId: 'health-potion', x: 8, y: 9 }],
        ['w', { itemId: 'riu', x: 8, y: 9 }]]);
    const draws = [];
    const ctx = { canvas: { width: 500, height: 500 }, save() {}, restore() {}, beginPath() {},
        ellipse() {}, fill() {}, drawImage(...args) { draws.push(args); } };
    new CombatView({}, { drops }).drawDrops(ctx, { tileSize: 16 }, 0, 0);
    assert.equal(draws.length, 2);
    assert.notEqual(draws[0][1], draws[1][1]);
});
