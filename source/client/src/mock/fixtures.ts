import {
    ItemData,
    MapData,
    MobData,
    PlayerData,
    WelcomePayload,
    WorldState
} from '../types/protocol';

/**
 * DỮ LIỆU GIẢ ĐỊNH (FIXTURES / FAKE WORLD) theo docs/protocol-v1.md (Mục 6, 7, 8) và docs/game-design.md:
 * Giúp Phần 4 (Chat, Vật phẩm & Hồi sinh) chạy và kiểm thử đầy đủ ngay cả khi chưa chạy Server
 * hoặc chưa ghép code của P1, P2, P3.
 */
export function createDefaultMapFixture(): MapData {
    const width = 32;
    const height = 24;
    const tileSize = 24;
    const blocked = new Set<number>();

    // Bốn biên bản đồ bị chặn
    for (let x = 0; x < width; x++) {
        blocked.add(x);
        blocked.add((height - 1) * width + x);
    }
    for (let y = 0; y < height; y++) {
        blocked.add(y * width);
        blocked.add(y * width + (width - 1));
    }

    // Các chướng ngại vật (đá/cây) bên ngoài safeZone (2..7, 2..7)
    const obstacles: Array<[number, number]> = [
        [10, 9], [10, 10], [10, 11],
        [16, 5], [17, 5],
        [20, 14], [20, 15], [21, 15]
    ];
    for (const [ox, oy] of obstacles) {
        blocked.add(oy * width + ox);
    }

    return {
        id: 'starting-valley',
        width,
        height,
        tileSize,
        collisions: Array.from(blocked).sort((a, b) => a - b),
        safeZone: { x: 2, y: 2, width: 6, height: 6 }
    };
}

export function createInitialMobsFixture(): MobData[] {
    return [
        { id: 'm-1', kind: 'SLIME', x: 9, y: 4, homeX: 9, homeY: 4, hp: 40, maxHp: 40, state: 'IDLE', targetId: null, spawnGeneration: 1, respawnReadyTick: null },
        { id: 'm-2', kind: 'SLIME', x: 12, y: 6, homeX: 12, homeY: 6, hp: 40, maxHp: 40, state: 'IDLE', targetId: null, spawnGeneration: 1, respawnReadyTick: null },
        { id: 'm-3', kind: 'SLIME', x: 15, y: 10, homeX: 15, homeY: 10, hp: 40, maxHp: 40, state: 'IDLE', targetId: null, spawnGeneration: 1, respawnReadyTick: null },
        { id: 'm-4', kind: 'SLIME', x: 11, y: 14, homeX: 11, homeY: 14, hp: 40, maxHp: 40, state: 'IDLE', targetId: null, spawnGeneration: 1, respawnReadyTick: null },
        { id: 'm-5', kind: 'SLIME', x: 19, y: 8, homeX: 19, homeY: 8, hp: 40, maxHp: 40, state: 'IDLE', targetId: null, spawnGeneration: 1, respawnReadyTick: null }
    ];
}

export function createInitialItemsFixture(): ItemData[] {
    return [
        { id: 'i-1', kind: 'HEALTH_POTION', x: 6, y: 4, expiresTick: 200 },
        { id: 'i-2', kind: 'HEALTH_POTION', x: 8, y: 5, expiresTick: 200 }
    ];
}

export function createWelcomeFixture(playerName: string, avatar: string): WelcomePayload {
    const map = createDefaultMapFixture();
    const myPlayer: PlayerData = {
        id: 'p-1',
        name: playerName || 'Hoàng',
        avatar: avatar || 'knight',
        x: 4,
        y: 4,
        hp: 70, // Khởi đầu 70/100 HP ở chế độ giả lập để có thể test nhặt bình máu ngay!
        maxHp: 100,
        state: 'IDLE',
        targetId: null,
        respawnReadyTick: null
    };

    const teammateFixture: PlayerData = {
        id: 'p-2',
        name: 'An (Bot P1)',
        avatar: 'hunter',
        x: 5,
        y: 3,
        hp: 85,
        maxHp: 100,
        state: 'IDLE',
        targetId: null,
        respawnReadyTick: null
    };

    const state: WorldState = {
        players: [myPlayer, teammateFixture],
        mobs: createInitialMobsFixture(),
        items: createInitialItemsFixture()
    };

    return {
        playerId: 'p-1',
        tickDurationMs: 100,
        map,
        state
    };
}
