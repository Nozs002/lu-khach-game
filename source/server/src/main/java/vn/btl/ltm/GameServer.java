/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. https://mozilla.org/MPL/2.0/
 * Java port of BrowserQuest server player/world/message logic, Little Workshop.
 * Initial migration: a single world, legacy array protocol and local play. */
package vn.btl.ltm;

import com.google.gson.*;
import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;
import java.net.InetSocketAddress;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;

public final class GameServer extends WebSocketServer {
    private static final Gson JSON = new Gson();
    private static final int[] WEAPONS = {60, 61, 65, 64, 66, 62, 63};
    private static final Map<String, Integer> KINDS = new HashMap<>();
    static {
        String[] names = {"warrior","rat","skeleton","goblin","ogre","spectre","crab","bat","wizard","eye","snake","skeleton2","boss","deathknight"};
        for (int i = 0; i < names.length; i++) KINDS.put(names[i], i + 1);
        String[] armor = {"firefox","clotharmor","leatherarmor","mailarmor","platearmor","redarmor","goldenarmor"};
        for (int i = 0; i < armor.length; i++) KINDS.put(armor[i], i + 20);
        String[] items = {"flask","burger","chest","firepotion","cake"};
        for (int i = 0; i < items.length; i++) KINDS.put(items[i], i + 35);
        String[] npcs = {"guard","king","octocat","villagegirl","villager","priest","scientist","agent","rick","nyan","sorcerer","beachnpc","forestnpc","desertnpc","lavanpc","coder"};
        for (int i = 0; i < npcs.length; i++) KINDS.put(npcs[i], i + 40);
        String[] weapons = {"sword1","sword2","redsword","goldensword","morningstar","axe","bluesword"};
        for (int i = 0; i < weapons.length; i++) KINDS.put(weapons[i], i + 60);
    }
    private final Map<WebSocket, Entity> players = new LinkedHashMap<>();
    private final Map<Integer, Entity> entities = new LinkedHashMap<>();
    private final WorldMap map;
    private final JsonObject properties;
    private final Random random = new Random(42);
    private final ScheduledExecutorService clock = Executors.newSingleThreadScheduledExecutor();
    private int nextId = 100;
    private long ticks;

    public GameServer(int port, String host, Path mapFile) throws Exception {
        super(new InetSocketAddress(host, port));
        setReuseAddr(true);
        setConnectionLostTimeout(20);
        map = new WorldMap(mapFile);
        properties = JsonParser.parseString(Files.readString(mapFile.resolveSibling("mob-properties.json"))).getAsJsonObject();
        for (var entry : map.data.getAsJsonObject("staticEntities").entrySet()) {
            int index = Integer.parseInt(entry.getKey()) - 1;
            Integer kind = KINDS.get(entry.getValue().getAsString());
            if (kind != null) add(kind, index % map.width + 1, index / map.width);
        }
        for (JsonElement entry : map.data.getAsJsonArray("roamingAreas")) {
            JsonObject area = entry.getAsJsonObject();
            int kind = KINDS.get(area.get("type").getAsString());
            for (int n = 0; n < area.get("nb").getAsInt(); n++) {
                for (int tries = 0; tries < 100; tries++) {
                    int x = area.get("x").getAsInt() + random.nextInt(area.get("width").getAsInt());
                    int y = area.get("y").getAsInt() + random.nextInt(area.get("height").getAsInt());
                    if (map.valid(x, y)) { add(kind, x, y); break; }
                }
            }
        }
        for (JsonElement entry : map.data.getAsJsonArray("staticChests")) {
            JsonObject chest = entry.getAsJsonObject();
            Entity entity = add(37, chest.get("x").getAsInt(), chest.get("y").getAsInt());
            entity.contents = new ArrayList<>();
            for (JsonElement kind : chest.getAsJsonArray("i")) entity.contents.add(kind.getAsInt());
        }
    }

    private Entity add(int kind, int x, int y) {
        Entity entity = new Entity(nextId++, kind, x, y);
        if (entity.mob()) {
            String name = KINDS.entrySet().stream().filter(e -> e.getValue() == kind).findFirst().orElseThrow().getKey();
            JsonObject stats = properties.getAsJsonObject(name);
            entity.hp = entity.maxHp = stats.get("hp").getAsInt();
            entity.armorLevel = stats.get("armor").getAsInt();
            entity.weaponLevel = stats.get("weapon").getAsInt();
        }
        entities.put(entity.id, entity);
        return entity;
    }
    @Override public synchronized void onOpen(WebSocket socket, ClientHandshake handshake) {
        if (!List.of("/", "/game").contains(handshake.getResourceDescriptor())) {
            socket.close(1008, "Use / or /game"); return;
        }
        socket.send("go");
    }
    @Override public synchronized void onMessage(WebSocket socket, String raw) {
        if (raw.length() > 4096) { socket.close(1009, "Packet too large"); return; }
        try {
            JsonArray packet = JsonParser.parseString(raw).getAsJsonArray();
            int type = integer(packet, 0);
            Entity player = players.get(socket);
            if (type == 0) {
                if (packet.size() != 4 || (player != null && player.hp > 0)) throw new IllegalArgumentException();
                integer(packet, 2); integer(packet, 3);
                String name = string(packet, 1).strip();
                // The legacy bubble renderer uses HTML; encode at this protocol boundary.
                name = name.replaceAll("[\\p{Cntrl}<>]", "");
                if (name.isBlank()) throw new IllegalArgumentException();
                name = name.substring(0, Math.min(15, name.length()));
                if (player == null) {
                    if (players.size() >= 32) { socket.close(1013, "World full"); return; }
                    int[] position = map.spawn(0, random);
                    player = add(1, position[0], position[1]);
                    players.put(socket, player);
                } else {
                    int[] position = map.spawn(player.checkpoint, random);
                    player.x = position[0]; player.y = position[1];
                }
                // Fresh sessions start with starter gear. Reconnects are not trusted saves.
                player.name = name; player.removed = false; player.target = 0;
                player.hp = player.maxHp = 80 + (player.armor - 21) * 30;
                player.visible.clear();
                send(socket, List.of(1, player.id, player.name, player.x, player.y, player.hp));
                for (WebSocket peer : players.keySet()) list(peer);
                population();
                return;
            }
            if (player == null) throw new IllegalArgumentException();
            if (player.hp <= 0) return;
            switch (type) {
                case 4, 5 -> {
                    if (packet.size() != (type == 4 ? 3 : 4)) throw new IllegalArgumentException();
                    int x = integer(packet, 1), y = integer(packet, 2);
                    if (!map.valid(x, y) || !reachable(player.x, player.y, x, y)) {
                        socket.close(1008, "Invalid movement destination"); return;
                    }
                    long now = System.nanoTime();
                    player.lastMove = now; player.x = x; player.y = y; player.target = 0;
                    // BrowserQuest sends path destinations, not per-tile input.
                    if (type == 5) {
                        int item = integer(packet, 3);
                        publish(player, List.of(5, player.id, item), socket);
                    } else publish(player, List.of(4, player.id, x, y), socket);
                }
                case 20 -> {
                    if (packet.size() > 1024) throw new IllegalArgumentException();
                    for (int i = 1; i < packet.size(); i++) {
                        Entity entity = entities.get(integer(packet, i));
                        if (entity != null && !entity.removed && player.visible.contains(entity.id))
                            send(socket, entity.spawn());
                    }
                }
                case 21 -> list(socket);
                case 11 -> {
                    if (packet.size() != 2) throw new IllegalArgumentException();
                    String message = string(packet, 1).strip();
                    if (message.isBlank() || message.length() > 60 || message.codePoints().anyMatch(Character::isISOControl)) return;
                    long now = System.nanoTime();
                    if (now - player.lastChat < 500_000_000L) return;
                    player.lastChat = now;
                    String escaped = message.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;").replace("'", "&#39;");
                    publish(player, List.of(11, player.id, escaped), null);
                }
                case 6, 7 -> {
                    Entity mob = entities.get(integer(packet, 1));
                    if (mob != null && mob.mob() && !mob.removed && player.distance(mob) <= 12) {
                        if (type == 7) {
                            player.target = mob.id;
                            publish(player, List.of(7, player.id, mob.id), socket);
                        }
                        mob.target = player.id;
                        publish(mob, List.of(7, mob.id, player.id), null);
                    }
                }
                case 8 -> hit(socket, player, integer(packet, 1));
                // Kept for compatibility; damage to players is driven by the Java world tick.
                case 9 -> { integer(packet, 1); }
                case 12 -> loot(socket, player, integer(packet, 1));
                case 15 -> {
                    int x = integer(packet, 1), y = integer(packet, 2);
                    if (!map.valid(x, y) || !map.door(player.x, player.y, x, y)) {
                        socket.close(1008, "Invalid door transition"); return;
                    }
                    player.x = x; player.y = y; player.target = 0;
                    publish(player, List.of(15, player.id, x, y), socket);
                    list(socket);
                }
                case 25 -> {
                    Entity chest = entities.get(integer(packet, 1));
                    if (chest != null && chest.kind == 37 && !chest.removed && player.distance(chest) <= 2) {
                        hide(chest, 30_000);
                        if (!chest.contents.isEmpty()) {
                            Entity item = add(chest.contents.get(random.nextInt(chest.contents.size())), chest.x, chest.y);
                            for (WebSocket peer : players.keySet()) list(peer);
                        }
                    }
                }
                case 26 -> {
                    int checkpoint = integer(packet, 1);
                    if (map.checkpointContains(checkpoint, player.x, player.y)) player.checkpoint = checkpoint;
                }
                default -> throw new IllegalArgumentException();
            }
        } catch (JsonParseException | IllegalStateException | IllegalArgumentException | IndexOutOfBoundsException | NullPointerException error) {
            socket.close(1008, "Invalid BrowserQuest packet");
        }
    }

    private boolean reachable(int sx, int sy, int tx, int ty) {
        if (Math.abs(tx - sx) + Math.abs(ty - sy) > 64) return false;
        ArrayDeque<int[]> queue = new ArrayDeque<>();
        Set<Integer> visited = new HashSet<>();
        queue.add(new int[]{sx, sy}); visited.add(sy * map.width + sx);
        while (!queue.isEmpty() && visited.size() < 8000) {
            int[] point = queue.remove();
            if (point[0] == tx && point[1] == ty) return true;
            for (int[] direction : new int[][]{{0,1},{0,-1},{1,0},{-1,0}}) {
                int x = point[0] + direction[0], y = point[1] + direction[1];
                if (map.valid(x, y) && visited.add(y * map.width + x)) queue.add(new int[]{x,y});
            }
        }
        return false;
    }
    private void hit(WebSocket socket, Entity player, int id) {
        Entity mob = entities.get(id);
        long now = System.nanoTime();
        if (mob == null || !mob.mob() || mob.removed || player.target != id || player.distance(mob) > 2 || now - player.lastHit < 600_000_000L) return;
        player.lastHit = now; mob.target = player.id;
        int damage = damage(player.weaponLevel, mob.armorLevel);
        mob.hp -= damage;
        send(socket, List.of(16, mob.id, damage));
        if (mob.hp <= 0) {
            send(socket, List.of(18, mob.kind));
            hide(mob, 15_000);
            String name = KINDS.entrySet().stream().filter(e -> e.getValue() == mob.kind).findFirst().orElseThrow().getKey();
            int roll = random.nextInt(100), cumulative = 0;
            for (var drop : properties.getAsJsonObject(name).getAsJsonObject("drops").entrySet()) {
                cumulative += drop.getValue().getAsInt();
                if (roll < cumulative) {
                    Entity item = add(KINDS.get(drop.getKey()), mob.x, mob.y);
                    // DROP relies on the death position recorded by DESPAWN in the legacy client.
                    publish(mob, List.of(14, mob.id, item.id, item.kind, List.of(player.id)), null);
                    for (Entity peer : players.values()) if (near(peer, mob)) peer.visible.add(item.id);
                    break;
                }
            }
        } else publish(mob, List.of(7, mob.id, player.id), null);
    }
    private void loot(WebSocket socket, Entity player, int id) {
        Entity item = entities.get(id);
        if (item == null || !item.item() || item.removed || player.distance(item) > 2) return;
        hide(item, 30_000);
        if (item.kind >= 21 && item.kind <= 26) {
            player.armor = item.kind; player.armorLevel = item.kind - 20;
            player.hp = player.maxHp = 80 + (player.armorLevel - 1) * 30;
            send(socket, List.of(23, player.maxHp));
            publish(player, List.of(13, player.id, item.kind), null);
        } else if (item.kind >= 60) {
            player.weapon = item.kind;
            for (int i = 0; i < WEAPONS.length; i++) if (WEAPONS[i] == item.kind) player.weaponLevel = i + 1;
            publish(player, List.of(13, player.id, item.kind), null);
        } else {
            player.hp = Math.min(player.maxHp, player.hp + (item.kind == 35 ? 40 : 100));
            send(socket, List.of(10, player.hp));
        }
    }
    private int damage(int weapon, int armor) {
        return Math.max(1, weapon * (5 + random.nextInt(5)) - armor * (1 + random.nextInt(2)));
    }
    private void hide(Entity entity, long delay) {
        entity.removed = true; entity.respawnAt = System.currentTimeMillis() + delay; entity.target = 0;
        publish(entity, List.of(3, entity.id), null);
        for (Entity player : players.values()) player.visible.remove(entity.id);
    }
    private boolean near(Entity player, Entity entity) {
        return Math.abs(player.x - entity.x) <= 56 && Math.abs(player.y - entity.y) <= 24;
    }
    private void list(WebSocket socket) {
        Entity player = players.get(socket);
        if (player == null || player.hp <= 0) return;
        List<Object> packet = new ArrayList<>(); packet.add(19);
        player.visible.clear();
        for (Entity entity : entities.values()) {
            if (entity.id != player.id && !entity.removed && near(player, entity)) {
                packet.add(entity.id); player.visible.add(entity.id);
            }
        }
        send(socket, packet);
    }
    private void publish(Entity entity, Object packet, WebSocket except) {
        for (var entry : players.entrySet())
            if (entry.getKey() != except && (entry.getValue() == entity || entry.getValue().visible.contains(entity.id)))
                send(entry.getKey(), packet);
    }
    private void population() {
        for (WebSocket socket : players.keySet()) send(socket, List.of(17, players.size(), players.size()));
    }
    private void send(WebSocket socket, Object packet) {
        if (socket.isOpen()) socket.send(JSON.toJson(packet));
    }
    private static int integer(JsonArray packet, int index) {
        JsonElement value = packet.get(index);
        if (!value.isJsonPrimitive() || !value.getAsJsonPrimitive().isNumber()) throw new IllegalArgumentException();
        double number = value.getAsDouble();
        if (!Double.isFinite(number) || number != Math.rint(number) || number < Integer.MIN_VALUE || number > Integer.MAX_VALUE) throw new IllegalArgumentException();
        return (int) number;
    }
    private static String string(JsonArray packet, int index) {
        JsonElement value = packet.get(index);
        if (!value.isJsonPrimitive() || !value.getAsJsonPrimitive().isString()) throw new IllegalArgumentException();
        return value.getAsString();
    }
    private synchronized void tick() {
        long now = System.currentTimeMillis();
        ticks++;
        for (Entity entity : new ArrayList<>(entities.values())) {
            if (entity.removed && entity.kind != 1 && now >= entity.respawnAt) {
                entity.removed = false; entity.hp = entity.maxHp;
                entity.x = entity.homeX; entity.y = entity.homeY;
            }
            if (entity.removed || !entity.mob() || entity.target == 0) continue;
            Entity target = entities.get(entity.target);
            if (target == null || target.removed || target.hp <= 0 || entity.distance(target) > 18) { entity.target = 0; continue; }
            if (entity.distance(target) > 1) {
                int dx = Integer.signum(target.x - entity.x), dy = Integer.signum(target.y - entity.y);
                if (dx != 0 && map.valid(entity.x + dx, entity.y)) entity.x += dx;
                else if (dy != 0 && map.valid(entity.x, entity.y + dy)) entity.y += dy;
                publish(entity, List.of(4, entity.id, entity.x, entity.y), null);
            } else if (now - entity.lastHurt >= 1000) {
                entity.lastHurt = now;
                target.hp = Math.max(0, target.hp - damage(entity.weaponLevel, target.armorLevel));
                for (var entry : players.entrySet()) if (entry.getValue() == target) send(entry.getKey(), List.of(10, target.hp));
                if (target.hp == 0) { hide(target, 0); entity.target = 0; }
            }
        }
        if (ticks % 4 == 0) {
            for (var entry : players.entrySet()) {
                Entity player = entry.getValue();
                if (player.hp > 0 && player.hp < player.maxHp) {
                    player.hp = Math.min(player.maxHp, player.hp + Math.max(1, player.maxHp / 10));
                    send(entry.getKey(), List.of(10, player.hp, 1));
                }
                list(entry.getKey());
            }
        }
    }
    @Override public synchronized void onClose(WebSocket socket, int code, String reason, boolean remote) {
        Entity player = players.remove(socket);
        if (player != null) {
            publish(player, List.of(3, player.id), null);
            entities.remove(player.id);
            for (Entity entity : entities.values()) if (entity.target == player.id) entity.target = 0;
            population();
        }
    }
    @Override public void onError(WebSocket socket, Exception error) { error.printStackTrace(); }
    @Override public void onStart() {
        System.out.println("BrowserQuest Java: ws://" + getAddress().getHostString() + ":" + getPort() + "/");
        System.out.println("World " + map.width + "x" + map.height + ", entities: " + entities.size());
        clock.scheduleAtFixedRate(() -> {
            try { tick(); } catch (RuntimeException error) { error.printStackTrace(); }
        }, 500, 500, TimeUnit.MILLISECONDS);
    }
    public void shutdown() throws InterruptedException { clock.shutdownNow(); stop(1000); }
    public static void main(String[] args) throws Exception {
        GameServer server = new GameServer(args.length > 0 ? Integer.parseInt(args[0]) : 8080,
                args.length > 1 ? args[1] : "127.0.0.1", Path.of(args.length > 2 ? args[2] : "maps/world_server.json"));
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            try { server.shutdown(); } catch (InterruptedException error) { Thread.currentThread().interrupt(); }
        }));
        server.start();
    }
}
