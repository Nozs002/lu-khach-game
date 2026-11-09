package com.game;

import com.game.model.NetworkMessage;
import com.game.model.Player;
import com.google.gson.Gson;
import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;

import java.net.InetSocketAddress;
import java.util.Map;
import java.util.Timer;
import java.util.TimerTask;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

public class GameServer extends WebSocketServer {
    private static final int MAX_PLAYERS = 50; // 1. Giới hạn người chơi
    private static final long HEARTBEAT_INTERVAL = 10000; // 10 giây PING 1 lần

    private final Map<WebSocket, Player> players = new ConcurrentHashMap<>();
    private final Map<WebSocket, Boolean> isAliveMap = new ConcurrentHashMap<>();
    private final Gson gson = new Gson();
    private Timer heartbeatTimer;

    public GameServer(int port) {
        super(new InetSocketAddress(port));
    }

    @Override
    public void onStart() {
        System.out.println("Java GameServer đang lắng nghe tại cổng: " + getPort());
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
        try {
            NetworkMessage input = gson.fromJson(message, NetworkMessage.class);

            switch (input.type) {
                case "JOIN":
                    // 2. Kiểm tra giới hạn người chơi
                    if (players.size() >= MAX_PLAYERS) {
                        NetworkMessage err = new NetworkMessage("ERROR");
                        err.payload = "Máy chủ đã đầy!";
                        conn.send(gson.toJson(err));
                        conn.close();
                        return;
                    }

                    String playerId = UUID.randomUUID().toString();
                    String playerName = input.name != null ? input.name : "Lữ Khách";
                    String playerAvatar = (input.avatar != null && !input.avatar.isEmpty()) ? input.avatar : "knight";

                // TẠO TỌA ĐỘ NGẪU NHIÊN ĐỂ CÁC NHÂN VẬT KHÔNG BỊ CHỒNG LÊN NHAU
                float spawnX = 50 + (float) (Math.random() * 380); // Ngẫu nhiên chiều rộng
                float spawnY = 50 + (float) (Math.random() * 220); // Ngẫu nhiên chiều cao

                Player newPlayer = new Player(playerId, playerName, playerAvatar, spawnX, spawnY);
                players.put(conn, newPlayer);

                NetworkMessage welcomeMsg = new NetworkMessage("WELCOME");
                welcomeMsg.id = playerId;
                welcomeMsg.payload = players.values();
                conn.send(gson.toJson(welcomeMsg));

                NetworkMessage joinedMsg = new NetworkMessage("PLAYER_JOINED");
                joinedMsg.payload = newPlayer;
                broadcastMessage(gson.toJson(joinedMsg), conn);
                break;

                case "PONG":
                    // 3. Nhận phản hồi nhịp tim từ Client
                    isAliveMap.put(conn, true);
                    break;

                case "MOVE":
                    Player player = players.get(conn);
                    if (player != null) {
                        player.move(input.dx, input.dy);
                        NetworkMessage stateMsg = new NetworkMessage("STATE_UPDATE");
                        stateMsg.payload = players.values();
                        broadcastMessage(gson.toJson(stateMsg), null);
                    }
                    break;
            }
        } catch (Exception e) {
            System.err.println("Lỗi xử lý tin nhắn: " + e.getMessage());
        }
    }

    @Override
    public void onError(WebSocket conn, Exception ex) {
        if (conn != null) {
            cleanupSession(conn);
        }
    }

    // 4. Cơ chế Heartbeat Ping/Pong & Timeout Session Cleanup
    private void startHeartbeat() {
        heartbeatTimer = new Timer(true);
        heartbeatTimer.scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() {
                NetworkMessage pingMsg = new NetworkMessage("PING");
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