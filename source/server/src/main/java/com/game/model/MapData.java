package com.game.model;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Dữ liệu bản đồ chuẩn gửi trong gói WELCOME theo docs/protocol-v1.md (Mục 4) và docs/game-design.md (Mục 4).
 */
public class MapData {
    public static class SafeZone {
        public int x;
        public int y;
        public int width;
        public int height;

        public SafeZone(int x, int y, int width, int height) {
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
        }

        public boolean contains(int gx, int gy) {
            return gx >= x && gx < x + width && gy >= y && gy < y + height;
        }
    }

    public static class GridPoint {
        public int x;
        public int y;

        public GridPoint(int x, int y) {
            this.x = x;
            this.y = y;
        }
    }

    private String id;
    private int width;
    private int height;
    private int tileSize;
    private List<Integer> collisions;
    private SafeZone safeZone;
    private transient List<GridPoint> playerSpawns;
    private transient Set<Integer> collisionSet;

    public MapData(String id, int width, int height, int tileSize, List<Integer> collisions, SafeZone safeZone, List<GridPoint> playerSpawns) {
        this.id = id;
        this.width = width;
        this.height = height;
        this.tileSize = tileSize;
        this.collisions = collisions != null ? new ArrayList<>(collisions) : new ArrayList<>();
        this.safeZone = safeZone;
        this.playerSpawns = playerSpawns != null ? new ArrayList<>(playerSpawns) : new ArrayList<>();
        this.collisionSet = new HashSet<>(this.collisions);
    }

    public static MapData createDefaultStartingValley() {
        int width = 32;
        int height = 24;
        int tileSize = 24;
        Set<Integer> blocked = new HashSet<>();

        // Bốn biên map là vật cản theo game-design.md Mục 4
        for (int x = 0; x < width; x++) {
            blocked.add(x); // y = 0
            blocked.add((height - 1) * width + x); // y = height - 1
        }
        for (int y = 0; y < height; y++) {
            blocked.add(y * width); // x = 0
            blocked.add(y * width + (width - 1)); // x = width - 1
        }

        // Một số chướng ngại vật (đá/cây) bên ngoài safeZone (2..7, 2..7)
        int[][] obstacles = {
            {10, 9}, {10, 10}, {10, 11},
            {16, 5}, {17, 5},
            {20, 14}, {20, 15}, {21, 15}
        };
        for (int[] obs : obstacles) {
            blocked.add(obs[1] * width + obs[0]);
        }

        List<Integer> collisions = new ArrayList<>(blocked);
        collisions.sort(Integer::compareTo);

        SafeZone safeZone = new SafeZone(2, 2, 6, 6);
        List<GridPoint> spawns = List.of(
            new GridPoint(3, 3),
            new GridPoint(4, 3),
            new GridPoint(3, 4),
            new GridPoint(5, 4),
            new GridPoint(4, 5),
            new GridPoint(6, 5)
        );

        return new MapData("starting-valley", width, height, tileSize, collisions, safeZone, spawns);
    }

    public boolean isInside(int gx, int gy) {
        return gx >= 0 && gx < width && gy >= 0 && gy < height;
    }

    public boolean isBlocked(int gx, int gy) {
        if (!isInside(gx, gy)) {
            return true;
        }
        if (collisionSet == null) {
            collisionSet = new HashSet<>(collisions);
        }
        return collisionSet.contains(gy * width + gx);
    }

    public boolean isInSafeZone(int gx, int gy) {
        return safeZone != null && safeZone.contains(gx, gy);
    }

    public GridPoint pickPlayerSpawn(int indexSeed) {
        if (playerSpawns == null || playerSpawns.isEmpty()) {
            return new GridPoint(safeZone != null ? safeZone.x + 1 : 3, safeZone != null ? safeZone.y + 1 : 3);
        }
        int idx = Math.floorMod(indexSeed, playerSpawns.size());
        return playerSpawns.get(idx);
    }

    public String getId() { return id; }
    public int getWidth() { return width; }
    public int getHeight() { return height; }
    public int getTileSize() { return tileSize; }
    public List<Integer> getCollisions() { return collisions; }
    public SafeZone getSafeZone() { return safeZone; }
    public List<GridPoint> getPlayerSpawns() { return playerSpawns; }
}
