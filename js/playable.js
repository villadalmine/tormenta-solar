// playable.js — VALIDADOR DE JUGABILIDAD (la "red" de la máquina de niveles, C). Chequea que un nivel (modelo
// v2, mismo que Mundo.fromModel consume) sea JUGABLE, no solo que valide el schema. La IA del generador podrá
// proponer 100 layouts; SOLO los que pasan acá llegan al jugador. También protege el nivel hecho a mano (este
// validador habría cazado el bug del ascensor del edificio de los borrachines). Ver specs/fabrica-niveles-ai.md.
//
// Reglas v1 (las que importan + cazan la clase de bug del ascensor):
//   R1 — puerta TAPADA: ninguna plataforma/sólido en la columna de una puerta, a la altura del cuerpo (acceso).
//   R2 — spawn DENTRO de sólido: el jugador no aparece pisando una pared/plataforma.
//   R3 — meta/goal ENTERRADA: el objetivo no queda dentro de un sólido.
// (Reachability con física de salto = R4, futuro. Estas tres ya bloquean lo intransitable más común.)
const Playable = (() => {
  const H = 14, GTOP = H - 2;                       // mismas constantes que el motor/Mundo (alto fijo, piso en H-2)
  const ti = v => Math.round(Number(v) || 0);

  // grilla de SÓLIDOS de una sala (piso + bordes + plataformas) — calca Mundo.buildRoom, en tiles
  function roomGrid(rm) {
    const w = rm.w, map = Array.from({ length: H }, () => new Array(w).fill(0));
    for (let y = GTOP; y < H; y++) for (let x = 0; x < w; x++) map[y][x] = 1;     // piso
    for (let y = 0; y < H; y++) { map[y][0] = 1; map[y][w - 1] = 1; }             // bordes
    for (const p of rm.platforms || []) for (let x = p[0]; x < p[0] + p[2]; x++) if (x > 0 && x < w - 1) map[p[1]][x] = 1;
    return map;
  }

  function checkRoom(rm) {
    const probs = [], w = rm.w, map = roomGrid(rm);
    const solid = (x, y) => (y >= 0 && y < H && x >= 0 && x < w) ? map[y][x] === 1 : true;
    for (const e of rm.entities || []) {
      if (e.tipo === 'door') {
        // R1: una plataforma a la ALTURA DE LA CABEZA, en la MISMA columna de la puerta (GTOP-2), la TAPA — exactamente
        // lo que pasó con el ascensor. (No miramos +3 arriba: esas son fachadas de edificios, no tapan la puerta de
        // PB; ni GTOP-1: ahí una puerta puede APOYARSE sobre una plataforma —piso alto— y es legítimo.)
        const dx = ti(e.x);
        if (solid(dx, GTOP - 2)) probs.push('puerta "' + (e.id || dx) + '" TAPADA por sólido a la altura de la cabeza en (' + dx + ',' + (GTOP - 2) + ')');
      } else if (e.tipo === 'marker' && e.render) {
        const mx = ti(e.x);
        if (e.render.type === 'spawn' && solid(mx, GTOP - 1)) probs.push('SPAWN dentro de sólido en x=' + mx);   // R2
        if (e.render.type === 'goal' && solid(mx, GTOP - 1)) probs.push('META enterrada en sólido en x=' + mx);  // R3
      }
    }
    return probs;
  }

  function checkLevel(model) {
    const problems = [];
    for (const rm of (model && model.rooms) || []) for (const p of checkRoom(rm)) problems.push((rm.id || rm.nombre || '?') + ': ' + p);
    return { ok: problems.length === 0, problems };
  }

  return { checkLevel, checkRoom, roomGrid, H, GTOP };
})();
if (typeof module !== 'undefined') module.exports = Playable;
if (typeof window !== 'undefined') window.Playable = Playable;
