package com.game.model;

import com.game.world.WorldMap;

public class NetworkMessage {
    public String type;
    public String id;
    public String name;
    public String characterId;
    public String code;
    public Integer x;
    public Integer y;
    public WorldMap.MapData map;
    public Object payload;

    public NetworkMessage(String type) {
        this.type = type;
    }
}