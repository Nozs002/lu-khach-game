package com.game.features.movement;

import java.util.ArrayDeque;

final class MovementState {
    final ArrayDeque<WorldMap.Tile> path = new ArrayDeque<>();
    long nextStepMs;
    MovementState(long nowMs) { nextStepMs = Math.addExact(nowMs, 200); }
}
