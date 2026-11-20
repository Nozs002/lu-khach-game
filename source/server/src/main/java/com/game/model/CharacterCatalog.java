package com.game.model;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Set;

/** Server-owned base stats; clients only choose a character ID. */
public final class CharacterCatalog {
    public record Stats(int maxHp, int damage, int armor) {}
    private static final Map<String, Stats> CONFIG = load();

    private CharacterCatalog() {}

    public static String resolveId(String id) {
        return id != null && CONFIG.containsKey(id) ? id : "knight";
    }

    public static Stats forCharacter(String id) {
        return CONFIG.get(resolveId(id));
    }

    private static Map<String, Stats> load() {
        try (var stream = CharacterCatalog.class.getResourceAsStream("/config/characters.json")) {
            if (stream == null) throw new IllegalStateException("Missing /config/characters.json");
            var type = new TypeToken<Map<String, Map<String, Integer>>>() {}.getType();
            Map<String, Map<String, Integer>> input = new Gson().fromJson(
                    new InputStreamReader(stream, StandardCharsets.UTF_8), type);
            if (input == null || !input.keySet().equals(Set.of("knight", "hunter", "fighter", "lion"))) {
                throw new IllegalArgumentException("Character config must define knight, hunter, fighter, lion");
            }
            var result = new java.util.HashMap<String, Stats>();
            for (var entry : input.entrySet()) {
                var values = entry.getValue();
                if (values == null || !values.keySet().equals(Set.of("maxHp", "damage", "armor"))) {
                    throw new IllegalArgumentException("Missing or unknown stats for " + entry.getKey());
                }
                Integer hp = values.get("maxHp"), damage = values.get("damage"), armor = values.get("armor");
                if (hp == null || hp <= 0 || damage == null || damage < 0 || armor == null || armor < 0) {
                    throw new IllegalArgumentException("Invalid stats for " + entry.getKey());
                }
                result.put(entry.getKey(), new Stats(hp, damage, armor));
            }
            return Map.copyOf(result);
        } catch (Exception e) {
            throw new IllegalStateException("Cannot load character configuration", e);
        }
    }
}
