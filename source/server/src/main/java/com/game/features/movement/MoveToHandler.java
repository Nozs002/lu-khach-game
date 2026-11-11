package com.game.features.movement;

import com.google.gson.*;
import java.util.*;
import static com.game.features.movement.WorldMap.Tile;

public final class MoveToHandler {
    public record Result(boolean accepted, String code) {
        public static Result ok() { return new Result(true, null); }
        public static Result error(String code) { return new Result(false, code); }
    }
    private final MovementModule module;
    MoveToHandler(MovementModule module) { this.module = module; }
    /** Identity is resolved by core from session, never read from payload. */
    public Result handle(String sessionPlayerId, JsonElement payload) {
        MovementWorld.MovingEntity player = module.world.player(sessionPlayerId);
        MovementState state = module.states.get(sessionPlayerId);
        if (player == null || state == null) return Result.error("JOIN_REQUIRED");
        if (!player.alive()) { state.path.clear(); player.moving(false); return Result.error("PLAYER_DEAD"); }
        Tile goal;
        try { JsonObject o = payload.getAsJsonObject(); goal = new Tile(MapLoader.integer(o.get("x")), MapLoader.integer(o.get("y"))); }
        catch (RuntimeException e) { return Result.error("INVALID_MESSAGE"); }
        WorldMap map = module.maps.get(player.mapId());
        if (map == null || !map.inside(goal)) return Result.error("INVALID_TARGET");
        if (!map.walkable(goal)) return Result.error("BLOCKED_TILE");
        List<Tile> path = AStar.findPath(map, player.tile(), goal);
        if (path == null) return Result.error("NO_PATH");
        state.path.clear(); state.path.addAll(path); player.moving(!path.isEmpty());
        // Preserve nextStepMs across replacement AND stop/resume commands.
        return Result.ok();
    }
}
