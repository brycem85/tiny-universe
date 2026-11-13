# Tiny Universe

A local, full-screen gravity toy built with React, TypeScript, Vite, and Canvas 2D. Create worlds, send them into orbit, and watch them collide. No accounts, backend, paid APIs, downloaded fonts, or remote assets.

## Launch

**On this Windows computer, double-click `Start Tiny Universe.cmd`.** It opens your browser and keeps the local server running. Close its terminal when finished.

Dependencies are already installed in the delivered workspace. You can also launch immediately, without a package-manager command:

```sh
node node_modules/vite/bin/vite.js --host 127.0.0.1
```

For a fresh installation, requires Node.js 22.12+ (or 24+) and npm or pnpm. From this directory:

```sh
npm install
npm run dev
```

Open the Local URL printed by Vite (normally http://127.0.0.1:5173). Keep the terminal running. With pnpm, use `pnpm install` then `pnpm dev` instead. Dependencies are already installed in the delivered workspace.

```sh
npm test
npm run build
npm run preview
```

The production output is in `dist/`. Preview serves it at http://127.0.0.1:4173. After installation, everything runs offline. The included pnpm lockfile pins the delivered dependency versions; use `pnpm install --frozen-lockfile` for reproducible installs.

## Your first five minutes

1. Watch Solar System. Scroll toward a planet to zoom; select it to inspect its real mass, velocity, position, and momentum.
2. Press **3**, choose Asteroid, and drag tangentially beside the star. Release to launch **in the arrow's direction**. Longer drags and higher launch power give more speed.
3. Try Binary Stars, then introduce a planet. Fit all with **F** if an encounter sends something far away.
4. Load Chaos and change between Merge and Bounce. Randomize gives a new reproducible seed; Reset reconstructs the current seed.
5. Clear all and build your own system. Place a star, then launch a planet sideways nearby. Pause while arranging bodies.

## Controls

| Action | Control |
| --- | --- |
| Select / Spawn / Launch / Delete | 1 / 2 / 3 / 4, or left palette |
| Pause / resume | Space |
| Reset current scenario and seed | R |
| Fit every body | F |
| Cancel launch / deselect / close guide | Escape |
| Delete selected body | Delete / Backspace, or inspector |
| Pan in every tool | Right drag, middle drag, or Alt + drag |
| Pan in Select | Drag empty space |
| Zoom toward cursor | Mouse wheel |

Shortcuts leave focused form controls alone. The small question-mark button opens the field guide. Choose body type, mass, and launch power in the palette; settings apply to subsequent bodies. Reset retains playback and physics preferences. The default presets are balanced for gravity 1×. Simulation seconds and masses are simplified game units.

## Main files

- `src/physics.ts` — pairwise softened inverse-square gravity, velocity Verlet integration, merge and bounce collisions, validation.
- `src/scenarios.ts` — calculated orbital initial conditions, seeded Chaos, center-of-momentum normalization.
- `src/simulation.ts` — fixed 1/120-second stepping, 48-step frame cap, lifecycle, trails, effects, event log, real telemetry.
- `src/render.ts` — DPR-aware canvas, world/screen transforms, shaded bodies, star glow, trails, particles, launch arrow.
- `src/input.ts` — pointer capture, selection, creation, launch, deletion, cursor-centered zoom, camera panning.
- `src/App.tsx` and `src/style.css` — compact instrument UI, controls, inspector, shortcuts, responsive layout. React receives telemetry around five times per second rather than every physics frame.
- `tests/` — physics, lifecycle, scenarios, bounds, and input/coordinate tests.

## Limits and tradeoffs

Direct gravity is O(n²); creation is capped at 500 bodies, with 200 the normal performance target. Physics uses the same fixed step at all speeds. Long frames are capped at 0.1 wall seconds and 48 substeps: on an overloaded computer or background tab, simulated time slows rather than making a numerically dangerous leap. Bounce uses a restitution of 0.92. Large single-step overlaps can merge rather than model fragmentation, and extremely fast tiny bodies can pass through each other because collision detection is discrete.

Gravity softening is 4 world units. Body volume scales with mass at a shared simplified density. There are safety limits on mass, positions, and velocity for extreme inputs. Trails (maximum 600 samples/body), particles (2,200), and logs (6) are bounded. Background stars are decorative; telemetry counts simulated bodies only.

Experiments live in memory and reset on page reload. Desktop mouse controls are the primary target; there is no multitouch pinch navigation. Browser visual verification may be limited by the available computer-use tools; see `VALIDATION.md` for the checks actually completed.

## Next experiments

1. Save and share complete systems as local JSON files.
2. Follow a selected body with an optional predicted trajectory.
3. Add collision fragmentation and a profiled Barnes–Hut path for much larger systems.
