// tests/playable.mjs — la RED de la máquina de niveles (C). (1) el Nivel 1 real pasa el validador de
// jugabilidad; (2) PRUEBA DE REGRESIÓN: el viejo layout que tapaba el ascensor es RECHAZADO (si no, la red
// no sirve). Esto es lo que hará que la IA pueda generar niveles sin meter bugs intransitables.
import fs from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const Playable = require('../js/playable.js');

let fail = 0;
const model = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'levels', 'nivel-1.json'), 'utf8'));

// (1) el nivel real (ya arreglado) debe ser JUGABLE
const r = Playable.checkLevel(model);
if (!r.ok) { console.error('✗ Nivel 1 NO jugable:\n  ' + r.problems.join('\n  ')); fail++; }
else console.log('✓ Nivel 1 jugable — ' + model.rooms.length + ' salas, 0 problemas (puertas libres, spawns OK).');

// (2) REGRESIÓN del ascensor: una sala con la puerta "up" en x=21 y el VIEJO escalón [20,10,3] debe FALLAR
const broken = { rooms: [{ id: 'edificio-roto', nombre: 'piso roto', w: 24,
  platforms: [[20, 10, 3], [17, 8, 2], [14, 6, 2]],   // ← el layout viejo que tapaba el ascensor
  entities: [{ tipo: 'door', id: 'edificio-roto/door-up', x: 21, y: 12 }] }] };
const rb = Playable.checkLevel(broken);
if (rb.ok) { console.error('✗ el validador NO cazó el bug del ascensor (la red no sirve)'); fail++; }
else console.log('✓ regresión ascensor: el layout viejo es RECHAZADO → "' + rb.problems[0] + '"');

// (3) el layout NUEVO (arreglado) con la misma puerta debe PASAR
const fixed = { rooms: [{ id: 'edificio-ok', nombre: 'piso ok', w: 24,
  platforms: [[17, 10, 2], [15, 8, 2], [13, 6, 2]],
  entities: [{ tipo: 'door', id: 'edificio-ok/door-up', x: 21, y: 12 }] }] };
if (!Playable.checkLevel(fixed).ok) { console.error('✗ el layout arreglado falla el validador'); fail++; }
else console.log('✓ el layout arreglado (escalera en el hueco) PASA.');

if (fail) { console.error('\n❌ playable: ' + fail + ' fallo(s).'); process.exit(1); }
console.log('\n🥅 playable OK — la red de jugabilidad funciona (valida el nivel real + caza el bug del ascensor).');
