// playable.js — VALIDADOR DE JUGABILIDAD (la "red" de la máquina de niveles, C). Chequea que un nivel (modelo
// v2, mismo que Mundo.fromModel consume) sea JUGABLE, no solo que valide el schema. La IA del generador podrá
// proponer 100 layouts; SOLO los que pasan acá llegan al jugador. También protege el nivel hecho a mano (este
// validador habría cazado el bug del ascensor del edificio de los borrachines). Ver specs/fabrica-niveles-ai.md.
//
// Reglas v1 (las que importan + cazan la clase de bug del ascensor):
//   R1 — puerta TAPADA: ninguna plataforma/sólido en la columna de una puerta, a la altura del cuerpo (acceso).
//   R2 — spawn DENTRO de sólido: el jugador no aparece pisando una pared/plataforma.
//   R3 — meta/goal ENTERRADA: el objetivo no queda dentro de un sólido.
//   R4 — REACHABILITY con física de salto: desde la entrada (spawn o puerta de entrada) ¿se LLEGA saltando a la
//        meta y a cada puerta? Esto es la red CLAVE para la geometría autorada por IA: una IA puede poner una
//        plataforma jugable según R1-R3 pero IMPOSIBLE de alcanzar (muro más alto que el salto). (specs §4.7)
const Playable = (() => {
  const H = 14, GTOP = H - 2;                       // mismas constantes que el motor/Mundo (alto fijo, piso en H-2)
  const JUMP_UP = 3;                                // tiles que se trepan de UN salto (apex real ~3.9; conservador). R4.
  const ti = v => Math.round(Number(v) || 0);

  // grilla de SÓLIDOS de una sala (piso + bordes + plataformas, menos los POZOS) — calca Mundo.buildRoom, en tiles
  function roomGrid(rm) {
    const w = rm.w, map = Array.from({ length: H }, () => new Array(w).fill(0));
    for (let y = GTOP; y < H; y++) for (let x = 0; x < w; x++) map[y][x] = 1;     // piso
    for (let y = 0; y < H; y++) { map[y][0] = 1; map[y][w - 1] = 1; }             // bordes
    for (const p of rm.platforms || []) for (let x = p[0]; x < p[0] + p[2]; x++) if (x > 0 && x < w - 1) map[p[1]][x] = 1;
    // POZOS (hazard kind 'pit'): CALAN el piso → hueco por el que se cae (hay que SALTARLO). Idéntico a Mundo.
    for (const e of rm.entities || []) if (e.tipo === 'hazard' && e.render && e.render.type === 'pit') {
      const hx = ti(e.x), hw = Math.max(1, ti(e.w) || 2), x0 = hx - ((hw - 1) >> 1);
      for (let x = x0; x < x0 + hw; x++) if (x > 0 && x < w - 1) for (let y = GTOP; y < H; y++) map[y][x] = 0;
    }
    return map;
  }

  // ----- R4: reachability con física de salto -----
  // "Standable" = tile libre con sólido abajo (donde el jugador puede pararse). BFS de superficies alcanzables
  // desde la entrada: se sube ≤JUMP_UP tiles de un salto; se baja/cae cualquier altura; saltos de hueco a x±2 sólo
  // a nivel o hacia abajo (no se trepa lejos Y alto a la vez). Calibrado para NO marcar pisos despejados (los
  // niveles actuales tienen el piso GTOP-1 libre → meta/puertas siempre alcanzables).
  function standables(map, w) {
    const st = {};
    for (let x = 1; x < w - 1; x++) for (let y = 0; y < H - 1; y++)
      if (map[y][x] === 0 && map[y + 1][x] === 1) st[x + ',' + y] = [x, y];
    return st;
  }
  // primer tile donde pararse en una columna, bajando desde y0 (la meta/puerta cae hasta el piso)
  function standAt(map, w, x, y0) {
    for (let y = Math.max(0, y0); y < H - 1; y++) if (map[y][x] === 0 && map[y + 1][x] === 1) return y;
    return null;
  }
  const JUMP_ACROSS = 3;                              // ancho de hueco que se cruza de un salto (pozo ≤2 tiles)
  function reachSet(map, w, entryX) {
    const st = standables(map, w), byCol = {};
    for (const k in st) { const [x, y] = st[k]; (byCol[x] = byCol[x] || []).push(y); }   // índice por columna (perf)
    const sy = standAt(map, w, entryX, GTOP - 1) ?? standAt(map, w, entryX, 0);
    if (sy == null) return {};                       // sin piso en la entrada → no marcamos (evita falso positivo)
    // ¿están ABIERTAS las columnas intermedias al nivel del salto? (un pozo sí; un muro que sobresale, no)
    const open = (lo, hi, lvl) => { for (let c = lo + 1; c < hi; c++) for (let yy = 0; yy <= lvl; yy++) if (map[yy][c]) return false; return true; };
    const seen = {}; seen[entryX + ',' + sy] = 1; const q = [[entryX, sy]];
    while (q.length) {
      const [x, y] = q.pop();
      for (let nx = x - JUMP_ACROSS; nx <= x + JUMP_ACROSS; nx++) {
        const ys = byCol[nx]; if (!ys) continue;
        for (const ny of ys) {
          const k = nx + ',' + ny; if (seen[k]) continue;
          const dx = Math.abs(nx - x), up = y - ny;  // up>0 = sube
          if (dx === 0 && ny === y) continue;
          if (dx > JUMP_ACROSS || up > JUMP_UP) continue;
          if (dx >= 2 && up > 0) continue;           // saltos de hueco (dx≥2) sólo a nivel o hacia abajo
          if (dx >= 2 && !open(Math.min(x, nx), Math.max(x, nx), Math.min(y, ny))) continue;   // un muro intermedio bloquea
          seen[k] = 1; q.push([nx, ny]);
        }
      }
    }
    return seen;
  }

  // entrada de la sala: el spawn (sala 0) o la puerta de entrada (≤ x2, las del medio/derecha)
  function entryOf(rm) {
    let entryX = 1;
    for (const e of rm.entities || []) if (e.tipo === 'marker' && e.render && e.render.type === 'spawn') entryX = ti(e.x);
    if (entryX === 1) for (const e of rm.entities || []) if (e.tipo === 'door' && ti(e.x) <= 2) { entryX = ti(e.x); break; }
    return entryX;
  }
  // superficies ALCANZABLES desde la entrada (set "x,y"). Lo usa el generador para poner pickups sólo donde se llega.
  function reachableTops(rm) { return reachSet(roomGrid(rm), rm.w, entryOf(rm)); }

  function checkRoom(rm) {
    const probs = [], w = rm.w, map = roomGrid(rm);
    const solid = (x, y) => (y >= 0 && y < H && x >= 0 && x < w) ? map[y][x] === 1 : true;
    const entryX = entryOf(rm);
    const seen = reachSet(map, w, entryX);
    // columnas "sagradas" (spawn/meta/puertas): un pincho acá te haría daño al aparecer/llegar → R5 lo prohíbe
    const sacred = {};
    for (const e of rm.entities || []) if (e.tipo === 'door' || (e.tipo === 'marker' && e.render && (e.render.type === 'spawn' || e.render.type === 'goal'))) sacred[ti(e.x)] = 1;
    for (const e of rm.entities || []) {
      if (e.tipo === 'door') {
        // R1: una plataforma a la ALTURA DE LA CABEZA, en la MISMA columna de la puerta (GTOP-2), la TAPA — exactamente
        // lo que pasó con el ascensor. (No miramos +3 arriba: esas son fachadas de edificios, no tapan la puerta de
        // PB; ni GTOP-1: ahí una puerta puede APOYARSE sobre una plataforma —piso alto— y es legítimo.)
        // Las puertas EN ALTURA (e.y declarado, ej. escalera de incendios) se apoyan sobre una plataforma → no aplica R1.
        const dx = ti(e.x), highDoor = (e.y != null && ti(e.y) < GTOP - 1);
        if (!highDoor && solid(dx, GTOP - 2)) probs.push('puerta "' + (e.id || dx) + '" TAPADA por sólido a la altura de la cabeza en (' + dx + ',' + (GTOP - 2) + ')');
        // R4: la puerta de SALIDA (no la de entrada) debe ser alcanzable saltando desde la entrada
        if (dx !== entryX) { const ys = standAt(map, w, dx, e.y != null ? ti(e.y) : GTOP - 1); if (ys != null && !seen[dx + ',' + ys]) probs.push('puerta "' + (e.id || dx) + '" INALCANZABLE (no se llega saltando) en x=' + dx); }
      } else if (e.tipo === 'marker' && e.render) {
        const mx = ti(e.x);
        if (e.render.type === 'spawn' && solid(mx, GTOP - 1)) probs.push('SPAWN dentro de sólido en x=' + mx);   // R2
        if (e.render.type === 'goal' && solid(mx, GTOP - 1)) probs.push('META enterrada en sólido en x=' + mx);  // R3
        if (e.render.type === 'goal') { const ys = standAt(map, w, mx, GTOP - 1); if (ys != null && !seen[mx + ',' + ys]) probs.push('META INALCANZABLE (no se llega saltando) en x=' + mx); }  // R4
      } else if (e.tipo === 'hazard') {
        // R5: un pincho/obstáculo de daño no puede estar en la columna del spawn/meta/puerta (te dañaría sin escape)
        const hx = ti(e.x), hw = Math.max(1, ti(e.w) || 2);
        for (let x = hx - ((hw / 2) | 0); x <= hx + ((hw / 2) | 0); x++) if (sacred[x]) { probs.push('PINCHO sobre columna sagrada (spawn/meta/puerta) en x=' + hx); break; }
      }
    }
    return probs;
  }

  function checkLevel(model) {
    const problems = [];
    for (const rm of (model && model.rooms) || []) for (const p of checkRoom(rm)) problems.push((rm.id || rm.nombre || '?') + ': ' + p);
    return { ok: problems.length === 0, problems };
  }

  return { checkLevel, checkRoom, reachableTops, roomGrid, H, GTOP };
})();
if (typeof module !== 'undefined') module.exports = Playable;
if (typeof window !== 'undefined') window.Playable = Playable;
