export interface GridPoint {
    x: number;
    y: number;
}

export interface GridMapData {
    readonly width: number;
    readonly height: number;
    readonly tiles: readonly (readonly number[])[];
}

interface AStarNode {
    x: number;
    y: number;
    g: number;
    h: number;
    f: number;
    order: number;
    parent: AStarNode | null;
}

class MinHeap {
    private readonly values: AStarNode[] = [];

    get size(): number {
        return this.values.length;
    }

    push(value: AStarNode): void {
        this.values.push(value);
        let index = this.values.length - 1;
        while (index > 0) {
            const parent = Math.floor((index - 1) / 2);
            if (!this.isBefore(this.values[index], this.values[parent])) break;
            [this.values[index], this.values[parent]] = [this.values[parent], this.values[index]];
            index = parent;
        }
    }

    pop(): AStarNode | undefined {
        if (this.values.length === 0) return undefined;
        const first = this.values[0];
        const last = this.values.pop()!;
        if (this.values.length > 0) {
            this.values[0] = last;
            let index = 0;
            while (true) {
                const left = index * 2 + 1;
                const right = left + 1;
                let best = index;
                if (left < this.values.length && this.isBefore(this.values[left], this.values[best])) {
                    best = left;
                }
                if (right < this.values.length && this.isBefore(this.values[right], this.values[best])) {
                    best = right;
                }
                if (best === index) break;
                [this.values[index], this.values[best]] = [this.values[best], this.values[index]];
                index = best;
            }
        }
        return first;
    }

    private isBefore(a: AStarNode, b: AStarNode): boolean {
        return a.f < b.f || (a.f === b.f && (a.h < b.h || (a.h === b.h && a.order < b.order)));
    }
}

// Thứ tự xét láng giềng: Trên, Phải, Dưới, Trái
const DIRECTIONS: readonly GridPoint[] = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 }
];

export class AStarPathfinder {
    private readonly width: number;
    private readonly height: number;
    private readonly tiles: readonly (readonly number[])[];

    constructor(map: GridMapData) {
        if (!Number.isSafeInteger(map.width) || map.width <= 0
            || !Number.isSafeInteger(map.height) || map.height <= 0
            || !Number.isSafeInteger(map.width * map.height)) {
            throw new RangeError('Kích thước map phải là số nguyên dương.');
        }
        this.width = map.width;
        this.height = map.height;
        if (!Array.isArray(map.tiles) || map.tiles.length !== this.height) {
            throw new RangeError('Ma trận tiles phải có đúng số hàng bằng height.');
        }
        for (const [y, row] of map.tiles.entries()) {
            if (!Array.isArray(row) || row.length !== this.width) {
                throw new RangeError(`Hàng tiles ${y} phải có đúng số cột bằng width.`);
            }
            for (const value of row) {
                if (!Number.isSafeInteger(value) || value < 0) {
                    throw new RangeError(`Giá trị tile không hợp lệ tại hàng ${y}.`);
                }
            }
        }
        this.tiles = map.tiles;
    }

    public isInBounds(x: number, y: number): boolean {
        return Number.isInteger(x) && Number.isInteger(y)
            && x >= 0 && x < this.width
            && y >= 0 && y < this.height;
    }

    public isWalkable(x: number, y: number): boolean {
        if (!this.isInBounds(x, y)) return false;
        return this.tiles[y][x] === 0;
    }

    private heuristic(a: GridPoint, b: GridPoint): number {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    public findPath(start: GridPoint, goal: GridPoint): GridPoint[] | null {
        if (!this.isInBounds(start.x, start.y) || !this.isInBounds(goal.x, goal.y)) {
            return null;
        }
        if (!this.isWalkable(start.x, start.y) || !this.isWalkable(goal.x, goal.y)) {
            return null;
        }
        if (start.x === goal.x && start.y === goal.y) {
            return [];
        }

        const openList = new MinHeap();
        const bestCost = new Map<number, number>();
        const closedSet = new Set<number>();
        let insertionOrder = 0;

        const startH = this.heuristic(start, goal);
        const startNode: AStarNode = {
            x: start.x,
            y: start.y,
            g: 0,
            h: startH,
            f: startH,
            order: insertionOrder++,
            parent: null
        };

        const startIdx = start.y * this.width + start.x;
        openList.push(startNode);
        bestCost.set(startIdx, 0);

        while (openList.size > 0) {
            const current = openList.pop()!;
            const currentIdx = current.y * this.width + current.x;
            if (current.g !== bestCost.get(currentIdx)) continue;

            if (current.x === goal.x && current.y === goal.y) {
                return this.reconstructPath(current);
            }

            closedSet.add(currentIdx);

            for (const dir of DIRECTIONS) {
                const nx = current.x + dir.x;
                const ny = current.y + dir.y;

                if (!this.isWalkable(nx, ny)) continue;

                const neighborIdx = ny * this.width + nx;
                if (closedSet.has(neighborIdx)) continue;

                const tentativeG = current.g + 1;
                const previousCost = bestCost.get(neighborIdx);
                if (previousCost !== undefined && tentativeG >= previousCost) continue;

                const h = this.heuristic({ x: nx, y: ny }, goal);
                const neighborNode: AStarNode = {
                    x: nx,
                    y: ny,
                    g: tentativeG,
                    h,
                    f: tentativeG + h,
                    order: insertionOrder++,
                    parent: current
                };
                bestCost.set(neighborIdx, tentativeG);
                openList.push(neighborNode);
            }
        }

        return null;
    }

    private reconstructPath(goalNode: AStarNode): GridPoint[] {
        const path: GridPoint[] = [];
        let curr: AStarNode | null = goalNode;
        while (curr && curr.parent !== null) {
            path.push({ x: curr.x, y: curr.y });
            curr = curr.parent;
        }
        path.reverse();
        return path;
    }
}