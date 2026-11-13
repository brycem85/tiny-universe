import { performance } from 'node:perf_hooks';
import { STEP, makeBody, stepPhysics } from '../src/physics';
import { createScenario, seeded } from '../src/scenarios';
for (const scenario of ['solar', 'binary'] as const) {
  const bodies = createScenario(scenario);
  for (let i = 0; i < 36000; i++) stepPhysics(bodies, STEP, 1, 'merge', c => console.log(`${scenario} at ${(i * STEP).toFixed(2)}s: ${c.a.name} + ${c.b.name}`));
  console.log(scenario, bodies.map(b => ({ name: b.name, distance: Math.round(Math.hypot(b.x, b.y)) })));
}
const random = seeded(5), bodies = Array.from({ length: 200 }, (_, i) => makeBody(i, 'asteroid', (random() - .5) * 20000, (random() - .5) * 20000, 3));
for (let i = 0; i < 100; i++) stepPhysics(bodies, STEP, 1, 'merge');
const start = performance.now(); for (let i = 0; i < 1200; i++) stepPhysics(bodies, STEP, 1, 'merge');
console.log(JSON.stringify({ interactingBodies: bodies.length, steps: 1200, averageStepMs: (performance.now() - start) / 1200 }));
