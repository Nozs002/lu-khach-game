package com.game.features.movement;

import java.util.*;

public final class MovementSystem {
    private final MovementModule module;
    MovementSystem(MovementModule module) { this.module = module; }
    public void update(long nowMs) {
        if (nowMs < module.lastTickMs) throw new IllegalArgumentException("NON_MONOTONIC_TIME");
        module.lastTickMs = nowMs;
        var iterator = module.states.entrySet().iterator();
        while (iterator.hasNext()) {
            var entry = iterator.next(); var player = module.world.player(entry.getKey()); var state = entry.getValue();
            if (player == null) { iterator.remove(); continue; }
            if (!player.alive()) { state.path.clear(); player.moving(false); continue; }
            if (state.path.isEmpty() || nowMs < state.nextStepMs) continue;
            WorldMap map = module.maps.get(player.mapId()); WorldMap.Tile next = state.path.removeFirst();
            if (map == null || !map.walkable(next) || Math.abs(next.x()-player.tile().x()) + Math.abs(next.y()-player.tile().y()) != 1) { state.path.clear(); player.moving(false); continue; }
            String mapId = map.id; WorldMap.Tile position = next;
            for (WorldMap.Exit exit : map.exits) {
                int index = exit.cells().indexOf(next);
                if (index >= 0) { mapId = exit.targetMap(); position = exit.arrivals().get(index); state.path.clear(); break; }
            }
            player.place(mapId, position); player.moving(!state.path.isEmpty());
            // At most one tile per update; delayed ticks discard elapsed credit.
            state.nextStepMs = Math.addExact(nowMs, 200);
        }
    }
}
