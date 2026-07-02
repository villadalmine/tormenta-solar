// piquete.js — MINI-JUEGO CO-OP "AGUANTAR EL CORTE" (specs/lavalle-multijugador.md §3). 2/4/6 jugadores defienden
// la BARRICADA de olas de DESALOJO (la yuta) que bajan desde el Obelisco. Los frenás con el CUERPO (chocarlos los
// stunea y los empuja). Si un enemigo llega a la barricada, le baja HP. Tras las N olas aparece el JEFE: ROBOCOP 🤖, y
// se te activa el RAYO SOLAR — [E] le disparás hasta matarlo → GANÁS. HP de barricada 0 → PERDÉS. La velocidad y la
// cantidad ESCALAN con la cantidad de jugadores. HOST-AUTHORITATIVE: el host simula (olas + jefe + HP) y transmite por
// whisper (lv-state); los guests renderizan y mandan sus disparos (lv-ray). Posiciones por Salon.pos. Aditivo (solo).
const Piquete = (() => {
  const T = (k, p) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(k, p) : k;
  const CS = 30, W = 18, H = 15;
  const BARR_Y = 3.6, WAVES = 3;
  const HP_MAX = 100, DMG = 7;
  const BOSS_HP = 120, RAY_DMG = 8, RAY_CD = 0.2, BOSS_DMG = 30;   // ROBOCOP + rayo solar
  const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

  function create(opts) {
    opts = opts || {};
    const isHost = (opts.role || 'host') === 'host';
    const seats = opts.seats || [];
    const myPid = opts.myPid || 'me';
    const sendState = opts.sendState || function () {};
    const rng = mulberry((opts.seed || 1) | 0);
    const nH = Math.max(1, seats.length || 1);
    const speedMul = 1 + (nH - 1) * 0.3;          // más jugadores → todo MÁS RÁPIDO (más desafío + más manos)

    const player = { x: 9 * CS, y: 11 * CS, r: 11, dir: 1, walk: 0 };
    let hp = HP_MAX, wave = 0, waveGap = 1.6, waveT = 0, phase = 'intro', done = false, exitTo = null, t = 0;
    let enemies = [], boss = null, rayCd = 0, rayFx = 0, eHeld = false;
    let sendT = 0, msg = '', msgT = 0, escHeld = false, result = null;
    let rhp = HP_MAX, rwave = 0, rboss = null;
    setMsg(T('g.piquete.intro'), 5);

    function setMsg(s, d = 3) { msg = s; msgT = d; }
    function leave(res) { result = res; phase = res; done = true; exitTo = 'lavalle'; }
    function playerPts() {
      const pts = [{ x: player.x / CS, y: player.y / CS }];
      if (typeof Salon !== 'undefined' && Salon.getPeers) { const pm = Salon.getPeers(); for (const pid of seats) { if (pid === myPid) continue; const p = pm.get(pid); if (p && p.rx != null) pts.push({ x: p.rx, y: (p.ry != null ? p.ry : 8) }); } }
      return pts;
    }
    function spawnWave() {
      wave++; waveT = 0; const n = 3 + wave * nH;
      for (let i = 0; i < n; i++) enemies.push({ x: 1.5 + rng() * (W - 3), y: 0.2 + rng() * 0.9, spd: (0.9 + rng() * 0.6) * speedMul, stun: 0 });
      setMsg(T('g.piquete.wave', { n: wave, of: WAVES }), 2);
    }
    function fireRay() {   // rayo solar contra Robocop
      rayFx = 1; if (typeof Sfx !== 'undefined' && Sfx.shoot) Sfx.shoot();
      if (isHost) { if (boss) boss.hp = Math.max(0, boss.hp - RAY_DMG); }
      else if (typeof Salon !== 'undefined' && Salon.whisper && opts.hostPid) Salon.whisper(opts.hostPid, JSON.stringify({ t: 'lv-ray' }));
    }
    function onRay() { if (isHost && phase === 'boss' && boss) boss.hp = Math.max(0, boss.hp - RAY_DMG); }   // disparo de un guest (ya rate-limitado en su cliente)

    function update(dt) {
      t += dt; msgT -= dt; if (rayCd > 0) rayCd -= dt; rayFx = Math.max(0, rayFx - dt * 5);
      if (done) return;
      const sp = 175 * dt; let mvx = 0, mvy = 0;
      if (Input.keys['arrowleft'] || Input.keys['a']) mvx = -1;
      if (Input.keys['arrowright'] || Input.keys['d']) mvx = 1;
      if (Input.keys['arrowup'] || Input.keys['w']) mvy = -1;
      if (Input.keys['arrowdown'] || Input.keys['s']) mvy = 1;
      const nx = player.x + mvx * sp, ny = player.y + mvy * sp;
      if (mvx && nx > CS && nx < (W - 1) * CS) player.x = nx;
      if (mvy && ny > (BARR_Y + 0.2) * CS && ny < (H - 1) * CS) player.y = ny;
      if (mvx) player.dir = mvx; player.walk = (mvx || mvy) ? player.walk + dt * 10 : 0;
      // RAYO SOLAR: en la fase del jefe, [E] dispara (rate-limit por rayCd; mantener apretado dispara seguido)
      const bossOn = isHost ? (phase === 'boss') : !!rboss;
      if (bossOn && (Input.keys['e'] || Input.keys[' ']) && rayCd <= 0) { fireRay(); rayCd = RAY_CD; }
      // multijugador: pos + interpolación
      if (typeof Salon !== 'undefined' && Salon.pos && Salon.inBodegon && Salon.inBodegon()) {
        Salon.pos(Math.round(player.x / CS * 10) / 10, mvx || player.dir, undefined, Math.round(player.y / CS * 10) / 10);
        const pm = Salon.getPeers && Salon.getPeers(); const k = Math.min(1, dt * 12);
        if (pm) for (const p of pm.values()) { if (p.rx == null) p.rx = p.x != null ? p.x : 9; if (p.ry == null) p.ry = p.y != null ? p.y : 8; p.rx += ((p.x != null ? p.x : p.rx) - p.rx) * k; p.ry += ((p.y != null ? p.y : p.ry) - p.ry) * k; }
      }
      if (Input.keys['escape']) { if (!escHeld) { escHeld = true; leave('flee'); return; } } else escHeld = false;
      if (isHost) hostSim(dt); else if (msgT <= 0 && phase === 'intro') phase = 'play';
    }

    function hostSim(dt) {
      if (phase === 'intro') { if (msgT <= 0) { phase = 'play'; spawnWave(); } broadcast(); return; }
      if (phase === 'play') {
        const pts = playerPts();
        waveT += dt; if (waveT > 45) for (const e of enemies) e.flee = true;   // failsafe: la ola nunca se cuelga
        for (const e of enemies) {
          if (e.flee) { e.y -= 3 * dt; continue; }                             // CORRIDO: huye para arriba y sale
          if (e.stun > 0) { e.stun -= dt; e.y -= 1.2 * dt; continue; }
          e.y += e.spd * dt;
          // el choque CUENTA: 1er empujón lo stunea; al 2º el tipo SE CORRE (si no, quedaba oscilando infinito contra vos)
          for (const p of pts) if (Math.hypot(p.x - e.x, p.y - e.y) < 0.9) { e.stun = 1.1; e.y -= 0.5; e.hits = (e.hits || 0) + 1; if (e.hits >= 2) e.flee = true; break; }
          if (e.y >= BARR_Y) { hp = Math.max(0, hp - DMG); e.dead = true; }
        }
        enemies = enemies.filter(e => !e.dead && e.y > -1);
        if (hp <= 0) return leave('lose');
        if (enemies.length === 0) {
          if (wave >= WAVES) { phase = 'boss'; boss = { x: 9, y: 0.2, hp: BOSS_HP, stun: 0 }; setMsg(T('g.piquete.boss'), 4); }   // ¡JEFE!
          else { waveGap -= dt; if (waveGap <= 0) { waveGap = 1.6; spawnWave(); } }
        }
      } else if (phase === 'boss' && boss) {
        if (boss.stun > 0) { boss.stun -= dt; boss.y -= 0.7 * dt; }
        else boss.y += 0.5 * speedMul * dt;                          // Robocop baja, lento y pesado
        for (const p of playerPts()) if (Math.hypot(p.x - boss.x, p.y - boss.y) < 1.15) { boss.stun = 0.5; boss.y -= 0.25; break; }
        if (boss.y >= BARR_Y) { hp = Math.max(0, hp - BOSS_DMG); boss.y = BARR_Y - 1.6; boss.stun = 0.9; }   // rompe la barricada y retrocede
        if (hp <= 0) return leave('lose');
        if (boss.hp <= 0) return leave('win');                        // ¡lo fritaste con el rayo!
      }
      broadcast();
    }
    function broadcast() {
      sendT -= 0.016; if (sendT > 0) return; sendT = 0.12;
      const e = []; for (const en of enemies) e.push(+en.x.toFixed(1), +en.y.toFixed(1));
      const st = { t: 'lv-state', h: hp, w: wave, p: phase, e, b: boss ? [+boss.x.toFixed(1), +boss.y.toFixed(1), Math.round(boss.hp)] : 0 };
      for (const pid of seats) if (pid !== myPid) sendState(pid, st);
    }

    function applyState(d) {
      if (!d) return;
      rhp = d.h != null ? d.h : rhp; rwave = d.w != null ? d.w : rwave;
      if (Array.isArray(d.e)) { enemies = []; for (let i = 0; i + 1 < d.e.length; i += 2) enemies.push({ x: d.e[i], y: d.e[i + 1], stun: 0 }); }
      rboss = (d.b && d.b.length) ? { x: d.b[0], y: d.b[1], hp: d.b[2] } : null;
      if (d.p === 'win' || d.p === 'lose') { if (!done) leave(d.p); }
      else if (phase === 'intro' && msgT <= 0) phase = 'play';
    }

    // ───── dibujo ─────
    function draw(ctx, VW, VH) {
      const ox = (VW - W * CS) / 2, oy = 30, TX = tx => ox + tx * CS, TY = ty => oy + ty * CS;
      ctx.fillStyle = '#0b0b11'; ctx.fillRect(0, 0, VW, VH);
      for (let py = oy; py < VH; py += CS) for (let px = 0; px < VW; px += CS) { ctx.fillStyle = ((Math.floor(px / CS) + Math.floor(py / CS)) % 2) ? '#222227' : '#27272d'; ctx.fillRect(px, py, CS, CS); }
      ctx.fillStyle = '#3a3934'; ctx.fillRect(VW / 2 - 8, oy - 2, 16, 22);
      const by = TY(BARR_Y);
      ctx.strokeStyle = '#6a6a72'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(TX(1), by); ctx.lineTo(TX(W - 1), by); ctx.stroke();
      for (let x = 1.5; x < W - 1; x += 1.1) { ctx.fillStyle = '#141414'; ctx.beginPath(); ctx.ellipse(TX(x), by, 13, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#2a2a2a'; ctx.beginPath(); ctx.ellipse(TX(x), by - 1, 13, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#3a3a3a'; ctx.beginPath(); ctx.ellipse(TX(x), by - 1, 5, 2.5, 0, 0, Math.PI * 2); ctx.fill(); }
      for (const e of enemies) { const ex = TX(e.x), ey = TY(e.y);
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(ex, ey + 9, 7, 2.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = e.stun > 0 ? '#5a6a8a' : '#26324a'; ctx.fillRect(ex - 6, ey - 6, 12, 15);
        ctx.fillStyle = '#11151f'; ctx.fillRect(ex - 7, ey - 4, 14, 4);
        ctx.fillStyle = '#0e1218'; ctx.beginPath(); ctx.arc(ex, ey - 9, 5, 0, Math.PI * 2); ctx.fill();
        if (e.flee) { ctx.font = '10px monospace'; ctx.textAlign = 'center'; ctx.fillText('💨', ex, ey + 14); }
        else if (e.stun > 0) { ctx.fillStyle = '#ffd54a'; ctx.font = '9px monospace'; ctx.textAlign = 'center'; ctx.fillText('✦', ex, ey - 14); } }
      // ROBOCOP (jefe)
      const bs = isHost ? boss : rboss;
      if (bs) { const bx = TX(bs.x), byy = TY(bs.y);
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(bx, byy + 20, 16, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#9aa3ad'; ctx.fillRect(bx - 14, byy - 16, 28, 36);            // torso metálico
        ctx.fillStyle = '#c7ced6'; ctx.fillRect(bx - 14, byy - 16, 28, 6);
        ctx.fillStyle = '#6b7580'; ctx.fillRect(bx - 18, byy - 12, 5, 24); ctx.fillRect(bx + 13, byy - 12, 5, 24);   // brazos
        ctx.fillStyle = '#7c848d'; ctx.fillRect(bx - 9, byy - 30, 18, 16);              // casco
        ctx.fillStyle = '#0e1a24'; ctx.fillRect(bx - 8, byy - 24, 16, 5);               // visor
        ctx.fillStyle = '#3fd0ff'; ctx.fillRect(bx - 8, byy - 23, 16, 2);               // visor luz
        // barra HP del jefe
        const bw = 90; ctx.fillStyle = '#331'; ctx.fillRect(bx - bw / 2, byy - 42, bw, 6); ctx.fillStyle = '#ff5252'; ctx.fillRect(bx - bw / 2, byy - 42, bw * Math.max(0, bs.hp) / BOSS_HP, 6); ctx.strokeStyle = '#000'; ctx.strokeRect(bx - bw / 2, byy - 42, bw, 6);
        // RAYO SOLAR (haz desde el jugador hacia Robocop)
        if (rayFx > 0) { ctx.save(); ctx.globalAlpha = rayFx; ctx.strokeStyle = '#ffe14a'; ctx.lineWidth = 4 + rayFx * 4; ctx.beginPath(); ctx.moveTo(ox + player.x, oy + player.y - 8); ctx.lineTo(bx, byy); ctx.stroke(); ctx.strokeStyle = '#fff7c0'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore(); }
      }
      // peers
      if (typeof Salon !== 'undefined' && Salon.getPeers && Salon.inBodegon && Salon.inBodegon()) {
        for (const pid of seats) { if (pid === myPid) continue; const p = Salon.getPeers().get(pid); if (!p || p.rx == null) continue; const px = TX(p.rx), py = TY(p.ry != null ? p.ry : 8); folk(ctx, px, py, '#3f5a4a'); if (p.nick) { ctx.fillStyle = '#9be8a0'; ctx.font = '9px monospace'; ctx.textAlign = 'center'; ctx.fillText(p.nick, px, py - 20); } }
      }
      folk(ctx, ox + player.x, oy + player.y, '#5a3a2a');
      // HUD
      const hpv = isHost ? hp : rhp, wv = isHost ? wave : rwave, ph = isHost ? phase : (rboss ? 'boss' : phase), rem = enemies.length;
      ctx.fillStyle = '#0a0a0e'; ctx.fillRect(0, 0, VW, 26);
      ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'left'; ctx.fillText('✊ ' + T('g.piquete.title'), 10, 18);
      ctx.textAlign = 'center';
      if (ph === 'boss') { ctx.fillStyle = '#ff8f8f'; ctx.font = 'bold 12px monospace'; ctx.fillText('🤖 ROBOCOP — ' + T('g.piquete.rayHint'), VW / 2, 18); }
      else { ctx.fillStyle = '#9be8a0'; ctx.font = '11px monospace'; ctx.fillText(T('g.piquete.waveHud', { n: wv || 1, of: WAVES }) + (rem ? ' · ' + T('g.piquete.remain', { n: rem }) : ''), VW / 2, 18); }
      const bw = 150, bx = VW - bw - 12; ctx.fillStyle = '#331'; ctx.fillRect(bx, 8, bw, 11); ctx.fillStyle = hpv > 40 ? '#4caf50' : '#e53935'; ctx.fillRect(bx, 8, bw * Math.max(0, hpv) / HP_MAX, 11);
      ctx.strokeStyle = '#000'; ctx.strokeRect(bx, 8, bw, 11); ctx.fillStyle = '#fff'; ctx.font = '9px monospace'; ctx.textAlign = 'right'; ctx.fillText(T('g.piquete.barricada') + ' ' + Math.round(hpv) + '%', VW - 14, 17);
      if (ph === 'win' || ph === 'lose') { ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(0, VH / 2 - 34, VW, 68); ctx.textAlign = 'center'; ctx.fillStyle = ph === 'win' ? '#9be8a0' : '#ff8f8f'; ctx.font = 'bold 20px monospace'; ctx.fillText(T(ph === 'win' ? 'g.piquete.win' : 'g.piquete.lose'), VW / 2, VH / 2 + 7); }
      else if (msgT > 0 && msg) { ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0, VH - 30, VW, 30); ctx.fillStyle = '#ffe2c0'; ctx.font = '12px monospace'; ctx.fillText(msg, VW / 2, VH - 11); }
    }
    function folk(ctx, x, y, col) {
      const sw = Math.sin((player.walk || 0)) * 1.5;
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(x, y + 10, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#202a3a'; ctx.fillRect(x - 4, y + 4, 3, 8 + sw); ctx.fillRect(x + 1, y + 4, 3, 8 - sw);
      ctx.fillStyle = col; ctx.fillRect(x - 6, y - 7, 12, 12);
      ctx.fillStyle = '#d9a878'; ctx.beginPath(); ctx.arc(x, y - 11, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1c1410'; ctx.beginPath(); ctx.arc(x, y - 13, 4.5, Math.PI, 0); ctx.fill();
    }

    return { update, draw, applyState, onRay,
      get done() { return done; }, get exitTo() { return exitTo; }, get result() { return result; }, get isHost() { return isHost; } };
  }
  return { create };
})();
if (typeof window !== 'undefined') window.Piquete = Piquete;
if (typeof module !== 'undefined') module.exports = Piquete;
