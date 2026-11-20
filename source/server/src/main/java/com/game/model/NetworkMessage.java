package com.game.model;

import java.util.List;

import com.game.world.WorldMap;

import java.util.LinkedHashMap;
import java.util.Map;

public class NetworkMessage {
    public String type;
    public String id;
    public String name;
    public String characterId;
    public String code;

    public Integer x;
    public Integer y;
    public Long tick;
    public Long tickDurationMs;
    public String text;
    public String itemId;
    public Integer amount;
    public WorldMap.MapData map;
    public Object items;
    public Object payload;
    public List<Mob> mobs;
    public NetworkMessage(String type) {
        this.type = type;
    }

    public static NetworkMessage event(String type, long tick, Object payload) {
        NetworkMessage msg = new NetworkMessage(type);
        msg.tick = tick;
        msg.payload = payload;
        return msg;
    }

    public static NetworkMessage ack(long tick, String commandType) {
        NetworkMessage msg = new NetworkMessage("ACK");
        msg.tick = tick;
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("commandType", commandType);
        msg.payload = body;
        return msg;
    }

    public static NetworkMessage error(long tick, String code, String message) {
        NetworkMessage msg = new NetworkMessage("ERROR");
        msg.tick = tick;
        msg.code = code;
        msg.payload = message;
        return msg;
    }
}
