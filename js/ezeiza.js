// ezeiza.js — SUB-MODO "LA FINAL DEL ASCENSO" (andenes-vivos.md, v368). Desde el andén de Ezeiza salís al
// estadio 20 de Junio: TRISTÁN SUÁREZ (el Lechero, verde) vs VILLA DÁLMINE — la FINAL por el ascenso.
// Secuencia: 1er tiempo 0-0 con los aviones pasando bajito → GRITÁS EL GOL de Dálmine [E] → EL AGUANTE
// (Tristán aprieta: alentá [E] ×3, el arquero ataja todo) → PITAZO FINAL → ¡VILLA DÁLMINE A LA NACIONAL B!
// (fiesta violeta, papelitos). Aislado: al salir (done, exitTo 'back') el juego principal queda EXACTO.
const Ezeiza = (() => {
  const T = (k, p) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(k, p) : k;
  const CS = 30, W = 18, H = 12;
  const VERDE = '#2a7a3a', VERDE2 = '#3f9a50';          // los colores del Lechero
  const VIOLETA = '#6a3d9a', VIOLETA2 = '#8a5cc4';

  function create(opts) {
    opts = opts || {};
    let st = 'pt1', stT = 0, done = false, exitTo = null, t = 0, msg = '', msgT = 0, prompt = '';
    let escHeld = false, eHeld = false, ascensoJustNow = false;
    let gol = 0, aliento = 0, avionX = -100;
    const map = Array.from({ length: H }, () => new Array(W).fill(0));
    for (let x = 0; x < W; x++) { map[0][x] = 1; map[H - 1][x] = 1; }
    for (let y = 0; y < H; y++) { map[y][0] = 1; map[y][W - 1] = 1; }
    const player = { x: 12 * CS, y: 8.5 * CS, r: 10, dir: 1, walk: 0 };
    const ball = { x: 0.6, y: 0.5, vx: 0.55, vy: 0.3 };
    const papelitos = [];                                 // la fiesta del ascenso
    setMsg(T('g.ezeiza.enter'), 8);

    function setMsg(s, d = 4) { msg = s; msgT = d; }
    function solid(px, py) { const tx = Math.floor(px / CS), ty = Math.floor(py / CS); if (tx < 0 || ty < 0 || tx >= W || ty >= H) return true; return map[ty][tx] === 1; }
    function freeAt(x, y) { const r = player.r; return !solid(x - r, y - r) && !solid(x + r, y - r) && !solid(x - r, y + r) && !solid(x + r, y + r); }

    function interact() {
      if (st === 'gol') {                                 // ¡GRITÁS EL GOL DEL ASCENSO!
        gol = 1; st = 'aguante'; stT = 0; setMsg(T('g.ezeiza.grito'), 6);
        if (typeof Sfx !== 'undefined' && Sfx.win) Sfx.win(); return;
      }
      if (st === 'aguante') {                             // alentá: cada [E] es un ataque del Lechero que se ataja
        aliento++; stT = 0;
        setMsg(T('g.ezeiza.ataja' + Math.min(aliento, 3)), 5);
        if (typeof Sfx !== 'undefined' && Sfx.coin) Sfx.coin();
        if (aliento >= 3) { st = 'pitazo'; stT = 0; setMsg(T('g.ezeiza.pitazo'), 6); }
        return;
      }
      setMsg(T('g.ezeiza.hint'), 4);
    }

    function update(dt) {
      t += dt; msgT -= dt; stT += dt;
      avionX += dt * 130; if (avionX > W * CS + 140) avionX = -140;   // Ezeiza: los aviones pasan bajito
      if (st !== 'ascenso' && st !== 'pitazo') { ball.x += ball.vx * dt; ball.y += ball.vy * dt;
        if (ball.x < 0.05 || ball.x > 0.95) ball.vx *= -1; if (ball.y < 0.06 || ball.y > 0.94) ball.vy *= -1; }
      if (st === 'pt1' && stT > 6.5) { st = 'gol'; stT = 0; setMsg(T('g.ezeiza.golAnuncio'), 7); if (typeof Sfx !== 'undefined' && Sfx.coin) Sfx.coin(); }
      else if (st === 'aguante' && stT > 7) { setMsg(T('g.ezeiza.apuran'), 5); stT = 0; }   // recordatorio si no alentás
      else if (st === 'pitazo' && stT > 2.4) { st = 'ascenso'; stT = 0; ascensoJustNow = true; setMsg(T('g.ezeiza.ascenso'), 10); if (typeof Sfx !== 'undefined' && Sfx.win) Sfx.win(); }
      else if (st === 'ascenso') {
        if (Math.random() < dt * 30) papelitos.push({ x: Math.random() * W * CS, y: -6, vy: 24 + Math.random() * 30, vx: (Math.random() - 0.5) * 24, ph: Math.random() * 6 });
        if (stT > 7) { done = true; exitTo = 'back'; }
      }
      for (let i = papelitos.length - 1; i >= 0; i--) { const p = papelitos[i]; p.y += p.vy * dt; p.x += (p.vx + Math.sin(t * 3 + p.ph) * 14) * dt; if (p.y > H * CS) papelitos.splice(i, 1); }
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
      prompt = st === 'gol' ? T('g.ezeiza.promptGrito') : st === 'aguante' ? T('g.ezeiza.promptAliento', { n: aliento, m: 3 }) : '';
    }

    function draw(g, VW, VH) {
      const ox = (VW - W * CS) / 2, oy = (VH - H * CS) / 2;
      g.fillStyle = '#0b0d10'; g.fillRect(0, 0, VW, VH);                    // base FULL-canvas (gotcha v365)
      // el AVIÓN pasando bajito (Ezeiza al fondo)
      g.fillStyle = '#8a95a5'; g.fillRect(ox + avionX, oy + 0.45 * CS, 46, 7);
      g.beginPath(); g.moveTo(ox + avionX + 46, oy + 0.45 * CS + 1); g.lineTo(ox + avionX + 62, oy + 0.45 * CS + 1); g.lineTo(ox + avionX + 46, oy + 0.45 * CS + 8); g.fill();
      g.fillStyle = 'rgba(200,210,220,0.25)'; g.fillRect(ox + avionX - 26, oy + 0.5 * CS + 2, 24, 2);
      // campo
      g.fillStyle = '#1f5a2a'; g.fillRect(ox + CS, oy + CS, (W - 2) * CS, 3.4 * CS);
      g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 2;
      g.strokeRect(ox + 1.4 * CS, oy + 1.3 * CS, (W - 2.8) * CS, 2.9 * CS);
      g.beginPath(); g.moveTo(ox + W / 2 * CS, oy + 1.3 * CS); g.lineTo(ox + W / 2 * CS, oy + 4.2 * CS); g.stroke();
      g.strokeRect(ox + 1.4 * CS, oy + 2.2 * CS, 10, 1.2 * CS); g.strokeRect(ox + (W - 1.4) * CS - 10, oy + 2.2 * CS, 10, 1.2 * CS);
      // jugadores: Lechero (verde) vs Dálmine (violeta)
      if (st !== 'ascenso') { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? VIOLETA2 : VERDE; g.beginPath(); g.arc(ox + (2.5 + i * 1.7) * CS + Math.sin(t * (st === 'aguante' ? 2.6 : 1.5) + i) * 8, oy + (2 + (i % 3) * 0.8) * CS, 3, 0, Math.PI * 2); g.fill(); }
        const fx = ox + 1.4 * CS + ball.x * (W - 2.8) * CS, fy = oy + 1.3 * CS + ball.y * 2.9 * CS;
        g.fillStyle = '#fff'; g.beginPath(); g.arc(fx, fy, 3, 0, Math.PI * 2); g.fill(); }
      else {                                                                // el campo es de Dálmine: vuelta olímpica
        for (let i = 0; i < 8; i++) { const a = t * 0.9 + i * 0.8; g.fillStyle = VIOLETA2; g.beginPath(); g.arc(ox + W / 2 * CS + Math.cos(a) * 5.6 * CS, oy + 2.7 * CS + Math.sin(a) * 1.1 * CS, 3, 0, Math.PI * 2); g.fill(); }
      }
      // tribuna: mitad verde (local) + mitad violeta (visitante)
      for (let y = 5; y < H; y++) for (let x = 1; x < W - 1; x++) { g.fillStyle = ((x + y) & 1) ? '#262a30' : '#20242a'; g.fillRect(ox + x * CS, oy + y * CS, CS, CS); }
      for (let i = 0; i < 26; i++) { const local = i % 13 < 6; const hx = ox + (1.8 + (i % 13) * 1.15) * CS, hy = oy + (5.6 + Math.floor(i / 13) * 1.1) * CS - ((st === 'ascenso' && !local) || st === 'gol' ? Math.abs(Math.sin(t * 9 + i)) * 5 : Math.abs(Math.sin(t * 2 + i)) * 1.5);
        g.fillStyle = local ? (i % 2 ? VERDE : VERDE2) : (i % 2 ? VIOLETA : VIOLETA2); g.beginPath(); g.arc(hx, hy, 4, 0, Math.PI * 2); g.fill(); }
      // marcador
      g.fillStyle = '#0d1017'; g.fillRect(ox + W * CS / 2 - 128, oy + 0.15 * CS, 256, 20);
      g.fillStyle = '#ffd54f'; g.font = 'bold 11px monospace'; g.textAlign = 'center';
      g.fillText('T. SUÁREZ 0 — ' + gol + ' V. DÁLMINE · ' + T('g.ezeiza.finalTag'), ox + W * CS / 2, oy + 0.15 * CS + 14);
      // banners
      if (st === 'gol') { g.fillStyle = 'rgba(106,61,154,' + (0.5 + 0.3 * Math.sin(t * 6)) + ')'; g.fillRect(0, VH / 2 - 40, VW, 80);
        g.fillStyle = '#fff'; g.font = 'bold 28px monospace'; g.textAlign = 'center'; g.fillText(T('g.ezeiza.golBanner'), VW / 2, VH / 2 + 10); }
      if (st === 'ascenso') { g.fillStyle = 'rgba(106,61,154,' + (0.5 + 0.25 * Math.sin(t * 6)) + ')'; g.fillRect(0, VH / 2 - 40, VW, 80);
        g.fillStyle = '#fff'; g.font = 'bold 22px monospace'; g.textAlign = 'center'; g.fillText(T('g.ezeiza.ascensoBanner'), VW / 2, VH / 2 + 8); }
      // papelitos violetas
      for (const p of papelitos) { g.fillStyle = (p.ph % 2 < 1) ? VIOLETA2 : '#e8e0ff'; g.fillRect(ox + p.x, oy + p.y, 3, 4); }
      // jugador
      const px = ox + player.x, py = oy + player.y;
      g.fillStyle = '#111'; g.beginPath(); g.ellipse(px, py + 10, 10, 4, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffcf5b'; g.beginPath(); g.arc(px, py, player.r, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#0a0a0a'; g.fillRect(px + player.dir * 3 - 1, py - 3, 2, 2);
      if (prompt) { g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(0, VH - 54, VW, 22); g.fillStyle = '#7ff3ff'; g.font = 'bold 13px monospace'; g.textAlign = 'center'; g.fillText(prompt, VW / 2, VH - 38); }
      if (msgT > 0 && msg) { g.fillStyle = 'rgba(0,0,0,0.72)'; g.fillRect(0, VH - 30, VW, 26); g.fillStyle = '#e8f0ff'; g.font = '13px monospace'; g.textAlign = 'center'; g.fillText(msg, VW / 2, VH - 12); }
    }

    return {
      get done() { return done; }, get exitTo() { return exitTo; },
      get ascensoEdge() { const a = ascensoJustNow; ascensoJustNow = false; return a; },   // one-shot: ¡Dálmine a la NACIONAL B!
      update, draw,
      // e2e: la final completa (1T → gritás el gol → aguante ×3 → pitazo → ascenso → done)
      __full: () => { for (let k = 0; k < 2000 && !done; k++) { update(0.05); if (st === 'gol' || st === 'aguante') { eHeld = false; interact(); } } return { done, exitTo, gol, aliento, st }; },
      __state: () => ({ st, gol, aliento }),
    };
  }
  return { create };
})();
if (typeof window !== 'undefined') window.Ezeiza = Ezeiza;
if (typeof module !== 'undefined') module.exports = Ezeiza;
