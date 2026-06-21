// game.js — run & gun lateral: loop, cámara, iluminación, cuartos y tormenta.
(() => {
  const canvas = document.getElementById('screen');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const TILE = Level.TILE;

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
  const elMsg = document.getElementById('msg');
  const elFlash = document.getElementById('flash');
  const elFloor = document.getElementById('floorName');
  const elPrompt = document.getElementById('prompt');

  let rooms, states, current, player, cam;
  let state = 'intro', stormed = false, bought = false, hasVale = false, challengeForVale = false;
  let secretUnlocked = false;
  const arcadeWon = { pacman: false, galaga: false, frogger: false };
  let lastT = 0, running = false, msgUntil = 0, shakeUntil = 0, time = 0, transCd = 0;

  const DOOR_ART = { galeria: 'door', up: 'doorUp', exit: 'exit', educacionit: 'educacionit', arcade: 'arcade', elevator: 'elevator', superchino: 'superchino', garbarino: 'garbarino', disqueria: 'disqueria', cemento: 'cemento', cambio: 'cambio', abandonado: 'abandonado' };
  let arcadeGame = null, superGame = null, vinilosGame = null;
  let gaveBeers = false, borrachosFed = 0, borrachosHappy = false, moneyRecovered = false, fifaWon = false, stunUntil = 0;

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
    arcadeGame = null; superGame = null; vinilosGame = null;
    Bullets.clear(); Particles.clear(); Sfx.stopHum();
    state = 'playing';
    elFloor.textContent = rooms[0].name;
    setMsg('Andá a la derecha y entrá por la GALERÍA para bajar a la cueva.  [E] usar puerta', '#FFD54F', 6000);
  }

  function setMsg(t, c, ms = 3000) { elMsg.textContent = t; elMsg.style.color = c || '#ff5252'; msgUntil = performance.now() + ms; }

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
      if (it.d.id === 'super') enterSuper();
      else if (it.d.id === 'vinilos') enterVinilos();
      else if (it.d.id === 'cambio' && !stormed) {
        // la casa de cambio oficial está HASTA LAS PELOTAS: la cola no te deja entrar
        setMsg(['“¡Ehh, loco, no te coles!”', '“¡Hacé la cola como todos, vivo!”', '“No entra un alfiler, está hasta las pelotas.”', '“¡Respetá la fila, colado!”', '“Sacá número y esperá como todos, eh.”'][(Math.random()*5)|0], '#ffd54f', 4500);
      }
      else if (it.d.id === 'abandonado' && !borrachosHappy) {
        // los tres borrachines te tapan la entrada hasta que les des LO QUE QUIEREN
        setMsg(['“Eh eh... acá no entra cualquiera, pibe.” Los tres borrachines te tapan la puerta. 🚫', '“Primero atendé a los muchachos y después hablamos del edificio, ¿estamos?” 🍻', 'Los borrachines no se mueven. Algo querrán... charlá con cada uno (E). 🤔'][(Math.random()*3)|0], '#ffd54f', 4800);
      }
      else transition(it.d);
    }
    else if (it.kind === 'npc') handleNpc(it.n);
    else if (it.kind === 'machine') handleMachine(it.m);
    else if (it.kind === 'cuevero') handleCuevero(it.c);
  }
  function launchArcade(game) { arcadeGame = Arcade.create(game); state = 'arcade'; elPrompt.classList.add('hidden'); elHud.classList.add('hidden'); elFloor.classList.add('hidden'); }
  function handleNpc(n) {
    if (n.action === 'frogger') { challengeForVale = true; setMsg('¡A jugar al Frogger!', '#ff2e88', 1000); launchArcade('frogger'); }
    else if (n.action === 'chori') redeemChori();
    else if (n.action === 'truco') { setMsg('Te sentás a la mesa...', '#ffd54f', 1000); launchArcade('truco'); }
    else if (n.action === 'shop') buyFromShop(n);
    else if (n.action === 'borracho') giveBorracho(n);
    else if (n.action === 'fifa') playFifa();
    else { setMsg(n.dialog || (n.lines && n.lines[(Math.random()*n.lines.length)|0]) || '...', '#aef0c0', 4800); Sfx.pickup(); }
  }
  function playFifa() {
    if (!player.hasMegaDrive) { setMsg('“¿Trajiste una Mega Drive? Comprá una en el super chino (sección CONSOLAS) y volvé para el torneo de FIFA.” 🎮', '#9fd3ff', 5000); return; }
    if (fifaWon) { setMsg('“Campeón del torneo de FIFA 98, ¡grande!” 🏆', '#7CFC00', 3000); return; }
    fifaWon = true; player.coins += 30; Sfx.win();
    setMsg('Enchufás la MEGA DRIVE y jugás el TORNEO DE FIFA 98 (el primero). Gambeteás, la clavás al ángulo... ¡CAMPEÓN! 🏆 +30 monedas.', '#7CFC00', 6500);
  }
  function giveBorracho(n) {
    const pick = a => a[(Math.random()*a.length)|0];
    const want = n.want || 'birra';            // birra | carne | fiambre
    if (n.fed) { setMsg(pick(['“Gracias, campeón, ya estoy servido.” 🥴', '“Salú de nuevo, hermano.”', '“Sos un fenómeno, pibe.”']), '#aef0c0', 2500); return; }
    const have = want === 'birra' ? player.birras : want === 'carne' ? player.carne : player.fiambre;
    if (have > 0) {
      // tenés justo lo que necesita → se lo das
      if (want === 'birra') player.birras--; else if (want === 'carne') player.carne--; else player.fiambre--;
      n.fed = true; borrachosFed++; Sfx.pickup();
      const got = want === 'birra' ? 'una BIRRA fría 🍺' : want === 'carne' ? 'un PEDAZO DE CARNE 🥩' : 'un FIAMBRE 🥓';
      if (borrachosFed >= 3) {
        borrachosHappy = true; gaveBeers = true;
        setMsg('Le pasás ' + got + '. Los TRES quedan chochos, se corren tambaleando y te ABREN el edificio abandonado. 🏚️ (Y te soplan: “Adentro del super hay una puerta directa a la cueva del que te cagó.”) 🤫', '#7CFC00', 8500);
      } else {
        setMsg('Le pasás ' + got + '. “¡Aaah, gracias maestro!” Quedó feliz.  (' + borrachosFed + '/3 borrachines contentos)', '#aef0c0', 4000);
      }
      return;
    }
    // no tenés lo que quiere: primero divaga; recién tras varias charlas suelta la pista
    n.talks = (n.talks || 0) + 1;
    if (n.talks >= 3 && n.hint) setMsg(n.hint, '#ffd54f', 5000);
    else setMsg(pick(n.lines || ['“¿Una mano no me das, pibe?”']), '#ffd54f', 4200);
  }
  function enterSuper() { superGame = Super.create({ player, gaveBeers }); state = 'super'; elPrompt.classList.add('hidden'); elHud.classList.add('hidden'); elFloor.classList.add('hidden'); elMsg.textContent = ''; }
  function enterVinilos() { vinilosGame = Vinilos.create({ player }); state = 'vinilos'; elPrompt.classList.add('hidden'); elHud.classList.add('hidden'); elFloor.classList.add('hidden'); elMsg.textContent = ''; Sfx.startEighties(); }
  function enterCuevaFromSecret() {
    const idx = rooms.findIndex(r => r.cueveros);
    current = idx;
    const cu = rooms[idx], up = cu.doorById['up'];
    player.x = (up.x + 48) - player.w/2; player.y = cu.gTop*Level.TILE - player.h; player.vx = player.vy = 0;
    updateCam(); elFloor.textContent = cu.name;
    if (!moneyRecovered) { moneyRecovered = true; player.coins += 60; setMsg('Entrás por la puerta secreta y encarás al arbolito que te cagó. Le sacás la guita: +60 monedas. 😎', '#7CFC00', 7000); }
    else setMsg('La cueva del arbolito. Ya le sacaste todo, no queda nada.', '#9fb4c4', 4000);
  }
  function buyFromShop(n) {
    const sh = n.sells;
    const cur = sh.pay === 'caramelos' ? 'caramelos' : sh.pay === 'forros' ? 'forros' : 'monedas';
    const have = sh.pay === 'caramelos' ? player.caramelos : sh.pay === 'forros' ? player.forros : player.coins;
    if (sh.stock <= 0) { setMsg('“Ya no me queda, flaco.”', '#ffd54f', 2500); return; }
    if (have < sh.cost) { setMsg('No te alcanza: cuesta ' + sh.cost + ' ' + cur + ' y tenés ' + have + '.', '#ff5252', 3000); Sfx.empty(); return; }
    if (sh.pay === 'caramelos') player.caramelos -= sh.cost; else if (sh.pay === 'forros') player.forros -= sh.cost; else player.coins -= sh.cost;
    sh.stock--;
    let txt;
    if (sh.kind === 'ammo') { player.ammo += sh.amount; txt = '+' + sh.amount + ' munición'; }
    else if (sh.kind === 'health') { player.hp = Math.min(100, player.hp + sh.amount); txt = '+' + sh.amount + ' vida'; }
    else { player.ammo += 30; player.hp = Math.min(100, player.hp + 25); txt = 'un amuleto tenebroso (+30 munición, +25 vida)'; }
    setMsg('Compraste: ' + txt + '  (−' + sh.cost + ' ' + cur + ')', '#7CFC00', 3500); Sfx.pickup();
  }
  function machinePrice(m) { return 3 + (m.plays || 0) * 3; }
  function handleMachine(m) {
    if (stormed) { setMsg('La máquina está poseída por la tormenta... ¡te ataca!', '#ff5252', 3000); return; }
    // Pac-Man y Galaga: el dueño te extorsiona y sube el precio cada vez
    if (m.game === 'pacman' || m.game === 'galaga') {
      const price = machinePrice(m);
      if (player.coins < price) { setMsg('“Flaco, esta es MI máquina. Son ' + price + ' monedas. Sin guita no jugás.” 💸', '#ff5252', 3500); Sfx.empty(); return; }
      player.coins -= price; m.plays = (m.plays || 0) + 1;
      setMsg('Pagaste ' + price + ' monedas... “La próxima te sale más, eh.” 😏', '#ffd54f', 2500);
      challengeForVale = false; launchArcade(m.game); return;
    }
    // TrucoTron: el tipo del fondo oscuro no juega con peleles
    if (m.game === 'trucotron') {
      if (arcadeWon.pacman && arcadeWon.galaga && arcadeWon.frogger) { challengeForVale = false; launchArcade('truco'); }
      else setMsg('Sale un tipo del fondo oscuro: “Ehh, con peleles no juego. Ganale a TODAS las máquinas primero, pibe.”', '#d8c8b0', 5500);
      return;
    }
    // Frogger libre (práctica)
    challengeForVale = false; launchArcade(m.game);
  }
  function handleCuevero(c) {
    Sfx.pickup();
    if (c.outcome === 'real') {
      bought = true;
      setMsg(c.dialog + ' ...y JUSTO explota todo. El tipo se queda con tu plata. Vos: nada. 💸', '#ff5252', 7000);
      triggerStorm();
    } else {
      setMsg(c.dialog, '#ffd54f', 4800);
    }
  }
  function redeemChori() {
    if (hasVale) {
      hasVale = false; player.hp = Math.min(100, player.hp + 40);
      setMsg('🌭 Te comés el choripán gratis. +40 vida. ¡Aguante!', '#7CFC00', 3500); Sfx.pickup();
    } else {
      setMsg('Necesitás un vale. Ganale al del choripán en el arcade (Street Fighter).', '#FFD54F', 4500);
    }
  }
  function checkSecret() {
    if (secretUnlocked) return;
    if (arcadeWon.pacman && arcadeWon.galaga && arcadeWon.frogger) {
      secretUnlocked = true;
      setMsg('Un tipo sale de atrás: “Pibe... le ganaste a todas. ¿Querés ganar MUCHA plata? Vení, no preguntes.” Se abrió una puerta al fondo del arcade. 🚪', '#ffd54f', 8000);
    }
  }
  function transition(d) {
    current = d.to;
    player.x = d.at.x - player.w/2; player.y = d.at.y - player.h;
    player.vx = 0; player.vy = 0;
    transCd = 0.35;
    updateCam();
    const r = room();
    elFloor.textContent = r.name;
    Sfx.setRoomTrack(r.theme === 'cemento' ? 'metal' : r.theme === 'secret' ? (/Truco/.test(r.name) ? 'telo' : 'dance') : null);
    if (current === 0 && stormed) { flash(); setMsg('La calle quedó a oscuras y todo enloqueció. La CASA DE CAMBIO OFICIAL quedó abierta: metete ahí, el portal se abrió adentro. 🏦🌀', '#ff5252', 6500); }
    else if (current === 0) setMsg('De vuelta en Florida y Lavalle.', '#4FC3F7', 2500);
    else if (r.theme === 'cambio') { flash(); setMsg(stormed ? '¡El espacio-tiempo se partió! La gente corre en pánico y al fondo se abrió un PORTAL. ¡Metete ahí! 🌀' : 'Casa de Cambio Oficial: está HASTA LAS PELOTAS de gente sacando número. No se puede ni respirar. 🏦', stormed ? '#ff5252' : '#ffd54f', 6000); }
    else if (r.theme === 'cemento') setMsg('CEMENTO. Almafuerte hace la prueba de sonido 🤘. Está todo lleno de humo y olor a asado haciéndose. 🔥🥩', '#ff5252', 5500);
    else if (r.theme === 'lujo') setMsg('Piso de LUJO 👗✨: lo mejor de la moda, vidrieras impecables... y no hay un alma. Saqueá tranquilo (E en el ascensor para seguir).', '#ffd54f', 5000);
    else if (r.theme === 'ruina') setMsg('Piso DESTRUIDO 💀: escombros, olor a encierro y gente tirada, hecha mierda, durmiendo. Pisá despacio.', '#b0a0a0', 5000);
    else if (r.theme === 'office') setMsg(/Garbarino/.test(r.name) ? 'Garbarino: electrónica carísima. El vendedor no te suelta. 📺💸' : 'EducaciónIT — saludá a la gente (E) y subí en ascensor.', '#80cbc4', 4000);
    else if (r.theme === 'arcade') setMsg(stormed ? '¡El arcade está poseído! Pac-Man y Galaga te atacan.' : 'Arcade — apretá E en una máquina para jugar.', stormed ? '#ff5252' : '#ff2e88', 4000);
    else if (r.theme === 'shop') setMsg('Chorería — canjeá tu vale con el parrillero (E).', '#ffd54f', 3500);
    else if (r.theme === 'secret') setMsg(/Truco/.test(r.name) ? 'La trastienda: el tahúr te espera para el truco. 🃏' : 'Entrás con miedo... humo, dos mesas, gente que te mira. “Acá no viste nada, pibe.”', '#d8c8b0', 5500);
    else if (r.cueveros) setMsg('Tres cuevas, tres cueveros. Probá con cada uno (E)... a ver quién te cambia.', '#7CFC00', 5500);
    else setMsg('Más abajo... seguí bajando hasta las cuevas.', '#9fb4c4', 3000);
  }
  function triggerStorm() {
    if (stormed) return;
    stormed = true;
    Sfx.stormBoom(); Sfx.startHum();
    shakeUntil = performance.now() + 900;
    for (const s of states) for (const e of s.enemies) e.hostile = true;
    setMsg('“Listo, jefe.” Un temblor: ARRIBA se cortó TODO por la tormenta solar. Acá abajo, sin luz, nada cambia. Subí y escapá.', '#ff5252', 7000);
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
    if (!player.alive) { die(); return; }
    updateCam();

    Enemies.update(s.enemies, dt, r, player);
    Bullets.update(dt, r, s.enemies, player, dmg => player.hurt(dmg));
    Particles.update(dt);

    // pickups
    for (const p of s.pickups) {
      if (p.taken) continue;
      if (Math.abs(player.x+player.w/2 - p.x) < 22 && Math.abs(player.y+player.h - p.y) < 40) {
        p.taken = true; Sfx.pickup();
        if (p.type === 'ammo') { player.ammo += p.amount; setMsg('+' + p.amount + ' munición', '#FFD54F', 1100); }
        else if (p.type === 'coins') { player.coins += p.amount; setMsg('+' + p.amount + ' monedas', '#FFC107', 1100); }
        else { player.hp = Math.min(100, player.hp + p.amount); setMsg('+' + p.amount + ' vida', '#7CFC00', 1100); }
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
      if (n.upCd <= 0 && n.lines) { setMsg(n.lines[(Math.random()*n.lines.length)|0], '#80cbc4', 2800); n.upCd = 3.5 + Math.random()*2.5; }
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
    if (elVicios) elVicios.textContent = player.birras + '·' + (player.carne||0) + '·' + (player.fiambre||0);
    if (performance.now() > msgUntil) elMsg.textContent = '';
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
      const img = Art.items[DOOR_ART[d.art] || 'door'];
      ctx.drawImage(img, d.x - cam.x - img.width/2, d.y - cam.y - img.height);
      if (d.id === 'secret') {
        const mi = Art.npc.misterioso, mx = d.x - cam.x - 46;
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(mx + mi.width/2, d.y - cam.y, 12, 4, 0, 0, Math.PI*2); ctx.fill();
        ctx.drawImage(mi, mx, d.y - cam.y - mi.height);
        label('¡psst! vení', mx + mi.width/2, d.y - cam.y - mi.height - 4, '#ffd54f');
      }
    }
    // máquinas de arcade
    for (const m of r.machines || []) {
      const img = Art.machines[m.game];
      ctx.drawImage(img, m.x - cam.x - img.width/2, m.y - cam.y - img.height);
      label(m.name, m.x - cam.x, m.y - cam.y - img.height - 4, '#ff2e88');
    }
    // NPCs amistosos (EducaciónIT)
    for (const n of r.npcs || []) {
      const img = Art.npc[n.sprite] || Art.npc.civil1;
      ctx.drawImage(img, n.x - cam.x - img.width/2, n.y - cam.y - img.height);
      label(n.name, n.x - cam.x, n.y - cam.y - img.height - 4, '#aef0c0');
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
      label(c.name, c.x - cam.x, c.y - cam.y - img.height - 4, '#7CFC00');
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
    if (it.kind === 'cuevero') txt = 'hablar con el cuevero';
    else if (it.kind === 'npc') txt = it.n.action === 'fighter' ? 'retar a Street Fighter' : it.n.action === 'chori' ? 'canjear vale (choripán)' : it.n.action === 'shop' ? 'comprar (' + it.n.sells.cost + ' ' + (it.n.sells.pay === 'caramelos' ? 'caramelos' : it.n.sells.pay === 'forros' ? 'forros' : 'monedas') + ')' : 'hablar con ' + it.n.name;
    else if (it.kind === 'machine') {
      const m = it.m;
      if (stormed) txt = '¡máquina poseída!';
      else if (m.game === 'pacman' || m.game === 'galaga') txt = 'jugar ' + m.name + ' (' + machinePrice(m) + ' monedas)';
      else txt = 'jugar ' + m.name;
    }
    else txt = it.d.label;
    elPrompt.innerHTML = '<span class="key">E</span>' + txt;
    elPrompt.classList.remove('hidden');
  }

  // ---- fin ----
  function win() {
    if (state === 'win') return;
    state = 'win'; running = false; Sfx.stopHum(); Sfx.win();
    elEndTitle.textContent = 'PORTAL ESTABLE'; elEndTitle.style.color = '#4FC3F7';
    elEndText.innerHTML = 'Cruzás el portal mientras Florida y Lavalle se desmoronan en estática.<br><br>' +
      'Esto no empezó hoy: la tormenta viene desde mucho más atrás... desde que pusimos un satélite a pensar por nosotros.<br><br><em>El salto temporal comienza. (Fin del Nivel 1)</em>';
    showEnd();
  }
  function die() {
    if (state === 'dead') return;
    state = 'dead'; running = false; Sfx.stopHum();
    elEndTitle.textContent = 'TE CONSUMIÓ LA TORMENTA'; elEndTitle.style.color = '#ff5252';
    elEndText.innerHTML = 'La interferencia te alcanzó.<br><br>El portal temporal se cierra sin vos.<br><br><em>Probá de nuevo.</em>';
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
            setMsg('Le ganás al tahúr... pero las minas se te tiran encima 💃💃, no te dejan ni caminar y te afanan ' + robbed + ' monedas. 😵', '#ff5252', 6500);
          }
          else { player.hp = Math.max(1, player.hp - 25); setMsg('Perdés. El tahúr te sonríe de costado... dicen que al tipo le gusta el marrón. Salís medio incómodo, sin saber bien por qué. (−25 vida)', '#ff5252', 6800); }
        } else if (kind === 'frogger' && challengeForVale) {
          if (res === 'win') { hasVale = true; setMsg('¡Le ganaste al Frogger! Tenés un VALE por un choripán gratis 🌭. Canjealo en la chorería.', '#7CFC00', 6000); }
          else setMsg('Te ganó el del chori. Sin vale... pedile revancha.', '#ff5252', 4000);
          challengeForVale = false;
        } else if (kind === 'frogger') {
          if (res === 'win') { player.coins += 8; setMsg('🐸 ¡Cruzaste! +8 monedas.', '#7CFC00', 3000); }
          else setMsg('Te aplastaron en el Frogger.', '#ff5252', 2500);
        } else if (res === 'win') { // pac-man / galaga
          player.coins += 10;
          if (kind === 'pacman') { player.ammo += 6; setMsg('🕹️ ¡Ganaste el Pac-Man! +10 monedas, +6 munición.', '#7CFC00', 4000); }
          else { player.hp = Math.min(100, player.hp + 20); setMsg('🕹️ ¡Ganaste el Galaga! +10 monedas, +20 vida.', '#7CFC00', 4000); }
        } else setMsg('Game over. Probá de nuevo, hay monedas en juego.', '#9fd3ff', 2800);
        checkSecret();
      }
    } else if (state === 'super' && superGame) {
      superGame.update(dt); superGame.draw(ctx, W, H);
      if (superGame.done) {
        const to = superGame.exitTo; superGame = null; state = 'playing'; transCd = 0.35;
        elHud.classList.remove('hidden'); elFloor.classList.remove('hidden');
        if (to === 'cueva') enterCuevaFromSecret();
        else setMsg('Salís del super chino con los bolsillos llenos de caramelos. 🍬', '#FFC107', 3000);
      }
    } else if (state === 'vinilos' && vinilosGame) {
      vinilosGame.update(dt); vinilosGame.draw(ctx, W, H);
      if (vinilosGame.done) {
        vinilosGame = null; state = 'playing'; transCd = 0.35;
        elHud.classList.remove('hidden'); elFloor.classList.remove('hidden'); Sfx.stopEighties();
        setMsg('Salís de la disquería. 🎵', '#e0b0ff', 2500);
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
    const k = e.key.toLowerCase();
    if (k === 'e') interact();
    else if (k === 'm') { const on = Sfx.toggleMusic(); setMsg(on ? '♪ Música ON' : '♪ Música OFF', '#9fd3ff', 1200); }
  });
  document.getElementById('startBtn').addEventListener('click', start);
  document.getElementById('restartBtn').addEventListener('click', start);
})();
