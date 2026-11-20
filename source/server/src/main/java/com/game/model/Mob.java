package com.game.model;

public final class Mob extends CombatEntity {
    private String kind;
    private int spawnGeneration = 1;

    private final transient String spawnZoneId;
    private final transient int homeX;
    private final transient int homeY;
    private final transient int aggroRadius;
    private final transient int leashRadius;
    private final transient int respawnSeconds;

    private transient long nextMoveTick;

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
        super(id, x, y, 40);

        this.kind = kind;
        this.spawnZoneId = spawnZoneId;
        this.homeX = x;
        this.homeY = y;
        this.aggroRadius = aggroRadius;
        this.leashRadius = leashRadius;
        this.respawnSeconds = respawnSeconds;
    }

    public String getKind() {
        return kind;
    }

    public String getSpawnZoneId() {
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

    /**
     * P4 quyết định thời điểm gọi và phát ENTITY_SPAWN.
     */
    public void respawn() {
        if (isAlive()) {
            throw new IllegalStateException("Quái đang sống.");
        }

        resetLife(homeX, homeY);
        nextMoveTick = 0;
        spawnGeneration++;
    }
}
