import { LootRespawnFeature } from './features/loot-respawn/LootRespawnFeature';
import { findPath } from './features/movement/AStar';
import { GridMap } from './features/movement/GridMap';
import { loadTileAtlas } from './features/movement/TileAtlas';
import { Tile } from './features/movement/types';
import { WebSocketClient } from './network/WebSocketClient';
import { CanvasRenderer } from './render/CanvasRenderer';
import { ItemData, MobData } from './types/protocol';

const CHARACTERS = [
    {
        id: 'knight',
        name: 'Hiệp sĩ',
        desc: 'Hiệp sĩ sở hữu lượng máu (HP) và phòng thủ rất cao, cùng với mức sát thương cận chiến ổn định.'
    },
    {
        id: 'hunter',
        name: 'Thợ săn',
        desc: 'Thợ săn sở hữu tầm nhìn rộng và khả năng di chuyển linh hoạt, sát thương nhanh nhạy.'
    },
    {
        id: 'fighter',
        name: 'Chiến binh',
        desc: 'Chiến binh sở hữu sức mạnh tấn công cao và khả năng chịu đựng bền bỉ trong giao tranh.'
    },
    {
        id: 'lion',
        name: 'Sư tử',
        desc: 'Sư tử dũng mãnh với khả năng càn lướt và cận chiến áp đảo.'
    }
];

let selectedAvatarId = CHARACTERS[0].id;

function renderCharacterSelection() {
    const listContainer = document.getElementById('character-list');
    const descBox = document.getElementById('character-desc');
    if (!listContainer || !descBox) return;
    listContainer.innerHTML = '';

    CHARACTERS.forEach((char) => {
        const charCard = document.createElement('div');
        charCard.className = `char-card ${char.id === selectedAvatarId ? 'selected' : ''}`;
        charCard.innerHTML = `
            <img src="/assets/characters/${char.id}.png" alt="${char.name}" onerror="this.onerror=null; this.src='/assets/characters/player.png';">
            <h4>${char.name}</h4>
        `;

        charCard.addEventListener('click', () => {
            selectedAvatarId = char.id;
            descBox.innerText = char.desc;
            renderCharacterSelection();
        });

        listContainer.appendChild(charCard);
    });

    const selectedChar = CHARACTERS.find((c) => c.id === selectedAvatarId);
    if (selectedChar) descBox.innerText = selectedChar.desc;
}
renderCharacterSelection();

// =========================================================================
// KHỞI TẠO HỆ THỐNG TỔNG HỢP (MAPS, WEBSOCKET, COMBAT, LOOT, CHAT, RESPAWN)
// =========================================================================
const maps = new Map<string, GridMap>();
const net = new WebSocketClient();
const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const renderer = new CanvasRenderer(canvas);

function appendSystemLog(msg: string) {
    const logDiv = document.getElementById('systemLog');
    if (!logDiv) return;
    const row = document.createElement('div');
    row.textContent = msg;
    logDiv.appendChild(row);
    logDiv.scrollTop = logDiv.scrollHeight;
}

const lootRespawnFeature = new LootRespawnFeature(net, renderer, appendSystemLog);

const keys: { [key: string]: boolean } = {};
let lastMoveSentAt = 0;
let isGameLoopRunning = false;
let clientPathPreview: Tile[] = [];
let clientTargetTile: Tile | null = null;

window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
});
window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

document.getElementById('joinBtn')?.addEventListener('click', () => connectGame());
document.getElementById('playerName')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') connectGame();
});

document.getElementById('leaveBtn')?.addEventListener('click', () => {
    net.cleanup();
    lootRespawnFeature.cancelPendingLoot();
    clientPathPreview = [];
    clientTargetTile = null;
    document.getElementById('gameUI')!.style.display = 'none';
    document.getElementById('loginUI')!.style.display = 'block';
});

// Nạp bản đồ và Tileset Atlas khi trang vừa tải
async function preloadWorldAssets() {
    try {
        const atlas = await loadTileAtlas(new URL('/assets/tiles/', location.origin));
        renderer.setTileAtlas(atlas);
    } catch (e) {
        console.warn('Tile atlas load fallback:', e);
    }

    for (const mapId of ['world-01', 'world-02']) {
        try {
            const res = await fetch(`/maps/${mapId}.json`);
            if (res.ok) {
                const mapJson = await res.json();
                maps.set(mapId, new GridMap(mapJson));
            }
        } catch (e) {
            console.warn(`Map load fallback ${mapId}:`, e);
        }
    }
}
preloadWorldAssets();

// Xử lý Click chuột trên Canvas:
// 1. Click vào Bình máu -> Tiến lại gần & gửi LOOT
// 2. Click vào Quái Slime -> Tiến lại gần & gửi ATTACK
// 3. Click vào ô trống hoặc cổng chuyển map -> Tính đường đi A* & gửi MOVE_TO
canvas.addEventListener('click', (e) => {
    const me = net.getMyPlayer();
    if (!me) return;
    if (me.state === 'DEAD' || me.hp <= 0) {
        lootRespawnFeature.showFeedback('Nhân vật đang chết! Vui lòng chờ và bấm nút Hồi sinh.', true);
        return;
    }

    const { x: gx, y: gy } = renderer.screenToGrid(e.clientX, e.clientY);
    const currentMap = maps.get(net.currentMapId);

    // 1. Kiểm tra có Bình máu tại ô click không
    let clickedItem: ItemData | null = null;
    net.items.forEach((item) => {
        if (item.mapId === net.currentMapId && item.x === gx && item.y === gy) {
            clickedItem = item;
        }
    });
    if (clickedItem) {
        clientPathPreview = [];
        clientTargetTile = { x: gx, y: gy };
        lootRespawnFeature.requestLootItem(clickedItem);
        return;
    }

    // 2. Kiểm tra có Quái Slime sống tại ô click không
    let clickedMob: MobData | null = null;
    net.mobs.forEach((mob) => {
        if (mob.mapId === net.currentMapId && mob.state !== 'DEAD' && mob.x === gx && mob.y === gy) {
            clickedMob = mob;
        }
    });
    if (clickedMob) {
        const mobTarget = clickedMob as MobData;
        lootRespawnFeature.cancelPendingLoot();
        clientTargetTile = { x: gx, y: gy };

        const dist = Math.abs(me.x - mobTarget.x) + Math.abs(me.y - mobTarget.y);
        if (dist > 1 && currentMap) {
            // Tìm ô kề cạnh có thể đi được để tiếp cận quái
            let approachTile: Tile | null = null;
            let shortestPath: Tile[] | null = null;
            for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
                const adj = { x: mobTarget.x + dx, y: mobTarget.y + dy };
                if (currentMap.walkable(adj)) {
                    const p = findPath(currentMap, { x: me.x, y: me.y }, adj);
                    if (p && (!shortestPath || p.length < shortestPath.length)) {
                        shortestPath = p;
                        approachTile = adj;
                    }
                }
            }
            if (approachTile) {
                clientPathPreview = shortestPath || [];
                net.sendMoveTo(approachTile.x, approachTile.y);
            }
        } else {
            clientPathPreview = [];
        }

        net.sendAttack(mobTarget.id);
        lootRespawnFeature.showFeedback(`Đang tấn công Slime (${mobTarget.hp}/${mobTarget.maxHp} HP)...`, false);
        return;
    }

    // 3. Click vào ô trống hoặc cổng chuyển map
    if (currentMap) {
        if (!currentMap.inside({ x: gx, y: gy })) {
            lootRespawnFeature.showFeedback('Ô đích nằm ngoài bản đồ!', true);
            return;
        }
        if (!currentMap.walkable({ x: gx, y: gy })) {
            lootRespawnFeature.showFeedback('Ô này bị chặn bởi vật cản!', true);
            return;
        }

        const path = findPath(currentMap, { x: me.x, y: me.y }, { x: gx, y: gy });
        if (path === null) {
            lootRespawnFeature.showFeedback('Không tìm thấy đường đi tới ô này!', true);
            return;
        }

        clientPathPreview = path;
        clientTargetTile = { x: gx, y: gy };
        lootRespawnFeature.cancelPendingLoot();
        net.sendAttack(null); // Click ô trống thì hủy mục tiêu đánh quái cũ
        net.sendMoveTo(gx, gy);
    }
});

function updateOnlinePlayersList() {
    const list = document.getElementById('players');
    if (!list) return;
    list.innerHTML = '';
    net.players.forEach((player, id) => {
        const li = document.createElement('li');
        const isMe = id === net.myId;
        const stateTag = player.state === 'DEAD' ? ' [CHẾT]' : ` (${player.hp}/${player.maxHp} HP)`;
        const mapTag = `[${player.mapId}] `;
        li.textContent = `${mapTag}${player.name}${isMe ? ' (Bạn)' : ''}${stateTag}`;
        if (player.state === 'DEAD') {
            li.style.color = '#ff6b6b';
        } else if (isMe) {
            li.style.color = '#f1c40f';
        }
        list.appendChild(li);
    });
    lootRespawnFeature.syncHudAndDeathOverlay();
}

function connectGame() {
    const nameInput = document.getElementById('playerName') as HTMLInputElement;
    const name = nameInput.value.trim();
    if (!name || name.length > 15) {
        alert('Vui lòng nhập tên nhân vật từ 1 đến 15 ký tự!');
        return;
    }

    net.connect(
        name,
        selectedAvatarId,
        () => {
            document.getElementById('loginUI')!.style.display = 'none';
            document.getElementById('gameUI')!.style.display = 'block';
            const dialogAvatar = document.querySelector('.dialogue-box .avatar') as HTMLImageElement;
            if (dialogAvatar) dialogAvatar.src = `/assets/characters/${selectedAvatarId}.png`;
            lootRespawnFeature.syncHudAndDeathOverlay();
            if (!isGameLoopRunning) {
                isGameLoopRunning = true;
                requestAnimationFrame(gameLoop);
            }
        },
        (msg) => {
            appendSystemLog(msg);
        },
        (charName, text) => {
            const dName = document.getElementById('dialogue-name');
            const dText = document.getElementById('dialogue-text');
            if (dName) dName.textContent = charName;
            if (dText) dText.textContent = text;
        },
        () => {
            updateOnlinePlayersList();
        },
        (online, statusText) => {
            const statusEl = document.getElementById('status');
            if (statusEl) {
                statusEl.textContent = statusText;
                statusEl.className = online ? 'status-online' : 'status-offline';
            }
        },
        {
            onChatReceived: (chat, tick) => lootRespawnFeature.handleChatEvent(chat, tick),
            onAckReceived: (ack, reqId, tick) => lootRespawnFeature.handleAckEvent(ack, reqId, tick),
            onErrorReceived: (err, reqId, tick) => lootRespawnFeature.handleErrorEvent(err, reqId, tick),
            onDamageReceived: (dmg, tick) => lootRespawnFeature.handleDamageEvent(dmg, tick),
            onEntitySpawn: (spawn, tick) => lootRespawnFeature.handleEntitySpawn(spawn, tick),
            onEntityDespawn: (despawn, tick) => lootRespawnFeature.handleEntityDespawn(despawn, tick),
            onWorldTick: (tick) => {
                const tickEl = document.getElementById('tickCounter');
                if (tickEl) tickEl.textContent = String(tick);
                const mapEl = document.getElementById('currentMapBadge');
                if (mapEl) mapEl.textContent = net.currentMapId;
                lootRespawnFeature.onWorldTick(tick);
            }
        }
    );
}

function handleKeyboardMovement() {
    if (lootRespawnFeature.isChatInputFocused()) {
        return;
    }

    const me = net.getMyPlayer();
    if (!me || me.state === 'DEAD' || me.hp <= 0) {
        return;
    }

    const now = performance.now();
    if (now - lastMoveSentAt < 200) {
        return;
    }

    let dx = 0;
    let dy = 0;

    if (keys['ArrowUp'] || keys['w'] || keys['W']) dy -= 1;
    if (keys['ArrowDown'] || keys['s'] || keys['S']) dy += 1;
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) dx -= 1;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) dx += 1;

    if (dx !== 0 || dy !== 0) {
        const currentMap = maps.get(net.currentMapId);
        const nextX = me.x + dx;
        const nextY = me.y + dy;
        if (currentMap && currentMap.walkable({ x: nextX, y: nextY })) {
            lastMoveSentAt = now;
            lootRespawnFeature.cancelPendingLoot();
            clientPathPreview = [];
            clientTargetTile = { x: nextX, y: nextY };
            net.sendMoveTo(nextX, nextY);
        }
    }
}

function gameLoop() {
    handleKeyboardMovement();

    const me = net.getMyPlayer();
    if (me && clientTargetTile && me.x === clientTargetTile.x && me.y === clientTargetTile.y) {
        clientTargetTile = null;
        clientPathPreview = [];
    }

    const currentMap = maps.get(net.currentMapId);
    renderer.render(
        net.currentMapId,
        currentMap,
        net.players,
        net.myId,
        net.mobs,
        net.items,
        net.currentTick,
        clientPathPreview,
        clientTargetTile,
        lootRespawnFeature.pendingLootId
    );

    requestAnimationFrame(gameLoop);
}
