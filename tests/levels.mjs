// tests/levels.mjs — valida los niveles data-driven (levels/*.json) contra levels/level.schema.json.
// Mini-validador de JSON Schema SIN dependencias (cubre el subconistente que usa el schema: type/required/
// properties/additionalProperties/items/$ref/enum/const/minItems/maxItems/minimum/pattern). Es el ESQUELETO
// del check de la Fase 1 (ver specs/modelo-de-entidades.md §10 + levels/README.md). Uso: node tests/levels.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));

// --- resolución de $ref contra el schema raíz ($defs) ---
function resolveRef(ref, root) {
  if (ref === '#') return root;
  return ref.replace(/^#\//, '').split('/').reduce((o, k) => (o ? o[k] : undefined), root);
}
const jsType = v => v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
function typeOk(v, t) {
  if (t === 'integer') return Number.isInteger(v);
  if (t === 'number') return typeof v === 'number';
  if (t === 'object') return v !== null && typeof v === 'object' && !Array.isArray(v);
  if (t === 'array') return Array.isArray(v);
  if (t === 'null') return v === null;
  return typeof v === t;             // string | boolean
}

function validate(node, schema, p, root, errors) {
  if (!schema) return;
  if (schema.$ref) schema = resolveRef(schema.$ref, root);
  if (!schema || Object.keys(schema).length === 0) return;   // {} = cualquier cosa

  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some(t => typeOk(node, t))) { errors.push(p + ': tipo esperado ' + types.join('|') + ', vino ' + jsType(node)); return; }
  }
  if ('const' in schema && node !== schema.const) errors.push(p + ': debe ser ' + JSON.stringify(schema.const));
  if (schema.enum && !schema.enum.includes(node)) errors.push(p + ': fuera de enum (' + JSON.stringify(node) + ')');
  if (typeof node === 'number' && schema.minimum != null && node < schema.minimum) errors.push(p + ': < minimum ' + schema.minimum);
  if (typeof node === 'string' && schema.pattern && !new RegExp(schema.pattern).test(node)) errors.push(p + ': no matchea pattern ' + schema.pattern);

  if (Array.isArray(node)) {
    if (schema.minItems != null && node.length < schema.minItems) errors.push(p + ': minItems ' + schema.minItems);
    if (schema.maxItems != null && node.length > schema.maxItems) errors.push(p + ': maxItems ' + schema.maxItems);
    if (schema.items) node.forEach((it, i) => validate(it, schema.items, p + '[' + i + ']', root, errors));
  }
  if (node && typeof node === 'object' && !Array.isArray(node)) {
    for (const r of schema.required || []) if (!(r in node)) errors.push(p + ': falta requerido "' + r + '"');
    const props = schema.properties || {};
    for (const k of Object.keys(node)) {
      if (props[k]) validate(node[k], props[k], p + '.' + k, root, errors);
      else if (schema.additionalProperties === false) errors.push(p + '.' + k + ': propiedad no permitida (typo?)');
    }
  }
}

// --- correr ---
const schema = read('levels/level.schema.json');
const files = fs.readdirSync(path.join(ROOT, 'levels')).filter(f => f.endsWith('.json') && f !== 'level.schema.json');
let fail = 0;
for (const f of files) {
  const errors = [];
  validate(read('levels/' + f), schema, f, schema, errors);
  if (errors.length) { fail++; console.error('❌ ' + f + ' — ' + errors.length + ' error(es):'); errors.forEach(e => console.error('   ' + e)); }
  else console.log('✓ ' + f + ' valida contra el schema');
}

// self-test NEGATIVO: el validador TIENE que cazar errores en un objeto malo (si no, está roto)
const bad = { schemaVersion: 2, id: 5, rooms: [], cosaRara: true };
const be = [];
validate(bad, schema, 'self-test', schema, be);
if (be.length < 3) { console.error('❌ self-test: el validador no detecta errores → está roto'); process.exit(1); }
console.log('✓ self-test: detecta ' + be.length + ' errores en un objeto malo (validador OK)');

if (fail) { console.error('\n❌ Hay niveles que NO validan.'); process.exit(1); }
console.log('\n🧩 levels OK — ' + files.length + ' nivel(es) válido(s) contra level.schema.json.');
