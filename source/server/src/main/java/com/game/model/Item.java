package com.game.model;

/**
 * Model Vật phẩm (Item - HEALTH_POTION) theo đúng đặc tả docs/protocol-v1.md (Mục 4) và docs/game-design.md (Mục 8).
 */
public class Item {
    public static final String KIND_HEALTH_POTION = "HEALTH_POTION";

    private String id;
    private String kind;
    private int x;
    private int y;
    private long expiresTick;
    private transient long createdTick;

    public Item(String id, String kind, int x, int y, long createdTick, long expiresTick) {
        this.id = id;
        this.kind = (kind != null && !kind.isEmpty()) ? kind : KIND_HEALTH_POTION;
        this.x = x;
        this.y = y;
        this.createdTick = createdTick;
        this.expiresTick = expiresTick;
    }

    public String getId() { return id; }
    public String getKind() { return kind; }
    public int getX() { return x; }
    public int getY() { return y; }
    public long getCreatedTick() { return createdTick; }
    public long getExpiresTick() { return expiresTick; }
}
