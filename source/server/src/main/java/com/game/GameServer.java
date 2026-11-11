package com.game;

import com.game.features.movement.MoveToHandler;
import com.game.model.Item;
import com.game.model.Mob;
import com.game.model.NetworkMessage;
import com.game.model.Player;
import com.game.systems.CommandResult;
import com.game.systems.LootRespawnSystem;
import com.game.world.WorldContext;
import com.google.gson.Gson;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Timer;
import java.util.TimerTask;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * GameServer tổng hợp của nhóm Lữ Khách:
 * - Feature 1: Quản lý kết nối WebSocket, Heartbeat, Session dọn dẹp, Giới hạn người chơi (Tuấn)
 * - Feature 2: Bản đồ thế giới (world-01, world-02), Cổng chuyển map, A* Pathfinding và MovementSystem theo tick (Vũ)
 * - Feature 3: Quái Slime spawn, chọn mục tiêu, combat cận chiến, sát thương 15 HP, quái chết
 * - Feature 4: Chat thời gian thực (rate limit 1s), Rơi bình máu (50%), Nhặt một lần (+30 HP), Hồi sinh Player & Quái (Hoàng)
 */
public class GameServer extends WebSocketServer {
    private static final int MAX_PLAYERS = 50;
    private static final int MAX_MESSAGE_BYTES = 4096;
    private static final long TICK_DURATION_MS = 100L;
    private static final long HEARTBEAT_INTERVAL = 10000L;
    private static final int PLAYER_ATTACK_DAMAGE = 15;
    private static final long PLAYER_ATTACK_COOLDOWN_TICKS = 6L;

    private final Map<WebSocket, Player> players = new ConcurrentHashMap<>();
    private final Map<WebSocket, Boolean> isAliveMap = new ConcurrentHashMap<>();
    private final AtomicInteger playerIdSequence = new AtomicInteger(0);
    private final Gson gson = new Gson();

    private final WorldContext world;
    private final LootRespawnSystem lootRespawnSystem;

    private Timer worldTickTimer;
    private Timer heartbeatTimer;

    public GameServer(int port) {
        super(new InetSocketAddress(port));
        this.world = new WorldContext();
        this.lootRespawnSystem = new LootRespawnSystem(this.world);
    }

    public WorldContext getWorld() {
        return world;
    }

    public LootRespawnSystem getLootRespawnSystem() {
        return lootRespawnSystem;
    }

    @Override
    public void onStart() {
        System.out.println("Java GameServer (Lữ Khách - Bản tích hợp đầy đủ) đang lắng nghe tại cổng: " + getPort());
        startWorldLoop();
        startHeartbeat();
    }

    @Override
    public void onOpen(WebSocket conn, ClientHandshake handshake) {
        System.out.println("[KẾT NỐI MỚI] Từ IP: " + conn.getRemoteSocketAddress());
        isAliveMap.put(conn, true);
    }

    @Override
    public void onClose(WebSocket conn, int code, String reason, boolean remote) {
        cleanupSession(conn);
    }

    @Override
    public void onMessage(WebSocket conn, String message) {
        if (message == null) return;
        if (message.getBytes(StandardCharsets.UTF_8).length > MAX_MESSAGE_BYTES) {
            conn.close(1009, "Message exceeds 4 KiB limit");
            return;
        }

        Long requestId = null;
        try {
            JsonElement parsed = JsonParser.parseString(message);
            if (!parsed.isJsonObject()) {
                sendError(conn, null, "INVALID_MESSAGE", "Gói tin phải là một JSON object");
                return;
            }
            JsonObject root = parsed.getAsJsonObject();

            if (root.has("v") && !root.get("v").isJsonNull()) {
                int v = root.get("v").getAsInt();
                if (v != 1) {
                    sendError(conn, null, "UNSUPPORTED_VERSION", "Chỉ hỗ trợ giao thức phiên bản v = 1");
                    return;
                }
            }

            if (root.has("requestId") && !root.get("requestId").isJsonNull()) {
                requestId = root.get("requestId").getAsLong();
                if (requestId <= 0) {
                    sendError(conn, null, "INVALID_MESSAGE", "requestId phải là số nguyên dương");
                    return;
                }
            }

            if (!root.has("type") || root.get("type").isJsonNull()) {
                sendError(conn, requestId, "INVALID_MESSAGE", "Thiếu trường type trong gói tin");
                return;
            }

            String type = root.get("type").getAsString();
            JsonObject payloadObj = (root.has("payload") && root.get("payload").isJsonObject())
                ? root.getAsJsonObject("payload")
                : root;

            Player currentPlayer = players.get(conn);

            if (currentPlayer != null && requestId != null && !"PING".equals(type) && !"PONG".equals(type)) {
                if (requestId <= currentPlayer.getLastRequestId()) {
                    sendError(conn, requestId, "STALE_REQUEST", "requestId bị trùng hoặc cũ hơn lệnh trước đó");
                    return;
                }
                currentPlayer.setLastRequestId(requestId);
            }

            switch (type) {
                case "JOIN":
                    handleJoin(conn, payloadObj, requestId);
                    break;

                case "MOVE_TO":
                    handleMoveTo(conn, currentPlayer, payloadObj, requestId);
                    break;

                case "ATTACK":
                    handleAttack(conn, currentPlayer, payloadObj, requestId);
                    break;

                case "LOOT":
                    handleLoot(conn, currentPlayer, payloadObj, requestId);
                    break;

                case "RESPAWN":
                    handleRespawn(conn, currentPlayer, requestId);
                    break;

                case "CHAT":
                    handleChat(conn, currentPlayer, payloadObj, requestId);
                    break;

                case "PING":
                    isAliveMap.put(conn, true);
                    String nonce = getStringField(payloadObj, "nonce", "");
                    NetworkMessage pong = NetworkMessage.event("PONG", world.getCurrentTick(), Map.of("nonce", nonce));
                    conn.send(gson.toJson(pong));
                    break;

                case "PONG":
                    isAliveMap.put(conn, true);
                    break;

                case "SIMULATE_DAMAGE":
                    handleSimulateDamage(conn, currentPlayer, payloadObj, requestId);
                    break;

                case "SIMULATE_KILL_MOB":
                    handleSimulateKillMob(conn, currentPlayer, payloadObj, requestId);
                    break;

                case "SIMULATE_SPAWN_POTION":
                    handleSimulateSpawnPotion(conn, currentPlayer, requestId);
                    break;

                default:
                    sendError(conn, requestId, "INVALID_MESSAGE", "Loại lệnh không hỗ trợ: " + type);
                    break;
            }
        } catch (Exception e) {
            System.err.println("Lỗi xử lý tin nhắn: " + e.getMessage());
            sendError(conn, requestId, "INVALID_MESSAGE", "Định dạng JSON không hợp lệ");
        }
    }

    private void handleJoin(WebSocket conn, JsonObject payload, Long requestId) {
        if (players.containsKey(conn)) {
            sendError(conn, requestId, "ALREADY_JOINED", "Phiên kết nối này đã vào game rồi");
            return;
        }
        if (players.size() >= MAX_PLAYERS) {
            sendError(conn, requestId, "WORLD_FULL", "Máy chủ đã đầy");
            conn.close();
            return;
        }

        String rawName = getStringField(payload, "name", "");
        String trimmedName = rawName != null ? rawName.trim() : "";
        int nameCodePoints = trimmedName.codePointCount(0, trimmedName.length());
        if (nameCodePoints < 1 || nameCodePoints > 15 || hasControlChars(trimmedName)) {
            sendError(conn, requestId, "INVALID_NAME", "Tên nhân vật phải từ 1 đến 15 ký tự hợp lệ");
            return;
        }

        String avatar = getStringField(payload, "avatar", "knight");
        String playerId = "p-" + playerIdSequence.incrementAndGet();

        // Xuất hiện tại safeZone của world-01 (vị trí 3, 3)
        Player newPlayer = new Player(playerId, trimmedName, avatar, "world-01", 3, 3);
        if (requestId != null && requestId > 0) {
            newPlayer.setLastRequestId(requestId);
        }

        players.put(conn, newPlayer);
        world.addPlayer(newPlayer);

        long nowMs = System.nanoTime() / 1_000_000;
        try {
            world.getMovementModule().joined(playerId, nowMs);
        } catch (Exception e) {
            System.err.println("MovementModule joined error: " + e.getMessage());
        }

        // Gửi WELCOME
        Map<String, Object> welcomePayload = new LinkedHashMap<>();
        welcomePayload.put("playerId", playerId);
        welcomePayload.put("tickDurationMs", TICK_DURATION_MS);
        welcomePayload.put("mapId", "world-01");
        welcomePayload.put("state", world.createSnapshot());

        NetworkMessage welcomeMsg = new NetworkMessage("WELCOME");
        welcomeMsg.requestId = requestId;
        welcomeMsg.tick = world.getCurrentTick();
        welcomeMsg.id = playerId;
        welcomeMsg.payload = welcomePayload;
        conn.send(gson.toJson(welcomeMsg));

        // Broadcast player spawn
        Map<String, Object> spawnPayload = new LinkedHashMap<>();
        spawnPayload.put("id", playerId);
        spawnPayload.put("kind", "PLAYER");
        spawnPayload.put("mapId", "world-01");
        spawnPayload.put("spawnGeneration", null);
        broadcastMessage(gson.toJson(NetworkMessage.event("ENTITY_SPAWN", world.getCurrentTick(), spawnPayload)), conn);

        NetworkMessage joinedMsg = new NetworkMessage("PLAYER_JOINED");
        joinedMsg.tick = world.getCurrentTick();
        joinedMsg.payload = newPlayer;
        broadcastMessage(gson.toJson(joinedMsg), conn);

        flushAndBroadcastWorldEvents();
    }

    private void handleMoveTo(WebSocket conn, Player player, JsonObject payload, Long requestId) {
        if (player == null) {
            sendError(conn, requestId, "JOIN_REQUIRED", "Bạn cần vào game trước khi di chuyển");
            return;
        }
        if (player.isDead()) {
            sendError(conn, requestId, "PLAYER_DEAD", "Nhân vật đã chết, không thể di chuyển");
            return;
        }

        MoveToHandler.Result res = world.getMovementModule().commands.handle(player.getId(), payload);
        if (res.accepted()) {
            conn.send(gson.toJson(NetworkMessage.ack(requestId, world.getCurrentTick(), "MOVE_TO")));
        } else {
            sendError(conn, requestId, res.code(), "Không thể di chuyển tới ô đích: " + res.code());
        }
    }

    private void handleAttack(WebSocket conn, Player player, JsonObject payload, Long requestId) {
        if (player == null) {
            sendError(conn, requestId, "JOIN_REQUIRED", "Bạn cần vào game trước khi tấn công");
            return;
        }
        if (player.isDead()) {
            sendError(conn, requestId, "PLAYER_DEAD", "Nhân vật đã chết, không thể tấn công");
            return;
        }

        String targetId = getStringField(payload, "targetId", null);
        if (targetId == null || targetId.isEmpty()) {
            player.setTargetId(null);
            player.setState("IDLE");
            conn.send(gson.toJson(NetworkMessage.ack(requestId, world.getCurrentTick(), "ATTACK")));
            return;
        }

        Mob mob = world.getMob(targetId);
        if (mob == null || mob.isDead() || !mob.getMapId().equals(player.getMapId())) {
            sendError(conn, requestId, "INVALID_TARGET", "Mục tiêu không hợp lệ hoặc đã chết");
            return;
        }

        player.setTargetId(targetId);
        player.setState("ATTACKING");
        conn.send(gson.toJson(NetworkMessage.ack(requestId, world.getCurrentTick(), "ATTACK")));
    }

    private void handleLoot(WebSocket conn, Player player, JsonObject payload, Long requestId) {
        String itemId = getStringField(payload, "itemId", null);
        CommandResult result = lootRespawnSystem.handleLoot(player, itemId);
        conn.send(gson.toJson(result.toNetworkMessage(requestId, world.getCurrentTick())));
        flushAndBroadcastWorldEvents();
        if (result.isAccepted()) {
            broadcastSnapshot();
        }
    }

    private void handleRespawn(WebSocket conn, Player player, Long requestId) {
        CommandResult result = lootRespawnSystem.handleRespawn(player);
        conn.send(gson.toJson(result.toNetworkMessage(requestId, world.getCurrentTick())));
        flushAndBroadcastWorldEvents();
        if (result.isAccepted()) {
            long nowMs = System.nanoTime() / 1_000_000;
            world.getMovementModule().left(player.getId());
            try {
                world.getMovementModule().joined(player.getId(), nowMs);
            } catch (Exception ignored) {}
            broadcastSnapshot();
        }
    }

    private void handleChat(WebSocket conn, Player player, JsonObject payload, Long requestId) {
        String text = payload.has("text") && !payload.get("text").isJsonNull()
            ? payload.get("text").getAsString()
            : null;
        CommandResult result = lootRespawnSystem.handleChat(player, text, System.currentTimeMillis());
        conn.send(gson.toJson(result.toNetworkMessage(requestId, world.getCurrentTick())));
        flushAndBroadcastWorldEvents();
    }

    private void handleSimulateDamage(WebSocket conn, Player player, JsonObject payload, Long requestId) {
        if (player == null) return;
        int amount = payload.has("amount") ? payload.get("amount").getAsInt() : 40;
        lootRespawnSystem.applyDamageToPlayer("m-1", player, amount);
        conn.send(gson.toJson(NetworkMessage.ack(requestId, world.getCurrentTick(), "SIMULATE_DAMAGE")));
        flushAndBroadcastWorldEvents();
        broadcastSnapshot();
    }

    private void handleSimulateKillMob(WebSocket conn, Player player, JsonObject payload, Long requestId) {
        if (player == null) return;
        Mob targetMob = null;
        for (Mob m : world.getMobs()) {
            if (!m.isDead() && m.getMapId().equals(player.getMapId())) {
                targetMob = m;
                break;
            }
        }
        if (targetMob == null) {
            sendError(conn, requestId, "INVALID_TARGET", "Không có quái sống trên map hiện tại");
            return;
        }

        double prevRate = lootRespawnSystem.getDropRate();
        lootRespawnSystem.setDropRate(1.0); // Bấm nút test thì luôn rơi bình máu
        try {
            lootRespawnSystem.applyDamageToMob(player.getId(), targetMob, targetMob.getHp());
        } finally {
            lootRespawnSystem.setDropRate(prevRate);
        }

        conn.send(gson.toJson(NetworkMessage.ack(requestId, world.getCurrentTick(), "SIMULATE_KILL_MOB")));
        flushAndBroadcastWorldEvents();
        broadcastSnapshot();
    }

    private void handleSimulateSpawnPotion(WebSocket conn, Player player, Long requestId) {
        if (player == null) return;
        synchronized (world) {
            Item item = world.spawnHealthPotion(player.getMapId(), player.getX(), player.getY(), world.getCurrentTick() + LootRespawnSystem.ITEM_LIFETIME_TICKS);
            Map<String, Object> spawnPayload = new LinkedHashMap<>();
            spawnPayload.put("id", item.getId());
            spawnPayload.put("kind", "ITEM");
            spawnPayload.put("mapId", player.getMapId());
            spawnPayload.put("spawnGeneration", null);
            world.emitEvent("ENTITY_SPAWN", spawnPayload);
        }
        conn.send(gson.toJson(NetworkMessage.ack(requestId, world.getCurrentTick(), "SIMULATE_SPAWN_POTION")));
        flushAndBroadcastWorldEvents();
        broadcastSnapshot();
    }

    private void startWorldLoop() {
        worldTickTimer = new Timer("AuthoritativeWorldLoop", true);
        worldTickTimer.scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() {
                try {
                    synchronized (world) {
                        long nowMs = System.nanoTime() / 1_000_000;
                        long tick = world.advanceTick();

                        // 1. Tiến bước di chuyển theo Feature 2 (Vũ) & Cổng chuyển map
                        world.getMovementModule().system.update(nowMs);

                        // 2. Xử lý tấn công cận chiến (Feature 3 & 4)
                        for (Player p : world.getPlayers()) {
                            if (!p.isDead() && p.getTargetId() != null) {
                                Mob mob = world.getMob(p.getTargetId());
                                if (mob == null || mob.isDead() || !mob.getMapId().equals(p.getMapId())) {
                                    p.setTargetId(null);
                                    p.setState("IDLE");
                                } else {
                                    int dist = Math.abs(p.getX() - mob.getX()) + Math.abs(p.getY() - mob.getY());
                                    if (dist <= 1 && (tick - p.getLastAttackTick()) >= PLAYER_ATTACK_COOLDOWN_TICKS) {
                                        p.setLastAttackTick(tick);
                                        lootRespawnSystem.applyDamageToMob(p.getId(), mob, PLAYER_ATTACK_DAMAGE);
                                    }
                                }
                            }
                        }

                        // 3. Cập nhật bình máu hết hạn và quái hồi sinh (Feature 4 - Hoàng)
                        lootRespawnSystem.updateTick();
                    }

                    flushAndBroadcastWorldEvents();
                    broadcastSnapshot();
                } catch (Exception e) {
                    System.err.println("[WORLD TICK ERROR] " + e.getMessage());
                }
            }
        }, TICK_DURATION_MS, TICK_DURATION_MS);
    }

    private void flushAndBroadcastWorldEvents() {
        List<NetworkMessage> events = world.drainPendingEvents();
        for (NetworkMessage ev : events) {
            broadcastMessage(gson.toJson(ev), null);
        }
    }

    private void broadcastSnapshot() {
        if (players.isEmpty()) return;
        NetworkMessage snapshotMsg = NetworkMessage.event("WORLD_STATE", world.getCurrentTick(), world.createSnapshot());
        String json = gson.toJson(snapshotMsg);
        broadcastMessage(json, null);
    }

    @Override
    public void onError(WebSocket conn, Exception ex) {
        if (conn != null) {
            cleanupSession(conn);
        }
    }

    private void startHeartbeat() {
        heartbeatTimer = new Timer("HeartbeatTimer", true);
        heartbeatTimer.scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() {
                NetworkMessage pingMsg = NetworkMessage.event("PING", world.getCurrentTick(), Map.of("nonce", "hb"));
                String pingJson = gson.toJson(pingMsg);

                for (WebSocket conn : getConnections()) {
                    Boolean isAlive = isAliveMap.getOrDefault(conn, false);
                    if (!isAlive) {
                        System.out.println("[TIMEOUT] Ngắt kết nối treo từ: " + conn.getRemoteSocketAddress());
                        cleanupSession(conn);
                        conn.close();
                    } else {
                        isAliveMap.put(conn, false);
                        if (conn.isOpen()) {
                            conn.send(pingJson);
                        }
                    }
                }
            }
        }, HEARTBEAT_INTERVAL, HEARTBEAT_INTERVAL);
    }

    private void cleanupSession(WebSocket conn) {
        isAliveMap.remove(conn);
        Player leaver = players.remove(conn);
        if (leaver != null) {
            world.getMovementModule().left(leaver.getId());
            world.removePlayer(leaver.getId());
            System.out.println("[CLEANUP] Đã dọn dẹp phiên: " + leaver.getName() + " (" + leaver.getId() + ")");

            Map<String, Object> despawnPayload = new LinkedHashMap<>();
            despawnPayload.put("id", leaver.getId());
            despawnPayload.put("reason", "DISCONNECTED");
            broadcastMessage(gson.toJson(NetworkMessage.event("ENTITY_DESPAWN", world.getCurrentTick(), despawnPayload)), null);

            NetworkMessage msg = new NetworkMessage("PLAYER_LEFT");
            msg.tick = world.getCurrentTick();
            msg.id = leaver.getId();
            broadcastMessage(gson.toJson(msg), null);
        }
    }

    private void sendError(WebSocket conn, Long requestId, String code, String message) {
        if (conn != null && conn.isOpen()) {
            NetworkMessage err = NetworkMessage.error(requestId, world.getCurrentTick(), code, message);
            conn.send(gson.toJson(err));
        }
    }

    private void broadcastMessage(String text, WebSocket exclude) {
        for (WebSocket client : players.keySet()) {
            if (client != exclude && client.isOpen()) {
                client.send(text);
            }
        }
    }

    private static String getStringField(JsonObject obj, String key, String defaultValue) {
        if (obj == null || !obj.has(key) || obj.get(key).isJsonNull()) return defaultValue;
        return obj.get(key).getAsString();
    }

    private static boolean hasControlChars(String s) {
        for (int i = 0; i < s.length(); i++) {
            if (Character.isISOControl(s.charAt(i))) return true;
        }
        return false;
    }
}
