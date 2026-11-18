package com.game;

public class Main {
    private static final int DEFAULT_PORT = 8080;

    public static void main(String[] args) {
        int port = args.length > 0 ? Integer.parseInt(args[0]) : DEFAULT_PORT;
        GameServer server = new GameServer(port);
        server.start();
    }
}
