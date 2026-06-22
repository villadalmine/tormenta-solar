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
  let chatNpc = null, chatHistory = [], chatBusy = false, hintAsks = 0;

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

  const room = () => rooms[current];
  const st = () => states[current];

  function reset() {
    rooms = Level.build();
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
    loopCount = 0; chinoFrontOpen = false; decayAcc = 0; trucoWon = false;   // loop de supervivencia, de cero
    arcadeGame = null; superGame = null; vinilosGame = null;
    Bullets.clear(); Particles.clear(); Sfx.stopHum();
    state = 'playing';
    elFloor.textContent = TX(rooms[0].name);
    setMsg(T('g.start'), '#FFD54F', 6000);
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
      if (d.id === 'chinotruco' && !trucoWon) continue; // la puerta del tahúr se abre al ganar el truco
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
      else if (it.d.id === 'chinotruco') { trucoWon = false; enterSuper(); }  // puerta del tahúr (se consume)
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
  function launchArcade(game) { arcadeGame = Arcade.create(game); state = 'arcade'; elPrompt.classList.add('hidden'); elHud.classList.add('hidden'); elFloor.classList.add('hidden'); }
  function handleNpc(n) {
    if (n.action === 'frogger') { challengeForVale = true; setMsg(T('g.frogger.start'), '#ff2e88', 1000); launchArcade('frogger'); }
    else if (n.action === 'chori') redeemChori();
    else if (n.action === 'truco') { setMsg(T('g.truco.sit'), '#ffd54f', 1000); launchArcade('truco'); }
    else if (n.action === 'shop') buyFromShop(n);
    else if (n.action === 'borracho') giveBorracho(n);
    else if (n.action === 'lujo') handleLujo(n);
    else if (n.action === 'totem') grabTotem(n);
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
      bunkerUnlocked = true; Sfx.win();
      setMsg(T('g.totem.first'), '#7CFC00', 9000);
    } else {
      setMsg(T('g.totem.again'), '#aef0c0', 3500);
    }
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
  }
  function resetLoopResources() {            // cajones de falopa y limosnas se renuevan cada loop
    for (const rm of rooms) for (const n of rm.npcs || []) { n.falopaTaken = false; n.limosnaTaken = false; }
  }
  function reviveToPreviousLoop() {
    loopCount = Math.max(0, loopCount - 1);
    player.alive = true; player.hp = 100; decayAcc = 0; player.falopa = 0;
    resetLoopResources(); chinoFrontOpen = false;
    const idx = bunkerUnlocked ? rooms.findIndex(r => /[Bb][úu]nker/.test(r.name)) : rooms.findIndex(r => r.cueveros);
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
    player.falopa--; chinoFrontOpen = true; Sfx.win();
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
  function historiaState() {
    return { stormed, borrachosHappy, bunkerUnlocked, chinoFrontOpen, trucoWon };
  }
  // lugar actual → tag del grafo (para la cercanía del oráculo)
  function currentAt() {
    const n = (room() && room().name) || '';
    if (/[Cc]ueva/.test(n)) return 'cueva';
    if (/Cemento/.test(n)) return 'cemento';
    if (/[Cc]ambio/.test(n)) return 'cambio';
    if (/[Aa]rcade|[Tt]ruco|trastienda/.test(n)) return 'arcade';
    if (/Edificio|Piso/.test(n)) return 'edificio';
    return 'calle';
  }
  // ¿es el linyera filósofo (el guía/oráculo)?
  const isOraculo = n => n && n.persona === 'filosofo';
  function showHint(level) {
    if (typeof HintEngine === 'undefined') return;
    const h = HintEngine.next(historiaState(), { at: currentAt(), insistencia: level });
    if (h) chatLine('npc', '💡 ' + h.text);
  }

  function openChat(n) {
    if (typeof AI === 'undefined') { setMsg(TX(n.dialog) || '“...”', '#aef0c0', 4000); return; }
    chatNpc = n; chatHistory = []; chatBusy = false; hintAsks = 0;
    elChatTitle.textContent = '💬 ' + (TX(n.name) || T('chat.title'));
    elChatLog.innerHTML = '';
    chatLine('sys', AI.mode() === 'offline' ? T('g.chat.offline') : T('g.chat.online', { mode: AI.mode() }));
    if (n.dialog) chatLine('npc', TX(n.dialog));
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
    const msg = (elChatInput.value || '').trim();
    if (!msg) return;
    elChatInput.value = ''; chatLine('you', msg);
    chatHistory.push({ role: 'user', content: msg });
    chatBusy = true;
    const thinking = chatLine('sys', '...');
    let reply;
    try { reply = await AI.chat(chatNpc.persona || 'filosofo', msg, chatHistory); }
    catch (e) { reply = T('g.chat.error'); }
    thinking.remove();
    chatLine('npc', reply);
    chatHistory.push({ role: 'assistant', content: reply });
    // el linyera oráculo: cada vez que le repreguntás, sube el nivel de spoiler (0→3: más claro hasta directo)
    if (isOraculo(chatNpc)) showHint(Math.min(++hintAsks, 3));
    // si había key pero la respuesta salió local → avisar (no confundir al jugador)
    if (typeof AI !== 'undefined' && AI.lastSource() === 'local' && AI.getKey()) {
      chatLine('sys', T('g.chat.localWarn'));
    }
    chatBusy = false;
    if (elChatInput) elChatInput.focus();
  }
  function buyArmas(n) {
    // el misterioso de la galería: con la tormenta, las armas eléctricas no sirven → fierro criollo
    if (!stormed) { setMsg(T('g.armas.preStorm'), '#9fd3ff', 5000); return; }
    if (n.armado) { setMsg(T('g.armas.done'), '#aef0c0', 3000); return; }
    const cost = 15;
    if (player.coins < cost) { setMsg(T('g.armas.noCoins', { cost }), '#ff5252', 4000); Sfx.empty(); return; }
    player.coins -= cost; n.armado = true;
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
    fifaWon = true; player.coins += 30; Sfx.win();
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
        borrachosHappy = true; gaveBeers = true;
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
  function enterSuper() { superGame = Super.create({ player, gaveBeers, stormed }); state = 'super'; elPrompt.classList.add('hidden'); elHud.classList.add('hidden'); elFloor.classList.add('hidden'); elMsg.textContent = ''; }
  function enterVinilos() { vinilosGame = Vinilos.create({ player }); state = 'vinilos'; elPrompt.classList.add('hidden'); elHud.classList.add('hidden'); elFloor.classList.add('hidden'); elMsg.textContent = ''; Sfx.startEighties(); }
  function enterCuevaFromSecret() {
    const idx = rooms.findIndex(r => r.cueveros);
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
      if (arcadeWon.pacman && arcadeWon.galaga && arcadeWon.frogger) { challengeForVale = false; launchArcade('truco'); }
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
    else if (r.cueveros) setMsg(T('g.trans.cueveros'), '#7CFC00', 5500);
    else setMsg(T('g.trans.deeper'), '#9fb4c4', 3000);
  }
  function triggerStorm() {
    if (stormed) return;
    stormed = true;
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
      if (d.id === 'chinotruco' && !trucoWon) continue;
      const img = Art.items[DOOR_ART[d.art] || 'door'];
      ctx.drawImage(img, d.x - cam.x - img.width/2, d.y - cam.y - img.height);
      // frente del chino atrincherado tras la tormenta (hasta que Iorio corra a los ninjas)
      if (d.id === 'super' && stormed && !chinoFrontOpen) {
        const b = Art.decor.barricada;
        ctx.drawImage(b, d.x - cam.x - b.width/2, d.y - cam.y - b.height);
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
  function win() {
    if (state === 'win') return;
    state = 'win'; running = false; Sfx.stopHum(); Sfx.win();
    elEndTitle.textContent = T('g.win.title'); elEndTitle.style.color = '#4FC3F7';
    elEndText.innerHTML = T('g.win.text');
    showEnd();
  }
  function die() {
    if (state === 'dead') return;
    state = 'dead'; running = false; Sfx.stopHum();
    elEndTitle.textContent = T('g.die.title'); elEndTitle.style.color = '#ff5252';
    elEndText.innerHTML = T('g.die.text');
    showEnd();
  }
  function showEnd() {
    elEnd.classList.remove('hidden'); elHud.classList.add('hidden');
    elPrompt.classList.add('hidden'); elFloor.classList.add('hidden');
  }

  // ---- loop ----
  function loop(t) {
    if (!running) return;
    const dt = Math.min(0.04, (t - lastT)/1000) || 0; lastT = t;
    if (state === 'arcade' && arcadeGame) {
      arcadeGame.update(dt); arcadeGame.draw(ctx, W, H);
      if (arcadeGame.done) {
        const kind = arcadeGame.kind, res = arcadeGame.result, fd = arcadeGame.forrosDelta || 0;
        arcadeGame = null; state = 'playing'; transCd = 0.35;
        elHud.classList.remove('hidden'); elFloor.classList.remove('hidden');
        if (res === 'win' && (kind === 'pacman' || kind === 'galaga' || kind === 'frogger')) arcadeWon[kind] = true;
        if (kind === 'truco') {
          if (res === 'win') {
            const robbed = Math.min(player.coins, 25 + (Math.random()*35|0));
            player.coins -= robbed; stunUntil = performance.now() + 2600;
            trucoWon = true;   // ganar abre la PUERTA DEL TAHÚR al chino (se cruza una vez)
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
    elIntro.classList.add('hidden'); elEnd.classList.add('hidden');
    elHud.classList.remove('hidden'); elFloor.classList.remove('hidden');
    Sfx.init(); Sfx.startMusic();
    running = true; lastT = performance.now();
    requestAnimationFrame(loop);
  }

  Input.bind(canvas);
  document.addEventListener('keydown', e => {
    if (e.target && /^(input|textarea)$/i.test(e.target.tagName)) return;   // escribiendo (chat) → no gatillar
    const k = e.key.toLowerCase();
    if (k === 'e') interact();
    else if (k === 'm') { const on = Sfx.toggleMusic(); setMsg(on ? T('g.music.on') : T('g.music.off'), '#9fd3ff', 1200); }
  });
  document.getElementById('startBtn').addEventListener('click', start);
  document.getElementById('restartBtn').addEventListener('click', start);
  document.getElementById('chat-send').addEventListener('click', chatSend);
  document.getElementById('chat-close').addEventListener('click', closeChat);
  elChatInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); chatSend(); }
    else if (e.key === 'Escape') closeChat();
  });
})();
