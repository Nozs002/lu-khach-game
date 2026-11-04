package vn.btl.ltm;

import com.google.gson.*;
import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;
import java.net.InetSocketAddress;
import java.util.*;

/** Callbacks share this monitor so that each world mutation is atomic. */
public final class GameServer extends WebSocketServer {
    private static final Gson JSON = new Gson();
    private static final int WIDTH = 24, HEIGHT = 16, TILE = 32, LIMIT = 32;
    private static final long STEP_NS = 140_000_000L, CHAT_NS = 600_000_000L;
    private final Map<WebSocket, Player> players = new LinkedHashMap<>();
    private final List<List<Integer>> blocked = new ArrayList<>();
    private final Set<String> walls = new HashSet<>();

    private static final class Player {
        final String id = UUID.randomUUID().toString();
        final String name;
        int x, y;
        long lastMove, lastChat;
        Player(String name, int x, int y) { this.name = name; this.x = x; this.y = y; }
        Map<String, Object> view() { return Map.of("id", id, "name", name, "x", x, "y", y); }
    }

    public GameServer(int port, String host) {
        super(new InetSocketAddress(host, port));
        setConnectionLostTimeout(20);
        setReuseAddr(true);
        for (int y = 0; y < HEIGHT; y++) for (int x = 0; x < WIDTH; x++) {
            if (x == 0 || y == 0 || x == WIDTH - 1 || y == HEIGHT - 1
                    || (x >= 7 && x <= 10 && y >= 4 && y <= 7)
                    || (x >= 16 && x <= 18 && y >= 9 && y <= 12)) {
                walls.add(x + "," + y);
                blocked.add(List.of(x, y));
            }
        }
    }

    @Override public void onOpen(WebSocket socket, ClientHandshake handshake) {
        if (!"/game".equals(handshake.getResourceDescriptor())) socket.close(1008, "Use /game");
    }
    @Override public synchronized void onMessage(WebSocket socket, String message) {
        if (message.length() > 2048) { socket.close(1009, "Message too large"); return; }
        try {
            JsonObject data = JsonParser.parseString(message).getAsJsonObject();
            String type = string(data, "type");
            Player player = players.get(socket);
            if ("JOIN".equals(type)) {
                if (player != null) { error(socket, "ALREADY_JOINED", "Bạn đã vào game."); return; }
                if (players.size() >= LIMIT) { error(socket, "WORLD_FULL", "Bản đồ đã đầy."); return; }
                String name = string(data, "name").strip();
                if (name.isEmpty() || name.length() > 20 || name.codePoints().anyMatch(Character::isISOControl)) {
                    error(socket, "INVALID_NAME", "Tên cần có 1–20 ký tự, không chứa ký tự điều khiển."); return;
                }
                int index = players.size();
                player = new Player(name, 2 + index % 4, 2 + index / 4);
                players.put(socket, player);
                send(socket, Map.of("type", "WELCOME", "you", player.id,
                        "map", Map.of("width", WIDTH, "height", HEIGHT, "tileSize", TILE, "blocked", blocked),
                        "players", players.values().stream().map(Player::view).toList()));
                broadcastJson(Map.of("type", "PLAYER_JOINED", "player", player.view()));
            } else if (player == null) {
                error(socket, "JOIN_REQUIRED", "Hãy vào game trước.");
            } else if ("MOVE".equals(type)) {
                long now = System.nanoTime();
                if (now - player.lastMove < STEP_NS) return;
                int dx = 0, dy = 0;
                switch (string(data, "direction")) {
                    case "UP" -> dy = -1;
                    case "DOWN" -> dy = 1;
                    case "LEFT" -> dx = -1;
                    case "RIGHT" -> dx = 1;
                    default -> { error(socket, "INVALID_DIRECTION", "Hướng di chuyển không hợp lệ."); return; }
                }
                player.lastMove = now;
                int x = player.x + dx, y = player.y + dy;
                if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT || walls.contains(x + "," + y)) return;
                player.x = x; player.y = y;
                broadcastJson(Map.of("type", "PLAYER_MOVED", "id", player.id, "x", x, "y", y));
            } else if ("CHAT".equals(type)) {
                String text = string(data, "text").strip();
                if (text.isEmpty() || text.length() > 200 || text.codePoints().anyMatch(Character::isISOControl)) {
                    error(socket, "INVALID_CHAT", "Tin nhắn cần có 1–200 ký tự trên một dòng."); return;
                }
                long now = System.nanoTime();
                if (now - player.lastChat < CHAT_NS) return;
                player.lastChat = now;
                broadcastJson(Map.of("type", "CHAT", "id", player.id, "name", player.name, "text", text));
            } else error(socket, "UNKNOWN_TYPE", "Loại thông điệp không được hỗ trợ.");
        } catch (JsonParseException | IllegalStateException | IllegalArgumentException | NullPointerException e) {
            error(socket, "INVALID_MESSAGE", "Thông điệp JSON không hợp lệ.");
        }
    }
    private static String string(JsonObject object, String key) {
        JsonElement value = object.get(key);
        if (value == null || !value.isJsonPrimitive() || !value.getAsJsonPrimitive().isString())
            throw new IllegalArgumentException("Expected string");
        return value.getAsString();
    }
    private void send(WebSocket socket, Object value) { if (socket.isOpen()) socket.send(JSON.toJson(value)); }
    private void error(WebSocket socket, String code, String message) {
        send(socket, Map.of("type", "ERROR", "code", code, "message", message));
    }
    private void broadcastJson(Object value) {
        String message = JSON.toJson(value);
        for (WebSocket socket : players.keySet()) if (socket.isOpen()) socket.send(message);
    }
    @Override public synchronized void onClose(WebSocket socket, int code, String reason, boolean remote) {
        Player player = players.remove(socket);
        if (player != null) broadcastJson(Map.of("type", "PLAYER_LEFT", "id", player.id, "name", player.name));
    }
    @Override public void onError(WebSocket socket, Exception error) { error.printStackTrace(); }
    @Override public void onStart() { System.out.println("Game server: ws://" + getAddress().getHostString() + ":" + getPort() + "/game"); }
    public static void main(String[] args) {
        GameServer server = new GameServer(args.length > 0 ? Integer.parseInt(args[0]) : 8080,
                args.length > 1 ? args[1] : "127.0.0.1");
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            try { server.stop(1000); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        }));
        server.start();
    }
}
