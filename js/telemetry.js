// telemetry.js — métricas de USO del juego (anónimas, agregadas, sin PII). Capa ADITIVA: apagada por defecto;
// solo manda algo si window.GAME_METRICS apunta a un endpoint (el proxy). Mismo espíritu que ads.js (beacon).
// Eventos acotados (engine v1/v2, storm, truco, death, win, error, chat...) → el proxy los agrega a Prometheus.
// El endpoint se setea ACÁ (no en un <script> inline en index.html) para poder usar CSP estricto (script-src 'self'). specs/seguridad.md
if (typeof window !== 'undefined' && !window.GAME_METRICS) window.GAME_METRICS = 'https://llm-tormenta-solar.cybercirujas.club/game-metrics';
const Telemetry = (() => {
  const url = () => (typeof window !== 'undefined' && window.GAME_METRICS) || '';
  let queue = [], timer = null;
  const sent = {};

  function flush() {
    const u = url(); if (!u || !queue.length || typeof fetch === 'undefined') return;
    const batch = queue; queue = [];
    const body = JSON.stringify({ events: batch, ts: Date.now() });
    try {
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) navigator.sendBeacon(u, body);
      else fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
    } catch (e) {}
  }
  // event(name, labels): labels son conjuntos finitos (engine/result/lang). NUNCA ids/IP/texto del jugador.
  function event(name, labels) {
    if (!url() || !name) return;
    const ev = { e: String(name).slice(0, 24) };
    if (labels) for (const k of ['engine', 'result', 'lang', 'persona', 'format']) if (labels[k] != null) ev[k] = String(labels[k]).slice(0, 24);
    queue.push(ev);
    if (queue.length >= 12) flush();
    else if (!timer && typeof setTimeout !== 'undefined') timer = setTimeout(() => { timer = null; flush(); }, 5000);
  }
  // once(key,...): manda el evento UNA sola vez por sesión (ej. 'storm', 'win').
  function once(key, name, labels) { if (sent[key]) return; sent[key] = 1; event(name, labels); }

  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('beforeunload', flush);
    window.addEventListener('pagehide', flush);
  }
  return { event, once, flush };
})();
if (typeof window !== 'undefined') window.Telemetry = Telemetry;
