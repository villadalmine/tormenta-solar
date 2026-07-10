// saavedra.js — SUB-MODO "A PIE A PUENTE SAAVEDRA" (v363, zarate-60.md). El tren Belgrano Norte te deja
// "cerca" de Puente Saavedra — cerca es un decir: la última parte es A PIE por las calles (Av. Maipú y el
// cruce de la General Paz). En la parada te espera EL MÍTICO 60 RAMAL ZÁRATE… y el gag: el viaje es tan largo
// que te dormís y te volvés a despertar donde empezaste (game.js: arista bondi60_loop + spawnIn del búnker).
// Vista top-down (patrón consticalle). Fases: 'calle' (caminás hasta la parada) → 'viaje' (el 60 eterno).
const Saavedra = (() => {
  const T = (k, p) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(k, p) : k;
  const CS = 30, W = 20, H = 14;

  function create(opts) {
    opts = opts || {};
    const map = Array.from({ length: H }, () => new Array(W).fill(0));
    for (let x = 0; x < W; x++) { map[0][x] = 1; map[H - 1][x] = 1; }
    for (let y = 0; y < H; y++) { map[y][0] = 1; map[y][W - 1] = 1; }
    // manzanas de casas arriba y abajo de la Av. Maipú (la vereda es la franja del medio)
    for (let x = 2; x < 12; x++) { map[2][x] = 1; map[3][x] = 1; map[10][x] = 1; map[11][x] = 1; }
    const estacion = { x: 1.6, y: 6.5 };             // volver al andén del Belgrano Norte
    const PUENTE_X = 13;                              // de acá a la derecha es el puente sobre la Gral. Paz
    const parada = { x: 17, y: 6.5 };                // la parada del 60, cruzando el puente
    const kiosco = { x: 6, y: 4.6 };                 // un kiosquito de barrio (flavor)
    const player = { x: 2.6 * CS, y: 6.5 * CS, r: 10, dir: 1, walk: 0 };
    let phase = 'calle', viajeT = 0, zzz = false;    // 'viaje' = arriba del 60 (el gag)
    let done = false, exitTo = null, t = 0, msg = '', msgT = 0, prompt = '', escHeld = false, eHeld = false;
    setMsg(T('g.saav.enter'), 7);

    function setMsg(s, d = 4) { msg = s; msgT = d; }
    function solid(px, py) { const tx = Math.floor(px / CS), ty = Math.floor(py / CS); if (tx < 0 || ty < 0 || tx >= W || ty >= H) return true; return map[ty][tx] === 1; }
    function freeAt(x, y) { const r = player.r; return !solid(x - r, y - r) && !solid(x + r, y - r) && !solid(x - r, y + r) && !solid(x + r, y + r); }
    function near(c, d = 1.5) { return Math.hypot(player.x - (c.x + 0.5) * CS, player.y - (c.y + 0.5) * CS) < CS * d; }

    function interact() {
      if (phase !== 'calle') return;
      if (near(estacion, 1.7)) { done = true; exitTo = 'back'; if (typeof Sfx !== 'undefined' && Sfx.pickup) Sfx.pickup(); return; }
      if (near(parada, 1.8)) { phase = 'viaje'; viajeT = 0; setMsg(T('g.saav.sube60'), 6); if (typeof Sfx !== 'undefined' && Sfx.pickup) Sfx.pickup(); return; }
      if (near(kiosco, 1.5)) { setMsg(T('g.saav.kiosco'), 6); return; }
      setMsg(T('g.saav.hint'), 3);
    }

    function update(dt) {
      t += dt; msgT -= dt;
      if (phase === 'viaje') {   // EL VIAJE ETERNO: tarjetas de tiempo → te dormís → el loop te reclama
        viajeT += dt;
        if (viajeT > 9 && !zzz) { zzz = true; if (typeof Sfx !== 'undefined' && Sfx.pickup) Sfx.pickup(); }
        if (viajeT > 13) { done = true; exitTo = 'loop'; }
        return;
      }
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
      if (near(estacion, 1.7)) prompt = T('g.saav.promptTren');
      else if (near(parada, 1.8)) prompt = T('g.saav.prompt60');
      else if (near(kiosco, 1.5)) prompt = T('g.saav.promptKiosco');
      else prompt = '';
    }

    function drawViaje(g, VW, VH) {
      // el 60 por la ruta, de noche: paisaje que scrollea + tarjetas de tiempo + Zzz
      g.fillStyle = '#0a0c14'; g.fillRect(0, 0, VW, VH);
      g.fillStyle = 'rgba(255,240,200,0.15)'; g.beginPath(); g.arc(VW * 0.82, VH * 0.18, 30, 0, Math.PI * 2); g.fill();   // luna
      g.fillStyle = '#141820'; g.fillRect(0, VH * 0.6, VW, VH * 0.4);
      for (let i = -1; i < 8; i++) {   // postecitos de ruta pasando
        const px = ((i * 200 - viajeT * 260) % (VW + 200) + VW + 200) % (VW + 200) - 100;
        g.fillStyle = '#2a3040'; g.fillRect(px, VH * 0.5, 5, VH * 0.14);
      }
      // el 60 en primer plano (el clásico rojo/blanco/negro)
      const by = VH * 0.62;
      g.fillStyle = '#c22a1e'; g.fillRect(VW * 0.2, by, VW * 0.6, 70);
      g.fillStyle = '#e8e4d8'; g.fillRect(VW * 0.2, by + 14, VW * 0.6, 26);
      g.fillStyle = '#cfe8ff'; for (let w = 0; w < 7; w++) g.fillRect(VW * 0.23 + w * (VW * 0.54 / 7), by + 18, VW * 0.54 / 7 - 8, 18);
      g.fillStyle = '#111'; g.beginPath(); g.arc(VW * 0.3, by + 74, 11, 0, Math.PI * 2); g.arc(VW * 0.7, by + 74, 11, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffe9b0'; g.font = 'bold 12px monospace'; g.textAlign = 'center'; g.fillText('60 — ZÁRATE', VW / 2, by + 10);
      // tarjeta de tiempo (cada 3s sube la apuesta)
      const card = viajeT < 3 ? T('g.saav.card1') : viajeT < 6 ? T('g.saav.card2') : viajeT < 9 ? T('g.saav.card3') : T('g.saav.card4');
      g.fillStyle = 'rgba(6,10,16,0.85)'; g.fillRect(VW / 2 - 190, 26, 380, 36);
      g.fillStyle = '#e8f0ff'; g.font = 'bold 13px monospace'; g.fillText(card, VW / 2, 49);
      if (zzz) {   // te dormiste
        g.fillStyle = '#9fb0c4'; g.font = 'bold 22px monospace';
        for (let i = 0; i < 3; i++) g.fillText('Z', VW / 2 + 30 + i * 22, VH * 0.42 - i * 16 - Math.sin(t * 2 + i) * 4);
        g.fillStyle = 'rgba(0,0,0,' + Math.min(0.85, (viajeT - 9) * 0.22) + ')'; g.fillRect(0, 0, VW, VH);   // fundido a negro
      }
    }

    function draw(g, VW, VH) {
      if (phase === 'viaje') { drawViaje(g, VW, VH); return; }
      const ox = (VW - W * CS) / 2, oy = (VH - H * CS) / 2;
      g.fillStyle = '#0b0d12'; g.fillRect(0, 0, VW, VH);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        g.fillStyle = ((x + y) & 1) ? '#22252c' : '#1c1f25';
        if (y >= 6 && y <= 7 && x < PUENTE_X) g.fillStyle = '#191c22';               // la vereda de Maipú
        if (x >= PUENTE_X) g.fillStyle = ((x + y) & 1) ? '#262a33' : '#20242c';      // el puente
        g.fillRect(ox + x * CS, oy + y * CS, CS, CS);
      }
      // manzanas de casas (frentes)
      for (let x = 2; x < 12; x++) for (const yy of [2, 10]) {
        g.fillStyle = (x % 2) ? '#33302a' : '#2c2a26'; g.fillRect(ox + x * CS, oy + yy * CS, CS, 2 * CS);
        g.fillStyle = '#c9b04a'; if ((x + yy) % 3 === 0) g.fillRect(ox + x * CS + 8, oy + yy * CS + 12, 6, 6);   // ventanita prendida
      }
      // la GENERAL PAZ debajo del puente (franja vertical de autopista)
      g.fillStyle = '#0d0f14'; g.fillRect(ox + (PUENTE_X + 1) * CS, oy + CS, 2 * CS, (H - 2) * CS);
      g.strokeStyle = '#3a3f2a'; g.lineWidth = 2; g.setLineDash([10, 10]);
      g.beginPath(); g.moveTo(ox + (PUENTE_X + 2) * CS, oy + CS); g.lineTo(ox + (PUENTE_X + 2) * CS, oy + (H - 1) * CS); g.stroke(); g.setLineDash([]);
      for (let i = 0; i < 3; i++) {   // autitos pasando por abajo
        const ay = ((t * 90 + i * 140) % (H * CS));
        g.fillStyle = ['#7a3a3a', '#3a5a7a', '#5a7a3a'][i]; g.fillRect(ox + (PUENTE_X + 1.3 + (i % 2) * 0.9) * CS, oy + ay, 14, 24);
      }
      // baranda del puente
      g.fillStyle = '#3a4048'; g.fillRect(ox + PUENTE_X * CS, oy + 5.8 * CS, (W - PUENTE_X - 1) * CS, 4); g.fillRect(ox + PUENTE_X * CS, oy + 8 * CS, (W - PUENTE_X - 1) * CS, 4);
      // cartel PUENTE SAAVEDRA
      g.fillStyle = '#0d1017'; g.fillRect(ox + (PUENTE_X + 0.4) * CS, oy + 4.4 * CS, 150, 20);
      g.fillStyle = '#7fd0ff'; g.font = 'bold 10px monospace'; g.textAlign = 'center'; g.fillText('PUENTE SAAVEDRA · GRAL. PAZ', ox + (PUENTE_X + 0.4) * CS + 75, oy + 4.4 * CS + 13);
      // la estación (izquierda) + el kiosco
      g.fillStyle = '#22303c'; g.fillRect(ox + estacion.x * CS - 12, oy + estacion.y * CS - 12, 28, 26);
      g.fillStyle = '#9fe6a0'; g.font = '9px monospace'; g.fillText('◀ TREN', ox + (estacion.x + 0.5) * CS, oy + (estacion.y + 1.4) * CS);
      g.fillStyle = '#3a332a'; g.fillRect(ox + kiosco.x * CS - 14, oy + kiosco.y * CS - 8, 28, 18);
      g.font = '12px monospace'; g.fillText('🏪', ox + (kiosco.x + 0.5) * CS, oy + (kiosco.y + 0.5) * CS + 4);
      // la PARADA del 60 (cruzando el puente) — el 60 espera resoplando
      { const px2 = ox + (parada.x + 0.5) * CS, py2 = oy + (parada.y + 0.5) * CS;
        g.fillStyle = '#4a5058'; g.fillRect(px2 - 2, py2 - 26, 4, 34);
        g.fillStyle = '#c22a1e'; g.fillRect(px2 - 18, py2 - 40, 36, 16);
        g.fillStyle = '#fff'; g.font = 'bold 9px monospace'; g.fillText('60', px2, py2 - 28);
        // el 60 estacionado (te espera)
        g.fillStyle = '#c22a1e'; g.fillRect(px2 - 34, py2 + 12, 68, 22);
        g.fillStyle = '#e8e4d8'; g.fillRect(px2 - 34, py2 + 17, 68, 8);
        g.fillStyle = '#111'; g.beginPath(); g.arc(px2 - 20, py2 + 36, 5, 0, Math.PI * 2); g.arc(px2 + 20, py2 + 36, 5, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(180,180,180,' + (0.15 + 0.1 * Math.sin(t * 4)) + ')';   // humito del caño
        g.beginPath(); g.arc(px2 - 40, py2 + 30 - (t * 8 % 12), 4, 0, Math.PI * 2); g.fill(); }
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
      update, draw,
      __volver: () => { player.x = (estacion.x + 0.5) * CS; player.y = (estacion.y + 0.5) * CS; interact(); return exitTo; },   // e2e: volver al tren
      __sube60: () => { player.x = (parada.x + 0.5) * CS; player.y = (parada.y + 0.5) * CS; interact(); for (let k = 0; k < 300 && !done; k++) update(0.05); return exitTo; },   // e2e: el viaje eterno completo
    };
  }
  return { create };
})();
if (typeof window !== 'undefined') window.Saavedra = Saavedra;
if (typeof module !== 'undefined') module.exports = Saavedra;
