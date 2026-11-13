import { test } from 'node:test';
import assert from 'node:assert/strict';
import { G, STEP, makeBody, mergeBodies, radiusFor, stepPhysics } from '../src/physics';
import { Simulation } from '../src/simulation';
import { createScenario } from '../src/scenarios';
const near = (a: number, b: number, tolerance = 1e-7) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);
test('two bodies accelerate toward each other', () => {
  const bodies = [makeBody(1, 'planet', -100, 0), makeBody(2, 'planet', 100, 0)];
  stepPhysics(bodies, STEP, 1, 'merge'); assert.ok(bodies[0].vx > 0); assert.ok(bodies[1].vx < 0);
});
test('isolated two-body momentum stays conserved for 10,000 steps', () => {
  const bodies = [makeBody(1, 'planet', -150, 0, 30, 0, -4), makeBody(2, 'planet', 150, 0, 60, 0, 2)];
  for (let i = 0; i < 10000; i++) stepPhysics(bodies, STEP, 1, 'bounce');
  near(bodies.reduce((s, b) => s + b.mass * b.vx, 0), 0); near(bodies.reduce((s, b) => s + b.mass * b.vy, 0), 0);
});
test('circular orbit remains bounded over 500 simulated seconds', () => {
  const mass = 4000, r = 250, v = Math.sqrt(G * mass / r), bodies = [makeBody(1, 'star', 0, 0, mass), makeBody(2, 'planet', r, 0, 1, 0, v)];
  let min = Infinity, max = 0;
  for (let i = 0; i < 60000; i++) { stepPhysics(bodies, STEP, 1, 'merge'); const d = Math.hypot(bodies[1].x - bodies[0].x, bodies[1].y - bodies[0].y); min = Math.min(min, d); max = Math.max(max, d); }
  assert.ok(min > r * .98 && max < r * 1.02, `range ${min}–${max}`);
});
test('merge conserves mass, linear momentum, center of mass and volume', () => {
  const a = makeBody(1, 'planet', -3, 2, 20, 8, -2), b = makeBody(2, 'planet', 6, 4, 40, -3, 6), merged = mergeBodies(a, b);
  near(merged.mass, 60); near(merged.vx * 60, 40); near(merged.vy * 60, 200); near(merged.x, 3); near(merged.y, 10 / 3); near(merged.radius, radiusFor(60));
  near(merged.radius ** 3, a.radius ** 3 + b.radius ** 3);
});
test('overlapping bodies actually merge during a step', () => {
  const bodies = [makeBody(1, 'planet', 0, 0, 30, 2), makeBody(2, 'planet', 1, 0, 50, -1)];
  stepPhysics(bodies, STEP, 0, 'merge'); assert.equal(bodies.length, 1); near(bodies[0].mass, 80); near(bodies[0].vx, .125);
});
test('bounce separates bodies and conserves momentum', () => {
  const bodies = [makeBody(1, 'planet', -5, 0, 10, 2), makeBody(2, 'planet', 5, 0, 20, -1)];
  stepPhysics(bodies, STEP, 0, 'bounce'); assert.equal(bodies.length, 2); assert.ok(bodies[0].vx < 0); near(bodies[0].mass * bodies[0].vx + bodies[1].mass * bodies[1].vx, 0);
});
test('pause prevents time, positions and velocities advancing', () => {
  const sim = new Simulation(); sim.settings.paused = true; const before = JSON.stringify(sim.bodies);
  for (let i = 0; i < 120; i++) sim.advance(1 / 60);
  assert.equal(sim.elapsed, 0); assert.equal(JSON.stringify(sim.bodies), before);
});
test('all playback speeds scale elapsed time without changing fixed timestep', () => {
  for (const speed of [.25, .5, 1, 2, 4]) { const sim = new Simulation(); sim.settings.speed = speed; for (let i = 0; i < 120; i++) sim.advance(1 / 60); near(sim.elapsed, 2 * speed, STEP + 1e-8); }
});
test('physics is independent of display refresh rate', () => {
  const a = new Simulation(), b = new Simulation(); for (let i = 0; i < 120; i++) a.advance(1 / 60); for (let i = 0; i < 288; i++) b.advance(1 / 144);
  near(a.elapsed, b.elapsed, STEP + 1e-8); assert.ok(Math.abs(a.bodies[1].x - b.bodies[1].x) < 1);
});
test('invalid parameters cannot propagate NaN or Infinity', () => {
  const bodies = [makeBody(1, 'star', NaN, Infinity, -7, NaN, Infinity), makeBody(2, 'planet', 100, 0)];
  bodies[0].mass = NaN; bodies[1].vx = Infinity;
  for (let i = 0; i < 500; i++) stepPhysics(bodies, STEP, NaN, 'merge');
  stepPhysics(bodies, Infinity, Infinity, 'merge');
  for (const b of bodies) for (const n of [b.x, b.y, b.vx, b.vy, b.mass, b.radius]) assert.ok(Number.isFinite(n));
});
test('reset restores identical state, unique IDs and seed', () => {
  for (const scenario of ['solar', 'binary', 'chaos'] as const) { const sim = new Simulation(); sim.load(scenario, 123); const before = JSON.stringify(sim.bodies); sim.advance(.1); sim.spawn('planet', 0, 0, 30); sim.load(scenario, 123); assert.equal(JSON.stringify(sim.bodies), before); assert.equal(sim.elapsed, 0); assert.equal(new Set(sim.bodies.map(b => b.id)).size, sim.bodies.length); }
});
test('chaos is deterministic and different seeds yield different systems', () => {
  assert.deepEqual(createScenario('chaos', 42), createScenario('chaos', 42)); assert.notDeepEqual(createScenario('chaos', 42), createScenario('chaos', 43));
});
test('solar and binary systems retain all bodies for 120 seconds', () => {
  for (const scenario of ['solar', 'binary'] as const) { const bodies = createScenario(scenario); const count = bodies.length; for (let i = 0; i < 14400; i++) stepPhysics(bodies, STEP, 1, 'merge'); assert.equal(bodies.length, count); assert.ok(bodies.every(b => Math.hypot(b.x, b.y) < 1200)); }
});
test('trails, effects, logs and user-created bodies have bounded memory', () => {
  const sim = new Simulation(); sim.settings.trailLength = 20; for (let i = 0; i < 1000; i++) sim.advance(1 / 60); assert.ok(sim.bodies.every(b => b.trail.length <= 20));
  for (let i = 0; i < 700; i++) sim.spawn('dust', i * 10, 3000, .2); assert.equal(sim.bodies.length, 500); assert.ok(sim.logs.length <= 6); assert.ok(sim.particles.length <= 2200);
});
