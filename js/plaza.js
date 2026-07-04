// plaza.js — SUB-MODO "PLAZA DE MAYO" (specs/subte.md §10). Llegás en subte a Catedral (Línea D) → salís a la
// plaza histórica, VISTA DE ARRIBA en CÍRCULO. En el CENTRO la Pirámide de Mayo (= el DISPOSITIVO ANTI-IA); las
// MADRES DE PLAZA DE MAYO marchan en RONDA a su alrededor (pañuelos blancos). Landmarks reales: Casa Rosada (E,
// rosa, control del satélite tomado), Catedral (N, la boca del subte + la TUMBA DE SAN MARTÍN), Cabildo (O).
//
// OBJETIVO DEL NIVEL 2 (arco sanmartiniano): entrás a la Catedral → la TUMBA DE SAN MARTÍN → tomás el CHIP AI DEL
// LIBERTADOR → lo llevás a la PIRÁMIDE DE MAYO → armás el dispositivo → emite la señal a los satélites manejados por
// la IA → arranca el "proceso sanmartiniano de liberación mundial": San Martín nos libera del yugo de la IA. Aislado:
// al salir (done) el juego principal queda EXACTO.
const Plaza = (() => {
  const T = (k, p) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(k, p) : k;

  function create(opts) {
    opts = opts || {};
    // el jugador camina en coordenadas de plaza (unidades ~ "metros"), la cámara es fija centrada
    const player = { x: 0, y: 150, r: 9, dir: 1, walk: 0 };   // aparece por la boca de la Catedral (norte-abajo)
    let done = false, exitTo = null, t = 0, msg = '', msgT = 0, prompt = '', escHeld = false, eHeld = false, near = null, madreIdx = -1;
    // interiores: null | 'rosada' (control del satélite, lore/enemigo) | 'tumba' (San Martín → chip del Libertador)
    let inside = null, ip = { x: 0, y: 130, dir: 1, walk: 0 }, iNear = null, termIdx = -1;
    const alreadyWon = !!opts.won2;
    let hasChip = alreadyWon;         // ¿tenés el CHIP AI DEL LIBERTADOR? (de la tumba). Requisito para armar la Pirámide.
    let armed = false, armT = 0, signalFx = 0, chipFx = 0;   // dispositivo de la Pirámide: armado → señal → victoria
    let arming = false, charge = 0;                          // FORCEJEO: sostenés [E] → la señal sanmartiniana vence a la IA
    // landmarks (dir en grados desde el centro; el render los ancla a los bordes de la plaza)
    const LANDMARKS = [
      { id: 'rosada',   name: 'Casa Rosada',  side: 'E', col: '#e39aa8', roof: '#c26a7e', label: '🏛️ Casa de Gobierno' },
      { id: 'catedral', name: 'Catedral',     side: 'N', col: '#d8d2c4', roof: '#b7ae9a', label: '⛪ Catedral (San Martín) · 🚇 subte' },
      { id: 'cabildo',  name: 'Cabildo',      side: 'O', col: '#eae6da', roof: '#cbc4b2', label: '🏛️ Cabildo (arcos)' },
    ];
    const bocaCatedral = { x: 0, y: 175 };         // la boca del subte (Catedral), abajo (norte del render)
    const MADRE_R = 84;                            // radio de la ronda de las Madres alrededor de la Pirámide
    const madres = []; for (let i = 0; i < 12; i++) madres.push({ a: (i / 12) * Math.PI * 2, sp: 0.18 });
    const palomas = []; for (let i = 0; i < 16; i++) palomas.push({ x: (Math.random() - 0.5) * 380, y: (Math.random() - 0.5) * 320, ph: Math.random() * 6 });
    setMsg(T('g.plaza.enter'), 8);

    function setMsg(s, d = 4) { msg = s; msgT = d; }
    function leave() { done = true; exitTo = 'subte'; }
    function nearMadre() { return Math.hypot(player.x, player.y) < MADRE_R + 18 && Math.hypot(player.x, player.y) > MADRE_R - 24; }

    function update(dt) {
      t += dt; msgT -= dt;
      if (inside) return updateInside(dt);
      // SECUENCIA DE VICTORIA: armaste el dispositivo → la señal sube a los satélites → salís con la victoria
      if (armed) {
        prompt = ''; signalFx = Math.min(1, signalFx + dt * 1.2); armT -= dt;
        for (const m of madres) m.a += m.sp * dt;
        if (armT <= 0) { exitTo = 'win2'; done = true; }
        return;
      }
      player.walk = 0;
      const sp = 92 * dt; let mvx = 0, mvy = 0;
      if (Input.keys['arrowleft'] || Input.keys['a']) mvx = -1;
      if (Input.keys['arrowright'] || Input.keys['d']) mvx = 1;
      if (Input.keys['arrowup'] || Input.keys['w']) mvy = -1;
      if (Input.keys['arrowdown'] || Input.keys['s']) mvy = 1;
      if (mvx) player.dir = mvx;
      // no entrás a la Pirámide (centro) ni te vas de la plaza (radio máx)
      const nx = player.x + mvx * sp, ny = player.y + mvy * sp;
      const rIn = Math.hypot(nx, ny);
      if (rIn > 30 && rIn < 200) { player.x = nx; player.y = ny; if (mvx || mvy) player.walk = 1; }
      else if (rIn <= 30) { /* rebota en la Pirámide */ }
      else if (rIn >= 200) { player.x = nx * 0.99; player.y = ny * 0.99; }   // borde suave
      for (const m of madres) m.a += m.sp * dt;
      // ¿cerca de qué? (la Pirámide/dispositivo, la boca del subte, una Madre, un landmark)
      near = null;
      if (Math.hypot(player.x, player.y) < 44) near = { kind: 'piramide' };
      else if (Math.hypot(player.x - bocaCatedral.x, player.y - bocaCatedral.y) < 22) near = { kind: 'boca' };
      else if (nearMadre()) near = { kind: 'madre' };
      else for (const L of LANDMARKS) { const p = landmarkPos(L, 1); if (Math.hypot(player.x - p.wx, player.y - p.wy) < 40) { near = { kind: 'landmark', L }; break; } }

      if (Input.keys['escape']) { if (!escHeld) { escHeld = true; leave(); } } else escHeld = false;
      // ARMAR la Pirámide: con el chip, SOSTENÉS [E] → la señal de San Martín (celeste) gana terreno; la IA resiste
      // (más fuerte cerca del final). Si soltás, la IA recupera. Un toque solo NO alcanza → clímax con peso.
      if (near && near.kind === 'piramide' && hasChip && !armed && !alreadyWon) {
        if (Input.keys['e'] || Input.keys['enter']) {
          arming = true; eHeld = true;
          const resist = 0.16 + charge * 0.14;
          charge = Math.min(1, charge + (0.55 - resist) * dt);
          signalFx = Math.max(signalFx, charge);
          if (charge >= 1) { armed = true; armT = 3.6; try { localStorage.setItem('ts_nivel2_win', '1'); } catch (e) {} if (typeof Sfx !== 'undefined' && Sfx.win) Sfx.win(); setMsg(T('g.plaza.arming'), 10); }
          prompt = T('g.plaza.arming2');
          return;
        }
        arming = false;
        if (charge > 0) charge = Math.max(0, charge - dt * 0.7);   // soltaste → la IA recupera terreno
      }
      if (Input.keys['e'] || Input.keys['enter']) { if (!eHeld) { eHeld = true; interact(); } } else eHeld = false;

      if (near && near.kind === 'piramide') prompt = alreadyWon ? '' : hasChip ? T('g.plaza.promptArm') : T('g.plaza.promptPiramide');
      else if (near && near.kind === 'boca') prompt = T('g.plaza.promptSubte');
      else if (near && near.kind === 'madre') prompt = T('g.plaza.promptMadre');
      else if (near && near.kind === 'landmark') prompt = T('g.plaza.promptLandmark', { n: near.L.name });
      else prompt = '';
    }
    function interact() {
      if (near && near.kind === 'piramide') {         // el DISPOSITIVO ANTI-IA (el armado real = sostener [E], en update)
        if (armed || alreadyWon) { setMsg(T('g.plaza.armedDone'), 6); return; }
        if (!hasChip) { setMsg(T('g.plaza.needChip'), 9); return; }
        setMsg(T('g.plaza.armStart'), 5);   // tenés el chip: te dice que SOSTENGAS [E]
        return;
      }
      if (near && near.kind === 'boca') { leave(); return; }              // volvés al subte (Catedral)
      if (near && near.kind === 'madre') { madreIdx = (madreIdx + 1) % 3; setMsg(T('g.plaza.madre' + (madreIdx + 1)), 7); return; }
      if (near && near.kind === 'landmark') {
        if (near.L.id === 'catedral') { inside = 'tumba'; ip = { x: 0, y: 130, dir: 1, walk: 0 }; iNear = null; setMsg(T('g.plaza.tumbaEnter'), 8); return; }   // TUMBA DE SAN MARTÍN
        if (near.L.id === 'rosada') { inside = 'rosada'; ip = { x: 0, y: 130, dir: 1, walk: 0 }; iNear = null; setMsg(T('g.plaza.rosadaEnter'), 8); return; }  // control del satélite (lore)
        setMsg(T('g.plaza.info.' + near.L.id), 7); return;
      }
      setMsg(T('g.plaza.hint'), 3);
    }
    // posiciones dentro de los interiores (coords ip: x∈[-150,150], y∈[-70,150], entrás por abajo en y≈130)
    const term = { x: 0, y: -90 };        // Casa Rosada: terminal del satélite al fondo
    const sarco = { x: 0, y: -8 };         // Tumba: el sarcófago de San Martín
    const chipPos = { x: 0, y: -44 };      // Tumba: el CHIP AI DEL LIBERTADOR (sobre el sarcófago, hacia la cabecera)
    function updateInside(dt) {
      chipFx = Math.max(0, chipFx - dt * 3);
      ip.walk = 0;
      const sp = 92 * dt; let mvx = 0, mvy = 0;
      if (Input.keys['arrowleft'] || Input.keys['a']) mvx = -1;
      if (Input.keys['arrowright'] || Input.keys['d']) mvx = 1;
      if (Input.keys['arrowup'] || Input.keys['w']) mvy = -1;
      if (Input.keys['arrowdown'] || Input.keys['s']) mvy = 1;
      if (mvx) ip.dir = mvx;
      const nx = ip.x + mvx * sp, ny = ip.y + mvy * sp;
      if (Math.abs(nx) < 150) ip.x = nx; if (ny > -70 && ny < 150) ip.y = ny; if (mvx || mvy) ip.walk = 1;
      iNear = null;
      if (inside === 'tumba') {
        if (!hasChip && Math.hypot(ip.x - chipPos.x, ip.y - chipPos.y) < 34) iNear = 'chip';
        else if (Math.hypot(ip.x - sarco.x, ip.y - sarco.y) < 52) iNear = 'sarco';
        else if (ip.y > 138) iNear = 'salir';
      } else {  // rosada
        if (Math.hypot(ip.x - term.x, ip.y - term.y) < 42) iNear = 'term';
        else if (ip.y > 138) iNear = 'salir';
      }
      if (Input.keys['escape']) { if (!escHeld) { escHeld = true; inside = null; near = null; } } else escHeld = false;
      if (Input.keys['e'] || Input.keys['enter']) { if (!eHeld) { eHeld = true;
        if (iNear === 'salir') { inside = null; near = null; }
        else if (iNear === 'chip') { hasChip = true; chipFx = 1; setMsg(T('g.plaza.gotChip'), 10); if (typeof Sfx !== 'undefined' && Sfx.pick) Sfx.pick(); try { localStorage.setItem('ts_sanmartin_chip', '1'); } catch (e) {} }
        else if (iNear === 'sarco') { setMsg(T(hasChip ? 'g.plaza.sarcoGot' : 'g.plaza.sarco'), 8); }
        else if (iNear === 'term') { termIdx = (termIdx + 1) % 3; setMsg(T('g.plaza.term' + (termIdx + 1)), 8); }
        else setMsg(T(inside === 'tumba' ? 'g.plaza.tumbaHint' : 'g.plaza.rosadaHint'), 4);
      } } else eHeld = false;
      if (inside === 'tumba') prompt = iNear === 'chip' ? T('g.plaza.promptChip') : iNear === 'sarco' ? T('g.plaza.promptSarco') : iNear === 'salir' ? T('g.plaza.promptSalir') : '';
      else prompt = iNear === 'term' ? T('g.plaza.promptTerm') : iNear === 'salir' ? T('g.plaza.promptSalir') : '';
    }
    // posición "mundo" de un landmark (en el anillo exterior, según su lado)
    function landmarkPos(L, scale) {
      const R = 168 * (scale || 1);
      const ang = { E: 0, N: Math.PI / 2, O: Math.PI, S: -Math.PI / 2 }[L.side] || 0;
      return { wx: Math.cos(ang) * R, wy: Math.sin(ang) * R, ang };
    }

    function draw(g, VW, VH) {
      if (inside) return drawInside(g, VW, VH);
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
      // PIRÁMIDE DE MAYO (centro) = el DISPOSITIVO ANTI-IA
      { const s = W2S(0, 0), pw = 30 * SC, ph = 40 * SC, hov = near && near.kind === 'piramide';
        // el HAZ de la señal sanmartiniana subiendo a los satélites (crece con la carga, estalla al armar)
        if (armed || charge > 0.02) { const beamW = (10 + Math.sin(t * 22) * 4) * SC * (0.5 + signalFx);
          const grd = g.createLinearGradient(s.x, s.y - ph, s.x, 0);
          grd.addColorStop(0, 'rgba(116,172,223,' + (0.55 * signalFx) + ')'); grd.addColorStop(1, 'rgba(116,172,223,0)');
          g.fillStyle = grd; g.fillRect(s.x - beamW, 0, beamW * 2, s.y - ph / 2);
          g.fillStyle = 'rgba(255,255,255,' + (0.5 * signalFx) + ')'; g.beginPath(); g.arc(s.x, s.y - ph / 2 - 10 * SC, (8 + Math.sin(t * 18) * 4) * SC, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(s.x, s.y + ph * 0.5, pw * 0.9, 6 * SC, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#e8e4d8'; g.beginPath(); g.moveTo(s.x - pw / 2, s.y + ph / 2); g.lineTo(s.x - pw / 6, s.y - ph / 2); g.lineTo(s.x, s.y - ph / 2 - 8 * SC); g.lineTo(s.x + pw / 6, s.y - ph / 2); g.lineTo(s.x + pw / 2, s.y + ph / 2); g.closePath(); g.fill();
        g.fillStyle = 'rgba(0,0,0,0.14)'; g.beginPath(); g.moveTo(s.x, s.y - ph / 2 - 8 * SC); g.lineTo(s.x + pw / 6, s.y - ph / 2); g.lineTo(s.x + pw / 2, s.y + ph / 2); g.lineTo(s.x, s.y + ph / 2); g.closePath(); g.fill();
        g.fillStyle = '#74acdf'; g.beginPath(); g.arc(s.x, s.y - ph / 2 - 10 * SC, 3 * SC, 0, Math.PI * 2); g.fill();   // la estatua/gorro frigio azulceleste
        // el CHIP montado en la Pirámide (cuando ya lo tenés / dispositivo listo)
        if (hasChip || alreadyWon) { const cs = 5 * SC, cyy = s.y - 2 * SC; g.fillStyle = armed ? '#7CFC00' : '#3fae5a';
          g.fillRect(s.x - cs, cyy - cs, cs * 2, cs * 2); g.fillStyle = '#0a140a'; g.fillRect(s.x - cs * 0.5, cyy - cs * 0.5, cs, cs);
          g.strokeStyle = '#0a140a'; g.lineWidth = 1; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(s.x + i * cs * 0.7, cyy - cs); g.lineTo(s.x + i * cs * 0.7, cyy - cs - 2); g.stroke(); } }
        if (hov && !armed && !alreadyWon) { g.strokeStyle = hasChip ? '#7CFC00' : '#ffd54f'; g.lineWidth = 2; g.beginPath(); g.arc(s.x, s.y, pw, 0, Math.PI * 2); g.stroke(); } }
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
        if (hasChip && !armed) { g.fillStyle = '#7CFC00'; g.fillRect(s.x - 2, s.y - 2, 4, 4); }   // llevás el chip encima
        g.save(); g.translate(s.x + 5, s.y - 1); g.rotate(0.55); g.fillStyle = '#7a3b12'; g.fillRect(-3, -10, 6, 18); g.restore(); }   // la viola
      // header + prompt + msg
      g.fillStyle = '#0a0a0e'; g.fillRect(0, 0, VW, 26);
      g.fillStyle = '#ffd54f'; g.font = 'bold 12px monospace'; g.textAlign = 'left'; g.fillText('🏛️ ' + T('g.plaza.title'), 10, 18);
      g.textAlign = 'right'; g.fillStyle = '#9be8a0'; g.font = '10px monospace'; g.fillText('WASD · [E] · Esc ' + T('g.plaza.back'), VW - 10, 18);
      // objetivo del Nivel 2 (tracker corto arriba)
      { const obj = armed || alreadyWon ? T('g.plaza.objDone') : hasChip ? T('g.plaza.objArm') : T('g.plaza.objChip');
        g.textAlign = 'center'; g.font = 'bold 10px monospace'; g.fillStyle = 'rgba(0,0,0,0.55)'; const ow = (g.measureText(obj).width || 0) + 16;
        g.fillRect(VW / 2 - ow / 2, 28, ow, 16); g.fillStyle = hasChip ? '#7CFC00' : '#ffd54f'; g.fillText(obj, VW / 2, 39); }
      // FORCEJEO: la barra "señal sanmartiniana vs. IA" mientras cargás (o llena al armar)
      if ((charge > 0.02 || armed) && !alreadyWon) {
        const bw = Math.min(240, VW - 60), bx = VW / 2 - bw / 2, by = 52, fill = armed ? 1 : charge;
        g.textAlign = 'center'; g.font = 'bold 9px monospace'; g.fillStyle = '#ffe9b0'; g.fillText(T('g.plaza.chargeLabel'), VW / 2, by - 3);
        g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(bx - 2, by, bw + 4, 12);
        g.fillStyle = '#5a1f1f'; g.fillRect(bx, by + 2, bw, 8);                                         // el yugo de la IA (rojo)
        if (!armed && arming === false && charge > 0) { g.fillStyle = 'rgba(255,60,60,' + (0.3 + Math.abs(Math.sin(t * 8)) * 0.3) + ')'; g.fillRect(bx + bw * fill, by + 2, Math.min(10, bw * (1 - fill)), 8); }   // la IA reprime al soltar
        g.fillStyle = '#74acdf'; g.fillRect(bx, by + 2, bw * fill, 8);                                  // la señal de San Martín (celeste)
        g.strokeStyle = '#fff'; g.lineWidth = 1; g.strokeRect(bx, by + 2, bw, 8);
      }
      drawFooter(g, VW, VH);
    }
    // INTERIOR: 'tumba' (San Martín + chip) | 'rosada' (control del satélite, lore)
    function drawInside(g, VW, VH) {
      const cx = VW / 2, cy = VH / 2 + 20, SC = Math.min(VW, VH) / 380;
      const W2S = (wx, wy) => ({ x: cx + wx * SC, y: cy + wy * SC });
      if (inside === 'tumba') drawTumba(g, VW, VH, cx, cy, SC, W2S);
      else drawRosada(g, VW, VH, cx, cy, SC, W2S);
      // VOS (común a los dos interiores)
      { const s = W2S(ip.x, ip.y), sw = Math.sin((ip.walk || 0) * 6) * 2;
        g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(s.x, s.y + 9, 8, 3, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#3a3340'; g.fillRect(s.x - 4, s.y + 2, 3, 9 + sw); g.fillRect(s.x + 1, s.y + 2, 3, 9 - sw);
        g.fillStyle = '#4a3b2a'; g.fillRect(s.x - 7, s.y - 6, 14, 12); g.fillStyle = '#2a2018'; g.beginPath(); g.arc(s.x, s.y - 10, 6, 0, Math.PI * 2); g.fill();
        if (hasChip) { g.fillStyle = '#7CFC00'; g.fillRect(s.x - 2, s.y - 2, 4, 4); } }
      // header + footer
      g.fillStyle = '#0a0a0e'; g.fillRect(0, 0, VW, 26); g.fillStyle = '#ffd54f'; g.font = 'bold 12px monospace'; g.textAlign = 'left';
      g.fillText((inside === 'tumba' ? '⚰️ ' : '🏛️ ') + T(inside === 'tumba' ? 'g.plaza.tumbaTitle' : 'g.plaza.rosadaTitle'), 10, 18);
      g.textAlign = 'right'; g.fillStyle = '#9be8a0'; g.font = '10px monospace'; g.fillText('WASD · [E] · Esc', VW - 10, 18);
      drawFooter(g, VW, VH);
    }
    // TUMBA DE SAN MARTÍN (cripta de la Catedral): sarcófago velado por la bandera, 3 granaderos, llama votiva, el CHIP
    function drawTumba(g, VW, VH, cx, cy, SC, W2S) {
      g.fillStyle = '#0d0e13'; g.fillRect(0, 0, VW, VH);
      g.fillStyle = '#1a1822'; g.fillRect(cx - 165 * SC, cy - 130 * SC, 330 * SC, 300 * SC);   // piso de piedra
      for (let i = -3; i <= 3; i++) { g.strokeStyle = 'rgba(255,255,255,0.04)'; g.beginPath(); g.moveTo(cx + i * 42 * SC, cy - 130 * SC); g.lineTo(cx + i * 42 * SC, cy + 170 * SC); g.stroke(); }
      // columnas de la cripta
      for (const cxk of [-135, 135]) for (let k = -2; k <= 2; k++) { const s = W2S(cxk, k * 55); g.fillStyle = '#2a2735'; g.fillRect(s.x - 7, s.y - 20, 14, 40); }
      // la llama votiva (a un costado)
      { const s = W2S(85, -60); g.fillStyle = '#3a2a1a'; g.fillRect(s.x - 4, s.y, 8, 14);
        const fl = 6 + Math.sin(t * 9) * 2; g.fillStyle = '#ffb020'; g.beginPath(); g.ellipse(s.x, s.y - fl / 2, 3, fl, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#ffe08a'; g.beginPath(); g.ellipse(s.x, s.y - fl / 2, 1.4, fl * 0.6, 0, 0, Math.PI * 2); g.fill(); }
      // el SARCÓFAGO (mármol) velado por la bandera argentina
      { const s = W2S(sarco.x, sarco.y), hov = iNear === 'sarco', bw = 52 * SC, bh = 30 * SC;
        g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.ellipse(s.x, s.y + bh * 0.6, bw * 0.7, 6 * SC, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#d9d4cc'; g.fillRect(s.x - bw / 2, s.y - bh / 2, bw, bh);
        g.fillStyle = '#c3bdb2'; g.fillRect(s.x - bw / 2, s.y - bh / 2, bw, 5 * SC);
        // bandera celeste-blanca-celeste sobre la tapa
        g.fillStyle = '#74acdf'; g.fillRect(s.x - bw / 2 + 3, s.y - bh / 2 + 6 * SC, bw - 6, 5 * SC);
        g.fillStyle = '#f4f4f4'; g.fillRect(s.x - bw / 2 + 3, s.y - bh / 2 + 11 * SC, bw - 6, 5 * SC);
        g.fillStyle = '#74acdf'; g.fillRect(s.x - bw / 2 + 3, s.y - bh / 2 + 16 * SC, bw - 6, 5 * SC);
        g.fillStyle = '#f2c94c'; g.beginPath(); g.arc(s.x, s.y - bh / 2 + 13.5 * SC, 2.6 * SC, 0, Math.PI * 2); g.fill();   // el sol
        g.strokeStyle = hov ? '#ffd54f' : 'rgba(0,0,0,0.4)'; g.lineWidth = hov ? 2 : 1; g.strokeRect(s.x - bw / 2, s.y - bh / 2, bw, bh); }
      // 3 GRANADEROS custodiando (uniforme azul, morrión con penacho rojo)
      for (const gx of [-46, 0, 46]) { const gy = gx === 0 ? -58 : -20; const s = W2S(gx, gy);
        g.fillStyle = '#1e2f5a'; g.fillRect(s.x - 4, s.y - 2, 8, 15);            // casaca azul
        g.fillStyle = '#b02020'; g.fillRect(s.x - 4, s.y - 2, 8, 2);            // vivo rojo
        g.fillStyle = '#e0c060'; g.fillRect(s.x - 4, s.y + 3, 1.5, 8); g.fillRect(s.x + 2.5, s.y + 3, 1.5, 8);   // correajes
        g.fillStyle = '#d8c8b0'; g.beginPath(); g.arc(s.x, s.y - 5, 3.2, 0, Math.PI * 2); g.fill();   // cara
        g.fillStyle = '#14161f'; g.fillRect(s.x - 3.5, s.y - 13, 7, 8);          // morrión
        g.fillStyle = '#c02828'; g.fillRect(s.x - 1, s.y - 17, 2, 5);            // penacho rojo
        g.fillStyle = '#7a6a4a'; g.fillRect(s.x + 4, s.y - 12, 1.5, 22); }       // el fusil/lanza
      // el CHIP AI DEL LIBERTADOR (sobre la cabecera del sarcófago) — flota y brilla; desaparece al tomarlo
      if (!hasChip) { const s = W2S(chipPos.x, chipPos.y), hov = iNear === 'chip', fl = Math.sin(t * 3) * 3 * SC, cs = 8 * SC;
        g.fillStyle = 'rgba(63,174,90,' + (0.25 + Math.abs(Math.sin(t * 3)) * 0.25) + ')'; g.beginPath(); g.arc(s.x, s.y - fl, cs * 2.2, 0, Math.PI * 2); g.fill();   // aura
        g.fillStyle = '#3fae5a'; g.fillRect(s.x - cs, s.y - cs - fl, cs * 2, cs * 2);
        g.fillStyle = '#0a140a'; g.fillRect(s.x - cs * 0.5, s.y - cs * 0.5 - fl, cs, cs);   // núcleo
        g.strokeStyle = '#0a140a'; g.lineWidth = 1; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(s.x + i * cs * 0.5, s.y - cs - fl); g.lineTo(s.x + i * cs * 0.5, s.y - cs - 3 - fl); g.stroke();
          g.beginPath(); g.moveTo(s.x + i * cs * 0.5, s.y + cs - fl); g.lineTo(s.x + i * cs * 0.5, s.y + cs + 3 - fl); g.stroke(); }
        if (hov) { g.strokeStyle = '#7CFC00'; g.lineWidth = 2; g.strokeRect(s.x - cs - 3, s.y - cs - 3 - fl, cs * 2 + 6, cs * 2 + 6); } }
      // puerta de SALIDA (abajo, a la plaza)
      { const s = W2S(0, 150); g.fillStyle = '#2a2230'; g.fillRect(s.x - 20, s.y - 4, 40, 16); g.fillStyle = iNear === 'salir' ? '#ffd54f' : '#c8a86a'; g.font = '9px monospace'; g.textAlign = 'center'; g.fillText('▼ ' + T('g.plaza.aLaPlaza'), s.x, s.y + 22); }
    }
    // INTERIOR de la Casa Rosada (Salón Blanco tomado por la IA): el CONTROL DEL SATÉLITE al fondo (lore/enemigo)
    function drawRosada(g, VW, VH, cx, cy, SC, W2S) {
      g.fillStyle = '#12111a'; g.fillRect(0, 0, VW, VH);
      g.fillStyle = '#241b22'; g.fillRect(cx - 170 * SC, cy - 130 * SC, 340 * SC, 300 * SC);
      g.fillStyle = '#3a2430'; g.fillRect(cx - 40 * SC, cy - 130 * SC, 80 * SC, 300 * SC);   // alfombra roja al centro
      for (let i = -3; i <= 3; i++) { g.strokeStyle = 'rgba(255,255,255,0.05)'; g.beginPath(); g.moveTo(cx + i * 40 * SC, cy - 130 * SC); g.lineTo(cx + i * 40 * SC, cy + 170 * SC); g.stroke(); }
      for (const cxk of [-140, 140]) for (let k = -2; k <= 2; k++) { const s = W2S(cxk, k * 55); g.fillStyle = '#4a3a44'; g.fillRect(s.x - 6, s.y - 18, 12, 36); }
      // el CONTROL DEL SATÉLITE al fondo — rojo glitcheado (el enemigo; la señal de la Pirámide es lo que lo voltea)
      { const s = W2S(term.x, term.y), hov = iNear === 'term';
        g.fillStyle = '#0a0d16'; g.fillRect(s.x - 46, s.y - 30, 92, 44);
        for (let i = 0; i < 3; i++) { g.fillStyle = (Math.sin(t * 5 + i) > 0 ? '#ff3040' : '#801822'); g.fillRect(s.x - 40 + i * 30, s.y - 24, 24, 20); }
        g.fillStyle = '#3a4a6a'; g.fillRect(s.x - 46, s.y + 14, 92, 8);
        g.fillStyle = '#8b93a0'; g.fillRect(s.x - 4, s.y - 16, 8, 4); g.fillStyle = '#ff3b3b'; if (Math.sin(t * 6) > 0) { g.beginPath(); g.arc(s.x, s.y - 14, 2, 0, Math.PI * 2); g.fill(); }
        g.strokeStyle = hov ? '#ffd54f' : 'rgba(255,60,80,0.5)'; g.lineWidth = hov ? 2 : 1; g.strokeRect(s.x - 46, s.y - 30, 92, 52);
        g.fillStyle = '#ff8a8a'; g.font = 'bold 9px monospace'; g.textAlign = 'center'; g.fillText('⚡ CONTROL SATÉLITE', s.x, s.y - 36); }
      // 2 chips (guardias)
      for (const gx of [-70, 70]) { const s = W2S(gx, term.y + 10);
        g.fillStyle = '#2a3446'; g.fillRect(s.x - 5, s.y - 2, 10, 14); g.fillStyle = '#8fa8c8'; g.beginPath(); g.arc(s.x, s.y - 5, 4, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ff3040'; g.fillRect(s.x - 2, s.y - 7, 4, 2); }
      // puerta de SALIDA
      { const s = W2S(0, 150); g.fillStyle = '#3a2a22'; g.fillRect(s.x - 20, s.y - 4, 40, 16); g.fillStyle = iNear === 'salir' ? '#ffd54f' : '#c8a86a'; g.font = '9px monospace'; g.textAlign = 'center'; g.fillText('▼ ' + T('g.plaza.aLaPlaza'), s.x, s.y + 22); }
    }
    // caja de mensaje + prompt (compartida por plaza e interiores)
    function drawFooter(g, VW, VH) {
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
      // superficies de test: tomar el chip en la tumba, armar la pirámide, salir
      get _dbg() { return { inside, hasChip, armed, iNear, near: near && near.kind, pz: { x: player.x, y: player.y }, ip: { x: ip.x, y: ip.y } }; },
      __chip: () => { inside = 'tumba'; ip = { x: chipPos.x, y: chipPos.y, dir: 1, walk: 0 }; iNear = 'chip'; hasChip = true; inside = null; return hasChip; },
      __arm: () => { hasChip = true; charge = 1; armed = true; armT = 3.6; return armed; },
      __leave: () => { player.x = bocaCatedral.x; player.y = bocaCatedral.y; near = { kind: 'boca' }; interact(); return done; },
    };
  }
  return { create };
})();
if (typeof window !== 'undefined') window.Plaza = Plaza;
if (typeof module !== 'undefined') module.exports = Plaza;
