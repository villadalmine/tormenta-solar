// retiro.js — SUB-MODO "ESTACIÓN RETIRO" (las grandes terminales del norte: Mitre / San Martín / Belgrano).
// Se llega por la Línea C del subte (la misma que Constitución, en la otra cabecera). La escalera del andén sube
// a ESTE hall. Vista top-down (patrón subte/constitucion). Basado en la terminal REAL del Mitre: la enorme
// bóveda de HIERRO Y VIDRIO, el gran hall, los molinetes de tren y locales. A diferencia de Constitución, la
// SALIDA A LA CALLE está habilitada: lleva a la Línea San Martín → Villa 31 (subte.md §11, E3/E4). Locales MOCK.
const Retiro = (() => {
  const T = (k, p) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(k, p) : k;
  const CS = 30, W = 20, H = 14;
  // Líneas/ramales REALES que salen de Retiro (DATA → cartel de salidas rotando). Flavor "oficial".
  const RAMALES = ['Mitre — Tigre', 'Mitre — J. L. Suárez', 'Belgrano Norte', 'San Martín — Pilar'];
  // Locales del hall (MOCK, data-driven): iteramos con interior real después.
  const LOCALES = [
    { id: 'cafe',    x: 2.4,  y: 8.5,  emoji: '☕' },
    { id: 'libreria',x: 2.4,  y: 11,   emoji: '📚' },
    { id: 'flores',  x: 17,   y: 8.5,  emoji: '💐' },
    { id: 'facturas',x: 17,   y: 11,   emoji: '🥐', sells: 'chori' },
    { id: 'boleteria', x: 10, y: 8.6,  emoji: '🎫' },
  ];

  function create(opts) {
    opts = opts || {};
    const map = Array.from({ length: H }, () => new Array(W).fill(0));
    for (let x = 0; x < W; x++) { map[0][x] = 1; map[H - 1][x] = 1; }
    for (let y = 0; y < H; y++) { map[y][0] = 1; map[y][W - 1] = 1; }
    const GATE_Y = 4, GATE_GAP = 9;
    for (let x = 2; x < W - 2; x++) if (x !== GATE_GAP && x !== GATE_GAP + 1) map[GATE_Y][x] = 2;
    const reloj = { x: 10, y: 6.4 };
    const escalera = { x: 10, y: 12 };               // baja al subte (Línea C)
    const salida = { x: 3, y: 12 };                  // a la calle → Línea San Martín / Villa 31 (HABILITADA)
    const player = { x: 10 * CS, y: 12 * CS, r: 10, dir: -1, walk: 0 };
    // KIOSCO (facturas): te vende un choripán 🌭 (comida que cura). Mismo patrón que el boletero del subte.
    const CHORI_PRICE = opts.choriPrice || 15;
    let coinsLeft = opts.coins || 0, purchase = null;
    let done = false, exitTo = null, t = 0, msg = '', msgT = 0, prompt = '', escHeld = false, eHeld = false, ramIdx = 0;
    let menuOpen = false, numHeld = {};   // menú de RAMALES del tren (al molinete)
    setMsg(T('g.retiro.enter'), 6);

    function setMsg(s, d = 4) { msg = s; msgT = d; }
    function solid(px, py) { const tx = Math.floor(px / CS), ty = Math.floor(py / CS); if (tx < 0 || ty < 0 || tx >= W || ty >= H) return true; return map[ty][tx] === 1 || map[ty][tx] === 2; }
    function freeAt(x, y) { const r = player.r; return !solid(x - r, y - r) && !solid(x + r, y - r) && !solid(x - r, y + r) && !solid(x + r, y + r); }
    function near(c, d = 1.5) { return Math.hypot(player.x - (c.x + 0.5) * CS, player.y - (c.y + 0.5) * CS) < CS * d; }
    function nearLocal() { return LOCALES.find(l => near(l, 1.4)); }

    function interact() {
      if (near(escalera)) { done = true; exitTo = 'back'; if (typeof Sfx !== 'undefined' && Sfx.pickup) Sfx.pickup(); return; }
      if (near(salida)) { done = true; exitTo = 'villa31'; if (typeof Sfx !== 'undefined' && Sfx.pickup) Sfx.pickup(); return; }   // a la calle → Línea San Martín / Villa 31
      const tx = Math.floor(player.x / CS), ty = Math.floor(player.y / CS);
      if (ty <= GATE_Y + 1 && (tx === GATE_GAP || tx === GATE_GAP + 1)) { menuOpen = !menuOpen; return; }   // molinete → menú de ramales del tren
      const loc = nearLocal();
      if (loc && loc.sells === 'chori') {   // KIOSCO: comprás un choripán 🌭 si te alcanza
        if (coinsLeft >= CHORI_PRICE) { coinsLeft -= CHORI_PRICE; purchase = { item: 'chori', spent: CHORI_PRICE };
          setMsg(T('g.retiro.buyChori', { p: CHORI_PRICE }), 6); if (typeof Sfx !== 'undefined' && Sfx.pickup) Sfx.pickup(); }
        else { setMsg(T('g.retiro.noCoins', { p: CHORI_PRICE }), 6); if (typeof Sfx !== 'undefined' && Sfx.empty) Sfx.empty(); }
        return;
      }
      if (loc) { setMsg(T('g.retiro.local', { n: T('g.retiro.loc_' + loc.id) }), 5); return; }
      if (near(reloj, 1.8)) { setMsg(T('g.retiro.reloj'), 6); return; }
      setMsg(T('g.retiro.hint'), 3);
    }

    function update(dt) {
      t += dt; msgT -= dt; ramIdx = Math.floor(t * 0.5) % RAMALES.length;
      player.walk = 0;
      const sp = 165 * dt; let mvx = 0, mvy = 0;
      if (Input.keys['arrowleft'] || Input.keys['a']) mvx = -1;
      if (Input.keys['arrowright'] || Input.keys['d']) mvx = 1;
      if (Input.keys['arrowup'] || Input.keys['w']) mvy = -1;
      if (Input.keys['arrowdown'] || Input.keys['s']) mvy = 1;
      if (mvx) player.dir = mvx;
      if (mvx && freeAt(player.x + mvx * sp, player.y)) { player.x += mvx * sp; player.walk = 1; }
      if (mvy && freeAt(player.x, player.y + mvy * sp)) { player.y += mvy * sp; player.walk = 1; }
      if (Input.keys['escape']) { if (!escHeld) { escHeld = true; if (menuOpen) menuOpen = false; else { done = true; exitTo = 'back'; } } } else escHeld = false;
      if (Input.keys['e'] || Input.keys['enter']) { if (!eHeld) { eHeld = true; interact(); } } else eHeld = false;
      if (menuOpen) for (let i = 0; i < RAMALES.length; i++) { const k = String(i + 1);
        if (Input.keys[k]) { if (!numHeld[k]) { numHeld[k] = true; menuOpen = false; exitTo = 'tren:' + RAMALES[i]; done = true; if (typeof Sfx !== 'undefined' && Sfx.pickup) Sfx.pickup(); } } else numHeld[k] = false; }
      const tx = Math.floor(player.x / CS), ty = Math.floor(player.y / CS);
      if (near(escalera)) prompt = T('g.retiro.promptSubte');
      else if (near(salida)) prompt = T('g.retiro.promptCalle');
      else if (ty <= GATE_Y + 1 && (tx === GATE_GAP || tx === GATE_GAP + 1)) prompt = T('g.retiro.promptAnden');
      else if (nearLocal() && nearLocal().sells === 'chori') prompt = T('g.retiro.promptChori', { p: CHORI_PRICE });
      else if (nearLocal()) prompt = T('g.retiro.promptLocal', { n: T('g.retiro.loc_' + nearLocal().id) });
      else if (near(reloj, 1.8)) prompt = T('g.retiro.promptReloj');
      else prompt = '';
    }

    function draw(g, VW, VH) {
      const ox = (VW - W * CS) / 2, oy = (VH - H * CS) / 2;
      g.fillStyle = '#0b0d12'; g.fillRect(0, 0, VW, VH);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        g.fillStyle = ((x + y) & 1) ? '#212630' : '#1b1f28';
        if (y < GATE_Y) g.fillStyle = ((x + y) & 1) ? '#10141b' : '#0c1016';
        g.fillRect(ox + x * CS, oy + y * CS, CS, CS);
      }
      // BÓVEDA de HIERRO Y VIDRIO (el sello del Mitre): arcos grandes con travesaños arriba
      g.strokeStyle = '#3a4658'; g.lineWidth = 2;
      for (let a = 1; a < W; a += 2) { g.beginPath(); g.arc(ox + a * CS, oy + 0.2 * CS, 1.4 * CS, 0, Math.PI, false); g.stroke(); }
      g.strokeStyle = 'rgba(120,150,180,0.25)'; g.lineWidth = 1;
      for (let a = 0; a <= W; a++) { g.beginPath(); g.moveTo(ox + a * CS, oy); g.lineTo(ox + a * CS, oy + 1.2 * CS); g.stroke(); }
      // VÍAS (arriba, tras los molinetes) — mock
      g.fillStyle = '#05070a'; g.fillRect(ox + CS, oy + 1.3 * CS, (W - 2) * CS, (GATE_Y - 1.3) * CS);
      g.strokeStyle = '#2a3240'; g.lineWidth = 2;
      for (const ry of [2.0, 2.7, 3.4]) { g.beginPath(); g.moveTo(ox + CS, oy + ry * CS); g.lineTo(ox + (W - 1) * CS, oy + ry * CS); g.stroke(); }
      g.fillStyle = '#7fd0ff'; g.font = 'bold 11px monospace'; g.textAlign = 'center';
      g.fillText('🚆 ' + T('g.retiro.railLabel'), ox + W * CS / 2, oy + 1.0 * CS);
      // MOLINETES
      for (let x = 2; x < W - 2; x++) { if (x === GATE_GAP || x === GATE_GAP + 1) continue;
        const mx = ox + x * CS, my = oy + GATE_Y * CS;
        g.fillStyle = '#39424f'; g.fillRect(mx + 4, my + 6, CS - 8, CS - 10);
        g.fillStyle = '#c9a24a'; g.fillRect(mx + 8, my + 2, CS - 16, 6); }
      g.fillStyle = 'rgba(201,162,74,0.18)'; g.fillRect(ox + GATE_GAP * CS, oy + GATE_Y * CS, 2 * CS, CS);
      // RELOJ
      const rx = ox + (reloj.x + 0.5) * CS, ry = oy + (reloj.y + 0.5) * CS;
      g.fillStyle = '#1c222b'; g.fillRect(rx - 26, ry - 42, 52, 40);
      g.fillStyle = '#e8e2c8'; g.beginPath(); g.arc(rx, ry - 22, 17, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#2a2a2a'; g.lineWidth = 2;
      const hh = t * 0.3, mm = t * 3.6;
      g.beginPath(); g.moveTo(rx, ry - 22); g.lineTo(rx + Math.cos(hh) * 8, ry - 22 + Math.sin(hh) * 8); g.stroke();
      g.beginPath(); g.moveTo(rx, ry - 22); g.lineTo(rx + Math.cos(mm) * 12, ry - 22 + Math.sin(mm) * 12); g.stroke();
      // cartel de SALIDAS (ramales)
      const bw = 170, bx = ox + W * CS / 2 - bw / 2, by = oy + (GATE_Y + 0.15) * CS;
      g.fillStyle = '#0d1017'; g.fillRect(bx, by, bw, 20);
      g.fillStyle = '#ffcf5b'; g.font = 'bold 11px monospace'; g.textAlign = 'center';
      g.fillText('▶ ' + RAMALES[ramIdx], bx + bw / 2, by + 14);
      // LOCALES (mock)
      for (const l of LOCALES) { const lx = ox + l.x * CS, ly = oy + l.y * CS;
        g.fillStyle = '#242a33'; g.fillRect(lx - 16, ly - 14, 34, 30);
        g.fillStyle = '#11151b'; g.fillRect(lx - 12, ly - 10, 26, 12);
        g.font = '15px monospace'; g.textAlign = 'center'; g.fillText(l.emoji, lx + 1, ly + 12);
      }
      // ESCALERA al subte C
      const ex = ox + escalera.x * CS, ey = oy + escalera.y * CS;
      g.fillStyle = '#1b222c'; g.fillRect(ex - CS, ey - 4, 2 * CS, CS);
      for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#232c38' : '#2c3644'; g.fillRect(ex - CS + 6, ey + i * 6 - 2, 2 * CS - 12, 4); }
      g.fillStyle = '#7ecbff'; g.font = '11px monospace'; g.textAlign = 'center'; g.fillText('▼ SUBTE C', ex, ey + CS + 2);
      // SALIDA a la calle (habilitada) — hacia Villa 31 / Línea San Martín
      const sx = ox + salida.x * CS, sy = oy + salida.y * CS;
      g.fillStyle = '#2a3d2c'; g.fillRect(sx - 16, sy - 14, 34, 30);
      g.fillStyle = '#0e1a10'; g.fillRect(sx - 12, sy - 10, 26, 14);
      g.fillStyle = '#9fe6a0'; g.font = '9px monospace'; g.fillText('→ CALLE', sx + 1, sy + 26);
      // cartel de la estación
      g.fillStyle = '#0d1017'; g.fillRect(ox + W * CS / 2 - 84, oy + 5.3 * CS, 168, 24);
      g.fillStyle = '#1f6cb5'; g.beginPath(); g.arc(ox + W * CS / 2 - 66, oy + 5.3 * CS + 12, 9, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.font = 'bold 12px monospace'; g.fillText('C', ox + W * CS / 2 - 66, oy + 5.3 * CS + 16);
      g.fillStyle = '#e8f0ff'; g.font = 'bold 13px monospace'; g.fillText('ESTACIÓN RETIRO', ox + W * CS / 2 + 16, oy + 5.3 * CS + 16);
      // jugador
      const px = ox + player.x, py = oy + player.y;
      g.fillStyle = '#111'; g.beginPath(); g.ellipse(px, py + 10, 10, 4, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffcf5b'; g.beginPath(); g.arc(px, py, player.r, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#0a0a0a'; g.fillRect(px + player.dir * 3 - 1, py - 3, 2, 2);
      // labels de locales
      g.font = '9px monospace'; g.textAlign = 'center'; g.fillStyle = '#9fb0c4';
      for (const l of LOCALES) g.fillText(T('g.retiro.loc_' + l.id), ox + l.x * CS + 1, oy + l.y * CS - 18);
      // MENÚ DE RAMALES (tren): elegís destino con 1..N
      if (menuOpen) {
        const mw = 320, mh = 34 + RAMALES.length * 24, mx = (VW - mw) / 2, my = (VH - mh) / 2;
        g.fillStyle = 'rgba(6,12,20,0.96)'; g.fillRect(mx, my, mw, mh);
        g.strokeStyle = '#c9a24a'; g.lineWidth = 2; g.strokeRect(mx + 0.5, my + 0.5, mw, mh);
        g.fillStyle = '#ffe9b0'; g.font = 'bold 13px monospace'; g.textAlign = 'center'; g.fillText('🚆 ' + T('g.tren.elegir'), mx + mw / 2, my + 22);
        RAMALES.forEach((r, i) => { const ry = my + 40 + i * 24;
          g.fillStyle = '#e8f0ff'; g.textAlign = 'left'; g.font = '12px monospace'; g.fillText('[' + (i + 1) + ']  ' + r, mx + 24, ry + 4); });
        g.fillStyle = '#8fa8c8'; g.font = '9px monospace'; g.textAlign = 'center'; g.fillText(T('g.tren.esc'), mx + mw / 2, my + mh - 8);
      }
      if (prompt) { g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(0, VH - 54, VW, 22); g.fillStyle = '#7ff3ff'; g.font = 'bold 13px monospace'; g.textAlign = 'center'; g.fillText(prompt, VW / 2, VH - 38); }
      if (msgT > 0 && msg) { g.fillStyle = 'rgba(0,0,0,0.72)'; g.fillRect(0, VH - 30, VW, 26); g.fillStyle = '#e8f0ff'; g.font = '13px monospace'; g.textAlign = 'center'; g.fillText(msg, VW / 2, VH - 12); }
    }

    return {
      get done() { return done; }, get exitTo() { return exitTo; },
      get purchase() { const p = purchase; purchase = null; return p; },   // KIOSCO: one-shot que game.js lee para cobrar + addItem
      update, draw,
      __leave: () => { player.x = (escalera.x + 0.5) * CS; player.y = (escalera.y + 0.5) * CS; interact(); return exitTo; },
      __street: () => { player.x = (salida.x + 0.5) * CS; player.y = (salida.y + 0.5) * CS; interact(); return exitTo; },
      __local: () => { const l = LOCALES.find(x => !x.sells); player.x = (l.x + 0.5) * CS; player.y = (l.y + 0.5) * CS; interact(); return msg; },
      __buyChori: () => { const l = LOCALES.find(x => x.sells === 'chori'); player.x = (l.x + 0.5) * CS; player.y = (l.y + 0.5) * CS; interact(); return purchase; },   // e2e: comprar chori en el kiosco
      __tren: () => { player.x = (GATE_GAP + 0.5) * CS; player.y = (GATE_Y + 1.4) * CS; interact(); menuOpen = false; exitTo = 'tren:' + RAMALES[0]; done = true; return exitTo; },   // e2e: molinete → menú → tomar el tren
    };
  }
  return { create, RAMALES, LOCALES };
})();
if (typeof window !== 'undefined') window.Retiro = Retiro;
if (typeof module !== 'undefined') module.exports = Retiro;
