package com.game.features.loot;

import com.game.features.combat.EntityDeathEvent;
import com.game.model.Player;

import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Random;

/**
 * Rơi vũ khí khi quái chết và tự trang bị khi người chơi còn sống đi qua ô vũ khí.
 * Bình máu (HEALTH_POTION) do LootRespawnSystem phụ trách độc lập.
 */
public final class LootSystem {
    private static final double WEAPON_DROP_RATE = 0.50;
    private static final List<String> WEAPONS = List.of("cancau", "xuong", "riu", "gay", "daikiem");
    private final Random random;

    public LootSystem(Random random) {
        this.random = random;
    }

    public List<GroundItem> roll(EntityDeathEvent event) {
        if (event == null || !"MOB".equals(event.entityKind())) {
            return List.of();
        }
        if (random.nextDouble() >= WEAPON_DROP_RATE) {
            return List.of();
        }
        String prefix = event.entityId() + ":" + event.spawnGeneration() + ":" + event.tick() + ":";
        String weaponId = WEAPONS.get(random.nextInt(WEAPONS.size()));
        return List.of(new GroundItem(prefix + "weapon", weaponId, event.x(), event.y()));
    }

    /** Chạy trong tick server: vũ khí chỉ được nhận bởi một người còn sống cùng ô. */
    public boolean collectWeapons(Collection<Player> players, Map<String, GroundItem> drops) {
        List<Player> collectors = players.stream()
                .filter(Player::isAlive)
                .sorted(Comparator.comparing(Player::getId))
                .toList();
        boolean collected = false;
        var iterator = drops.values().iterator();
        while (iterator.hasNext()) {
            GroundItem item = iterator.next();
            if (!WEAPONS.contains(item.itemId())) continue;
            for (Player player : collectors) {
                if (player.getX() == item.x() && player.getY() == item.y()) {
                    player.equipWeapon(item.itemId());
                    iterator.remove();
                    collected = true;
                    break;
                }
            }
        }
        return collected;
    }

    public record GroundItem(String id, String itemId, int x, int y) {}
}
