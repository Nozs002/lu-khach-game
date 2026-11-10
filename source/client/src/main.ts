import { LootRespawnFeature } from './features/loot-respawn/LootRespawnFeature';
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
    const listContainer = document.getElementById('character-list')!;
    const descBox = document.getElementById('character-desc')!;
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

// ==========================================
// KHỞI TẠO CÁC MODULE CHÍNH (P1 + P4)
// ==========================================
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

window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
});
window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

document.getElementById('joinBtn')?.addEventListener('click', () => connectGame(false));
document.getElementById('mockJoinBtn')?.addEventListener('click', () => connectGame(true));
document.getElementById('playerName')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') connectGame(false);
});

document.getElementById('leaveBtn')?.addEventListener('click', () => {
    net.cleanup();
    lootRespawnFeature.cancelPendingLoot();
    document.getElementById('gameUI')!.style.display = 'none';
    document.getElementById('loginUI')!.style.display = 'block';
});

// Sự kiện Click trên Canvas:
// 1. Click vào Bình máu -> Tiếp cận & gửi LOOT (Phần 4)
// 2. Click vào Quái Slime -> Tiếp cận & gửi ATTACK
// 3. Click vào Ô trống -> Gửi MOVE_TO và hủy pendingLootId
canvas.addEventListener('click', (e) => {
    const me = net.getMyPlayer();
    if (!me) return;
    if (me.state === 'DEAD' || me.hp <= 0) {
        lootRespawnFeature.showFeedback('Nhân vật đang chết! Vui lòng chờ và bấm nút Hồi sinh.', true);
        return;
    }

    const { x: gx, y: gy } = renderer.screenToGrid(e.clientX, e.clientY, net.map);

    // 1. Kiểm tra có Bình máu tại ô vừa click không
    let clickedItem: ItemData | null = null;
    net.items.forEach((item) => {
        if (item.x === gx && item.y === gy) {
            clickedItem = item;
        }
    });
    if (clickedItem) {
        lootRespawnFeature.requestLootItem(clickedItem);
        return;
    }

    // 2. Kiểm tra có Quái Slime đang sống tại ô vừa click không
    let clickedMob: MobData | null = null;
    net.mobs.forEach((mob) => {
        if (mob.state !== 'DEAD' && mob.x === gx && mob.y === gy) {
            clickedMob = mob;
        }
    });
    if (clickedMob) {
        const mobTarget = clickedMob as MobData;
        lootRespawnFeature.cancelPendingLoot();
        const dist = Math.abs(me.x - mobTarget.x) + Math.abs(me.y - mobTarget.y);
        if (dist > 1) {
            // Di chuyển tới ô đứng cạnh quái
            const stepX = mobTarget.x + (me.x < mobTarget.x ? -1 : me.x > mobTarget.x ? 1 : 0);
            const stepY = stepX === mobTarget.x
                ? mobTarget.y + (me.y < mobTarget.y ? -1 : 1)
                : mobTarget.y;
            net.sendMoveTo(stepX, stepY);
        }
        net.sendAttack(mobTarget.id);
        lootRespawnFeature.showFeedback(`Đang tấn công quái ${mobTarget.id} (${mobTarget.hp}/${mobTarget.maxHp} HP)`, false);
        return;
    }

    // 3. Click vào ô trống -> hủy pendingLootId và đi tới ô đó
    lootRespawnFeature.cancelPendingLoot();
    net.sendMoveTo(gx, gy);
});

function updateOnlinePlayersList() {
    const list = document.getElementById('players')!;
    list.innerHTML = '';
    net.players.forEach((player, id) => {
        const li = document.createElement('li');
        const isMe = id === net.myId;
        const stateTag = player.state === 'DEAD' ? ' [CHẾT]' : ` (${player.hp}/${player.maxHp} HP)`;
        li.textContent = `${player.name}${isMe ? ' (Bạn)' : ''}${stateTag}`;
        if (player.state === 'DEAD') {
            li.style.color = '#ff6b6b';
        } else if (isMe) {
            li.style.color = '#f1c40f';
        }
        list.appendChild(li);
    });
    lootRespawnFeature.syncHudAndDeathOverlay();
}

function connectGame(forceMock: boolean) {
    const nameInput = document.getElementById('playerName') as HTMLInputElement;
    const name = nameInput.value.trim();
    if (!name || name.length > 15) {
        alert('Vui lòng nhập tên nhân vật từ 1 đến 15 ký tự!');
        return;
    }

    net.connect(
        name,
        selectedAvatarId,
        // Callback 1: Khi kết nối thành công (WELCOME)
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
        // Callback 2: Thêm log vào Nhật Ký Làng
        (msg) => {
            appendSystemLog(msg);
        },
        // Callback 3: Cập nhật Dialogue Box
        (charName, text) => {
            document.getElementById('dialogue-name')!.textContent = charName;
            document.getElementById('dialogue-text')!.textContent = text;
        },
        // Callback 4: Cập nhật danh sách người chơi Online
        () => {
            updateOnlinePlayersList();
        },
        // Callback 5: Cập nhật trạng thái kết nối Top bar
        (online, statusText) => {
            const statusEl = document.getElementById('status')!;
            statusEl.textContent = statusText;
            statusEl.className = online ? 'status-online' : 'status-offline';
        },
        // Callback mở rộng cho Phần 4 (Chat, Loot, Respawn, Tick)
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
                lootRespawnFeature.onWorldTick(tick);
            }
        },
        forceMock
    );
}

function handleKeyboardMovement() {
    // Khi đang focus vào ô Chat thì KHÔNG điều khiển nhân vật bằng bàn phím (theo Mục 3 game-design.md)
    if (lootRespawnFeature.isChatInputFocused()) {
        return;
    }

    const me = net.getMyPlayer();
    if (!me || me.state === 'DEAD' || me.hp <= 0) {
        return;
    }

    const now = performance.now();
    if (now - lastMoveSentAt < 180) {
        return;
    }

    let dx = 0;
    let dy = 0;

    if (keys['ArrowUp'] || keys['w'] || keys['W']) dy -= 1;
    if (keys['ArrowDown'] || keys['s'] || keys['S']) dy += 1;
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) dx -= 1;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) dx += 1;

    if (dx !== 0 || dy !== 0) {
        lastMoveSentAt = now;
        lootRespawnFeature.cancelPendingLoot();
        net.sendMove(dx, dy);
    }
}

function gameLoop() {
    handleKeyboardMovement();
    renderer.render(
        net.players,
        net.myId,
        net.map,
        net.mobs,
        net.items,
        net.currentTick,
        lootRespawnFeature.pendingLootId
    );
    requestAnimationFrame(gameLoop);
}
