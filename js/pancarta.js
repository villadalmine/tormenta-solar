// pancarta.js — MINI-JUEGO CO-OP "PINTAR LA PANCARTA" (colaborativo, pintar-por-color). La pancarta dice "VIVA PERÓN":
// las LETRAS van en CELESTE y el fondo en BLANCO (los colores de la bandera). Elegís color con [1] celeste / [2] blanco
// y pintás con el pincel (WASD) cada celda del color CORRECTO. Completás ≥90% bien antes del tiempo → GANÁS. Cuantos
// más pinten, más rápido. HOST-AUTHORITATIVE: cada jugador postea su pincel + color (Salon.pos, color en vx); el host
// pinta bajo cada pincel con SU color y transmite la grilla (lv5-state). Aditivo: sin red = vos solo.
const Pancarta = (() => {
  const T = (k, p) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(k, p) : k;
  const GW = 24, GH = 7, N = GW * GH, TARGET = 0.9, TIME = 55, BR = 1.15;
  const COL = { 1: '#74acdf', 2: '#ffffff' };     // 1 = celeste · 2 = blanco

  // plantilla: 1 = letra (celeste), 0 = fondo (blanco). Se rasteriza "VIVA PERÓN"; fallback = todo fondo (headless).
  function buildTemplate() {
    const tgt = new Uint8Array(N);
    try {
      const S = 8, cv = document.createElement('canvas'); cv.width = GW * S; cv.height = GH * S;
      const c = cv.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, GW * S, GH * S);
      c.fillStyle = '#000'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = 'bold ' + Math.floor(GH * S * 0.82) + 'px sans-serif';
      c.fillText('VIVA PERÓN', GW * S / 2, GH * S / 2 + 2);
      const img = c.getImageData(0, 0, GW * S, GH * S).data;
      if (img && img.length >= GW * S * GH * S * 4) {
        for (let cy = 0; cy < GH; cy++) for (let cx = 0; cx < GW; cx++) { let dark = false;
          for (let sy = 1; sy < S && !dark; sy++) for (let sx = 1; sx < S; sx++) { const idx = ((cy * S + sy) * GW * S + (cx * S + sx)) * 4; if (img[idx] < 120) { dark = true; break; } }
          tgt[cy * GW + cx] = dark ? 1 : 0; }
      }
    } catch (e) {}
    return tgt;
  }

  function create(opts) {
    opts = opts || {};
    const isHost = (opts.role || 'host') === 'host';
    const seats = opts.seats || [];
    const myPid = opts.myPid || 'me';
    const sendState = opts.sendState || function () {};

    const tgt = buildTemplate();
    const paint = new Uint8Array(N);               // 0 sin pintar · 1 celeste · 2 blanco
    const rpaint = new Uint8Array(N);
    const brush = { gx: GW / 2, gy: GH / 2 }; let color = 1;
    let phase = 'intro', done = false, exitTo = null, t = 0, sendT = 0;
    let msg = '', msgT = 0, escHeld = false, keyHeld = {}, result = null, rprog = 0, rphase = 'play', rtime = TIME, timeLeft = TIME;
    setMsg(T('g.pancarta.intro'), 4.5);

    function setMsg(s, d = 3) { msg = s; msgT = d; }
    function leave(res) { result = res; phase = res; rphase = res; done = true; exitTo = 'lavalle'; }
    const need = i => (tgt[i] ? 1 : 2);
    function progressOf(g) { let ok = 0; for (let i = 0; i < N; i++) if (g[i] === need(i)) ok++; return ok / N; }
    function paintAround(gx, gy, col) {
      const x0 = Math.max(0, Math.floor(gx - BR)), x1 = Math.min(GW - 1, Math.ceil(gx + BR)), y0 = Math.max(0, Math.floor(gy - BR)), y1 = Math.min(GH - 1, Math.ceil(gy + BR));
      for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) if (Math.hypot(cx + 0.5 - gx, cy + 0.5 - gy) < BR) paint[cy * GW + cx] = col;
    }
    function brushPoints() {
      const pts = [{ x: brush.gx, y: brush.gy, c: color, me: true }];
      if (typeof Salon !== 'undefined' && Salon.getPeers) { const pm = Salon.getPeers(); for (const pid of seats) { if (pid === myPid) continue; const p = pm.get(pid); if (p && p.rx != null) pts.push({ x: p.rx, y: p.ry != null ? p.ry : GH / 2, c: (p.vx === 2 ? 2 : 1) }); } }
      return pts;
    }
    function applyState(d) { if (!d) return; if (d.g) for (let i = 0; i < N && i < d.g.length; i++) rpaint[i] = d.g.charCodeAt(i) - 48; if (d.pr != null) rprog = d.pr; if (d.tl != null) rtime = d.tl; if (d.p) { rphase = d.p; if ((d.p === 'win' || d.p === 'lose') && !done) leave(d.p); } }

    function update(dt) {
      t += dt; msgT -= dt;
      if (done) return;
      if (Input.keys['1']) { if (!keyHeld['1']) { keyHeld['1'] = true; color = 1; } } else keyHeld['1'] = false;
      if (Input.keys['2']) { if (!keyHeld['2']) { keyHeld['2'] = true; color = 2; } } else keyHeld['2'] = false;
      const sp = 7 * dt; let mvx = 0, mvy = 0;
      if (Input.keys['arrowleft'] || Input.keys['a']) mvx = -1;
      if (Input.keys['arrowright'] || Input.keys['d']) mvx = 1;
      if (Input.keys['arrowup'] || Input.keys['w']) mvy = -1;
      if (Input.keys['arrowdown'] || Input.keys['s']) mvy = 1;
      brush.gx = Math.max(0, Math.min(GW, brush.gx + mvx * sp)); brush.gy = Math.max(0, Math.min(GH, brush.gy + mvy * sp));
      if (Input.keys['escape']) { if (!escHeld) { escHeld = true; leave('flee'); return; } } else escHeld = false;
      if (typeof Salon !== 'undefined' && Salon.pos && Salon.inBodegon && Salon.inBodegon()) {
        Salon.pos(Math.round(brush.gx * 10) / 10, color, undefined, Math.round(brush.gy * 10) / 10);   // color viaja en vx
        const pm = Salon.getPeers && Salon.getPeers(); const k = Math.min(1, dt * 12);
        if (pm) for (const p of pm.values()) { if (p.rx == null) p.rx = p.x != null ? p.x : GW / 2; if (p.ry == null) p.ry = p.y != null ? p.y : GH / 2; p.rx += ((p.x != null ? p.x : p.rx) - p.rx) * k; p.ry += ((p.y != null ? p.y : p.ry) - p.ry) * k; }
      }
      if (!isHost) { if (rphase === 'intro' && msgT <= 0) rphase = 'play'; return; }
      if (phase === 'intro') { if (msgT <= 0) phase = 'play'; return; }
      if (phase !== 'play') return;
      // el pincel pinta SOLO apretando E/ESPACIO (pincel neutral al moverte) — ganás pintando con intención, no barriendo
      const painting = Input.keys['e'] || Input.keys[' '];
      for (const p of brushPoints()) if (p.me ? painting : true) paintAround(p.x, p.y, p.c);
      timeLeft -= dt;
      const prog = progressOf(paint);
      if (prog >= TARGET) return leave('win');
      if (timeLeft <= 0) return leave(prog >= TARGET ? 'win' : 'lose');
      sendT -= dt; if (sendT <= 0) { sendT = 0.2; let g = ''; for (let i = 0; i < N; i++) g += paint[i]; const st = { t: 'lv5-state', g, pr: +prog.toFixed(3), tl: +timeLeft.toFixed(1), p: phase }; for (const pid of seats) if (pid !== myPid) sendState(pid, st); }
    }

    function draw(ctx, VW, VH) {
      const g = isHost ? paint : rpaint, ph = isHost ? phase : rphase, tl = isHost ? timeLeft : rtime, prog = isHost ? progressOf(paint) : rprog;
      ctx.fillStyle = '#0e0c14'; ctx.fillRect(0, 0, VW, VH);
      const pad = 30, x0 = pad, y0 = 64, bw = VW - pad * 2, bh = VH - y0 - 78, cw = bw / GW, ch = bh / GH;
      ctx.fillStyle = '#e9e2d2'; ctx.fillRect(x0 - 6, y0 - 6, bw + 12, bh + 12); ctx.strokeStyle = '#cdbf9f'; ctx.lineWidth = 2; ctx.strokeRect(x0 - 6, y0 - 6, bw + 12, bh + 12);
      for (let cy = 0; cy < GH; cy++) for (let cx = 0; cx < GW; cx++) { const i = cy * GW + cx, px = x0 + cx * cw, py = y0 + cy * ch;
        if (g[i]) { ctx.fillStyle = COL[g[i]]; ctx.fillRect(px, py, cw + 0.6, ch + 0.6); }
        // guía tenue de la plantilla (dónde va el celeste = las letras)
        if (tgt[i]) { ctx.fillStyle = g[i] ? 'rgba(0,0,0,0)' : 'rgba(116,172,223,0.28)'; ctx.fillRect(px, py, cw, ch); }
        ctx.strokeStyle = 'rgba(0,0,0,0.05)'; ctx.strokeRect(px, py, cw, ch);
        if (g[i] && g[i] !== need(i)) { ctx.fillStyle = 'rgba(200,40,40,0.22)'; ctx.fillRect(px, py, cw, ch); }   // pintado del color equivocado
      }
      const drawBrush = (gx, gy, c, mine) => { const px = x0 + gx * cw, py = y0 + gy * ch; ctx.fillStyle = COL[c] || '#888'; ctx.beginPath(); ctx.arc(px, py, BR * Math.min(cw, ch) * 0.6, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = mine ? '#1a1a1a' : 'rgba(0,0,0,0.4)'; ctx.lineWidth = mine ? 2 : 1; ctx.stroke(); };
      if (typeof Salon !== 'undefined' && Salon.getPeers && Salon.inBodegon && Salon.inBodegon()) for (const pid of seats) { if (pid === myPid) continue; const p = Salon.getPeers().get(pid); if (p && p.rx != null) drawBrush(p.rx, p.ry != null ? p.ry : GH / 2, p.vx === 2 ? 2 : 1, false); }
      drawBrush(brush.gx, brush.gy, color, true);
      // HUD
      ctx.fillStyle = '#0a0a0e'; ctx.fillRect(0, 0, VW, 26);
      ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'left'; ctx.fillText('🎨 ' + T('g.pancarta.title'), 10, 18);
      ctx.textAlign = 'center'; ctx.fillStyle = '#9be8a0'; ctx.font = '11px monospace'; ctx.fillText(Math.round(prog * 100) + '% · ' + T('g.pancarta.tap'), VW / 2, 18);
      ctx.textAlign = 'right'; ctx.fillStyle = '#ffcf6e'; ctx.font = '11px monospace'; ctx.fillText('⏱ ' + Math.max(0, Math.ceil(tl)) + 's', VW - 10, 18);
      // paleta [1] celeste / [2] blanco
      const sw = 26; for (let ci = 1; ci <= 2; ci++) { const sx = VW / 2 - 60 + (ci - 1) * 70, sy = VH - 34; ctx.fillStyle = COL[ci]; ctx.fillRect(sx, sy, sw, sw); ctx.strokeStyle = color === ci ? '#ffd54f' : '#555'; ctx.lineWidth = color === ci ? 3 : 1; ctx.strokeRect(sx, sy, sw, sw); ctx.fillStyle = '#ccc'; ctx.font = '11px monospace'; ctx.textAlign = 'left'; ctx.fillText('[' + ci + '] ' + T(ci === 1 ? 'g.pancarta.celeste' : 'g.pancarta.blanco'), sx + sw + 4, sy + 17); }
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
