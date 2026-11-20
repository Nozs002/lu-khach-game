package com.game.handler;

import com.game.model.NetworkMessage;
import com.game.model.Player;
import com.game.model.Mob;
import com.game.world.WorldMap;
import com.google.gson.Gson;
import org.java_websocket.WebSocket;

import java.awt.Point;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class JoinHandler {
    private final Map<WebSocket, Player> players;
    private final Gson gson;
    private final int maxPlayers;
    private final WorldMap worldMap;
    private final Collection<Mob> mobs;

    public JoinHandler(Map<WebSocket, Player> players, Gson gson, int maxPlayers, WorldMap worldMap) {
        this(players, gson, maxPlayers, worldMap, List.of());
    }

    public JoinHandler(Map<WebSocket, Player> players, Gson gson, int maxPlayers,
                       WorldMap worldMap, Collection<Mob> mobs) {
        this.players = players;
        this.gson = gson;
        this.maxPlayers = maxPlayers;
        this.worldMap = worldMap;
        this.mobs = mobs;
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
        String playerName = input.name != null ? input.name : "Lữ Khách";
        String playerCharacterId = (input.characterId != null && !input.characterId.isEmpty())
                ? input.characterId
                : "knight";

        Point spawn = worldMap.availableSpawnTile(players.values());

        Player newPlayer = new Player(playerId, playerName, playerCharacterId, spawn.x, spawn.y);
        players.put(conn, newPlayer);

        NetworkMessage welcomeMsg = new NetworkMessage("WELCOME");
        welcomeMsg.id = playerId;
        welcomeMsg.payload = players.values();
        welcomeMsg.map = worldMap.toClientData();
        welcomeMsg.mobs = new ArrayList<>(mobs);
        conn.send(gson.toJson(welcomeMsg));

        return newPlayer;
    }
}
