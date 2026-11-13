import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Input } from '../src/input';
import { Simulation } from '../src/simulation';
import { toScreen, toWorld } from '../src/render';
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
function harness() {
  const canvas = { clientWidth: 1200, clientHeight: 800, style: { cursor: '' }, addEventListener() {}, removeEventListener() {}, focus() {}, setPointerCapture() {}, getBoundingClientRect: () => ({ left: 0, top: 0 }) } as unknown as HTMLCanvasElement;
  const sim = new Simulation(); sim.clear(); sim.camera = { x: 0, y: 0, zoom: 1 }; sim.settings.paused = true;
  const input = new Input(canvas, sim, { tool: 'spawn', type: 'planet', mass: 30, launchPower: .5 }, () => {});
  const pointer = (x: number, y: number, button = 0) => ({ clientX: x, clientY: y, button, pointerId: 1, preventDefault() {}, altKey: false }) as PointerEvent;
  return { input, sim, pointer };
}
test('world and screen coordinate transforms are inverses', () => {
  const camera = { x: 123, y: -56, zoom: 2.4 }, world = { x: -200, y: 340 };
  const recovered = toWorld(toScreen(world, camera, 1200, 800), camera, 1200, 800); near(world.x, recovered.x); near(world.y, recovered.y);
});
test('spawn, select and delete act on the intended body', () => {
  const { input, sim, pointer } = harness(); input.down(pointer(650, 400)); input.up(pointer(650, 400)); assert.equal(sim.bodies.length, 1); near(sim.bodies[0].x, 50);
  input.config.tool = 'select'; sim.selectedId = null; input.down(pointer(650, 400)); input.up(pointer(650, 400)); assert.equal(sim.selectedId, sim.bodies[0].id);
  input.config.tool = 'delete'; input.down(pointer(650, 400)); input.up(pointer(650, 400)); assert.equal(sim.bodies.length, 0);
});
test('drag launch velocity points along the visible arrow', () => {
  const { input, sim, pointer } = harness(); input.config.tool = 'launch'; input.down(pointer(600, 400)); input.move(pointer(800, 300)); input.up(pointer(800, 300));
  assert.equal(sim.bodies.length, 1); near(sim.bodies[0].vx, 100); near(sim.bodies[0].vy, -50); near(sim.bodies[0].x, 0); near(sim.bodies[0].y, 0);
});
test('right-drag pans in spawn tool without creating a body', () => {
  const { input, sim, pointer } = harness(); input.down(pointer(600, 400, 2)); input.move(pointer(700, 440, 2)); input.up(pointer(700, 440, 2));
  assert.equal(sim.bodies.length, 0); near(sim.camera.x, -100); near(sim.camera.y, -40);
});
test('dragging empty space with Select pans without creating or selecting', () => {
  const { input, sim, pointer } = harness(); input.config.tool = 'select'; input.down(pointer(600, 400)); input.move(pointer(680, 400)); input.up(pointer(680, 400));
  near(sim.camera.x, -80); assert.equal(sim.bodies.length, 0); assert.equal(sim.selectedId, null);
});
test('wheel zoom preserves the world position beneath the cursor', () => {
  const { input, sim } = harness(); const point = { x: 800, y: 500 }, before = input.world(point);
  input.wheel({ clientX: point.x, clientY: point.y, deltaY: -300, preventDefault() {} } as WheelEvent);
  const after = input.world(point); near(before.x, after.x); near(before.y, after.y); assert.ok(sim.camera.zoom > 1);
});
test('cancelling a launch creates nothing', () => {
  const { input, sim, pointer } = harness(); input.config.tool = 'launch'; input.down(pointer(600, 400)); input.move(pointer(800, 300)); input.cancel(); input.up(pointer(800, 300)); assert.equal(sim.bodies.length, 0);
});
test('extreme launch speed cap preserves arrow direction', () => {
  const { input, sim, pointer } = harness(); sim.camera.zoom = .025; input.config.tool = 'launch'; input.config.launchPower = 2;
  input.down(pointer(600, 400)); input.move(pointer(1000, 200)); input.up(pointer(1000, 200));
  const body = sim.bodies[0]; near(Math.hypot(body.vx, body.vy), 10000); near(body.vx / body.vy, -2);
});
