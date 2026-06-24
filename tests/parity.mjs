// tests/parity.mjs — PARIDAD v1 ≡ v2 (F2). Compara el array de salas de Level.build() (v1, imperativo)
// contra Mundo.fromModel(levels/nivel-1.json) (v2, data-driven) sobre los campos ESTRUCTURALES (D10):
// geometría (map), themes/light/stormable, posiciones de npc/decor/pickup/enemy/machine/cuevero, y
// doors+wiring (id/art/x/to/inward/at). Excluye lo no estructural (diálogos random de _Dp, etc.).
// Uso: node tests/parity.mjs
import { createRequire } from 'module';
import vm from 'vm';
const require = createRequire(import.meta.url);

// v1: reusa el sandbox del e2e (carga level.js con todo mockeado; no corre el smoke)
const { sandbox } = require('./e2e.js');
const TILE = vm.runInContext('Art.TILE', sandbox);
const v1 = vm.runInContext('Level.build()', sandbox);

// v2: Mundo necesita Level.TILE → lo inyectamos como global antes de requerir mundo.js
globalThis.Level = { TILE };
const Mundo = require('../js/mundo.js');
const model = require('../levels/nivel-1.json');
const v2 = Mundo.fromModel(model);

const idxOfV2 = {}; model.rooms.forEach((r, i) => idxOfV2[r.id] = i);
const rN = v => v == null ? null : Math.round(v * 10) / 10;          // 1 decimal (epsilon sub-pixel)
const pos = p => p ? { x: rN(p.x), y: rN(p.y) } : null;
const byX = (a, b) => (a.x - b.x) || String(a.k).localeCompare(String(b.k));

function norm(room, isV2) {
  const toIdx = t => (typeof t === 'string') ? idxOfV2[t] : t;   // cuevero.to: v2=id → índice; v1 ya es índice
  return {
    name: room.name, theme: room.theme, light: room.light, stormable: !!room.stormable, w: room.w,
    map: room.map,
    playerStart: pos(room.playerStart), goal: pos(room.goal), buy: pos(room.buy),
    npcs: (room.npcs || []).map(n => ({ k: n.sprite, sprite: n.sprite, action: n.action || null, x: rN(n.x), y: rN(n.y) })).sort(byX),
    decor: (room.decor || []).map(d => ({ k: d.type, type: d.type, x: rN(d.x) })).sort(byX),
    pickups: (room.pickups || []).map(p => ({ k: p.type, type: p.type, amount: p.amount || null, x: rN(p.x), y: rN(p.y) })).sort(byX),
    enemies: (room.enemies || []).map(e => ({ k: e.type, type: e.type, look: e.look || null, x: rN(e.x), y: rN(e.y) })).sort(byX),
    machines: (room.machines || []).map(m => ({ k: m.game, game: m.game, x: rN(m.x) })).sort(byX),
    cueveros: (room.cueveros || []).map(c => ({ k: c.sprite, sprite: c.sprite, outcome: c.outcome || null, to: toIdx(c.to) ?? null, x: rN(c.x) })).sort(byX),
    doors: (room.doors || []).map(d => ({ k: d.id, id: d.id, art: d.art || 'door', x: rN(d.x), to: d.to ?? null, inward: d.inward ?? null, at: pos(d.at) })).sort(byX),
  };
}

let fails = 0;
if (v1.length !== v2.length) { console.error('❌ cantidad de salas: v1=' + v1.length + ' v2=' + v2.length); fails++; }
for (let i = 0; i < Math.min(v1.length, v2.length); i++) {
  const a = JSON.stringify(norm(v1[i], false));
  const b = JSON.stringify(norm(v2[i], true));
  if (a !== b) {
    fails++;
    console.error('❌ sala ' + i + ' (' + v1[i].name + ') difiere:');
    // mostrar el primer campo que difiere
    const A = JSON.parse(a), B = JSON.parse(b);
    for (const key of Object.keys(A)) {
      if (JSON.stringify(A[key]) !== JSON.stringify(B[key])) {
        console.error('   · ' + key + ':\n     v1=' + JSON.stringify(A[key]).slice(0, 220) + '\n     v2=' + JSON.stringify(B[key]).slice(0, 220));
      }
    }
  }
}

if (fails) { console.error('\n❌ PARIDAD FALLÓ en ' + fails + ' sala(s).'); process.exit(1); }
console.log('✓ PARIDAD v1 ≡ v2 — las ' + v1.length + ' salas coinciden (geometría, posiciones, doors+wiring).');
