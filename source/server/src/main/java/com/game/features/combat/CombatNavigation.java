package com.game.features.combat;

import com.game.features.movement.AStarPathfinder;
import com.game.model.CombatEntity;
import com.game.model.Mob;
import com.game.model.Player;
import com.game.world.WorldMap;

import java.awt.Point;
import java.util.List;
import java.util.function.Predicate;

public final class CombatNavigation {
    private static final int[][] DIRECTIONS = {{0, -1}, {1, 0}, {0, 1}, {-1, 0}};
    private final WorldMap map;
    private final WorldMap.SafeZone safeZone;
    private final AStarPathfinder pathfinder = new AStarPathfinder();

    public CombatNavigation(WorldMap map) {
        this.map = map;
        this.safeZone = map.toClientData().safeZone;
    }

    public static int distance(int x1, int y1, int x2, int y2) {
        return Math.abs(x1 - x2) + Math.abs(y1 - y2);
    }

    public static int distance(CombatEntity first, CombatEntity second) {
        return distance(first.getX(), first.getY(), second.getX(), second.getY());
    }

    public boolean isSafe(int x, int y) {
        return x >= safeZone.x && x < safeZone.x + safeZone.width
                && y >= safeZone.y && y < safeZone.y + safeZone.height;
    }

    public boolean isSafe(CombatEntity entity) {
        return isSafe(entity.getX(), entity.getY());
    }

    public boolean canMobStand(Mob mob, int x, int y) {
        return map.isWalkable(x, y) && !isSafe(x, y)
                && distance(x, y, mob.getHomeX(), mob.getHomeY()) <= mob.getLeashRadius();
    }

    public List<Point> mobApproach(Mob mob, CombatEntity target) {
        if (isSafe(target)) return null;
        return shortestApproach(new Point(mob.getX(), mob.getY()), target,
                point -> canMobStand(mob, point.x, point.y));
    }

    public List<Point> playerApproach(Player player, Mob target) {
        if (isSafe(target)) return null;
        return shortestApproach(new Point(player.getX(), player.getY()), target,
                point -> map.isWalkable(point.x, point.y), point -> !isSafe(point.x, point.y));
    }

    public List<Point> mobReturnHome(Mob mob) {
        return pathfinder.findPath(map,
                new Point(mob.getX(), mob.getY()),
                new Point(mob.getHomeX(), mob.getHomeY()),
                point -> canMobStand(mob, point.x, point.y));
    }

    private List<Point> shortestApproach(Point start, CombatEntity target, Predicate<Point> allowed) {
        return shortestApproach(start, target, allowed, allowed);
    }

    private List<Point> shortestApproach(Point start, CombatEntity target,
                                         Predicate<Point> allowedPath, Predicate<Point> allowedGoal) {
        List<Point> shortest = null;
        for (int[] direction : DIRECTIONS) {
            Point goal = new Point(target.getX() + direction[0], target.getY() + direction[1]);
            if (!map.isWalkable(goal.x, goal.y) || !allowedGoal.test(goal)) continue;
            List<Point> path = pathfinder.findPath(map, start, goal, allowedPath);
            if (path != null && (shortest == null || path.size() < shortest.size())) {
                shortest = path;
            }
        }
        return shortest;
    }
}
