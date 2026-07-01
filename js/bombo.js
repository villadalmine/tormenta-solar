// bombo.js — MINI-JUEGO CO-OP "BOMBO & CUMBIA" (ritmo). Todos tocan el bombo AL RITMO (ESPACIO/E en el pulso) para
// levantar EL AGUANTE del piquete. Buen timing = mucho aguante + combo; fuera de ritmo = poco. El aguante decae, así
// que hay que seguir tocando. Llená la barra antes de que termine la cumbia → GANÁS. HOST-AUTHORITATIVE: cada cliente
// JUZGA SUS taps contra SU propio pulso (lo que ve) y le manda al host el aporte (lv3-tap {g}); el host suma el aguante
// global, corre el reloj y transmite (lv3-state). Aditivo: sin red = vos solo levantando el aguante.
const Bombo = (() => {
  const T = (k, p) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(k, p) : k;
  const BEAT = 0.5, WINDOW = 0.18, SONG = 22, TARGET = 100, HIT = 7, OFF = 1, DECAY = 5;
  // cada golpe al ritmo va CANTANDO la Marcha Peronista (en orden) + tira alguna consigna de Perón (homenaje/parodia)
  const MARCHA = ['¡Los muchachos peronistas!', 'todos unidos triunfaremos', 'y como siempre daremos', 'un grito de corazón:', '¡Viva Perón! ¡Viva Perón!', 'Por ese gran argentino', 'que se supo conquistar', 'a la gran masa del pueblo', 'combatiendo al capital'];
  const PERON = ['La única verdad es la realidad', 'Mejor que decir es hacer', 'Los únicos privilegiados son los niños', 'La patria es el otro', '¡Perón cumple, Evita dignifica!', 'Braden o Perón', 'De la casa al trabajo, del trabajo a casa'];

  function create(opts) {
    opts = opts || {};
    const isHost = (opts.role || 'host') === 'host';
    const seats = opts.seats || [];
    const myPid = opts.myPid || 'me';
    const sendState = opts.sendState || function () {};

    let aguante = 0, timeLeft = SONG, phase = 'intro', done = false, exitTo = null, t = 0, sendT = 0;
    let combo = 0, hitFx = 0, msg = '', msgT = 0, escHeld = false, tapHeld = false, result = null;
    let marchaIdx = 0, goodHits = 0; const floaters = [];   // frases que suben y se desvanecen en cada golpe al ritmo
    let raguante = 0, rphase = 'play', rtime = SONG;
    setMsg(T('g.bombo.intro'), 4);
    if (typeof Sfx !== 'undefined' && Sfx.setCumbia) Sfx.setCumbia(true);

    function setMsg(s, d = 3) { msg = s; msgT = d; }
    function leave(res) { result = res; phase = res; rphase = res; done = true; exitTo = 'lavalle'; if (typeof Sfx !== 'undefined' && Sfx.setCumbia) Sfx.setCumbia(false); }
    const beatDist = () => { const near = Math.round(t / BEAT) * BEAT; return Math.abs(t - near); };   // distancia al pulso más cercano
    function tap() {
      if ((isHost ? phase : rphase) !== 'play') return;
      const good = beatDist() < WINDOW;
      hitFx = good ? 1 : 0.4; combo = good ? combo + 1 : 0;
      if (typeof Sfx !== 'undefined' && Sfx.pickup) Sfx.pickup();
      if (good) {   // al ritmo → canta la Marcha (en orden) y de a ratos una consigna de Perón
        goodHits++;
        const txt = (goodHits % 5 === 0) ? PERON[(Math.random() * PERON.length) | 0] : MARCHA[marchaIdx++ % MARCHA.length];
        floaters.push({ txt, t: 0, dx: (Math.random() - 0.5) * 80 });
        if (floaters.length > 6) floaters.shift();
      }
      const add = (good ? HIT : OFF) + Math.min(6, Math.floor(combo / 4));   // combo suma un plus
      if (isHost) aguante = Math.min(TARGET, aguante + add);
      else if (typeof Salon !== 'undefined' && Salon.whisper && opts.hostPid) Salon.whisper(opts.hostPid, JSON.stringify({ t: 'lv3-tap', a: add }));
    }
    function onTap(m) { if (isHost && phase === 'play') aguante = Math.min(TARGET, aguante + (Math.min(12, +m.a || 1))); }   // aporte de un guest
    function applyState(d) { if (!d) return; if (d.a != null) raguante = d.a; if (d.tl != null) rtime = d.tl; if (d.p) { rphase = d.p; if ((d.p === 'win' || d.p === 'lose') && !done) leave(d.p); } }

    function update(dt) {
      t += dt; msgT -= dt; hitFx = Math.max(0, hitFx - dt * 3);
      for (let i = floaters.length - 1; i >= 0; i--) { floaters[i].t += dt; if (floaters[i].t > 1.8) floaters.splice(i, 1); }
      if (done) return;
      const tapNow = Input.keys[' '] || Input.keys['e'] || Input.keys['w'] || Input.keys['arrowup'];
      if (tapNow) { if (!tapHeld) { tapHeld = true; tap(); } } else tapHeld = false;
      if (Input.keys['escape']) { if (!escHeld) { escHeld = true; leave('flee'); return; } } else escHeld = false;
      if (isHost) {
        if (phase === 'intro') { if (msgT <= 0) phase = 'play'; return; }
        if (phase !== 'play') return;
        if (aguante >= TARGET) return leave('win');            // chequear ANTES del decay (si no, baja de 100 y nunca gana)
        aguante = Math.max(0, aguante - DECAY * dt); timeLeft -= dt;
        if (timeLeft <= 0) return leave(aguante >= TARGET ? 'win' : 'lose');
        sendT -= dt; if (sendT <= 0) { sendT = 0.12; const st = { t: 'lv3-state', a: Math.round(aguante), tl: +timeLeft.toFixed(1), p: phase }; for (const pid of seats) if (pid !== myPid) sendState(pid, st); }
      } else if (rphase === 'intro' && msgT <= 0) rphase = 'play';
    }

    function draw(ctx, VW, VH) {
      const a = isHost ? aguante : raguante, ph = isHost ? phase : rphase, tl = isHost ? timeLeft : rtime;
      ctx.fillStyle = '#160f1c'; ctx.fillRect(0, 0, VW, VH);
      for (let py = 26; py < VH; py += 30) for (let px = 0; px < VW; px += 30) { ctx.fillStyle = ((Math.floor(px / 30) + Math.floor(py / 30)) % 2) ? '#241a2b' : '#2a1f33'; ctx.fillRect(px, py, 30, 30); }
      // pulso del compás: el bombo late (grande justo en el beat)
      const pulse = Math.max(0, 1 - beatDist() / (BEAT / 2));
      const cx = VW / 2, cy = VH * 0.46, R = 58 + pulse * 12 + hitFx * 10;
      // anillo de timing (se cierra hacia el centro; verde cuando estás en ventana)
      ctx.strokeStyle = beatDist() < WINDOW ? '#7CFC00' : '#6a5a7a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, R + 16, 0, Math.PI * 2); ctx.stroke();
      // el bombo
      ctx.fillStyle = '#c0241f'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#f0f0f0'; ctx.lineWidth = 5; ctx.stroke();
      ctx.fillStyle = hitFx > 0.6 ? '#fff' : '#efe7d8'; ctx.beginPath(); ctx.arc(cx, cy, R - 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c0241f'; ctx.font = 'bold 22px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🥁', cx, cy); ctx.textBaseline = 'alphabetic';
      if (combo >= 4) { ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 15px monospace'; ctx.fillText('x' + combo + ' ¡AL PALO!', cx, cy + R + 34); }
      // frases de la Marcha / consignas de Perón que suben y se desvanecen en cada golpe al ritmo
      ctx.textAlign = 'center'; ctx.font = 'bold 13px monospace';
      for (const f of floaters) { const a = Math.max(0, 1 - f.t / 1.8); ctx.globalAlpha = a; ctx.fillStyle = '#ffe14a'; ctx.fillText(f.txt, cx + f.dx, cy - R - 16 - f.t * 46); }
      ctx.globalAlpha = 1;
      // barra de AGUANTE
      const bw = VW * 0.6, bx = (VW - bw) / 2, by = VH - 54;
      ctx.fillStyle = '#331'; ctx.fillRect(bx, by, bw, 16); ctx.fillStyle = a > 66 ? '#7CFC00' : a > 33 ? '#ffd54f' : '#e07b39'; ctx.fillRect(bx, by, bw * a / TARGET, 16);
      ctx.strokeStyle = '#000'; ctx.strokeRect(bx, by, bw, 16); ctx.fillStyle = '#fff'; ctx.font = '10px monospace'; ctx.textAlign = 'center'; ctx.fillText(T('g.bombo.aguante') + ' ' + Math.round(a) + '%', cx, by - 5);
      // HUD
      ctx.fillStyle = '#0a0a0e'; ctx.fillRect(0, 0, VW, 26);
      ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'left'; ctx.fillText('🥁 ' + T('g.bombo.title'), 10, 18);
      ctx.textAlign = 'center'; ctx.fillStyle = '#9be8a0'; ctx.font = '11px monospace'; ctx.fillText(T('g.bombo.tap'), cx, 18);
      ctx.textAlign = 'right'; ctx.fillStyle = '#ffcf6e'; ctx.font = '11px monospace'; ctx.fillText('⏱ ' + Math.max(0, Math.ceil(tl)) + 's', VW - 10, 18);
      if (ph === 'win' || ph === 'lose') { ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(0, VH / 2 - 30, VW, 60); ctx.textAlign = 'center'; ctx.fillStyle = ph === 'win' ? '#9be8a0' : '#ff8f8f'; ctx.font = 'bold 20px monospace'; ctx.fillText(T(ph === 'win' ? 'g.bombo.win' : 'g.bombo.lose'), cx, VH / 2 + 7); }
      else if (msgT > 0 && msg) { ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0, VH - 28, VW, 28); ctx.fillStyle = '#ffe2c0'; ctx.font = '12px monospace'; ctx.fillText(msg, cx, VH - 10); }
    }

    return { update, draw, applyState, onTap, tapExternal: tap,
      get done() { return done; }, get exitTo() { return exitTo; }, get result() { return result; }, get isHost() { return isHost; } };
  }
  return { create };
})();
if (typeof window !== 'undefined') window.Bombo = Bombo;
if (typeof module !== 'undefined') module.exports = Bombo;
