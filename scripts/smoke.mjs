const base = process.argv[2] ?? 'http://127.0.0.1:5173';
const routes = ['/', '/src/main.tsx', '/src/App.tsx', '/src/style.css', '/src/physics.ts', '/src/simulation.ts', '/src/render.ts', '/src/input.ts', '/src/scenarios.ts'];
for (const route of routes) {
  const response = await fetch(new URL(route, base));
  const text = await response.text();
  if (!response.ok || text.includes('Internal Server Error')) throw new Error(`${route}: ${response.status}`);
  console.log(`${response.status} ${route} (${text.length} characters)`);
}
console.log('Local server and source-module transform smoke check passed. This is not a browser runtime test.');
