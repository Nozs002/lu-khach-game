package com.game.systems;

import com.game.features.movement.MoveToHandler;
import com.game.model.Item;
import com.game.model.Mob;
import com.game.model.NetworkMessage;
import com.game.model.Player;
import com.game.world.WorldContext;
import com.game.world.WorldMap;
import com.google.gson.Gson;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Random;

import static org.junit.jupiter.api.Assertions.*;

public class LootRespawnSystemTest {

    private static WorldMap loadRealWorldMap() {
        return WorldMap.loadFromResource("/maps/world.generated.json", new Gson());
    }

    @Test
    public void testChatValidationAndRateLimit() {
        WorldContext world = new WorldContext(loadRealWorldMap());
        LootRespawnSystem sys = new LootRespawnSystem(world, new Random(1L), 1.0);
        Player p1 = new Player("p-1", "Hoang", "knight", 53, 233);
        world.addPlayer(p1);

        assertFalse(sys.handleChat(p1, "   ", 1000L).isAccepted());
        assertFalse(sys.handleChat(p1, "Dong 1\nDong 2", 1000L).isAccepted());
        assertFalse(sys.handleChat(p1, "a".repeat(121), 1000L).isAccepted());

        CommandResult ok1 = sys.handleChat(p1, "  <b>Xin chao</b>  ", 2000L);
        assertTrue(ok1.isAccepted());
        List<NetworkMessage> events = world.drainPendingEvents();
        assertEquals(1, events.size());
        assertEquals("CHAT", events.get(0).type);

        // Chặn spam dưới 1000ms
        CommandResult spam = sys.handleChat(p1, "Tin thu 2", 2500L);
        assertFalse(spam.isAccepted());
        assertEquals("RATE_LIMITED", spam.getErrorCode());

        // Cho phép sau đúng 1000ms
        CommandResult ok2 = sys.handleChat(p1, "Tin thu 2 hop le", 3000L);
        assertTrue(ok2.isAccepted());
    }

    @Test
    public void testTwoPlayersLootSameItemOnlyOneSucceeds() {
        WorldContext world = new WorldContext(loadRealWorldMap());
        LootRespawnSystem sys = new LootRespawnSystem(world, new Random(1L), 1.0);

        Player p1 = new Player("p-1", "An", "knight", 53, 233);
        Player p2 = new Player("p-2", "Binh", "hunter", 54, 233);
        p1.setHp(60);
        p2.setHp(50);
        world.addPlayer(p1);
        world.addPlayer(p2);

        Item potion = world.spawnHealthPotion(53, 234, world.getCurrentTick() + LootRespawnSystem.ITEM_LIFETIME_TICKS);

        // p1 đứng khoảng cách Manhattan = 1 -> nhặt thành công
        CommandResult r1 = sys.handleLoot(p1, potion.getId());
        assertTrue(r1.isAccepted());
        assertEquals(90, p1.getHp());
        assertNull(world.getItem(potion.getId()));

        // p2 thử nhặt cùng bình máu -> ITEM_UNAVAILABLE
        CommandResult r2 = sys.handleLoot(p2, potion.getId());
        assertFalse(r2.isAccepted());
        assertEquals("ITEM_UNAVAILABLE", r2.getErrorCode());
        assertEquals(50, p2.getHp());
    }

    @Test
    public void testLootRejectsFullHpAndCapsAtMaxHp() {
        WorldContext world = new WorldContext(loadRealWorldMap());
        LootRespawnSystem sys = new LootRespawnSystem(world, new Random(1L), 1.0);

        Player p1 = new Player("p-1", "An", "knight", 53, 233);
        world.addPlayer(p1);
        Item potion = world.spawnHealthPotion(53, 233, world.getCurrentTick() + 200);

        // Full HP -> HP_FULL và bình máu không bị mất
        CommandResult fullRes = sys.handleLoot(p1, potion.getId());
        assertFalse(fullRes.isAccepted());
        assertEquals("HP_FULL", fullRes.getErrorCode());
        assertNotNull(world.getItem(potion.getId()));

        // Hồi +30 nhưng chặn theo giới hạn riêng của nhân vật.
        p1.setHp(p1.getMaxHp() - 15);
        CommandResult healRes = sys.handleLoot(p1, potion.getId());
        assertTrue(healRes.isAccepted());
        assertEquals(p1.getMaxHp(), p1.getHp());
        assertNull(world.getItem(potion.getId()));
    }

    @Test
    public void testMobDeathDropsOnceAndRespawnsAfter150Ticks() {
        WorldContext world = new WorldContext(loadRealWorldMap());
        LootRespawnSystem sys = new LootRespawnSystem(world, new Random(1L), 1.0);
        Mob slime = world.spawnMob("SLIME", "zone-1", 53, 234, Mob.DEFAULT_SLIME_HP);

        Item dropped = sys.applyDamageToMob("p-1", slime, 40);
        assertNotNull(dropped);
        assertTrue(slime.isDead());
        assertEquals(150L, slime.getRespawnReadyTick());

        // Đánh lại quái đã chết không rơi thêm bình
        Item second = sys.applyDamageToMob("p-1", slime, 40);
        assertNull(second);
        assertEquals(1, world.getItems().size());

        // Tick 149 chưa hồi sinh
        world.setCurrentTick(149L);
        sys.updateTick();
        assertTrue(slime.isDead());

        // Tick 150 hồi sinh về vị trí gốc với spawnGeneration = 2
        world.setCurrentTick(150L);
        assertTrue(sys.updateTick());
        assertFalse(slime.isDead());
        assertEquals(Mob.DEFAULT_SLIME_HP, slime.getHp());
        assertEquals(2, slime.getSpawnGeneration());
    }

    @Test
    public void testPlayerDeathBlocksMovementAndRespawnsToTiledSpawnAfter30Ticks() {
        WorldMap map = loadRealWorldMap();
        WorldContext world = new WorldContext(map);
        LootRespawnSystem sys = new LootRespawnSystem(world, new Random(1L), 1.0);
        MoveToHandler moveToHandler = new MoveToHandler(map);

        Player p1 = new Player("p-1", "Hoang", "knight", 55, 235);
        world.addPlayer(p1);

        sys.applyDamageToPlayer("m-1", p1, p1.getMaxHp());
        assertTrue(p1.isDead());
        assertEquals("DEAD", p1.getState());
        assertEquals(30L, p1.getRespawnReadyTick());

        // Khi chết không thể di chuyển
        MoveToHandler.Result moveRes = moveToHandler.handle(p1, 53, 234);
        assertFalse(moveRes.accepted());
        assertEquals("PLAYER_DEAD", moveRes.code());

        // Chưa đủ 30 tick không thể hồi sinh
        world.setCurrentTick(29L);
        CommandResult early = sys.handleRespawn(p1);
        assertFalse(early.isAccepted());
        assertEquals("RESPAWN_NOT_READY", early.getErrorCode());

        // Đủ 30 tick -> hồi sinh về điểm spawn chuẩn (53, 233) với HP tối đa.
        world.setCurrentTick(30L);
        CommandResult ok = sys.handleRespawn(p1);
        assertTrue(ok.isAccepted());
        assertFalse(p1.isDead());
        assertEquals(p1.getMaxHp(), p1.getHp());
        assertEquals("IDLE", p1.getState());
        assertEquals(53, p1.getX());
        assertEquals(233, p1.getY());
    }

    @Test
    public void testItemExpiresAfter200Ticks() {
        WorldContext world = new WorldContext(loadRealWorldMap());
        LootRespawnSystem sys = new LootRespawnSystem(world, new Random(1L), 1.0);

        Item potion = world.spawnHealthPotion(53, 233, 200L);
        world.setCurrentTick(199L);
        assertFalse(sys.updateTick());
        assertNotNull(world.getItem(potion.getId()));

        world.setCurrentTick(200L);
        assertTrue(sys.updateTick());
        assertNull(world.getItem(potion.getId()));
    }

    public static void main(String[] args) {
        LootRespawnSystemTest t = new LootRespawnSystemTest();
        t.testChatValidationAndRateLimit();
        System.out.println("[PASS] AC10 - Chat validation & rate limit");
        t.testTwoPlayersLootSameItemOnlyOneSucceeds();
        System.out.println("[PASS] AC06 - Two players loot same item once (atomic)");
        t.testLootRejectsFullHpAndCapsAtMaxHp();
        System.out.println("[PASS] AC07 - Loot rejects HP full & caps at maxHp");
        t.testMobDeathDropsOnceAndRespawnsAfter150Ticks();
        System.out.println("[PASS] AC08 - Mob death drop once & respawn after 150 ticks");
        t.testPlayerDeathBlocksMovementAndRespawnsToTiledSpawnAfter30Ticks();
        System.out.println("[PASS] AC08 - Player death blocks move & respawns to Tiled spawn (53,233) after 30 ticks");
        t.testItemExpiresAfter200Ticks();
        System.out.println("[PASS] Item expires after 200 ticks");
        System.out.println("ALL 6 PHAN-4 SERVER TEST SUITES PASSED ON TILED WORLD!");
    }
}
