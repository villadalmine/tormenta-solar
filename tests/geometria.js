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

if (out.length) { console.error('❌ geometria:\n' + out.join('\n')); process.exit(1); }
console.log('✅ geometria: IA autora geometría → RED valida (R4) → auto-repara · 4 casos OK');
