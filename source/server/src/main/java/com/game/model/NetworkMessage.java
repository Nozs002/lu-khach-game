package com.game.model;

public class NetworkMessage {
    public String type;
    public String id;
    public String name;
    public String avatar;
    public float dx;
    public float dy;
    public Object payload;

    public NetworkMessage(String type) {
        this.type = type;
    }
}