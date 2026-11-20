import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const url = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
}).outputText).toString('base64');
const worldUrl = url(`export const WORLD = {npcs:[{npcId:'elder_01', x:10, y:10, characterId:'elder', displayName:'Trưởng làng', dialogueId:'intro', interactionRadius:2}]};`);
const manifestUrl = url(`export default {npcTypes:{elder:{portrait:'npcs/elder-face.png'}}};`);
const dialoguesUrl = url(`export default {dialogues:{intro:{npcId:'elder_01', lines:['Câu đầu tiên.', 'Câu thứ hai.']}}};`);
const source = fs.readFileSync(new URL('../src/input/NpcInteractionController.ts', import.meta.url), 'utf8')
    .replace('../data/tiledWorld', worldUrl)
    .replace('../../public/assets/manifest.json', manifestUrl)
    .replace('../../../common/npcs/dialogues.json', dialoguesUrl);
const { NpcInteractionController } = await import(url(source));

class Element {
    listeners = [];
    textContent = '';
    addEventListener(type, handler, capture = false) { this.listeners.push({ type, handler, capture }); }
    removeEventListener(type, handler) { this.listeners = this.listeners.filter(l => l.type !== type || l.handler !== handler); }
    focus() {}
    click() { for (const l of this.listeners.filter(l => l.type === 'click')) l.handler({}); }
}
function fixture() {
    const canvas = new Element();
    const fields = Object.fromEntries(['name', 'portrait', 'line', 'progress', 'next', 'dismiss'].map(k => [k, new Element()]));
    const dialog = new Element();
    dialog.open = false;
    dialog.querySelector = selector => fields[selector.slice(10, -1)];
    dialog.showModal = () => { dialog.open = true; };
    dialog.close = () => { dialog.open = false; for (const l of dialog.listeners.filter(l => l.type === 'close')) l.handler(); };
    const notices = [], moves = [];
    const me = { x:9, y:10 };
    const net = {myId:'me', map:{}, players:new Map([['me', me]]), sendMoveTo:(x,y) => { moves.push([x,y]); return true; }};
    let tile = {x:10,y:10}, movementClicks = 0, starts = 0;
    const renderer = {getCanvas:() => canvas, getTileAtClientPosition:() => tile};
    canvas.addEventListener('click', () => movementClicks++);
    const controller = new NpcInteractionController(renderer, net, dialog, s => notices.push(s), () => starts++);
    function click() {
        let stopped = false;
        const event = {clientX:0, clientY:0, preventDefault() {}, stopImmediatePropagation() { stopped = true; }};
        for (const l of [...canvas.listeners].filter(l => l.type === 'click').sort((a,b) => Number(b.capture)-Number(a.capture))) {
            if (stopped) break;
            l.handler(event);
        }
    }
    return {controller, canvas, fields, dialog, notices, moves, me, net, click,
        setTile:t => { tile = t; }, get movementClicks() {return movementClicks;}, get starts() {return starts;}};
}

test('click NPC opens first line, next advances and the final button closes without player replies', () => {
    const f = fixture();
    f.click();
    assert.equal(f.controller.isOpen, true);
    assert.equal(f.fields.name.textContent, 'Trưởng làng');
    assert.equal(f.fields.portrait.src, '/assets/npcs/elder-face.png');
    assert.equal(f.fields.line.textContent, 'Câu đầu tiên.');
    assert.equal(f.fields.progress.textContent, '1 / 2');
    assert.equal(f.fields.next.textContent, 'Chuyển');
    assert.deepEqual(f.moves, [[9,10]]);
    assert.equal(f.movementClicks, 0);
    assert.equal(f.starts, 1);
    f.fields.next.click();
    assert.equal(f.fields.line.textContent, 'Câu thứ hai.');
    assert.equal(f.fields.next.textContent, 'Kết thúc');
    f.fields.next.click();
    assert.equal(f.controller.isOpen, false);
    f.click();
    assert.equal(f.fields.line.textContent, 'Câu đầu tiên.');
    f.controller.destroy();
});

test('far NPC clicks do not become movement; ordinary ground clicks still move', () => {
    const f = fixture();
    f.me.x = 20;
    f.click();
    assert.equal(f.controller.isOpen, false);
    assert.equal(f.movementClicks, 0);
    assert.match(f.notices[0], /đến gần/);
    assert.deepEqual(f.moves, []);
    f.setTile({x:11,y:11});
    f.click();
    assert.equal(f.movementClicks, 1);
    f.controller.destroy();
});

test('dialogue blocks canvas movement while open and dismiss can end early', () => {
    const f = fixture();
    f.click();
    f.setTile({x:11,y:11});
    f.click();
    assert.equal(f.movementClicks, 0);
    f.fields.dismiss.click();
    assert.equal(f.controller.isOpen, false);
    f.click();
    assert.equal(f.movementClicks, 1);
    f.controller.destroy();
});

test('disconnected players cannot start a conversation and destruction removes handlers', () => {
    const f = fixture();
    f.net.sendMoveTo = () => false;
    f.click();
    assert.equal(f.controller.isOpen, false);
    assert.match(f.notices[0], /kết nối/);
    f.controller.destroy();
    f.click();
    assert.equal(f.movementClicks, 1);
    assert.equal(f.fields.next.listeners.length, 0);
});
