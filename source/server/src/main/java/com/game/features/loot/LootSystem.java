package com.game.features.loot;

import com.game.features.combat.EntityDeathEvent;
import com.game.model.Player;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Random;

/** Server quyết định hai lượt rơi độc lập cho mỗi lần quái chết. */
public final class LootSystem {
    private static final List<String> WEAPONS = List.of("cancau", "xuong", "riu", "gay", "daikiem");
    private final Random random;

    public LootSystem(Random random) {
        this.random = random;
    }

    public List<GroundItem> roll(EntityDeathEvent event) {
        if (!"MOB".equals(event.entityKind())) return List.of();
        List<GroundItem> result = new ArrayList<>();
        String prefix = event.entityId() + ":" + event.spawnGeneration() + ":" + event.tick() + ":";
        if (random.nextDouble() < 0.70) {
            result.add(new GroundItem(prefix + "health", "health-potion", event.x(), event.y()));
        }
        if (random.nextDouble() < 0.50) {
            result.add(new GroundItem(prefix + "weapon", WEAPONS.get(random.nextInt(WEAPONS.size())), event.x(), event.y()));
        }
        return result;
    }

    /** Chạy trong tick server: vật phẩm chỉ được nhận bởi một người còn sống cùng ô. */
    public void collectWeapons(Collection<Player> players, Map<String, GroundItem> drops) {
        List<Player> collectors = players.stream().filter(Player::isAlive)
                .sorted(Comparator.comparing(Player::getId)).toList();
        var iterator = drops.values().iterator();
        while (iterator.hasNext()) {
            GroundItem item = iterator.next();
            if (!WEAPONS.contains(item.itemId())) continue;
            for (Player player : collectors) {
                if (player.getX() == item.x() && player.getY() == item.y()) {
                    player.equipWeapon(item.itemId());
                    iterator.remove();
                    break;
                }
            }
        }
    }

    public record GroundItem(String id, String itemId, int x, int y) {}
}
