package com.game.model;

/**
 * Model người chơi dùng chung cho cả giao thức P1 (origin/tuan) và giao thức chuẩn protocol-v1.md (P4).
 */
public class Player {
    public static final int DEFAULT_MAX_HP = 100;
    public static final int DEFAULT_TILE_SIZE = 24;

    private String id;
    private String name;
    private String avatar;

    // Tọa độ ô lưới chuẩn theo protocol-v1.md (32 x 24 ô)
    private int x;
    private int y;

    // Tọa độ pixel để tương thích ngược với nhánh P1 nếu cần
    private float pixelX;
    private float pixelY;
    private float speed = 4.0f;

    // Các trường trạng thái sinh tồn / chiến đấu / hồi sinh theo protocol-v1.md
    private int hp = DEFAULT_MAX_HP;
    private int maxHp = DEFAULT_MAX_HP;
    private String state = "IDLE"; // IDLE, MOVING, ATTACKING, DEAD
    private String targetId = null;
    private Long respawnReadyTick = null;

    // Trường nội bộ server (transient để không gửi dư xuống snapshot client)
    private transient long lastChatTimestampMs = 0L;
    private transient long lastRequestId = 0L;
    private transient long lastAttackTick = -10L;

    public Player(String id, String name, String avatar, int gridX, int gridY) {
        this.id = id;
        this.name = name;
        this.avatar = (avatar != null && !avatar.isEmpty()) ? avatar : "knight";
        setGridPosition(gridX, gridY, DEFAULT_TILE_SIZE);
    }

    public Player(String id, String name, String avatar, float pixelX, float pixelY) {
        this.id = id;
        this.name = name;
        this.avatar = (avatar != null && !avatar.isEmpty()) ? avatar : "knight";
        this.pixelX = pixelX;
        this.pixelY = pixelY;
        this.x = Math.max(1, Math.min(30, Math.round(pixelX / DEFAULT_TILE_SIZE)));
        this.y = Math.max(1, Math.min(22, Math.round(pixelY / DEFAULT_TILE_SIZE)));
    }

    public void setGridPosition(int gridX, int gridY, int tileSize) {
        this.x = gridX;
        this.y = gridY;
        this.pixelX = gridX * tileSize;
        this.pixelY = gridY * tileSize;
    }

    public void move(float dx, float dy) {
        if ("DEAD".equals(this.state)) {
            return;
        }
        this.pixelX += dx * speed;
        this.pixelY += dy * speed;
        this.x = Math.max(1, Math.min(30, Math.round(this.pixelX / DEFAULT_TILE_SIZE)));
        this.y = Math.max(1, Math.min(22, Math.round(this.pixelY / DEFAULT_TILE_SIZE)));
        this.state = (dx != 0 || dy != 0) ? "MOVING" : "IDLE";
    }

    public boolean isDead() {
        return "DEAD".equals(this.state) || this.hp <= 0;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getAvatar() { return avatar; }

    public int getX() { return x; }
    public int getY() { return y; }
    public int getGridX() { return x; }
    public int getGridY() { return y; }

    public float getPixelX() { return pixelX; }
    public float getPixelY() { return pixelY; }

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
