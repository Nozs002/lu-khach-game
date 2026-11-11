package com.game.features.movement;

/** Feature 1 supplies this adapter over its one authoritative world, on world thread. */
public interface MovementWorld {
    interface MovingEntity {
        String id();
        String mapId();
        WorldMap.Tile tile();
        boolean alive();
        /** Atomic map+tile update; host includes it in its next authoritative snapshot. */
        void place(String mapId, WorldMap.Tile tile);
        void moving(boolean moving);
    }
    MovingEntity player(String sessionPlayerId);
}
