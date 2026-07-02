// eventos.js — BUS DE EVENTOS del jugador en TIEMPO REAL (specs/npcs-vivos.md §5.3 F4a). Ring de lo que acabás de
// hacer (hitos del grafo, salas, compras, mini-juegos, charlas…): la "película" además de la "foto" (worldSnapshot).
// Lo consumen: worldBrief (los oráculos comentan lo FRESCO), el chusmerío ambiente, y los drives de movimiento (F4b:
// un NPC "siente la necesidad" de buscarte cuando hiciste algo notable). Capa ADITIVA: sin este módulo, todo igual.
const Eventos = (() => {
  const ring = [];
  const MAX = 24;
  function push(ev, detail) {
    if (!ev) return;
    ring.push({ ev: String(ev).slice(0, 24), detail: String(detail == null ? '' : detail).slice(0, 48), t: Date.now() });
    if (ring.length > MAX) ring.shift();
  }
  function recent(ms) { const cut = Date.now() - (ms || 180000); return ring.filter(e => e.t >= cut); }
  function last(n) { return ring.slice(-(n || 6)); }
  // el evento NOTABLE más fresco (para que un NPC te busque): hito/minijuego/truco/compra en los últimos `ms`
  function fresh(ms) {
    const cut = Date.now() - (ms || 45000);
    for (let i = ring.length - 1; i >= 0; i--) { const e = ring[i]; if (e.t < cut) break; if (e.ev !== 'sala') return e; }
    return null;
  }
  return { push, recent, last, fresh };
})();
if (typeof window !== 'undefined') window.Eventos = Eventos;
if (typeof module !== 'undefined') module.exports = Eventos;
