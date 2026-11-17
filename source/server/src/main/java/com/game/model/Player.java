package com.game.model;

public class Player {
    private String id;
    private String name;
    private String characterId;
    private float x;
    private float y;
    private float speed = 4.0f;

    public Player(String id, String name, String characterId, float x, float y) {
        this.id = id;
        this.name = name;
        this.characterId = characterId;
        this.x = x;
        this.y = y;
    }

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getCharacterId() {
        return characterId;
    }

    public float getX() {
        return x;
    }

    public float getY() {
        return y;
    }
}