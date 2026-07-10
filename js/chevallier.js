// chevallier.js — SUB-MODO "EL CHEVALLIER DE LUJO" (v364, zarate-60.md): el rápido Once → Zárate. La gracia
// (pedido del dueño): es un viaje DE LUJO y PODÉS CAMINAR POR EL BUS mientras viaja — pasillo central,
// butacas, ventanillas con la Panamericana pasando, AIRE ACONDICIONADO y el dispenser de cortadito de a bordo
// (te da un ítem cafe GRATIS, una vez). Al llegar, la puerta te baja en la COSTANERA de Zárate.
const Chevallier = (() => {
  const T = (k, p) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(k, p) : k;
  const CS = 30, W = 20, H = 8;                      // el interior del micro: angosto y largo
  const VIAJE_DUR = 24;                              // segundos de viaje (sentado en tu butaca pasa volando)

  function create(opts) {
    opts = opts || {};
    const map = Array.from({ length: H }, () => new Array(W).fill(0));
    for (let x = 0; x < W; x++) { map[0][x] = 1; map[H - 1][x] = 1; }
    for (let y = 0; y < H; y++) { map[y][0] = 1; map[y][W - 1] = 1; }
    // butacas: dos filas arriba (y=2) y dos abajo (y=5), pasillo en y=3-4
    for (let x = 3; x < W - 2; x += 2) { map[2][x] = 2; map[5][x] = 2; }
    const butaca = { x: 5, y: 3.6 };                 // TU butaca (al lado del pasillo)
    const cafetera = { x: 2, y: 3.6 };               // el dispenser de a bordo (adelante)
    const aire = { x: 12, y: 3.6 };                  // la rejilla del aire acondicionado
    const puerta = { x: 17.5, y: 3.6 };              // la puerta (se abre al llegar)
    const player = { x: 3 * CS, y: 3.6 * CS, r: 10, dir: 1, walk: 0 };
    let t = 0, sentado = false, cafeDado = false, purchase = null, arrived = false;
    let done = false, exitTo = null, msg = '', msgT = 0, prompt = '', escHeld = false, eHeld = false;
    setMsg(T('g.chev.enter'), 8);

    function setMsg(s, d = 4) { msg = s; msgT = d; }
    function solid(px, py) { const tx = Math.floor(px / CS), ty = Math.floor(py / CS); if (tx < 0 || ty < 0 || tx >= W || ty >= H) return true; return map[ty][tx] !== 0; }
    function freeAt(x, y) { const r = player.r; return !solid(x - r, y - r) && !solid(x + r, y - r) && !solid(x - r, y + r) && !solid(x + r, y + r); }
    function near(c, d = 1.5) { return Math.hypot(player.x - (c.x + 0.5) * CS, player.y - (c.y + 0.5) * CS) < CS * d; }

    function interact() {
      if (arrived && near(puerta, 1.8)) { done = true; exitTo = 'zarate'; if (typeof Sfx !== 'undefined' && Sfx.pickup) Sfx.pickup(); return; }
      if (near(butaca, 1.4)) { sentado = !sentado; setMsg(T(sentado ? 'g.chev.sientas' : 'g.chev.paras'), 5); return; }
      if (near(cafetera, 1.5)) {
        if (!cafeDado) { cafeDado = true; purchase = { item: 'cafe', spent: 0 }; setMsg(T('g.chev.cafe'), 6); if (typeof Sfx !== 'undefined' && Sfx.pickup) Sfx.pickup(); }
        else setMsg(T('g.chev.cafeNo'), 5);
        return;
      }
      if (near(aire, 1.5)) { setMsg(T('g.chev.aire'), 6); return; }
      setMsg(T('g.chev.hint'), 3);
    }

    function update(dt) {
      t += dt * (sentado ? 3 : 1);   // sentado, el viaje "pasa volando" (avanza 3×)
      msgT -= dt;
      if (!arrived && t >= VIAJE_DUR) { arrived = true; sentado = false; setMsg(T('g.chev.llegada'), 8); if (typeof Sfx !== 'undefined' && Sfx.win) Sfx.win(); }
      player.walk = 0;
      if (!sentado) {
        const sp = 150 * dt; let mvx = 0, mvy = 0;
        if (Input.keys['arrowleft'] || Input.keys['a']) mvx = -1;
        if (Input.keys['arrowright'] || Input.keys['d']) mvx = 1;
        if (Input.keys['arrowup'] || Input.keys['w']) mvy = -1;
        if (Input.keys['arrowdown'] || Input.keys['s']) mvy = 1;
        if (mvx) player.dir = mvx;
        if (mvx && freeAt(player.x + mvx * sp, player.y)) { player.x += mvx * sp; player.walk = 1; }
        if (mvy && freeAt(player.x, player.y + mvy * sp)) { player.y += mvy * sp; player.walk = 1; }
      }
      if (Input.keys['escape']) { if (!escHeld) { escHeld = true; if (sentado) sentado = false; } } else escHeld = false;
      if (Input.keys['e'] || Input.keys['enter']) { if (!eHeld) { eHeld = true; interact(); } } else eHeld = false;
      if (arrived && near(puerta, 1.8)) prompt = T('g.chev.promptBajar');
      else if (near(butaca, 1.4)) prompt = T(sentado ? 'g.chev.promptParar' : 'g.chev.promptSentar');
      else if (near(cafetera, 1.5)) prompt = T('g.chev.promptCafe');
      else if (near(aire, 1.5)) prompt = T('g.chev.promptAire');
      else prompt = '';
    }

    function draw(g, VW, VH) {
      const ox = (VW - W * CS) / 2, oy = (VH - H * CS) / 2;
      g.fillStyle = '#0b0d12'; g.fillRect(0, 0, VW, VH);
      // VENTANILLAS arriba y abajo del micro: la Panamericana pasando (o Zárate quieto al llegar)
      for (const wy of [oy - 2.2 * CS, oy + (H + 0.2) * CS]) {
        g.fillStyle = arrived ? '#2a3a4a' : '#37455a'; g.fillRect(ox, wy, W * CS, 2 * CS);
        if (!arrived) {
          g.fillStyle = 'rgba(0,0,0,0.3)';
          for (let i = -1; i < 8; i++) { const hx = ox + ((i * 200 - t * 210) % (W * CS + 200) + W * CS + 200) % (W * CS + 200) - 100; g.beginPath(); g.arc(hx, wy + 2 * CS, 70, Math.PI, 0); g.fill(); }
          g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 3;
          for (let i = -1; i < 12; i++) { const px2 = ox + ((i * 120 - t * 340) % (W * CS + 120) + W * CS + 120) % (W * CS + 120) - 60; g.beginPath(); g.moveTo(px2, wy + 6); g.lineTo(px2, wy + 2 * CS - 6); g.stroke(); }
        } else {   // llegaste: el río y las grúas del puerto de Zárate
          g.fillStyle = '#3a6a8a'; g.fillRect(ox, wy + CS, W * CS, CS);
          g.fillStyle = '#5a5f68'; for (let i = 0; i < 4; i++) { g.fillRect(ox + 80 + i * 140, wy + 10, 6, 24); g.fillRect(ox + 80 + i * 140, wy + 10, 30, 5); }
        }
        g.strokeStyle = '#39424f'; g.lineWidth = 4; for (let x = 0; x <= W; x += 4) { g.beginPath(); g.moveTo(ox + x * CS, wy); g.lineTo(ox + x * CS, wy + 2 * CS); g.stroke(); }   // parantes de ventanilla
      }
      // piso del micro (alfombra de lujo) + pasillo
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        g.fillStyle = ((x + y) & 1) ? '#2a2434' : '#241f2d';
        if (y === 3 || y === 4) g.fillStyle = ((x + y) & 1) ? '#38304a' : '#332b44';   // el pasillo alfombrado
        g.fillRect(ox + x * CS, oy + y * CS, CS, CS);
      }
      // butacas (respaldos mullidos)
      for (let x = 3; x < W - 2; x += 2) for (const yy of [2, 5]) {
        const bx = ox + x * CS, by = oy + yy * CS;
        g.fillStyle = '#4a3a5a'; g.fillRect(bx + 3, by + 3, CS - 6, CS - 6);
        g.fillStyle = '#5d4a70'; g.fillRect(bx + 5, by + 5, CS - 10, 8);
        g.fillStyle = '#c9a24a'; g.fillRect(bx + 6, by + CS - 9, CS - 12, 3);   // vivo dorado (el lujo)
      }
      // TU butaca marcada
      g.strokeStyle = '#ffd54f'; g.lineWidth = 2; g.strokeRect(ox + butaca.x * CS + 2, oy + 2 * CS + 2, CS - 4, CS - 4);
      g.fillStyle = '#ffd54f'; g.font = '8px monospace'; g.textAlign = 'center'; g.fillText(T('g.chev.tuButaca'), ox + (butaca.x + 0.5) * CS, oy + 1.8 * CS);
      // cafetera + aire + puerta
      g.fillStyle = '#3a2a1a'; g.fillRect(ox + cafetera.x * CS + 4, oy + 3.2 * CS, 20, 22);
      g.font = '12px monospace'; g.fillText('☕', ox + (cafetera.x + 0.5) * CS + 2, oy + 3.9 * CS);
      g.fillStyle = '#9fe6ff'; g.fillRect(ox + aire.x * CS, oy + 3.1 * CS, 26, 6);
      for (let i = 0; i < 3; i++) { g.fillStyle = 'rgba(159,230,255,' + (0.35 - i * 0.1) + ')'; g.fillRect(ox + aire.x * CS + 2 + Math.sin(t * 3 + i) * 3, oy + 3.35 * CS + i * 7, 22, 2); }   // el chiflete rico
      g.fillStyle = '#8fa8c8'; g.font = '8px monospace'; g.fillText('A/C', ox + (aire.x + 0.4) * CS, oy + 2.85 * CS);
      g.fillStyle = arrived ? '#9fe6a0' : '#39424f'; g.fillRect(ox + 17 * CS, oy + 3 * CS, 8, 2 * CS);
      if (arrived) { g.fillStyle = '#9fe6a0'; g.font = '9px monospace'; g.fillText('▶ ' + T('g.chev.bajada'), ox + 17.4 * CS, oy + 2.7 * CS); }
      // cartel de ruta + barra de progreso
      g.fillStyle = 'rgba(6,10,16,0.85)'; g.fillRect(VW / 2 - 170, 16, 340, 44);
      g.fillStyle = '#ffe9b0'; g.font = 'bold 13px monospace';
      g.fillText('🚍 CHEVALLIER — ' + T(arrived ? 'g.chev.rotLlego' : 'g.chev.rot'), VW / 2, 34);
      g.fillStyle = '#2a3340'; g.fillRect(VW / 2 - 150, 42, 300, 6);
      g.fillStyle = '#7CFC00'; g.fillRect(VW / 2 - 150, 42, 300 * Math.min(1, t / VIAJE_DUR), 6);
      g.fillStyle = '#8fa8c8'; g.font = '9px monospace'; g.fillText(T('g.chev.tip'), VW / 2, 56);
      // jugador (sentado = en la butaca)
      const px = sentado ? ox + (butaca.x + 0.5) * CS : ox + player.x, py = sentado ? oy + 2.5 * CS : oy + player.y;
      g.fillStyle = '#111'; g.beginPath(); g.ellipse(px, py + 10, 10, 4, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffcf5b'; g.beginPath(); g.arc(px, py, 10, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#0a0a0a'; g.fillRect(px + player.dir * 3 - 1, py - 3, 2, 2);
      if (prompt) { g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(0, VH - 54, VW, 22); g.fillStyle = '#7ff3ff'; g.font = 'bold 13px monospace'; g.textAlign = 'center'; g.fillText(prompt, VW / 2, VH - 38); }
      if (msgT > 0 && msg) { g.fillStyle = 'rgba(0,0,0,0.72)'; g.fillRect(0, VH - 30, VW, 26); g.fillStyle = '#e8f0ff'; g.font = '13px monospace'; g.textAlign = 'center'; g.fillText(msg, VW / 2, VH - 12); }
    }

    return {
      get done() { return done; }, get exitTo() { return exitTo; },
      get purchase() { const p = purchase; purchase = null; return p; },   // one-shot: el cortadito de a bordo (gratis)
      update, draw,
      __cafe: () => { player.x = (cafetera.x + 0.5) * CS; player.y = (cafetera.y + 0.5) * CS; interact(); return purchase; },   // e2e: cortadito de cortesía
      __llegar: () => { t = VIAJE_DUR + 1; update(0.05); player.x = (puerta.x - 0.4) * CS; player.y = (puerta.y + 0.5) * CS; interact(); return exitTo; },   // e2e: llegar y bajar
    };
  }
  return { create };
})();
if (typeof window !== 'undefined') window.Chevallier = Chevallier;
if (typeof module !== 'undefined') module.exports = Chevallier;
