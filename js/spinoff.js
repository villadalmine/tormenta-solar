// spinoff.js — SUB-MODO que corre una escena generada por NivelAI (la "máquina de hacer chorizos").
// Vista de arriba explorable (mismo estilo que super.js): caminás, los NPCs tiran globitos temáticos, y
// llegás a la META (portal) para volver al chino con un souvenir. Contenido y aislado del motor principal
// (no toca quests/tormenta/save), igual que arcade/super/vinilos. Se dispara desde game.js al colarte a la
// trastienda del chino en el RAID. Ver specs/fabrica-niveles-ai.md.
const Spinoff = (() => {
  const T = (k, p) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(k, p) : k;
  const CS = 30;

  function create(scene) {
    const W = scene.W, H = scene.H;
    const map = Array.from({ length: H }, () => new Array(W).fill(0));
    for (let x = 0; x < W; x++) { map[0][x] = 1; map[H - 1][x] = 1; }
    for (let y = 0; y < H; y++) { map[y][0] = 1; map[y][W - 1] = 1; }
    const pal = scene.palette || { floor: '#222', floor2: '#2a2a2a', wall: '#555', accent: '#ffd54f' };
    const player = { x: 2.5 * CS, y: (H - 2.5) * CS, r: 11 };
    let done = false, exitTo = null, msg = '', msgT = 0, prompt = '', escHeld = false, reached = false, t = 0;
    setMsg(scene.intro || '', 6);

    function setMsg(s, dur = 3.5) { msg = s; msgT = dur; }
    function solid(px, py) { const tx = Math.floor(px / CS), ty = Math.floor(py / CS); if (tx < 0 || ty < 0 || tx >= W || ty >= H) return true; return map[ty][tx] === 1; }
    function freeAt(x, y) { const r = player.r; return !solid(x - r, y - r) && !solid(x + r, y - r) && !solid(x - r, y + r) && !solid(x + r, y + r); }
    function nearTile(c) { return Math.hypot(player.x - (c.x + 0.5) * CS, player.y - (c.y + 0.5) * CS) < CS * 1.2; }

    function reachGoal() {
      if (reached) return; reached = true;
      const rw = scene.reward || {};
      // el souvenir entra al inventario real (P se setea desde game.js vía ctx). Reward simple (caramelos/coins).
      if (Spinoff._reward) Spinoff._reward(rw);
      setMsg(T('g.nivelai.win', { name: scene.name, reward: (rw.caramelos ? rw.caramelos + ' 🍬' : (rw.coins || 0) + ' 🪙') }), 5);
      done = true; exitTo = 'back';
    }

    return {
      get done() { return done; }, get exitTo() { return exitTo; },
      __scene: () => scene, __reach: () => reachGoal(),
      update(dt) {
        t += dt; msgT -= dt;
        if (reached) return;
        const sp = 165 * dt;
        if (Input.keys['arrowleft'] || Input.keys['a']) { if (freeAt(player.x - sp, player.y)) player.x -= sp; }
        if (Input.keys['arrowright'] || Input.keys['d']) { if (freeAt(player.x + sp, player.y)) player.x += sp; }
        if (Input.keys['arrowup'] || Input.keys['w']) { if (freeAt(player.x, player.y - sp)) player.y -= sp; }
        if (Input.keys['arrowdown'] || Input.keys['s']) { if (freeAt(player.x, player.y + sp)) player.y += sp; }
        if (Input.keys['escape']) { if (!escHeld) { escHeld = true; done = true; exitTo = 'back'; setMsg(T('g.nivelai.flee'), 2); return; } } else escHeld = false;
        // NPCs: globito temático rotando
        for (const n of scene.npcs) { n.sayT -= dt; if (n.sayT <= 0) { n.say = n.lines[(Math.random() * n.lines.length) | 0]; n.sayT = 1.8 + Math.random() * 1.6; } }
        if (nearTile(scene.goal)) reachGoal();
        prompt = nearTile(scene.goal) ? T('g.nivelai.goalPrompt', { label: scene.goal.label }) : '';
      },
      draw(ctx, VW, VH) {
        const ox = (VW - W * CS) / 2, oy = 34;
        ctx.fillStyle = '#0a0b10'; ctx.fillRect(0, 0, VW, VH);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const px = ox + x * CS, py = oy + y * CS;
          if (map[y][x] === 1) { ctx.fillStyle = pal.wall; ctx.fillRect(px, py, CS, CS); ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(px, py + CS - 4, CS, 4); }
          else { ctx.fillStyle = ((x + y) % 2) ? pal.floor : pal.floor2; ctx.fillRect(px, py, CS, CS); }
        }
        // props temáticos (emoji); las ANCLAS del relato (A0-DEEP) van más grandes + glow = set-pieces, no decor random
        ctx.textAlign = 'center';
        for (const p of scene.props) {
          const px = ox + (p.x + 0.5) * CS, py = oy + (p.y + 0.7) * CS;
          if (p.anchor) { ctx.save(); ctx.font = '27px serif'; ctx.shadowColor = pal.accent; ctx.shadowBlur = 12; ctx.fillText(p.emoji, px, py); ctx.restore(); }
          else { ctx.font = '17px serif'; ctx.fillText(p.emoji, px, py); }
        }
        // META (portal de salida)
        const gx = ox + (scene.goal.x + 0.5) * CS, gy = oy + (scene.goal.y + 0.5) * CS, pulse = 6 + Math.sin(t * 4) * 3;
        ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(gx, gy, 13, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#0a0b10'; ctx.beginPath(); ctx.arc(gx, gy, pulse, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = pal.accent; ctx.font = 'bold 8px monospace'; ctx.fillText('▶', gx, gy + 3);
        // NPCs + globitos
        ctx.font = '18px serif';
        for (const n of scene.npcs) {
          const nx = ox + (n.x + 0.5) * CS, ny = oy + (n.y + 0.7) * CS;
          ctx.fillText(n.emoji, nx, ny);
          if (n.say) {
            ctx.font = 'bold 9px monospace';
            const tw = Math.min((ctx.measureText(n.say).width || 0) + 10, 160), bx = Math.max(2, Math.min(VW - tw - 2, nx - tw / 2)), by = ny - 34;
            ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fillRect(bx, by, tw, 15);
            ctx.beginPath(); ctx.moveTo(nx - 3, by + 15); ctx.lineTo(nx + 3, by + 15); ctx.lineTo(nx, by + 20); ctx.fill();
            ctx.fillStyle = '#222'; ctx.fillText(n.say, bx + tw / 2, by + 10);
            ctx.font = '18px serif';
          }
        }
        // jugador
        ctx.fillStyle = '#36567f'; ctx.beginPath(); ctx.arc(ox + player.x, oy + player.y, player.r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#d9a878'; ctx.beginPath(); ctx.arc(ox + player.x, oy + player.y - 3, 5, 0, Math.PI * 2); ctx.fill();
        // barra superior con el NOMBRE del nivel generado
        ctx.fillStyle = '#0a0c12'; ctx.fillRect(0, 0, VW, 30);
        ctx.fillStyle = pal.accent; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'left'; ctx.fillText(scene.motif + ' ' + scene.name, 10, 20);
        ctx.fillStyle = '#9fd3ff'; ctx.textAlign = 'right'; ctx.font = '10px monospace'; ctx.fillText(T('g.nivelai.tag'), VW - 10, 20);
        // mensaje abajo
        let bottom = VH;
        if (msgT > 0 && msg) {
          ctx.font = '13px monospace'; ctx.textAlign = 'center';
          const words = msg.split(' '), lines = []; let cur = '';
          for (const w of words) { const cand = cur ? cur + ' ' + w : w; if (((ctx.measureText(cand) || {}).width || 0) > VW - 44 && cur) { lines.push(cur); cur = w; } else cur = cand; }
          if (cur) lines.push(cur);
          const lh = 16, boxH = lines.length * lh + 8;
          ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, VH - boxH, VW, boxH);
          ctx.fillStyle = '#dff3d0'; lines.forEach((ln, i) => ctx.fillText(ln, VW / 2, VH - boxH + 14 + i * lh));
          bottom = VH - boxH;
        }
        if (prompt) { ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(0,0,0,0.78)'; ctx.fillRect(0, bottom - 22, VW, 22); ctx.fillStyle = pal.accent; ctx.fillText(prompt, VW / 2, bottom - 7); }
      },
    };
  }
  return { create };
})();
if (typeof window !== 'undefined') window.Spinoff = Spinoff;
if (typeof module !== 'undefined') module.exports = Spinoff;
