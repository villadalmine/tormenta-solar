// obelisco.js — SUB-MODO "EL OBELISCO" (specs/lavalle.md E2). Pasaste el corte (ganaste los 5 mini-juegos + juramento)
// → la PLAZA DE LA REPÚBLICA de noche, al pie del OBELISCO gigante, con la pintada "VIVA PERÓN" en la base, el CUIDADOR
// (linyera) que te cuenta la posta, y el SATÉLITE REBELDE (la IA que desató la tormenta) cruzando el cielo con su ojo
// rojo — gancho de E3. Volvés caminando para abajo (al piquete). Patrón sub-modo (lavalle.js/bodegon.js).
const Obelisco = (() => {
  const T = (k, p) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(k, p) : k;
  const CS = 30, W = 18, H = 15;

  function create() {
    const player = { x: 9 * CS, y: (H - 2.5) * CS, r: 11, dir: -1, walk: 0 };
    let done = false, exitTo = null, t = 0, msg = '', msgT = 0, prompt = '', escHeld = false, eHeld = false, exitArmed = false, cuidaIdx = -1;
    const cuida = { x: 7.2, y: 9.2 };   // el cuidador del Obelisco (tiles)
    setMsg(T('g.obelisco.intro'), 7);
    if (typeof Sfx !== 'undefined' && Sfx.setMarcha) Sfx.setMarcha(true);   // la Marcha sigue sonando (venís de la fiesta)

    function setMsg(s, d = 4) { msg = s; msgT = d; }
    function leave() { if (typeof Sfx !== 'undefined' && Sfx.setMarcha) Sfx.setMarcha(false); done = true; exitTo = 'lavalle'; }

    function update(dt) {
      t += dt; msgT -= dt;
      if (done) return;
      const sp = 165 * dt; let mvx = 0, mvy = 0;
      if (Input.keys['arrowleft'] || Input.keys['a']) mvx = -1;
      if (Input.keys['arrowright'] || Input.keys['d']) mvx = 1;
      if (Input.keys['arrowup'] || Input.keys['w']) mvy = -1;
      if (Input.keys['arrowdown'] || Input.keys['s']) mvy = 1;
      const nx = player.x + mvx * sp, ny = player.y + mvy * sp;
      if (mvx && nx > CS && nx < (W - 1) * CS) player.x = nx;
      if (mvy && ny > 5.6 * CS && ny < (H - 0.4) * CS) player.y = ny;   // la plaza (no te metés adentro del Obelisco)
      if (mvx) player.dir = mvx; player.walk = (mvx || mvy) ? player.walk + dt * 10 : 0;
      if (player.y < (H - 4) * CS) exitArmed = true;
      if (exitArmed && player.y > (H - 0.6) * CS) { leave(); return; }
      if (Input.keys['escape']) { if (!escHeld) { escHeld = true; leave(); return; } } else escHeld = false;
      // el CUIDADOR: [E] cicla sus líneas (la última es el gancho de E3)
      const nearCuida = Math.hypot(player.x - (cuida.x + 0.5) * CS, player.y - (cuida.y + 0.5) * CS) < CS * 1.6;
      if (nearCuida) {
        if (Input.keys['e']) { if (!eHeld) { eHeld = true; cuidaIdx = (cuidaIdx + 1) % 4; setMsg(T('g.obelisco.cuida' + (cuidaIdx + 1)), 6); } } else eHeld = false;
        prompt = T('g.obelisco.cuidaHint');
      } else { eHeld = false; prompt = player.y > (H - 2.4) * CS ? T('g.obelisco.exitHint') : ''; }
    }

    function draw(ctx, VW, VH) {
      const ox = (VW - W * CS) / 2, oy = 30, TX2 = tx => ox + tx * CS, TY2 = ty => oy + ty * CS;
      // CIELO nocturno (gradiente) + estrellas
      const sky = ctx.createLinearGradient(0, 0, 0, VH * 0.62); sky.addColorStop(0, '#05060e'); sky.addColorStop(1, '#141225');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, VW, VH * 0.62);
      ctx.fillStyle = '#e8e8f0'; for (let i = 0; i < 60; i++) { const sx = (i * 131) % VW, sy = (i * 67) % (VH * 0.5); ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(t * 0.8 + i)); ctx.fillRect(sx, sy, 1.4, 1.4); } ctx.globalAlpha = 1;
      // EL SATÉLITE REBELDE cruza el cielo (el ojo rojo de la IA — gancho E3)
      { const ph = (t * 0.05) % 1.4 - 0.2, sx = ph * VW, sy = 40 + Math.sin(ph * 3) * 12;
        ctx.fillStyle = '#8b93a0'; ctx.fillRect(sx - 5, sy - 2, 10, 4);
        ctx.fillStyle = '#3a4a6a'; ctx.fillRect(sx - 12, sy - 1.5, 6, 3); ctx.fillRect(sx + 6, sy - 1.5, 6, 3);   // paneles
        const blink = Math.sin(t * 6) > 0; if (blink) { ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.arc(sx, sy, 2.4, 0, Math.PI * 2); ctx.fill(); }
        ctx.strokeStyle = 'rgba(255,60,60,' + (0.10 + 0.08 * Math.sin(t * 2)) + ')'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(sx, sy + 3); ctx.lineTo(VW / 2, VH * 0.2); ctx.stroke(); }   // "mira" al Obelisco
      // la PLAZA (piso claro) — de la mitad para abajo
      for (let py = Math.floor(VH * 0.62); py < VH; py += CS) for (let px = 0; px < VW; px += CS) { ctx.fillStyle = ((Math.floor(px / CS) + Math.floor(py / CS)) % 2) ? '#33312d' : '#3b3934'; ctx.fillRect(px, py, CS, CS); }
      ctx.fillStyle = '#2a2926'; ctx.beginPath(); ctx.ellipse(VW / 2, VH * 0.66, VW * 0.36, 26, 0, 0, Math.PI * 2); ctx.fill();
      // EL OBELISCO GIGANTE (desde la base, blanco a la luna)
      { const bx = VW / 2, baseY = VH * 0.66, ow = 58, oh = VH * 0.58;
        ctx.fillStyle = '#d9d6cd'; ctx.beginPath();
        ctx.moveTo(bx - ow / 2, baseY); ctx.lineTo(bx - ow / 5, baseY - oh); ctx.lineTo(bx, baseY - oh - 22); ctx.lineTo(bx + ow / 5, baseY - oh); ctx.lineTo(bx + ow / 2, baseY); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.moveTo(bx, baseY); ctx.lineTo(bx + ow / 5, baseY - oh); ctx.lineTo(bx + ow / 2, baseY); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#c6c3ba'; ctx.fillRect(bx - ow / 2 - 8, baseY - 14, ow + 16, 20);   // la base
        // ventanitas del mirador
        ctx.fillStyle = '#1a1c24'; for (let i = 0; i < 3; i++) ctx.fillRect(bx - 4 + 0, baseY - oh + 8 + i * 9, 8, 5);
        // la PINTADA en la base
        ctx.fillStyle = '#b3141a'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center'; ctx.fillText('VIVA PERÓN ✊', bx, baseY + 1); }
      // el CUIDADOR (linyera al pie)
      { const sx = TX2(cuida.x + 0.5), sy = TY2(cuida.y + 0.5), sw = -Math.abs(Math.sin(t * 3.3)) * 1.4;
        ctx.fillStyle = 'rgba(0,0,0,0.30)'; ctx.beginPath(); ctx.ellipse(sx, sy + 17, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#202a3a'; ctx.fillRect(sx - 5, sy + 5, 4, 11); ctx.fillRect(sx + 1, sy + 5, 4, 11);
        ctx.fillStyle = '#4a3a28'; ctx.fillRect(sx - 7, sy - 8 + sw, 14, 14);
        ctx.fillStyle = '#d9a878'; ctx.beginPath(); ctx.arc(sx, sy - 13 + sw, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#241812'; ctx.beginPath(); ctx.arc(sx, sy - 15 + sw, 5, Math.PI, 0); ctx.fill();
        ctx.fillRect(sx - 6, sy - 15 + sw, 3, 8); ctx.fillRect(sx + 3, sy - 15 + sw, 3, 8);   // melena
        ctx.fillStyle = '#9be8a0'; ctx.font = '9px monospace'; ctx.textAlign = 'center'; ctx.fillText(T('g.obelisco.cuidaName'), sx, sy - 24); }
      // VOS (el Carpo de espaldas)
      { const x = ox + player.x, y = oy + player.y, sw = Math.sin(player.walk) * 2;
        ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.beginPath(); ctx.ellipse(x, y + 17, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3a3340'; ctx.fillRect(x - 5, y + 5, 4, 11 + sw); ctx.fillRect(x + 1, y + 5, 4, 11 - sw);
        ctx.fillStyle = '#4a3b2a'; ctx.fillRect(x - 8, y - 8, 16, 15);
        ctx.save(); ctx.translate(x + 6, y - 2); ctx.rotate(0.55); ctx.fillStyle = '#7a3b12'; ctx.fillRect(-3.5, -12, 7, 22); ctx.fillStyle = '#d8a24a'; ctx.fillRect(-1, -12, 2, 22); ctx.restore();
        ctx.fillStyle = '#2a2018'; ctx.beginPath(); ctx.arc(x, y - 13, 7, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#241b14'; ctx.fillRect(x - 7, y - 12, 14, 9); }
      // barra + mensajes
      ctx.fillStyle = '#0a0a0e'; ctx.fillRect(0, 0, VW, 26);
      ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'left'; ctx.fillText('🏛️ ' + T('g.obelisco.title'), 10, 18);
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

    return { update, draw, get done() { return done; }, get exitTo() { return exitTo; } };
  }
  return { create };
})();
if (typeof window !== 'undefined') window.Obelisco = Obelisco;
if (typeof module !== 'undefined') module.exports = Obelisco;
