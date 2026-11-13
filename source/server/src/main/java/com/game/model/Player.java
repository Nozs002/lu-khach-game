package com.game.model;

public class Player {
    private String id;
    private String name;
    private String avatar;
    private float x;
    private float y;
    private float speed = 4.0f;

    public Player(String id, String name, String avatar, float x, float y) {
        this.id = id;
        this.name = name;
        this.avatar = avatar;
        this.x = x;
        this.y = y;
    }

    public void move(float dx, float dy) {
        this.x += dx * speed;
        this.y += dy * speed;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getAvatar() { return avatar; }
    public float getX() { return x; }
    public float getY() { return y; }
}