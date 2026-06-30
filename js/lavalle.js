// lavalle.js — SUB-MODO "Calle Lavalle / el piquete" VISTA DE ARRIBA-DE FRENTE (specs/lavalle.md, Etapa 1.5). En vez de
// la perspectiva side-scroller (no parecía piquete), Lavalle es un sub-modo top-down: entrás desde ABAJO (venís de
// Florida) y tenés el piquete DE FRENTE — el corte (vallas/barricada) y el OBELISCO al fondo, tachos prendidos fuego,
// olla popular, pancartas, y la gente a los costados. Caminás hacia arriba; volvés caminando al borde de abajo.
// Mismo patrón aislado que bodegon.js/telo.js. Sin combate (es ambiental). Cumbia al palo. Degradación: si el módulo
// no está, la sala 'lavalle' queda como side-scroller (fallback).
const Lavalle = (() => {
  const T = (k, p) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(k, p) : k;
  const CS = 30, W = 18, H = 15;

  function create() {
    const map = Array.from({ length: H }, () => new Array(W).fill(0));
    for (let x = 0; x < W; x++) { map[0][x] = 1; map[1][x] = 1; }     // arriba: el CORTE (barricada) = pared
    for (let y = 0; y < H; y++) { map[y][0] = 1; map[y][W - 1] = 1; } // costados
    // abajo abierto (por ahí volvés a Florida); el borde inferior es la "salida"
    const pal = { floor: '#26262b', floor2: '#2c2c32', wall: '#3a3a42', line: '#5a5a48' };
    const player = { x: 9 * CS, y: (H - 1.5) * CS, r: 11, dir: -1 };
    // tachos prendidos fuego (animados): {x,y en tiles}
    const fires = [{ x: 3, y: 6 }, { x: 8.5, y: 4.2 }, { x: 14, y: 6 }, { x: 4.5, y: 10 }, { x: 13.5, y: 10 }];
    const olla = { x: 9, y: 8 };
    const banners = [{ x: 2.4, y: 5, kind: 'peron' }, { x: 15.4, y: 5, kind: 'che' }, { x: 6, y: 3, kind: 'che' }, { x: 12, y: 3, kind: 'peron' }];
    // la GENTE del piquete, a los costados (izq/der). emoji + nombre + frase (se muestra cerca).
    const folks = [
      { x: 3, y: 8.5,  e: '🧒', name: T('g.lavalle.npc.pibe'),   line: T('g.lavalle.line.pibe') },
      { x: 4.4, y: 12, e: '🧒', name: T('g.lavalle.npc.pibita'), line: T('g.lavalle.line.pibita') },
      { x: 2.4, y: 10.6, e: '🧉', name: T('g.lavalle.npc.rosa'),  line: T('g.lavalle.line.rosa') },
      { x: 15.4, y: 8.5, e: '🪅', name: T('g.lavalle.npc.copado'), line: T('g.lavalle.line.copado') },
      { x: 14.2, y: 12, e: '💃', name: T('g.lavalle.npc.vecina'), line: T('g.lavalle.line.vecina') },
      { x: 6.2, y: 9, e: '🪧', name: T('g.lavalle.npc.fierro'), line: T('g.lavalle.line.fierro') },
      { x: 11.8, y: 9, e: '🛠️', name: T('g.lavalle.npc.tumbera'), line: T('g.lavalle.line.tumbera') },
      { x: 9, y: 6.5, e: '🍲', name: T('g.lavalle.npc.olla'), line: T('g.lavalle.line.olla') },
      { x: 9, y: 2.6, e: '🚧', name: T('g.lavalle.npc.corta'), line: T('g.lavalle.line.corta'), barricada: true },
    ];
    let done = false, exitTo = null, t = 0, msg = '', msgT = 0, prompt = '', escHeld = false, near = null;
    setMsg(T('g.lavalle.intro'), 6);
    if (typeof Sfx !== 'undefined' && Sfx.setCumbia) Sfx.setCumbia(true);   // cumbia al palo

    function setMsg(s, d = 4) { msg = s; msgT = d; }
    function solid(px, py) { const tx = Math.floor(px / CS), ty = Math.floor(py / CS); if (tx < 0 || ty < 0 || tx >= W || ty >= H) return ty < H; return map[ty] && map[ty][tx] === 1; }
    function freeAt(x, y) { const r = player.r; return !solid(x - r, y - r) && !solid(x + r, y - r) && !solid(x - r, y + r) && !solid(x + r, y + r); }
    const nearTile = (c, d) => Math.hypot(player.x - (c.x + 0.5) * CS, player.y - (c.y + 0.5) * CS) < CS * (d || 1.4);

    function leave() { if (typeof Sfx !== 'undefined' && Sfx.setCumbia) Sfx.setCumbia(false); done = true; exitTo = 'street'; }

    function update(dt) {
      t += dt; msgT -= dt;
      if (done) return;
      const sp = 165 * dt;
      let mvx = 0, mvy = 0;
      if (Input.keys['arrowleft'] || Input.keys['a']) mvx = -1;
      if (Input.keys['arrowright'] || Input.keys['d']) mvx = 1;
      if (Input.keys['arrowup'] || Input.keys['w']) mvy = -1;
      if (Input.keys['arrowdown'] || Input.keys['s']) mvy = 1;
      if (mvx) { if (freeAt(player.x + mvx * sp, player.y)) player.x += mvx * sp; player.dir = mvx; }
      if (mvy) { if (freeAt(player.x, player.y + mvy * sp)) player.y += mvy * sp; }
      // caminar hacia ABAJO y salir del mapa → volvés a Florida (te lleva solo)
      if (player.y > (H - 0.6) * CS) { leave(); return; }
      if (Input.keys['escape']) { if (!escHeld) { escHeld = true; leave(); return; } } else escHeld = false;
      // ¿cerca de alguien? → mostrar su frase
      near = null; for (const f of folks) if (nearTile(f, 1.5)) { near = f; break; }
      prompt = near ? (near.name + ': ' + near.line) : (player.y > (H - 2.4) * CS ? T('g.lavalle.exitHint') : '');
    }

    // ── fuego animado (tacho / olla) ──
    function fire(ctx, sx, sy, scale, seed) {
      const fl = (a) => 0.7 + 0.3 * Math.sin(t * 9 + seed + a);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(180,40,0,0.5)'; blob(ctx, sx, sy, 11 * scale * fl(0), 16 * scale * fl(1));
      ctx.fillStyle = 'rgba(232,84,10,0.7)'; blob(ctx, sx, sy, 8 * scale * fl(2), 13 * scale * fl(0.5));
      ctx.fillStyle = 'rgba(255,179,0,0.85)'; blob(ctx, sx, sy + 2 * scale, 5 * scale * fl(1.5), 8 * scale * fl(2.5));
      ctx.fillStyle = 'rgba(255,232,120,0.9)'; blob(ctx, sx, sy + 3 * scale, 2.4 * scale, 4 * scale * fl(3));
      ctx.restore();
      // humo
      ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = '#9aa';
      for (let i = 0; i < 3; i++) { const ph = (t * 0.6 + i * 0.5 + seed) % 1; ctx.globalAlpha = 0.2 * (1 - ph); ctx.beginPath(); ctx.arc(sx + Math.sin(t + i + seed) * 5 * scale, sy - 14 * scale - ph * 30 * scale, (3 + ph * 6) * scale, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    function blob(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.moveTo(x, y - ry); ctx.quadraticCurveTo(x + rx, y - ry * 0.3, x, y); ctx.quadraticCurveTo(x - rx, y - ry * 0.3, x, y - ry); ctx.fill(); }

    function figure(ctx, sx, sy, emoji, name, talk) {
      ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(sx, sy + 10, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.font = '20px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText(emoji, sx, sy + 6);
      if (name) { ctx.fillStyle = '#cfe8c0'; ctx.font = '8px monospace'; ctx.fillText(name, sx, sy - 14); }
      if (talk) { ctx.font = '9px monospace'; const tw = Math.min(170, ctx.measureText(talk).width + 10);
        ctx.fillStyle = 'rgba(15,12,8,0.92)'; ctx.fillRect(sx - tw / 2, sy - 30, tw, 13);
        ctx.fillStyle = '#ffe2a8'; ctx.textBaseline = 'middle'; ctx.fillText(talk, sx, sy - 23); ctx.textBaseline = 'alphabetic'; }
    }

    function draw(ctx, VW, VH) {
      const ox = (VW - W * CS) / 2, oy = 30;
      ctx.fillStyle = '#0a0a0e'; ctx.fillRect(0, 0, VW, VH);
      // asfalto
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const px = ox + x * CS, py = oy + y * CS;
        if (map[y] && map[y][x] === 1 && y > 1) { ctx.fillStyle = pal.wall; ctx.fillRect(px, py, CS, CS); }
        else { ctx.fillStyle = ((x + y) % 2) ? pal.floor : pal.floor2; ctx.fillRect(px, py, CS, CS); }
      }
      // línea amarilla del medio de la calle (vertical)
      ctx.strokeStyle = pal.line; ctx.lineWidth = 3; ctx.setLineDash([12, 10]);
      ctx.beginPath(); ctx.moveTo(ox + 9 * CS, oy + 2 * CS); ctx.lineTo(ox + 9 * CS, oy + (H - 0.5) * CS); ctx.stroke(); ctx.setLineDash([]);
      // EL OBELISCO al fondo (arriba del corte), grande
      { const obx = ox + 9 * CS, oby = oy - 4; const img = (typeof Art !== 'undefined' && Art.decor) ? Art.decor.obelisco : null;
        if (img) ctx.drawImage(img, obx - img.width / 2, oby - img.height + 70); }
      // EL CORTE: vallas (filas de tablas) cruzando arriba (y≈2)
      ctx.fillStyle = '#c9a227'; for (let x = 1; x < W - 1; x += 1.5) { const vx = ox + x * CS, vy = oy + 2.05 * CS;
        ctx.fillRect(vx + 3, vy - 22, 5, 30); ctx.fillStyle = '#a8851c'; ctx.fillRect(vx + 3, vy - 22, 5, 4); ctx.fillStyle = '#c9a227'; }
      ctx.fillStyle = '#1a1a1a'; ctx.fillRect(ox + 1 * CS, oy + 1.6 * CS, (W - 2) * CS, 7); ctx.fillStyle = '#3a3a3a'; ctx.fillRect(ox + 1 * CS, oy + 1.6 * CS, (W - 2) * CS, 2);
      // pancartas / banderas
      for (const b of banners) { const bx = ox + b.x * CS, by = oy + b.y * CS;
        ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx, by + 18); ctx.lineTo(bx, by - 16); ctx.stroke();
        if (b.kind === 'peron') { ctx.fillStyle = '#f3ead8'; ctx.fillRect(bx, by - 14, 30, 16); ctx.fillStyle = '#1f4fa0'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center'; ctx.fillText('VIVA', bx + 15, by - 6); ctx.fillText('PERÓN', bx + 15, by); }
        else { ctx.fillStyle = '#c0241f'; ctx.fillRect(bx, by - 14, 26, 16); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(bx + 13, by - 6, 5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#c0241f'; ctx.beginPath(); ctx.arc(bx + 14, by - 5, 3, 0, Math.PI * 2); ctx.fill(); } }
      // OLLA popular
      { const olx = ox + (olla.x + 0.5) * CS, oly = oy + (olla.y + 0.5) * CS;
        fire(ctx, olx, oly + 8, 0.7, 4.1);
        ctx.fillStyle = '#3a4750'; ctx.beginPath(); ctx.ellipse(olx, oly, 15, 9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#0f1518'; ctx.beginPath(); ctx.ellipse(olx, oly - 6, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#5a3a1a'; ctx.beginPath(); ctx.ellipse(olx, oly - 6, 8, 3, 0, 0, Math.PI * 2); ctx.fill(); }
      // TACHOS prendidos fuego (animados)
      for (let i = 0; i < fires.length; i++) { const f = fires[i]; const fx = ox + (f.x + 0.5) * CS, fy = oy + (f.y + 0.5) * CS;
        ctx.fillStyle = '#39454c'; ctx.fillRect(fx - 9, fy - 4, 18, 22); ctx.fillStyle = '#222d33'; ctx.fillRect(fx - 9, fy - 4, 5, 22);
        ctx.fillStyle = '#1c2429'; ctx.fillRect(fx - 10, fy - 6, 20, 4);
        fire(ctx, fx, fy - 6, 1, i * 1.7); }
      // LA GENTE a los costados
      for (const f of folks) figure(ctx, ox + (f.x + 0.5) * CS, oy + (f.y + 0.5) * CS, f.e, f.name, near === f ? f.line : '');
      // VOS (el Carpo, de espaldas: melena + viola)
      { const sx = ox + player.x, sy = oy + player.y;
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(sx, sy + 11, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3a2a1a'; ctx.beginPath(); ctx.arc(sx, sy, 10, 0, Math.PI * 2); ctx.fill();   // melena (de atrás)
        ctx.fillStyle = '#5a4030'; ctx.fillRect(sx - 9, sy - 2, 18, 12);
        ctx.save(); ctx.translate(sx + 7, sy + 2); ctx.rotate(0.5); ctx.fillStyle = '#7a3b12'; ctx.fillRect(-3, -10, 6, 20); ctx.restore();   // viola al hombro
        ctx.fillStyle = '#ffe2a8'; ctx.font = '8px monospace'; ctx.textAlign = 'center'; ctx.fillText(T('g.bodegon.you'), sx, sy - 16); }
      // barra superior
      ctx.fillStyle = '#0a0a0e'; ctx.fillRect(0, 0, VW, 26);
      ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'left'; ctx.fillText('✊ ' + T('g.lavalle.title'), 10, 18);
      ctx.textAlign = 'right'; ctx.fillStyle = '#9be8a0'; ctx.font = '10px monospace'; ctx.fillText('WASD moverte · ↓ volver · 🎶', VW - 10, 18);
      // mensaje / prompt
      let bottom = VH;
      if (msgT > 0 && msg) { ctx.font = '12px monospace'; ctx.textAlign = 'center';
        const words = msg.split(' '), lines = []; let cur = '';
        for (const wd of words) { const cand = cur ? cur + ' ' + wd : wd; if (((ctx.measureText(cand) || {}).width || 0) > VW - 44 && cur) { lines.push(cur); cur = wd; } else cur = cand; }
        if (cur) lines.push(cur); const lh = 15, boxH = lines.length * lh + 8;
        ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, VH - boxH, VW, boxH);
        ctx.fillStyle = '#ffe2c0'; lines.forEach((ln, k) => ctx.fillText(ln, VW / 2, VH - boxH + 14 + k * lh)); bottom = VH - boxH; }
      if (prompt) { ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(0,0,0,0.78)'; ctx.fillRect(0, bottom - 22, VW, 22); ctx.fillStyle = '#ffd54f'; ctx.fillText(prompt, VW / 2, bottom - 7); }
    }

    return { get done() { return done; }, get exitTo() { return exitTo; }, update, draw };
  }
  return { create };
})();
if (typeof window !== 'undefined') window.Lavalle = Lavalle;
if (typeof module !== 'undefined') module.exports = Lavalle;
