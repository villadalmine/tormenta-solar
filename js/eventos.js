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
    schedulePost();   // sync cross-device (debounced)
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
  // ── SYNC CROSS-DEVICE (npcs-vivos F4d+): la memoria viaja con tu NICK — el linyera te recuerda en el celu
  // lo que hiciste en la laptop. GET al entrar (merge) + POST debounced tras cada evento notable. ADITIVO.
  const PROXY = 'https://llm-tormenta-solar.cybercirujas.club';
  let syncNick = null, postT = null;
  function sync(nick) {
    if (typeof fetch !== 'function' || !nick) return;
    syncNick = nick;
    fetch(PROXY + '/barrio-mem?nick=' + encodeURIComponent(nick)).then(r => (r.ok ? r.json() : null)).then(d => {
      if (!d || !Array.isArray(d.mem) || !d.mem.length) return;
      const cur = loadMem(), seen = new Set(cur.map(e => e.ev + '|' + e.t));
      let added = 0;
      for (const e of d.mem) if (e && e.ev && !seen.has(e.ev + '|' + (+e.t || 0))) { cur.push({ ev: String(e.ev).slice(0, 24), detail: String(e.detail || '').slice(0, 48), t: +e.t || Date.now() }); added++; }
      if (added) { cur.sort((a, b) => a.t - b.t); try { localStorage.setItem(MEMKEY, JSON.stringify(cur.slice(-30))); } catch (x) {} }
    }).catch(() => {});
  }
  function schedulePost() {
    if (!syncNick || typeof fetch !== 'function' || postT) return;
    postT = setTimeout(() => { postT = null;
      try { fetch(PROXY + '/barrio-mem', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nick: syncNick, mem: loadMem() }), keepalive: true }).catch(() => {}); } catch (e) {}
    }, 25000);   // debounce > el gap anti-spam del server (20s)
  }
  return { push, recent, last, fresh, remember, memoria, memoriaVieja, sync };
})();
if (typeof window !== 'undefined') window.Eventos = Eventos;
if (typeof module !== 'undefined') module.exports = Eventos;
