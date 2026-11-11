package com.game.systems;

import com.game.model.Item;
import com.game.model.Mob;
import com.game.model.NetworkMessage;
import com.game.model.Player;
import com.game.world.WorldContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Random;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Bộ kiểm thử tự động cho toàn bộ Phần 4 (Hoàng):
 * - Chat (trim, 1..120 ký tự, 1 dòng, rate-limit 1 tin/giây, chat khi đang DEAD)
 * - Rơi bình máu (50% xác suất khi quái chết, chỉ rơi 1 lần mỗi vòng đời, hạn 200 ticks)
 * - Nhặt một lần & Hồi máu (AC06: 2 người cùng nhặt chỉ 1 người được +30 HP; AC07: đầy máu trả HP_FULL và giữ item)
 * - Hồi sinh Player & Quái (AC08: player chờ 30 ticks về safeZone đầy HP; quái chờ 150 ticks về home tăng spawnGeneration)
 */
public class LootRespawnSystemTest {
    private WorldContext world;
    private LootRespawnSystem system;

    @BeforeEach
    void setUp() {
        world = WorldContext.createDefaultFixtureWorld();
        // Khởi tạo với Random cố định để kiểm soát kịch bản rơi đồ
        system = new LootRespawnSystem(world, new Random(42L), 1.0);
    }

    @Test
    @DisplayName("AC10 - Chat hợp lệ, cắt khoảng trắng, chặn nhiều dòng và chặn spam 1 tin/giây")
    void testChatValidationAndRateLimit() {
        Player p1 = new Player("p-1", "Hoang", "knight", 4, 4);
        world.addPlayer(p1);

        // 1. Chat rỗng sau khi trim -> INVALID_MESSAGE
        CommandResult emptyRes = system.handleChat(p1, "   ", 1000L);
        assertFalse(emptyRes.isAccepted());
        assertEquals("INVALID_MESSAGE", emptyRes.getErrorCode());

        // 2. Chat nhiều dòng -> INVALID_MESSAGE
        CommandResult multiLineRes = system.handleChat(p1, "Xin chao\nanh em", 1000L);
        assertFalse(multiLineRes.isAccepted());
        assertEquals("INVALID_MESSAGE", multiLineRes.getErrorCode());

        // 3. Chat quá 120 Unicode code points -> INVALID_MESSAGE
        String tooLong = "a".repeat(121);
        CommandResult longRes = system.handleChat(p1, tooLong, 1000L);
        assertFalse(longRes.isAccepted());
        assertEquals("INVALID_MESSAGE", longRes.getErrorCode());

        // 4. Chat hợp lệ (có khoảng trắng hai đầu và chứa thẻ HTML để kiểm tra giữ nguyên text)
        CommandResult okRes = system.handleChat(p1, "  <b>Xin chào cả nhóm!</b>  ", 2000L);
        assertTrue(okRes.isAccepted());
        assertEquals("CHAT", okRes.getCommandType());

        List<NetworkMessage> events = world.drainPendingEvents();
        assertEquals(1, events.size());
        assertEquals("CHAT", events.get(0).type);
        @SuppressWarnings("unchecked")
        Map<String, Object> payload = (Map<String, Object>) events.get(0).payload;
        assertEquals("p-1", payload.get("playerId"));
        assertEquals("Hoang", payload.get("name"));
        assertEquals("<b>Xin chào cả nhóm!</b>", payload.get("text"));

        // 5. Gửi tiếp tin thứ 2 sau 300ms (< 1000ms) -> RATE_LIMITED
        CommandResult spamRes = system.handleChat(p1, "Tin nhắn spam", 2300L);
        assertFalse(spamRes.isAccepted());
        assertEquals("RATE_LIMITED", spamRes.getErrorCode());

        // 6. Gửi lại sau 1000ms -> Hợp lệ
        CommandResult afterCooldownRes = system.handleChat(p1, "Tin nhắn hợp lệ tiếp theo", 3000L);
        assertTrue(afterCooldownRes.isAccepted());
    }

    @Test
    @DisplayName("AC06 - Hai người chơi cùng LOOT một bình máu: chỉ người đầu nhận +30 HP, người sau nhận ITEM_UNAVAILABLE")
    void testTwoPlayersLootSameItemOnce() {
        Item potion = world.spawnHealthPotion(5, 5, 200L);
        world.drainPendingEvents();

        Player p1 = new Player("p-1", "Hoang", "knight", 5, 5); // Đứng cùng ô (Manhattan = 0)
        p1.setHp(60);
        Player p2 = new Player("p-2", "Tuan", "hunter", 6, 5);  // Đứng ô kề cạnh (Manhattan = 1)
        p2.setHp(50);
        world.addPlayer(p1);
        world.addPlayer(p2);

        // Người 1 nhặt trước -> thành công, HP tăng từ 60 -> 90, bình máu biến mất
        CommandResult res1 = system.handleLoot(p1, potion.getId());
        assertTrue(res1.isAccepted());
        assertEquals("LOOT", res1.getCommandType());
        assertEquals(90, p1.getHp());
        assertNull(world.getItem(potion.getId()));

        // Người 2 nhặt ngay sau đó -> thất bại với ITEM_UNAVAILABLE, HP giữ nguyên 50
        CommandResult res2 = system.handleLoot(p2, potion.getId());
        assertFalse(res2.isAccepted());
        assertEquals("ITEM_UNAVAILABLE", res2.getErrorCode());
        assertEquals(50, p2.getHp());
    }

    @Test
    @DisplayName("AC07 - Nhặt khi đầy máu (100/100) trả HP_FULL, giữ nguyên bình máu; hồi máu không vượt 100")
    void testLootWhenHpFullAndCapAtMaxHp() {
        Item potion = world.spawnHealthPotion(5, 5, 200L);

        Player p1 = new Player("p-1", "Hoang", "knight", 5, 5);
        p1.setHp(100); // Đầy máu
        world.addPlayer(p1);

        // 1. Nhặt khi HP = 100 -> HP_FULL, bình máu vẫn còn nguyên trong world
        CommandResult fullRes = system.handleLoot(p1, potion.getId());
        assertFalse(fullRes.isAccepted());
        assertEquals("HP_FULL", fullRes.getErrorCode());
        assertNotNull(world.getItem(potion.getId()));

        // 2. Khi đứng xa (Manhattan = 2) -> OUT_OF_RANGE
        p1.setHp(85);
        p1.setGridPosition(7, 5, 24);
        CommandResult farRes = system.handleLoot(p1, potion.getId());
        assertFalse(farRes.isAccepted());
        assertEquals("OUT_OF_RANGE", farRes.getErrorCode());
        assertNotNull(world.getItem(potion.getId()));

        // 3. Lại gần (Manhattan = 1) khi HP = 85 -> Hồi +30 nhưng chặn trần ở 100
        p1.setGridPosition(6, 5, 24);
        CommandResult okRes = system.handleLoot(p1, potion.getId());
        assertTrue(okRes.isAccepted());
        assertEquals(100, p1.getHp());
        assertNull(world.getItem(potion.getId()));
    }

    @Test
    @DisplayName("AC08 - Quái chết rơi đồ đúng 1 lần, tự hồi sinh sau 150 ticks tại home và tăng spawnGeneration")
    void testMobDeathSingleDropAndRespawnAfter150Ticks() {
        world.setCurrentTick(10L);
        Mob slime = world.getMob("m-1");
        assertNotNull(slime);
        int homeX = slime.getHomeX();
        int homeY = slime.getHomeY();
        int initialGen = slime.getSpawnGeneration();

        // Giả sử quái đã di chuyển sang ô (11, 6) trước khi chết
        slime.setX(11);
        slime.setY(6);

        // Quái chết lần 1 tại tick 10 -> rơi bình máu ở (11, 6), hẹn hồi sinh ở tick 160 (10 + 150)
        Item dropped = system.onMobDeath(slime);
        assertNotNull(dropped);
        assertEquals(11, dropped.getX());
        assertEquals(6, dropped.getY());
        assertEquals(210L, dropped.getExpiresTick()); // 10 + 200 ticks
        assertEquals("DEAD", slime.getState());
        assertEquals(160L, slime.getRespawnReadyTick());

        // Gọi onMobDeath lần 2 trong khi đang DEAD -> KHÔNG rơi thêm bình máu thứ 2
        Item duplicateDrop = system.onMobDeath(slime);
        assertNull(duplicateDrop);

        // Ở tick 159 -> quái vẫn DEAD
        world.setCurrentTick(159L);
        system.updateTick();
        assertEquals("DEAD", slime.getState());

        // Tới tick 160 (đủ 150 ticks) -> quái hồi sinh tại home, đầy máu 40, spawnGeneration + 1
        world.setCurrentTick(160L);
        system.updateTick();
        assertEquals("IDLE", slime.getState());
        assertEquals(slime.getMaxHp(), slime.getHp());
        assertEquals(homeX, slime.getX());
        assertEquals(homeY, slime.getY());
        assertEquals(initialGen + 1, slime.getSpawnGeneration());
        assertNull(slime.getRespawnReadyTick());
    }

    @Test
    @DisplayName("AC08 - Player chết không nhặt đồ được, vẫn chat được, phải chờ đủ 30 ticks mới RESPAWN về khu an toàn")
    void testPlayerDeathAndRespawnCooldown() {
        world.setCurrentTick(50L);
        Player player = new Player("p-1", "Hoang", "knight", 12, 10);
        world.addPlayer(player);
        Item potion = world.spawnHealthPotion(12, 10, 250L);

        // Player nhận sát thương chí mạng -> DEAD, hẹn hồi sinh ở tick 80 (50 + 30)
        system.applyDamageToPlayer("m-1", player, 100);
        assertEquals("DEAD", player.getState());
        assertEquals(0, player.getHp());
        assertEquals(80L, player.getRespawnReadyTick());

        // Khi đang DEAD: không được nhặt đồ (PLAYER_DEAD), nhưng vẫn CHAT được
        CommandResult lootWhileDead = system.handleLoot(player, potion.getId());
        assertFalse(lootWhileDead.isAccepted());
        assertEquals("PLAYER_DEAD", lootWhileDead.getErrorCode());

        CommandResult chatWhileDead = system.handleChat(player, "Cứu tôi với anh em ơi!", 5000L);
        assertTrue(chatWhileDead.isAccepted());

        // Bấm RESPAWN sớm ở tick 79 (< 80) -> bị từ chối với RESPAWN_NOT_READY
        world.setCurrentTick(79L);
        CommandResult earlyRespawn = system.handleRespawn(player);
        assertFalse(earlyRespawn.isAccepted());
        assertEquals("RESPAWN_NOT_READY", earlyRespawn.getErrorCode());
        assertEquals("DEAD", player.getState());

        // Bấm RESPAWN ở tick 80 (đủ 3 giây = 30 ticks) -> Hồi sinh về khu an toàn, HP = 100
        world.setCurrentTick(80L);
        CommandResult okRespawn = system.handleRespawn(player);
        assertTrue(okRespawn.isAccepted());
        assertEquals("RESPAWN", okRespawn.getCommandType());
        assertEquals("IDLE", player.getState());
        assertEquals(100, player.getHp());
        assertNull(player.getRespawnReadyTick());
        assertTrue(world.getMap().isInSafeZone(player.getGridX(), player.getGridY()));
    }

    @Test
    @DisplayName("Vật phẩm tự động biến mất sau 200 ticks (20 giây) nếu chưa có ai nhặt")
    void testItemExpiresAfter200Ticks() {
        world.setCurrentTick(10L);
        Item potion = world.spawnHealthPotion(7, 7, 210L);
        world.drainPendingEvents();

        world.setCurrentTick(209L);
        system.updateTick();
        assertNotNull(world.getItem(potion.getId()));
        world.drainPendingEvents(); // Xóa event của các item mẫu ban đầu (i-1, i-2 hết hạn ở tick 200)

        world.setCurrentTick(210L);
        system.updateTick();
        assertNull(world.getItem(potion.getId()));

        List<NetworkMessage> events = world.drainPendingEvents();
        assertEquals(1, events.size());
        assertEquals("ENTITY_DESPAWN", events.get(0).type);
        @SuppressWarnings("unchecked")
        Map<String, Object> payload = (Map<String, Object>) events.get(0).payload;
        assertEquals(potion.getId(), payload.get("id"));
        assertEquals("EXPIRED", payload.get("reason"));
    }

    public static void main(String[] args) {
        LootRespawnSystemTest suite = new LootRespawnSystemTest();

        suite.setUp();
        suite.testChatValidationAndRateLimit();
        System.out.println("[PASS] AC10 - Chat validation & rate limit");

        suite.setUp();
        suite.testTwoPlayersLootSameItemOnce();
        System.out.println("[PASS] AC06 - Two players loot same item once");

        suite.setUp();
        suite.testLootWhenHpFullAndCapAtMaxHp();
        System.out.println("[PASS] AC07 - Loot when HP full & cap at maxHp");

        suite.setUp();
        suite.testMobDeathSingleDropAndRespawnAfter150Ticks();
        System.out.println("[PASS] AC08 - Mob death single drop & respawn after 150 ticks");

        suite.setUp();
        suite.testPlayerDeathAndRespawnCooldown();
        System.out.println("[PASS] AC08 - Player death & respawn cooldown after 30 ticks");

        suite.setUp();
        suite.testItemExpiresAfter200Ticks();
        System.out.println("[PASS] Item expires after 200 ticks");

        System.out.println("ALL 6 PHAN-4 SERVER TEST SUITES PASSED!");
    }
}
