// tests/geometria.js — GEOMETRÍA AUTORADA POR LA IA (la "C", salto grande): la IA propone posiciones de
// plataformas/enemigos como DATA; la RED (Playable, incl. R4 reachability) las valida; si rompen, se AUTO-REPARA
// cayendo al layout procedural. Verifica los 3 casos. Uso: node tests/geometria.js
const path = require('path');
global.Playable = require(path.join(__dirname, '..', 'js', 'playable.js'));
const NivelAI = require(path.join(__dirname, '..', 'js', 'nivelai.js'));

const out = [];
const ok = (c, m) => { if (!c) out.push('FAIL ' + m); };
const platsOf = res => res.model.rooms.map(r => JSON.stringify(r.platforms));
const sameAll = (res, geom) => platsOf(res).every(s => s === JSON.stringify(geom));

// tema ad-hoc base (como el que arma requestOraculo con la respuesta de la IA)
const base = extra => Object.assign({
  id: 'oraculo', motif: '🔮', name: { es: 'Test', en: 'Test' }, intro: { es: '', en: '' },
  palette: { floor: '#222', floor2: '#333', wall: '#444', accent: '#abc' },
  props: ['🔮'], npc: { emoji: '🔮', lines: { es: ['hola'], en: ['hi'] } },
  goal: { es: 'SALIDA', en: 'EXIT' }, reward: { caramelos: 6 }, style: 'climb', decor: ['caja'],
}, extra);

// 1) GEOMETRÍA BUENA (escalera trepable, lejos de puertas) → la RED la acepta → se USA tal cual
const good = [[6, 10, 3], [10, 8, 3], [14, 6, 3]];
let res = NivelAI.generateLevel(base({ aiPlatforms: good }));
ok(Playable.checkLevel(res.model).ok, 'geometría buena → nivel jugable');
ok(sameAll(res, good), 'geometría buena → se USA la geometría de la IA en todas las salas');

// 2) GEOMETRÍA ROTA (muro infranqueable de 4 de alto, 2 de ancho) → la RED la rechaza → AUTO-REPARA (procedural)
const wall = [[10, 11, 2], [10, 10, 2], [10, 9, 2], [10, 8, 2]];
res = NivelAI.generateLevel(base({ aiPlatforms: wall }));
ok(Playable.checkLevel(res.model).ok, 'geometría rota → el resultado IGUAL es jugable (auto-reparado)');
ok(!sameAll(res, wall), 'geometría rota → NO se usó la geometría rota (cayó al layout procedural)');

// 3) GEOMETRÍA basura (no-array / valores no finitos) → se ignora → procedural, jugable
res = NivelAI.generateLevel(base({ aiPlatforms: [['x', null], 42, { foo: 1 }] }));
ok(Playable.checkLevel(res.model).ok, 'geometría basura → jugable (fallback procedural)');

// 4) enemigos autorados por la IA → aparecen como enemigos en el modelo
res = NivelAI.generateLevel(base({ aiPlatforms: good, aiEnemies: [7, 12, 9] }));
const enemiesR0 = res.model.rooms[0].entities.filter(e => e.tipo === 'enemy');
ok(enemiesR0.length >= 1, 'enemigos autorados por la IA → presentes en la sala');

// 5) PINCHOS (obstáculo nuevo): R5 rechaza un pincho sobre la columna del spawn (te dañaría al aparecer)
const badHz = { id: 'hz', w: 24, platforms: [], entities: [
  { tipo: 'marker', x: 2, render: { type: 'spawn' } },
  { tipo: 'marker', x: 21, render: { type: 'goal' } },
  { tipo: 'hazard', x: 2, w: 2, render: { type: 'spikes' } },
] };
ok(Playable.checkRoom(badHz).some(p => /PINCHO/.test(p)), 'R5: pincho sobre el spawn → RECHAZADO');
const okHz = Object.assign({}, badHz, { entities: badHz.entities.slice(0, 2).concat([{ tipo: 'hazard', x: 11, w: 2, render: { type: 'spikes' } }]) });
ok(Playable.checkRoom(okHz).length === 0, 'pincho en el medio (lejos de spawn/meta) → OK');

// 6) niveles generados: aparecen pinchos (data) y variedad de enemigos, y SIEMPRE jugables
let withHazard = 0; const enemyTypes = {};
for (let k = 0; k < 40; k++) {
  const g = NivelAI.generateLevel();
  ok(Playable.checkLevel(g.model).ok, 'nivel generado #' + k + ' jugable (con pinchos/enemigos variados)');
  for (const rm of g.model.rooms) for (const e of rm.entities) {
    if (e.tipo === 'hazard') withHazard++;
    if (e.tipo === 'enemy') enemyTypes[e.combat.type] = 1;
  }
}
ok(withHazard > 0, 'los niveles generados incluyen PINCHOS (obstáculo nuevo, data)');
ok(Object.keys(enemyTypes).length >= 3, 'variedad de enemigos (≥3 tipos: ' + Object.keys(enemyTypes).join(',') + ')');

// 7) pickups SOLO en plataformas alcanzables (R4 pickups)
let pkBad = 0, pkTotal = 0;
for (let k = 0; k < 20; k++) {
  const g = NivelAI.generateLevel(base({ aiPlatforms: good }));
  for (const rm of g.model.rooms) {
    const reach = Playable.reachableTops(rm);
    for (const e of rm.entities) if (e.tipo === 'pickup') { pkTotal++; if (!reach[Math.round(e.x - 0.5) + ',' + Math.round(e.y)]) pkBad++; }
  }
}
ok(pkTotal > 0 && pkBad === 0, 'todos los pickups (' + pkTotal + ') están en plataformas alcanzables');

(async () => {
  // 8) requestGeometry (geometría IA para TEMAS FIJOS): trae del proxy y la pega como aiPlatforms (fetch mockeado)
  global.fetch = () => Promise.resolve({ ok: true, json: async () => ({ platforms: [[6, 10, 3], [10, 8, 3]], enemies: [7, 12] }) });
  await new Promise(resolve => NivelAI.requestGeometry('super-rasca', theme => {
    ok(theme && Array.isArray(theme.aiPlatforms) && theme.aiPlatforms.length >= 2, 'requestGeometry pega aiPlatforms del proxy');
    ok(theme && theme.id === 'super-rasca', 'requestGeometry conserva el tema pedido (texto estático)');
    const r = NivelAI.generateLevel(theme);
    ok(Playable.checkLevel(r.model).ok && sameAll(r, theme.aiPlatforms), 'el tema fijo usa la geometría traída de la IA');
    resolve();
  }));

  // 9) requestGeometry con el proxy CAÍDO (fetch rechaza) → cb(null) → el caller usa generateLevel() procedural
  global.fetch = () => Promise.reject(new Error('down'));
  await new Promise(resolve => NivelAI.requestGeometry('super-rasca', theme => {
    ok(theme === null, 'proxy caído → requestGeometry cb(null) (fallback procedural, no se cuelga)');
    resolve();
  }));

  if (out.length) { console.error('❌ geometria:\n' + out.join('\n')); process.exit(1); }
  console.log('✅ geometria: IA autora geometría + pinchos/enemigos variados + pickups alcanzables → RED (R4/R5) + auto-repara · OK');
})();
