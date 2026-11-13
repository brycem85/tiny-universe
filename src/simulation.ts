import type { BodyType, Body, Camera, LogEntry, Particle, Scenario, Settings, Snapshot } from './types';
import { clamp, makeBody, MAX_BODIES, STEP, stepPhysics, valid } from './physics';
import { createScenario, scenarioNames } from './scenarios';
export class Simulation {
  bodies: Body[] = []; particles: Particle[] = []; logs: LogEntry[] = [];
  settings: Settings = { paused: false, speed: 1, gravity: 1, trails: true, trailLength: 220, collision: 'merge' };
  camera: Camera = { x: 0, y: 0, zoom: .7 };
  scenario: Scenario = 'solar'; seed = 4271; elapsed = 0; accumulator = 0; selectedId: number | null = null; nextId = 1; logId = 0; trailTick = 0; fps = 0;
  constructor() { this.load('solar'); }
  log(text: string) { this.logs.unshift({ id: ++this.logId, time: this.elapsed, text }); this.logs.length = Math.min(this.logs.length, 6); }
  load(scenario: Scenario, seed = this.seed) {
    this.scenario = scenario; this.seed = seed; this.bodies = createScenario(scenario, seed); this.nextId = Math.max(0, ...this.bodies.map(b => b.id)) + 1;
    this.elapsed = 0; this.accumulator = 0; this.particles = []; this.selectedId = null; this.trailTick = 0; this.logs = []; this.log(`${scenarioNames[scenario]} initialized`);
  }
  spawn(type: BodyType, x: number, y: number, mass: number, vx = 0, vy = 0): Body | undefined {
    if (this.bodies.length >= MAX_BODIES) { this.log(`Body limit reached (${MAX_BODIES})`); return; }
    const body = makeBody(this.nextId++, type, x, y, mass, vx, vy); this.bodies.push(body); this.selectedId = body.id; this.burst(x, y, body.color, 14, 15); this.log(`${body.name} created`); return body;
  }
  remove(id: number) { const b = this.bodies.find(b => b.id === id); if (!b) return; this.bodies = this.bodies.filter(b => b.id !== id); if (this.selectedId === id) this.selectedId = null; this.burst(b.x, b.y, b.color, 12, 20); this.log(`${b.name} removed`); }
  clear() { this.bodies = []; this.particles = []; this.selectedId = null; this.accumulator = 0; this.log('Universe cleared. Make something new.'); }
  burst(x: number, y: number, color: string, count: number, speed: number) {
    for (let i = 0; i < count; i++) { const angle = Math.random() * Math.PI * 2, v = speed * (.2 + Math.random()); const life = .4 + Math.random() * .9; this.particles.push({ x, y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v, life, maxLife: life, size: 1 + Math.random() * 2, color }); }
    if (this.particles.length > 2200) this.particles.splice(0, this.particles.length - 2200);
  }
  advance(realDt: number) {
    const frameDt = clamp(valid(realDt), 0, .1);
    // Effects use wall time so a paused experiment still gives input feedback.
    this.particles = this.particles.filter(p => { p.x += p.vx * frameDt; p.y += p.vy * frameDt; p.life -= frameDt; return p.life > 0; });
    if (this.settings.paused) { this.accumulator = 0; return; }
    this.accumulator += frameDt * clamp(valid(this.settings.speed, 1), .25, 4);
    let steps = 0;
    while (this.accumulator >= STEP && steps < 48) {
      stepPhysics(this.bodies, STEP, this.settings.gravity, this.settings.collision, ({ a, b, result }) => {
        this.burst(result.x, result.y, result.color, Math.min(70, 18 + Math.sqrt(a.mass + b.mass)), 65);
        if (this.selectedId === a.id || this.selectedId === b.id) this.selectedId = result.id;
        if (this.settings.collision === 'merge') this.log(`${a.name} + ${b.name} merged`); else this.log(`${a.name} struck ${b.name}`);
      });
      this.elapsed += STEP; this.accumulator -= STEP; steps++; this.trailTick++;
      if (this.trailTick % 5 === 0) for (const b of this.bodies) {
        if (this.settings.trails) b.trail.push({ x: b.x, y: b.y });
        const max = clamp(this.settings.trailLength, 20, 600); if (b.trail.length > max) b.trail.splice(0, b.trail.length - max);
      }
    }
    if (steps === 48) this.accumulator = 0;
  }
  snapshot(): Snapshot { return { bodies: this.bodies.length, mass: this.bodies.reduce((s, b) => s + b.mass, 0), elapsed: this.elapsed, fps: this.fps, selected: this.bodies.find(b => b.id === this.selectedId), logs: [...this.logs], seed: this.seed }; }
}
