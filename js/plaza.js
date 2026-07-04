// plaza.js — SUB-MODO "PLAZA DE MAYO" (specs/subte.md §10). Llegás en subte a Catedral (Línea D) → salís a la
// plaza histórica, VISTA DE ARRIBA en CÍRCULO (más rico que una recta). En el CENTRO la Pirámide de Mayo; las
// MADRES DE PLAZA DE MAYO marchan en RONDA a su alrededor (pañuelos blancos). Los landmarks en su orientación
// real: Casa Rosada (E, rosa), Catedral (N, la boca del subte), Cabildo (O, arcos blancos). Postal explorable +
// arranque del NIVEL 2. Aislado: al salir (done) el juego principal queda EXACTO.
const Plaza = (() => {
  const T = (k, p) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(k, p) : k;

  function create(opts) {
    opts = opts || {};
    // el jugador camina en coordenadas de plaza (unidades ~ "metros"), la cámara es fija centrada
    const player = { x: 0, y: 150, r: 9, dir: 1, walk: 0 };   // aparece por la boca de la Catedral (norte-abajo)
    let done = false, exitTo = null, t = 0, msg = '', msgT = 0, prompt = '', escHeld = false, eHeld = false, near = null, madreIdx = -1;
    // landmarks (dir en grados desde el centro; el render los ancla a los bordes de la plaza)
    const CENTER = { x: 0, y: 0 };                 // Pirámide de Mayo
    const LANDMARKS = [
      { id: 'rosada',   name: 'Casa Rosada',  side: 'E', col: '#e39aa8', roof: '#c26a7e', label: '🏛️ Casa de Gobierno' },
      { id: 'catedral', name: 'Catedral',     side: 'N', col: '#d8d2c4', roof: '#b7ae9a', label: '⛪ Catedral (San Martín) · 🚇 subte' },
      { id: 'cabildo',  name: 'Cabildo',      side: 'O', col: '#eae6da', roof: '#cbc4b2', label: '🏛️ Cabildo (arcos)' },
    ];
    const bocaCatedral = { x: 0, y: 175 };         // la boca del subte (Catedral), abajo (norte del render)
    const MADRE_R = 84;                            // radio de la ronda de las Madres alrededor de la Pirámide
    const madres = []; for (let i = 0; i < 12; i++) madres.push({ a: (i / 12) * Math.PI * 2, sp: 0.18 });
    const palomas = []; for (let i = 0; i < 16; i++) palomas.push({ x: (Math.random() - 0.5) * 380, y: (Math.random() - 0.5) * 320, ph: Math.random() * 6 });
    setMsg(T('g.plaza.enter'), 7);

    function setMsg(s, d = 4) { msg = s; msgT = d; }
    function leave() { done = true; exitTo = 'subte'; }
    function nearMadre() { return Math.hypot(player.x, player.y) < MADRE_R + 18 && Math.hypot(player.x, player.y) > MADRE_R - 24; }

    function update(dt) {
      t += dt; msgT -= dt; player.walk = 0;
      const sp = 92 * dt; let mvx = 0, mvy = 0;
      if (Input.keys['arrowleft'] || Input.keys['a']) mvx = -1;
      if (Input.keys['arrowright'] || Input.keys['d']) mvx = 1;
      if (Input.keys['arrowup'] || Input.keys['w']) mvy = -1;
      if (Input.keys['arrowdown'] || Input.keys['s']) mvy = 1;
      if (mvx) player.dir = mvx;
      // no entrás a la Pirámide (centro) ni te vas de la plaza (radio máx)
      const nx = player.x + mvx * sp, ny = player.y + mvy * sp;
      const rIn = Math.hypot(nx, ny);
      if (rIn > 26 && rIn < 200) { player.x = nx; player.y = ny; if (mvx || mvy) player.walk = 1; }
      else if (rIn <= 26) { /* rebota en la Pirámide */ }
      else if (rIn >= 200) { player.x = nx * 0.99; player.y = ny * 0.99; }   // borde suave
      for (const m of madres) m.a += m.sp * dt;
      // ¿cerca de qué? (una Madre de la ronda, la boca del subte, un landmark)
      near = null;
      if (Math.hypot(player.x - bocaCatedral.x, player.y - bocaCatedral.y) < 22) near = { kind: 'boca' };
      else if (nearMadre()) near = { kind: 'madre' };
      else for (const L of LANDMARKS) { const p = landmarkPos(L, 1); if (Math.hypot(player.x - p.wx, player.y - p.wy) < 40) { near = { kind: 'landmark', L }; break; } }

      if (Input.keys['escape']) { if (!escHeld) { escHeld = true; leave(); } } else escHeld = false;
      if (Input.keys['e'] || Input.keys['enter']) { if (!eHeld) { eHeld = true; interact(); } } else eHeld = false;

      if (near && near.kind === 'boca') prompt = T('g.plaza.promptSubte');
      else if (near && near.kind === 'madre') prompt = T('g.plaza.promptMadre');
      else if (near && near.kind === 'landmark') prompt = T('g.plaza.promptLandmark', { n: near.L.name });
      else prompt = '';
    }
    function interact() {
      if (near && near.kind === 'boca') { leave(); return; }              // volvés al subte (Catedral)
      if (near && near.kind === 'madre') { madreIdx = (madreIdx + 1) % 3; setMsg(T('g.plaza.madre' + (madreIdx + 1)), 7); return; }
      if (near && near.kind === 'landmark') { setMsg(T('g.plaza.info.' + near.L.id), 7); return; }
      setMsg(T('g.plaza.hint'), 3);
    }
    // posición "mundo" de un landmark (en el anillo exterior, según su lado)
    function landmarkPos(L, scale) {
      const R = 168 * (scale || 1);
      const ang = { E: 0, N: Math.PI / 2, O: Math.PI, S: -Math.PI / 2 }[L.side] || 0;
      return { wx: Math.cos(ang) * R, wy: Math.sin(ang) * R, ang };
    }

    function draw(g, VW, VH) {
      const cx = VW / 2, cy = VH / 2 + 10, SC = Math.min(VW, VH) / 440;   // escala plaza→pantalla
      const W2S = (wx, wy) => ({ x: cx + wx * SC, y: cy + wy * SC });     // mundo→pantalla (y+ = abajo)
      // fondo: cielo/asfalto alrededor + la PLAZA circular de adoquines
      g.fillStyle = '#0c0f16'; g.fillRect(0, 0, VW, VH);
      g.fillStyle = '#2e2b25'; g.beginPath(); g.arc(cx, cy, 205 * SC, 0, Math.PI * 2); g.fill();          // plaza
      g.strokeStyle = '#4a453b'; g.lineWidth = 2; g.stroke();
      // anillos de adoquín + los CANTEROS (césped) en cuartos
      g.strokeStyle = 'rgba(120,110,90,0.25)'; g.lineWidth = 1;
      for (const rr of [70, 110, 150, 185]) { g.beginPath(); g.arc(cx, cy, rr * SC, 0, Math.PI * 2); g.stroke(); }
      g.fillStyle = '#2f4a2e'; for (let q = 0; q < 4; q++) { const a0 = q * Math.PI / 2 + 0.18; g.beginPath(); g.moveTo(cx, cy);
        g.arc(cx, cy, 150 * SC, a0, a0 + Math.PI / 2 - 0.36); g.closePath(); g.globalAlpha = 0.5; g.fill(); g.globalAlpha = 1; }
      // el camino en anillo (la RONDA de las Madres, marcada en el piso)
      g.strokeStyle = 'rgba(255,255,255,0.10)'; g.lineWidth = 14 * SC; g.beginPath(); g.arc(cx, cy, MADRE_R * SC, 0, Math.PI * 2); g.stroke();
      // palomas
      for (const p of palomas) { const s = W2S(p.x, p.y); g.fillStyle = '#9aa0a8'; g.fillRect(s.x - 2, s.y - 1 - Math.abs(Math.sin(t * 3 + p.ph)) * 3, 4, 3); }
      // LANDMARKS (edificios en el borde, orientación real)
      for (const L of LANDMARKS) { const wp = landmarkPos(L, 1), s = W2S(wp.wx, wp.wy), hov = near && near.kind === 'landmark' && near.L === L;
        drawLandmark(g, s.x, s.y, L, hov, t); }
      // PIRÁMIDE DE MAYO (centro)
      { const s = W2S(0, 0), pw = 30 * SC, ph = 40 * SC;
        g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(s.x, s.y + ph * 0.5, pw * 0.9, 6 * SC, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#e8e4d8'; g.beginPath(); g.moveTo(s.x - pw / 2, s.y + ph / 2); g.lineTo(s.x - pw / 6, s.y - ph / 2); g.lineTo(s.x, s.y - ph / 2 - 8 * SC); g.lineTo(s.x + pw / 6, s.y - ph / 2); g.lineTo(s.x + pw / 2, s.y + ph / 2); g.closePath(); g.fill();
        g.fillStyle = 'rgba(0,0,0,0.14)'; g.beginPath(); g.moveTo(s.x, s.y - ph / 2 - 8 * SC); g.lineTo(s.x + pw / 6, s.y - ph / 2); g.lineTo(s.x + pw / 2, s.y + ph / 2); g.lineTo(s.x, s.y + ph / 2); g.closePath(); g.fill();
        g.fillStyle = '#74acdf'; g.beginPath(); g.arc(s.x, s.y - ph / 2 - 10 * SC, 3 * SC, 0, Math.PI * 2); g.fill(); }   // la estatua/gorro frigio azulceleste
      // las MADRES en RONDA (pañuelo blanco)
      for (const m of madres) { const s = W2S(Math.cos(m.a) * MADRE_R, Math.sin(m.a) * MADRE_R);
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(s.x, s.y + 8 * SC, 5 * SC, 2 * SC, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#4a4048'; g.fillRect(s.x - 3 * SC, s.y - 2 * SC, 6 * SC, 10 * SC);   // cuerpo
        g.fillStyle = '#d8c8b0'; g.beginPath(); g.arc(s.x, s.y - 4 * SC, 3.4 * SC, 0, Math.PI * 2); g.fill();   // cabeza
        g.fillStyle = '#f4f4f4'; g.beginPath(); g.arc(s.x, s.y - 5.4 * SC, 3.8 * SC, Math.PI, 0); g.fill(); g.fillRect(s.x - 3.8 * SC, s.y - 5.4 * SC, 7.6 * SC, 2.4 * SC); }   // PAÑUELO BLANCO
      // la BOCA del subte (Catedral)
      { const s = W2S(bocaCatedral.x, bocaCatedral.y), hov = near && near.kind === 'boca';
        g.fillStyle = '#141821'; g.fillRect(s.x - 14, s.y - 4, 28, 20); g.fillStyle = '#0a0d13'; g.fillRect(s.x - 10, s.y, 20, 14);
        for (let i = 0; i < 3; i++) { g.fillStyle = i % 2 ? '#161b24' : '#1e2530'; g.fillRect(s.x - 10, s.y + 2 + i * 4, 20, 3); }
        g.fillStyle = '#00a54f'; g.beginPath(); g.arc(s.x - 9, s.y - 11, 7, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; g.font = 'bold 9px monospace'; g.textAlign = 'center'; g.fillText('D', s.x - 9, s.y - 8);
        g.fillStyle = hov ? '#7ff3ff' : '#8fd4e0'; g.font = 'bold 8px monospace'; g.fillText('🚇', s.x + 8, s.y - 8); }
      // VOS
      { const s = W2S(player.x, player.y), sw = Math.sin(player.walk) * 2;
        g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(s.x, s.y + 9, 8, 3, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#3a3340'; g.fillRect(s.x - 4, s.y + 2, 3, 9 + sw); g.fillRect(s.x + 1, s.y + 2, 3, 9 - sw);
        g.fillStyle = '#4a3b2a'; g.fillRect(s.x - 7, s.y - 6, 14, 12); g.fillStyle = '#2a2018'; g.beginPath(); g.arc(s.x, s.y - 10, 6, 0, Math.PI * 2); g.fill();
        g.save(); g.translate(s.x + 5, s.y - 1); g.rotate(0.55); g.fillStyle = '#7a3b12'; g.fillRect(-3, -10, 6, 18); g.restore(); }   // la viola
      // header + prompt + msg
      g.fillStyle = '#0a0a0e'; g.fillRect(0, 0, VW, 26);
      g.fillStyle = '#ffd54f'; g.font = 'bold 12px monospace'; g.textAlign = 'left'; g.fillText('🏛️ ' + T('g.plaza.title'), 10, 18);
      g.textAlign = 'right'; g.fillStyle = '#9be8a0'; g.font = '10px monospace'; g.fillText('WASD · [E] · Esc ' + T('g.plaza.back'), VW - 10, 18);
      let bottom = VH;
      if (msgT > 0 && msg) { g.font = '12px monospace'; g.textAlign = 'center';
        const words = msg.split(' '), lines = []; let cur = '';
        for (const wd of words) { const cand = cur ? cur + ' ' + wd : wd; if (((g.measureText(cand) || {}).width || 0) > VW - 44 && cur) { lines.push(cur); cur = wd; } else cur = cand; }
        if (cur) lines.push(cur); const lh = 15, boxH = lines.length * lh + 8;
        g.fillStyle = 'rgba(0,0,0,0.85)'; g.fillRect(0, VH - boxH, VW, boxH); g.fillStyle = '#ffe2c0'; lines.forEach((ln, k) => g.fillText(ln, VW / 2, VH - boxH + 14 + k * lh)); bottom = VH - boxH; }
      if (prompt) { g.font = 'bold 12px monospace'; g.textAlign = 'center'; g.fillStyle = 'rgba(0,0,0,0.78)'; g.fillRect(0, bottom - 22, VW, 22); g.fillStyle = '#ffd54f'; g.fillText(prompt, VW / 2, bottom - 7); }
    }
    // dibuja un landmark (edificio) visto de arriba, con su fachada característica
    function drawLandmark(g, x, y, L, hov, t) {
      g.save();
      const w = 64, h = 40;
      g.fillStyle = L.col; g.fillRect(x - w / 2, y - h / 2, w, h);
      g.fillStyle = L.roof; g.fillRect(x - w / 2, y - h / 2, w, 8);
      if (L.id === 'rosada') { g.fillStyle = '#b85a70'; for (let i = 0; i < 4; i++) g.fillRect(x - w / 2 + 6 + i * 14, y - h / 2 + 12, 8, h - 18); }   // balcones/ventanas
      else if (L.id === 'catedral') { g.fillStyle = '#c8c0ac'; for (let i = 0; i < 5; i++) g.fillRect(x - w / 2 + 6 + i * 12, y - h / 2 + 10, 6, h - 16);   // 12 columnas (fila)
        g.fillStyle = '#f2c94c'; g.beginPath(); g.arc(x, y + h / 2 - 4, 3, 0, Math.PI * 2); g.fill(); }   // la llama votiva
      else if (L.id === 'cabildo') { g.fillStyle = '#d4cdb8'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(x - w / 2 + 8 + i * 12, y + h / 2 - 6, 5, Math.PI, 0); g.fill(); } g.fillStyle = '#8a7a52'; g.fillRect(x - 4, y - h / 2 - 10, 8, 12); }   // arcos + torre
      g.strokeStyle = hov ? '#ffd54f' : 'rgba(0,0,0,0.4)'; g.lineWidth = hov ? 2 : 1; g.strokeRect(x - w / 2, y - h / 2, w, h);
      g.fillStyle = hov ? '#ffe9b0' : '#cfe0f0'; g.font = (hov ? 'bold ' : '') + '9px monospace'; g.textAlign = 'center'; g.fillText(L.name, x, y - h / 2 - 4);
      g.restore();
    }

    return {
      update, draw, get done() { return done; }, get exitTo() { return exitTo; },
      __leave: () => { player.x = bocaCatedral.x; player.y = bocaCatedral.y; interact(); return done; },
    };
  }
  return { create };
})();
if (typeof window !== 'undefined') window.Plaza = Plaza;
if (typeof module !== 'undefined') module.exports = Plaza;
