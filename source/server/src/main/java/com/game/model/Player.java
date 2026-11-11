package com.game.model;

import com.game.features.movement.MovementWorld;
import com.game.features.movement.WorldMap;

/**
 * Model người chơi hoàn chỉnh tích hợp:
 * - Session & Identity từ Feature 1 (Tuấn)
 * - Authority movement & map transitions từ Feature 2 (Vũ) - implements MovementWorld.MovingEntity
 * - Combat, Health & Dead state từ Feature 3
 * - Chat, Loot & Respawn từ Feature 4 (Hoàng)
 */
public class Player implements MovementWorld.MovingEntity {
    public static final int DEFAULT_MAX_HP = 100;

    private String id;
    private String name;
    private String avatar;
    private String mapId;
    private int x;
    private int y;
    private int hp = DEFAULT_MAX_HP;
    private int maxHp = DEFAULT_MAX_HP;
    private String state = "IDLE"; // IDLE, MOVING, ATTACKING, DEAD
    private String targetId = null;
    private Long respawnReadyTick = null;

    private transient long lastChatTimestampMs = 0L;
    private transient long lastRequestId = 0L;
    private transient long lastAttackTick = -10L;

    public Player(String id, String name, String avatar, String mapId, int x, int y) {
        this.id = id;
        this.name = name;
        this.avatar = (avatar != null && !avatar.isEmpty()) ? avatar : "knight";
        this.mapId = (mapId != null && !mapId.isEmpty()) ? mapId : "world-01";
        this.x = x;
        this.y = y;
    }

    public Player(String id, String name, String avatar, int x, int y) {
        this(id, name, avatar, "world-01", x, y);
    }

    // --- Triển khai MovementWorld.MovingEntity của Feature 2 (Vũ) ---
    @Override
    public String id() {
        return id;
    }

    @Override
    public String mapId() {
        return mapId;
    }

    @Override
    public WorldMap.Tile tile() {
        return new WorldMap.Tile(x, y);
    }

    @Override
    public boolean alive() {
        return !isDead();
    }

    @Override
    public void place(String newMapId, WorldMap.Tile tile) {
        this.mapId = newMapId;
        this.x = tile.x();
        this.y = tile.y();
    }

    @Override
    public void moving(boolean isMoving) {
        if (!isDead()) {
            this.state = isMoving ? "MOVING" : "IDLE";
        }
    }

    // --- Các hàm nghiệp vụ gameplay ---
    public boolean isDead() {
        return "DEAD".equals(this.state) || this.hp <= 0;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getAvatar() { return avatar; }
    public String getMapId() { return mapId; }
    public void setMapId(String mapId) { this.mapId = mapId; }

    public int getX() { return x; }
    public void setX(int x) { this.x = x; }

    public int getY() { return y; }
    public void setY(int y) { this.y = y; }

    public int getGridX() { return x; }
    public int getGridY() { return y; }
    public void setGridPosition(int gx, int gy, int tileSize) {
        this.x = gx;
        this.y = gy;
    }

    public int getHp() { return hp; }
    public void setHp(int hp) {
        this.hp = Math.max(0, Math.min(this.maxHp, hp));
    }

    public int getMaxHp() { return maxHp; }
    public void setMaxHp(int maxHp) { this.maxHp = maxHp; }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }

    public String getTargetId() { return targetId; }
    public void setTargetId(String targetId) { this.targetId = targetId; }

    public Long getRespawnReadyTick() { return respawnReadyTick; }
    public void setRespawnReadyTick(Long respawnReadyTick) { this.respawnReadyTick = respawnReadyTick; }

    public long getLastChatTimestampMs() { return lastChatTimestampMs; }
    public void setLastChatTimestampMs(long lastChatTimestampMs) { this.lastChatTimestampMs = lastChatTimestampMs; }

    public long getLastRequestId() { return lastRequestId; }
    public void setLastRequestId(long lastRequestId) { this.lastRequestId = lastRequestId; }

    public long getLastAttackTick() { return lastAttackTick; }
    public void setLastAttackTick(long lastAttackTick) { this.lastAttackTick = lastAttackTick; }
}
