package com.game.model;

/**
 * Mô hình quái vật trên bản đồ thế giới (sẵn sàng ghép nối với Phần 3: monsterSpawns & combat).
 */
public class Mob {
    public static final int DEFAULT_SLIME_HP = 40;

    private final String id;
    private final String kind;
    private final String zoneId;
    private int x;
    private int y;
    private final transient int homeX;
    private final transient int homeY;
    private int hp;
    private final int maxHp;
    private String state = "IDLE";
    private String targetId = null;
    private int spawnGeneration = 1;
    private transient Long respawnReadyTick = null;

    public Mob(String id, String kind, int x, int y, int maxHp) {
        this(id, kind, null, x, y, maxHp);
    }

    public Mob(String id, String kind, String zoneId, int x, int y, int maxHp) {
        this.id = id;
        this.kind = kind;
        this.zoneId = zoneId;
        this.x = x;
        this.y = y;
        this.homeX = x;
        this.homeY = y;
        this.hp = maxHp;
        this.maxHp = maxHp;
    }

    public String getId() {
        return id;
    }

    public String getKind() {
        return kind;
    }

    public String getZoneId() {
        return zoneId;
    }

    public int getX() {
        return x;
    }

    public void setX(int x) {
        this.x = x;
    }

    public int getY() {
        return y;
    }

    public void setY(int y) {
        this.y = y;
    }

    public int getHomeX() {
        return homeX;
    }

    public int getHomeY() {
        return homeY;
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

    public String getState() {
        return state;
    }

    public void setState(String state) {
        this.state = state;
    }

    public boolean isDead() {
        return "DEAD".equals(this.state) || this.hp <= 0;
    }

    public String getTargetId() {
        return targetId;
    }

    public void setTargetId(String targetId) {
        this.targetId = targetId;
    }

    public int getSpawnGeneration() {
        return spawnGeneration;
    }

    public void incrementSpawnGeneration() {
        this.spawnGeneration++;
    }

    public Long getRespawnReadyTick() {
        return respawnReadyTick;
    }

    public void setRespawnReadyTick(Long respawnReadyTick) {
        this.respawnReadyTick = respawnReadyTick;
    }
}
