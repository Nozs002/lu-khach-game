package com.game.features.combat;

import com.game.model.Mob;
import com.game.model.Player;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import java.util.Map;

public final class AttackHandler {
    private final Map<String, Mob> mobs;
    private final CombatNavigation navigation;

    public AttackHandler(Map<String, Mob> mobs, CombatNavigation navigation) {
        this.mobs = mobs;
        this.navigation = navigation;
    }

    public Result handle(Player player, JsonElement rawPayload) {
        if (rawPayload == null || !rawPayload.isJsonObject()) {
            return new Result("INVALID_MESSAGE", "ATTACK cần payload chứa targetId.");
        }
        JsonObject payload = rawPayload.getAsJsonObject();
        if (!payload.has("targetId")) {
            return new Result("INVALID_MESSAGE", "Thiếu targetId.");
        }
        if (!player.isAlive()) return new Result("PLAYER_DEAD", "Nhân vật đã chết.");

        JsonElement value = payload.get("targetId");
        if (value.isJsonNull()) {
            player.stopCombat();
            return new Result(null, null);
        }
        if (!value.isJsonPrimitive() || !value.getAsJsonPrimitive().isString()) {
            return new Result("INVALID_MESSAGE", "targetId phải là string hoặc null.");
        }
        Mob target = mobs.get(value.getAsString());
        if (target == null || !target.isAlive() || navigation.isSafe(target)) {
            return new Result("INVALID_TARGET", "Mục tiêu không hợp lệ.");
        }
        // CombatSystem lập đường đến ô kề mục tiêu trong world tick kế tiếp.
        player.clearPath();
        player.setTargetId(target.getId());
        player.setState(CombatNavigation.distance(player, target) == 1 && !navigation.isSafe(player)
                ? "ATTACKING" : "IDLE");
        return new Result(null, null);
    }

    public record Result(String code, String message) {
        public boolean accepted() {
            return code == null;
        }
    }
}
