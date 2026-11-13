import { PlayerData } from '../network/WebSocketClient';

export class CanvasRenderer {
    private ctx: CanvasRenderingContext2D;
    private imageCache: Map<string, HTMLImageElement> = new Map();

    constructor(private canvas: HTMLCanvasElement) {
        this.ctx = canvas.getContext('2d')!;
    }

    private getImage(avatarName: string): HTMLImageElement {
        // Nếu Server gửi avatar bị undefined hoặc rỗng, tự động lấy 'knight' (hoặc 'avatar')
        const name = (avatarName && avatarName !== 'undefined') ? avatarName : 'knight';

        if (!this.imageCache.has(name)) {
            const img = new Image();
            img.src = `/assets/characters/${name}.png`;

            img.onload = () => console.log(`[CANVAS OK] Tải thành công ảnh: ${img.src}`);
            img.onerror = () => console.error(`[CANVAS LỖI] Không tìm thấy file: ${img.src}`);

            this.imageCache.set(name, img);
        }
        return this.imageCache.get(name)!;
    }

    render(players: Map<string, PlayerData>, myId: string | null) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Vẽ Lưới nền
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        for (let x = 0; x < this.canvas.width; x += 32) {
            this.ctx.beginPath(); this.ctx.moveTo(x, 0); this.ctx.lineTo(x, this.canvas.height); this.ctx.stroke();
        }
        for (let y = 0; y < this.canvas.height; y += 32) {
            this.ctx.beginPath(); this.ctx.moveTo(0, y); this.ctx.lineTo(this.canvas.width, y); this.ctx.stroke();
        }

        // Vẽ từng người chơi
        players.forEach((player) => {
            const isMe = player.id === myId;
            const img = this.getImage(player.avatar);

            // Vẽ ảnh nhân vật (Kích thước 48x48)
            if (img.complete && img.naturalWidth !== 0) {
                this.ctx.drawImage(img, player.x, player.y, 48, 48);
            } else {
                // Ô màu dự phòng trong lúc ảnh đang nạp
                this.ctx.fillStyle = isMe ? '#f1c40f' : '#e74c3c';
                this.ctx.fillRect(player.x, player.y, 48, 48);
            }

            // Viền vàng quanh nhân vật của bản thân
            if (isMe) {
                this.ctx.strokeStyle = '#f1c40f';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(player.x, player.y, 48, 48);
            }

            // Vẽ Username ngay chính giữa trên đầu nhân vật
            this.ctx.fillStyle = isMe ? '#f1c40f' : '#ffffff';
            this.ctx.font = 'bold 12px "Courier New", monospace';
            this.ctx.textAlign = 'center';
            this.ctx.shadowColor = '#000000';
            this.ctx.shadowBlur = 4;

            const displayName = player.name + (isMe ? ' (Bạn)' : '');
            this.ctx.fillText(displayName, player.x + 24, player.y - 8);
            this.ctx.shadowBlur = 0;
        });
    }
}