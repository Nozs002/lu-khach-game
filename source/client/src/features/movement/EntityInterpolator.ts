import type { Entity, Snapshot } from './types.js';

/** Render one snapshot behind, preserving every tile/corner. Never write store state. */
export class EntityInterpolator {
  private frames: { snapshot: Snapshot; at: number }[] = [];
  push(snapshot: Snapshot, at = performance.now()): void {
    if (snapshot.tick <= (this.frames.at(-1)?.snapshot.tick ?? -1)) return;
    this.frames.push({ snapshot: structuredClone(snapshot), at });
    if (this.frames.length > 8) this.frames.shift();
  }
  sample(now = performance.now()): readonly Entity[] {
    if (!this.frames.length) return [];
    const time = now - 100;
    while (this.frames.length > 2 && this.frames[1].at <= time) this.frames.shift();
    const a = this.frames[0], b = this.frames[1];
    if (!b) return a.snapshot.entities;
    const t = Math.max(0, Math.min(1, (time - a.at) / Math.max(1, b.at - a.at)));
    return b.snapshot.entities.map(next => {
      const old = a.snapshot.entities.find(e => e.id === next.id);
      if (!old || old.mapId !== next.mapId || Math.abs(old.x - next.x) + Math.abs(old.y - next.y) > 1) return next;
      return { ...next, x: old.x + (next.x - old.x) * t, y: old.y + (next.y - old.y) * t };
    });
  }
  clear(): void { this.frames = []; }
}
