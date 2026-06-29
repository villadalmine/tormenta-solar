// datacenter.js — CONSTRUCCIÓN COLABORATIVA D1 (specs/construccion-colaborativa.md): el DATACENTER GLOBAL de la comunidad.
// Aportás PARTES (pagás con plata/caramelos del player) → el server suma un contador GLOBAL compartido por TODOS. Cuando
// llega a 100% se destruye la IA del satélite (endgame, D2). Capa ADITIVA: sin red, "modo offline" (ves la maqueta, no aportás).
// El CATÁLOGO de partes es DATA acá (precio + con qué se paga + emoji); el server valida el id, el cupo y el rate-limit.
const Datacenter = (() => {
  const PROXY = 'https://llm-tormenta-solar.cybercirujas.club';   // mismo proxy que ai.js/salon.js/carteles.js
  // catálogo (DATA): id (matchea el server), con qué se paga, cuánto cuesta, emoji. Los nombres salen de i18n (g.dc.part.<id>).
  const PARTS = [
    { id: 'cpu',          pay: 'coins',     cost: 3,  emoji: '🧠' },
    { id: 'disco',        pay: 'coins',     cost: 2,  emoji: '💽' },
    { id: 'red',          pay: 'coins',     cost: 4,  emoji: '🛰️' },
    { id: 'gpu',          pay: 'coins',     cost: 8,  emoji: '🎮' },
    { id: 'enfriamiento', pay: 'caramelos', cost: 6,  emoji: '❄️' },
    { id: 'energia',      pay: 'caramelos', cost: 6,  emoji: '⚡' },
  ];
  const off = { enabled: false, PARTS, get(cb) { cb && cb(null); }, contribute(_p, cb) { cb && cb({ error: 'offline' }); } };
  if (typeof fetch !== 'function') return off;   // headless/e2e → no-op (pero exponemos PARTS para la UI)

  let pid;
  try { pid = sessionStorage.getItem('ts_pid'); if (!pid) { pid = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem('ts_pid', pid); } }
  catch (e) { pid = Math.random().toString(36).slice(2); }

  // GET estado global: { parts, caps, progress, done, contributors, top, updated }. cb(null) si falla.
  function get(cb) {
    fetch(PROXY + '/datacenter').then(r => (r.ok ? r.json() : null)).then(d => cb && cb(d)).catch(() => cb && cb(null));
  }
  // POST aportar una parte: cb({ok,...estado}) | cb({error:'rate'|'partfull'|'bad'|...}). El PAGO lo descuenta el cliente al ok.
  function contribute(part, cb) {
    fetch(PROXY + '/datacenter/contribute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pid, part }) })
      .then(r => r.json().then(j => ({ status: r.status, j })).catch(() => ({ status: r.status, j: {} })))
      .then(({ status, j }) => cb && cb(status === 200 ? j : { error: j.error || 'http' + status, ...j }))
      .catch(() => cb && cb({ error: 'net' }));
  }

  return { enabled: true, pid, PARTS, get, contribute };
})();
if (typeof window !== 'undefined') window.Datacenter = Datacenter;
if (typeof module !== 'undefined') module.exports = Datacenter;
