package com.game.model;

import com.game.handler.JoinHandler;
import com.game.world.WorldMap;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import org.java_websocket.WebSocket;
import java.lang.reflect.Proxy;
import java.util.ArrayList;
import java.util.LinkedHashMap;

/** Run with -ea and src/main/resources on the classpath. */
public final class CharacterStatsCheck {
    public static void main(String[] args) {
        var gson = new Gson();
        for (String id : new String[]{"knight", "hunter", "fighter", "lion"}) {
            var stats = CharacterCatalog.forCharacter(id);
            var first = new Player("one", "test", id, 0, 0);
            var second = new Player("two", "test", id, 0, 0);
            assert first.getHp() == stats.maxHp();
            assert first.getDamage() == stats.damage();
            assert first.getArmor() == stats.armor();
            assert second.getHp() == first.getHp();
            var json = gson.toJsonTree(first).getAsJsonObject();
            checkStats(json, stats);
            assert !json.has("path");
        }
        assert new Player("id", "name", "unknown", 0, 0).getCharacterId().equals("knight");
        assert new Player("id", "name", null, 0, 0).getCharacterId().equals("knight");

        var messages = new ArrayList<String>();
        var connection = (WebSocket) Proxy.newProxyInstance(WebSocket.class.getClassLoader(),
                new Class<?>[]{WebSocket.class}, (proxy, method, values) -> switch (method.getName()) {
                    case "hashCode" -> System.identityHashCode(proxy);
                    case "equals" -> proxy == values[0];
                    case "send" -> { messages.add((String) values[0]); yield null; }
                    default -> throw new UnsupportedOperationException(method.getName());
                });
        var players = new LinkedHashMap<WebSocket, Player>();
        var world = WorldMap.loadFromResource("/maps/world.generated.json", gson);
        var handler = new JoinHandler(players, gson, 50, world);
        var forged = gson.fromJson("{\"type\":\"JOIN\",\"name\":\"test\",\"characterId\":\"hunter\","
                + "\"hp\":99999,\"maxHp\":99999,\"damage\":99999,\"armor\":99999}", NetworkMessage.class);
        var player = handler.handle(connection, forged);
        var stats = CharacterCatalog.forCharacter("hunter");
        var welcome = gson.fromJson(messages.get(0), JsonObject.class);
        assert welcome.get("type").getAsString().equals("WELCOME");
        checkStats(welcome.getAsJsonArray("payload").get(0).getAsJsonObject(), stats);
        for (String type : new String[]{"PLAYER_JOINED", "STATE_UPDATE"}) {
            var message = new NetworkMessage(type);
            message.payload = type.equals("STATE_UPDATE") ? new ArrayList<>(players.values()) : player;
            var json = gson.toJsonTree(message).getAsJsonObject();
            var payload = json.get("payload");
            checkStats((payload.isJsonArray() ? payload.getAsJsonArray().get(0) : payload).getAsJsonObject(), stats);
        }
        System.out.println("PASS: four configured characters, fallback, full HP, WELCOME/JOINED/STATE stats, ignored client overrides");
    }

    private static void checkStats(JsonObject player, CharacterCatalog.Stats stats) {
        assert player.get("hp").getAsInt() == stats.maxHp();
        assert player.get("maxHp").getAsInt() == stats.maxHp();
        assert player.get("damage").getAsInt() == stats.damage();
        assert player.get("armor").getAsInt() == stats.armor();
    }
}
