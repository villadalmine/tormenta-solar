// pancarta.js — MINI-JUEGO CO-OP "PINTAR LA PANCARTA" (colaborativo). Entre todos PINTAN una pancarta gigante: movés
// el pincel (WASD) y vas pintando las celdas. Llená la pancarta (≥90%) antes de que se acabe el tiempo → GANÁS. Cuantos
// más pinten, más rápido. HOST-AUTHORITATIVE: cada jugador postea la pos de SU pincel (Salon.pos); el host pinta las
// celdas bajo CADA pincel, corre el reloj y transmite la grilla (lv5-state). Aditivo: sin red = vos solo pintando.
const Pancarta = (() => {
  const T = (k, p) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(k, p) : k;
  const GW = 18, GH = 9, N = GW * GH, TARGET = 0.9, TIME = 45, BR = 1.35;   // BR = radio del pincel (celdas)

  function create(opts) {
    opts = opts || {};
    const isHost = (opts.role || 'host') === 'host';
    const seats = opts.seats || [];
    const myPid = opts.myPid || 'me';
    const sendState = opts.sendState || function () {};

    const grid = new Uint8Array(N);                 // 0/1 por celda (host autoritativo)
    let rgrid = new Uint8Array(N);                  // guest: recibida
    const brush = { gx: GW / 2, gy: GH / 2 };
    let painted = 0, timeLeft = TIME, phase = 'intro', done = false, exitTo = null, t = 0, sendT = 0;
    let msg = '', msgT = 0, escHeld = false, result = null, rprog = 0, rphase = 'play', rtime = TIME;
    setMsg(T('g.pancarta.intro'), 4);

    function setMsg(s, d = 3) { msg = s; msgT = d; }
    function leave(res) { result = res; phase = res; rphase = res; done = true; exitTo = 'lavalle'; }
    function paintAround(gx, gy) {   // pinta las celdas dentro del radio del pincel (host)
      const x0 = Math.max(0, Math.floor(gx - BR)), x1 = Math.min(GW - 1, Math.ceil(gx + BR));
      const y0 = Math.max(0, Math.floor(gy - BR)), y1 = Math.min(GH - 1, Math.ceil(gy + BR));
      for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) if (Math.hypot(cx + 0.5 - gx, cy + 0.5 - gy) < BR) { const i = cy * GW + cx; if (!grid[i]) { grid[i] = 1; painted++; } }
    }
    function brushPoints() {   // el propio + los peers (Salon.pos)
      const pts = [{ x: brush.gx, y: brush.gy }];
      if (typeof Salon !== 'undefined' && Salon.getPeers) { const pm = Salon.getPeers(); for (const pid of seats) { if (pid === myPid) continue; const p = pm.get(pid); if (p && p.rx != null) pts.push({ x: p.rx, y: p.ry != null ? p.ry : GH / 2 }); } }
      return pts;
    }
    function applyState(d) { if (!d) return; if (d.g) { for (let i = 0; i < N && i < d.g.length; i++) rgrid[i] = d.g.charCodeAt(i) === 49 ? 1 : 0; } if (d.pr != null) rprog = d.pr; if (d.tl != null) rtime = d.tl; if (d.p) { rphase = d.p; if ((d.p === 'win' || d.p === 'lose') && !done) leave(d.p); } }

    function update(dt) {
      t += dt; msgT -= dt;
      if (done) return;
      const sp = 7 * dt; let mvx = 0, mvy = 0;
      if (Input.keys['arrowleft'] || Input.keys['a']) mvx = -1;
      if (Input.keys['arrowright'] || Input.keys['d']) mvx = 1;
      if (Input.keys['arrowup'] || Input.keys['w']) mvy = -1;
      if (Input.keys['arrowdown'] || Input.keys['s']) mvy = 1;
      brush.gx = Math.max(0, Math.min(GW, brush.gx + mvx * sp)); brush.gy = Math.max(0, Math.min(GH, brush.gy + mvy * sp));
      if (Input.keys['escape']) { if (!escHeld) { escHeld = true; leave('flee'); return; } } else escHeld = false;
      // posteo la pos de MI pincel (para que el host pinte bajo él) + interpolo peers
      if (typeof Salon !== 'undefined' && Salon.pos && Salon.inBodegon && Salon.inBodegon()) {
        Salon.pos(Math.round(brush.gx * 10) / 10, 0, undefined, Math.round(brush.gy * 10) / 10);
        const pm = Salon.getPeers && Salon.getPeers(); const k = Math.min(1, dt * 12);
        if (pm) for (const p of pm.values()) { if (p.rx == null) p.rx = p.x != null ? p.x : GW / 2; if (p.ry == null) p.ry = p.y != null ? p.y : GH / 2; p.rx += ((p.x != null ? p.x : p.rx) - p.rx) * k; p.ry += ((p.y != null ? p.y : p.ry) - p.ry) * k; }
      }
      if (!isHost) { if (rphase === 'intro' && msgT <= 0) rphase = 'play'; return; }
      if (phase === 'intro') { if (msgT <= 0) phase = 'play'; return; }
      if (phase !== 'play') return;
      for (const p of brushPoints()) paintAround(p.x, p.y);
      timeLeft -= dt;
      const prog = painted / N;
      if (prog >= TARGET) return leave('win');
      if (timeLeft <= 0) return leave(prog >= TARGET ? 'win' : 'lose');
      sendT -= dt; if (sendT <= 0) { sendT = 0.18; let g = ''; for (let i = 0; i < N; i++) g += grid[i] ? '1' : '0'; const st = { t: 'lv5-state', g, pr: +prog.toFixed(3), tl: +timeLeft.toFixed(1), p: phase }; for (const pid of seats) if (pid !== myPid) sendState(pid, st); }
    }

    function draw(ctx, VW, VH) {
      const g = isHost ? grid : rgrid, ph = isHost ? phase : rphase, tl = isHost ? timeLeft : rtime;
      const prog = isHost ? (painted / N) : rprog;
      ctx.fillStyle = '#0e0c14'; ctx.fillRect(0, 0, VW, VH);
      // la pancarta (tela) centrada
      const pad = 40, x0 = pad, y0 = 60, bw = VW - pad * 2, bh = VH - y0 - 70, cw = bw / GW, ch = bh / GH;
      ctx.fillStyle = '#f3ead8'; ctx.fillRect(x0 - 6, y0 - 6, bw + 12, bh + 12);
      ctx.strokeStyle = '#cdbf9f'; ctx.lineWidth = 2; ctx.strokeRect(x0 - 6, y0 - 6, bw + 12, bh + 12);
      // celdas
      for (let cy = 0; cy < GH; cy++) for (let cx = 0; cx < GW; cx++) { const i = cy * GW + cx; const px = x0 + cx * cw, py = y0 + cy * ch;
        if (g[i]) { ctx.fillStyle = ((cx + cy) % 2) ? '#b3141a' : '#c81f24'; ctx.fillRect(px, py, cw + 0.5, ch + 0.5); }
        else { ctx.fillStyle = 'rgba(0,0,0,0.04)'; ctx.strokeStyle = 'rgba(0,0,0,0.06)'; ctx.strokeRect(px, py, cw, ch); } }
      // texto guía tenue "VIVA PERÓN" (lo que queda pintado)
      ctx.fillStyle = 'rgba(120,20,20,0.10)'; ctx.font = 'bold ' + Math.floor(bh * 0.5) + 'px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('VIVA PERÓN', x0 + bw / 2, y0 + bh / 2); ctx.textBaseline = 'alphabetic';
      // pinceles: el propio + los peers
      const drawBrush = (gx, gy, col) => { const px = x0 + gx * cw, py = y0 + gy * ch; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(px, py, BR * Math.min(cw, ch) * 0.7, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#3a2a1a'; ctx.fillRect(px - 1.5, py, 3, 14); };
      if (typeof Salon !== 'undefined' && Salon.getPeers && Salon.inBodegon && Salon.inBodegon()) for (const pid of seats) { if (pid === myPid) continue; const p = Salon.getPeers().get(pid); if (p && p.rx != null) drawBrush(p.rx, p.ry != null ? p.ry : GH / 2, 'rgba(80,140,220,0.5)'); }
      drawBrush(brush.gx, brush.gy, 'rgba(120,200,120,0.6)');
      // HUD
      ctx.fillStyle = '#0a0a0e'; ctx.fillRect(0, 0, VW, 26);
      ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'left'; ctx.fillText('🎨 ' + T('g.pancarta.title'), 10, 18);
      ctx.textAlign = 'center'; ctx.fillStyle = '#9be8a0'; ctx.font = '11px monospace'; ctx.fillText(Math.round(prog * 100) + '% · ' + T('g.pancarta.tap'), VW / 2, 18);
      ctx.textAlign = 'right'; ctx.fillStyle = '#ffcf6e'; ctx.font = '11px monospace'; ctx.fillText('⏱ ' + Math.max(0, Math.ceil(tl)) + 's', VW - 10, 18);
      // barra de progreso
      ctx.fillStyle = '#331'; ctx.fillRect(x0, VH - 30, bw, 10); ctx.fillStyle = prog >= TARGET ? '#7CFC00' : '#e0b34a'; ctx.fillRect(x0, VH - 30, bw * Math.min(1, prog / TARGET), 10); ctx.strokeStyle = '#000'; ctx.strokeRect(x0, VH - 30, bw, 10);
      if (ph === 'win' || ph === 'lose') { ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(0, VH / 2 - 30, VW, 60); ctx.textAlign = 'center'; ctx.fillStyle = ph === 'win' ? '#9be8a0' : '#ff8f8f'; ctx.font = 'bold 20px monospace'; ctx.fillText(T(ph === 'win' ? 'g.pancarta.win' : 'g.pancarta.lose'), VW / 2, VH / 2 + 7); }
      else if (msgT > 0 && msg) { ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0, 30, VW, 22); ctx.fillStyle = '#ffe2c0'; ctx.font = '12px monospace'; ctx.fillText(msg, VW / 2, 45); }
    }

    return { update, draw, applyState,
      get done() { return done; }, get exitTo() { return exitTo; }, get result() { return result; }, get isHost() { return isHost; } };
  }
  return { create };
})();
if (typeof window !== 'undefined') window.Pancarta = Pancarta;
if (typeof module !== 'undefined') module.exports = Pancarta;
