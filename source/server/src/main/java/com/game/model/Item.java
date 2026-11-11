package com.game.model;

/**
 * Model Vật phẩm (Bình máu - HEALTH_POTION) hỗ trợ đa bản đồ.
 */
public class Item {
    public static final String KIND_HEALTH_POTION = "HEALTH_POTION";

    private String id;
    private String kind;
    private String mapId;
    private int x;
    private int y;
    private long expiresTick;
    private transient long createdTick;

    public Item(String id, String kind, String mapId, int x, int y, long createdTick, long expiresTick) {
        this.id = id;
        this.kind = (kind != null && !kind.isEmpty()) ? kind : KIND_HEALTH_POTION;
        this.mapId = (mapId != null && !mapId.isEmpty()) ? mapId : "world-01";
        this.x = x;
        this.y = y;
        this.createdTick = createdTick;
        this.expiresTick = expiresTick;
    }

    public String getId() { return id; }
    public String getKind() { return kind; }
    public String getMapId() { return mapId; }
    public int getX() { return x; }
    public int getY() { return y; }
    public long getCreatedTick() { return createdTick; }
    public long getExpiresTick() { return expiresTick; }
}
