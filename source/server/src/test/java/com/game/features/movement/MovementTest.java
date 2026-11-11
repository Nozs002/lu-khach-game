package com.game.features.movement;

import com.google.gson.*;
import java.nio.file.*;
import java.util.*;
import static com.game.features.movement.WorldMap.Tile;

/** Standalone Java 17 tests: no changes to feature 1 build configuration. */
public final class MovementTest {
    static void check(boolean condition, String message) { if (!condition) throw new AssertionError(message); }
    static JsonElement read(Path p) throws Exception { return JsonParser.parseString(Files.readString(p)); }
    static Tile tile(JsonElement v) { return new Tile(v.getAsJsonObject().get("x").getAsInt(), v.getAsJsonObject().get("y").getAsInt()); }
    static final class Entity implements MovementWorld.MovingEntity {
        String map = "world-01"; Tile position = new Tile(3,3); boolean alive = true, moving;
        public String id() { return "existing-session-id"; }
        public String mapId() { return map; }
        public Tile tile() { return position; }
        public boolean alive() { return alive; }
        public void place(String map, Tile tile) { this.map = map; position = tile; }
        public void moving(boolean value) { moving = value; }
    }
    static final class FakeWorld implements MovementWorld {
        final Map<String, Entity> players = new HashMap<>();
        public Entity player(String id) { return players.get(id); }
    }
    static JsonElement command(int x, int y) { return JsonParser.parseString("{\"x\":"+x+",\"y\":"+y+"}"); }
    public static void main(String[] args) throws Exception {
        Path common = Path.of(args.length == 0 ? "../common" : args[0]);
        WorldMap map = MapLoader.load(common.resolve("maps/world-01.json"));
        Map<String,WorldMap> maps = Map.of(map.id,map,"world-02",MapLoader.load(common.resolve("maps/world-02.json")));
        WorldMap.validateWorld(maps);
        for (JsonElement value : read(common.resolve("fixtures/movement/paths.json")).getAsJsonArray()) {
            JsonObject f = value.getAsJsonObject(); List<Tile> result = AStar.findPath(map,tile(f.get("start")),tile(f.get("goal")));
            List<Tile> expected = null;
            if (!f.get("path").isJsonNull()) { expected = new ArrayList<>(); for (JsonElement p : f.getAsJsonArray("path")) expected.add(tile(p)); }
            check(Objects.equals(result,expected),f.get("name").getAsString());
        }
        for (JsonElement value : read(common.resolve("fixtures/movement/invalid-maps.json")).getAsJsonArray()) {
            JsonObject f = value.getAsJsonObject(), raw = read(common.resolve("maps/world-01.json")).getAsJsonObject();
            for (var patch : f.getAsJsonObject("patch").entrySet()) raw.add(patch.getKey(),patch.getValue());
            boolean rejected = false; try { MapLoader.parse(raw); } catch (IllegalArgumentException e) { rejected = true; }
            check(rejected,"invalid map "+f.get("name"));
        }
        boolean rejected = false; try { WorldMap.validateWorld(Map.of(map.id,map)); } catch (IllegalArgumentException e) { rejected = true; }
        check(rejected,"missing linked map");
        FakeWorld world = new FakeWorld(); Entity player = new Entity(); world.players.put(player.id(),player);
        MovementModule module = new MovementModule(world,maps); module.joined(player.id(),0);
        for (JsonElement payload : read(common.resolve("fixtures/movement/invalid-commands.json")).getAsJsonArray()) check(!module.commands.handle(player.id(),payload).accepted(),"bad payload");
        JsonObject nan = new JsonObject(); nan.addProperty("x",Double.NaN); nan.addProperty("y",3);
        check(!module.commands.handle(player.id(),nan).accepted(),"NaN rejected");
        check(module.commands.handle(player.id(),command(-1,3)).code().equals("INVALID_TARGET"),"bounds");
        check(module.commands.handle(player.id(),command(12,4)).code().equals("BLOCKED_TILE"),"wall");
        check(module.commands.handle(player.id(),command(24,18)).code().equals("NO_PATH"),"unreachable");
        for (int now = 0; now <= 1000; now += 10) {
            for (int i = 0; i < 25; i++) check(module.commands.handle(player.id(),command(10,3)).accepted(),"spam accepted");
            module.system.update(now); check(player.position.x() <= 3 + now/200,"spam speed cap"); check(module.queuedSteps(player.id()) < 768,"bounded path");
        }
        check(player.position.equals(new Tile(8,3)),"five tiles per second");
        module.commands.handle(player.id(),command(8,3)); check(module.queuedSteps(player.id()) == 0,"stop");
        module.commands.handle(player.id(),command(10,3)); module.system.update(1001); check(player.position.x() == 8,"stop resume cannot accelerate");
        module.system.update(10000); check(player.position.x() == 9,"slow tick only one tile");
        module.system.update(10001); check(player.position.x() == 9,"no catchup credit");
        module.left(player.id()); check(module.activePlayers() == 0 && module.queuedSteps(player.id()) == 0 && !player.moving,"leave cleanup");
        check(module.commands.handle(player.id(),command(10,3)).code().equals("JOIN_REQUIRED"),"late queued command rejected");
        // All eight gate cells: enter target map, map change consumes a step, no bounce.
        for (WorldMap.Exit exit : map.exits) for (int i = 0; i < 2; i++) {
            FakeWorld w = new FakeWorld(); Entity p = new Entity(); Tile gate = exit.cells().get(i);
            p.position = new Tile(Math.max(1,Math.min(30,gate.x())),Math.max(1,Math.min(22,gate.y()))); w.players.put(p.id(),p);
            MovementModule m = new MovementModule(w,maps); m.joined(p.id(),0);
            check(m.commands.handle(p.id(),command(gate.x(),gate.y())).accepted(),"gate command");
            m.system.update(199); check(p.map.equals("world-01"),"gate respects speed");
            m.system.update(200); check(p.map.equals(exit.targetMap()) && p.position.equals(exit.arrivals().get(i)),"gate destination");
            m.system.update(400); check(p.map.equals(exit.targetMap()),"no bounce");
        }
        // A shared authoritative world exposes identical positions to multiple readers.
        FakeWorld w = new FakeWorld(); Entity a = new Entity(), b = new Entity(); w.players.put("a",a); w.players.put("b",b);
        MovementModule m = new MovementModule(w,maps); m.joined("a",0); m.joined("b",0);
        a.position = new Tile(10,8); b.position = new Tile(10,8);
        m.commands.handle("a",command(15,8)); m.commands.handle("b",command(15,8));
        for (int t = 100; t <= 6000; t += 100) { m.system.update(t); check(a.position.equals(b.position),"shared positions"); check(map.walkable(a.position),"never enters wall"); }
        check(a.position.equals(new Tile(15,8)),"arrives around wall");
        a.alive = false; m.commands.handle("a",command(5,5)); check(m.queuedSteps("a") == 0,"dead clears path");
        w.players.remove("b"); m.system.update(6200); check(m.activePlayers() == 1,"missing entity cleaned");
        System.out.println("Java: shared fixtures, validation, spam, cooldown, slow tick, eight gates, cleanup passed");
    }

    @org.junit.jupiter.api.Test
    void testMovementSuite() throws Exception {
        Path common = Files.exists(Path.of("../common/maps/world-01.json"))
                ? Path.of("../common")
                : Path.of("source/common");
        main(new String[]{common.toString()});
    }
}
