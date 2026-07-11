// laplata.js — SUB-MODO "LA PLATA: LAS DIAGONALES Y EL MAPA" (andenes-vivos.md, v369). Desde el andén de
// La Plata salís a PLAZA MORENO: mirás el PLANO de la ciudad y caés — las diagonales son IGUALES a las de
// Campana (las dos ciudades planificadas de 1882). Entrás a la CATEDRAL, bajás a la cripta/archivo y en la
// vitrina está EL MAPA ORIGINAL: el acta de la votación de la capital con tachaduras y una carta de amenaza —
// HUBO EXTORSIÓN, por eso ganó La Plata (y Campana se quedó sin capital). Te llevás el mapa 🗺️ (mapa_1882).
// Dos fases: 'plaza' (ESC vuelve al andén) → 'cripta' (ESC vuelve a la plaza). Aislado del juego principal.
const LaPlata = (() => {
  const T = (k, p) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(k, p) : k;
  const CS = 30, W = 18, H = 12;

  function create(opts) {
    opts = opts || {};
    let phase = 'plaza';                                  // 'plaza' → 'cripta'
    let done = false, exitTo = null, t = 0, msg = '', msgT = 0, prompt = '', escHeld = false, eHeld = false;
    let diagonalesSeen = false, mapaFired = !!opts.mapaDone, mapaJustNow = false;
    const map = Array.from({ length: H }, () => new Array(W).fill(0));
    for (let x = 0; x < W; x++) { map[0][x] = 1; map[H - 1][x] = 1; }
    for (let y = 0; y < H; y++) { map[y][0] = 1; map[y][W - 1] = 1; }
    // PLAZA MORENO: el plano de las diagonales (izq), la catedral (centro-arriba), palomas
    const plano = { x: 3.5, y: 7.5 };
    const catedralDoor = { x: 9, y: 4.8 };
    const palomas = []; for (let i = 0; i < 5; i++) palomas.push({ x: 5 + i * 2.1, y: 8.2 + (i % 2), vx: 0, t: i * 1.3 });
    // CRIPTA: la vitrina del MAPA (centro), estanterías del archivo, velas
    const vitrina = { x: 9, y: 5.5 };
    const salidaCripta = { x: 9, y: 10 };
    const player = { x: 9 * CS, y: 9.5 * CS, r: 10, dir: 1, walk: 0 };
    setMsg(T('g.laplata.enter'), 8);

    function setMsg(s, d = 4) { msg = s; msgT = d; }
    function solid(px, py) { const tx = Math.floor(px / CS), ty = Math.floor(py / CS); if (tx < 0 || ty < 0 || tx >= W || ty >= H) return true; return map[ty][tx] === 1; }
    function freeAt(x, y) { const r = player.r; return !solid(x - r, y - r) && !solid(x + r, y - r) && !solid(x - r, y + r) && !solid(x + r, y + r); }
    function near(c, d = 1.6) { return Math.hypot(player.x - (c.x + 0.5) * CS, player.y - (c.y + 0.5) * CS) < CS * d; }

    function interact() {
      if (phase === 'plaza') {
        if (near(plano, 1.7)) {                            // el PLANO: la revelación de las diagonales
          diagonalesSeen = true; setMsg(T('g.laplata.diagonales'), 10);
          if (typeof Sfx !== 'undefined' && Sfx.pickup) Sfx.pickup(); return;
        }
        if (near(catedralDoor, 1.8)) {                     // entrás a la catedral → la cripta/archivo
          phase = 'cripta'; player.x = 9 * CS; player.y = 9 * CS;
          setMsg(T('g.laplata.cripta'), 8); if (typeof Sfx !== 'undefined' && Sfx.pickup) Sfx.pickup(); return;
        }
        setMsg(T('g.laplata.hintPlaza'), 4); return;
      }
      // CRIPTA
      if (near(vitrina, 1.7)) {
        if (!mapaFired) {                                  // EL MAPA DE 1882: la extorsión
          mapaFired = true; mapaJustNow = true; setMsg(T('g.laplata.mapa'), 12);
          if (typeof Sfx !== 'undefined' && Sfx.win) Sfx.win(); return;
        }
        setMsg(T('g.laplata.mapaYa'), 7); return;
      }
      if (near(salidaCripta, 1.7)) { phase = 'plaza'; player.x = 9 * CS; player.y = 6.5 * CS; setMsg(T('g.laplata.volverPlaza'), 4); return; }
      setMsg(T('g.laplata.hintCripta'), 4);
    }

    function update(dt) {
      t += dt; msgT -= dt;
      if (phase === 'plaza') for (const p of palomas) { p.t += dt; if (Math.floor(p.t) % 4 === 0) p.x += Math.sin(p.t * 2) * dt * 1.2; }
      player.walk = 0;
      const sp = 165 * dt; let mvx = 0, mvy = 0;
      if (Input.keys['arrowleft'] || Input.keys['a']) mvx = -1;
      if (Input.keys['arrowright'] || Input.keys['d']) mvx = 1;
      if (Input.keys['arrowup'] || Input.keys['w']) mvy = -1;
      if (Input.keys['arrowdown'] || Input.keys['s']) mvy = 1;
      if (mvx) player.dir = mvx;
      if (mvx && freeAt(player.x + mvx * sp, player.y)) { player.x += mvx * sp; player.walk = 1; }
      if (mvy && freeAt(player.x, player.y + mvy * sp)) { player.y += mvy * sp; player.walk = 1; }
      if (Input.keys['escape']) { if (!escHeld) { escHeld = true;
        if (phase === 'cripta') { phase = 'plaza'; player.x = 9 * CS; player.y = 6.5 * CS; }
        else { done = true; exitTo = 'back'; } } } else escHeld = false;
      if (Input.keys['e'] || Input.keys['enter']) { if (!eHeld) { eHeld = true; interact(); } } else eHeld = false;
      if (phase === 'plaza') prompt = near(plano, 1.7) ? T('g.laplata.promptPlano') : near(catedralDoor, 1.8) ? T('g.laplata.promptCatedral') : '';
      else prompt = near(vitrina, 1.7) ? (mapaFired ? T('g.laplata.promptVitrinaYa') : T('g.laplata.promptVitrina')) : near(salidaCripta, 1.7) ? T('g.laplata.promptSubir') : '';
    }

    function drawPlaza(g, VW, VH) {
      const ox = (VW - W * CS) / 2, oy = (VH - H * CS) / 2;
      g.fillStyle = '#10130f'; g.fillRect(0, 0, VW, VH);                    // base FULL-canvas (gotcha v365)
      // cielo platense
      g.fillStyle = '#3d4560'; g.fillRect(ox, oy, W * CS, 2.6 * CS);
      // piso de la plaza + LAS DIAGONALES marcadas en las baldosas (la firma de la ciudad)
      for (let y = 3; y < H; y++) for (let x = 0; x < W; x++) { g.fillStyle = ((x + y) & 1) ? '#2a2d26' : '#242720'; g.fillRect(ox + x * CS, oy + y * CS, CS, CS); }
      g.strokeStyle = 'rgba(200,190,140,0.28)'; g.lineWidth = 5;
      g.beginPath(); g.moveTo(ox + 1 * CS, oy + 4 * CS); g.lineTo(ox + 17 * CS, oy + 11 * CS); g.stroke();   // diagonal 73
      g.beginPath(); g.moveTo(ox + 17 * CS, oy + 4 * CS); g.lineTo(ox + 1 * CS, oy + 11 * CS); g.stroke();   // diagonal 74
      g.strokeStyle = 'rgba(200,190,140,0.16)'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(ox + 9 * CS, oy + 3 * CS); g.lineTo(ox + 9 * CS, oy + 11 * CS); g.stroke();    // la 51 al medio
      // LA CATEDRAL (neogótica, ladrillo, dos torres) — centro-arriba
      const dx = ox + (catedralDoor.x + 0.5) * CS, dy = oy + catedralDoor.y * CS;
      g.fillStyle = '#5a3a2e'; g.fillRect(dx - 70, dy - 78, 140, 80);                       // cuerpo de ladrillo
      g.fillStyle = '#6a4536'; g.fillRect(dx - 88, dy - 118, 32, 120); g.fillRect(dx + 56, dy - 118, 32, 120);   // las dos torres
      g.fillStyle = '#4a2f24'; g.beginPath(); g.moveTo(dx - 88, dy - 118); g.lineTo(dx - 72, dy - 148); g.lineTo(dx - 56, dy - 118); g.fill();
      g.beginPath(); g.moveTo(dx + 56, dy - 118); g.lineTo(dx + 72, dy - 148); g.lineTo(dx + 88, dy - 118); g.fill();
      g.fillStyle = '#2a1d18'; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(dx - 30 + i * 30, dy - 30); g.lineTo(dx - 18 + i * 30, dy - 56); g.lineTo(dx - 6 + i * 30, dy - 30); g.fill(); g.fillRect(dx - 30 + i * 30, dy - 30, 24, 26); }   // ojivas
      g.fillStyle = '#e8d9b0'; g.beginPath(); g.arc(dx, dy - 64, 9, 0, Math.PI * 2); g.fill();   // el rosetón
      g.fillStyle = '#3a2a20'; g.fillRect(dx - 10, dy - 16, 20, 18);                        // el portal
      g.fillStyle = '#c9c4b0'; g.font = 'bold 8px monospace'; g.textAlign = 'center'; g.fillText(T('g.laplata.catedralLabel'), dx, dy + 14);
      // el PLANO de las diagonales (atril, izq)
      const px2 = ox + (plano.x + 0.5) * CS, py2 = oy + (plano.y + 0.5) * CS;
      g.fillStyle = '#4a3a28'; g.fillRect(px2 - 3, py2 - 4, 6, 14);
      g.fillStyle = '#d8cdb0'; g.fillRect(px2 - 22, py2 - 30, 44, 30);
      g.strokeStyle = '#5a4a30'; g.lineWidth = 2; g.strokeRect(px2 - 22, py2 - 30, 44, 30);
      g.strokeStyle = '#7a6a4a'; g.lineWidth = 1;                                           // el cuadrado con sus diagonales
      g.strokeRect(px2 - 16, py2 - 26, 32, 22);
      g.beginPath(); g.moveTo(px2 - 16, py2 - 26); g.lineTo(px2 + 16, py2 - 4); g.stroke();
      g.beginPath(); g.moveTo(px2 + 16, py2 - 26); g.lineTo(px2 - 16, py2 - 4); g.stroke();
      g.fillStyle = '#9fb0c4'; g.font = '8px monospace'; g.fillText(T('g.laplata.planoLabel'), px2, py2 + 20);
      // palomas de plaza
      for (const p of palomas) { const zx = ox + p.x * CS, zy = oy + p.y * CS;
        g.fillStyle = '#8a8f98'; g.beginPath(); g.ellipse(zx, zy, 5, 3.5, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#6a6f78'; g.beginPath(); g.arc(zx + 4, zy - 2, 2, 0, Math.PI * 2); g.fill(); }
      // cartel de la ciudad
      g.fillStyle = '#0d1017cc'; g.fillRect(ox + W * CS / 2 - 88, oy + 0.3 * CS, 176, 18);
      g.fillStyle = '#ffd54f'; g.font = 'bold 11px monospace'; g.fillText('LA PLATA · PLAZA MORENO', ox + W * CS / 2, oy + 0.3 * CS + 13);
    }

    function drawCripta(g, VW, VH) {
      const ox = (VW - W * CS) / 2, oy = (VH - H * CS) / 2;
      g.fillStyle = '#0a0806'; g.fillRect(0, 0, VW, VH);                    // base FULL-canvas (gotcha v365)
      // piso de piedra
      for (let y = 2; y < H; y++) for (let x = 0; x < W; x++) { g.fillStyle = ((x + y) & 1) ? '#1c1712' : '#17130e'; g.fillRect(ox + x * CS, oy + y * CS, CS, CS); }
      // bóvedas (arcos de piedra arriba)
      g.strokeStyle = '#2e2418'; g.lineWidth = 8;
      for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(ox + (2.5 + i * 4.3) * CS, oy + 2.4 * CS, 46, Math.PI, 0); g.stroke(); }
      // estanterías del ARCHIVO (izq y der): legajos
      for (const ex of [2.2, 15]) { const sx = ox + ex * CS, sy = oy + 4.2 * CS;
        g.fillStyle = '#2a2014'; g.fillRect(sx - 20, sy - 20, 40, 90);
        for (let r = 0; r < 4; r++) { g.fillStyle = '#3a2c1a'; g.fillRect(sx - 18, sy - 14 + r * 22, 36, 3);
          for (let b = 0; b < 5; b++) { g.fillStyle = ['#6a5236', '#5a4a3a', '#7a5a2e'][b % 3]; g.fillRect(sx - 16 + b * 7, sy - 12 + r * 22 - 9 + 11, 5, 9); } } }
      // velas
      for (const vx of [5.5, 12.5]) { const cx = ox + vx * CS, cy = oy + 5 * CS;
        g.fillStyle = '#d8cdb0'; g.fillRect(cx - 2, cy - 8, 4, 10);
        g.fillStyle = (Math.floor(t * 7) % 2) ? '#ffb04a' : '#ff8a3a'; g.beginPath(); g.arc(cx, cy - 11, 3, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(255,180,80,0.08)'; g.beginPath(); g.arc(cx, cy - 10, 26, 0, Math.PI * 2); g.fill(); }
      // LA VITRINA DEL MAPA (centro): mesa + vidrio + el mapa (o el hueco si ya te lo llevaste)
      const wx = ox + (vitrina.x + 0.5) * CS, wy = oy + (vitrina.y + 0.5) * CS;
      g.fillStyle = '#3a2c1a'; g.fillRect(wx - 34, wy - 6, 68, 18);                        // la mesa
      g.fillStyle = 'rgba(160,190,210,0.18)'; g.fillRect(wx - 30, wy - 30, 60, 26);        // el vidrio
      g.strokeStyle = '#c9c4b0'; g.lineWidth = 1.5; g.strokeRect(wx - 30, wy - 30, 60, 26);
      if (!mapaFired) {                                                                    // EL MAPA de 1882
        g.fillStyle = '#d8c9a0'; g.fillRect(wx - 24, wy - 26, 48, 18);
        g.strokeStyle = '#7a6a4a'; g.lineWidth = 1; g.strokeRect(wx - 18, wy - 23, 36, 12);
        g.beginPath(); g.moveTo(wx - 18, wy - 23); g.lineTo(wx + 18, wy - 11); g.stroke();
        g.beginPath(); g.moveTo(wx + 18, wy - 23); g.lineTo(wx - 18, wy - 11); g.stroke();
        g.fillStyle = 'rgba(255,220,120,' + (0.10 + 0.08 * Math.sin(t * 3)) + ')'; g.beginPath(); g.arc(wx, wy - 17, 34, 0, Math.PI * 2); g.fill();
      } else {                                                                             // el hueco + la notita
        g.fillStyle = '#241c12'; g.fillRect(wx - 24, wy - 26, 48, 18);
        g.fillStyle = '#d8c9a0'; g.fillRect(wx - 10, wy - 22, 20, 10);
        g.fillStyle = '#5a4a30'; g.font = '6px monospace'; g.textAlign = 'center'; g.fillText(T('g.laplata.notita'), wx, wy - 15);
      }
      g.fillStyle = '#c9c4b0'; g.font = 'bold 8px monospace'; g.textAlign = 'center'; g.fillText(T('g.laplata.vitrinaLabel'), wx, wy - 36);
      // la escalera de salida (abajo)
      const ux = ox + (salidaCripta.x + 0.5) * CS, uy = oy + (salidaCripta.y + 0.5) * CS;
      for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#2e2418' : '#3a2c1a'; g.fillRect(ux - 26 + i * 3, uy - 4 + i * 4, 52 - i * 6, 4); }
      g.fillStyle = '#9fe6a0'; g.font = '9px monospace'; g.fillText('▲ ' + T('g.laplata.subir'), ux, uy - 10);
    }

    function draw(g, VW, VH) {
      if (phase === 'plaza') drawPlaza(g, VW, VH); else drawCripta(g, VW, VH);
      const ox = (VW - W * CS) / 2, oy = (VH - H * CS) / 2;
      const px = ox + player.x, py = oy + player.y;
      g.fillStyle = '#111'; g.beginPath(); g.ellipse(px, py + 10, 10, 4, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffcf5b'; g.beginPath(); g.arc(px, py, player.r, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#0a0a0a'; g.fillRect(px + player.dir * 3 - 1, py - 3, 2, 2);
      if (prompt) { g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(0, VH - 54, VW, 22); g.fillStyle = '#7ff3ff'; g.font = 'bold 13px monospace'; g.textAlign = 'center'; g.fillText(prompt, VW / 2, VH - 38); }
      if (msgT > 0 && msg) { g.fillStyle = 'rgba(0,0,0,0.72)'; g.fillRect(0, VH - 30, VW, 26); g.fillStyle = '#e8f0ff'; g.font = '13px monospace'; g.textAlign = 'center'; g.fillText(msg, VW / 2, VH - 12); }
    }

    return {
      get done() { return done; }, get exitTo() { return exitTo; },
      get mapaEdge() { const m = mapaJustNow; mapaJustNow = false; return m; },   // one-shot: encontraste EL MAPA → game.js aplica arista + da el ítem
      update, draw,
      __plano: () => { player.x = (plano.x + 0.5) * CS; player.y = (plano.y - 0.8) * CS; interact(); return { diagonalesSeen, msg }; },      // e2e: la revelación de las diagonales
      __catedral: () => { player.x = (catedralDoor.x + 0.5) * CS; player.y = (catedralDoor.y + 1.2) * CS; interact(); return phase; },        // e2e: entrar a la cripta
      __mapa: () => { player.x = (vitrina.x + 0.5) * CS; player.y = (vitrina.y - 0.8) * CS; interact(); return { mapaFired, phase }; },       // e2e: el mapa de la vitrina
      __state: () => ({ phase, diagonalesSeen, mapaFired }),
    };
  }
  return { create };
})();
if (typeof window !== 'undefined') window.LaPlata = LaPlata;
if (typeof module !== 'undefined') module.exports = LaPlata;
