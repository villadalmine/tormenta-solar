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
    let phase = 'intro', pt = 0, t = 0, done = false, exitTo = null, msg = '', msgT = 0, prompt = '', escHeld = false, eHeld = true, escaped = false, chipped = false;
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
        const sheAtBed = d <= 4;                                  // ella YA llegó a la cama
        prompt = sheAtBed ? T('g.telo.toBed') : T('g.telo.wait');  // si todavía camina, esperala (no se dispara el robot antes)
        if (sheAtBed && nearTile(bed, 1.3)) {   // ¡EL CARPO PEGA UN SALTO de la cama! era una TRAMPA: un ROBOT IA te quería chipar. Huí a la puerta.
          phase = 'robot'; pt = 0; bear.on = true;
          bear.x = (bed.x + 0.8) * CS; bear.y = (bed.y + 0.3) * CS;        // el robot estaba en la cama
          player.x = 5.5 * CS; player.y = 4 * CS;                          // SALTÁS al MEDIO del cuarto (lejos del robot Y de la puerta → hay que correr a la puerta)
          setMsg(T('g.telo.robot'), 6); Sfx.hurt && Sfx.hurt();
        }
      } else if (phase === 'robot') {
        prompt = T('g.telo.run');
        // el ROBOT te persigue para inyectarte el chip — un toque MÁS LENTO que vos: si corrés derecho a la puerta, ZAFÁS.
        const dx = player.x - bear.x, dy = player.y - bear.y, d = Math.hypot(dx, dy) || 1, sp = (96 + pt * 6) * dt;
        bear.x += (dx / d) * sp; bear.y += (dy / d) * sp;
        if (pt > 0.4 && nearTile(exit, 0.9)) { phase = 'result'; pt = 0; escaped = true; bear.on = false; Sfx.win && Sfx.win(); }   // llegaste a la PUERTA → ESCAPASTE (margen 0.4s para no escapar en el salto)
        else if (d < 20 || pt > 11) { phase = 'chipped'; pt = 0; chipped = true; bear.on = false; Sfx.hurt && Sfx.hurt(); setMsg(T('g.telo.chipStay'), 10); }  // te atrapó → te CHIPEA, el robot se VA y quedás en el cuarto
      } else if (phase === 'result') {
        // PANTALLA DE RESULTADO (solo ESCAPASTE): banner grande antes de salir al bar
        prompt = '';
        if (pt > 2.4) { done = true; exitTo = 'back'; }
      } else if (phase === 'chipped') {
        // CHIPEADO: el robot se fue, quedás en la habitación. Explorás y buscás el CELU en la mesita (E).
        const atPhone = nearTile(mesita, 1.5);
        prompt = atPhone ? T('g.telo.phonePrompt') : T('g.telo.chipExplore');
        if (atPhone && pressed) { phase = 'phonecall'; pt = 0; setMsg(T('g.chip.linyeras'), 10); Sfx.pickup && Sfx.pickup(); }
      } else if (phase === 'phonecall') {
        // usaste el celu → llamás a los linyeras (se cagan de risa + hook Garbarino) → salís chipeado, con la quest
        prompt = '';
        if (pt > 5) { done = true; exitTo = 'back'; }
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
      // SALIDA — MARCADA: puerta verde con glow + cartel "SALIDA"; en la fase robot, BIEN grande + flecha pulsante (sabés a dónde correr)
      const exx = ox + (exit.x + 0.5) * CS, exy = oy + (exit.y + 0.5) * CS, chase = (phase === 'robot'), pulse = 0.6 + 0.4 * Math.abs(Math.sin(t * 5));
      ctx2.save();
      ctx2.fillStyle = chase ? 'rgba(60,220,90,' + (0.5 + 0.4 * pulse) + ')' : 'rgba(60,200,90,0.45)';
      ctx2.shadowBlur = chase ? 18 * pulse : 8; ctx2.shadowColor = '#3cdc5a';
      ctx2.fillRect(exx - 15, exy - 17, 30, 34);
      ctx2.shadowBlur = 0; ctx2.font = 'bold 16px serif'; ctx2.fillStyle = '#fff'; ctx2.fillText('🚪', exx, exy + 6);
      ctx2.fillStyle = '#7CFC00'; ctx2.font = 'bold 9px monospace'; ctx2.fillText(T('g.telo.exitLabel'), exx, exy - 20);
      if (chase) {   // flecha pulsante encima, indicando la salida
        const ay = exy - 30 - 4 * pulse; ctx2.fillStyle = '#7CFC00';
        ctx2.beginPath(); ctx2.moveTo(exx, ay + 8); ctx2.lineTo(exx - 6, ay); ctx2.lineTo(exx + 6, ay); ctx2.closePath(); ctx2.fill();
      }
      ctx2.restore();

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

      // EL ROBOT IA de 2 metros: METÁLICO, claramente un robot (cuerpo de chapa, panel, antena, brazos con pinzas,
      // cara-pantalla con ojos LED rojos + jeringa con el chip). Que se LEA como robot, no una mancha.
      if (bear.on) {
        const px2 = ox + bear.x, py2 = oy + bear.y, pulse = 0.5 + 0.5 * Math.abs(Math.sin(t * 8)), reach = Math.sin(t * 6) * 3;
        ctx2.save();
        ctx2.fillStyle = 'rgba(0,0,0,0.35)'; ctx2.beginPath(); ctx2.ellipse(px2, py2 + 22, 18, 5, 0, 0, Math.PI * 2); ctx2.fill();   // sombra
        // patas/base
        ctx2.fillStyle = '#5a626e'; ctx2.fillRect(px2 - 11, py2 + 8, 8, 14); ctx2.fillRect(px2 + 3, py2 + 8, 8, 14);
        ctx2.fillStyle = '#3a4049'; ctx2.fillRect(px2 - 11, py2 + 18, 8, 4); ctx2.fillRect(px2 + 3, py2 + 18, 8, 4);
        // torso de chapa (con panel + tornillos)
        ctx2.fillStyle = '#8c93a0'; ctx2.fillRect(px2 - 14, py2 - 14, 28, 24);
        ctx2.fillStyle = '#6b7280'; ctx2.fillRect(px2 - 14, py2 - 14, 28, 5);
        ctx2.fillStyle = '#454b55'; ctx2.fillRect(px2 - 8, py2 - 6, 16, 11);   // panel pecho
        ctx2.fillStyle = '#2ee0c0'; for (let i = 0; i < 3; i++) ctx2.fillRect(px2 - 6 + i * 5, py2 - 4 + (i % 2) * 3, 3, 2);  // lucecitas
        ctx2.fillStyle = '#3a4049'; [[-12, -12], [12, -12], [-12, 8], [12, 8]].forEach(p => { ctx2.beginPath(); ctx2.arc(px2 + p[0], py2 + p[1], 1.3, 0, Math.PI * 2); ctx2.fill(); }); // tornillos
        // brazos metálicos con PINZA, estirándose hacia vos (lado del jugador)
        const side = (player.x < bear.x) ? -1 : 1;
        ctx2.strokeStyle = '#7a818c'; ctx2.lineWidth = 5; ctx2.lineCap = 'round';
        ctx2.beginPath(); ctx2.moveTo(px2 + side * 12, py2 - 8); ctx2.lineTo(px2 + side * (20 + reach), py2 - 2); ctx2.stroke();
        ctx2.fillStyle = '#c0c6cf'; ctx2.beginPath(); ctx2.arc(px2 + side * (22 + reach), py2 - 2, 3, 0, Math.PI * 2); ctx2.fill();   // pinza
        // JERINGA con el chip en la otra mano
        ctx2.strokeStyle = '#7a818c'; ctx2.beginPath(); ctx2.moveTo(px2 - side * 12, py2 - 8); ctx2.lineTo(px2 - side * 18, py2 + 2); ctx2.stroke();
        ctx2.fillStyle = '#ff4d4d'; ctx2.fillRect(px2 - side * 22, py2 - 2, 6, 3);   // jeringa/chip rojo
        // cuello + cabeza-pantalla
        ctx2.fillStyle = '#5a626e'; ctx2.fillRect(px2 - 3, py2 - 18, 6, 5);
        ctx2.fillStyle = '#9aa1ad'; ctx2.fillRect(px2 - 11, py2 - 32, 22, 16);   // cabeza
        ctx2.fillStyle = '#15181d'; ctx2.fillRect(px2 - 9, py2 - 30, 18, 11);   // pantalla
        // antena con luz que titila
        ctx2.strokeStyle = '#9aa1ad'; ctx2.lineWidth = 2; ctx2.beginPath(); ctx2.moveTo(px2, py2 - 32); ctx2.lineTo(px2, py2 - 40); ctx2.stroke();
        ctx2.fillStyle = 'rgba(255,60,60,' + pulse + ')'; ctx2.beginPath(); ctx2.arc(px2, py2 - 42, 2.4, 0, Math.PI * 2); ctx2.fill();
        // ojos LED rojos (pulso) en la pantalla
        ctx2.shadowBlur = 8; ctx2.shadowColor = '#ff0000'; ctx2.fillStyle = 'rgba(255,40,40,' + (0.6 + 0.4 * pulse) + ')';
        ctx2.fillRect(px2 - 6, py2 - 27, 4, 3); ctx2.fillRect(px2 + 2, py2 - 27, 4, 3);
        ctx2.shadowBlur = 0; ctx2.fillStyle = '#ff5a5a'; ctx2.fillRect(px2 - 5, py2 - 22, 10, 1.5);   // "boca" línea
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
      // CARTEL PERSISTENTE arriba durante la fase robot (no se va: aunque te atrapen de una, leés qué pasó)
      if (phase === 'robot') {
        const blink = 0.55 + 0.45 * Math.abs(Math.sin(t * 6));
        ctx2.fillStyle = 'rgba(150,20,20,' + (0.78 + 0.18 * blink) + ')'; ctx2.fillRect(0, 30, VW, 26);
        ctx2.fillStyle = '#fff'; ctx2.font = 'bold 13px monospace'; ctx2.textAlign = 'center'; ctx2.textBaseline = 'middle';
        ctx2.fillText(T('g.telo.robotBanner'), VW / 2, 43); ctx2.textBaseline = 'alphabetic';
      }
      // CHIPEADO: el robot se fue, quedaste en el cuarto → cartel guía (buscá el celu) — no se va
      if (phase === 'chipped' || phase === 'phonecall') {
        ctx2.fillStyle = 'rgba(40,90,60,0.85)'; ctx2.fillRect(0, 30, VW, 26);
        ctx2.fillStyle = '#cfeede'; ctx2.font = 'bold 12px monospace'; ctx2.textAlign = 'center'; ctx2.textBaseline = 'middle';
        ctx2.fillText(T(phase === 'phonecall' ? 'g.telo.phoneBanner' : 'g.telo.chipBanner'), VW / 2, 43); ctx2.textBaseline = 'alphabetic';
        // EL CELU brillando sobre la mesita (a buscar)
        const phx = ox + (mesita.x + 0.5) * CS, phy = oy + (mesita.y - 0.1) * CS, gl = 0.5 + 0.5 * Math.abs(Math.sin(t * 5));
        ctx2.save(); ctx2.shadowBlur = 10 * gl; ctx2.shadowColor = '#5ad6ff'; ctx2.font = '16px serif'; ctx2.textAlign = 'center'; ctx2.fillStyle = '#fff';
        ctx2.fillText('📱', phx, phy + 5); ctx2.restore();
        if (phase === 'chipped' && !nearTile(mesita, 1.5)) { ctx2.fillStyle = '#7CFC00'; ctx2.font = 'bold 9px monospace'; ctx2.fillText('📱', phx, phy - 14); }
      }
      // PANTALLA DE RESULTADO grande (escapaste / te chiparon): centrada, imposible de no leer
      if (phase === 'result') {
        ctx2.fillStyle = 'rgba(0,0,0,0.78)'; ctx2.fillRect(0, 0, VW, VH);
        const ok = escaped, col = ok ? '#7CFC00' : '#ff5252';
        ctx2.textAlign = 'center'; ctx2.textBaseline = 'middle';
        ctx2.fillStyle = col; ctx2.font = 'bold 30px monospace'; ctx2.fillText(T(ok ? 'g.telo.resEscaped' : 'g.telo.resChipped'), VW / 2, VH / 2 - 24);
        ctx2.fillStyle = '#fff'; ctx2.font = '14px monospace';
        const sub = T(ok ? 'g.telo.resEscapedSub' : 'g.telo.resChippedSub'), words = sub.split(' '), lines = []; let cur = '';
        for (const w of words) { const cand = cur ? cur + ' ' + w : w; if ((ctx2.measureText(cand).width || 0) > VW - 80 && cur) { lines.push(cur); cur = w; } else cur = cand; }
        if (cur) lines.push(cur);
        lines.forEach((ln, i) => ctx2.fillText(ln, VW / 2, VH / 2 + 8 + i * 20));
        ctx2.textBaseline = 'alphabetic';
      }
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

    return { get done() { return done; }, get exitTo() { return exitTo; }, get escaped() { return escaped; }, get chipped() { return chipped; },
      get __phase() { return phase; }, __pos: () => ({ x: player.x, y: player.y }), update, draw };
  }
  return { create };
})();
if (typeof window !== 'undefined') window.Telo = Telo;
if (typeof module !== 'undefined') module.exports = Telo;
