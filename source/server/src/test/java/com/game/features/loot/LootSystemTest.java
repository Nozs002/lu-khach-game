package com.game.features.loot;

import com.game.features.combat.EntityDeathEvent;
import org.junit.jupiter.api.Test;
import java.util.Random;
import java.util.List;
import java.util.LinkedHashMap;
import com.game.model.Player;
import static org.junit.jupiter.api.Assertions.*;

class LootSystemTest {
    private final EntityDeathEvent death = new EntityDeathEvent("m-1", "MOB", "p-1", 8, 9, 10, 1);

    private LootSystem system(double healthRoll, double weaponRoll, int weapon) {
        return new LootSystem(new Random() {
            private int call;
            @Override public double nextDouble() { return call++ == 0 ? healthRoll : weaponRoll; }
            @Override public int nextInt(int bound) { assertEquals(5, bound); return weapon; }
        });
    }

    @Test void independentRollsAllowBothEitherOrNeither() {
        var both = system(0.69, 0.49, 0).roll(death);
        assertEquals(2, both.size());
        assertEquals("health-potion", both.get(0).itemId());
        assertEquals("cancau", both.get(1).itemId());
        assertEquals(8, both.get(0).x());
        assertEquals(9, both.get(1).y());
        assertNotEquals(both.get(0).id(), both.get(1).id());
        assertEquals("health-potion", system(0.69, 0.50, 0).roll(death).get(0).itemId());
        assertEquals("cancau", system(0.70, 0.49, 0).roll(death).get(0).itemId());
        assertTrue(system(0.70, 0.50, 0).roll(death).isEmpty());
    }

    @Test void weaponsAreCollectedOnceByLivingPlayersOnTheirTile() {
        var loot = system(0, 0, 0);
        var player = new Player("p-1", "Test", "knight", 8, 9);
        var other = new Player("p-2", "Other", "knight", 8, 9);
        var dead = new Player("p-0", "Dead", "knight", 8, 9);
        dead.receiveDamage(100);
        var drops = new LinkedHashMap<String, LootSystem.GroundItem>();
        drops.put("w1", new LootSystem.GroundItem("w1", "riu", 8, 9));
        drops.put("h1", new LootSystem.GroundItem("h1", "health-potion", 8, 9));
        loot.collectWeapons(List.of(dead), drops);
        assertEquals(2, drops.size());
        player.setPosition(7, 9);
        loot.collectWeapons(List.of(player), drops);
        assertNull(player.getEquippedWeaponId());
        player.setPosition(8, 9);
        loot.collectWeapons(List.of(other, player, dead), drops);
        assertEquals("riu", player.getEquippedWeaponId());
        assertNull(other.getEquippedWeaponId());
        assertNull(dead.getEquippedWeaponId());
        assertEquals(List.of("h1"), List.copyOf(drops.keySet()));
        drops.put("w2", new LootSystem.GroundItem("w2", "daikiem", 8, 9));
        loot.collectWeapons(List.of(player), drops);
        assertEquals("daikiem", player.getEquippedWeaponId());
        assertFalse(drops.containsKey("w2"));
    }

    @Test void allFiveWeaponsAreAvailableAndPlayersDoNotDropLoot() {
        String[] weapons = {"cancau", "xuong", "riu", "gay", "daikiem"};
        for (int i = 0; i < weapons.length; i++) {
            assertEquals(weapons[i], system(1, 0, i).roll(death).get(0).itemId());
        }
        assertTrue(system(0, 0, 0).roll(new EntityDeathEvent("p-1", "PLAYER", "m-1", 8, 9, 10, null)).isEmpty());
    }
}
