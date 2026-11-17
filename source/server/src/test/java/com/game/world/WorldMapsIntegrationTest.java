package com.game.world;

import com.game.features.movement.AStar;
import com.game.features.movement.WorldMap;
import org.junit.jupiter.api.Test;
import java.util.HashSet;
import java.util.Set;
import static org.junit.jupiter.api.Assertions.*;

final class WorldMapsIntegrationTest {
    @Test
    void loadsThreeLinkedMapsAndSpawnsMobsOnReachableGround() {
        WorldContext world = new WorldContext();
        assertEquals(Set.of("world-01", "world-02", "world-03"), world.getMaps().keySet());
        assertEquals(15, world.getMobs().size());
        WorldMap.validateWorld(world.getMaps());
        Set<String> occupied = new HashSet<>();
        world.getMobs().forEach(mob -> {
            WorldMap map = world.getMap(mob.getMapId());
            WorldMap.Tile tile = new WorldMap.Tile(mob.getX(), mob.getY());
            assertEquals(52, map.width);
            assertEquals(24, map.height);
            assertFalse(map.isInSafeZone(tile.x(), tile.y()));
            assertFalse(map.portal(tile));
            assertNotNull(AStar.findPath(map, map.spawn, tile), mob.getId());
            assertTrue(occupied.add(map.id + ":" + tile));
        });
    }
}
