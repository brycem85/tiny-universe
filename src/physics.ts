import type { Body, BodyType, Settings } from './types';

export const G = 85;
export const STEP = 1 / 120;
export const MAX_BODIES = 500;
export const MAX_SPEED = 10000;
export const presets: Record<BodyType, { mass: number; color: string; label: string }> = {
  dust: { mass: 0.2, color: '#b1e9e2', label: 'Dust' }, asteroid: { mass: 3, color: '#b5acb9', label: 'Asteroid' },
  planet: { mass: 30, color: '#74b9d4', label: 'Planet' }, star: { mass: 2200, color: '#ffd191', label: 'Star' },
};
export const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
export const valid = (n: number, fallback = 0) => Number.isFinite(n) ? n : fallback;
export const radiusFor = (mass: number) => 2.4 * Math.cbrt(mass);
export function limitVelocity(vx: number, vy: number) {
  vx = valid(vx); vy = valid(vy);
  const speed = Math.hypot(vx, vy), scale = speed > MAX_SPEED ? MAX_SPEED / speed : 1;
  return { vx: vx * scale, vy: vy * scale };
}
export function makeBody(id: number, type: BodyType, x: number, y: number, mass = presets[type].mass, vx = 0, vy = 0, name?: string): Body {
  mass = clamp(valid(mass, presets[type].mass), 0.05, 100000);
  return { id, name: name ?? `${presets[type].label} ${id}`, type, x: clamp(valid(x), -1e12, 1e12), y: clamp(valid(y), -1e12, 1e12), ...limitVelocity(vx, vy), mass, radius: radiusFor(mass), color: presets[type].color, trail: [], born: 0 };
}
// Equal-and-opposite softened forces; velocity Verlet keeps ordinary orbits bounded.
function accelerations(bodies: Body[], strength: number): Float64Array {
  const a = new Float64Array(bodies.length * 2);
  for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
    const b = bodies[i], c = bodies[j], dx = c.x - b.x, dy = c.y - b.y;
    const d2 = dx * dx + dy * dy + 16;
    const f = G * strength / (d2 * Math.sqrt(d2));
    a[i * 2] += f * c.mass * dx; a[i * 2 + 1] += f * c.mass * dy;
    a[j * 2] -= f * b.mass * dx; a[j * 2 + 1] -= f * b.mass * dy;
  }
  return a;
}
export function mergeBodies(a: Body, b: Body): Body {
  const mass = a.mass + b.mass, primary = a.mass >= b.mass ? a : b;
  return { ...primary, mass, radius: radiusFor(mass), x: (a.x * a.mass + b.x * b.mass) / mass, y: (a.y * a.mass + b.y * b.mass) / mass,
    vx: (a.vx * a.mass + b.vx * b.mass) / mass, vy: (a.vy * a.mass + b.vy * b.mass) / mass, trail: [], born: 0 };
}
export interface Collision { a: Body; b: Body; result: Body }
export function stepPhysics(bodies: Body[], dt: number, gravity: number, mode: Settings['collision'], onCollision?: (c: Collision) => void): void {
  dt = clamp(valid(dt), 0, 1 / 30); gravity = clamp(valid(gravity, 1), 0, 5);
  if (!dt) return;
  for (const b of bodies) {
    b.mass = clamp(valid(b.mass, 1), .05, 1e9); b.radius = radiusFor(b.mass);
    b.x = clamp(valid(b.x), -1e12, 1e12); b.y = clamp(valid(b.y), -1e12, 1e12); b.vx = clamp(valid(b.vx), -10000, 10000); b.vy = clamp(valid(b.vy), -10000, 10000);
  }
  const a = accelerations(bodies, gravity);
  bodies.forEach((b, i) => { b.vx += a[i * 2] * dt / 2; b.vy += a[i * 2 + 1] * dt / 2; b.x += b.vx * dt; b.y += b.vy * dt; b.born += dt; });
  const next = accelerations(bodies, gravity);
  bodies.forEach((b, i) => { b.vx += next[i * 2] * dt / 2; b.vy += next[i * 2 + 1] * dt / 2; });
  for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
    const b = bodies[i], c = bodies[j], dx = c.x - b.x, dy = c.y - b.y, radius = b.radius + c.radius;
    const dist = Math.hypot(dx, dy);
    if (dist >= radius) continue;
    if (mode === 'merge') {
      const result = mergeBodies(b, c); bodies[i] = result; bodies.splice(j--, 1); onCollision?.({ a: b, b: c, result });
    } else {
      const nx = dist ? dx / dist : 1, ny = dist ? dy / dist : 0, overlap = radius - dist + .01;
      b.x -= nx * overlap * c.mass / (b.mass + c.mass); b.y -= ny * overlap * c.mass / (b.mass + c.mass);
      c.x += nx * overlap * b.mass / (b.mass + c.mass); c.y += ny * overlap * b.mass / (b.mass + c.mass);
      const relative = (c.vx - b.vx) * nx + (c.vy - b.vy) * ny;
      if (relative < 0) { const impulse = -1.92 * relative / (1 / b.mass + 1 / c.mass); b.vx -= impulse * nx / b.mass; b.vy -= impulse * ny / b.mass; c.vx += impulse * nx / c.mass; c.vy += impulse * ny / c.mass; onCollision?.({ a: b, b: c, result: b }); }
    }
  }
}
