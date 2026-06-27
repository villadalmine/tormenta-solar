// salon.js — MULTIJUGADOR F1 (specs/multijugador.md): presencia EN VIVO para el piso "Cine EN VIVO".
// Capa ADITIVA: si no hay fetch o el endpoint no responde, NO hace nada y el juego anda 100% igual (el piso
// muestra "modo offline"). NO usa WebSockets ni IA: solo POST /salon/beat (latido + hito) y GET /salon/live.
// El bodegón real-time (F2) irá por SSE a un salon-server dedicado; esto es lo barato de la F1.
const Salon = (() => {
  const PROXY = 'https://llm-tormenta-solar.cybercirujas.club';   // mismo proxy que ai.js/propaganda.js (F1 prototipo)
  const off = { beat() {}, live() {}, enabled: false };
  if (typeof fetch !== 'function') return off;                    // headless/e2e → no-op

  // id por pestaña, COMPARTIDO con presence.js (sobrevive recargas dentro de la pestaña)
  let pid;
  try { pid = sessionStorage.getItem('ts_pid'); if (!pid) { pid = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem('ts_pid', pid); } }
  catch (e) { pid = Math.random().toString(36).slice(2); }

  let lastBeat = 0;
  // latido de presencia: dónde estás (sala lógica) + un hito opcional para el ticker. Throttle ~4s (salvo que haya ev).
  function beat(sala, ev) {
    const now = Date.now();
    if (!ev && now - lastBeat < 4000) return;
    lastBeat = now;
    try { fetch(PROXY + '/salon/beat', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pid, sala: sala || '?', ev: ev || undefined }), keepalive: true }).catch(() => {}); } catch (e) {}
  }
  // trae el mundo vivo (count / byRoom / ticker) para la pantalla del cine. cb(null) si la red falla.
  function live(cb) {
    fetch(PROXY + '/salon/live').then(r => (r.ok ? r.json() : null)).then(d => cb && cb(d)).catch(() => cb && cb(null));
  }
  return { beat, live, enabled: true, pid };
})();
if (typeof window !== 'undefined') window.Salon = Salon;
