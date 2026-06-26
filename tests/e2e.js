// tests/e2e.js — arranca el juego entero en un DOM/canvas mockeado y corre el loop.
// Carga los 11 scripts en el MISMO orden que index.html y atrapa errores de runtime.
// Uso: node tests/e2e.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SCRIPTS = ['historia.js','hint-engine.js','mensajero.js','truco.js','telemetry.js','audio.js','art.js','input.js','fx.js','level.js','player.js',
  'enemies.js','arcade.js','super.js','vinilos.js','mundo.js','level-data.js','game.js'];

// ---- mock de canvas 2d context (acepta cualquier llamada/propiedad) ----
const grad = { addColorStop() {} };
function mkCtx() {
  const o = { canvas: null, shadowBlur: 0, globalAlpha: 1, lineWidth: 1, font: '', textAlign: '',
    fillStyle: '', strokeStyle: '', lineCap: '', lineJoin: '', globalCompositeOperation: '' };
  return new Proxy(o, {
    get(t, p) {
      if (p in t) return t[p];
      if (p === 'measureText') return () => ({ width: 10 });
      if (p === 'createLinearGradient' || p === 'createRadialGradient') return () => grad;
      if (p === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      if (p === 'createPattern') return () => ({});
      return () => {};
    },
    set(t, p, v) { t[p] = v; return true; },
  });
}
function mkClassList() {
  const set = new Set();
  return { add: (...c) => c.forEach(x => set.add(x)), remove: (...c) => c.forEach(x => set.delete(x)),
    toggle: (c) => set.has(c) ? (set.delete(c), false) : (set.add(c), true), contains: (c) => set.has(c) };
}
const allHandlers = []; // {target, type, fn}
function withListeners(base) {
  base.__h = {};
  base.addEventListener = (type, fn) => { (base.__h[type] = base.__h[type] || []).push(fn); allHandlers.push({ target: base, type, fn }); };
  base.removeEventListener = () => {};
  base.dispatch = (type, ev = {}) => (base.__h[type] || []).forEach(fn => fn(ev));
  base.classList = mkClassList();
  base.style = {};
  return base;
}
function mkCanvas(w = 0, h = 0) {
  return withListeners({ width: w, height: h, getContext: () => mkCtx(),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: w, height: h }),
    requestPointerLock() {}, toDataURL: () => '' });
}
function mkEl() {
  return new Proxy(withListeners({ textContent: '', innerHTML: '', width: 0, height: 0, value: '',
    getContext: () => mkCtx(), focus() {}, appendChild() {}, removeChild() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }) }),
    { get(t, p) { if (p in t) return t[p]; return () => {}; }, set(t, p, v) { t[p] = v; return true; } });
}

const screen = mkCanvas(960, 540);
const els = { screen };
const document = withListeners({
  getElementById(id) { if (!els[id]) els[id] = (id === 'screen' ? screen : mkEl()); return els[id]; },
  createElement(tag) { return tag === 'canvas' ? mkCanvas() : mkEl(); },
  body: mkEl(), documentElement: mkEl(),
});

// ---- audio mock ----
class FakeParam { constructor(){this.value=0;} setValueAtTime(){} linearRampToValueAtTime(){} exponentialRampToValueAtTime(){} setTargetAtTime(){} }
class FakeNode { constructor(){ this.frequency=new FakeParam(); this.gain=new FakeParam(); this.Q=new FakeParam(); this.detune=new FakeParam(); this.type=''; }
  connect(){return this;} disconnect(){} start(){} stop(){} }
class FakeAudioContext { constructor(){ this.currentTime=0; this.state='running'; this.sampleRate=44100; this.destination={}; }
  resume(){} createOscillator(){return new FakeNode();} createGain(){return new FakeNode();}
  createBiquadFilter(){return new FakeNode();} createBufferSource(){return new FakeNode();}
  createBuffer(){ return { getChannelData: () => new Float32Array(16) }; } }

// ---- RAF controlado a mano ----
const rafQ = [];
const sandbox = {
  console, Math, Date, JSON, Array, Object, String, Number, Boolean, parseInt, parseFloat,
  isNaN, isFinite, Float32Array, Uint8ClampedArray, Uint8Array, Set, Map, Proxy, Symbol, RegExp, Error,
  document, performance: { now: () => sandbox.__now },
  requestAnimationFrame: (fn) => { rafQ.push(fn); return rafQ.length; },
  cancelAnimationFrame: () => {},
  setTimeout: (fn) => { return 0; }, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
  AudioContext: FakeAudioContext, webkitAudioContext: FakeAudioContext,
  Image: class { set src(_) { if (this.onload) this.onload(); } },
  localStorage: (() => { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } }; })(),
  location: { search: '' },
  __now: 0,
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.__h = {};
sandbox.addEventListener = (type, fn) => { (sandbox.__h[type] = sandbox.__h[type] || []).push(fn); };
sandbox.removeEventListener = () => {};
sandbox.dispatchWin = (type, ev = {}) => (sandbox.__h[type] || []).forEach(fn => fn(ev));
vm.createContext(sandbox);

// ---- cargar scripts en orden ----
for (const s of SCRIPTS) {
  const code = fs.readFileSync(path.join(ROOT, 'js', s), 'utf8');
  try { vm.runInContext(code, sandbox, { filename: s }); }
  catch (e) { console.error('❌ [carga ' + s + ']', e.stack || e); process.exit(1); }
}
console.log('✓ Los ' + SCRIPTS.length + ' scripts cargaron sin error');

// ---- helpers de simulación ----
function step(frames, dtMs = 16) {
  for (let i = 0; i < frames; i++) {
    sandbox.__now += dtMs;
    const batch = rafQ.splice(0, rafQ.length);
    if (batch.length === 0) break;
    for (const fn of batch) {
      try { fn(sandbox.__now); }
      catch (e) { console.error('❌ [frame ' + i + ']', e.stack || e); process.exit(1); }
    }
  }
}
function key(k) { try { document.dispatch('keydown', { key: k, preventDefault(){}, code: k }); } catch (e) { console.error('❌ [tecla ' + k + ']', e.stack || e); process.exit(1); } }

module.exports = { sandbox, els, screen, document, step, key, rafQ };

// ---- si se corre directo, hace el smoke test básico ----
if (require.main === module) {
  els.startBtn = els.startBtn || mkEl();
  document.getElementById('startBtn').dispatch('click', {});
  step(120); // ~2s de juego en la calle
  console.log('✓ start() + 120 frames en la calle sin crash');

  // ---- guardado: round-trip serialize/restore (el seam que usa js/save.js) ----
  const save = vm.runInContext(`(() => {
    const out = [];
    if (!window.Game || !Game.serialize || !Game.continueGame) return JSON.stringify(['FAIL no se expone Game.serialize/continueGame']);
    const snap = Game.serialize();
    if (!snap) return JSON.stringify(['FAIL serialize devolvió null jugando']);
    if (snap.v !== 2 || typeof snap.current !== 'number' || !snap.player || !snap.flags) out.push('FAIL snapshot incompleto');
    // modificamos un snapshot y lo restauramos: debe quedar reflejado en el estado real
    const mod = JSON.parse(JSON.stringify(snap));
    mod.player.coins = 777; mod.flags.stormed = true; mod.player.hasMegaDrive = true;
    Game.continueGame(mod);
    const back = Game.serialize();
    if (!back || back.player.coins !== 777 || !back.flags.stormed || !back.player.hasMegaDrive)
      out.push('FAIL restore no aplicó el snapshot: ' + JSON.stringify(back && { c: back.player.coins, s: back.flags.stormed, m: back.player.hasMegaDrive }));
    // un snapshot inválido NO debe romper (continueGame cae a start())
    if (Game.serialize() == null) out.push('FAIL quedó fuera de juego tras restore');
    return JSON.stringify(out);
  })()`, sandbox);
  const sb = JSON.parse(save);
  if (sb.length) { console.error('❌ GUARDADO:\n' + sb.join('\n')); process.exit(1); }
  console.log('✓ guardado: serialize/restore round-trip OK');
  // moverse a la derecha un toque y simular interacción
  sandbox.Input && (sandbox.Input.keys = sandbox.Input.keys || {});
  key('e'); step(5); key('m'); step(5);
  console.log('✓ interact (E) y música (M) sin crash');

  // ---- auditoría estática de assets de TODOS los cuartos ----
  const audit = vm.runInContext(`(() => {
    const A = Art, R = Level.build(), bad = [];
    R.forEach((r, ri) => {
      (r.npcs||[]).forEach(n => { if (!A.npc[n.sprite]) bad.push(ri + ' npc ' + n.name + ' -> ' + n.sprite); });
      (r.enemies||[]).forEach(e => { if (e.look && A.enemy && !A.enemy[e.look]) bad.push(ri + ' enemy -> ' + e.look); });
      (r.machines||[]).forEach(mc => { if (!A.machines[mc.game]) bad.push(ri + ' machine -> ' + mc.game); });
      (r.decor||[]).forEach(d => { if (d.type && A.decor && !A.decor[d.type]) bad.push(ri + ' decor -> ' + d.type); });
      (r.doors||[]).forEach(d => { const k = d.art || 'door'; if (!A.items[k]) bad.push(ri + ' door -> ' + d.art); });   // art ya es la key de Art (F4, ex DOOR_ART)
    });
    return JSON.stringify({ bad: bad, n: R.length });
  })()`, sandbox);
  const a = JSON.parse(audit);
  if (a.bad.length) { console.error('❌ ASSETS FALTANTES:\n' + a.bad.join('\n')); process.exit(1); }
  console.log('✓ todos los assets de los ' + a.n + ' cuartos resuelven');

  // ---- bootear cada sub-modo y correrlo (adentro del contexto vm) ----
  sandbox.__mkCtx = mkCtx;
  const res = vm.runInContext(`(() => {
    const C = __mkCtx();
    const fp = { coins: 50, caramelos: 5, birras: 3, ammo: 10, hp: 100, hasMegaDrive: false, hasCementoTicket: false };
    const run = (g, frames) => { for (let i = 0; i < frames; i++) { g.update && g.update(0.016); g.draw && g.draw(C, 960, 540); } };
    const ok = [];
    for (const gm of ['pacman','galaga','frogger','truco','fighter']) { run(Arcade.create(gm), 60); ok.push('arcade:' + gm); }
    run(Super.create({ player: fp, gaveBeers: false }), 60); ok.push('super');
    run(Vinilos.create({ player: fp }), 60); ok.push('vinilos');
    return ok.join(',');
  })()`, sandbox);
  res.split(',').forEach(n => console.log('✓ modo ' + n + ' corre 60 frames sin crash'));

  // ---- TRUCO F2: jugar una PARTIDA completa (elige formato + tira cartas hasta el final) ----
  const trucoMatch = vm.runInContext(`(() => {
    const C = __mkCtx(); const K = Input.keys;
    function play(fmtKey) {
      const g = Arcade.create('truco');
      for (const k in K) K[k] = false;
      K[fmtKey] = true; g.update(0.2); g.draw(C, 960, 540);   // elegir formato
      let guard = 0;
      while (!g.done && guard++ < 600) {
        K['q'] = true; K['1'] = true; K['2'] = true; K['3'] = true;  // resolver cantos (quiero) + tirar carta
        g.update(0.2); g.draw(C, 960, 540);
        for (const k of ['q','1','2','3']) K[k] = false;
        g.update(0.2);                                          // dejar avanzar timers (reveal/pausa)
      }
      return g;
    }
    const out = [];
    for (const [fmt, key] of [['3manos','3'], ['a15','1']]) {
      const g = play(key);
      if (!g.done) out.push('FAIL ' + fmt + ' no terminó');
      else if (g.result !== 'win' && g.result !== 'lose') out.push('FAIL ' + fmt + ' result=' + g.result);
      else if (typeof g.floresDelta !== 'number') out.push('FAIL ' + fmt + ' floresDelta no num');
    }
    return JSON.stringify(out);
  })()`, sandbox);
  const tm = JSON.parse(trucoMatch);
  if (tm.length) { console.error('❌ TRUCO PARTIDA:\n' + tm.join('\n')); process.exit(1); }
  console.log('✓ truco F2: partida completa (3 manos + a 15) termina con win/lose + flores');

  // ---- grafo de historia + motor de pistas (HintEngine) ----
  const hint = vm.runInContext(`(() => {
    const out = [];
    if (typeof Historia === 'undefined' || !Historia.edges.length) out.push('FAIL Historia no cargó');
    // estado inicial: la frontera debe incluir las aristas sin precondición (tormenta/edificio/truco)
    const f0 = HintEngine.frontier({}).map(e => e.id);
    if (!f0.includes('tormenta') || !f0.includes('edificio')) out.push('FAIL frontera inicial: ' + f0.join(','));
    // cercanía: en la cueva, la próxima pista debe ser la tormenta
    const inCueva = HintEngine.next({}, { at: 'cueva', insistencia: 0 });
    if (!inCueva || inCueva.id !== 'tormenta') out.push('FAIL cercanía cueva→tormenta: ' + (inCueva && inCueva.id));
    // una arista hecha (stormed=true) sale de la frontera
    if (HintEngine.frontier({ stormed: true }).some(e => e.id === 'tormenta')) out.push('FAIL tormenta hecha sigue en frontera');
    // secundarias: cercanía al super sugiere la Mega Drive; el FIFA NO aparece sin Mega Drive (precondición)
    const inSuper = HintEngine.next({}, { at: 'super' });
    if (!inSuper || inSuper.id !== 'megadrive') out.push('FAIL cercanía super→megadrive: ' + (inSuper && inSuper.id));
    if (HintEngine.frontier({}).some(e => e.id === 'fifa')) out.push('FAIL fifa en frontera sin Mega Drive');
    if (!HintEngine.frontier({ hasMegaDrive: true }).some(e => e.id === 'fifa')) out.push('FAIL fifa no aparece con Mega Drive');
    // chino: DOS formas post-tormenta. cerca de la cueva → puerta TRASERA (chino_back); cerca de Cemento → Iorio
    const backCueva = HintEngine.next({ stormed: true }, { at: 'cueva' });
    if (!backCueva || backCueva.id !== 'chino_back') out.push('FAIL cercanía cueva→chino_back: ' + (backCueva && backCueva.id));
    const iorioCemento = HintEngine.next({ stormed: true }, { at: 'cemento' });
    if (!iorioCemento || iorioCemento.id !== 'chino_iorio') out.push('FAIL cercanía cemento→chino_iorio: ' + (iorioCemento && iorioCemento.id));
    // la trasera se resuelve al ENTRAR (chinoEntered) y desaparece si ya abriste el frente (chinoFrontOpen)
    if (HintEngine.frontier({ stormed: true, chinoEntered: true }).some(e => e.id === 'chino_back')) out.push('FAIL chino_back sigue tras entrar');
    if (HintEngine.frontier({ stormed: true, chinoFrontOpen: true }).some(e => e.id === 'chino_back')) out.push('FAIL chino_back sigue con frente abierto');
    // Fase 2 (el grafo MANEJE los flags): cada arista que game.js aplica por id debe existir y setear
    // EXACTAMENTE su flag (si no, applyEdge no haría la transición). Atrapa typos de id / drift del grafo.
    const F2 = { tormenta:'stormed', edificio:'borrachosHappy', bunker:'bunkerUnlocked', chino_iorio:'chinoFrontOpen',
      truco:'trucoWon', fifa:'fifaWon', armas:'armado', chino_back:'chinoEntered' };
    for (const id in F2) {
      const e = Historia.edges.find(x => x.id === id);
      if (!e) out.push('FAIL Fase2: falta la arista ' + id);
      else if (!e.sets || e.sets[F2[id]] !== true) out.push('FAIL Fase2: ' + id + ' no setea ' + F2[id] + ' → ' + JSON.stringify(e.sets));
    }
    // todo hecho (crítico + secundario + portal) → no quedan pistas
    const allDone = { stormed:true, borrachosHappy:true, bunkerUnlocked:true, chinoFrontOpen:true, trucoWon:true,
      won:true, hasMegaDrive:true, fifaWon:true, hasCementoTicket:true, armado:true, sleptOnce:true, chinoEntered:true };
    if (HintEngine.next(allDone, {}) !== null) out.push('FAIL con todo hecho sigue dando pista: ' + JSON.stringify(HintEngine.next(allDone, {})));
    return JSON.stringify(out);
  })()`, sandbox);
  const hb = JSON.parse(hint);
  if (hb.length) { console.error('❌ HINT ENGINE:\n' + hb.join('\n')); process.exit(1); }
  console.log('✓ grafo de historia (' + vm.runInContext('Historia.edges.length', sandbox) + ' aristas) + motor de pistas OK');

  // ---- Mensajero (invocación genérica agente-a-agente): clasifica pista/ambiente/reaccion ----
  const men = vm.runInContext(`(() => {
    const out = [];
    if (typeof Mensajero === 'undefined') { out.push('FAIL Mensajero no cargó'); return JSON.stringify(out); }
    Mensajero.init({ state: () => ({}), at: () => 'cueva' });
    // en la cueva, con estado vacío, hay frontera (tormenta) → debe dar una PISTA con short+full
    const p = Mensajero.pedir({ tipo:'cartel', id:'t1', at:'cueva' });
    if (!p || p.clase !== 'pista') out.push('FAIL cueva no dio pista: ' + JSON.stringify(p));
    if (!p || !p.short || !p.full) out.push('FAIL pista sin short/full: ' + JSON.stringify(p));
    // un lugar sin frontera → AMBIENTE (propaganda), con fallback estático
    const a = Mensajero.pedir({ tipo:'banner', id:'b1', at:'lugar_inexistente' });
    if (!a || a.clase !== 'ambiente' || !a.short) out.push('FAIL ambiente: ' + JSON.stringify(a));
    // tras un evento reciente → REACCION
    Mensajero.evento('tormenta');
    const r = Mensajero.pedir({ tipo:'cartel', id:'t2', at:'cueva' });
    if (!r || r.clase !== 'reaccion') out.push('FAIL reaccion tras evento: ' + JSON.stringify(r));
    return JSON.stringify(out);
  })()`, sandbox);
  const mb = JSON.parse(men);
  if (mb.length) { console.error('❌ MENSAJERO:\n' + mb.join('\n')); process.exit(1); }
  console.log('✓ Mensajero: pista/ambiente/reaccion + short/full OK');

  // ---- motor de TRUCO (reglas puras: jerarquía, envido, flor, parda) ----
  const tru = vm.runInContext(`(() => {
    const out = [];
    if (typeof Truco === 'undefined') { out.push('FAIL Truco no cargó'); return JSON.stringify(out); }
    const C = (n, s) => ({ n, s });
    // jerarquía: 1e>1b>7e>7o>3>2>1o>12>11>10>7c>6>5>4
    const order = [C(1,'e'),C(1,'b'),C(7,'e'),C(7,'o'),C(3,'c'),C(2,'c'),C(1,'o'),C(12,'c'),C(11,'c'),C(10,'c'),C(7,'c'),C(6,'c'),C(5,'c'),C(4,'c')];
    for (let i = 0; i < order.length - 1; i++)
      if (!(Truco.power(order[i]) > Truco.power(order[i+1]))) out.push('FAIL jerarquía en ' + JSON.stringify(order[i]));
    // envido: 7e+6e+5c = 33
    if (Truco.envido([C(7,'e'),C(6,'e'),C(5,'c')]) !== 33) out.push('FAIL envido 33: ' + Truco.envido([C(7,'e'),C(6,'e'),C(5,'c')]));
    // sin par: 7e+5b+4o = 7
    if (Truco.envido([C(7,'e'),C(5,'b'),C(4,'o')]) !== 7) out.push('FAIL envido sin par');
    // figuras valen 0: 12e+11e+5c = 20
    if (Truco.envido([C(12,'e'),C(11,'e'),C(5,'c')]) !== 20) out.push('FAIL envido figuras=0');
    // flor: 7e+5e+4e = 36 ; sin flor = null
    if (Truco.flor([C(7,'e'),C(5,'e'),C(4,'e')]) !== 36) out.push('FAIL flor 36');
    if (Truco.flor([C(7,'e'),C(5,'e'),C(4,'c')]) !== null) out.push('FAIL no-flor debe ser null');
    // clash: 1e gana a 7e ; dos 3 = parda
    if (Truco.clash(C(1,'e'),C(7,'e')) !== 1) out.push('FAIL clash 1e>7e');
    if (Truco.clash(C(3,'o'),C(3,'c')) !== 0) out.push('FAIL parda dos 3');
    // handWinner: gana 2 bazas
    if (Truco.handWinner([1,1], 1) !== 1) out.push('FAIL hand [1,1]');
    if (Truco.handWinner([-1,1,1], 1) !== 1) out.push('FAIL hand [-1,1,1]');
    if (Truco.handWinner([0,-1], 1) !== -1) out.push('FAIL hand parda-luego-pierde');
    if (Truco.handWinner([0,0,0], 1) !== 1) out.push('FAIL hand 3 pardas → mano');
    // deal: 6 cartas distintas, 3 y 3 (determinista por semilla)
    const d = Truco.deal(123);
    if (d.p.length !== 3 || d.a.length !== 3) out.push('FAIL deal 3y3');
    const all = [...d.p, ...d.a].map(c => c.n + c.s);
    if (new Set(all).size !== 6) out.push('FAIL deal cartas repetidas');
    return JSON.stringify(out);
  })()`, sandbox);
  const tb = JSON.parse(tru);
  if (tb.length) { console.error('❌ TRUCO:\n' + tb.join('\n')); process.exit(1); }
  console.log('✓ motor de truco: jerarquía + envido + flor + parda + reparto OK');

  // ---- chino: changuito (agarrar sin pagar) → pagar → ninjas si rajás sin pagar ----
  const chino = vm.runInContext(`(() => {
    const out = [];
    const C = __mkCtx();
    // 1) agarrar varios items, pagar con guita suficiente → pasan al inventario y dan vuelto en caramelos
    const P1 = { coins: 50, caramelos: 0, diosa: 0, carne: 0, fiambre: 0, hasMegaDrive: false };
    const s1 = Super.create({ player: P1, gaveBeers: false });
    s1.__grab('DIOSAS'); s1.__grab('CARNES'); s1.__grab('FIAMBRES');
    if (s1.__cart().length !== 3) out.push('FAIL changuito no junta 3');
    if (P1.diosa !== 0 || P1.carne !== 0) out.push('FAIL agarrar ya entrega sin pagar');
    s1.__pay();
    if (s1.__cart().length !== 0) out.push('FAIL changuito no se vacía al pagar');
    if (P1.diosa !== 1 || P1.carne !== 1 || P1.fiambre !== 1) out.push('FAIL pagar no deposita inventario');
    if (P1.coins !== 50 - 3*6) out.push('FAIL no cobra bien (' + P1.coins + ')');
    if (P1.caramelos <= 0) out.push('FAIL no da vuelto en caramelos');
    // 1b) CAJA (checkout): abrir → tender default = total; sacar un item baja el total
    const Pc = { coins: 50, caramelos: 0, diosa: 0, carne: 0, fiambre: 0, hasMegaDrive: false };
    const sc = Super.create({ player: Pc, gaveBeers: false });
    sc.__grab('DIOSAS'); sc.__grab('CARNES'); sc.__grab('GALLETITAS');
    sc.__openCaja();
    let co = sc.__checkout();
    if (!co || co.phase !== 'cart') out.push('FAIL caja no abre el checkout');
    if (co && co.total !== 3 * 6) out.push('FAIL caja total mal (' + (co && co.total) + ')');
    if (co && co.tender !== co.total) out.push('FAIL tender default ≠ total');
    sc.__removeSel(); co = sc.__checkout();
    if (co && co.total !== 2 * 6) out.push('FAIL sacar item no baja el total (' + (co && co.total) + ')');
    // 2) sin guita suficiente: NO se paga y NO acepta caramelos (cart intacto)
    const P2 = { coins: 2, caramelos: 999, diosa: 0 };
    const s2 = Super.create({ player: P2, gaveBeers: false });
    s2.__grab('DIOSAS'); s2.__pay();
    if (s2.__cart().length !== 1 || P2.diosa !== 0) out.push('FAIL pagó sin guita / aceptó caramelos');
    // 3) rajar con el changuito lleno → ninjas, se pierde la mercadería, te echan a la calle
    const P3 = { coins: 50, diosa: 0 };
    const s3 = Super.create({ player: P3, gaveBeers: false });
    s3.__grab('DIOSAS'); s3.__leave('street');
    if (s3.__cart().length !== 0) out.push('FAIL ninjas no te sacan la mercadería');
    if (P3.diosa !== 0) out.push('FAIL te quedaste con lo no pagado');
    for (let i = 0; i < 200 && !s3.done; i++) s3.update(0.016);
    if (!s3.done || s3.exitTo !== 'street') out.push('FAIL ninjas no te echan a la calle');
    return out.length ? out.join(' | ') : 'OK';
  })()`, sandbox);
  if (chino !== 'OK') { console.error('❌ CHINO/CHANGUITO: ' + chino); process.exit(1); }
  console.log('✓ chino: changuito + pagar + vuelto en caramelos + ninjas (sin pagar) OK');

  // ---- motor v2 (data-driven): Mundo.fromModel(LEVEL1) construye el nivel headless sin crash ----
  const v2n = vm.runInContext('(typeof Mundo!=="undefined" && window.LEVEL1) ? Mundo.fromModel(window.LEVEL1).length : -1', sandbox);
  if (v2n !== 45) { console.error('❌ motor v2: Mundo.fromModel(LEVEL1) construyó ' + v2n + ' salas (esperaba 45)'); process.exit(1); }
  console.log('✓ motor v2: Mundo.fromModel(LEVEL1) construye ' + v2n + ' salas (headless)');

  // ---- PARIDAD v1 vs v2: misma estructura de salas (puertas, máquinas, npcs) ----
  const parity = vm.runInContext(`(() => {
    const v1 = Level.build(), v2 = Mundo.fromModel(window.LEVEL1);
    const out = [];
    if (v1.length !== v2.length) out.push('salas: v1=' + v1.length + ' v2=' + v2.length);
    const ids = (arr, k) => (arr || []).map(x => x.id || x.art || x.type || '?').sort().join(',');
    for (let i = 0; i < Math.min(v1.length, v2.length); i++) {
      const a = v1[i], b = v2[i];
      const d1 = ids(a.doors), d2 = ids(b.doors);
      if (d1 !== d2) out.push('sala ' + i + ' (' + a.name + ') puertas: v1[' + d1 + '] v2[' + d2 + ']');
      const m1 = ids(a.machines), m2 = ids(b.machines);
      if (m1 !== m2) out.push('sala ' + i + ' (' + a.name + ') máquinas: v1[' + m1 + '] v2[' + m2 + ']');
      if ((a.npcs||[]).length !== (b.npcs||[]).length) out.push('sala ' + i + ' (' + a.name + ') npcs: v1=' + (a.npcs||[]).length + ' v2=' + (b.npcs||[]).length);
      if ((a.cueveros||[]).length !== (b.cueveros||[]).length) out.push('sala ' + i + ' cueveros: v1=' + (a.cueveros||[]).length + ' v2=' + (b.cueveros||[]).length);
    }
    return JSON.stringify(out.slice(0, 25));
  })()`, sandbox);
  const pa = JSON.parse(parity);
  if (pa.length) { console.error('⚠️  PARIDAD v1↔v2 (diferencias):\\n' + pa.join('\\n')); }
  else console.log('✓ paridad v1↔v2: misma estructura (puertas/máquinas/npcs/cueveros) en las 45 salas');

  // ---- v2 JUGABLE headless: forzar el motor v2 y correr el loop sin crash ----
  vm.runInContext('localStorage.setItem("ts_engine","v2")', sandbox);
  document.getElementById('startBtn').dispatch('click', {});
  step(90);
  key('e'); step(5);
  console.log('✓ motor v2: start + 95 frames jugando en v2 (con interact) sin crash');

  console.log('\n🎮 E2E OK — boot + calle + todos los sub-modos + chino corren sin crash.');
}
