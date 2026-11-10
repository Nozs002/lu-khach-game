package com.game.features.movement;

import java.util.*;

public final class MovementModule {
    final MovementWorld world;
    final Map<String, WorldMap> maps;
    final Map<String, MovementState> states = new HashMap<>();
    long lastTickMs = -1;
    public final MoveToHandler commands;
    public final MovementSystem system;
    public MovementModule(MovementWorld world, Map<String, WorldMap> maps) {
        WorldMap.validateWorld(maps); this.world = Objects.requireNonNull(world); this.maps = Map.copyOf(maps);
        commands = new MoveToHandler(this); system = new MovementSystem(this);
    }
    /** Call after JOIN on world thread; ID belongs to feature 1. */
    public void joined(String playerId, long nowMs) {
        var player = world.player(playerId);
        if (player == null || states.containsKey(playerId) || nowMs < lastTickMs) throw new IllegalArgumentException("INVALID_JOIN");
        WorldMap map = maps.get(player.mapId());
        if (map == null || !map.walkable(player.tile()) || map.portal(player.tile())) throw new IllegalArgumentException("INVALID_PLAYER_SPAWN");
        states.put(playerId, new MovementState(nowMs));
    }
    public void left(String playerId) { states.remove(playerId); var p = world.player(playerId); if (p != null) p.moving(false); }
    public int activePlayers() { return states.size(); }
    public int queuedSteps(String playerId) { var state = states.get(playerId); return state == null ? 0 : state.path.size(); }
}
