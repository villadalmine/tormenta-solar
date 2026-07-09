// cancha.js — SUB-MODO "EL MONUMENTAL" (subte.md §12, S3/S4). Te colás desde el piquete de la UBA (que está al
// lado) al estadio de River, justo en el clásico con Boca. Vista top-down: la tribuna, la cancha abajo con la
// jugada, la hinchada de River (roja/blanca) de tu lado y la de Boca (azul/amarilla) enfrente. Alentás a River y,
// del lado de Boca, MANOTEÁS una bandera/remera que quedó al alcance → te la robás (item `boca_trapo`) para
// destrabar al maquinista curda de Villa Ballester. Aislado: al salir (done) el juego principal queda EXACTO.
const Cancha = (() => {
  const T = (k, p) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(k, p) : k;
  const CS = 30, W = 18, H = 12;

  function create(opts) {
    opts = opts || {};
    const map = Array.from({ length: H }, () => new Array(W).fill(0));
    for (let x = 0; x < W; x++) { map[0][x] = 1; map[H - 1][x] = 1; }
    for (let y = 0; y < H; y++) { map[y][0] = 1; map[y][W - 1] = 1; }
    // la baranda que separa la tribuna del campo (fila y=4, sólida salvo dos huecos de escalera)
    for (let x = 2; x < W - 2; x++) map[4][x] = 1;
    map[4][5] = 0; map[4][12] = 0;
    const salida = { x: 9, y: 10 };                  // volvés (por donde te colaste)
    const trapo = { x: 14.5, y: 7 };                 // la bandera de Boca (lado visitante, derecha)
    const player = { x: 9 * CS, y: 9 * CS, r: 10, dir: 1, walk: 0 };
    let done = false, exitTo = null, t = 0, msg = '', msgT = 0, prompt = '', escHeld = false, eHeld = false;
    let gotTrapo = !!opts.gotTrapo, trapoJustNow = false, cantoT = 0, ball = { x: 0.5, y: 0.5, vx: 0.4, vy: 0.3 };
    setMsg(T('g.cancha.enter'), 8);

    function setMsg(s, d = 4) { msg = s; msgT = d; }
    function solid(px, py) { const tx = Math.floor(px / CS), ty = Math.floor(py / CS); if (tx < 0 || ty < 0 || tx >= W || ty >= H) return true; return map[ty][tx] === 1; }
    function freeAt(x, y) { const r = player.r; return !solid(x - r, y - r) && !solid(x + r, y - r) && !solid(x - r, y + r) && !solid(x + r, y + r); }
    function near(c, d = 1.5) { return Math.hypot(player.x - (c.x + 0.5) * CS, player.y - (c.y + 0.5) * CS) < CS * d; }

    function interact() {
      if (near(salida, 1.5)) { done = true; exitTo = 'back'; if (typeof Sfx !== 'undefined' && Sfx.pickup) Sfx.pickup(); return; }
      if (!gotTrapo && near(trapo, 1.6)) {   // manoteás la bandera de Boca del lado visitante
        gotTrapo = true; trapoJustNow = true; setMsg(T('g.cancha.robo'), 8); if (typeof Sfx !== 'undefined' && Sfx.pickup) Sfx.pickup(); return;
      }
      cantoT = 3; setMsg(T('g.cancha.canto'), 4); if (typeof Sfx !== 'undefined' && Sfx.coin) Sfx.coin();   // alentás a River
    }

    function update(dt) {
      t += dt; msgT -= dt; if (cantoT > 0) cantoT -= dt;
      // la pelota rebota en el campo (decoración de la jugada)
      ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      if (ball.x < 0.05 || ball.x > 0.95) ball.vx *= -1; if (ball.y < 0.05 || ball.y > 0.95) ball.vy *= -1;
      player.walk = 0;
      const sp = 165 * dt; let mvx = 0, mvy = 0;
      if (Input.keys['arrowleft'] || Input.keys['a']) mvx = -1;
      if (Input.keys['arrowright'] || Input.keys['d']) mvx = 1;
      if (Input.keys['arrowup'] || Input.keys['w']) mvy = -1;
      if (Input.keys['arrowdown'] || Input.keys['s']) mvy = 1;
      if (mvx) player.dir = mvx;
      if (mvx && freeAt(player.x + mvx * sp, player.y)) { player.x += mvx * sp; player.walk = 1; }
      if (mvy && freeAt(player.x, player.y + mvy * sp)) { player.y += mvy * sp; player.walk = 1; }
      if (Input.keys['escape']) { if (!escHeld) { escHeld = true; done = true; exitTo = 'back'; } } else escHeld = false;
      if (Input.keys['e'] || Input.keys['enter']) { if (!eHeld) { eHeld = true; interact(); } } else eHeld = false;
      if (near(salida, 1.5)) prompt = T('g.cancha.promptSalir');
      else if (!gotTrapo && near(trapo, 1.6)) prompt = T('g.cancha.promptRobo');
      else prompt = T('g.cancha.promptCanto');
    }

    function draw(g, VW, VH) {
      const ox = (VW - W * CS) / 2, oy = (VH - H * CS) / 2;
      g.fillStyle = '#0b0f0b'; g.fillRect(0, 0, VW, VH);
      // CAMPO (arriba, tras la baranda): césped + líneas + la jugada
      g.fillStyle = '#1f5a2a'; g.fillRect(ox + CS, oy + CS, (W - 2) * CS, 3 * CS);
      g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 2;
      g.strokeRect(ox + 1.4 * CS, oy + 1.3 * CS, (W - 2.8) * CS, 2.5 * CS);
      g.beginPath(); g.moveTo(ox + W / 2 * CS, oy + 1.3 * CS); g.lineTo(ox + W / 2 * CS, oy + 3.8 * CS); g.stroke();
      g.beginPath(); g.arc(ox + W / 2 * CS, oy + 2.5 * CS, 18, 0, Math.PI * 2); g.stroke();
      // jugadores (puntitos) + la pelota
      const fx = ox + 1.4 * CS + ball.x * (W - 2.8) * CS, fy = oy + 1.3 * CS + ball.y * 2.5 * CS;
      g.fillStyle = '#fff'; g.beginPath(); g.arc(fx, fy, 3, 0, Math.PI * 2); g.fill();
      for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#e2231a' : '#f2c200'; g.beginPath(); g.arc(ox + (3 + i * 2.2) * CS + Math.sin(t + i) * 4, oy + (2 + (i % 2)) * CS, 3, 0, Math.PI * 2); g.fill(); }
      // baranda
      g.fillStyle = '#39424f'; g.fillRect(ox + 2 * CS, oy + 4 * CS, (W - 4) * CS, 8);
      g.fillStyle = '#0b0f0b'; g.fillRect(ox + 5 * CS, oy + 4 * CS, CS, 8); g.fillRect(ox + 12 * CS, oy + 4 * CS, CS, 8);
      // TRIBUNA (abajo): baldosas de cemento
      for (let y = 5; y < H; y++) for (let x = 1; x < W - 1; x++) { g.fillStyle = ((x + y) & 1) ? '#2a2f36' : '#232830'; g.fillRect(ox + x * CS, oy + y * CS, CS, CS); }
      // hinchada de RIVER (tu lado, izquierda: rojo/blanco) — cabecitas que saltan con el canto
      for (let i = 0; i < 18; i++) { const hx = ox + (1.6 + (i % 6) * 1.1) * CS, hy = oy + (5.4 + Math.floor(i / 6) * 1.0) * CS - (cantoT > 0 ? Math.abs(Math.sin(t * 8 + i)) * 4 : 0);
        g.fillStyle = i % 2 ? '#e2231a' : '#e8f0ff'; g.beginPath(); g.arc(hx, hy, 4, 0, Math.PI * 2); g.fill(); }
      // hinchada de BOCA (enfrente, derecha: azul/amarillo)
      for (let i = 0; i < 15; i++) { const hx = ox + (11.4 + (i % 5) * 1.1) * CS, hy = oy + (5.4 + Math.floor(i / 5) * 1.0) * CS;
        g.fillStyle = i % 2 ? '#1f4aa8' : '#f2c200'; g.beginPath(); g.arc(hx, hy, 4, 0, Math.PI * 2); g.fill(); }
      // la BANDERA de Boca al alcance (si no la agarraste)
      if (!gotTrapo) { const tx = ox + trapo.x * CS, ty = oy + trapo.y * CS;
        g.fillStyle = '#1f4aa8'; g.fillRect(tx - 14, ty - 8, 28, 16); g.fillStyle = '#f2c200'; g.fillRect(tx - 14, ty - 2, 28, 4);
        g.fillStyle = '#0d1017'; g.font = '7px monospace'; g.textAlign = 'center'; g.fillText('BOCA', tx, ty + 2);
        g.strokeStyle = 'rgba(255,215,80,' + (0.4 + 0.4 * Math.sin(t * 4)) + ')'; g.lineWidth = 2; g.strokeRect(tx - 15, ty - 9, 30, 18); }
      // SALIDA (por donde te colaste)
      const sx = ox + salida.x * CS, sy = oy + salida.y * CS;
      g.fillStyle = '#22303c'; g.fillRect(sx - 14, sy - 4, 28, 20);
      g.fillStyle = '#9fe6a0'; g.font = '9px monospace'; g.textAlign = 'center'; g.fillText('◀ SALIR', sx, sy + 26);
      // jugador (con la bandera de Boca al hombro si la robaste)
      const px = ox + player.x, py = oy + player.y;
      g.fillStyle = '#111'; g.beginPath(); g.ellipse(px, py + 10, 10, 4, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffcf5b'; g.beginPath(); g.arc(px, py, player.r, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#0a0a0a'; g.fillRect(px + player.dir * 3 - 1, py - 3, 2, 2);
      if (gotTrapo) { g.fillStyle = '#1f4aa8'; g.fillRect(px + player.dir * 6, py - 12, 12, 8); g.fillStyle = '#f2c200'; g.fillRect(px + player.dir * 6, py - 6, 12, 3); }
      // cartel del clásico arriba
      g.fillStyle = '#0d1017cc'; g.fillRect(ox + W * CS / 2 - 92, oy + 0.15 * CS, 184, 18);
      g.fillStyle = '#ffd54f'; g.font = 'bold 11px monospace'; g.textAlign = 'center'; g.fillText('EL MONUMENTAL · RIVER vs BOCA', ox + W * CS / 2, oy + 0.15 * CS + 13);
      if (prompt) { g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(0, VH - 54, VW, 22); g.fillStyle = '#7ff3ff'; g.font = 'bold 13px monospace'; g.textAlign = 'center'; g.fillText(prompt, VW / 2, VH - 38); }
      if (msgT > 0 && msg) { g.fillStyle = 'rgba(0,0,0,0.72)'; g.fillRect(0, VH - 30, VW, 26); g.fillStyle = '#e8f0ff'; g.font = '13px monospace'; g.textAlign = 'center'; g.fillText(msg, VW / 2, VH - 12); }
    }

    return {
      get done() { return done; }, get exitTo() { return exitTo; },
      get trapoEdge() { const j = trapoJustNow; trapoJustNow = false; return j; },   // one-shot: robaste la bandera de Boca → game.js da el item
      update, draw,
      __robo: () => { player.x = (trapo.x + 0.5) * CS; player.y = (trapo.y + 1.4) * CS; interact(); return { gotTrapo, edge: trapoJustNow }; },   // e2e: robar el trapo
      __leave: () => { player.x = (salida.x + 0.5) * CS; player.y = (salida.y + 0.5) * CS; interact(); return exitTo; },   // e2e: salir
    };
  }
  return { create };
})();
if (typeof window !== 'undefined') window.Cancha = Cancha;
if (typeof module !== 'undefined') module.exports = Cancha;
