package com.game;

import com.game.handler.JoinHandler;
import com.game.model.NetworkMessage;
import com.game.model.Player;
import com.google.gson.Gson;
import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;

import java.net.InetSocketAddress;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class GameServer extends WebSocketServer {
    private static final int MAX_PLAYERS = 50; // 1. Giới hạn người chơi
    private static final int CONNECTION_LOST_TIMEOUT_SECONDS = 10;

    private final Map<WebSocket, Player> players = new ConcurrentHashMap<>();
    private final Gson gson = new Gson();
    private final JoinHandler joinHandler = new JoinHandler(players, gson, MAX_PLAYERS);

    public GameServer(int port) {
        super(new InetSocketAddress(port));
        // PING PONG
        setConnectionLostTimeout(CONNECTION_LOST_TIMEOUT_SECONDS);
    }

    @Override
    public void onStart() {
        System.out.println("Java GameServer đang lắng nghe tại cổng: " + getPort());
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

            synchronized (players) {
            switch (input.type) {
                case "MOVE":
                    Player player = players.get(conn);
                    if (player != null && player.move(input.dx, input.dy)) {
                        NetworkMessage state = new NetworkMessage("STATE_UPDATE");
                        state.payload = players.values();
                        broadcastMessage(gson.toJson(state), null);
                    }
                    break;
                case "JOIN":
                    if (players.containsKey(conn)) break;
                    Player newPlayer = joinHandler.handle(conn, input);
                    if (newPlayer != null) {
                        NetworkMessage joinedMsg = new NetworkMessage("PLAYER_JOINED");
                        joinedMsg.payload = newPlayer;
                        broadcastMessage(gson.toJson(joinedMsg), conn);
                    }
                    break;
            }
            }
        } catch (Exception e) {
            System.err.println("Lỗi xử lý tin nhắn: " + e.getMessage());
        }
    }

    @Override
    public void onError(WebSocket conn, Exception ex) {
        System.err.println("WebSocket error: " + ex.getMessage());
        if (conn != null) {
            cleanupSession(conn);
        }
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
