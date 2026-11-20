import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../src/data/PlayerIdentity.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
}).outputText;
let instance = 0;
const loadIdentity = () => import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64') + '#' + instance++);
const key = 'lu-khach:player-id:v1';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function memoryStorage() {
    const values = new Map();
    globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
    return values;
}

test('a new profile creates a UUID and reuses it across reloads', async () => {
    const values = memoryStorage();
    const first = await loadIdentity();
    const id = first.getOrCreatePlayerId();
    assert.match(id, uuid);
    assert.equal(values.get(key), id);
    assert.equal(first.getOrCreatePlayerId(), id);
    const reloaded = await loadIdentity();
    assert.equal(reloaded.getOrCreatePlayerId(), id);
});

test('separate profiles get different IDs; a display name is never an identity', async () => {
    memoryStorage();
    const first = (await loadIdentity()).getOrCreatePlayerId();
    const values = memoryStorage();
    const second = (await loadIdentity()).getOrCreatePlayerId();
    assert.notEqual(first, second);
    values.set(key, 'Lan');
    const repaired = (await loadIdentity()).getOrCreatePlayerId();
    assert.match(repaired, uuid);
    assert.notEqual(repaired, 'Lan');
});

test('blocked storage retains a stable ID for the current session', async () => {
    globalThis.localStorage = { getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('blocked'); } };
    const identity = await loadIdentity();
    const id = identity.getOrCreatePlayerId();
    assert.match(id, uuid);
    assert.equal(identity.getOrCreatePlayerId(), id);
});

test('read-only storage can use an existing ID or create a temporary one', async () => {
    const saved = '7202abb4-9a3b-4cef-8e13-00f544b1d44b';
    globalThis.localStorage = { getItem: () => saved, setItem: () => { throw Error('read-only'); } };
    assert.equal((await loadIdentity()).getOrCreatePlayerId(), saved);
    globalThis.localStorage = { getItem: () => null, setItem: () => { throw Error('full'); } };
    const identity = await loadIdentity();
    const temporary = identity.getOrCreatePlayerId();
    assert.match(temporary, uuid);
    assert.equal(identity.getOrCreatePlayerId(), temporary);
});
