import { findPath } from './AStar.js';
import { GridMap } from './GridMap.js';
import type { Tile } from './types.js';

export function pointerTile(canvas: HTMLCanvasElement, clientX: number, clientY: number): Tile | null {
  const r = canvas.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0 || clientX < r.left || clientY < r.top || clientX >= r.right || clientY >= r.bottom) return null;
  return { x: Math.floor((clientX - r.left) * canvas.width / r.width / 24), y: Math.floor((clientY - r.top) * canvas.height / r.height / 24) };
}
export class ClickMoveController {
  path: readonly Tile[] = [];
  target: Tile | null = null;
  private pending: Tile | null = null;
  private lastSent = -Infinity;
  private readonly listener = (e: PointerEvent) => {
    if (e.button !== 0) return;
    const p = pointerTile(this.canvas, e.clientX, e.clientY), current = this.current();
    if (!p || !current) return;
    const path = findPath(this.map(), current, p);
    if (path === null) { this.error('Đích bị chặn hoặc không có đường đi'); return; }
    this.path = path; this.target = p; this.pending = p;
  };
  constructor(private canvas: HTMLCanvasElement, private map: () => GridMap, private current: () => Tile | undefined, private send: (p: Tile) => void, private error: (message: string) => void) { canvas.addEventListener('pointerdown', this.listener); }
  flush(now: number): void { if (this.pending && now - this.lastSent >= 100) { const p = this.pending; this.pending = null; this.lastSent = now; this.send(p); } }
  reset(): void { this.path = []; this.target = null; this.pending = null; }
  dispose(): void { this.canvas.removeEventListener('pointerdown', this.listener); this.reset(); }
}
