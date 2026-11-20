package com.game.features.combat;

public record EntityDeathEvent(
        String entityId,
        String entityKind,
        String killerId,
        int x,
        int y,
        long tick,
        Integer spawnGeneration
) {
}
