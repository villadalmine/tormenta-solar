// bunkermapa.js — SUB-MODO "EL PLANO DEL BÚNKER" (specs/mapas-satelites-bunkers.md, Mapa B / F2+F3+F4).
// F4: arranca en el MAPA REDONDO ROTABLE de la ciudad (8 zonas en torta): lo GIRÁS (arrastrar / ←→), y con click o
// [E] en la zona enfocada se hace ZOOM → la GRILLA de construcción de ESA zona (cada zona guarda SU búnker; siempre
// empezás con la ENTRADA DESDE TU BASE). Arriba, el RADAR con amenazas REALES (F3; el módulo 📡 identifica señales).
// Esc en la zona → volvés al redondo; Esc en el redondo → salís. Persiste por zona en localStorage (+ índice).
const BunkerMapa = (() => {
  const T = (k, p) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(k, p) : k;
  const GW = 13, GH = 7;
  const MODULES = [
    { id: 'pasillo',  emoji: '⬜', cost: 5 },
    { id: 'catre',    emoji: '🛏️', cost: 15 },
    { id: 'deposito', emoji: '📦', cost: 20 },
    { id: 'huerta',   emoji: '🌱', cost: 25 },
    { id: 'defensa',  emoji: '🛡️', cost: 30 },
    { id: 'radar',    emoji: '📡', cost: 40 },
  ];
  // las ZONAS del disco (DATA): 8 porciones — tu base es Florida (la esquina del juego)
  const ZONES = [
    { id: 'florida',  name: 'Florida',   base: true }, { id: 'lavalle',  name: 'Lavalle' },
    { id: 'obelisco', name: 'Obelisco' },              { id: 'sanTelmo', name: 'San Telmo' },
    { id: 'laBoca',   name: 'La Boca' },               { id: 'retiro',   name: 'Retiro' },
    { id: 'once',     name: 'Once' },                  { id: 'palermo',  name: 'Palermo' },
  ];

  function create(opts) {
    opts = opts || {};
    const player = opts.player || { coins: 0 };
    let threats = [], thT = 0;
    const ENT = { x: 0, y: 3 };
    let zone = 'florida', cells = {};                       // la zona ABIERTA y sus módulos
    let view = 'mundo', zoomT = 0, rot = 0, focusIdx = 0;   // vista: mundo (redondo) → zoom → zona (grilla)
    let drag = false, dragDist = 0, lastX = 0, prevDown = false;
    let cur = { x: 1, y: 3 }, selIdx = 0, done = false, exitTo = null, t = 0, msg = '', msgT = 0;
    const held = {};
    loadZone(zone);

    function setMsg(s, d = 2.5) { msg = s; msgT = d; }
    function zkey(z) { return 'ts_bunker_z_' + z; }
    function loadZone(z) {
      cells = {};
      try {
        let raw = localStorage.getItem(zkey(z));
        if (raw == null && z === 'florida') raw = localStorage.getItem('ts_bunker_v1');   // compat: el búnker viejo ES tu base
        const a = JSON.parse(raw || '[]') || [];
        for (const c of a) if (c && c.id) cells[c.x + ',' + c.y] = c.id;
      } catch (e) {}
    }
    function save() {
      try {
        const a = []; for (const k in cells) { const p = k.split(','); a.push({ x: +p[0], y: +p[1], id: cells[k] }); }
        localStorage.setItem(zkey(zone), JSON.stringify(a));
        const idx = JSON.parse(localStorage.getItem('ts_bunker_zones') || '[]') || [];
        if (!idx.includes(zone)) { idx.push(zone); localStorage.setItem('ts_bunker_zones', JSON.stringify(idx)); }
      } catch (e) {}
    }
    function modCount(z) { try { let raw = localStorage.getItem(zkey(z)); if (raw == null && z === 'florida') raw = localStorage.getItem('ts_bunker_v1'); return (JSON.parse(raw || '[]') || []).length; } catch (e) { return 0; } }
    const occupied = (x, y) => (x === ENT.x && y === ENT.y) || !!cells[x + ',' + y];
    const connected = (x, y) => occupied(x - 1, y) || occupied(x + 1, y) || occupied(x, y - 1) || occupied(x, y + 1);
    function placeAt(x, y, idx) {
      const m = MODULES[idx]; if (!m) return false;
      if (x < 0 || y < 0 || x >= GW || y >= GH || occupied(x, y)) return false;
      if (!connected(x, y)) { setMsg(T('g.bmapa.noConn')); return false; }
      if ((player.coins || 0) < m.cost) { setMsg(T('g.bmapa.poor', { n: m.cost })); return false; }
      player.coins -= m.cost; cells[x + ',' + y] = m.id; save();
      if (typeof Sfx !== 'undefined' && Sfx.pickup) Sfx.pickup();
      return true;
    }
    function removeAt(x, y) {
      const k = x + ',' + y, id = cells[k]; if (!id) return false;
      const m = MODULES.find(mm => mm.id === id); delete cells[k];
      player.coins = (player.coins || 0) + (m ? Math.floor(m.cost / 2) : 0); save(); return true;
    }
    function tap(k) { if (Input.keys[k]) { if (!held[k]) { held[k] = true; return true; } } else held[k] = false; return false; }
    function enterZone(i) { focusIdx = ((i % ZONES.length) + ZONES.length) % ZONES.length; zone = ZONES[focusIdx].id; loadZone(zone); view = 'zoom'; zoomT = 0; if (typeof Sfx !== 'undefined' && Sfx.pickup) Sfx.pickup(); }

    function update(dt) {
      t += dt; msgT -= dt;
      if (done) return;
      thT -= dt; if (thT <= 0) { thT = 1; try { threats = (opts.threats && opts.threats()) || []; } catch (e) { threats = []; } }
      if (view === 'zoom') { zoomT += dt * 2.6; if (zoomT >= 1) { zoomT = 1; view = 'zona'; } return; }
      if (view === 'mundo') {
        // girar: arrastrar con el mouse o ←/→; [E] o click = entrar a la zona enfocada (la de ARRIBA, bajo el puntero)
        const m = (typeof Input !== 'undefined' && Input.mouse) ? Input.mouse : null;
        if (m && m.down) { if (!drag) { drag = true; dragDist = 0; lastX = m.x; } const dx = m.x - lastX; rot += dx * 0.008; dragDist += Math.abs(dx); lastX = m.x; }
        else { if (drag && prevDown && dragDist < 6 && m) { const z = pickZone(m); if (z >= 0) { enterZone(z); if (m) prevDown = m.down; return; } } drag = false; }
        if (m) prevDown = m.down;
        if (Input.keys['arrowleft'] || Input.keys['a']) rot -= dt * 1.6;
        if (Input.keys['arrowright'] || Input.keys['d']) rot += dt * 1.6;
        // la zona ENFOCADA = la que quedó bajo el puntero de las 12
        const sec = Math.PI * 2 / ZONES.length;
        focusIdx = ((Math.round(-rot / sec - 0.5 - 0.25 * 0) % ZONES.length) + ZONES.length) % ZONES.length;
        focusIdx = zoneAtPointer();
        if (tap('e') || tap(' ') || tap('enter')) { enterZone(focusIdx); return; }
        if (tap('escape')) { done = true; exitTo = 'back'; }
        return;
      }
      // vista ZONA (la grilla de siempre)
      if (tap('arrowleft') || tap('a')) cur.x = Math.max(0, cur.x - 1);
      if (tap('arrowright') || tap('d')) cur.x = Math.min(GW - 1, cur.x + 1);
      if (tap('arrowup') || tap('w')) cur.y = Math.max(0, cur.y - 1);
      if (tap('arrowdown') || tap('s')) cur.y = Math.min(GH - 1, cur.y + 1);
      for (let i = 0; i < MODULES.length; i++) if (tap(String(i + 1))) selIdx = i;
      if (tap('e') || tap(' ')) placeAt(cur.x, cur.y, selIdx);
      if (tap('x')) removeAt(cur.x, cur.y);
      if (tap('escape')) { view = 'mundo'; zoomT = 0; }   // volvés al disco (Esc de nuevo = salir)
    }
    function zoneAtPointer() {   // qué porción quedó arriba (bajo el ▼)
      const sec = Math.PI * 2 / ZONES.length, up = -Math.PI / 2;
      let best = 0, bd = 99;
      for (let i = 0; i < ZONES.length; i++) { const mid = rot + i * sec + sec / 2; let d = Math.atan2(Math.sin(mid - up), Math.cos(mid - up)); d = Math.abs(d); if (d < bd) { bd = d; best = i; } }
      return best;
    }
    let _disc = null;   // geometría del último frame (para el click)
    function pickZone(m) {
      if (!_disc) return -1;
      const dx = m.x - _disc.cx, dy = m.y - _disc.cy, r = Math.hypot(dx, dy);
      if (r < _disc.r0 || r > _disc.R) return -1;
      const sec = Math.PI * 2 / ZONES.length; let a = Math.atan2(dy, dx) - rot;
      a = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      return Math.floor(a / sec) % ZONES.length;
    }

    // ───────── dibujo ─────────
    function drawRadar(ctx, VW) {
      const ry0 = 32, rh = 62;
      ctx.fillStyle = '#04130a'; ctx.fillRect(12, ry0, VW - 24, rh);
      ctx.strokeStyle = '#1f5a33'; ctx.lineWidth = 1.5; ctx.strokeRect(12, ry0, VW - 24, rh);
      for (let gx = 12; gx < VW - 12; gx += 34) { ctx.strokeStyle = 'rgba(40,120,70,0.25)'; ctx.beginPath(); ctx.moveTo(gx, ry0); ctx.lineTo(gx, ry0 + rh); ctx.stroke(); }
      const sweep = 12 + ((t * 90) % (VW - 24));
      ctx.strokeStyle = 'rgba(80,255,140,0.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sweep, ry0); ctx.lineTo(sweep, ry0 + rh); ctx.stroke();
      const hasRadar = Object.keys(cells).some(k => cells[k] === 'radar');
      if (threats.length) for (let i = 0; i < threats.length; i++) { const th = threats[i];
        const bx = 12 + th.f * (VW - 34), by = ry0 + 12 + ((i * 37) % (rh - 24));
        const glow = Math.max(0, 1 - Math.abs(bx - sweep) / 90);
        ctx.fillStyle = 'rgba(255,80,80,' + (0.35 + 0.65 * glow).toFixed(2) + ')';
        ctx.beginPath(); ctx.arc(bx, by, Math.min(6, 2 + th.n), 0, Math.PI * 2); ctx.fill();
        if (hasRadar && glow > 0.25) { ctx.fillStyle = 'rgba(140,255,170,' + glow.toFixed(2) + ')'; ctx.font = '8px monospace'; ctx.textAlign = 'left'; ctx.fillText((th.name || '?') + ' ×' + th.n, Math.min(bx + 6, VW - 110), by + 3); } }
      else { ctx.fillStyle = '#3f7a52'; ctx.font = '10px monospace'; ctx.textAlign = 'center'; ctx.fillText(T('g.bmapa.noThreat'), VW / 2, ry0 + rh / 2 + 3); }
      if (threats.length && !hasRadar) { ctx.fillStyle = '#69d68a'; ctx.font = '8px monospace'; ctx.textAlign = 'right'; ctx.fillText(T('g.bmapa.needRadar'), VW - 18, ry0 + rh - 6); }
      ctx.fillStyle = '#69d68a'; ctx.font = '9px monospace'; ctx.textAlign = 'left'; ctx.fillText('📡 ' + T('g.bmapa.radar'), 18, ry0 + 12);
      return ry0 + rh;
    }
    function drawMundo(ctx, VW, VH, scale) {
      const cy0 = drawRadar(ctx, VW);
      const cx = VW / 2, cy = cy0 + (VH - cy0) / 2 + 4;
      const R = Math.min(VW * 0.30, (VH - cy0) * 0.42) * (1 + (scale || 0) * 2.2), r0 = R * 0.28;
      _disc = { cx, cy, R, r0 };
      const sec = Math.PI * 2 / ZONES.length;
      for (let i = 0; i < ZONES.length; i++) {
        const a0 = rot + i * sec, a1 = a0 + sec, foc = i === focusIdx;
        ctx.beginPath(); ctx.moveTo(cx + r0 * Math.cos(a0), cy + r0 * Math.sin(a0));
        ctx.arc(cx, cy, R, a0, a1); ctx.lineTo(cx + r0 * Math.cos(a1), cy + r0 * Math.sin(a1)); ctx.arc(cx, cy, r0, a1, a0, true); ctx.closePath();
        ctx.fillStyle = foc ? '#2c3a52' : (i % 2 ? '#1a2130' : '#161c29'); ctx.fill();
        ctx.strokeStyle = foc ? '#ffd54f' : '#2e3a50'; ctx.lineWidth = foc ? 2 : 1; ctx.stroke();
        // nombre + lo construido (🛖 n) + estrella si es TU BASE
        const mid = a0 + sec / 2, tx = cx + (R * 0.66) * Math.cos(mid), ty = cy + (R * 0.66) * Math.sin(mid);
        const z = ZONES[i], n = modCount(z.id);
        ctx.fillStyle = foc ? '#ffe9b0' : '#9fb0c8'; ctx.font = (foc ? 'bold ' : '') + '10px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText((z.base ? '⭐' : '') + z.name, tx, ty - 7);
        ctx.fillStyle = n ? '#9be8a0' : 'rgba(160,170,190,0.55)'; ctx.font = '9px monospace'; ctx.fillText(n ? '🛖 ' + n : '—', tx, ty + 8); ctx.textBaseline = 'alphabetic';
      }
      // centro (el sol de la ciudad) + puntero ▼ arriba
      ctx.fillStyle = '#0e1420'; ctx.beginPath(); ctx.arc(cx, cy, r0 - 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('CABA', cx, cy); ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#ffd54f'; ctx.beginPath(); ctx.moveTo(cx - 7, cy - R - 12); ctx.lineTo(cx + 7, cy - R - 12); ctx.lineTo(cx, cy - R - 2); ctx.closePath(); ctx.fill();
      // la zona enfocada, grande abajo
      ctx.fillStyle = '#ffe9b0'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
      ctx.fillText((ZONES[focusIdx].base ? '⭐ ' : '') + ZONES[focusIdx].name + (ZONES[focusIdx].base ? ' — ' + T('g.bmapa.tuBase') : ''), cx, VH - 30);
      ctx.fillStyle = '#cfe8c0'; ctx.font = '10px monospace'; ctx.fillText(T('g.bmapa.mundoHint'), cx, VH - 14);
    }
    function drawZona(ctx, VW, VH) {
      const gy0 = drawRadar(ctx, VW) + 14, paletteH = 56;
      const cs = Math.floor(Math.min((VW - 48) / GW, (VH - gy0 - paletteH - 16) / GH));
      const gx0 = Math.floor((VW - GW * cs) / 2), gy1 = gy0;
      ctx.fillStyle = '#11141a'; ctx.fillRect(gx0 - 4, gy1 - 4, GW * cs + 8, GH * cs + 8);
      for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
        const px = gx0 + x * cs, py = gy1 + y * cs;
        ctx.fillStyle = ((x + y) % 2) ? '#171b23' : '#1a1f28'; ctx.fillRect(px, py, cs - 1, cs - 1);
        const id = cells[x + ',' + y];
        if (id) { const m = MODULES.find(mm => mm.id === id);
          ctx.fillStyle = '#243043'; ctx.fillRect(px + 1, py + 1, cs - 3, cs - 3);
          ctx.font = Math.floor(cs * 0.52) + 'px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(m ? m.emoji : '❓', px + cs / 2, py + cs / 2 + 1); ctx.textBaseline = 'alphabetic'; }
      }
      { const px = gx0 + ENT.x * cs, py = gy1 + ENT.y * cs;
        ctx.fillStyle = '#2c3a26'; ctx.fillRect(px + 1, py + 1, cs - 3, cs - 3);
        ctx.font = Math.floor(cs * 0.52) + 'px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🚪', px + cs / 2, py + cs / 2 + 1); ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#9be8a0'; ctx.font = '9px monospace'; ctx.textAlign = 'left'; ctx.fillText('⟵ ' + T('g.bmapa.base'), px, py + cs + 11); }
      { const px = gx0 + cur.x * cs, py = gy1 + cur.y * cs;
        const ok = !occupied(cur.x, cur.y) && connected(cur.x, cur.y) && (player.coins || 0) >= MODULES[selIdx].cost;
        ctx.strokeStyle = ok ? '#7CFC00' : (cells[cur.x + ',' + cur.y] ? '#ffd54f' : '#ff5252'); ctx.lineWidth = 2;
        ctx.strokeRect(px + 0.5, py + 0.5, cs - 2, cs - 2); }
      const py0 = gy1 + GH * cs + 12;
      ctx.textAlign = 'left';
      let px = gx0;
      for (let i = 0; i < MODULES.length; i++) { const m = MODULES[i]; const wbox = 82;
        ctx.fillStyle = i === selIdx ? '#243043' : '#141922'; ctx.fillRect(px, py0, wbox - 6, 34);
        ctx.strokeStyle = i === selIdx ? '#ffd54f' : '#2a3140'; ctx.lineWidth = i === selIdx ? 2 : 1; ctx.strokeRect(px, py0, wbox - 6, 34);
        ctx.font = '13px monospace'; ctx.fillStyle = '#fff'; ctx.fillText('[' + (i + 1) + '] ' + m.emoji, px + 5, py0 + 15);
        ctx.font = '9px monospace'; ctx.fillStyle = '#cfd8e6'; ctx.fillText(T('g.bmapa.m.' + m.id) + ' ' + m.cost + '🪙', px + 5, py0 + 28);
        px += wbox; }
    }
    function draw(ctx, VW, VH) {
      ctx.fillStyle = '#0a0c10'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#0a0a0e'; ctx.fillRect(0, 0, VW, 26);
      const zn = ZONES.find(z => z.id === zone) || ZONES[0];
      ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'left';
      ctx.fillText('📐 ' + T('g.bmapa.title') + (view !== 'mundo' ? ' — ' + (zn.base ? '⭐' : '') + zn.name : ''), 10, 18);
      ctx.textAlign = 'right'; ctx.fillStyle = '#9be8a0'; ctx.font = '10px monospace';
      ctx.fillText('🪙 ' + (player.coins || 0) + ' · ' + T(view === 'mundo' ? 'g.bmapa.mundoTop' : 'g.bmapa.hint'), VW - 10, 18);
      if (view === 'mundo') drawMundo(ctx, VW, VH, 0);
      else if (view === 'zoom') drawMundo(ctx, VW, VH, zoomT);          // el disco se AGRANDA (zoom) hacia la zona
      else drawZona(ctx, VW, VH);
      if (msgT > 0 && msg) { ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, VH - 26, VW, 26); ctx.fillStyle = '#ffe2c0'; ctx.font = '12px monospace'; ctx.fillText(msg, VW / 2, VH - 9); }
    }

    return { update, draw, placeAt, removeAt, enterZone, get done() { return done; }, get exitTo() { return exitTo; }, get view() { return view; } };
  }
  return { create };
})();
if (typeof window !== 'undefined') window.BunkerMapa = BunkerMapa;
if (typeof module !== 'undefined') module.exports = BunkerMapa;
