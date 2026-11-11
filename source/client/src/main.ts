import { WebSocketClient } from './network/WebSocketClient';
import { CanvasRenderer } from './render/CanvasRenderer';

const CHARACTERS = [
    {
        id: 'knight', // Tên file ảnh (không có đuôi .png)
        name: 'Hiệp sĩ',
        desc: 'Hiệp sĩ sở hữu lượng máu (HP) và phòng thủ (Defense/Armor) rất cao, cùng với mức sát thương cận chiến ổn định hoặc thiên về chống chịu.'
    },

    {
        id: 'hunter', // Tên file ảnh (không có đuôi .png)
        name: 'Thợ săn',
        desc: 'Thợ săn sở hữu tầm nhìn rộng và khả năng di chuyển nhanh, cùng với mức sát thương xa ổn định hoặc thiên về bạo kích.'
    },

    {
        id: 'fighter', // Tên file ảnh (không có đuôi .png)
        name: 'Chiến binh',
        desc: 'Chiến binh sở hữu sức mạnh tấn công cao và khả năng chịu đựng tốt, cùng với mức sát thương cận chiến mạnh mẽ.'
    },

    {
        id: 'lion', // Tên file ảnh (không có đuôi .png)
        name: 'Sư tử',
        desc: 'Sư tử sở hữu sức mạnh tấn công cao và khả năng chịu đựng tốt, cùng với mức sát thương cận chiến mạnh mẽ.'
    },
    // Thêm các nhân vật khác nếu muốn
];
let selectedAvatarId = CHARACTERS[0].id;

// Hàm hiển thị giao diện chọn nhân vật
function renderCharacterSelection() {
    const listContainer = document.getElementById('character-list')!;
    const descBox = document.getElementById('character-desc')!;
    listContainer.innerHTML = '';

    CHARACTERS.forEach((char) => {
        const charCard = document.createElement('div');
        charCard.className = `char-card ${char.id === selectedAvatarId ? 'selected' : ''}`;
        charCard.innerHTML = `
            <img src="/assets/characters/${char.id}.png" alt="${char.name}" onerror="this.onerror=null; this.style.display='none';">
            <h4>${char.name}</h4>
        `;

        charCard.addEventListener('click', () => {
            selectedAvatarId = char.id;
            descBox.innerText = char.desc; // Cập nhật mô tả
            renderCharacterSelection(); // Render lại để cập nhật class 'selected'
        });

        listContainer.appendChild(charCard);
    });

    // Cập nhật mô tả cho nhân vật đang chọn
    const selectedChar = CHARACTERS.find(c => c.id === selectedAvatarId);
    if (selectedChar) descBox.innerText = selectedChar.desc;
}
renderCharacterSelection();

// ==========================================
// KHU VỰC LOGIC GAME
// ==========================================
const net = new WebSocketClient();
const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const renderer = new CanvasRenderer(canvas);

const keys: { [key: string]: boolean } = {};

window.addEventListener('keydown', (e) => keys[e.key] = true);
window.addEventListener('keyup', (e) => keys[e.key] = false);

document.getElementById('joinBtn')?.addEventListener('click', connectGame);
document.getElementById('playerName')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') connectGame();
});
document.getElementById('startGameBtn')?.addEventListener('click', () => {
    // Tạm thời ghi log và thông báo ra hộp thoại (Xử lý màn chơi thực sự sau)
    const logDiv = document.getElementById('systemLog')!;
    logDiv.innerHTML += `<div>[Sảnh Chờ] Bạn đã bấm nút VÀO GAME!</div>`;
    logDiv.scrollTop = logDiv.scrollHeight;

    document.getElementById('dialogue-name')!.innerText = 'Hệ Thống';
    document.getElementById('dialogue-text')!.innerText = 'Đã nhấn VÀO GAME! Đang chờ thiết lập màn chơi...';
});

function connectGame() {
    const nameInput = document.getElementById('playerName') as HTMLInputElement;
    const name = nameInput.value.trim();
    if (!name) return alert('Vui lòng nhập tên!');

    net.connect(
        name,
        selectedAvatarId,
        // Callback 1: Khi kết nối thành công (WELCOME)
        () => {
            document.getElementById('loginUI')!.style.display = 'none';
            document.getElementById('gameUI')!.style.display = 'block';
            requestAnimationFrame(gameLoop);
        },
        // Callback 2: Thêm log vào Nhật Ký Làng
        (msg) => {
            const logDiv = document.getElementById('systemLog')!;
            logDiv.innerHTML += `<div>${msg}</div>`;
            logDiv.scrollTop = logDiv.scrollHeight;
        },
        // Callback 3: Cập nhật Dialogue Box
        (charName, text) => {
            document.getElementById('dialogue-name')!.innerText = charName;
            document.getElementById('dialogue-text')!.innerText = text;
            // Cập nhật ảnh avatar trong hộp thoại
            const dialogAvatar = document.querySelector('.dialogue-box .avatar') as HTMLImageElement;
            if (dialogAvatar) dialogAvatar.src = `/assets/characters/${selectedAvatarId}.png`;
        },
        // Callback 4: Cập nhật danh sách người chơi Online
        () => {
            const list = document.getElementById('players')!;
            list.innerHTML = '';
            net.players.forEach((player, id) => {
                const li = document.createElement('li');
                const isMe = id === net.myId;
                li.innerText = `${player.name} ${isMe ? '(Bạn)' : ''}`;
                if (isMe) li.style.color = '#f1c40f';
                list.appendChild(li);
            });
        },
        // Callback 5: Cập nhật trạng thái kết nối Top bar
        (online, statusText) => {
            const statusEl = document.getElementById('status')!;
            statusEl.innerText = statusText;
            statusEl.className = online ? 'status-online' : 'status-offline';
        }
    );
}

function handleInput() {
    let dx = 0;
    let dy = 0;

    if (keys['ArrowUp'] || keys['w'] || keys['W']) dy -= 1;
    if (keys['ArrowDown'] || keys['s'] || keys['S']) dy += 1;
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) dx -= 1;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) dx += 1;

    if (dx !== 0 || dy !== 0) {
        net.sendMove(dx, dy);
    }
}

function gameLoop() {
    handleInput();
    renderer.render(net.players, net.myId);
    requestAnimationFrame(gameLoop);
}