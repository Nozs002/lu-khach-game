import type { MapData } from '../data/maps';
import type { WebSocketClient } from '../network/WebSocketClient';
import { AStarPathfinder, type GridPoint } from '../pathfinding/AStarPathfinder';
import { CanvasRenderer } from '../render/CanvasRenderer';

export class MovementController {
    private mapData: MapData | null = null;
    private pathfinder: AStarPathfinder | null = null;
    private previewPath: GridPoint[] = [];
    private readonly canvas: HTMLCanvasElement;
    private readonly handleCanvasClick: (event: MouseEvent) => void;

    constructor(
        private readonly renderer: CanvasRenderer,
        private readonly net: WebSocketClient,
        private readonly onNotify?: (message: string) => void
    ) {
        this.canvas = renderer.getCanvas();
        this.handleCanvasClick = event => this.onClick(event);
        this.canvas.addEventListener('click', this.handleCanvasClick);
    }

    public setMap(map: MapData): void {
        if (!Number.isSafeInteger(map.tileSize) || map.tileSize <= 0
            || !map.safeZone
            || !Number.isSafeInteger(map.safeZone.x) || map.safeZone.x < 0
            || !Number.isSafeInteger(map.safeZone.y) || map.safeZone.y < 0
            || !Number.isSafeInteger(map.safeZone.width) || map.safeZone.width <= 0
            || !Number.isSafeInteger(map.safeZone.height) || map.safeZone.height <= 0
            || map.safeZone.x + map.safeZone.width > map.width
            || map.safeZone.y + map.safeZone.height > map.height) {
            throw new RangeError('Dữ liệu bản đồ không hợp lệ.');
        }
        const pathfinder = new AStarPathfinder(map);
        this.mapData = map;
        this.pathfinder = pathfinder;
        this.previewPath = [];
    }

    public getPreviewPath(): readonly GridPoint[] {
        const destination = this.previewPath[this.previewPath.length - 1];
        const me = this.net.myId ? this.net.players.get(this.net.myId) : undefined;
        if (destination && me && me.x === destination.x && me.y === destination.y) {
            this.previewPath = [];
        }
        return this.previewPath;
    } // trả về đường đi dự kiến, nếu người chơi đã đến đích thì xóa đường đi dự kiến

    public clearPreview(): void {
        this.previewPath = [];
    }

    public destroy(): void {
        this.canvas.removeEventListener('click', this.handleCanvasClick);
    }

    private onClick(event: MouseEvent): void {
        if (!this.net.myId) return;
        const map = this.mapData;
        const pathfinder = this.pathfinder;
        if (!map || !pathfinder) {
            this.onNotify?.('Chưa nhận được dữ liệu bản đồ.');
            return;
        }

        const me = this.net.players.get(this.net.myId);
        if (!me) return;

        const goal = this.renderer.getTileAtClientPosition(event.clientX, event.clientY); // xác định ô đích dựa trên vị trí click chuột
        if (!goal) {
            this.onNotify?.('Không thể xác định ô đích trên bản đồ.');
            return;
        }
        if (!pathfinder.isWalkable(goal.x, goal.y)) {
            return;
        }

        const start: GridPoint = { x: me.x, y: me.y };
        const path = pathfinder.findPath(start, goal);
        if (path === null) {
            return;
        }
        if (path.length === 0) {
            this.previewPath = [];
            return;
        }

        this.previewPath = path;
        if (!this.net.sendMoveTo(goal.x, goal.y)) {
            this.previewPath = [];
            this.onNotify?.('Chưa kết nối máy chủ; không thể gửi lệnh di chuyển.');
        }
    }
}
