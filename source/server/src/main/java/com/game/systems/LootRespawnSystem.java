package com.game.systems;

import com.game.features.combat.CombatNavigation;
import com.game.model.Item;
import com.game.model.Mob;
import com.game.model.Player;
import com.game.world.WorldContext;

import java.awt.Point;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

/**
 * Hệ thống Phần 4 (Hoàng) — Chat thời gian thực, Rơi & Nhặt bình máu (Atomic), Chết & Hồi sinh (Player/Mob).
 * Đồng bộ trực tiếp với bản đồ Tiled WorldMap (172x314) và vòng lặp tick 100ms của GameServer.
 */
public class LootRespawnSystem {
    public static final int POTION_HEAL_AMOUNT = 30;
    public static final int PASSIVE_REGEN_HP_PER_TICK = 1;    // 10 HP/s ở tick 100 ms
    public static final double DEFAULT_DROP_RATE = 0.50;
    public static final long ITEM_LIFETIME_TICKS = 200L;       // 20 giây (10 tick/giây)
    public static final long PLAYER_RESPAWN_WAIT_TICKS = 30L;  // 3 giây (10 tick/giây)
    public static final long MOB_RESPAWN_WAIT_TICKS = 150L;    // 15 giây (10 tick/giây)
    public static final int CHAT_MAX_CODE_POINTS = 120;
    public static final long CHAT_COOLDOWN_MS = 1000L;         // Tối đa 1 tin / giây
    public static final int LOOT_MAX_MANHATTAN_DISTANCE = 1;

    private final WorldContext world;
    private final Random random;
    private final CombatNavigation combatNavigation;
    private double dropRate;

    public LootRespawnSystem(WorldContext world) {
        this(world, new Random(), DEFAULT_DROP_RATE);
    }

    public LootRespawnSystem(WorldContext world, Random random, double dropRate) {
        this.world = world;
        this.random = random != null ? random : new Random();
        this.combatNavigation = new CombatNavigation(world.getWorldMap());
        this.dropRate = Math.max(0.0, Math.min(1.0, dropRate));
    }

    public void setDropRate(double dropRate) {
        this.dropRate = Math.max(0.0, Math.min(1.0, dropRate));
    }

    public double getDropRate() {
        return dropRate;
    }

    /**
     * Xử lý lệnh CHAT: 1-120 Unicode code points, 1 dòng, không ký tự điều khiển, giới hạn 1 tin/giây.
     */
    public CommandResult handleChat(Player sender, String rawText, long nowMs) {
        synchronized (world) {
            if (sender == null) {
                return CommandResult.error("JOIN_REQUIRED", "Bạn cần vào game trước khi chat.");
            }
            if (rawText == null) {
                return CommandResult.error("INVALID_MESSAGE", "Nội dung chat không được rỗng.");
            }
            if (rawText.indexOf('\n') >= 0 || rawText.indexOf('\r') >= 0) {
                return CommandResult.error("INVALID_MESSAGE", "Tin nhắn chat chỉ được phép trên một dòng.");
            }

            String trimmed = rawText.trim();
            int codePoints = trimmed.codePointCount(0, trimmed.length());
            if (codePoints < 1 || codePoints > CHAT_MAX_CODE_POINTS) {
                return CommandResult.error(
                        "INVALID_MESSAGE",
                        "Tin nhắn chat phải từ 1 đến " + CHAT_MAX_CODE_POINTS + " ký tự."
                );
            }
            if (hasControlChars(trimmed)) {
                return CommandResult.error("INVALID_MESSAGE", "Tin nhắn chat chứa ký tự điều khiển không hợp lệ.");
            }

            long lastChat = sender.getLastChatTimestampMs();
            if (lastChat > 0 && (nowMs - lastChat) < CHAT_COOLDOWN_MS) {
                return CommandResult.error("RATE_LIMITED", "Bạn gửi tin nhắn quá nhanh (tối đa 1 tin/giây).");
            }

            sender.setLastChatTimestampMs(nowMs);

            Map<String, Object> chatPayload = new LinkedHashMap<>();
            chatPayload.put("playerId", sender.getId());
            chatPayload.put("name", sender.getName());
            chatPayload.put("text", trimmed);
            world.emitEvent("CHAT", chatPayload);

            return CommandResult.ack("CHAT");
        }
    }

    /**
     * Xử lý lệnh LOOT: kiểm tra atomic (chỉ 1 người nhặt thành công), tầm Manhattan <= 1, HP < maxHp, hồi +30 HP.
     */
    public CommandResult handleLoot(Player player, String itemId) {
        synchronized (world) {
            if (player == null) {
                return CommandResult.error("JOIN_REQUIRED", "Bạn cần vào game trước khi nhặt vật phẩm.");
            }
            if (player.isDead()) {
                return CommandResult.error("PLAYER_DEAD", "Nhân vật đã chết, không thể nhặt bình máu.");
            }
            if (itemId == null || itemId.trim().isEmpty()) {
                return CommandResult.error("INVALID_MESSAGE", "Thiếu mã vật phẩm (itemId) cần nhặt.");
            }

            Item item = world.getItem(itemId);
            long tick = world.getCurrentTick();
            if (item == null) {
                return CommandResult.error("ITEM_UNAVAILABLE", "Bình máu không còn tồn tại hoặc đã có người khác nhặt.");
            }
            if (tick >= item.getExpiresTick()) {
                world.removeItem(itemId);
                emitEntityDespawn(itemId, "EXPIRED", null);
                return CommandResult.error("ITEM_UNAVAILABLE", "Bình máu đã hết hạn và biến mất.");
            }

            int manhattan = Math.abs(player.getX() - item.getX()) + Math.abs(player.getY() - item.getY());
            if (manhattan > LOOT_MAX_MANHATTAN_DISTANCE) {
                return CommandResult.error("OUT_OF_RANGE", "Bạn đứng quá xa bình máu (cần lại gần hơn).");
            }

            if (player.getHp() >= player.getMaxHp()) {
                return CommandResult.error("HP_FULL", "Máu của bạn đã đầy (" + player.getHp() + "/" + player.getMaxHp() + " HP).");
            }

            // Atomic remove: chỉ duy nhất 1 người chơi lấy được vật phẩm này
            Item removed = world.removeItem(itemId);
            if (removed == null) {
                return CommandResult.error("ITEM_UNAVAILABLE", "Bình máu vừa được người chơi khác nhặt.");
            }

            int oldHp = player.getHp();
            player.setHp(Math.min(player.getMaxHp(), oldHp + POTION_HEAL_AMOUNT));
            int healed = player.getHp() - oldHp;

            Map<String, Object> extra = new LinkedHashMap<>();
            extra.put("lootedBy", player.getId());
            extra.put("lootedByName", player.getName());
            extra.put("healedAmount", healed);
            extra.put("x", removed.getX());
            extra.put("y", removed.getY());
            emitEntityDespawn(removed.getId(), "LOOTED", extra);

            return CommandResult.ack("LOOT");
        }
    }

    /**
     * Xử lý lệnh RESPAWN: chỉ cho phép khi đã chết và hết thời gian chờ 30 ticks (3 giây).
     */
    public CommandResult handleRespawn(Player player) {
        synchronized (world) {
            if (player == null) {
                return CommandResult.error("JOIN_REQUIRED", "Bạn cần vào game trước khi hồi sinh.");
            }
            if (!player.isDead()) {
                return CommandResult.error("INVALID_STATE", "Nhân vật vẫn còn sống, không thể hồi sinh.");
            }

            long tick = world.getCurrentTick();
            Long readyTick = player.getRespawnReadyTick();
            if (readyTick != null && tick < readyTick) {
                long remainingTicks = readyTick - tick;
                double remainingSec = Math.ceil(remainingTicks) / 10.0;
                return CommandResult.error(
                        "RESPAWN_NOT_READY",
                        String.format("Chưa hết thời gian chờ hồi sinh (còn %.1f giây).", remainingSec)
                );
            }

            Point spawn = world.findRespawnTile(player.getId());
            player.setHp(player.getMaxHp());
            player.setState("IDLE");
            player.setRespawnReadyTick(null);
            player.clearPath();
            player.setPosition(spawn.x, spawn.y);

            emitEntitySpawn(player.getId(), "PLAYER", null, spawn.x, spawn.y);
            return CommandResult.ack("RESPAWN");
        }
    }

    /**
     * Gây sát thương cho người chơi; nếu HP về 0 thì chuyển trạng thái DEAD và đếm ngược 30 tick (3 giây).
     */
    public void applyDamageToPlayer(String attackerId, Player player, int amount) {
        synchronized (world) {
            if (player == null || player.isDead() || amount <= 0) {
                return;
            }
            int nextHp = Math.max(0, player.getHp() - amount);
            player.setHp(nextHp);
            emitDamage(attackerId, player.getId(), amount, player.getX(), player.getY());

            if (nextHp == 0) {
                player.clearPath();
                player.setState("DEAD");
                player.setRespawnReadyTick(world.getCurrentTick() + PLAYER_RESPAWN_WAIT_TICKS);
                emitEntityDespawn(player.getId(), "DEAD", null);
            }
        }
    }

    /**
     * Gây sát thương cho quái (sẵn sàng gọi từ hệ thống combat Phần 3); khi quái chết sẽ xử lý rơi đồ & hẹn hồi sinh.
     */
    public Item applyDamageToMob(String attackerId, Mob mob, int amount) {
        synchronized (world) {
            if (mob == null || mob.isDead() || amount <= 0) {
                return null;
            }
            int nextHp = Math.max(0, mob.getHp() - amount);
            mob.setHp(nextHp);
            emitDamage(attackerId, mob.getId(), amount, mob.getX(), mob.getY());

            if (nextHp == 0) {
                return onMobKilled(mob);
            }
            return null;
        }
    }

    /**
     * Hook chuẩn cho Phần 3 gọi đúng 1 lần khi quái chết: rơi bình máu 50% và đặt lịch hồi sinh quái sau 150 ticks.
     */
    public Item onMobKilled(Mob mob) {
        synchronized (world) {
            if (mob == null || mob.getRespawnReadyTick() != null) {
                return null;
            }
            long tick = world.getCurrentTick();
            mob.setHp(0);
            mob.setState("DEAD");
            mob.setTargetId(null);
            emitEntityDespawn(mob.getId(), "DEAD", null);
            return registerMobDeath(mob, tick);
        }
    }

    public Item onCombatMobDeath(Mob mob) {
        synchronized (world) {
            if (mob == null || !mob.isDead() || mob.getRespawnReadyTick() != null) {
                return null;
            }
            return registerMobDeath(mob, world.getCurrentTick());
        }
    }

    public void onCombatPlayerDeath(Player player) {
        synchronized (world) {
            if (player != null && player.getRespawnReadyTick() == null) {
                player.setRespawnReadyTick(world.getCurrentTick() + PLAYER_RESPAWN_WAIT_TICKS);
            }
        }
    }

    /**
     * Thả 1 bình máu hợp lệ gần vị trí (x, y) — dùng cho cả rơi đồ lẫn kiểm thử trực quan.
     */
    public Item spawnPotionNear(int x, int y) {
        synchronized (world) {
            long tick = world.getCurrentTick();
            Point dropTile = world.findDropTileNear(x, y);
            Item potion = world.spawnHealthPotion(dropTile.x, dropTile.y, tick + ITEM_LIFETIME_TICKS);
            emitEntitySpawn(potion.getId(), "ITEM", null, potion.getX(), potion.getY());
            return potion;
        }
    }

    /**
     * Cập nhật mỗi tick (100 ms): dọn vật phẩm, hồi sinh quái và hồi 1 HP nếu người chơi an toàn.
     * Trả về true nếu có thay đổi trạng thái cần broadcast STATE_UPDATE.
     */
    public boolean updateTick() {
        synchronized (world) {
            boolean changed = false;
            long tick = world.getCurrentTick();

            // 1. Dọn bình máu hết hạn
            List<Item> expiredItems = new ArrayList<>();
            for (Item item : world.getItems()) {
                if (tick >= item.getExpiresTick()) {
                    expiredItems.add(item);
                }
            }
            for (Item item : expiredItems) {
                if (world.removeItem(item.getId()) != null) {
                    emitEntityDespawn(item.getId(), "EXPIRED", null);
                    changed = true;
                }
            }

            // 2. Hồi sinh quái sau 150 ticks
            for (Mob mob : world.getMobs()) {
                if (mob.isDead() && mob.getRespawnReadyTick() != null && tick >= mob.getRespawnReadyTick()) {
                    mob.setHp(mob.getMaxHp());
                    mob.setState("IDLE");
                    mob.setTargetId(null);
                    mob.setPosition(mob.getHomeX(), mob.getHomeY());
                    mob.setRespawnReadyTick(null);
                    mob.incrementSpawnGeneration();
                    emitEntitySpawn(mob.getId(), "MOB", mob.getSpawnGeneration(), mob.getX(), mob.getY());
                    changed = true;
                }
            }

            for (Player player : world.getPlayers()) {
                if (!player.isAlive() || player.getHp() >= player.getMaxHp() || isThreatened(player)) continue;
                player.setHp(player.getHp() + PASSIVE_REGEN_HP_PER_TICK);
                changed = true;
            }

            return changed;
        }
    }

    private boolean isThreatened(Player player) {
        if (combatNavigation.isSafe(player)) return false;
        for (Mob mob : world.getMobs()) {
            if (!mob.isAlive() || "RETURN".equals(mob.getState())) continue;

            if (mob.getTargetId() != null) {
                if (player.getId().equals(mob.getTargetId())) return true;
                continue;
            }
            if (CombatNavigation.distance(player, mob) <= mob.getAggroRadius()) return true;
        }
        return false;
    }

    private void emitDamage(String attackerId, String targetId, int amount, int x, int y) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("attackerId", attackerId);
        payload.put("targetId", targetId);
        payload.put("amount", amount);
        payload.put("x", x);
        payload.put("y", y);
        world.emitEvent("DAMAGE", payload);
    }

    private Item registerMobDeath(Mob mob, long tick) {
        mob.setRespawnReadyTick(tick + Math.max(1, mob.getRespawnSeconds()) * 10L);
        if (random.nextDouble() >= dropRate) {
            return null;
        }

        Point dropTile = world.findDropTileNear(mob.getX(), mob.getY());
        Item potion = world.spawnHealthPotion(dropTile.x, dropTile.y, tick + ITEM_LIFETIME_TICKS);
        emitEntitySpawn(potion.getId(), "ITEM", null, potion.getX(), potion.getY());
        return potion;
    }

    private void emitEntitySpawn(String id, String kind, Integer spawnGeneration, int x, int y) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", id);
        payload.put("kind", kind);
        payload.put("spawnGeneration", spawnGeneration);
        payload.put("x", x);
        payload.put("y", y);
        world.emitEvent("ENTITY_SPAWN", payload);
    }

    private void emitEntityDespawn(String id, String reason, Map<String, Object> extra) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", id);
        payload.put("reason", reason);
        if (extra != null) {
            payload.putAll(extra);
        }
        world.emitEvent("ENTITY_DESPAWN", payload);
    }

    private static boolean hasControlChars(String s) {
        for (int i = 0; i < s.length(); i++) {
            if (Character.isISOControl(s.charAt(i))) {
                return true;
            }
        }
        return false;
    }
}
