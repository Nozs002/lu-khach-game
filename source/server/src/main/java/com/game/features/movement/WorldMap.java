package com.game.features.movement;

import java.util.*;

public final class WorldMap {
    public record Tile(int x, int y) {}
    public record Zone(int x, int y, int width, int height) {}
    public record Exit(String side, List<Tile> cells, String targetMap, List<Tile> arrivals) {
        public Exit { cells = List.copyOf(cells); arrivals = List.copyOf(arrivals); }
    }
    public final String id;
    public final int width = 52, height = 24, tileSize = 24;
    public final Set<Integer> collisions;
    public final Zone safeZone;
    public final Tile spawn;
    public final List<Exit> exits;
    public WorldMap(String id, Collection<Integer> collisions, Zone zone, Tile spawn, List<Exit> exits) {
        if (id == null || !id.matches("[a-z0-9-]+") || collisions == null || new HashSet<>(collisions).size() != collisions.size() || collisions.stream().anyMatch(n -> n == null || n < 0 || n >= 1248)) throw new IllegalArgumentException("INVALID_MAP");
        this.id = id; this.collisions = Set.copyOf(collisions); this.safeZone = zone; this.spawn = spawn; this.exits = List.copyOf(exits);
        if (zone == null || zone.width < 1 || zone.height < 1 || zone.width > 52 || zone.height > 24 || !inside(new Tile(zone.x, zone.y)) || !inside(new Tile(zone.x + zone.width - 1, zone.y + zone.height - 1))) throw new IllegalArgumentException("INVALID_SAFE_ZONE");
        for (int y = zone.y; y < zone.y + zone.height; y++) for (int x = zone.x; x < zone.x + zone.width; x++) if (!walkable(new Tile(x,y))) throw new IllegalArgumentException("BLOCKED_SAFE_ZONE");
        if (!walkable(spawn) || spawn.x < zone.x || spawn.y < zone.y || spawn.x >= zone.x + zone.width || spawn.y >= zone.y + zone.height) throw new IllegalArgumentException("INVALID_SPAWN");
        Map<String, List<Tile>> expected = Map.of("left", List.of(new Tile(0,11), new Tile(0,12)), "right", List.of(new Tile(51,11), new Tile(51,12)), "top", List.of(new Tile(25,0), new Tile(26,0)), "bottom", List.of(new Tile(25,23), new Tile(26,23)));
        Set<String> sides = new HashSet<>(); Set<Tile> gates = new HashSet<>();
        if (exits.size() != 4) throw new IllegalArgumentException("INVALID_EXITS");
        for (Exit e : exits) {
            if (!Objects.equals(expected.get(e.side), e.cells) || !sides.add(e.side) || e.targetMap == null || !e.targetMap.matches("[a-z0-9-]+") || e.arrivals.size() != 2 || e.cells.stream().anyMatch(p -> !walkable(p)) || e.arrivals.stream().anyMatch(p -> p.x < 1 || p.x > 50 || p.y < 1 || p.y > 22)) throw new IllegalArgumentException("INVALID_EXIT");
            gates.addAll(e.cells);
        }
        for (int y = 0; y < 24; y++) for (int x = 0; x < 52; x++) if ((x == 0 || x == 51 || y == 0 || y == 23) && walkable(new Tile(x,y)) != gates.contains(new Tile(x,y))) throw new IllegalArgumentException("INVALID_BOUNDARY");
        if (gates.contains(spawn)) throw new IllegalArgumentException("PORTAL_SPAWN");
        Set<Tile> reached = new HashSet<>(); ArrayDeque<Tile> queue = new ArrayDeque<>(); reached.add(spawn); queue.add(spawn);
        int[][] directions = {{0,-1},{1,0},{0,1},{-1,0}};
        while (!queue.isEmpty()) {
            Tile p = queue.remove(); if (gates.contains(p)) continue;
            for (int[] d : directions) { Tile next = new Tile(p.x+d[0],p.y+d[1]); if (walkable(next) && reached.add(next)) queue.add(next); }
        }
        if (!reached.containsAll(gates)) throw new IllegalArgumentException("UNREACHABLE_EXIT");
    }
    public boolean inside(Tile p) { return p != null && p.x >= 0 && p.y >= 0 && p.x < 52 && p.y < 24; }
    public boolean walkable(Tile p) { return inside(p) && !collisions.contains(p.y * 52 + p.x); }
    public boolean portal(Tile p) { return exits.stream().anyMatch(e -> e.cells.contains(p)); }
    public static void validateWorld(Map<String, WorldMap> maps) {
        for (var entry : maps.entrySet()) {
            WorldMap map = entry.getValue();
            if (!entry.getKey().equals(map.id)) throw new IllegalArgumentException("INVALID_MAP_KEY");
            for (Exit e : map.exits) { WorldMap target = maps.get(e.targetMap); if (target == null || e.arrivals.stream().anyMatch(p -> !target.walkable(p))) throw new IllegalArgumentException("INVALID_MAP_LINK"); }
        }
    }
}
