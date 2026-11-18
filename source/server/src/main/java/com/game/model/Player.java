package com.game.model;

public class Player {
    private String id;
    private String name;
    private String characterId;
    private float x;
    private float y;
    private float speed = 4.0f;

    public Player(String id, String name, String characterId, float x, float y) {
        this.id = id;
        this.name = name;
        this.characterId = characterId;
        this.x = x;
        this.y = y;
    }

    private transient long lastMoveNanos;

    public synchronized boolean move(float dx, float dy) {
        if (!((Math.abs(dx) == 1 && dy == 0) || (dx == 0 && Math.abs(dy) == 1))) return false;
        long now = System.nanoTime();
        if (now - lastMoveNanos < 120_000_000L) return false;
        int nextX = Math.round(x / StartMap.TILE_SIZE) + (int) dx;
        int nextY = Math.round(y / StartMap.TILE_SIZE) + (int) dy;
        if (!StartMap.isWalkable(nextX, nextY)) return false;
        x = nextX * StartMap.TILE_SIZE;
        y = nextY * StartMap.TILE_SIZE;
        lastMoveNanos = now;
        return true;
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

    public float getX() {
        return x;
    }

    public float getY() {
        return y;
    }
}