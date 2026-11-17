package com.game;

public class Main {
    private static final int DEFAULT_PORT = 8080;

    public static void main(String[] args) {
        GameServer server = new GameServer(8080);
        server.start();
    }
}