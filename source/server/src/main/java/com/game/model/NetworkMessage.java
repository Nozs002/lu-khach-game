package com.game.model;

import java.util.Map;

public class NetworkMessage {
    public int v = 1;
    public String type;
    public Long requestId;
    public Long tick;
    public Object payload;

    public String id;
    public String name;
    public String avatar;
    public String mapId;

    public NetworkMessage() {
    }

    public NetworkMessage(String type) {
        this.v = 1;
        this.type = type;
    }

    public static NetworkMessage event(String type, long tick, Object payload) {
        NetworkMessage msg = new NetworkMessage(type);
        msg.tick = tick;
        msg.payload = payload;
        return msg;
    }

    public static NetworkMessage ack(Long requestId, long tick, String commandType) {
        NetworkMessage msg = new NetworkMessage("ACK");
        msg.requestId = requestId;
        msg.tick = tick;
        msg.payload = Map.of("commandType", commandType);
        return msg;
    }

    public static NetworkMessage error(Long requestId, long tick, String code, String message) {
        NetworkMessage msg = new NetworkMessage("ERROR");
        msg.requestId = requestId;
        msg.tick = tick;
        msg.payload = Map.of("code", code, "message", message);
        return msg;
    }
}
