// truco-net.js — MOTOR de truco PvP HOST-AUTORITATIVO (puro, sin render ni red). El host corre la partida
// (tiene las DOS manos), valida cada acción y expone una VISTA por jugador (que NUNCA incluye la mano del
// rival = anti-trampa de cliente vanilla). Reusa el motor de reglas `Truco` (jerarquía/envido/flor/parda).
// La escena (truco-pvp.js) lo maneja; el transporte (whisper) lo cablea game.js. Testeable headless (e2e).
// Diferencia clave vs arcade.js makeTruco: en PvP NINGÚN lado es la IA — el canto setea `pending` y se ESPERA
// la acción del OTRO humano (no hay aiRespond*). Decisiones cerradas: con flor siempre (auto al repartir, sin
// contraflor), formato "a 3 manos" (mejor de 3 rondas), premio en FLORES. Ver specs/truco.md §F3.
const TrucoNet = (() => {
  const E = (typeof Truco !== 'undefined') ? Truco : (typeof require === 'function' ? require('./truco.js') : null);

  // valores idénticos a makeTruco (paridad de reglas)
  const trucoQ = { 1: 2, 2: 3, 3: 4 }, trucoN = { 1: 1, 2: 2, 3: 3 };
  const envQ = { 1: 2, 2: 3, 3: 5 }, envN = { 1: 1, 2: 2, 3: 3 };

  const OTHER = s => (s === 'host' ? 'guest' : 'host');
  const SIGN = s => (s === 'host' ? 1 : -1);          // host=+1, guest=-1 (para clash/handWinner del motor Truco)
  const SEAT = n => (n === 1 ? 'host' : 'guest');

  // crea una PARTIDA. seed opcional → reparto determinístico (tests). format fijo '3manos' (mejor de 3).
  function match(seed) {
    const FALTA = 5;                                   // faltaPts en formato 3manos (igual que makeTruco)
    let rev = 0;                                       // versión de estado: la escena empuja vista al guest cuando cambia
    const bump = () => { rev++; };

    let phase = 'play';                                // play | reveal | dealover | matchover
    const score = { host: 0, guest: 0 };               // RONDAS ganadas (target 2)
    const floresAcc = { host: 0, guest: 0 };           // puntos acumulados → premio en flores al ganador
    let dealNum = 0, mano = 'host';
    let over = 0, winnerSeat = null, done = false;
    let lastEvent = null;                              // {kind, winner, p} → viewFor lo traduce a clave i18n seat-relativa

    // estado del DEAL (lo resetea startDeal)
    let hands = { host: [], guest: [] };
    let lead = 'host', table = { host: null, guest: null }, results = [];
    let pts = { host: 0, guest: 0 };
    let trucoLevel = 0, trucoStake = 1, envidoDone = false, florDone = false;
    let pending = null, heldTruco = null, revealT = 0, dealPause = 0, round = 0;

    function startDeal() {
      dealNum++;
      mano = (dealNum % 2 === 1) ? 'host' : 'guest';   // la mano alterna cada reparto
      lead = mano;
      const d = E ? E.deal((seed != null) ? (seed + dealNum) : undefined) : { p: [], a: [] };
      hands = { host: d.p.map(c => ({ c, used: false })), guest: d.a.map(c => ({ c, used: false })) };
      table = { host: null, guest: null }; results = []; round = 0;
      pts = { host: 0, guest: 0 };
      trucoLevel = 0; trucoStake = 1; envidoDone = false; florDone = false;
      pending = null; heldTruco = null; revealT = 0; dealPause = 0;
      phase = 'play'; lastEvent = null;
      // FLOR auto al repartir (igual que makeTruco; sin cadena de contraflor). Empate de flor → la MANO.
      if (E) {
        const fh = E.flor(hands.host.map(h => h.c)), fg = E.flor(hands.guest.map(h => h.c));
        if (fh != null || fg != null) {
          let w;
          if (fh != null && fg != null) w = (fh > fg) ? 'host' : (fg > fh) ? 'guest' : mano;
          else w = (fh != null) ? 'host' : 'guest';
          pts[w] += 3; florDone = true; envidoDone = true; lastEvent = { kind: 'flor', winner: w, p: { pts: 3 } };
        }
      }
      bump();
    }

    // ¿quién debe ACTUAR ahora? (pending → el que NO cantó; si no → el que tira la carta de la baza)
    function actor() {
      if (phase !== 'play') return null;
      if (pending) return OTHER(pending.by);
      return (table[lead] == null) ? lead : OTHER(lead);
    }
    const noCardOnTable = () => table.host == null && table.guest == null;

    function resolveEnvido(level) {
      const eh = E.envido(hands.host.map(h => h.c)), eg = E.envido(hands.guest.map(h => h.c));
      const p = level === 3 ? FALTA : (envQ[level] || 2);
      const w = (eh > eg) ? 'host' : (eg > eh) ? 'guest' : mano;   // empate → la mano
      pts[w] += p; envidoDone = true; pending = null;
      lastEvent = { kind: 'env', winner: w, p: { eh, eg, pts: p } };
      afterEnvido();
    }
    // "el envido está primero": si había un truco guardado (heldTruco), vuelve a la mesa al cerrar el envido.
    function afterEnvido() {
      if (!heldTruco) { bump(); return; }
      const ht = heldTruco; heldTruco = null;
      pending = { kind: 'truco', level: ht.level, by: ht.by };
      bump();
    }

    // cierra el DEAL: dw = sign del ganador (+1 host / -1 guest); addStake = sumar el valor del truco
    function concludeDeal(dwSign, addStake) {
      const w = SEAT(dwSign);
      if (addStake) pts[w] += trucoStake;
      floresAcc.host += pts.host; floresAcc.guest += pts.guest;
      score[w]++;
      if (score.host >= 2 || score.guest >= 2) {
        winnerSeat = score.host > score.guest ? 'host' : 'guest';
        phase = 'matchover'; over = 2.4;
        lastEvent = { kind: 'match', winner: winnerSeat, p: {} };
      } else {
        phase = 'dealover'; dealPause = 1.7;
        lastEvent = { kind: 'deal', winner: w, p: {} };
      }
      bump();
    }

    function resolveTrick() {
      const r = E ? E.clash(table.host, table.guest) : 0;   // +1 host / -1 guest / 0 parda
      results.push(r);
      lead = r === 1 ? 'host' : r === -1 ? 'guest' : mano;   // gana → lidera la próxima; parda → la mano
      phase = 'reveal'; revealT = 1.3; bump();
    }

    // ---- acciones (cualquiera de los dos seats; el host valida) ----
    function canto(seat, c) {
      if (phase !== 'play') return;
      // ENVIDO (incluye "el envido primero" como respuesta a un truco en la 1ª mano sin envido jugado)
      if (c === 'envido' || c === 'real' || c === 'falta') {
        const lvl = c === 'envido' ? 1 : c === 'real' ? 2 : 3;
        if (pending && pending.kind === 'truco' && round === 0 && !envidoDone && seat === OTHER(pending.by)) {
          heldTruco = { level: pending.level, by: pending.by };       // guardo el truco; vuelve al cerrar el envido
          pending = { kind: 'envido', level: 1, by: seat }; bump(); return;
        }
        if (pending && pending.kind === 'envido' && seat === OTHER(pending.by) && lvl > pending.level && pending.level < 3) {
          pending = { kind: 'envido', level: Math.min(3, pending.level + 1), by: seat }; bump(); return;   // sube
        }
        if (!pending && round === 0 && !envidoDone && noCardOnTable()) {
          pending = { kind: 'envido', level: 1, by: seat }; bump(); return;                                // abre
        }
        return;
      }
      // TRUCO / RETRUCO / VALE CUATRO
      if (c === 'truco' || c === 'retruco' || c === 'vale4') {
        if (pending && pending.kind === 'truco' && seat === OTHER(pending.by) && pending.level < 3) {
          pending = { kind: 'truco', level: pending.level + 1, by: seat }; bump(); return;                 // sube
        }
        if (!pending && trucoLevel < 3 && (seat === actor())) {
          pending = { kind: 'truco', level: trucoLevel + 1, by: seat }; bump(); return;                    // abre/escala
        }
        return;
      }
    }

    function respond(seat, r) {
      if (phase !== 'play' || !pending || seat !== OTHER(pending.by)) return;
      const lvl = pending.level, kind = pending.kind, by = pending.by;
      if (r === 'quiero') {
        if (kind === 'envido') resolveEnvido(lvl);
        else { trucoLevel = lvl; trucoStake = trucoQ[lvl]; pending = null; bump(); }
        return;
      }
      // no quiero
      if (kind === 'envido') { pts[by] += (envN[lvl] || 1); envidoDone = true; pending = null; lastEvent = { kind: 'envNo', winner: by, p: { pts: envN[lvl] || 1 } }; afterEnvido(); }
      else { pts[by] += (trucoN[lvl] || 1); pending = null; concludeDeal(SIGN(by), false); }
    }

    function playCard(seat, i) {
      if (phase !== 'play' || pending || seat !== actor()) return;
      const h = hands[seat][i];
      if (!h || h.used) return;
      h.used = true; table[seat] = h.c;
      if (table.host != null && table.guest != null) resolveTrick();
      else bump();
    }

    function act(seat, a) {
      if (!a || (seat !== 'host' && seat !== 'guest')) return;
      if (a.k === 'play') return playCard(seat, a.i | 0);
      if (a.k === 'canto') return canto(seat, a.c);
      if (a.k === 'resp') return respond(seat, a.r);
    }

    // avance temporal (SOLO lo corre el host)
    function update(dt) {
      if (phase === 'reveal') {
        revealT -= dt;
        if (revealT <= 0) {
          round++; table = { host: null, guest: null };
          const dw = E ? E.handWinner(results, SIGN(mano)) : 0;
          if (dw !== 0 || round >= 3) {
            const c = results.reduce((s, x) => s + x, 0);
            concludeDeal(dw || (c > 0 ? 1 : c < 0 ? -1 : SIGN(mano)), true);
          } else { phase = 'play'; bump(); }
        }
      } else if (phase === 'dealover') {
        dealPause -= dt; if (dealPause <= 0) startDeal();
      } else if (phase === 'matchover') {
        over -= dt; if (over <= 0 && !done) { done = true; bump(); }
      }
    }

    // traduce lastEvent a una clave i18n SEAT-RELATIVA (el motor NO hace i18n: devuelve {k, p})
    function noteFor(seat) {
      const ev = lastEvent; if (!ev) return null;
      const mine = seat === 'host' ? 'eh' : 'eg', theirs = seat === 'host' ? 'eg' : 'eh';
      switch (ev.kind) {
        case 'flor': return { k: ev.winner === seat ? 'florYou' : 'florOpp', p: { pts: ev.p.pts } };
        case 'env': return { k: ev.winner === seat ? 'envWon' : 'envLost', p: { mine: ev.p[mine], theirs: ev.p[theirs], pts: ev.p.pts } };
        case 'envNo': return { k: ev.winner === seat ? 'envNoWon' : 'envNoLost', p: { pts: ev.p.pts } };
        case 'deal': return { k: ev.winner === seat ? 'dealWon' : 'dealLost', p: { mine: score[seat], theirs: score[OTHER(seat)] } };
        case 'match': return { k: ev.winner === seat ? 'matchWon' : 'matchLost', p: { flores: floresAcc[seat] } };
      }
      return null;
    }

    // VISTA de un jugador: SOLO su mano + la mesa + de quién es el turno + canto pendiente + marcadores.
    function viewFor(seat) {
      const opp = OTHER(seat), a = actor();
      return {
        rev,
        phase,
        hand: hands[seat].map(h => ({ c: h.c, used: h.used })),
        table: { me: table[seat], opp: table[opp] },
        mano: mano === seat,
        turn: a === seat,
        pending: pending ? { kind: pending.kind, level: pending.level, mine: pending.by === seat } : null,
        canEnvido: !pending && round === 0 && !envidoDone && noCardOnTable(),
        trucoLevel,
        score: { me: score[seat], opp: score[opp] },
        dealPts: { me: pts[seat], opp: pts[opp] },
        note: noteFor(seat),
        over: phase === 'matchover',
        win: winnerSeat === seat,
        floresDelta: winnerSeat === seat ? floresAcc[seat] : 0,
        done,
      };
    }

    return {
      start: startDeal,
      act, update, viewFor,
      get rev() { return rev; },
      get done() { return done; },
      get winnerSeat() { return winnerSeat; },
    };
  }

  return { match };
})();
if (typeof window !== 'undefined') window.TrucoNet = TrucoNet;
if (typeof module !== 'undefined') module.exports = TrucoNet;
