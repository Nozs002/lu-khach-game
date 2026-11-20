import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const moduleUrl = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
}).outputText).toString('base64');
const explorationUrl = moduleUrl(fs.readFileSync(new URL('../src/data/ExplorationMap.ts', import.meta.url), 'utf8'));
const { ExplorationMap, explorationStorageKey } = await import(explorationUrl);

test('discovery reveals the visible rectangle and retains previously seen regions', () => {
    const map = new ExplorationMap(80, 80);
    assert.equal(map.percentage, 0);
    assert.equal(map.revealViewport(10, 10, 32, 24), true);
    assert.equal(map.isExplored(10, 10), true);
    assert.equal(map.isExplored(41, 33), true);
    assert.equal(map.isExplored(42, 33), false);
    assert.equal(map.isExplored(41, 34), false);
    assert.equal(map.revealViewport(10, 10, 32, 24), false);
    map.revealViewport(60, 60, 10, 10);
    assert.equal(map.isExplored(10, 10), true);
    assert.equal(map.isExplored(50, 50), false);
});

test('viewport discovery clips map edges and includes partially visible tiles', () => {
    const map = new ExplorationMap(3, 3);
    assert.equal(map.revealViewport(NaN, 0, 2, 2), false);
    assert.equal(map.revealViewport(0, 0, 0, 2), false);
    assert.equal(map.revealViewport(0, 0, -1, 2), false);
    assert.equal(map.revealViewport(3, 0, 2, 2), false);
    map.revealViewport(-0.5, -0.5, 2, 2);
    assert.equal(map.serialize(), '110110000');
    map.revealViewport(2.5, 2.5, 10, 10);
    assert.equal(map.isExplored(2, 2), true);
    assert.equal(map.isExplored(3, 0), false);
});

test('saved discoveries round trip; corrupt and wrong-size saves are ignored', () => {
    const map = new ExplorationMap(10, 10);
    map.revealViewport(0, 0, 3, 3);
    const restored = new ExplorationMap(10, 10, map.serialize());
    assert.equal(restored.serialize(), map.serialize());
    assert.equal(restored.percentage, map.percentage);
    assert.equal(new ExplorationMap(10, 10, '1').percentage, 0);
    assert.equal(new ExplorationMap(10, 10, 'x'.repeat(100)).percentage, 0);
});

test('saved exploration is isolated by player and world layout', () => {
    const map = { id: 'world', width: 2, height: 1, tiles: [[0, 0]] };
    const key = explorationStorageKey(map, 'Lan');
    assert.notEqual(key, explorationStorageKey(map, 'Nam'));
    assert.notEqual(key, explorationStorageKey({ ...map, tiles: [[0, 1]] }, 'Lan'));
    assert.equal(key, explorationStorageKey({ ...map }, 'Lan'));
});

test('minimap discovers displayed camera regions without player movement and restores after reload', async () => {
    const noop = () => {};
    const outlines = [];
    const context = new Proxy({}, { get: (_target, key) => key === 'strokeRect'
        ? (...args) => outlines.push(args) : key === 'imageSmoothingEnabled' ? false : noop });
    const createCanvas = () => ({ width: 0, height: 0, getContext: () => context });
    const saved = new Map();
    globalThis.document = { createElement: createCanvas };
    globalThis.window = { addEventListener: noop, removeEventListener: noop };
    globalThis.localStorage = { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) };
    const worldUrl = moduleUrl('export const WORLD = { tilesets: [] };');
    const imageUrl = moduleUrl('export const imageCache = {};');
    const drawUrl = moduleUrl('export const drawWorld = () => {};');
    const source = fs.readFileSync(new URL('../src/render/MinimapRenderer.ts', import.meta.url), 'utf8')
        .replace('../data/ExplorationMap', explorationUrl)
        .replace('../data/tiledWorld', worldUrl)
        .replace('./ImageCache', imageUrl)
        .replace('./TiledWorldRenderer', drawUrl);
    const { MinimapRenderer } = await import(moduleUrl(source));
    const map = { id: 'world', width: 40, height: 40, tileSize: 16, tiles: Array.from({ length: 40 }, () => Array(40).fill(0)) };
    const status = {};
    const canvas = createCanvas();
    const renderer = new MinimapRenderer(canvas, status);
    renderer.setMap(map, 'Lan');
    renderer.render({ x: 2, y: 2 }, { x: 0, y: 0, width: 10, height: 10 }, 0);
    renderer.render({ x: 2, y: 2 }, { x: 30, y: 30, width: 10, height: 10 }, 200);
    assert.equal(canvas.width, 60);
    assert.equal(canvas.height, 60);
    assert.deepEqual(outlines.at(-1), [20, 20, 20, 20]);
    renderer.setExpanded(true);
    renderer.render({ x: 2, y: 2 }, { x: 30, y: 30, width: 10, height: 10 }, 300);
    assert.equal(canvas.width, 80);
    assert.equal(canvas.height, 80);
    assert.deepEqual(outlines.at(-1), [60, 60, 20, 20]);
    renderer.setExpanded(false);
    renderer.render({ x: 2, y: 2 }, { x: 0, y: 0, width: 10, height: 10 }, 400);
    assert.equal(canvas.width, 60);
    assert.deepEqual(outlines.at(-1), [20, 20, 20, 20]);
    renderer.destroy();
    const first = new ExplorationMap(40, 40, saved.get(explorationStorageKey(map, 'Lan')));
    assert.equal(first.isExplored(2, 2), true);
    assert.equal(first.isExplored(30, 30), true);
    assert.equal(first.isExplored(9, 9), true);
    assert.equal(first.isExplored(10, 9), false);
    assert.equal(first.isExplored(20, 20), false);
    const next = new MinimapRenderer(createCanvas(), status);
    next.setMap(map, 'Lan');
    next.render({ x: 30, y: 30 }, { x: 20, y: 20, width: 5, height: 5 }, 0);
    next.destroy();
    const restored = new ExplorationMap(40, 40, saved.get(explorationStorageKey(map, 'Lan')));
    assert.equal(restored.isExplored(2, 2), true);
    assert.equal(restored.isExplored(30, 30), true);
    assert.equal(restored.isExplored(20, 20), true);
    globalThis.localStorage = { getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('full'); } };
    const unavailable = new MinimapRenderer(createCanvas(), status);
    assert.doesNotThrow(() => {
        unavailable.setMap(map, 'Lan');
        unavailable.render({ x: 2, y: 2 }, { x: 0, y: 0, width: 10, height: 10 }, 0);
        unavailable.destroy();
    });
});
