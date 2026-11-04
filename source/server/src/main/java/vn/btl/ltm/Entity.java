/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. https://mozilla.org/MPL/2.0/
 * Port of BrowserQuest entity/character/player/mob state, Little Workshop. */
package vn.btl.ltm;

import java.util.*;

final class Entity {
    final int id, kind, homeX, homeY;
    int x, y, hp, maxHp, armor = 21, weapon = 60, orientation = 2, target, checkpoint;
    int armorLevel = 1, weaponLevel = 1;
    String name = "";
    long lastHit, lastHurt, lastMove, lastChat, respawnAt;
    boolean removed;
    final Set<Integer> visible = new HashSet<>();
    List<Integer> contents = List.of();
    Entity(int id, int kind, int x, int y) {
        this.id = id; this.kind = kind; this.x = homeX = x; this.y = homeY = y;
        hp = maxHp = 80;
    }
    boolean mob() { return kind >= 2 && kind <= 14; }
    boolean item() { return (kind >= 20 && kind <= 26) || (kind >= 35 && kind <= 39 && kind != 37) || kind >= 60; }
    List<Object> spawn() {
        List<Object> message = new ArrayList<>(List.of(2, id, kind, x, y));
        if (kind == 1) message.addAll(List.of(name, orientation, armor, weapon));
        else if (mob()) message.add(orientation);
        if (target > 0 && (mob() || kind == 1)) message.add(target);
        return message;
    }
    int distance(Entity other) { return Math.abs(x - other.x) + Math.abs(y - other.y); }
}
