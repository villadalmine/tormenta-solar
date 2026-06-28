// salon.js — MULTIJUGADOR F1 (specs/multijugador.md): presencia EN VIVO para el piso "Cine EN VIVO".
// Capa ADITIVA: si no hay fetch o el endpoint no responde, NO hace nada y el juego anda 100% igual (el piso
// muestra "modo offline"). NO usa WebSockets ni IA: solo POST /salon/beat (latido + hito) y GET /salon/live.
// El bodegón real-time (F2) irá por SSE a un salon-server dedicado; esto es lo barato de la F1.
const Salon = (() => {
  const PROXY = 'https://llm-tormenta-solar.cybercirujas.club';   // mismo proxy que ai.js/propaganda.js (F1 prototipo)
  const off = { beat() {}, live() {}, enabled: false, join(n, a, cb) { cb && cb(null); }, leave() {}, pos() {}, say() {}, whisper() {}, onWhisper() {}, onPeers() {}, getPeers() { return new Map(); }, inBodegon() { return false; } };
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

  // ===== F2b — BODEGÓN real-time (specs/multijugador.md §3.2). join → SSE stream → ves a los otros moverse +
  // emotes + frases preset. Capa aditiva: sin EventSource/red, todo es no-op y el bodegón queda single-player. =====
  let myRoom = null, es = null, lastPos = 0; const peers = new Map(); let peersCb = null, whisperCb = null;
  function notify() { try { peersCb && peersCb(peers); } catch (e) {} }
  function openStream() {
    if (typeof EventSource !== 'function' || !myRoom) return;
    try { es = new EventSource(PROXY + '/salon/stream?room=' + encodeURIComponent(myRoom) + '&pid=' + encodeURIComponent(pid)); } catch (e) { return; }
    es.addEventListener('peer-join', e => { try { const d = JSON.parse(e.data); peers.set(d.pid, { ...d, rx: d.x }); notify(); } catch (x) {} });
    es.addEventListener('peer-leave', e => { try { const d = JSON.parse(e.data); peers.delete(d.pid); notify(); } catch (x) {} });
    es.addEventListener('peer-pos', e => { try { const d = JSON.parse(e.data); const p = peers.get(d.pid) || { pid: d.pid, rx: d.x };
      p.x = d.x; if (d.vx != null) p.vx = d.vx; if (d.nick != null) p.nick = d.nick; if (d.avatar != null) p.avatar = d.avatar;
      if (d.emote) { p.emote = d.emote; p.emoteT = Date.now(); } if (p.rx == null) p.rx = d.x; peers.set(d.pid, p); notify(); } catch (x) {} });
    es.addEventListener('say', e => { try { const d = JSON.parse(e.data); const p = peers.get(d.pid); if (p) { p.say = d.i; p.sayT = Date.now(); notify(); } } catch (x) {} });
    es.addEventListener('whisper', e => { try { const d = JSON.parse(e.data); whisperCb && whisperCb(d); } catch (x) {} });   // chat privado 1-a-1 entrante
    es.onerror = () => {};   // reconexión la maneja el propio EventSource (retry)
  }
  function join(nick, avatar, cb) {
    if (typeof fetch !== 'function') { cb && cb(null); return; }
    fetch(PROXY + '/salon/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pid, nick: nick || '', avatar: avatar || 'civil' }) })
      .then(r => (r.ok ? r.json() : null)).then(d => {
        if (!d || !d.room) { cb && cb(null); return; }
        myRoom = d.room; peers.clear(); (d.peers || []).forEach(p => peers.set(p.pid, { ...p, rx: p.x }));
        openStream(); cb && cb(d);
      }).catch(() => cb && cb(null));
  }
  // postear MI posición (tile x 1-21 + vx + emote opcional). Throttle ~160ms salvo que haya emote (entonces ya).
  function pos(x, vx, emote) {
    if (!myRoom) return; const now = Date.now();
    if (emote == null && now - lastPos < 160) return; lastPos = now;
    try { fetch(PROXY + '/salon/pos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pid, room: myRoom, x, vx, emote }), keepalive: true }).catch(() => {}); } catch (e) {}
  }
  function say(i) { if (!myRoom) return; try { fetch(PROXY + '/salon/say', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pid, room: myRoom, i }) }).catch(() => {}); } catch (e) {} }
  function leave() {
    if (es) { try { es.close(); } catch (e) {} es = null; }
    if (myRoom) { const rm = myRoom; myRoom = null; peers.clear();
      try { fetch(PROXY + '/salon/leave', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pid, room: rm }), keepalive: true }).catch(() => {}); } catch (e) {} }
  }
  function whisper(to, msg) { if (!myRoom || !to) return; try { fetch(PROXY + '/salon/whisper', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pid, room: myRoom, to, msg: String(msg || '').slice(0, 200) }) }).catch(() => {}); } catch (e) {} }
  function onWhisper(cb) { whisperCb = cb; }
  function onPeers(cb) { peersCb = cb; }
  function getPeers() { return peers; }
  function inBodegon() { return !!myRoom; }

  return { beat, live, enabled: true, pid, join, leave, pos, say, whisper, onWhisper, onPeers, getPeers, inBodegon };
})();
if (typeof window !== 'undefined') window.Salon = Salon;
