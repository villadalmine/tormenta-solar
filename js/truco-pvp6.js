// truco-pvp6.js — SUB-MODO escena del TRUCO DE A 6 (3v3) PvP (specs/truco.md §14). Envuelve el motor TrucoNet6:
// el HOST corre la partida (humanos por whisper + asientos IA por heurística) y empuja una VISTA a cada jugador
// humano; los GUEST solo mandan intenciones y renderizan su vista. game.js inyecta el ruteo (no maneja pids acá).
// Render: los 6 alrededor de una mesa ovalada (color por equipo), tu mano abajo (interactiva). Capa aditiva.
const TrucoPvp6 = (() => {
  const T = (k, p) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t('g.truco6.' + k, p) : k;
  const SUITSV = { e: { l: 'E', c: '#141422' }, b: { l: 'B', c: '#14240f' }, o: { l: 'O', c: '#b8860b' }, c: { l: 'C', c: '#a01020' } };
  const TEAMCOL = { A: '#4a90d9', B: '#d95a5a' };

  // opts: { role, mySeat, nicks[6], seed, ai[6], humanSeats[], pushView(seat,v), sendAct(obj) }
  function create(opts) {
    opts = opts || {};
    const role = opts.role === 'host' ? 'host' : 'guest';
    const mySeat = opts.mySeat | 0;
    const nicks = opts.nicks || [];
    const humanSeats = opts.humanSeats || [];
    const pushView = typeof opts.pushView === 'function' ? opts.pushView : () => {};
    const sendAct = typeof opts.sendAct === 'function' ? opts.sendAct : () => {};
    const match = (role === 'host' && typeof TrucoNet6 !== 'undefined') ? TrucoNet6.match({ seed: opts.seed, ai: opts.ai }) : null;
    let view = null, done = false, result = 'lose', floresDelta = 0, lastRev = -1;
    let escHeld = false, keyHeld = {}, lastCanto = 0, helloT = 0;

    if (match) { match.start(); syncViews(true); }
    if (role === 'guest') { try { sendAct({ t: 't6-hello' }); } catch (e) {} }

    function syncViews(force) {
      if (!match) return;
      if (!force && match.rev === lastRev) return;
      lastRev = match.rev; view = match.viewFor(mySeat);
      for (const s of humanSeats) { try { pushView(s, match.viewFor(s)); } catch (e) {} }
    }
    function localAct(a) { if (role === 'host') { match.act(mySeat, a); syncViews(); } else sendAct({ t: 't6-act', a }); }

    // ── ruteo entrante (game.js resuelve pid→seat y llama estos) ──
    function onAct(seat, a) { if (match) { match.act(seat, a); syncViews(); } }            // host: acción de un humano
    function onHello(seat) { if (match) { try { pushView(seat, match.viewFor(seat)); } catch (e) {} } }
    function onBye(seat) {                                                                  // host: humano se fue → IA lo toma
      if (match && seat != null) { match.dropToAI(seat); syncViews(); }
      else if (!match && !done) { done = true; result = 'left'; }                           // guest: el host se fue
    }
    function onView(v) {
      view = v;
      if (view) {
        if (view.pending && view.pending.mine && typeof Mensajero !== 'undefined' && Mensajero.cantar) {
          const k = view.pending.kind + view.pending.level; if (k !== lastCanto) { lastCanto = k; cantarVoz(view.pending); }
        } else if (!view.pending) lastCanto = 0;
        if (view.done && !done) endFromView();
      }
    }
    function cantarVoz(p) { const F = p.kind === 'envido' ? ['¡ENVIDO!', '¡REAL ENVIDO!', '¡FALTA ENVIDO!'][p.level - 1] : ['¡TRUCO!', '¡RETRUCO!', '¡VALE CUATRO!'][p.level - 1]; if (F) Mensajero.cantar(F); }
    function endFromView() { done = true; result = view.win ? 'win' : 'lose'; floresDelta = view.floresDelta || 0; }

    function update(dt) {
      if (Input.keys['escape']) { if (!escHeld) { escHeld = true; if (role === 'guest') sendAct({ t: 't6-bye' }); done = true; result = 'lose'; } return; } else escHeld = false;
      if (role === 'host') { match.update(dt); syncViews(); if (view && view.done && !done) endFromView(); }
      else if (!view) { helloT += dt; if (helloT >= 1.2) { helloT = 0; try { sendAct({ t: 't6-hello' }); } catch (e) {} } }

      if (!view || view.phase !== 'play') { drain(); return; }
      const tap = k => { const d = Input.keys[k]; if (d && !keyHeld[k]) { keyHeld[k] = true; return true; } if (!d) keyHeld[k] = false; return false; };
      if (view.pending && view.pending.mine) {
        if (tap('q')) localAct({ k: 'resp', r: 'quiero' });
        else if (tap('n')) localAct({ k: 'resp', r: 'no' });
        else if (tap('t') && view.pending.kind === 'truco' && view.pending.level < 3) localAct({ k: 'canto', c: ['retruco', 'vale4'][view.pending.level - 1] });
        else if (tap('v') && view.pending.kind === 'envido' && view.pending.level < 3) localAct({ k: 'canto', c: ['real', 'falta'][view.pending.level - 1] });
        else if (tap('v') && view.pending.kind === 'truco' && view.canEnvido) localAct({ k: 'canto', c: 'envido' });
        drain(); return;
      }
      if (view.pending) { drain(); return; }
      if (view.turn) {
        for (let i = 0; i < 3; i++) if (tap(String(i + 1)) && view.hand[i] && !view.hand[i].used) { localAct({ k: 'play', i }); break; }
        if (tap('v') && view.canEnvido) localAct({ k: 'canto', c: 'envido' });
        else if (tap('t') && view.trucoLevel < 3) localAct({ k: 'canto', c: ['truco', 'retruco', 'vale4'][view.trucoLevel] });
      }
      drain();
    }
    function drain() { for (const k in keyHeld) if (!Input.keys[k]) keyHeld[k] = false; }

    function card(ctx, cx, cy, c, sc) {
      sc = sc || 1; const w = 36 * sc, h = 52 * sc;
      ctx.fillStyle = '#f4f0e0'; ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
      ctx.strokeStyle = '#222'; ctx.lineWidth = 1.5; ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);
      if (!c) return; const s = SUITSV[c.s] || { l: '?', c: '#222' };
      ctx.fillStyle = s.c; ctx.font = 'bold ' + (18 * sc | 0) + 'px monospace'; ctx.textAlign = 'center';
      ctx.fillText(c.n, cx, cy - 1); ctx.font = 'bold ' + (11 * sc | 0) + 'px monospace'; ctx.fillText(s.l, cx, cy + 14 * sc);
    }

    function draw(ctx, W, H) {
      const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#10220f'); bg.addColorStop(1, '#071206');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2 + 6, rx = 250, ry = 150;
      ctx.fillStyle = '#0d1b0c'; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center'; ctx.fillText('🃏 TRUCO DE A 6 (3v3)', cx, 20);
      if (!view) { ctx.fillStyle = '#cfe8c0'; ctx.font = '13px monospace'; ctx.fillText(T('connecting'), cx, cy); return; }
      // los 6 alrededor (mi asiento abajo). rel 0=abajo, va en sentido horario.
      for (const sd of view.seats) {
        const rel = (sd.seat - mySeat + 6) % 6, ang = Math.PI / 2 + rel * (Math.PI / 3);
        const sx = cx + Math.cos(ang) * (rx + 26), sy = cy + Math.sin(ang) * (ry + 26);
        const px = cx + Math.cos(ang) * (rx - 52), py = cy + Math.sin(ang) * (ry - 40);
        if (view.turnSeat === sd.seat) { ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, sy, 16, 0, Math.PI * 2); ctx.stroke(); }
        ctx.fillStyle = TEAMCOL[sd.team]; ctx.beginPath(); ctx.arc(sx, sy, 11, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.fillText(sd.team, sx, sy + 3);
        const nm = (sd.seat === mySeat ? T('you') : (nicks[sd.seat] || (sd.ai ? T('bot') : '?'))) + (sd.ai ? ' 🤖' : '') + (sd.mano ? ' •' : '');
        ctx.fillStyle = '#cfe8c0'; ctx.font = '8px monospace'; ctx.fillText(nm, sx, sy - 16);
        if (sd.played) card(ctx, px, py, sd.played, 0.85);
      }
      // mi mano
      for (let i = 0; i < 3; i++) { const h = view.hand[i]; if (!h) continue; const hx = cx - 64 + i * 64, hy = H - 46;
        if (h.used) { ctx.globalAlpha = 0.25; card(ctx, hx, hy, h.c, 1); ctx.globalAlpha = 1; }
        else { card(ctx, hx, hy, h.c, 1); ctx.fillStyle = '#ffe14d'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; ctx.fillText('[' + (i + 1) + ']', hx, hy + 38); } }
      // marcador + modo de baza
      ctx.fillStyle = '#cfe8c0'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
      ctx.fillText(T('score', { team: view.myTeam, me: view.score.me, opp: view.score.opp }), cx, 40);
      ctx.fillStyle = '#9fd3ff'; ctx.font = '11px monospace';
      ctx.fillText(T('mode.' + view.mode, { n: view.bazaIdx + 1 }) + '   ·   ' + T('dealPts', { me: view.dealPts.me, opp: view.dealPts.opp }), cx, 56);
      // nota / turno
      ctx.font = '13px monospace';
      if (view.note) { ctx.fillStyle = '#ffd54f'; ctx.fillText(T('note.' + view.note.k, view.note.p), cx, 74); }
      else if (view.phase === 'play') { ctx.fillStyle = view.turn ? '#7CFC00' : '#cfe8c0'; ctx.fillText(view.turn ? T('yourTurn') : T('waiting'), cx, 74); }
      if (view.pending && view.pending.mine) { ctx.fillStyle = '#ff9ed0'; ctx.font = 'bold 13px monospace'; ctx.fillText(T('respond.' + view.pending.kind, { lvl: view.pending.level }), cx, H - 70); }
      else if (view.pending) { ctx.fillStyle = '#ffb3b3'; ctx.font = '12px monospace'; ctx.fillText(T('waitResp'), cx, H - 70); }
      ctx.fillStyle = '#8aa'; ctx.font = '10px monospace'; ctx.fillText(T('controls'), cx, H - 8);
      if (view.over) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, cy - 32, W, 64);
        ctx.fillStyle = view.win ? '#7CFC00' : '#ff5252'; ctx.font = 'bold 24px monospace'; ctx.textAlign = 'center'; ctx.fillText(view.win ? T('win') : T('lose'), cx, cy + 8); }
    }

    return {
      update, draw, onAct, onHello, onBye, onView,
      get done() { return done; }, get result() { return result; }, get floresDelta() { return floresDelta; },
      get view() { return view; },
    };
  }
  return { create };
})();
if (typeof window !== 'undefined') window.TrucoPvp6 = TrucoPvp6;
if (typeof module !== 'undefined') module.exports = TrucoPvp6;
