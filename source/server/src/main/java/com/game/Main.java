package com.game;

public class Main {
    private static final int DEFAULT_PORT = 8080;

    public static void main(String[] args) {
        if (args.length > 1) {
            throw new IllegalArgumentException("Cách dùng: Main [cổng], ví dụ: Main 8081");
        }

        int port = args.length == 0 ? DEFAULT_PORT : parsePort(args[0]);
        System.out.println("Starting server on port " + port);
        try {
            GameServer server = new GameServer(port);
            server.start();
            System.out.println("Server started in background thread, waiting indefinitely...");
            Thread.currentThread().join();
        } catch (Throwable t) {
            t.printStackTrace();
        }
    }

    private static int parsePort(String value) {
        final int port;
        try {
            port = Integer.parseInt(value);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Cổng phải là số nguyên từ 1 đến 65535: " + value, e);
        }

        if (port < 1 || port > 65535) {
            throw new IllegalArgumentException("Cổng phải nằm trong khoảng 1 đến 65535: " + port);
        }
        return port;
    }
}
