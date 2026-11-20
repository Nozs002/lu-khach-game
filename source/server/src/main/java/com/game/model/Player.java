package com.game.model;

import java.awt.Point;
import java.util.ArrayDeque;
import java.util.Collection;
import java.util.Queue;

public class Player {
    public static final int DEFAULT_MAX_HP = 100;

    private String id;
    private String name;
    private String characterId;
    private int x;
    private int y;
    private int hp = DEFAULT_MAX_HP;
    private int maxHp = DEFAULT_MAX_HP;
    private String state = "IDLE";
    private Long respawnReadyTick = null;

    private transient Queue<Point> path = new ArrayDeque<>();
    private transient long lastChatTimestampMs = 0L;

    public Player(String id, String name, String characterId, int x, int y) {
        this.id = id;
        this.name = name;
        this.characterId = characterId;
        this.x = x;
        this.y = y;
        this.hp = DEFAULT_MAX_HP;
        this.maxHp = DEFAULT_MAX_HP;
        this.state = "IDLE";
        this.respawnReadyTick = null;
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

    public synchronized void setPosition(int x, int y) {
        this.x = x;
        this.y = y;
    }

    public int getHp() {
        return hp;
    }

    public void setHp(int hp) {
        this.hp = Math.max(0, Math.min(maxHp, hp));
    }

    public int getMaxHp() {
        return maxHp;
    }

    public void setMaxHp(int maxHp) {
        this.maxHp = Math.max(1, maxHp);
        if (this.hp > this.maxHp) {
            this.hp = this.maxHp;
        }
    }

    public String getState() {
        return state;
    }

    public void setState(String state) {
        this.state = state;
    }

    public boolean isDead() {
        return "DEAD".equals(this.state) || this.hp <= 0;
    }

    public Long getRespawnReadyTick() {
        return respawnReadyTick;
    }

    public void setRespawnReadyTick(Long respawnReadyTick) {
        this.respawnReadyTick = respawnReadyTick;
    }

    public long getLastChatTimestampMs() {
        return lastChatTimestampMs;
    }

    public void setLastChatTimestampMs(long lastChatTimestampMs) {
        this.lastChatTimestampMs = lastChatTimestampMs;
    }

    public synchronized void clearPath() {
        path.clear();
        if (!isDead()) {
            state = "IDLE";
        }
    }

    public synchronized void setPath(Collection<Point> points) {
        path.clear();
        if (isDead()) {
            return;
        }
        for (Point point : points) {
            path.add(new Point(point));
        }
        state = path.isEmpty() ? "IDLE" : "MOVING";
    }

    public synchronized boolean advanceOneStep() {
        if (isDead()) {
            path.clear();
            return false;
        }
        Point next = path.poll();
        if (next == null) {
            if ("MOVING".equals(state)) {
                state = "IDLE";
            }
            return false;
        }
        x = next.x;
        y = next.y;
        state = path.isEmpty() ? "IDLE" : "MOVING";
        return true;
    }
}
