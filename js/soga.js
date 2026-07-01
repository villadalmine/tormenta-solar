// soga.js — MINI-JUEGO CO-OP "LA SOGA" (tug of war). El PIQUETE (todos los jugadores, izquierda) tira contra el
// DESALOJO / la topadora (bots, derecha). Cada [Espacio/E] = un tirón. Si llevás la soga a tu lado → GANÁS; si te
// arrastran → PERDÉS. HOST-AUTHORITATIVE: el host es dueño de la posición de la soga (aplica sus tirones + los de los
// guests por lv2-pull + la fuerza de los bots) y la transmite (lv2-state). Aditivo: sin red = vos + bots.
const Soga = (() => {
  const T = (k, p) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(k, p) : k;
  const CS = 30, W = 18, H = 15, TARGET = 100, PULL = 3.2;

  function create(opts) {
    opts = opts || {};
    const isHost = (opts.role || 'host') === 'host';
    const seats = opts.seats || [];
    const myPid = opts.myPid || 'me';
    const sendState = opts.sendState || function () {};
    const nHumans = Math.max(1, seats.length);
    const botRate = 9 + nHumans * 3;          // fuerza del desalojo (px/s hacia la derecha); escala con los humanos

    let rope = 0, phase = 'intro', done = false, exitTo = null, t = 0, sendT = 0;
    let pullFx = 0, msg = '', msgT = 0, escHeld = false, tapHeld = false, result = null, rrope = 0, rphase = 'play';
    setMsg(T('g.soga.intro'), 4.5);

    function setMsg(s, d = 3) { msg = s; msgT = d; }
    function leave(res) { result = res; phase = res; rphase = res; done = true; exitTo = 'lavalle'; }
    function tap() {   // un tirón (hacia la IZQUIERDA = a favor del piquete)
      if ((isHost ? phase : rphase) !== 'play') return; pullFx = 1; if (typeof Sfx !== 'undefined' && Sfx.pickup) Sfx.pickup();
      if (isHost) rope -= PULL; else sendPull();
    }
    function sendPull() { if (typeof Salon !== 'undefined' && Salon.whisper && opts.hostPid) Salon.whisper(opts.hostPid, JSON.stringify({ t: 'lv2-pull' })); }
    function onPull() { if (isHost && phase === 'play') rope -= PULL; }   // host: tirón de un guest
    function applyState(d) { if (!d) return; if (d.r != null) rrope = d.r; if (d.p) { rphase = d.p; if ((d.p === 'win' || d.p === 'lose') && !done) leave(d.p); } }

    function update(dt) {
      t += dt; msgT -= dt; pullFx = Math.max(0, pullFx - dt * 4);
      if (done) return;
      const tapNow = Input.keys[' '] || Input.keys['e'] || Input.keys['w'] || Input.keys['arrowup'];
      if (tapNow) { if (!tapHeld) { tapHeld = true; tap(); } } else tapHeld = false;
      if (Input.keys['escape']) { if (!escHeld) { escHeld = true; leave('flee'); return; } } else escHeld = false;
      if (isHost) {
        if (phase === 'intro') { if (msgT <= 0) phase = 'play'; return; }
        if (phase !== 'play') return;
        if (rope <= -TARGET) return leave('win');               // chequear ANTES del tirón del bot (si no, el bot re-empuja y nunca gana)
        if (rope >= TARGET) return leave('lose');
        rope += botRate * dt;                                   // el desalojo tira para su lado
        sendT -= dt; if (sendT <= 0) { sendT = 0.1; const st = { t: 'lv2-state', r: +rope.toFixed(1), p: phase }; for (const pid of seats) if (pid !== myPid) sendState(pid, st); }
      } else if (rphase === 'intro' && msgT <= 0) rphase = 'play';
    }

    function draw(ctx, VW, VH) {
      const r = isHost ? rope : rrope, ph = isHost ? phase : rphase;
      ctx.fillStyle = '#12121a'; ctx.fillRect(0, 0, VW, VH);
      for (let py = 26; py < VH; py += CS) for (let px = 0; px < VW; px += CS) { ctx.fillStyle = ((Math.floor(px / CS) + Math.floor(py / CS)) % 2) ? '#222227' : '#27272d'; ctx.fillRect(px, py, CS, CS); }
      const midY = VH * 0.52, cx = VW / 2, span = VW * 0.36;
      // zonas
      ctx.fillStyle = 'rgba(76,175,80,0.10)'; ctx.fillRect(0, midY - 60, cx, 120);
      ctx.fillStyle = 'rgba(60,90,160,0.10)'; ctx.fillRect(cx, midY - 60, cx, 120);
      // líneas de meta
      ctx.strokeStyle = '#4caf50'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - span, 40); ctx.lineTo(cx - span, VH - 40); ctx.stroke();
      ctx.strokeStyle = '#5a7ad0'; ctx.beginPath(); ctx.moveTo(cx + span, 40); ctx.lineTo(cx + span, VH - 40); ctx.stroke();
      // la SOGA (horizontal) + nudo central desplazado por r
      const knot = cx + (r / TARGET) * span;
      ctx.strokeStyle = '#b98a4a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(60, midY); ctx.lineTo(VW - 60, midY); ctx.stroke();
      ctx.fillStyle = '#c0241f'; ctx.fillRect(knot - 4, midY - 12, 8, 24);   // marca roja (el nudo)
      // equipos: piquete (izq) + desalojo (der), tirando; leve tironeo con pullFx
      const yank = pullFx * 6;
      for (let i = 0; i < Math.min(6, nHumans + 1); i++) tugFigure(ctx, 70 + i * 26 - yank, midY - 26 - (i % 2) * 6, '#3f6a4a', 1);
      for (let i = 0; i < 4; i++) tugFigure(ctx, VW - 70 - i * 26, midY - 26 - (i % 2) * 6, '#31406a', -1);
      // HUD
      ctx.fillStyle = '#0a0a0e'; ctx.fillRect(0, 0, VW, 26);
      ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'left'; ctx.fillText('✊ ' + T('g.soga.title'), 10, 18);
      ctx.textAlign = 'center'; ctx.fillStyle = '#9be8a0'; ctx.font = '11px monospace'; ctx.fillText(T('g.soga.tap'), VW / 2, 18);
      ctx.textAlign = 'right'; ctx.fillStyle = '#8fb0e0'; ctx.font = '10px monospace'; ctx.fillText(T('g.soga.eviction'), VW - 10, 18);
      if (ph === 'win' || ph === 'lose') { ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(0, VH / 2 - 30, VW, 60); ctx.textAlign = 'center'; ctx.fillStyle = ph === 'win' ? '#9be8a0' : '#ff8f8f'; ctx.font = 'bold 20px monospace'; ctx.fillText(T(ph === 'win' ? 'g.soga.win' : 'g.soga.lose'), VW / 2, VH / 2 + 7); }
      else if (msgT > 0 && msg) { ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0, VH - 30, VW, 30); ctx.fillStyle = '#ffe2c0'; ctx.font = '12px monospace'; ctx.fillText(msg, VW / 2, VH - 11); }
    }
    function tugFigure(ctx, x, y, col, dir) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(x, y + 26, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(x, y); ctx.rotate(dir * -0.18);   // inclinados tirando
      ctx.fillStyle = '#202a3a'; ctx.fillRect(-4, 14, 3, 10); ctx.fillRect(1, 14, 3, 10);
      ctx.fillStyle = col; ctx.fillRect(-6, 2, 12, 14);
      ctx.fillStyle = '#d9a878'; ctx.beginPath(); ctx.arc(0, -3, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1c1410'; ctx.beginPath(); ctx.arc(0, -5, 4.5, Math.PI, 0); ctx.fill();
      ctx.restore();
    }

    return { update, draw, applyState, onPull, tapExternal: tap,
      get done() { return done; }, get exitTo() { return exitTo; }, get result() { return result; }, get isHost() { return isHost; } };
  }
  return { create };
})();
if (typeof window !== 'undefined') window.Soga = Soga;
if (typeof module !== 'undefined') module.exports = Soga;
