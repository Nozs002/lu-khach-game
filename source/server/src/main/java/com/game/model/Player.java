package com.game.model;

import java.awt.Point;
import java.util.ArrayDeque;
import java.util.Collection;
import java.util.Queue;

public class Player extends CombatEntity {
    public static final int DEFAULT_MAX_HP = 100;

    private String name;
    private String characterId;
    private final int damage;
    private final int armor;
    private Long respawnReadyTick;
    private transient Queue<Point> path = new ArrayDeque<>();
    private transient long lastChatTimestampMs;

    public Player(String id, String name, String characterId, int x, int y) {
        super(id, x, y, CharacterCatalog.forCharacter(characterId).maxHp());
        this.name = name;
        this.characterId = CharacterCatalog.resolveId(characterId);
        CharacterCatalog.Stats stats = CharacterCatalog.forCharacter(this.characterId);
        this.damage = stats.damage();
        this.armor = stats.armor();
    }

    public String getId() {
        return id;
    }

    public int getDamage() {
        return damage;
    }

    public int getArmor() {
        return armor;
    }

    public String getName() {
        return name;
    }

    public String getCharacterId() {
        return characterId;
    }

    public boolean isDead() {
        return !isAlive();
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

    public synchronized void setPath(Collection<Point> points) {
        path.clear();
        if (!isAlive()) {
            return;
        }
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
        if (isAlive()) {
            state = "IDLE";
        }
    }

    public synchronized boolean advanceOneStep() {
        if (!isAlive()) {
            path.clear();
            return false;
        }
        Point next = path.poll();
        if (next == null) {
            if (targetId == null) {
                state = "IDLE";
            }
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
