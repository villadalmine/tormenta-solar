// tren.js — SUB-MODO "TOMAR EL TREN" (subte.md §11, andenes reales). Desde los molinetes de una terminal
// (Constitución/Retiro) elegís un RAMAL y el tren te lleva: 1) un VIAJE (paisaje que scrollea + el tren), 2) el
// ANDÉN de DESTINO (top-down) donde te bajás, mirás la estación y tomás el tren de vuelta. Tematizado por ramal
// (río/ciudad/campo/aeropuerto). Aislado: al salir (done) el juego principal queda EXACTO. Reusa el patrón sub-modo.
const Tren = (() => {
  const T = (k, p) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(k, p) : k;
  const CS = 30, W = 16, H = 12;
  const VIAJE_DUR = 4.2;
  // flavor por destino (DATA): match por palabra clave del ramal → tinte + prop del paisaje/andén
  const FLAVORS = {
    rio:    { sky: '#375566', gnd: '#274536', prop: 'rio',    key: ['tigre', 'delta'] },
    ciudad: { sky: '#3a4560', gnd: '#3a3a30', prop: 'ciudad', key: ['la plata', 'plata'] },
    aero:   { sky: '#4a4e5e', gnd: '#464636', prop: 'avion',  key: ['ezeiza'] },
    campo:  { sky: '#4a6a5a', gnd: '#4a4526', prop: 'campo',  key: ['cañuelas', 'korn', 'bosques', 'pilar'] },
    conurb: { sky: '#3a3a48', gnd: '#38332a', prop: 'casas',  key: [] },   // default: conurbano
  };
  function flavorFor(ramal) {
    const r = (ramal || '').toLowerCase();
    for (const id in FLAVORS) if (FLAVORS[id].key.some(k => r.includes(k))) return FLAVORS[id];
    return FLAVORS.conurb;
  }

  function create(opts) {
    opts = opts || {};
    const ramal = opts.ramal || 'Ramal';
    const linea = opts.linea || 'Roca';
    const fl = flavorFor(ramal);
    let phase = 'viaje', t = 0, scroll = 0, done = false, exitTo = null, msg = '', msgT = 0, prompt = '';
    let escHeld = false, eHeld = false, arrived = false;
    // ANDÉN de destino (se usa en la fase 'anden')
    const map = Array.from({ length: H }, () => new Array(W).fill(0));
    for (let x = 0; x < W; x++) { map[0][x] = 1; map[H - 1][x] = 1; }
    for (let y = 0; y < H; y++) { map[y][0] = 1; map[y][W - 1] = 1; }
    const trenVuelta = { x: 8, y: 2 };               // el tren (arriba, en las vías) → volvés
    const banco = { x: 4, y: 7 }, cartel = { x: 8, y: 5 };
    const player = { x: 8 * CS, y: 8 * CS, r: 10, dir: 1, walk: 0 };

    function setMsg(s, d = 4) { msg = s; msgT = d; }
    function solid(px, py) { const tx = Math.floor(px / CS), ty = Math.floor(py / CS); if (tx < 0 || ty < 0 || tx >= W || ty >= H) return true; return map[ty][tx] === 1; }
    function freeAt(x, y) { const r = player.r; return !solid(x - r, y - r) && !solid(x + r, y - r) && !solid(x - r, y + r) && !solid(x + r, y + r); }
    function near(c, d = 1.5) { return Math.hypot(player.x - (c.x + 0.5) * CS, player.y - (c.y + 0.5) * CS) < CS * d; }

    function interact() {
      if (phase !== 'anden') return;
      if (near(trenVuelta, 1.6)) { done = true; exitTo = 'back'; if (typeof Sfx !== 'undefined' && Sfx.pickup) Sfx.pickup(); return; }
      if (near(cartel, 1.6)) { setMsg(T('g.tren.cartel', { r: ramal, l: linea }), 6); return; }
      if (near(banco, 1.4)) { setMsg(T('g.tren.banco'), 5); return; }
      setMsg(T('g.tren.hint'), 3);
    }

    function update(dt) {
      t += dt; msgT -= dt;
      if (phase === 'viaje') {
        scroll += dt * 220;
        // saltar el viaje con [E]/Espacio/Esc
        const skip = Input.keys['e'] || Input.keys['enter'] || Input.keys[' '] || Input.keys['escape'];
        if (skip) { if (!eHeld) { eHeld = true; phase = 'anden'; setMsg(T('g.tren.llegada', { r: ramal }), 6); } }
        else eHeld = false;
        if (t >= VIAJE_DUR) { phase = 'anden'; setMsg(T('g.tren.llegada', { r: ramal }), 6); }
        return;
      }
      // fase ANDÉN
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
      if (near(trenVuelta, 1.6)) prompt = T('g.tren.promptVuelta');
      else if (near(cartel, 1.6)) prompt = T('g.tren.promptCartel');
      else if (near(banco, 1.4)) prompt = T('g.tren.promptBanco');
      else prompt = '';
    }

    function drawViaje(g, VW, VH) {
      // cielo
      g.fillStyle = fl.sky; g.fillRect(0, 0, VW, VH * 0.55);
      // sol/luna difusa
      g.fillStyle = 'rgba(255,240,200,0.25)'; g.beginPath(); g.arc(VW * 0.8, VH * 0.2, 40, 0, Math.PI * 2); g.fill();
      // colinas lejanas (parallax lento)
      g.fillStyle = 'rgba(0,0,0,0.25)';
      for (let i = -1; i < 8; i++) { const hx = ((i * 220 - scroll * 0.3) % (VW + 220)); g.beginPath(); g.arc(hx, VH * 0.55, 120, Math.PI, 0); g.fill(); }
      // tierra
      g.fillStyle = fl.gnd; g.fillRect(0, VH * 0.55, VW, VH * 0.45);
      // props del flavor pasando (parallax medio)
      for (let i = -1; i < 6; i++) {
        const bx = ((i * 260 - scroll * 0.7) % (VW + 260) + VW + 260) % (VW + 260) - 130;
        const by = VH * 0.5;
        if (fl.prop === 'rio') { g.fillStyle = '#5aa0b8'; g.fillRect(bx - 60, by + 20, 220, 30); g.fillStyle = '#2a5a4a'; g.fillRect(bx, by - 18, 8, 40); }
        else if (fl.prop === 'ciudad') { g.fillStyle = '#4a4a58'; g.fillRect(bx, by - 60, 34, 80); g.fillRect(bx + 44, by - 40, 28, 60); g.fillStyle = '#c9b04a'; g.fillRect(bx + 6, by - 50, 5, 5); }
        else if (fl.prop === 'avion') { g.fillStyle = '#8a95a5'; g.fillRect(bx, by - 6, 60, 8); g.beginPath(); g.moveTo(bx + 60, by - 2); g.lineTo(bx + 80, by - 2); g.lineTo(bx + 60, by + 6); g.fill(); }
        else if (fl.prop === 'campo') { g.fillStyle = '#3a6a3a'; g.beginPath(); g.arc(bx + 20, by, 22, 0, Math.PI * 2); g.fill(); g.fillStyle = '#6a4a2a'; g.fillRect(bx + 18, by, 5, 18); }
        else { g.fillStyle = '#6a4436'; g.fillRect(bx, by - 24, 40, 44); g.fillStyle = '#3a2a22'; g.fillRect(bx + 46, by - 16, 30, 36); }   // casas conurbano
      }
      // catenaria/postes (parallax rápido)
      g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 3;
      for (let i = -1; i < 10; i++) { const px = ((i * 130 - scroll) % (VW + 130) + VW + 130) % (VW + 130) - 65; g.beginPath(); g.moveTo(px, VH * 0.2); g.lineTo(px, VH * 0.58); g.stroke(); }
      // VÍAS + el TREN en primer plano (fijo, el mundo se mueve)
      g.fillStyle = '#1a1712'; g.fillRect(0, VH - 92, VW, 92);
      g.strokeStyle = '#3a352c'; g.lineWidth = 3;
      for (let i = -1; i < 30; i++) { const sx = ((i * 34 - scroll * 1.4) % (VW + 34) + VW + 34) % (VW + 34) - 17; g.beginPath(); g.moveTo(sx, VH - 78); g.lineTo(sx + 18, VH - 62); g.stroke(); }
      const ty = VH - 74;
      g.fillStyle = linea === 'Mitre' ? '#7a2b2b' : '#2b4a7a';   // color de línea aproximado
      g.fillRect(VW * 0.12, ty - 34, VW * 0.76, 44);
      g.fillStyle = '#0d1017'; g.fillRect(VW * 0.12, ty - 34, VW * 0.76, 6);
      g.fillStyle = '#cfe8ff'; for (let w = 0; w < 6; w++) g.fillRect(VW * 0.16 + w * (VW * 0.72 / 6), ty - 24, VW * 0.72 / 6 - 10, 20);
      g.fillStyle = '#111'; g.beginPath(); g.arc(VW * 0.24, ty + 12, 8, 0, Math.PI * 2); g.arc(VW * 0.76, ty + 12, 8, 0, Math.PI * 2); g.fill();
      // rótulo del ramal + barra de progreso
      g.fillStyle = 'rgba(6,10,16,0.85)'; g.fillRect(VW / 2 - 150, 20, 300, 42);
      g.fillStyle = '#ffe9b0'; g.font = 'bold 15px monospace'; g.textAlign = 'center';
      g.fillText('🚆 ' + T('g.tren.rumbo', { r: ramal }), VW / 2, 40);
      g.fillStyle = '#2a3340'; g.fillRect(VW / 2 - 130, 48, 260, 6);
      g.fillStyle = '#7CFC00'; g.fillRect(VW / 2 - 130, 48, 260 * Math.min(1, t / VIAJE_DUR), 6);
      g.fillStyle = '#8fa8c8'; g.font = '10px monospace'; g.fillText(T('g.tren.skip'), VW / 2, VH - 12);
    }

    function drawAnden(g, VW, VH) {
      const ox = (VW - W * CS) / 2, oy = (VH - H * CS) / 2;
      g.fillStyle = '#0b0d12'; g.fillRect(0, 0, VW, VH);
      // baldosas del andén + cielo del flavor arriba (tras las vías)
      g.fillStyle = fl.sky; g.fillRect(ox, oy, W * CS, 2 * CS);
      for (let y = 2; y < H; y++) for (let x = 0; x < W; x++) { g.fillStyle = ((x + y) & 1) ? '#20242c' : '#1a1d24'; g.fillRect(ox + x * CS, oy + y * CS, CS, CS); }
      // VÍAS (arriba) + el tren de vuelta
      g.fillStyle = '#05070a'; g.fillRect(ox + CS, oy + 1.2 * CS, (W - 2) * CS, 1.6 * CS);
      g.strokeStyle = '#2a3240'; g.lineWidth = 2; for (const ry of [1.5, 2.1]) { g.beginPath(); g.moveTo(ox + CS, oy + ry * CS); g.lineTo(ox + (W - 1) * CS, oy + ry * CS); g.stroke(); }
      g.fillStyle = '#ffd54f'; g.fillRect(ox + CS, oy + 3 * CS - 4, (W - 2) * CS, 4);   // línea amarilla del borde
      const vx = ox + (trenVuelta.x - 2) * CS, vy = oy + (trenVuelta.y - 0.7) * CS;
      g.fillStyle = linea === 'Mitre' ? '#7a2b2b' : '#2b4a7a'; g.fillRect(vx, vy, 5 * CS, 1.5 * CS);
      g.fillStyle = '#cfe8ff'; for (let w = 0; w < 5; w++) g.fillRect(vx + 10 + w * CS, vy + 8, CS - 16, 18);
      g.fillStyle = '#9fe6a0'; g.font = '10px monospace'; g.textAlign = 'center'; g.fillText('◀ ' + T('g.tren.vuelta'), ox + trenVuelta.x * CS, oy + (trenVuelta.y + 1.2) * CS);
      // cartel de la estación de destino
      const cx = ox + cartel.x * CS, cy = oy + cartel.y * CS;
      g.fillStyle = '#0d1017'; g.fillRect(cx - 92, cy - 13, 184, 26);
      g.fillStyle = linea === 'Mitre' ? '#e2231a' : '#1f6cb5'; g.fillRect(cx - 88, cy - 9, 8, 18);
      g.fillStyle = '#e8f0ff'; g.font = 'bold 13px monospace'; g.fillText(ramal.toUpperCase(), cx + 6, cy + 5);
      // banco
      const bx = ox + banco.x * CS, by = oy + banco.y * CS;
      g.fillStyle = '#3a4030'; g.fillRect(bx - 20, by - 4, 40, 8); g.fillStyle = '#2a3020'; g.fillRect(bx - 18, by + 4, 5, 8); g.fillRect(bx + 13, by + 4, 5, 8);
      // prop del flavor en el andén (una silueta característica al fondo)
      g.fillStyle = 'rgba(255,255,255,0.08)'; g.textAlign = 'center'; g.font = '30px monospace';
      const emoji = fl.prop === 'rio' ? '🚣' : fl.prop === 'ciudad' ? '🏛️' : fl.prop === 'avion' ? '✈️' : fl.prop === 'campo' ? '🌾' : '🏘️';
      g.fillText(emoji, ox + 13 * CS, oy + 8 * CS);
      // jugador
      const px = ox + player.x, py = oy + player.y;
      g.fillStyle = '#111'; g.beginPath(); g.ellipse(px, py + 10, 10, 4, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffcf5b'; g.beginPath(); g.arc(px, py, player.r, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#0a0a0a'; g.fillRect(px + player.dir * 3 - 1, py - 3, 2, 2);
      if (prompt) { g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(0, VH - 54, VW, 22); g.fillStyle = '#7ff3ff'; g.font = 'bold 13px monospace'; g.textAlign = 'center'; g.fillText(prompt, VW / 2, VH - 38); }
    }

    function draw(g, VW, VH) {
      if (phase === 'viaje') drawViaje(g, VW, VH); else drawAnden(g, VW, VH);
      if (msgT > 0 && msg) { g.fillStyle = 'rgba(0,0,0,0.72)'; g.fillRect(0, VH - 30, VW, 26); g.fillStyle = '#e8f0ff'; g.font = '13px monospace'; g.textAlign = 'center'; g.fillText(msg, VW / 2, VH - 12); }
    }

    return {
      get done() { return done; }, get exitTo() { return exitTo; },
      update, draw,
      __arrive: () => { phase = 'anden'; return phase; },   // e2e: forzar la llegada
      __leave: () => { phase = 'anden'; player.x = (trenVuelta.x + 0.5) * CS; player.y = (trenVuelta.y + 1.4) * CS; interact(); return exitTo; },   // e2e: tomar el tren de vuelta
    };
  }
  return { create, FLAVORS, flavorFor };
})();
if (typeof window !== 'undefined') window.Tren = Tren;
if (typeof module !== 'undefined') module.exports = Tren;
