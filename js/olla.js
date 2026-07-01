// olla.js — MINI-JUEGO CO-OP "REPARTO DE LA OLLA" (reacción/management). Los vecinos hacen COLA con hambre (barra de
// paciencia que baja); apretás [E]/ESPACIO para servir un plato al MÁS urgente. Servís X → GANÁS; si se van demasiados
// con hambre (enojados) → PERDÉS. HOST-AUTHORITATIVE: el host spawnea la cola, corre la paciencia y sirve (propio o por
// lv4-serve de un guest); transmite el estado (lv4-state). Aditivo: sin red = vos solo repartiendo. Escala con jugadores.
const Olla = (() => {
  const T = (k, p) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(k, p) : k;
  const SLOTS = 6, PATIENCE = 4.2, TARGET = 12, MAXANGRY = 6;

  function create(opts) {
    opts = opts || {};
    const isHost = (opts.role || 'host') === 'host';
    const seats = opts.seats || [];
    const myPid = opts.myPid || 'me';
    const sendState = opts.sendState || function () {};
    const nH = Math.max(1, seats.length);
    const spawnEvery = Math.max(0.55, 1.3 - nH * 0.12);       // más jugadores → más demanda

    const slots = new Array(SLOTS).fill(0);                    // 0 = vacío · >0 = paciencia restante
    let served = 0, angry = 0, phase = 'intro', done = false, exitTo = null, t = 0, spawnT = 1, sendT = 0;
    let serveFx = 0, msg = '', msgT = 0, escHeld = false, tapHeld = false, result = null;
    let rslots = slots.slice(), rserved = 0, rangry = 0, rphase = 'play';
    setMsg(T('g.olla.intro'), 4);

    function setMsg(s, d = 3) { msg = s; msgT = d; }
    function leave(res) { result = res; phase = res; rphase = res; done = true; exitTo = 'lavalle'; }
    function serveUrgent() {   // sirve al vecino con MENOS paciencia
      let idx = -1, min = 1e9; for (let i = 0; i < SLOTS; i++) if (slots[i] > 0 && slots[i] < min) { min = slots[i]; idx = i; }
      if (idx < 0) return false; slots[idx] = 0; served++; serveFx = 1; if (typeof Sfx !== 'undefined' && Sfx.pickup) Sfx.pickup(); return true;
    }
    function tap() {
      if ((isHost ? phase : rphase) !== 'play') return;
      if (isHost) serveUrgent();
      else { serveFx = 1; if (typeof Salon !== 'undefined' && Salon.whisper && opts.hostPid) Salon.whisper(opts.hostPid, JSON.stringify({ t: 'lv4-serve' })); }
    }
    function onServe() { if (isHost && phase === 'play') serveUrgent(); }
    function applyState(d) { if (!d) return; if (d.s) rslots = d.s; if (d.n != null) rserved = d.n; if (d.a != null) rangry = d.a; if (d.p) { rphase = d.p; if ((d.p === 'win' || d.p === 'lose') && !done) leave(d.p); } }

    function update(dt) {
      t += dt; msgT -= dt; serveFx = Math.max(0, serveFx - dt * 4);
      if (done) return;
      const tapNow = Input.keys[' '] || Input.keys['e'] || Input.keys['w'] || Input.keys['arrowup'];
      if (tapNow) { if (!tapHeld) { tapHeld = true; tap(); } } else tapHeld = false;
      if (Input.keys['escape']) { if (!escHeld) { escHeld = true; leave('flee'); return; } } else escHeld = false;
      if (!isHost) { if (rphase === 'intro' && msgT <= 0) rphase = 'play'; return; }
      if (phase === 'intro') { if (msgT <= 0) phase = 'play'; return; }
      if (phase !== 'play') return;
      // paciencia baja; el que llega a 0 se va ENOJADO
      for (let i = 0; i < SLOTS; i++) if (slots[i] > 0) { slots[i] -= dt; if (slots[i] <= 0) { slots[i] = 0; angry++; } }
      // spawn de vecinos en slots vacíos
      spawnT -= dt; if (spawnT <= 0) { const empty = []; for (let i = 0; i < SLOTS; i++) if (slots[i] === 0) empty.push(i); if (empty.length) { slots[empty[(Math.random() * empty.length) | 0]] = PATIENCE; } spawnT = spawnEvery; }
      if (served >= TARGET) return leave('win');
      if (angry >= MAXANGRY) return leave('lose');
      sendT -= dt; if (sendT <= 0) { sendT = 0.12; const st = { t: 'lv4-state', s: slots.map(v => +v.toFixed(1)), n: served, a: angry, p: phase }; for (const pid of seats) if (pid !== myPid) sendState(pid, st); }
    }

    function draw(ctx, VW, VH) {
      const sl = isHost ? slots : rslots, n = isHost ? served : rserved, ang = isHost ? angry : rangry, ph = isHost ? phase : rphase;
      ctx.fillStyle = '#14120e'; ctx.fillRect(0, 0, VW, VH);
      for (let py = 26; py < VH; py += 30) for (let px = 0; px < VW; px += 30) { ctx.fillStyle = ((Math.floor(px / 30) + Math.floor(py / 30)) % 2) ? '#26221a' : '#2b2620'; ctx.fillRect(px, py, 30, 30); }
      // la OLLA humeante (centro-abajo)
      const cx = VW / 2, oy = VH - 70;
      for (let i = 0; i < 3; i++) { const ph2 = (t * 0.6 + i * 0.4) % 1; ctx.globalAlpha = 0.25 * (1 - ph2); ctx.fillStyle = '#cfc8b8'; ctx.beginPath(); ctx.arc(cx + Math.sin(t + i) * 8, oy - 20 - ph2 * 34, 4 + ph2 * 8, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1;
      ctx.fillStyle = '#3a4750'; ctx.beginPath(); ctx.ellipse(cx, oy, 46, 22, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5a3a1a'; ctx.beginPath(); ctx.ellipse(cx, oy - 6, 34, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = serveFx > 0.5 ? '#fff' : '#ffd54f'; ctx.font = 'bold 20px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🍲', cx, oy - 4); ctx.textBaseline = 'alphabetic';
      // la COLA de vecinos (slots) con barra de paciencia
      const cols = SLOTS, gap = VW / (cols + 1);
      for (let i = 0; i < cols; i++) { const x = gap * (i + 1), y = 120; if (sl[i] > 0) {
        const pr = Math.max(0, Math.min(1, sl[i] / PATIENCE));
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(x, y + 26, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = pr > 0.5 ? '#3f6a4a' : pr > 0.25 ? '#b0842a' : '#b0392a'; ctx.fillRect(x - 8, y - 4, 16, 20);
        ctx.fillStyle = '#d9a878'; ctx.beginPath(); ctx.arc(x, y - 9, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1c1410'; ctx.beginPath(); ctx.arc(x, y - 12, 6, Math.PI, 0); ctx.fill();
        if (pr < 0.3) { ctx.fillStyle = '#ff5252'; ctx.font = '11px monospace'; ctx.fillText('!', x, y - 20); }
        ctx.fillStyle = '#222'; ctx.fillRect(x - 12, y + 32, 24, 5); ctx.fillStyle = pr > 0.5 ? '#7CFC00' : pr > 0.25 ? '#ffd54f' : '#ff5252'; ctx.fillRect(x - 12, y + 32, 24 * pr, 5);
      } }
      // HUD
      ctx.fillStyle = '#0a0a0e'; ctx.fillRect(0, 0, VW, 26);
      ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'left'; ctx.fillText('🍲 ' + T('g.olla.title'), 10, 18);
      ctx.textAlign = 'center'; ctx.fillStyle = '#9be8a0'; ctx.font = '11px monospace'; ctx.fillText(T('g.olla.served', { n: n, of: TARGET }), cx, 18);
      ctx.textAlign = 'right'; ctx.fillStyle = ang >= MAXANGRY - 2 ? '#ff5252' : '#ffcf6e'; ctx.font = '11px monospace'; ctx.fillText('😠 ' + ang + '/' + MAXANGRY, VW - 10, 18);
      ctx.textAlign = 'center'; ctx.fillStyle = '#cfe8c0'; ctx.font = '10px monospace'; ctx.fillText(T('g.olla.tap'), cx, VH - 12);
      if (ph === 'win' || ph === 'lose') { ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(0, VH / 2 - 30, VW, 60); ctx.fillStyle = ph === 'win' ? '#9be8a0' : '#ff8f8f'; ctx.font = 'bold 20px monospace'; ctx.fillText(T(ph === 'win' ? 'g.olla.win' : 'g.olla.lose'), cx, VH / 2 + 7); }
      else if (msgT > 0 && msg) { ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0, 30, VW, 22); ctx.fillStyle = '#ffe2c0'; ctx.font = '12px monospace'; ctx.fillText(msg, cx, 45); }
    }

    return { update, draw, applyState, onServe, tapExternal: tap,
      get done() { return done; }, get exitTo() { return exitTo; }, get result() { return result; }, get isHost() { return isHost; } };
  }
  return { create };
})();
if (typeof window !== 'undefined') window.Olla = Olla;
if (typeof module !== 'undefined') module.exports = Olla;
