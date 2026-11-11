package com.game.model;

import java.util.Collection;
import java.util.List;

public class WorldState {
    public Collection<Player> players;
    public Collection<Mob> mobs;
    public Collection<Item> items;

    public WorldState(Collection<Player> players, Collection<Mob> mobs, Collection<Item> items) {
        this.players = players != null ? players : List.of();
        this.mobs = mobs != null ? mobs : List.of();
        this.items = items != null ? items : List.of();
    }
}
