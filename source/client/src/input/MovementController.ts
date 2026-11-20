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
    private onBeforeTileClick?: (tile: GridPoint) => boolean;
    private onMoveDispatched?: (goal: GridPoint) => void;

    constructor(
        private readonly renderer: CanvasRenderer,
        private readonly net: WebSocketClient,
        private readonly onNotify?: (message: string) => void
    ) {
        this.canvas = renderer.getCanvas();
        this.handleCanvasClick = event => this.onClick(event);
        this.canvas.addEventListener('click', this.handleCanvasClick);
    }

    public setTileClickInterceptor(handler?: (tile: GridPoint) => boolean): void {
        this.onBeforeTileClick = handler;
    }

    public setMoveDispatchedListener(listener?: (goal: GridPoint) => void): void {
        this.onMoveDispatched = listener;
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
        if (me?.state === 'DEAD') {
            this.previewPath = [];
            return this.previewPath;
        }
        const currentIndex = me ? this.previewPath.findIndex(point => point.x === me.x && point.y === me.y) : -1;
        if (currentIndex >= 0) this.previewPath = this.previewPath.slice(currentIndex + 1);
        if (destination && me && me.x === destination.x && me.y === destination.y) {
            this.previewPath = [];
        }
        return this.previewPath;
    }

    public clearPreview(): void {
        this.previewPath = [];
    }

    /**
     * Điều hướng nhân vật tới ô đích bằng A* và gửi MOVE_TO (dùng được cho cả click-to-move lẫn tự đi tới nhặt bình máu).
     */
    public moveToTile(goal: GridPoint, notifyOnBlocked = false): boolean {
        if (!this.net.myId) return false;
        const map = this.mapData;
        const pathfinder = this.pathfinder;
        if (!map || !pathfinder) {
            this.onNotify?.('Chưa nhận được dữ liệu bản đồ.');
            return false;
        }
        const me = this.net.players.get(this.net.myId);
        if (!me) return false;
        if (me.state === 'DEAD') {
            this.previewPath = [];
            this.onNotify?.('Bạn đã chết, hãy chờ hồi sinh.');
            return false;
        }
        if (!pathfinder.isWalkable(goal.x, goal.y)) {
            if (notifyOnBlocked) {
                this.onNotify?.('Ô đích bị chặn.');
            }
            return false;
        }
        const start: GridPoint = { x: me.x, y: me.y };
        const path = pathfinder.findPath(start, goal);
        if (path === null) {
            this.onNotify?.('Không tìm thấy đường tới ô đã chọn.');
            return false;
        }
        this.previewPath = path;
        if (!this.net.sendMoveTo(goal.x, goal.y)) {
            this.previewPath = [];
            this.onNotify?.('Chưa kết nối máy chủ; không thể gửi lệnh di chuyển.');
            return false;
        }
        return true;
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
        if (me.state === 'DEAD') {
            this.previewPath = [];
            this.onNotify?.('Bạn đã chết, hãy chờ hồi sinh.');
            return;
        }

        const goal = this.renderer.getTileAtClientPosition(event.clientX, event.clientY);
        if (!goal) {
            this.onNotify?.('Không thể xác định ô đích trên bản đồ.');
            return;
        }

        if (this.onBeforeTileClick?.(goal)) {
            return;
        }

        if (this.moveToTile(goal, false)) {
            this.onMoveDispatched?.(goal);
        }
    }
}
