// finale.js — CINEMÁTICA DE CIERRE del NIVEL 2 (subte.md §10.1). Se dispara al armar la Pirámide de Mayo con el
// chip del Libertador (exitTo 'win2'): el "proceso sanmartiniano de liberación mundial" en 5 beats DIBUJADOS
// (la señal sube → caen los satélites de la IA → San Martín cruza los Andes → la liberación MUNDIAL → amanece sobre
// Buenos Aires). Auto-avanza (~4.5s/beat), [E]/Espacio adelanta, Esc saltea. Al terminar → exitTo 'end' (pantalla de
// fin g.win2). Aislado y ADITIVO: si el módulo no está, game.js va derecho a la pantalla de fin.
const Finale = (() => {
  const T = (k, p) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(k, p) : k;
  const DUR = 4.6, FADE = 0.55;
  const BEATS = ['beam', 'satfall', 'sanmartin', 'world', 'dawn'];

  function create(opts) {
    opts = opts || {};
    let done = false, exitTo = null, t = 0, beat = 0, beatT = 0, eHeld = false, escHeld = false;
    const stars = []; for (let i = 0; i < 70; i++) stars.push({ x: Math.random(), y: Math.random() * 0.7, r: Math.random() * 1.4 + 0.3, ph: Math.random() * 6 });
    if (typeof Sfx !== 'undefined' && Sfx.win) Sfx.win();

    function next() { if (beat >= BEATS.length - 1) { done = true; exitTo = 'end'; } else { beat++; beatT = 0; } }
    function update(dt) {
      t += dt; beatT += dt;
      if (Input.keys['escape']) { if (!escHeld) { escHeld = true; done = true; exitTo = 'end'; } } else escHeld = false;
      if (Input.keys['e'] || Input.keys['enter'] || Input.keys[' '] || Input.keys['space']) { if (!eHeld) { eHeld = true; next(); } } else eHeld = false;
      if (beatT >= DUR) next();
    }
    // alpha de entrada/salida de cada beat (fundido)
    function beatAlpha() { const a = Math.min(1, beatT / FADE), b = Math.min(1, (DUR - beatT) / FADE); return Math.max(0, Math.min(a, b)); }

    function draw(g, VW, VH) {
      g.fillStyle = '#05060a'; g.fillRect(0, 0, VW, VH);
      const cx = VW / 2, cy = VH / 2, al = beatAlpha(), id = BEATS[beat];
      g.save(); g.globalAlpha = al;
      if (id === 'beam') drawBeam(g, VW, VH, cx, cy);
      else if (id === 'satfall') drawSatfall(g, VW, VH, cx, cy);
      else if (id === 'sanmartin') drawSanMartin(g, VW, VH, cx, cy);
      else if (id === 'world') drawWorld(g, VW, VH, cx, cy);
      else if (id === 'dawn') drawDawn(g, VW, VH, cx, cy);
      g.restore();
      // subtítulo (la línea del beat), fundido
      const line = T('g.finale.' + id);
      g.globalAlpha = al; g.textAlign = 'center'; g.font = 'bold 15px monospace';
      const words = line.split(' '), lines = []; let cur = '';
      for (const wd of words) { const cand = cur ? cur + ' ' + wd : wd; if (((g.measureText(cand) || {}).width || 0) > VW - 80 && cur) { lines.push(cur); cur = wd; } else cur = cand; }
      if (cur) lines.push(cur); const lh = 20, boxH = lines.length * lh + 22;
      g.fillStyle = 'rgba(0,0,0,0.62)'; g.fillRect(0, VH - boxH, VW, boxH);
      g.fillStyle = '#ffe9b0'; lines.forEach((ln, k) => g.fillText(ln, VW / 2, VH - boxH + 20 + k * lh));
      g.globalAlpha = 1;
      // puntitos de progreso + hint de controles
      for (let i = 0; i < BEATS.length; i++) { g.fillStyle = i === beat ? '#74acdf' : i < beat ? '#3a5a7a' : 'rgba(255,255,255,0.18)'; g.beginPath(); g.arc(VW / 2 - (BEATS.length - 1) * 6 + i * 12, 20, 3, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.font = '10px monospace'; g.textAlign = 'right'; g.fillText('[E] ' + T('g.finale.next') + ' · Esc ' + T('g.finale.skip'), VW - 12, 22);
    }
    function starfield(g, VW, VH) { for (const s of stars) { g.globalAlpha = (0.4 + Math.abs(Math.sin(t * 2 + s.ph)) * 0.6) * beatAlpha(); g.fillStyle = '#cfe0f0'; g.fillRect(s.x * VW, s.y * VH, s.r, s.r); } g.globalAlpha = beatAlpha(); }

    // BEAT 1 — la SEÑAL sube de la Pirámide a los satélites
    function drawBeam(g, VW, VH, cx, cy) {
      starfield(g, VW, VH);
      const py = VH - 70, pw = 46, ph = 66;   // Pirámide
      g.fillStyle = '#e8e4d8'; g.beginPath(); g.moveTo(cx - pw / 2, py); g.lineTo(cx, py - ph); g.lineTo(cx + pw / 2, py); g.closePath(); g.fill();
      g.fillStyle = 'rgba(0,0,0,0.16)'; g.beginPath(); g.moveTo(cx, py - ph); g.lineTo(cx + pw / 2, py); g.lineTo(cx, py); g.closePath(); g.fill();
      // el haz celeste subiendo
      const bw = 14 + Math.sin(t * 20) * 5, grd = g.createLinearGradient(cx, py - ph, cx, 40);
      grd.addColorStop(0, 'rgba(116,172,223,0.85)'); grd.addColorStop(1, 'rgba(116,172,223,0)');
      g.fillStyle = grd; g.fillRect(cx - bw, 40, bw * 2, py - ph - 40);
      g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(cx, py - ph - 8, 5 + Math.sin(t * 16) * 3, 0, Math.PI * 2); g.fill();
      // los satélites (rojos, arriba) recibiendo la señal
      for (const s of [[cx - 120, 70], [cx + 110, 60], [cx + 30, 44]]) { g.fillStyle = '#8b93a0'; g.fillRect(s[0] - 8, s[1] - 4, 16, 8);
        g.fillStyle = '#3a5a8a'; g.fillRect(s[0] - 18, s[1] - 2, 8, 4); g.fillRect(s[0] + 10, s[1] - 2, 8, 4);
        g.fillStyle = Math.sin(t * 8) > 0 ? '#ff3040' : '#a01820'; g.beginPath(); g.arc(s[0], s[1], 2.5, 0, Math.PI * 2); g.fill(); }
    }
    // BEAT 2 — los SATÉLITES de la IA se apagan y CAEN
    function drawSatfall(g, VW, VH, cx, cy) {
      starfield(g, VW, VH);
      const p = Math.min(1, beatT / DUR);
      for (const s of [[cx - 130, 90, 0.2], [cx + 120, 70, 0.5], [cx + 10, 60, 0.8], [cx - 40, 110, 0.35]]) {
        const fall = Math.max(0, p - s[2]) * 2, yy = s[1] + fall * (VH - 120), tilt = fall * 1.4;
        g.save(); g.translate(s[0] + fall * 40, yy); g.rotate(tilt);
        g.fillStyle = '#5d646e'; g.fillRect(-8, -4, 16, 8); g.fillStyle = '#33404e'; g.fillRect(-18, -2, 8, 4); g.fillRect(10, -2, 8, 4);
        g.fillStyle = fall > 0.05 ? '#444' : '#a01820'; g.beginPath(); g.arc(0, 0, 2.5, 0, Math.PI * 2); g.fill();
        if (fall > 0.02 && fall < 1) { g.fillStyle = 'rgba(255,140,40,' + (0.8 - fall * 0.6) + ')'; for (let k = 0; k < 4; k++) { g.fillRect(-2 - k * 4 - fall * 10, -1, 3, 2); } }   // estela de chispas
        g.restore();
      }
      g.globalAlpha = beatAlpha() * (0.5 + Math.abs(Math.sin(t * 3)) * 0.3); g.fillStyle = '#74acdf'; g.font = 'bold 20px monospace'; g.textAlign = 'center'; g.fillText('▓ IA OFFLINE ▓', cx, cy); g.globalAlpha = beatAlpha();
    }
    // BEAT 3 — SAN MARTÍN cruza los Andes (de nuevo, ahora contra la IA)
    function drawSanMartin(g, VW, VH, cx, cy) {
      // cielo de amanecer + montañas (los Andes)
      const grd = g.createLinearGradient(0, 0, 0, VH); grd.addColorStop(0, '#2a3a6a'); grd.addColorStop(0.6, '#c98a5a'); grd.addColorStop(1, '#6a4a3a');
      g.fillStyle = grd; g.fillRect(0, 0, VW, VH);
      g.fillStyle = '#f4d060'; g.beginPath(); g.arc(cx + 120, 110, 34, 0, Math.PI * 2); g.fill();   // sol
      g.fillStyle = '#e9e4dc'; for (const m of [[-40, 0.9], [cx * 0.5, 1.1], [cx, 0.8], [cx * 1.5, 1.15], [VW + 20, 0.95]]) { g.beginPath(); g.moveTo(m[0] - 130, VH); g.lineTo(m[0], VH - 150 * m[1]); g.lineTo(m[0] + 130, VH); g.closePath(); g.fill(); }
      g.fillStyle = '#c9c2b6'; for (const m of [[cx * 0.5, 1.1], [cx * 1.5, 1.15]]) { g.beginPath(); g.moveTo(m[0], VH - 150 * m[1]); g.lineTo(m[0] + 22, VH - 150 * m[1] + 34); g.lineTo(m[0] - 22, VH - 150 * m[1] + 34); g.closePath(); g.fill(); }   // nieve
      // San Martín a caballo (silueta azul), avanzando
      const hx = cx - 80 + Math.min(1, beatT / DUR) * 140, hy = VH - 96;
      g.save(); g.translate(hx, hy); g.fillStyle = '#22305a';
      g.fillRect(-22, -14, 34, 16);                        // cuerpo del caballo
      g.fillRect(-22, 0, 5, 16); g.fillRect(-6, 0, 5, 16); g.fillRect(6, 0, 5, 14); g.fillRect(-14, 0, 5, 15);   // patas
      g.beginPath(); g.moveTo(12, -12); g.lineTo(24, -20); g.lineTo(22, -6); g.closePath(); g.fill();   // cuello+cabeza
      g.fillRect(-2, -30, 8, 18);                          // jinete (torso)
      g.beginPath(); g.arc(2, -33, 4, 0, Math.PI * 2); g.fill();   // cabeza
      g.fillStyle = '#1a2340'; g.beginPath(); g.moveTo(-2, -37); g.lineTo(10, -35); g.lineTo(2, -30); g.closePath(); g.fill();   // bicornio
      // la bandera celeste-blanca que lleva
      g.save(); g.translate(-6, -30); const wv = Math.sin(t * 5) * 2;
      g.strokeStyle = '#5a4a2a'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -26); g.stroke();
      g.fillStyle = '#74acdf'; g.fillRect(-18, -26, 18, 5 + wv * 0); g.fillStyle = '#f4f4f4'; g.fillRect(-18, -21, 18, 5); g.fillStyle = '#74acdf'; g.fillRect(-18, -16, 18, 5);
      g.restore(); g.restore();
    }
    // BEAT 4 — la LIBERACIÓN MUNDIAL (el globo, una ola celeste barre los continentes)
    function drawWorld(g, VW, VH, cx, cy) {
      starfield(g, VW, VH);
      const R = Math.min(VW, VH) * 0.3;
      g.fillStyle = '#123a5a'; g.beginPath(); g.arc(cx, cy - 10, R, 0, Math.PI * 2); g.fill();   // océano
      g.save(); g.beginPath(); g.arc(cx, cy - 10, R, 0, Math.PI * 2); g.clip();
      g.fillStyle = '#2f6a3a';   // continentes (blobs simples)
      for (const c of [[-0.3, -0.2, 0.5, 0.4], [0.25, -0.35, 0.4, 0.3], [0.15, 0.25, 0.35, 0.5], [-0.35, 0.3, 0.3, 0.35], [0.4, 0.15, 0.25, 0.25]]) { g.beginPath(); g.ellipse(cx + c[0] * R, cy - 10 + c[1] * R, c[2] * R, c[3] * R, 0, 0, Math.PI * 2); g.fill(); }
      // la OLA CELESTE de liberación barriendo el globo
      const sweep = (Math.min(1, beatT / DUR)) * 2 - 0.5, sx = cx - R + sweep * 2 * R;
      const grd = g.createLinearGradient(sx - 40, 0, sx + 20, 0); grd.addColorStop(0, 'rgba(116,172,223,0)'); grd.addColorStop(0.7, 'rgba(140,200,255,0.75)'); grd.addColorStop(1, 'rgba(255,255,255,0.9)');
      g.fillStyle = grd; g.fillRect(sx - 40, cy - 10 - R, 60, R * 2);
      g.restore();
      g.strokeStyle = 'rgba(116,172,223,0.6)'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy - 10, R, 0, Math.PI * 2); g.stroke();
    }
    // BEAT 5 — AMANECE sobre Buenos Aires (el Obelisco, el pueblo festeja). Horizonte alto (gy) → el subtítulo no tapa a la gente.
    function drawDawn(g, VW, VH, cx, cy) {
      const gy = VH - 96;   // línea del horizonte / vereda (deja lugar abajo para el subtítulo)
      const grd = g.createLinearGradient(0, 0, 0, gy + 20); grd.addColorStop(0, '#f6b25a'); grd.addColorStop(0.55, '#e88a6a'); grd.addColorStop(1, '#6a4a5a');
      g.fillStyle = grd; g.fillRect(0, 0, VW, VH);
      g.fillStyle = '#ffe9a0'; g.beginPath(); g.arc(cx, gy, 44, Math.PI, 0); g.fill();   // sol naciente en el horizonte
      // skyline (siluetas)
      g.fillStyle = '#2a2536'; for (let i = 0; i < 14; i++) { const bw = 22 + (i % 3) * 10, bh = 46 + ((i * 37) % 84); g.fillRect(i * (VW / 14) - 4, gy - bh, bw, bh); }
      // el OBELISCO al centro
      g.fillStyle = '#d9d4cc'; g.beginPath(); g.moveTo(cx - 9, gy); g.lineTo(cx - 3, gy - 118); g.lineTo(cx + 3, gy - 118); g.lineTo(cx + 9, gy); g.closePath(); g.fill();
      g.fillStyle = '#c3bdb2'; g.beginPath(); g.moveTo(cx - 3, gy - 118); g.lineTo(cx, gy - 126); g.lineTo(cx + 3, gy - 118); g.closePath(); g.fill();
      // la vereda (franja oscura) donde está el pueblo
      g.fillStyle = '#1f1a2a'; g.fillRect(0, gy, VW, VH - gy);
      // el pueblo festejando (siluetas con pañuelos/banderitas), parados en la vereda (gy), la cabeza BIEN arriba del subtítulo
      for (let i = 0; i < 18; i++) { const px = 24 + i * (VW - 48) / 17, bob = Math.abs(Math.sin(t * 4 + i)) * 4;
        g.fillStyle = '#0f0c16'; g.fillRect(px - 3, gy - 20 - bob, 6, 20); g.beginPath(); g.arc(px, gy - 22 - bob, 3, 0, Math.PI * 2); g.fill();
        g.strokeStyle = i % 2 ? '#74acdf' : '#f4f4f4'; g.lineWidth = 2; g.beginPath(); g.moveTo(px, gy - 30 - bob); g.lineTo(px + 7, gy - 37 - bob); g.stroke(); }   // el brazo con la banderita
    }

    return {
      update, draw, get done() { return done; }, get exitTo() { return exitTo; },
      __skip: () => { done = true; exitTo = 'end'; return done; },
    };
  }
  return { create };
})();
if (typeof window !== 'undefined') window.Finale = Finale;
if (typeof module !== 'undefined') module.exports = Finale;
