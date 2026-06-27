// tienda.js — SUB-MODO "entrás a la tienda" (galería de la cueva). Le hablás a un local raro (sex-shop, comida
// rara, masajes, tenebroso) → entrás a un INTERIOR generado por NivelAI.generateShop(rubro): vista de arriba,
// clientela que chusmea, y MERCADERÍA (wares) que te acercás y comprás. Sin meta, sin combate, sin tormenta.
// Contenido y aislado (como arcade/super/vinilos/spinoff): salir restaura el juego exacto. Ver specs/tiendas-generadas.md.
const Tienda = (() => {
  const T = (k, p) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(k, p) : k;
  const CS = 30;

  // crea el sub-modo. scene = NivelAI.generateShop(...). ctx.player = el jugador REAL (para cobrar/dar).
  function create(scene, ctx) {
    const P = ctx.player, W = scene.W, H = scene.H;
    const map = Array.from({ length: H }, () => new Array(W).fill(0));
    for (let x = 0; x < W; x++) { map[0][x] = 1; map[H - 1][x] = 1; }
    for (let y = 0; y < H; y++) { map[y][0] = 1; map[y][W - 1] = 1; }
    const pal = scene.palette || { floor: '#222', floor2: '#2a2a2a', wall: '#555', accent: '#ffd54f' };
    const player = { x: (scene.exit.x + 0.5) * CS, y: (scene.exit.y + 0.5) * CS, r: 11 };
    // buyHeld arranca en TRUE: entrás parado SOBRE la baldosa de salida y el E con el que entraste sigue apretado;
    // sin esto, el 1er frame lo leería y te sacaría al toque (done=true). Hay que SOLTAR E y volver a apretarlo.
    let done = false, exitTo = null, msg = '', msgT = 0, prompt = '', escHeld = false, buyHeld = true, t = 0, leaving = 0;
    setMsg(scene.intro || '', 6);

    function setMsg(s, dur = 3) { msg = s; msgT = dur; }
    function solid(px, py) { const tx = Math.floor(px / CS), ty = Math.floor(py / CS); if (tx < 0 || ty < 0 || tx >= W || ty >= H) return true; return map[ty][tx] === 1; }
    function freeAt(x, y) { const r = player.r; return !solid(x - r, y - r) && !solid(x + r, y - r) && !solid(x - r, y + r) && !solid(x + r, y + r); }
    function nearTile(c) { return Math.hypot(player.x - (c.x + 0.5) * CS, player.y - (c.y + 0.5) * CS) < CS * 1.15; }
    const has = (pay, cost) => (pay === 'caramelos' ? (P.caramelos || 0) : (P.coins || 0)) >= cost;
    function buy(w) {
      if (w.taken) { setMsg(T('g.tienda.sold'), 2); return; }
      if (!has(w.pay, w.cost)) { setMsg(T(w.pay === 'caramelos' ? 'g.tienda.noCandy' : 'g.tienda.noCoins'), 2.5); return; }
      if (w.pay === 'caramelos') P.caramelos -= w.cost; else P.coins -= w.cost;
      const g = w.give || {};
      if (g.item === 'health') P.hp = Math.min((ctx.maxHp || 100), P.hp + (g.amount || 0));
      else if (g.item === 'ammo') P.ammo += (g.amount || 0);
      else if (g.item === 'coins') P.coins += (g.amount || 0);
      else if (g.item === 'caramelos') P.caramelos = (P.caramelos || 0) + (g.amount || 0);
      else if (g.item === 'mystery') { const r = Math.random(); if (r < 0.5) { P.coins += 25; } else if (r < 0.8) { P.ammo += 20; } else { P.hp = Math.min((ctx.maxHp || 100), P.hp + 30); } }
      w.taken = true;
      if (typeof Sfx !== 'undefined') Sfx.pickup && Sfx.pickup();
      setMsg(T('g.tienda.bought', { label: w.label }), 3);
    }

    return {
      get done() { return done; }, get exitTo() { return exitTo; }, __scene: () => scene, __buy: i => buy(scene.wares[i]),
      update(dt) {
        t += dt; msgT -= dt;
        if (done) return;
        const sp = 165 * dt;
        if (Input.keys['arrowleft'] || Input.keys['a']) { if (freeAt(player.x - sp, player.y)) player.x -= sp; }
        if (Input.keys['arrowright'] || Input.keys['d']) { if (freeAt(player.x + sp, player.y)) player.x += sp; }
        if (Input.keys['arrowup'] || Input.keys['w']) { if (freeAt(player.x, player.y - sp)) player.y -= sp; }
        if (Input.keys['arrowdown'] || Input.keys['s']) { if (freeAt(player.x, player.y + sp)) player.y += sp; }
        if (Input.keys['escape']) { if (!escHeld) { escHeld = true; done = true; exitTo = 'back'; return; } } else escHeld = false;
        // clientela: globito rotando
        for (const n of scene.npcs) { n.sayT -= dt; if (n.sayT <= 0) { n.say = n.lines[(Math.random() * n.lines.length) | 0]; n.sayT = 1.8 + Math.random() * 1.6; } }
        // ware más cercano → prompt + comprar con E/Espacio
        let near = null;
        for (const w of scene.wares) if (nearTile(w)) { near = w; break; }
        const onExit = nearTile(scene.exit);
        if (near && !near.taken) prompt = T('g.tienda.buyPrompt', { label: near.label, cost: near.cost, pay: T('g.tienda.pay.' + near.pay) });
        else if (near && near.taken) prompt = T('g.tienda.sold');
        else if (onExit) prompt = T('g.tienda.exitPrompt');
        else prompt = '';
        const press = Input.keys['e'] || Input.keys[' '] || Input.keys['enter'];
        if (press) { if (!buyHeld) { buyHeld = true; if (near && !near.taken) buy(near); else if (onExit) { done = true; exitTo = 'back'; } } } else buyHeld = false;
      },
      draw(ctx2, VW, VH) {
        const ox = (VW - W * CS) / 2, oy = 34;
        ctx2.fillStyle = '#0a0b10'; ctx2.fillRect(0, 0, VW, VH);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const px = ox + x * CS, py = oy + y * CS;
          if (map[y][x] === 1) { ctx2.fillStyle = pal.wall; ctx2.fillRect(px, py, CS, CS); ctx2.fillStyle = 'rgba(0,0,0,0.18)'; ctx2.fillRect(px, py + CS - 4, CS, 4); }
          else { ctx2.fillStyle = ((x + y) % 2) ? pal.floor : pal.floor2; ctx2.fillRect(px, py, CS, CS); }
        }
        // props ambiente
        ctx2.textAlign = 'center'; ctx2.font = '17px serif';
        for (const p of scene.props) ctx2.fillText(p.emoji, ox + (p.x + 0.5) * CS, oy + (p.y + 0.72) * CS);
        // SALIDA (cortina)
        const ex = ox + (scene.exit.x + 0.5) * CS, ey = oy + (scene.exit.y + 0.5) * CS;
        ctx2.fillStyle = pal.accent; ctx2.globalAlpha = 0.5; ctx2.fillRect(ex - 13, ey - 14, 26, 28); ctx2.globalAlpha = 1;
        ctx2.fillStyle = '#0a0b10'; ctx2.font = 'bold 14px serif'; ctx2.fillText('🚪', ex, ey + 6);
        // wares (mercadería): emoji + precio, atenuado si ya lo compraste
        for (const w of scene.wares) {
          const wx = ox + (w.x + 0.5) * CS, wy = oy + (w.y + 0.5) * CS;
          ctx2.globalAlpha = w.taken ? 0.3 : 1; ctx2.font = '19px serif'; ctx2.fillText(w.emoji, wx, wy + 6);
          if (!w.taken) { ctx2.font = 'bold 8px monospace'; ctx2.fillStyle = pal.accent; ctx2.fillText(w.cost + (w.pay === 'caramelos' ? '🍬' : '🪙'), wx, wy + 17); }
          ctx2.globalAlpha = 1;
        }
        // clientela + globitos
        ctx2.font = '18px serif';
        for (const n of scene.npcs) {
          const nx = ox + (n.x + 0.5) * CS, ny = oy + (n.y + 0.72) * CS;
          ctx2.fillText(n.emoji, nx, ny);
          if (n.say) {
            ctx2.font = 'bold 9px monospace';
            const tw = Math.min((ctx2.measureText(n.say).width || 0) + 10, 160), bx = Math.max(2, Math.min(VW - tw - 2, nx - tw / 2)), by = ny - 34;
            ctx2.fillStyle = 'rgba(255,255,255,0.95)'; ctx2.fillRect(bx, by, tw, 15);
            ctx2.fillStyle = '#222'; ctx2.textAlign = 'center'; ctx2.fillText(n.say, bx + tw / 2, by + 10);
            ctx2.font = '18px serif';
          }
        }
        // jugador
        ctx2.fillStyle = '#36567f'; ctx2.beginPath(); ctx2.arc(ox + player.x, oy + player.y, player.r, 0, Math.PI * 2); ctx2.fill();
        ctx2.fillStyle = '#d9a878'; ctx2.beginPath(); ctx2.arc(ox + player.x, oy + player.y - 3, 5, 0, Math.PI * 2); ctx2.fill();
        // barra superior: NOMBRE de la tienda + guita
        ctx2.fillStyle = '#0a0c12'; ctx2.fillRect(0, 0, VW, 30);
        ctx2.fillStyle = pal.accent; ctx2.font = 'bold 12px monospace'; ctx2.textAlign = 'left'; ctx2.fillText(scene.motif + ' ' + scene.name, 10, 20);
        ctx2.fillStyle = '#ffd54f'; ctx2.textAlign = 'right'; ctx2.font = '10px monospace'; ctx2.fillText('🪙' + (P.coins | 0) + '  🍬' + (P.caramelos | 0), VW - 10, 20);
        // mensaje
        let bottom = VH;
        if (msgT > 0 && msg) {
          ctx2.font = '13px monospace'; ctx2.textAlign = 'center';
          const words = msg.split(' '), lines = []; let cur = '';
          for (const w of words) { const cand = cur ? cur + ' ' + w : w; if (((ctx2.measureText(cand) || {}).width || 0) > VW - 44 && cur) { lines.push(cur); cur = w; } else cur = cand; }
          if (cur) lines.push(cur);
          const lh = 16, boxH = lines.length * lh + 8;
          ctx2.fillStyle = 'rgba(0,0,0,0.85)'; ctx2.fillRect(0, VH - boxH, VW, boxH);
          ctx2.fillStyle = '#dff3d0'; lines.forEach((ln, i) => ctx2.fillText(ln, VW / 2, VH - boxH + 14 + i * lh));
          bottom = VH - boxH;
        }
        if (prompt) { ctx2.font = 'bold 13px monospace'; ctx2.textAlign = 'center'; ctx2.fillStyle = 'rgba(0,0,0,0.78)'; ctx2.fillRect(0, bottom - 22, VW, 22); ctx2.fillStyle = pal.accent; ctx2.fillText(prompt, VW / 2, bottom - 7); }
      },
    };
  }
  return { create };
})();
if (typeof window !== 'undefined') window.Tienda = Tienda;
if (typeof module !== 'undefined') module.exports = Tienda;
