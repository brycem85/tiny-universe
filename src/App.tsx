import { useEffect, useRef, useState } from 'react';
import type { BodyType, Scenario, Tool } from './types';
import { Simulation } from './simulation';
import { Input } from './input';
import { clamp, presets } from './physics';
import { render } from './render';
import { scenarioNames } from './scenarios';

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    select: <path d="m5 3 13 8-7 1-3 7z" />, spawn: <><circle cx="12" cy="12" r="7"/><path d="M12 8v8M8 12h8"/></>,
    launch: <><path d="M4 20 20 4M9 4h11v11"/><path d="M4 12v8h8"/></>, delete: <><path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/></>,
    pause: <><path d="M8 5v14M16 5v14" strokeWidth="3"/></>, play: <path d="m8 4 12 8-12 8z"/>, reset: <><path d="M4 10a8 8 0 1 1 1 8M4 3v7h7"/></>,
    fit: <><path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/><circle cx="12" cy="12" r="3"/></>, camera: <><circle cx="12" cy="12" r="6"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/></>,
    orbit: <><ellipse cx="12" cy="12" rx="10" ry="5" transform="rotate(-35 12 12)"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="6" r="2"/></>,
    binary: <><circle cx="7" cy="12" r="4"/><circle cx="17" cy="12" r="4"/><path d="M7 5h10M7 19h10"/></>,
    chaos: <><path d="m3 6 18 12M4 19 20 4M3 12h18"/><circle cx="12" cy="12" r="3"/></>, help: <><circle cx="12" cy="12" r="9"/><path d="M9 8a3 3 0 0 1 6 0c0 3-3 2-3 5M12 16v1"/></>,
    shuffle: <><path d="M3 6h3c5 0 7 12 12 12h3M17 14l4 4-4 4M3 18h3c2 0 4-3 5-6M14 7c1-1 2-1 4-1h3M17 2l4 4-4 4"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.orbit}</svg>;
}
const formatTime = (s: number) => { const tenths = Math.floor(s * 10); return `${String(Math.floor(tenths / 600)).padStart(2, '0')}:${String(Math.floor(tenths / 10) % 60).padStart(2, '0')}.${tenths % 10}`; };
const toolHints: Record<Tool, string> = { select: 'Click to inspect · Drag empty space to pan', spawn: 'Click anywhere to create a body', launch: 'Drag in the direction you want to launch', delete: 'Click a body to remove it' };
export function App() {
  const [sim] = useState(() => new Simulation());
  const canvasRef = useRef<HTMLCanvasElement>(null), inputRef = useRef<Input | null>(null);
  const [snapshot, setSnapshot] = useState(() => sim.snapshot());
  const [tool, setTool] = useState<Tool>('select'), [type, setType] = useState<BodyType>('planet');
  const [mass, setMass] = useState(30), [launchPower, setLaunchPower] = useState(.55), [version, setVersion] = useState(0), [help, setHelp] = useState(false);
  const refresh = () => { setSnapshot(sim.snapshot()); setVersion(v => v + 1); };
  const fit = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    inputRef.current?.cancel();
    if (!sim.bodies.length) { sim.camera = { x: 0, y: 0, zoom: .7 }; return; }
    const minX = Math.min(...sim.bodies.map(b => b.x - b.radius)), maxX = Math.max(...sim.bodies.map(b => b.x + b.radius));
    const minY = Math.min(...sim.bodies.map(b => b.y - b.radius)), maxY = Math.max(...sim.bodies.map(b => b.y + b.radius));
    const usableW = Math.max(200, canvas.clientWidth - (canvas.clientWidth > 1000 ? 530 : 240)), usableH = Math.max(180, canvas.clientHeight - 230);
    sim.camera = { x: (minX + maxX) / 2 - (canvas.clientWidth > 1000 ? 40 : 0), y: (minY + maxY) / 2, zoom: clamp(Math.min(usableW / Math.max(150, maxX - minX), usableH / Math.max(150, maxY - minY)), .025, 3) };
  };
  const load = (scenario: Scenario, random = false) => { inputRef.current?.cancel(); sim.load(scenario, random ? (sim.seed + 7919) >>> 0 : sim.seed); fit(); refresh(); };
  const resetCamera = () => { inputRef.current?.cancel(); sim.camera = { x: -40, y: 0, zoom: Math.min(window.innerWidth / 1750, window.innerHeight / 1200) }; };
  useEffect(() => {
    const canvas = canvasRef.current!, ctx = canvas.getContext('2d')!;
    const input = new Input(canvas, sim, { tool, type, mass, launchPower }, refresh); inputRef.current = input;
    let w = 0, h = 0, dpr = 1, frame = 0, last = performance.now(), lastPublish = last, frames = 0;
    const resize = () => { w = canvas.clientWidth; h = canvas.clientHeight; dpr = Math.min(window.devicePixelRatio || 1, 2); canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); };
    const observer = new ResizeObserver(resize); observer.observe(canvas); resize(); fit();
    const loop = (now: number) => {
      const dt = Math.max(0, (now - last) / 1000); last = now; sim.advance(dt); frames++;
      render(ctx, sim, w, h, dpr, input.hoverId, input.gesture, input.config.launchPower);
      if (now - lastPublish > 180) { sim.fps = Math.round(frames * 1000 / (now - lastPublish)); frames = 0; lastPublish = now; setSnapshot(sim.snapshot()); }
      frame = requestAnimationFrame(loop);
    }; frame = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); input.dispose(); inputRef.current = null; };
    // The mutable simulation and input run outside React's render loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim]);
  useEffect(() => { if (inputRef.current) { inputRef.current.cancel(); inputRef.current.config = { tool, type, mass, launchPower }; } }, [tool, type, mass, launchPower]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement; if (el.matches('input,select,textarea') || el.isContentEditable || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      if (e.code === 'Space') { e.preventDefault(); sim.settings.paused = !sim.settings.paused; refresh(); }
      const tools: Record<string, Tool> = { '1': 'select', '2': 'spawn', '3': 'launch', '4': 'delete' }; if (tools[e.key]) setTool(tools[e.key]);
      if (e.key.toLowerCase() === 'r') load(sim.scenario);
      if (e.key.toLowerCase() === 'f') fit();
      if (e.key === 'Escape') { inputRef.current?.cancel(); sim.selectedId = null; setHelp(false); refresh(); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && sim.selectedId !== null) { e.preventDefault(); sim.remove(sim.selectedId); refresh(); }
    }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  });
  const body = snapshot.selected;
  return <main className="universe" data-version={version}>
    <canvas ref={canvasRef} tabIndex={0} aria-label="Interactive gravity sandbox. Use tools to create and launch bodies. Right drag to pan, wheel to zoom." />
    <div className="grain" aria-hidden="true"/>
    <header className="masthead"><div className="brand-mark"><Icon name="orbit" size={24}/></div><h1>Tiny Universe</h1></header>
    <nav className="experiments" aria-label="Scenario presets"><div className="scenario-tabs">{(['solar', 'binary', 'chaos'] as Scenario[]).map(s => <button key={s} className={sim.scenario === s ? 'active' : ''} onClick={() => load(s)}><Icon name={s === 'solar' ? 'orbit' : s}/><span>{scenarioNames[s]}</span></button>)}</div></nav>
    <aside className="telemetry"><div className="panel-title"><span className={sim.settings.paused ? 'status-dot paused' : 'status-dot'}/>{sim.settings.paused ? 'Simulation paused' : 'Simulation live'}<span className="tiny-plus">+</span></div><dl><div><dt>Active bodies</dt><dd>{snapshot.bodies.toString().padStart(2, '0')}</dd></div><div><dt>System mass</dt><dd>{snapshot.mass.toLocaleString(undefined, { maximumFractionDigits: 1 })}<small> m</small></dd></div><div><dt>Elapsed time</dt><dd>{formatTime(snapshot.elapsed)}</dd></div><div><dt>Frame rate</dt><dd>{snapshot.fps}<small> fps</small></dd></div></dl><div className="telemetry-footer"><span>{scenarioNames[sim.scenario]}</span><span>seed {snapshot.seed}</span></div></aside>
    <aside className="left-controls"><section className="tool-panel"><div className="panel-heading">Tools</div><div className="tool-list">{(['select', 'spawn', 'launch', 'delete'] as Tool[]).map((t, i) => <button key={t} onClick={() => setTool(t)} className={tool === t ? 'active' : ''} aria-pressed={tool === t} title={`${t} (${i + 1})`}><Icon name={t}/><span>{t[0].toUpperCase() + t.slice(1)}</span><kbd>{i + 1}</kbd></button>)}</div><div className="body-config"><label>Body</label><div className="body-types">{(Object.keys(presets) as BodyType[]).map(t => <button key={t} className={type === t ? 'active' : ''} onClick={() => { setType(t); setMass(presets[t].mass); }} aria-pressed={type === t}><span className={`body-swatch ${t}`}/>{presets[t].label}</button>)}</div><label className="range-label" htmlFor="mass">Mass <output>{mass.toLocaleString()} m</output></label><input id="mass" aria-label="Body mass" type="range" min="0" max="100" value={Math.log(mass / .1) / Math.log(100000) * 100} onChange={e => setMass(Math.round(.1 * Math.pow(100000, +e.target.value / 100) * 10) / 10)}/><label className="range-label" htmlFor="power">Launch power <output>{launchPower.toFixed(2)}×</output></label><input id="power" type="range" min="0.1" max="2" step="0.05" value={launchPower} onChange={e => setLaunchPower(+e.target.value)}/></div></section><div className="camera-controls"><button title="Fit all bodies (F)" aria-label="Fit all bodies" onClick={fit}><Icon name="fit"/>Fit all</button><button title="Reset camera" aria-label="Reset camera" onClick={resetCamera}><Icon name="camera"/></button><button title="Keyboard and mouse controls" aria-label="Show controls" onClick={() => setHelp(!help)}><Icon name="help"/></button></div></aside>
    {body && <aside className="inspector"><div className="panel-title">Body inspector<button aria-label="Deselect body" onClick={() => { sim.selectedId = null; refresh(); }}>×</button></div><h2><span style={{ background: body.color }}/>{body.name}</h2><p className="inspector-type">{body.type} / #{body.id.toString().padStart(3, '0')}</p><dl><div><dt>Mass</dt><dd>{body.mass.toFixed(1)} m</dd></div><div><dt>Velocity</dt><dd>{Math.hypot(body.vx, body.vy).toFixed(2)} u/s</dd></div><div><dt>Position</dt><dd>{body.x.toFixed(0)}, {body.y.toFixed(0)}</dd></div><div><dt>Momentum</dt><dd>{(body.mass * Math.hypot(body.vx, body.vy)).toFixed(0)}</dd></div></dl><button className="remove-body" onClick={() => { sim.remove(body.id); refresh(); }}><Icon name="delete" size={14}/>Remove body</button></aside>}
    <section className="experiment-log" aria-label="Experiment log"><div className="log-heading"><span className="micro">Experiment log</span><span className="log-line"/></div>{snapshot.logs.slice(0, 3).map((entry, i) => <div key={entry.id} style={{ opacity: 1 - i * .23 }}><time>{formatTime(entry.time)}</time><span>{entry.text}</span></div>)}</section>
    {sim.scenario === 'chaos' && <div className="scenario-caption"><button className="randomize" onClick={() => load('chaos', true)}><Icon name="shuffle" size={14}/>Randomize seed</button></div>}
    <div className="interaction-hint"><span className="hint-cross">+</span>{toolHints[tool]}</div>
    <footer className="transport"><button className="play-button" aria-label={sim.settings.paused ? 'Play simulation' : 'Pause simulation'} onClick={() => { sim.settings.paused = !sim.settings.paused; refresh(); }}><Icon name={sim.settings.paused ? 'play' : 'pause'} size={17}/><span>{sim.settings.paused ? 'Resume' : 'Pause'}</span><kbd>space</kbd></button><div className="control-block speed-block"><label htmlFor="speed">Time</label><select id="speed" value={sim.settings.speed} onChange={e => { sim.settings.speed = +e.target.value; refresh(); }}>{[.25, .5, 1, 2, 4].map(v => <option key={v} value={v}>{v}×</option>)}</select></div><div className="control-block gravity-block"><label htmlFor="gravity">Gravity <output>{sim.settings.gravity.toFixed(1)}×</output></label><input id="gravity" type="range" min="0" max="3" step="0.1" value={sim.settings.gravity} onChange={e => { sim.settings.gravity = +e.target.value; refresh(); }}/></div><div className="control-block trails-block"><button className={`toggle-label ${sim.settings.trails ? 'on' : ''}`} aria-pressed={sim.settings.trails} onClick={() => { sim.settings.trails = !sim.settings.trails; refresh(); }}><span>Trails</span><span className="switch"/></button><select aria-label="Trail length" value={sim.settings.trailLength} onChange={e => { sim.settings.trailLength = +e.target.value; refresh(); }}><option value={80}>Short</option><option value={220}>Medium</option><option value={500}>Long</option></select></div><div className="control-block collision-block"><label htmlFor="collision">Collisions</label><select id="collision" value={sim.settings.collision} onChange={e => { sim.settings.collision = e.target.value as 'merge' | 'bounce'; refresh(); }}><option value="merge">Merge</option><option value="bounce">Bounce</option></select></div><div className="transport-actions"><button onClick={() => load(sim.scenario)} title="Reset current scenario (R)"><Icon name="reset" size={16}/><span>Reset</span></button><button className="clear-button" onClick={() => { inputRef.current?.cancel(); sim.clear(); refresh(); }}>Clear all</button></div></footer>
    {help && <div className="help-panel" role="dialog" aria-label="Controls"><div className="panel-title">Controls<button aria-label="Close help" onClick={() => setHelp(false)}>×</button></div><dl><div><dt>Select / Spawn / Launch / Delete</dt><dd>1 / 2 / 3 / 4</dd></div><div><dt>Pause / Resume</dt><dd>Space</dd></div><div><dt>Reset / Fit all</dt><dd>R / F</dd></div><div><dt>Cancel / Deselect</dt><dd>Esc</dd></div><div><dt>Pan in any tool</dt><dd>Right drag / Alt drag</dd></div><div><dt>Zoom toward cursor</dt><dd>Scroll</dd></div></dl><p className="help-foot">Drag to set launch direction and speed. Increase mass for a stronger gravitational pull.</p></div>}
  </main>;
}
