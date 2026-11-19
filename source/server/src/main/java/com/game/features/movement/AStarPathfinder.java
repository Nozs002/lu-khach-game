package com.game.features.movement;

import com.game.world.WorldMap;

import java.awt.Point;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.PriorityQueue;
import java.util.Set;

public final class AStarPathfinder {
    private static final int[][] DIRECTIONS = {
            {0, -1},
            {1, 0},
            {0, 1},
            {-1, 0}
    };

    public List<Point> findPath(WorldMap map, Point start, Point goal) {
        if (!map.isWalkable(start.x, start.y) || !map.isWalkable(goal.x, goal.y)) {
            return null;
        }
        if (start.equals(goal)) {
            return List.of();
        }

        Comparator<Node> order = Comparator.comparingInt((Node node) -> node.f)
                .thenComparingInt(node -> node.h)
                .thenComparingLong(node -> node.sequence);
        PriorityQueue<Node> open = new PriorityQueue<>(order);
        Map<Integer, Integer> bestCost = new HashMap<>();
        Set<Integer> closed = new HashSet<>();
        long sequence = 0;

        int startIndex = indexOf(map, start.x, start.y);
        Node first = new Node(start, 0, heuristic(start, goal), sequence++, null);
        open.add(first);
        bestCost.put(startIndex, 0);

        while (!open.isEmpty()) {
            Node current = open.poll();
            int currentIndex = indexOf(map, current.point.x, current.point.y);
            if (current.g != bestCost.getOrDefault(currentIndex, Integer.MAX_VALUE)) {
                continue;
            }
            if (current.point.equals(goal)) {
                return reconstructPath(current);
            }
            closed.add(currentIndex);

            for (int[] direction : DIRECTIONS) {
                Point next = new Point(current.point.x + direction[0], current.point.y + direction[1]);
                if (!map.isWalkable(next.x, next.y)) {
                    continue;
                }

                int nextIndex = indexOf(map, next.x, next.y);
                if (closed.contains(nextIndex)) {
                    continue;
                }
                int nextCost = current.g + 1;
                if (nextCost >= bestCost.getOrDefault(nextIndex, Integer.MAX_VALUE)) {
                    continue;
                }

                bestCost.put(nextIndex, nextCost);
                open.add(new Node(next, nextCost, heuristic(next, goal), sequence++, current));
            }
        }
        return null;
    }

    private static int indexOf(WorldMap map, int x, int y) {
        return y * map.getWidth() + x;
    }

    private static int heuristic(Point from, Point to) {
        return Math.abs(from.x - to.x) + Math.abs(from.y - to.y);
    }

    private static List<Point> reconstructPath(Node goal) {
        List<Point> path = new ArrayList<>();
        Node current = goal;
        while (current.parent != null) {
            path.add(current.point);
            current = current.parent;
        }
        java.util.Collections.reverse(path);
        return path;
    }

    private static final class Node {
        private final Point point;
        private final int g;
        private final int h;
        private final int f;
        private final long sequence;
        private final Node parent;

        private Node(Point point, int g, int h, long sequence, Node parent) {
            this.point = point;
            this.g = g;
            this.h = h;
            this.f = g + h;
            this.sequence = sequence;
            this.parent = parent;
        }
    }
}
