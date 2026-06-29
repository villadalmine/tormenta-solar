// carteles.js — CONSTRUCCIÓN COLABORATIVA C1 (specs/construccion-colaborativa.md): el TABLÓN compartido tipo Death
// Stranding. Dejás un cartel corto en un piso del cine; DURA hasta que OTRO jugador lo lee (consumo-en-lectura) → se
// borra. Capa ADITIVA: sin fetch/red, todo es no-op y la sala dice "modo offline" (el juego anda 100% igual).
// Reusa el MISMO proxy y el MISMO pid por pestaña que salon.js (banco mutable por el jugador, persistido en PVC server-side).
const Carteles = (() => {
  const PROXY = 'https://llm-tormenta-solar.cybercirujas.club';   // mismo proxy que ai.js/salon.js/propaganda.js
  const off = { enabled: false, list() {}, post(_f, _n, _t, cb) { cb && cb({ error: 'offline' }); }, read(_id, cb) { cb && cb(null); }, mine(cb) { cb && cb(null); }, maxLen: 80, floorOf() { return null; } };
  if (typeof fetch !== 'function') return off;   // headless/e2e → no-op

  // pid por pestaña, COMPARTIDO con salon.js/presence.js (misma key 'ts_pid')
  let pid;
  try { pid = sessionStorage.getItem('ts_pid'); if (!pid) { pid = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem('ts_pid', pid); } }
  catch (e) { pid = Math.random().toString(36).slice(2); }

  // GET tablón de un piso: { cap, used, signs:[{id,slot,nick,ai,ts}] } (SIN texto: se revela al LEER). cb(null) si falla.
  function list(floor, cb) {
    fetch(PROXY + '/carteles?floor=' + encodeURIComponent(floor)).then(r => (r.ok ? r.json() : null)).then(d => cb && cb(d)).catch(() => cb && cb(null));
  }
  // POST crear: cb({ok,id,slot}) | cb({error:'full'|'rate'|'empty'|...}). El server capa el texto a maxLen + censura básica.
  function post(floor, nick, text, cb) {
    fetch(PROXY + '/carteles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pid, floor, nick: nick || '', text: text || '' }) })
      .then(r => r.json().then(j => ({ status: r.status, j })).catch(() => ({ status: r.status, j: {} })))
      .then(({ status, j }) => cb && cb(status === 200 ? j : { error: j.error || 'http' + status }))
      .catch(() => cb && cb({ error: 'net' }));
  }
  // POST leer: consume si NO es tuyo → { id, nick, text, consumed, mine }. cb(null) si falla / ya no está (gone).
  function read(id, cb) {
    fetch(PROXY + '/carteles/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pid, id }) })
      .then(r => (r.ok ? r.json() : null)).then(d => cb && cb(d)).catch(() => cb && cb(null));
  }
  // GET los MÍOS activos (para la computadora): { signs:[{id,floor,slot,text,ts}] }. cb(null) si falla.
  function mine(cb) {
    fetch(PROXY + '/carteles/mine?pid=' + encodeURIComponent(pid)).then(r => (r.ok ? r.json() : null)).then(d => cb && cb(d)).catch(() => cb && cb(null));
  }

  return { enabled: true, pid, list, post, read, mine, maxLen: 80 };
})();
if (typeof window !== 'undefined') window.Carteles = Carteles;
if (typeof module !== 'undefined') module.exports = Carteles;
