import type { BodyType, Tool, Vec } from './types';
import type { Simulation } from './simulation';
import { clamp } from './physics';
import { hitTest, toWorld } from './render';
import type { Gesture } from './render';
export interface InputConfig { tool: Tool; type: BodyType; mass: number; launchPower: number }
export class Input {
  gesture: Gesture | null = null; hoverId: number | null = null;
  constructor(public canvas: HTMLCanvasElement, public sim: Simulation, public config: InputConfig, private changed: () => void) {
    canvas.addEventListener('pointerdown', this.down); canvas.addEventListener('pointermove', this.move); canvas.addEventListener('pointerup', this.up); canvas.addEventListener('pointercancel', this.cancel); canvas.addEventListener('wheel', this.wheel, { passive: false }); canvas.addEventListener('contextmenu', this.context); canvas.addEventListener('lostpointercapture', this.cancel);
  }
  point = (e: PointerEvent | WheelEvent): Vec => { const r = this.canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  world = (p: Vec) => toWorld(p, this.sim.camera, this.canvas.clientWidth, this.canvas.clientHeight);
  down = (e: PointerEvent) => {
    if (this.gesture) return; e.preventDefault(); this.canvas.focus(); const p = this.point(e);
    const pan = e.button === 1 || e.button === 2 || e.altKey;
    this.gesture = { kind: pan ? 'pan' : this.config.tool === 'launch' ? 'launch' : 'click', start: p, current: p, world: this.world(p), camera: { ...this.sim.camera }, pointerId: e.pointerId };
    this.canvas.setPointerCapture(e.pointerId);
  };
  move = (e: PointerEvent) => {
    const p = this.point(e), g = this.gesture;
    if (g) {
      g.current = p;
      if (g.kind === 'click' && this.config.tool === 'select' && Math.hypot(p.x - g.start.x, p.y - g.start.y) > 5 && !hitTest(this.sim, g.world)) g.kind = 'pan';
      if (g.kind === 'pan') { this.sim.camera.x = g.camera.x - (p.x - g.start.x) / this.sim.camera.zoom; this.sim.camera.y = g.camera.y - (p.y - g.start.y) / this.sim.camera.zoom; }
    } else this.hoverId = hitTest(this.sim, this.world(p))?.id ?? null;
    this.canvas.style.cursor = g?.kind === 'pan' ? 'grabbing' : this.config.tool === 'select' ? this.hoverId ? 'pointer' : 'grab' : 'crosshair';
  };
  up = (e: PointerEvent) => {
    const g = this.gesture; if (!g || g.pointerId !== e.pointerId) return;
    const p = this.point(e), { tool, type, mass, launchPower } = this.config;
    if (g.kind === 'launch') { const end = this.world(p); this.sim.spawn(type, g.world.x, g.world.y, mass, (end.x - g.world.x) * launchPower, (end.y - g.world.y) * launchPower); }
    else if (g.kind === 'click' && Math.hypot(p.x - g.start.x, p.y - g.start.y) < 6) {
      const body = hitTest(this.sim, g.world);
      if (tool === 'select') this.sim.selectedId = body?.id ?? null;
      else if (tool === 'spawn') this.sim.spawn(type, g.world.x, g.world.y, mass);
      else if (tool === 'delete' && body) this.sim.remove(body.id);
    }
    this.cancel(); this.changed();
  };
  cancel = () => { this.gesture = null; };
  wheel = (e: WheelEvent) => {
    e.preventDefault(); if (this.gesture) return;
    const p = this.point(e), before = this.world(p), c = this.sim.camera;
    c.zoom = clamp(c.zoom * Math.exp(-e.deltaY * .0012), .025, 8);
    const after = this.world(p); c.x += before.x - after.x; c.y += before.y - after.y;
  };
  context = (e: Event) => e.preventDefault();
  dispose() { this.canvas.removeEventListener('pointerdown', this.down); this.canvas.removeEventListener('pointermove', this.move); this.canvas.removeEventListener('pointerup', this.up); this.canvas.removeEventListener('pointercancel', this.cancel); this.canvas.removeEventListener('lostpointercapture', this.cancel); this.canvas.removeEventListener('wheel', this.wheel); this.canvas.removeEventListener('contextmenu', this.context); }
}
