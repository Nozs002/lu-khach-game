import world from './world.generated.json';

export const WORLD = world;
export const WORLD_VIEWS = [
    { id: 'spawn', name: 'Điểm xuất hiện', x: world.spawns[0].x - 16, y: world.spawns[0].y - 12 },
    { id: 'north', name: 'Phía bắc', x: 65, y: 0 },
    { id: 'coast', name: 'Bờ biển', x: 0, y: world.spawns[0].y },
    { id: 'desert', name: 'Sa mạc', x: 130, y: 270 },
];

export function isWorldWalkable(x: number, y: number): boolean {
    return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0
        && x < world.width && y < world.height && world.collision[y][x] === 0;
}
