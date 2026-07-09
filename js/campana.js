// campana.js — SUB-MODO "CAMPANA / VILLA DÁLMINE" (subte.md §12, S6-S8 — el FINAL de la odisea).
// El maquinista (ya sobrio, le diste el trapo de Boca) te trae GRATIS a Campana. Dos fases:
//  · 'calle': bajás en la estación, pasás por la ESCALINATA de Campana y te cruzás con la BANDA DE VILLA DÁLMINE
//    (violeta) yendo a la cancha → entrás al estadio con ellos.
//  · 'estadio': el Coliseo de MITRE Y PUCCINI — juegan VILLA DÁLMINE vs CADU (el clásico de la zona). Secuencia:
//    1er tiempo → ENTRETIEMPO (te clavás EL MEJOR CHORI DE TU VIDA, +vida) → 2º tiempo: GRITÁS 4 GOLES de Dálmine
//    → justo CAE UN SATÉLITE de la IA maligna → se abre un PORTAL espacio-tiempo → volvés a caer en el búnker del
//    loop de la tormenta (donde tenés la cama). exitTo 'portal'. Aislado: el juego principal queda EXACTO.
const Campana = (() => {
  const T = (k, p) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(k, p) : k;
  const CS = 30, W = 18, H = 12;
  const VIOLETA = '#6a3d9a', VIOLETA2 = '#8a5cc4';   // los colores de Villa Dálmine

  function create(opts) {
    opts = opts || {};
    let phase = 'calle';                              // 'calle' → 'estadio'
    let st = 'pt1', stT = 0, goles = 0, choriEaten = false, choriJustNow = false, golJustNow = false;
    let done = false, exitTo = null, t = 0, msg = '', msgT = 0, prompt = '', escHeld = false, eHeld = false;
    let satY = -80, portalR = 0;                      // el satélite que cae + el portal
    // fase CALLE: estación (izq) → escalinata (centro) → la banda (camina) → puerta del estadio (der)
    const map = Array.from({ length: H }, () => new Array(W).fill(0));
    for (let x = 0; x < W; x++) { map[0][x] = 1; map[H - 1][x] = 1; }
    for (let y = 0; y < H; y++) { map[y][0] = 1; map[y][W - 1] = 1; }
    const escalinata = { x: 7.5, y: 5 };
    const estadioDoor = { x: 15.5, y: 6.5 };
    const banda = [];                                  // la hinchada de Dálmine caminando a la cancha
    for (let i = 0; i < 8; i++) banda.push({ x: (3 + i * 1.3), y: 7.5 + (i % 3) * 0.7, ph: i * 0.9 });
    const player = { x: 2.2 * CS, y: 7 * CS, r: 10, dir: 1, walk: 0 };
    // fase ESTADIO: tribuna + campo; el puesto de chori aparece en el entretiempo
    const choriPuesto = { x: 3.2, y: 8.6 };
    const ball = { x: 0.3, y: 0.5, vx: 0.5, vy: 0.35 };
    setMsg(T('g.campana.enter'), 8);

    function setMsg(s, d = 4) { msg = s; msgT = d; }
    function solid(px, py) { const tx = Math.floor(px / CS), ty = Math.floor(py / CS); if (tx < 0 || ty < 0 || tx >= W || ty >= H) return true; return map[ty][tx] === 1; }
    function freeAt(x, y) { const r = player.r; return !solid(x - r, y - r) && !solid(x + r, y - r) && !solid(x - r, y + r) && !solid(x + r, y + r); }
    function near(c, d = 1.6) { return Math.hypot(player.x - (c.x + 0.5) * CS, player.y - (c.y + 0.5) * CS) < CS * d; }

    function interact() {
      if (phase === 'calle') {
        if (near(estadioDoor, 1.8)) { phase = 'estadio'; st = 'pt1'; stT = 0; player.x = 9 * CS; player.y = 8.5 * CS;
          setMsg(T('g.campana.estadio'), 8); if (typeof Sfx !== 'undefined' && Sfx.pickup) Sfx.pickup(); return; }
        if (near(escalinata, 2.2)) { setMsg(T('g.campana.escalinata'), 7); return; }
        setMsg(T('g.campana.hintCalle'), 4); return;
      }
      // ESTADIO
      if (st === 'half' && !choriEaten && near(choriPuesto, 1.8)) {   // EL MEJOR CHORI DE TU VIDA
        choriEaten = true; choriJustNow = true; setMsg(T('g.campana.chori'), 8);
        if (typeof Sfx !== 'undefined' && Sfx.pickup) Sfx.pickup(); return;
      }
      if (st === 'gol') {                                              // ¡GRITALO!
        goles++; golJustNow = true; st = goles >= 4 ? 'sat' : 'pt2'; stT = 0;
        setMsg(T('g.campana.grito', { n: goles }), 5);
        if (typeof Sfx !== 'undefined' && Sfx.win) Sfx.win(); return;
      }
      setMsg(T('g.campana.hintEstadio'), 4);
    }

    function update(dt) {
      t += dt; msgT -= dt;
      // la banda camina hacia el estadio (fase calle)
      if (phase === 'calle') for (const b of banda) { b.x += dt * 0.55; if (b.x > 16) b.x = 2.4; }
      if (phase === 'estadio') {
        stT += dt;
        ball.x += ball.vx * dt; ball.y += ball.vy * dt;
        if (ball.x < 0.05 || ball.x > 0.95) ball.vx *= -1; if (ball.y < 0.06 || ball.y > 0.94) ball.vy *= -1;
        if (st === 'pt1' && stT > 7) { st = 'half'; stT = 0; setMsg(T('g.campana.half'), 8); }
        else if (st === 'half' && stT > (choriEaten ? 2.5 : 14)) { st = 'pt2'; stT = 0; setMsg(T('g.campana.pt2'), 6); }
        else if (st === 'pt2' && stT > 3.2) { st = 'gol'; stT = 0; setMsg(T('g.campana.golAnuncio', { n: goles + 1 }), 6); if (typeof Sfx !== 'undefined' && Sfx.coin) Sfx.coin(); }
        else if (st === 'sat') { satY += dt * 160; if (satY > 190) { st = 'portal'; stT = 0; setMsg(T('g.campana.portal'), 8); } }
        else if (st === 'portal') { portalR = Math.min(1, portalR + dt * 0.5); if (portalR >= 1 && stT > 3.4) { done = true; exitTo = 'portal'; } }
      }
      player.walk = 0;
      const sp = 165 * dt; let mvx = 0, mvy = 0;
      if (Input.keys['arrowleft'] || Input.keys['a']) mvx = -1;
      if (Input.keys['arrowright'] || Input.keys['d']) mvx = 1;
      if (Input.keys['arrowup'] || Input.keys['w']) mvy = -1;
      if (Input.keys['arrowdown'] || Input.keys['s']) mvy = 1;
      if (mvx) player.dir = mvx;
      if (mvx && freeAt(player.x + mvx * sp, player.y)) { player.x += mvx * sp; player.walk = 1; }
      if (mvy && freeAt(player.x, player.y + mvy * sp)) { player.y += mvy * sp; player.walk = 1; }
      if (Input.keys['escape']) { if (!escHeld) { escHeld = true; if (phase === 'calle') { done = true; exitTo = 'back'; } } } else escHeld = false;   // del estadio no te vas: esto termina en portal
      if (Input.keys['e'] || Input.keys['enter']) { if (!eHeld) { eHeld = true; interact(); } } else eHeld = false;
      if (phase === 'calle') prompt = near(estadioDoor, 1.8) ? T('g.campana.promptEstadio') : near(escalinata, 2.2) ? T('g.campana.promptEscalinata') : '';
      else prompt = st === 'gol' ? T('g.campana.promptGrito') : (st === 'half' && !choriEaten) ? (near(choriPuesto, 1.8) ? T('g.campana.promptChori') : T('g.campana.promptIrChori')) : '';
    }

    function drawCalle(g, VW, VH) {
      const ox = (VW - W * CS) / 2, oy = (VH - H * CS) / 2;
      g.fillStyle = '#11150f'; g.fillRect(0, 0, VW, VH);
      // cielo de atardecer campanense + río de fondo
      g.fillStyle = '#4a3a50'; g.fillRect(ox, oy, W * CS, 3 * CS);
      g.fillStyle = '#3a5568'; g.fillRect(ox, oy + 2.4 * CS, W * CS, 0.6 * CS);
      for (let y = 3; y < H; y++) for (let x = 0; x < W; x++) { g.fillStyle = ((x + y) & 1) ? '#26221c' : '#201d18'; g.fillRect(ox + x * CS, oy + y * CS, CS, CS); }
      // estación (izq)
      g.fillStyle = '#7a4530'; g.fillRect(ox + 0.6 * CS, oy + 3.4 * CS, 52, 40);
      g.fillStyle = '#e8d9b0'; g.font = '8px monospace'; g.textAlign = 'center'; g.fillText('EST. CAMPANA', ox + 1.5 * CS + 4, oy + 3.4 * CS + 52);
      // la ESCALINATA (centro): escalones anchos que bajan de la barranca
      const ex = ox + escalinata.x * CS, ey = oy + escalinata.y * CS;
      for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#8a8577' : '#9a9587'; g.fillRect(ex - 60 + i * 6, ey - 26 + i * 9, 120 - i * 12, 8); }
      g.fillStyle = '#c9c4b0'; g.font = '8px monospace'; g.fillText(T('g.campana.escLabel'), ex, ey + 34);
      // el ESTADIO Mitre y Puccini (der): tribuna violeta + arcos de luz
      const dx = ox + estadioDoor.x * CS, dy = oy + estadioDoor.y * CS;
      g.fillStyle = VIOLETA; g.fillRect(dx - 40, dy - 52, 76, 46);
      g.fillStyle = VIOLETA2; for (let r = 0; r < 4; r++) g.fillRect(dx - 38, dy - 50 + r * 11, 72, 4);
      g.strokeStyle = '#e8e2c8'; g.lineWidth = 2;
      for (const lx of [dx - 34, dx + 28]) { g.beginPath(); g.moveTo(lx, dy - 52); g.lineTo(lx, dy - 78); g.stroke(); g.fillStyle = '#fff2b0'; g.fillRect(lx - 5, dy - 84, 10, 7); }
      g.fillStyle = '#0d1017'; g.fillRect(dx - 30, dy - 4, 56, 16);
      g.fillStyle = '#ffe9b0'; g.font = 'bold 8px monospace'; g.fillText('MITRE Y PUCCINI', dx - 2, dy + 7);
      g.fillStyle = '#5a4a2e'; g.fillRect(dx - 8, dy - 14, 16, 12);   // el portón
      // la BANDA de Dálmine caminando (violeta, bombos y banderas)
      for (const b of banda) { const bx2 = ox + b.x * CS, by2 = oy + b.y * CS + Math.sin(t * 4 + b.ph) * 2;
        g.fillStyle = '#111'; g.beginPath(); g.ellipse(bx2, by2 + 8, 7, 3, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = (b.ph % 2 < 1) ? VIOLETA : VIOLETA2; g.fillRect(bx2 - 5, by2 - 4, 10, 13);
        g.fillStyle = '#e0a878'; g.beginPath(); g.arc(bx2, by2 - 8, 5, 0, Math.PI * 2); g.fill();
        if (b.ph % 3 < 1) { g.fillStyle = VIOLETA; g.fillRect(bx2 + 6, by2 - 20, 12, 9); }   // bandera
      }
      g.fillStyle = '#cbb3e8'; g.font = 'bold 10px monospace'; g.textAlign = 'center';
      g.fillText('♪ ' + T('g.campana.canto') + ' ♪', ox + 8 * CS, oy + 10.4 * CS + Math.sin(t * 3) * 2);
      // cartel de la ciudad
      g.fillStyle = '#0d1017cc'; g.fillRect(ox + W * CS / 2 - 70, oy + 0.3 * CS, 140, 18);
      g.fillStyle = '#ffd54f'; g.font = 'bold 11px monospace'; g.fillText('CAMPANA · BS.AS.', ox + W * CS / 2, oy + 0.3 * CS + 13);
    }

    function drawEstadio(g, VW, VH) {
      const ox = (VW - W * CS) / 2, oy = (VH - H * CS) / 2;
      g.fillStyle = '#0b0f0b'; g.fillRect(0, 0, VW, VH);
      // campo (arriba)
      g.fillStyle = '#1f5a2a'; g.fillRect(ox + CS, oy + CS, (W - 2) * CS, 3.4 * CS);
      g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 2;
      g.strokeRect(ox + 1.4 * CS, oy + 1.3 * CS, (W - 2.8) * CS, 2.9 * CS);
      g.beginPath(); g.moveTo(ox + W / 2 * CS, oy + 1.3 * CS); g.lineTo(ox + W / 2 * CS, oy + 4.2 * CS); g.stroke();
      // arcos
      g.strokeRect(ox + 1.4 * CS, oy + 2.2 * CS, 10, 1.2 * CS); g.strokeRect(ox + (W - 1.4) * CS - 10, oy + 2.2 * CS, 10, 1.2 * CS);
      // jugadores: Dálmine (violeta) vs CADU (verde)
      for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? VIOLETA2 : '#2a8a3a'; g.beginPath(); g.arc(ox + (2.5 + i * 1.7) * CS + Math.sin(t * 1.5 + i) * 8, oy + (2 + (i % 3) * 0.8) * CS, 3, 0, Math.PI * 2); g.fill(); }
      const fx = ox + 1.4 * CS + ball.x * (W - 2.8) * CS, fy = oy + 1.3 * CS + ball.y * 2.9 * CS;
      g.fillStyle = '#fff'; g.beginPath(); g.arc(fx, fy, 3, 0, Math.PI * 2); g.fill();
      // tribuna (abajo, violeta — sos parte de la banda)
      for (let y = 5; y < H; y++) for (let x = 1; x < W - 1; x++) { g.fillStyle = ((x + y) & 1) ? '#2a2532' : '#231e2a'; g.fillRect(ox + x * CS, oy + y * CS, CS, CS); }
      for (let i = 0; i < 26; i++) { const hx = ox + (1.8 + (i % 13) * 1.15) * CS, hy = oy + (5.6 + Math.floor(i / 13) * 1.1) * CS - (st === 'gol' || golJustNow ? Math.abs(Math.sin(t * 9 + i)) * 5 : Math.abs(Math.sin(t * 2 + i)) * 1.5);
        g.fillStyle = i % 3 === 2 ? '#e8f0ff' : (i % 2 ? VIOLETA : VIOLETA2); g.beginPath(); g.arc(hx, hy, 4, 0, Math.PI * 2); g.fill(); }
      // marcador
      g.fillStyle = '#0d1017'; g.fillRect(ox + W * CS / 2 - 96, oy + 0.15 * CS, 192, 20);
      g.fillStyle = '#ffd54f'; g.font = 'bold 11px monospace'; g.textAlign = 'center';
      g.fillText('V. DÁLMINE ' + goles + ' — 0 CADU · ' + (st === 'pt1' ? '1T' : st === 'half' ? 'ET' : '2T'), ox + W * CS / 2, oy + 0.15 * CS + 14);
      // ENTRETIEMPO: el puesto de chori
      if (st === 'half' && !choriEaten) { const cx = ox + choriPuesto.x * CS, cy = oy + choriPuesto.y * CS;
        g.fillStyle = '#3a2f26'; g.fillRect(cx - 20, cy - 10, 40, 24);
        g.fillStyle = '#7a2f2f'; g.fillRect(cx - 24, cy - 24, 48, 10);
        g.fillStyle = '#ff5a2a'; for (let i = 0; i < 4; i++) g.fillRect(cx - 14 + i * 8, cy - 6, 5, 3);
        g.fillStyle = '#ffe9b0'; g.font = 'bold 9px monospace'; g.fillText('CHORI 🔥', cx, cy - 16);
        g.strokeStyle = 'rgba(255,215,80,' + (0.4 + 0.4 * Math.sin(t * 4)) + ')'; g.lineWidth = 2; g.strokeRect(cx - 25, cy - 26, 50, 42); }
      // ¡GOL! (cartel gigante mientras esperás el grito)
      if (st === 'gol') { g.fillStyle = 'rgba(106,61,154,' + (0.5 + 0.3 * Math.sin(t * 6)) + ')'; g.fillRect(0, VH / 2 - 40, VW, 80);
        g.fillStyle = '#fff'; g.font = 'bold 30px monospace'; g.textAlign = 'center'; g.fillText('¡¡GOL DE DÁLMINE!!', VW / 2, VH / 2 + 10); }
      // el SATÉLITE cayendo + explosión
      if (st === 'sat' || st === 'portal') { const sx = ox + 13 * CS, sy = oy + satY;
        if (st === 'sat') { g.strokeStyle = '#ff8f5a'; g.lineWidth = 3; g.beginPath(); g.moveTo(sx + 30, sy - 60); g.lineTo(sx, sy); g.stroke();
          g.fillStyle = '#8a95a5'; g.fillRect(sx - 10, sy - 6, 20, 12); g.fillStyle = '#4a6b8f'; g.fillRect(sx - 22, sy - 4, 10, 8); g.fillRect(sx + 12, sy - 4, 10, 8);
          g.fillStyle = '#ff5a2a'; g.beginPath(); g.arc(sx, sy + 10, 6 + Math.sin(t * 10) * 3, 0, Math.PI * 2); g.fill(); } }
      // el PORTAL espacio-tiempo
      if (st === 'portal') { const px2 = ox + 13 * CS, py2 = oy + 7.5 * CS, R = 10 + portalR * 60;
        for (let i = 4; i > 0; i--) { g.strokeStyle = 'rgba(' + (120 + i * 25) + ',80,255,' + (0.25 * i * portalR) + ')'; g.lineWidth = 5;
          g.beginPath(); g.arc(px2, py2, R * (i / 4), t * (2 + i), t * (2 + i) + Math.PI * 1.4); g.stroke(); }
        g.fillStyle = 'rgba(200,170,255,' + (0.25 * portalR) + ')'; g.beginPath(); g.arc(px2, py2, R * 0.5, 0, Math.PI * 2); g.fill(); }
    }

    function draw(g, VW, VH) {
      if (phase === 'calle') drawCalle(g, VW, VH); else drawEstadio(g, VW, VH);
      // jugador
      const ox = (VW - W * CS) / 2, oy = (VH - H * CS) / 2;
      const px = ox + player.x, py = oy + player.y;
      g.fillStyle = '#111'; g.beginPath(); g.ellipse(px, py + 10, 10, 4, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffcf5b'; g.beginPath(); g.arc(px, py, player.r, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#0a0a0a'; g.fillRect(px + player.dir * 3 - 1, py - 3, 2, 2);
      if (prompt) { g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(0, VH - 54, VW, 22); g.fillStyle = '#7ff3ff'; g.font = 'bold 13px monospace'; g.textAlign = 'center'; g.fillText(prompt, VW / 2, VH - 38); }
      if (msgT > 0 && msg) { g.fillStyle = 'rgba(0,0,0,0.72)'; g.fillRect(0, VH - 30, VW, 26); g.fillStyle = '#e8f0ff'; g.font = '13px monospace'; g.textAlign = 'center'; g.fillText(msg, VW / 2, VH - 12); }
    }

    return {
      get done() { return done; }, get exitTo() { return exitTo; },
      get choriEdge() { const c = choriJustNow; choriJustNow = false; return c; },   // one-shot: comiste EL chori → game.js cura
      get golGrito() { const gjn = golJustNow; golJustNow = false; return gjn; },    // one-shot por gol (sfx/telemetría)
      update, draw,
      // e2e: correr la secuencia completa del estadio (entrar → chori → 4 goles → satélite → portal)
      __full: () => { phase = 'estadio'; st = 'pt1'; stT = 0;
        for (let k = 0; k < 2000 && !done; k++) { update(0.05);
          if (st === 'half' && !choriEaten) { player.x = (choriPuesto.x + 0.5) * CS; player.y = (choriPuesto.y - 1) * CS; interact(); }
          if (st === 'gol') interact(); }
        return { done, exitTo, goles, choriEaten }; },
      __enterEstadio: () => { player.x = (estadioDoor.x + 0.5) * CS; player.y = (estadioDoor.y + 1.2) * CS; interact(); return phase; },   // e2e: de la calle al estadio
    };
  }
  return { create };
})();
if (typeof window !== 'undefined') window.Campana = Campana;
if (typeof module !== 'undefined') module.exports = Campana;
