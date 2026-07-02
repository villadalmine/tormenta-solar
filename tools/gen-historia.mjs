// gen-historia.mjs — ENSAMBLA el grafo de historia desde las fichas SDD.
// Lee los bloques ```hist (JSON) de specs/nivel-1/**/*.md y escribe js/historia.js (vista compilada).
// Ver specs/nivel-1/historia-grafo.md. Uso:  node tools/gen-historia.mjs
//
// Cada arista (un bloque ```hist) declara: id, title, at (lugar), pre (flags/ítems requeridos),
// sets (flags que cambia), terminal?, hints {es:[...], en:[...]} (por nivel de spoiler 0..3).
// Capa ADITIVA: el juego anda sin esto. Fase 1 = el grafo SOLO DESCRIBE (no maneja los flags).
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
// solo las FICHAS (personajes/ + edificios/); el spec historia-grafo.md tiene bloques de EJEMPLO, no reales.
const FICHA_DIRS = [path.join(ROOT, 'specs', 'nivel-1', 'personajes'), path.join(ROOT, 'specs', 'nivel-1', 'edificios'), path.join(ROOT, 'specs', 'nivel-1', 'lugares')];
const OUT = path.join(ROOT, 'js', 'historia.js');

// junta todos los .md bajo specs/nivel-1 (recursivo)
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith('.md')) out.push(p);
  }
  return out;
}

const edges = [];
const errors = [];
const seen = new Map();   // id → archivo (para detectar duplicados)

for (const file of FICHA_DIRS.flatMap(walk)) {
  const txt = readFileSync(file, 'utf8');
  const rel = path.relative(ROOT, file);
  const re = /```hist\s+([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(txt))) {
    let e;
    try { e = JSON.parse(m[1]); }
    catch (err) { errors.push(`${rel}: bloque hist no es JSON valido (${err.message})`); continue; }
    if (!e.id) { errors.push(`${rel}: arista sin "id"`); continue; }
    if (seen.has(e.id)) { errors.push(`id duplicado "${e.id}" (${rel} y ${seen.get(e.id)})`); continue; }
    seen.set(e.id, rel);
    e.from = rel;                 // de qué ficha salió (trazabilidad)
    edges.push(e);
  }
}

// ---- validación del grafo ----
// (a) todo flag que una arista pone en `sets` debería ser precondición de otra, o ser terminal
const setFlags = new Set();
const preFlags = new Set();
for (const e of edges) {
  Object.keys(e.sets || {}).forEach(f => setFlags.add(f));
  Object.keys(e.pre || {}).forEach(f => preFlags.add(f));
}
for (const e of edges) {
  for (const f of Object.keys(e.sets || {})) {
    if (!preFlags.has(f) && !e.terminal) {
      // no es bloqueante: puede ser un objetivo secundario sin consumidor (lo avisamos)
      console.log(`ℹ️  flag "${f}" (de ${e.id}) no es precondición de ninguna arista (objetivo suelto / terminal).`);
    }
  }
}
// (b) sin ciclos: como las aristas solo SETEAN flags (monótono, no los borran), el orden por
//     dependencia de flags no puede ciclar. Chequeo: ninguna arista se requiere a sí misma.
for (const e of edges) {
  const pre = Object.keys(e.pre || {}), set = Object.keys(e.sets || {});
  if (pre.some(f => set.includes(f))) errors.push(`ciclo trivial en "${e.id}" (pre y sets comparten flag)`);
}

if (errors.length) {
  console.error('❌ Errores en el grafo de historia:\n  ' + errors.join('\n  '));
  process.exit(1);
}

const banner =
  `// historia.js — GENERADO por tools/gen-historia.mjs (NO editar a mano).\n` +
  `// Ensamblado desde los bloques \`\`\`hist de specs/nivel-1/**/*.md. Ver specs/nivel-1/historia-grafo.md.\n` +
  `// Capa aditiva (typeof Historia guard). Fase 1: el grafo SOLO DESCRIBE; game.js sigue dueño de los flags.\n`;
const body = `const Historia = ${JSON.stringify({ edges }, null, 2)};\n` +
  `if (typeof window !== 'undefined') window.Historia = Historia;\n`;
writeFileSync(OUT, banner + body);
console.log(`✓ Escrito ${path.relative(ROOT, OUT)} — ${edges.length} aristas: ${edges.map(e => e.id).join(', ')}`);
