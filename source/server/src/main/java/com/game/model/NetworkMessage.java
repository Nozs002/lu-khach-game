package com.game.model;

/**
 * Phong bì gói tin mạng hỗ trợ đồng thời chuẩn protocol-v1.md ({v, type, requestId, tick, payload})
 * và định dạng phẳng trên nhánh P1 ({type, id, name, avatar, dx, dy, payload}).
 */
public class NetworkMessage {
    public int v = 1;
    public String type;
    public Long requestId;
    public Long tick;
    public Object payload;

    // Các trường cấp ngoài để tương thích ngược với code nhánh P1 (origin/tuan)
    public String id;
    public String name;
    public String avatar;
    public float dx;
    public float dy;
    public String text;
    public String itemId;
    public String targetId;
    public Integer x;
    public Integer y;

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
        msg.payload = java.util.Map.of("commandType", commandType);
        return msg;
    }

    public static NetworkMessage error(Long requestId, long tick, String code, String message) {
        NetworkMessage msg = new NetworkMessage("ERROR");
        msg.requestId = requestId;
        msg.tick = tick;
        msg.payload = java.util.Map.of("code", code, "message", message);
        return msg;
    }
}
