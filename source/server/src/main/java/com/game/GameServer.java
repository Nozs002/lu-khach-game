package com.game;

import com.game.features.movement.MoveToHandler;
import com.game.features.movement.MovementSystem;
import com.game.handler.JoinHandler;
import com.game.model.NetworkMessage;
import com.game.model.Player;
import com.game.systems.CommandResult;
import com.game.systems.LootRespawnSystem;
import com.game.world.WorldContext;
import com.game.world.WorldMap;
import com.google.gson.Gson;
import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public class GameServer extends WebSocketServer {
    private static final int MAX_PLAYERS = 50;
    private static final int MAX_MESSAGE_BYTES = 4096;
    private static final String MAP_RESOURCE = "/maps/world.generated.json";
    private static final long WORLD_TICK_MILLIS = 100L; // 10 tick/giây
    private static final int MOVEMENT_STEP_EVERY_TICKS = 2; // 200ms/bước = 5 ô/giây

    private final Map<WebSocket, Player> players = new ConcurrentHashMap<>();
    private final Gson gson = new Gson();
    private final WorldMap worldMap = WorldMap.loadFromResource(MAP_RESOURCE, gson);
    private final WorldContext worldContext = new WorldContext(worldMap);
    private final LootRespawnSystem lootRespawnSystem = new LootRespawnSystem(worldContext);
    private final JoinHandler joinHandler = new JoinHandler(players, gson, MAX_PLAYERS, worldMap, worldContext);
    private final MoveToHandler moveToHandler = new MoveToHandler(worldMap);
    private final MovementSystem movementSystem = new MovementSystem();
    private final ScheduledExecutorService worldTicker = Executors.newSingleThreadScheduledExecutor(runnable -> {
        Thread thread = new Thread(runnable, "game-world-tick");
        thread.setDaemon(true);
        return thread;
    });

    public GameServer(int port) {
        super(new InetSocketAddress(port));
        // Java-WebSocket enables Ping/Pong connection checks by default.
        setConnectionLostTimeout(10);
    }

    public WorldContext getWorldContext() {
        return worldContext;
    }

    public LootRespawnSystem getLootRespawnSystem() {
        return lootRespawnSystem;
    }

    @Override
    public void onStart() {
        System.out.println("Java GameServer đang lắng nghe tại cổng: " + getPort());
        worldTicker.scheduleAtFixedRate(
                this::tickWorld,
                WORLD_TICK_MILLIS,
                WORLD_TICK_MILLIS,
                TimeUnit.MILLISECONDS
        );
    }

    @Override
    public void onOpen(WebSocket conn, ClientHandshake handshake) {
        System.out.println("[KẾT NỐI MỚI] Từ IP: " + conn.getRemoteSocketAddress());
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

        try {
            NetworkMessage input = gson.fromJson(message, NetworkMessage.class);
            if (input == null || input.type == null) {
                sendError(conn, "INVALID_MESSAGE", "Gói tin không hợp lệ.");
                return;
            }

            synchronized (players) {
                switch (input.type) {
                    case "JOIN":
                        if (players.containsKey(conn)) break;
                        Player newPlayer = joinHandler.handle(conn, input);
                        if (newPlayer != null) {
                            NetworkMessage joinedMsg = new NetworkMessage("PLAYER_JOINED");
                            joinedMsg.tick = worldContext.getCurrentTick();
                            joinedMsg.payload = newPlayer;
                            broadcastMessage(gson.toJson(joinedMsg), conn);
                        }
                        break;
                    case "MOVE_TO":
                        handleMoveTo(conn, input);
                        break;
                    case "CHAT":
                        handleChat(conn, input);
                        break;
                    case "LOOT":
                        handleLoot(conn, input);
                        break;
                    case "RESPAWN":
                        handleRespawn(conn);
                        break;
                    case "SIMULATE_DAMAGE":
                        handleSimulateDamage(conn, input);
                        break;
                    case "SIMULATE_SPAWN_POTION":
                        handleSimulateSpawnPotion(conn);
                        break;
                    default:
                        sendError(conn, "UNSUPPORTED_COMMAND", "Loại lệnh không được hỗ trợ.");
                        break;
                }
            }
        } catch (Exception e) {
            System.err.println("Lỗi xử lý tin nhắn: " + e.getMessage());
            sendError(conn, "INVALID_MESSAGE", "Không thể xử lý lệnh.");
        }
    }

    @Override
    public void onError(WebSocket conn, Exception ex) {
        System.err.println("WebSocket error: " + ex.getMessage());
        if (conn != null) {
            cleanupSession(conn);
        }
    }

    @Override
    public void stop(int timeout) throws InterruptedException {
        worldTicker.shutdownNow();
        super.stop(timeout);
    }

    private void handleMoveTo(WebSocket conn, NetworkMessage input) {
        Player player = players.get(conn);
        if (player == null) {
            sendError(conn, "JOIN_REQUIRED", "Bạn cần vào game trước khi di chuyển.");
            return;
        }
        if (input.x == null || input.y == null) {
            sendError(conn, "INVALID_MESSAGE", "MOVE_TO yêu cầu tọa độ ô x và y.");
            return;
        }

        MoveToHandler.Result result = moveToHandler.handle(player, input.x, input.y);
        if (!result.accepted()) {
            sendError(conn, result.code(), result.message());
        }
    }

    private void handleChat(WebSocket conn, NetworkMessage input) {
        Player player = players.get(conn);
        String text = input.text;
        if (text == null && input.payload instanceof String s) {
            text = s;
        }
        CommandResult result = lootRespawnSystem.handleChat(player, text, System.currentTimeMillis());
        conn.send(gson.toJson(result.toNetworkMessage(worldContext.getCurrentTick())));
        flushAndBroadcastEvents();
    }

    private void handleLoot(WebSocket conn, NetworkMessage input) {
        Player player = players.get(conn);
        String itemId = input.itemId;
        if (itemId == null && input.id != null) {
            itemId = input.id;
        }
        CommandResult result = lootRespawnSystem.handleLoot(player, itemId);
        conn.send(gson.toJson(result.toNetworkMessage(worldContext.getCurrentTick())));
        flushAndBroadcastEvents();
        if (result.isAccepted()) {
            broadcastState();
        }
    }

    private void handleRespawn(WebSocket conn) {
        Player player = players.get(conn);
        CommandResult result = lootRespawnSystem.handleRespawn(player);
        conn.send(gson.toJson(result.toNetworkMessage(worldContext.getCurrentTick())));
        flushAndBroadcastEvents();
        if (result.isAccepted()) {
            broadcastState();
        }
    }

    private void handleSimulateDamage(WebSocket conn, NetworkMessage input) {
        Player player = players.get(conn);
        if (player == null) {
            sendError(conn, "JOIN_REQUIRED", "Bạn cần vào game trước.");
            return;
        }
        int amount = (input.amount != null && input.amount > 0) ? input.amount : 40;
        lootRespawnSystem.applyDamageToPlayer("env-test", player, amount);
        conn.send(gson.toJson(NetworkMessage.ack(worldContext.getCurrentTick(), "SIMULATE_DAMAGE")));
        flushAndBroadcastEvents();
        broadcastState();
    }

    private void handleSimulateSpawnPotion(WebSocket conn) {
        Player player = players.get(conn);
        if (player == null) {
            sendError(conn, "JOIN_REQUIRED", "Bạn cần vào game trước.");
            return;
        }
        lootRespawnSystem.spawnPotionNear(player.getX(), player.getY());
        conn.send(gson.toJson(NetworkMessage.ack(worldContext.getCurrentTick(), "SIMULATE_SPAWN_POTION")));
        flushAndBroadcastEvents();
        broadcastState();
    }

    private void tickWorld() {
        try {
            synchronized (players) {
                long tick = worldContext.advanceTick();
                boolean moved = false;
                if (tick % MOVEMENT_STEP_EVERY_TICKS == 0) {
                    moved = movementSystem.advanceOneTick(new ArrayList<>(players.values()));
                }
                boolean lootOrMobChanged = lootRespawnSystem.updateTick();
                flushAndBroadcastEvents();
                if (moved || lootOrMobChanged) {
                    broadcastState();
                }
            }
        } catch (RuntimeException e) {
            System.err.println("Lỗi cập nhật thế giới: " + e.getMessage());
        }
    }

    private void flushAndBroadcastEvents() {
        List<NetworkMessage> events = worldContext.drainPendingEvents();
        for (NetworkMessage event : events) {
            broadcastMessage(gson.toJson(event), null);
        }
    }

    private void broadcastState() {
        if (players.isEmpty()) return;
        NetworkMessage msg = new NetworkMessage("STATE_UPDATE");
        msg.tick = worldContext.getCurrentTick();
        msg.payload = new ArrayList<>(players.values());
        msg.items = worldContext.getItems();
        broadcastMessage(gson.toJson(msg), null);
    }

    private void sendError(WebSocket conn, String code, String message) {
        if (conn == null || !conn.isOpen()) return;
        NetworkMessage error = new NetworkMessage("ERROR");
        error.tick = worldContext.getCurrentTick();
        error.code = code;
        error.payload = message;
        conn.send(gson.toJson(error));
    }

    private void cleanupSession(WebSocket conn) {
        Player leaver;
        synchronized (players) {
            leaver = players.remove(conn);
            if (leaver != null) {
                worldContext.removePlayer(leaver.getId());
            }
        }
        if (leaver != null) {
            System.out.println("[CLEANUP] Đã dọn dẹp phiên của: " + leaver.getName() + " (" + leaver.getId() + ")");
            NetworkMessage msg = new NetworkMessage("PLAYER_LEFT");
            msg.tick = worldContext.getCurrentTick();
            msg.id = leaver.getId();
            broadcastMessage(gson.toJson(msg), null);
        }
    }

    private void broadcastMessage(String text, WebSocket exclude) {
        for (WebSocket client : players.keySet()) {
            if (client != exclude && client.isOpen()) {
                client.send(text);
            }
        }
    }
}
