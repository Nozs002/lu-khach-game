package com.game;

import com.game.handler.JoinHandler;
import com.game.features.movement.MoveToHandler;
import com.game.features.movement.MovementSystem;
import com.game.model.NetworkMessage;
import com.game.model.Player;
import com.game.world.WorldMap;
import com.google.gson.Gson;
import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;

import java.net.InetSocketAddress;
import java.util.ArrayList;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public class GameServer extends WebSocketServer {
    private static final int MAX_PLAYERS = 50; // 1. Giới hạn người chơi
    private static final String MAP_RESOURCE = "/maps/world.generated.json";
    private static final long MOVEMENT_TICK_MILLIS = 200;

    private final Map<WebSocket, Player> players = new ConcurrentHashMap<>();
    private final Gson gson = new Gson();
    private final WorldMap worldMap = WorldMap.loadFromResource(MAP_RESOURCE, gson);
    private final JoinHandler joinHandler = new JoinHandler(players, gson, MAX_PLAYERS, worldMap);
    private final MoveToHandler moveToHandler = new MoveToHandler(worldMap);
    private final MovementSystem movementSystem = new MovementSystem();
    private final ScheduledExecutorService movementTicker = Executors.newSingleThreadScheduledExecutor(runnable -> {
        Thread thread = new Thread(runnable, "game-movement-tick");
        thread.setDaemon(true);
        return thread;
    });

    public GameServer(int port) {
        super(new InetSocketAddress(port));
        // Java-WebSocket enables Ping/Pong connection checks by default.
        setConnectionLostTimeout(10);
    }

    @Override
    public void onStart() {
        System.out.println("Java GameServer đang lắng nghe tại cổng: " + getPort());
        movementTicker.scheduleAtFixedRate(
                this::tickMovement,
                MOVEMENT_TICK_MILLIS,
                MOVEMENT_TICK_MILLIS,
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
                            joinedMsg.payload = newPlayer;
                            broadcastMessage(gson.toJson(joinedMsg), conn);
                        }
                        break;
                    case "MOVE_TO":
                        handleMoveTo(conn, input);
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
        movementTicker.shutdownNow();
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

    private void tickMovement() {
        try {
            synchronized (players) {
                if (movementSystem.advanceOneTick(new ArrayList<>(players.values()))) {
                    broadcastState();
                }
            }
        } catch (RuntimeException e) {
            System.err.println("Lỗi cập nhật di chuyển: " + e.getMessage());
        }
    }

    private void broadcastState() {
        NetworkMessage msg = new NetworkMessage("STATE_UPDATE");
        msg.payload = new ArrayList<>(players.values());
        broadcastMessage(gson.toJson(msg), null);
    }

    private void sendError(WebSocket conn, String code, String message) {
        if (conn == null || !conn.isOpen()) return;
        NetworkMessage error = new NetworkMessage("ERROR");
        error.code = code;
        error.payload = message;
        conn.send(gson.toJson(error));
    }

    private void cleanupSession(WebSocket conn) {
        Player leaver = players.remove(conn);
        if (leaver != null) {
            System.out.println("[CLEANUP] Đã dọn dẹp phiên của: " + leaver.getName() + " (" + leaver.getId() + ")");
            NetworkMessage msg = new NetworkMessage("PLAYER_LEFT");
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
