package com.game.systems;

import com.game.model.Item;
import com.game.model.Mob;
import com.game.model.Player;
import com.game.world.WorldContext;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

/**
 * Xử lý nghiệp vụ Chat, Rơi đồ (HEALTH_POTION), Nhặt bình máu (LOOT), và Hồi sinh (Player/Mob).
 * Hoàn toàn tương thích đa bản đồ (world-01, world-02).
 */
public class LootRespawnSystem {
    public static final int POTION_HEAL_AMOUNT = 30;
    public static final double DEFAULT_DROP_RATE = 0.50;
    public static final long ITEM_LIFETIME_TICKS = 200L;       // 20 giây (10 tick/giây)
    public static final long PLAYER_RESPAWN_WAIT_TICKS = 30L;  // 3 giây (10 tick/giây)
    public static final long MOB_RESPAWN_WAIT_TICKS = 150L;    // 15 giây (10 tick/giây)
    public static final int CHAT_MAX_CODE_POINTS = 120;
    public static final long CHAT_COOLDOWN_MS = 1000L;         // Tối đa 1 tin / giây
    public static final int LOOT_MAX_MANHATTAN_DISTANCE = 1;

    private final WorldContext world;
    private final Random random;
    private double dropRate;

    public LootRespawnSystem(WorldContext world) {
        this(world, new Random(), DEFAULT_DROP_RATE);
    }

    public LootRespawnSystem(WorldContext world, Random random, double dropRate) {
        this.world = world;
        this.random = random != null ? random : new Random();
        this.dropRate = Math.max(0.0, Math.min(1.0, dropRate));
    }

    public void setDropRate(double dropRate) {
        this.dropRate = Math.max(0.0, Math.min(1.0, dropRate));
    }

    public double getDropRate() {
        return dropRate;
    }

    public CommandResult handleChat(Player sender, String rawText, long nowMs) {
        synchronized (world) {
            if (sender == null) {
                return CommandResult.error("JOIN_REQUIRED", "Bạn cần vào game trước khi chat");
            }
            if (rawText == null) {
                return CommandResult.error("INVALID_MESSAGE", "Nội dung chat không được rỗng");
            }
            if (rawText.indexOf('\n') >= 0 || rawText.indexOf('\r') >= 0) {
                return CommandResult.error("INVALID_MESSAGE", "Tin nhắn chat chỉ được phép trên một dòng");
            }

            String trimmed = rawText.trim();
            int codePoints = trimmed.codePointCount(0, trimmed.length());
            if (codePoints < 1 || codePoints > CHAT_MAX_CODE_POINTS) {
                return CommandResult.error(
                    "INVALID_MESSAGE",
                    "Tin nhắn chat sau khi cắt khoảng trắng phải từ 1 đến " + CHAT_MAX_CODE_POINTS + " ký tự"
                );
            }

            long lastChat = sender.getLastChatTimestampMs();
            if (lastChat > 0 && (nowMs - lastChat) < CHAT_COOLDOWN_MS) {
                return CommandResult.error("RATE_LIMITED", "Bạn gửi tin nhắn quá nhanh (tối đa 1 tin/giây)");
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

    public CommandResult handleLoot(Player player, String itemId) {
        synchronized (world) {
            if (player == null) {
                return CommandResult.error("JOIN_REQUIRED", "Bạn cần vào game trước khi nhặt vật phẩm");
            }
            if (player.isDead()) {
                return CommandResult.error("PLAYER_DEAD", "Nhân vật đã chết, không thể nhặt bình máu");
            }
            if (itemId == null || itemId.trim().isEmpty()) {
                return CommandResult.error("INVALID_MESSAGE", "Thiếu mã vật phẩm (itemId) cần nhặt");
            }

            Item item = world.getItem(itemId);
            long tick = world.getCurrentTick();
            if (item == null) {
                return CommandResult.error("ITEM_UNAVAILABLE", "Bình máu không còn tồn tại hoặc đã có người khác nhặt");
            }
            if (tick >= item.getExpiresTick()) {
                world.removeItem(itemId);
                emitEntityDespawn(itemId, "EXPIRED");
                return CommandResult.error("ITEM_UNAVAILABLE", "Bình máu đã hết hạn và biến mất");
            }

            // Kiểm tra cùng bản đồ
            if (!player.getMapId().equals(item.getMapId())) {
                return CommandResult.error("OUT_OF_RANGE", "Bình máu nằm ở bản đồ khác");
            }

            // Khoảng cách Manhattan <= 1
            int manhattan = Math.abs(player.getX() - item.getX()) + Math.abs(player.getY() - item.getY());
            if (manhattan > LOOT_MAX_MANHATTAN_DISTANCE) {
                return CommandResult.error("OUT_OF_RANGE", "Bạn đứng quá xa bình máu (cần khoảng cách Manhattan <= 1)");
            }

            if (player.getHp() >= player.getMaxHp()) {
                return CommandResult.error("HP_FULL", "Máu của bạn đã đầy (100/100), bình máu được giữ lại");
            }

            // Nhặt một lần: xóa vật phẩm và cộng máu
            world.removeItem(itemId);
            int newHp = Math.min(player.getMaxHp(), player.getHp() + POTION_HEAL_AMOUNT);
            player.setHp(newHp);

            emitEntityDespawn(itemId, "LOOTED");
            return CommandResult.ack("LOOT");
        }
    }

    public Item onMobDeath(Mob mob) {
        synchronized (world) {
            if (mob == null || "DEAD".equals(mob.getState())) {
                return null;
            }

            long tick = world.getCurrentTick();
            mob.setHp(0);
            mob.setState("DEAD");
            mob.setTargetId(null);
            mob.setRespawnReadyTick(tick + MOB_RESPAWN_WAIT_TICKS);

            for (Player p : world.getPlayers()) {
                if (mob.getId().equals(p.getTargetId())) {
                    p.setTargetId(null);
                    if ("ATTACKING".equals(p.getState())) {
                        p.setState("IDLE");
                    }
                }
            }

            emitEntityDespawn(mob.getId(), "DEAD");

            // Xác suất rơi bình máu tại ô quái chết trên cùng mapId
            if (random.nextDouble() < dropRate) {
                Item dropped = world.spawnHealthPotion(mob.getMapId(), mob.getX(), mob.getY(), tick + ITEM_LIFETIME_TICKS);
                emitEntitySpawn(dropped.getId(), "ITEM", null);
                return dropped;
            }
            return null;
        }
    }

    public void onPlayerDeath(Player player) {
        synchronized (world) {
            if (player == null || "DEAD".equals(player.getState())) {
                return;
            }

            long tick = world.getCurrentTick();
            player.setHp(0);
            player.setState("DEAD");
            player.setTargetId(null);
            player.setRespawnReadyTick(tick + PLAYER_RESPAWN_WAIT_TICKS);

            for (Mob mob : world.getMobs()) {
                if (player.getId().equals(mob.getTargetId())) {
                    mob.setTargetId(null);
                    if (!mob.isDead()) {
                        mob.setState("IDLE");
                    }
                }
            }

            emitEntityDespawn(player.getId(), "DEAD");
        }
    }

    public CommandResult handleRespawn(Player player) {
        synchronized (world) {
            if (player == null) {
                return CommandResult.error("JOIN_REQUIRED", "Bạn cần vào game trước khi hồi sinh");
            }
            if (!"DEAD".equals(player.getState())) {
                return CommandResult.error("INVALID_MESSAGE", "Nhân vật đang còn sống, không cần hồi sinh");
            }

            long tick = world.getCurrentTick();
            Long readyTick = player.getRespawnReadyTick();
            if (readyTick != null && tick < readyTick) {
                long remainingTicks = readyTick - tick;
                return CommandResult.error(
                    "RESPAWN_NOT_READY",
                    "Chưa hết thời gian chờ hồi sinh (còn " + String.format("%.1f", remainingTicks * 0.1) + " giây)"
                );
            }

            // Hồi sinh về map world-01 tại vị trí an toàn (3, 3)
            player.setMapId("world-01");
            player.setX(3);
            player.setY(3);
            player.setHp(player.getMaxHp());
            player.setState("IDLE");
            player.setTargetId(null);
            player.setRespawnReadyTick(null);

            emitEntitySpawn(player.getId(), "PLAYER", null);
            return CommandResult.ack("RESPAWN");
        }
    }

    public void updateTick() {
        synchronized (world) {
            long tick = world.getCurrentTick();

            // 1. Kiểm tra bình máu hết hạn
            List<Item> currentItems = new ArrayList<>(world.getItems());
            for (Item item : currentItems) {
                if (tick >= item.getExpiresTick()) {
                    world.removeItem(item.getId());
                    emitEntityDespawn(item.getId(), "EXPIRED");
                }
            }

            // 2. Kiểm tra hồi sinh quái
            for (Mob mob : world.getMobs()) {
                if ("DEAD".equals(mob.getState()) && mob.getRespawnReadyTick() != null && tick >= mob.getRespawnReadyTick()) {
                    mob.setX(mob.getHomeX());
                    mob.setY(mob.getHomeY());
                    mob.setHp(mob.getMaxHp());
                    mob.setState("IDLE");
                    mob.setTargetId(null);
                    mob.setRespawnReadyTick(null);
                    mob.incrementSpawnGeneration();

                    emitEntitySpawn(mob.getId(), "MOB", mob.getSpawnGeneration());
                }
            }
        }
    }

    public void applyDamageToPlayer(String attackerId, Player target, int amount) {
        synchronized (world) {
            if (target == null || target.isDead() || amount <= 0) {
                return;
            }
            int actualDamage = Math.min(target.getHp(), amount);
            target.setHp(target.getHp() - actualDamage);

            Map<String, Object> dmgPayload = new LinkedHashMap<>();
            dmgPayload.put("attackerId", attackerId != null ? attackerId : "m-1");
            dmgPayload.put("targetId", target.getId());
            dmgPayload.put("amount", actualDamage);
            world.emitEvent("DAMAGE", dmgPayload);

            if (target.getHp() <= 0) {
                onPlayerDeath(target);
            }
        }
    }

    public Item applyDamageToMob(String attackerId, Mob mob, int amount) {
        synchronized (world) {
            if (mob == null || mob.isDead() || amount <= 0) {
                return null;
            }
            int actualDamage = Math.min(mob.getHp(), amount);
            mob.setHp(mob.getHp() - actualDamage);

            Map<String, Object> dmgPayload = new LinkedHashMap<>();
            dmgPayload.put("attackerId", attackerId != null ? attackerId : "p-1");
            dmgPayload.put("targetId", mob.getId());
            dmgPayload.put("amount", actualDamage);
            world.emitEvent("DAMAGE", dmgPayload);

            if (mob.getHp() <= 0) {
                return onMobDeath(mob);
            }
            return null;
        }
    }

    private void emitEntitySpawn(String id, String kind, Integer spawnGeneration) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", id);
        payload.put("kind", kind);
        payload.put("spawnGeneration", spawnGeneration);
        world.emitEvent("ENTITY_SPAWN", payload);
    }

    private void emitEntityDespawn(String id, String reason) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", id);
        payload.put("reason", reason);
        world.emitEvent("ENTITY_DESPAWN", payload);
    }
}
