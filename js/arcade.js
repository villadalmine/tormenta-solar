// arcade.js — minijuegos jugables dentro de la sala de arcade (Pac-Man y Galaga).
// Cada uno expone { update(dt), draw(ctx,W,H), done }. Se sale con ESC.
const Arcade = (() => {

  function header(ctx, W, title, info) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 26);
    ctx.fillStyle = '#ffe21a'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'left';
    ctx.fillText(title, 10, 18);
    ctx.fillStyle = '#9fd3ff'; ctx.textAlign = 'right'; ctx.fillText(info + '   ESC: salir', W - 10, 18);
  }
  function banner(ctx, W, H, text, col) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, H/2 - 28, W, 56);
    ctx.fillStyle = col; ctx.font = 'bold 26px monospace'; ctx.textAlign = 'center';
    ctx.fillText(text, W/2, H/2 + 9);
  }

  // ---------------- MINI PAC-MAN ----------------
  function makePac() {
    const MAZE = [
      '###############',
      '#......#......#',
      '#.###.#.#.###.#',
      '#.............#',
      '#.###.###.###.#',
      '#...#.....#...#',
      '#.#.#.###.#.#.#',
      '#.....P.......#',
      '###############',
    ];
    const COLS = MAZE[0].length, ROWS = MAZE.length, CS = 36;
    const pellets = [], power = [];
    let total = 0, pac = { cx: 7, cy: 7, dir: {x:0,y:0}, want: {x:0,y:0} };
    for (let y = 0; y < ROWS; y++) { pellets[y] = []; power[y] = []; for (let x = 0; x < COLS; x++) {
      const c = MAZE[y][x]; pellets[y][x] = (c === '.'); power[y][x] = false; if (c === '.') total++;
      if (c === 'P') { pac.cx = x; pac.cy = y; }
    } }
    // frutitas (power pellets): vuelven comibles a los fantasmas
    [[1,1],[COLS-2,1],[1,ROWS-2],[COLS-2,ROWS-2]].forEach(([x,y]) => { if (pellets[y] && pellets[y][x]) power[y][x] = true; });
    pac.px = pac.cx; pac.py = pac.cy;
    const ghosts = [
      { cx: 7, cy: 1, px: 7, py: 1, sx: 7, sy: 1, dir: {x:1,y:0}, col: '#ff5252' },
      { cx: 7, cy: 5, px: 7, py: 5, sx: 7, sy: 5, dir: {x:-1,y:0}, col: '#4fc3f7' },
    ];
    const open = (x, y) => MAZE[y] && MAZE[y][x] && MAZE[y][x] !== '#';
    let eaten = 0, lives = 3, score = 0, tickT = 0, over = 0, win = false, frightened = 0, gtick = 0;
    const TICK = 0.15;

    function reset() {
      pac.cx = 7; pac.cy = 7; pac.px = 7; pac.py = 7; pac.dir = {x:0,y:0}; pac.want = {x:0,y:0};
      ghosts[0].cx = 7; ghosts[0].cy = 1; ghosts[1].cx = 7; ghosts[1].cy = 5;
      ghosts.forEach(g => { g.px = g.cx; g.py = g.cy; });
    }
    function step() {
      // pac
      if (open(pac.cx + pac.want.x, pac.cy + pac.want.y)) pac.dir = { ...pac.want };
      if (!open(pac.cx + pac.dir.x, pac.cy + pac.dir.y)) pac.dir = {x:0,y:0};
      pac.px = pac.cx; pac.py = pac.cy;
      pac.cx += pac.dir.x; pac.cy += pac.dir.y;
      if (pellets[pac.cy][pac.cx]) { pellets[pac.cy][pac.cx] = false; eaten++; score += 10; if (power[pac.cy][pac.cx]) { power[pac.cy][pac.cx] = false; frightened = 7; score += 40; Sfx.pickup(); } }
      // ghosts: a MITAD de velocidad (se mueven 1 de cada 2 ticks)
      gtick++;
      if (gtick % 2 === 0) for (const g of ghosts) {
        const opts = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}]
          .filter(d => open(g.cx+d.x, g.cy+d.y) && !(d.x === -g.dir.x && d.y === -g.dir.y));
        if (opts.length) {
          const sgn = frightened > 0 ? -1 : 1;   // si están asustados, huyen
          opts.sort((a, b) => sgn*((Math.abs(g.cx+a.x-pac.cx)+Math.abs(g.cy+a.y-pac.cy)) - (Math.abs(g.cx+b.x-pac.cx)+Math.abs(g.cy+b.y-pac.cy))));
          g.dir = Math.random() < 0.75 ? opts[0] : opts[(Math.random()*opts.length)|0];
        }
        g.px = g.cx; g.py = g.cy; g.cx += g.dir.x; g.cy += g.dir.y;
      }
      // colisión
      for (const g of ghosts) if (g.cx === pac.cx && g.cy === pac.cy) {
        if (frightened > 0) { g.cx = g.sx; g.cy = g.sy; g.px = g.cx; g.py = g.cy; score += 100; Sfx.hit(); }
        else { lives--; Sfx.hurt(); if (lives <= 0) { over = 1.6; win = false; } else reset(); }
      }
      if (eaten >= total) { over = 1.8; win = true; Sfx.win(); }
    }

    return {
      done: false, kind: 'pacman', result: null,
      update(dt) {
        if (Input.keys['escape']) { this.done = true; this.result = 'lose'; return; }
        if (over > 0) { over -= dt; if (over <= 0) { this.done = true; this.result = win ? 'win' : 'lose'; } return; }
        if (Input.keys['arrowleft'] || Input.keys['a']) pac.want = {x:-1,y:0};
        else if (Input.keys['arrowright'] || Input.keys['d']) pac.want = {x:1,y:0};
        else if (Input.keys['arrowup'] || Input.keys['w']) pac.want = {x:0,y:-1};
        else if (Input.keys['arrowdown'] || Input.keys['s']) pac.want = {x:0,y:1};
        if (frightened > 0) frightened -= dt;
        tickT += dt; if (tickT >= TICK) { tickT -= TICK; step(); }
      },
      draw(ctx, W, H) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        const ox = (W - COLS*CS)/2, oy = 30 + (H - 30 - ROWS*CS)/2;
        for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
          if (MAZE[y][x] === '#') { ctx.fillStyle = '#1b3bd6'; ctx.fillRect(ox+x*CS+2, oy+y*CS+2, CS-4, CS-4); }
          else if (pellets[y][x]) {
            const ccx = ox+x*CS+CS/2, ccy = oy+y*CS+CS/2;
            if (power[y][x]) { ctx.fillStyle = (((performance.now()/200)|0)%2) ? '#ff5252' : '#7CFC00'; ctx.beginPath(); ctx.arc(ccx, ccy, 7, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#1b5e20'; ctx.fillRect(ccx-1, ccy-10, 2, 4); }
            else { ctx.fillStyle = '#ffd9a0'; ctx.beginPath(); ctx.arc(ccx, ccy, 3, 0, Math.PI*2); ctx.fill(); }
          }
        }
        const f = tickT / TICK;
        const lerp = (a, b) => a + (b - a) * f;
        // pac
        const px = ox + (lerp(pac.px, pac.cx)+0.5)*CS, py = oy + (lerp(pac.py, pac.cy)+0.5)*CS;
        const m = 0.15 + 0.15*Math.abs(Math.sin(performance.now()/90));
        const ang = Math.atan2(pac.dir.y, pac.dir.x);
        ctx.save(); ctx.translate(px, py); ctx.rotate(ang);
        ctx.fillStyle = '#ffe21a'; ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0,0,CS*0.4, m*Math.PI, (2-m)*Math.PI); ctx.closePath(); ctx.fill();
        ctx.restore();
        for (const g of ghosts) {
          const gx = ox + (lerp(g.px, g.cx)+0.5)*CS, gy = oy + (lerp(g.py, g.cy)+0.5)*CS;
          const fr = frightened > 0;
          ctx.fillStyle = fr ? ((frightened < 2 && (((performance.now()/150)|0)%2)) ? '#fff' : '#2233cc') : g.col;
          ctx.beginPath(); ctx.arc(gx, gy, CS*0.36, Math.PI, 0); ctx.lineTo(gx+CS*0.36, gy+CS*0.36); ctx.lineTo(gx-CS*0.36, gy+CS*0.36); ctx.fill();
          ctx.fillStyle = fr ? '#fff' : '#fff'; ctx.beginPath(); ctx.arc(gx-4, gy-2, 3, 0, Math.PI*2); ctx.arc(gx+4, gy-2, 3, 0, Math.PI*2); ctx.fill();
        }
        header(ctx, W, 'PAC-MAN', 'PUNTOS ' + score + '  VIDAS ' + lives + (frightened > 0 ? '  🍒 ¡COMÉLOS!' : ''));
        if (over > 0) banner(ctx, W, H, win ? '¡GANASTE!' : 'GAME OVER', win ? '#7CFC00' : '#ff5252');
      },
    };
  }

  // ---------------- MINI GALAGA ----------------
  function makeGalaga() {
    const ship = { x: 400, y: 410, w: 30, cd: 0 };
    const pb = [], eb = [], aliens = [];
    let dir = 1, score = 0, lives = 3, over = 0, win = false;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++)
      aliens.push({ x: 180 + c*55, y: 70 + r*42, alive: true });
    let shootT = 0.6;

    function alive() { return aliens.filter(a => a.alive).length; }
    return {
      done: false, kind: 'galaga', result: null,
      update(dt) {
        if (Input.keys['escape']) { this.done = true; this.result = 'lose'; return; }
        if (over > 0) { over -= dt; if (over <= 0) { this.done = true; this.result = win ? 'win' : 'lose'; } return; }
        if (Input.keys['arrowleft'] || Input.keys['a']) ship.x -= 280*dt;
        if (Input.keys['arrowright'] || Input.keys['d']) ship.x += 280*dt;
        ship.x = Math.max(40, Math.min(760, ship.x));
        ship.cd -= dt;
        if ((Input.keys[' '] || Input.keys['arrowup'] || Input.keys['w']) && ship.cd <= 0) { pb.push({ x: ship.x, y: ship.y-12 }); ship.cd = 0.28; Sfx.shoot(); }
        // formación
        let edge = false;
        for (const a of aliens) { if (!a.alive) continue; a.x += dir*55*dt; if (a.x < 30 || a.x > 770) edge = true; }
        if (edge) { dir *= -1; for (const a of aliens) a.y += 16; }
        // disparo alien
        shootT -= dt;
        if (shootT <= 0) { const live = aliens.filter(a => a.alive); if (live.length) { const a = live[(Math.random()*live.length)|0]; eb.push({ x: a.x, y: a.y+10 }); Sfx.eShoot(); } shootT = 0.7; }
        // balas
        for (let i = pb.length-1; i>=0; i--) { pb[i].y -= 460*dt; if (pb[i].y < 0) pb.splice(i,1); }
        for (let i = eb.length-1; i>=0; i--) { eb[i].y += 300*dt; if (eb[i].y > 448) eb.splice(i,1); }
        // colisiones
        for (let i = pb.length-1; i>=0; i--) for (const a of aliens) {
          if (a.alive && Math.abs(pb[i].x-a.x) < 18 && Math.abs(pb[i].y-a.y) < 14) { a.alive = false; pb.splice(i,1); score += 100; Sfx.hit(); break; }
        }
        for (let i = eb.length-1; i>=0; i--) if (Math.abs(eb[i].x-ship.x) < 18 && Math.abs(eb[i].y-ship.y) < 14) { eb.splice(i,1); lives--; Sfx.hurt(); if (lives <= 0) { over=1.6; win=false; } }
        for (const a of aliens) if (a.alive && a.y > ship.y-20) { over=1.6; win=false; }
        if (alive() === 0 && over <= 0) { over = 1.8; win = true; Sfx.win(); }
      },
      draw(ctx, W, H) {
        ctx.fillStyle = '#05030f'; ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < 40; i++) { ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect((i*97 % W), ((i*53 + performance.now()*0.04) % H), 1, 2); }
        for (const a of aliens) { if (!a.alive) continue; ctx.fillStyle = '#d81b60'; ctx.fillRect(a.x-10, a.y-6, 20, 9); ctx.fillStyle = '#ffd54f'; ctx.fillRect(a.x-13, a.y-8, 4, 11); ctx.fillRect(a.x+9, a.y-8, 4, 11); ctx.fillStyle='#4fc3f7'; ctx.fillRect(a.x-2,a.y-10,4,4); }
        ctx.fillStyle = '#4fc3f7'; ctx.beginPath(); ctx.moveTo(ship.x, ship.y-12); ctx.lineTo(ship.x-13, ship.y+8); ctx.lineTo(ship.x+13, ship.y+8); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffe14d'; for (const b of pb) ctx.fillRect(b.x-1.5, b.y-7, 3, 9);
        ctx.fillStyle = '#ff5a5a'; for (const b of eb) ctx.fillRect(b.x-1.5, b.y, 3, 8);
        header(ctx, W, 'GALAGA', 'PUNTOS ' + score + '  VIDAS ' + lives);
        if (over > 0) banner(ctx, W, H, win ? '¡GANASTE!' : 'GAME OVER', win ? '#7CFC00' : '#ff5252');
      },
    };
  }

  // ---------------- MINI STREET FIGHTER ----------------
  function makeFighter() {
    const GY = 372, GRAV = 1700;
    const mkF = (x, face, col, name) => ({ x, y: GY, vy: 0, grounded: true, face, col, name, hp: 100, atk: 0, type: null, hitDone: false, cd: 0 });
    const p = mkF(250, 1, '#5b8cff', 'VOS');
    const e = mkF(550, -1, '#e0382f', 'EL DEL CHORI');
    let over = 0, win = false;

    const ATK = { punch: { dur: 0.30, active: 0.18, range: 66, dmg: 8 }, kick: { dur: 0.42, active: 0.27, range: 92, dmg: 12 } };

    function startAtk(f, type) { if (f.atk > 0 || f.cd > 0) return; f.atk = ATK[type].dur; f.type = type; f.hitDone = false; f.cd = ATK[type].dur + 0.12; }
    function physics(f, dt) {
      f.vy += GRAV*dt; f.y += f.vy*dt;
      if (f.y >= GY) { f.y = GY; f.vy = 0; f.grounded = true; }
      f.x = Math.max(50, Math.min(750, f.x));
      if (f.atk > 0) f.atk -= dt; if (f.cd > 0) f.cd -= dt;
    }
    function tryHit(att, def) {
      if (att.atk <= 0 || att.hitDone) return;
      const a = ATK[att.type];
      if (att.atk > a.active) return; // ventana activa
      const dx = def.x - att.x;
      if (Math.sign(dx) === att.face && Math.abs(dx) < a.range && Math.abs(dx) > 18 && Math.abs(def.y - att.y) < 60) {
        def.hp -= a.dmg; att.hitDone = true; def.x += att.face * 16; Sfx.hit();
        Sfx.hurt();
      }
    }

    return {
      done: false, kind: 'fighter', result: null,
      update(dt) {
        if (Input.keys['escape']) { this.done = true; this.result = 'lose'; return; }
        if (over > 0) { over -= dt; if (over <= 0) { this.done = true; this.result = win ? 'win' : 'lose'; } return; }
        // jugador
        p.vx = 0;
        if (Input.keys['a'] || Input.keys['arrowleft']) p.x -= 190*dt;
        if (Input.keys['d'] || Input.keys['arrowright']) p.x += 190*dt;
        if ((Input.keys['w'] || Input.keys['arrowup']) && p.grounded) { p.vy = -640; p.grounded = false; }
        if (Input.keys['j'] || Input.keys[' ']) startAtk(p, 'punch');
        if (Input.keys['k']) startAtk(p, 'kick');
        p.face = e.x < p.x ? -1 : 1;
        // CPU
        e.face = p.x < e.x ? -1 : 1;
        e.cdAI = (e.cdAI || 0) - dt;
        const dist = Math.abs(p.x - e.x);
        if (dist > 92) e.x += e.face * 130 * dt;
        else if (e.cdAI <= 0) { startAtk(e, Math.random() < 0.5 ? 'punch' : 'kick'); e.cdAI = 0.55 + Math.random()*0.5; }
        if (Math.random() < 0.01 && dist < 70) e.x -= e.face * 40; // retroceso ocasional
        physics(p, dt); physics(e, dt);
        tryHit(p, e); tryHit(e, p);
        if (p.hp <= 0 || e.hp <= 0) { over = 1.6; win = e.hp <= 0 && p.hp > 0; }
      },
      draw(ctx, W, H) {
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#3a1850'); bg.addColorStop(1, '#120a20'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#241038'; ctx.fillRect(0, GY, W, H-GY);
        // barras de vida
        function bar(x, hp, col, name, right) {
          ctx.fillStyle = '#000'; ctx.fillRect(x, 34, 300, 16);
          ctx.fillStyle = col; const w = 300*Math.max(0,hp)/100; ctx.fillRect(right ? x+300-w : x, 34, w, 16);
          ctx.fillStyle = '#fff'; ctx.font = 'bold 11px monospace'; ctx.textAlign = right ? 'right' : 'left'; ctx.fillText(name, right ? x+300 : x, 30);
        }
        bar(20, p.hp, '#4fc3f7', 'VOS', false); bar(W-320, e.hp, '#ff5252', 'EL DEL CHORI', true);
        drawFighter(ctx, p); drawFighter(ctx, e);
        header(ctx, W, 'STREET FIGHTER', 'A/D mover · W saltar · J piña · K patada');
        if (over > 0) banner(ctx, W, H, win ? '¡GANASTE!' : 'PERDISTE', win ? '#7CFC00' : '#ff5252');
      },
    };
    function drawFighter(ctx, f) {
      const x = f.x, y = f.y;
      ctx.save(); ctx.translate(x, y); ctx.scale(f.face, 1);
      // piernas
      ctx.strokeStyle = '#1a1d24'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      if (f.atk > 0 && f.type === 'kick' && f.atk <= ATK.kick.active + 0.08) {
        ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(40, -34); ctx.stroke(); // patada
        ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(-8, 0); ctx.stroke();
      } else { ctx.beginPath(); ctx.moveTo(0,-34); ctx.lineTo(-7,0); ctx.moveTo(0,-34); ctx.lineTo(8,0); ctx.stroke(); }
      // torso
      ctx.fillStyle = f.col; ctx.fillRect(-8, -64, 16, 32);
      // brazo / piña
      ctx.strokeStyle = f.col; ctx.lineWidth = 6;
      if (f.atk > 0 && f.type === 'punch' && f.atk <= ATK.punch.active + 0.06) { ctx.beginPath(); ctx.moveTo(0,-58); ctx.lineTo(34,-56); ctx.stroke(); ctx.fillStyle='#e0a878'; ctx.beginPath(); ctx.arc(36,-56,5,0,Math.PI*2); ctx.fill(); }
      else { ctx.beginPath(); ctx.moveTo(0,-58); ctx.lineTo(12,-44); ctx.stroke(); }
      // cabeza
      ctx.fillStyle = '#e0a878'; ctx.beginPath(); ctx.arc(0, -72, 7, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  }

  // ---------------- MINI TRUCO ----------------
  function makeTruco() {
    const SUITS = { espada:{l:'E',c:'#141422'}, basto:{l:'B',c:'#14240f'}, oro:{l:'O',c:'#b8860b'}, copa:{l:'C',c:'#a01020'} };
    const NUMS = [1,2,3,4,5,6,7,10,11,12];
    function power(c) {
      if (c.n===1 && c.s==='espada') return 14;
      if (c.n===1 && c.s==='basto') return 13;
      if (c.n===7 && c.s==='espada') return 12;
      if (c.n===7 && c.s==='oro') return 11;
      return ({3:10,2:9,1:8,12:7,11:6,10:5,7:4,6:3,5:2,4:1})[c.n] || 0;
    }
    const deck = [];
    for (const s in SUITS) for (const n of NUMS) deck.push({ n, s });
    for (let i = deck.length-1; i > 0; i--) { const j = (Math.random()*(i+1))|0; [deck[i],deck[j]]=[deck[j],deck[i]]; }
    const pHand = [deck.pop(), deck.pop(), deck.pop()].map(c => ({ c, used:false }));
    const aiHand = [deck.pop(), deck.pop(), deck.pop()].map(c => ({ c, used:false }));
    let round = 0, pW = 0, aiW = 0, firstWinner = 0, phase = 'play', revealT = 0, over = 0, win = false;
    let stake = 10, envDone = false, trucoCalled = false, forrosDelta = 0;
    let tableP = null, tableA = null, note = 'Carta 1/2/3 · T: truco · V: envido';

    const envPts = (hand) => {
      const cs = hand.map(h => h.c), val = n => (n >= 10 ? 0 : n);
      let best = 0;
      for (const s of ['espada','basto','oro','copa']) {
        const same = cs.filter(c => c.s === s);
        if (same.length >= 2) { const v = same.map(c => val(c.n)).sort((a,b)=>b-a); best = Math.max(best, 20 + v[0] + v[1]); }
      }
      return best || Math.max(...cs.map(c => val(c.n)));
    };
    function callEnvido() {
      envDone = true;
      const pe = envPts(pHand), ae = envPts(aiHand);
      if (ae >= 27 || Math.random() < 0.4) { forrosDelta += 6; note = 'Envido: el tahúr no quiere. +6 forros.'; }
      else if (pe >= ae) { forrosDelta += 6; note = 'Envido ' + pe + ' a ' + ae + '. ¡Tuyo! +6 forros'; }
      else { forrosDelta -= 6; note = 'Envido ' + pe + ' a ' + ae + '. Perdiste. −6 forros'; }
    }
    function callTruco() {
      trucoCalled = true;
      const strong = aiHand.some(h => !h.used && power(h.c) >= 10);
      if (strong || Math.random() < 0.5) { stake = 20; note = '“¡Quiero!” Va el truco: vale 20 forros.'; }
      else { win = true; forrosDelta += stake; note = '“No quiero.” ¡Te llevás la mano! +' + stake + ' forros'; over = 1.8; }
    }

    function aiPlay() {
      const avail = aiHand.filter(h => !h.used);
      const beats = avail.filter(h => power(h.c) > power(tableP)).sort((a,b)=>power(a.c)-power(b.c));
      const pick = beats[0] || avail.sort((a,b)=>power(a.c)-power(b.c))[0];
      pick.used = true; tableA = pick.c;
    }
    function resolve() {
      const pp = power(tableP), pa = power(tableA);
      if (pp > pa) { pW++; if (!firstWinner) firstWinner = 1; note = '¡Ganaste la mano!'; }
      else if (pa > pp) { aiW++; if (!firstWinner) firstWinner = -1; note = 'Te ganó la mano.'; }
      else note = 'Parda.';
    }

    return {
      done: false, kind: 'truco', result: null, forrosDelta: 0,
      update(dt) {
        this.forrosDelta = forrosDelta;
        if (Input.keys['escape']) { this.done = true; this.result = 'lose'; this.forrosDelta = 0; return; }
        if (over > 0) { over -= dt; if (over <= 0) { this.done = true; this.result = win ? 'win' : 'lose'; this.forrosDelta = win ? Math.max(0, forrosDelta) : 0; } return; }
        if (phase === 'reveal') {
          revealT -= dt;
          if (revealT <= 0) {
            round++; tableP = tableA = null;
            if (pW >= 2 || aiW >= 2 || round >= 3) {
              win = pW > aiW || (pW === aiW && firstWinner === 1);
              if (win) { forrosDelta += stake; note = '¡GANASTE EL TRUCO!'; }
              else note = 'PERDISTE';
              over = 1.8;
            } else { phase = 'play'; note = 'Tu turno: carta 1/2/3' + (trucoCalled ? '' : ' · T truco'); }
          }
          return;
        }
        // cantos
        if (Input.keys['v'] && round === 0 && !envDone && !tableP) { callEnvido(); Input.keys['v'] = false; }
        if (Input.keys['t'] && !trucoCalled && !tableP) { callTruco(); Input.keys['t'] = false; }
        // jugar carta
        for (let i = 0; i < 3; i++) {
          if (Input.keys[String(i+1)] && !pHand[i].used) {
            pHand[i].used = true; tableP = pHand[i].c;
            aiPlay(); resolve();
            phase = 'reveal'; revealT = 1.3;
            break;
          }
        }
      },
      draw(ctx, W, H) {
        const bg = ctx.createLinearGradient(0,0,0,H); bg.addColorStop(0,'#10220f'); bg.addColorStop(1,'#071206');
        ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);
        ctx.fillStyle = '#0d1b0c'; ctx.beginPath(); ctx.ellipse(W/2, H/2, 240, 130, 0, 0, Math.PI*2); ctx.fill();
        function card(cx, cy, c, faceUp) {
          ctx.fillStyle = '#f4f0e0'; ctx.fillRect(cx-22, cy-32, 44, 64);
          ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.strokeRect(cx-22, cy-32, 44, 64);
          if (!faceUp) { ctx.fillStyle = '#7b1020'; ctx.fillRect(cx-18, cy-28, 36, 56); return; }
          const s = SUITS[c.s];
          ctx.fillStyle = s.c; ctx.font = 'bold 22px monospace'; ctx.textAlign = 'center';
          ctx.fillText(c.n, cx, cy-2); ctx.font = 'bold 14px monospace'; ctx.fillText(s.l, cx, cy+18);
        }
        // mesa: cartas jugadas
        if (tableA) card(W/2, H/2-50, tableA, phase==='reveal'||over>0);
        if (tableP) card(W/2, H/2+50, tableP, true);
        // mano del jugador
        for (let i = 0; i < 3; i++) {
          const cx = W/2 - 70 + i*70, cy = H - 60;
          if (pHand[i].used) { ctx.globalAlpha = 0.25; card(cx, cy, pHand[i].c, true); ctx.globalAlpha = 1; }
          else { card(cx, cy, pHand[i].c, true); ctx.fillStyle = '#ffe14d'; ctx.font = 'bold 11px monospace'; ctx.textAlign='center'; ctx.fillText('['+(i+1)+']', cx, cy+46); }
        }
        // marcador
        ctx.fillStyle = '#cfe8c0'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
        ctx.fillText('VOS ' + pW + '  -  ' + aiW + ' TAHÚR', W/2, 70);
        ctx.fillStyle = '#ffd54f'; ctx.font = '13px monospace'; ctx.fillText(note, W/2, 96);
        ctx.fillStyle = '#ff9ed0'; ctx.font = 'bold 12px monospace';
        ctx.fillText('Pozo: ' + stake + ' forros' + (forrosDelta ? '   (vas ' + (forrosDelta>0?'+':'') + forrosDelta + ')' : ''), W/2, 112);
        header(ctx, W, 'TRUCO', '1/2/3 carta · T truco · V envido');
        if (over > 0) banner(ctx, W, H, win ? '¡GANASTE!' : 'PERDISTE', win ? '#7CFC00' : '#ff5252');
      },
    };
  }

  // ---------------- MINI FROGGER ----------------
  function makeFrogger() {
    const ROWH = 44, ROWS = 9, BOTTOM = 408;        // filas pares = seguras, impares = con autos
    const rowY = i => BOTTOM - i * ROWH;
    const frog = { i: 0, x: 400 };
    let lives = 3, over = 0, win = false, stepCd = 0;
    const lanes = {};
    for (let i = 1; i < ROWS - 1; i += 2) {
      const dir = (i % 4 === 1) ? 1 : -1, sp = 55 + Math.random()*70, cars = [];
      for (let k = 0; k < 2; k++) cars.push({ x: Math.random()*800, w: 44 });
      lanes[i] = { dir, sp, cars };
    }
    const reset = () => { frog.i = 0; frog.x = 400; };
    return {
      done: false, kind: 'frogger', result: null,
      update(dt) {
        if (Input.keys['escape']) { this.done = true; this.result = 'lose'; return; }
        if (over > 0) { over -= dt; if (over <= 0) { this.done = true; this.result = win ? 'win' : 'lose'; } return; }
        stepCd -= dt;
        if (stepCd <= 0) {
          let m = false;
          if (Input.keys['arrowup'] || Input.keys['w']) { frog.i = Math.min(ROWS-1, frog.i+1); m = true; }
          else if (Input.keys['arrowdown'] || Input.keys['s']) { frog.i = Math.max(0, frog.i-1); m = true; }
          else if (Input.keys['arrowleft'] || Input.keys['a']) { frog.x = Math.max(20, frog.x-40); m = true; }
          else if (Input.keys['arrowright'] || Input.keys['d']) { frog.x = Math.min(780, frog.x+40); m = true; }
          if (m) { stepCd = 0.14; Sfx.jump(); }
        }
        for (const k in lanes) { const ln = lanes[k]; for (const c of ln.cars) { c.x += ln.dir*ln.sp*dt; if (ln.dir>0 && c.x>820) c.x = -c.w; if (ln.dir<0 && c.x<-c.w) c.x = 820; } }
        const ln = lanes[frog.i];
        if (ln) for (const c of ln.cars) {
          if (frog.x+13 > c.x && frog.x-13 < c.x+c.w) { lives--; Sfx.hurt(); if (lives<=0){ over=1.4; win=false; } else reset(); break; }
        }
        if (frog.i >= ROWS-1) { over = 1.6; win = true; Sfx.win(); }
      },
      draw(ctx, W, H) {
        ctx.fillStyle = '#0a160a'; ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < ROWS; i++) {
          const y = rowY(i);
          if (i === ROWS-1) { ctx.fillStyle = '#1b5e20'; ctx.fillRect(0, y-16, W, 32); ctx.fillStyle = '#7CFC00'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center'; ctx.fillText('META', W/2, y+4); }
          else if (lanes[i]) {
            ctx.fillStyle = '#202024'; ctx.fillRect(0, y-16, W, 32);
            ctx.fillStyle = '#3a3a40'; for (let x = 0; x < W; x += 44) ctx.fillRect(x, y-1, 22, 2);
            const ln = lanes[i];
            for (const c of ln.cars) { ctx.fillStyle = ln.dir>0 ? '#e53935' : '#fb8c00'; ctx.fillRect(c.x, y-13, c.w, 26); ctx.fillStyle = '#ffe'; ctx.fillRect(c.x + (ln.dir>0?c.w-8:4), y-9, 4, 6); }
          } else { ctx.fillStyle = '#13301a'; ctx.fillRect(0, y-16, W, 32); }
        }
        const fy = rowY(frog.i);
        ctx.fillStyle = '#7CFC00'; ctx.beginPath(); ctx.arc(frog.x, fy, 13, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#0d3b12'; ctx.fillRect(frog.x-8, fy-4, 3, 3); ctx.fillRect(frog.x+5, fy-4, 3, 3);
        header(ctx, W, 'FROGGER', 'flechas/WASD · VIDAS ' + lives);
        if (over > 0) banner(ctx, W, H, win ? '¡GANASTE!' : 'GAME OVER', win ? '#7CFC00' : '#ff5252');
      },
    };
  }

  function create(kind) {
    if (kind === 'galaga') return makeGalaga();
    if (kind === 'fighter') return makeFighter();
    if (kind === 'frogger') return makeFrogger();
    if (kind === 'truco') return makeTruco();
    return makePac();
  }
  return { create };
})();
