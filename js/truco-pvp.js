// truco-pvp.js — SUB-MODO escena del TRUCO PvP humano-vs-humano (specs/truco.md §F3, multijugador §F3).
// Envuelve el motor host-autoritativo TrucoNet: el HOST corre la partida y empuja VISTAS al guest; el GUEST
// solo manda intenciones (acciones) y renderiza la vista que recibe. El transporte (whisper) lo inyecta
// game.js como `send(obj)` + rutea los mensajes entrantes a `onNet(d)`. Capa aditiva: sin TrucoNet/red el
// sub-modo no se crea (game.js cae al chat privado). Render copiado del look de cartas de arcade.js makeTruco.
const TrucoPvp = (() => {
  const T = (k, p) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t('g.trucopvp.' + k, p) : k;
  const SUITSV = { e: { l: 'E', c: '#141422' }, b: { l: 'B', c: '#14240f' }, o: { l: 'O', c: '#b8860b' }, c: { l: 'C', c: '#a01020' } };

  // role: 'host' | 'guest'. send(obj) → whisper al rival. seed: semilla común (ambos la computan igual).
  function create(opts) {
    opts = opts || {};
    const role = opts.role === 'host' ? 'host' : 'guest';
    const send = typeof opts.send === 'function' ? opts.send : () => {};
    const peerNick = opts.peerNick || T('rival');
    const match = (role === 'host' && typeof TrucoNet !== 'undefined') ? TrucoNet.match(opts.seed) : null;
    let view = null, done = false, result = 'lose', floresDelta = 0, lastRev = -1;
    let escHeld = false, keyHeld = {}, lastCanto = 0, helloT = 0;

    if (match) { match.start(); view = match.viewFor('host'); syncGuest(true); }
    // GUEST: aviso al host que estoy listo → el host re-empuja la vista (cubre la carrera del primer push)
    if (role === 'guest') { try { send({ t: 'tk-hello' }); } catch (e) {} }

    // HOST: empuja la vista del guest si cambió el estado (rev). force = mandar igual (primer push).
    function syncGuest(force) {
      if (!match) return;
      if (!force && match.rev === lastRev) return;
      lastRev = match.rev;
      view = match.viewFor('host');
      try { send({ t: 'tk-view', v: match.viewFor('guest') }); } catch (e) {}
    }

    // aplica una acción del jugador local (host: directo al motor; guest: la manda por la red)
    function localAct(a) {
      if (role === 'host') { match.act('host', a); syncGuest(); }
      else send({ t: 'tk-act', a });
    }

    // mensajes entrantes del rival (game.js ya parseó el JSON)
    function onNet(m) {
      if (!m || !m.t) return;
      if (m.t === 'tk-bye') { if (!done) { done = true; result = 'left'; } return; }
      if (role === 'host' && m.t === 'tk-hello') { syncGuest(true); return; }   // guest listo → re-empujo la vista
      if (role === 'host' && m.t === 'tk-act') { match.act('guest', m.a); syncGuest(); return; }
      if (role === 'guest' && m.t === 'tk-view') {
        view = m.v;
        if (view) {
          // voz criolla al recibir un canto dirigido a mí (sabor, aditivo)
          if (view.pending && !view.pending.mine && typeof Mensajero !== 'undefined' && Mensajero.cantar) {
            const k = view.pending.kind + view.pending.level;
            if (k !== lastCanto) { lastCanto = k; cantarVoz(view.pending); }
          } else if (!view.pending) lastCanto = 0;
          if (view.done && !done) endFromView();
        }
        return;
      }
    }

    function cantarVoz(pending) {
      const F = pending.kind === 'envido'
        ? ['¡ENVIDO!', '¡REAL ENVIDO!', '¡FALTA ENVIDO!'][pending.level - 1]
        : ['¡TRUCO!', '¡RETRUCO!', '¡VALE CUATRO!'][pending.level - 1];
      if (F) Mensajero.cantar(F);
    }

    function endFromView() { done = true; result = view.win ? 'win' : 'lose'; floresDelta = view.floresDelta || 0; }

    function update(dt) {
      // abandonar
      if (Input.keys['escape']) { if (!escHeld) { escHeld = true; send({ t: 'tk-bye' }); done = true; result = 'lose'; } return; } else escHeld = false;

      if (role === 'host') { match.update(dt); syncGuest(); if (view && view.done && !done) endFromView(); }
      // GUEST sin vista todavía → reintento el "estoy listo" (cubre un primer push perdido por la red)
      else if (!view) { helloT += dt; if (helloT >= 1.2) { helloT = 0; try { send({ t: 'tk-hello' }); } catch (e) {} } }

      if (!view || view.phase !== 'play') { drainHeld(); return; }
      const tap = k => { const d = Input.keys[k]; if (d && !keyHeld[k]) { keyHeld[k] = true; return true; } if (!d) keyHeld[k] = false; return false; };

      // responder a un canto pendiente del rival
      if (view.pending && !view.pending.mine) {
        if (tap('q')) localAct({ k: 'resp', r: 'quiero' });
        else if (tap('n')) localAct({ k: 'resp', r: 'no' });
        else if (tap('t') && view.pending.kind === 'truco' && view.pending.level < 3) localAct({ k: 'canto', c: ['retruco', 'vale4'][view.pending.level - 1] });
        else if (tap('v') && view.pending.kind === 'envido' && view.pending.level < 3) localAct({ k: 'canto', c: ['real', 'falta'][view.pending.level - 1] });
        // "el envido está primero": me cantaron truco en la 1ª mano sin envido → respondo con envido
        else if (tap('v') && view.pending.kind === 'truco' && view.canEnvido) localAct({ k: 'canto', c: 'envido' });
        drainExcept(['q', 'n', 't', 'v']); return;
      }
      if (view.pending && view.pending.mine) { drainHeld(); return; }   // esperando respuesta del rival

      // mi turno, sin canto pendiente: jugar carta o cantar
      if (view.turn) {
        for (let i = 0; i < 3; i++) if (tap(String(i + 1)) && view.hand[i] && !view.hand[i].used) { localAct({ k: 'play', i }); break; }
        if (tap('v') && view.canEnvido) localAct({ k: 'canto', c: 'envido' });
        else if (tap('t') && view.trucoLevel < 3) localAct({ k: 'canto', c: ['truco', 'retruco', 'vale4'][view.trucoLevel] });
      }
      drainExcept(['1', '2', '3', 'v', 't']);
    }
    function drainHeld() { for (const k in keyHeld) if (!Input.keys[k]) keyHeld[k] = false; }
    function drainExcept(keep) { for (const k of ['q', 'n', 't', 'v', '1', '2', '3']) if (keep.indexOf(k) < 0 && !Input.keys[k]) keyHeld[k] = false; }

    function card(ctx, cx, cy, c, faceUp) {
      ctx.fillStyle = '#f4f0e0'; ctx.fillRect(cx - 22, cy - 32, 44, 64);
      ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.strokeRect(cx - 22, cy - 32, 44, 64);
      if (!faceUp || !c) { ctx.fillStyle = '#7b1020'; ctx.fillRect(cx - 18, cy - 28, 36, 56); return; }
      const s = SUITSV[c.s] || { l: '?', c: '#222' };
      ctx.fillStyle = s.c; ctx.font = 'bold 22px monospace'; ctx.textAlign = 'center';
      ctx.fillText(c.n, cx, cy - 2); ctx.font = 'bold 14px monospace'; ctx.fillText(s.l, cx, cy + 18);
    }

    function draw(ctx, W, H) {
      const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#10220f'); bg.addColorStop(1, '#071206');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#0d1b0c'; ctx.beginPath(); ctx.ellipse(W / 2, H / 2, 240, 130, 0, 0, Math.PI * 2); ctx.fill();
      // título
      ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
      ctx.fillText('🃏 TRUCO · ' + peerNick, W / 2, 22);
      if (!view) { ctx.fillStyle = '#cfe8c0'; ctx.font = '13px monospace'; ctx.fillText(T('connecting'), W / 2, H / 2); return; }
      // cartas en mesa
      if (view.table && view.table.opp) card(ctx, W / 2, H / 2 - 50, view.table.opp, true);
      if (view.table && view.table.me) card(ctx, W / 2, H / 2 + 50, view.table.me, true);
      // mi mano
      for (let i = 0; i < 3; i++) {
        const h = view.hand[i]; if (!h) continue;
        const cx = W / 2 - 70 + i * 70, cy = H - 60;
        if (h.used) { ctx.globalAlpha = 0.25; card(ctx, cx, cy, h.c, true); ctx.globalAlpha = 1; }
        else { card(ctx, cx, cy, h.c, true); ctx.fillStyle = '#ffe14d'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center'; ctx.fillText('[' + (i + 1) + ']', cx, cy + 46); }
      }
      // marcador + puntos del deal
      ctx.fillStyle = '#cfe8c0'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
      ctx.fillText(T('score', { me: view.score.me, opp: view.score.opp }), W / 2, 56);
      ctx.fillStyle = '#9fd3ff'; ctx.font = '11px monospace'; ctx.fillText(T('dealPts', { me: view.dealPts.me, opp: view.dealPts.opp }), W / 2, 74);
      // nota (resultado del último evento) o indicador de turno
      ctx.font = '13px monospace';
      if (view.note) { ctx.fillStyle = '#ffd54f'; ctx.fillText(T('note.' + view.note.k, view.note.p), W / 2, 96); }
      else if (view.phase === 'play') { ctx.fillStyle = view.turn ? '#7CFC00' : '#cfe8c0'; ctx.fillText(view.turn ? T('yourTurn') : T('oppTurn', { nick: peerNick }), W / 2, 96); }
      // prompt de respuesta a canto
      if (view.pending && !view.pending.mine) {
        ctx.fillStyle = '#ff9ed0'; ctx.font = 'bold 13px monospace';
        ctx.fillText(T('respond.' + view.pending.kind, { lvl: view.pending.level }), W / 2, 116);
      } else if (view.pending && view.pending.mine) {
        ctx.fillStyle = '#ffb3b3'; ctx.font = '12px monospace'; ctx.fillText(T('waitResp'), W / 2, 116);
      }
      // controles
      ctx.fillStyle = '#8aa'; ctx.font = '10px monospace'; ctx.fillText(T('controls'), W / 2, H - 14);
      // banner de fin
      if (view.over) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, H / 2 - 36, W, 72);
        ctx.fillStyle = view.win ? '#7CFC00' : '#ff5252'; ctx.font = 'bold 26px monospace'; ctx.textAlign = 'center';
        ctx.fillText(view.win ? T('win') : T('lose'), W / 2, H / 2 + 9);
      }
    }

    return {
      update, draw, onNet,
      get done() { return done; },
      get result() { return result; },
      get floresDelta() { return floresDelta; },
      get view() { return view; },   // debug/tests (headless): la vista actual del jugador local
    };
  }

  return { create };
})();
if (typeof window !== 'undefined') window.TrucoPvp = TrucoPvp;
if (typeof module !== 'undefined') module.exports = TrucoPvp;
