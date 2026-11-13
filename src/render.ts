import { seeded } from './scenarios';
import { MAX_SPEED } from './physics';
import type { Body, Camera, Vec } from './types';
import type { Simulation } from './simulation';
export interface Gesture { kind: 'pan' | 'launch' | 'click'; start: Vec; current: Vec; world: Vec; camera: Vec; pointerId: number }
const random = seeded(9127);
const stars = Array.from({ length: 850 }, () => ({ x: random(), y: random(), size: .3 + random() * 1.1, alpha: .12 + random() * .48, depth: .1 + random() * .3 }));
export const toWorld = (p: Vec, c: Camera, w: number, h: number): Vec => ({ x: (p.x - w / 2) / c.zoom + c.x, y: (p.y - h / 2) / c.zoom + c.y });
export const toScreen = (p: Vec, c: Camera, w: number, h: number): Vec => ({ x: (p.x - c.x) * c.zoom + w / 2, y: (p.y - c.y) * c.zoom + h / 2 });
export function hitTest(sim: Simulation, point: Vec): Body | undefined {
  let found: Body | undefined, distance = Infinity;
  for (const b of sim.bodies) { const d = Math.hypot(b.x - point.x, b.y - point.y); if (d < Math.max(b.radius, 11 / sim.camera.zoom) && d < distance) { found = b; distance = d; } } return found;
}
export function render(ctx: CanvasRenderingContext2D, sim: Simulation, w: number, h: number, dpr: number, hoverId: number | null, gesture: Gesture | null, launchPower: number) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#060910'; ctx.fillRect(0, 0, w, h);
  const nebula = ctx.createRadialGradient(w * .53, h * .48, 0, w * .53, h * .48, w * .55);
  nebula.addColorStop(0, '#101527'); nebula.addColorStop(.45, '#0b1020'); nebula.addColorStop(1, '#060910'); ctx.fillStyle = nebula; ctx.fillRect(0, 0, w, h);
  for (const star of stars) {
    const x = ((star.x * w - sim.camera.x * star.depth * .08) % w + w) % w;
    const y = ((star.y * h - sim.camera.y * star.depth * .08) % h + h) % h;
    ctx.globalAlpha = star.alpha; ctx.fillStyle = '#c1ccdf'; ctx.fillRect(x, y, star.size, star.size);
  } ctx.globalAlpha = 1;
  const c = sim.camera;
  // Subordinate cartographic references stay in world coordinates.
  const origin = toScreen({ x: 0, y: 0 }, c, w, h);
  ctx.strokeStyle = '#8da8c10b'; ctx.lineWidth = 1;
  for (const radius of [115, 205, 305, 425, 565]) { ctx.beginPath(); ctx.arc(origin.x, origin.y, radius * c.zoom, 0, Math.PI * 2); ctx.stroke(); }
  ctx.strokeStyle = '#a5c8da20'; ctx.beginPath(); ctx.moveTo(origin.x - 6, origin.y); ctx.lineTo(origin.x + 6, origin.y); ctx.moveTo(origin.x, origin.y - 6); ctx.lineTo(origin.x, origin.y + 6); ctx.stroke();
  if (sim.settings.trails) for (const b of sim.bodies) {
    if (b.trail.length < 2) continue;
    // A few long strokes are cheaper than a draw call for every trail segment.
    for (let part = 0; part < 4; part++) {
      ctx.beginPath(); ctx.strokeStyle = b.color; ctx.globalAlpha = .045 + part * .07; ctx.lineWidth = b.type === 'star' ? 1.2 : 1;
      const from = Math.floor(part * (b.trail.length - 1) / 4), to = Math.ceil((part + 1) * (b.trail.length - 1) / 4);
      for (let i = from; i <= to; i++) { const p = toScreen(b.trail[i], c, w, h); if (i === from) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); } ctx.stroke();
    }
  } ctx.globalAlpha = 1;
  for (const p of sim.particles) {
    const pos = toScreen(p, c, w, h); ctx.globalAlpha = p.life / p.maxLife; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(pos.x, pos.y, Math.max(.5, p.size * c.zoom), 0, Math.PI * 2); ctx.fill();
  } ctx.globalAlpha = 1;
  for (const b of [...sim.bodies].sort((a, b) => Number(a.type === 'star') - Number(b.type === 'star'))) {
    const p = toScreen(b, c, w, h), r = Math.max(b.type === 'dust' ? 1 : 1.7, b.radius * c.zoom);
    if (p.x + r * 6 < 0 || p.y + r * 6 < 0 || p.x - r * 6 > w || p.y - r * 6 > h) continue;
    if (b.type === 'star') {
      const glow = ctx.createRadialGradient(p.x, p.y, r * .1, p.x, p.y, r * 6);
      glow.addColorStop(0, b.color + '60'); glow.addColorStop(.25, b.color + '23'); glow.addColorStop(1, b.color + '00');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(p.x, p.y, r * 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = b.color + '22'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p.x, p.y, r * 1.6, 0, Math.PI * 2); ctx.stroke();
    }
    if (r > 2.5) {
      const g = ctx.createRadialGradient(p.x - r * .35, p.y - r * .35, 0, p.x, p.y, r);
      g.addColorStop(0, b.type === 'star' ? '#fff4d9' : '#e2e9e8'); g.addColorStop(.24, b.color); g.addColorStop(1, b.type === 'star' ? '#e79c53' : '#1e2b3c'); ctx.fillStyle = g;
    } else ctx.fillStyle = b.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    if (b.born < .6 && !sim.settings.paused) { ctx.strokeStyle = b.color + '55'; ctx.beginPath(); ctx.arc(p.x, p.y, r + b.born * 25, 0, Math.PI * 2); ctx.stroke(); }
    const selected = b.id === sim.selectedId, hovered = b.id === hoverId;
    if (selected || hovered) {
      ctx.strokeStyle = selected ? '#a1e8e1' : '#a1e8e177'; ctx.lineWidth = 1; ctx.setLineDash(selected ? [4, 5] : []); ctx.beginPath(); ctx.arc(p.x, p.y, r + 7, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
    if ((b.type === 'star' || selected || hovered) && c.zoom > .18) {
      ctx.font = '10px Consolas, monospace'; ctx.fillStyle = b.type === 'star' ? '#cbb293' : '#b2c8d4'; ctx.fillText(b.name, p.x + r + 12, p.y - 4);
      if (b.type === 'star') { ctx.fillStyle = '#67717e'; ctx.font = '9px Consolas, monospace'; ctx.fillText(`${Math.round(b.mass).toLocaleString()} m`, p.x + r + 12, p.y + 10); }
    }
  }
  if (gesture?.kind === 'launch') {
    const a = toScreen(gesture.world, c, w, h), b = gesture.current, angle = Math.atan2(b.y - a.y, b.x - a.x);
    ctx.strokeStyle = '#a2e9e2'; ctx.fillStyle = '#a2e9e2'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - 12 * Math.cos(angle - .4), b.y - 12 * Math.sin(angle - .4)); ctx.lineTo(b.x - 12 * Math.cos(angle + .4), b.y - 12 * Math.sin(angle + .4)); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(a.x, a.y, 6, 0, Math.PI * 2); ctx.stroke(); ctx.font = '11px Consolas, monospace'; ctx.fillText(`${Math.min(MAX_SPEED, Math.hypot(b.x - a.x, b.y - a.y) / c.zoom * launchPower).toFixed(0)} u/s`, b.x + 12, b.y - 12);
  }
  const scale = Math.pow(10, Math.floor(Math.log10(120 / c.zoom))), pixels = scale * c.zoom;
  ctx.strokeStyle = '#718596'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(w - 40 - pixels, h - 108); ctx.lineTo(w - 40, h - 108); ctx.moveTo(w - 40 - pixels, h - 112); ctx.lineTo(w - 40 - pixels, h - 104); ctx.moveTo(w - 40, h - 112); ctx.lineTo(w - 40, h - 104); ctx.stroke();
  ctx.font = '10px Consolas, monospace'; ctx.textAlign = 'right'; ctx.fillStyle = '#7b8d9d'; ctx.fillText(`${scale} u`, w - 40, h - 119); ctx.textAlign = 'left';
}
