package com.game.features.movement;

import com.google.gson.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import static com.game.features.movement.WorldMap.*;

public final class MapLoader {
    private MapLoader() {}
    /** Gson coercion getters are deliberately guarded by JSON primitive type checks. */
    public static int integer(JsonElement v) {
        if (v == null || !v.isJsonPrimitive() || !v.getAsJsonPrimitive().isNumber()) throw new IllegalArgumentException("INVALID_INTEGER");
        try { return v.getAsBigDecimal().intValueExact(); } catch (ArithmeticException | NumberFormatException e) { throw new IllegalArgumentException("INVALID_INTEGER", e); }
    }
    private static String string(JsonElement v) {
        if (v == null || !v.isJsonPrimitive() || !v.getAsJsonPrimitive().isString()) throw new IllegalArgumentException("INVALID_STRING");
        return v.getAsString();
    }
    private static Tile tile(JsonElement v) { JsonObject o = v.getAsJsonObject(); return new Tile(integer(o.get("x")), integer(o.get("y"))); }
    private static List<Tile> tiles(JsonArray a) { List<Tile> r = new ArrayList<>(); a.forEach(v -> r.add(tile(v))); return r; }
    public static WorldMap parse(JsonElement raw) {
        try {
            JsonObject d = raw.getAsJsonObject();
            if (integer(d.get("width")) != 32 || integer(d.get("height")) != 24 || integer(d.get("tileSize")) != 24) throw new IllegalArgumentException("INVALID_DIMENSIONS");
            List<Integer> collisions = new ArrayList<>(); d.getAsJsonArray("collisions").forEach(v -> collisions.add(integer(v)));
            JsonObject z = d.getAsJsonObject("safeZone");
            Zone zone = new Zone(integer(z.get("x")), integer(z.get("y")), integer(z.get("width")), integer(z.get("height")));
            List<Exit> exits = new ArrayList<>();
            for (JsonElement v : d.getAsJsonArray("exits")) { JsonObject e = v.getAsJsonObject(); exits.add(new Exit(string(e.get("side")), tiles(e.getAsJsonArray("cells")), string(e.get("targetMap")), tiles(e.getAsJsonArray("arrivals")))); }
            return new WorldMap(string(d.get("id")), collisions, zone, tile(d.get("spawn")), exits);
        } catch (RuntimeException e) { throw new IllegalArgumentException("INVALID_MAP", e); }
    }
    public static WorldMap load(Path path) throws IOException {
        try (Reader reader = Files.newBufferedReader(path, StandardCharsets.UTF_8)) { return parse(JsonParser.parseReader(reader)); }
    }
}
