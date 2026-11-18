package com.game.features.movement;

import com.game.model.Player;
import com.game.world.WorldMap;

import java.awt.Point;
import java.util.List;

public final class MoveToHandler {
    private final WorldMap map;
    private final AStarPathfinder pathfinder = new AStarPathfinder();

    public MoveToHandler(WorldMap map) {
        this.map = map;
    }

    public Result handle(Player player, int targetX, int targetY) {
        if (!map.isInBounds(targetX, targetY)) {
            return new Result("INVALID_TARGET", "Ô đích nằm ngoài bản đồ.");
        }
        if (!map.isWalkable(targetX, targetY)) {
            return new Result("BLOCKED_TILE", "Ô đích bị chặn.");
        }

        List<Point> path = pathfinder.findPath(
                map,
                new Point(player.getX(), player.getY()),
                new Point(targetX, targetY)
        );
        if (path == null) {
            return new Result("NO_PATH", "Không tìm thấy đường đi tới ô đã chọn.");
        }
        player.setPath(path);
        return new Result(null, null);
    }

    public record Result(String code, String message) {
        public boolean accepted() {
            return code == null;
        }
    }
}
