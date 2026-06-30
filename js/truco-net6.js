// truco-net6.js — MOTOR del TRUCO DE A 6 (3v3) HOST-AUTORITATIVO (puro, sin render ni red). El host corre TODA la
// partida (las 6 manos), valida las acciones de los humanos y MANEJA los asientos IA por heurística (reusa
// Truco.aiPlayCard/aiAcceptEnvido). Expone una VISTA por jugador que solo revela SU mano (las cartas jugadas son
// públicas). Reusa el motor de reglas `Truco`. Testeable headless (e2e). specs/truco.md §14.
//
// REGLA DE LA CASA (del dueño, encapsulada en bazaMode — fácil de ajustar):
//  - Equipos alternados: A={0,2,4} B={1,3,5}; "el de enfrente" = (seat+3)%6 (otro equipo).
//  - Baza 1 = GLOBAL (tiran los 6 rotando, la carta más alta gana la baza para su equipo).
//  - Baza 2 = 1v1 (cada uno vs su vis-à-vis; el equipo que gana 2 de 3 duelos cruzados se lleva la baza).
//  - Baza 3 = GLOBAL (desempate).
//  - UMBRAL 10: si algún equipo llegó a 10, de ahí en más TODAS las bazas son GLOBAL.
//  - Gana la mano el equipo con 2 de 3 bazas. Partida a 15. Envido/flor POR EQUIPO (el más alto de cada bando).
const TrucoNet6 = (() => {
  const E = (typeof Truco !== 'undefined') ? Truco : (typeof require === 'function' ? require('./truco.js') : null);
  const trucoQ = { 1: 2, 2: 3, 3: 4 }, trucoN = { 1: 1, 2: 2, 3: 3 };
  const envQ = { 1: 2, 2: 3, 3: 5 }, envN = { 1: 1, 2: 2, 3: 3 };
  const TARGET = 15, ENDGAME = 10, AI_DELAY = 0.6;

  const team = s => (s % 2 === 0 ? 'A' : 'B');
  const other = t => (t === 'A' ? 'B' : 'A');
  const across = s => (s + 3) % 6;
  const pw = c => (E ? E.power(c) : 0);

  // opts.ai = array bool[6] (qué asientos son IA). opts.seed = semilla determinística (tests).
  function match(opts) {
    opts = opts || {};
    const isAI = (opts.ai && opts.ai.length === 6) ? opts.ai.slice() : [false, true, true, true, true, true];
    const seed = opts.seed;
    let rev = 0; const bump = () => { rev++; };

    let phase = 'play';
    const score = { A: 0, B: 0 }, floresAcc = { A: 0, B: 0 };
    let dealNum = 0, mano = 0;
    let over = 0, winnerTeam = null, done = false, lastEvent = null;

    let hands = [[], [], [], [], [], []];
    let lead = 0, nextLead = 0, table = [null, null, null, null, null, null];
    let bazaResults = [];                       // 'A'|'B'|null por baza
    let pts = { A: 0, B: 0 };
    let trucoLevel = 0, trucoStake = 1, envidoDone = false, florDone = false;
    let pending = null, heldTruco = null, revealT = 0, dealPause = 0, aiClock = AI_DELAY;

    const scoreMax = () => Math.max(score.A, score.B);
    // modo de la baza actual (idx 0-based): global / pairs. Umbral 10 → todo global.
    function bazaMode(idx) { return (scoreMax() >= ENDGAME) ? 'global' : (idx === 1 ? 'pairs' : 'global'); }

    function startDeal() {
      dealNum++;
      mano = (dealNum - 1) % 6; lead = mano; nextLead = mano;
      const deck = E ? E.shuffle(E.fullDeck(), E.rng(seed != null ? seed + dealNum : undefined)) : [];
      hands = [0, 1, 2, 3, 4, 5].map(k => deck.slice(k * 3, k * 3 + 3).map(c => ({ c, used: false })));
      table = [null, null, null, null, null, null]; bazaResults = [];
      pts = { A: 0, B: 0 };
      trucoLevel = 0; trucoStake = 1; envidoDone = false; florDone = false;
      pending = null; heldTruco = null; revealT = 0; dealPause = 0; aiClock = AI_DELAY;
      phase = 'play'; lastEvent = null;
      // FLOR auto al repartir: cada flor → +3 a su equipo (sin contraflor). Flor mata envido.
      let florTeam = null, florMax = -1;
      for (let s = 0; s < 6; s++) {
        const f = E && E.flor(hands[s].map(h => h.c));
        if (f != null) { pts[team(s)] += 3; florDone = true; envidoDone = true; if (f > florMax) { florMax = f; florTeam = team(s); } }
      }
      if (florTeam) lastEvent = { kind: 'flor', winner: florTeam, p: { pts: 3 } };
      bump();
    }

    const order = () => [0, 1, 2, 3, 4, 5].map(i => (lead + i) % 6);   // orden de tiro desde el que lidera
    function toPlay() { for (const s of order()) if (table[s] == null) return s; return null; }
    const allPlayed = () => table.every(c => c != null);
    function actor() { if (phase !== 'play') return null; if (pending) return pending.responder; return toPlay(); }
    const noCardOnTable = () => table.every(c => c == null);
    const bestTeamEnvido = t => Math.max(...[0, 1, 2, 3, 4, 5].filter(s => team(s) === t).map(s => E.envido(hands[s].map(h => h.c))));

    function resolveEnvido(level) {
      const ea = bestTeamEnvido('A'), eb = bestTeamEnvido('B');
      const p = level === 3 ? Math.max(1, TARGET - scoreMax()) : (envQ[level] || 2);
      const w = (ea > eb) ? 'A' : (eb > ea) ? 'B' : team(mano);
      pts[w] += p; envidoDone = true; pending = null;
      lastEvent = { kind: 'env', winner: w, p: { ea, eb, pts: p } };
      afterEnvido();
    }
    function afterEnvido() { if (!heldTruco) { bump(); return; } const ht = heldTruco; heldTruco = null; pending = { kind: 'truco', level: ht.level, by: ht.by, responder: ht.responder }; bump(); }

    // resuelve la baza según el modo. Devuelve 'A'|'B'|null (parda).
    function resolveBaza() {
      const mode = bazaMode(bazaResults.length);
      let winT = null;
      if (mode === 'global') {
        let max = -1, seatsMax = [];
        for (let s = 0; s < 6; s++) { const p = pw(table[s]); if (p > max) { max = p; seatsMax = [s]; } else if (p === max) seatsMax.push(s); }
        const teams = new Set(seatsMax.map(team));
        winT = (teams.size === 1) ? team(seatsMax[0]) : null;     // empate de máxima entre equipos → parda
        nextLead = seatsMax[0];
      } else {                                                     // PAIRS: 3 duelos cruzados (0,3)(1,4)(2,5)
        let a = 0, b = 0;
        for (const [x, y] of [[0, 3], [1, 4], [2, 5]]) { const r = E.clash(table[x], table[y]); if (r === 1) (team(x) === 'A' ? a++ : b++); else if (r === -1) (team(y) === 'A' ? a++ : b++); }
        winT = a > b ? 'A' : b > a ? 'B' : null;
        nextLead = mano;
      }
      bazaResults.push(winT);
      phase = 'reveal'; revealT = 1.4; bump();
    }

    function handWinnerTeam() {
      const r = bazaResults; let a = 0, b = 0;
      for (const x of r) { if (x === 'A') a++; else if (x === 'B') b++; }
      if (a >= 2) return 'A'; if (b >= 2) return 'B';
      if (r.length >= 3) { const first = r.find(x => x); return first || team(mano); }
      if (r[0] == null && r[1]) return r[1];
      return null;
    }

    function concludeDeal(winT, addStake) {
      if (addStake) pts[winT] += trucoStake;
      floresAcc.A += pts.A; floresAcc.B += pts.B;
      score.A += pts.A; score.B += pts.B;
      if (score.A >= TARGET || score.B >= TARGET) {
        winnerTeam = score.A > score.B ? 'A' : (score.B > score.A ? 'B' : winT);
        phase = 'matchover'; over = 2.6; lastEvent = { kind: 'match', winner: winnerTeam, p: {} };
      } else { phase = 'dealover'; dealPause = 1.8; lastEvent = { kind: 'deal', winner: winT, p: {} }; }
      bump();
    }

    // ---- acciones ----
    function canto(seat, c) {
      if (phase !== 'play') return;
      if (c === 'envido' || c === 'real' || c === 'falta') {
        const lvl = c === 'envido' ? 1 : c === 'real' ? 2 : 3;
        if (pending && pending.kind === 'truco' && bazaResults.length === 0 && !envidoDone && seat === pending.responder) {
          heldTruco = { level: pending.level, by: pending.by, responder: pending.by }; pending = { kind: 'envido', level: 1, by: seat, responder: pending.by }; bump(); return;
        }
        if (pending && pending.kind === 'envido' && seat === pending.responder && lvl > pending.level && pending.level < 3) {
          pending = { kind: 'envido', level: Math.min(3, pending.level + 1), by: seat, responder: pending.by }; bump(); return;
        }
        if (!pending && bazaResults.length === 0 && !envidoDone && noCardOnTable() && seat === toPlay()) {
          pending = { kind: 'envido', level: 1, by: seat, responder: (seat + 1) % 6 }; bump(); return;
        }
        return;
      }
      if (c === 'truco' || c === 'retruco' || c === 'vale4') {
        if (pending && pending.kind === 'truco' && seat === pending.responder && pending.level < 3) {
          pending = { kind: 'truco', level: pending.level + 1, by: seat, responder: pending.by }; bump(); return;
        }
        if (!pending && trucoLevel < 3 && seat === toPlay()) {
          pending = { kind: 'truco', level: trucoLevel + 1, by: seat, responder: (seat + 1) % 6 }; bump(); return;
        }
        return;
      }
    }
    function respond(seat, r) {
      if (phase !== 'play' || !pending || seat !== pending.responder) return;
      const lvl = pending.level, kind = pending.kind, byT = team(pending.by);
      if (r === 'quiero') {
        if (kind === 'envido') resolveEnvido(lvl);
        else { trucoLevel = lvl; trucoStake = trucoQ[lvl]; pending = null; bump(); }
        return;
      }
      if (kind === 'envido') { pts[byT] += (envN[lvl] || 1); envidoDone = true; pending = null; lastEvent = { kind: 'envNo', winner: byT, p: { pts: envN[lvl] || 1 } }; afterEnvido(); }
      else { pts[byT] += (trucoN[lvl] || 1); pending = null; concludeDeal(byT, false); }
    }
    function playCard(seat, i) {
      if (phase !== 'play' || pending || seat !== toPlay()) return;
      const h = hands[seat][i]; if (!h || h.used) return;
      h.used = true; table[seat] = h.c;
      if (allPlayed()) resolveBaza(); else bump();
    }
    function act(seat, a) {
      if (!a || seat < 0 || seat > 5 || isAI[seat]) return;   // los asientos IA no aceptan acciones externas
      if (a.k === 'play') return playCard(seat, a.i | 0);
      if (a.k === 'canto') return canto(seat, a.c);
      if (a.k === 'resp') return respond(seat, a.r);
    }
    // un asiento humano se desconectó → lo toma la IA (la partida sigue). specs/truco.md §14 (watchdog).
    function dropToAI(seat) { if (seat >= 0 && seat < 6) { isAI[seat] = true; bump(); } }

    // ---- IA (la corre el host dentro de update, con delay para que se vea) ----
    function bestOppCardOnTable(seat) { let best = null; for (let s = 0; s < 6; s++) if (team(s) !== team(seat) && table[s] && (!best || pw(table[s]) > pw(best))) best = table[s]; return best; }
    function aiAct(seat) {
      if (pending && seat === pending.responder) {
        if (pending.kind === 'envido') { const ok = E.aiAcceptEnvido(E.envido(hands[seat].map(h => h.c)), 'bueno'); respond(seat, ok ? 'quiero' : 'no'); }
        else { const strong = hands[seat].some(h => !h.used && pw(h.c) >= 10); respond(seat, (strong || Math.random() < 0.5) ? 'quiero' : 'no'); }
        return;
      }
      if (seat !== toPlay()) return;
      const env = E.envido(hands[seat].map(h => h.c));
      if (bazaResults.length === 0 && !envidoDone && noCardOnTable() && env >= 27 && Math.random() < 0.5) { canto(seat, 'envido'); return; }
      if (trucoLevel < 3 && hands[seat].some(h => !h.used && pw(h.c) >= 11) && Math.random() < 0.18) { canto(seat, 'truco'); return; }
      const avail = hands[seat].map((h, i) => ({ h, i })).filter(x => !x.h.used);
      const card = E.aiPlayCard(avail.map(x => x.h.c), bestOppCardOnTable(seat), 'bueno');
      const pick = avail.find(x => x.h.c === card) || avail[0];
      playCard(seat, pick.i);
    }

    function update(dt) {
      if (phase === 'reveal') {
        revealT -= dt;
        if (revealT <= 0) {
          table = [null, null, null, null, null, null];
          const w = handWinnerTeam();
          if (w != null || bazaResults.length >= 3) concludeDeal(w != null ? w : team(mano), true);
          else { lead = nextLead; phase = 'play'; aiClock = AI_DELAY; bump(); }
        }
      } else if (phase === 'dealover') { dealPause -= dt; if (dealPause <= 0) startDeal(); }
      else if (phase === 'matchover') { over -= dt; if (over <= 0 && !done) { done = true; bump(); } }
      else if (phase === 'play') {
        const a = actor();
        if (a != null && isAI[a]) { aiClock -= dt; if (aiClock <= 0) { aiClock = AI_DELAY; aiAct(a); } }
      }
    }

    function noteFor(seat) {
      const ev = lastEvent; if (!ev) return null; const t = team(seat);
      const mine = t === 'A' ? 'ea' : 'eb', th = t === 'A' ? 'eb' : 'ea';
      switch (ev.kind) {
        case 'flor': return { k: ev.winner === t ? 'florYou' : 'florOpp', p: { pts: ev.p.pts } };
        case 'env': return { k: ev.winner === t ? 'envWon' : 'envLost', p: { mine: ev.p[mine], theirs: ev.p[th], pts: ev.p.pts } };
        case 'envNo': return { k: ev.winner === t ? 'envNoWon' : 'envNoLost', p: { pts: ev.p.pts } };
        case 'deal': return { k: ev.winner === t ? 'dealWon' : 'dealLost', p: { a: score.A, b: score.B } };
        case 'match': return { k: ev.winner === t ? 'matchWon' : 'matchLost', p: { flores: floresAcc[t] } };
      }
      return null;
    }

    function viewFor(seat) {
      const t = team(seat), a = actor();
      return {
        rev, phase, you: seat, myTeam: t,
        hand: hands[seat].map(h => ({ c: h.c, used: h.used })),
        seats: [0, 1, 2, 3, 4, 5].map(s => ({ seat: s, team: team(s), played: table[s], ai: isAI[s], mano: s === mano })),
        turn: a === seat, turnSeat: a,
        mode: bazaMode(bazaResults.length), bazaIdx: bazaResults.length,
        pending: pending ? { kind: pending.kind, level: pending.level, mine: pending.responder === seat, byTeam: team(pending.by) } : null,
        canEnvido: !pending && bazaResults.length === 0 && !envidoDone && noCardOnTable(),
        trucoLevel,
        score: { me: score[t], opp: score[other(t)] },
        dealPts: { me: pts[t], opp: pts[other(t)] },
        note: noteFor(seat),
        over: phase === 'matchover', win: winnerTeam === t, floresDelta: winnerTeam === t ? floresAcc[t] : 0, done,
      };
    }

    return {
      start: startDeal, act, update, viewFor, dropToAI,
      get rev() { return rev; }, get done() { return done; }, get winnerTeam() { return winnerTeam; },
    };
  }

  return { match, team, across };
})();
if (typeof window !== 'undefined') window.TrucoNet6 = TrucoNet6;
if (typeof module !== 'undefined') module.exports = TrucoNet6;
