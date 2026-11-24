package com.game.features.loot;

import com.game.features.combat.EntityDeathEvent;
import com.game.model.Player;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Random;

import static org.junit.jupiter.api.Assertions.*;

class LootSystemTest {
    private final EntityDeathEvent death = new EntityDeathEvent("m-1", "MOB", "p-1", 8, 9, 10, 1);

    private LootSystem system(double weaponRoll, int weapon) {
        return new LootSystem(new Random() {
            @Override
            public double nextDouble() {
                return weaponRoll;
            }

            @Override
            public int nextInt(int bound) {
                assertEquals(5, bound);
                return weapon;
            }
        });
    }

    @Test
    void rollsWeaponOnlyAndNeverDropsHealthPotion() {
        var dropped = system(0.49, 0).roll(death);
        assertEquals(1, dropped.size());
        assertEquals("cancau", dropped.get(0).itemId());
        assertEquals(8, dropped.get(0).x());
        assertEquals(9, dropped.get(0).y());

        assertTrue(system(0.50, 0).roll(death).isEmpty());
        assertTrue(system(0.0, 0).roll(new EntityDeathEvent("p-1", "PLAYER", "m-1", 8, 9, 10, null)).isEmpty());
    }

    @Test
    void weaponsAreCollectedOnceByLivingPlayersOnTheirTile() {
        var loot = system(0.0, 0);
        var player = new Player("p-1", "Test", "knight", 8, 9);
        var other = new Player("p-2", "Other", "knight", 8, 9);
        var dead = new Player("p-0", "Dead", "knight", 8, 9);
        dead.receiveDamage(dead.getMaxHp());

        var drops = new LinkedHashMap<String, LootSystem.GroundItem>();
        drops.put("w1", new LootSystem.GroundItem("w1", "riu", 8, 9));

        assertFalse(loot.collectWeapons(List.of(dead), drops));
        assertEquals(1, drops.size());

        player.setPosition(7, 9);
        assertFalse(loot.collectWeapons(List.of(player), drops));
        assertNull(player.getEquippedWeaponId());

        player.setPosition(8, 9);
        assertTrue(loot.collectWeapons(List.of(other, player, dead), drops));
        assertEquals("riu", player.getEquippedWeaponId());
        assertNull(other.getEquippedWeaponId());
        assertNull(dead.getEquippedWeaponId());
        assertTrue(drops.isEmpty());

        drops.put("w2", new LootSystem.GroundItem("w2", "daikiem", 8, 9));
        assertTrue(loot.collectWeapons(List.of(player), drops));
        assertEquals("daikiem", player.getEquippedWeaponId());
        assertFalse(drops.containsKey("w2"));
    }

    @Test
    void allFiveWeaponsAreAvailable() {
        String[] weapons = {"cancau", "xuong", "riu", "gay", "daikiem"};
        for (int i = 0; i < weapons.length; i++) {
            var res = system(0.0, i).roll(death);
            assertEquals(1, res.size());
            assertEquals(weapons[i], res.get(0).itemId());
        }
    }
}
