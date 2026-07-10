// regata.js — SUB-MODO "LA FINAL DEL OCHO" (v365, zarate-60.md). Timoneás el ocho de CAMPANA en la final
// contra ZÁRATE: [E] AL RITMO del metrónomo = ¡BOGA! (acelera; fuera de ritmo frena), W/S o A/D timoneás
// esquivando las BOYAS (pegarle frena el bote). El bote de Zárate APRIETA al final. Ganás → exitTo 'win'
// (game.js: arista regata_timonel + trofeo_remo 🏆). Perdés → [R] revancha / ESC vuelve a la costanera.
// Vista lateral con cámara que sigue tu bote. Determinístico (boyas fijas), sin red.
const Regata = (() => {
  const T = (k, p) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(k, p) : k;
  const DIST = 900;                 // metros de la final
  const PERIOD = 1.2;               // ciclo de la palada (el metrónomo)
  const WIN_LO = 0.78;              // ventana de ¡BOGA!: fase del ciclo donde la palada entra
  const PXU = 3;                    // píxeles por metro (cámara)

  function create(opts) {
    opts = opts || {};
    // BOYAS fijas (deterministicas) en tu andarivel: {x, ly} con ly en [-1..1]
    const BUOYS = [];
    for (let i = 0; i < 10; i++) BUOYS.push({ x: 140 + i * 74 + ((i * 37) % 30), ly: ((i % 3) - 1) * 0.7, hit: false });
    let st = 'count';               // count → race → won | lost
    let raceT = 0, countT = 3, endT = 0;
    const me = { x: 0, v: 0, lane: 0 };       // CAMPANA (vos de timonel)
    const rv = { x: 0, v: 0 };                // ZÁRATE
    let combo = 0, strokes = 0, goods = 0;
    let done = false, exitTo = null, t = 0, msg = '', msgT = 0, eHeld = false, rHeld = false, escHeld = false;
    let apreto = false;
    setMsg(T('g.regata.enter'), 6);

    function setMsg(s, d = 3) { msg = s; msgT = d; }
    function phase() { return (raceT % PERIOD) / PERIOD; }
    function reset() { st = 'count'; raceT = 0; countT = 3; endT = 0; me.x = 0; me.v = 0; me.lane = 0; rv.x = 0; rv.v = 0; combo = 0; strokes = 0; goods = 0; apreto = false; BUOYS.forEach(b => { b.hit = false; }); setMsg(T('g.regata.enter'), 4); }

    function stroke() {
      if (st !== 'race') return;
      strokes++;
      const ph = phase();
      if (ph >= WIN_LO || ph <= 0.1) {          // ¡BOGA! palada en tiempo
        goods++; combo++;
        me.v = Math.min(34 + combo, me.v + 13 + Math.min(4, combo));
        setMsg(combo >= 4 ? T('g.regata.bogaCombo', { n: combo }) : T('g.regata.boga'), 0.9);
        if (typeof Sfx !== 'undefined' && Sfx.pickup) Sfx.pickup();
      } else {                                   // fuera de ritmo: la palada desincroniza al bote
        combo = 0; me.v *= 0.78;
        setMsg(T('g.regata.fuera'), 1.2);
        if (typeof Sfx !== 'undefined' && Sfx.empty) Sfx.empty();
      }
    }

    function update(dt) {
      t += dt; msgT -= dt;
      if (Input.keys['escape']) { if (!escHeld) { escHeld = true; if (st === 'race' || st === 'count' || st === 'lost') { done = true; exitTo = 'back'; } } } else escHeld = false;
      if (st === 'count') {
        countT -= dt;
        if (countT <= 0) { st = 'race'; raceT = 0; setMsg(T('g.regata.largaron'), 2); if (typeof Sfx !== 'undefined' && Sfx.pickup) Sfx.pickup(); }
        return;
      }
      if (st === 'won') { endT += dt; if (endT > 3.5) { done = true; exitTo = 'win'; } return; }
      if (st === 'lost') {
        if (Input.keys['r']) { if (!rHeld) { rHeld = true; reset(); } } else rHeld = false;
        return;
      }
      // ---- carrera ----
      raceT += dt;
      if (Input.keys['e'] || Input.keys['enter']) { if (!eHeld) { eHeld = true; stroke(); } } else eHeld = false;
      let steer = 0;
      if (Input.keys['w'] || Input.keys['arrowup'] || Input.keys['a'] || Input.keys['arrowleft']) steer = -1;
      if (Input.keys['s'] || Input.keys['arrowdown'] || Input.keys['d'] || Input.keys['arrowright']) steer = 1;
      me.lane = Math.max(-1, Math.min(1, me.lane + steer * 2.2 * dt));
      me.v = Math.max(6, me.v - 6.5 * dt);      // el agua frena: sin paladas el bote muere
      me.x += me.v * dt;
      // boyas en tu andarivel: pegarle FRENA
      for (const b of BUOYS) {
        if (!b.hit && Math.abs(b.x - me.x) < 7 && Math.abs(b.ly - me.lane) < 0.34) {
          b.hit = true; combo = 0; me.v *= 0.5; setMsg(T('g.regata.boya'), 1.5);
          if (typeof Sfx !== 'undefined' && Sfx.empty) Sfx.empty();
        }
      }
      // ZÁRATE: ritmo parejo, gomita leve, y APRIETA en el último tramo
      let rvTarget = 20.5;
      if (rv.x > DIST * 0.7) { rvTarget = 26.5; if (!apreto) { apreto = true; setMsg(T('g.regata.aprieta'), 2.5); } }
      if (me.x - rv.x > 80) rvTarget += 2.5;    // no te regala la carrera
      if (rv.x - me.x > 90) rvTarget -= 2;      // tampoco te humilla
      rv.v += (rvTarget - rv.v) * Math.min(1, dt * 1.6);
      rv.x += rv.v * dt;
      // meta
      if (me.x >= DIST && me.x >= rv.x) { st = 'won'; endT = 0; setMsg(T('g.regata.won'), 5); if (typeof Sfx !== 'undefined' && Sfx.pickup) Sfx.pickup(); return; }
      if (rv.x >= DIST && rv.x > me.x) { st = 'lost'; setMsg(T('g.regata.lost'), 8); if (typeof Sfx !== 'undefined' && Sfx.empty) Sfx.empty(); return; }
    }

    function drawBoat(g, sx, sy, color, skin, rowPh, withCox) {
      // el ocho visto de costado: casco + 8 remeros + (vos) el timonel en la popa
      g.fillStyle = color; g.beginPath();
      g.moveTo(sx - 78, sy); g.lineTo(sx + 66, sy); g.lineTo(sx + 78, sy + 4); g.lineTo(sx - 70, sy + 6); g.closePath(); g.fill();
      g.fillStyle = skin;
      for (let r = 0; r < 8; r++) { g.beginPath(); g.arc(sx - 60 + r * 16, sy - 4, 3.5, 0, Math.PI * 2); g.fill(); }
      g.strokeStyle = 'rgba(230,230,210,0.75)'; g.lineWidth = 2;
      for (let r = 0; r < 8; r++) {
        const ang = Math.sin(rowPh + r * 0.12) * 0.7;
        g.beginPath(); g.moveTo(sx - 60 + r * 16, sy - 1);
        g.lineTo(sx - 60 + r * 16 + Math.cos(ang + 0.5) * 16, sy + 8 + Math.sin(ang) * 5); g.stroke();
      }
      if (withCox) { g.fillStyle = '#ffcf5b'; g.beginPath(); g.arc(sx + 70, sy - 4, 4, 0, Math.PI * 2); g.fill(); }   // VOS, mirando a los 8
    }

    function draw(g, VW, VH) {
      g.fillStyle = '#0b0d12'; g.fillRect(0, 0, VW, VH);   // base (limpia el frame anterior)
      // cielo + la costanera con la hinchada al fondo
      g.fillStyle = '#1a2030'; g.fillRect(0, 0, VW, VH * 0.22);
      g.fillStyle = '#242a1e'; g.fillRect(0, VH * 0.22, VW, VH * 0.06);
      for (let i = 0; i < 26; i++) {   // la hinchada (violeta y amarilla) saltando
        const hx = (i * 53 + 20) % VW, jump = Math.max(0, Math.sin(t * 5 + i * 1.3)) * 3;
        g.fillStyle = (i % 2) ? '#7a5aa0' : '#c9d24a'; g.fillRect(hx, VH * 0.23 - jump, 5, 8);
      }
      g.fillStyle = '#0d1017'; g.fillRect(VW / 2 - 150, 8, 300, 20);
      g.fillStyle = '#ffe9b0'; g.font = 'bold 11px monospace'; g.textAlign = 'center';
      g.fillText('FINAL DEL OCHO · CAMPANA vs ZÁRATE', VW / 2, 22);
      // el río
      const rTop = VH * 0.28, rBot = VH * 0.88;
      g.fillStyle = '#2c3a30'; g.fillRect(0, rTop, VW, rBot - rTop);
      const camX = me.x - 90;   // cámara: tu bote a un tercio de la pantalla
      const w2s = wx => (wx - camX) * PXU;
      g.fillStyle = 'rgba(120,140,110,0.25)';
      for (let i = 0; i < 16; i++) { const ox2 = ((i * 83 - camX * PXU * 0.6) % (VW + 60) + VW + 60) % (VW + 60) - 30; g.fillRect(ox2, rTop + 14 + (i % 5) * ((rBot - rTop - 30) / 5), 30, 2); }
      const yZ = rTop + (rBot - rTop) * 0.26;                        // andarivel ZÁRATE
      const yCbase = rTop + (rBot - rTop) * 0.68;                    // andarivel CAMPANA (vos)
      g.strokeStyle = 'rgba(220,220,200,0.25)'; g.lineWidth = 1; g.setLineDash([8, 10]);
      g.beginPath(); g.moveTo(0, (yZ + yCbase) / 2); g.lineTo(VW, (yZ + yCbase) / 2); g.stroke(); g.setLineDash([]);
      // la META (línea de llegada a cuadros)
      const mx = w2s(DIST);
      if (mx > -20 && mx < VW + 20) {
        for (let i = 0; i < 12; i++) { g.fillStyle = (i % 2) ? '#e8f0ff' : '#111'; g.fillRect(mx, rTop + i * ((rBot - rTop) / 12), 5, (rBot - rTop) / 12); }
        g.fillStyle = '#ffe9b0'; g.font = 'bold 10px monospace'; g.fillText('META', mx + 3, rTop - 4);
      }
      // BOYAS de tu andarivel
      for (const b of BUOYS) {
        const bx = w2s(b.x); if (bx < -12 || bx > VW + 12) continue;
        const by = yCbase + b.ly * 26;
        g.fillStyle = b.hit ? '#5a4a3a' : '#ff7a3a'; g.beginPath(); g.arc(bx, by + Math.sin(t * 3 + b.x) * 2, 6, 0, Math.PI * 2); g.fill();
      }
      // botes: ZÁRATE (amarillo) arriba, CAMPANA (violeta, con VOS de timonel) abajo
      drawBoat(g, w2s(rv.x), yZ, '#c9d24a', '#e0b98e', t * 5.2, false);
      drawBoat(g, w2s(me.x), yCbase + me.lane * 26, '#7a5aa0', '#e0b98e', t * (4 + me.v * 0.12), true);
      // HUD: barra de progreso de la carrera (C violeta / Z amarillo)
      { const bw = VW * 0.6, bx0 = VW * 0.2, by0 = 36;
        g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(bx0 - 4, by0 - 4, bw + 8, 18);
        g.fillStyle = '#3a4048'; g.fillRect(bx0, by0, bw, 3); g.fillRect(bx0, by0 + 7, bw, 3);
        g.fillStyle = '#7a5aa0'; g.beginPath(); g.arc(bx0 + Math.min(1, me.x / DIST) * bw, by0 + 1.5, 5, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#c9d24a'; g.beginPath(); g.arc(bx0 + Math.min(1, rv.x / DIST) * bw, by0 + 8.5, 5, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#9fb0c4'; g.font = '9px monospace'; g.textAlign = 'right';
        g.fillText(T('g.regata.faltan', { m: Math.max(0, Math.ceil(DIST - me.x)) }), bx0 + bw, by0 + 26); g.textAlign = 'center'; }
      // el METRÓNOMO de la palada (abajo): cursor que barre + la zona ¡BOGA!
      if (st === 'race' || st === 'count') {
        const mw = 300, mx0 = VW / 2 - mw / 2, my0 = VH - 46;
        g.fillStyle = 'rgba(0,0,0,0.65)'; g.fillRect(mx0 - 6, my0 - 8, mw + 12, 30);
        g.fillStyle = '#2a3040'; g.fillRect(mx0, my0, mw, 10);
        g.fillStyle = '#3aa05a'; g.fillRect(mx0 + mw * WIN_LO, my0, mw * (1 - WIN_LO), 10);   // la zona verde = ¡BOGA!
        g.fillStyle = '#3aa05a'; g.fillRect(mx0, my0, mw * 0.1, 10);
        const cx2 = mx0 + phase() * mw;
        g.fillStyle = '#e8f0ff'; g.fillRect(cx2 - 2, my0 - 5, 4, 20);
        g.fillStyle = '#9fb0c4'; g.font = 'bold 9px monospace'; g.fillText(T('g.regata.metron'), VW / 2, my0 + 20);
        if (combo >= 2) { g.fillStyle = '#ffd54f'; g.font = 'bold 11px monospace'; g.fillText('¡BOGA! ×' + combo, mx0 + mw + 40, my0 + 8); }
      }
      if (st === 'count') {   // la largada
        g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, VH * 0.4, VW, 60);
        g.fillStyle = '#ffe9b0'; g.font = 'bold 30px monospace';
        g.fillText(countT > 0.2 ? String(Math.ceil(countT)) : '¡YA!', VW / 2, VH * 0.4 + 40);
      }
      if (st === 'won') {     // CAMPANA CAMPEÓN
        g.fillStyle = 'rgba(0,0,0,' + Math.min(0.6, endT * 0.3) + ')'; g.fillRect(0, 0, VW, VH);
        g.fillStyle = '#ffd54f'; g.font = 'bold 26px monospace'; g.fillText('🏆 ' + T('g.regata.campeon'), VW / 2, VH * 0.42);
        g.fillStyle = '#b09ad0'; g.font = 'bold 14px monospace'; g.fillText(T('g.regata.campeonSub'), VW / 2, VH * 0.42 + 30);
        for (let i = 0; i < 20; i++) { const fx = (i * 97 + 40) % VW, fy = ((t * (60 + i * 7)) % VH); g.fillStyle = (i % 2) ? '#7a5aa0' : '#ffd54f'; g.fillRect(fx, fy, 4, 4); }   // papelitos
      }
      if (st === 'lost') {
        g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(0, 0, VW, VH);
        g.fillStyle = '#ff8a7a'; g.font = 'bold 20px monospace'; g.fillText(T('g.regata.perdiste'), VW / 2, VH * 0.42);
        g.fillStyle = '#e8f0ff'; g.font = 'bold 13px monospace'; g.fillText(T('g.regata.retry'), VW / 2, VH * 0.42 + 28);
      }
      if (msgT > 0 && msg) { g.fillStyle = 'rgba(0,0,0,0.72)'; g.fillRect(0, VH - 24, VW, 24); g.fillStyle = '#e8f0ff'; g.font = '12px monospace'; g.textAlign = 'center'; g.fillText(msg, VW / 2, VH - 8); }
    }

    return {
      get done() { return done; }, get exitTo() { return exitTo; },
      update, draw,
      // e2e: ganar la final (te ponés en la meta y corrés los frames del festejo)
      __win: () => { st = 'race'; me.x = DIST + 1; rv.x = DIST - 50; update(0.05); for (let k = 0; k < 200 && !done; k++) update(0.05); return exitTo; },
      // e2e: perder (Zárate llega primero) y probar la revancha con R
      __lose: () => { st = 'race'; rv.x = DIST + 1; me.x = DIST - 100; update(0.05); return st; },
      __state: () => st,
    };
  }
  return { create, DIST };
})();
if (typeof window !== 'undefined') window.Regata = Regata;
if (typeof module !== 'undefined') module.exports = Regata;
