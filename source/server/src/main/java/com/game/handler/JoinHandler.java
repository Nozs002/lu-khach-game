package com.game.handler;

import com.game.model.NetworkMessage;
import com.game.model.Player;
import com.game.model.StartMap;
import com.google.gson.Gson;
import org.java_websocket.WebSocket;

import java.util.Map;
import java.util.UUID;

public class JoinHandler {
    private final Map<WebSocket, Player> players;
    private final Gson gson;
    private final int maxPlayers;

    public JoinHandler(Map<WebSocket, Player> players, Gson gson, int maxPlayers) {
        this.players = players;
        this.gson = gson;
        this.maxPlayers = maxPlayers;
    }

    // Trả về người chơi vừa tạo; null nếu yêu cầu bị từ chối.
    public Player handle(WebSocket conn, NetworkMessage input) {
        if (players.size() >= maxPlayers) {
            NetworkMessage err = new NetworkMessage("ERROR");
            err.payload = "Máy chủ đã đầy!";
            conn.send(gson.toJson(err));
            conn.close();
            return null;
        }

        String playerId = UUID.randomUUID().toString();
        String playerName = input.name != null ? input.name : "Lữ Khách " + playerId;
        String playerCharacterId = (input.characterId != null && !input.characterId.isEmpty())
                ? input.characterId
                : "knight";

        // Use authored Tiled spawn, then connected free cells for additional players.
        float[] spawn = StartMap.spawn(players.values());
        float spawnX = spawn[0];
        float spawnY = spawn[1];

        Player newPlayer = new Player(playerId, playerName, playerCharacterId, spawnX, spawnY);
        players.put(conn, newPlayer);

        // gửi thông báo cho người chơi vừa join
        NetworkMessage welcomeMsg = new NetworkMessage("WELCOME");
        welcomeMsg.id = playerId;
        welcomeMsg.payload = players.values();
        conn.send(gson.toJson(welcomeMsg));

        return newPlayer;
    }
}
