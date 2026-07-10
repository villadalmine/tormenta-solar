// zarate.js — SUB-MODO "COSTANERA DE ZÁRATE" (v365, zarate-60.md). El Chevallier te baja en la costanera:
// el río Paraná arriba, el puesto de CHORIS ("te clavás unos choris"), el club ARSENAL de pasada, y el
// CLUB DE REMO con el TORNEO: Campana vs Zárate en botes de competición — Campana ganó TODAS las
// combinaciones y para la final del OCHO les falta el TIMONEL: entrás vos ([E] → js/regata.js).
// Con la regata ganada (opts.regataWon) el club está de festejo y el tablero muestra el campeonato.
const Zarate = (() => {
  const T = (k, p) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(k, p) : k;
  const CS = 30, W = 20, H = 14;
  // el TABLERO del torneo (DATA): las combinaciones ya corridas — Campana viene ganando todo
  const SERIES = [
    { cat: 'SINGLE',    c: 1, z: 0 },
    { cat: 'DOBLE PAR', c: 1, z: 0 },
    { cat: 'CUATRO',    c: 1, z: 0 },
  ];

  function create(opts) {
    opts = opts || {};
    const regataWon = !!opts.regataWon;
    const map = Array.from({ length: H }, () => new Array(W).fill(0));
    for (let x = 0; x < W; x++) { map[0][x] = 1; map[H - 1][x] = 1; }
    for (let y = 0; y < H; y++) { map[y][0] = 1; map[y][W - 1] = 1; }
    for (let x = 1; x < W - 1; x++) { map[1][x] = 1; map[2][x] = 1; map[3][x] = 1; }   // el RÍO (no se camina)
    const chevallier = { x: 2, y: 12 };              // el Chevallier de vuelta (a Once)
    const choris = { x: 4.5, y: 6 };                 // el puesto de choris de la costanera
    const arsenal = { x: 10, y: 11.4 };              // el club Arsenal (de pasada)
    const remo = { x: 15.5, y: 6 };                  // el CLUB DE REMO (el torneo)
    const tablero = { x: 12.5, y: 6 };               // el tablero de resultados
    const player = { x: 3 * CS, y: 9 * CS, r: 10, dir: 1, walk: 0 };
    const CHORI_PRICE = 12;
    let coinsLeft = opts.coins || 0, purchase = null, regataGo = false;
    let done = false, exitTo = null, t = 0, msg = '', msgT = 0, prompt = '', escHeld = false, eHeld = false;
    setMsg(T(regataWon ? 'g.zarate.enterCampeon' : 'g.zarate.enter'), 8);

    function setMsg(s, d = 4) { msg = s; msgT = d; }
    function solid(px, py) { const tx = Math.floor(px / CS), ty = Math.floor(py / CS); if (tx < 0 || ty < 0 || tx >= W || ty >= H) return true; return map[ty][tx] === 1; }
    function freeAt(x, y) { const r = player.r; return !solid(x - r, y - r) && !solid(x + r, y - r) && !solid(x - r, y + r) && !solid(x + r, y + r); }
    function near(c, d = 1.5) { return Math.hypot(player.x - (c.x + 0.5) * CS, player.y - (c.y + 0.5) * CS) < CS * d; }

    function interact() {
      if (near(chevallier, 1.8)) { done = true; exitTo = 'back'; if (typeof Sfx !== 'undefined' && Sfx.pickup) Sfx.pickup(); return; }
      if (near(choris, 1.6)) {   // te clavás unos choris (patrón sells)
        if (coinsLeft >= CHORI_PRICE) { coinsLeft -= CHORI_PRICE; purchase = { item: 'chori', spent: CHORI_PRICE };
          setMsg(T('g.zarate.buyChori', { p: CHORI_PRICE }), 6); if (typeof Sfx !== 'undefined' && Sfx.pickup) Sfx.pickup(); }
        else { setMsg(T('g.zarate.noCoins', { p: CHORI_PRICE }), 6); if (typeof Sfx !== 'undefined' && Sfx.empty) Sfx.empty(); }
        return;
      }
      if (near(arsenal, 1.8)) { setMsg(T('g.zarate.arsenal'), 7); return; }
      if (near(tablero, 1.5)) { setMsg(T(regataWon ? 'g.zarate.tableroFinal' : 'g.zarate.tablero'), 8); return; }
      if (near(remo, 1.8)) {
        if (regataWon) { setMsg(T('g.zarate.festejo'), 8); return; }
        regataGo = true; done = true; exitTo = 'regata'; if (typeof Sfx !== 'undefined' && Sfx.pickup) Sfx.pickup(); return;   // te reclutan de TIMONEL
      }
      setMsg(T('g.zarate.hint'), 3);
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
      if (near(chevallier, 1.8)) prompt = T('g.zarate.promptChev');
      else if (near(choris, 1.6)) prompt = T('g.zarate.promptChori', { p: CHORI_PRICE });
      else if (near(arsenal, 1.8)) prompt = T('g.zarate.promptArsenal');
      else if (near(tablero, 1.5)) prompt = T('g.zarate.promptTablero');
      else if (near(remo, 1.8)) prompt = T(regataWon ? 'g.zarate.promptFestejo' : 'g.zarate.promptRemo');
      else prompt = '';
    }

    function draw(g, VW, VH) {
      const ox = (VW - W * CS) / 2, oy = (VH - H * CS) / 2;
      g.fillStyle = '#0b0d12'; g.fillRect(0, 0, VW, VH);
      // el RÍO arriba (Paraná marrón dorado al atardecer) con olitas y los botes del torneo
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        g.fillStyle = ((x + y) & 1) ? '#242820' : '#1e221b';   // la costanera (adoquín verde-ocre)
        if (y <= 3) g.fillStyle = '#4a3d28';
        g.fillRect(ox + x * CS, oy + y * CS, CS, CS);
      }
      g.fillStyle = '#5a4a30'; for (let i = 0; i < 14; i++) { const wx = ox + ((i * 47 + t * 20) % (W * CS)); g.fillRect(wx, oy + CS + (i % 3) * 22, 26, 3); }   // olitas
      // botes de competición pasando por el río (el torneo vive)
      for (let i = 0; i < 2; i++) {
        const bx = ox + ((t * (34 + i * 18) + i * 260) % (W * CS + 120)) - 60, by = oy + (1.5 + i) * CS;
        g.fillStyle = i ? '#7a5aa0' : '#c9d24a';   // violeta Campana / amarillo Zárate
        g.fillRect(bx, by, 66, 7);
        g.fillStyle = '#e0b98e'; for (let r = 0; r < 4; r++) { g.beginPath(); g.arc(bx + 12 + r * 14, by + 2, 3, 0, Math.PI * 2); g.fill(); }
        g.strokeStyle = 'rgba(220,220,200,0.5)'; g.lineWidth = 2;
        for (let r = 0; r < 4; r++) { const ang = Math.sin(t * 4 + r) * 0.6; g.beginPath(); g.moveTo(bx + 12 + r * 14, by + 4); g.lineTo(bx + 12 + r * 14 + Math.cos(ang) * 12, by + 10 + Math.sin(ang) * 4); g.stroke(); }
      }
      // baranda de la costanera
      g.fillStyle = '#3a4048'; g.fillRect(ox + CS, oy + 4 * CS - 6, (W - 2) * CS, 4);
      for (let x = 1; x < W - 1; x += 2) g.fillRect(ox + x * CS + 12, oy + 4 * CS - 6, 3, 12);
      // cartel COSTANERA
      g.fillStyle = '#0d1017'; g.fillRect(ox + W * CS / 2 - 105, oy + 4.5 * CS, 210, 22);
      g.fillStyle = '#ffe9b0'; g.font = 'bold 12px monospace'; g.textAlign = 'center';
      g.fillText('COSTANERA DE ZÁRATE', ox + W * CS / 2, oy + 4.5 * CS + 15);
      // puesto de CHORIS (parrilla + humo)
      { const cx = ox + (choris.x + 0.5) * CS, cy = oy + (choris.y + 0.5) * CS;
        g.fillStyle = '#3a332a'; g.fillRect(cx - 18, cy - 10, 36, 22);
        g.fillStyle = '#7a2f2f'; g.fillRect(cx - 20, cy - 16, 40, 8);
        g.font = '13px monospace'; g.fillText('🌭', cx, cy + 6);
        g.fillStyle = '#ff5a2a'; for (let i = 0; i < 4; i++) g.fillRect(cx - 12 + i * 7, cy + 9, 4, 3);
        g.fillStyle = 'rgba(210,210,210,' + (0.15 + 0.1 * Math.sin(t * 3)) + ')';
        g.beginPath(); g.arc(cx + 6, cy - 20 - (t * 10 % 16), 5, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#9fb0c4'; g.font = '8px monospace'; g.fillText(T('g.zarate.chorisName'), cx, cy - 20); }
      // el club ARSENAL (frente con escudo)
      { const ax = ox + (arsenal.x + 0.5) * CS, ay = oy + (arsenal.y + 0.5) * CS;
        g.fillStyle = '#2a3a4a'; g.fillRect(ax - 40, ay - 22, 80, 34);
        g.fillStyle = '#7fd0ff'; g.fillRect(ax - 36, ay - 18, 12, 12);
        g.fillStyle = '#e8f0ff'; g.font = 'bold 9px monospace'; g.fillText('CLUB ARSENAL', ax + 6, ay - 9);
        g.fillStyle = '#9fb0c4'; g.font = '8px monospace'; g.fillText(T('g.zarate.arsenalSub'), ax, ay + 6); }
      // el CLUB DE REMO + tablero del torneo
      { const rx = ox + (remo.x + 0.5) * CS, ry = oy + (remo.y + 0.5) * CS;
        g.fillStyle = '#3a2f26'; g.fillRect(rx - 44, ry - 26, 88, 40);                      // el galpón de botes
        g.fillStyle = '#59493a'; g.beginPath(); g.moveTo(rx - 48, ry - 26); g.lineTo(rx, ry - 44); g.lineTo(rx + 48, ry - 26); g.fill();
        g.fillStyle = '#e8f0ff'; g.font = 'bold 9px monospace'; g.fillText('CLUB DE REMO', rx, ry - 12);
        g.fillStyle = '#c9b04a'; g.font = '8px monospace'; g.fillText(T('g.zarate.remoSub'), rx, ry - 2);
        if (regataWon) { g.font = '14px monospace'; g.fillText('🏆', rx, ry + 12); }
        else { g.fillStyle = (Math.floor(t * 2) % 2) ? '#ffd54f' : '#8a7a3a'; g.font = '8px monospace'; g.fillText(T('g.zarate.faltaTimonel'), rx, ry + 10); } }
      // TABLERO del torneo: Campana vs Zárate
      { const tx2 = ox + (tablero.x + 0.5) * CS, ty2 = oy + (tablero.y + 0.5) * CS;
        g.fillStyle = '#0d1017'; g.fillRect(tx2 - 40, ty2 - 30, 80, 56);
        g.fillStyle = '#ffe9b0'; g.font = 'bold 8px monospace'; g.fillText('CAMPANA–ZÁRATE', tx2, ty2 - 20);
        g.font = '7px monospace';
        SERIES.forEach((r, i) => { g.fillStyle = '#9fb0c4'; g.textAlign = 'left'; g.fillText(r.cat, tx2 - 36, ty2 - 10 + i * 9);
          g.fillStyle = '#b09ad0'; g.textAlign = 'right'; g.fillText(r.c + '–' + r.z, tx2 + 36, ty2 - 10 + i * 9); });
        g.textAlign = 'left'; g.fillStyle = regataWon ? '#b09ad0' : '#ffd54f'; g.fillText('OCHO', tx2 - 36, ty2 + 17);
        g.textAlign = 'right'; g.fillText(regataWon ? '1–0 🏆' : '¿?', tx2 + 36, ty2 + 17); g.textAlign = 'center'; }
      // el Chevallier de vuelta
      { const vx = ox + (chevallier.x + 0.5) * CS, vy = oy + (chevallier.y + 0.5) * CS;
        g.fillStyle = '#1a3a6a'; g.fillRect(vx - 26, vy - 12, 52, 20);
        g.fillStyle = '#cfe8ff'; for (let w = 0; w < 4; w++) g.fillRect(vx - 22 + w * 12, vy - 8, 9, 8);
        g.fillStyle = '#9fe6a0'; g.font = '9px monospace'; g.fillText('◀ ' + T('g.zarate.vuelta'), vx, vy + 22); }
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
      get purchase() { const p = purchase; purchase = null; return p; },   // one-shot: los choris de la costanera
      update, draw,
      __chori: () => { player.x = (choris.x + 0.5) * CS; player.y = (choris.y + 1.2) * CS; interact(); return purchase; },   // e2e
      __remo: () => { player.x = (remo.x + 0.5) * CS; player.y = (remo.y + 1.4) * CS; interact(); return exitTo; },          // e2e: al club → regata (o festejo)
      __arsenal: () => { player.x = (arsenal.x + 0.5) * CS; player.y = (arsenal.y - 1.2) * CS; interact(); return msg; },    // e2e
      __volver: () => { player.x = (chevallier.x + 0.5) * CS; player.y = (chevallier.y - 0.8) * CS; interact(); return exitTo; },
    };
  }
  return { create, SERIES };
})();
if (typeof window !== 'undefined') window.Zarate = Zarate;
if (typeof module !== 'undefined') module.exports = Zarate;
