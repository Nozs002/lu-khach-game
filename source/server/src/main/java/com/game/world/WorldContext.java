package com.game.world;

import com.game.model.Item;
import com.game.model.MapData;
import com.game.model.Mob;
import com.game.model.NetworkMessage;
import com.game.model.Player;
import com.game.model.WorldState;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * WorldContext theo đúng hợp đồng Mục 7 docs/protocol-v1.md:
 * - Cung cấp tick, map, getPlayer/getMob/getItem, add/remove entity và emit event.
 * - Có sẵn dữ liệu giả định (Fake World / Fixtures) để Phần 4 chạy và test độc lập không cần chờ P2, P3.
 */
public class WorldContext {
    public static final long ITEM_DEFAULT_LIFETIME_TICKS = 200L; // 20 giây (10 tick/s)

    private long currentTick = 0L;
    private final MapData map;
    private final Map<String, Player> playersById = new LinkedHashMap<>();
    private final Map<String, Mob> mobsById = new LinkedHashMap<>();
    private final Map<String, Item> itemsById = new LinkedHashMap<>();
    private final List<NetworkMessage> pendingEvents = new ArrayList<>();
    private final AtomicInteger itemIdGenerator = new AtomicInteger(0);
    private final AtomicInteger playerSpawnCounter = new AtomicInteger(0);

    public WorldContext(MapData map) {
        this.map = map != null ? map : MapData.createDefaultStartingValley();
    }

    /**
     * Khởi tạo Fake World với dữ liệu giả định chuẩn theo docs/game-design.md & docs/protocol-v1.md:
     * - Bản đồ starting-valley 32x24, safeZone (2,2,6,6)
     * - 5 con quái Slime (m-1 .. m-5, HP 40/40)
     * - 2 bình máu mẫu (i-1, i-2) đặt gần khu an toàn để người chơi thử nhặt ngay khi vào game
     */
    public static WorldContext createDefaultFixtureWorld() {
        WorldContext ctx = new WorldContext(MapData.createDefaultStartingValley());

        // 5 quái Slime giả định theo đúng bảng thông số Mục 6 game-design.md
        ctx.addMob(new Mob("m-1", "SLIME", 9, 4, Mob.DEFAULT_SLIME_HP));
        ctx.addMob(new Mob("m-2", "SLIME", 12, 6, Mob.DEFAULT_SLIME_HP));
        ctx.addMob(new Mob("m-3", "SLIME", 15, 10, Mob.DEFAULT_SLIME_HP));
        ctx.addMob(new Mob("m-4", "SLIME", 11, 14, Mob.DEFAULT_SLIME_HP));
        ctx.addMob(new Mob("m-5", "SLIME", 19, 8, Mob.DEFAULT_SLIME_HP));

        // 2 bình máu mẫu để test nhặt đồ ngay lập tức
        ctx.spawnHealthPotion(6, 4, ITEM_DEFAULT_LIFETIME_TICKS);
        ctx.spawnHealthPotion(8, 5, ITEM_DEFAULT_LIFETIME_TICKS);
        ctx.drainPendingEvents(); // Xóa event khởi tạo ban đầu

        return ctx;
    }

    public synchronized long getCurrentTick() {
        return currentTick;
    }

    public synchronized long advanceTick() {
        currentTick += 1;
        return currentTick;
    }

    public synchronized void setCurrentTick(long tick) {
        this.currentTick = Math.max(0L, tick);
    }

    public MapData getMap() {
        return map;
    }

    public synchronized MapData.GridPoint nextSafeSpawnPoint() {
        return map.pickPlayerSpawn(playerSpawnCounter.getAndIncrement());
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

    public synchronized void addItem(Item item) {
        itemsById.put(item.getId(), item);
    }

    public synchronized Item getItem(String itemId) {
        return itemsById.get(itemId);
    }

    public synchronized Item removeItem(String itemId) {
        return itemsById.remove(itemId);
    }

    public synchronized Collection<Item> getItems() {
        return new ArrayList<>(itemsById.values());
    }

    public synchronized WorldState createSnapshot() {
        return new WorldState(getPlayers(), getMobs(), getItems());
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
