// villa31.js — SUB-MODO "VILLA 31" (subte.md §11, E3/E4). Salís de Retiro a la calle, seguís las vías de la
// LÍNEA SAN MARTÍN hacia abajo y aparece la Villa 31 (justo atrás de Retiro, hacia el puerto). Vista top-down.
// Barrio de casas de ladrillo a la vista, pasillos, cables, murales — y un COMEDOR POPULAR con la olla humeando.
// La REFERENTE del comedor (NPC con IA + memoria) te CONTRATA para dar una mano. "Ahí quedamos" (dueño): la
// llegada + el laburo en el comedor arranca acá (el gameplay de cocinar lo iteramos después). Aislado: al salir
// (done) el juego principal queda EXACTO.
const Villa31 = (() => {
  const T = (k, p) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(k, p) : k;
  const CS = 30, W = 20, H = 14;
  // casas de ladrillo (DATA): rects en tiles [x,y,w,h] + color de fachada
  const CASAS = [
    { x: 1.6, y: 5, w: 3, h: 2.4, c: '#8a4b32' }, { x: 1.6, y: 8.2, w: 2.6, h: 2.2, c: '#9c5a3c' },
    { x: 15.8, y: 4.6, w: 3, h: 2.6, c: '#7d4530' }, { x: 15.4, y: 8, w: 3.2, h: 2.4, c: '#96543a' },
    { x: 5.4, y: 2.2, w: 2.4, h: 2, c: '#8a4b32' }, { x: 12.2, y: 2.2, w: 2.6, h: 2, c: '#9c5a3c' },
  ];

  function create(opts) {
    opts = opts || {};
    const map = Array.from({ length: H }, () => new Array(W).fill(0));
    for (let x = 0; x < W; x++) { map[0][x] = 1; map[H - 1][x] = 1; }
    for (let y = 0; y < H; y++) { map[y][0] = 1; map[y][W - 1] = 1; }
    // las casas son sólidas
    for (const c of CASAS) for (let yy = Math.floor(c.y); yy < Math.ceil(c.y + c.h); yy++)
      for (let xx = Math.floor(c.x); xx < Math.ceil(c.x + c.w); xx++) if (map[yy] && map[yy][xx] !== undefined) map[yy][xx] = 1;
    const comedor = { x: 10, y: 9.5 };               // la olla popular / el comedor
    const referente = { x: 10, y: 7.6, name: T('g.villa.refName'), persona: 'comedor' };
    const iglesia = { x: 4.2, y: 11 };               // la iglesia del Padre Mugica (Cristo Obrero)
    const cura = { x: 5.6, y: 11.2, name: T('g.villa.curaName'), persona: 'cura' };   // el cura villero
    const vias = { x: 10, y: 1.2 };                  // arriba: las vías de la San Martín (por donde llegás/salís)
    const player = { x: 10 * CS, y: 3.2 * CS, r: 10, dir: 1, walk: 0 };
    let done = false, exitTo = null, t = 0, msg = '', msgT = 0, prompt = '', escHeld = false, eHeld = false;
    let hired = !!opts.hired, hireJustNow = false, chatNpc = null, humo = 0;
    setMsg(T('g.villa.enter'), 7);

    function setMsg(s, d = 4) { msg = s; msgT = d; }
    function solid(px, py) { const tx = Math.floor(px / CS), ty = Math.floor(py / CS); if (tx < 0 || ty < 0 || tx >= W || ty >= H) return true; return map[ty][tx] === 1; }
    function freeAt(x, y) { const r = player.r; return !solid(x - r, y - r) && !solid(x + r, y - r) && !solid(x - r, y + r) && !solid(x + r, y + r); }
    function near(c, d = 1.6) { return Math.hypot(player.x - (c.x + 0.5) * CS, player.y - (c.y + 0.5) * CS) < CS * d; }

    function interact() {
      if (near(vias, 1.4)) { done = true; exitTo = 'back'; if (typeof Sfx !== 'undefined' && Sfx.pickup) Sfx.pickup(); return; }   // volver por las vías → Retiro
      if (near(cura, 1.6) || near(iglesia, 1.5)) {
        chatNpc = { name: cura.name, persona: cura.persona };   // el cura villero de la iglesia del Padre Mugica (IA)
        return;
      }
      if (near(referente, 1.7) || near(comedor, 1.4)) {
        if (!hired) { hired = true; hireJustNow = true; setMsg(T('g.villa.hire'), 7); if (typeof Sfx !== 'undefined' && Sfx.pickup) Sfx.pickup(); }
        chatNpc = { name: referente.name, persona: referente.persona };   // abrí el chat con la referente (IA)
        return;
      }
      setMsg(T('g.villa.hint'), 3);
    }

    function update(dt) {
      t += dt; msgT -= dt; humo = (humo + dt) % 3;
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
      if (near(vias, 1.4)) prompt = T('g.villa.promptVias');
      else if (near(cura, 1.6) || near(iglesia, 1.5)) prompt = T('g.villa.promptCura');
      else if (near(referente, 1.7) || near(comedor, 1.4)) prompt = hired ? T('g.villa.promptTalk') : T('g.villa.promptHire');
      else prompt = '';
    }

    function draw(g, VW, VH) {
      const ox = (VW - W * CS) / 2, oy = (VH - H * CS) / 2;
      g.fillStyle = '#171310'; g.fillRect(0, 0, VW, VH);
      // tierra / pasillos
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        g.fillStyle = ((x + y) & 1) ? '#2a231d' : '#241d18';
        g.fillRect(ox + x * CS, oy + y * CS, CS, CS);
      }
      // VÍAS de la San Martín (arriba)
      g.fillStyle = '#14100c'; g.fillRect(ox + CS, oy + 0.6 * CS, (W - 2) * CS, 1.3 * CS);
      g.strokeStyle = '#4a4038'; g.lineWidth = 2;
      for (const ry of [1.0, 1.5]) { g.beginPath(); g.moveTo(ox + CS, oy + ry * CS); g.lineTo(ox + (W - 1) * CS, oy + ry * CS); g.stroke(); }
      for (let x = 2; x < W - 1; x += 1) { g.strokeStyle = '#3a332c'; g.beginPath(); g.moveTo(ox + x * CS, oy + 0.9 * CS); g.lineTo(ox + x * CS, oy + 1.6 * CS); g.stroke(); }
      g.fillStyle = '#c9b48a'; g.font = 'bold 10px monospace'; g.textAlign = 'center';
      g.fillText('🚆 ' + T('g.villa.viasLabel'), ox + W * CS / 2, oy + 0.45 * CS);
      // CASAS de ladrillo
      for (const c of CASAS) { const bx = ox + c.x * CS, by = oy + c.y * CS, bw = c.w * CS, bh = c.h * CS;
        g.fillStyle = c.c; g.fillRect(bx, by, bw, bh);
        g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1;
        for (let ly = by + 6; ly < by + bh; ly += 7) { g.beginPath(); g.moveTo(bx, ly); g.lineTo(bx + bw, ly); g.stroke(); }
        g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(bx + bw * 0.35, by + bh - 12, 10, 12);   // puertita
        // tanque de agua arriba
        g.fillStyle = '#2b3540'; g.fillRect(bx + 4, by - 6, 8, 6);
      }
      // cables cruzando (marañas)
      g.strokeStyle = 'rgba(20,20,20,0.7)'; g.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(ox + (2 + i * 4) * CS, oy + 3 * CS); g.quadraticCurveTo(ox + (4 + i * 4) * CS, oy + (2.4 + (i % 2) * 0.8) * CS, ox + (6 + i * 4) * CS, oy + 3 * CS); g.stroke(); }
      // COMEDOR POPULAR (la olla humeante + tablón)
      const cx = ox + (comedor.x + 0.5) * CS, cy = oy + (comedor.y + 0.5) * CS;
      g.fillStyle = '#3a2f26'; g.fillRect(cx - 40, cy - 6, 80, 26);   // tablón
      g.fillStyle = '#7a2f2f'; g.fillRect(cx - 44, cy - 34, 88, 12);  // toldo/banner
      g.fillStyle = '#ffe9b0'; g.font = 'bold 10px monospace'; g.textAlign = 'center'; g.fillText(T('g.villa.comedor'), cx, cy - 25);
      // olla
      g.fillStyle = '#222'; g.beginPath(); g.ellipse(cx, cy + 2, 13, 8, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#3a3a3a'; g.fillRect(cx - 13, cy - 4, 26, 8);
      // humo
      g.fillStyle = 'rgba(220,220,220,' + (0.18 + 0.1 * Math.sin(t * 3)) + ')';
      for (let i = 0; i < 3; i++) { const yy = cy - 8 - ((humo * 8 + i * 10) % 30); g.beginPath(); g.arc(cx + Math.sin((t + i) * 2) * 5, yy, 5 - i, 0, Math.PI * 2); g.fill(); }
      // IGLESIA del Padre Mugica (capilla Cristo Obrero) — fachada simple + cruz
      const ix = ox + (iglesia.x + 0.5) * CS, iy = oy + (iglesia.y + 0.5) * CS;
      g.fillStyle = '#d8cdb6'; g.fillRect(ix - 22, iy - 30, 44, 44);   // nave
      g.fillStyle = '#c2b596'; g.beginPath(); g.moveTo(ix - 22, iy - 30); g.lineTo(ix, iy - 46); g.lineTo(ix + 22, iy - 30); g.closePath(); g.fill();   // frontón
      g.strokeStyle = '#6b5a3a'; g.lineWidth = 3; g.beginPath(); g.moveTo(ix, iy - 62); g.lineTo(ix, iy - 46); g.moveTo(ix - 6, iy - 56); g.lineTo(ix + 6, iy - 56); g.stroke();   // cruz
      g.fillStyle = '#5a4a2e'; g.fillRect(ix - 6, iy - 6, 12, 20);     // puerta
      g.fillStyle = '#8fb0d8'; g.fillRect(ix - 15, iy - 22, 7, 10); g.fillRect(ix + 8, iy - 22, 7, 10);   // vitrales
      g.fillStyle = '#e8d9b0'; g.font = '8px monospace'; g.textAlign = 'center'; g.fillText(T('g.villa.iglesia'), ix, iy + 26);
      // CURA villero (sotana)
      const ux = ox + (cura.x + 0.5) * CS, uy = oy + (cura.y + 0.5) * CS;
      g.fillStyle = '#111'; g.beginPath(); g.ellipse(ux, uy + 9, 8, 3, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#2b2b30'; g.fillRect(ux - 5, uy - 4, 10, 16);     // sotana oscura
      g.fillStyle = '#eee'; g.fillRect(ux - 2, uy - 3, 4, 4);          // cuellito blanco
      g.fillStyle = '#e0a878'; g.beginPath(); g.arc(ux, uy - 8, 5, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#e8f0ff'; g.font = '9px monospace'; g.textAlign = 'center'; g.fillText(cura.name, ux, uy - 16);
      // REFERENTE (delantal)
      const fx = ox + (referente.x + 0.5) * CS, fy = oy + (referente.y + 0.5) * CS;
      g.fillStyle = '#111'; g.beginPath(); g.ellipse(fx, fy + 9, 8, 3, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#c94f6d'; g.fillRect(fx - 6, fy - 4, 12, 16);   // vestido
      g.fillStyle = '#eef1f4'; g.fillRect(fx - 6, fy + 2, 12, 8);    // delantal
      g.fillStyle = '#e8b98e'; g.beginPath(); g.arc(fx, fy - 8, 6, 0, Math.PI * 2); g.fill();   // cabeza
      g.fillStyle = '#e8f0ff'; g.font = '9px monospace'; g.textAlign = 'center'; g.fillText(referente.name, fx, fy - 18);
      // jugador
      const px = ox + player.x, py = oy + player.y;
      g.fillStyle = '#111'; g.beginPath(); g.ellipse(px, py + 10, 10, 4, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffcf5b'; g.beginPath(); g.arc(px, py, player.r, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#0a0a0a'; g.fillRect(px + player.dir * 3 - 1, py - 3, 2, 2);
      // cartelito de barrio
      g.fillStyle = '#0d1017cc'; g.fillRect(ox + W * CS / 2 - 60, oy + 2.0 * CS, 120, 20);
      g.fillStyle = '#ffd54f'; g.font = 'bold 12px monospace'; g.textAlign = 'center'; g.fillText('VILLA 31 · RETIRO', ox + W * CS / 2, oy + 2.0 * CS + 14);
      if (prompt) { g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(0, VH - 54, VW, 22); g.fillStyle = '#7ff3ff'; g.font = 'bold 13px monospace'; g.textAlign = 'center'; g.fillText(prompt, VW / 2, VH - 38); }
      if (msgT > 0 && msg) { g.fillStyle = 'rgba(0,0,0,0.72)'; g.fillRect(0, VH - 30, VW, 26); g.fillStyle = '#e8f0ff'; g.font = '13px monospace'; g.textAlign = 'center'; g.fillText(msg, VW / 2, VH - 12); }
    }

    return {
      get done() { return done; }, get exitTo() { return exitTo; },
      // one-shot: game.js lee si te acaban de contratar (setea el flag/grafo) y a quién chatear (IA)
      get hireEdge() { const h = hireJustNow; hireJustNow = false; return h; },
      get openChatNpc() { const c = chatNpc; chatNpc = null; return c; },
      update, draw,
      __leave: () => { player.x = (vias.x + 0.5) * CS; player.y = (vias.y + 1.2) * CS; interact(); return exitTo; },   // e2e: volver a Retiro por las vías
      __hire: () => { player.x = (referente.x + 0.5) * CS; player.y = (referente.y + 1.2) * CS; interact(); return { hired, npc: chatNpc }; },   // e2e: te contrata + abre chat
      __cura: () => { player.x = (cura.x + 0.5) * CS; player.y = (cura.y - 0.8) * CS; interact(); return chatNpc; },   // e2e: chat con el cura de la iglesia Mugica
    };
  }
  return { create, CASAS };
})();
if (typeof window !== 'undefined') window.Villa31 = Villa31;
if (typeof module !== 'undefined') module.exports = Villa31;
