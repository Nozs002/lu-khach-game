import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source = fs.readFileSync(new URL('../src/ui/PlayerStats.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
const { updatePlayerStats } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
const elements = new Map();
for (const id of ['player-hp', 'player-hp-bar', 'player-hp-fill', 'player-damage', 'player-armor']) {
    elements.set(id, { textContent: '', style: {}, attributes: {}, classList: { toggle() {} },
        setAttribute(name, value) { this.attributes[name] = value; } });
}
globalThis.document = { getElementById: id => elements.get(id) };

test('server stats populate HP, damage, armor and update the health bar', () => {
    updatePlayerStats({ hp: 80, maxHp: 160, damage: 18, armor: 12 });
    assert.equal(elements.get('player-hp').textContent, '80 / 160');
    assert.equal(elements.get('player-hp-fill').style.width, '50%');
    assert.equal(elements.get('player-damage').textContent, '18');
    assert.equal(elements.get('player-armor').textContent, '12');
    assert.equal(elements.get('player-hp-bar').attributes['aria-valuenow'], '80');
    updatePlayerStats({ hp: 0, maxHp: 160, damage: 18, armor: 12 });
    assert.equal(elements.get('player-hp-fill').style.width, '0%');
});

test('missing stats reset stale values; malformed HP never produces an invalid bar', () => {
    updatePlayerStats(undefined);
    assert.equal(elements.get('player-hp').textContent, '— / —');
    assert.equal(elements.get('player-damage').textContent, '—');
    assert.equal(elements.get('player-armor').textContent, '—');
    updatePlayerStats({ hp: 100, maxHp: 0, damage: NaN, armor: Infinity });
    assert.equal(elements.get('player-hp-fill').style.width, '0%');
    updatePlayerStats({ hp: 200, maxHp: 100, damage: 0, armor: 0 });
    assert.equal(elements.get('player-hp-fill').style.width, '100%');
    assert.equal(elements.get('player-armor').textContent, '0');
});
