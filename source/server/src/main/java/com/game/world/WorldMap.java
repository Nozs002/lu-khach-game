package com.game.world;

import com.google.gson.Gson;

import java.awt.Point;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

public final class WorldMap {
    private final String id;
    private final int width;
    private final int height;
    private final int tileSize;
    private final SafeZone safeZone;
    private final List<List<Integer>> tiles;
    private final List<Point> spawnTiles;

    private WorldMap(MapFile file) {
        // Adapt the Tiled exporter contract to the A* grid contract.
        if (file.tiles == null) file.tiles = file.collision;
        if (file.playerSpawns == null) file.playerSpawns = file.spawns;
        if (file.id == null) file.id = "world";
        if (file.safeZone == null && file.playerSpawns != null && !file.playerSpawns.isEmpty()) {
            SafeZone zone = new SafeZone();
            zone.x = file.playerSpawns.stream().mapToInt(p -> p.x).min().orElseThrow();
            zone.y = file.playerSpawns.stream().mapToInt(p -> p.y).min().orElseThrow();
            zone.width = file.playerSpawns.stream().mapToInt(p -> p.x).max().orElseThrow() - zone.x + 1;
            zone.height = file.playerSpawns.stream().mapToInt(p -> p.y).max().orElseThrow() - zone.y + 1;
            file.safeZone = zone;
        }
        if (file.id == null || file.id.isBlank()) {
            throw new IllegalArgumentException("Map phải có id.");
        }
        if (file.width <= 0 || file.height <= 0 || file.tileSize <= 0) {
            throw new IllegalArgumentException("Kích thước map và tileSize phải là số nguyên dương.");
        }
        if ((long) file.width * file.height > Integer.MAX_VALUE) {
            throw new IllegalArgumentException("Map vượt quá giới hạn chỉ số ô.");
        }
        validateSafeZone(file.safeZone, file.width, file.height);

        this.id = file.id;
        this.width = file.width;
        this.height = file.height;
        this.tileSize = file.tileSize;
        this.safeZone = file.safeZone;
        if (file.tiles == null || file.tiles.size() != height) {
            throw new IllegalArgumentException("Ma trận tiles phải có đúng số hàng bằng height.");
        }
        List<List<Integer>> validatedTiles = new ArrayList<>(height);
        for (int y = 0; y < height; y++) {
            List<Integer> row = file.tiles.get(y);
            if (row == null || row.size() != width) {
                throw new IllegalArgumentException("Hàng tiles " + y + " phải có đúng số cột bằng width.");
            }
            for (Integer value : row) {
                if (value == null || value < 0) {
                    throw new IllegalArgumentException("Tile phải là số nguyên không âm; hàng " + y + ".");
                }
            }
            validatedTiles.add(List.copyOf(row));
        }
        this.tiles = List.copyOf(validatedTiles);
        this.spawnTiles = new ArrayList<>();
        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                if (isWalkable(x, y) && isInsideSafeZone(x, y)) {
                    spawnTiles.add(new Point(x, y));
                }
            }
        }
        if (file.playerSpawns != null) {
            spawnTiles.clear();
            for (PointData spawn : file.playerSpawns) {
                if (spawn == null || !isInsideSafeZone(spawn.x, spawn.y) || !isWalkable(spawn.x, spawn.y)) {
                    throw new IllegalArgumentException("Điểm spawn nằm ngoài map hoặc bị chặn.");
                }
                spawnTiles.add(new Point(spawn.x, spawn.y));
            }
        }
        if (spawnTiles.isEmpty()) {
            throw new IllegalArgumentException("Map không có điểm spawn hợp lệ trong vùng an toàn.");
        }
    }

    public static WorldMap loadFromResource(String resourcePath, Gson gson) {
        try (InputStream stream = WorldMap.class.getResourceAsStream(resourcePath)) {
            if (stream == null) {
                throw new IllegalStateException("Không tìm thấy file map: " + resourcePath);
            }
            MapFile file = gson.fromJson(new InputStreamReader(stream, StandardCharsets.UTF_8), MapFile.class);
            if (file == null) {
                throw new IllegalStateException("File map rỗng: " + resourcePath);
            }
            return new WorldMap(file);
        } catch (IllegalArgumentException | IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("Không thể đọc map: " + resourcePath, e);
        }
    }

    public MapData toClientData() {
        return new MapData(id, width, height, tileSize, tiles, safeZone);
    }

    public Point availableSpawnTile(java.util.Collection<com.game.model.Player> players) {
        var queue = new java.util.ArrayDeque<Point>();
        var visited = new java.util.HashSet<Point>();
        for (Point spawn : spawnTiles) {
            queue.add(new Point(spawn));
            visited.add(new Point(spawn));
        }
        while (!queue.isEmpty()) {
            Point cell = queue.remove();
            if (players.stream().noneMatch(p -> p.getX() == cell.x && p.getY() == cell.y)) return cell;
            for (int[] step : new int[][]{{0, 1}, {1, 0}, {0, -1}, {-1, 0}}) {
                Point next = new Point(cell.x + step[0], cell.y + step[1]);
                if (isWalkable(next.x, next.y) && visited.add(next)) queue.add(next);
            }
        }
        throw new IllegalStateException("Không còn ô spawn trống.");
    }

    public String getId() {
        return id;
    }

    public int getWidth() {
        return width;
    }

    public int getHeight() {
        return height;
    }

    public boolean isInBounds(int x, int y) {
        return x >= 0 && x < width && y >= 0 && y < height;
    }

    public boolean isWalkable(int x, int y) {
        return isInBounds(x, y) && tiles.get(y).get(x) == 0;
    }

    private boolean isInsideSafeZone(int x, int y) {
        return x >= safeZone.x && x < safeZone.x + safeZone.width
                && y >= safeZone.y && y < safeZone.y + safeZone.height;
    }

    private static void validateSafeZone(SafeZone safeZone, int width, int height) {
        if (safeZone == null || safeZone.x < 0 || safeZone.y < 0
                || safeZone.width <= 0 || safeZone.height <= 0
                || (long) safeZone.x + safeZone.width > width
                || (long) safeZone.y + safeZone.height > height) {
            throw new IllegalArgumentException("Vùng an toàn không hợp lệ.");
        }
    }

    private static final class MapFile {
        String id;
        int width;
        int height;
        int tileSize;
        List<List<Integer>> tiles;
        List<List<Integer>> collision;
        List<PointData> spawns;
        SafeZone safeZone;
        List<PointData> playerSpawns;
    }

    private static final class PointData {
        int x;
        int y;
    }

    public static final class MapData {
        public final String id;
        public final int width;
        public final int height;
        public final int tileSize;
        public final List<List<Integer>> tiles;
        public final SafeZone safeZone;

        private MapData(
                String id,
                int width,
                int height,
                int tileSize,
                List<List<Integer>> tiles,
                SafeZone safeZone
        ) {
            this.id = id;
            this.width = width;
            this.height = height;
            this.tileSize = tileSize;
            this.tiles = tiles;
            this.safeZone = safeZone;
        }
    }

    public static final class SafeZone {
        public int x;
        public int y;
        public int width;
        public int height;
    }
}
