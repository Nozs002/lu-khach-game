package com.game.features.combat;

import com.game.model.CombatEntity;
import com.game.model.Mob;
import com.game.model.Player;

import java.awt.Point;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.BiConsumer;
import java.util.function.Consumer;

public final class CombatSystem {
    private final CombatNavigation navigation;

    public CombatSystem(CombatNavigation navigation) {
        this.navigation = navigation;
    }

    public void preparePlayers(Collection<Player> players, Map<String, Mob> mobs) {
        for (Player player : players) {
            if (!player.isAlive() || player.getTargetId() == null) continue;
            Mob target = mobs.get(player.getTargetId());
            if (target == null || !target.isAlive() || navigation.isSafe(target)) {
                player.stopCombat();
                continue;
            }
            if (CombatNavigation.distance(player, target) == 1) {
                player.clearPath();
                player.setState("ATTACKING");
                continue;
            }
            List<Point> path = navigation.playerApproach(player, target);
            if (path == null) player.stopCombat();
            else player.setPath(path);
        }
    }

    public void update(Map<String, Player> players, Map<String, Mob> mobs, long tick,
                       BiConsumer<String, Object> emit, Consumer<EntityDeathEvent> onDeath) {
        List<CombatEntity> attackers = new ArrayList<>();
        attackers.addAll(players.values());
        attackers.addAll(mobs.values());
        attackers.sort(Comparator.comparing(CombatEntity::getId));

        for (CombatEntity attacker : attackers) {
            if (!attacker.canAttack(tick) || attacker.getTargetId() == null) continue;
            boolean playerAttack = attacker instanceof Player;
            if (!playerAttack && !"ATTACK".equals(attacker.getState())) continue;
            CombatEntity target = playerAttack
                    ? mobs.get(attacker.getTargetId()) : players.get(attacker.getTargetId());
            if (target == null || !target.isAlive() || navigation.isSafe(attacker)
                    || navigation.isSafe(target) || CombatNavigation.distance(attacker, target) != 1) continue;

            int amount = Math.min(target.getHp(), playerAttack
                    ? CombatConfig.PLAYER_DAMAGE : CombatConfig.MOB_DAMAGE);
            attacker.setState(playerAttack ? "ATTACKING" : "ATTACK");
            attacker.consumeCooldown(tick, playerAttack
                    ? CombatConfig.PLAYER_ATTACK_TICKS : CombatConfig.MOB_ATTACK_TICKS);
            boolean died = target.receiveDamage(amount);
            emit.accept("DAMAGE", new DamageEvent(attacker.getId(), target.getId(), amount));

            if (died) {
                clearReferences(target.getId(), players, mobs);
                emit.accept("ENTITY_DESPAWN", new DespawnEvent(target.getId(), "DEAD"));
                onDeath.accept(new EntityDeathEvent(target.getId(), target instanceof Mob ? "MOB" : "PLAYER",
                        attacker.getId(), target.getX(), target.getY(), tick,
                        target instanceof Mob mob ? mob.getSpawnGeneration() : null));
            } else if (target instanceof Mob mob && playerAttack && !"RETURN".equals(mob.getState())) {
                mob.setTargetId(attacker.getId());
                mob.setState("ATTACK");
            }
        }
    }

    private void clearReferences(String deadId, Map<String, Player> players, Map<String, Mob> mobs) {
        for (Player player : players.values()) {
            if (deadId.equals(player.getTargetId())) player.stopCombat();
        }
        for (Mob mob : mobs.values()) {
            if (mob.isAlive() && deadId.equals(mob.getTargetId())) {
                mob.setTargetId(null);
                mob.setState("RETURN");
            }
        }
    }

    public record DamageEvent(String attackerId, String targetId, int amount) {
    }

    public record DespawnEvent(String id, String reason) {
    }
}
