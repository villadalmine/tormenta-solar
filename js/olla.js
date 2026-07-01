// olla.js — MINI-JUEGO CO-OP "REPARTO DE LA OLLA". Los vecinos SE ACERCAN a la olla haciendo cola, cada uno con
// HAMBRE de un PLATO puntual: 🌭 chori a la pomarola · 🍲 guiso popular · 🥘 locro. Servís al de ADELANTE con la tecla
// del plato que pide (1/2/3). Pero también caen CANAS 🚓 y POLÍTICOS 🎩 colados: a ESOS NO les das de comer (si los
// servís, penaliza). Servís X vecinos → GANÁS; si se van muchos con hambre (o le das de morfar a la yuta/políticos) →
// PERDÉS. HOST-AUTHORITATIVE: el host corre la cola y sirve (propio o por lv4-serve {d} de un guest) + transmite
// lv4-state. Aditivo: sin red = vos solo. La demanda escala con la cantidad de jugadores.
const Olla = (() => {
  const T = (k, p) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(k, p) : k;
  const COUNTER = 5.6, SPACING = 0.9, PATIENCE = 5.5, TARGET = 12, MAXANGRY = 6, GW = 18;
  const DISH = ['🌭', '🍲', '🥘'];                 // 0 chori a la pomarola · 1 guiso · 2 locro
  const rng = (s => () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; });

  function create(opts) {
    opts = opts || {};
    const isHost = (opts.role || 'host') === 'host';
    const seats = opts.seats || [];
    const myPid = opts.myPid || 'me';
    const sendState = opts.sendState || function () {};
    const nH = Math.max(1, seats.length);
    const spawnEvery = Math.max(0.9, 2.0 - nH * 0.18);
    const rnd = rng((opts.seed || 1) | 0);

    let queue = [];   // {kind:0 vecino|1 cana|2 politico, want, y, pat, arr}
    let served = 0, angry = 0, phase = 'intro', done = false, exitTo = null, t = 0, spawnT = 1.2, sendT = 0;
    let fx = 0, fxCol = '#7CFC00', msg = '', msgT = 0, escHeld = false, keyHeld = {}, result = null;
    let rq = [], rserved = 0, rangry = 0, rphase = 'play';
    setMsg(T('g.olla.intro'), 4.5);

    function setMsg(s, d = 3) { msg = s; msgT = d; }
    function leave(res) { result = res; phase = res; rphase = res; done = true; exitTo = 'lavalle'; }
    function serve(dish) {
      const f = queue[0]; if (!f || !f.arr) return;
      if (f.kind === 0) {                              // vecino
        if (dish === f.want) { served++; fx = 1; fxCol = '#7CFC00'; queue.shift(); if (typeof Sfx !== 'undefined' && Sfx.pickup) Sfx.pickup(); }
        else { f.pat -= 1.2; fx = 1; fxCol = '#e0b34a'; }   // plato equivocado → se impacienta
      } else {                                          // ¡le diste de comer a la yuta/político! penaliza
        angry++; fx = 1; fxCol = '#ff5252'; queue.shift();
      }
    }
    function onServe(m) { if (isHost && phase === 'play') serve((m && m.d | 0) || 0); }

    function update(dt) {
      t += dt; msgT -= dt; fx = Math.max(0, fx - dt * 3);
      if (done) return;
      // teclas 1/2/3 = servir chori/guiso/locro al de adelante
      for (let d = 0; d < 3; d++) { const k = String(d + 1); if (Input.keys[k]) { if (!keyHeld[k]) { keyHeld[k] = true; if ((isHost ? phase : rphase) === 'play') { if (isHost) serve(d); else if (typeof Salon !== 'undefined' && Salon.whisper && opts.hostPid) Salon.whisper(opts.hostPid, JSON.stringify({ t: 'lv4-serve', d })); fx = 1; } } } else keyHeld[k] = false; }
      if (Input.keys['escape']) { if (!escHeld) { escHeld = true; leave('flee'); return; } } else escHeld = false;
      if (!isHost) { if (rphase === 'intro' && msgT <= 0) rphase = 'play'; return; }
      if (phase === 'intro') { if (msgT <= 0) phase = 'play'; return; }
      if (phase !== 'play') return;
      // avanzar la cola: cada uno camina hacia su lugar (index 0 = adelante, más cerca de la olla)
      for (let i = 0; i < queue.length; i++) { const e = queue[i]; const ty = COUNTER - i * SPACING;
        if (e.y < ty - 0.02) e.y = Math.min(ty, e.y + 2.2 * dt); else { e.arr = true; e.pat -= dt; }
        if (e.pat <= 0) { if (e.kind === 0) angry++; e.gone = true; }   // vecino se va con hambre = enojo; cana/político solo se van
      }
      queue = queue.filter(e => !e.gone);
      // spawn
      spawnT -= dt; if (spawnT <= 0 && queue.length < 7) { const r = rnd(); const kind = r < 0.22 ? (r < 0.11 ? 1 : 2) : 0;   // ~22% colados (cana/político)
        queue.push({ kind, want: (rnd() * 3) | 0, y: 0.2, pat: kind === 0 ? PATIENCE : 3.5, arr: false }); spawnT = spawnEvery; }
      if (served >= TARGET) return leave('win');
      if (angry >= MAXANGRY) return leave('lose');
      sendT -= dt; if (sendT <= 0) { sendT = 0.12; const q = queue.map(e => [e.kind, e.want, +e.y.toFixed(1), e.arr ? 1 : 0]); const st = { t: 'lv4-state', q, n: served, a: angry, p: phase }; for (const pid of seats) if (pid !== myPid) sendState(pid, st); }
    }
    function applyState(d) { if (!d) return; if (d.q) rq = d.q.map(e => ({ kind: e[0], want: e[1], y: e[2], arr: e[3] })); if (d.n != null) rserved = d.n; if (d.a != null) rangry = d.a; if (d.p) { rphase = d.p; if ((d.p === 'win' || d.p === 'lose') && !done) leave(d.p); } }

    function draw(ctx, VW, VH) {
      const q = isHost ? queue : rq, n = isHost ? served : rserved, ang = isHost ? angry : rangry, ph = isHost ? phase : rphase;
      const ox = (VW - GW * 30) / 2, TX = tx => ox + tx * 30, TY = ty => 40 + ty * 30;
      ctx.fillStyle = '#14120e'; ctx.fillRect(0, 0, VW, VH);
      for (let py = 26; py < VH; py += 30) for (let px = 0; px < VW; px += 30) { ctx.fillStyle = ((Math.floor(px / 30) + Math.floor(py / 30)) % 2) ? '#26221a' : '#2b2620'; ctx.fillRect(px, py, 30, 30); }
      // el mostrador + las 3 OLLAS con su plato (abajo)
      const my = TY(COUNTER) + 34; ctx.fillStyle = '#3a2f24'; ctx.fillRect(ox, my - 6, GW * 30, 10);
      const potX = [VW / 2 - 90, VW / 2, VW / 2 + 90];
      for (let d = 0; d < 3; d++) { const x = potX[d];
        for (let i = 0; i < 2; i++) { const pp = (t * 0.6 + i * 0.5 + d) % 1; ctx.globalAlpha = 0.2 * (1 - pp); ctx.fillStyle = '#cfc8b8'; ctx.beginPath(); ctx.arc(x, my - 24 - pp * 20, 3 + pp * 5, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1;
        ctx.fillStyle = '#3a4750'; ctx.beginPath(); ctx.ellipse(x, my + 14, 30, 13, 0, 0, Math.PI * 2); ctx.fill();
        ctx.font = '18px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(DISH[d], x, my + 10);
        ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 12px monospace'; ctx.fillText('[' + (d + 1) + ']', x, my + 34); ctx.textBaseline = 'alphabetic'; }
      // la COLA de vecinos/colados (index 0 = adelante)
      for (let i = q.length - 1; i >= 0; i--) { const e = q[i]; const x = VW / 2, y = TY(e.y); const front = i === 0;
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(x, y + 14, 11, 4, 0, 0, Math.PI * 2); ctx.fill();
        const body = e.kind === 1 ? '#26324a' : e.kind === 2 ? '#3a3550' : '#5a3a2a';
        if (front) { ctx.strokeStyle = e.kind ? '#ff5252' : '#ffd54f'; ctx.lineWidth = 2; ctx.strokeRect(x - 12, y - 16, 24, 30); }
        ctx.fillStyle = body; ctx.fillRect(x - 8, y - 4, 16, 18);
        ctx.fillStyle = '#d9a878'; ctx.beginPath(); ctx.arc(x, y - 9, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1c1410'; ctx.beginPath(); ctx.arc(x, y - 12, 6, Math.PI, 0); ctx.fill();
        // qué pide / qué es
        ctx.font = '15px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const icon = e.kind === 1 ? '🚓' : e.kind === 2 ? '🎩' : DISH[e.want];
        ctx.fillStyle = 'rgba(15,12,8,0.9)'; ctx.fillRect(x - 12, y - 34, 24, 18); ctx.fillText(icon, x, y - 25); ctx.textBaseline = 'alphabetic';
        if (e.kind && front) { ctx.fillStyle = '#ff5252'; ctx.font = 'bold 9px monospace'; ctx.fillText('¡NO!', x, y - 38); }
      }
      // flash de acción
      if (fx > 0) { ctx.save(); ctx.globalAlpha = fx * 0.4; ctx.fillStyle = fxCol; ctx.fillRect(VW / 2 - 60, TY(COUNTER) - 40, 120, 60); ctx.restore(); }
      // HUD
      ctx.fillStyle = '#0a0a0e'; ctx.fillRect(0, 0, VW, 26);
      ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'left'; ctx.fillText('🍲 ' + T('g.olla.title'), 10, 18);
      ctx.textAlign = 'center'; ctx.fillStyle = '#9be8a0'; ctx.font = '11px monospace'; ctx.fillText(T('g.olla.served', { n: n, of: TARGET }), VW / 2, 18);
      ctx.textAlign = 'right'; ctx.fillStyle = ang >= MAXANGRY - 2 ? '#ff5252' : '#ffcf6e'; ctx.font = '11px monospace'; ctx.fillText('😠 ' + ang + '/' + MAXANGRY, VW - 10, 18);
      ctx.textAlign = 'center'; ctx.fillStyle = '#cfe8c0'; ctx.font = '10px monospace'; ctx.fillText(T('g.olla.tap'), VW / 2, VH - 10);
      if (ph === 'win' || ph === 'lose') { ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(0, VH / 2 - 30, VW, 60); ctx.fillStyle = ph === 'win' ? '#9be8a0' : '#ff8f8f'; ctx.font = 'bold 20px monospace'; ctx.fillText(T(ph === 'win' ? 'g.olla.win' : 'g.olla.lose'), VW / 2, VH / 2 + 7); }
      else if (msgT > 0 && msg) { ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0, 30, VW, 22); ctx.fillStyle = '#ffe2c0'; ctx.font = '12px monospace'; ctx.fillText(msg, VW / 2, 45); }
    }

    return { update, draw, applyState, onServe, serveExternal: serve,
      get done() { return done; }, get exitTo() { return exitTo; }, get result() { return result; }, get isHost() { return isHost; } };
  }
  return { create };
})();
if (typeof window !== 'undefined') window.Olla = Olla;
if (typeof module !== 'undefined') module.exports = Olla;
