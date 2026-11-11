package com.game.model;

/**
 * Model Quái (Mob - Slime) hỗ trợ đa bản đồ (world-01, world-02).
 */
public class Mob {
    public static final int DEFAULT_SLIME_HP = 40;

    private String id;
    private String kind;
    private String mapId;
    private int x;
    private int y;
    private int hp;
    private int maxHp;
    private String state; // IDLE, ATTACKING, DEAD
    private String targetId;
    private int spawnGeneration;

    private transient int homeX;
    private transient int homeY;
    private transient Long respawnReadyTick;

    public Mob(String id, String kind, String mapId, int x, int y, int maxHp) {
        this.id = id;
        this.kind = (kind != null && !kind.isEmpty()) ? kind : "SLIME";
        this.mapId = (mapId != null && !mapId.isEmpty()) ? mapId : "world-01";
        this.x = x;
        this.y = y;
        this.homeX = x;
        this.homeY = y;
        this.hp = maxHp;
        this.maxHp = maxHp;
        this.state = "IDLE";
        this.targetId = null;
        this.spawnGeneration = 1;
        this.respawnReadyTick = null;
    }

    public boolean isDead() {
        return "DEAD".equals(this.state) || this.hp <= 0;
    }

    public void incrementSpawnGeneration() {
        this.spawnGeneration += 1;
    }

    public String getId() { return id; }
    public String getKind() { return kind; }
    public String getMapId() { return mapId; }
    public void setMapId(String mapId) { this.mapId = mapId; }

    public int getX() { return x; }
    public void setX(int x) { this.x = x; }

    public int getY() { return y; }
    public void setY(int y) { this.y = y; }

    public int getHomeX() { return homeX; }
    public int getHomeY() { return homeY; }

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

    public int getSpawnGeneration() { return spawnGeneration; }
    public void setSpawnGeneration(int spawnGeneration) { this.spawnGeneration = spawnGeneration; }

    public Long getRespawnReadyTick() { return respawnReadyTick; }
    public void setRespawnReadyTick(Long respawnReadyTick) { this.respawnReadyTick = respawnReadyTick; }
}
