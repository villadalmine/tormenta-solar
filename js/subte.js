// subte.js — SUB-MODO "LA ESTACIÓN DE SUBTE" (specs/subte.md §4). Bajás por una boca y caés al andén (vista de
// arriba, patrón telo/bodegón). Layout: ESCALERA (spawn/salida) → MOLINETES (leen tu tarjeta SUBE cargada) →
// ANDÉN con el cartel de la línea + VÍAS. NPC boletero. Por ahora el VIAJE (F3) es "próximamente". Parametrizado
// por estación (Florida/Línea B, Lavalle/Línea C…). Aislado: al salir (done) el juego principal queda EXACTO.
const Subte = (() => {
  const T = (k, p) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(k, p) : k;
  const CS = 30, W = 16, H = 12;
  // catálogo de estaciones jugables (DATA; espejo de specs/subte.md §2.5)
  const ESTACIONES = {
    florida: { nombre: 'Estación Florida', linea: 'B', color: '#e2231a', destinos: ['L. N. Alem', 'C. Pellegrini'] },
    lavalle: { nombre: 'Estación Lavalle', linea: 'C', color: '#1f6cb5', destinos: ['San Martín', 'Diagonal Norte'] },
  };

  function create(opts) {
    opts = opts || {};
    const est = ESTACIONES[opts.station] || ESTACIONES.florida;
    const subeReady = !!opts.subeReady;   // ¿la SUBE está cargada? (game.js lo lee de ts_sube_charged)
    const map = Array.from({ length: H }, () => new Array(W).fill(0));
    for (let x = 0; x < W; x++) { map[0][x] = 1; map[H - 1][x] = 1; }
    for (let y = 0; y < H; y++) { map[y][0] = 1; map[y][W - 1] = 1; }
    // fila de molinetes (y=4): dejan un HUECO por donde pasás si tenés la SUBE
    const GATE_Y = 4, GATE_GAP = 8;
    for (let x = 2; x < W - 2; x++) if (x !== GATE_GAP && x !== GATE_GAP + 1) map[GATE_Y][x] = 2;   // 2 = molinete (sólido)
    const escalera = { x: 8, y: 10 }, boletero = { x: 4.5, y: 5.2 }, cartel = { x: 8, y: 1.4 };
    const andenY = 7;                                       // el borde del andén (línea amarilla) y las vías abajo
    const player = { x: 8 * CS, y: 10 * CS, r: 10, dir: -1, walk: 0 };
    let done = false, exitTo = null, t = 0, msg = '', msgT = 0, prompt = '', escHeld = false, eHeld = false, passed = subeReady, tren = 0, boletIdx = -1;
    setMsg(T('g.subte.enter', { e: est.nombre, l: est.linea }), 6);

    function setMsg(s, d = 4) { msg = s; msgT = d; }
    function leave() { done = true; exitTo = 'back'; }
    function solid(px, py) { const tx = Math.floor(px / CS), ty = Math.floor(py / CS); if (tx < 0 || ty < 0 || tx >= W || ty >= H) return true; return map[ty][tx] === 1 || map[ty][tx] === 2; }
    function freeAt(x, y) { const r = player.r; return !solid(x - r, y - r) && !solid(x + r, y - r) && !solid(x - r, y + r) && !solid(x + r, y + r); }
    function near(c) { return Math.hypot(player.x - (c.x + 0.5) * CS, player.y - (c.y + 0.5) * CS) < CS * 1.5; }

    function interact() {
      // molinete: si estás justo debajo del hueco y tenés la SUBE → pasás; si no → te frena
      const tx = Math.floor(player.x / CS), ty = Math.floor(player.y / CS);
      if (!passed && ty === GATE_Y + 1 && (tx === GATE_GAP || tx === GATE_GAP + 1)) {
        if (subeReady) { passed = true; setMsg(T('g.subte.pass'), 4); if (typeof Sfx !== 'undefined' && Sfx.pickup) Sfx.pickup(); }
        else { setMsg(T('g.subte.noCard'), 6); if (typeof Sfx !== 'undefined' && Sfx.hit) Sfx.hit(); }
        return;
      }
      if (near(boletero)) { boletIdx = (boletIdx + 1) % 3; setMsg(T('g.subte.bolet' + (boletIdx + 1)), 6); return; }   // el boletero cicla data (canned)
      if (near(escalera)) { leave(); return; }
      // en el andén, con la SUBE pasada → el VIAJE (F3, próximamente)
      if (passed && player.y < andenY * CS) { setMsg(T('g.subte.travelSoon', { d: est.destinos.join(' · ') }), 7); return; }
      setMsg(T('g.subte.hint'), 3);
    }

    function update(dt) {
      t += dt; msgT -= dt; tren = (tren + dt * 0.4) % 1;
      player.walk = 0;
      const sp = 165 * dt; let mvx = 0, mvy = 0;
      if (Input.keys['arrowleft'] || Input.keys['a']) mvx = -1;
      if (Input.keys['arrowright'] || Input.keys['d']) mvx = 1;
      if (Input.keys['arrowup'] || Input.keys['w']) mvy = -1;
      if (Input.keys['arrowdown'] || Input.keys['s']) mvy = 1;
      if (mvx) player.dir = mvx;
      if (mvx && freeAt(player.x + mvx * sp, player.y)) { player.x += mvx * sp; player.walk = 1; }
      if (mvy && freeAt(player.x, player.y + mvy * sp)) { player.y += mvy * sp; player.walk = 1; }
      if (Input.keys['escape']) { if (!escHeld) { escHeld = true; leave(); } } else escHeld = false;
      if (Input.keys['e'] || Input.keys['enter']) { if (!eHeld) { eHeld = true; interact(); } } else eHeld = false;
      // prompt contextual
      const tx = Math.floor(player.x / CS), ty = Math.floor(player.y / CS);
      if (!passed && ty === GATE_Y + 1 && (tx === GATE_GAP || tx === GATE_GAP + 1)) prompt = subeReady ? T('g.subte.promptPass') : T('g.subte.promptNo');
      else if (near(escalera)) prompt = T('g.subte.promptSalir');
      else if (near(boletero)) prompt = T('g.subte.promptBoletero');
      else if (passed && player.y < andenY * CS) prompt = T('g.subte.promptViajar');
      else prompt = '';
    }

    function draw(g, VW, VH) {
      const ox = (VW - W * CS) / 2, oy = (VH - H * CS) / 2;
      g.fillStyle = '#0a0e14'; g.fillRect(0, 0, VW, VH);
      // baldosas
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        g.fillStyle = ((x + y) & 1) ? '#1a2028' : '#161b22';
        if (y >= andenY) g.fillStyle = ((x + y) & 1) ? '#12161c' : '#0e1218';   // andén más oscuro
        g.fillRect(ox + x * CS, oy + y * CS, CS, CS);
      }
      // VÍAS (abajo del andén)
      g.fillStyle = '#05070a'; g.fillRect(ox, oy + (andenY + 1.2) * CS, W * CS, (H - andenY - 1.2) * CS);
      g.strokeStyle = '#2a3240'; g.lineWidth = 2;
      for (const ry of [andenY + 2, andenY + 3.4]) { g.beginPath(); g.moveTo(ox + CS, oy + ry * CS); g.lineTo(ox + (W - 1) * CS, oy + ry * CS); g.stroke(); }
      // línea amarilla del borde del andén
      g.fillStyle = '#ffd54f'; g.fillRect(ox + CS, oy + (andenY + 1) * CS - 4, (W - 2) * CS, 5);
      // el TREN pasando (silueta que cruza)
      const trenX = ox + (tren * (W + 4) - 2) * CS;
      g.fillStyle = est.color; g.globalAlpha = 0.85; g.fillRect(trenX, oy + (andenY + 1.6) * CS, 4 * CS, 1.6 * CS);
      g.fillStyle = '#cfe8ff'; for (let w = 0; w < 4; w++) g.fillRect(trenX + 8 + w * CS, oy + (andenY + 1.9) * CS, 18, 20);
      g.globalAlpha = 1;
      // molinetes
      for (let x = 2; x < W - 2; x++) { if (x === GATE_GAP || x === GATE_GAP + 1) continue;
        const mx = ox + x * CS, my = oy + GATE_Y * CS;
        g.fillStyle = '#39424f'; g.fillRect(mx + 4, my + 6, CS - 8, CS - 10);
        g.fillStyle = passed ? '#3fae5a' : '#b0402f'; g.fillRect(mx + 8, my + 2, CS - 16, 6); }
      // hueco del molinete (indicador SUBE)
      g.fillStyle = passed ? 'rgba(63,174,90,0.25)' : 'rgba(176,64,47,0.22)'; g.fillRect(ox + GATE_GAP * CS, oy + GATE_Y * CS, 2 * CS, CS);
      g.fillStyle = passed ? '#8ff0a8' : '#ffb0a0'; g.font = 'bold 10px monospace'; g.textAlign = 'center';
      g.fillText(passed ? '✓ SUBE' : '💳 SUBE', ox + (GATE_GAP + 1) * CS, oy + GATE_Y * CS + 18);
      // cartel de la ESTACIÓN (línea + color)
      const cx = ox + cartel.x * CS, cy = oy + cartel.y * CS;
      g.fillStyle = '#0d1017'; g.fillRect(cx - 84, cy - 14, 168, 28);
      g.fillStyle = est.color; g.beginPath(); g.arc(cx - 66, cy, 11, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.font = 'bold 13px monospace'; g.fillText(est.linea, cx - 66, cy + 4);
      g.fillStyle = '#e8f0ff'; g.font = 'bold 13px monospace'; g.fillText(est.nombre.toUpperCase(), cx + 12, cy + 4);
      // ESCALERA (salida a la superficie)
      const ex = ox + escalera.x * CS, ey = oy + escalera.y * CS;
      g.fillStyle = '#1b222c'; g.fillRect(ex - CS, ey - 4, 2 * CS, CS);
      for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#232c38' : '#2c3644'; g.fillRect(ex - CS + 6, ey + i * 6 - 2, 2 * CS - 12, 4); }
      g.fillStyle = '#7ff3ff'; g.font = '11px monospace'; g.fillText('▲ ' + T('g.subte.salida'), ex, ey + CS + 2);
      // BOLETERO (cabina)
      const bx = ox + boletero.x * CS, by = oy + boletero.y * CS;
      g.fillStyle = '#26303c'; g.fillRect(bx - 16, by - 20, 34, 34);
      g.fillStyle = '#0e141c'; g.fillRect(bx - 12, by - 16, 26, 12);
      g.fillStyle = '#e0b088'; g.beginPath(); g.arc(bx, by - 2, 7, 0, Math.PI * 2); g.fill();
      // jugador
      const px = ox + player.x, py = oy + player.y;
      g.fillStyle = '#111'; g.beginPath(); g.ellipse(px, py + 10, 10, 4, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffcf5b'; g.beginPath(); g.arc(px, py, player.r, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#0a0a0a'; g.fillRect(px + player.dir * 3 - 1, py - 3, 2, 2);
      // prompt + msg
      if (prompt) { g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(0, VH - 54, VW, 22); g.fillStyle = '#7ff3ff'; g.font = 'bold 13px monospace'; g.textAlign = 'center'; g.fillText(prompt, VW / 2, VH - 38); }
      if (msgT > 0 && msg) { g.fillStyle = 'rgba(0,0,0,0.72)'; g.fillRect(0, VH - 30, VW, 26); g.fillStyle = '#e8f0ff'; g.font = '13px monospace'; g.textAlign = 'center'; g.fillText(msg, VW / 2, VH - 12); }
    }

    return {
      get done() { return done; }, get exitTo() { return exitTo; },
      update, draw,
      // superficie de prueba (e2e)
      __pass: () => { player.x = (GATE_GAP + 0.5) * CS; player.y = (GATE_Y + 1.5) * CS; interact(); return passed; },
      __leave: () => { player.x = (escalera.x + 0.5) * CS; player.y = (escalera.y + 0.5) * CS; interact(); return done; },
    };
  }
  return { create, ESTACIONES };
})();
if (typeof window !== 'undefined') window.Subte = Subte;
if (typeof module !== 'undefined') module.exports = Subte;
