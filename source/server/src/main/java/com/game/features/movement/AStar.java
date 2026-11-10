package com.game.features.movement;

import java.util.*;
import static com.game.features.movement.WorldMap.Tile;

public final class AStar {
    private record Node(Tile tile, int g, int f, int order) {}
    private AStar() {}
    private static int h(Tile a, Tile b) { return Math.abs(a.x()-b.x()) + Math.abs(a.y()-b.y()); }
    /** Null means no path; empty means stop. Excludes start. Same ties as TS. */
    public static List<Tile> findPath(WorldMap map, Tile start, Tile goal) {
        if (!map.walkable(start) || !map.walkable(goal)) return null;
        PriorityQueue<Node> open = new PriorityQueue<>(Comparator.comparingInt(Node::f).thenComparingInt(Node::order));
        Map<Tile,Integer> cost = new HashMap<>(); Map<Tile,Tile> parent = new HashMap<>(); int order = 0;
        open.add(new Node(start,0,h(start,goal),order++)); cost.put(start,0);
        int[][] directions = {{0,-1},{1,0},{0,1},{-1,0}};
        while (!open.isEmpty()) {
            Node n = open.remove(); if (n.g != cost.get(n.tile)) continue;
            if (n.tile.equals(goal)) {
                List<Tile> result = new ArrayList<>();
                for (Tile p = goal; !p.equals(start); p = parent.get(p)) result.add(p);
                Collections.reverse(result); return result;
            }
            for (int[] d : directions) {
                Tile p = new Tile(n.tile.x()+d[0], n.tile.y()+d[1]); int g = n.g+1;
                if (!map.walkable(p) || (!p.equals(goal) && map.portal(p)) || g >= cost.getOrDefault(p,Integer.MAX_VALUE)) continue;
                cost.put(p,g); parent.put(p,n.tile); open.add(new Node(p,g,g+h(p,goal),order++));
            }
        }
        return null;
    }
}
