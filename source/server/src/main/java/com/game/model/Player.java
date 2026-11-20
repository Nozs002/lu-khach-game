package com.game.model;

import java.awt.Point;
import java.util.ArrayDeque;
import java.util.Collection;
import java.util.Queue;

public class Player extends CombatEntity {
    private String name;
    private String characterId;
    private final int damage;
    private final int armor;
    private transient Queue<Point> path = new ArrayDeque<>();

    public Player(String id, String name, String characterId, int x, int y) {
        super(id, x, y, CharacterCatalog.forCharacter(characterId).maxHp());
        this.name = name;
        this.characterId = CharacterCatalog.resolveId(characterId);
        var stats = CharacterCatalog.forCharacter(this.characterId);
        this.damage = stats.damage();
        this.armor = stats.armor();
    }

    public String getId() {
        return id;
    }

    public int getDamage() { return damage; }
    public int getArmor() { return armor; }

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
            if (targetId == null) state = "IDLE";
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
