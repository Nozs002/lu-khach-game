package com.game.model;

import com.google.gson.Gson;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Collection;

/** Tiled world collision and spawn positions. Network coordinates remain pixel coordinates. */
public final class StartMap {
    private static final SpawnData DATA = load();
    public static final int TILE_SIZE = DATA.tileSize;

    private StartMap() {}

    private static final class Cell { int x; int y; }
    private static final class SpawnData { int tileSize; int width; int height; int[][] collision; Cell[] spawns; }

    private static SpawnData load() {
        try (InputStream stream = StartMap.class.getResourceAsStream("/maps/world.generated.json")) {
            if (stream == null) throw new IllegalStateException("Missing generated world map resource");
            SpawnData data = new Gson().fromJson(new InputStreamReader(stream, StandardCharsets.UTF_8), SpawnData.class);
            if (data == null || data.tileSize <= 0 || data.spawns == null || data.spawns.length == 0) {
                throw new IllegalStateException("Invalid world spawn data");
            }
            return data;
        } catch (java.io.IOException e) {
            throw new IllegalStateException("Cannot load world spawn data", e);
        }
    }

    public static boolean isWalkable(int x, int y) {
        return x >= 0 && y >= 0 && x < DATA.width && y < DATA.height && DATA.collision[y][x] == 0;
    }

    public static float[] spawn(Collection<Player> players) {
        // Expand only through walkable cells connected to authored spawn points.
        java.util.ArrayDeque<Cell> queue = new java.util.ArrayDeque<>();
        boolean[][] visited = new boolean[DATA.height][DATA.width];
        for (Cell cell : DATA.spawns) {
            if (!isWalkable(cell.x, cell.y)) throw new IllegalStateException("Blocked spawn");
            queue.add(cell);
            visited[cell.y][cell.x] = true;
        }
        while (!queue.isEmpty()) {
            Cell cell = queue.remove();
            float x = cell.x * TILE_SIZE;
            float y = cell.y * TILE_SIZE;
            if (players.stream().noneMatch(p -> p.getX() == x && p.getY() == y)) return new float[]{x, y};
            for (int[] step : new int[][]{{0, 1}, {1, 0}, {0, -1}, {-1, 0}}) {
                int nx = cell.x + step[0], ny = cell.y + step[1];
                if (isWalkable(nx, ny) && !visited[ny][nx]) {
                    visited[ny][nx] = true;
                    Cell next = new Cell(); next.x = nx; next.y = ny;
                    queue.add(next);
                }
            }
        }
        throw new IllegalStateException("No free spawn position");
    }
}
