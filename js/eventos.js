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
    if (ev === 'hito' || ev === 'minijuego' || ev === 'muerte') remember(ev, detail);   // lo NOTABLE queda para siempre (F4d)
  }
  // F4d: MEMORIA persistente del barrio — lo notable sobrevive la sesión; los NPC te lo recuerdan días después.
  const MEMKEY = 'ts_barrio_mem_v1';
  function loadMem() { try { return JSON.parse(localStorage.getItem(MEMKEY) || '[]') || []; } catch (e) { return []; } }
  function remember(ev, detail) {
    try { const m = loadMem(); m.push({ ev: String(ev).slice(0, 24), detail: String(detail == null ? '' : detail).slice(0, 48), t: Date.now() });
      while (m.length > 30) m.shift(); localStorage.setItem(MEMKEY, JSON.stringify(m)); } catch (e) {}
  }
  function memoria(n) { return loadMem().slice(-(n || 8)); }
  // lo VIEJO (más de 6h): material de "¿te acordás cuando…?" — no pisa lo fresco del ring
  function memoriaVieja(n) { const cut = Date.now() - 6 * 3600000; return loadMem().filter(e => e.t < cut).slice(-(n || 5)); }
  function recent(ms) { const cut = Date.now() - (ms || 180000); return ring.filter(e => e.t >= cut); }
  function last(n) { return ring.slice(-(n || 6)); }
  // el evento NOTABLE más fresco (para que un NPC te busque): hito/minijuego/truco/compra en los últimos `ms`
  function fresh(ms) {
    const cut = Date.now() - (ms || 45000);
    for (let i = ring.length - 1; i >= 0; i--) { const e = ring[i]; if (e.t < cut) break; if (e.ev !== 'sala') return e; }
    return null;
  }
  return { push, recent, last, fresh, remember, memoria, memoriaVieja };
})();
if (typeof window !== 'undefined') window.Eventos = Eventos;
if (typeof module !== 'undefined') module.exports = Eventos;
