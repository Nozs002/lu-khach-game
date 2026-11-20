package com.game.features.combat;

import com.game.model.Mob;
import com.game.world.WorldMap;
import com.google.gson.Gson;

import java.awt.Point;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;

public final class MobSpawnSystem {
    private MobSpawnSystem() {
    }

    public static Map<String, Mob> load(
            String resource,
            WorldMap map,
            Gson gson,
            Random random
    ) {
        try (InputStream stream =
                     MobSpawnSystem.class.getResourceAsStream(resource)) {
            if (stream == null) {
                throw new IllegalStateException("Không tìm thấy " + resource);
            }

            SpawnFile file = gson.fromJson(
                    new InputStreamReader(stream, StandardCharsets.UTF_8),
                    SpawnFile.class
            );

            if (file == null || file.monsterSpawns == null) {
                throw new IllegalArgumentException(
                        "Map chưa có monsterSpawns."
                );
            }
            CombatNavigation navigation = new CombatNavigation(map);
            Map<String, Mob> mobs = new LinkedHashMap<>();
            Set<Point> occupied = new HashSet<>();
            int nextId = 1;

            for (SpawnZone zone : file.monsterSpawns) {
                validate(zone);

                Geometry geometry = zone.geometry;
                List<Point> candidates = new ArrayList<>();

                int left = Math.max(0, (int) Math.floor(geometry.x));
                int top = Math.max(0, (int) Math.floor(geometry.y));
                int right = Math.min(
                        map.getWidth(),
                        (int) Math.ceil(geometry.x + geometry.width)
                );
                int bottom = Math.min(
                        map.getHeight(),
                        (int) Math.ceil(geometry.y + geometry.height)
                );

                for (int y = top; y < bottom; y++) {
                    for (int x = left; x < right; x++) {
                        double centerX = x + 0.5;
                        double centerY = y + 0.5;

                        boolean inside =
                                centerX >= geometry.x
                                && centerX < geometry.x + geometry.width
                                && centerY >= geometry.y
                                && centerY < geometry.y + geometry.height;

                        Point point = new Point(x, y);

                        if (inside
                                && map.isWalkable(x, y)
                                && !navigation.isSafe(x, y)
                                && !occupied.contains(point)) {
                            candidates.add(point);
                        }
                    }
                }

                if (candidates.size() < zone.maxAlive) {
                    throw new IllegalArgumentException(
                            "Không đủ ô spawn hợp lệ: " + zone.zoneId
                    );
                }

                Collections.shuffle(candidates, random);

                for (int i = 0; i < zone.maxAlive; i++) {
                    Point point = candidates.get(i);
                    occupied.add(point);

                    String id = "m-" + nextId++;

                    mobs.put(id, new Mob(
                            id,
                            zone.monsterType,
                            zone.zoneId,
                            point.x,
                            point.y,
                            zone.aggroRadius,
                            zone.leashRadius,
                            zone.respawnSeconds
                    ));
                }
            }

            return mobs;
        } catch (RuntimeException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new IllegalStateException(
                    "Không đọc được cấu hình quái.",
                    exception
            );
        }
    }

    private static void validate(SpawnZone zone) {
        if (zone == null
                || zone.zoneId == null
                || zone.zoneId.isBlank()
                || zone.monsterType == null
                || !zone.monsterType.matches("[a-z0-9_]+")
                || zone.maxAlive < 0
                || zone.aggroRadius < 0
                || zone.leashRadius < zone.aggroRadius
                || zone.respawnSeconds <= 0
                || zone.geometry == null) {
            throw new IllegalArgumentException(
                    "Cấu hình vùng spawn không hợp lệ."
            );
        }

        Geometry geometry = zone.geometry;

        if (!"rectangle".equals(geometry.type)
                || !Double.isFinite(geometry.x)
                || !Double.isFinite(geometry.y)
                || !Double.isFinite(geometry.width)
                || !Double.isFinite(geometry.height)
                || !Double.isFinite(geometry.x + geometry.width)
                || !Double.isFinite(geometry.y + geometry.height)
                || geometry.width <= 0
                || geometry.height <= 0) {
            throw new IllegalArgumentException(
                    "Geometry không hợp lệ: " + zone.zoneId
            );
        }
    }

    private static final class SpawnFile {
        List<SpawnZone> monsterSpawns;
    }

    private static final class SpawnZone {
        String zoneId;
        String monsterType;
        int maxAlive;
        int aggroRadius;
        int leashRadius;
        int respawnSeconds;
        Geometry geometry;
    }

    private static final class Geometry {
        String type;
        double x;
        double y;
        double width;
        double height;
    }
}
