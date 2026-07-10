// once.js — SUB-MODO "ESTACIÓN ONCE / Plaza Miserere" (v364, zarate-60.md). Se llega por la LÍNEA A del subte
// (habilitada post Nivel 2, como la C). El hall oncero: kiosco, SANTERÍA (Once es Once), y la joya: la
// PLATAFORMA DEL CHEVALLIER — el rápido a Zárate, un viaje DE LUJO (js/chevallier.js). Patrón terminal
// (constitucion/retiro). Al salir por la escalera volvés al subte (Línea A).
const Once = (() => {
  const T = (k, p) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(k, p) : k;
  const CS = 30, W = 20, H = 14;
  const LOCALES = [
    { id: 'kiosco',   x: 2.4, y: 8.5, emoji: '🏪', sells: 'chori', price: 15 },
    { id: 'santeria', x: 2.4, y: 11,  emoji: '🕯️', special: 'santeria' },   // la santería de Once (flavor con onda)
    { id: 'saldos',   x: 17,  y: 8.5, emoji: '🧦', special: 'saldos' },     // saldos y retazos, 3 pares 100
  ];
  const FARE = 25;   // el Chevallier de lujo (si no te alcanza, el chofer te fía — gag, no gate)

  function create(opts) {
    opts = opts || {};
    const map = Array.from({ length: H }, () => new Array(W).fill(0));
    for (let x = 0; x < W; x++) { map[0][x] = 1; map[H - 1][x] = 1; }
    for (let y = 0; y < H; y++) { map[y][0] = 1; map[y][W - 1] = 1; }
    // la DÁRSENA del Chevallier arriba (fila 4 con hueco central, como los molinetes de las terminales)
    const GATE_Y = 4, GATE_GAP = 9;
    for (let x = 2; x < W - 2; x++) if (x !== GATE_GAP && x !== GATE_GAP + 1) map[GATE_Y][x] = 2;
    const escalera = { x: 10, y: 12 };               // baja al subte (Línea A)
    const player = { x: 10 * CS, y: 12 * CS, r: 10, dir: -1, walk: 0 };
    let coinsLeft = opts.coins || 0, purchase = null, fare = null;   // fare = one-shot {spent} (el pasaje)
    let done = false, exitTo = null, t = 0, msg = '', msgT = 0, prompt = '', escHeld = false, eHeld = false;
    setMsg(T('g.once.enter'), 7);

    function setMsg(s, d = 4) { msg = s; msgT = d; }
    function solid(px, py) { const tx = Math.floor(px / CS), ty = Math.floor(py / CS); if (tx < 0 || ty < 0 || tx >= W || ty >= H) return true; return map[ty][tx] === 1 || map[ty][tx] === 2; }
    function freeAt(x, y) { const r = player.r; return !solid(x - r, y - r) && !solid(x + r, y - r) && !solid(x - r, y + r) && !solid(x + r, y + r); }
    function near(c, d = 1.5) { return Math.hypot(player.x - (c.x + 0.5) * CS, player.y - (c.y + 0.5) * CS) < CS * d; }
    function nearLocal() { let best = null, bd = 1e9;
      for (const l of LOCALES) { const d = Math.hypot(player.x - (l.x + 0.5) * CS, player.y - (l.y + 0.5) * CS); if (d < CS * 1.4 && d < bd) { bd = d; best = l; } } return best; }

    function interact() {
      if (near(escalera)) { done = true; exitTo = 'back'; if (typeof Sfx !== 'undefined' && Sfx.pickup) Sfx.pickup(); return; }
      // la dársena del CHEVALLIER (el hueco de la fila de arriba): subís al rápido a Zárate
      const tx = Math.floor(player.x / CS), ty = Math.floor(player.y / CS);
      if (ty <= GATE_Y + 1 && (tx === GATE_GAP || tx === GATE_GAP + 1)) {
        if (coinsLeft >= FARE) { coinsLeft -= FARE; fare = { spent: FARE }; setMsg(T('g.once.pasaje', { p: FARE }), 5); }
        else { setMsg(T('g.once.fiado'), 6); }   // el chofer te fía: hoy viaja vacío
        done = true; exitTo = 'chevallier'; if (typeof Sfx !== 'undefined' && Sfx.pickup) Sfx.pickup(); return;
      }
      const loc = nearLocal();
      if (loc && loc.special === 'santeria') { setMsg(T('g.once.santeria'), 7); return; }
      if (loc && loc.special === 'saldos') { setMsg(T('g.once.saldos'), 7); return; }
      if (loc && loc.sells) {
        const precio = loc.price || 15;
        if (coinsLeft >= precio) { coinsLeft -= precio; purchase = { item: loc.sells, spent: precio };
          setMsg(T('g.once.buy_' + loc.sells, { p: precio }), 6); if (typeof Sfx !== 'undefined' && Sfx.pickup) Sfx.pickup(); }
        else { setMsg(T('g.once.noCoins', { p: precio }), 6); if (typeof Sfx !== 'undefined' && Sfx.empty) Sfx.empty(); }
        return;
      }
      setMsg(T('g.once.hint'), 3);
    }

    function update(dt) {
      t += dt; msgT -= dt;
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
      const tx = Math.floor(player.x / CS), ty = Math.floor(player.y / CS);
      if (near(escalera)) prompt = T('g.once.promptSubte');
      else if (ty <= GATE_Y + 1 && (tx === GATE_GAP || tx === GATE_GAP + 1)) prompt = T('g.once.promptChev', { p: FARE });
      else if (nearLocal() && nearLocal().special) prompt = T('g.once.promptLocal', { n: T('g.once.loc_' + nearLocal().id) });
      else if (nearLocal()) prompt = T('g.once.promptBuy', { p: nearLocal().price || 15 });
      else prompt = '';
    }

    function draw(g, VW, VH) {
      const ox = (VW - W * CS) / 2, oy = (VH - H * CS) / 2;
      g.fillStyle = '#0b0d12'; g.fillRect(0, 0, VW, VH);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        g.fillStyle = ((x + y) & 1) ? '#242028' : '#1d1a21';   // hall oncero, más cálido
        if (y < GATE_Y) g.fillStyle = ((x + y) & 1) ? '#141116' : '#100e12';
        g.fillRect(ox + x * CS, oy + y * CS, CS, CS);
      }
      // la dársena del Chevallier (arriba): el MICRO esperando con las luces prendidas
      g.fillStyle = '#05070a'; g.fillRect(ox + CS, oy + CS, (W - 2) * CS, (GATE_Y - 1) * CS);
      { const bx = ox + 5 * CS, by = oy + 1.4 * CS;
        g.fillStyle = '#1a3a6a'; g.fillRect(bx, by, 10 * CS, 1.8 * CS);            // el Chevallier azul
        g.fillStyle = '#e8e4d8'; g.fillRect(bx, by + 12, 10 * CS, 14);
        g.fillStyle = '#cfe8ff'; for (let w = 0; w < 8; w++) g.fillRect(bx + 10 + w * 36, by + 26, 26, 16);
        g.fillStyle = '#ffe9b0'; g.font = 'bold 11px monospace'; g.textAlign = 'center';
        g.fillText('CHEVALLIER — RÁPIDO A ZÁRATE', bx + 5 * CS, by + 8);
        g.fillStyle = (Math.floor(t * 2) % 2) ? '#ffd54f' : '#7a5a1a'; g.fillRect(bx + 4, by + 40, 8, 6); g.fillRect(bx + 10 * CS - 12, by + 40, 8, 6); }   // balizas
      g.fillStyle = '#7fd0ff'; g.font = 'bold 11px monospace'; g.textAlign = 'center';
      g.fillText('🚍 ' + T('g.once.darsena'), ox + W * CS / 2, oy + 0.85 * CS);
      // fila de la dársena (tipo molinetes)
      for (let x = 2; x < W - 2; x++) { if (x === GATE_GAP || x === GATE_GAP + 1) continue;
        const mx = ox + x * CS, my = oy + GATE_Y * CS;
        g.fillStyle = '#3f3944'; g.fillRect(mx + 4, my + 6, CS - 8, CS - 10);
        g.fillStyle = '#c9a24a'; g.fillRect(mx + 8, my + 2, CS - 16, 6); }
      g.fillStyle = 'rgba(201,162,74,0.18)'; g.fillRect(ox + GATE_GAP * CS, oy + GATE_Y * CS, 2 * CS, CS);
      // cartel de la estación
      g.fillStyle = '#0d1017'; g.fillRect(ox + W * CS / 2 - 110, oy + 5.3 * CS, 220, 24);
      g.fillStyle = '#2bb0c8'; g.beginPath(); g.arc(ox + W * CS / 2 - 92, oy + 5.3 * CS + 12, 9, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.font = 'bold 12px monospace'; g.fillText('A', ox + W * CS / 2 - 92, oy + 5.3 * CS + 16);
      g.fillStyle = '#e8f0ff'; g.font = 'bold 13px monospace'; g.fillText('ONCE · PLAZA MISERERE', ox + W * CS / 2 + 14, oy + 5.3 * CS + 16);
      // LOCALES
      for (const l of LOCALES) { const lx = ox + l.x * CS, ly = oy + l.y * CS;
        g.fillStyle = '#2a242e'; g.fillRect(lx - 16, ly - 14, 34, 30);
        g.fillStyle = '#151118'; g.fillRect(lx - 12, ly - 10, 26, 12);
        g.font = '15px monospace'; g.textAlign = 'center'; g.fillText(l.emoji, lx + 1, ly + 12); }
      g.font = '9px monospace'; g.fillStyle = '#9fb0c4';
      for (const l of LOCALES) g.fillText(T('g.once.loc_' + l.id), ox + l.x * CS + 1, oy + l.y * CS - 18);
      // escalera al subte A
      const ex = ox + escalera.x * CS, ey = oy + escalera.y * CS;
      g.fillStyle = '#1b222c'; g.fillRect(ex - CS, ey - 4, 2 * CS, CS);
      for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#232c38' : '#2c3644'; g.fillRect(ex - CS + 6, ey + i * 6 - 2, 2 * CS - 12, 4); }
      g.fillStyle = '#7ecbff'; g.font = '11px monospace'; g.fillText('▼ SUBTE A', ex, ey + CS + 2);
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
      get purchase() { const p = purchase; purchase = null; return p; },   // one-shot: kiosco
      get fare() { const f = fare; fare = null; return f; },               // one-shot: el pasaje del Chevallier
      update, draw,
      __leave: () => { player.x = (escalera.x + 0.5) * CS; player.y = (escalera.y + 0.5) * CS; interact(); return exitTo; },
      __chev: () => { player.x = (GATE_GAP + 0.5) * CS; player.y = (GATE_Y + 1.4) * CS; interact(); return exitTo; },   // e2e: subir al Chevallier
      __local: (id) => { const l = LOCALES.find(x => x.id === id); player.x = (l.x + 0.5) * CS; player.y = (l.y - 0.6) * CS; interact(); return msg; },
    };
  }
  return { create, LOCALES };
})();
if (typeof window !== 'undefined') window.Once = Once;
if (typeof module !== 'undefined') module.exports = Once;
