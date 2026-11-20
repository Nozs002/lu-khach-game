package com.game.model;

public final class Mob extends CombatEntity {
    public static final int DEFAULT_SLIME_HP = 40;
    private final String kind;
    private int spawnGeneration = 1;

    private final transient String spawnZoneId;
    private final transient int homeX;
    private final transient int homeY;
    private final transient int aggroRadius;
    private final transient int leashRadius;
    private final transient int respawnSeconds;

    private transient long nextMoveTick;
    private transient Long respawnReadyTick;

    public Mob(
            String id,
            String kind,
            String spawnZoneId,
            int x,
            int y,
            int aggroRadius,
            int leashRadius,
            int respawnSeconds
    ) {
        super(id, x, y, DEFAULT_SLIME_HP);
        this.kind = kind;
        this.spawnZoneId = spawnZoneId;
        this.homeX = x;
        this.homeY = y;
        this.aggroRadius = aggroRadius;
        this.leashRadius = leashRadius;
        this.respawnSeconds = respawnSeconds;
    }

    public Mob(String id, String kind, String zoneId, int x, int y, int maxHp) {
        super(id, x, y, maxHp);
        this.kind = kind;
        this.spawnZoneId = zoneId;
        this.homeX = x;
        this.homeY = y;
        this.aggroRadius = 0;
        this.leashRadius = 0;
        this.respawnSeconds = 15;
    }

    public String getKind() {
        return kind;
    }

    public String getSpawnZoneId() {
        return spawnZoneId;
    }

    public String getZoneId() {
        return spawnZoneId;
    }

    public int getHomeX() {
        return homeX;
    }

    public int getHomeY() {
        return homeY;
    }

    public int getAggroRadius() {
        return aggroRadius;
    }

    public int getLeashRadius() {
        return leashRadius;
    }

    public int getRespawnSeconds() {
        return respawnSeconds;
    }

    public int getSpawnGeneration() {
        return spawnGeneration;
    }

    public void incrementSpawnGeneration() {
        spawnGeneration++;
    }

    public Long getRespawnReadyTick() {
        return respawnReadyTick;
    }

    public void setRespawnReadyTick(Long respawnReadyTick) {
        this.respawnReadyTick = respawnReadyTick;
    }

    public boolean isDead() {
        return !isAlive();
    }

    public boolean canMove(long tick) {
        return tick >= nextMoveTick;
    }

    public void consumeMoveCooldown(long tick) {
        nextMoveTick = tick + 4;
    }

    @Override
    public void clearPath() {
        // Quái tính bước kế tiếp trong MobAISystem.
    }

    public void respawn() {
        if (isAlive()) {
            throw new IllegalStateException("Quái đang sống.");
        }
        resetLife(homeX, homeY);
        nextMoveTick = 0;
        respawnReadyTick = null;
        spawnGeneration++;
    }
}
