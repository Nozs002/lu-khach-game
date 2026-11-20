package com.game.model;

import java.awt.Point;
import java.util.ArrayDeque;
import java.util.Collection;
import java.util.Queue;

public class Player extends CombatEntity {
    private String name;
    private String characterId;
    private transient Queue<Point> path = new ArrayDeque<>();

    public Player(String id, String name, String characterId, int x, int y) {
        super(id, x, y, 100);
        this.name = name;
        this.characterId = characterId;
    }

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getCharacterId() {
        return characterId;
    }

    public int getX() {
        return x;
    }

    public int getY() {
        return y;
    }

    public synchronized void setPath(Collection<Point> points) {
        path.clear();
        if (!isAlive()) return;
        for (Point point : points) {
            path.add(new Point(point));
        }
        state = path.isEmpty() ? "IDLE" : "MOVING";
    }

    @Override
    public synchronized void clearPath() {
        path.clear();
    }

    public void stopCombat() {
        targetId = null;
        clearPath();
        if (isAlive()) state = "IDLE";
    }

    public synchronized boolean advanceOneStep() {
        if (!isAlive()) {
            clearPath();
            return false;
        }
        Point next = path.poll();
        if (next == null) {
            state = targetId == null ? "IDLE" : "ATTACKING";
            return false;
        }
        x = next.x;
        y = next.y;
        state = path.isEmpty()
                ? (targetId == null ? "IDLE" : "ATTACKING")
                : "MOVING";
        return true;
    }
}
