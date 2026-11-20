package com.game.features.combat;

import com.game.GameServer;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ServerHandshake;
import org.junit.jupiter.api.Test;

import java.net.URI;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.function.Predicate;

import static org.junit.jupiter.api.Assertions.*;

class GameServerCombatTest {
    @Test
    void realSocketReceivesMobsAndKeepsJoinAndMovementWorking() throws Exception {
        GameServer server = new GameServer(0);
        TestClient client = null;
        try {
            server.start();
            long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(3);
            while (server.getPort() == 0 && System.nanoTime() < deadline) Thread.sleep(10);
            assertTrue(server.getPort() > 0);
            client = new TestClient(URI.create("ws://localhost:" + server.getPort()));
            assertTrue(client.connectBlocking(3, TimeUnit.SECONDS));

            client.send("{\"type\":\"ATTACK\",\"payload\":{\"targetId\":null}}");
            assertEquals("JOIN_REQUIRED", client.await("ERROR").get("code").getAsString());
            client.send("{\"type\":\"JOIN\",\"name\":\"combat-test\",\"characterId\":\"knight\"}");
            JsonObject welcome = client.await("WELCOME");
            String id = welcome.get("id").getAsString();
            assertFalse(welcome.getAsJsonArray("mobs").isEmpty());
            JsonObject player = welcome.getAsJsonArray("payload").get(0).getAsJsonObject();
            var stats = com.game.model.CharacterCatalog.forCharacter("knight");
            assertEquals(stats.maxHp(), player.get("hp").getAsInt());
            assertEquals(stats.maxHp(), player.get("maxHp").getAsInt());
            assertEquals(stats.damage(), player.get("damage").getAsInt());
            assertEquals(stats.armor(), player.get("armor").getAsInt());
            assertEquals("knight", player.get("characterId").getAsString());

            int x = player.get("x").getAsInt();
            int y = player.get("y").getAsInt();
            var tiles = welcome.getAsJsonObject("map").getAsJsonArray("tiles");
            int targetX = x;
            int targetY = y;
            for (int[] direction : new int[][]{{0, 1}, {1, 0}, {0, -1}, {-1, 0}}) {
                int nx = x + direction[0], ny = y + direction[1];
                if (ny >= 0 && ny < tiles.size() && nx >= 0 && nx < tiles.get(ny).getAsJsonArray().size()
                        && tiles.get(ny).getAsJsonArray().get(nx).getAsInt() == 0) {
                    targetX = nx;
                    targetY = ny;
                    break;
                }
            }
            assertTrue(targetX != x || targetY != y);
            client.send("{\"type\":\"MOVE_TO\",\"x\":" + targetX + ",\"y\":" + targetY + "}");
            final int destinationX = targetX, destinationY = targetY;
            JsonObject state = client.await(message -> {
                if (!"STATE_UPDATE".equals(message.get("type").getAsString())) return false;
                for (var value : message.getAsJsonArray("payload")) {
                    JsonObject entry = value.getAsJsonObject();
                    if (id.equals(entry.get("id").getAsString())) {
                        return entry.get("x").getAsInt() == destinationX
                                && entry.get("y").getAsInt() == destinationY;
                    }
                }
                return false;
            });
            assertFalse(state.getAsJsonArray("mobs").isEmpty());

            client.send("{\"type\":\"ATTACK\",\"payload\":{\"targetId\":\"missing\"}}");
            assertEquals("INVALID_TARGET", client.await("ERROR").get("code").getAsString());
            client.send("{\"type\":\"ATTACK\",\"payload\":{\"targetId\":null}}");
            assertEquals("ATTACK", client.await("ACK").getAsJsonObject("payload").get("commandType").getAsString());
        } finally {
            if (client != null) client.closeBlocking();
            server.stop(1000);
        }
    }

    private static final class TestClient extends WebSocketClient {
        private final LinkedBlockingQueue<JsonObject> messages = new LinkedBlockingQueue<>();

        TestClient(URI uri) {
            super(uri);
        }

        JsonObject await(String type) throws InterruptedException {
            return await(message -> type.equals(message.get("type").getAsString()));
        }

        JsonObject await(Predicate<JsonObject> condition) throws InterruptedException {
            long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
            while (System.nanoTime() < deadline) {
                JsonObject message = messages.poll(100, TimeUnit.MILLISECONDS);
                if (message != null && condition.test(message)) return message;
            }
            throw new AssertionError("Không nhận được gói tin mong đợi.");
        }

        @Override
        public void onOpen(ServerHandshake handshake) {
        }

        @Override
        public void onMessage(String text) {
            messages.add(JsonParser.parseString(text).getAsJsonObject());
        }

        @Override
        public void onClose(int code, String reason, boolean remote) {
        }

        @Override
        public void onError(Exception exception) {
        }
    }
}
