// tigre.js — SUB-MODO "LA CANCHA DE TIGRE" (andenes-vivos.md, v367). Desde el andén de Tigre salís a la
// cancha de Victoria (el Dellagiovanna): juegan TIGRE vs VILLA DÁLMINE. Secuencia: 1er tiempo → gol de Tigre
// → vos GRITÁS el empate [E] → SE PUDRE (bengalas, corridas) → el árbitro SUSPENDE por violencia → y el
// folclore puro: LAS DOS HINCHADAS SE JUNTAN (azul/rojo + violeta mezclados) para encarar a los canas — vos
// cantás CON las dos [E]. Aislado: al salir (done, exitTo 'back') el juego principal queda EXACTO.
const Tigre = (() => {
  const T = (k, p) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(k, p) : k;
  const CS = 30, W = 18, H = 12;
  const AZUL = '#1f4e8f', ROJO = '#c22a1e';            // los colores de Tigre
  const VIOLETA = '#6a3d9a', VIOLETA2 = '#8a5cc4';     // los de Dálmine

  function create(opts) {
    opts = opts || {};
    let st = 'pt1', stT = 0, done = false, exitTo = null, t = 0, msg = '', msgT = 0, prompt = '';
    let escHeld = false, eHeld = false, clasicoJustNow = false;
    const map = Array.from({ length: H }, () => new Array(W).fill(0));
    for (let x = 0; x < W; x++) { map[0][x] = 1; map[H - 1][x] = 1; }
    for (let y = 0; y < H; y++) { map[y][0] = 1; map[y][W - 1] = 1; }
    const player = { x: 12 * CS, y: 8.5 * CS, r: 10, dir: 1, walk: 0 };   // arrancás en la popular visitante
    const ball = { x: 0.4, y: 0.5, vx: 0.5, vy: 0.3 };
    // las dos hinchadas: local (izq, azul/rojo) y visitante (der, violeta). En la 'juntada' se MEZCLAN y bajan.
    const hinchas = [];
    for (let i = 0; i < 30; i++) hinchas.push({ x: (i < 15 ? 1.8 + (i % 8) * 0.95 : 9.8 + (i % 8) * 0.95), y: 5.6 + Math.floor((i % 15) / 8) * 1.1, local: i < 15, ph: i * 0.7, mixX: 2 + (i * 0.53) % 14 });
    const bengalas = [];                                  // partículas de bengala (se pudre)
    let golT = 0, golDal = 0, golTig = 0;
    setMsg(T('g.tigre.enter'), 8);

    function setMsg(s, d = 4) { msg = s; msgT = d; }
    function solid(px, py) { const tx = Math.floor(px / CS), ty = Math.floor(py / CS); if (tx < 0 || ty < 0 || tx >= W || ty >= H) return true; return map[ty][tx] === 1; }
    function freeAt(x, y) { const r = player.r; return !solid(x - r, y - r) && !solid(x + r, y - r) && !solid(x - r, y + r) && !solid(x + r, y + r); }

    function interact() {
      if (st === 'gol') {                                 // ¡GRITÁS EL EMPATE!
        golDal = 1; st = 'lio'; stT = 0; setMsg(T('g.tigre.grito'), 6);
        if (typeof Sfx !== 'undefined' && Sfx.win) Sfx.win(); return;
      }
      if (st === 'juntada') {                             // cantás CON LAS DOS hinchadas
        st = 'canto'; stT = 0; clasicoJustNow = true; setMsg(T('g.tigre.cantoJuntos'), 8);
        if (typeof Sfx !== 'undefined' && Sfx.win) Sfx.win(); return;
      }
      setMsg(T('g.tigre.hint'), 4);
    }

    function update(dt) {
      t += dt; msgT -= dt; stT += dt;
      if (st === 'pt1' || st === 'pt2' || st === 'gol') { ball.x += ball.vx * dt; ball.y += ball.vy * dt;
        if (ball.x < 0.05 || ball.x > 0.95) ball.vx *= -1; if (ball.y < 0.06 || ball.y > 0.94) ball.vy *= -1; }
      if (st === 'pt1' && stT > 6) { st = 'golTigre'; stT = 0; golTig = 1; setMsg(T('g.tigre.golTigre'), 6); if (typeof Sfx !== 'undefined' && Sfx.coin) Sfx.coin(); }
      else if (st === 'golTigre' && stT > 3.2) { st = 'pt2'; stT = 0; setMsg(T('g.tigre.pt2'), 5); }
      else if (st === 'pt2' && stT > 3.4) { st = 'gol'; stT = 0; setMsg(T('g.tigre.golAnuncio'), 7); if (typeof Sfx !== 'undefined' && Sfx.coin) Sfx.coin(); }
      else if (st === 'lio') {
        if (Math.random() < dt * 9) bengalas.push({ x: (1.5 + Math.random() * 15) * CS, y: (5.2 + Math.random() * 5) * CS, vy: -30 - Math.random() * 40, life: 1.6, hue: Math.random() < 0.5 ? '#ff4a2a' : '#ff9a2a' });
        if (stT > 5) { st = 'susp'; stT = 0; setMsg(T('g.tigre.suspendido'), 8); if (typeof Sfx !== 'undefined' && Sfx.empty) Sfx.empty(); }
      }
      else if (st === 'susp' && stT > 4) { st = 'juntada'; stT = 0; setMsg(T('g.tigre.juntada'), 9); }
      else if (st === 'canto' && stT > 6) { done = true; exitTo = 'back'; }
      // bengalas caen
      for (let i = bengalas.length - 1; i >= 0; i--) { const b = bengalas[i]; b.y += b.vy * dt; b.vy += 26 * dt; b.life -= dt; if (b.life <= 0) bengalas.splice(i, 1); }
      // en la juntada las hinchadas se MEZCLAN (cada uno migra a su mixX) y bajan hacia la línea de canas
      if (st === 'juntada' || st === 'canto') for (const h of hinchas) { h.x += (h.mixX - h.x) * dt * 1.2; h.y += ((st === 'canto' ? 8.2 : 7.6) - h.y) * dt * 0.8; }
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
      prompt = st === 'gol' ? T('g.tigre.promptGrito') : st === 'juntada' ? T('g.tigre.promptJuntos') : '';
    }

    function draw(g, VW, VH) {
      const ox = (VW - W * CS) / 2, oy = (VH - H * CS) / 2;
      g.fillStyle = '#0b0d10'; g.fillRect(0, 0, VW, VH);                    // base FULL-canvas (gotcha v365)
      // campo (arriba)
      g.fillStyle = '#1f5a2a'; g.fillRect(ox + CS, oy + CS, (W - 2) * CS, 3.4 * CS);
      g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 2;
      g.strokeRect(ox + 1.4 * CS, oy + 1.3 * CS, (W - 2.8) * CS, 2.9 * CS);
      g.beginPath(); g.moveTo(ox + W / 2 * CS, oy + 1.3 * CS); g.lineTo(ox + W / 2 * CS, oy + 4.2 * CS); g.stroke();
      g.strokeRect(ox + 1.4 * CS, oy + 2.2 * CS, 10, 1.2 * CS); g.strokeRect(ox + (W - 1.4) * CS - 10, oy + 2.2 * CS, 10, 1.2 * CS);
      const enJuego = st === 'pt1' || st === 'golTigre' || st === 'pt2' || st === 'gol';
      if (enJuego) {                                                        // jugadores: Tigre (azul/rojo) vs Dálmine (violeta)
        for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? VIOLETA2 : AZUL; g.beginPath(); g.arc(ox + (2.5 + i * 1.7) * CS + Math.sin(t * 1.5 + i) * 8, oy + (2 + (i % 3) * 0.8) * CS, 3, 0, Math.PI * 2); g.fill(); }
        const fx = ox + 1.4 * CS + ball.x * (W - 2.8) * CS, fy = oy + 1.3 * CS + ball.y * 2.9 * CS;
        g.fillStyle = '#fff'; g.beginPath(); g.arc(fx, fy, 3, 0, Math.PI * 2); g.fill();
      } else {                                                              // campo vacío: el partido no sigue
        g.fillStyle = 'rgba(255,255,255,0.25)'; g.font = 'bold 12px monospace'; g.textAlign = 'center';
        g.fillText(T('g.tigre.campoVacio'), ox + W / 2 * CS, oy + 2.8 * CS);
      }
      // tribuna (abajo): cemento
      for (let y = 5; y < H; y++) for (let x = 1; x < W - 1; x++) { g.fillStyle = ((x + y) & 1) ? '#262a30' : '#20242a'; g.fillRect(ox + x * CS, oy + y * CS, CS, CS); }
      // los CANAS (aparecen en la juntada): fila de escudos abajo
      if (st === 'juntada' || st === 'canto') {
        const cy = oy + (st === 'canto' ? 10.6 : 10.2) * CS;                 // en el canto RETROCEDEN
        for (let i = 0; i < 10; i++) { const cx = ox + (2.2 + i * 1.5) * CS;
          g.fillStyle = '#101826'; g.fillRect(cx - 6, cy - 14, 12, 16);      // uniforme azul oscuro
          g.fillStyle = '#e0a878'; g.beginPath(); g.arc(cx, cy - 17, 4, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#0a0f18'; g.fillRect(cx - 5, cy - 22, 10, 4);       // gorra
          g.fillStyle = 'rgba(180,200,220,0.75)'; g.fillRect(cx - 8, cy - 12, 6, 14); }   // el escudo
      }
      // las DOS hinchadas
      for (const h of hinchas) { const hx = ox + h.x * CS, hy = oy + h.y * CS - ((st === 'canto' || st === 'golTigre' || st === 'lio') ? Math.abs(Math.sin(t * 8 + h.ph)) * 5 : Math.abs(Math.sin(t * 2 + h.ph)) * 1.5);
        g.fillStyle = h.local ? ((h.ph % 2 < 1) ? AZUL : ROJO) : ((h.ph % 2 < 1) ? VIOLETA : VIOLETA2);
        g.fillRect(hx - 4, hy - 3, 8, 11);
        g.fillStyle = '#e0a878'; g.beginPath(); g.arc(hx, hy - 7, 4, 0, Math.PI * 2); g.fill(); }
      // bengalas
      for (const b of bengalas) { g.fillStyle = b.hue; g.beginPath(); g.arc(ox + b.x, oy + b.y, 3, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(255,180,80,' + (b.life * 0.3) + ')'; g.beginPath(); g.arc(ox + b.x, oy + b.y, 7, 0, Math.PI * 2); g.fill(); }
      // humo del lío
      if (st === 'lio' || st === 'susp') { g.fillStyle = 'rgba(200,200,200,0.10)'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(ox + (4 + i * 5) * CS + Math.sin(t + i) * 10, oy + 6 * CS - ((t * 20 + i * 30) % 90), 28, 0, Math.PI * 2); g.fill(); } }
      // marcador
      g.fillStyle = '#0d1017'; g.fillRect(ox + W * CS / 2 - 110, oy + 0.15 * CS, 220, 20);
      g.fillStyle = '#ffd54f'; g.font = 'bold 11px monospace'; g.textAlign = 'center';
      const estado = st === 'pt1' || st === 'golTigre' ? '1T' : (st === 'pt2' || st === 'gol') ? '2T' : T('g.tigre.susTag');
      g.fillText('TIGRE ' + golTig + ' — ' + golDal + ' V. DÁLMINE · ' + estado, ox + W * CS / 2, oy + 0.15 * CS + 14);
      // banners de secuencia
      if (st === 'gol') { g.fillStyle = 'rgba(106,61,154,' + (0.5 + 0.3 * Math.sin(t * 6)) + ')'; g.fillRect(0, VH / 2 - 40, VW, 80);
        g.fillStyle = '#fff'; g.font = 'bold 28px monospace'; g.textAlign = 'center'; g.fillText(T('g.tigre.golBanner'), VW / 2, VH / 2 + 10); }
      if (st === 'susp') { g.fillStyle = 'rgba(160,30,30,' + (0.5 + 0.3 * Math.sin(t * 5)) + ')'; g.fillRect(0, VH / 2 - 40, VW, 80);
        g.fillStyle = '#fff'; g.font = 'bold 26px monospace'; g.textAlign = 'center'; g.fillText(T('g.tigre.suspBanner'), VW / 2, VH / 2 + 10); }
      if (st === 'canto') { g.fillStyle = 'rgba(30,40,80,' + (0.4 + 0.25 * Math.sin(t * 6)) + ')'; g.fillRect(0, VH / 2 - 34, VW, 68);
        g.fillStyle = '#fff'; g.font = 'bold 17px monospace'; g.textAlign = 'center'; g.fillText(T('g.tigre.cantoBanner'), VW / 2, VH / 2 + 6); }
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
      get clasicoEdge() { const c = clasicoJustNow; clasicoJustNow = false; return c; },   // one-shot: cantaste con las DOS hinchadas
      update, draw,
      // e2e: la secuencia completa (1T → gol de Tigre → gritás el empate → lío → suspendido → juntada → canto)
      __full: () => { for (let k = 0; k < 2000 && !done; k++) { update(0.05); if (st === 'gol' || st === 'juntada') interact(); } return { done, exitTo, golTig, golDal, st }; },
      __state: () => ({ st, golTig, golDal }),
    };
  }
  return { create };
})();
if (typeof window !== 'undefined') window.Tigre = Tigre;
if (typeof module !== 'undefined') module.exports = Tigre;
