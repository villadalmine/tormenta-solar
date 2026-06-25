// game.js — run & gun lateral: loop, cámara, iluminación, cuartos y tormenta.
(() => {
  const canvas = document.getElementById('screen');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const TILE = Level.TILE;

  // i18n: T(clave, params) = texto traducido; TL(clave) = línea al azar de un array del catálogo.
  // Sin I18n (e2e headless) → T devuelve la clave (no crashea; el e2e no valida textos).
  const T = (k, p) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(k, p) : k;
  const TL = (k) => {
    const a = (typeof I18n !== 'undefined' && I18n.tList) ? I18n.tList(k) : null;
    return (a && a.length) ? a[(Math.random() * a.length) | 0] : k;
  };
  // TX(s): traduce strings de level.js (nombres de sala/NPC, diálogos fijos, labels de puerta) en el
  // punto de DISPLAY. level.js queda en español internamente (regex de sala / wiring por name siguen ok).
  const TX = (s) => (typeof I18n !== 'undefined' && I18n.lang === 'en' && typeof levelTx === 'function') ? levelTx(s) : s;

  // canvas de iluminación (oscuridad con "agujeros" de luz)
  const lightCanvas = document.createElement('canvas');
  lightCanvas.width = W; lightCanvas.height = H;
  const lctx = lightCanvas.getContext('2d');

  // DOM
  const elIntro = document.getElementById('intro');
  const elEnd = document.getElementById('endscreen');
  const elEndTitle = document.getElementById('endTitle');
  const elEndText = document.getElementById('endText');
  const elEndStats = document.getElementById('endStats');
  const elHud = document.getElementById('hud');
  const elHp = document.getElementById('hp');
  const elAmmo = document.getElementById('ammo');
  const elCoins = document.getElementById('coins');
  const elCaramelos = document.getElementById('caramelos');
  const elVicios = document.getElementById('vicios');
  const elFalopa = document.getElementById('falopa');
  const elMsg = document.getElementById('msg');
  const elFlash = document.getElementById('flash');
  const elFloor = document.getElementById('floorName');
  const elPrompt = document.getElementById('prompt');
  const elChat = document.getElementById('chat');
  const elChatTitle = document.getElementById('chat-title');
  const elChatLog = document.getElementById('chat-log');
  const elChatInput = document.getElementById('chat-input');
  let chatNpc = null, chatHistory = [], chatBusy = false, hintAsks = 0, chatFallbacks = 0;
  let sessStart = 0, sessChats = 0, sessTrucoW = 0, sessTrucoL = 0;   // métricas de "Tu partida" (in-game, client-side)
  // memoria por IDENTIDAD (clave = persona): cada linyera/NPC RECUERDA lo charlado entre aperturas y entre
  // sesiones (persiste en el guardado). Es el `agent.memory` del modelo v2 (ver modelo-de-entidades §6½).
  const oracleMem = {};
  const memKey = n => (n && (n.persona || n.name)) || null;
  let roamingNpc = null;   // el linyera ERRANTE: aparece cerca de lo que no hiciste (ver historia-grafo.md §3.4)
  // roster de linyeras ilustres (homenaje) — el oráculo errante VARÍA entre ellos por sala (cada uno su identidad)
  const ORACULOS = [{ name: 'Diógenes', sprite: 'linyera', persona: 'filosofo' },
    { name: 'Dante el poeta', sprite: 'viejo', persona: 'poeta' },
    { name: 'Pechito', sprite: 'linyera', persona: 'pechito' }];
  let ninjaRunT = -99, ninjaRunRoom = -1;   // FX transitorio: los ninjas rajan al mosh cuando Iorio toca

  let rooms, states, current, player, cam;
  let state = 'intro', stormed = false, bought = false, hasVale = false, challengeForVale = false;
  let secretUnlocked = false;
  const arcadeWon = { pacman: false, galaga: false, frogger: false };
  let lastT = 0, running = false, msgUntil = 0, shakeUntil = 0, time = 0, transCd = 0;

  const DOOR_ART = { galeria: 'door', up: 'doorUp', exit: 'exit', educacionit: 'educacionit', arcade: 'arcade', elevator: 'elevator', superchino: 'superchino', garbarino: 'garbarino', disqueria: 'disqueria', cemento: 'cemento', cambio: 'cambio', abandonado: 'abandonado' };
  // RF-7: tras la tormenta estos edificios se derrumban (no son refugio ni salida). Quedan clausurados.
  const COLLAPSED = ['edu', 'arcade', 'choris', 'garbarino'];   // RUINA_MSG → TL('g.ruina')
  let arcadeGame = null, superGame = null, vinilosGame = null;
  let gaveBeers = false, borrachosFed = 0, borrachosHappy = false, moneyRecovered = false, fifaWon = false, stunUntil = 0;
  let bunkerUnlocked = false, loopCount = 0;        // tótem → búnker; loopCount = día del loop
  let chinoFrontOpen = false, decayAcc = 0;         // loop de supervivencia (post-tormenta)
  let trucoWon = false;                             // ganar el truco abre una puerta al chino (se consume al cruzar)
  let armado = false;                               // espejo de n.armado: compraste fierro criollo (lo lee el grafo de historia)
  let tesoroTaken = false;                           // reclamaste el TESORO de los linyeras en el búnker (premio del edificio, 1×)
  let chinoEntered = false;                           // entraste al chino post-tormenta por CUALQUIER puerta (lo lee el grafo: arista chino_back)

  const room = () => rooms[current];
  const st = () => states[current];

  // motor v2 (data-driven, experimental) detrás de un toggle; default v1. Sin mundo.js+level-data.js → v1.
  function useV2() {
    if (typeof Mundo === 'undefined' || typeof window === 'undefined' || !window.LEVEL1) return false;   // v2 no disponible → v1
    try { if ((location.search || '').indexOf('engine=v1') >= 0) return false; } catch (e) {}   // opt-out explícito a v1
    try { if ((location.search || '').indexOf('engine=v2') >= 0) return true; } catch (e) {}
    try { const s = localStorage.getItem('ts_engine'); if (s === 'v1') return false; if (s === 'v2') return true; } catch (e) {}
    return true;   // DEFAULT = v2 (data-driven, "todo es un objeto"). v1 = respaldo (auto-fallback al construir + auto-degrade si se traba).
  }
  let engineUsed = 'v1';
  // Reporta un error del cliente al beacon (window.ERR_BEACON) si está configurado. Best-effort, sin PII.
  // Apagado por defecto (sin endpoint = no-op). Tag con el motor para distinguir fallas de v2 vs v1.
  function tel(name, labels) { try { if (typeof Telemetry !== 'undefined') Telemetry.event(name, labels); } catch (e) {} }
  function telOnce(key, name, labels) { try { if (typeof Telemetry !== 'undefined') Telemetry.once(key, name, labels); } catch (e) {} }
  function reportClientError(msg, err) {
    try {
      console.warn('[ts] ' + msg, err || '');
      tel('error', { engine: engineUsed });
      const url = (typeof window !== 'undefined') && window.ERR_BEACON;
      if (!url || typeof fetch === 'undefined') return;
      const body = JSON.stringify({ msg: String(msg).slice(0, 300), engine: engineUsed,
        stack: err && err.stack ? String(err.stack).slice(0, 600) : '', ua: (navigator && navigator.userAgent || '').slice(0, 160), ts: Date.now() });
      if (navigator && navigator.sendBeacon) navigator.sendBeacon(url, body);
      else fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
    } catch (e) {}
  }
  // Construye el mundo con RED DE SEGURIDAD: si v2 (data-driven) falla o sale degenerado, cae solo a v1.
  function buildRooms() {
    if (useV2()) {
      try {
        const r = Mundo.fromModel(window.LEVEL1);
        if (Array.isArray(r) && r.length >= 30) { engineUsed = 'v2'; return r; }   // sanity: tiene que dar el nivel entero
        throw new Error('v2 build degenerado (' + (r && r.length) + ' salas)');
      } catch (e) {
        engineUsed = 'v1-fallback';
        reportClientError('motor v2 falló al construir → fallback a v1: ' + (e && e.message), e);
        tel('engine_fallback', { engine: 'v2' });
        return Level.build();                                                       // self-heal: el jugador sigue jugando en v1
      }
    }
    engineUsed = 'v1';
    return Level.build();
  }
  function reset() {
    rooms = buildRooms();   // v2 (data-driven) con auto-fallback a v1 si falla; default v1
    states = rooms.map(r => ({
      enemies: r.enemies.map(Enemies.create),
      pickups: r.pickups.map(p => ({ ...p, taken: false })),
    }));
    current = 0;
    const s = rooms[0].playerStart;
    player = Player.create(s.x, s.y);
    cam = { x: 0, y: 0 };
    stormed = false; bought = false; hasVale = false; challengeForVale = false; time = 0;
    secretUnlocked = false; arcadeWon.pacman = arcadeWon.galaga = arcadeWon.frogger = false;
    gaveBeers = false; borrachosFed = 0; borrachosHappy = false; moneyRecovered = false; fifaWon = false; stunUntil = 0;
    bunkerUnlocked = false;   // cada loop hay que volver a ganarse el búnker (loop "limpio")
    loopCount = 0; chinoFrontOpen = false; decayAcc = 0; trucoWon = false; armado = false; tesoroTaken = false; chinoEntered = false;   // loop de supervivencia, de cero
    arcadeGame = null; superGame = null; vinilosGame = null; roamingNpc = null;
    ninjaRunT = -99; ninjaRunRoom = -1;
    for (const k in oracleMem) delete oracleMem[k];   // partida nueva: los linyeras te olvidan
    Bullets.clear(); Particles.clear(); Sfx.stopHum();
    state = 'playing';
    elFloor.textContent = TX(rooms[0].name);
    setMsg(T('g.start'), '#FFD54F', 6000);
  }

  // ---- GUARDADO (capa ADITIVA; el dueño de localStorage + UI es js/save.js) ----
  // serialize(): snapshot PLANO del estado, o null si no estamos en juego estable (solo 'playing').
  // No persiste sub-modos (arcade/super/vinilos): al cargar, retomás parado en la sala.
  function serialize() {
    if ((state !== 'playing' && state !== 'chat') || !player) return null;   // 'chat' también: el jugador está quieto y la pos es válida
    const p = player;
    return {
      v: 1, current, px: p.x, py: p.y,
      player: { hp: p.hp, ammo: p.ammo, coins: p.coins, forros: p.forros, flores: p.flores, caramelos: p.caramelos,
        birras: p.birras, carne: p.carne, fiambre: p.fiambre, diosa: p.diosa, falopa: p.falopa,
        spitDmg: p.spitDmg, hasMegaDrive: !!p.hasMegaDrive, hasCementoTicket: !!p.hasCementoTicket },
      flags: { stormed, bought, hasVale, challengeForVale, secretUnlocked, gaveBeers, borrachosFed,
        borrachosHappy, moneyRecovered, fifaWon, bunkerUnlocked, loopCount, chinoFrontOpen, trucoWon, armado, tesoroTaken, chinoEntered },
      arcadeWon: { pacman: arcadeWon.pacman, galaga: arcadeWon.galaga, frogger: arcadeWon.frogger },
      pickups: states.map(s => s.pickups.map(pk => !!pk.taken)),
      npcs: rooms.map(rm => (rm.npcs || []).map(n => ({ f: !!n.falopaTaken, l: !!n.limosnaTaken }))),
      oracleMem,   // memoria de los linyeras por identidad (agent.memory)
    };
  }
  // restore(snap): reconstruye el mundo (reset) y le aplica el snapshot. true si cargó.
  function restore(snap) {
    if (!snap || snap.v !== 1 || typeof snap.current !== 'number') return false;
    reset();                                              // mundo fresco + defaults
    current = Math.max(0, Math.min(rooms.length - 1, snap.current));
    Object.assign(player, snap.player || {});
    player.x = snap.px; player.y = snap.py; player.vx = player.vy = 0; player.alive = true;
    const f = snap.flags || {};
    stormed = !!f.stormed; bought = !!f.bought; hasVale = !!f.hasVale; challengeForVale = !!f.challengeForVale;
    secretUnlocked = !!f.secretUnlocked; gaveBeers = !!f.gaveBeers; borrachosFed = f.borrachosFed | 0;
    borrachosHappy = !!f.borrachosHappy; moneyRecovered = !!f.moneyRecovered; fifaWon = !!f.fifaWon;
    bunkerUnlocked = !!f.bunkerUnlocked; loopCount = f.loopCount | 0; chinoFrontOpen = !!f.chinoFrontOpen;
    trucoWon = !!f.trucoWon; armado = !!f.armado; tesoroTaken = !!f.tesoroTaken; chinoEntered = !!f.chinoEntered;
    const aw = snap.arcadeWon || {}; arcadeWon.pacman = !!aw.pacman; arcadeWon.galaga = !!aw.galaga; arcadeWon.frogger = !!aw.frogger;
    if (snap.pickups) states.forEach((s, i) => s.pickups.forEach((pk, j) => { if (snap.pickups[i]) pk.taken = !!snap.pickups[i][j]; }));
    if (snap.npcs) rooms.forEach((rm, i) => (rm.npcs || []).forEach((n, j) => { const d = snap.npcs[i] && snap.npcs[i][j]; if (d) { n.falopaTaken = d.f; n.limosnaTaken = d.l; } }));
    for (const k in oracleMem) delete oracleMem[k];   // restaurá la memoria de los linyeras del snapshot
    if (snap.oracleMem) Object.assign(oracleMem, snap.oracleMem);
    if (stormed) Sfx.startHum();
    updateCam(); elFloor.textContent = TX(rooms[current].name);
    placeRoamingOraculo(Math.floor((player.x + player.w / 2) / Level.TILE));
    setMsg(T('g.loaded'), '#7CFC00', 4000);
    return true;
  }
  // continueGame(snap): igual que start() pero retomando el snapshot (lo usa el botón "Continuar").
  function continueGame(snap) {
    if (!restore(snap)) { start(); return; }
    elIntro.classList.add('hidden'); elEnd.classList.add('hidden');
    elHud.classList.remove('hidden'); elFloor.classList.remove('hidden');
    Sfx.init(); Sfx.startMusic(); Sfx.setAmbient(ambientFor(room()));
    running = true; lastT = performance.now();
    requestAnimationFrame(loop);
  }
  // autosave: cada ~5s mientras jugás, si hay un sink (SaveStore de save.js). Sin sink, no hace nada.
  let lastSave = 0;
  function autosave(t) {
    if ((state !== 'playing' && state !== 'chat') || typeof SaveStore === 'undefined' || !SaveStore.write) return;
    if (t - lastSave < 5000) return;
    lastSave = t;
    const snap = serialize(); if (snap) SaveStore.write(snap);
  }

  function setMsg(t, c, ms = 3000) {
    elMsg.textContent = t; elMsg.style.color = c || '#ff5252'; elMsg.style.opacity = '1';
    const mul = (typeof Config !== 'undefined' && Config.msgMs) ? Config.msgMs : 1;   // duración configurable
    msgUntil = performance.now() + ms * mul;
  }

  // ---- cámara ----
  function updateCam() {
    const r = room();
    cam.x = Math.max(0, Math.min(r.pixW - W, player.x + player.w/2 - W/2));
    cam.y = Math.max(0, Math.min(r.pixH - H, player.y + player.h/2 - H/2));
  }

  // ---- interacción ----
  function nearestInteract() {
    const r = room();
    const pcx = player.x+player.w/2, pf = player.y+player.h;
    let best = null, bd = 52;
    for (const d of r.doors) {
      if (d.id === 'secret' && !secretUnlocked) continue;
      if (d.id === 'cemento' && !player.hasCementoTicket) continue;
      if (d.id === 'bunker' && !bunkerUnlocked) continue;
      if (d.id === 'chinoback' && !stormed) continue;   // la puerta trasera aparece con la tormenta
      // la puerta del tahúr SIEMPRE es interactuable: abierta si ganaste el truco, si no muestra la pista
      const dist = Math.hypot(pcx - d.x, pf - d.y);
      if (dist < bd) { bd = dist; best = { kind: 'door', d }; }
    }
    for (const n of r.npcs || []) {
      const dist = Math.hypot(pcx - n.x, pf - n.y);
      if (dist < 50 && dist < bd) { bd = dist; best = { kind: 'npc', n }; }
    }
    for (const m of r.machines || []) {
      const dist = Math.hypot(pcx - m.x, pf - m.y);
      if (dist < 54 && dist < bd) { bd = dist; best = { kind: 'machine', m }; }
    }
    if (!bought && !stormed) for (const c of r.cueveros || []) {
      const dist = Math.hypot(pcx - c.x, pf - c.y);
      if (dist < 56 && dist < bd) { bd = dist; best = { kind: 'cuevero', c }; }
    }
    return best;
  }
  function interact() {
    if (state !== 'playing' || transCd > 0) return;
    const it = nearestInteract();
    if (!it) return;
    if (it.kind === 'door') {
      if (stormed && COLLAPSED.includes(it.d.id)) { setMsg(TL('g.ruina'), '#b0a0a0', 4500); return; }
      if (it.d.id === 'super') {
        if (!stormed) enterSuper();                              // pre-tormenta: changuito normal
        else if (chinoFrontOpen) { chinoFrontOpen = false; enterSuper(); }  // Iorio corrió a los ninjas (una entrada)
        else setMsg(T('g.super.barricada'), '#ff5252', 6500);
      }
      else if (it.d.id === 'chinoback') enterSuper();           // entrada de servicio desde el refugio
      else if (it.d.id === 'chinotruco') {
        if (trucoWon) { trucoWon = false; enterSuper(); }              // ganaste → cruzás (se consume; la puerta queda cerrada)
        else setMsg(T('g.truco.doorLocked'), '#ffd54f', 5200);        // cerrada: hay que ganarle al tahúr al truco
      }
      else if (it.d.id === 'vinilos') enterVinilos();
      else if (it.d.id === 'cambio' && !stormed) {
        // la casa de cambio oficial está HASTA LAS PELOTAS: la cola no te deja entrar
        setMsg(TL('g.cambio.cola'), '#ffd54f', 4500);
      }
      else if (it.d.id === 'abandonado' && !borrachosHappy) {
        // los tres borrachines te tapan la entrada hasta que les des LO QUE QUIEREN
        setMsg(TL('g.abandonado'), '#ffd54f', 4800);
      }
      else transition(it.d);
    }
    else if (it.kind === 'npc') handleNpc(it.n);
    else if (it.kind === 'machine') handleMachine(it.m);
    else if (it.kind === 'cuevero') handleCuevero(it.c);
  }
  function launchArcade(game, opts) { arcadeGame = Arcade.create(game, opts); state = 'arcade'; elPrompt.classList.add('hidden'); elHud.classList.add('hidden'); elFloor.classList.add('hidden'); }
  function handleNpc(n) {
    if (n.action === 'frogger') { challengeForVale = true; setMsg(T('g.frogger.start'), '#ff2e88', 1000); launchArcade('frogger'); }
    else if (n.action === 'chori') redeemChori();
    else if (n.action === 'truco') { setMsg(T('g.truco.sit'), '#ffd54f', 1000); launchArcade('truco', { opp: 'tahur' }); }
    else if (n.action === 'shop') buyFromShop(n);
    else if (n.action === 'borracho') giveBorracho(n);
    else if (n.action === 'lujo') handleLujo(n);
    else if (n.action === 'totem') grabTotem(n);
    else if (n.action === 'tesoro') grabTesoro(n);
    else if (n.action === 'loop') doLoop(n);
    else if (n.action === 'limosna') giveLimosna(n);
    else if (n.action === 'iorio') giveIorio(n);
    else if (n.action === 'armas') buyArmas(n);
    else if (n.action === 'chat') openChat(n);
    else if (n.action === 'fifa') playFifa();
    else { setMsg(TX(n.dialog) || (n.lines && n.lines[(Math.random()*n.lines.length)|0]) || '...', '#aef0c0', 4800); Sfx.pickup(); }
  }
  function ejectToStreet(msg) {
    // te echan del edificio: aparecés de nuevo en la calle, en la puerta del abandonado
    current = 0;
    const d = rooms[0].doorById['abandonado'];
    player.x = d.x - player.w / 2; player.y = rooms[0].gTop * Level.TILE - player.h;
    player.vx = player.vy = 0; transCd = 0.4;
    updateCam(); elFloor.textContent = TX(rooms[0].name);
    setMsg(msg, '#ffd54f', 7500);
  }
  function grabJoyas(n) {
    // tocás las JOYAS → sale el linyera, te suelta su filosofía y te raja a la calle
    const pick = a => a[(Math.random() * a.length) | 0];
    const line = (n.lines && n.lines.length) ? pick(n.lines) : T('g.joyas.default');
    ejectToStreet(T('g.joyas.eject', { line }));
    Sfx.pickup();
  }
  function grabTotem(n) {
    // robar el tótem de 3 monos → 20 linyeras te hacen GURÚ y abren el búnker del piso 20
    if (!bunkerUnlocked) {
      applyEdge('bunker', 'bunkerUnlocked'); Sfx.win();
      setMsg(T('g.totem.first'), '#7CFC00', 9000);
    } else {
      setMsg(T('g.totem.again'), '#aef0c0', 3500);
    }
  }
  // TESORO de los linyeras (premio del edificio abandonado): el linyera mayor te lo da SOLO si sos gurú,
  // una vez por partida. Maletín de dólares (+guita) + munición + mejora PERMANENTE del escupitajo.
  function grabTesoro(n) {
    if (!bunkerUnlocked) { setMsg(T('g.tesoro.noGuru'), '#ffd54f', 5000); return; }   // (en el búnker ya sos gurú; red de seguridad)
    if (tesoroTaken) { setMsg(T('g.tesoro.empty'), '#aef0c0', 4000); return; }
    tesoroTaken = true;
    player.coins += 150; player.ammo += 40; player.spitDmg = 24;   // escupís más fuerte (14→24), para todo el run
    Sfx.win();
    setMsg(T('g.tesoro.grab'), '#7CFC00', 9000);
  }
  // llanto de los ex-millonarios: pool por idioma (I18n.dict) → catálogo (TL) → Dialogos legacy
  function linyeraCry() {
    if (typeof I18n !== 'undefined' && I18n.dict) { const a = I18n.dict('linyera_llanto'); if (a && a.length) return a[(Math.random()*a.length)|0]; }
    const tl = TL('g.linyeraCry'); if (tl !== 'g.linyeraCry') return tl;
    const a = (typeof Dialogos !== 'undefined' && Dialogos.es && Dialogos.es.linyera_llanto) || [];
    return a.length ? a[(Math.random()*a.length)|0] : '...';
  }
  function spawnIn(idx, tileX) {
    current = idx; const rm = rooms[idx];
    player.x = tileX * Level.TILE + Level.TILE/2 - player.w/2;
    player.y = rm.gTop * Level.TILE - player.h;
    player.vx = player.vy = 0; transCd = 0.4;
    updateCam(); elFloor.textContent = TX(rm.name);
    placeRoamingOraculo(tileX);
  }
  // LINYERA ERRANTE (capa aditiva): al entrar a una sala, si hay una arista de frontera EN ESTE LUGAR,
  // aparece el linyera cerca del jugador para tirarte la pista. Se mueve con vos (uno solo a la vez).
  function placeRoamingOraculo(tileX) {
    if (typeof HintEngine === 'undefined' || typeof Historia === 'undefined') return;
    if (roamingNpc) {   // sacalo de donde estaba (no duplicar)
      for (const rm of rooms) { const i = (rm.npcs || []).indexOf(roamingNpc); if (i >= 0) rm.npcs.splice(i, 1); }
      roamingNpc = null;
    }
    const rm = rooms[current];
    if (!rm || current === 0) return;                                   // en la calle ya está el linyera fijo
    if ((rm.npcs || []).some(n => n.oracle || n.persona === 'filosofo')) return;   // ya hay un oráculo en esta sala
    const at = currentAt();
    if (!HintEngine.frontier(historiaState()).some(e => e.at === at)) return;   // nada pendiente acá
    const w = rm.w || 20;
    const tx = Math.max(1, Math.min(w - 2, tileX + (tileX < w - 4 ? 3 : -3)));  // a unos pasos del jugador
    // el filósofo errante VARÍA: es uno de los linyeras ilustres (homenaje), distinto por sala. Todos
    // comparten la persona 'filosofo' (el oráculo de pistas). Identidad propia por entidad; memoria = v2.
    const o = ORACULOS[((current % ORACULOS.length) + ORACULOS.length) % ORACULOS.length];
    roamingNpc = { name: o.name, sprite: o.sprite, action: 'chat', persona: o.persona, oracle: true,
      dialog: T('g.oraculo.greet'), roaming: true,
      x: tx * Level.TILE + Level.TILE/2, y: rm.gTop * Level.TILE };
    (rm.npcs = rm.npcs || []).push(roamingNpc);
  }
  function resetLoopResources() {            // cajones de falopa y limosnas se renuevan cada loop
    for (const rm of rooms) for (const n of rm.npcs || []) { n.falopaTaken = false; n.limosnaTaken = false; }
  }
  function reviveToPreviousLoop() {
    loopCount = Math.max(0, loopCount - 1);
    player.alive = true; player.hp = 100; decayAcc = 0; player.falopa = 0;
    resetLoopResources(); chinoFrontOpen = false;
    const idx = bunkerUnlocked ? rooms.findIndex(r => /[Bb][úu]nker/.test(r.name)) : rooms.findIndex(r => r.cueveros && r.cueveros.length);
    spawnIn(idx >= 0 ? idx : 0, 4); flash();
    setMsg(T('g.revive', { n: loopCount }), '#ff5252', 7000);
  }
  function grabFalopa(n) {
    if (!stormed) { setMsg(T('g.falopa.preStorm'), '#ffd54f', 4500); return; }
    if (n.falopaTaken) { setMsg(T('g.falopa.empty'), '#9fb4c4', 3500); return; }
    n.falopaTaken = true; player.falopa = (player.falopa || 0) + 2; Sfx.pickup();
    setMsg(T('g.falopa.grab', { n: player.falopa }), '#7CFC00', 6000);
  }
  function giveLimosna(n) {
    if (!stormed) { setMsg(TX(n.dialog) || T('g.limosna.preStorm'), '#aef0c0', 4000); return; }
    if (n.limosnaTaken) { setMsg(T('g.limosna.empty'), '#9fb4c4', 3000); return; }
    n.limosnaTaken = true;
    const amt = 5 + ((Math.random() * 16) | 0);     // 5..20, aleatorio
    player.coins += amt; Sfx.pickup();
    setMsg(linyeraCry() + '  +' + amt + ' 🪙', '#FFC107', 6500);
  }
  function giveIorio(n) {
    if (!stormed) { setMsg(TX(n.dialog) || T('g.iorio.preStorm'), '#aef0c0', 4500); return; }
    if ((player.falopa || 0) <= 0) { setMsg(T('g.iorio.noFalopa'), '#ffd54f', 6000); return; }
    player.falopa--; applyEdge('chino_iorio', 'chinoFrontOpen'); Sfx.win();
    ninjaRunT = time; ninjaRunRoom = current;        // ¡tocó Pibe Tigre! los ninjas rajan al pogo (FX)
    setMsg(T('g.iorio.give'), '#7CFC00', 9000);
  }
  // ---- chat con IA (action:'chat') ----
  function chatLine(who, txt) {
    const div = document.createElement('div');
    div.className = who; div.textContent = (who === 'you' ? T('g.chat.youPrefix') : '') + txt;
    elChatLog.appendChild(div); elChatLog.scrollTop = elChatLog.scrollHeight;
    return div;
  }
  // --- pistas del linyera oráculo (capa aditiva; ver specs/nivel-1/historia-grafo.md) ---
  // Fase 1: SOLO LEEMOS los flags que ya maneja game.js para saber dónde está parado el jugador.
  // === FASE 2 del grafo: el GRAFO maneja los flags ===
  // En vez de setear el flag a mano en cada lado, se APLICA una arista por id y la arista (su `sets`,
  // declarado en las fichas) decide QUÉ flag cambia. Fuente de verdad de las transiciones = el grafo
  // (Historia): si cambia el `sets` de una ficha, cambia el efecto sin tocar game.js. Un closure puede
  // escribir el `let` externo, así que no hace falta un store y los reads siguen igual.
  // El 2º argumento (fallbackFlag) es una RED DE SEGURIDAD: si historia.js no cargó, igual progresás.
  const FLAG_SETTERS = {
    stormed:          v => stormed = v,
    borrachosHappy:   v => borrachosHappy = v,
    bunkerUnlocked:   v => bunkerUnlocked = v,
    chinoFrontOpen:   v => chinoFrontOpen = v,
    trucoWon:         v => trucoWon = v,
    fifaWon:          v => fifaWon = v,
    armado:           v => armado = v,
    chinoEntered:     v => chinoEntered = v,
    hasMegaDrive:     v => { if (player) player.hasMegaDrive = v; },
    hasCementoTicket: v => { if (player) player.hasCementoTicket = v; },
  };
  function applyEdge(id, fallbackFlag) {
    const edges = (typeof Historia !== 'undefined' && Historia.edges) ? Historia.edges : [];
    const e = edges.find(x => x.id === id);
    if (typeof Mensajero !== 'undefined') Mensajero.evento(id);   // "qué acaba de pasar" (capa aditiva)
    if (e && e.sets) { for (const k in e.sets) if (FLAG_SETTERS[k]) FLAG_SETTERS[k](!!e.sets[k]); return true; }
    if (fallbackFlag && FLAG_SETTERS[fallbackFlag]) FLAG_SETTERS[fallbackFlag](true);   // grafo ausente → red de seguridad
    return false;
  }
  function historiaState() {
    return {
      stormed, borrachosHappy, bunkerUnlocked, chinoFrontOpen, trucoWon, fifaWon, armado, chinoEntered,
      hasMegaDrive: !!(player && player.hasMegaDrive),
      hasCementoTicket: !!(player && player.hasCementoTicket),
      sleptOnce: loopCount > 0,
    };
  }
  // lugar actual → tag del grafo (para la cercanía del oráculo)
  function currentAt() {
    const n = (room() && room().name) || '';
    if (/[Bb][úu]nker/.test(n)) return 'bunker';
    if (/[Cc]ueva|[Dd]isquer/.test(n)) return 'cueva';
    if (/Cemento/.test(n)) return 'cemento';
    if (/[Cc]ambio/.test(n)) return 'cambio';
    if (/[Aa]rcade|[Tt]ruco|trastienda/.test(n)) return 'arcade';
    if (/[Ss]uper|[Cc]hino/.test(n)) return 'super';
    if (/[Gg]aler/.test(n)) return 'galeria';
    if (/Edificio|Piso/.test(n)) return 'edificio';
    return 'calle';
  }
  // ¿es el linyera filósofo (el guía/oráculo)?
  const isOraculo = n => !!(n && (n.oracle || n.persona === 'filosofo'));   // los linyeras ilustres son oráculos (dan pistas)
  function getHint(level) {
    if (typeof HintEngine === 'undefined') return null;
    return HintEngine.next(historiaState(), { at: currentAt(), insistencia: level });
  }
  function showHint(level) { const h = getHint(level); if (h) chatLine('npc', '💡 ' + h.text); }

  function openChat(n) {
    if (typeof AI === 'undefined') { setMsg(TX(n.dialog) || '“...”', '#aef0c0', 4000); return; }
    chatNpc = n; chatBusy = false; hintAsks = 0;
    const key = memKey(n);
    chatHistory = (key && oracleMem[key]) ? oracleMem[key].slice() : [];   // retoma su memoria por identidad
    elChatTitle.textContent = '💬 ' + (TX(n.name) || T('chat.title'));
    elChatLog.innerHTML = '';
    chatLine('sys', AI.mode() === 'offline' ? T('g.chat.offline') : T('g.chat.online', { mode: AI.mode() }));
    if (n.dialog) chatLine('npc', TX(n.dialog));
    if (chatHistory.length) chatLine('sys', T('g.chat.remembers'));   // se acuerda de vos (tiene memoria previa)
    if (isOraculo(n)) showHint(0);   // el linyera arranca con una pista críptica (nivel 0)
    state = 'chat';
    elPrompt.classList.add('hidden'); elChat.classList.remove('hidden');
    setTimeout(() => elChatInput && elChatInput.focus(), 30);
  }
  function closeChat() {
    elChat.classList.add('hidden'); elChatInput.value = ''; chatNpc = null;
    if (state === 'chat') state = 'playing';
  }
  async function chatSend() {
    if (chatBusy || !chatNpc) return;
    if (typeof AI !== 'undefined' && AI.setStormed) AI.setStormed(stormed);   // pool pre/post según la tormenta

    const msg = (elChatInput.value || '').trim();
    if (!msg) return;
    elChatInput.value = ''; chatLine('you', msg);
    chatHistory.push({ role: 'user', content: msg });
    chatBusy = true;
    const thinking = chatLine('sys', '...');
    // linyera oráculo: cada repregunta sube el spoiler (0→3); la pista se le pasa como GROUNDING a la IA
    // (la dice con su voz, no inventa ruta). Si la respuesta sale LOCAL, la mostramos explícita (garantía).
    const ground = isOraculo(chatNpc) ? getHint(Math.min(++hintAsks, 3)) : null;
    let reply;
    try { reply = await AI.chat(chatNpc.persona || 'filosofo', msg, chatHistory, ground && ground.text); }
    catch (e) { reply = T('g.chat.error'); }
    thinking.remove();
    chatLine('npc', reply);
    chatHistory.push({ role: 'assistant', content: reply });
    sessChats++;   // "Tu partida": cuántas veces charlaste
    // métrica: ¿el chat dio IA real o cayó al pool? + con qué MOTOR (para ver tu "v1 chat no anda")
    tel('chat', { engine: engineUsed, result: (typeof AI !== 'undefined' && AI.lastFallback && AI.lastFallback()) ? 'fallback' : (typeof AI !== 'undefined' && AI.lastSource ? AI.lastSource() : 'ai') });
    const mk = memKey(chatNpc); if (mk) oracleMem[mk] = chatHistory.slice(-12);   // guardá su memoria (cap 12 turnos)
    if (ground && typeof AI !== 'undefined' && AI.lastSource() === 'local') chatLine('npc', '💡 ' + ground.text);
    // SATURACIÓN del free (la línea en personaje ya la dio el pool): cada tanto, avisá que es por el plan free
    // (upsell suave; sin spamear: 1ª vez de la sesión y luego cada 4).
    const byokLim = (typeof AI !== 'undefined' && AI.lastByokLimit) ? AI.lastByokLimit() : null;
    if (typeof AI !== 'undefined' && AI.lastTimedOut && AI.lastTimedOut()) {
      chatFallbacks++;
      if (chatFallbacks === 1 || chatFallbacks % 4 === 0) chatLine('sys', T('g.chat.freeUpsell'));
    }
    // TU key de OpenRouter pegó contra TU propio límite de cuenta (free-models-per-day/min) → avisar con el reset
    else if (byokLim) {
      const hs = Math.max(1, Math.round((byokLim.resetMs - Date.now()) / 3600000));
      chatLine('sys', T(byokLim.perDay ? 'g.chat.byokLimitDay' : 'g.chat.byokLimitMin', { h: hs }));
    }
    // si el jugador tiene SU key y aun así salió local (offline real, no saturación) → avisar
    else if (typeof AI !== 'undefined' && AI.lastSource() === 'local' && AI.getKey()) chatLine('sys', T('g.chat.localWarn'));
    chatBusy = false;
    if (elChatInput) elChatInput.focus();
  }
  function buyArmas(n) {
    // el misterioso de la galería: con la tormenta, las armas eléctricas no sirven → fierro criollo
    if (!stormed) { setMsg(T('g.armas.preStorm'), '#9fd3ff', 5000); return; }
    if (n.armado) { setMsg(T('g.armas.done'), '#aef0c0', 3000); return; }
    const cost = 15;
    if (player.coins < cost) { setMsg(T('g.armas.noCoins', { cost }), '#ff5252', 4000); Sfx.empty(); return; }
    player.coins -= cost; n.armado = true; applyEdge('armas', 'armado');
    player.ammo += 40; player.hp = Math.min(100, player.hp + 20);
    setMsg(T('g.armas.buy'), '#7CFC00', 7500);
  }
  function handleLujo(n) {
    // mismo punto en los pisos de lujo: pre-tormenta son las JOYAS (te raja el linyera),
    // post-tormenta el CAJÓN del mueble (falopa para Iorio).
    if (!stormed) grabJoyas(n);
    else grabFalopa(n);
  }
  function doLoop() {
    // el catre SOLO sirve con la tormenta ya estallada (antes no hay caos del que refugiarse)
    if (!stormed) {
      setMsg(T('g.loop.preStorm'), '#9fd3ff', 5500);
      return;
    }
    loopCount++;
    resetLoopResources();
    player.falopa = 0;                                                      // la falopa se resetea por loop
    player.coins = Math.floor(player.coins * (0.3 + Math.random() * 0.4));  // monedas: te queda algo (parcial, aleatorio)
    player.hp = 100; player.alive = true; decayAcc = 0;                     // descansás: arrancás el día lleno
    chinoFrontOpen = false; flash();
    setMsg(T('g.loop.sleep', { n: loopCount }), '#7CFC00', 8000);
  }
  function playFifa() {
    if (!player.hasMegaDrive) { setMsg(T('g.fifa.noMega'), '#9fd3ff', 5000); return; }
    if (fifaWon) { setMsg(T('g.fifa.done'), '#7CFC00', 3000); return; }
    applyEdge('fifa', 'fifaWon'); player.coins += 30; Sfx.win();
    setMsg(T('g.fifa.win'), '#7CFC00', 6500);
  }
  function giveBorracho(n) {
    const pick = a => a[(Math.random()*a.length)|0];
    const want = n.want || 'carne';            // diosa | carne | fiambre
    if (n.fed) { setMsg(TL('g.borracho.fed'), '#aef0c0', 2500); return; }
    const have = want === 'diosa' ? (player.diosa||0) : want === 'carne' ? (player.carne||0) : (player.fiambre||0);
    if (have > 0) {
      // el borrachín DETECTA que tenés lo que quiere → te lo agradece y deja de pedir
      if (want === 'diosa') player.diosa--; else if (want === 'carne') player.carne--; else player.fiambre--;
      n.fed = true; borrachosFed++; Sfx.pickup();
      const got = want === 'diosa' ? T('g.borracho.gotDiosa') : want === 'carne' ? T('g.borracho.gotCarne') : T('g.borracho.gotFiambre');
      if (borrachosFed >= 3) {
        applyEdge('edificio', 'borrachosHappy'); gaveBeers = true;
        setMsg(T('g.borracho.allHappy', { got }), '#7CFC00', 9000);
      } else {
        setMsg(T('g.borracho.thanks', { got, n: borrachosFed }), '#aef0c0', 4500);
      }
      return;
    }
    // no tenés lo que quiere: siempre te tira algo random, y en una de esas suelta la pista de qué comprarle
    n.talks = (n.talks || 0) + 1;
    if (n.hint && (n.talks >= 6 || Math.random() < 0.3)) setMsg(n.hint, '#ffd54f', 5500);
    else setMsg(n.lines ? pick(n.lines) : T('g.borracho.askDefault'), '#ffd54f', 4200);
  }
  function enterSuper() { if (stormed) applyEdge('chino_back', 'chinoEntered'); superGame = Super.create({ player, gaveBeers, stormed }); state = 'super'; elPrompt.classList.add('hidden'); elHud.classList.add('hidden'); elFloor.classList.add('hidden'); elMsg.textContent = ''; }
  function enterVinilos() { vinilosGame = Vinilos.create({ player }); state = 'vinilos'; elPrompt.classList.add('hidden'); elHud.classList.add('hidden'); elFloor.classList.add('hidden'); elMsg.textContent = ''; Sfx.startEighties(); }
  function enterCuevaFromSecret() {
    const idx = rooms.findIndex(r => r.cueveros && r.cueveros.length);   // la CUEVA real (no cualquier sala con cueveros:[] vacío)
    if (idx < 0) return;
    current = idx;
    const cu = rooms[idx], up = cu.doorById['up'];
    player.x = (up.x + 48) - player.w/2; player.y = cu.gTop*Level.TILE - player.h; player.vx = player.vy = 0;
    updateCam(); elFloor.textContent = TX(cu.name);
    if (!moneyRecovered) { moneyRecovered = true; player.coins += 60; setMsg(T('g.cueva.secretMoney'), '#7CFC00', 7000); }
    else setMsg(T('g.cueva.secretEmpty'), '#9fb4c4', 4000);
  }
  function buyFromShop(n) {
    const sh = n.sells;
    const cur = T('g.cur.' + (sh.pay === 'caramelos' ? 'caramelos' : sh.pay === 'forros' ? 'forros' : 'monedas'));
    const have = sh.pay === 'caramelos' ? player.caramelos : sh.pay === 'forros' ? player.forros : player.coins;
    if (sh.stock <= 0) { setMsg(T('g.shop.empty'), '#ffd54f', 2500); return; }
    if (have < sh.cost) { setMsg(T('g.shop.noFunds', { cost: sh.cost, cur, have }), '#ff5252', 3000); Sfx.empty(); return; }
    if (sh.pay === 'caramelos') player.caramelos -= sh.cost; else if (sh.pay === 'forros') player.forros -= sh.cost; else player.coins -= sh.cost;
    sh.stock--;
    let txt;
    if (sh.kind === 'ammo') { player.ammo += sh.amount; txt = T('g.shop.ammo', { n: sh.amount }); }
    else if (sh.kind === 'health') { player.hp = Math.min(100, player.hp + sh.amount); txt = T('g.shop.health', { n: sh.amount }); }
    else { player.ammo += 30; player.hp = Math.min(100, player.hp + 25); txt = T('g.shop.amuleto'); }
    setMsg(T('g.shop.bought', { txt, cost: sh.cost, cur }), '#7CFC00', 3500); Sfx.pickup();
  }
  function machinePrice(m) { return 3 + (m.plays || 0) * 3; }
  function handleMachine(m) {
    if (stormed) { setMsg(T('g.machine.possessed'), '#ff5252', 3000); return; }
    // Pac-Man y Galaga: el dueño te extorsiona y sube el precio cada vez
    if (m.game === 'pacman' || m.game === 'galaga') {
      const price = machinePrice(m);
      if (player.coins < price) { setMsg(T('g.machine.pay', { price }), '#ff5252', 3500); Sfx.empty(); return; }
      player.coins -= price; m.plays = (m.plays || 0) + 1;
      setMsg(T('g.machine.paid', { price }), '#ffd54f', 2500);
      challengeForVale = false; launchArcade(m.game); return;
    }
    // TrucoTron: el tipo del fondo oscuro no juega con peleles
    if (m.game === 'trucotron') {
      if (arcadeWon.pacman && arcadeWon.galaga && arcadeWon.frogger) { challengeForVale = false; launchArcade('truco', { opp: 'maquina' }); }
      else setMsg(T('g.machine.trucotron'), '#d8c8b0', 5500);
      return;
    }
    // Frogger libre (práctica)
    challengeForVale = false; launchArcade(m.game);
  }
  function handleCuevero(c) {
    Sfx.pickup();
    if (c.to != null) {   // el cuevero del hall te INVITA a pasar a su cueva
      spawnIn(c.to, 4);
      setMsg(T('g.cuevero.enter'), '#7CFC00', 6000);
      return;
    }
    if (c.outcome === 'real') {
      bought = true;
      setMsg(T('g.cuevero.real', { dialog: TX(c.dialog) }), '#ff5252', 7000);
      triggerStorm();
    } else {
      setMsg(c.dialog, '#ffd54f', 4800);
    }
  }
  function redeemChori() {
    if (hasVale) {
      hasVale = false; player.hp = Math.min(100, player.hp + 40);
      setMsg(T('g.chori.eat'), '#7CFC00', 3500); Sfx.pickup();
    } else {
      setMsg(T('g.chori.noVale'), '#FFD54F', 4500);
    }
  }
  function checkSecret() {
    if (secretUnlocked) return;
    if (arcadeWon.pacman && arcadeWon.galaga && arcadeWon.frogger) {
      secretUnlocked = true;
      setMsg(T('g.secret.unlock'), '#ffd54f', 8000);
    }
  }
  function transition(d) {
    current = d.to;
    player.x = d.at.x - player.w/2; player.y = d.at.y - player.h;
    player.vx = 0; player.vy = 0;
    transCd = 0.35;
    updateCam();
    const r = room();
    elFloor.textContent = TX(r.name);
    Sfx.setRoomTrack(r.theme === 'cemento' ? 'metal' : r.theme === 'secret' ? (/Truco/.test(r.name) ? 'telo' : 'dance') : null);
    Sfx.setAmbient(ambientFor(r));   // cama de ambiente por zona (capa aparte de la música)
    if (current === 0 && stormed) { flash(); setMsg(T('g.trans.streetStorm'), '#ff5252', 6500); }
    else if (current === 0) setMsg(T('g.trans.street'), '#4FC3F7', 2500);
    else if (r.theme === 'cambio') { flash(); setMsg(stormed ? T('g.trans.cambioStorm') : T('g.trans.cambioFull'), stormed ? '#ff5252' : '#ffd54f', 6000); }
    else if (r.theme === 'cemento') setMsg(T('g.trans.cemento'), '#ff5252', 5500);
    else if (r.theme === 'lujo') setMsg(T('g.trans.lujo'), '#ffd54f', 5000);
    else if (r.theme === 'ruina') setMsg(T('g.trans.ruina'), '#b0a0a0', 5000);
    else if (r.theme === 'office') setMsg(/Garbarino/.test(r.name) ? T('g.trans.garbarino') : T('g.trans.edu'), '#80cbc4', 4000);
    else if (r.theme === 'arcade') setMsg(stormed ? T('g.trans.arcadeStorm') : T('g.trans.arcade'), stormed ? '#ff5252' : '#ff2e88', 4000);
    else if (r.theme === 'shop') setMsg(T('g.trans.shop'), '#ffd54f', 3500);
    else if (/[Bb][úu]nker/.test(r.name)) setMsg(T('g.trans.bunker'), '#7CFC00', 7000);
    else if (r.theme === 'secret') setMsg(/Truco/.test(r.name) ? T('g.trans.trucoStore') : T('g.trans.secretStore'), '#d8c8b0', 5500);
    else if (r.cueveros && r.cueveros.length) setMsg(T('g.trans.cueveros'), '#7CFC00', 5500);
    else setMsg(T('g.trans.deeper'), '#9fb4c4', 3000);
  }
  // zona → cama de ambiente (calle/viento/cueva/recital); null = sin ambiente
  function ambientFor(r) {
    if (current === 0) return stormed ? 'viento' : 'calle';
    if (!r) return null;
    return r.theme === 'rock' ? 'cueva' : r.theme === 'cemento' ? 'recital' : r.theme === 'ruina' ? 'viento' : null;
  }
  function triggerStorm() {
    if (stormed) return;
    applyEdge('tormenta', 'stormed');
    telOnce('storm', 'storm');
    Sfx.stormBoom(); Sfx.startHum();
    shakeUntil = performance.now() + 900;
    for (const s of states) for (const e of s.enemies) e.hostile = true;
    setMsg(T('g.storm'), '#ff5252', 7000);
  }
  function flash() {
    elFlash.style.background = '#fff'; elFlash.style.transition = 'none'; elFlash.style.opacity = '1';
    requestAnimationFrame(() => { elFlash.style.transition = 'opacity 1s ease-out'; elFlash.style.opacity = '0'; });
  }

  // ---- update ----
  function update(dt) {
    if (state !== 'playing') return;
    time += dt;
    if (transCd > 0) transCd -= dt;
    const r = room(), s = st();

    player.stunned = performance.now() < stunUntil;
    player.update(dt, r, cam);

    // LOOP de supervivencia: tras la tormenta la vida se gasta (-3 cada 30 s). Comé o te morís.
    if (stormed) {
      decayAcc += dt;
      while (decayAcc >= 30) { decayAcc -= 30; player.hp -= 3; if (player.hp <= 0) { player.hp = 0; player.alive = false; } }
    }
    if (!player.alive || player.hp <= 0) {
      if (stormed && loopCount > 0) { reviveToPreviousLoop(); return; }   // morís → volvés al loop anterior
      die(); return;
    }
    updateCam();

    Enemies.update(s.enemies, dt, r, player);
    Bullets.update(dt, r, s.enemies, player, dmg => player.hurt(dmg));
    Particles.update(dt);

    // pickups
    for (const p of s.pickups) {
      if (p.taken) continue;
      if (Math.abs(player.x+player.w/2 - p.x) < 22 && Math.abs(player.y+player.h - p.y) < 40) {
        p.taken = true; Sfx.pickup();
        if (p.type === 'ammo') { player.ammo += p.amount; setMsg(T('g.shop.ammo', { n: p.amount }), '#FFD54F', 1100); }
        else if (p.type === 'coins') { player.coins += p.amount; setMsg(T('g.shop.coins', { n: p.amount }), '#FFC107', 1100); }
        else { player.hp = Math.min(100, player.hp + p.amount); setMsg(T('g.shop.health', { n: p.amount }), '#7CFC00', 1100); }
      }
    }
    // cumbia del músico: suena cuando pasás cerca (y antes de la tormenta)
    let nearMusico = false;
    for (const n of r.npcs || []) {
      if (n.sprite === 'musico' && Math.abs(player.x+player.w/2 - n.x) < 240) { nearMusico = true; break; }
    }
    Sfx.setCumbia(nearMusico && !stormed);

    // vendedor que te sigue (Garbarino): camina hacia vos y siempre quiere venderte algo
    for (const n of r.npcs || []) {
      if (!n.follow) continue;
      const target = player.x + player.w/2 - 26;
      if (Math.abs(target - n.x) > 4) n.x += Math.sign(target - n.x) * Math.min(75*dt, Math.abs(target - n.x));
      n.upCd = (n.upCd || 0) - dt;
      if (n.upCd <= 0 && n.lines) { setMsg(TX(n.lines[(Math.random()*n.lines.length)|0]), '#80cbc4', 2800); n.upCd = 3.5 + Math.random()*2.5; }
    }

    // melee de peatones ya aplicado en Enemies.update; salida:
    if (r.theme === 'cambio' && stormed && r.goal) {
      if (Math.hypot(player.x+player.w/2 - r.goal.x, player.y+player.h - r.goal.y) < 40) win();
    }
    syncHud();
  }

  function syncHud() {
    elHp.textContent = Math.max(0, Math.floor(player.hp));
    elAmmo.textContent = player.ammo;
    elCoins.textContent = player.coins;
    elCaramelos.textContent = player.caramelos;
    if (elVicios) elVicios.textContent = (player.diosa||0) + '·' + (player.carne||0) + '·' + (player.fiambre||0);
    if (elFalopa) elFalopa.textContent = stormed ? ('🌿' + (player.falopa||0) + '  D' + loopCount) : '—';
    if (performance.now() > msgUntil) elMsg.style.opacity = '0';   // fundido de salida (ver --ui-msg-fade)
  }

  // ---- render ----
  function tileImg(r, tx, ty) {
    if (r.theme === 'street') return ty >= r.gTop ? Art.tiles.street : (ty >= 11 ? Art.tiles.maceta : Art.tiles.toldo);
    if (r.theme === 'shop') return Art.tiles.shop;
    if (r.theme === 'office' || r.theme === 'cambio' || r.theme === 'lujo') return Art.tiles.office;
    if (r.theme === 'arcade') return Art.tiles.arcade;
    if (r.theme === 'secret') return Art.tiles.secret;
    return r.theme === 'rock' ? Art.tiles.rock : Art.tiles.concrete;
  }
  function label(txt, x, y, col) {
    ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x - txt.length*3.2, y - 9, txt.length*6.4, 12);
    ctx.fillStyle = col; ctx.fillText(txt, x, y);
  }
  // llama parpadeante (tachos de la barricada del chino). cx/cy = boca del tacho; phase desfasa cada fuego.
  function drawFlame(cx, cy, phase) {
    const t = time * 6 + phase;
    const flick = 1 + 0.18 * Math.sin(t) + 0.1 * Math.sin(t * 2.3 + 1.7);   // titileo
    const h = 22 * flick, w = 9, sway = 2.4 * Math.sin(t * 1.3 + phase);     // se mece de costado
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(cx, cy - 6, 1, cx, cy - 6, 22 * flick);
    glow.addColorStop(0, 'rgba(255,170,40,0.5)'); glow.addColorStop(1, 'rgba(255,120,0,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy - 6, 22 * flick, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ff6a00'; ctx.beginPath(); ctx.moveTo(cx - w, cy); ctx.quadraticCurveTo(cx + sway, cy - h, cx + w, cy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffca28'; ctx.beginPath(); ctx.moveTo(cx - w*0.55, cy); ctx.quadraticCurveTo(cx + sway*1.2, cy - h*0.66, cx + w*0.55, cy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,245,200,0.9)'; ctx.beginPath(); ctx.moveTo(cx - w*0.22, cy); ctx.quadraticCurveTo(cx + sway, cy - h*0.36, cx + w*0.22, cy); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // ninjas que entran corriendo al pogo cuando Iorio toca Pibe Tigre (FX transitorio ~4s, procedural).
  function drawNinjaRunners(e) {
    const r = room(), gy = r.gTop * Level.TILE - cam.y, x0 = 1.5 * Level.TILE - cam.x;
    const fade = e < 3.4 ? 1 : Math.max(0, (4.2 - e) / 0.8);
    for (let i = 0; i < 3; i++) {
      const te = e - i * 0.35; if (te < 0) continue;          // entran escalonados
      drawRunner(x0 + te * 300 + i * 16, gy, time * 13 + i * 2.1, fade);
    }
  }
  function drawRunner(sx, sy, ph, alpha) {
    const step = 4 * Math.sin(ph);
    ctx.save(); ctx.globalAlpha = alpha; ctx.lineCap = 'round';
    ctx.strokeStyle = '#111'; ctx.lineWidth = 4;               // piernas en carrera
    ctx.beginPath(); ctx.moveTo(sx, sy - 14); ctx.lineTo(sx - 5 + step, sy);
    ctx.moveTo(sx, sy - 14); ctx.lineTo(sx + 5 - step, sy); ctx.stroke();
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(sx - 6, sy - 30, 12, 18);   // torso
    ctx.beginPath(); ctx.arc(sx, sy - 34, 5, 0, Math.PI*2); ctx.fill();  // cabeza
    ctx.fillStyle = '#b71c1c'; ctx.fillRect(sx - 6, sy - 37, 12, 3);     // vincha roja
    ctx.fillStyle = '#caa070'; ctx.fillRect(sx - 4, sy - 34, 8, 2);      // franja de ojos
    ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 3;            // brazo hacia adelante
    ctx.beginPath(); ctx.moveTo(sx, sy - 26); ctx.lineTo(sx + 9 + step, sy - 22); ctx.stroke();
    ctx.strokeStyle = '#cfd8dc'; ctx.lineWidth = 2;            // katana a la espalda
    ctx.beginPath(); ctx.moveTo(sx - 6, sy - 28); ctx.lineTo(sx - 16, sy - 40); ctx.stroke();
    ctx.restore();
  }
  function render() {
    const r = room(), s = st();
    // fondo
    if (r.theme === 'street') Art.drawStreetBg(ctx, cam.x, W, H, stormed);
    else if (r.theme === 'shop') Art.drawShopBg(ctx, cam.x, W, H);
    else if (r.theme === 'office' || r.theme === 'cambio' || r.theme === 'lujo') Art.drawOfficeBg(ctx, cam.x, W, H);
    else if (r.theme === 'arcade') Art.drawArcadeBg(ctx, cam.x, W, H);
    else if (r.theme === 'secret') Art.drawSecretBg(ctx, cam.x, W, H);
    else if (r.theme === 'cemento') {
      ctx.fillStyle = '#0c0a0e'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(183,28,28,0.12)'; ctx.fillRect(0, 0, W, H*0.45);
      for (let i = 0; i < 3; i++) { ctx.fillStyle = 'rgba(255,40,40,0.06)'; ctx.fillRect(((140+i*230 - cam.x*0.4) % (W+200)), 0, 50, H); }
    }
    else Art.drawCaveBg(ctx, cam.x, W, H, r.theme);

    // edificios de la calle (cada puerta es un edificio distinto)
    if (r.theme === 'street')
      for (const d of r.doors) Art.drawBuilding(ctx, d.x - cam.x, r.gTop*TILE - cam.y, d.facade);

    // tiles
    const t0 = Math.max(0, Math.floor(cam.x/TILE)), t1 = Math.min(r.w-1, Math.floor((cam.x+W)/TILE));
    for (let tx = t0; tx <= t1; tx++)
      for (let ty = 0; ty < r.h; ty++)
        if (r.map[ty][tx] === 1) ctx.drawImage(tileImg(r, tx, ty), tx*TILE - cam.x, ty*TILE - cam.y);

    // decoración (no colisiona): árboles, faroles, bancos, tachos
    for (const d of r.decor || []) {
      const img = Art.decor[d.type];
      if (img) ctx.drawImage(img, d.x - cam.x - img.width/2, d.feetY - cam.y - img.height);
    }

    // puertas
    for (const d of r.doors) {
      if (d.id === 'secret' && !secretUnlocked) continue;
      if (d.id === 'cemento' && !player.hasCementoTicket) continue;
      if (d.id === 'bunker' && !bunkerUnlocked) continue;
      if (d.id === 'chinoback' && !stormed) continue;
      const img = Art.items[DOOR_ART[d.art] || 'door'];
      ctx.drawImage(img, d.x - cam.x - img.width/2, d.y - cam.y - img.height);
      // la puerta del tahúr: si todavía no le ganaste, queda CERRADA con un cartelito
      if (d.id === 'chinotruco' && !trucoWon) label(T('g.label.tahurDoor'), d.x - cam.x, d.y - cam.y - img.height - 4, '#ffd54f');
      // frente del chino atrincherado tras la tormenta (hasta que Iorio corra a los ninjas)
      if (d.id === 'super' && stormed && !chinoFrontOpen) {
        const b = Art.decor.barricada;
        const bx = d.x - cam.x - b.width/2, by = d.y - cam.y - b.height;
        ctx.drawImage(b, bx, by);
        drawFlame(bx + 13, by + 50, 0);        // tacho izquierdo (boca a h-26)
        drawFlame(bx + 73, by + 50, 2.1);      // tacho derecho (desfasado)
        label(T('g.label.barricada'), d.x - cam.x, d.y - cam.y - b.height - 4, '#ff5252');
      }
      // RF-7: edificios derrumbados tras la tormenta (tablones sobre la puerta)
      if (stormed && COLLAPSED.includes(d.id)) {
        const tb = Art.decor.tablones;
        ctx.drawImage(tb, d.x - cam.x - tb.width/2, d.y - cam.y - tb.height);
        label(T('g.label.clausurado'), d.x - cam.x, d.y - cam.y - tb.height - 4, '#b0a0a0');
      }
      if (d.id === 'secret') {
        const mi = Art.npc.misterioso, mx = d.x - cam.x - 46;
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(mx + mi.width/2, d.y - cam.y, 12, 4, 0, 0, Math.PI*2); ctx.fill();
        ctx.drawImage(mi, mx, d.y - cam.y - mi.height);
        label(T('g.label.psst'), mx + mi.width/2, d.y - cam.y - mi.height - 4, '#ffd54f');
      }
    }
    // máquinas de arcade
    for (const m of r.machines || []) {
      const img = Art.machines[m.game];
      ctx.drawImage(img, m.x - cam.x - img.width/2, m.y - cam.y - img.height);
      label(TX(m.name), m.x - cam.x, m.y - cam.y - img.height - 4, '#ff2e88');
    }
    // NPCs amistosos (EducaciónIT)
    for (const n of r.npcs || []) {
      if (n.invisible) continue;   // ej. el "linyera de las joyas": aparece recién al tocarlas
      const img = Art.npc[n.sprite] || Art.npc.civil1;
      ctx.drawImage(img, n.x - cam.x - img.width/2, n.y - cam.y - img.height);
      label(TX(n.name), n.x - cam.x, n.y - cam.y - img.height - 4, '#aef0c0');
    }
    // portal (calle, tras la tormenta)
    if (r.theme === 'cambio' && stormed && r.goal) {
      const pf = Art.portal[Math.floor(time*8) % Art.portal.length];
      ctx.drawImage(pf, r.goal.x - cam.x - pf.width/2, r.goal.y - cam.y - pf.height);
    }
    // cueveros (las tres cuevas)
    for (const c of r.cueveros || []) {
      const img = Art.npc.cuevero;
      ctx.drawImage(img, c.x - cam.x - img.width/2, c.y - cam.y - img.height);
      label(TX(c.name), c.x - cam.x, c.y - cam.y - img.height - 4, '#7CFC00');
    }
    // pickups
    for (const p of s.pickups) {
      if (p.taken) continue;
      const img = p.type === 'ammo' ? Art.items.ammo : p.type === 'coins' ? Art.items.coin : Art.items.health;
      const yy = p.y - cam.y - img.height - 4 + Math.sin(time*3 + p.x)*3;
      ctx.drawImage(img, p.x - cam.x - img.width/2, yy);
    }
    // enemigos, jugador, balas, partículas
    for (const e of s.enemies) Enemies.draw(e, ctx, cam, stormed);
    player.draw(ctx, cam);
    Bullets.draw(ctx, cam);
    Particles.draw(ctx, cam);
    // ninjas yéndose al pogo cuando Iorio toca (solo en Cemento, ~4s tras dar la falopa)
    if (current === ninjaRunRoom && time - ninjaRunT < 4.2) drawNinjaRunners(time - ninjaRunT);
    if (typeof Ads !== 'undefined') Ads.draw(ctx, current, cam, W, H);   // publicidad (capa aditiva, ver specs/publicidad.md)

    drawLight(r);
    drawPost();
    if (r.theme === 'secret' || r.theme === 'cemento') drawSmoke();
    updatePrompt();

    if (performance.now() < shakeUntil) canvas.style.transform = `translate(${(Math.random()-.5)*8}px,${(Math.random()-.5)*8}px)`;
    else if (canvas.style.transform) canvas.style.transform = '';
  }

  function drawLight(r) {
    const base = r.stormable ? (stormed ? 0.42 : 1.0) : r.light;
    let dark = 1 - base;
    if (!r.stormable) dark += Math.sin(time*7)*0.03 + (Math.random()-.5)*0.02; // vela
    if (dark <= 0.03) return;
    lctx.clearRect(0, 0, W, H);
    lctx.fillStyle = `rgba(3,4,10,${Math.min(0.92, dark)})`; lctx.fillRect(0, 0, W, H);
    lctx.globalCompositeOperation = 'destination-out';
    const focus = [];
    const px = player.x - cam.x + player.w/2, py = player.y - cam.y + player.h/2;
    focus.push({ x: px, y: py, r: 150 + Math.sin(time*9)*8, soft: 0.55 });
    if (player.muzzle > 0) focus.push({ x: px + player.aim.x*24, y: player.y - cam.y + 14 + player.aim.y*24, r: 90, soft: 0.3 });
    if (r.theme === 'cambio' && stormed && r.goal) focus.push({ x: r.goal.x - cam.x, y: r.goal.y - cam.y - 40, r: 80, soft: 0.4 });
    for (const f of focus) {
      const g = lctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.65, `rgba(255,255,255,${f.soft})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      lctx.fillStyle = g; lctx.beginPath(); lctx.arc(f.x, f.y, f.r, 0, Math.PI*2); lctx.fill();
    }
    lctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(lightCanvas, 0, 0);
  }

  function drawPost() {
    if (player.hp < 35 && player.alive) {
      ctx.fillStyle = `rgba(150,0,0,${0.10 + 0.08*Math.sin(time*6)})`; ctx.fillRect(0, 0, W, H);
    }
    if (stormed && Math.random() < 0.10) {
      const gy = Math.random()*H, gh = 4 + Math.random()*14, dx = (Math.random()-.5)*16;
      try { const sl = ctx.getImageData(0, gy, W, gh); ctx.putImageData(sl, dx, gy); } catch (e) {}
      ctx.fillStyle = `rgba(${Math.random()<.5?'255,0,60':'0,200,255'},0.05)`; ctx.fillRect(0, gy, W, gh);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
  }

  function drawSmoke() {
    ctx.save();
    for (let i = 0; i < 16; i++) {
      const x = (((i*97 + time*(10 + (i%3)*8)) % (W+140)) + W+140) % (W+140) - 70;
      const y = 50 + ((i*53) % (H-110));
      const rad = 38 + (i%4)*16;
      ctx.fillStyle = `rgba(205,205,210,${0.035 + (i%3)*0.013})`;
      ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }
  function updatePrompt() {
    if (state !== 'playing') { elPrompt.classList.add('hidden'); return; }
    const it = nearestInteract();
    if (!it) { elPrompt.classList.add('hidden'); return; }
    let txt;
    if (it.kind === 'cuevero') txt = T('g.prompt.cuevero');
    else if (it.kind === 'npc') {
      const a = it.n.action;
      txt = a === 'fighter' ? T('g.prompt.fighter')
        : a === 'chori' ? T('g.prompt.chori')
        : a === 'shop' ? T('g.prompt.shop', { cost: it.n.sells.cost, cur: T('g.cur.' + (it.n.sells.pay === 'caramelos' ? 'caramelos' : it.n.sells.pay === 'forros' ? 'forros' : 'monedas')) })
        : a === 'lujo' ? (stormed ? T('g.prompt.lujoStorm') : T('g.prompt.lujo'))
        : a === 'totem' ? T('g.prompt.totem')
        : a === 'tesoro' ? T(tesoroTaken ? 'g.prompt.tesoroDone' : 'g.prompt.tesoro')
        : a === 'limosna' ? (stormed ? T('g.prompt.limosna') : T('g.prompt.talk', { name: TX(it.n.name) }))
        : a === 'iorio' ? (stormed ? T('g.prompt.iorioStorm') : T('g.prompt.iorio'))
        : a === 'armas' ? (stormed ? T('g.prompt.armasStorm') : T('g.prompt.armas'))
        : a === 'chat' ? T('g.prompt.chat', { name: TX(it.n.name) || TX('el linyera') })
        : a === 'loop' ? T('g.prompt.loop')
        : T('g.prompt.talk', { name: TX(it.n.name) });
    }
    else if (it.kind === 'machine') {
      const m = it.m;
      if (stormed) txt = T('g.prompt.machinePossessed');
      else if (m.game === 'pacman' || m.game === 'galaga') txt = T('g.prompt.machinePay', { name: m.name, price: machinePrice(m) });
      else txt = T('g.prompt.machine', { name: m.name });
    }
    else if (stormed && COLLAPSED.includes(it.d.id)) txt = T('g.prompt.collapsed');
    else txt = TX(it.d.label);
    elPrompt.innerHTML = '<span class="key">E</span>' + txt;
    elPrompt.classList.remove('hidden');
  }

  // ---- fin ----
  // resumen de la partida para la pantalla de fin: números + checklist de hitos.
  function gameStats(won) {
    let items = 0;
    if (states) for (const s of states) for (const pk of s.pickups) if (pk.taken) items++;
    const hitos = [
      { k: 'g.hito.tormenta',  done: stormed },
      { k: 'g.hito.edificio',  done: borrachosHappy },
      { k: 'g.hito.bunker',    done: bunkerUnlocked },
      { k: 'g.hito.iorio',     done: chinoFrontOpen },
      { k: 'g.hito.truco',     done: trucoWon },
      { k: 'g.hito.fifa',      done: fifaWon },
      { k: 'g.hito.megadrive', done: !!(player && player.hasMegaDrive) },
      { k: 'g.hito.cemento',   done: !!(player && player.hasCementoTicket) },
      { k: 'g.hito.armado',    done: armado },
      { k: 'g.hito.tesoro',    done: tesoroTaken },
      { k: 'g.hito.portal',    done: !!won },
    ];
    return { coins: (player && player.coins) | 0, days: loopCount, items, hitos,
      done: hitos.filter(h => h.done).length, total: hitos.length };
  }
  function renderStats(won) {
    if (!elEndStats) return;
    const s = gameStats(won);
    const row = (icon, label, val) => '<div class="end-stat"><span>' + icon + ' ' + label + '</span><b>' + val + '</b></div>';
    let html = '<div class="end-stats-title">' + T('g.stats.title') + '</div><div class="end-stats-grid">';
    html += row('🪙', T('g.stats.coins'), s.coins);
    html += row('🌙', T('g.stats.days'),  s.days);
    html += row('🎁', T('g.stats.items'), s.items);
    html += row('🏆', T('g.stats.hitos'), s.done + '/' + s.total);
    html += '</div><ul class="end-hitos">' + s.hitos.map(h =>
      '<li class="' + (h.done ? 'done' : 'miss') + '">' + (h.done ? '✓' : '·') + ' ' + T(h.k) + '</li>').join('') + '</ul>';
    elEndStats.innerHTML = html;
  }
  // "TU PARTIDA" (métricas in-game, client-side — specs/metricas-in-game.md F1). Abrible con [P] mientras jugás.
  function showMyStats() {
    const el = document.getElementById('myStatsBody'), ov = document.getElementById('mystats');
    if (!el || !ov) return;
    const s = gameStats(false);
    const mins = Math.max(0, sessStart ? (((typeof performance !== 'undefined' ? performance.now() : Date.now()) - sessStart) / 60000) : 0) | 0;
    const row = (icon, label, val) => '<div class="end-stat"><span>' + icon + ' ' + label + '</span><b>' + val + '</b></div>';
    let html = '<div class="end-stats-title">' + T('g.mystats.title') + '</div><div class="end-stats-grid">';
    html += row('⚙️', T('g.mystats.engine'), (engineUsed || 'v1').toUpperCase());
    html += row('⏱️', T('g.mystats.time'), mins + 'm');
    html += row('💬', T('g.mystats.chats'), sessChats);
    html += row('🃏', T('g.mystats.truco'), sessTrucoW + '/' + (sessTrucoW + sessTrucoL));
    html += row('🪙', T('g.stats.coins'), (player && player.coins) | 0);
    html += row('🌸', T('g.mystats.flores'), (player && player.flores) | 0);
    html += row('🌙', T('g.stats.days'), s.days);
    html += row('🏆', T('g.stats.hitos'), s.done + '/' + s.total);
    html += '</div><ul class="end-hitos">' + s.hitos.map(h =>
      '<li class="' + (h.done ? 'done' : 'miss') + '">' + (h.done ? '✓' : '·') + ' ' + T(h.k) + '</li>').join('') + '</ul>';
    el.innerHTML = html; ov.classList.remove('hidden');
  }
  function closeMyStats() { const ov = document.getElementById('mystats'); if (ov) ov.classList.add('hidden'); }
  function win() {
    if (state === 'win') return;
    state = 'win'; running = false; Sfx.stopHum(); Sfx.stopAmbient(); Sfx.win();
    tel('win', { engine: engineUsed });
    if (typeof SaveStore !== 'undefined' && SaveStore.clear) SaveStore.clear();   // terminaste: borrá el guardado
    elEndTitle.textContent = T('g.win.title'); elEndTitle.style.color = '#4FC3F7';
    elEndText.innerHTML = T('g.win.text'); renderStats(true);
    showEnd();
  }
  function die() {
    if (state === 'dead') return;
    state = 'dead'; running = false; Sfx.stopHum(); Sfx.stopAmbient();
    tel('death', { engine: engineUsed });
    if (typeof SaveStore !== 'undefined' && SaveStore.clear) SaveStore.clear();   // moriste de verdad: guardado a la basura
    elEndTitle.textContent = T('g.die.title'); elEndTitle.style.color = '#ff5252';
    elEndText.innerHTML = T('g.die.text'); renderStats(false);
    showEnd();
  }
  function showEnd() {
    elEnd.classList.remove('hidden'); elHud.classList.add('hidden');
    elPrompt.classList.add('hidden'); elFloor.classList.add('hidden');
  }

  // ---- loop ----
  let lastBeat = 0, freezeReported = false;
  function loop(t) {
    if (!running) return;
    lastBeat = (typeof performance !== 'undefined' ? performance.now() : Date.now());   // latido para el watchdog de freeze
    if (freezeReported) freezeReported = false;                                          // se recuperó del freeze
    const dt = Math.min(0.04, (t - lastT)/1000) || 0; lastT = t;
    autosave(t);
    if (state === 'arcade' && arcadeGame) {
      arcadeGame.update(dt); arcadeGame.draw(ctx, W, H);
      if (arcadeGame.done) {
        const kind = arcadeGame.kind, res = arcadeGame.result, flores = arcadeGame.floresDelta || 0, oppTruco = arcadeGame.opp;
        arcadeGame = null; state = 'playing'; transCd = 0.35;
        elHud.classList.remove('hidden'); elFloor.classList.remove('hidden');
        if (res === 'win' && (kind === 'pacman' || kind === 'galaga' || kind === 'frogger')) arcadeWon[kind] = true;
        if (kind === 'truco') {
          tel('truco', { result: res, engine: oppTruco }); if (res === 'win') sessTrucoW++; else sessTrucoL++;   // "Tu partida"
          if (oppTruco === 'maquina') {
            // TRUCOTRON (máquina arcade): premio en FLORES, sin minas/puerta/penalidad — jugás de a una mano
            if (flores > 0) player.flores = (player.flores || 0) + flores;
            setMsg(T(res === 'win' ? 'g.truco.mWin' : 'g.truco.mLose', { n: flores }), res === 'win' ? '#7CFC00' : '#d8c8b0', 5000);
          } else if (res === 'win') {   // EL TAHÚR (antro): flores + las minas te afanan + abre la puerta al chino
            player.flores = (player.flores || 0) + flores;
            const robbed = Math.min(player.coins, 25 + (Math.random()*35|0));
            player.coins -= robbed; stunUntil = performance.now() + 2600;
            applyEdge('truco', 'trucoWon');   // ganar abre la PUERTA DEL TAHÚR al chino (se cruza una vez)
            setMsg(T('g.truco.win', { n: robbed }), '#ff5252', 7000);
          }
          else { player.hp = Math.max(1, player.hp - 25); setMsg(T('g.truco.lose'), '#ff5252', 6800); }
        } else if (kind === 'frogger' && challengeForVale) {
          if (res === 'win') { hasVale = true; setMsg(T('g.frogger.valeWin'), '#7CFC00', 6000); }
          else setMsg(T('g.frogger.valeLose'), '#ff5252', 4000);
          challengeForVale = false;
        } else if (kind === 'frogger') {
          if (res === 'win') { player.coins += 8; setMsg(T('g.frogger.win'), '#7CFC00', 3000); }
          else setMsg(T('g.frogger.lose'), '#ff5252', 2500);
        } else if (res === 'win') { // pac-man / galaga
          player.coins += 10;
          if (kind === 'pacman') { player.ammo += 6; setMsg(T('g.pacman.win'), '#7CFC00', 4000); }
          else { player.hp = Math.min(100, player.hp + 20); setMsg(T('g.galaga.win'), '#7CFC00', 4000); }
        } else setMsg(T('g.arcade.gameover'), '#9fd3ff', 2800);
        checkSecret();
      }
    } else if (state === 'super' && superGame) {
      superGame.update(dt); superGame.draw(ctx, W, H);
      if (superGame.done) {
        const to = superGame.exitTo; superGame = null; state = 'playing'; transCd = 0.35;
        elHud.classList.remove('hidden'); elFloor.classList.remove('hidden');
        if (to === 'cueva') enterCuevaFromSecret();
        else setMsg(T('g.super.leave'), '#FFC107', 3000);
      }
    } else if (state === 'vinilos' && vinilosGame) {
      vinilosGame.update(dt); vinilosGame.draw(ctx, W, H);
      if (vinilosGame.done) {
        vinilosGame = null; state = 'playing'; transCd = 0.35;
        elHud.classList.remove('hidden'); elFloor.classList.remove('hidden'); Sfx.stopEighties();
        setMsg(T('g.vinilos.leave'), '#e0b0ff', 2500);
      }
    } else {
      update(dt); render();
    }
    requestAnimationFrame(loop);
  }
  function start() {
    reset();
    sessStart = (typeof performance !== 'undefined' ? performance.now() : Date.now()); sessChats = 0; sessTrucoW = 0; sessTrucoL = 0;
    tel('session', { engine: engineUsed, lang: (typeof I18n !== 'undefined' && I18n.short) ? I18n.short() : 'es' });   // ¿cuántos en v1 vs v2?
    if (typeof Mensajero !== 'undefined') Mensajero.init({ state: historiaState, at: currentAt });   // cablea el cerebro (grafo)
    elIntro.classList.add('hidden'); elEnd.classList.add('hidden');
    elHud.classList.remove('hidden'); elFloor.classList.remove('hidden');
    Sfx.init(); Sfx.startMusic(); Sfx.setAmbient(ambientFor(room()));
    running = true; lastT = performance.now();
    requestAnimationFrame(loop);
  }

  Input.bind(canvas);
  // red de visibilidad: errores JS de runtime → beacon (con el tag del motor) para verlos en Grafana
  if (typeof window !== 'undefined' && window.addEventListener)
    window.addEventListener('error', e => { reportClientError('runtime: ' + (e && e.message), e && e.error); });
  // WATCHDOG de FREEZE: si el loop se cuelga (gap > 5s con la pestaña visible) → reporta 'freeze' (caza "v2 se traba")
  if (typeof setInterval !== 'undefined') setInterval(() => {
    if (!running || freezeReported) return;
    if (typeof document !== 'undefined' && document.hidden) return;          // pestaña en 2º plano no cuenta
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if (lastBeat && now - lastBeat > 5000) {
      freezeReported = true; tel('freeze', { engine: engineUsed });
      // si v2 se trabó → auto-degradar a v1 en la PRÓXIMA carga (completa el auto-fallback para el caso runtime)
      if (engineUsed === 'v2') { try { localStorage.setItem('ts_engine', 'v1'); } catch (e) {} }
      console.warn('[ts] freeze detectado (' + ((now - lastBeat)/1000 | 0) + 's) motor=' + engineUsed + (engineUsed === 'v2' ? ' → degradado a v1' : ''));
    }
  }, 2500);
  document.addEventListener('keydown', e => {
    // ESC cierra el chat SIEMPRE (tenga o no el foco el input; si no, quedás trabado en state='chat')
    if (e.key === 'Escape' && state === 'chat') { e.preventDefault(); closeChat(); return; }
    const myst = document.getElementById('mystats');
    if (e.key === 'Escape' && myst && !myst.classList.contains('hidden')) { e.preventDefault(); closeMyStats(); return; }
    if (e.target && /^(input|textarea)$/i.test(e.target.tagName)) return;   // escribiendo (chat) → no gatillar
    const k = e.key.toLowerCase();
    if (k === 'e') interact();
    else if (k === 'm') { const on = Sfx.toggleMusic(); setMsg(on ? T('g.music.on') : T('g.music.off'), '#9fd3ff', 1200); }
    else if (k === 'p' && (state === 'playing')) { if (myst && myst.classList.contains('hidden')) showMyStats(); else closeMyStats(); }   // "Tu partida"
  });
  document.getElementById('startBtn').addEventListener('click', start);
  document.getElementById('restartBtn').addEventListener('click', start);
  { const b = document.getElementById('myStatsClose'); if (b) b.addEventListener('click', closeMyStats); }
  document.getElementById('chat-send').addEventListener('click', chatSend);
  document.getElementById('chat-close').addEventListener('click', closeChat);
  elChatInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); chatSend(); }
    else if (e.key === 'Escape') { e.preventDefault(); closeChat(); }   // (el handler global también lo cubre si pierde foco)
  });

  // toggle del MOTOR (v1/v2) en ⚙ Opciones. Persiste en localStorage; aplica al (re)empezar.
  (function () {
    const b = typeof document !== 'undefined' && document.getElementById ? document.getElementById('opt-engine') : null;
    if (!b) return;
    const cur = () => { try { return localStorage.getItem('ts_engine') === 'v1' ? 'v1' : 'v2'; } catch (e) { return 'v2'; } };   // default v2
    const refresh = () => { b.textContent = cur(); };
    refresh();
    b.addEventListener('click', () => {
      const next = cur() === 'v2' ? 'v1' : 'v2';
      try { localStorage.setItem('ts_engine', next); } catch (e) {}
      refresh();
    });
  })();

  // API mínima para la capa de guardado (js/save.js). El estado sigue privado: solo exponemos
  // el snapshot y el "continuar". Sin esta capa, el juego anda igual (nadie llama a esto).
  if (typeof window !== 'undefined') window.Game = Object.assign(window.Game || {}, { serialize, continueGame });
})();
