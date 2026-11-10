package com.game;

import com.game.model.Item;
import com.game.model.MapData;
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
 * Máy chủ WebSocket chính của game Lữ Khách.
 * - Tích hợp đầy đủ Phần 1 (Quản lý phiên, JOIN/WELCOME, PING/PONG, giới hạn kết nối, dọn phiên)
 * - Tích hợp đầy đủ Phần 4 của Hoàng (CHAT, LOOT, RESPAWN, rơi đồ, nhặt một lần, hồi máu, hồi sinh player/quái)
 * - Khởi tạo sẵn Fake World (dữ liệu giả định: Map 32x24, SafeZone, 5 Slime, Bình máu mẫu) theo docs/protocol-v1.md
 *   để chạy độc lập và demo ngay mà không phải chờ P2, P3.
 */
public class GameServer extends WebSocketServer {
    private static final int MAX_PLAYERS = 4;               // Theo docs/game-design.md Mục 13 (tối đa 4 người chơi)
    private static final int MAX_MESSAGE_BYTES = 4096;      // Giới hạn gói tin 4 KiB UTF-8
    private static final long TICK_DURATION_MS = 100L;      // 10 ticks / giây (100ms/tick)
    private static final long HEARTBEAT_INTERVAL = 10000L;  // 10 giây PING 1 lần
    private static final int PLAYER_ATTACK_DAMAGE = 15;     // Sát thương player theo Mục 6 game-design.md
    private static final long PLAYER_ATTACK_COOLDOWN_TICKS = 6L; // 600ms = 6 ticks

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
        this.world = WorldContext.createDefaultFixtureWorld();
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
        System.out.println("Java GameServer (Lữ Khách) đang lắng nghe tại cổng: " + getPort());
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
        if (message == null) {
            return;
        }
        // Kiểm tra giới hạn 4 KiB ở tầng transport theo Mục 2 docs/protocol-v1.md
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

            // Kiểm tra STALE_REQUEST nếu người chơi đã JOIN và gửi kèm requestId
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

                case "PING":
                    isAliveMap.put(conn, true);
                    String nonce = getStringField(payloadObj, "nonce", "");
                    if (nonce.length() > 64) {
                        sendError(conn, requestId, "INVALID_MESSAGE", "nonce vượt quá 64 ký tự");
                        return;
                    }
                    NetworkMessage pong = NetworkMessage.event("PONG", world.getCurrentTick(), Map.of("nonce", nonce));
                    conn.send(gson.toJson(pong));
                    break;

                case "PONG":
                    isAliveMap.put(conn, true);
                    break;

                case "CHAT":
                    handleChatCommand(conn, currentPlayer, payloadObj, requestId);
                    break;

                case "LOOT":
                    handleLootCommand(conn, currentPlayer, payloadObj, requestId);
                    break;

                case "RESPAWN":
                    handleRespawnCommand(conn, currentPlayer, requestId);
                    break;

                case "MOVE_TO":
                    handleMoveToCommand(conn, currentPlayer, payloadObj, requestId);
                    break;

                case "MOVE":
                    handleLegacyMoveCommand(currentPlayer, payloadObj);
                    break;

                case "ATTACK":
                    handleAttackCommand(conn, currentPlayer, payloadObj, requestId);
                    break;

                // Các lệnh hỗ trợ Giả lập / Demo Phần 4 độc lập không cần chờ P2, P3
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
                    sendError(conn, requestId, "INVALID_MESSAGE", "Loại lệnh không được hỗ trợ: " + type);
                    break;
            }
        } catch (Exception e) {
            System.err.println("Lỗi xử lý tin nhắn: " + e.getMessage());
            sendError(conn, requestId, "INVALID_MESSAGE", "Định dạng gói tin JSON không hợp lệ");
        }
    }

    private void handleJoin(WebSocket conn, JsonObject payload, Long requestId) {
        if (players.containsKey(conn)) {
            sendError(conn, requestId, "ALREADY_JOINED", "Phiên kết nối này đã vào game rồi");
            return;
        }
        if (players.size() >= MAX_PLAYERS) {
            sendError(conn, requestId, "WORLD_FULL", "Máy chủ đã đầy (tối đa " + MAX_PLAYERS + " người chơi)");
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
        MapData.GridPoint spawn = world.nextSafeSpawnPoint();

        Player newPlayer = new Player(playerId, trimmedName, avatar, spawn.x, spawn.y);
        if (requestId != null && requestId > 0) {
            newPlayer.setLastRequestId(requestId);
        }

        players.put(conn, newPlayer);
        world.addPlayer(newPlayer);

        // Gói WELCOME chuẩn theo Mục 5 docs/protocol-v1.md
        Map<String, Object> welcomePayload = new LinkedHashMap<>();
        welcomePayload.put("playerId", playerId);
        welcomePayload.put("tickDurationMs", TICK_DURATION_MS);
        welcomePayload.put("map", world.getMap());
        welcomePayload.put("state", world.createSnapshot());

        NetworkMessage welcomeMsg = new NetworkMessage("WELCOME");
        welcomeMsg.requestId = requestId;
        welcomeMsg.tick = world.getCurrentTick();
        welcomeMsg.id = playerId; // Giữ tương thích với client P1
        welcomeMsg.payload = welcomePayload;
        conn.send(gson.toJson(welcomeMsg));

        // Phát sự kiện người chơi mới xuất hiện
        Map<String, Object> spawnPayload = new LinkedHashMap<>();
        spawnPayload.put("id", playerId);
        spawnPayload.put("kind", "PLAYER");
        spawnPayload.put("spawnGeneration", null);
        broadcastMessage(gson.toJson(NetworkMessage.event("ENTITY_SPAWN", world.getCurrentTick(), spawnPayload)), conn);

        NetworkMessage joinedMsg = new NetworkMessage("PLAYER_JOINED");
        joinedMsg.tick = world.getCurrentTick();
        joinedMsg.payload = newPlayer;
        broadcastMessage(gson.toJson(joinedMsg), conn);

        flushAndBroadcastWorldEvents();
    }

    private void handleChatCommand(WebSocket conn, Player sender, JsonObject payload, Long requestId) {
        String text = payload.has("text") && !payload.get("text").isJsonNull()
            ? payload.get("text").getAsString()
            : null;
        CommandResult result = lootRespawnSystem.handleChat(sender, text, System.currentTimeMillis());
        conn.send(gson.toJson(result.toNetworkMessage(requestId, world.getCurrentTick())));
        flushAndBroadcastWorldEvents();
    }

    private void handleLootCommand(WebSocket conn, Player player, JsonObject payload, Long requestId) {
        String itemId = getStringField(payload, "itemId", null);
        CommandResult result = lootRespawnSystem.handleLoot(player, itemId);
        conn.send(gson.toJson(result.toNetworkMessage(requestId, world.getCurrentTick())));
        flushAndBroadcastWorldEvents();
        if (result.isAccepted()) {
            broadcastSnapshot();
        }
    }

    private void handleRespawnCommand(WebSocket conn, Player player, Long requestId) {
        CommandResult result = lootRespawnSystem.handleRespawn(player);
        conn.send(gson.toJson(result.toNetworkMessage(requestId, world.getCurrentTick())));
        flushAndBroadcastWorldEvents();
        if (result.isAccepted()) {
            broadcastSnapshot();
        }
    }

    private void handleMoveToCommand(WebSocket conn, Player player, JsonObject payload, Long requestId) {
        if (player == null) {
            sendError(conn, requestId, "JOIN_REQUIRED", "Bạn cần vào game trước khi di chuyển");
            return;
        }
        if (player.isDead()) {
            sendError(conn, requestId, "PLAYER_DEAD", "Nhân vật đã chết, không thể di chuyển");
            return;
        }
        if (!payload.has("x") || !payload.has("y")) {
            sendError(conn, requestId, "INVALID_MESSAGE", "Thiếu tọa độ đích x, y");
            return;
        }
        int targetX = payload.get("x").getAsInt();
        int targetY = payload.get("y").getAsInt();

        if (!world.getMap().isInside(targetX, targetY)) {
            sendError(conn, requestId, "INVALID_TARGET", "Ô đích nằm ngoài bản đồ");
            return;
        }
        if (world.getMap().isBlocked(targetX, targetY)) {
            sendError(conn, requestId, "BLOCKED_TILE", "Ô đích bị chặn bởi vật cản");
            return;
        }

        synchronized (world) {
            player.setGridPosition(targetX, targetY, world.getMap().getTileSize());
            player.setTargetId(null);
            player.setState("IDLE");
        }
        conn.send(gson.toJson(NetworkMessage.ack(requestId, world.getCurrentTick(), "MOVE_TO")));
        broadcastSnapshot();
    }

    private void handleLegacyMoveCommand(Player player, JsonObject payload) {
        if (player == null || player.isDead()) {
            return;
        }
        float dx = payload.has("dx") ? payload.get("dx").getAsFloat() : 0f;
        float dy = payload.has("dy") ? payload.get("dy").getAsFloat() : 0f;
        synchronized (world) {
            int nextX = Math.max(1, Math.min(world.getMap().getWidth() - 2, player.getGridX() + Math.round(Math.signum(dx))));
            int nextY = Math.max(1, Math.min(world.getMap().getHeight() - 2, player.getGridY() + Math.round(Math.signum(dy))));
            if (!world.getMap().isBlocked(nextX, nextY)) {
                player.setGridPosition(nextX, nextY, world.getMap().getTileSize());
            }
        }
        broadcastSnapshot();
    }

    private void handleAttackCommand(WebSocket conn, Player player, JsonObject payload, Long requestId) {
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
        if (mob == null || mob.isDead()) {
            sendError(conn, requestId, "INVALID_TARGET", "Mục tiêu quái không hợp lệ hoặc đã chết");
            return;
        }

        player.setTargetId(targetId);
        player.setState("ATTACKING");
        conn.send(gson.toJson(NetworkMessage.ack(requestId, world.getCurrentTick(), "ATTACK")));
    }

    private void handleSimulateDamage(WebSocket conn, Player player, JsonObject payload, Long requestId) {
        if (player == null) {
            sendError(conn, requestId, "JOIN_REQUIRED", "Bạn cần vào game trước");
            return;
        }
        int amount = payload.has("amount") ? payload.get("amount").getAsInt() : 40;
        lootRespawnSystem.applyDamageToPlayer("m-1", player, amount);
        conn.send(gson.toJson(NetworkMessage.ack(requestId, world.getCurrentTick(), "SIMULATE_DAMAGE")));
        flushAndBroadcastWorldEvents();
        broadcastSnapshot();
    }

    private void handleSimulateKillMob(WebSocket conn, Player player, JsonObject payload, Long requestId) {
        if (player == null) {
            sendError(conn, requestId, "JOIN_REQUIRED", "Bạn cần vào game trước");
            return;
        }
        String mobId = getStringField(payload, "mobId", null);
        Mob targetMob = (mobId != null) ? world.getMob(mobId) : findNearestAliveMob(player);
        if (targetMob == null || targetMob.isDead()) {
            sendError(conn, requestId, "INVALID_TARGET", "Không còn quái sống nào để hạ gục");
            return;
        }

        // Đảm bảo rơi bình máu khi bấm nút giả lập test hạ gục quái hoặc theo tỉ lệ
        boolean forceDrop = payload.has("forceDrop") && payload.get("forceDrop").getAsBoolean();
        double prevRate = lootRespawnSystem.getDropRate();
        if (forceDrop) {
            lootRespawnSystem.setDropRate(1.0);
        }
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
        if (player == null) {
            sendError(conn, requestId, "JOIN_REQUIRED", "Bạn cần vào game trước");
            return;
        }
        synchronized (world) {
            int dropX = player.getGridX();
            int dropY = player.getGridY();
            Item item = world.spawnHealthPotion(dropX, dropY, world.getCurrentTick() + LootRespawnSystem.ITEM_LIFETIME_TICKS);
            Map<String, Object> spawnPayload = new LinkedHashMap<>();
            spawnPayload.put("id", item.getId());
            spawnPayload.put("kind", "ITEM");
            spawnPayload.put("spawnGeneration", null);
            world.emitEvent("ENTITY_SPAWN", spawnPayload);
        }
        conn.send(gson.toJson(NetworkMessage.ack(requestId, world.getCurrentTick(), "SIMULATE_SPAWN_POTION")));
        flushAndBroadcastWorldEvents();
        broadcastSnapshot();
    }

    private Mob findNearestAliveMob(Player player) {
        Mob best = null;
        int bestDist = Integer.MAX_VALUE;
        for (Mob m : world.getMobs()) {
            if (!m.isDead()) {
                int d = Math.abs(player.getGridX() - m.getX()) + Math.abs(player.getGridY() - m.getY());
                if (d < bestDist) {
                    bestDist = d;
                    best = m;
                }
            }
        }
        return best;
    }

    /**
     * Vòng lặp World Thread chạy mỗi 100ms (10 ticks/giây) theo đúng Mục 7 docs/protocol-v1.md:
     * combat cơ bản -> hết hạn item -> hồi sinh quái -> phát event -> phát WORLD_STATE snapshot.
     */
    private void startWorldLoop() {
        worldTickTimer = new Timer("WorldTickThread", true);
        worldTickTimer.scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() {
                try {
                    synchronized (world) {
                        long tick = world.advanceTick();

                        // Xử lý tự động đánh quái khi player đang chọn mục tiêu ATTACK ở ô kề cạnh
                        for (Player p : world.getPlayers()) {
                            if (!p.isDead() && p.getTargetId() != null) {
                                Mob mob = world.getMob(p.getTargetId());
                                if (mob == null || mob.isDead()) {
                                    p.setTargetId(null);
                                    p.setState("IDLE");
                                } else {
                                    int dist = Math.abs(p.getGridX() - mob.getX()) + Math.abs(p.getGridY() - mob.getY());
                                    if (dist <= 1 && (tick - p.getLastAttackTick()) >= PLAYER_ATTACK_COOLDOWN_TICKS) {
                                        p.setLastAttackTick(tick);
                                        lootRespawnSystem.applyDamageToMob(p.getId(), mob, PLAYER_ATTACK_DAMAGE);
                                    }
                                }
                            }
                        }

                        // Cập nhật hệ thống Phần 4: xóa bình máu hết hạn (200 ticks) & hồi sinh quái (150 ticks)
                        lootRespawnSystem.updateTick();
                    }

                    // Phát các event hiệu ứng trước snapshot tương ứng theo Mục 5 docs/protocol-v1.md
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
        if (players.isEmpty()) {
            return;
        }
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
        heartbeatTimer = new Timer("HeartbeatThread", true);
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
            world.removePlayer(leaver.getId());
            System.out.println("[CLEANUP] Đã dọn dẹp phiên của: " + leaver.getName() + " (" + leaver.getId() + ")");

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
        if (obj == null || !obj.has(key) || obj.get(key).isJsonNull()) {
            return defaultValue;
        }
        return obj.get(key).getAsString();
    }

    private static boolean hasControlChars(String s) {
        for (int i = 0; i < s.length(); i++) {
            if (Character.isISOControl(s.charAt(i))) {
                return true;
            }
        }
        return false;
    }
}
