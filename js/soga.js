// soga.js — MINI-JUEGO CO-OP "EMPUJAR EL PATRULLERO" (antes "la soga"). El PIQUETE (todos los jugadores) EMPUJA un
// PATRULLERO contra la BARRICADA DE CANAS que están MORFANDO (distraídos → empujan flojo). Cada [Espacio/E] = un
// empujón; llevás el patrullero hasta los canas → GANÁS; si te lo devuelven a tu lado → PERDÉS. HOST-AUTHORITATIVE:
// el host es dueño de la posición del patrullero y la transmite (lv2-state); guests mandan lv2-pull. (mesa 'soga',
// state 'soga' — se mantienen los nombres internos para no recablear). Aditivo: sin red = vos + los canas.
const Soga = (() => {
  const T = (k, p) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(k, p) : k;
  const TARGET = 100, PUSH = 3.2;

  function create(opts) {
    opts = opts || {};
    const isHost = (opts.role || 'host') === 'host';
    const seats = opts.seats || [];
    const myPid = opts.myPid || 'me';
    const sendState = opts.sendState || function () {};
    const nHumans = Math.max(1, seats.length);
    const copRate = 8 + nHumans * 2.5;               // los canas empujan flojo (están morfando); escala con los humanos

    let car = 0, phase = 'intro', done = false, exitTo = null, t = 0, sendT = 0;   // car<0 = hacia los canas (ganar)
    let pushFx = 0, msg = '', msgT = 0, escHeld = false, tapHeld = false, result = null, rcar = 0, rphase = 'play';
    setMsg(T('g.soga.intro'), 4.5);

    function setMsg(s, d = 3) { msg = s; msgT = d; }
    function leave(res) { result = res; phase = res; rphase = res; done = true; exitTo = 'lavalle'; }
    function tap() {
      if ((isHost ? phase : rphase) !== 'play') return; pushFx = 1; if (typeof Sfx !== 'undefined' && Sfx.pickup) Sfx.pickup();
      if (isHost) car -= PUSH; else sendPush();
    }
    function sendPush() { if (typeof Salon !== 'undefined' && Salon.whisper && opts.hostPid) Salon.whisper(opts.hostPid, JSON.stringify({ t: 'lv2-pull' })); }
    function onPull() { if (isHost && phase === 'play') car -= PUSH; }
    function applyState(d) { if (!d) return; if (d.r != null) rcar = d.r; if (d.p) { rphase = d.p; if ((d.p === 'win' || d.p === 'lose') && !done) leave(d.p); } }

    function update(dt) {
      t += dt; msgT -= dt; pushFx = Math.max(0, pushFx - dt * 4);
      if (done) return;
      const tapNow = Input.keys[' '] || Input.keys['e'] || Input.keys['w'] || Input.keys['arrowup'] || Input.keys['arrowright'];
      if (tapNow) { if (!tapHeld) { tapHeld = true; tap(); } } else tapHeld = false;
      if (Input.keys['escape']) { if (!escHeld) { escHeld = true; leave('flee'); return; } } else escHeld = false;
      if (isHost) {
        if (phase === 'intro') { if (msgT <= 0) phase = 'play'; return; }
        if (phase !== 'play') return;
        if (car <= -TARGET) return leave('win');                 // el patrullero llegó a los canas
        if (car >= TARGET) return leave('lose');                 // te lo devolvieron
        car += copRate * dt;                                     // los canas lo empujan de vuelta (flojo, morfando)
        sendT -= dt; if (sendT <= 0) { sendT = 0.1; const st = { t: 'lv2-state', r: +car.toFixed(1), p: phase }; for (const pid of seats) if (pid !== myPid) sendState(pid, st); }
      } else if (rphase === 'intro' && msgT <= 0) rphase = 'play';
    }

    function draw(ctx, VW, VH) {
      const r = isHost ? car : rcar, ph = isHost ? phase : rphase;
      ctx.fillStyle = '#12121a'; ctx.fillRect(0, 0, VW, VH);
      for (let py = 26; py < VH; py += 30) for (let px = 0; px < VW; px += 30) { ctx.fillStyle = ((Math.floor(px / 30) + Math.floor(py / 30)) % 2) ? '#222227' : '#27272d'; ctx.fillRect(px, py, 30, 30); }
      const midY = VH * 0.54, cx = VW / 2, span = VW * 0.34;
      // zona piquete (izq) / barricada de canas (der)
      ctx.fillStyle = 'rgba(76,175,80,0.08)'; ctx.fillRect(0, midY - 70, cx, 140);
      ctx.fillStyle = 'rgba(60,90,160,0.10)'; ctx.fillRect(cx, midY - 70, cx, 140);
      // BARRICADA DE CANAS (derecha) — vallas + canas morfando
      const gx = cx + span;
      ctx.strokeStyle = '#5a7ad0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(gx, 46); ctx.lineTo(gx, VH - 40); ctx.stroke();
      for (let i = 0; i < 4; i++) { const yy = midY - 40 + i * 26; cana(ctx, gx + 26, yy, t + i); }
      // línea de partida del piquete (izq)
      ctx.strokeStyle = '#4caf50'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - span, 46); ctx.lineTo(cx - span, VH - 40); ctx.stroke();
      // PATRULLERO (marca central), empujado por r (r<0 → va a la derecha, hacia los canas)
      const carX = cx - (r / TARGET) * span, yank = pushFx * 5;
      patrullero(ctx, carX + yank, midY, t);
      // piquete empujando (izq del patrullero)
      for (let i = 0; i < Math.min(6, nHumans + 1); i++) pusher(ctx, carX - 34 - i * 22 + yank, midY - 22 - (i % 2) * 6);
      // HUD
      ctx.fillStyle = '#0a0a0e'; ctx.fillRect(0, 0, VW, 26);
      ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'left'; ctx.fillText('🚔 ' + T('g.soga.title'), 10, 18);
      ctx.textAlign = 'center'; ctx.fillStyle = '#9be8a0'; ctx.font = '11px monospace'; ctx.fillText(T('g.soga.tap'), VW / 2, 18);
      ctx.textAlign = 'right'; ctx.fillStyle = '#8fb0e0'; ctx.font = '10px monospace'; ctx.fillText(T('g.soga.eviction'), VW - 10, 18);
      if (ph === 'win' || ph === 'lose') { ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(0, VH / 2 - 30, VW, 60); ctx.textAlign = 'center'; ctx.fillStyle = ph === 'win' ? '#9be8a0' : '#ff8f8f'; ctx.font = 'bold 20px monospace'; ctx.fillText(T(ph === 'win' ? 'g.soga.win' : 'g.soga.lose'), VW / 2, VH / 2 + 7); }
      else if (msgT > 0 && msg) { ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0, VH - 30, VW, 30); ctx.fillStyle = '#ffe2c0'; ctx.font = '12px monospace'; ctx.fillText(msg, VW / 2, VH - 11); }
    }
    function patrullero(ctx, x, y, tt) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x, y + 16, 30, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#eceef2'; ctx.fillRect(x - 30, y - 12, 60, 26);
      ctx.fillStyle = '#22314f'; ctx.fillRect(x - 30, y - 2, 60, 8);           // franja
      ctx.fillStyle = '#0e1418'; ctx.fillRect(x - 20, y - 10, 16, 8); ctx.fillRect(x + 4, y - 10, 16, 8);   // ventanas
      const bl = Math.sin(tt * 8) > 0; ctx.fillStyle = bl ? '#e11' : '#611'; ctx.fillRect(x - 8, y - 17, 7, 4); ctx.fillStyle = bl ? '#22f' : '#116'; ctx.fillRect(x + 1, y - 17, 7, 4);   // baliza
      ctx.fillStyle = '#141414'; ctx.beginPath(); ctx.arc(x - 20, y + 14, 5, 0, Math.PI * 2); ctx.arc(x + 20, y + 14, 5, 0, Math.PI * 2); ctx.fill();
    }
    function pusher(ctx, x, y) {   // piquetero empujando (inclinado hacia la derecha)
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(x, y + 26, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(x, y); ctx.rotate(0.2);
      ctx.fillStyle = '#202a3a'; ctx.fillRect(-4, 14, 3, 10); ctx.fillRect(1, 14, 3, 10);
      ctx.fillStyle = '#3f6a4a'; ctx.fillRect(-6, 2, 12, 14);
      ctx.fillStyle = '#d9a878'; ctx.beginPath(); ctx.arc(0, -3, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1c1410'; ctx.beginPath(); ctx.arc(0, -5, 4.5, Math.PI, 0); ctx.fill();
      ctx.restore();
    }
    function cana(ctx, x, y, tt) {   // cana morfando detrás de la valla
      ctx.fillStyle = '#31406a'; ctx.fillRect(x - 6, y - 6, 12, 16);
      ctx.fillStyle = '#0e1a24'; ctx.fillRect(x - 7, y - 4, 14, 4);
      ctx.fillStyle = '#d9a878'; ctx.beginPath(); ctx.arc(x, y - 10, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#12203a'; ctx.fillRect(x - 5, y - 15, 10, 5);          // gorra
      // pancho/choripán en la mano (morfando)
      if (Math.sin(tt * 3) > -0.3) { ctx.fillStyle = '#c98a3a'; ctx.fillRect(x + 5, y - 8, 8, 3); ctx.fillStyle = '#7a3b1a'; ctx.fillRect(x + 6, y - 7.5, 6, 2); }
    }

    return { update, draw, applyState, onPull, tapExternal: tap,
      get done() { return done; }, get exitTo() { return exitTo; }, get result() { return result; }, get isHost() { return isHost; } };
  }
  return { create };
})();
if (typeof window !== 'undefined') window.Soga = Soga;
if (typeof module !== 'undefined') module.exports = Soga;
