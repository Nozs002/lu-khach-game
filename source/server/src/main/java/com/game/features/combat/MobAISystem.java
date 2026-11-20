package com.game.features.combat;

import com.game.model.Mob;
import com.game.model.Player;

import java.awt.Point;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

public final class MobAISystem {
    private final CombatNavigation navigation;

    public MobAISystem(CombatNavigation navigation) {
        this.navigation = navigation;
    }

    public void update(Collection<Mob> mobs, Map<String, Player> players, long tick) {
        for (Mob mob : mobs) {
            if (!mob.isAlive()) continue;
            if ("RETURN".equals(mob.getState())) {
                returnHome(mob, tick);
                continue;
            }

            Player target = mob.getTargetId() == null ? null : players.get(mob.getTargetId());
            if (mob.getTargetId() != null && !validTarget(target)) {
                beginReturn(mob);
                returnHome(mob, tick);
                continue;
            }
            if (target == null) {
                target = findTarget(mob, players.values());
                if (target == null) {
                    mob.setState("IDLE");
                    continue;
                }
                mob.setTargetId(target.getId());
            }
            if (CombatNavigation.distance(mob, target) == 1) {
                mob.setState("ATTACK");
                continue;
            }

            mob.setState("CHASE");
            if (!mob.canMove(tick)) continue;
            List<Point> path = navigation.mobApproach(mob, target);
            if (path == null || path.isEmpty()) {
                beginReturn(mob);
                returnHome(mob, tick);
                continue;
            }
            Point next = path.get(0);
            mob.setPosition(next.x, next.y);
            mob.consumeMoveCooldown(tick);
            if (CombatNavigation.distance(mob, target) == 1) mob.setState("ATTACK");
        }
    }

    private Player findTarget(Mob mob, Collection<Player> players) {
        return players.stream()
                .filter(this::validTarget)
                .filter(player -> CombatNavigation.distance(mob, player) <= mob.getAggroRadius())
                .sorted(Comparator.comparingInt((Player player) -> CombatNavigation.distance(mob, player))
                        .thenComparing(Player::getId))
                .filter(player -> navigation.mobApproach(mob, player) != null)
                .findFirst().orElse(null);
    }

    private boolean validTarget(Player player) {
        return player != null && player.isAlive() && !navigation.isSafe(player);
    }

    private void beginReturn(Mob mob) {
        mob.setTargetId(null);
        mob.setState("RETURN");
    }

    private void returnHome(Mob mob, long tick) {
        if (mob.getX() == mob.getHomeX() && mob.getY() == mob.getHomeY()) {
            mob.setState("IDLE");
            return;
        }
        if (!mob.canMove(tick)) return;
        List<Point> path = navigation.mobReturnHome(mob);
        mob.consumeMoveCooldown(tick);
        if (path == null || path.isEmpty()) return;
        Point next = path.get(0);
        mob.setPosition(next.x, next.y);
        if (mob.getX() == mob.getHomeX() && mob.getY() == mob.getHomeY()) mob.setState("IDLE");
    }
}
