package com.game.world;

import com.game.features.movement.MapLoader;
import com.game.features.movement.MovementModule;
import com.game.features.movement.MovementWorld;
import com.game.features.movement.WorldMap;
import com.game.model.Item;
import com.game.model.Mob;
import com.game.model.NetworkMessage;
import com.game.model.Player;
import com.game.model.WorldState;

import java.io.File;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * WorldContext tổng hợp:
 * - Quản lý thế giới authoritative, đa bản đồ (world-01, world-02)
 * - Triển khai MovementWorld để gắn kết MovementModule của Feature 2 (Vũ)
 * - Quản lý thực thể người chơi, quái Slime và bình máu của Feature 3 & 4
 */
public class WorldContext implements MovementWorld {
    public static final long ITEM_DEFAULT_LIFETIME_TICKS = 200L;

    private long currentTick = 0L;
    private final Map<String, WorldMap> maps = new LinkedHashMap<>();
    private final MovementModule movementModule;

    private final Map<String, Player> playersById = new ConcurrentHashMap<>();
    private final Map<String, Mob> mobsById = new ConcurrentHashMap<>();
    private final Map<String, Item> itemsById = new ConcurrentHashMap<>();
    private final List<NetworkMessage> pendingEvents = new ArrayList<>();

    private final AtomicInteger itemIdGenerator = new AtomicInteger(0);
    private final AtomicInteger mobIdGenerator = new AtomicInteger(0);

    public WorldContext() {
        loadMaps();
        this.movementModule = new MovementModule(this, this.maps);
        spawnInitialMobs();
    }

    public static WorldContext createDefaultFixtureWorld() {
        return new WorldContext();
    }

    private void loadMaps() {
        String[] mapIds = {"world-01", "world-02"};
        String[] possibleBaseDirs = {
            "source/common/maps",
            "../common/maps",
            "common/maps",
            "../../common/maps",
            "src/main/resources/maps"
        };

        for (String id : mapIds) {
            boolean loaded = false;
            for (String baseDir : possibleBaseDirs) {
                Path p = Paths.get(baseDir, id + ".json");
                if (new File(p.toString()).exists()) {
                    try {
                        WorldMap map = MapLoader.load(p);
                        maps.put(id, map);
                        loaded = true;
                        break;
                    } catch (Exception e) {
                        System.err.println("Lỗi nạp map " + p + ": " + e.getMessage());
                    }
                }
            }
            if (!loaded) {
                System.err.println("CẢNH BÁO: Không tìm thấy file map " + id + ".json trong các đường dẫn mẫu.");
            }
        }

        if (maps.size() == 2) {
            WorldMap.validateWorld(maps);
        }
    }

    private void spawnInitialMobs() {
        // Quái trên world-01 (các ô hợp lệ ngoài SafeZone 2..6, 2..5)
        int[][] world01MobSpawns = {
            {9, 4}, {12, 6}, {18, 10}, {11, 14}, {22, 8}
        };
        for (int[] pos : world01MobSpawns) {
            String mid = "m-" + mobIdGenerator.incrementAndGet();
            mobsById.put(mid, new Mob(mid, "SLIME", "world-01", pos[0], pos[1], Mob.DEFAULT_SLIME_HP));
        }

        // Quái trên world-02
        int[][] world02MobSpawns = {
            {8, 6}, {14, 8}, {18, 12}, {10, 16}, {22, 10}
        };
        for (int[] pos : world02MobSpawns) {
            String mid = "m-" + mobIdGenerator.incrementAndGet();
            mobsById.put(mid, new Mob(mid, "SLIME", "world-02", pos[0], pos[1], Mob.DEFAULT_SLIME_HP));
        }
    }

    // --- Triển khai MovementWorld (Feature 2) ---
    @Override
    public MovementWorld.MovingEntity player(String sessionPlayerId) {
        return playersById.get(sessionPlayerId);
    }

    public MovementModule getMovementModule() {
        return movementModule;
    }

    public Map<String, WorldMap> getMaps() {
        return maps;
    }

    public WorldMap getMap() {
        return maps.getOrDefault("world-01", maps.values().iterator().hasNext() ? maps.values().iterator().next() : null);
    }

    public WorldMap getMap(String mapId) {
        return maps.get(mapId);
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

    public synchronized Item spawnHealthPotion(String mapId, int x, int y, long expiresTick) {
        String id = "i-" + itemIdGenerator.incrementAndGet();
        Item item = new Item(id, Item.KIND_HEALTH_POTION, mapId, x, y, currentTick, expiresTick);
        itemsById.put(id, item);
        return item;
    }

    public synchronized Item spawnHealthPotion(int x, int y, long expiresTick) {
        return spawnHealthPotion("world-01", x, y, expiresTick);
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
