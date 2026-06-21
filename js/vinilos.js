// vinilos.js — Disquería en la cueva, VISTA DE ARRIBA. 3 góndolas por época y un
// punk en el mostrador escuchando "God Save the Queen". Suena 80s chiptune.
const Vinilos = (() => {
  const ERAS = [
    { k: '60/70', c: '#8d6e63', disc: ['Almendra','Manal','Los Gatos','Pescado Rabioso','Sui Generis','Vox Dei'] },
    { k: '80/90', c: '#e91e63', disc: ['Soda Stereo','Charly García','Sumo','Virus','Los Redondos','Fito Páez'] },
    { k: '2000/HOY', c: '#26c6da', disc: ['Babasónicos','Bizarrap','Wos','Tan Biónica','Airbag','El Mató'] },
  ];

  function wrap(ctx, text, maxW) {
    const words = text.split(' '), lines = []; let cur = '';
    for (const w of words) { const t = cur ? cur+' '+w : w; if (((ctx.measureText(t)||{}).width||0) > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
    if (cur) lines.push(cur); return lines;
  }

  function create(ctx) {
    const P = (ctx && ctx.player) || { coins: 0 };
    const L = 50, R = 750, T = 78, B = 408;
    const bins = ERAS.map((e, i) => ({ era: i, cx: 280 + i*190, cy: 175, w: 150, h: 86 }));
    const counter = { cx: 140, cy: 330, w: 150, h: 40 };  // mostrador cerca de la entrada
    const punk = { x: 140, y: 312 };
    const exit = { x: 700, y: B - 6 };
    const player = { x: 430, y: B - 40, r: 12 };
    let done = false, msg = '', msgT = 0, prompt = '', eHeld = false;
    setMsg('Disquería: 3 góndolas por época. [E] revisar vinilos / hablar con el punk. ESC: salir.', 6);

    function setMsg(t, s = 3.5) { msg = t; msgT = s; }
    function inRect(x, y, r) { return x > r.cx-r.w/2-player.r && x < r.cx+r.w/2+player.r && y > r.cy-r.h/2-player.r && y < r.cy+r.h/2+player.r; }
    function blocked(x, y) { if (x < L+player.r || x > R-player.r || y < T+player.r || y > B-player.r) return true; for (const b of bins) if (inRect(x, y, b)) return true; if (inRect(x, y, counter)) return true; return false; }
    function nearBin() { for (const b of bins) if (Math.hypot(player.x-b.cx, player.y-(b.cy+b.h/2+18)) < 70 || (Math.abs(player.x-b.cx) < b.w/2+20 && Math.abs(player.y-b.cy) < b.h/2+50)) return b; return null; }
    const nearPunk = () => Math.hypot(player.x-punk.x, player.y-punk.y) < 125;
    function interact() {
      const b = nearBin();
      if (b) { const e = ERAS[b.era]; setMsg('🎵 Revolvés los vinilos de ' + e.k + ': encontrás un ' + e.disc[(Math.random()*e.disc.length)|0] + '. (compráselo al punk en el mostrador)'); return; }
      if (nearPunk()) {
        if (P.coins < 8) { setMsg('Punk: “God Save the Queen... pero sin guita no hay vinilo, hermano.” (8 monedas) 🎸'); return; }
        P.coins -= 8;
        if (!P.hasCementoTicket) {
          P.hasCementoTicket = true;
          setMsg('Comprás un disco de ALMAFUERTE 🤘. Punk: “Mirá loco, tocan en CEMENTO, te regalo una entrada. Yo no puedo ir, me tengo que hacer un estudio de hígado... la Diosa Tropical me lo comió entero.” 🎫', 9);
        } else setMsg('Comprás otro vinilo de metal argentino. 🤘 “Aguante, pibe.”');
        return;
      }
      setMsg('Acercate a una góndola o al mostrador (punk) y apretá E.');
    }

    return {
      get done() { return done; },
      update(dt) {
        msgT -= dt;
        const sp = 165*dt;
        if (Input.keys['arrowleft'] || Input.keys['a']) { if (!blocked(player.x-sp, player.y)) player.x -= sp; }
        if (Input.keys['arrowright'] || Input.keys['d']) { if (!blocked(player.x+sp, player.y)) player.x += sp; }
        if (Input.keys['arrowup'] || Input.keys['w']) { if (!blocked(player.x, player.y-sp)) player.y -= sp; }
        if (Input.keys['arrowdown'] || Input.keys['s']) { if (!blocked(player.x, player.y+sp)) player.y += sp; }
        if (Input.keys['escape']) { done = true; return; }
        if (Input.keys['e']) { if (!eHeld) { eHeld = true; interact(); } } else eHeld = false;
        if (Math.abs(player.x-exit.x) < 28 && player.y > B-26) done = true;
        const b = nearBin();
        prompt = b ? ('🎵 Góndola ' + ERAS[b.era].k + ' — [E] revisar') : nearPunk() ? '🎸 Punk del mostrador — [E] hablar' : (Math.abs(player.x-exit.x)<40 && player.y>B-50 ? '↓ Salida' : '');
      },
      draw(ctx, VW, VH) {
        ctx.fillStyle = '#161019'; ctx.fillRect(0, 0, VW, VH);
        ctx.fillStyle = '#241a2a'; ctx.fillRect(L, T, R-L, B-T);
        // baldosas tipo damero
        for (let y = T; y < B; y += 36) for (let x = L; x < R; x += 36) { ctx.fillStyle = (((x+y)/36)|0)%2 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.06)'; ctx.fillRect(x, y, 36, 36); }
        // afiches en la pared
        ctx.fillStyle = '#7CFC00'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left'; ctx.fillText('★ DISQUERÍA SUBTERRÁNEA ★  vinilos · cassettes · CDs', L+8, T+16);
        // góndolas (cajones de vinilos)
        for (const b of bins) {
          const e = ERAS[b.era];
          ctx.fillStyle = '#3a2a20'; ctx.fillRect(b.cx-b.w/2, b.cy-b.h/2, b.w, b.h);
          ctx.fillStyle = '#231811'; ctx.fillRect(b.cx-b.w/2, b.cy-b.h/2, b.w, 6);
          for (let i = 0; i < 10; i++) { ctx.fillStyle = i%2 ? e.c : '#111'; ctx.fillRect(b.cx-b.w/2+8+i*((b.w-16)/10), b.cy-b.h/2+12, (b.w-16)/10-2, b.h-20); }
          ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(b.cx-34, b.cy+b.h/2+2, 68, 16);
          ctx.fillStyle = e.c; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center'; ctx.fillText(e.k, b.cx, b.cy+b.h/2+14);
        }
        // mostrador + punk
        ctx.fillStyle = '#2a2230'; ctx.fillRect(counter.cx-counter.w/2, counter.cy-counter.h/2, counter.w, counter.h);
        ctx.fillStyle = '#e0b088'; ctx.beginPath(); ctx.arc(punk.x, punk.y, 9, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#e91e63'; ctx.fillRect(punk.x-9, punk.y-16, 18, 5); // cresta
        for (let i=-2;i<=2;i++){ ctx.fillStyle='#e91e63'; ctx.fillRect(punk.x+i*4-1, punk.y-22, 2, 7); }
        ctx.fillStyle = '#111'; ctx.fillRect(punk.x-10, punk.y+6, 20, 12);
        ctx.fillStyle = '#ffe14d'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center'; ctx.fillText('♪ God Save the Queen ♪', punk.x, punk.y-30 + Math.sin(Date.now()/250)*2);
        // salida
        ctx.fillStyle = '#2e7d32'; ctx.fillRect(exit.x-22, B-10, 44, 14); ctx.fillStyle = '#eaffea'; ctx.font = 'bold 9px monospace'; ctx.fillText('SALIDA ↑', exit.x, B);
        // jugador
        ctx.fillStyle = '#36567f'; ctx.beginPath(); ctx.arc(player.x, player.y, player.r, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#d9a878'; ctx.beginPath(); ctx.arc(player.x, player.y-3, 5, 0, Math.PI*2); ctx.fill();
        // barras
        ctx.fillStyle = '#0a0c12'; ctx.fillRect(0, 0, VW, 26);
        ctx.fillStyle = '#e0b0ff'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'left'; ctx.fillText('DISQUERÍA  🎵 80s chiptune sonando', 10, 18);
        if (prompt) { ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(0, 26, VW, 20); ctx.fillStyle = '#ffe14d'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center'; ctx.fillText(prompt, VW/2, 41); }
        if (msgT > 0) {
          ctx.font = '13px monospace'; ctx.textAlign = 'center';
          const lines = wrap(ctx, msg, VW-44), lh = 16, boxH = lines.length*lh + 8;
          ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, VH-boxH, VW, boxH);
          ctx.fillStyle = '#dff3d0'; lines.forEach((ln, i) => ctx.fillText(ln, VW/2, VH-boxH+14+i*lh));
        }
      },
    };
  }
  return { create };
})();
