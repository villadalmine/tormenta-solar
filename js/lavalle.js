// lavalle.js — SUB-MODO "Calle Lavalle / el piquete" sobre la AVENIDA 9 DE JULIO, VISTA DE ARRIBA-DE FRENTE
// (specs/lavalle.md, Etapa 1.5). Entrás desde ABAJO (venís de Florida) y tenés el corte DE FRENTE sobre la avenida más
// ancha: el OBELISCO grande al fondo, los carriles, y los NATOS cortando la calle — barricada de CUBIERTAS + AUTOS ROTOS
// + reja + BANDERAS (Viva Perón, argentina, Che), tachos al fuego (animados), olla popular, COLECTIVOS y autos PARADOS
// (tránsito cortado) y algún PATRULLERO. Piqueteros de cuerpo entero. Sin combate, cumbia al palo. Volvés caminando abajo.
const Lavalle = (() => {
  const T = (k, p) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(k, p) : k;
  const CS = 30, W = 18, H = 15;

  function create(opts) {
    opts = opts || {};
    const allWon = !!opts.allWon;   // ganaste los 5 mini-juegos → la barricada se abre y podés pasar (fiesta peronista)
    let fiesta = false, fiestaT = 0;
    const map = Array.from({ length: H }, () => new Array(W).fill(0));
    for (let x = 0; x < W; x++) { map[0][x] = 1; map[1][x] = 1; map[2][x] = 1; map[3][x] = 1; }   // arriba: avenida+corte (más lejos) = pared → se ve EL OBELISCO grande
    for (let y = 0; y < H; y++) { map[y][0] = 1; map[y][W - 1] = 1; }
    const pal = { floor: '#222227', floor2: '#27272d', lane: '#c9c08a' };
    const player = { x: 9 * CS, y: (H - 2.5) * CS, r: 11, dir: -1, walk: 0 };
    let exitArmed = false;   // la salida (caminar hacia abajo) se ARMA recién cuando entraste al piquete (subiste) → así entrar con 's' apretada NO te saca al toque

    // --- el corte (barricada) abajo del todo del fondo, así arriba se ve la avenida + el Obelisco ---
    const cars = [{ x: 3.6, y: 3.5, col: '#7a3b2a', tilt: -0.1 }, { x: 14.4, y: 3.6, col: '#3a5a6a', tilt: 0.1 }];
    const tires = [{ x: 6, y: 3.3, n: 4 }, { x: 8, y: 3.5, n: 3 }, { x: 10, y: 3.3, n: 4 }, { x: 12, y: 3.5, n: 3 }, { x: 5, y: 3.6, n: 2 }, { x: 13, y: 3.7, n: 2 }];
    const flags = [{ x: 2.4, y: 2.6, k: 'peron' }, { x: 5.4, y: 2.4, k: 'arg' }, { x: 11.5, y: 2.4, k: 'peron' }, { x: 14.4, y: 2.6, k: 'che' }];
    // COLECTIVOS / AUTOS / PATRULLEROS parados (tránsito cortado): unos lejos (chicos, pasada la reja) y otros a los costados
    const vehs = [
      { x: 6.5, y: 1.4, kind: 'auto', col: '#9aa0a8', sc: 0.62 }, { x: 11.4, y: 1.5, kind: 'bus', col: '#b23b2e', sc: 0.62 },
      { x: 1.9, y: 6.2, kind: 'bus', col: '#2f7a44', sc: 1 }, { x: 16.1, y: 6.6, kind: 'auto', col: '#3a5a8a', sc: 1 },
      { x: 1.9, y: 10, kind: 'police', col: '#eceef2', sc: 1 }, { x: 16.1, y: 10.2, kind: 'police', col: '#eceef2', sc: 1 },
    ];
    const barrels = [{ x: 5, y: 5.5 }, { x: 9, y: 4.7 }, { x: 13, y: 5.5 }, { x: 7, y: 8.5 }, { x: 11.4, y: 8.7 }];
    const olla = { x: 4, y: 7.4 };

    const folks = [
      { x: 9, y: 4.0, col: '#5a2a2a', bandana: '#c0241f', holds: 'stick', name: T('g.lavalle.npc.corta'), line: T('g.lavalle.line.corta') },
      // ABANDERADOS en cada PUNTA (bandera argentina)
      { x: 2.4, y: 6.6, col: '#3a4a6a', holds: 'flag', flagK: 'arg', name: T('g.lavalle.npc.bandera'), line: T('g.lavalle.line.bandera') },
      { x: 15.6, y: 6.7, col: '#4a3a2a', holds: 'flag', flagK: 'arg', name: T('g.lavalle.npc.bandera'), line: T('g.lavalle.line.bandera') },
      // el del bombo + la que baila (vida)
      { x: 5.4, y: 7.9, col: '#2a4a4a', holds: 'bombo', name: T('g.lavalle.npc.bombo'), line: T('g.lavalle.line.bombo') },
      { x: 13.8, y: 8.1, col: '#5a3a3a', dance: true, name: T('g.lavalle.npc.vecina'), line: T('g.lavalle.line.vecina') },
      // TRÍO del frente que interactuás; el del CENTRO es el LINYERA PERONISTA (chat)
      { x: 7, y: 10.6, col: '#2e3a55', hood: '#1c2230', name: T('g.lavalle.npc.encapuchado'), line: T('g.lavalle.line.encapuchado') },
      { x: 9, y: 10.7, col: '#3a2a18', hair: '#241812', linyera: true, chat: true, persona: 'peronista',
        name: T('g.lavalle.npc.peronista'), line: T('g.lavalle.line.peronista') },
      { x: 11, y: 10.6, col: '#3a4a2a', bandana: '#2a2a2a', name: T('g.lavalle.npc.fierro'), line: T('g.lavalle.line.fierro') },
    ];
    // MULTITUD de fondo en TRES HILERAS (profundidad: la de atrás más chica y tenue) → el piquete se siente lleno
    const crowd = []; const ccol = ['#3a4a6a', '#5a3a3a', '#3a5a4a', '#4a3a5a', '#5a4a2a', '#2e4a5a'];
    const CROWD_ROWS = [{ y: 4.35, sc: 0.7, a: 0.6 }, { y: 5.05, sc: 0.85, a: 0.78 }, { y: 5.75, sc: 1.0, a: 0.92 }];
    CROWD_ROWS.forEach((r, ri) => { for (let i = 0; i < 15; i++) crowd.push({ x: 1.9 + i * 1.0, y: r.y + (i % 2) * 0.1, col: ccol[(i + ri) % ccol.length], ph: i * 1.3 + ri * 0.7, sc: r.sc, a: r.a }); });
    // el LIENZO largo "VIVA PERÓN ×N" cruza la hilera de atrás, colgado ALTO (no tapa a nadie)
    const banner = { y: 3.7 };
    let done = false, exitTo = null, t = 0, msg = '', msgT = 0, prompt = '', escHeld = false, near = null, eHeld = false, chatReq = null, peerReq = null, corteReq = false, sogaReq = false, bomboReq = false, ollaReq = false, pancaReq = false;
    setMsg(opts.intro || (allWon ? T('g.lavalle.introOpen') : T('g.lavalle.intro')), opts.intro ? 7 : 6);
    if (typeof Sfx !== 'undefined' && Sfx.setCumbia) Sfx.setCumbia(true);

    function setMsg(s, d = 4) { msg = s; msgT = d; }
    function solid(px, py) { const tx = Math.floor(px / CS), ty = Math.floor(py / CS); if (tx < 0 || ty < 0 || tx >= W || ty >= H) return ty < H; return map[ty] && map[ty][tx] === 1; }
    function freeAt(x, y) { const r = player.r; return !solid(x - r, y - r) && !solid(x + r, y - r) && !solid(x - r, y + r) && !solid(x + r, y + r); }
    const nearTile = (c, d) => Math.hypot(player.x - (c.x + 0.5) * CS, player.y - (c.y + 0.5) * CS) < CS * (d || 1.4);
    function leave() { if (typeof Sfx !== 'undefined' && Sfx.setCumbia) Sfx.setCumbia(false); if (typeof Sfx !== 'undefined' && Sfx.setMarcha) Sfx.setMarcha(false); done = true; exitTo = 'street'; }
    // FIESTA PERONISTA: pasaste el corte → el peronista te toma juramento, arranca la Marcha y todos bailan y morfan chori
    function startFiesta() {
      if (fiesta) return; fiesta = true; fiestaT = 0;
      setMsg(T('g.lavalle.oath'), 9);
      if (typeof Sfx !== 'undefined') { if (Sfx.setCumbia) Sfx.setCumbia(false); if (Sfx.setMarcha) Sfx.setMarcha(true); }
    }

    function update(dt) {
      t += dt; msgT -= dt; if (fiesta) fiestaT += dt;
      if (done) return;
      const sp = 165 * dt; let mvx = 0, mvy = 0;
      if (Input.keys['arrowleft'] || Input.keys['a']) mvx = -1;
      if (Input.keys['arrowright'] || Input.keys['d']) mvx = 1;
      if (Input.keys['arrowup'] || Input.keys['w']) mvy = -1;
      if (Input.keys['arrowdown'] || Input.keys['s']) mvy = 1;
      if (mvx) { if (freeAt(player.x + mvx * sp, player.y)) player.x += mvx * sp; player.dir = mvx; }
      if (mvy) { if (freeAt(player.x, player.y + mvy * sp)) player.y += mvy * sp; }
      player.walk = (mvx || mvy) ? player.walk + dt * 10 : 0;
      // MULTIJUGADOR (espacio 'lavalle'): posteo MI posición (tiles) e interpolo a los peers → los ves caminar
      if (typeof Salon !== 'undefined' && Salon.enabled && Salon.pos && Salon.inBodegon && Salon.inBodegon()) {
        Salon.pos(Math.round(player.x / CS * 10) / 10, mvx || player.dir, undefined, Math.round(player.y / CS * 10) / 10);
        const pm = Salon.getPeers && Salon.getPeers(); const k = Math.min(1, dt * 10);
        if (pm) for (const p of pm.values()) { if (p.rx == null) p.rx = (p.x != null ? p.x : 9); if (p.ry == null) p.ry = (p.y != null ? p.y : 8);
          p.rx += ((p.x != null ? p.x : p.rx) - p.rx) * k; p.ry += ((p.y != null ? p.y : p.ry) - p.ry) * k; }
      }
      if (player.y < (H - 4) * CS) exitArmed = true;                       // subiste al piquete → ya se puede salir por abajo
      if (exitArmed && player.y > (H - 0.6) * CS) { leave(); return; }      // salir caminando hacia abajo (solo si ya entraste)
      if (Input.keys['escape']) { if (!escHeld) { escHeld = true; leave(); return; } } else escHeld = false;
      // ¿hay un JUGADOR ONLINE cerca? (para chat privado por whisper, como en el bodegón)
      let nearPeer = null;
      if (typeof Salon !== 'undefined' && Salon.getPeers && Salon.inBodegon && Salon.inBodegon()) {
        const px = player.x / CS, py = player.y / CS; let bd = 2.0;
        for (const p of Salon.getPeers().values()) { if (p.rx == null || !p.pid) continue; const d = Math.hypot(px - p.rx, py - (p.ry != null ? p.ry : 8)); if (d < bd) { bd = d; nearPeer = p; } }
      }
      near = null; for (const f of folks) if (nearTile(f, 1.5)) { near = f; break; }
      // [E]: PRIORIDAD al jugador online (chat privado) → después el linyera peronista (chat IA). Ambos los consume game.js.
      if (nearPeer) {
        if (Input.keys['e']) { if (!eHeld) { eHeld = true; peerReq = { pid: nearPeer.pid, nick: nearPeer.nick || '' }; } } else eHeld = false;
        prompt = T('g.lavalle.peerChat', { n: nearPeer.nick || '?' });
      } else if (near && near.chat) {
        if (Input.keys['e']) { if (!eHeld) { eHeld = true; chatReq = { name: near.name, persona: near.persona, kind: 'linyera' }; } } else eHeld = false;
        prompt = T('g.lavalle.chatHint', { n: near.name });
      } else if (allWon && !fiesta && player.y < 5 * CS && Math.abs(player.x / CS - 9) < 2 && !near) {
        // ganaste los 5 → el HUECO del corte: pasás y el peronista te toma juramento (fiesta)
        if (Input.keys['e']) { if (!eHeld) { eHeld = true; startFiesta(); } } else eHeld = false;
        prompt = T('g.lavalle.oathHint');
      } else if (player.y < 5 * CS && !near) {
        // arriba, contra el corte → armar el mini-juego co-op "Aguantar el corte"
        if (Input.keys['e']) { if (!eHeld) { eHeld = true; corteReq = true; } } else eHeld = false;
        prompt = T('g.lavalle.corteHint');
      } else if (player.x < 3.5 * CS && player.y > 7 * CS && !near) {
        // abajo-izquierda → "La soga" (tug of war co-op)
        if (Input.keys['e']) { if (!eHeld) { eHeld = true; sogaReq = true; } } else eHeld = false;
        prompt = T('g.lavalle.sogaHint');
      } else if (player.x > (W - 3.5) * CS && player.y > 7 * CS && !near) {
        // abajo-derecha → "Bombo & cumbia" (ritmo co-op)
        if (Input.keys['e']) { if (!eHeld) { eHeld = true; bomboReq = true; } } else eHeld = false;
        prompt = T('g.lavalle.bomboHint');
      } else if (Math.hypot(player.x / CS - 4.5, player.y / CS - 7.9) < 1.6 && !near) {
        // en la OLLA popular → "Reparto de la olla" (reacción co-op)
        if (Input.keys['e']) { if (!eHeld) { eHeld = true; ollaReq = true; } } else eHeld = false;
        prompt = T('g.lavalle.ollaHint');
      } else if (Math.hypot(player.x / CS - 13.5, player.y / CS - 7.9) < 1.6 && !near) {
        // a la derecha → "Pintar la pancarta" (colaborativo)
        if (Input.keys['e']) { if (!eHeld) { eHeld = true; pancaReq = true; } } else eHeld = false;
        prompt = T('g.lavalle.pancaHint');
      } else {
        eHeld = false;
        prompt = near ? (near.name + ': ' + near.line) : (player.y > (H - 2.4) * CS ? T('g.lavalle.exitHint') : '');
      }
    }

    // ───────── helpers de dibujo ─────────
    function fire(ctx, sx, sy, scale, seed) {
      const fl = a => 0.7 + 0.3 * Math.sin(t * 9 + seed + a);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      // charco de LUZ CÁLIDA en el asfalto (el fuego ilumina el piso)
      const gr = ctx.createRadialGradient(sx, sy + 8 * scale, 2, sx, sy + 8 * scale, 36 * scale);
      gr.addColorStop(0, 'rgba(255,140,30,' + (0.30 * fl(0)).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(255,120,20,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(sx, sy + 8 * scale, 36 * scale, 17 * scale, 0, 0, Math.PI * 2); ctx.fill();
      // llamas
      ctx.fillStyle = 'rgba(180,40,0,0.5)'; blob(ctx, sx, sy, 11 * scale * fl(0), 17 * scale * fl(1));
      ctx.fillStyle = 'rgba(232,84,10,0.7)'; blob(ctx, sx, sy, 8 * scale * fl(2), 13 * scale * fl(0.5));
      ctx.fillStyle = 'rgba(255,179,0,0.85)'; blob(ctx, sx, sy + 2 * scale, 5 * scale * fl(1.5), 8 * scale * fl(2.5));
      ctx.fillStyle = 'rgba(255,232,120,0.9)'; blob(ctx, sx, sy + 3 * scale, 2.4 * scale, 4 * scale * fl(3));
      // CHISPAS subiendo
      for (let k = 0; k < 4; k++) { const ph = (t * 0.9 + k * 0.27 + seed) % 1; ctx.globalAlpha = 0.9 * (1 - ph); ctx.fillStyle = (k % 2) ? '#ffd54a' : '#ff8a1a'; ctx.fillRect(sx + Math.sin(t * 3 + k + seed) * 7 * scale, sy - ph * 42 * scale, 1.6 * scale, 1.6 * scale); }
      ctx.restore();
      // humo
      ctx.save(); for (let i = 0; i < 3; i++) { const ph = (t * 0.5 + i * 0.4 + seed) % 1; ctx.globalAlpha = 0.22 * (1 - ph); ctx.fillStyle = '#8a8a92'; ctx.beginPath(); ctx.arc(sx + Math.sin(t + i + seed) * 6 * scale, sy - 16 * scale - ph * 34 * scale, (3 + ph * 7) * scale, 0, Math.PI * 2); ctx.fill(); } ctx.restore();
    }
    function smoke(ctx, sx, sy, seed, n, alpha) {   // humo suelto (autos rotos)
      ctx.save(); for (let i = 0; i < (n || 3); i++) { const ph = (t * 0.35 + i * 0.5 + seed) % 1; ctx.globalAlpha = (alpha || 0.16) * (1 - ph); ctx.fillStyle = '#6a6a72'; ctx.beginPath(); ctx.arc(sx + Math.sin(t * 0.8 + i + seed) * 7, sy - ph * 46, (4 + ph * 9), 0, Math.PI * 2); ctx.fill(); } ctx.restore();
    }
    function blob(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.moveTo(x, y - ry); ctx.quadraticCurveTo(x + rx, y - ry * 0.3, x, y); ctx.quadraticCurveTo(x - rx, y - ry * 0.3, x, y - ry); ctx.fill(); }
    function tireStack(ctx, x, y, n) {
      for (let i = 0; i < n; i++) { const yy = y - i * 9;
        ctx.fillStyle = '#141414'; ctx.beginPath(); ctx.ellipse(x, yy, 14, 9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2a2a2a'; ctx.beginPath(); ctx.ellipse(x, yy - 1, 14, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3a3a3a'; ctx.beginPath(); ctx.ellipse(x, yy - 1.5, 5, 2.6, 0, 0, Math.PI * 2); ctx.fill(); }
    }
    function brokenCar(ctx, x, y, col, tilt) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 18, 30, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-30, 14); ctx.lineTo(-26, -8); ctx.lineTo(26, -8); ctx.lineTo(30, 14); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2a2a2e'; ctx.fillRect(-18, -16, 36, 10); ctx.fillStyle = '#11161c'; ctx.fillRect(-15, -14, 30, 6);
      ctx.strokeStyle = '#6a7078'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-9, -14); ctx.lineTo(-3, -8); ctx.moveTo(2, -14); ctx.lineTo(7, -9); ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-30, 4, 60, 4);
      ctx.fillStyle = '#141414'; ctx.beginPath(); ctx.arc(-20, 16, 5, 0, Math.PI); ctx.arc(20, 16, 5, 0, Math.PI); ctx.fill();
      ctx.restore();
    }
    // vehículo PARADO (vista de arriba, mirando hacia el Obelisco): colectivo / auto / patrullero
    function vehicle(ctx, x, y, kind, col, sc) {
      sc = sc || 1; const w = 19 * sc, h = (kind === 'bus' ? 44 : 28) * sc;
      ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.beginPath(); ctx.ellipse(x, y + h / 2 - 1, w / 2 + 2, 4 * sc, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = col; ctx.fillRect(x - w / 2, y - h / 2, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(x - w / 2, y - h / 2, w, 3 * sc);
      ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(x - w / 2, y - h / 2, 3 * sc, h);
      ctx.fillStyle = '#0e1418'; ctx.fillRect(x - w / 2 + 3 * sc, y - h / 2 + 4 * sc, w - 6 * sc, 6 * sc);   // parabrisas
      ctx.fillRect(x - w / 2 + 3 * sc, y + h / 2 - 10 * sc, w - 6 * sc, 6 * sc);                              // luneta
      if (kind === 'bus') { ctx.fillStyle = '#16222c'; for (let yy = y - h / 2 + 13 * sc; yy < y + h / 2 - 12 * sc; yy += 7 * sc) { ctx.fillRect(x - w / 2 + 1.5 * sc, yy, 3 * sc, 5 * sc); ctx.fillRect(x + w / 2 - 4.5 * sc, yy, 3 * sc, 5 * sc); }
        ctx.fillStyle = '#1a1a1a'; ctx.fillRect(x - w / 2, y - 1, w, 3 * sc); }
      if (kind === 'police') { ctx.fillStyle = '#1f4fa0'; ctx.fillRect(x - w / 2, y - 1, w, 4 * sc);
        ctx.fillStyle = '#d11'; ctx.fillRect(x - 5 * sc, y - h / 2 - 2.5 * sc, 5 * sc, 3 * sc); ctx.fillStyle = '#1f6fff'; ctx.fillRect(x, y - h / 2 - 2.5 * sc, 5 * sc, 3 * sc); }   // barra de luces
      ctx.fillStyle = '#ffe9a0'; ctx.fillRect(x - w / 2 + 2 * sc, y - h / 2, 3 * sc, 2 * sc); ctx.fillRect(x + w / 2 - 5 * sc, y - h / 2, 3 * sc, 2 * sc);   // faros
      ctx.fillStyle = '#7a1010'; ctx.fillRect(x - w / 2 + 2 * sc, y + h / 2 - 2 * sc, 3 * sc, 2 * sc); ctx.fillRect(x + w / 2 - 5 * sc, y + h / 2 - 2 * sc, 3 * sc, 2 * sc);
    }
    function drawFlag(ctx, x, y, k) {
      ctx.strokeStyle = '#6d4c2f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y + 20); ctx.lineTo(x, y - 20); ctx.stroke();
      const fw = 30, fh = 20, ox = x + 1, oy = y - 20, w0 = Math.sin(t * 4 + x) * 2;
      if (k === 'peron') { ctx.fillStyle = '#f3ead8'; ctx.fillRect(ox, oy, fw, fh); ctx.fillStyle = '#1f4fa0'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center'; ctx.fillText('VIVA', ox + fw / 2, oy + 9); ctx.fillText('PERÓN', ox + fw / 2, oy + 17); }
      else if (k === 'arg') { ctx.fillStyle = '#74acdf'; ctx.fillRect(ox, oy + w0, fw, fh / 3); ctx.fillStyle = '#fff'; ctx.fillRect(ox, oy + fh / 3 + w0, fw, fh / 3); ctx.fillStyle = '#74acdf'; ctx.fillRect(ox, oy + 2 * fh / 3 + w0, fw, fh / 3); ctx.fillStyle = '#f6b40e'; ctx.beginPath(); ctx.arc(ox + fw / 2, oy + fh / 2 + w0, 3.2, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.fillStyle = '#c0241f'; ctx.fillRect(ox, oy, fw - 4, fh); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(ox + 13, oy + 9, 6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#c0241f'; ctx.beginPath(); ctx.arc(ox + 14, oy + 10, 3.5, 0, Math.PI * 2); ctx.fill(); }
    }
    function piquetero(ctx, x, y, o, talk, hl) {
      o = o || {}; const beat = Math.abs(Math.sin(t * 3.3 + x * 0.5));   // pulso de cumbia: TODOS rebotan un poco
      const sw = o.dance ? Math.sin(t * 6 + x) * 3 : -beat * 1.4;
      ctx.fillStyle = 'rgba(0,0,0,0.30)'; ctx.beginPath(); ctx.ellipse(x, y + 17, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
      if (hl) { ctx.strokeStyle = '#ffd54a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y + 17, 13, 5, 0, 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = '#202a3a'; ctx.fillRect(x - 5, y + 5, 4, 11); ctx.fillRect(x + 1, y + 5, 4, 11);
      ctx.fillStyle = '#101216'; ctx.fillRect(x - 6, y + 15, 5, 3); ctx.fillRect(x + 1, y + 15, 5, 3);
      ctx.fillStyle = o.col || '#3a4a6a'; ctx.fillRect(x - 7, y - 8 + sw, 14, 14);
      ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(x - 7, y - 8 + sw, 4, 14);
      ctx.fillStyle = o.col || '#3a4a6a'; ctx.fillRect(x - 9, y - 7 + sw, 3, 11); ctx.fillRect(x + 6, y - 7 + sw, 3, 11);
      ctx.fillStyle = '#d9a878'; ctx.fillRect(x - 9, y + 3 + sw, 3, 2); ctx.fillRect(x + 6, y + 3 + sw, 3, 2);
      ctx.fillStyle = '#d9a878'; ctx.beginPath(); ctx.arc(x, y - 13 + sw, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = o.hair || '#1c1410'; ctx.beginPath(); ctx.arc(x, y - 15 + sw, 5, Math.PI, 0); ctx.fill();
      if (o.linyera) {   // el linyera peronista: melena caída + barba
        ctx.fillStyle = o.hair || '#241812'; ctx.fillRect(x - 6, y - 15 + sw, 3, 9); ctx.fillRect(x + 3, y - 15 + sw, 3, 9);
        ctx.beginPath(); ctx.arc(x, y - 10 + sw, 4, 0, Math.PI); ctx.fill(); }
      if (o.bandana) { ctx.fillStyle = o.bandana; ctx.fillRect(x - 5, y - 13 + sw, 10, 4); }
      if (o.hood) { ctx.fillStyle = o.hood; ctx.beginPath(); ctx.arc(x, y - 14 + sw, 6.5, Math.PI * 0.85, Math.PI * 2.15); ctx.fill(); }
      if (o.holds === 'stick') { ctx.strokeStyle = '#6d4c2f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 8, y + 3 + sw); ctx.lineTo(x + 11, y - 18); ctx.stroke(); }
      if (o.holds === 'bombo') { const r0 = 8 + beat * 1.3;   // el bombo LATE y el palo GOLPEA en el pulso
        ctx.fillStyle = '#c0241f'; ctx.beginPath(); ctx.arc(x + 11, y + sw, r0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#f0f0f0'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = beat > 0.85 ? '#fff' : '#e2e2e2'; ctx.beginPath(); ctx.arc(x + 11, y + sw, r0 - 3, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 5, y - 7 + sw); ctx.lineTo(x + 12, y + sw - 9 + beat * 9); ctx.stroke(); }
      if (o.holds === 'flag') drawFlag(ctx, x + 11, y - 4 + sw, o.flagK || 'arg');
      if (talk) bubble(ctx, x, y - 22 + sw, talk);
    }
    function carpo(ctx, x, y) {
      const sw = Math.sin(player.walk) * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.beginPath(); ctx.ellipse(x, y + 17, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3a3340'; ctx.fillRect(x - 5, y + 5, 4, 11 + sw); ctx.fillRect(x + 1, y + 5, 4, 11 - sw);
      ctx.fillStyle = '#15110f'; ctx.fillRect(x - 6, y + 15 + sw, 5, 3); ctx.fillRect(x + 1, y + 15 - sw, 5, 3);
      ctx.fillStyle = '#4a3b2a'; ctx.fillRect(x - 8, y - 8, 16, 15); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x - 8, y - 8, 4, 15);
      ctx.save(); ctx.translate(x + 6, y - 2); ctx.rotate(0.55); ctx.fillStyle = '#7a3b12'; ctx.fillRect(-3.5, -12, 7, 22); ctx.fillStyle = '#d8a24a'; ctx.fillRect(-1, -12, 2, 22); ctx.restore();
      ctx.fillStyle = '#2a2018'; ctx.beginPath(); ctx.arc(x, y - 13, 7, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#241b14'; ctx.fillRect(x - 7, y - 12, 14, 9);
    }
    function smallFolk(ctx, x, y, col, ph, sc) {   // figura chica de la multitud (rebota a la cumbia); sc = escala por hilera
      sc = sc || 1; const b = -Math.abs(Math.sin(t * 3.3 + ph)) * 1.2 * sc;
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, y + 6 * sc, 5 * sc, 1.8 * sc, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = col; ctx.fillRect(x - 4 * sc, y - 5 * sc + b, 8 * sc, 9 * sc);
      ctx.fillStyle = '#c99a70'; ctx.beginPath(); ctx.arc(x, y - 8 * sc + b, 3.4 * sc, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1c1410'; ctx.beginPath(); ctx.arc(x, y - 9.5 * sc + b, 3.4 * sc, Math.PI, 0); ctx.fill();
    }
    // el LIENZO largo "VIVA PERÓN ×N" colgado ALTO sobre la hilera de atrás (entre dos varas, no tapa a nadie)
    function longBanner(ctx, TX2, TY2) {
      const by = TY2(banner.y), bx0 = TX2(1.2), bx1 = TX2(W - 1.2), bw = bx1 - bx0;
      ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(bx0, by + 18); ctx.lineTo(bx0, by - 6); ctx.moveTo(bx1, by + 18); ctx.lineTo(bx1, by - 6); ctx.stroke();
      const wob = Math.sin(t * 2.2) * 1.5;
      ctx.fillStyle = '#f3ead8'; ctx.fillRect(bx0, by - 4 + wob, bw, 15);
      ctx.strokeStyle = '#cdbf9f'; ctx.lineWidth = 1; ctx.strokeRect(bx0, by - 4 + wob, bw, 15);
      ctx.fillStyle = '#b3141a'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const step = 96; for (let x = bx0 + step / 2; x < bx1; x += step) ctx.fillText('VIVA PERÓN', x, by + 4 + wob);
      ctx.textBaseline = 'alphabetic';
    }
    function bubble(ctx, x, y, txt) { ctx.font = '9px monospace'; const tw = Math.min(180, ctx.measureText(txt).width + 10);
      ctx.fillStyle = 'rgba(15,12,8,0.92)'; ctx.fillRect(x - tw / 2, y - 12, tw, 13);
      ctx.fillStyle = '#ffe2a8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x, y - 5); ctx.textBaseline = 'alphabetic'; }

    function draw(ctx, VW, VH) {
      const ox = (VW - W * CS) / 2, oy = 30, TX2 = tx => ox + tx * CS, TY2 = ty => oy + ty * CS;
      const cutY = TY2(3.6);   // la línea del corte
      ctx.fillStyle = '#0b0b11'; ctx.fillRect(0, 0, VW, VH);   // LIMPIAR TODO (si no, se cuela la calle en los márgenes)
      // skyline BAJO y lejano (downtown detrás) — que el Obelisco DOMINE; nada de letterbox
      ctx.fillStyle = '#14141c'; for (let bx = 0; bx < VW; bx += 44) { const bh = 12 + ((bx * 7) % 20); ctx.fillRect(bx, oy + 22 - bh, 38, bh); }
      // cielo de la avenida (noche, leve resplandor) — todo el ancho
      const sky = ctx.createLinearGradient(0, oy, 0, oy + 46); sky.addColorStop(0, '#1a1622'); sky.addColorStop(1, '#2a2026');
      ctx.fillStyle = sky; ctx.fillRect(0, oy, VW, 46);
      // ASFALTO de la 9 DE JULIO — PLANA y ANCHA, TODO el ancho, de la plaza hacia abajo
      for (let py = oy + 46; py < VH; py += CS) for (let px = 0; px < VW; px += CS) { ctx.fillStyle = ((Math.floor(px / CS) + Math.floor(py / CS)) % 2) ? pal.floor : pal.floor2; ctx.fillRect(px, py, CS, Math.min(CS, VH - py)); }
      // CARRILES: muchas líneas blancas PARALELAS y verticales (la avenida más ancha del mundo) — NADA de líneas que convergen
      ctx.strokeStyle = pal.lane; ctx.lineWidth = 2; ctx.setLineDash([16, 13]);
      for (let lx = 56; lx < VW - 30; lx += 60) { ctx.beginPath(); ctx.moveTo(lx, oy + 48); ctx.lineTo(lx, VH); ctx.stroke(); }
      ctx.setLineDash([]);
      // jacarandás a los COSTADOS (en los canteros laterales, fuera del paso) — la 9 de Julio tiene árboles
      for (const sx of [62, VW - 62]) for (const ty of [4.2, 8, 11.8]) { const ty2 = TY2(ty); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(sx, ty2 + 10, 11, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#16301a'; ctx.beginPath(); ctx.arc(sx, ty2, 13, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#22481f'; ctx.beginPath(); ctx.arc(sx - 5, ty2 - 4, 8, 0, Math.PI * 2); ctx.arc(sx + 6, ty2 - 1, 7, 0, Math.PI * 2); ctx.fill(); }
      // PLAZA DE LA REPÚBLICA (piso claro) + EL OBELISCO grande parado en ella, centrado en TODA la pantalla
      ctx.fillStyle = '#33312d'; ctx.beginPath(); ctx.ellipse(VW / 2, oy + 46, 132, 19, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3b3934'; ctx.beginPath(); ctx.ellipse(VW / 2, oy + 46, 92, 12, 0, 0, Math.PI * 2); ctx.fill();
      { const img = (typeof Art !== 'undefined' && Art.decor) ? Art.decor.obelisco : null;
        if (img) { const sc = 1.4; ctx.drawImage(img, VW / 2 - img.width * sc / 2, oy + 48 - img.height * sc, img.width * sc, img.height * sc); } }
      // colectivos / autos chicos PASADA la reja (tránsito parado del otro lado)
      for (const v of vehs) if (v.y < 3.6) vehicle(ctx, TX2(v.x + 0.5), TY2(v.y + 0.5), v.kind, v.col, v.sc);
      // LA REJA cruzando + AUTOS ROTOS + CUBIERTAS + BANDERAS (el corte). Si ganaste los 5 → HUECO en el medio (pasás).
      const inGap = x => allWon && x > 7.3 && x < 10.7;
      ctx.strokeStyle = '#6a6a72'; ctx.lineWidth = 3;
      if (allWon) { ctx.beginPath(); ctx.moveTo(TX2(1), TY2(3.0)); ctx.lineTo(TX2(7.3), TY2(3.0)); ctx.moveTo(TX2(10.7), TY2(3.0)); ctx.lineTo(TX2(W - 1), TY2(3.0)); ctx.stroke(); }
      else { ctx.beginPath(); ctx.moveTo(TX2(1), TY2(3.0)); ctx.lineTo(TX2(W - 1), TY2(3.0)); ctx.stroke(); }
      ctx.lineWidth = 2; for (let x = 1; x < W; x += 0.6) { if (inGap(x)) continue; ctx.beginPath(); ctx.moveTo(TX2(x), TY2(2.4)); ctx.lineTo(TX2(x), TY2(3.5)); ctx.stroke(); }
      if (allWon) {   // resplandor del hueco + flecha "pasá"
        const gx = TX2(9), gy = TY2(3.0); ctx.save(); ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 4); const gr = ctx.createRadialGradient(gx, gy, 4, gx, gy, 60); gr.addColorStop(0, 'rgba(255,224,74,0.6)'); gr.addColorStop(1, 'rgba(255,224,74,0)'); ctx.fillStyle = gr; ctx.fillRect(gx - 60, gy - 40, 120, 80); ctx.restore();
        if (!fiesta) { ctx.fillStyle = '#ffe14a'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center'; ctx.fillText('↑ ' + T('g.lavalle.pass'), gx, gy - 4); }
      }
      for (const c of cars) { brokenCar(ctx, TX2(c.x), TY2(c.y), c.col, c.tilt); smoke(ctx, TX2(c.x) + 14 * (c.tilt < 0 ? -1 : 1), TY2(c.y) - 12, c.x, 3, 0.14); }   // humito del motor
      for (const tr of tires) { if (inGap(tr.x)) continue; tireStack(ctx, TX2(tr.x), TY2(tr.y), tr.n); }
      for (const f of flags) drawFlag(ctx, TX2(f.x), TY2(f.y), f.k);
      // el LIENZO largo "VIVA PERÓN" cruza ALTO la hilera de atrás (antes que la multitud, colgado sobre sus cabezas)
      longBanner(ctx, TX2, TY2);
      // MULTITUD de fondo en 3 HILERAS (profundidad: la de atrás más chica/tenue) → el piquete se siente LLENO
      for (const c of crowd) { ctx.save(); ctx.globalAlpha = c.a; smallFolk(ctx, TX2(c.x + 0.5), TY2(c.y + 0.5), c.col, c.ph, c.sc); ctx.restore(); }
      // tachos al fuego (animados)
      const fb = barrels.map((b, i) => ({ b, i })).sort((a, z) => a.b.y - z.b.y);
      for (const { b, i } of fb) { const fx = TX2(b.x + 0.5), fy = TY2(b.y + 0.5);
        ctx.fillStyle = '#39454c'; ctx.fillRect(fx - 9, fy - 4, 18, 22); ctx.fillStyle = '#222d33'; ctx.fillRect(fx - 9, fy - 4, 5, 22);
        ctx.fillStyle = '#1c2429'; ctx.fillRect(fx - 10, fy - 6, 20, 4); fire(ctx, fx, fy - 6, 1, i * 1.7); }
      // olla
      { const olx = TX2(olla.x + 0.5), oly = TY2(olla.y + 0.5); fire(ctx, olx, oly + 8, 0.7, 4.1);
        ctx.fillStyle = '#3a4750'; ctx.beginPath(); ctx.ellipse(olx, oly, 15, 9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#0f1518'; ctx.beginPath(); ctx.ellipse(olx, oly - 6, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#5a3a1a'; ctx.beginPath(); ctx.ellipse(olx, oly - 6, 8, 3, 0, 0, Math.PI * 2); ctx.fill(); }
      // colectivos / autos / patrulleros PARADOS a los costados (este lado) + piqueteros + VOS, ordenados por Y
      const ents = vehs.filter(v => v.y >= 3.6).map(v => ({ v, y: v.y }))
        .concat(folks.map(f => ({ f, y: f.y })))
        .concat([{ player: true, y: player.y / CS - 0.5 }]);
      // MULTIJUGADOR: los OTROS jugadores del piquete (interpolados), ordenados por Y con todo lo demás
      const pm = (typeof Salon !== 'undefined' && Salon.getPeers && Salon.inBodegon && Salon.inBodegon()) ? Salon.getPeers() : null;
      if (pm) for (const p of pm.values()) if (p.rx != null) ents.push({ peer: p, y: (p.ry != null ? p.ry : 8) });
      ents.sort((a, z) => a.y - z.y);
      for (const e of ents) {
        if (e.player) carpo(ctx, ox + player.x, oy + player.y);
        else if (e.v) vehicle(ctx, TX2(e.v.x + 0.5), TY2(e.v.y + 0.5), e.v.kind, e.v.col, e.v.sc);
        else if (e.peer) { const px = TX2(e.peer.rx || 9), py = TY2(e.peer.ry != null ? e.peer.ry : 8);
          piquetero(ctx, px, py, { col: '#3f5a4a', hair: '#2a1a10' }, '', false);
          if (e.peer.nick) { ctx.font = '9px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(0,0,0,0.6)'; const tw = ctx.measureText(e.peer.nick).width + 6; ctx.fillRect(px - tw / 2, py - 30, tw, 11); ctx.fillStyle = '#9be8a0'; ctx.fillText(e.peer.nick, px, py - 21); }
          if (e.peer.emote && Date.now() - (e.peer.emoteT || 0) < 2200) { ctx.font = '13px monospace'; ctx.textAlign = 'center'; ctx.fillText(['', '🍻', '🤝', '💃', '🎸'][e.peer.emote] || '', px, py - 32); } }
        else piquetero(ctx, TX2(e.f.x + 0.5), TY2(e.f.y + 0.5), e.f, near === e.f ? e.f.line : '', near === e.f);
      }
      // FIESTA PERONISTA: choripanes que bailan sobre la gente + confeti + banner "VIVA PERÓN"
      if (fiesta) {
        for (let i = 0; i < 10; i++) { const px = TX2(2 + i * 1.5 + Math.sin(t * 2 + i) * 0.2 + 0.5), py = TY2(5.2 + (i % 3) * 0.7) - Math.abs(Math.sin(t * 4 + i)) * 8; ctx.font = '15px monospace'; ctx.textAlign = 'center'; ctx.fillText('🌭', px, py); }
        for (let i = 0; i < 24; i++) { const ph = (t * 0.7 + i * 0.13) % 1; ctx.globalAlpha = 0.8 * (1 - ph); ctx.fillStyle = ['#74acdf', '#fff', '#f6b40e', '#c0241f'][i % 4]; const cxp = (i * 71 % VW), cyp = 30 + ph * (VH - 60); ctx.fillRect(cxp, cyp, 3, 3); } ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(179,20,26,0.92)'; ctx.fillRect(0, 30, VW, 24); ctx.fillStyle = '#fff'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center'; ctx.fillText('✊ ¡VIVA PERÓN! — ' + T('g.lavalle.fiesta'), VW / 2, 47);
      }
      // barra superior + mensajes
      ctx.fillStyle = '#0a0a0e'; ctx.fillRect(0, 0, VW, 26);
      ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'left'; ctx.fillText('✊ ' + T('g.lavalle.title'), 10, 18);
      // MULTIJUGADOR: cuántos estamos en el piquete AHORA (vos + peers). Feedback directo del online.
      { const nPeers = (typeof Salon !== 'undefined' && Salon.getPeers && Salon.inBodegon && Salon.inBodegon()) ? Salon.getPeers().size : 0;
        ctx.textAlign = 'center'; ctx.fillStyle = nPeers ? '#9be8a0' : '#6a6a72'; ctx.font = 'bold 11px monospace';
        ctx.fillText('👥 ' + (nPeers + 1) + (nPeers ? '' : ' (solo)'), VW / 2, 18); }
      ctx.textAlign = 'right'; ctx.fillStyle = '#9be8a0'; ctx.font = '10px monospace'; ctx.fillText('WASD · ↓ volver · 🎶', VW - 10, 18);
      let bottom = VH;
      if (msgT > 0 && msg) { ctx.font = '12px monospace'; ctx.textAlign = 'center';
        const words = msg.split(' '), lines = []; let cur = '';
        for (const wd of words) { const cand = cur ? cur + ' ' + wd : wd; if (((ctx.measureText(cand) || {}).width || 0) > VW - 44 && cur) { lines.push(cur); cur = wd; } else cur = cand; }
        if (cur) lines.push(cur); const lh = 15, boxH = lines.length * lh + 8;
        ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, VH - boxH, VW, boxH);
        ctx.fillStyle = '#ffe2c0'; lines.forEach((ln, k) => ctx.fillText(ln, VW / 2, VH - boxH + 14 + k * lh)); bottom = VH - boxH; }
      if (prompt) { ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(0,0,0,0.78)'; ctx.fillRect(0, bottom - 22, VW, 22); ctx.fillStyle = '#ffd54f'; ctx.fillText(prompt, VW / 2, bottom - 7); }
    }

    return {
      get done() { return done; }, get exitTo() { return exitTo; }, update, draw,
      get openChatNpc() { const r = chatReq; chatReq = null; return r; },   // one-shot: game.js abre el chat IA y vuelve a Lavalle
      get openPeerChat() { const r = peerReq; peerReq = null; return r; },   // one-shot: game.js abre el chat privado con el jugador online
      get joinCorte() { const r = corteReq; corteReq = false; return r; },   // one-shot: [E] en la barricada → armar "Aguantar el corte"
      get joinSoga() { const r = sogaReq; sogaReq = false; return r; },       // one-shot: [E] abajo-izq → "La soga"
      get joinBombo() { const r = bomboReq; bomboReq = false; return r; },     // one-shot: [E] abajo-der → "Bombo & cumbia"
      get joinOlla() { const r = ollaReq; ollaReq = false; return r; },         // one-shot: [E] en la olla → "Reparto de la olla"
      get joinPanca() { const r = pancaReq; pancaReq = false; return r; },       // one-shot: [E] a la derecha → "Pintar la pancarta"
    };
  }
  return { create };
})();
if (typeof window !== 'undefined') window.Lavalle = Lavalle;
if (typeof module !== 'undefined') module.exports = Lavalle;
