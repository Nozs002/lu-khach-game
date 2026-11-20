package com.game.features.combat;

import com.game.features.movement.AStarPathfinder;
import com.game.features.movement.MoveToHandler;
import com.game.model.Mob;
import com.game.model.Player;
import com.game.world.WorldMap;
import com.google.gson.Gson;
import com.google.gson.JsonParser;
import org.junit.jupiter.api.Test;

import java.awt.Point;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;

import static org.junit.jupiter.api.Assertions.*;

class CombatTest {
    private final Gson gson = new Gson();
    private final WorldMap map = WorldMap.loadFromResource("/maps/combat-test.json", gson);
    private final CombatNavigation navigation = new CombatNavigation(map);
    private final CombatSystem combat = new CombatSystem(navigation);

    private Mob mob(int x, int y) {
        return new Mob("m-1", "slime", "test-zone", x, y, 4, 6, 15);
    }

    private Player player(String id, int x, int y) {
        return new Player(id, "test", "knight", x, y);
    }

    @Test
    void mobPathFindsDetourAroundSafeZoneAndStaysWithinLeash() {
        Mob mob = mob(1, 3);
        Player player = player("p-1", 5, 3);
        List<Point> path = navigation.mobApproach(mob, player);
        assertNotNull(path);
        assertTrue(path.size() > 3);
        Point previous = new Point(mob.getX(), mob.getY());
        for (Point step : path) {
            assertTrue(navigation.canMobStand(mob, step.x, step.y));
            assertEquals(1, CombatNavigation.distance(previous.x, previous.y, step.x, step.y));
            previous = step;
        }
        assertEquals(1, CombatNavigation.distance(previous.x, previous.y, player.getX(), player.getY()));
        assertNull(navigation.mobApproach(mob, player("safe", 3, 3)));
        assertFalse(navigation.canMobStand(mob, 7, 5));
    }

    @Test
    void oldAStarApiAndMovementStillWorkAndMoveCancelsCombat() {
        AStarPathfinder astar = new AStarPathfinder();
        assertEquals(List.of(new Point(2, 3), new Point(3, 3), new Point(4, 3)),
                astar.findPath(map, new Point(1, 3), new Point(4, 3)));
        Player player = player("p-1", 6, 3);
        player.setTargetId("m-1");
        MoveToHandler handler = new MoveToHandler(map);
        assertTrue(handler.handle(player, 7, 3).accepted());
        assertNull(player.getTargetId());
        assertTrue(player.advanceOneStep());
        assertEquals(7, player.getX());
        assertFalse(player.advanceOneStep());
        player.receiveDamage(100);
        assertEquals("PLAYER_DEAD", handler.handle(player, 6, 3).code());
    }

    @Test
    void repeatedAttackCommandsDoNotResetCooldownAndDeathHappensOnce() {
        Player player = player("p-1", 6, 3);
        Mob mob = mob(7, 3);
        Map<String, Mob> mobs = Map.of(mob.getId(), mob);
        Map<String, Player> players = Map.of(player.getId(), player);
        AttackHandler handler = new AttackHandler(mobs, navigation);
        List<EntityDeathEvent> deaths = new ArrayList<>();
        List<CombatSystem.DamageEvent> damage = new ArrayList<>();
        for (long tick = 2; tick <= 20; tick += 2) {
            assertTrue(handler.handle(player,
                    JsonParser.parseString("{\"targetId\":\"m-1\"}")).accepted());
            combat.update(players, mobs, tick, (type, payload) -> {
                if (payload instanceof CombatSystem.DamageEvent event) damage.add(event);
            }, deaths::add);
            if (!mob.isAlive()) break;
        }
        assertEquals(List.of(15, 15, 10), damage.stream()
                .filter(event -> event.attackerId().equals(player.getId()))
                .map(CombatSystem.DamageEvent::amount).toList());
        assertEquals(88, player.getHp()); // Quái đánh trả hai lần, mỗi lần 6 HP.
        assertEquals(1, deaths.size());
        assertEquals(14, deaths.get(0).tick());
        assertEquals(0, mob.getHp());
        assertEquals("DEAD", mob.getState());
        assertNull(player.getTargetId());
        combat.update(players, mobs, 100, (type, payload) -> fail("Dead target must not emit again"), deaths::add);
        assertEquals(1, deaths.size());
    }

    @Test
    void simultaneousLethalAttacksProduceOneDeath() {
        Mob mob = mob(7, 3);
        mob.receiveDamage(30);
        Player first = player("p-1", 6, 3);
        Player second = player("p-2", 7, 2);
        first.setTargetId(mob.getId());
        second.setTargetId(mob.getId());
        List<EntityDeathEvent> deaths = new ArrayList<>();
        combat.update(Map.of(first.getId(), first, second.getId(), second), Map.of(mob.getId(), mob),
                2, (type, payload) -> {}, deaths::add);
        assertEquals(1, deaths.size());
        assertEquals("p-1", deaths.get(0).killerId());
        assertNull(second.getTargetId());
    }

    @Test
    void safeZoneAndDistancePreventDamage() {
        Player player = player("p-1", 3, 3);
        Mob mob = mob(4, 3);
        player.setTargetId(mob.getId());
        mob.setTargetId(player.getId());
        mob.setState("ATTACK");
        combat.update(Map.of(player.getId(), player), Map.of(mob.getId(), mob),
                2, (type, payload) -> fail("No damage in safe zone"), event -> fail());
        player.setPosition(1, 3);
        combat.update(Map.of(player.getId(), player), Map.of(mob.getId(), mob),
                4, (type, payload) -> fail("No damage out of range"), event -> fail());
        assertEquals(100, player.getHp());
        assertEquals(40, mob.getHp());
    }

    @Test
    void invalidCommandsAreRejectedAndNullTargetStopsAttack() {
        Player player = player("p-1", 6, 3);
        Mob mob = mob(7, 3);
        AttackHandler handler = new AttackHandler(Map.of(mob.getId(), mob), navigation);
        assertEquals("INVALID_MESSAGE", handler.handle(player, JsonParser.parseString("{}")).code());
        assertEquals("INVALID_MESSAGE", handler.handle(player, JsonParser.parseString("{\"targetId\":1}")).code());
        assertEquals("INVALID_TARGET", handler.handle(player, JsonParser.parseString("{\"targetId\":\"p-2\"}")).code());
        player.setTargetId(mob.getId());
        assertTrue(handler.handle(player, JsonParser.parseString("{\"targetId\":null}")).accepted());
        assertNull(player.getTargetId());
        player.receiveDamage(100);
        assertEquals("PLAYER_DEAD", handler.handle(player, JsonParser.parseString("{\"targetId\":\"m-1\"}")).code());
    }

    @Test
    void aiRespectsMoveCooldownReturnsHomeAndIgnoresDeadMobs() {
        Mob mob = mob(1, 3);
        Player player = player("p-1", 2, 1);
        MobAISystem ai = new MobAISystem(navigation);
        ai.update(List.of(mob), Map.of(player.getId(), player), 2);
        Point first = new Point(mob.getX(), mob.getY());
        assertNotEquals(new Point(1, 3), first);
        ai.update(List.of(mob), Map.of(player.getId(), player), 4);
        assertEquals(first, new Point(mob.getX(), mob.getY()));
        ai.update(List.of(mob), Map.of(), 6);
        assertEquals(new Point(1, 3), new Point(mob.getX(), mob.getY()));
        assertEquals("IDLE", mob.getState());
        mob.receiveDamage(40);
        ai.update(List.of(mob), Map.of(player.getId(), player), 20);
        assertEquals("DEAD", mob.getState());
        assertEquals(new Point(1, 3), new Point(mob.getX(), mob.getY()));
    }

    @Test
    void mobsAttackWithTheirOwnCooldownAndStopAfterPlayerDies() {
        Mob mob = mob(7, 3);
        Player player = player("p-1", 6, 3);
        player.receiveDamage(88);
        mob.setTargetId(player.getId());
        mob.setState("ATTACK");
        List<EntityDeathEvent> deaths = new ArrayList<>();
        combat.update(Map.of(player.getId(), player), Map.of(mob.getId(), mob), 2, (t, p) -> {}, deaths::add);
        assertEquals(6, player.getHp());
        combat.update(Map.of(player.getId(), player), Map.of(mob.getId(), mob), 10, (t, p) -> {}, deaths::add);
        assertEquals(6, player.getHp());
        combat.update(Map.of(player.getId(), player), Map.of(mob.getId(), mob), 12, (t, p) -> {}, deaths::add);
        assertEquals(0, player.getHp());
        assertEquals(1, deaths.size());
        assertEquals("PLAYER", deaths.get(0).entityKind());
        assertEquals("RETURN", mob.getState());
    }

    @Test
    void initialSpawnsAreUniqueWalkableOutsideSafeZoneAndMatchRealMapCounts() {
        for (String resource : List.of("/maps/combat-test.json", "/maps/world.generated.json")) {
            WorldMap world = WorldMap.loadFromResource(resource, gson);
            CombatNavigation nav = new CombatNavigation(world);
            Map<String, Mob> mobs = MobSpawnSystem.load(resource, world, gson, new Random(7));
            var source = JsonParser.parseReader(new java.io.InputStreamReader(
                    getClass().getResourceAsStream(resource), java.nio.charset.StandardCharsets.UTF_8)).getAsJsonObject();
            int expected = 0;
            for (var zone : source.getAsJsonArray("monsterSpawns")) {
                expected += zone.getAsJsonObject().get("maxAlive").getAsInt();
            }
            assertEquals(expected, mobs.size());
            var occupied = new HashSet<Point>();
            for (Mob mob : mobs.values()) {
                assertTrue(world.isWalkable(mob.getX(), mob.getY()));
                assertFalse(nav.isSafe(mob));
                assertTrue(occupied.add(new Point(mob.getX(), mob.getY())));
            }
        }
    }

    @Test
    void existingWorldMapMovementChecksStillPass() {
        com.game.model.WorldMapCheck.main(new String[0]);
    }
}
