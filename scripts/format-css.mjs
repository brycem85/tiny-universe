// Dependency-free formatting for this stylesheet (no block comments or nested declarations).
import { readFileSync, writeFileSync } from 'node:fs';
const path = new URL('../src/style.css', import.meta.url);
const css = readFileSync(path, 'utf8');
let output = '', depth = 0, quote = '', parens = 0;
for (let i = 0; i < css.length; i++) {
  const c = css[i];
  if (quote) { output += c; if (c === quote && css[i - 1] !== '\\') quote = ''; continue; }
  if (c === '"' || c === "'") { quote = c; output += c; continue; }
  if (c === '(') parens++;
  if (c === ')') parens--;
  if (parens) { output += c; continue; }
  if (c === '{') { output = output.trimEnd() + ' {\n' + '  '.repeat(++depth); }
  else if (c === ';') { output = output.trimEnd() + ';\n' + '  '.repeat(depth); }
  else if (c === '}') { depth--; output = output.trimEnd() + '\n' + '  '.repeat(depth) + '}\n' + '  '.repeat(depth); }
  else if (c === '\n' || c === '\r') continue;
  else output += c;
}
writeFileSync(path, output.trim() + '\n');
