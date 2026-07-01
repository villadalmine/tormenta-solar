// globo.js — SUB-MODO "MAPA DEL MUNDO" (specs/mapas-satelites-bunkers.md, Mapa A / F1). Una esfera pseudo-3D en canvas
// (sin libs): la Tierra gira, con las BASES en la superficie y los SATÉLITES REBELDES (IA) en órbita. Gira sola,
// arrastrás con el mouse (o ←/→) para girarla, y hacés click en una base/satélite para seleccionarla (tooltip).
// Es la "sala de situación": postal interactiva (F1, sin acciones todavía). Patrón sub-modo (bodegon/lavalle/piquete).
const Globo = (() => {
  const T = (k, p) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(k, p) : k;
  const D2R = Math.PI / 180;
  // DATA (v2: podría venir del ecosistema; MVP estático). Bases en la superficie (lat/lon), satélites en órbita (lon + fase).
  const BASES = [
    { name: 'Buenos Aires', lat: -34.6, lon: -58.4 }, { name: 'Base Sur', lat: -51, lon: -69 },
    { name: 'Andes', lat: -32, lon: -70 }, { name: 'Amazonia', lat: -3, lon: -60 },
    { name: 'Base Norte', lat: 19, lon: -99 }, { name: 'Iberia', lat: 40, lon: -3 },
    { name: 'Sahel', lat: 14, lon: 5 }, { name: 'Estepa', lat: 48, lon: 45 },
    { name: 'Himalaya', lat: 28, lon: 84 }, { name: 'Oriente', lat: 35, lon: 135 },
    { name: 'Base Austral', lat: -33, lon: 151 },
  ];
  const SATS = [
    { name: 'Satélite Rebelde ☀', lon: 0, lat: 8, ai: true }, { name: 'Nodo IA-2', lon: 120, lat: -12 },
    { name: 'Nodo IA-3', lon: 240, lat: 20 },
  ];

  function create() {
    let yaw = 0, tilt = -0.42, drag = false, dragDist = 0, lastX = 0, prevDown = false;
    let sel = null, done = false, exitTo = null, t = 0, escHeld = false;

    function rot(lat, lon) {   // (lat,lon)→ vector rotado por yaw (giro) + tilt (inclinación). z>0 = frente (visible).
      const la = lat * D2R, lo = lon * D2R + yaw;
      let x = Math.cos(la) * Math.sin(lo), y = Math.sin(la), z = Math.cos(la) * Math.cos(lo);
      const y2 = y * Math.cos(tilt) - z * Math.sin(tilt), z2 = y * Math.sin(tilt) + z * Math.cos(tilt);
      return { x, y: y2, z: z2 };
    }

    function update(dt) {
      t += dt;
      if (done) return;
      // arrastrar para girar (mouse). Sin arrastre, gira sola.
      const m = (typeof Input !== 'undefined' && Input.mouse) ? Input.mouse : null;
      if (m && m.down) { if (!drag) { drag = true; dragDist = 0; lastX = m.x; } const dx = m.x - lastX; yaw += dx * 0.006; dragDist += Math.abs(dx); lastX = m.x; }
      else { if (drag && prevDown && dragDist < 6) pick(m); drag = false; yaw += dt * 0.18; }   // soltar sin arrastrar = click → seleccionar
      if (m) prevDown = m.down;
      // teclas: ←/→ giran, ↑/↓ inclinan, Esc sale
      if (Input.keys['arrowleft'] || Input.keys['a']) yaw -= dt * 1.2;
      if (Input.keys['arrowright'] || Input.keys['d']) yaw += dt * 1.2;
      if (Input.keys['arrowup'] || Input.keys['w']) tilt = Math.max(-1.2, tilt - dt);
      if (Input.keys['arrowdown'] || Input.keys['s']) tilt = Math.min(1.2, tilt + dt);
      if (Input.keys['escape']) { if (!escHeld) { escHeld = true; done = true; exitTo = 'back'; return; } } else escHeld = false;
    }

    let _geo = null;   // guardo la geometría proyectada del último frame para el pick
    function pick(m) {
      if (!m || !_geo) return; let best = null, bd = 18 * 18;
      for (const g of _geo) { if (g.z <= 0) continue; const dx = g.sx - m.x, dy = g.sy - m.y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = g; } }
      sel = best ? best.ref : null;
    }

    function draw(ctx, VW, VH) {
      const cx = VW / 2, cy = VH / 2 + 6, R = Math.min(VW, VH) * 0.34;
      ctx.fillStyle = '#05060c'; ctx.fillRect(0, 0, VW, VH);
      // estrellas de fondo
      ctx.fillStyle = '#20242f'; for (let i = 0; i < 70; i++) { const a = i * 999 % VW, b = (i * 421) % VH; ctx.fillRect(a, b, 1, 1); }
      // océano (esfera) + terminador (sombra del lado no iluminado)
      const og = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.2, cx, cy, R); og.addColorStop(0, '#1b3a5a'); og.addColorStop(1, '#0a1830');
      ctx.fillStyle = og; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#2a4a6a'; ctx.lineWidth = 1.5; ctx.stroke();
      // grilla lat/long (meridianos + paralelos) — solo el hemisferio de frente (z>0)
      ctx.strokeStyle = 'rgba(120,180,230,0.18)'; ctx.lineWidth = 1;
      for (let lon = 0; lon < 360; lon += 30) { ctx.beginPath(); let started = false; for (let lat = -90; lat <= 90; lat += 6) { const p = rot(lat, lon); if (p.z > 0) { const sx = cx + R * p.x, sy = cy - R * p.y; if (started) ctx.lineTo(sx, sy); else { ctx.moveTo(sx, sy); started = true; } } else started = false; } ctx.stroke(); }
      for (let lat = -60; lat <= 60; lat += 30) { ctx.beginPath(); let started = false; for (let lon = 0; lon <= 360; lon += 6) { const p = rot(lat, lon); if (p.z > 0) { const sx = cx + R * p.x, sy = cy - R * p.y; if (started) ctx.lineTo(sx, sy); else { ctx.moveTo(sx, sy); started = true; } } else started = false; } ctx.stroke(); }
      const geo = [];
      // BASES en la superficie
      for (const b of BASES) { const p = rot(b.lat, b.lon); const sx = cx + R * p.x, sy = cy - R * p.y; geo.push({ sx, sy, z: p.z, ref: b });
        if (p.z <= 0) continue; const a = 0.4 + 0.6 * p.z;
        ctx.globalAlpha = a; ctx.fillStyle = sel === b ? '#ffd54f' : '#7CFC00'; ctx.beginPath(); ctx.arc(sx, sy, sel === b ? 5 : 3.2, 0, Math.PI * 2); ctx.fill();
        if (p.z > 0.55) { ctx.fillStyle = 'rgba(200,255,200,' + a + ')'; ctx.font = '9px monospace'; ctx.textAlign = 'left'; ctx.fillText(b.name, sx + 6, sy + 3); }
        ctx.globalAlpha = 1; }
      // SATÉLITES en órbita (radio mayor, giran más rápido)
      const orb = R * 1.28;
      for (const s of SATS) { const p = rot(s.lat, s.lon + (yaw * 40 / D2R) * 0 + t * 40); const sx = cx + orb * p.x, sy = cy - orb * p.y; geo.push({ sx, sy, z: p.z + 0.01, ref: s });
        const front = p.z > -0.2; if (!front) continue;
        ctx.fillStyle = s.ai ? (sel === s ? '#fff' : '#ff4d4d') : (sel === s ? '#fff' : '#8fb0e0');
        ctx.beginPath(); ctx.arc(sx, sy, sel === s ? 6 : 4, 0, Math.PI * 2); ctx.fill();
        if (s.ai) { ctx.strokeStyle = 'rgba(255,80,80,' + (0.4 + 0.4 * Math.sin(t * 6)) + ')'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(sx, sy, 9, 0, Math.PI * 2); ctx.stroke(); }
        ctx.fillStyle = '#cfd8e6'; ctx.font = '9px monospace'; ctx.textAlign = 'left'; ctx.fillText(s.name, sx + 8, sy + 3); }
      _geo = geo;
      // barra + tooltip
      ctx.fillStyle = '#0a0a0e'; ctx.fillRect(0, 0, VW, 26);
      ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'left'; ctx.fillText('🛰️ ' + T('g.globo.title'), 10, 18);
      ctx.textAlign = 'right'; ctx.fillStyle = '#9be8a0'; ctx.font = '10px monospace'; ctx.fillText(T('g.globo.hint'), VW - 10, 18);
      if (sel) { ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0, VH - 30, VW, 30); ctx.fillStyle = sel.ai ? '#ff8f8f' : '#9be8a0'; ctx.font = 'bold 12px monospace'; ctx.fillText((sel.ai ? '☀ ' : '📍 ') + sel.name + (sel.ai ? ' — ' + T('g.globo.satAi') : ''), VW / 2, VH - 11); }
    }

    return { update, draw, get done() { return done; }, get exitTo() { return exitTo; } };
  }
  return { create };
})();
if (typeof window !== 'undefined') window.Globo = Globo;
if (typeof module !== 'undefined') module.exports = Globo;
