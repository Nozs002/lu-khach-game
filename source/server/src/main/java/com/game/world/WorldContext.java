package com.game.world;

import com.game.model.Item;
import com.game.model.Mob;
import com.game.model.NetworkMessage;
import com.game.model.Player;

import java.awt.Point;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Ngữ cảnh trạng thái thế giới dùng chung trên máy chủ authoritative (dựa trực tiếp trên WorldMap Tiled).
 */
public class WorldContext {
    private final WorldMap worldMap;
    private long currentTick = 0L;

    private final Map<String, Player> playersById = new ConcurrentHashMap<>();
    private final Map<String, Mob> mobsById = new ConcurrentHashMap<>();
    private final Map<String, Item> itemsById = new ConcurrentHashMap<>();
    private final List<NetworkMessage> pendingEvents = new ArrayList<>();

    private final AtomicInteger itemIdGenerator = new AtomicInteger(0);
    private final AtomicInteger mobIdGenerator = new AtomicInteger(0);

    public WorldContext(WorldMap worldMap) {
        if (worldMap == null) {
            throw new IllegalArgumentException("WorldMap không được null.");
        }
        this.worldMap = worldMap;
    }

    public WorldMap getWorldMap() {
        return worldMap;
    }

    public synchronized long getCurrentTick() {
        return currentTick;
    }

    public synchronized long advanceTick() {
        currentTick += 1L;
        return currentTick;
    }

    public synchronized void setCurrentTick(long tick) {
        this.currentTick = Math.max(0L, tick);
    }

    public synchronized void addPlayer(Player player) {
        playersById.put(player.getId(), player);
    }

    public synchronized Player removePlayer(String playerId) {
        return playersById.remove(playerId);
    }

    public synchronized Player getPlayer(String playerId) {
        return playersById.get(playerId);
    }

    public synchronized Collection<Player> getPlayers() {
        return new ArrayList<>(playersById.values());
    }

    public synchronized Point findRespawnTile(String respawningPlayerId) {
        List<Player> others = new ArrayList<>();
        for (Player p : playersById.values()) {
            if (!p.getId().equals(respawningPlayerId)) {
                others.add(p);
            }
        }
        return worldMap.availableSpawnTile(others);
    }

    public synchronized Mob spawnMob(String kind, String zoneId, int x, int y, int maxHp) {
        String id = "m-" + mobIdGenerator.incrementAndGet();
        Mob mob = new Mob(id, kind, zoneId, x, y, maxHp);
        mobsById.put(id, mob);
        return mob;
    }

    public synchronized void addMob(Mob mob) {
        mobsById.put(mob.getId(), mob);
    }

    public synchronized Mob getMob(String mobId) {
        return mobsById.get(mobId);
    }

    public synchronized Collection<Mob> getMobs() {
        return new ArrayList<>(mobsById.values());
    }

    public synchronized Item spawnHealthPotion(int x, int y, long expiresTick) {
        String id = "i-" + itemIdGenerator.incrementAndGet();
        Item item = new Item(id, Item.KIND_HEALTH_POTION, x, y, currentTick, expiresTick);
        itemsById.put(id, item);
        return item;
    }

    /**
     * Tìm ô đi được ngay tại (x, y) hoặc ô kề gần nhất (Manhattan <= 1) để thả vật phẩm hợp lệ trên bản đồ Tiled.
     */
    public synchronized Point findDropTileNear(int x, int y) {
        int[][] candidates = {{0, 0}, {0, 1}, {1, 0}, {0, -1}, {-1, 0}};
        for (int[] offset : candidates) {
            int nx = x + offset[0];
            int ny = y + offset[1];
            if (worldMap.isWalkable(nx, ny)) {
                return new Point(nx, ny);
            }
        }
        return new Point(x, y);
    }

    public synchronized Item getItem(String itemId) {
        return itemsById.get(itemId);
    }

    public synchronized Item removeItem(String itemId) {
        return itemsById.remove(itemId);
    }

    public synchronized List<Item> getItems() {
        return new ArrayList<>(itemsById.values());
    }

    public synchronized void emitEvent(String type, Object payload) {
        pendingEvents.add(NetworkMessage.event(type, currentTick, payload));
    }

    public synchronized List<NetworkMessage> drainPendingEvents() {
        List<NetworkMessage> copy = new ArrayList<>(pendingEvents);
        pendingEvents.clear();
        return copy;
    }
}
