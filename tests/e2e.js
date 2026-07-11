// tests/e2e.js — arranca el juego entero en un DOM/canvas mockeado y corre el loop.
// Carga los 11 scripts en el MISMO orden que index.html y atrapa errores de runtime.
// Uso: node tests/e2e.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SCRIPTS = ['historia.js','hint-engine.js','mensajero.js','eventos.js','ideas.js','truco.js','truco-net.js','truco-net6.js','telemetry.js','audio.js','art.js','input.js','fx.js','level.js','player.js',
  'enemies.js','arcade.js','super.js','vinilos.js','playable.js','nivelai.js','spinoff.js','tienda.js','telo.js','bodegon.js','lavalle.js','obelisco.js','subte.js','plaza.js','constitucion.js','consticalle.js','retiro.js','villa31.js','trenes.js','tren.js','cancha.js','campana.js','saavedra.js','once.js','chevallier.js','zarate.js','regata.js','finale.js','mapa.js','piquete.js','soga.js','bombo.js','olla.js','pancarta.js','globo.js','bunkermapa.js','truco-pvp.js','truco-pvp6.js','mundo.js','level-data.js','game.js'];

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
class FakeNode { constructor(){ this.frequency=new FakeParam(); this.gain=new FakeParam(); this.Q=new FakeParam(); this.detune=new FakeParam();
  this.threshold=new FakeParam(); this.knee=new FakeParam(); this.ratio=new FakeParam(); this.attack=new FakeParam(); this.release=new FakeParam();
  this.type=''; this.curve=null; this.oversample=''; }
  connect(){return this;} disconnect(){} start(){} stop(){} }
class FakeAudioContext { constructor(){ this.currentTime=0; this.state='running'; this.sampleRate=44100; this.destination={}; }
  resume(){} createOscillator(){return new FakeNode();} createGain(){return new FakeNode();}
  createBiquadFilter(){return new FakeNode();} createBufferSource(){return new FakeNode();}
  createWaveShaper(){return new FakeNode();} createDynamicsCompressor(){return new FakeNode();} createAnalyser(){return new FakeNode();}
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

  // ---- EL MAPA [TAB] (specs/mapa-juego.md): abre (build sobre las 51 salas reales) + dibuja + zoom + cierra ----
  key('Tab'); step(30);
  const mapModel = vm.runInContext('Mapa.model && JSON.stringify({ n: Mapa.model.nodes.length, anclas: Mapa.model.nodes.filter(x => x.anchor != null).length })', sandbox);
  const mp = JSON.parse(mapModel || 'null');
  if (!mp || mp.n < 40 || mp.anclas !== mp.n) { console.error('❌ MAPA: build incompleto', mapModel); process.exit(1); }
  key('z'); step(10);   // zoom al edificio
  key('Tab'); step(5);  // cerrar
  console.log('✓ EL MAPA [TAB]: build (' + mp.n + ' salas, todas ancladas) + draw + zoom sin crash');

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
    mod.flags.cueveroUnlocked = true; mod.flags.tahurDiscovered = true; mod.flags.guidoFollowing = true;   // gate del cuevero
    mod.player.inventory = ['escupitajo', 'viola']; mod.player.weapon = 'viola';   // INVENTARIO: la viola round-trippea
    Game.continueGame(mod);
    const back = Game.serialize();
    if (!back || back.player.coins !== 777 || !back.flags.stormed || !back.player.hasMegaDrive)
      out.push('FAIL restore no aplicó el snapshot: ' + JSON.stringify(back && { c: back.player.coins, s: back.flags.stormed, m: back.player.hasMegaDrive }));
    if (!back || !Array.isArray(back.player.inventory) || !back.player.inventory.includes('viola') || back.player.weapon !== 'viola')
      out.push('FAIL inventario/viola no round-trippeó: ' + JSON.stringify(back && { inv: back.player.inventory, w: back.player.weapon }));
    if (!back || !back.flags.cueveroUnlocked || !back.flags.tahurDiscovered || !back.flags.guidoFollowing)
      out.push('FAIL gate del cuevero no round-trippeó: ' + JSON.stringify(back && back.flags));
    // un snapshot inválido NO debe romper (continueGame cae a start())
    if (Game.serialize() == null) out.push('FAIL quedó fuera de juego tras restore');
    // CHECKPOINTS por hito (guardar-partida.md F1): guardar durante el juego → cargar coherente + re-entrar
    if (!Game.__chk) out.push('FAIL no expone Game.__chk');
    else {
      Game.__chk.save('e2e_hito');
      const chk = Game.__chk.load();
      if (!chk || chk.edge !== 'e2e_hito' || !chk.snap || chk.snap.v !== 2) out.push('FAIL checkpoint no guardó: ' + JSON.stringify(chk && { e: chk.edge, v: chk.snap && chk.snap.v }));
      else { Game.continueGame(chk.snap); if (Game.serialize() == null) out.push('FAIL no volvió al juego desde el checkpoint'); }
    }
    // BUFFS temporales (inventario-armas §7.3, kind:'buff'): dar birra → usar → efectos activos → consumo → expiran con el tiempo
    if (!Game.__buff) out.push('FAIL no expone Game.__buff');
    else {
      Game.__buff.give('birra');
      if (!Game.__buff.state().inv.includes('birra')) out.push('FAIL birra no entró al inventario');
      Game.__buff.use('birra');
      let st = Game.__buff.state();
      if (st.speedMul !== 1.4 || !st.shielded) out.push('FAIL birra: buff no aplicó ' + JSON.stringify({ s: st.speedMul, sh: st.shielded }));
      if (st.inv.includes('birra')) out.push('FAIL birra no se consumió al usarla');
      if (st.buffs.length !== 3) out.push('FAIL birra: deberían activarse 3 buffs, hay ' + st.buffs.length);
      Game.__buff.tick(9);   // pasan 9s (dura 8) → expiran
      st = Game.__buff.state();
      if (st.buffs.length !== 0 || st.speedMul !== 1 || st.shielded) out.push('FAIL birra: los buffs no expiraron: ' + JSON.stringify(st));
    }
    return JSON.stringify(out);
  })()`, sandbox);
  const sb = JSON.parse(save);

  // ---- NIVEL-AI en el MOTOR REAL (rooms-swap): lanzar → entra al nivel generado → ganar → restaura el juego ----
  const nivelai = vm.runInContext(`(() => {
    const out = [];
    if (!window.Game || !Game.__nivelai) return JSON.stringify(['FAIL no expone Game.__nivelai']);
    const before = Game.serialize(); if (!before) return JSON.stringify(['FAIL no hay juego principal']);
    Game.__nivelai.launch();
    if (!Game.__nivelai.active()) return JSON.stringify(['FAIL no entró al nivel-AI (¿generación/validación falló?)']);
    const rm = Game.__nivelai.room();
    if (!rm || !rm.playerStart) out.push('FAIL sala de entrada del nivel generado sin spawn');
    const p = Game.__nivelai.player(); const c0 = (p.caramelos || 0);
    Game.__nivelai.end('win');                                   // simular llegar a la meta
    if (Game.__nivelai.active()) out.push('FAIL no salió del nivel-AI');
    if ((p.caramelos || 0) <= c0) out.push('FAIL no dio el souvenir al ganar');
    const after = Game.serialize();
    if (!after || after.current !== before.current) out.push('FAIL no restauró la sala del juego principal');
    // morir en el nivel bonus NO debe matar el run: relanzar y salir por 'dead'
    Game.__nivelai.launch(); Game.__nivelai.end('dead');
    if (Game.__nivelai.active() || Game.serialize() == null) out.push('FAIL morir en el nivel-AI rompió el run');
    // MUNDO por SEED (quest-mundo-ai.md): mismo seed = MISMO mundo (determinista, compartible) + jugable (la RED)
    if (typeof NivelAI !== 'undefined' && NivelAI.generateLevel) {
      const g1 = NivelAI.generateLevel(undefined, 12345), g2 = NivelAI.generateLevel(undefined, 12345);
      if (!g1 || !g2 || !g1.model) out.push('FAIL mundo-seed no generó');
      else {
        if (JSON.stringify(g1.model) !== JSON.stringify(g2.model)) out.push('FAIL mundo-seed 12345 NO es determinista');
        if (typeof Playable !== 'undefined' && !Playable.checkLevel(g1.model).ok) out.push('FAIL mundo-seed no es jugable (la RED)');
        if (g1.model.seed !== '12345') out.push('FAIL el modelo no lleva el seed: ' + g1.model.seed);
        const g3 = NivelAI.generateLevel(undefined, 999);
        if (g3 && g3.model && JSON.stringify(g3.model) === JSON.stringify(g1.model)) out.push('FAIL distinto seed dio el MISMO mundo');
      }
    }
    // MUNDO-AI en el MOTOR REAL (rooms-swap, como __nivelai): lanzar por seed → entra → sala con spawn → salir restaura
    if (!Game.__mundoai) out.push('FAIL no expone Game.__mundoai');
    else {
      const mbefore = Game.serialize();
      Game.__mundoai.launch(54321);   // sin fetch en el sandbox headless → NivelAI.requestMundo cae sync a null → entra igual (nunca bloquea)
      if (!Game.__mundoai.active()) out.push('FAIL mundo-ai no entró (¿generación/validación falló?)');
      else {
        if (Game.__mundoai.lastSeed() !== 54321) out.push('FAIL mundo-ai no guardó el seed jugado: ' + Game.__mundoai.lastSeed());
        const mrm = Game.__mundoai.room(); if (!mrm || !mrm.playerStart) out.push('FAIL sala del mundo-ai sin spawn');
        Game.__mundoai.end('win');
        if (Game.__mundoai.active()) out.push('FAIL no salió del mundo-ai');
        const mafter = Game.serialize();
        if (!mafter || mafter.current !== mbefore.current) out.push('FAIL mundo-ai no restauró la sala del juego principal');
      }
    }
    return JSON.stringify(out);
  })()`, sandbox);
  JSON.parse(nivelai).forEach(f => sb.push(f));

  // ---- DÓLARES: apaciguan a la GENTE (no la matan) y dañan a las MÁQUINAS (drones) ----
  const dollar = vm.runInContext(`(() => {
    const out = [];
    const room = { w: 20, h: 14, map: Array.from({ length: 14 }, () => new Array(20).fill(0)) };   // sala abierta (sin sólidos)
    const farPlayer = { alive: true, x: -9999, y: 0, w: 10, h: 10 };
    // peatón (gente): el dólar lo APACIGUA → no muere, deja de ser hostil
    const e = Enemies.create({ type: 'peaton', x: 5 * 32, y: 8 * 32 }); e.hostile = true;
    Bullets.clear(); Bullets.spawn(e.x + e.w / 2, e.y + e.h / 2, 0, 0, 'player', 14, 'dollar');
    Bullets.update(0.016, room, [e], farPlayer, () => {});
    if (!e.pacified) out.push('FAIL dólar no apacigua a la gente');
    if (!e.alive) out.push('FAIL dólar mató a la gente (debe apaciguar)');
    if (e.hostile) out.push('FAIL apaciguado sigue hostil');
    // dron (máquina): el dólar le hace DAÑO (no se apacigua)
    const d = Enemies.create({ type: 'dron', x: 5 * 32, y: 6 * 32 }); d.hostile = true; const hp0 = d.hp;
    Bullets.clear(); Bullets.spawn(d.x + d.w / 2, d.y + d.h / 2, 0, 0, 'player', 14, 'dollar');
    Bullets.update(0.016, room, [d], farPlayer, () => {});
    if (d.pacified) out.push('FAIL dólar apaciguó un dron (debe dañar)');
    if (d.hp >= hp0) out.push('FAIL dólar no dañó al dron');
    // ROBOT CIEGO (serie buena = legal): el dron NO dispara cuando dronesBlind=true; SÍ cuando es trucha (false)
    const near = { alive: true, x: 5 * 32, y: 5 * 32, w: 16, h: 16 };   // jugador a tiro
    const dr = Enemies.create({ type: 'dron', x: 5 * 32, y: 6 * 32 }); dr.hostile = true; dr.shootCd = -1;
    Bullets.clear(); Enemies.update([dr], 0.016, room, near, true);     // ciego → no debe disparar
    const blindShots = Bullets.list.length;
    const dr2 = Enemies.create({ type: 'dron', x: 5 * 32, y: 6 * 32 }); dr2.hostile = true; dr2.shootCd = -1;
    Bullets.clear(); Enemies.update([dr2], 0.016, room, near, false);   // trucha/normal → te sigue disparando
    const seeShots = Bullets.list.length;
    if (blindShots !== 0) out.push('FAIL dron ciego (serie buena) igual disparó');
    if (seeShots === 0) out.push('FAIL dron NO ciego no disparó (debería seguir)');
    // el escupitajo (pre-tormenta) SÍ daña a la gente (no apacigua)
    const e2 = Enemies.create({ type: 'peaton', x: 5 * 32, y: 8 * 32 }); e2.hostile = true; const ehp = e2.hp;
    Bullets.clear(); Bullets.spawn(e2.x + e2.w / 2, e2.y + e2.h / 2, 0, 0, 'player', 14, 'spit');
    Bullets.update(0.016, room, [e2], farPlayer, () => {});
    if (e2.pacified) out.push('FAIL escupitajo apaciguó (solo el dólar apacigua)');
    if (e2.hp >= ehp) out.push('FAIL escupitajo no dañó');
    return JSON.stringify(out);
  })()`, sandbox);
  JSON.parse(dollar).forEach(f => sb.push(f));
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
    // NIVEL-AI: cada tema genera una escena válida y el spinoff la corre + da el souvenir al llegar a la meta
    for (const th of NivelAI.THEMES) {
      const sc = NivelAI.generate(th.id);
      if (sc.id !== th.id || !sc.name || !sc.props.length || !sc.npcs.length || !sc.goal) throw new Error('nivelai gen inválido: ' + th.id);
      const pr = { caramelos: 0, coins: 0 };
      Spinoff._reward = rw => { for (const k in (rw || {})) pr[k] = (pr[k] || 0) + (rw[k] || 0); };
      const sp = Spinoff.create(sc); run(sp, 30); sp.__reach();
      if (!sp.done || sp.exitTo !== 'back') throw new Error('spinoff no termina: ' + th.id);
      if ((pr.caramelos | 0) <= 0) throw new Error('spinoff no da souvenir: ' + th.id);
      ok.push('nivelai:' + th.id);
      // LADRILLO 2-3 (C): el nivel-PLATAFORMA generado (multi-sala) pasa la RED + se CONSTRUYE con Mundo.fromModel
      const gl = NivelAI.generateLevel(th.id);
      const v = Playable.checkLevel(gl.model);
      if (!v.ok) throw new Error('nivel-ai ' + th.id + ' NO jugable: ' + v.problems.join(' | '));
      const built = Mundo.fromModel(gl.model);
      if (built.length < 2) throw new Error('nivel-ai ' + th.id + ' no es multi-sala (' + built.length + ')');
      if (!built[0].playerStart) throw new Error('nivel-ai ' + th.id + ' sin spawn en sala 0');
      if (!built[built.length - 1].goal) throw new Error('nivel-ai ' + th.id + ' sin meta en la última sala');
      // las puertas deben estar CABLEADAS (to=índice válido) → se puede recorrer de sala a sala
      for (const rm of built) for (const d of rm.doors || []) if (typeof d.to !== 'number' || d.to < 0 || d.to >= built.length) throw new Error('nivel-ai ' + th.id + ' puerta sin wiring');
      ok.push('nivelai-level:' + th.id);
    }
    // TEMA "ORÁCULO" (ad-hoc, lo INVENTA la IA): generateLevel debe aceptar un tema-OBJETO y salir jugable
    const oraculo = { id: 'oraculo', motif: '🔮', name: { es: 'Tu Nivel', en: 'Your Level' }, intro: { es: '...', en: '...' },
      palette: { floor: '#241c2e', floor2: '#2b2238', wall: '#4a3a66', accent: '#e0b0ff' }, props: ['🔮', '✨'],
      npc: { emoji: '🔮', lines: { es: ['te conozco'], en: ['i know you'] } }, goal: { es: 'SALIDA', en: 'EXIT' }, reward: { caramelos: 6 }, style: 'climb', decor: ['cartel', 'caja'] };
    const go = NivelAI.generateLevel(oraculo);
    if (!Playable.checkLevel(go.model).ok) throw new Error('tema oraculo (objeto) NO jugable');
    const gb = Mundo.fromModel(go.model);
    if (!gb[0].playerStart || !gb[gb.length - 1].goal) throw new Error('tema oraculo (objeto) no construye');
    ok.push('nivelai-oraculo');
    // FASE 2 LAVALLE: "Aguantar el corte" — el host simula olas + barricada y TERMINA (win/lose) sin crash
    const pq = Piquete.create({ role: 'host', seats: ['me'], myPid: 'me', seed: 7, sendState: () => {} });
    for (let i = 0; i < 800 && !pq.done; i++) { pq.update(0.05); pq.draw(C, 960, 540); }
    if (!pq.done || !['win', 'lose', 'flee'].includes(pq.result)) throw new Error('piquete host no termina: ' + pq.result);
    // guest: aplica estado del host sin crash
    const pg = Piquete.create({ role: 'guest', seats: ['h', 'me'], myPid: 'me', seed: 7 });
    pg.applyState({ t: 'lv-state', h: 80, w: 2, p: 'play', e: [5, 2, 9, 1.5] }); pg.draw(C, 960, 540);
    pg.applyState({ t: 'lv-state', h: 60, w: 3, p: 'boss', e: [], b: [9, 2, 80] }); pg.onRay(); pg.draw(C, 960, 540);   // fase ROBOCOP + rayo
    ok.push('piquete:' + pq.result);
    // "LA SOGA": host solo (sin tirar) → el desalojo gana (lose); tirando mucho → gana (win)
    const sg = Soga.create({ role: 'host', seats: ['me'], myPid: 'me', seed: 3, sendState: () => {} });
    for (let i = 0; i < 600 && !sg.done; i++) { sg.update(0.05); sg.draw(C, 960, 540); }   // sin input → pierde
    if (sg.result !== 'lose') throw new Error('soga sin tirar debería perder: ' + sg.result);
    const sg2 = Soga.create({ role: 'host', seats: ['me'], myPid: 'me', seed: 3, sendState: () => {} });
    for (let i = 0; i < 600 && !sg2.done; i++) { sg2.tapExternal(); sg2.update(0.05); sg2.draw(C, 960, 540); }   // tirando cada frame → gana
    if (sg2.result !== 'win') throw new Error('soga tirando fuerte debería ganar: ' + sg2.result);
    ok.push('soga:ok');
    // "BOMBO & CUMBIA": tocando (cada frame, muchos caen en el pulso) → gana; sin tocar → decae → pierde
    const bm = Bombo.create({ role: 'host', seats: ['me'], myPid: 'me', seed: 5, sendState: () => {} });
    for (let i = 0; i < 900 && !bm.done; i++) { bm.tapExternal(); bm.update(0.05); bm.draw(C, 960, 540); }
    if (bm.result !== 'win') throw new Error('bombo tocando debería ganar: ' + bm.result);
    const bm2 = Bombo.create({ role: 'host', seats: ['me'], myPid: 'me', seed: 5, sendState: () => {} });
    for (let i = 0; i < 900 && !bm2.done; i++) { bm2.update(0.05); bm2.draw(C, 960, 540); }
    if (bm2.result !== 'lose') throw new Error('bombo sin tocar debería perder: ' + bm2.result);
    ok.push('bombo:ok');
    // "REPARTO DE LA OLLA" (3 platos + colados): sin servir → se van con hambre → pierde; servir no crashea; guest ok
    const ol2 = Olla.create({ role: 'host', seats: ['me'], myPid: 'me', seed: 9, sendState: () => {} });
    for (let i = 0; i < 1600 && !ol2.done; i++) { if (i % 30 === 0) ol2.serveExternal(i % 3); ol2.update(0.05); ol2.draw(C, 960, 540); }
    if (!ol2.done || !['win', 'lose', 'flee'].includes(ol2.result)) throw new Error('olla no termina: ' + ol2.result);
    const olg = Olla.create({ role: 'guest', seats: ['h', 'me'], myPid: 'me' });
    olg.applyState({ t: 'lv4-state', q: [[0, 1, 5.5, 1], [1, 0, 4.6, 0]], n: 3, a: 2, p: 'play' }); olg.draw(C, 960, 540);
    ok.push('olla:ok');
    // "PINTAR LA PANCARTA": sin moverse (poco pintado) → pierde por tiempo; guest applyState sin crash
    const pc = Pancarta.create({ role: 'host', seats: ['me'], myPid: 'me', seed: 1, sendState: () => {} });
    for (let i = 0; i < 1400 && !pc.done; i++) { pc.update(0.05); pc.draw(C, 960, 540); }
    if (pc.result !== 'lose') throw new Error('pancarta sin pintar debería perder: ' + pc.result);
    const pcg = Pancarta.create({ role: 'guest', seats: ['h', 'me'], myPid: 'me' });
    pcg.applyState({ t: 'lv5-state', g: '2'.repeat(24 * 7), pr: 1, tl: 5, p: 'play' }); pcg.draw(C, 960, 540);
    ok.push('pancarta:ok');
    // IDEAS QUE QUEDAN PICANDO (chat-linyera-ux §1): scan detecta la sugerencia, check la marca hecha, groundFor la cuenta
    Ideas.scan('filosofo', 'Andate al CINE, pibe, que están pasando una de Favio.');
    let ig = Ideas.groundFor('filosofo');
    if (!ig || !/g\.idea\.pend:cine/.test(ig)) throw new Error('ideas: el cine debería quedar picando: ' + ig);
    Ideas.check('sala', 'Cine — piso 1');
    ig = Ideas.groundFor('filosofo');
    if (!ig || !/g\.idea\.done:cine/.test(ig)) throw new Error('ideas: debería estar HECHA: ' + ig);
    if (Ideas.groundFor('peronista')) throw new Error('ideas: otro NPC no debería tener grounding');
    ok.push('ideas:ok');
    // MAPA B — el plano del búnker: colocar conectado OK, desconectado falla, sin plata falla, remove devuelve mitad
    if (Input.clear) Input.clear();   // teclas trabadas de tests anteriores (keydown sin keyup) ensucian el update
    const bmp = BunkerMapa.create({ player: { coins: 100 } });
    if (!bmp.placeAt(1, 3, 0)) throw new Error('bunkermapa: colocar pegado a la entrada debería andar');
    for (let i = 0; i < 60; i++) { bmp.update(0.016); bmp.draw(C, 960, 540); }
    if (bmp.placeAt(6, 6, 0)) throw new Error('bunkermapa: colocar DESCONECTADO debería fallar');
    const poor = BunkerMapa.create({ player: { coins: 1 } });   // (comparte el localStorage del sandbox: (1,3) ya está)
    if (poor.placeAt(2, 3, 0)) throw new Error('bunkermapa: sin plata debería fallar');
    if (!bmp.removeAt(1, 3)) throw new Error('bunkermapa: remove debería andar');
    ok.push('bunkermapa:ok');
    // LAVALLE E2 — el Obelisco: entrar, armar la salida (subir) y salir por abajo → exitTo 'lavalle'
    if (Input.clear) Input.clear();
    const obx = Obelisco.create();
    for (let i = 0; i < 40; i++) { obx.update(0.05); obx.draw(C, 960, 540); }
    Input.keys['arrowup'] = true; for (let i = 0; i < 30; i++) obx.update(0.05); Input.keys['arrowup'] = false;
    Input.keys['arrowdown'] = true; for (let i = 0; i < 60 && !obx.done; i++) obx.update(0.05); Input.keys['arrowdown'] = false;
    if (!obx.done || obx.exitTo !== 'lavalle') throw new Error('obelisco no vuelve al piquete: ' + obx.exitTo);
    // y el paso del corte: Lavalle con allWon + fiesta → subir por el hueco → exitTo 'obelisco'
    const lvx = Lavalle.create({ allWon: true });
    Input.keys['w'] = true; for (let i = 0; i < 40; i++) lvx.update(0.05); Input.keys['w'] = false;   // subir al hueco
    Input.keys['e'] = true; lvx.update(0.05); Input.keys['e'] = false;                                 // juramento (abre la colisión)
    Input.keys['w'] = true; for (let i = 0; i < 220 && !lvx.done; i++) lvx.update(0.05); Input.keys['w'] = false;
    if (!lvx.done || lvx.exitTo !== 'obelisco') throw new Error('lavalle no cruza al obelisco: ' + lvx.exitTo + ' done=' + lvx.done);
    ok.push('obelisco:ok');
    // E3 — la PELEA del satélite (post-tormenta): manteniendo el rayo solar, lo herís antes de que te frite → satwin
    if (Input.clear) Input.clear();
    const obb = Obelisco.create({ stormed: true });
    Input.keys['e'] = true;
    for (let i = 0; i < 500 && !obb.done; i++) { obb.update(0.05); obb.draw(C, 960, 540); }
    Input.keys['e'] = false;
    if (!obb.done || obb.result !== 'satwin') throw new Error('pelea del satélite no gana: ' + obb.result + ' done=' + obb.done);
    // ya herido → postal con satélite humeando (sin crash)
    const obd = Obelisco.create({ stormed: true, satDown: true });
    for (let i = 0; i < 60; i++) { obd.update(0.05); obd.draw(C, 960, 540); }
    ok.push('satelite:ok');
    // SUBTE (subte.md §4): la estación — sin SUBE no pasa el molinete; con SUBE pasa; sale por la escalera
    if (typeof Subte === 'undefined' || !Subte.create) throw new Error('Subte no cargó');
    const sNo = Subte.create({ station: 'florida', subeReady: false });
    for (let i = 0; i < 20; i++) { sNo.update(0.05); sNo.draw(C, 960, 540); }
    if (sNo.__pass()) throw new Error('subte: sin SUBE NO debería pasar el molinete');
    const sYes = Subte.create({ station: 'lavalle', subeReady: true });
    if (!sYes.__pass()) throw new Error('subte: con SUBE debería pasar el molinete');
    if (!sYes.__leave() || sYes.exitTo !== 'back') throw new Error('subte: la escalera debería salir: ' + sYes.exitTo);
    // F3 viajar: con la SUBE y 2 estaciones, el andén ofrece viajar a la otra → exitTo 'travel:florida'
    const sTrav = Subte.create({ station: 'lavalle', subeReady: true, available: ['florida', 'lavalle'] });
    const ex = sTrav.__travel();
    if (ex !== 'travel:florida') throw new Error('subte: viajar debería ir a Florida: ' + ex);
    // BOLETO F3 (inventario-armas §7 kind:'ticket'): sin SUBE pero con plata → el boletero te vende un boleto → pasás el molinete y se consume
    const sBol = Subte.create({ station: 'florida', subeReady: false, hasBoleto: false, coins: 100, boletoPrice: 20 });
    if (!sBol.__buyBoleto()) throw new Error('subte: con plata el boletero debería venderte un boleto');
    const buy = sBol.purchase;   // one-shot: game.js lo lee para cobrar + addItem
    if (!buy || buy.spent !== 20) throw new Error('subte: la compra debería reportar spent=20');
    if (sBol.purchase !== null) throw new Error('subte: la compra es one-shot (2ª lectura null)');
    if (!sBol.__pass()) throw new Error('subte: con el boleto comprado debería pasar el molinete');
    if (!sBol.boletoUsed) throw new Error('subte: al pasar con boleto debería marcar boletoUsed (para consumirlo)');
    const sPoor = Subte.create({ station: 'florida', subeReady: false, hasBoleto: false, coins: 5, boletoPrice: 20 });
    if (sPoor.__buyBoleto()) throw new Error('subte: sin plata NO debería vender el boleto');
    if (sPoor.__pass()) throw new Error('subte: sin SUBE ni boleto NO debería pasar el molinete');
    const sHave = Subte.create({ station: 'florida', subeReady: false, hasBoleto: true, coins: 0 });
    if (!sHave.__pass()) throw new Error('subte: con un boleto ya en la mochila debería pasar el molinete');
    if (!sHave.boletoUsed) throw new Error('subte: al pasar con el boleto de la mochila debería marcar boletoUsed');
    // §11: la terminal (Constitución) tiene surface → la escalera sube al hall del tren, no a la calle
    const sSurf = Subte.create({ station: 'constitucion', subeReady: true });
    if (sSurf.__leave() && sSurf.exitTo !== 'surface:constitucion') throw new Error('subte: la escalera de Constitución debería subir a la terminal: ' + sSurf.exitTo);
    ok.push('subte:ok');
    // TERMINAL CONSTITUCIÓN (subte.md §11): hall del Roca + molinetes de tren + locales mock; sale al subte C
    if (typeof Constitucion === 'undefined' || !Constitucion.create) throw new Error('Constitucion no cargó');
    const co = Constitucion.create({});
    for (let i = 0; i < 30; i++) { co.update(0.05); co.draw(C, 960, 540); }
    if (co.__leave() !== 'back') throw new Error('constitucion: la escalera debería volver al subte: ' + co.exitTo);
    const co2 = Constitucion.create({});
    if (!co2.__local()) throw new Error('constitucion: un local mock debería dar un mensaje de flavor');
    // KIOSCO: te vende un chori si te alcanza; game.js lo cobra vía el one-shot purchase
    const coBuy = Constitucion.create({ coins: 100, choriPrice: 15 });
    const cp = coBuy.__buyChori();
    if (!(cp && cp.item === 'chori' && cp.spent === 15)) throw new Error('constitucion: el kiosco debería venderte un chori: ' + JSON.stringify(cp));
    if (!coBuy.purchase) throw new Error('constitucion: el getter purchase debería exponer la compra una vez');
    if (coBuy.purchase !== null) throw new Error('constitucion: purchase es one-shot (2ª lectura null)');
    const coPoor = Constitucion.create({ coins: 5, choriPrice: 15 });
    if (coPoor.__buyChori() !== null) throw new Error('constitucion: sin plata NO debería vender el chori');
    // v359: el DIARIO trae la pista del grafo (game.js la pasa como opts.pista) — con pista y sin pista dan msgs distintos
    const coPista = Constitucion.create({ pista: 'anda al chino' });
    const coSinPista = Constitucion.create({});
    const dm1 = coPista.__diario(), dm2 = coSinPista.__diario();
    if (!dm1 || !dm2 || dm1 === dm2) throw new Error('constitucion: el diario con pista debería mostrarla (y sin pista, otra cosa): ' + dm1 + ' / ' + dm2);
    // v359: el CAFÉ vende un cortado (item cafe, precio propio del local)
    const coCafe = Constitucion.create({ coins: 100 });
    const ccp = coCafe.__buyCafe();
    if (!(ccp && ccp.item === 'cafe' && ccp.spent === 8)) throw new Error('constitucion: el café debería venderte un cortado: ' + JSON.stringify(ccp));
    // MOLINETE DEL TREN → menú de ramales → tomás el tren (exit 'tren:<ramal>')
    const coTren = Constitucion.create({});
    const tx = coTren.__tren();
    if (!(typeof tx === 'string' && tx.indexOf('tren:') === 0)) throw new Error('constitucion: el molinete debería dejarte tomar el tren: ' + tx);
    ok.push('constitucion:ok');
    // TREN (§11): viaje → andén de destino → tomás el tren de vuelta
    if (typeof Tren === 'undefined' || !Tren.create) throw new Error('Tren no cargó');
    const tr = Tren.create({ ramal: 'La Plata', linea: 'Roca' });
    for (let i = 0; i < 40; i++) { tr.update(0.05); tr.draw(C, 960, 540); }   // corre el viaje
    tr.__arrive();
    for (let i = 0; i < 20; i++) { tr.update(0.05); tr.draw(C, 960, 540); }   // corre el andén
    if (tr.__leave() !== 'back') throw new Error('tren: el tren de vuelta debería salir al origen: ' + tr.exitTo);
    // VILLA BALLESTER (destino especial): el maquinista curda es un NPC con IA (persona maquinista)
    const trB = Tren.create({ ramal: 'Villa Ballester', linea: 'Mitre' });
    trB.__arrive();
    for (let i = 0; i < 10; i++) { trB.update(0.05); trB.draw(C, 960, 540); }
    const maq = trB.__maq();
    if (!(maq && maq.persona === 'maquinista')) throw new Error('tren: el maquinista de Villa Ballester debería abrir chat (persona maquinista): ' + JSON.stringify(maq));
    // §12 S5: llegás a Ballester CON el trapo → se lo das al maquinista → arranca a Campana
    const trT = Tren.create({ ramal: 'Villa Ballester', linea: 'Mitre', hasTrapo: true, arrived: true });
    if (trT.__darTrapo() !== 'campana') throw new Error('tren: dar el trapo debería llevarte a Campana: ' + trT.exitTo);
    if (!trT.trapoUsed) throw new Error('tren: dar el trapo debería marcar trapoUsed (para consumir el ítem)');
    // §12 S1/S2: SAN MARTÍN → piquete de la UBA: estudiante (IA) + colarte al Monumental
    const trS = Tren.create({ ramal: 'San Martín — C. Universitaria', linea: 'San Martín', arrived: true });
    for (let i = 0; i < 10; i++) { trS.update(0.05); trS.draw(C, 960, 540); }
    const est = trS.__est();
    if (!(est && est.persona === 'estudiante')) throw new Error('tren: la estudiante del piquete debería abrir chat (persona estudiante): ' + JSON.stringify(est));
    const trS2 = Tren.create({ ramal: 'San Martín — C. Universitaria', linea: 'San Martín', arrived: true });
    if (trS2.__colar() !== 'cancha') throw new Error('tren: el Monumental debería dejarte colar (exit cancha): ' + trS2.exitTo);
    // v357: el VENDEDOR AMBULANTE regional en los andenes genéricos (con plata compra; sin plata no)
    const trV = Tren.create({ ramal: 'La Plata', linea: 'Roca', arrived: true, coins: 50 });
    const vp = trV.__vend();
    if (!(vp && vp.item === 'tortafrita' && vp.spent === 8)) throw new Error('tren: en La Plata el ambulante deberia vender torta frita: ' + JSON.stringify(vp));
    if (!trV.purchase) throw new Error('tren: purchase deberia exponerse una vez');
    if (trV.purchase !== null) throw new Error('tren: purchase es one-shot');
    const trVpoor = Tren.create({ ramal: 'Mitre — Tigre', linea: 'Mitre', arrived: true, coins: 2 });
    if (trVpoor.__vend() !== null) throw new Error('tren: sin plata el ambulante NO deberia vender');
    ok.push('tren:ok');
    // §12 S3/S4 — EL MONUMENTAL: alentás + robás el trapo de Boca (one-shot trapoEdge) + salís
    if (typeof Cancha === 'undefined' || !Cancha.create) throw new Error('Cancha no cargó');
    const ca = Cancha.create({});
    for (let i = 0; i < 40; i++) { ca.update(0.05); ca.draw(C, 960, 540); }
    const robo = ca.__robo();
    if (!robo.gotTrapo) throw new Error('cancha: manotear la bandera debería dártela');
    if (!ca.trapoEdge && !robo.edge) throw new Error('cancha: robar debería disparar el edge una vez');
    if (ca.__leave() !== 'back') throw new Error('cancha: la salida debería volver al piquete: ' + ca.exitTo);
    ok.push('cancha:ok');
    // §12 S6-S8 — CAMPANA/VILLA DÁLMINE: calle→estadio→chori→4 goles→satélite→PORTAL
    if (typeof Campana === 'undefined' || !Campana.create) throw new Error('Campana no cargó');
    const cmp = Campana.create({});
    for (let i = 0; i < 30; i++) { cmp.update(0.05); cmp.draw(C, 960, 540); }
    const tano = cmp.__viejo();
    if (!(tano && tano.persona === 'violeta')) throw new Error('campana: el Tano deberia abrir chat (persona violeta): ' + JSON.stringify(tano));
    if (cmp.__enterEstadio() !== 'estadio') throw new Error('campana: la puerta deberia meterte al estadio');
    const full = Campana.create({});
    const res2 = full.__full();
    if (!(res2.done && res2.exitTo === 'portal')) throw new Error('campana: la secuencia completa debería terminar en el PORTAL: ' + JSON.stringify(res2));
    if (res2.goles !== 4) throw new Error('campana: deberían ser 4 goles de Dálmine: ' + res2.goles);
    if (!res2.choriEaten) throw new Error('campana: el chori del entretiempo debería comerse en la secuencia');
    ok.push('campana:ok');
    // v366 EL TROFEO A CASA: con el trofeo, el 1er E al Tano es el beat guionado; la vitrina primero pide al Tano
    const ctf = Campana.create({ trofeo: true });
    for (let i = 0; i < 10; i++) { ctf.update(0.05); ctf.draw(C, 960, 540); }
    const vt0 = ctf.__vitrina();
    if (vt0.enVitrina || !vt0.hasTrofeo) throw new Error('campana: la vitrina sin pasar por el Tano NO deberia aceptar el trofeo: ' + JSON.stringify(vt0));
    const tt1 = ctf.__trofeoTano();
    if (!(tt1.tanoShown && tt1.hasTrofeo)) throw new Error('campana: el 1er E al Tano con trofeo deberia ser el beat guionado: ' + JSON.stringify(tt1));
    if (!ctf.tanoEdge) throw new Error('campana: tanoEdge one-shot deberia dispararse');
    if (ctf.tanoEdge) throw new Error('campana: tanoEdge deberia consumirse (one-shot)');
    ctf.__trofeoTano();                                       // 2o E al Tano: ahora abre el chat IA de siempre
    const chatT = ctf.openChatNpc;
    if (!(chatT && chatT.persona === 'violeta')) throw new Error('campana: el 2o E al Tano deberia abrir el chat IA: ' + JSON.stringify(chatT));
    const vt1 = ctf.__vitrina();
    if (!(vt1.enVitrina && !vt1.hasTrofeo)) throw new Error('campana: la vitrina deberia recibir el trofeo tras el Tano: ' + JSON.stringify(vt1));
    if (!ctf.vitrinaEdge) throw new Error('campana: vitrinaEdge one-shot deberia dispararse');
    for (let i = 0; i < 10; i++) { ctf.update(0.05); ctf.draw(C, 960, 540); }   // frames de festejo (banda saltando) sin crash
    const ctf2 = Campana.create({ tanoDone: true, enVitrina: true });           // volver a Campana: el trofeo brilla en la vitrina
    for (let i = 0; i < 6; i++) { ctf2.update(0.05); ctf2.draw(C, 960, 540); }
    const vt2 = ctf2.__vitrina();
    if (!(vt2.enVitrina && !vt2.hasTrofeo)) throw new Error('campana: al volver, la vitrina deberia mostrar el trofeo depositado: ' + JSON.stringify(vt2));
    if (ctf2.vitrinaEdge) throw new Error('campana: mirar la vitrina llena NO deberia re-disparar la arista');
    ok.push('trofeo-vitrina:ok');
    // TERMINAL RETIRO (§11 E2): hall del Mitre; su SALIDA a la calle → Villa 31; escalera → subte C
    if (typeof Retiro === 'undefined' || !Retiro.create) throw new Error('Retiro no cargó');
    const re = Retiro.create({});
    for (let i = 0; i < 30; i++) { re.update(0.05); re.draw(C, 960, 540); }
    if (re.__leave() !== 'back') throw new Error('retiro: la escalera debería volver al subte: ' + re.exitTo);
    const re2 = Retiro.create({});
    if (re2.__street() !== 'villa31') throw new Error('retiro: la SALIDA a la calle debería ir a Villa 31: ' + re2.exitTo);
    const reBuy = Retiro.create({ coins: 100, choriPrice: 15 });
    const rp = reBuy.__buyChori();
    if (!(rp && rp.item === 'chori' && rp.spent === 15)) throw new Error('retiro: el kiosco debería venderte un chori: ' + JSON.stringify(rp));
    // v359: LIBRERÍA lee el Martín Fierro (rota versos) + FLORERÍA vende una flor 🌸 (game.js suma player.flores)
    const reLibro = Retiro.create({});
    const fie1 = reLibro.__libro();
    if ((fie1 || '').indexOf('hermanos sean unidos') < 0) throw new Error('retiro: la librería debería arrancar con "Los hermanos sean unidos": ' + fie1);
    if (reLibro.__libro() === fie1) throw new Error('retiro: el segundo [E] debería leer OTRO verso del Fierro');
    const reFlor = Retiro.create({ coins: 20 });
    const florBuy = reFlor.__flor();
    if (!(florBuy && florBuy.item === 'flor' && florBuy.spent === 5)) throw new Error('retiro: la florería debería venderte una flor: ' + JSON.stringify(florBuy));
    const reFlorPoor = Retiro.create({ coins: 2 });
    if (reFlorPoor.__flor() !== null) throw new Error('retiro: sin plata la florería NO debería vender');
    ok.push('retiro:ok');
    // v360 EL MISTERIO DEL POLACO (misterio-polaco.md): la Gallega da el caso → la nota del carrito → hallado en La Plata
    const reG = Retiro.create({});
    const g1 = reG.__gallega();
    if (!g1.caso || g1.chat) throw new Error('gallega: el 1er [E] debería DAR el caso (sin chat): ' + JSON.stringify(g1));
    if (!reG.casoEdge) throw new Error('gallega: dar el caso debería disparar casoEdge una vez');
    if (reG.casoEdge) throw new Error('gallega: casoEdge es one-shot');
    const g2 = reG.__gallega();
    if (!(g2.chat && g2.chat.persona === 'gallega')) throw new Error('gallega: el 2º [E] debería abrir chat IA: ' + JSON.stringify(g2));
    const reG2 = Retiro.create({ polacoStage: 'caso' });   // con el caso ya dado, [E] = chat directo
    if (!(reG2.__gallega().chat)) throw new Error('gallega: con caso dado, [E] debería chatear directo');
    // el rincón del Polaco en Constitución: sin caso Firulais guarda; con caso, la NOTA (carritoEdge)
    const coR0 = Constitucion.create({});
    if (!coR0.__rincon()) throw new Error('rincon: sin caso debería haber flavor de Firulais');
    if (coR0.carritoEdge) throw new Error('rincon: sin caso NO debería disparar carritoEdge');
    const coR1 = Constitucion.create({ polacoStage: 'caso' });
    coR1.__rincon();
    if (!coR1.carritoEdge) throw new Error('rincon: con el caso, [E] debería encontrar la NOTA (carritoEdge)');
    if (coR1.carritoEdge) throw new Error('rincon: carritoEdge es one-shot');
    // en el andén de LA PLATA (flavor ciudad) con stage carrito: el POLACO aparece → halladoEdge → chat
    const trP = Tren.create({ ramal: 'La Plata', linea: 'Roca', arrived: true, polacoStage: 'carrito' });
    const p1 = trP.__polaco();
    if (!p1.hallado) throw new Error('polaco: el 1er [E] debería HALLARLO: ' + JSON.stringify(p1));
    if (!trP.halladoEdge) throw new Error('polaco: hallarlo debería disparar halladoEdge una vez');
    if (trP.halladoEdge) throw new Error('polaco: halladoEdge es one-shot');
    const p2 = trP.__polaco();
    if (!(p2.chat && p2.chat.persona === 'polaco')) throw new Error('polaco: el 2º [E] debería abrir chat IA: ' + JSON.stringify(p2));
    // sin la quest, el Polaco NO está en La Plata; y el LINYERA propio del andén sí (con pista si la quest anda)
    const trP0 = Tren.create({ ramal: 'La Plata', linea: 'Roca', arrived: true });
    const p0 = trP0.__polaco();
    if (p0.hallado || p0.chat) throw new Error('polaco: sin quest NO debería estar en el andén');
    const trL = Tren.create({ ramal: 'Ezeiza', linea: 'Roca', arrived: true });
    if (!trL.__liny()) throw new Error('tren: el andén debería tener su linyera propio (el Chispa)');
    const trL2 = Tren.create({ ramal: 'Ezeiza', linea: 'Roca', arrived: true, polacoStage: 'carrito' });
    if (trL.__liny() === trL2.__liny()) throw new Error('tren: con la quest activa el linyera debería soltar la pista del Polaco');
    ok.push('misterio-polaco:ok');
    // v361 TRENES: el tablero en tiempo real (reloj BsAs + frecuencias reales + estado con lío)
    if (typeof Trenes === 'undefined' || !Trenes.tablero) throw new Error('Trenes no cargó');
    const tb = Trenes.tablero('constitucion');
    if (tb.length !== 5) throw new Error('trenes: Constitución debería tener 5 ramales en el tablero: ' + tb.length);
    for (const row of tb) {
      if (!['normal', 'demorado', 'limitado', 'suspendido'].includes(row.estado)) throw new Error('trenes: estado inválido: ' + row.estado);
      if (row.estado !== 'suspendido' && row.mins != null && (row.mins < 1 || row.mins > 200)) throw new Error('trenes: minutos fuera de rango: ' + row.mins);
      if (row.estado === 'suspendido' && row.mins != null) throw new Error('trenes: suspendido no debería tener minutos');
    }
    const tbR = Trenes.tablero('retiro');
    if (tbR.length !== 5) throw new Error('trenes: Retiro debería tener 5 ramales: ' + tbR.length);
    if (!tbR.find(r => r.linea === 'San Martín') || !tbR.find(r => r.linea === 'Belgrano Norte')) throw new Error('trenes: Retiro debería tener líneas San Martín y Belgrano Norte');
    // el estado es DETERMINÍSTICO por hora (mismo lío para todos): dos llamadas seguidas coinciden
    const e1 = Trenes.estadoDe('Roca'), e2 = Trenes.estadoDe('Roca');
    if (e1.e !== e2.e) throw new Error('trenes: el estado por seed debería ser estable dentro de la hora');
    const hs = Trenes.horaStr();
    if (!(hs.length === 5 && hs[2] === ':')) throw new Error('trenes: horaStr debería ser HH:MM: ' + hs);
    ok.push('trenes:ok');
    // v362 LA CALLE DE CONSTITUCIÓN: puerta vuelve a la terminal, puestos venden, el cana atiende, la parada informa
    if (typeof ConstiCalle === 'undefined' || !ConstiCalle.create) throw new Error('ConstiCalle no cargó');
    const cc = ConstiCalle.create({ coins: 100 });
    for (let i = 0; i < 30; i++) { cc.update(0.05); cc.draw(C, 960, 540); }
    const ccChori = cc.__buy('chori');
    if (!(ccChori && ccChori.item === 'chori' && ccChori.spent === 15)) throw new Error('ccalle: el puesto debería vender chori: ' + JSON.stringify(ccChori));
    if (!cc.purchase) throw new Error('ccalle: purchase debería exponerse una vez');
    if (cc.purchase !== null) throw new Error('ccalle: purchase es one-shot');
    const ccBond = cc.__buy('bondiola');
    if (!(ccBond && ccBond.item === 'bondiola' && ccBond.spent === 20)) throw new Error('ccalle: el puesto debería vender bondiola: ' + JSON.stringify(ccBond));
    if (!cc.__cana()) throw new Error('ccalle: el cana debería atenderte');
    if (!cc.__parada()) throw new Error('ccalle: la parada debería informar el bondi');
    if (cc.__volver() !== 'terminal') throw new Error('ccalle: la puerta debería volver a la terminal: ' + cc.exitTo);
    const ccPoor = ConstiCalle.create({ coins: 2 });
    if (ccPoor.__buy('tortafrita') !== null) throw new Error('ccalle: sin plata NO debería vender');
    // la SALIDA de Constitución ahora sale a la calle (exitTo calle)
    const coCalle = Constitucion.create({});
    if (coCalle.__street) throw new Error('unexpected');
    ok.push('consticalle:ok');
    // v363 ZARATE Y EL 60 (zarate-60.md): saavedra (a pie + el 60 eterno que te devuelve al loop)
    if (typeof Saavedra === 'undefined' || !Saavedra.create) throw new Error('Saavedra no cargo');
    const sv = Saavedra.create({});
    for (let i = 0; i < 30; i++) { sv.update(0.05); sv.draw(C, 960, 540); }
    if (sv.__sube60() !== 'loop') throw new Error('saavedra: el 60 eterno deberia terminar en loop: ' + sv.exitTo);
    const sv2 = Saavedra.create({});
    if (sv2.__volver() !== 'back') throw new Error('saavedra: la estacion deberia volver al tren: ' + sv2.exitTo);
    // el anden del Belgrano Norte tiene la SALIDA a pie (los otros ramales no)
    const trBN = Tren.create({ ramal: 'Belgrano Norte', linea: 'Belgrano' });
    trBN.__arrive();
    if (trBN.__saavedra() !== 'saavedra') throw new Error('tren: Belgrano Norte deberia salir a Saavedra: ' + trBN.exitTo);
    const trRoca = Tren.create({ ramal: 'La Plata', linea: 'Roca' });
    trRoca.__arrive();
    if (trRoca.__saavedra() !== null) throw new Error('tren: solo Belgrano Norte tiene la salida a pie');
    ok.push('saavedra:ok');
    // v364 ONCE: la Linea A tiene la estacion + el pasaje del Chevallier (con plata) / el fiado (sin plata)
    if (!Subte.ESTACIONES.once || Subte.ESTACIONES.once.surface !== 'once') throw new Error('subte: falta la estacion ONCE (surface once)');
    if (typeof Once === 'undefined' || !Once.create) throw new Error('Once no cargo');
    const on1 = Once.create({ coins: 100 });
    for (let i = 0; i < 30; i++) { on1.update(0.05); on1.draw(C, 960, 540); }
    if (on1.__chev() !== 'chevallier') throw new Error('once: la darsena deberia subir al Chevallier: ' + on1.exitTo);
    const onFare = on1.fare;
    if (!(onFare && onFare.spent === 25)) throw new Error('once: el pasaje deberia costar 25: ' + JSON.stringify(onFare));
    if (on1.fare !== null) throw new Error('once: fare es one-shot');
    const on2 = Once.create({ coins: 2 });
    if (on2.__chev() !== 'chevallier') throw new Error('once: sin plata el chofer te FIA igual: ' + on2.exitTo);
    if (on2.fare !== null) throw new Error('once: fiado no cobra pasaje');
    const on3 = Once.create({ coins: 100 });
    for (let i = 0; i < 5; i++) { on3.update(0.05); on3.draw(C, 960, 540); }
    const onChori = on3.__local('kiosco');
    if (!on3.purchase && !onChori) throw new Error('once: el kiosco deberia vender chori');
    if (on3.__leave() !== 'back') throw new Error('once: la escalera deberia volver a la Linea A: ' + on3.exitTo);
    ok.push('once:ok');
    // v364 CHEVALLIER: el cortadito de cortesia (una vez) + llegar y bajar en la costanera
    if (typeof Chevallier === 'undefined' || !Chevallier.create) throw new Error('Chevallier no cargo');
    const ch1 = Chevallier.create({});
    for (let i = 0; i < 30; i++) { ch1.update(0.05); ch1.draw(C, 960, 540); }
    const chCafe = ch1.__cafe();
    if (!(chCafe && chCafe.item === 'cafe' && chCafe.spent === 0)) throw new Error('chev: el cortadito es de cortesia: ' + JSON.stringify(chCafe));
    if (!ch1.purchase) throw new Error('chev: purchase deberia exponerse una vez');
    if (ch1.__cafe() !== null) throw new Error('chev: UN cafe de cortesia por pasajero');
    if (ch1.__llegar() !== 'zarate') throw new Error('chev: la puerta deberia bajar en la costanera: ' + ch1.exitTo);
    ok.push('chevallier:ok');
    // v365 ZARATE: choris + el club de remo recluta TIMONEL; con regataWon el club festeja (no re-corre)
    if (typeof Zarate === 'undefined' || !Zarate.create) throw new Error('Zarate no cargo');
    const za = Zarate.create({ coins: 50 });
    for (let i = 0; i < 30; i++) { za.update(0.05); za.draw(C, 960, 540); }
    const zaCh = za.__chori();
    if (!(zaCh && zaCh.item === 'chori' && zaCh.spent === 12)) throw new Error('zarate: el puesto deberia vender chori: ' + JSON.stringify(zaCh));
    if (za.__remo() !== 'regata') throw new Error('zarate: el club deberia reclutarte de timonel: ' + za.exitTo);
    const za2 = Zarate.create({ regataWon: true });
    for (let i = 0; i < 5; i++) { za2.update(0.05); za2.draw(C, 960, 540); }
    if (za2.__remo() === 'regata') throw new Error('zarate: campeon NO vuelve a correr la final');
    const za3 = Zarate.create({});
    if (za3.__volver() !== 'back') throw new Error('zarate: el Chevallier deberia volver: ' + za3.exitTo);
    ok.push('zarate:ok');
    // v365 REGATA: ganar la final sale con win; si Zarate llega primero, estado lost (revancha)
    if (typeof Regata === 'undefined' || !Regata.create) throw new Error('Regata no cargo');
    const rg = Regata.create({});
    for (let i = 0; i < 80; i++) { rg.update(0.05); rg.draw(C, 960, 540); }
    if (rg.__win() !== 'win') throw new Error('regata: ganar deberia salir con win: ' + rg.exitTo);
    const rg2 = Regata.create({});
    for (let i = 0; i < 80; i++) rg2.update(0.05);
    if (rg2.__lose() !== 'lost') throw new Error('regata: si Zarate llega primero se pierde: ' + rg2.__state());
    ok.push('regata:ok');
    // VILLA 31 (§11 E3/E4): te contratan en el comedor + chat con la referente y el cura (personas comedor/cura)
    if (typeof Villa31 === 'undefined' || !Villa31.create) throw new Error('Villa31 no cargó');
    const vi = Villa31.create({});
    for (let i = 0; i < 30; i++) { vi.update(0.05); vi.draw(C, 960, 540); }
    const hire = vi.__hire();
    if (!hire.hired) throw new Error('villa31: acercarte al comedor debería CONTRATARTE');
    if (!vi.hireEdge && !(hire.npc)) throw new Error('villa31: contratar debería disparar el edge una vez');
    if (!(hire.npc && hire.npc.persona === 'comedor')) throw new Error('villa31: debería abrir chat con la referente (comedor): ' + JSON.stringify(hire.npc));
    const vi2 = Villa31.create({ hired: true, bendicion: true });   // v358: con la quest hecha, [E] al cura = chat directo (sin bendición: el 1er [E] da el MANDADO)
    const curaNpc = vi2.__cura();
    if (!(curaNpc && curaNpc.persona === 'cura')) throw new Error('villa31: el cura de la iglesia Mugica debería abrir chat (persona cura): ' + JSON.stringify(curaNpc));
    const vi3 = Villa31.create({});
    if (vi3.__leave() !== 'back') throw new Error('villa31: las vías deberían volver a Retiro: ' + vi3.exitTo);
    // JORNADA del comedor: agarrás plato en la olla + lo servís a cada vecino → completás META y disparás el edge
    const vi4 = Villa31.create({ hired: true });
    const jor = vi4.__servir();
    if (!jor.jornadaDone) throw new Error('villa31: servir a toda la cola debería completar la jornada: ' + JSON.stringify(jor));
    if (!jor.edge) throw new Error('villa31: completar la jornada debería disparar el edge una vez');
    // v358 RONDAS: con la jornada hecha, [E] en la olla renueva la cola
    const ron = vi4.__ronda();
    if (!(ron.rondas === 1 && ron.jornadaDone === false && ron.servidos === 0)) throw new Error('villa31: la olla debería arrancar OTRA ronda: ' + JSON.stringify(ron));
    // v358 QUEST DEL CURA: mandado → plato → abuela → bendición (edge one-shot)
    const vi5 = Villa31.create({});
    for (let i = 0; i < 10; i++) { vi5.update(0.05); vi5.draw(C, 960, 540); }
    const man = vi5.__mandado();
    if (man.curaQuest !== 3) throw new Error('villa31: el mandado del cura debería completarse (quest=3): ' + JSON.stringify(man));
    if (!man.edge && !vi5.bendicionEdge) throw new Error('villa31: la bendición debería disparar el edge');
    ok.push('villa31:ok');
    // PLAZA DE MAYO (Nivel 2, arco sanmartiniano): chip del Libertador (tumba) → Pirámide → señal → win2
    if (typeof Plaza === 'undefined' || !Plaza.create) throw new Error('Plaza no cargó');
    const pz = Plaza.create({});
    for (let i = 0; i < 30; i++) { pz.update(0.05); pz.draw(C, 960, 540); }
    if (!pz.__chip()) throw new Error('plaza: __chip debería dar el chip del Libertador');
    if (!pz.__arm()) throw new Error('plaza: con el chip, __arm debería armar el dispositivo anti-IA');
    let won2 = false; for (let i = 0; i < 130; i++) { pz.update(0.05); pz.draw(C, 960, 540); if (pz.done) { won2 = pz.exitTo === 'win2'; break; } }
    if (!won2) throw new Error('plaza: armar el dispositivo con el chip debería ganar el Nivel 2 (exitTo win2): ' + pz.exitTo);
    // la boca de la Catedral vuelve al subte
    const pz2 = Plaza.create({});
    if (!pz2.__leave() || pz2.exitTo !== 'subte') throw new Error('plaza: la boca debería volver al subte: ' + pz2.exitTo);
    // CABILDO 1810: repicar la campana → escarapela (grafo) → aparecen French & Beruti (chat IA)
    const pz3 = Plaza.create({});
    const b1 = pz3.__bell();                                  // 1ª campanada: cae la escarapela
    if (!b1.gotEscarapela) throw new Error('plaza: la 1ª campanada debería dar la escarapela');
    if (!pz3.escarapelaEdge) throw new Error('plaza: repicar debería disparar la arista de la escarapela (grafo)');
    pz3.__bell();                                             // 2ª campanada: suena el himno-coda (sin crash)
    const pats = pz3.__patriota();                            // con escarapela, aparecen los patriotas
    if (!(pats && pats.length === 2)) throw new Error('plaza: deberían aparecer French y Beruti');
    { const kb = Input.keys; Input.keys = {}; pz3.update(0.05); Input.keys = { e: true }; pz3.update(0.05); Input.keys = kb; }   // soltar (libera eHeld) → [E] cerca de un patriota
    const chatNpc = pz3.openChatNpc;
    if (!(chatNpc && (chatNpc.persona === 'french' || chatNpc.persona === 'beruti'))) throw new Error('plaza: [E] sobre un patriota debería abrir chat con french/beruti: ' + JSON.stringify(chatNpc));
    ok.push('plaza:ok');
    // FINALE (subte.md §10.1): la cinemática de cierre corre los 5 beats y termina en exitTo 'end'
    if (typeof Finale === 'undefined' || !Finale.create) throw new Error('Finale no cargó');
    const fin = Finale.create();
    let finEnd = false; for (let i = 0; i < 700; i++) { fin.update(0.05); fin.draw(C, 960, 540); if (fin.done) { finEnd = fin.exitTo === 'end'; break; } }
    if (!finEnd) throw new Error('finale: la cinemática debería terminar en end: ' + fin.exitTo);
    const fin2 = Finale.create();   // Esc/skip corta al toque
    if (!fin2.__skip() || fin2.exitTo !== 'end') throw new Error('finale: skip debería ir a end');
    ok.push('finale:ok');
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

  // ---- TRUCO PvP F3 (host-autoritativo): motor TrucoNet + escena TrucoPvp host/guest sobre transporte en memoria ----
  const tpvp = vm.runInContext(`(() => {
    const out = [];
    // 1) MOTOR puro: una partida simulando los dos seats (host corre el match; el guest actúa vía act('guest',...))
    function playEngine(seed) {
      const m = TrucoNet.match(seed); m.start(); let g = 0;
      while (!m.done && g++ < 5000) {
        if (m.viewFor('host').phase === 'play') {
          const ts = m.viewFor('host').turn ? 'host' : 'guest'; const v = m.viewFor(ts);
          if (v.pending && !v.pending.mine) m.act(ts, { k:'resp', r:'quiero' });
          else if (v.turn && !v.pending) { const i = v.hand.findIndex(h => !h.used); if (i>=0) m.act(ts,{k:'play',i}); else m.update(0.5); }
          else m.update(0.5);
        } else m.update(0.5);
      }
      return m;
    }
    let host=0, guest=0;
    for (let s = 1; s <= 12; s++) {
      const m = playEngine(s*13+1);
      if (!m.done) { out.push('FAIL engine seed '+s+' no terminó'); continue; }
      if (m.winnerSeat !== 'host' && m.winnerSeat !== 'guest') { out.push('FAIL engine seed '+s+' sin ganador'); continue; }
      const v = m.viewFor(m.winnerSeat); if (v.score.me < 2) out.push('FAIL engine seed '+s+' ganador con score '+v.score.me);
      if (m.winnerSeat==='host') host++; else guest++;
    }
    if (host === 0 || guest === 0) out.push('FAIL engine: ganador estructuralmente sesgado (host '+host+' / guest '+guest+')');
    // 2) ESCENA host/guest sobre transporte en memoria (whisper simulado): ambos terminan con resultados consistentes
    function playScene(seed) {
      const inbox = { host: [], guest: [] };
      const cl = { host: TrucoPvp.create({ role:'host', peerNick:'G', seed, send:o=>inbox.guest.push(o) }),
                   guest: TrucoPvp.create({ role:'guest', peerNick:'H', seed, send:o=>inbox.host.push(o) }) };
      const keys = { host:{}, guest:{} };
      const deliver = () => { for (const w of ['host','guest']) while (inbox[w].length) cl[w].onNet(inbox[w].shift()); };
      function decide(w){ const v=cl[w].view, k=keys[w]; for(const x in k)k[x]=false; if(!v||v.phase!=='play')return;
        if(v.pending && !v.pending.mine){ k['q']=true; return; } if(v.pending && v.pending.mine) return;
        if(v.turn){ const i=v.hand.findIndex(h=>!h.used); if(i>=0) k[String(i+1)]=true; } }
      let f=0; while(f++<5000){ deliver(); for(const w of ['host','guest']){ decide(w); Input.keys = keys[w]; cl[w].update(1/60); cl[w].draw(__mkCtx(), 800, 448); } deliver(); if(cl.host.done && cl.guest.done) break; }
      return cl;
    }
    const sc = playScene(99);
    if (!sc.host.done || !sc.guest.done) out.push('FAIL scene no terminó');
    else if ((sc.host.result==='win') === (sc.guest.result==='win')) out.push('FAIL scene resultados inconsistentes '+sc.host.result+'/'+sc.guest.result);
    else if (sc.host.result==='win' && (sc.host.floresDelta|0) < 1) out.push('FAIL scene ganador sin flores');
    Input.keys = {};
    return JSON.stringify(out);
  })()`, sandbox);
  const tp = JSON.parse(tpvp);
  if (tp.length) { console.error('❌ TRUCO PvP F3:\n' + tp.join('\n')); process.exit(1); }
  console.log('✓ truco PvP F3: motor host-autoritativo (12 partidas, sin sesgo) + escena host/guest por whisper terminan consistentes');

  // ---- TRUCO DE A 6 F3 (3v3, §14): motor TrucoNet6 (IA-fill) + escena host/guest por whisper ----
  const t6 = vm.runInContext(`(() => {
    const out = [];
    let modes = {};
    // 1) MOTOR all-IA: corre solo vía update(dt); termina con equipo ganador y score coherente; ejercita ambos modos de baza
    for (let s = 1; s <= 20; s++) {
      const m = TrucoNet6.match({ seed: s, ai: [true,true,true,true,true,true] }); m.start();
      let g = 0;
      while (!m.done && g++ < 30000) { m.update(0.3); const v = m.viewFor(0); if (v.phase === 'play') modes[v.mode] = (modes[v.mode]||0)+1; }
      if (!m.done) { out.push('FAIL a6 motor seed '+s+' no terminó'); continue; }
      if (m.winnerTeam !== 'A' && m.winnerTeam !== 'B') { out.push('FAIL a6 motor seed '+s+' sin equipo ganador'); continue; }
      const vw = m.viewFor(m.winnerTeam === 'A' ? 0 : 1);
      if (vw.score.me < vw.score.opp) out.push('FAIL a6 motor seed '+s+' ganador con menos puntos');
    }
    if (!modes.global || !modes.pairs) out.push('FAIL a6 motor: no se ejercitaron ambos modos de baza ('+JSON.stringify(modes)+')');
    // 1b) CONTRAFLOR (§14.1): seed 23 reparte flor en AMBOS equipos → canto interactivo (no auto +3). Verificar los 3 caminos.
    (function(){
      function fresh(){ const m = TrucoNet6.match({ seed:23, ai:[false,false,false,false,false,false] }); m.start(); return m; }
      let m = fresh(); let v = m.viewFor(0);
      if (!v.pending || v.pending.kind !== 'flor') { out.push('FAIL contraflor: seed 23 debía cantar flor (ambos equipos), pending='+JSON.stringify(v.pending)); return; }
      // A) contraflor + quiero → 6 al equipo de mayor flor
      const rs = v.turnSeat; m.act(rs, { k:'canto', c:'contraflor' }); const c1 = m.viewFor(0).turnSeat; m.act(c1, { k:'resp', r:'quiero' });
      const a = m.viewFor(0), b = m.viewFor(1); const hi = Math.max(a.dealPts.me, b.dealPts.me);
      if (hi !== 6) out.push('FAIL contraflor quiero: el ganador debía sumar 6, sumó '+hi);
      // B) no a la flor L1 → el que cantó (byTeam) suma florN[1]=3
      m = fresh(); v = m.viewFor(0); const caller = v.pending.byTeam; m.act(v.turnSeat, { k:'resp', r:'no' });
      const na = m.viewFor(0), nb = m.viewFor(1); const win3 = caller === na.myTeam ? na.dealPts.me : nb.dealPts.me;
      if (win3 !== 3) out.push('FAIL flor no: el que cantó debía sumar 3, sumó '+win3);
      // C) contraflor al resto + quiero → falta (TARGET-scoreMax = 15 al inicio)
      m = fresh(); v = m.viewFor(0); m.act(v.turnSeat, { k:'canto', c:'contraflorresto' }); const c3 = m.viewFor(0).turnSeat; m.act(c3, { k:'resp', r:'quiero' });
      const ra = m.viewFor(0), rb = m.viewFor(1); const falta = Math.max(ra.dealPts.me, rb.dealPts.me);
      if (falta !== 15) out.push('FAIL contraflor al resto: debía sumar la falta (15), sumó '+falta);
    })();
    // 2) ESCENA host(seat0) + guest(seat1) humanos + 4 IA, por transporte en memoria → ambos terminan con resultados OPUESTOS
    function playScene(seed) {
      const inbox = { host: [], guest: [] };
      const host = TrucoPvp6.create({ role:'host', mySeat:0, nicks:['H','G'], seed, ai:[false,false,true,true,true,true],
        humanSeats:[1], pushView:(seat,v)=>{ if(seat===1) inbox.guest.push({t:'t6-view', v}); } });
      const guest = TrucoPvp6.create({ role:'guest', mySeat:1, nicks:['H','G'], sendAct:o=>inbox.host.push(o) });
      const keys = { host:{}, guest:{} };
      const dG = () => { while(inbox.guest.length){ const m=inbox.guest.shift(); guest.onView(m.v); } };
      const dH = () => { while(inbox.host.length){ const m=inbox.host.shift(); if(m.t==='t6-act') host.onAct(1,m.a); else if(m.t==='t6-hello') host.onHello(1); else if(m.t==='t6-bye') host.onBye(1); } };
      function decide(cl){ const v=cl.view, k={}; if(v&&v.phase==='play'&&v.turn){ if(v.pending&&v.pending.mine)k['q']=true; else if(!v.pending){const i=v.hand.findIndex(h=>!h.used); if(i>=0)k[String(i+1)]=true;} } return k; }
      let f=0; while(f++<30000){ dH(); dG(); keys.host=decide(host); Input.keys=keys.host; host.update(0.1); host.draw(__mkCtx(),800,448); dG(); dH(); keys.guest=decide(guest); Input.keys=keys.guest; guest.update(0.1); guest.draw(__mkCtx(),800,448); if(host.done&&guest.done)break; }
      dG();
      return { host, guest };
    }
    const sc = playScene(7);
    if (!sc.host.done || !sc.guest.done) out.push('FAIL a6 escena no terminó');
    else if ((sc.host.result==='win') === (sc.guest.result==='win')) out.push('FAIL a6 escena resultados inconsistentes '+sc.host.result+'/'+sc.guest.result);
    Input.keys = {};
    return JSON.stringify(out);
  })()`, sandbox);
  const t6r = JSON.parse(t6);
  if (t6r.length) { console.error('❌ TRUCO DE A 6 F3:\n' + t6r.join('\n')); process.exit(1); }
  console.log('✓ truco de a 6 F3 (3v3): motor IA-fill (20 partidas, ambos modos de baza) + escena host/guest por whisper terminan consistentes');

  // ---- grafo de historia + motor de pistas (HintEngine) ----
  const hint = vm.runInContext(`(() => {
    const out = [];
    if (typeof Historia === 'undefined' || !Historia.edges.length) out.push('FAIL Historia no cargó');
    // estado inicial: la frontera incluye las aristas sin precondición (cuevero_gate/edificio); la TORMENTA ya NO
    // (ahora está gateada por cueveroUnlocked → primero hay que destrabar al cuevero ganándole al tahúr)
    const f0 = HintEngine.frontier({}).map(e => e.id);
    if (!f0.includes('cuevero_gate') || !f0.includes('edificio') || f0.includes('tormenta')) out.push('FAIL frontera inicial: ' + f0.join(','));
    // cercanía: en la cueva, la 1ª pista es DESTRABAR al cuevero (gate); una vez destrabado, sí es la tormenta
    const inCueva = HintEngine.next({}, { at: 'cueva', insistencia: 0 });
    if (!inCueva || inCueva.id !== 'cuevero_gate') out.push('FAIL cercanía cueva→cuevero_gate (gate): ' + (inCueva && inCueva.id));
    const inCuevaUnlocked = HintEngine.next({ cueveroUnlocked: true }, { at: 'cueva' });
    if (!inCuevaUnlocked || inCuevaUnlocked.id !== 'tormenta') out.push('FAIL cercanía cueva→tormenta (destrabado): ' + (inCuevaUnlocked && inCuevaUnlocked.id));
    // una arista hecha (stormed=true) sale de la frontera
    if (HintEngine.frontier({ stormed: true }).some(e => e.id === 'tormenta')) out.push('FAIL tormenta hecha sigue en frontera');
    // secundarias: cercanía al super sugiere la Mega Drive; el FIFA NO aparece sin Mega Drive (precondición)
    const inSuper = HintEngine.next({}, { at: 'super' });
    if (!inSuper || inSuper.id !== 'megadrive') out.push('FAIL cercanía super→megadrive: ' + (inSuper && inSuper.id));
    if (HintEngine.frontier({}).some(e => e.id === 'fifa')) out.push('FAIL fifa en frontera sin Mega Drive');
    if (!HintEngine.frontier({ hasMegaDrive: true }).some(e => e.id === 'fifa')) out.push('FAIL fifa no aparece con Mega Drive');
    // chino: DOS formas post-tormenta. cerca de la cueva → puerta TRASERA (chino_back); cerca de Cemento → Iorio
    // (post-tormenta cueveroUnlocked es true por construcción: no se storma sin destrabar al cuevero)
    const backCueva = HintEngine.next({ stormed: true, cueveroUnlocked: true }, { at: 'cueva' });
    if (!backCueva || backCueva.id !== 'chino_back') out.push('FAIL cercanía cueva→chino_back: ' + (backCueva && backCueva.id));
    const iorioCemento = HintEngine.next({ stormed: true, cueveroUnlocked: true }, { at: 'cemento' });
    if (!iorioCemento || iorioCemento.id !== 'chino_iorio') out.push('FAIL cercanía cemento→chino_iorio: ' + (iorioCemento && iorioCemento.id));
    // la trasera se resuelve al ENTRAR (chinoEntered) y desaparece si ya abriste el frente (chinoFrontOpen)
    if (HintEngine.frontier({ stormed: true, cueveroUnlocked: true, chinoEntered: true }).some(e => e.id === 'chino_back')) out.push('FAIL chino_back sigue tras entrar');
    if (HintEngine.frontier({ stormed: true, cueveroUnlocked: true, chinoFrontOpen: true }).some(e => e.id === 'chino_back')) out.push('FAIL chino_back sigue con frente abierto');
    // Fase 2 (el grafo MANEJE los flags): cada arista que game.js aplica por id debe existir y setear
    // EXACTAMENTE su flag (si no, applyEdge no haría la transición). Atrapa typos de id / drift del grafo.
    const F2 = { tormenta:'stormed', edificio:'borrachosHappy', bunker:'bunkerUnlocked', chino_iorio:'chinoFrontOpen',
      truco:'trucoWon', fifa:'fifaWon', armas:'armado', chino_back:'chinoEntered', cuevero_gate:'cueveroUnlocked' };
    for (const id in F2) {
      const e = Historia.edges.find(x => x.id === id);
      if (!e) out.push('FAIL Fase2: falta la arista ' + id);
      else if (!e.sets || e.sets[F2[id]] !== true) out.push('FAIL Fase2: ' + id + ' no setea ' + F2[id] + ' → ' + JSON.stringify(e.sets));
    }
    // todo hecho (crítico + secundario + portal) → no quedan pistas
    const allDone = { stormed:true, borrachosHappy:true, bunkerUnlocked:true, chinoFrontOpen:true, trucoWon:true,
      won:true, hasMegaDrive:true, fifaWon:true, hasCementoTicket:true, armado:true, sleptOnce:true, chinoEntered:true,
      cueveroUnlocked:true, vecinoSeen:true, piqueteCampeon:true, juramento:true, obeliscoLlegado:true, sateliteHerido:true, tesoroTaken:true,
      subeSeen:true, subeGot:true, subeReady:true, enPlaza:true, escarapela:true, sanmartinChip:true, nivel2Win:true, lineaC:true, enConstitucion:true,
      enRetiro:true, enVilla31:true, comedorHired:true, comedorJornada:true, curaBendicion:true, bocaTrapo:true, enCampana:true, dalmineGritado:true,
      polacoCaso:true, polacoCarrito:true, polacoHallado:true, bondi60:true, enZarate:true, regataWon:true,
      trofeoTano:true, trofeoVitrina:true };
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

  // ---- GATE DEL CUEVERO (specs/cuevero-gate-truco.md): ruta A (Guido) + dead-end + venta destrabada ----
  // (corre DESPUÉS de Mensajero: la venta dispara la tormenta y dejaría 'tormenta' como último evento)
  const gate = vm.runInContext(`(() => {
    const out = [];
    if (!window.Game || !Game.__gate) return JSON.stringify(['FAIL no expone Game.__gate']);
    const snap = Game.serialize();   // slate limpio del gate
    Object.assign(snap.flags, { cueveroUnlocked:false, tahurDiscovered:false, guidoSummoned:false, guidoRecruited:false, guidoFollowing:false, bought:false, stormed:false });
    Game.continueGame(snap);
    const G = Game.__gate;
    // 1) cuevero gateado: hablarle NO vende ni dispara la tormenta (CA-1)
    G.cuevero(); let f = G.flags();
    if (f.bought || f.stormed) out.push('FAIL cuevero gateado vendió/disparó la tormenta');
    // 2) opción C (dead-end): no cambia flags (CA-4)
    G.pick('c'); f = G.flags();
    if (f.guidoSummoned || f.cueveroUnlocked) out.push('FAIL opción C cambió flags (dead-end)');
    // 3) RUTA A: contactos → linyera → Guido (+ FOLLOW CROSS-ROOM: el compañero camina con vos cruzando salas)
    G.pick('a'); if (!G.flags().guidoSummoned) out.push('FAIL opción A no convocó al linyera');
    if (!G.companions().includes('linyera')) out.push('FAIL ruta A no hizo aparecer al linyera-compañero');
    G.guido(); if (!G.flags().guidoRecruited) out.push('FAIL Guido no se presentó tras la cadena');
    if (G.companions().includes('linyera')) out.push('FAIL el linyera no se esfumó tras reclutar a Guido');
    G.guido(); if (G.flags().guidoFollowing) out.push('FAIL Guido sigue SIN tahúr descubierto (CA-5)');
    G.discoverTahur(); G.guido();
    if (!G.flags().guidoFollowing) out.push('FAIL Guido no sigue tras descubrir al tahúr (CA-5)');
    if (!G.companions().includes('guido')) out.push('FAIL Guido no se sumó como compañero que te sigue');
    // CROSS-ROOM: al cambiar de sala, el compañero cruza la puerta CON vos (aparece en la sala nueva)
    G.go(0); if (!G.compInRoom().includes('guido')) out.push('FAIL Guido no cruzó la puerta con vos (follow cross-room)');
    // sentarse a la mesa: Guido juega y gana → cueveroUnlocked + deja de seguir (CA-3)
    G.sitTahur(); f = G.flags();
    if (!f.cueveroUnlocked) out.push('FAIL Guido no destrabó al cuevero');
    if (f.guidoFollowing) out.push('FAIL Guido sigue tras ganar');
    if (G.companions().length) out.push('FAIL los compañeros no se fueron tras destrabar al cuevero');
    // 4) cuevero DESTRABADO: ahora sí vende y dispara la tormenta (CA-2/RF-7)
    G.cuevero(); f = G.flags();
    if (!f.bought || !f.stormed) out.push('FAIL cuevero destrabado no vendió/disparó la tormenta');
    // 5) RUTA B "DE A 6": reseteo a estado fresco (tahúr descubierto, cuevero trabado, sin Guido) y pruebo el reto 3v3
    const sb = Game.serialize();
    Object.assign(sb.flags, { cueveroUnlocked: false, bought: false, stormed: false, guidoSummoned: false, guidoRecruited: false, guidoFollowing: false, tahurDiscovered: true, trucoSeisOffered: false, trucoMates: {} });
    Game.continueGame(sb);
    G.tahur(); if (!G.seisOffered()) out.push('FAIL el tahúr no propuso jugar de a 6');
    if (G.flags().cueveroUnlocked) out.push('FAIL proponer de a 6 NO debe destrabar el cuevero');
    G.recruitMate('truco1'); if (!G.mates().includes('truco1')) out.push('FAIL no se reclutó al compañero truco1');
    if (!G.companions().includes('truco1')) out.push('FAIL el compañero de truco no te sigue');
    G.recruitMate('truco2'); if (G.mates().length !== 2) out.push('FAIL no se armó el equipo de 2');
    // resolución 3v3 (sin lanzar el arcade): total=3, gana el equipo con 2 de 3; consistente con tu duelo
    const rW = G.seisResolve(true), rL = G.seisResolve(false);
    if (rW.total !== 3) out.push('FAIL el partido de a 6 no es 3 jugadores: ' + rW.total);
    if (rW.won < 1) out.push('FAIL ganando tu duelo, tu equipo debería sumar al menos 1');
    if (rW.teamWon !== (rW.won >= 2)) out.push('FAIL teamWon inconsistente (win): ' + JSON.stringify(rW));
    if (rL.teamWon !== (rL.won >= 2)) out.push('FAIL teamWon inconsistente (lose): ' + JSON.stringify(rL));
    return JSON.stringify(out);
  })()`, sandbox);
  const gateRes = JSON.parse(gate);
  if (gateRes.length) { console.error('❌ GATE CUEVERO:\n' + gateRes.join('\n')); process.exit(1); }
  console.log('✓ gate del cuevero: ruta A (linyera→Guido→truco) + dead-end + venta destrabada OK');

  // ---- EL VECINO de los edificios clausurados (specs/edificios-clausurados-historias.md) ----
  const vecino = vm.runInContext(`(() => {
    const out = [];
    if (!window.Game || !Game.__vecino) return JSON.stringify(['FAIL no expone Game.__vecino']);
    const snap = Game.serialize();
    Object.assign(snap.flags, { stormed: true });   // post-tormenta: el vecino es interactuable
    snap.flags.entrado = {};
    Game.continueGame(snap);
    const V = Game.__vecino;
    const n = V.npc('garbarino', 11);   // vecino del edificio cuyo interior es la sala 11
    // 1ª charla = teaser, no abre nada ni entra; aún no "entrado"
    V.tell(n);
    if (V.state().spinoffLevel) out.push('FAIL la 1ª historia ya metió al nivel');
    // pasar → genera el nivel desde la historia (en headless sin fetch, requestHistoria cae al tema estático SYNC)
    V.pass(n);
    let s = V.state();
    if (!s.spinoffLevel) out.push('FAIL pasar no generó/entró al nivel del vecino');
    if (s.spinoffReturnRoom !== 11) out.push('FAIL no quedó marcado el interior de retorno (sala 11): ' + s.spinoffReturnRoom);
    if (!s.entrado.garbarino) out.push('FAIL no marcó entrado[garbarino]');
    // GANAR el nivel → quedás en el interior REAL (sala 11), NO en la calle (RF-6)
    V.end('win');
    s = V.state();
    if (s.spinoffLevel) out.push('FAIL no salió del nivel del vecino al ganar');
    if (s.current !== 11) out.push('FAIL al ganar no quedó en el interior del edificio (sala 11): ' + s.current);
    if (s.spinoffReturnRoom != null) out.push('FAIL spinoffReturnRoom no se limpió tras ganar');
    // BANCO VIVO de la IA (historias-vecino.js): si window.HISTORIAS_VECINO tiene relatos del edificio, se PREFIEREN
    const noBank = V.pick('garbarino');
    if (noBank.live) out.push('FAIL sin banco vivo debería usar el estático');
    window.HISTORIAS_VECINO = [{ id: 'g0', edif: 'garbarino', motif: '📺', style: 'wall', es: { gancho: 'La Tele Encendida', tale: 'Nadie la prendió.' }, en: { gancho: 'The TV Is On', tale: 'Nobody turned it on.' } }];
    const withBank = V.pick('garbarino');
    if (!withBank.live) out.push('FAIL con banco vivo no se prefirió la historia de la IA');
    if (withBank.gancho !== 'La Tele Encendida' && withBank.gancho !== 'The TV Is On') out.push('FAIL el gancho no salió del banco vivo: ' + withBank.gancho);
    // historia viva de OTRO edificio no debe filtrarse a garbarino → vuelve al estático
    window.HISTORIAS_VECINO = [{ id: 'a0', edif: 'arcade', motif: '🕹️', style: 'wall', es: { gancho: 'X', tale: 'Y' }, en: { gancho: 'X', tale: 'Y' } }];
    if (V.pick('garbarino').live) out.push('FAIL banco vivo de otro edificio no debe usarse');
    window.HISTORIAS_VECINO = [];
    // PERSISTENCIA del chusmerío del vecino (deuda #3): el estado por edificio (told/storyCount/active) sobrevive save→load
    const before = V.state().vecino;
    if (!before.garbarino || !(before.garbarino.storyCount > 0)) out.push('FAIL no se registró el estado del vecino (garbarino) tras charlar');
    else {
      const snap2 = Game.serialize();
      if (!snap2 || !snap2.flags || !snap2.flags.vecino || !snap2.flags.vecino.garbarino) out.push('FAIL serialize() no incluyó el estado del vecino');
      Game.continueGame(snap2);
      const after = Game.__vecino.state().vecino;
      if (!after.garbarino || after.garbarino.storyCount !== before.garbarino.storyCount) out.push('FAIL el storyCount del vecino no sobrevivió el round-trip');
      if (JSON.stringify((after.garbarino || {}).told) !== JSON.stringify(before.garbarino.told)) out.push('FAIL los told del vecino no sobrevivieron el round-trip');
    }
    return JSON.stringify(out);
  })()`, sandbox);
  const vecRes = JSON.parse(vecino);
  if (vecRes.length) { console.error('❌ VECINO:\n' + vecRes.join('\n')); process.exit(1); }
  console.log('✓ vecino edificios clausurados: historia → pasar → nivel generado → interior real al ganar OK');

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
  if (v2n !== 51) { console.error('❌ motor v2: Mundo.fromModel(LEVEL1) construyó ' + v2n + ' salas (esperaba 51)'); process.exit(1); }
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
  else console.log('✓ paridad v1↔v2: misma estructura (puertas/máquinas/npcs/cueveros) en las 51 salas');

  // ---- v2 JUGABLE headless: forzar el motor v2 y correr el loop sin crash ----
  vm.runInContext('localStorage.setItem("ts_engine","v2")', sandbox);
  document.getElementById('startBtn').dispatch('click', {});
  step(90);
  key('e'); step(5);
  console.log('✓ motor v2: start + 95 frames jugando en v2 (con interact) sin crash');

  console.log('\n🎮 E2E OK — boot + calle + todos los sub-modos + chino corren sin crash.');
}
