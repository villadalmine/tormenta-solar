// bunkermapa.js — SUB-MODO "EL PLANO DEL BÚNKER" (specs/mapas-satelites-bunkers.md, Mapa B / F2). Mapa cuadrado:
// ARRIBA la franja del RADAR (dónde están los enemigos en la superficie), abajo la GRILLA donde CONSTRUÍS tu búnker.
// Siempre empezás con la ENTRADA DESDE TU BASE (celda fija, borde izquierdo): todo módulo nuevo tiene que quedar
// CONECTADO a lo ya construido. Movés el cursor (WASD/flechas), elegís módulo ([1-6]), E coloca, X saca (devuelve la
// mitad). Se paga con monedas y PERSISTE en localStorage. F2 = construcción local; el radar es ambiental (F3 lo conecta).
const BunkerMapa = (() => {
  const T = (k, p) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(k, p) : k;
  const GW = 13, GH = 7;
  // catálogo DATA (v2): módulos que se pueden construir
  const MODULES = [
    { id: 'pasillo',  emoji: '⬜', cost: 5 },
    { id: 'catre',    emoji: '🛏️', cost: 15 },
    { id: 'deposito', emoji: '📦', cost: 20 },
    { id: 'huerta',   emoji: '🌱', cost: 25 },
    { id: 'defensa',  emoji: '🛡️', cost: 30 },
    { id: 'radar',    emoji: '📡', cost: 40 },
  ];

  function create(opts) {
    opts = opts || {};
    const player = opts.player || { coins: 0 };
    let threats = [], thT = 0;   // F3: amenazas REALES (enemigos vivos por sala) — refresca cada ~1s
    const ENT = { x: 0, y: 3 };                    // la ENTRADA desde tu base (fija, borde izquierdo)
    const cells = {};                              // "x,y" -> id de módulo
    let cur = { x: 1, y: 3 }, selIdx = 0, done = false, exitTo = null, t = 0, msg = '', msgT = 0;
    const held = {};
    load();

    function setMsg(s, d = 2.5) { msg = s; msgT = d; }
    function load() { try { const a = JSON.parse(localStorage.getItem('ts_bunker_v1') || '[]'); for (const c of a) if (c && c.id) cells[c.x + ',' + c.y] = c.id; } catch (e) {} }
    function save() { try { const a = []; for (const k in cells) { const p = k.split(','); a.push({ x: +p[0], y: +p[1], id: cells[k] }); } localStorage.setItem('ts_bunker_v1', JSON.stringify(a)); } catch (e) {} }
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

    function update(dt) {
      t += dt; msgT -= dt;
      if (done) return;
      thT -= dt; if (thT <= 0) { thT = 1; try { threats = (opts.threats && opts.threats()) || []; } catch (e) { threats = []; } }
      if (tap('arrowleft') || tap('a')) cur.x = Math.max(0, cur.x - 1);
      if (tap('arrowright') || tap('d')) cur.x = Math.min(GW - 1, cur.x + 1);
      if (tap('arrowup') || tap('w')) cur.y = Math.max(0, cur.y - 1);
      if (tap('arrowdown') || tap('s')) cur.y = Math.min(GH - 1, cur.y + 1);
      for (let i = 0; i < MODULES.length; i++) if (tap(String(i + 1))) selIdx = i;
      if (tap('e') || tap(' ')) placeAt(cur.x, cur.y, selIdx);
      if (tap('x')) removeAt(cur.x, cur.y);
      if (tap('escape')) { done = true; exitTo = 'back'; }
    }

    function draw(ctx, VW, VH) {
      ctx.fillStyle = '#0a0c10'; ctx.fillRect(0, 0, VW, VH);
      // barra superior
      ctx.fillStyle = '#0a0a0e'; ctx.fillRect(0, 0, VW, 26);
      ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'left'; ctx.fillText('📐 ' + T('g.bmapa.title'), 10, 18);
      ctx.textAlign = 'right'; ctx.fillStyle = '#9be8a0'; ctx.font = '10px monospace'; ctx.fillText('🪙 ' + (player.coins || 0) + ' · ' + T('g.bmapa.hint'), VW - 10, 18);
      // ── RADAR (franja de arriba): amenazas en la superficie ──
      const ry0 = 32, rh = 62;
      ctx.fillStyle = '#04130a'; ctx.fillRect(12, ry0, VW - 24, rh);
      ctx.strokeStyle = '#1f5a33'; ctx.lineWidth = 1.5; ctx.strokeRect(12, ry0, VW - 24, rh);
      for (let gx = 12; gx < VW - 12; gx += 34) { ctx.strokeStyle = 'rgba(40,120,70,0.25)'; ctx.beginPath(); ctx.moveTo(gx, ry0); ctx.lineTo(gx, ry0 + rh); ctx.stroke(); }
      const sweep = 12 + ((t * 90) % (VW - 24));   // línea de barrido
      ctx.strokeStyle = 'rgba(80,255,140,0.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sweep, ry0); ctx.lineTo(sweep, ry0 + rh); ctx.stroke();
      // F3: blips = enemigos VIVOS REALES por sala; con el módulo 📡 construido, además IDENTIFICÁS dónde
      const hasRadar = Object.keys(cells).some(k => cells[k] === 'radar');
      if (threats.length) for (let i = 0; i < threats.length; i++) { const th = threats[i];
        const bx = 12 + th.f * (VW - 34), by = ry0 + 12 + ((i * 37) % (rh - 24));
        const glow = Math.max(0, 1 - Math.abs(bx - sweep) / 90);
        ctx.fillStyle = 'rgba(255,80,80,' + (0.35 + 0.65 * glow).toFixed(2) + ')';
        ctx.beginPath(); ctx.arc(bx, by, Math.min(6, 2 + th.n), 0, Math.PI * 2); ctx.fill();
        if (hasRadar && glow > 0.25) { ctx.fillStyle = 'rgba(140,255,170,' + glow.toFixed(2) + ')'; ctx.font = '8px monospace'; ctx.textAlign = 'left'; ctx.fillText((th.name || '?') + ' ×' + th.n, Math.min(bx + 6, VW - 110), by + 3); }
      }
      else { ctx.fillStyle = '#3f7a52'; ctx.font = '10px monospace'; ctx.textAlign = 'center'; ctx.fillText(T('g.bmapa.noThreat'), VW / 2, ry0 + rh / 2 + 3); }
      if (threats.length && !hasRadar) { ctx.fillStyle = '#69d68a'; ctx.font = '8px monospace'; ctx.textAlign = 'right'; ctx.fillText(T('g.bmapa.needRadar'), VW - 18, ry0 + rh - 6); }
      ctx.fillStyle = '#69d68a'; ctx.font = '9px monospace'; ctx.textAlign = 'left'; ctx.fillText('📡 ' + T('g.bmapa.radar'), 18, ry0 + 12);
      // ── LA GRILLA del búnker ──
      const gy0 = ry0 + rh + 14, paletteH = 56;
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
      // la ENTRADA desde tu base (fija)
      { const px = gx0 + ENT.x * cs, py = gy1 + ENT.y * cs;
        ctx.fillStyle = '#2c3a26'; ctx.fillRect(px + 1, py + 1, cs - 3, cs - 3);
        ctx.font = Math.floor(cs * 0.52) + 'px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🚪', px + cs / 2, py + cs / 2 + 1); ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#9be8a0'; ctx.font = '9px monospace'; ctx.textAlign = 'left'; ctx.fillText('⟵ ' + T('g.bmapa.base'), px, py + cs + 11); }
      // cursor (verde si se puede colocar, rojo si no)
      { const px = gx0 + cur.x * cs, py = gy1 + cur.y * cs;
        const ok = !occupied(cur.x, cur.y) && connected(cur.x, cur.y) && (player.coins || 0) >= MODULES[selIdx].cost;
        ctx.strokeStyle = ok ? '#7CFC00' : (cells[cur.x + ',' + cur.y] ? '#ffd54f' : '#ff5252'); ctx.lineWidth = 2;
        ctx.strokeRect(px + 0.5, py + 0.5, cs - 2, cs - 2); }
      // ── paleta de módulos (abajo) ──
      const py0 = gy1 + GH * cs + 12;
      ctx.textAlign = 'left';
      let px = gx0;
      for (let i = 0; i < MODULES.length; i++) { const m = MODULES[i]; const wbox = 82;
        ctx.fillStyle = i === selIdx ? '#243043' : '#141922'; ctx.fillRect(px, py0, wbox - 6, 34);
        ctx.strokeStyle = i === selIdx ? '#ffd54f' : '#2a3140'; ctx.lineWidth = i === selIdx ? 2 : 1; ctx.strokeRect(px, py0, wbox - 6, 34);
        ctx.font = '13px monospace'; ctx.fillStyle = '#fff'; ctx.fillText('[' + (i + 1) + '] ' + m.emoji, px + 5, py0 + 15);
        ctx.font = '9px monospace'; ctx.fillStyle = '#cfd8e6'; ctx.fillText(T('g.bmapa.m.' + m.id) + ' ' + m.cost + '🪙', px + 5, py0 + 28);
        px += wbox; }
      // mensajes
      if (msgT > 0 && msg) { ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, VH - 26, VW, 26); ctx.fillStyle = '#ffe2c0'; ctx.font = '12px monospace'; ctx.fillText(msg, VW / 2, VH - 9); }
    }

    return { update, draw, placeAt, removeAt, get done() { return done; }, get exitTo() { return exitTo; } };
  }
  return { create };
})();
if (typeof window !== 'undefined') window.BunkerMapa = BunkerMapa;
if (typeof module !== 'undefined') module.exports = BunkerMapa;
