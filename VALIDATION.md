# Verification record

## Completed

- **22 automated tests passed** using Node's test runner with `tsx` (`node --import tsx --test tests/*.test.ts`). The normal package script is `pnpm test` or `npm test`.
- Tests cover attraction; isolated momentum conservation over 10,000 steps; a bounded circular orbit for 500 simulated seconds; merged mass, momentum, volume and center of mass; actual collision detection and merging; bounce separation and momentum; pause; every playback speed; display-refresh independence; invalid numerical inputs; deterministic reset and seeds; preset stability; bounded trails, effects, logs and body count.
- Input tests exercise the actual input controller with a lightweight canvas harness: spawn, select, delete, launch arrow direction (including speed-capped extreme launches), pointer cancellation, pan without spawning, empty-space panning, coordinate inversion, and cursor-centered zoom.
- **Production build passed**: TypeScript compilation plus Vite's production bundler. Approximately 250 kB JavaScript (79 kB gzip) and 14 kB CSS (4 kB gzip).
- Extended orbital diagnostic: Solar System and Binary Stars retained every body for **300 simulated seconds** after tuning their initial conditions. The isolated circular-orbit test runs for 500 seconds.
- Physics-only performance diagnostic: **200 interacting bodies**, 1,200 measured steps after warmup, approximately **0.37 ms per fixed step** on this computer. This measures physics, not complete browser rendering or input latency. It does not establish an end-to-end 60 FPS result.
- Vite started successfully on loopback. A server smoke check against `http://127.0.0.1:5174/` returned **HTTP 200** for the page and all eight requested source modules/stylesheets, with successful Vite transforms. The temporary QA servers were stopped afterward. The Windows launcher starts a fresh server and opens its URL.

## Browser verification limitation

No screenshot or successful browser interaction was obtained. The computer-use tool stopped because it could not confidently determine the current browser URL on Windows. Visual appearance, clipping at particular resolutions, rendered particle effects, and full browser interaction flows therefore remain **unverified**. Automated input tests and source/build checks do not substitute for those checks.

## Reproduce

```sh
node --import tsx --test tests/*.test.ts
node --import tsx scripts/diagnostics.ts
node node_modules/typescript/bin/tsc -b
node node_modules/vite/bin/vite.js build
```

For local HTTP/module checks, run the dev server in one terminal and `node scripts/smoke.mjs` in another. This checks serving and Vite transforms, not browser execution.

The first stability test exposed an unintended early collision between starter planets. The delivered preset uses lower planet-to-star mass ratios and passes the final stability checks. Binary planets start outside the strongest unstable region around the two stars.
