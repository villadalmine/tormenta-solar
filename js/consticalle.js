// consticalle.js — SUB-MODO "AFUERA DE CONSTITUCIÓN" (v362): la salida a la calle de la terminal, con todo lo
// que tiene la puerta de una estación de verdad: la PARADA DE BONDIS (líneas reales de Plaza Constitución, los
// colectivos llegan y se van animados), los PUESTOS de comida rápida bien de estación (chori, bondiola,
// tortafritas, garrapiñada — patrón sells/purchase genérico) y los POLICÍAS haciendo la ronda ("circule,
// circule"). Vista top-down (patrón constitucion/villa31). Aislado: se entra por la SALIDA del hall y se
// vuelve por la puerta de la terminal. Sin misiones acá (por ahora): es el pulmón de ambiente.
const ConstiCalle = (() => {
  const T = (k, p) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(k, p) : k;
  const CS = 30, W = 20, H = 14;
  // Líneas de colectivo REALES de Plaza Constitución (DATA → el cartel de la parada y los bondis que pasan)
  const BONDIS = [
    { n: '12',  dest: 'Palermo' },
    { n: '100', dest: 'Puente Saavedra' },
    { n: '129', dest: 'La Plata' },
    { n: '133', dest: 'Liniers' },
    { n: '143', dest: 'Villa Madero' },
    { n: '148', dest: 'Puente Uriburu' },
  ];
  // PUESTOS de comida de estación (sells genérico: item + precio; game.js cobra vía one-shot purchase)
  const PUESTOS = [
    { id: 'chori',       x: 2.6, y: 6.5,  emoji: '🌭', item: 'chori',       price: 15 },
    { id: 'bondiola',    x: 2.6, y: 8.8,  emoji: '🥖', item: 'bondiola',    price: 20 },
    { id: 'tortafrita',  x: 2.6, y: 11,   emoji: '🫓', item: 'tortafrita',  price: 8 },
    { id: 'garrapinada', x: 5.4, y: 11.6, emoji: '🥜', item: 'garrapinada', price: 10 },
  ];

  function create(opts) {
    opts = opts || {};
    const map = Array.from({ length: H }, () => new Array(W).fill(0));
    for (let x = 0; x < W; x++) { map[0][x] = 1; map[H - 1][x] = 1; }
    for (let y = 0; y < H; y++) { map[y][0] = 1; map[y][W - 1] = 1; }
    // la FACHADA de la terminal ocupa la fila de arriba (y=1-2): pared con la puerta grande en el medio
    for (let x = 1; x < W - 1; x++) if (x < 9 || x > 11) map[2][x] = 1;
    const puerta = { x: 10, y: 2.2 };                 // [E] volvés al hall de la terminal
    const parada = { x: 16, y: 6.5 };                 // la parada de bondis (poste + cartel)
    const AVENIDA_Y = 4.6;                            // la calle por donde pasan los bondis (entre fachada y vereda)
    const player = { x: 10 * CS, y: 3.4 * CS, r: 10, dir: 1, walk: 0 };
    let coinsLeft = opts.coins || 0, purchase = null;
    let done = false, exitTo = null, t = 0, msg = '', msgT = 0, prompt = '', escHeld = false, eHeld = false;
    let canaIdx = -1;                                 // qué frase de cana toca
    // los CANAS de la ronda: patrullan la vereda (ida y vuelta)
    const canas = [
      { x: 8 * CS,  y: 9 * CS,  dir: 1,  min: 6,  max: 14 },
      { x: 13 * CS, y: 11 * CS, dir: -1, min: 7,  max: 17 },
    ];
    // el BONDI vivo: cicla por las líneas, llega a la parada, para y arranca (fase por reloj)
    const BONDI_CICLO = 9;                            // segundos por bondi
    setMsg(T('g.ccalle.enter'), 6);

    function setMsg(s, d = 4) { msg = s; msgT = d; }
    function solid(px, py) { const tx = Math.floor(px / CS), ty = Math.floor(py / CS); if (tx < 0 || ty < 0 || tx >= W || ty >= H) return true; return map[ty][tx] === 1; }
    function freeAt(x, y) { const r = player.r; return !solid(x - r, y - r) && !solid(x + r, y - r) && !solid(x - r, y + r) && !solid(x + r, y + r); }
    function near(c, d = 1.5) { return Math.hypot(player.x - (c.x + 0.5) * CS, player.y - (c.y + 0.5) * CS) < CS * d; }
    function nearPuesto() { let best = null, bd = 1e9;   // el puesto MÁS CERCANO (están pegados)
      for (const p of PUESTOS) { const d = Math.hypot(player.x - (p.x + 0.5) * CS, player.y - (p.y + 0.5) * CS); if (d < CS * 1.4 && d < bd) { bd = d; best = p; } } return best; }
    function nearCana() { return canas.find(c => Math.hypot(player.x - c.x, player.y - c.y) < CS * 1.5); }
    function bondiActual() { const i = Math.floor(t / BONDI_CICLO) % BONDIS.length; const ph = (t % BONDI_CICLO) / BONDI_CICLO; return { b: BONDIS[i], ph }; }

    function interact() {
      if (near(puerta, 1.8)) { done = true; exitTo = 'terminal'; if (typeof Sfx !== 'undefined' && Sfx.pickup) Sfx.pickup(); return; }
      const cana = nearCana();
      if (cana) { canaIdx = (canaIdx + 1) % 4; setMsg(T('g.ccalle.cana_' + canaIdx), 6); return; }   // el cana te "atiende"
      const p = nearPuesto();
      if (p) {   // los puestos VENDEN (patrón sells genérico de las terminales)
        if (coinsLeft >= p.price) { coinsLeft -= p.price; purchase = { item: p.item, spent: p.price };
          setMsg(T('g.ccalle.buy_' + p.id, { p: p.price }), 6); if (typeof Sfx !== 'undefined' && Sfx.pickup) Sfx.pickup(); }
        else { setMsg(T('g.ccalle.noCoins', { p: p.price }), 6); if (typeof Sfx !== 'undefined' && Sfx.empty) Sfx.empty(); }
        return;
      }
      if (near(parada, 1.8)) { const { b } = bondiActual(); setMsg(T('g.ccalle.parada', { n: b.n, d: b.dest }), 7); return; }
      setMsg(T('g.ccalle.hint'), 3);
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
      if (Input.keys['escape']) { if (!escHeld) { escHeld = true; done = true; exitTo = 'terminal'; } } else escHeld = false;
      if (Input.keys['e'] || Input.keys['enter']) { if (!eHeld) { eHeld = true; interact(); } } else eHeld = false;
      // los canas patrullan (ida y vuelta por la vereda)
      for (const c of canas) { c.x += c.dir * 26 * dt; if (c.x < c.min * CS) { c.x = c.min * CS; c.dir = 1; } if (c.x > c.max * CS) { c.x = c.max * CS; c.dir = -1; } }
      if (near(puerta, 1.8)) prompt = T('g.ccalle.promptPuerta');
      else if (nearCana()) prompt = T('g.ccalle.promptCana');
      else if (nearPuesto()) { const p = nearPuesto(); prompt = T('g.ccalle.promptBuy', { e: p.emoji, n: T('g.wpn.' + p.item), p: p.price }); }
      else if (near(parada, 1.8)) prompt = T('g.ccalle.promptParada');
      else prompt = '';
    }

    function draw(g, VW, VH) {
      const ox = (VW - W * CS) / 2, oy = (VH - H * CS) / 2;
      g.fillStyle = '#0b0d12'; g.fillRect(0, 0, VW, VH);
      // vereda (baldosas) + la avenida (asfalto) pegada a la fachada
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        g.fillStyle = ((x + y) & 1) ? '#23262d' : '#1d2026';
        if (y >= 4 && y <= 5) g.fillStyle = '#15171c';   // el asfalto de la avenida
        g.fillRect(ox + x * CS, oy + y * CS, CS, CS);
      }
      g.strokeStyle = '#3a3f2a'; g.lineWidth = 2; g.setLineDash([14, 12]);   // línea de la avenida
      g.beginPath(); g.moveTo(ox + CS, oy + 5 * CS); g.lineTo(ox + (W - 1) * CS, oy + 5 * CS); g.stroke(); g.setLineDash([]);
      // FACHADA de la terminal (arriba): pared, arcos, el cartel y la puerta grande
      g.fillStyle = '#2b2622'; g.fillRect(ox + CS, oy + CS, (W - 2) * CS, 2 * CS);
      g.strokeStyle = '#4a4038'; g.lineWidth = 2;
      for (let a = 2; a < W - 2; a += 2) { g.beginPath(); g.arc(ox + a * CS, oy + 1.9 * CS, 12, Math.PI, 0); g.stroke(); }
      g.fillStyle = '#181410'; g.fillRect(ox + 9 * CS, oy + 1.6 * CS, 3 * CS, 1.4 * CS);   // la puerta grande
      g.fillStyle = '#c9a24a'; g.font = 'bold 11px monospace'; g.textAlign = 'center';
      g.fillText('ESTACIÓN CONSTITUCIÓN', ox + W * CS / 2, oy + 1.3 * CS);
      g.fillStyle = '#9fe6a0'; g.font = '9px monospace'; g.fillText('▲ ' + T('g.ccalle.terminal'), ox + 10.5 * CS, oy + 3.3 * CS);
      // el BONDI que pasa/para en la avenida (cicla por las líneas reales)
      { const { b, ph } = bondiActual();
        // fase: entra (0-0.35) → parado en la parada (0.35-0.65) → se va (0.65-1)
        const stopX = ox + (parada.x - 1.5) * CS;
        const bx = ph < 0.35 ? ox - 5 * CS + (stopX - (ox - 5 * CS)) * (ph / 0.35)
                 : ph < 0.65 ? stopX
                 : stopX + (ox + (W + 2) * CS - stopX) * ((ph - 0.65) / 0.35);
        const by = oy + (AVENIDA_Y - 0.5) * CS;
        g.fillStyle = '#b8b0a0'; g.fillRect(bx, by, 3.4 * CS, 1.2 * CS);
        g.fillStyle = '#5a2a1a'; g.fillRect(bx, by, 3.4 * CS, 10);                       // techo/franja
        g.fillStyle = '#cfe8ff'; for (let w = 0; w < 4; w++) g.fillRect(bx + 6 + w * 24, by + 12, 18, 10);
        g.fillStyle = '#111'; g.beginPath(); g.arc(bx + 16, by + 1.2 * CS + 2, 6, 0, Math.PI * 2); g.arc(bx + 3.4 * CS - 16, by + 1.2 * CS + 2, 6, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#ffe9b0'; g.font = 'bold 10px monospace'; g.textAlign = 'center'; g.fillText(b.n, bx + 3.4 * CS - 14, by + 9); }
      // la PARADA (poste + cartel con las líneas)
      { const px2 = ox + (parada.x + 0.5) * CS, py2 = oy + (parada.y + 0.5) * CS;
        g.fillStyle = '#4a5058'; g.fillRect(px2 - 2, py2 - 26, 4, 34);
        g.fillStyle = '#1f6cb5'; g.fillRect(px2 - 20, py2 - 40, 40, 16);
        g.fillStyle = '#fff'; g.font = 'bold 8px monospace'; g.textAlign = 'center'; g.fillText('PARADA', px2, py2 - 29);
        g.fillStyle = '#0d1017'; g.fillRect(px2 - 26, py2 + 8, 52, 12);
        g.fillStyle = '#9fb0c4'; g.font = '7px monospace'; g.fillText(BONDIS.map(b => b.n).join(' '), px2, py2 + 17); }
      // los PUESTOS de comida (chapa + toldo + humito)
      for (const p of PUESTOS) { const px2 = ox + (p.x + 0.5) * CS, py2 = oy + (p.y + 0.5) * CS;
        g.fillStyle = '#3a332a'; g.fillRect(px2 - 16, py2 - 10, 32, 22);
        g.fillStyle = (PUESTOS.indexOf(p) % 2) ? '#7a2f2f' : '#2f5a7a'; g.fillRect(px2 - 18, py2 - 16, 36, 8);   // toldo
        g.font = '13px monospace'; g.textAlign = 'center'; g.fillText(p.emoji, px2, py2 + 6);
        g.fillStyle = 'rgba(210,210,210,' + (0.12 + 0.08 * Math.sin(t * 3 + p.x)) + ')';
        g.beginPath(); g.arc(px2 + 8, py2 - 20 - ((t * 10 + p.y * 7) % 18), 4, 0, Math.PI * 2); g.fill();          // humito
        g.fillStyle = '#9fb0c4'; g.font = '8px monospace'; g.fillText(T('g.ccalle.puesto_' + p.id), px2, py2 - 20); }
      // los CANAS de la ronda (gorra + uniforme, caminan)
      for (const c of canas) { const cx = ox + c.x, cy = oy + c.y;
        g.fillStyle = '#111'; g.beginPath(); g.ellipse(cx, cy + 9, 8, 3, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#1a2a4a'; g.fillRect(cx - 6, cy - 4, 12, 16);              // uniforme azul
        g.fillStyle = '#e0b98e'; g.beginPath(); g.arc(cx, cy - 8, 5, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#10203a'; g.fillRect(cx - 6, cy - 13, 12, 4);              // gorra
        g.fillStyle = '#ffd54f'; g.fillRect(cx - 2, cy - 12, 4, 2);               // placa de la gorra
        g.fillStyle = '#9fb0c4'; g.font = '8px monospace'; g.textAlign = 'center'; g.fillText(T('g.ccalle.canaName'), cx, cy - 17); }
      // palomas de plaza (van picoteando, cambian de lugar despacio)
      for (let i = 0; i < 3; i++) { const bx2 = ox + ((6 + i * 4 + Math.sin(t * 0.4 + i * 2) * 2) * CS), by2 = oy + (7.5 + Math.cos(t * 0.3 + i) * 1.2) * CS;
        g.fillStyle = '#8a8f98'; g.beginPath(); g.ellipse(bx2, by2, 4, 3, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#5a5f68'; g.beginPath(); g.arc(bx2 + 3, by2 - 2, 2, 0, Math.PI * 2); g.fill(); }
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
      get purchase() { const p = purchase; purchase = null; return p; },   // one-shot: game.js cobra + addItem
      update, draw,
      __volver: () => { player.x = (puerta.x + 0.5) * CS; player.y = (puerta.y + 1.4) * CS; interact(); return exitTo; },   // e2e: volver a la terminal
      __buy: (id) => { const p = PUESTOS.find(x => x.id === id); player.x = (p.x + 0.5) * CS; player.y = (p.y - 0.6) * CS; interact(); return purchase; },   // e2e: comprar en un puesto
      __cana: () => { const c = canas[0]; player.x = c.x; player.y = c.y - CS; interact(); return msg; },   // e2e: el cana te atiende
      __parada: () => { player.x = (parada.x + 0.5) * CS; player.y = (parada.y + 1.4) * CS; interact(); return msg; },   // e2e: la parada de bondis
    };
  }
  return { create, BONDIS, PUESTOS };
})();
if (typeof window !== 'undefined') window.ConstiCalle = ConstiCalle;
if (typeof module !== 'undefined') module.exports = ConstiCalle;
