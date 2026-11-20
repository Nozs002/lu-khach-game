package com.game.model;

import com.game.world.WorldMap;
import com.game.features.movement.AStarPathfinder;
import com.game.features.movement.MoveToHandler;
import com.google.gson.Gson;
import java.awt.Point;
import java.util.ArrayList;

/** Run with -ea and generated map resources on the classpath. */
public class WorldMapCheck {
    public static void main(String[] args) {
        var map = WorldMap.loadFromResource("/maps/world.generated.json", new Gson());
        var players = new ArrayList<Player>();
        for (int i = 0; i < 50; i++) {
            Point spawn = map.availableSpawnTile(players);
            assert map.isWalkable(spawn.x, spawn.y);
            assert players.stream().noneMatch(p -> p.getX() == spawn.x && p.getY() == spawn.y);
            players.add(new Player("p" + i, "test", "knight", spawn.x, spawn.y));
        }
        assert players.get(0).getX() == 53 && players.get(0).getY() == 233;
        assert map.getWidth() == 172 && map.getHeight() == 314;
        var pathfinder = new AStarPathfinder();
        var handler = new MoveToHandler(map);
        int blocked = 0, paths = 0;
        Point start = new Point(53, 233);
        for (int y = 0; y < map.getHeight(); y++) for (int x = 0; x < map.getWidth(); x++) {
            if (!map.isWalkable(x, y)) {
                blocked++;
                assert handler.handle(players.get(0), x, y).code().equals("BLOCKED_TILE");
            } else if (x % 19 == 0 && y % 23 == 0) {
                var path = pathfinder.findPath(map, start, new Point(x, y));
                if (path == null) continue;
                Point previous = start;
                for (Point step : path) {
                    assert map.isWalkable(step.x, step.y);
                    assert Math.abs(step.x - previous.x) + Math.abs(step.y - previous.y) == 1;
                    previous = step;
                }
                assert previous.equals(new Point(x, y));
                paths++;
            }
        }
        assert blocked > 0 && paths > 0;
        assert handler.handle(players.get(0), -1, 0).code().equals("INVALID_TARGET");
        var player = players.get(0);
        assert handler.handle(player, 53, 234).accepted();
        assert player.advanceOneStep();
        assert player.getX() == 53 && player.getY() == 234;
        assert handler.handle(player, 53, 233).accepted();
        assert handler.handle(player, 53, 234).accepted();
        assert !player.advanceOneStep();
        System.out.println("PASS: 50 distinct spawns, " + blocked + " obstacles, " + paths + " A* routes, tick movement and cancellation");
    }
}
