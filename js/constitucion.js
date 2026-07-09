// constitucion.js — SUB-MODO "ESTACIÓN CONSTITUCIÓN" (la gran terminal del Ferrocarril Roca).
// Se llega por la Línea C del subte (habilitada al ganar el Nivel 2): la escalera del andén sube a ESTE hall.
// Vista top-down (patrón subte/bodegón). Basado en la terminal REAL: el gran hall abovedado, el RELOJ histórico,
// la fila de MOLINETES de tren que dan a los andenes del Roca, y locales alrededor. Los locales son MOCK por ahora
// (iteramos): al interactuar dan un flavor "próximamente". Aislado: al salir (done) el juego principal queda EXACTO.
const Constitucion = (() => {
  const T = (k, p) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(k, p) : k;
  const CS = 30, W = 20, H = 14;
  // Ramales REALES del Roca que salen de Constitución (DATA → cartel de salidas). Flavor "oficial".
  const RAMALES = ['La Plata', 'Ezeiza', 'A. Korn', 'Bosques', 'Cañuelas'];
  // Locales del hall (MOCK, data-driven): posición en tiles + etiqueta + emoji. Iteramos con interior real después.
  const LOCALES = [
    { id: 'kiosco',  x: 2.4,  y: 8.5,  label: 'Kiosco',        emoji: '🏪', sells: 'chori' },
    { id: 'cafe',    x: 2.4,  y: 11,   label: 'Café',          emoji: '☕' },
    { id: 'diario',  x: 17,   y: 8.5,  label: 'Diarios',       emoji: '📰' },
    { id: 'locutorio', x: 17, y: 11,   label: 'Locutorio',     emoji: '📞' },
    { id: 'boleteria', x: 10, y: 8.6,  label: 'Boletería Roca',emoji: '🎫' },
  ];

  function create(opts) {
    opts = opts || {};
    const map = Array.from({ length: H }, () => new Array(W).fill(0));
    for (let x = 0; x < W; x++) { map[0][x] = 1; map[H - 1][x] = 1; }
    for (let y = 0; y < H; y++) { map[y][0] = 1; map[y][W - 1] = 1; }
    // fila de MOLINETES de tren (y=4) con un HUECO por el que se ve el andén (mock, no se aborda todavía)
    const GATE_Y = 4, GATE_GAP = 9;
    for (let x = 2; x < W - 2; x++) if (x !== GATE_GAP && x !== GATE_GAP + 1) map[GATE_Y][x] = 2;
    const reloj = { x: 10, y: 6.4 };                 // el reloj histórico, en el centro del hall
    const escalera = { x: 10, y: 12 };               // baja al subte (Línea C)
    const salida = { x: 3, y: 1.4 };                 // a la calle (Barrio Constitución) — próximamente
    const player = { x: 10 * CS, y: 12 * CS, r: 10, dir: -1, walk: 0 };
    // KIOSCO: te vende un choripán 🌭 (comida que cura). Mismo patrón que el boletero del subte: game.js pasa la plata
    // y lee purchase (one-shot) para cobrarte + addItem. Precio DATA.
    const CHORI_PRICE = opts.choriPrice || 15;
    let coinsLeft = opts.coins || 0, purchase = null;
    let done = false, exitTo = null, t = 0, msg = '', msgT = 0, prompt = '', escHeld = false, eHeld = false, ramIdx = 0;
    let menuOpen = false, numHeld = {};   // menú de RAMALES del tren (al molinete) → tomás el tren a un destino
    setMsg(T('g.consti.enter'), 6);

    function setMsg(s, d = 4) { msg = s; msgT = d; }
    function solid(px, py) { const tx = Math.floor(px / CS), ty = Math.floor(py / CS); if (tx < 0 || ty < 0 || tx >= W || ty >= H) return true; return map[ty][tx] === 1 || map[ty][tx] === 2; }
    function freeAt(x, y) { const r = player.r; return !solid(x - r, y - r) && !solid(x + r, y - r) && !solid(x - r, y + r) && !solid(x + r, y + r); }
    function near(c, d = 1.5) { return Math.hypot(player.x - (c.x + 0.5) * CS, player.y - (c.y + 0.5) * CS) < CS * d; }
    function nearLocal() { return LOCALES.find(l => near(l, 1.4)); }

    function interact() {
      if (near(escalera)) { done = true; exitTo = 'back'; if (typeof Sfx !== 'undefined' && Sfx.pickup) Sfx.pickup(); return; }
      if (near(salida)) { setMsg(T('g.consti.calleSoon'), 5); return; }   // salir a la calle: próximamente
      // molinetes del tren: abrís el MENÚ DE RAMALES → tomás el tren del Roca a un destino
      const tx = Math.floor(player.x / CS), ty = Math.floor(player.y / CS);
      if (ty <= GATE_Y + 1 && (tx === GATE_GAP || tx === GATE_GAP + 1)) { menuOpen = !menuOpen; return; }
      const loc = nearLocal();
      if (loc && loc.sells === 'chori') {   // KIOSCO: comprás un choripán 🌭 (comida que cura) si te alcanza
        if (coinsLeft >= CHORI_PRICE) { coinsLeft -= CHORI_PRICE; purchase = { item: 'chori', spent: CHORI_PRICE };
          setMsg(T('g.consti.buyChori', { p: CHORI_PRICE }), 6); if (typeof Sfx !== 'undefined' && Sfx.pickup) Sfx.pickup(); }
        else { setMsg(T('g.consti.noCoins', { p: CHORI_PRICE }), 6); if (typeof Sfx !== 'undefined' && Sfx.empty) Sfx.empty(); }
        return;
      }
      if (loc) { setMsg(T('g.consti.local', { n: T('g.consti.loc_' + loc.id) }), 5); return; }
      if (near(reloj, 1.8)) { setMsg(T('g.consti.reloj'), 6); return; }
      setMsg(T('g.consti.hint'), 3);
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
      // MENÚ DE RAMALES abierto: 1..N toman el tren a ese ramal
      if (menuOpen) for (let i = 0; i < RAMALES.length; i++) { const k = String(i + 1);
        if (Input.keys[k]) { if (!numHeld[k]) { numHeld[k] = true; menuOpen = false; exitTo = 'tren:' + RAMALES[i]; done = true; if (typeof Sfx !== 'undefined' && Sfx.pickup) Sfx.pickup(); } } else numHeld[k] = false; }
      const tx = Math.floor(player.x / CS), ty = Math.floor(player.y / CS);
      if (near(escalera)) prompt = T('g.consti.promptSubte');
      else if (near(salida)) prompt = T('g.consti.promptCalle');
      else if (ty <= GATE_Y + 1 && (tx === GATE_GAP || tx === GATE_GAP + 1)) prompt = T('g.consti.promptAnden');
      else if (nearLocal() && nearLocal().sells === 'chori') prompt = T('g.consti.promptChori', { p: CHORI_PRICE });
      else if (nearLocal()) prompt = T('g.consti.promptLocal', { n: T('g.consti.loc_' + nearLocal().id) });
      else if (near(reloj, 1.8)) prompt = T('g.consti.promptReloj');
      else prompt = '';
    }

    function draw(g, VW, VH) {
      const ox = (VW - W * CS) / 2, oy = (VH - H * CS) / 2;
      g.fillStyle = '#0b0d12'; g.fillRect(0, 0, VW, VH);
      // piso del hall (granito), andén (arriba de los molinetes) más oscuro
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        g.fillStyle = ((x + y) & 1) ? '#20242c' : '#1a1d24';
        if (y < GATE_Y) g.fillStyle = ((x + y) & 1) ? '#111419' : '#0d1014';
        g.fillRect(ox + x * CS, oy + y * CS, CS, CS);
      }
      // techo abovedado (arcos) insinuado arriba
      g.strokeStyle = '#2c3340'; g.lineWidth = 2;
      for (let a = 2; a < W - 2; a += 3) { g.beginPath(); g.arc(ox + a * CS, oy + 0.4 * CS, CS, 0, Math.PI, false); g.stroke(); }
      // VÍAS del Roca (arriba, tras los molinetes) — mock
      g.fillStyle = '#05070a'; g.fillRect(ox + CS, oy + CS, (W - 2) * CS, (GATE_Y - 1) * CS);
      g.strokeStyle = '#2a3240'; g.lineWidth = 2;
      for (const ry of [1.9, 2.7, 3.4]) { g.beginPath(); g.moveTo(ox + CS, oy + ry * CS); g.lineTo(ox + (W - 1) * CS, oy + ry * CS); g.stroke(); }
      g.fillStyle = '#7fd0ff'; g.font = 'bold 11px monospace'; g.textAlign = 'center';
      g.fillText('🚆 ' + T('g.consti.rocaLabel'), ox + W * CS / 2, oy + 0.85 * CS);
      // MOLINETES de tren
      for (let x = 2; x < W - 2; x++) { if (x === GATE_GAP || x === GATE_GAP + 1) continue;
        const mx = ox + x * CS, my = oy + GATE_Y * CS;
        g.fillStyle = '#39424f'; g.fillRect(mx + 4, my + 6, CS - 8, CS - 10);
        g.fillStyle = '#c9a24a'; g.fillRect(mx + 8, my + 2, CS - 16, 6); }
      g.fillStyle = 'rgba(201,162,74,0.18)'; g.fillRect(ox + GATE_GAP * CS, oy + GATE_Y * CS, 2 * CS, CS);
      // RELOJ histórico central
      const rx = ox + (reloj.x + 0.5) * CS, ry = oy + (reloj.y + 0.5) * CS;
      g.fillStyle = '#1c222b'; g.fillRect(rx - 26, ry - 42, 52, 40);
      g.fillStyle = '#e8e2c8'; g.beginPath(); g.arc(rx, ry - 22, 17, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#2a2a2a'; g.lineWidth = 2;
      const hh = t * 0.3, mm = t * 3.6;
      g.beginPath(); g.moveTo(rx, ry - 22); g.lineTo(rx + Math.cos(hh) * 8, ry - 22 + Math.sin(hh) * 8); g.stroke();
      g.beginPath(); g.moveTo(rx, ry - 22); g.lineTo(rx + Math.cos(mm) * 12, ry - 22 + Math.sin(mm) * 12); g.stroke();
      // cartel de SALIDAS (ramales del Roca, van rotando)
      const bw = 150, bx = ox + W * CS / 2 - bw / 2, by = oy + (GATE_Y + 0.15) * CS;
      g.fillStyle = '#0d1017'; g.fillRect(bx, by, bw, 20);
      g.fillStyle = '#ffcf5b'; g.font = 'bold 11px monospace'; g.textAlign = 'center';
      g.fillText('▶ ' + RAMALES[ramIdx], bx + bw / 2, by + 14);
      // LOCALES (mock)
      for (const l of LOCALES) { const lx = ox + l.x * CS, ly = oy + l.y * CS;
        g.fillStyle = '#242a33'; g.fillRect(lx - 16, ly - 14, 34, 30);
        g.fillStyle = '#11151b'; g.fillRect(lx - 12, ly - 10, 26, 12);
        g.font = '15px monospace'; g.textAlign = 'center'; g.fillText(l.emoji, lx + 1, ly + 12);
      }
      // ESCALERA al subte (Línea C)
      const ex = ox + escalera.x * CS, ey = oy + escalera.y * CS;
      g.fillStyle = '#1b222c'; g.fillRect(ex - CS, ey - 4, 2 * CS, CS);
      for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#232c38' : '#2c3644'; g.fillRect(ex - CS + 6, ey + i * 6 - 2, 2 * CS - 12, 4); }
      g.fillStyle = '#7ecbff'; g.font = '11px monospace'; g.textAlign = 'center'; g.fillText('▼ SUBTE C', ex, ey + CS + 2);
      // SALIDA a la calle
      const sx = ox + salida.x * CS, sy = oy + salida.y * CS;
      g.fillStyle = '#22303c'; g.fillRect(sx - 14, sy - 12, 30, 26);
      g.fillStyle = '#9fe6a0'; g.font = '10px monospace'; g.fillText('SALIDA', sx + 1, sy + 26);
      // cartel de la estación
      g.fillStyle = '#0d1017'; g.fillRect(ox + W * CS / 2 - 96, oy + 5.3 * CS, 192, 24);
      g.fillStyle = '#1f6cb5'; g.beginPath(); g.arc(ox + W * CS / 2 - 78, oy + 5.3 * CS + 12, 9, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.font = 'bold 12px monospace'; g.fillText('C', ox + W * CS / 2 - 78, oy + 5.3 * CS + 16);
      g.fillStyle = '#e8f0ff'; g.font = 'bold 13px monospace'; g.fillText('ESTACIÓN CONSTITUCIÓN', ox + W * CS / 2 + 14, oy + 5.3 * CS + 16);
      // jugador
      const px = ox + player.x, py = oy + player.y;
      g.fillStyle = '#111'; g.beginPath(); g.ellipse(px, py + 10, 10, 4, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffcf5b'; g.beginPath(); g.arc(px, py, player.r, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#0a0a0a'; g.fillRect(px + player.dir * 3 - 1, py - 3, 2, 2);
      // labels de locales (encima)
      g.font = '9px monospace'; g.textAlign = 'center'; g.fillStyle = '#9fb0c4';
      for (const l of LOCALES) g.fillText(T('g.consti.loc_' + l.id), ox + l.x * CS + 1, oy + l.y * CS - 18);
      // MENÚ DE RAMALES (tren): elegís destino con 1..N
      if (menuOpen) {
        const mw = 300, mh = 34 + RAMALES.length * 24, mx = (VW - mw) / 2, my = (VH - mh) / 2;
        g.fillStyle = 'rgba(6,12,20,0.96)'; g.fillRect(mx, my, mw, mh);
        g.strokeStyle = '#1f6cb5'; g.lineWidth = 2; g.strokeRect(mx + 0.5, my + 0.5, mw, mh);
        g.fillStyle = '#ffe9b0'; g.font = 'bold 13px monospace'; g.textAlign = 'center'; g.fillText('🚆 ' + T('g.tren.elegir'), mx + mw / 2, my + 22);
        RAMALES.forEach((r, i) => { const ry = my + 40 + i * 24;
          g.fillStyle = '#e8f0ff'; g.textAlign = 'left'; g.font = '12px monospace'; g.fillText('[' + (i + 1) + ']  ' + r, mx + 24, ry + 4); });
        g.fillStyle = '#8fa8c8'; g.font = '9px monospace'; g.textAlign = 'center'; g.fillText(T('g.tren.esc'), mx + mw / 2, my + mh - 8);
      }
      // prompt + msg
      if (prompt) { g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(0, VH - 54, VW, 22); g.fillStyle = '#7ff3ff'; g.font = 'bold 13px monospace'; g.textAlign = 'center'; g.fillText(prompt, VW / 2, VH - 38); }
      if (msgT > 0 && msg) { g.fillStyle = 'rgba(0,0,0,0.72)'; g.fillRect(0, VH - 30, VW, 26); g.fillStyle = '#e8f0ff'; g.font = '13px monospace'; g.textAlign = 'center'; g.fillText(msg, VW / 2, VH - 12); }
    }

    return {
      get done() { return done; }, get exitTo() { return exitTo; },
      get purchase() { const p = purchase; purchase = null; return p; },   // KIOSCO: one-shot que game.js lee para cobrar + addItem
      update, draw,
      __leave: () => { player.x = (escalera.x + 0.5) * CS; player.y = (escalera.y + 0.5) * CS; interact(); return exitTo; },   // e2e: salir al subte
      __local: () => { const l = LOCALES.find(x => !x.sells); player.x = (l.x + 0.5) * CS; player.y = (l.y + 0.5) * CS; interact(); return msg; },   // e2e: mirar un local mock
      __buyChori: () => { const l = LOCALES.find(x => x.sells === 'chori'); player.x = (l.x + 0.5) * CS; player.y = (l.y + 0.5) * CS; interact(); return purchase; },   // e2e: comprar chori en el kiosco
      __tren: () => { player.x = (GATE_GAP + 0.5) * CS; player.y = (GATE_Y + 1.4) * CS; interact(); menuOpen = false; exitTo = 'tren:' + RAMALES[0]; done = true; return exitTo; },   // e2e: molinete → menú → tomar el tren
    };
  }
  return { create, RAMALES, LOCALES };
})();
if (typeof window !== 'undefined') window.Constitucion = Constitucion;
if (typeof module !== 'undefined') module.exports = Constitucion;
