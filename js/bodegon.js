// bodegon.js — SUB-MODO "el bodegón" VISTA DE ARRIBA (multijugador F2, specs/multijugador.md §3.2.3 T2). Rehace la
// sala compartida como top-down: MESAS con los jugadores ONLINE sentados (presencia via Salon.getPeers), un MOSTRADOR
// con la RUBIA (moza) que te invita al telo, y una salida. Mismo patrón aislado que tienda.js/telo.js. Los emotes
// (1-4) y frases preset (5-8) van por el salón (Salon.pos/say). El chat privado 1-a-1 in-submodo = T2b (deuda).
// Degradación: sin Salon/red, es un bar con mozos canned, jugable solo (nadie nota).
const Bodegon = (() => {
  const T = (k, p) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(k, p) : k;
  const CS = 30, W = 18, H = 12;
  const EMOTES = ['', '🍻', '🤝', '💃', '🎸'];

  function create() {
    const map = Array.from({ length: H }, () => new Array(W).fill(0));
    for (let x = 0; x < W; x++) { map[0][x] = 1; map[H - 1][x] = 1; }
    for (let y = 0; y < H; y++) { map[y][0] = 1; map[y][W - 1] = 1; }
    for (let x = 2; x < W - 2; x++) map[1][x] = 1;   // MOSTRADOR (pared baja arriba)
    const pal = { floor: '#2a1d12', floor2: '#33241a', wall: '#5a3a22', accent: '#ffcf6e' };
    // MESAS (centro en tiles) + sus ASIENTOS (offsets). Cada peer online se sienta en un asiento libre.
    const TABLES = [{ x: 4, y: 5 }, { x: 9, y: 5 }, { x: 14, y: 5 }, { x: 6, y: 9 }, { x: 12, y: 9 }];
    const SEAToff = [[-1.1, 0], [1.1, 0], [0, -1.1]];
    const seats = []; for (const tb of TABLES) for (const o of SEAToff) seats.push({ x: tb.x + o[0], y: tb.y + o[1] });
    const rubia = { x: 9, y: 1 };   // moza en el mostrador
    const exit = { x: 9, y: 10 };
    const player = { x: (exit.x + 0.5) * CS, y: (exit.y - 0.2) * CS, r: 11 };
    let done = false, exitTo = null, goTelo = false, msg = '', msgT = 0, prompt = '', t = 0, escHeld = false, eHeld = true, numHeld = {}, hbT = 0, mozaInv = false;
    let myEmote = 0, myEmoteT = 0, mySay = -1, mySayT = 0;
    setMsg(T('g.bodegon.topIntro'), 6);

    function setMsg(s, dur = 4) { msg = s; msgT = dur; }
    function solid(px, py) { const tx = Math.floor(px / CS), ty = Math.floor(py / CS); if (tx < 0 || ty < 0 || tx >= W || ty >= H) return true; return map[ty][tx] === 1; }
    function freeAt(x, y) { const r = player.r; return !solid(x - r, y - r) && !solid(x + r, y - r) && !solid(x - r, y + r) && !solid(x + r, y + r); }
    const nearTile = (c, d) => Math.hypot(player.x - (c.x + 0.5) * CS, player.y - (c.y + 0.5) * CS) < CS * (d || 1.2);
    const peersMap = () => (typeof Salon !== 'undefined' && Salon.getPeers) ? Salon.getPeers() : null;
    function emote(i) { myEmote = i; myEmoteT = t; if (typeof Salon !== 'undefined' && Salon.pos) Salon.pos(11, 0, i); Sfx.pickup && Sfx.pickup(); }
    function phrase(i) { mySay = i; mySayT = t; if (typeof Salon !== 'undefined' && Salon.say) Salon.say(i); Sfx.pickup && Sfx.pickup(); }

    function update(dt) {
      t += dt; msgT -= dt; hbT -= dt;
      if (done) return;
      if (hbT <= 0) { hbT = 4; if (typeof Salon !== 'undefined' && Salon.pos) Salon.pos(11, 0); }   // latido (que no me poden)
      const sp = 168 * dt;
      if (Input.keys['arrowleft'] || Input.keys['a']) { if (freeAt(player.x - sp, player.y)) player.x -= sp; }
      if (Input.keys['arrowright'] || Input.keys['d']) { if (freeAt(player.x + sp, player.y)) player.x += sp; }
      if (Input.keys['arrowup'] || Input.keys['w']) { if (freeAt(player.x, player.y - sp)) player.y -= sp; }
      if (Input.keys['arrowdown'] || Input.keys['s']) { if (freeAt(player.x, player.y + sp)) player.y += sp; }
      // emotes (1-4) / frases preset (5-8)
      for (let n = 1; n <= 8; n++) { const k = String(n); if (Input.keys[k]) { if (!numHeld[k]) { numHeld[k] = true; if (n <= 4) emote(n); else phrase(n - 5); } } else numHeld[k] = false; }
      if (Input.keys['escape']) { if (!escHeld) { escHeld = true; done = true; exitTo = 'cine8'; return; } } else escHeld = false;
      // interacción: rubia (mostrador) o salida
      const atRubia = nearTile(rubia, 1.4), atExit = nearTile(exit, 1.2);
      prompt = atRubia ? T(mozaInv ? 'g.bodegon.mozaYes' : 'g.bodegon.mozaTalk') : atExit ? T('g.bodegon.exitPrompt') : '';
      const press = Input.keys['e'] || Input.keys[' '] || Input.keys['enter'];
      if (press && !eHeld) {
        eHeld = true;
        if (atRubia) { if (!mozaInv) { mozaInv = true; setMsg(T('g.moza.invite'), 6); } else { done = true; goTelo = true; } }
        else if (atExit) { done = true; exitTo = 'cine8'; }
      } else if (!press) eHeld = false;
    }

    function bubble(ctx2, sx, sy, txt) {
      ctx2.font = '9px monospace'; const w = Math.min(150, ctx2.measureText(txt).width + 10);
      ctx2.fillStyle = 'rgba(20,16,10,0.92)'; ctx2.fillRect(sx - w / 2, sy - 14, w, 13);
      ctx2.fillStyle = '#ffe2a8'; ctx2.textAlign = 'center'; ctx2.textBaseline = 'middle'; ctx2.fillText(txt, sx, sy - 7); ctx2.textBaseline = 'alphabetic';
    }
    // em = índice de emote (o 0); emShow/sayShow = booleanos ya calculados por el caller (evita mezclar ms/seg)
    function figure(ctx2, sx, sy, col, nick, em, emShow, say, sayShow) {
      ctx2.fillStyle = 'rgba(0,0,0,0.28)'; ctx2.beginPath(); ctx2.ellipse(sx, sy + 9, 9, 3, 0, 0, Math.PI * 2); ctx2.fill();
      ctx2.fillStyle = col; ctx2.beginPath(); ctx2.arc(sx, sy, 9, 0, Math.PI * 2); ctx2.fill();
      ctx2.fillStyle = '#d9a878'; ctx2.beginPath(); ctx2.arc(sx, sy - 3, 4, 0, Math.PI * 2); ctx2.fill();
      if (nick) { ctx2.fillStyle = '#ffe2a8'; ctx2.font = '8px monospace'; ctx2.textAlign = 'center'; ctx2.fillText(nick, sx, sy - 14); }
      if (em && emShow) { ctx2.font = '15px serif'; ctx2.textAlign = 'center'; ctx2.fillText(EMOTES[em] || '', sx, sy - 22); }
      if (sayShow && say != null && say >= 0) bubble(ctx2, sx, sy - 22, T('g.bodegon.phrase.' + say));
    }

    function draw(ctx2, VW, VH) {
      const ox = (VW - W * CS) / 2, oy = 34;
      ctx2.fillStyle = '#0a0710'; ctx2.fillRect(0, 0, VW, VH);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const px = ox + x * CS, py = oy + y * CS;
        if (map[y][x] === 1) { ctx2.fillStyle = pal.wall; ctx2.fillRect(px, py, CS, CS); ctx2.fillStyle = 'rgba(0,0,0,0.18)'; ctx2.fillRect(px, py + CS - 4, CS, 4); }
        else { ctx2.fillStyle = ((x + y) % 2) ? pal.floor : pal.floor2; ctx2.fillRect(px, py, CS, CS); }
      }
      // MESAS (madera) con mantel + birra
      for (const tb of TABLES) {
        const mx = ox + (tb.x + 0.5) * CS, my = oy + (tb.y + 0.5) * CS;
        ctx2.fillStyle = '#6b4a2a'; ctx2.beginPath(); ctx2.arc(mx, my, CS * 0.7, 0, Math.PI * 2); ctx2.fill();
        ctx2.fillStyle = '#8a6a44'; ctx2.beginPath(); ctx2.arc(mx, my, CS * 0.5, 0, Math.PI * 2); ctx2.fill();
        ctx2.font = '12px serif'; ctx2.textAlign = 'center'; ctx2.fillText('🍻', mx, my + 4);
      }
      // MOSTRADOR + la RUBIA
      ctx2.font = '20px serif'; ctx2.textAlign = 'center';
      ctx2.fillText('💁‍♀️', ox + (rubia.x + 0.5) * CS, oy + (rubia.y + 0.85) * CS);
      ctx2.font = '8px monospace'; ctx2.fillStyle = '#ff8fc8'; ctx2.fillText(T('g.bodegon.rubiaName'), ox + (rubia.x + 0.5) * CS, oy + (rubia.y + 0.1) * CS);
      // PUERTA al telo (al lado de la rubia) + SALIDA
      ctx2.font = '15px serif'; ctx2.fillStyle = '#fff'; ctx2.fillText('🚪', ox + (rubia.x + 2.5) * CS, oy + (rubia.y + 0.85) * CS);
      const exx = ox + (exit.x + 0.5) * CS, exy = oy + (exit.y + 0.5) * CS;
      ctx2.fillStyle = pal.accent; ctx2.globalAlpha = 0.4; ctx2.fillRect(exx - 13, exy - 14, 26, 28); ctx2.globalAlpha = 1;
      ctx2.font = 'bold 13px serif'; ctx2.fillText('🪜', exx, exy + 5);
      // PEERS online sentados (presencia)
      const pm = peersMap(); let i = 0, count = 0, now = Date.now();
      if (pm) for (const p of pm.values()) { const s = seats[i % seats.length]; i++; count++;
        figure(ctx2, ox + (s.x + 0.5) * CS, oy + (s.y + 0.5) * CS, '#5a7a9a', p.nick || T('g.bodegon.someone'),
          p.emote, now - (p.emoteT || 0) < 2500, p.say, now - (p.sayT || 0) < 4000); }
      // YO (te movés libre)
      figure(ctx2, ox + player.x, oy + player.y, '#36567f', T('g.bodegon.you'), myEmote, t - myEmoteT < 2.5, mySay, t - mySayT < 4);
      // barra superior: nombre + cuántos online
      ctx2.fillStyle = '#0a0712'; ctx2.fillRect(0, 0, VW, 30);
      ctx2.fillStyle = pal.accent; ctx2.font = 'bold 12px monospace'; ctx2.textAlign = 'left'; ctx2.fillText('🍻 ' + T('g.bodegon.topTitle'), 10, 20);
      ctx2.textAlign = 'right'; ctx2.fillStyle = '#9be8a0'; ctx2.font = '10px monospace';
      ctx2.fillText(T('g.bodegon.online', { n: count }) + '  ·  1-4 😀 5-8 💬', VW - 10, 20);
      // mensaje / prompt
      let bottom = VH;
      if (msgT > 0 && msg) {
        ctx2.font = '12px monospace'; ctx2.textAlign = 'center';
        const words = msg.split(' '), lines = []; let cur = '';
        for (const w of words) { const cand = cur ? cur + ' ' + w : w; if (((ctx2.measureText(cand) || {}).width || 0) > VW - 44 && cur) { lines.push(cur); cur = w; } else cur = cand; }
        if (cur) lines.push(cur);
        const lh = 15, boxH = lines.length * lh + 8;
        ctx2.fillStyle = 'rgba(0,0,0,0.85)'; ctx2.fillRect(0, VH - boxH, VW, boxH);
        ctx2.fillStyle = '#ffd9ea'; lines.forEach((ln, k) => ctx2.fillText(ln, VW / 2, VH - boxH + 14 + k * lh));
        bottom = VH - boxH;
      }
      if (prompt) { ctx2.font = 'bold 12px monospace'; ctx2.textAlign = 'center'; ctx2.fillStyle = 'rgba(0,0,0,0.78)'; ctx2.fillRect(0, bottom - 22, VW, 22); ctx2.fillStyle = pal.accent; ctx2.fillText(prompt, VW / 2, bottom - 7); }
    }

    return { get done() { return done; }, get exitTo() { return exitTo; }, get goTelo() { return goTelo; }, update, draw };
  }
  return { create };
})();
if (typeof window !== 'undefined') window.Bodegon = Bodegon;
if (typeof module !== 'undefined') module.exports = Bodegon;
