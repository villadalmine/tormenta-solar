// lavalle.js — SUB-MODO "Calle Lavalle / el piquete" VISTA DE ARRIBA-DE FRENTE (specs/lavalle.md, Etapa 1.5). En vez de
// la perspectiva side-scroller (no parecía piquete), Lavalle es un sub-modo top-down COHESIVO: entrás desde ABAJO
// (venís de Florida) y tenés el corte DE FRENTE. La BARRICADA del fondo = muro de CUBIERTAS apiladas + AUTOS ROTOS +
// la reja + BANDERAS (Viva Perón, argentina, Che); adelante, tachos prendidos fuego (animados) + olla popular; y los
// PIQUETEROS de cuerpo entero (bandana/capucha, palos, bombo, banderas) — sin combate, ambiental, cumbia al palo.
// Volvés caminando al borde de abajo. Patrón aislado como bodegon.js/telo.js.
const Lavalle = (() => {
  const T = (k, p) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(k, p) : k;
  const CS = 30, W = 18, H = 15;
  const shade = (c, f) => c;   // (placeholder; usamos colores fijos de sombra)

  function create() {
    const map = Array.from({ length: H }, () => new Array(W).fill(0));
    for (let x = 0; x < W; x++) { map[0][x] = 1; map[1][x] = 1; map[2][x] = 1; }   // el CORTE (barricada) = pared, 3 filas
    for (let y = 0; y < H; y++) { map[y][0] = 1; map[y][W - 1] = 1; }
    const pal = { floor: '#26262b', floor2: '#2c2c32', line: '#5a5a48' };
    const player = { x: 9 * CS, y: (H - 1.5) * CS, r: 11, dir: -1, walk: 0 };

    // --- composición del piquete (de atrás hacia adelante) ---
    // autos rotos que cortan, flanqueando
    const cars = [{ x: 3.2, y: 3.4, col: '#7a3b2a', tilt: -0.12 }, { x: 14.8, y: 3.6, col: '#3a5a6a', tilt: 0.1 }];
    // pilas de cubiertas (gomas) a lo largo de la barricada
    const tires = [{ x: 6, y: 3.2, n: 4 }, { x: 8, y: 3.5, n: 3 }, { x: 10, y: 3.2, n: 4 }, { x: 12, y: 3.5, n: 3 }, { x: 5, y: 3.6, n: 2 }, { x: 13, y: 3.7, n: 2 }];
    // banderas: en la barricada (colgadas/en mástil) + las que llevan algunos piqueteros
    const flags = [{ x: 2.4, y: 2.2, k: 'peron' }, { x: 5.5, y: 2.0, k: 'arg' }, { x: 9, y: 1.9, k: 'peron' }, { x: 12.5, y: 2.0, k: 'arg' }, { x: 15.4, y: 2.2, k: 'che' }];
    // tachos prendidos fuego (animados), agrupados frente al corte
    const barrels = [{ x: 4.5, y: 5.5 }, { x: 9, y: 4.7 }, { x: 13.5, y: 5.5 }, { x: 7, y: 8.5 }, { x: 11.4, y: 8.7 }];
    const olla = { x: 2.7, y: 7.6 };

    // los PIQUETEROS (de cuerpo entero). col=campera, hair, bandana?, hood?, holds?, flagK?, name/line.
    const folks = [
      { x: 9, y: 3.4, col: '#5a2a2a', bandana: '#c0241f', holds: 'stick', barricada: true, name: T('g.lavalle.npc.corta'), line: T('g.lavalle.line.corta') },
      { x: 6.5, y: 5.6, col: '#2e3a55', hood: '#1c2230', holds: 'stick', name: T('g.lavalle.npc.encapuchado'), line: T('g.lavalle.line.encapuchado') },
      { x: 11.6, y: 5.7, col: '#3a4a2a', bandana: '#2a2a2a', name: T('g.lavalle.npc.fierro'), line: T('g.lavalle.line.fierro') },
      { x: 4.4, y: 7.7, col: '#5a3a5a', name: T('g.lavalle.npc.rosa'), line: T('g.lavalle.line.rosa') },
      { x: 14, y: 7.5, col: '#2a4a4a', holds: 'bombo', name: T('g.lavalle.npc.bombo'), line: T('g.lavalle.line.bombo') },
      { x: 7.5, y: 10, col: '#4a3a1a', holds: 'flag', flagK: 'arg', name: T('g.lavalle.npc.bandera'), line: T('g.lavalle.line.bandera') },
      { x: 11, y: 10.2, col: '#3a2a4a', holds: 'flag', flagK: 'peron', name: T('g.lavalle.npc.copado'), line: T('g.lavalle.line.copado') },
      { x: 5, y: 11.4, col: '#6a4a2a', name: T('g.lavalle.npc.referente'), line: T('g.lavalle.line.referente') },
      { x: 13.4, y: 11.2, col: '#5a3a3a', dance: true, name: T('g.lavalle.npc.vecina'), line: T('g.lavalle.line.vecina') },
    ];
    let done = false, exitTo = null, t = 0, msg = '', msgT = 0, prompt = '', escHeld = false, near = null;
    setMsg(T('g.lavalle.intro'), 6);
    if (typeof Sfx !== 'undefined' && Sfx.setCumbia) Sfx.setCumbia(true);

    function setMsg(s, d = 4) { msg = s; msgT = d; }
    function solid(px, py) { const tx = Math.floor(px / CS), ty = Math.floor(py / CS); if (tx < 0 || ty < 0 || tx >= W || ty >= H) return ty < H; return map[ty] && map[ty][tx] === 1; }
    function freeAt(x, y) { const r = player.r; return !solid(x - r, y - r) && !solid(x + r, y - r) && !solid(x - r, y + r) && !solid(x + r, y + r); }
    const nearTile = (c, d) => Math.hypot(player.x - (c.x + 0.5) * CS, player.y - (c.y + 0.5) * CS) < CS * (d || 1.4);
    function leave() { if (typeof Sfx !== 'undefined' && Sfx.setCumbia) Sfx.setCumbia(false); done = true; exitTo = 'street'; }

    function update(dt) {
      t += dt; msgT -= dt;
      if (done) return;
      const sp = 165 * dt; let mvx = 0, mvy = 0;
      if (Input.keys['arrowleft'] || Input.keys['a']) mvx = -1;
      if (Input.keys['arrowright'] || Input.keys['d']) mvx = 1;
      if (Input.keys['arrowup'] || Input.keys['w']) mvy = -1;
      if (Input.keys['arrowdown'] || Input.keys['s']) mvy = 1;
      if (mvx) { if (freeAt(player.x + mvx * sp, player.y)) player.x += mvx * sp; player.dir = mvx; }
      if (mvy) { if (freeAt(player.x, player.y + mvy * sp)) player.y += mvy * sp; }
      player.walk = (mvx || mvy) ? player.walk + dt * 10 : 0;
      if (player.y > (H - 0.6) * CS) { leave(); return; }
      if (Input.keys['escape']) { if (!escHeld) { escHeld = true; leave(); return; } } else escHeld = false;
      near = null; for (const f of folks) if (nearTile(f, 1.5)) { near = f; break; }
      prompt = near ? (near.name + ': ' + near.line) : (player.y > (H - 2.4) * CS ? T('g.lavalle.exitHint') : '');
    }

    // ───────── helpers de dibujo ─────────
    function fire(ctx, sx, sy, scale, seed) {
      const fl = a => 0.7 + 0.3 * Math.sin(t * 9 + seed + a);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(180,40,0,0.5)'; blob(ctx, sx, sy, 11 * scale * fl(0), 17 * scale * fl(1));
      ctx.fillStyle = 'rgba(232,84,10,0.7)'; blob(ctx, sx, sy, 8 * scale * fl(2), 13 * scale * fl(0.5));
      ctx.fillStyle = 'rgba(255,179,0,0.85)'; blob(ctx, sx, sy + 2 * scale, 5 * scale * fl(1.5), 8 * scale * fl(2.5));
      ctx.fillStyle = 'rgba(255,232,120,0.9)'; blob(ctx, sx, sy + 3 * scale, 2.4 * scale, 4 * scale * fl(3));
      ctx.restore();
      ctx.save(); for (let i = 0; i < 3; i++) { const ph = (t * 0.5 + i * 0.4 + seed) % 1; ctx.globalAlpha = 0.22 * (1 - ph); ctx.fillStyle = '#8a8a92'; ctx.beginPath(); ctx.arc(sx + Math.sin(t + i + seed) * 6 * scale, sy - 16 * scale - ph * 34 * scale, (3 + ph * 7) * scale, 0, Math.PI * 2); ctx.fill(); } ctx.restore();
    }
    function blob(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.moveTo(x, y - ry); ctx.quadraticCurveTo(x + rx, y - ry * 0.3, x, y); ctx.quadraticCurveTo(x - rx, y - ry * 0.3, x, y - ry); ctx.fill(); }
    function tireStack(ctx, x, y, n) {
      for (let i = 0; i < n; i++) { const yy = y - i * 9;
        ctx.fillStyle = '#141414'; ctx.beginPath(); ctx.ellipse(x, yy, 14, 9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2a2a2a'; ctx.beginPath(); ctx.ellipse(x, yy - 1, 14, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3a3a3a'; ctx.beginPath(); ctx.ellipse(x, yy - 1, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.ellipse(x, yy - 1, 7, 4, 0, 0, Math.PI * 2); ctx.lineWidth = 0; ctx.fill(); ctx.fillStyle = '#3a3a3a'; ctx.beginPath(); ctx.ellipse(x, yy - 1.5, 5, 2.6, 0, 0, Math.PI * 2); ctx.fill(); }
    }
    function brokenCar(ctx, x, y, col, tilt) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 18, 30, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-30, 14); ctx.lineTo(-26, -8); ctx.lineTo(26, -8); ctx.lineTo(30, 14); ctx.closePath(); ctx.fill();   // carrocería
      ctx.fillStyle = '#2a2a2e'; ctx.fillRect(-18, -16, 36, 10);                  // techo/cabina
      ctx.fillStyle = '#11161c'; ctx.fillRect(-15, -14, 30, 6);                   // parabrisas roto
      ctx.strokeStyle = '#6a7078'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-9, -14); ctx.lineTo(-3, -8); ctx.moveTo(2, -14); ctx.lineTo(7, -9); ctx.stroke();   // grietas
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-30, 4, 60, 4);            // óxido/sombra base
      ctx.fillStyle = '#141414'; ctx.beginPath(); ctx.arc(-20, 16, 5, 0, Math.PI); ctx.arc(20, 16, 5, 0, Math.PI); ctx.fill();   // gomas pinchadas
      ctx.restore();
    }
    function drawFlag(ctx, x, y, k, wav) {
      ctx.strokeStyle = '#6d4c2f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y + 20); ctx.lineTo(x, y - 20); ctx.stroke();
      const fw = 30, fh = 20, ox = x + 1, oy = y - 20; const w0 = wav ? Math.sin(t * 4 + x) * 2 : 0;
      if (k === 'peron') { ctx.fillStyle = '#f3ead8'; ctx.fillRect(ox, oy, fw, fh); ctx.fillStyle = '#1f4fa0'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center'; ctx.fillText('VIVA', ox + fw / 2, oy + 9); ctx.fillText('PERÓN', ox + fw / 2, oy + 17); }
      else if (k === 'arg') { ctx.fillStyle = '#74acdf'; ctx.fillRect(ox, oy + w0, fw, fh / 3); ctx.fillStyle = '#fff'; ctx.fillRect(ox, oy + fh / 3 + w0, fw, fh / 3); ctx.fillStyle = '#74acdf'; ctx.fillRect(ox, oy + 2 * fh / 3 + w0, fw, fh / 3); ctx.fillStyle = '#f6b40e'; ctx.beginPath(); ctx.arc(ox + fw / 2, oy + fh / 2 + w0, 3.2, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.fillStyle = '#c0241f'; ctx.fillRect(ox, oy, fw - 4, fh); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(ox + 13, oy + 9, 6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#c0241f'; ctx.beginPath(); ctx.arc(ox + 14, oy + 10, 3.5, 0, Math.PI * 2); ctx.fill(); }
    }
    // piquetero de CUERPO ENTERO (front view). o: {col,hair,bandana,hood,holds,flagK,dance}
    function piquetero(ctx, x, y, o, talk, hl) {
      o = o || {}; const sw = o.dance ? Math.sin(t * 6 + x) * 3 : 0;
      ctx.fillStyle = 'rgba(0,0,0,0.30)'; ctx.beginPath(); ctx.ellipse(x, y + 17, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
      if (hl) { ctx.strokeStyle = '#ffd54a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y + 17, 13, 5, 0, 0, Math.PI * 2); ctx.stroke(); }
      // piernas + zapatillas
      ctx.fillStyle = '#202a3a'; ctx.fillRect(x - 5, y + 5, 4, 11); ctx.fillRect(x + 1, y + 5, 4, 11);
      ctx.fillStyle = '#101216'; ctx.fillRect(x - 6, y + 15, 5, 3); ctx.fillRect(x + 1, y + 15, 5, 3);
      // torso (campera) + sombra lateral
      ctx.fillStyle = o.col || '#3a4a6a'; ctx.fillRect(x - 7, y - 8 + sw, 14, 14);
      ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(x - 7, y - 8 + sw, 4, 14);
      // brazos
      ctx.fillStyle = o.col || '#3a4a6a'; ctx.fillRect(x - 9, y - 7 + sw, 3, 11); ctx.fillRect(x + 6, y - 7 + sw, 3, 11);
      ctx.fillStyle = '#d9a878'; ctx.fillRect(x - 9, y + 3 + sw, 3, 2); ctx.fillRect(x + 6, y + 3 + sw, 3, 2);   // manos
      // cabeza
      ctx.fillStyle = '#d9a878'; ctx.beginPath(); ctx.arc(x, y - 13 + sw, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = o.hair || '#1c1410'; ctx.beginPath(); ctx.arc(x, y - 15 + sw, 5, Math.PI, 0); ctx.fill();
      if (o.bandana) { ctx.fillStyle = o.bandana; ctx.fillRect(x - 5, y - 13 + sw, 10, 4); }              // bandana en la cara
      if (o.hood) { ctx.fillStyle = o.hood; ctx.beginPath(); ctx.arc(x, y - 14 + sw, 6.5, Math.PI * 0.85, Math.PI * 2.15); ctx.fill(); }   // capucha
      // sostiene
      if (o.holds === 'stick') { ctx.strokeStyle = '#6d4c2f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 8, y + 3 + sw); ctx.lineTo(x + 11, y - 18); ctx.stroke(); }
      if (o.holds === 'bombo') { ctx.fillStyle = '#c0241f'; ctx.beginPath(); ctx.arc(x + 11, y + sw, 8, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#f0f0f0'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#7a3b12'; ctx.fillRect(x + 14, y - 9 + sw, 2, 8); }   // bombo
      if (o.holds === 'flag') drawFlag(ctx, x + 11, y - 4 + sw, o.flagK || 'arg', true);
      if (talk) bubble(ctx, x, y - 22 + sw, talk);
    }
    function carpo(ctx, x, y) {   // EL CARPO de cuerpo entero, de espaldas (melena + campera + viola)
      const sw = Math.sin(player.walk) * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.beginPath(); ctx.ellipse(x, y + 17, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3a3340'; ctx.fillRect(x - 5, y + 5, 4, 11 + sw); ctx.fillRect(x + 1, y + 5, 4, 11 - sw);   // jeans
      ctx.fillStyle = '#15110f'; ctx.fillRect(x - 6, y + 15 + sw, 5, 3); ctx.fillRect(x + 1, y + 15 - sw, 5, 3);
      ctx.fillStyle = '#4a3b2a'; ctx.fillRect(x - 8, y - 8, 16, 15);                          // campera marrón
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x - 8, y - 8, 4, 15);
      ctx.save(); ctx.translate(x + 6, y - 2); ctx.rotate(0.55); ctx.fillStyle = '#7a3b12'; ctx.fillRect(-3.5, -12, 7, 22); ctx.fillStyle = '#d8a24a'; ctx.fillRect(-1, -12, 2, 22); ctx.restore();   // viola al hombro
      ctx.fillStyle = '#2a2018'; ctx.beginPath(); ctx.arc(x, y - 13, 7, 0, Math.PI * 2); ctx.fill();   // melena (de atrás)
      ctx.fillStyle = '#241b14'; ctx.fillRect(x - 7, y - 12, 14, 9);
    }
    function bubble(ctx, x, y, txt) { ctx.font = '9px monospace'; const tw = Math.min(180, ctx.measureText(txt).width + 10);
      ctx.fillStyle = 'rgba(15,12,8,0.92)'; ctx.fillRect(x - tw / 2, y - 12, tw, 13);
      ctx.fillStyle = '#ffe2a8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x, y - 5); ctx.textBaseline = 'alphabetic'; }

    function draw(ctx, VW, VH) {
      const ox = (VW - W * CS) / 2, oy = 30;
      ctx.fillStyle = '#0a0a0e'; ctx.fillRect(0, 0, VW, VH);
      // asfalto
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const px = ox + x * CS, py = oy + y * CS;
        ctx.fillStyle = ((x + y) % 2) ? pal.floor : pal.floor2; ctx.fillRect(px, py, CS, CS); }
      ctx.strokeStyle = pal.line; ctx.lineWidth = 3; ctx.setLineDash([12, 10]); ctx.beginPath(); ctx.moveTo(ox + 9 * CS, oy + 3 * CS); ctx.lineTo(ox + 9 * CS, oy + (H - 0.5) * CS); ctx.stroke(); ctx.setLineDash([]);
      const TX2 = tx => ox + tx * CS, TY2 = ty => oy + ty * CS;
      // EL OBELISCO al fondo (detrás de todo)
      { const img = (typeof Art !== 'undefined' && Art.decor) ? Art.decor.obelisco : null; if (img) ctx.drawImage(img, TX2(9) - img.width / 2, oy - img.height + 64); }
      // LA REJA (valla metálica) cruzando el fondo
      ctx.strokeStyle = '#6a6a72'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ox + CS, oy + 1.5 * CS); ctx.lineTo(ox + (W - 1) * CS, oy + 1.5 * CS); ctx.stroke();
      ctx.lineWidth = 2; for (let x = 1; x < W; x += 0.6) { ctx.beginPath(); ctx.moveTo(ox + x * CS, oy + 0.9 * CS); ctx.lineTo(ox + x * CS, oy + 2 * CS); ctx.stroke(); }
      // AUTOS ROTOS (parte de la barricada)
      for (const c of cars) brokenCar(ctx, TX2(c.x), TY2(c.y), c.col, c.tilt);
      // CUBIERTAS apiladas (el muro del corte)
      for (const tr of tires) tireStack(ctx, TX2(tr.x), TY2(tr.y), tr.n);
      // BANDERAS (Viva Perón, argentina, Che) en el corte
      for (const f of flags) drawFlag(ctx, TX2(f.x), TY2(f.y), f.k, true);
      // TACHOS prendidos fuego (animados) — orden por y
      const fb = barrels.map((b, i) => ({ b, i })).sort((a, z) => a.b.y - z.b.y);
      for (const { b, i } of fb) { const fx = TX2(b.x + 0.5), fy = TY2(b.y + 0.5);
        ctx.fillStyle = '#39454c'; ctx.fillRect(fx - 9, fy - 4, 18, 22); ctx.fillStyle = '#222d33'; ctx.fillRect(fx - 9, fy - 4, 5, 22);
        ctx.fillStyle = '#1c2429'; ctx.fillRect(fx - 10, fy - 6, 20, 4); fire(ctx, fx, fy - 6, 1, i * 1.7); }
      // OLLA popular
      { const olx = TX2(olla.x + 0.5), oly = TY2(olla.y + 0.5); fire(ctx, olx, oly + 8, 0.7, 4.1);
        ctx.fillStyle = '#3a4750'; ctx.beginPath(); ctx.ellipse(olx, oly, 15, 9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#0f1518'; ctx.beginPath(); ctx.ellipse(olx, oly - 6, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#5a3a1a'; ctx.beginPath(); ctx.ellipse(olx, oly - 6, 8, 3, 0, 0, Math.PI * 2); ctx.fill(); }
      // PIQUETEROS + VOS, ordenados por Y (los de más abajo tapan a los de arriba)
      const ents = folks.map(f => ({ f, y: f.y })).concat([{ player: true, y: player.y / CS - 0.5 }]).sort((a, z) => a.y - z.y);
      for (const e of ents) {
        if (e.player) { carpo(ctx, ox + player.x, oy + player.y); }
        else { const f = e.f; piquetero(ctx, TX2(f.x + 0.5), TY2(f.y + 0.5), f, near === f ? f.line : '', near === f); }
      }
      // barra superior + mensajes
      ctx.fillStyle = '#0a0a0e'; ctx.fillRect(0, 0, VW, 26);
      ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'left'; ctx.fillText('✊ ' + T('g.lavalle.title'), 10, 18);
      ctx.textAlign = 'right'; ctx.fillStyle = '#9be8a0'; ctx.font = '10px monospace'; ctx.fillText('WASD moverte · ↓ volver · 🎶', VW - 10, 18);
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
