// truco.js — MOTOR de truco argentino (puro, sin render ni input). Reglas reales: jerarquía de cartas,
// envido (familia), flor, manos/parda, truco/retruco/vale4. La UI/escena (arcade.js) lo maneja; el motor
// solo decide reglas y la IA. Testeable headless (e2e). Ver specs/truco.md.
// Decisiones cerradas: CON FLOR siempre; formato "a 3 manos" = mejor de 3 rondas; premio en FLORES.
const Truco = (() => {
  // Baraja española de 40: palos e=espada, b=basto, o=oro, c=copa; números 1-7,10,11,12.
  const SUITS = ['e', 'b', 'o', 'c'];
  const NUMS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

  // Jerarquía del truco (de mayor a menor). Las "matadoras" son únicas; el resto empata por número.
  // power alto = carta más fuerte.
  function power(card) {
    const { n, s } = card;
    if (n === 1 && s === 'e') return 14;   // 1 de espada (macho)
    if (n === 1 && s === 'b') return 13;   // 1 de basto
    if (n === 7 && s === 'e') return 12;   // 7 de espada
    if (n === 7 && s === 'o') return 11;   // 7 de oro
    if (n === 3) return 10;
    if (n === 2) return 9;
    if (n === 1) return 8;                 // 1 de oro / 1 de copa (anchos falsos)
    if (n === 12) return 7;
    if (n === 11) return 6;
    if (n === 10) return 5;
    if (n === 7) return 4;                 // 7 de copa / 7 de basto
    if (n === 6) return 3;
    if (n === 5) return 2;
    return 1;                              // 4
  }

  // Valor para ENVIDO/FLOR: 1-7 su número; figuras (10,11,12) = 0.
  const envValue = (n) => (n >= 10 ? 0 : n);

  // Envido de una mano (3 cartas). Dos+ del mismo palo → 20 + las dos más altas de ese palo; si no, la carta
  // más alta sola. Máx 33. (La flor se evalúa aparte.)
  function envido(hand) {
    let best = 0;
    for (const s of SUITS) {
      const vs = hand.filter(c => c.s === s).map(c => envValue(c.n)).sort((a, b) => b - a);
      let cand;
      if (vs.length >= 2) cand = 20 + vs[0] + vs[1];
      else if (vs.length === 1) cand = vs[0];
      else cand = 0;
      if (cand > best) best = cand;
    }
    return best;
  }

  // Flor: 3 del mismo palo. Devuelve los puntos de flor (20 + suma de los 3 valores) o null si no hay flor.
  function flor(hand) {
    for (const s of SUITS) {
      const vs = hand.filter(c => c.s === s);
      if (vs.length === 3) return 20 + vs.reduce((a, c) => a + envValue(c.n), 0);
    }
    return null;
  }

  // Comparación de dos cartas jugadas: 1 gana A, -1 gana B, 0 parda (empate).
  function clash(a, b) {
    const pa = power(a), pb = power(b);
    return pa > pb ? 1 : pa < pb ? -1 : 0;
  }

  // Ganador de la MANO (ronda) dada la secuencia de bazas jugadas. results = [r1,r2,r3] con r ∈ {1,-1,0}.
  // mano = quién es "mano" (1 = jugador, -1 = rival) para desempatar pardas. Devuelve 1/-1, o 0 si indefinido aún.
  function handWinner(results, mano) {
    const r = results.filter(x => x !== undefined);
    if (!r.length) return 0;
    // gana quien se lleva 2 bazas. Pardas: manda quien ganó la 1ª no-parda; si la 1ª es parda, manda el mano.
    let pW = 0, aW = 0;
    for (const x of r) { if (x === 1) pW++; else if (x === -1) aW++; }
    if (pW >= 2) return 1;
    if (aW >= 2) return -1;
    // reglas de parda
    if (r.length === 3) {
      // todas jugadas: si nadie llegó a 2, hubo pardas. Gana el primero que ganó una baza; si todas pardas → mano.
      const first = r.find(x => x !== 0);
      if (first === 1) return 1;
      if (first === -1) return -1;
      return mano;                          // 3 pardas → el mano
    }
    // 1ª parda y alguien ganó la 2ª → ese gana la mano (no hace falta la 3ª)
    if (r[0] === 0 && r[1] !== undefined && r[1] !== 0) return r[1];
    return 0;                               // indefinido: falta jugar
  }

  // ----- baraja / reparto -----
  function fullDeck() { const d = []; for (const s of SUITS) for (const n of NUMS) d.push({ n, s }); return d; }
  // RNG con semilla (para tests deterministas); sin semilla usa Math.random.
  function rng(seed) {
    if (seed == null) return Math.random;
    let x = seed >>> 0 || 1;
    return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
  }
  function shuffle(deck, rand) {
    const d = deck.slice();
    for (let i = d.length - 1; i > 0; i--) { const j = (rand() * (i + 1)) | 0; [d[i], d[j]] = [d[j], d[i]]; }
    return d;
  }
  // Reparte 3 y 3. opts.bias: sesga al jugador hacia cartas altas (tabla de skill, §8 SDD). 0..1.
  function deal(seed, opts) {
    opts = opts || {};
    const d = shuffle(fullDeck(), rng(seed));
    if (opts.bias) {                        // ordena por fuerza y toma de arriba con probabilidad ~bias
      d.sort((a, b) => power(b) - power(a));
      if (rng((seed || 1) + 7)() > opts.bias) d.reverse();   // a veces no le toca (no es trampa total)
    }
    return { p: d.slice(0, 3), a: d.slice(3, 6) };
  }

  // ----- IA mínima (heurística por skill; se enriquece en fases siguientes) -----
  // decide qué carta tirar: por defecto, la más baja que gane la baza; si no puede ganar, la más baja.
  function aiPlayCard(hand, rivalCard, tier) {
    const sorted = hand.slice().sort((a, b) => power(a) - power(b));
    if (rivalCard) {
      const win = sorted.find(c => clash(c, rivalCard) === 1);
      if (win) return win;                  // gana barato
      return sorted[0];                      // no puede → tira la más baja
    }
    // sale: un crack guarda la alta y abre con media; un normal abre con la más alta
    return (tier === 'crack' && sorted.length > 1) ? sorted[1] : sorted[sorted.length - 1];
  }
  // ¿acepta envido? heurística por puntos + tier.
  function aiAcceptEnvido(myEnvido, tier) {
    const umbral = tier === 'crack' ? 25 : tier === 'bueno' ? 27 : 29;
    return myEnvido >= umbral;
  }

  return {
    SUITS, NUMS, power, envValue, envido, flor, clash, handWinner,
    fullDeck, shuffle, deal, rng, aiPlayCard, aiAcceptEnvido,
  };
})();
if (typeof window !== 'undefined') window.Truco = Truco;
if (typeof module !== 'undefined') module.exports = Truco;
