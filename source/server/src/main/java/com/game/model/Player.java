package com.game.model;

import java.awt.Point;
import java.util.ArrayDeque;
import java.util.Collection;
import java.util.Queue;

public class Player {
    private String id;
    private String name;
    private String characterId;
    private int x;
    private int y;
    private int hp;
    private final int maxHp;
    private final int damage;
    private final int armor;
    private transient Queue<Point> path = new ArrayDeque<>();

    public Player(String id, String name, String characterId, int x, int y) {
        this.id = id;
        this.name = name;
        this.characterId = CharacterCatalog.resolveId(characterId);
        CharacterCatalog.Stats stats = CharacterCatalog.forCharacter(this.characterId);
        this.maxHp = stats.maxHp();
        this.hp = maxHp;
        this.damage = stats.damage();
        this.armor = stats.armor();
        this.x = x;
        this.y = y;
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

    public int getHp() { return hp; }
    public int getMaxHp() { return maxHp; }
    public int getDamage() { return damage; }
    public int getArmor() { return armor; }

    public synchronized void setPath(Collection<Point> points) {
        path.clear();
        for (Point point : points) {
            path.add(new Point(point));
        }
    }

    public synchronized boolean advanceOneStep() {
        Point next = path.poll();
        if (next == null) return false;
        x = next.x;
        y = next.y;
        return true;
    }
}
