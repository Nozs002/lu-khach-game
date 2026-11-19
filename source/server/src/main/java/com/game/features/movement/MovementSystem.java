package com.game.features.movement;

import com.game.model.Player;

import java.util.Collection;

public final class MovementSystem {
    public boolean advanceOneTick(Collection<Player> players) {
        boolean moved = false;
        for (Player player : players) {
            moved |= player.advanceOneStep();
        }
        return moved;
    }
}
