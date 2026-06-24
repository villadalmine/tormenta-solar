// mundo.js — F2 del modelo v2: loader DATA-DRIVEN. Mundo.fromModel(model) reconstruye el MISMO array de
// salas que Level.build() (v1), pero desde un levels/*.json. Función PURA (idempotente): mismo modelo →
// mismo mundo. TODAVÍA NO se usa en runtime (eso es F3, el toggle). Ver specs/modelo-de-entidades.md.
// El test de PARIDAD (tests/parity.mjs) compara v1 ≡ v2 sobre el Nivel 1.
const Mundo = (() => {
  const TILE = () => (typeof Level !== 'undefined' && Level.TILE) ? Level.TILE
    : (typeof Art !== 'undefined' && Art.TILE) ? Art.TILE : 32;

  function buildRoom(rm) {
    const T = TILE(), w = rm.w, h = 14, gTop = h - 2;
    const map = Array.from({ length: h }, () => new Array(w).fill(0));
    for (let y = gTop; y < h; y++) for (let x = 0; x < w; x++) map[y][x] = 1;     // piso
    for (let y = 0; y < h; y++) { map[y][0] = 1; map[y][w - 1] = 1; }             // bordes
    for (const p of rm.platforms || []) for (let x = p[0]; x < p[0] + p[2]; x++) if (x > 0 && x < w - 1) map[p[1]][x] = 1;

    const feet = (tx, ty) => ({ x: tx * T + T / 2, y: (ty == null ? gTop : ty) * T });
    const room = {
      _id: rm.id, name: rm.nombre, theme: rm.theme, w, h, gTop, map,
      pixW: w * T, pixH: h * T, light: rm.light, stormable: !!rm.stormable,
      goal: null, buy: null, playerStart: null,
      enemies: [], pickups: [], npcs: [], machines: [], cueveros: [], decor: [], doors: [], doorById: {},
    };
    for (const e of rm.entities || []) {
      const f = feet(e.x, e.y);
      switch (e.tipo) {
        case 'marker': {
          const t = e.render && e.render.type;
          if (t === 'spawn') room.playerStart = f; else if (t === 'goal') room.goal = f; else if (t === 'buy') room.buy = f;
          break;
        }
        case 'door': {
          const link = e.link || {};
          const d = { id: e.id.split('/door-')[1] || e.id, art: e.render && e.render.type, facade: e.render && e.render.facade,
            x: f.x, y: f.y, inward: e.inward, to: null, at: null, _toRoom: link.to,
            _at: link.at ? { x: link.at.x * T + T / 2, y: link.at.y * T } : null };
          room.doors.push(d); room.doorById[d.id] = d; break;
        }
        case 'npc': {
          const n = { sprite: e.render && e.render.sprite, action: e.interact && e.interact.action,
            want: e.interact && e.interact.want, persona: (e.interact && e.interact.persona) || (e.chat && e.chat.persona),
            dialog: e.dialogue && e.dialogue.text, invisible: e.lifecycle && e.lifecycle.invisible, x: f.x, y: f.y };
          room.npcs.push(n); break;
        }
        case 'decor': room.decor.push({ type: e.render && e.render.type, x: f.x, feetY: f.y }); break;
        case 'machine': room.machines.push({ game: e.render && e.render.game, x: f.x, y: f.y }); break;
        case 'cuevero': room.cueveros.push({ sprite: e.render && e.render.sprite, outcome: e.interact && e.interact.outcome,
          to: e.interact && e.interact.to, dialog: e.dialogue && e.dialogue.text, x: f.x, y: f.y }); break;
        case 'pickup': room.pickups.push({ type: e.give && e.give.item, amount: e.give && e.give.amount, x: f.x, y: f.y }); break;
        case 'enemy': room.enemies.push({ type: e.combat && e.combat.type, look: e.combat && e.combat.look,
          dormant: e.combat && e.combat.dormant, x: f.x, y: f.y }); break;
      }
    }
    return room;
  }

  // wiring: reproduce wire() de level.js. cada door con link.to apunta a la sala destino (índice) y calcula
  // su 'at' (spawn al cruzar) emparejando con la puerta recíproca (la que apunta de vuelta a esta sala).
  function wireRooms(rooms) {
    const idx = {}; rooms.forEach((r, i) => idx[r._id] = i);
    for (const A of rooms) {
      for (const da of A.doors) {
        if (da._toRoom == null) continue;
        const bi = idx[da._toRoom]; if (bi == null) continue;
        da.to = bi;
        if (da._at) { da.at = da._at; continue; }             // 'at' explícito del modelo (bespoke, ej. cuevas)
        const B = rooms[bi];
        const db = B.doors.find(d => d._toRoom === A._id);   // recíproca → deriva el spawn como wire()
        if (db) da.at = { x: db.x + db.inward * 48, y: db.y };
      }
    }
  }

  function fromModel(model) {
    const rooms = (model.rooms || []).map(buildRoom);
    wireRooms(rooms);
    return rooms;
  }

  return { fromModel, buildRoom };
})();
if (typeof window !== 'undefined') window.Mundo = Mundo;
if (typeof module !== 'undefined') module.exports = Mundo;
