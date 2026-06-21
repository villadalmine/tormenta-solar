// super.js — Supermercado chino en VISTA DE ARRIBA. Tienda ABIERTA con 3 sectores
// (pasillos anchos, se camina libre), la CAJA del chino al frente, y los garcas que
// atienden carnes/fiambres. El chino reordena los productos cada vez (cambian de pos).
const Super = (() => {
  const CS = 28, W = 26, H = 14;
  // 9 góndolas en grilla 3x3 (3 cols de góndolas = 3 sectores), con pasillos anchos
  const GCOLS = [2, 10, 18], GROWS = [2, 6, 9];      // esquina sup-izq de cada bloque (3 ancho x 2 alto)
  const SECT = [{ cx: 3, name: 'ALMACÉN' }, { cx: 11, name: 'LIMPIEZA' }, { cx: 19, name: 'BAZAR' }];
  const COLORS = {
    VINOS:['#7a1020','#4a0d1a','#a01030'], BIRRAS:['#d4a017','#caa000','#e0c060'],
    FIAMBRES:['#d98a8a','#c98060','#b06050'], CARNES:['#c62828','#8d2020','#e05050'],
    GOLOSINAS:['#e91e63','#ffd54f','#ff7043'], GALLETITAS:['#c8a165','#e0c090','#a07840'],
    LIMPIEZA:['#26c6da','#00acc1','#80deea'], HIGIENE:['#f8bbd0','#ce93d8','#fafafa'],
    BAZAR:['#607d8b','#455a64','#8d6e63'], CONSOLAS:['#212121','#37474f','#5d4037'] };
  const DESC = { VINOS:'vino en caja', FIAMBRES:'fiambres dudosos', CARNES:'carne de origen incierto',
    GOLOSINAS:'caramelos', GALLETITAS:'galletitas', LIMPIEZA:'lavandina y detergente',
    HIGIENE:'jabón y papel', BAZAR:'electrónica trucha y ropa baqueteada' };
  const RETRO = ['Atari 2600','Family Game (NES trucha)','Master System','Super Nintendo','Game Boy','Neo Geo',
    'Sega Saturn','PlayStation 1','Nintendo 64','Dreamcast','PlayStation 2','GameCube','Xbox','Nintendo Wii','PlayStation 3','Xbox 360'];
  const PRICE = 6, CHANGE = 4, CARPRICE = 60;
  function shuffle(a) { a = a.slice(); for (let i = a.length-1; i > 0; i--) { const j = (Math.random()*(i+1))|0; [a[i],a[j]] = [a[j],a[i]]; } return a; }
  function wrap(ctx, text, maxW) {
    const words = text.split(' '), lines = []; let cur = '';
    for (const w of words) { const t = cur ? cur+' '+w : w; if (((ctx.measureText(t)||{}).width||0) > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
    if (cur) lines.push(cur); return lines;
  }

  function create(ctx) {
    const P = ctx.player;
    const map = Array.from({ length: H }, () => new Array(W).fill(0));
    const cat = Array.from({ length: H }, () => new Array(W).fill(null));
    for (let x = 0; x < W; x++) { map[0][x] = 1; map[H-1][x] = 1; }
    for (let y = 0; y < H; y++) { map[y][0] = 1; map[y][W-1] = 1; }
    // categorías: pinned siempre + resto rota -> "cambian de posición"
    const cats = shuffle(['BIRRAS','CONSOLAS','CARNES','FIAMBRES', ...shuffle(['VINOS','GOLOSINAS','GALLETITAS','LIMPIEZA','HIGIENE','BAZAR']).slice(0,5)]);
    const gond = []; let gi = 0;
    for (const r0 of GROWS) for (const c0 of GCOLS) {
      const c = cats[gi++];
      for (let r = r0; r <= r0+1; r++) for (let x = c0; x <= c0+2; x++) { map[r][x] = 2; cat[r][x] = c; }
      gond.push({ c0, r0, cat: c, cx: c0+1, cy: r0 });
    }
    const exitC = { x: 2, y: 12 }, secret = { x: 24, y: 1, open: !!ctx.gaveBeers }, caja = { x: 13, y: 12 };
    const player = { x: 6.5*CS, y: 12.5*CS, r: 11 };
    let done = false, exitTo = null, msg = '', msgT = 0, prompt = '', pay = false, eHeld = false, cHeld = false;
    setMsg('Tienda abierta: 3 sectores. Caminá libre, parate al lado de un estante y [E]. La CAJA del chino está al frente. [C] pagar con caramelos. ESC: salir.', 8);

    function setMsg(t, s = 3.5) { msg = t; msgT = s; }
    function finish(to) { exitTo = to; done = true; }
    function solid(px, py) { const tx = Math.floor(px/CS), ty = Math.floor(py/CS); if (tx<0||ty<0||tx>=W||ty>=H) return true; return map[ty][tx] !== 0; }
    function freeAt(x, y) { const r = player.r; return !solid(x-r,y-r) && !solid(x+r,y-r) && !solid(x-r,y+r) && !solid(x+r,y+r); }
    function adjGondolaObj() {
      const tx = Math.floor(player.x/CS), ty = Math.floor(player.y/CS);
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const c = cat[ty+dy] && cat[ty+dy][tx+dx]; if (c) return gond.find(g => g.cat === c && tx+dx >= g.c0 && tx+dx <= g.c0+2 && ty+dy >= g.r0 && ty+dy <= g.r0+1); }
      return null;
    }
    function near(c) { return Math.hypot(player.x-(c.x+0.5)*CS, player.y-(c.y+0.5)*CS) < CS*1.6; }

    function buy(c) {
      if (pay) { if (P.caramelos < CARPRICE) { setMsg('No te alcanzan los caramelos: el chino te cobra ' + CARPRICE + ' (10x). 🍬'); return; } P.caramelos -= CARPRICE; }
      else { if (P.coins < PRICE) { setMsg('No te alcanza la guita (' + PRICE + ' monedas).'); return; } P.coins -= PRICE; P.caramelos += CHANGE; }
      Sfx.pickup();
      const v = pay ? '' : ' Vuelto: +' + CHANGE + ' caramelos 🍬.';
      if (c === 'BIRRAS') { P.birras += 1; setMsg('🍺 Comprás una BIRRA (tenés ' + P.birras + ').' + v); }
      else if (c === 'CONSOLAS') {
        if (!P.hasMegaDrive) { P.hasMegaDrive = true; setMsg('🎮 ¡Te llevás una MEGA DRIVE! El chino: “Hay torneo de FIFA original — en el arcade, preguntale al flaco del TRUCOTRON.” 🏆', 7); }
        else setMsg('🎮 Te llevás una ' + RETRO[(Math.random()*RETRO.length)|0] + ' (de dudosa procedencia).' + v, 4);
      }
      else if (c === 'CARNES') { P.carne = (P.carne||0) + 1; setMsg('El garca te encaja un PEDAZO DE CARNE 🥩 (' + DESC[c] + '). “Es de hoy, te lo juro.” Tenés ' + P.carne + '.' + v); }
      else if (c === 'FIAMBRES') { P.fiambre = (P.fiambre||0) + 1; setMsg('El garca te encaja un FIAMBRE 🥓 (' + DESC[c] + '). “Recién cortado, dale.” Tenés ' + P.fiambre + '.' + v); }
      else setMsg('Comprás ' + (DESC[c] || c.toLowerCase()) + '.' + v);
    }
    function interact() {
      const g = adjGondolaObj();
      if (g) { buy(g.cat); return; }
      if (near(caja)) { setMsg('Chino (caja): “Vuelto siempre en caramelos, amigo 🍬. Si me pagás con caramelos te cobro 10 veces más, ¿eh?”'); return; }
      if (secret.open && near(secret)) { finish('cueva'); return; }
      setMsg('Acercate a un estante o a la CAJA y apretá E.');
    }

    return {
      get done() { return done; }, get exitTo() { return exitTo; },
      update(dt) {
        msgT -= dt;
        const sp = 170*dt;
        if (Input.keys['arrowleft'] || Input.keys['a']) { if (freeAt(player.x-sp, player.y)) player.x -= sp; }
        if (Input.keys['arrowright'] || Input.keys['d']) { if (freeAt(player.x+sp, player.y)) player.x += sp; }
        if (Input.keys['arrowup'] || Input.keys['w']) { if (freeAt(player.x, player.y-sp)) player.y -= sp; }
        if (Input.keys['arrowdown'] || Input.keys['s']) { if (freeAt(player.x, player.y+sp)) player.y += sp; }
        if (Input.keys['escape']) { finish('street'); return; }
        if (Input.keys['c']) { if (!cHeld) { cHeld = true; pay = !pay; setMsg(pay ? '🍬 Modo: PAGAR CON CARAMELOS (el chino cobra 10x = ' + CARPRICE + ').' : '💰 Modo: pagar con monedas.'); } } else cHeld = false;
        if (Input.keys['e']) { if (!eHeld) { eHeld = true; interact(); } } else eHeld = false;
        if (near(exitC)) finish('street');
        if (secret.open && near(secret)) finish('cueva');
        const g = adjGondolaObj();
        if (g) prompt = (g.cat === 'CARNES' || g.cat === 'FIAMBRES' ? '🥩 Garca de ' + g.cat + ' — [E] te encaja mierda' : '🛒 Góndola de ' + g.cat + ' — [E] comprar') + ' (' + (pay ? CARPRICE + ' caramelos' : PRICE + ' monedas') + ')';
        else if (near(caja)) prompt = '🧧 CAJA del chino — [E] (vuelto en caramelos)';
        else if (secret.open && near(secret)) prompt = '🚪 PUERTA SECRETA — entrá';
        else if (near(exitC)) prompt = '↓ Salida a la calle';
        else prompt = '';
      },
      draw(ctx, VW, VH) {
        const ox = (VW - W*CS)/2, oy = 32;
        ctx.fillStyle = '#10121a'; ctx.fillRect(0, 0, VW, VH);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const px = ox + x*CS, py = oy + y*CS;
          if (map[y][x] === 1) { ctx.fillStyle = '#5a6470'; ctx.fillRect(px, py, CS, CS); }
          else if (map[y][x] === 2) { const cols = COLORS[cat[y][x]] || ['#888','#777','#999']; ctx.fillStyle = '#2c3640'; ctx.fillRect(px, py, CS, CS); ctx.fillStyle = cols[(x+y)%3]; ctx.fillRect(px+3, py+4, CS-6, CS-8); }
          else { ctx.fillStyle = ((x+y)%2) ? '#cfd4da' : '#c6ccd2'; ctx.fillRect(px, py, CS, CS); }
        }
        // etiqueta de categoría sobre cada góndola
        ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
        for (const g of gond) { const lx = ox + (g.c0+1.5)*CS, ly = oy + g.r0*CS - 3; ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(lx-34, ly-10, 68, 12); ctx.fillStyle = COLORS[g.cat][0] === '#212121' ? '#9fd3ff' : '#fff'; ctx.fillText(g.cat, lx, ly); }
        // sector arriba
        ctx.font = 'bold 12px monospace';
        for (const s of SECT) { const cx = ox + (s.cx+0.5)*CS; ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(cx-46, oy-16, 92, 14); ctx.fillStyle = '#ffe14d'; ctx.fillText('SECTOR ' + s.name, cx, oy-5); }
        // garcas atendiendo carnes/fiambres
        for (const g of gond) if (g.cat === 'CARNES' || g.cat === 'FIAMBRES') { const fx = ox + (g.c0+1.5)*CS, fy = oy + (g.r0+2.4)*CS; ctx.fillStyle = '#1565c0'; ctx.beginPath(); ctx.arc(fx, fy, 8, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#e0b088'; ctx.beginPath(); ctx.arc(fx, fy-9, 5, 0, Math.PI*2); ctx.fill(); }
        // CAJA (chino) — grande y al frente
        const kx = ox + (caja.x+0.5)*CS, ky = oy + (caja.y+0.5)*CS;
        ctx.fillStyle = '#ffd54f'; ctx.fillRect(kx-30, ky-12, 60, 24);
        ctx.fillStyle = '#b71c1c'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center'; ctx.fillText('CAJA 超市', kx, ky+4);
        ctx.fillStyle = '#e0b088'; ctx.beginPath(); ctx.arc(kx, ky-22, 8, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#222'; ctx.fillRect(kx-7, ky-34, 14, 6);
        // salida
        const ex = ox + (exitC.x+0.5)*CS, ey = oy + (exitC.y+0.5)*CS;
        ctx.fillStyle = '#2e7d32'; ctx.fillRect(ex-CS/2, ey-CS/2, CS, CS); ctx.fillStyle = '#eaffea'; ctx.font = 'bold 8px monospace'; ctx.fillText('SALIDA', ex, ey+3);
        if (secret.open) { const sx = ox + (secret.x+0.5)*CS, sy = oy + (secret.y+0.5)*CS; ctx.fillStyle = '#6a1b9a'; ctx.fillRect(sx-CS/2, sy-CS/2, CS, CS); ctx.fillStyle = '#e0b0ff'; ctx.beginPath(); ctx.arc(sx, sy, 6+Math.sin(Date.now()/200)*2, 0, Math.PI*2); ctx.fill(); }
        // jugador con changuito
        ctx.fillStyle = '#36567f'; ctx.beginPath(); ctx.arc(ox+player.x, oy+player.y, player.r, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#d9a878'; ctx.beginPath(); ctx.arc(ox+player.x, oy+player.y-3, 5, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#999'; ctx.lineWidth = 2; ctx.strokeRect(ox+player.x+8, oy+player.y-4, 10, 8);
        // barra superior
        ctx.fillStyle = '#0a0c12'; ctx.fillRect(0, 0, VW, 28);
        ctx.fillStyle = '#FFC107'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'left'; ctx.fillText('SUPER CHINO 超市', 10, 19);
        ctx.fillStyle = '#fff'; ctx.fillText('💰' + P.coins + '  🍬' + P.caramelos + '  🍺' + P.birras + '  🥩' + (P.carne||0) + '  🥓' + (P.fiambre||0), 180, 19);
        ctx.fillStyle = pay ? '#FF7043' : '#9fd3ff'; ctx.textAlign = 'right'; ctx.fillText(pay ? 'PAGO: CARAMELOS (10x)' : 'PAGO: MONEDAS  [C]', VW-10, 19);
        // mensaje (abajo, multilínea para que entre todo)
        let bottom = VH;
        if (msgT > 0) {
          ctx.font = '13px monospace'; ctx.textAlign = 'center';
          const lines = wrap(ctx, msg, VW-44), lh = 16, boxH = lines.length*lh + 8;
          ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, VH-boxH, VW, boxH);
          ctx.fillStyle = '#dff3d0'; lines.forEach((ln, i) => ctx.fillText(ln, VW/2, VH-boxH+14+i*lh));
          bottom = VH - boxH;
        }
        if (prompt) { ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(0,0,0,0.78)'; ctx.fillRect(0, bottom-22, VW, 22); ctx.fillStyle = '#ffe14d'; ctx.fillText(prompt, VW/2, bottom-7); }
      },
    };
  }
  return { create };
})();
