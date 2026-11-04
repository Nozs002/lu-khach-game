/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. https://mozilla.org/MPL/2.0/
 * Port of BrowserQuest server/js/map.js, Little Workshop. */
package vn.btl.ltm;

import com.google.gson.*;
import java.io.IOException;
import java.nio.file.*;
import java.util.*;

final class WorldMap {
    final JsonObject data;
    final int width, height;
    private final Set<Integer> blocked = new HashSet<>();
    WorldMap(Path file) throws IOException {
        data = JsonParser.parseString(Files.readString(file)).getAsJsonObject();
        width = data.get("width").getAsInt(); height = data.get("height").getAsInt();
        for (JsonElement index : data.getAsJsonArray("collisions")) blocked.add(index.getAsInt());
    }
    boolean valid(int x, int y) {
        return x > 0 && x < width && y > 0 && y < height && !blocked.contains(y * width + x);
    }
    int[] spawn(int checkpoint, Random random) {
        List<JsonObject> choices = new ArrayList<>();
        for (JsonElement entry : data.getAsJsonArray("checkpoints")) {
            JsonObject area = entry.getAsJsonObject();
            if ((checkpoint > 0 && area.get("id").getAsInt() == checkpoint)
                    || (checkpoint == 0 && area.has("s") && area.get("s").getAsInt() == 1)) choices.add(area);
        }
        if (choices.isEmpty()) throw new IllegalStateException("No spawn checkpoint");
        JsonObject area = choices.get(random.nextInt(choices.size()));
        int x = area.get("x").getAsInt(), y = area.get("y").getAsInt();
        for (int dy = 0; dy < area.get("h").getAsInt(); dy++)
            for (int dx = 0; dx < area.get("w").getAsInt(); dx++) if (valid(x + dx, y + dy)) return new int[]{x + dx, y + dy};
        throw new IllegalStateException("Checkpoint has no walkable tile");
    }
    boolean checkpointContains(int id, int x, int y) {
        for (JsonElement entry : data.getAsJsonArray("checkpoints")) {
            JsonObject area = entry.getAsJsonObject();
            if (area.get("id").getAsInt() == id) {
                int ax = area.get("x").getAsInt(), ay = area.get("y").getAsInt();
                return x >= ax && y >= ay && x < ax + area.get("w").getAsInt() && y < ay + area.get("h").getAsInt();
            }
        }
        return false;
    }
    boolean door(int fromX, int fromY, int toX, int toY) {
        for (JsonElement entry : data.getAsJsonArray("doors")) {
            JsonObject door = entry.getAsJsonObject();
            if (Math.abs(fromX - door.get("x").getAsInt()) <= 1
                    && Math.abs(fromY - door.get("y").getAsInt()) <= 1
                    && toX == door.get("tx").getAsInt() && toY == door.get("ty").getAsInt()) return true;
        }
        return false;
    }
}
