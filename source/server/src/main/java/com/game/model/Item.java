package com.game.model;

public class Item {
    public static final String KIND_HEALTH_POTION = "HEALTH_POTION";

    private final String id;
    private final String kind;
    private final int x;
    private final int y;
    private final long expiresTick;
    private final transient long createdTick;

    public Item(String id, String kind, int x, int y, long createdTick, long expiresTick) {
        this.id = id;
        this.kind = kind;
        this.x = x;
        this.y = y;
        this.createdTick = createdTick;
        this.expiresTick = expiresTick;
    }

    public String getId() {
        return id;
    }

    public String getKind() {
        return kind;
    }

    public int getX() {
        return x;
    }

    public int getY() {
        return y;
    }

    public long getCreatedTick() {
        return createdTick;
    }

    public long getExpiresTick() {
        return expiresTick;
    }
}
