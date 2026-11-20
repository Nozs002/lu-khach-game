import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const moduleUrl = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
}).outputText).toString('base64');
const world = JSON.parse(fs.readFileSync(new URL('../src/data/world.generated.json', import.meta.url), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(new URL('../public/assets/manifest.json', import.meta.url), 'utf8'));
const worldUrl = moduleUrl(`export const WORLD = ${JSON.stringify({ ...world, layers: [], tilesets: [] })}; export const WORLD_VIEWS = [];`);
const manifestUrl = moduleUrl(`export default ${JSON.stringify(manifest)};`);
const imagesUrl = moduleUrl(`export const imageCache = { ready: true, get(source) { return { source, complete: this.ready, naturalWidth: this.ready ? 64 : 0 }; } };`);
const { imageCache } = await import(imagesUrl);
const npcSource = fs.readFileSync(new URL('../src/render/NpcRenderer.ts', import.meta.url), 'utf8')
    .replace('../data/tiledWorld', worldUrl)
    .replace('../../public/assets/manifest.json', manifestUrl)
    .replace('./ImageCache', imagesUrl);
const npcUrl = moduleUrl(npcSource);
const { drawNpcs } = await import(npcUrl);

function drawingContext() {
    const calls = [];
    const ctx = new Proxy({}, { get: (_target, key) => (...args) => calls.push({ method: key, args }) });
    return { ctx, calls };
}

test('NPCs around spawn use cropped full-body sprites, camera offsets and names', () => {
    const { ctx, calls } = drawingContext();
    drawNpcs(ctx, 600, 3544, 512, 384, 16);
    const sprites = calls.filter(c => c.method === 'drawImage');
    assert.equal(sprites.length, 2);
    assert.equal(sprites[0].args[0].source, '/assets/npcs/village_elder-idle.png');
    assert.deepEqual(sprites[0].args.slice(1), [0, 0, 16, 16, 184, 168, 16, 16]);
    assert.deepEqual(calls.filter(c => c.method === 'fillText').map(c => c.args[0]), ['Trưởng làng', 'Chủ trọ']);
    const full = drawingContext();
    drawNpcs(full.ctx, 0, 0, world.width * 16, world.height * 16, 16);
    assert.equal(full.calls.filter(c => c.method === 'drawImage').length, world.npcs.length);
});

test('NPC names and fallback markers remain visible while images load', () => {
    imageCache.ready = false;
    try {
        const { ctx, calls } = drawingContext();
        drawNpcs(ctx, 600, 3544, 512, 384, 16);
        assert.equal(calls.filter(c => c.method === 'drawImage').length, 0);
        assert.equal(calls.filter(c => c.method === 'fillRect').length, 2);
        assert.equal(calls.filter(c => c.method === 'fillText').length, 2);
    } finally { imageCache.ready = true; }
});

test('main game renderer draws NPCs without waiting for an NPC network message', async () => {
    const drawUrl = moduleUrl('export const drawWorld = () => {};');
    const charactersUrl = moduleUrl('export const getCharacterWalkSheet = () => ({source:"player.png", cols:4, rows:4});');
    const itemsUrl = moduleUrl('export const getItemDefinition = () => undefined;');
    const source = fs.readFileSync(new URL('../src/render/CanvasRenderer.ts', import.meta.url), 'utf8')
        .replace('../data/tiledWorld', worldUrl)
        .replace('./TiledWorldRenderer', drawUrl)
        .replace('../data/characters', charactersUrl)
        .replace('../data/items', itemsUrl)
        .replace('./ImageCache', imagesUrl)
        .replace('./NpcRenderer', npcUrl);
    const { CanvasRenderer } = await import(moduleUrl(source));
    const { ctx, calls } = drawingContext();
    const renderer = new CanvasRenderer({ width: 0, height: 0, getContext: () => ctx });
    renderer.setGridVisible(false);
    renderer.render(new Map([['me', {id:'me', name:'Test', characterId:'knight', x:53, y:233}]]), 'me', [],
        { width:world.width, height:world.height, tileSize:16 }, 0);
    const npcNames = calls.filter(c => c.method === 'fillText').map(c => c.args[0]);
    assert.ok(npcNames.includes('Trưởng làng'));
    assert.ok(npcNames.includes('Chủ trọ'));
});
