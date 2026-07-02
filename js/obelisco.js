// obelisco.js — SUB-MODO "EL OBELISCO" (specs/lavalle.md E2+E3). Pasaste el corte → la PLAZA DE LA REPÚBLICA.
// DOS MODOS: (1) POSTAL (sin tormenta): noche, Obelisco gigante, el cuidador, el satélite rebelde cruzando el cielo.
// (2) JEFE (E3, post-tormenta): "cuando la tormenta pegue de nuevo acá pasa algo GRANDE" — EL SATÉLITE BAJA al
// Obelisco y te ataca con su rayo rojo (telegrafiado → esquivá); vos le devolvés con el RAYO SOLAR ([E]). Lo herís →
// hito histórico + gancho al DATACENTER colaborativo ("para bajarlo del todo, el barrio tiene que terminarlo").
// Ganado 1 vez (persistido por game.js): el satélite queda HERIDO humeando en el cielo. Volvés caminando abajo.
const Obelisco = (() => {
  const T = (k, p) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(k, p) : k;
  const CS = 30, W = 18, H = 15;
  const SAT_HP = 100, RAY_DMG = 6, RAY_CD = 0.25;

  function create(opts) {
    opts = opts || {};
    const boss = !!opts.stormed && !opts.satDown;          // E3: tormenta activa y todavía no lo heriste → PELEA
    const satDown = !!opts.satDown;                        // ya lo heriste alguna vez → queda humeando
    const player = { x: 9 * CS, y: (H - 2.5) * CS, r: 11, dir: -1, walk: 0 };
    let done = false, exitTo = null, result = null, t = 0, msg = '', msgT = 0, prompt = '', escHeld = false, eHeld = false, exitArmed = false, cuidaIdx = -1;
    let hp = 3, invuln = 0, rayCd = 0, rayFx = 0;
    const sat = { x: 9, hp: SAT_HP, phase: 'move', pt: 0, aimX: 9, downT: 0 };   // el jefe (tiles)
    const cuida = { x: 7.2, y: 9.2 };
    setMsg(T(boss ? 'g.obelisco.stormIntro' : 'g.obelisco.intro'), boss ? 6 : 7);
    if (typeof Sfx !== 'undefined' && Sfx.setMarcha) Sfx.setMarcha(!boss);   // en la pelea, silencio tenso (sin Marcha)

    function setMsg(s, d = 4) { msg = s; msgT = d; }
    function leave(res) { if (typeof Sfx !== 'undefined' && Sfx.setMarcha) Sfx.setMarcha(false); result = res || null; done = true; exitTo = 'lavalle'; }

    function update(dt) {
      t += dt; msgT -= dt; if (invuln > 0) invuln -= dt; if (rayCd > 0) rayCd -= dt; rayFx = Math.max(0, rayFx - dt * 5);
      if (done) return;
      const sp = 165 * dt; let mvx = 0, mvy = 0;
      if (Input.keys['arrowleft'] || Input.keys['a']) mvx = -1;
      if (Input.keys['arrowright'] || Input.keys['d']) mvx = 1;
      if (Input.keys['arrowup'] || Input.keys['w']) mvy = -1;
      if (Input.keys['arrowdown'] || Input.keys['s']) mvy = 1;
      const nx = player.x + mvx * sp, ny = player.y + mvy * sp;
      if (mvx && nx > CS && nx < (W - 1) * CS) player.x = nx;
      if (mvy && ny > 5.6 * CS && ny < (H - 0.4) * CS) player.y = ny;
      if (mvx) player.dir = mvx; player.walk = (mvx || mvy) ? player.walk + dt * 10 : 0;
      if (player.y < (H - 4) * CS) exitArmed = true;
      if (exitArmed && player.y > (H - 0.6) * CS) { leave(boss ? 'flee' : null); return; }
      if (Input.keys['escape']) { if (!escHeld) { escHeld = true; leave(boss ? 'flee' : null); return; } } else escHeld = false;

      if (boss && sat.phase !== 'down') {
        // ── LA PELEA: el satélite barre, APUNTA (telegrafía) y dispara su rayo rojo; vos [E] = rayo solar ──
        sat.pt += dt;
        if (sat.phase === 'move') { sat.x = 9 + Math.sin(t * 0.7) * 6; if (sat.pt > 2.6) { sat.phase = 'aim'; sat.pt = 0; sat.aimX = player.x / CS; } }
        else if (sat.phase === 'aim') { if (sat.pt > 0.8) { sat.phase = 'fire'; sat.pt = 0; } }
        else if (sat.phase === 'fire') {
          if (sat.pt < 0.7 && invuln <= 0 && Math.abs(player.x - sat.aimX * CS) < 22) { hp--; invuln = 1.2; if (typeof Sfx !== 'undefined' && Sfx.hurt) Sfx.hurt(); if (hp <= 0) { setMsg(T('g.obelisco.satLoseMsg'), 4); leave('satlose'); return; } }
          if (sat.pt > 0.7) { sat.phase = 'move'; sat.pt = 0; }
        }
        if ((Input.keys['e'] || Input.keys[' ']) && rayCd <= 0) {
          rayCd = RAY_CD; rayFx = 1; if (typeof Sfx !== 'undefined' && Sfx.shoot) Sfx.shoot();
          sat.hp = Math.max(0, sat.hp - RAY_DMG);
          if (sat.hp <= 0) { sat.phase = 'down'; sat.pt = 0; setMsg(T('g.obelisco.satWinMsg'), 8); }
        }
        prompt = T('g.obelisco.fightHint');
        return;
      }
      if (boss && sat.phase === 'down') { sat.pt += dt; if (sat.pt > 3.2) { leave('satwin'); } return; }   // se va humeando → volvés con la gloria

      // ── POSTAL: el cuidador ([E] cicla; si ya lo heriste, tiene una línea más) ──
      const nCuida = satDown ? 5 : 4;
      const nearCuida = Math.hypot(player.x - (cuida.x + 0.5) * CS, player.y - (cuida.y + 0.5) * CS) < CS * 1.6;
      if (nearCuida) {
        if (Input.keys['e']) { if (!eHeld) { eHeld = true; cuidaIdx = (cuidaIdx + 1) % nCuida; setMsg(T('g.obelisco.cuida' + (cuidaIdx + 1)), 6); } } else eHeld = false;
        prompt = T('g.obelisco.cuidaHint');
      } else { eHeld = false; prompt = player.y > (H - 2.4) * CS ? T('g.obelisco.exitHint') : ''; }
    }

    function draw(ctx, VW, VH) {
      const ox = (VW - W * CS) / 2, oy = 30, TX2 = tx => ox + tx * CS, TY2 = ty => oy + ty * CS;
      // CIELO: postal = noche; jefe = tormenta glitcheada (aurora roja)
      const sky = ctx.createLinearGradient(0, 0, 0, VH * 0.62);
      if (boss) { sky.addColorStop(0, '#1a0508'); sky.addColorStop(1, '#2e0f14'); } else { sky.addColorStop(0, '#05060e'); sky.addColorStop(1, '#141225'); }
      ctx.fillStyle = sky; ctx.fillRect(0, 0, VW, VH * 0.62);
      ctx.fillStyle = '#e8e8f0'; for (let i = 0; i < 60; i++) { const sx = (i * 131) % VW, sy = (i * 67) % (VH * 0.5); ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(t * 0.8 + i)); ctx.fillRect(sx, sy, 1.4, 1.4); } ctx.globalAlpha = 1;
      if (boss) { ctx.save(); ctx.globalAlpha = 0.10 + 0.06 * Math.sin(t * 7); ctx.fillStyle = '#ff3040'; for (let i = 0; i < 4; i++) ctx.fillRect(0, 40 + i * 34 + Math.sin(t * 3 + i) * 8, VW, 9); ctx.restore(); }   // aurora glitch
      // EL SATÉLITE: postal = cruza chiquito · jefe = BAJO Y GRANDE · herido = humea quieto
      let satPx, satPy, satSc;
      if (boss) { satPx = TX2(sat.x + 0.5); satPy = 74 + Math.sin(t * 1.6) * 6; satSc = 2.4; }
      else { const ph = (t * 0.05) % 1.4 - 0.2; satPx = ph * VW; satPy = 40 + Math.sin(ph * 3) * 12; satSc = satDown ? 1.4 : 1; if (satDown) { satPx = VW * 0.72; satPy = 52; } }
      { const s = satSc;
        ctx.fillStyle = satDown ? '#5d646e' : '#8b93a0'; ctx.fillRect(satPx - 5 * s, satPy - 2 * s, 10 * s, 4 * s);
        ctx.fillStyle = '#3a4a6a'; ctx.fillRect(satPx - 12 * s, satPy - 1.5 * s, 6 * s, 3 * s); ctx.fillRect(satPx + 6 * s, satPy - 1.5 * s, 6 * s, 3 * s);
        if (!satDown && Math.sin(t * 6) > 0) { ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.arc(satPx, satPy, 2.4 * s, 0, Math.PI * 2); ctx.fill(); }
        if (satDown) for (let i = 0; i < 3; i++) { const ph = (t * 0.5 + i * 0.4) % 1; ctx.globalAlpha = 0.3 * (1 - ph); ctx.fillStyle = '#777'; ctx.beginPath(); ctx.arc(satPx + Math.sin(t + i) * 4, satPy - 6 - ph * 26, 3 + ph * 5, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1;
        if (boss && sat.phase !== 'down') { const bw = 110; ctx.fillStyle = '#331'; ctx.fillRect(satPx - bw / 2, satPy - 26, bw, 7); ctx.fillStyle = '#ff5252'; ctx.fillRect(satPx - bw / 2, satPy - 26, bw * sat.hp / SAT_HP, 7); ctx.strokeStyle = '#000'; ctx.strokeRect(satPx - bw / 2, satPy - 26, bw, 7); }
        if (boss && sat.phase === 'down') { ctx.save(); ctx.globalAlpha = Math.max(0, 1 - sat.pt / 3); ctx.fillStyle = '#ff8a3b'; ctx.beginPath(); ctx.arc(satPx, satPy, 8 + sat.pt * 20, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      }
      // rayo del SATÉLITE (telegrafía + disparo)
      if (boss && sat.phase === 'aim') { const bx = TX2(sat.aimX); ctx.save(); ctx.globalAlpha = 0.25 + 0.2 * Math.sin(t * 14); ctx.strokeStyle = '#ff5252'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(satPx, satPy + 6); ctx.lineTo(bx, VH); ctx.stroke(); ctx.setLineDash([]); ctx.restore(); }
      if (boss && sat.phase === 'fire') { const bx = TX2(sat.aimX); ctx.save(); ctx.globalAlpha = 0.85; ctx.strokeStyle = '#ff3040'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(satPx, satPy + 6); ctx.lineTo(bx, VH); ctx.stroke(); ctx.strokeStyle = '#ffd0d0'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore(); }
      // la PLAZA
      for (let py = Math.floor(VH * 0.62); py < VH; py += CS) for (let px = 0; px < VW; px += CS) { ctx.fillStyle = ((Math.floor(px / CS) + Math.floor(py / CS)) % 2) ? '#33312d' : '#3b3934'; ctx.fillRect(px, py, CS, CS); }
      ctx.fillStyle = '#2a2926'; ctx.beginPath(); ctx.ellipse(VW / 2, VH * 0.66, VW * 0.36, 26, 0, 0, Math.PI * 2); ctx.fill();
      // EL OBELISCO
      { const bx = VW / 2, baseY = VH * 0.66, ow = 58, oh = VH * 0.58;
        ctx.fillStyle = boss ? '#b9a8a0' : '#d9d6cd'; ctx.beginPath();
        ctx.moveTo(bx - ow / 2, baseY); ctx.lineTo(bx - ow / 5, baseY - oh); ctx.lineTo(bx, baseY - oh - 22); ctx.lineTo(bx + ow / 5, baseY - oh); ctx.lineTo(bx + ow / 2, baseY); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.moveTo(bx, baseY); ctx.lineTo(bx + ow / 5, baseY - oh); ctx.lineTo(bx + ow / 2, baseY); ctx.closePath(); ctx.fill();
        ctx.fillStyle = boss ? '#a99890' : '#c6c3ba'; ctx.fillRect(bx - ow / 2 - 8, baseY - 14, ow + 16, 20);
        ctx.fillStyle = '#1a1c24'; for (let i = 0; i < 3; i++) ctx.fillRect(bx - 4, baseY - oh + 8 + i * 9, 8, 5);
        ctx.fillStyle = '#b3141a'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center'; ctx.fillText('VIVA PERÓN ✊', bx, baseY + 1); }
      // el CUIDADOR (solo en la postal; en la pelea se guareció)
      if (!boss) { const sx = TX2(cuida.x + 0.5), sy = TY2(cuida.y + 0.5), sw = -Math.abs(Math.sin(t * 3.3)) * 1.4;
        ctx.fillStyle = 'rgba(0,0,0,0.30)'; ctx.beginPath(); ctx.ellipse(sx, sy + 17, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#202a3a'; ctx.fillRect(sx - 5, sy + 5, 4, 11); ctx.fillRect(sx + 1, sy + 5, 4, 11);
        ctx.fillStyle = '#4a3a28'; ctx.fillRect(sx - 7, sy - 8 + sw, 14, 14);
        ctx.fillStyle = '#d9a878'; ctx.beginPath(); ctx.arc(sx, sy - 13 + sw, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#241812'; ctx.beginPath(); ctx.arc(sx, sy - 15 + sw, 5, Math.PI, 0); ctx.fill();
        ctx.fillRect(sx - 6, sy - 15 + sw, 3, 8); ctx.fillRect(sx + 3, sy - 15 + sw, 3, 8);
        ctx.fillStyle = '#9be8a0'; ctx.font = '9px monospace'; ctx.textAlign = 'center'; ctx.fillText(T('g.obelisco.cuidaName'), sx, sy - 24); }
      // VOS (parpadea si te pegaron)
      if (!(invuln > 0 && Math.sin(t * 30) > 0)) { const x = ox + player.x, y = oy + player.y, sw = Math.sin(player.walk) * 2;
        ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.beginPath(); ctx.ellipse(x, y + 17, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3a3340'; ctx.fillRect(x - 5, y + 5, 4, 11 + sw); ctx.fillRect(x + 1, y + 5, 4, 11 - sw);
        ctx.fillStyle = '#4a3b2a'; ctx.fillRect(x - 8, y - 8, 16, 15);
        ctx.save(); ctx.translate(x + 6, y - 2); ctx.rotate(0.55); ctx.fillStyle = '#7a3b12'; ctx.fillRect(-3.5, -12, 7, 22); ctx.fillStyle = '#d8a24a'; ctx.fillRect(-1, -12, 2, 22); ctx.restore();
        ctx.fillStyle = '#2a2018'; ctx.beginPath(); ctx.arc(x, y - 13, 7, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#241b14'; ctx.fillRect(x - 7, y - 12, 14, 9);
        // tu RAYO SOLAR
        if (rayFx > 0) { ctx.save(); ctx.globalAlpha = rayFx; ctx.strokeStyle = '#ffe14a'; ctx.lineWidth = 4 + rayFx * 4; ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(satPx, satPy); ctx.stroke(); ctx.strokeStyle = '#fff7c0'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore(); } }
      // barra + corazones + mensajes
      ctx.fillStyle = '#0a0a0e'; ctx.fillRect(0, 0, VW, 26);
      ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'left'; ctx.fillText((boss ? '⚡ ' : '🏛️ ') + T('g.obelisco.title'), 10, 18);
      if (boss) { ctx.textAlign = 'center'; ctx.font = '13px monospace'; ctx.fillText('❤️'.repeat(Math.max(0, hp)) + '🖤'.repeat(Math.max(0, 3 - hp)), VW / 2, 18); }
      ctx.textAlign = 'right'; ctx.fillStyle = '#9be8a0'; ctx.font = '10px monospace'; ctx.fillText('WASD · ↓ ' + T('g.obelisco.back'), VW - 10, 18);
      let bottom = VH;
      if (msgT > 0 && msg) { ctx.font = '12px monospace'; ctx.textAlign = 'center';
        const words = msg.split(' '), lines = []; let cur = '';
        for (const wd of words) { const cand = cur ? cur + ' ' + wd : wd; if (((ctx.measureText(cand) || {}).width || 0) > VW - 44 && cur) { lines.push(cur); cur = wd; } else cur = cand; }
        if (cur) lines.push(cur); const lh = 15, boxH = lines.length * lh + 8;
        ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, VH - boxH, VW, boxH);
        ctx.fillStyle = '#ffe2c0'; lines.forEach((ln, k) => ctx.fillText(ln, VW / 2, VH - boxH + 14 + k * lh)); bottom = VH - boxH; }
      if (prompt) { ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(0,0,0,0.78)'; ctx.fillRect(0, bottom - 22, VW, 22); ctx.fillStyle = '#ffd54f'; ctx.fillText(prompt, VW / 2, bottom - 7); }
    }

    return { update, draw, get done() { return done; }, get exitTo() { return exitTo; }, get result() { return result; } };
  }
  return { create };
})();
if (typeof window !== 'undefined') window.Obelisco = Obelisco;
if (typeof module !== 'undefined') module.exports = Obelisco;
