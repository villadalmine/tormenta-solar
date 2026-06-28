// telo.js — SUB-MODO "el telo de lujo" (vista de arriba), gag de la RUBIA del bodegón (specs/multijugador.md §3.2.3).
// Aceptás la invitación de la moza → entrás a una pieza de lujo (jacuzzi, cama, espejos, pósters, una puerta rara).
// Secuencia SCRIPTEADA, insinuada/cómica (vapor + siluetas + corazones, NADA explícito): jacuzzi juntos → ella va a la
// cama → te metés → sale un OSO de 2 metros de la puerta rara y te persigue → te raja de vuelta al bar. Single-player,
// canned. Mismo patrón aislado que tienda.js/super.js: al salir (done) el juego principal queda EXACTO (volvés al bodegón).
const Telo = (() => {
  const T = (k, p) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(k, p) : k;
  const CS = 30, W = 14, H = 10;

  function create() {
    // grilla: paredes en el borde
    const map = Array.from({ length: H }, () => new Array(W).fill(0));
    for (let x = 0; x < W; x++) { map[0][x] = 1; map[H - 1][x] = 1; }
    for (let y = 0; y < H; y++) { map[y][0] = 1; map[y][W - 1] = 1; }
    const pal = { floor: '#2a1622', floor2: '#33182a', wall: '#5a2440', accent: '#ff4d8d' };
    // puntos clave (en tiles)
    const jacuzzi = { x: 4, y: 2 }, bed = { x: 10, y: 6 }, weirdDoor = { x: 12, y: 1 }, exit = { x: 7, y: 8 };
    const mirrors = [{ x: 12, y: 5 }, { x: 12, y: 6.4 }, { x: 12, y: 7.8 }];   // espejos GRANDES pegados a la cama (pared der.)
    const mesita = { x: 8, y: 6 };                                              // mesita de luz al lado de la cama
    const clothesHer = { x: 3, y: 3 };                                         // ropa de ella tirada cerca del jacuzzi
    const clothesYou = { x: 5.3, y: 3 };                                       // la tuya aparece cuando te metés
    const props = [
      { emoji: '🖼️', x: 6, y: 1 }, { emoji: '🖼️', x: 9, y: 1 }, { emoji: '🕯️', x: 11, y: 4 },
      { emoji: '🍾', x: mesita.x, y: mesita.y - 0.35 }, { emoji: '🥂', x: mesita.x + 0.4, y: mesita.y - 0.35 },
      { emoji: '🚪', x: weirdDoor.x, y: weirdDoor.y },
    ];
    const player = { x: (exit.x + 0.5) * CS, y: (exit.y + 0.3) * CS, r: 11 };
    const she = { x: (jacuzzi.x + 1.4) * CS, y: (jacuzzi.y + 0.6) * CS };   // la rubia, arranca al lado del jacuzzi
    const bear = { x: (weirdDoor.x + 0.5) * CS, y: (weirdDoor.y + 0.5) * CS, on: false };
    let phase = 'intro', pt = 0, t = 0, done = false, exitTo = null, msg = '', msgT = 0, prompt = '', escHeld = false, eHeld = true, ejected = false;
    setMsg(T('g.telo.intro'), 6);

    function setMsg(s, dur = 3.5) { msg = s; msgT = dur; }
    function solid(px, py) { const tx = Math.floor(px / CS), ty = Math.floor(py / CS); if (tx < 0 || ty < 0 || tx >= W || ty >= H) return true; return map[ty][tx] === 1; }
    function freeAt(x, y) { const r = player.r; return !solid(x - r, y - r) && !solid(x + r, y - r) && !solid(x - r, y + r) && !solid(x + r, y + r); }
    const nearTile = (c, d) => Math.hypot(player.x - (c.x + 0.5) * CS, player.y - (c.y + 0.5) * CS) < CS * (d || 1.2);
    const frozen = () => phase === 'bath';   // durante el jacuzzi no te movés (cinemática)

    function update(dt) {
      t += dt; pt += dt; msgT -= dt;
      if (done) return;
      // ---- movimiento (salvo en la cinemática del jacuzzi) ----
      if (!frozen()) {
        const sp = 168 * dt;
        if (Input.keys['arrowleft'] || Input.keys['a']) { if (freeAt(player.x - sp, player.y)) player.x -= sp; }
        if (Input.keys['arrowright'] || Input.keys['d']) { if (freeAt(player.x + sp, player.y)) player.x += sp; }
        if (Input.keys['arrowup'] || Input.keys['w']) { if (freeAt(player.x, player.y - sp)) player.y -= sp; }
        if (Input.keys['arrowdown'] || Input.keys['s']) { if (freeAt(player.x, player.y + sp)) player.y += sp; }
      }
      if (Input.keys['escape']) { if (!escHeld) { escHeld = true; done = true; exitTo = 'back'; return; } } else escHeld = false;
      const press = Input.keys['e'] || Input.keys[' '] || Input.keys['enter'];
      const pressed = press && !eHeld; eHeld = press;

      // ---- FSM del gag ----
      if (phase === 'intro') {
        prompt = T('g.telo.toJacuzzi');
        if (nearTile(jacuzzi, 1.3)) { phase = 'bath'; pt = 0; prompt = '';
          she.x = (jacuzzi.x + 0.5) * CS; she.y = (jacuzzi.y + 0.5) * CS;
          player.x = (jacuzzi.x + 0.5) * CS; player.y = (jacuzzi.y + 0.9) * CS;   // los dos en el jacuzzi
          setMsg(T('g.telo.bath'), 5); }
      } else if (phase === 'bath') {
        prompt = '';
        if (pt > 4.5) { phase = 'toBed'; setMsg(T('g.telo.toBedMsg'), 5); }   // ella sale y se va a la cama
      } else if (phase === 'toBed') {
        // la rubia camina hacia la cama
        const bx = (bed.x + 0.5) * CS, by = (bed.y + 0.5) * CS, dx = bx - she.x, dy = by - she.y, d = Math.hypot(dx, dy) || 1;
        if (d > 2) { she.x += (dx / d) * 120 * dt; she.y += (dy / d) * 120 * dt; }
        prompt = T('g.telo.toBed');
        if (nearTile(bed, 1.3)) { phase = 'bear'; pt = 0; bear.on = true; bear.x = (weirdDoor.x + 0.5) * CS; bear.y = (weirdDoor.y + 0.5) * CS;
          setMsg(T('g.telo.bear'), 6); Sfx.hurt && Sfx.hurt(); }
      } else if (phase === 'bear') {
        prompt = T('g.telo.run');
        // el OSO te persigue (acelera con el tiempo)
        const dx = player.x - bear.x, dy = player.y - bear.y, d = Math.hypot(dx, dy) || 1, sp = (95 + pt * 14) * dt;
        bear.x += (dx / d) * sp; bear.y += (dy / d) * sp;
        if (d < 22 || pt > 9) {   // te alcanzó (o se acabó la paciencia) → te raja al bar
          done = true; exitTo = 'back'; ejected = true;
        }
      }
    }

    function draw(ctx2, VW, VH) {
      const ox = (VW - W * CS) / 2, oy = 34;
      ctx2.fillStyle = '#0a0710'; ctx2.fillRect(0, 0, VW, VH);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const px = ox + x * CS, py = oy + y * CS;
        if (map[y][x] === 1) { ctx2.fillStyle = pal.wall; ctx2.fillRect(px, py, CS, CS); ctx2.fillStyle = 'rgba(0,0,0,0.18)'; ctx2.fillRect(px, py + CS - 4, CS, 4); }
        else { ctx2.fillStyle = ((x + y) % 2) ? pal.floor : pal.floor2; ctx2.fillRect(px, py, CS, CS); }
      }
      // JACUZZI (óvalo agua) + CAMA (rectángulo) dibujados, más lindos que un emoji
      const jx = ox + (jacuzzi.x + 0.5) * CS, jy = oy + (jacuzzi.y + 0.5) * CS;
      ctx2.fillStyle = '#1b6ea5'; ctx2.beginPath(); ctx2.ellipse(jx, jy, CS * 0.95, CS * 0.7, 0, 0, Math.PI * 2); ctx2.fill();
      ctx2.fillStyle = '#3aa0d8'; ctx2.beginPath(); ctx2.ellipse(jx, jy, CS * 0.7, CS * 0.48, 0, 0, Math.PI * 2); ctx2.fill();
      const bx = ox + (bed.x + 0.5) * CS, by = oy + (bed.y + 0.5) * CS;
      ctx2.fillStyle = '#b03050'; ctx2.fillRect(bx - CS * 0.9, by - CS * 0.7, CS * 1.8, CS * 1.4);
      ctx2.fillStyle = '#f0e0e6'; ctx2.fillRect(bx - CS * 0.8, by - CS * 0.6, CS * 1.6, CS * 0.5);   // almohadas
      ctx2.fillStyle = '#7a1f3a'; ctx2.fillRect(bx - CS * 0.9, by + CS * 0.3, CS * 1.8, CS * 0.4);   // pie de cama
      // ESPEJOS GRANDES pegados a la cama (marco dorado + reflejo + brillo diagonal)
      for (const m of mirrors) {
        const mx = ox + (m.x + 0.5) * CS, my = oy + (m.y + 0.5) * CS, mw = CS * 0.7, mh = CS * 1.25;
        ctx2.fillStyle = '#caa000'; ctx2.fillRect(mx - mw / 2 - 2, my - mh / 2 - 2, mw + 4, mh + 4);
        const g = ctx2.createLinearGradient ? ctx2.createLinearGradient(mx, my - mh / 2, mx, my + mh / 2) : null;
        if (g) { g.addColorStop(0, '#9fd0e8'); g.addColorStop(1, '#4a6a80'); ctx2.fillStyle = g; } else ctx2.fillStyle = '#7fb0c8';
        ctx2.fillRect(mx - mw / 2, my - mh / 2, mw, mh);
        ctx2.strokeStyle = 'rgba(255,255,255,0.5)'; ctx2.lineWidth = 2; ctx2.beginPath(); ctx2.moveTo(mx - mw / 2 + 3, my + mh / 2 - 5); ctx2.lineTo(mx + mw / 2 - 4, my - mh / 2 + 6); ctx2.stroke();
      }
      // MESITA de luz (madera)
      const tx = ox + (mesita.x + 0.5) * CS, ty = oy + (mesita.y + 0.5) * CS;
      ctx2.fillStyle = '#6b4a2a'; ctx2.fillRect(tx - CS * 0.4, ty - CS * 0.35, CS * 0.8, CS * 0.7);
      ctx2.fillStyle = '#8a6a44'; ctx2.fillRect(tx - CS * 0.34, ty - CS * 0.29, CS * 0.68, CS * 0.2);
      // ROPA tirada en el piso cerca del jacuzzi (la de ella siempre; la TUYA cuando te metés)
      ctx2.textAlign = 'center'; ctx2.font = '14px serif';
      ctx2.fillText('👗', ox + (clothesHer.x + 0.5) * CS, oy + (clothesHer.y + 0.7) * CS);
      ctx2.fillText('👠', ox + (clothesHer.x + 0.9) * CS, oy + (clothesHer.y + 1.0) * CS);
      if (phase !== 'intro') { ctx2.fillText('👕', ox + (clothesYou.x + 0.5) * CS, oy + (clothesYou.y + 0.7) * CS); ctx2.fillText('👖', ox + (clothesYou.x + 0.9) * CS, oy + (clothesYou.y + 1.0) * CS); }
      // props (emoji)
      ctx2.textAlign = 'center'; ctx2.font = '17px serif';
      for (const p of props) ctx2.fillText(p.emoji, ox + (p.x + 0.5) * CS, oy + (p.y + 0.72) * CS);
      // SALIDA
      const exx = ox + (exit.x + 0.5) * CS, exy = oy + (exit.y + 0.5) * CS;
      ctx2.fillStyle = pal.accent; ctx2.globalAlpha = 0.4; ctx2.fillRect(exx - 13, exy - 14, 26, 28); ctx2.globalAlpha = 1;
      ctx2.font = 'bold 14px serif'; ctx2.fillText('🚪', exx, exy + 6);

      // CINEMÁTICA del jacuzzi: vapor + 2 siluetas + corazones (insinuado, cómico, sin nada explícito)
      if (phase === 'bath') {
        ctx2.fillStyle = 'rgba(255,255,255,0.10)';
        for (let i = 0; i < 7; i++) { const a = t * 1.5 + i; ctx2.beginPath(); ctx2.arc(jx + Math.sin(a) * 16, jy - 8 - ((t * 16 + i * 8) % 40), 7 + (i % 3) * 2, 0, Math.PI * 2); ctx2.fill(); }
        ctx2.fillStyle = '#16121a'; // dos siluetas
        ctx2.beginPath(); ctx2.arc(jx - 7, jy - 2, 6, 0, Math.PI * 2); ctx2.fill();
        ctx2.beginPath(); ctx2.arc(jx + 7, jy - 2, 6, 0, Math.PI * 2); ctx2.fill();
        ctx2.fillStyle = '#ff6ec7'; ctx2.font = '13px serif';
        ctx2.fillText('💕', jx, jy - 26 - Math.sin(t * 3) * 4);
      } else {
        // la rubia (fuera de la cinemática); she.x/y están en px (room-local) → sumar el offset ox/oy
        ctx2.font = '18px serif'; ctx2.fillText('💁‍♀️', ox + she.x, oy + she.y);
      }

      // EL PATOVA de 2 metros: figura OSCURA imponente (casco/máscara + ojos rojos brillando) — da miedo, no es tierno
      if (bear.on) {
        const px2 = ox + bear.x, py2 = oy + bear.y, pulse = 0.6 + 0.4 * Math.abs(Math.sin(t * 8));
        ctx2.fillStyle = 'rgba(0,0,0,0.4)'; ctx2.beginPath(); ctx2.ellipse(px2, py2 + 20, 17, 5, 0, 0, Math.PI * 2); ctx2.fill();   // sombra
        ctx2.fillStyle = '#0b0b12'; ctx2.beginPath(); ctx2.moveTo(px2 - 17, py2 - 8); ctx2.lineTo(px2 + 17, py2 - 8); ctx2.lineTo(px2 + 14, py2 + 20); ctx2.lineTo(px2 - 14, py2 + 20); ctx2.closePath(); ctx2.fill();   // capa/cuerpo
        ctx2.fillStyle = '#14141c'; ctx2.fillRect(px2 - 12, py2 - 24, 24, 18);   // torso
        ctx2.fillStyle = '#070709'; ctx2.beginPath(); ctx2.arc(px2, py2 - 30, 11, 0, Math.PI * 2); ctx2.fill();   // casco
        ctx2.fillStyle = '#1c1c26'; ctx2.fillRect(px2 - 9, py2 - 31, 18, 9);   // máscara/visor
        ctx2.save(); ctx2.shadowBlur = 9; ctx2.shadowColor = '#ff0000';   // ojos rojos brillando (pulso)
        ctx2.fillStyle = 'rgba(255,32,32,' + pulse + ')';
        ctx2.beginPath(); ctx2.arc(px2 - 4, py2 - 30, 2.4, 0, Math.PI * 2); ctx2.arc(px2 + 4, py2 - 30, 2.4, 0, Math.PI * 2); ctx2.fill();
        ctx2.restore();
      }
      // jugador (círculo) — salvo en el jacuzzi (ahí es una silueta)
      if (phase !== 'bath') {
        ctx2.fillStyle = '#36567f'; ctx2.beginPath(); ctx2.arc(ox + player.x, oy + player.y, player.r, 0, Math.PI * 2); ctx2.fill();
        ctx2.fillStyle = '#d9a878'; ctx2.beginPath(); ctx2.arc(ox + player.x, oy + player.y - 3, 5, 0, Math.PI * 2); ctx2.fill();
      }
      // barra superior
      ctx2.fillStyle = '#0a0712'; ctx2.fillRect(0, 0, VW, 30);
      ctx2.fillStyle = pal.accent; ctx2.font = 'bold 12px monospace'; ctx2.textAlign = 'left'; ctx2.fillText('💋 ' + T('g.telo.title'), 10, 20);
      // mensaje
      let bottom = VH;
      if (msgT > 0 && msg) {
        ctx2.font = '13px monospace'; ctx2.textAlign = 'center';
        const words = msg.split(' '), lines = []; let cur = '';
        for (const w of words) { const cand = cur ? cur + ' ' + w : w; if (((ctx2.measureText(cand) || {}).width || 0) > VW - 44 && cur) { lines.push(cur); cur = w; } else cur = cand; }
        if (cur) lines.push(cur);
        const lh = 16, boxH = lines.length * lh + 8;
        ctx2.fillStyle = 'rgba(0,0,0,0.85)'; ctx2.fillRect(0, VH - boxH, VW, boxH);
        ctx2.fillStyle = '#ffd9ea'; lines.forEach((ln, i) => ctx2.fillText(ln, VW / 2, VH - boxH + 14 + i * lh));
        bottom = VH - boxH;
      }
      if (prompt) { ctx2.font = 'bold 13px monospace'; ctx2.textAlign = 'center'; ctx2.fillStyle = 'rgba(0,0,0,0.78)'; ctx2.fillRect(0, bottom - 22, VW, 22); ctx2.fillStyle = pal.accent; ctx2.fillText(prompt, VW / 2, bottom - 7); }
    }

    return { get done() { return done; }, get exitTo() { return exitTo; }, get ejected() { return ejected; },
      get __phase() { return phase; }, __pos: () => ({ x: player.x, y: player.y }), update, draw };
  }
  return { create };
})();
if (typeof window !== 'undefined') window.Telo = Telo;
if (typeof module !== 'undefined') module.exports = Telo;
