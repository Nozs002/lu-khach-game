package com.game.model;

import java.util.ArrayList;

/** Standalone integration check: run with -ea and generated map resources on classpath. */
public class WorldMapCheck {
    public static void main(String[] args) {
        var players = new ArrayList<Player>();
        for (int i = 0; i < 50; i++) {
            float[] spawn = StartMap.spawn(players);
            assert StartMap.isWalkable((int) spawn[0] / 16, (int) spawn[1] / 16);
            assert players.stream().noneMatch(p -> p.getX() == spawn[0] && p.getY() == spawn[1]);
            players.add(new Player("p" + i, "test", "knight", spawn[0], spawn[1]));
        }
        assert players.get(0).getX() == 53 * 16 && players.get(0).getY() == 233 * 16;
        assert !StartMap.isWalkable(-1, 0) && !StartMap.isWalkable(172, 314);
        int blocked = 0, accepted = 0;
        for (int y = 0; y < 314; y++) for (int x = 0; x < 172; x++) {
            if (!StartMap.isWalkable(x, y)) { blocked++; continue; }
            for (int[] step : new int[][]{{1, 0}, {-1, 0}, {0, 1}, {0, -1}}) {
                var p = new Player("test", "test", "knight", x * 16, y * 16);
                boolean expected = StartMap.isWalkable(x + step[0], y + step[1]);
                assert p.move(step[0], step[1]) == expected;
                if (expected) accepted++;
            }
        }
        var p = players.get(0);
        assert !p.move(100, 0) && !p.move(1, 1) && !p.move(Float.NaN, 0);
        assert blocked == 787;
        System.out.println("PASS: 50 distinct spawns, 787 blocked cells, " + accepted + " valid steps; invalid moves rejected");
    }
}
