import { GridMap } from './GridMap.js';
import { ClickMoveController } from './ClickMoveController.js';
import { EntityInterpolator } from './EntityInterpolator.js';
import { MapRenderer } from './MapRenderer.js';
import type { MovementPort } from './MovementPort.js';
import type { Snapshot } from './types.js';
import type { TileAtlas } from './TileAtlas.js';

export class MovementModule {
  private readonly interpolation = new EntityInterpolator();
  private readonly input: ClickMoveController;
  private readonly renderer: MapRenderer;
  private readonly cleanup: (() => void)[];
  private mapId: string;
  private active = true;
  private lastTick = -1;
  constructor(private readonly port: MovementPort, canvas: HTMLCanvasElement, private readonly maps: ReadonlyMap<string, GridMap>, report: (message: string) => void, tiles?: TileAtlas) {
    GridMap.validateWorld(maps);
    const self = port.getSnapshot().entities.find(e => e.id === port.playerId);
    if (!self || !maps.has(self.mapId)) throw new Error('MISSING_SELF_MAP');
    this.mapId = self.mapId;
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('CANVAS_UNAVAILABLE');
    canvas.width = 768; canvas.height = 576;
    this.renderer = new MapRenderer(ctx, tiles);
    this.input = new ClickMoveController(canvas, () => maps.get(this.mapId)!, () => port.getSnapshot().entities.find(e => e.id === port.playerId), p => { if (this.active) port.sendCommand('MOVE_TO', p); }, report);
    const accept = (s: Snapshot) => {
      if (s.tick <= this.lastTick) return;
      this.lastTick = s.tick;
      const player = s.entities.find(e => e.id === port.playerId);
      if (!player || !maps.has(player.mapId)) { this.input.reset(); return; }
      if (this.mapId !== player.mapId) { this.mapId = player.mapId; this.input.reset(); this.interpolation.clear(); }
      this.interpolation.push(s);
      if (this.input.target?.x === player.x && this.input.target?.y === player.y) this.input.reset();
    };
    accept(port.getSnapshot());
    this.cleanup = [port.onSnapshot(accept), port.onDisconnect(() => this.dispose()), port.onError(code => { this.input.reset(); report(code); })];
  }
  /** Called by the host's existing render loop; does not start another loop. */
  render(now = performance.now()): void { if (this.active) { this.input.flush(now); this.renderer.draw(this.maps.get(this.mapId)!, this.interpolation.sample(now), this.input.path, this.input.target, this.port.playerId); } }
  dispose(): void { if (!this.active) return; this.active = false; this.input.dispose(); this.interpolation.clear(); this.cleanup.forEach(fn => fn()); }
}
