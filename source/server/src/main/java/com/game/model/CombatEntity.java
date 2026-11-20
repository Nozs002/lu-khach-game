package com.game.model;

public abstract class CombatEntity {
    protected String id;
    protected int x;
    protected int y;
    protected int hp;
    protected int maxHp;
    protected String state = "IDLE";
    protected String targetId;

    private transient long nextAttackTick;

    protected CombatEntity(String id, int x, int y, int maxHp) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.maxHp = maxHp;
        this.hp = maxHp;
    }

    public String getId() {
        return id;
    }

    public int getX() {
        return x;
    }

    public int getY() {
        return y;
    }

    public int getHp() {
        return hp;
    }

    public int getMaxHp() {
        return maxHp;
    }

    public String getState() {
        return state;
    }

    public String getTargetId() {
        return targetId;
    }

    public boolean isAlive() {
        return hp > 0 && !"DEAD".equals(state);
    }

    public void setPosition(int x, int y) {
        this.x = x;
        this.y = y;
    }

    public void setState(String state) {
        if (isAlive()) {
            this.state = state;
        }
    }

    public void setTargetId(String targetId) {
        this.targetId = targetId;
    }

    public boolean canAttack(long tick) {
        return isAlive() && tick >= nextAttackTick;
    }

    public void consumeCooldown(long tick, int cooldownTicks) {
        nextAttackTick = tick + cooldownTicks;
    }

    /**
     * Trả về true đúng ở lần chuyển từ sống sang chết.
     */
    public boolean receiveDamage(int amount) {
        if (!isAlive() || amount <= 0) {
            return false;
        }

        hp = Math.max(0, hp - amount);

        if (hp > 0) {
            return false;
        }

        state = "DEAD";
        targetId = null;
        clearPath();
        return true;
    }

    protected void resetLife(int x, int y) {
        clearPath();
        this.x = x;
        this.y = y;
        hp = maxHp;
        state = "IDLE";
        targetId = null;
        nextAttackTick = 0;
    }

    public abstract void clearPath();
}