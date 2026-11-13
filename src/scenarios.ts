import { G, makeBody } from './physics';
import type { Body, Scenario } from './types';
export const scenarioNames: Record<Scenario, string> = { solar: 'Solar System', binary: 'Binary Stars', chaos: 'Chaos' };
export function seeded(seed: number) { let n = seed >>> 0; return () => { n += 0x6D2B79F5; let t = Math.imul(n ^ n >>> 15, 1 | n); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function createScenario(scenario: Scenario, seed = 4271): Body[] {
  const bodies: Body[] = []; let id = 1;
  if (scenario === 'solar') {
    const star = makeBody(id++, 'star', 0, 0, 9000, 0, 0, 'Sol'); bodies.push(star);
    const colors = ['#c6a28c', '#80cbd0', '#9d9bcf', '#d0a278', '#739cae'];
    [115, 205, 305, 425, 565].forEach((r, i) => {
      const angle = [-1.9, .35, 2.5, -2.65, 1.2][i], m = [2, 4, 5, 8, 4][i];
      const v = Math.sqrt(G * star.mass * r * r / Math.pow(r * r + 16, 1.5));
      const b = makeBody(id++, 'planet', Math.cos(angle) * r, Math.sin(angle) * r, m, -Math.sin(angle) * v, Math.cos(angle) * v, ['Cinder', 'Pelagic', 'Vesper', 'Aurelia', 'Drift'][i]);
      b.color = colors[i]; bodies.push(b);
    });
  } else if (scenario === 'binary') {
    const m = 2400, r = 110, v = Math.sqrt(G * m / (4 * r));
    bodies.push(makeBody(id++, 'star', -r, 0, m, 0, -v, 'Castor'), makeBody(id++, 'star', r, 0, m, 0, v, 'Pollux'));
    bodies[1].color = '#b5ceff';
    [580, 780].forEach((r, i) => bodies.push(makeBody(id++, 'planet', 0, r, 6 + i * 4, -Math.sqrt(G * m * 2 / r), 0, ['Echo', 'Wanderer'][i])));
  } else {
    const random = seeded(seed); bodies.push(makeBody(id++, 'star', 0, 0, 1800, 0, 0, 'Nucleus'));
    for (let i = 0; i < 75; i++) {
      const angle = random() * Math.PI * 2, r = 90 + random() * 440, mass = .5 + random() ** 3 * 45;
      const v = Math.sqrt(G * 1800 / r) * (.3 + random() * .9), scatter = (random() - .5) * 20;
      const b = makeBody(id++, mass > 15 ? 'planet' : 'asteroid', Math.cos(angle) * r, Math.sin(angle) * r, mass, -Math.sin(angle) * v + scatter, Math.cos(angle) * v + scatter);
      b.color = ['#94b8c7', '#c79f8a', '#aaa0d4', '#8cbaa9'][i % 4]; bodies.push(b);
    }
  }
  // Put the complete system into its center-of-momentum frame.
  const mass = bodies.reduce((s, b) => s + b.mass, 0), vx = bodies.reduce((s, b) => s + b.vx * b.mass, 0) / mass, vy = bodies.reduce((s, b) => s + b.vy * b.mass, 0) / mass;
  bodies.forEach(b => { b.vx -= vx; b.vy -= vy; }); return bodies;
}
