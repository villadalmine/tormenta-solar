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
  const elWeapon = document.getElementById('weapon');
  const elAmmo = document.getElementById('ammo');
  const elCoins = document.getElementById('coins');
  const elCaramelos = document.getElementById('caramelos');
  const elVicios = document.getElementById('vicios');
  const elFalopa = document.getElementById('falopa');
  const elMsg = document.getElementById('msg');
  const elFlash = document.getElementById('flash');
  const elFloor = document.getElementById('floorName');
  const elChipBanner = document.getElementById('chipBanner');
  const elPrompt = document.getElementById('prompt');
  const elChat = document.getElementById('chat');
  const elChatTitle = document.getElementById('chat-title');
  const elChatLog = document.getElementById('chat-log');
  const elChatInput = document.getElementById('chat-input');
  let chatNpc = null, chatHistory = [], chatBusy = false, hintAsks = 0, chatFallbacks = 0;
  let peerChat = null;   // F2b.2: si está abierto el chat PRIVADO con otro jugador del bodegón → { pid, nick }
  let peerChatFrom = null;   // T2b: desde dónde se abrió el chat privado ('bodegon' → al cerrar volvés al top-down)
  let chatReturnTo = null;   // Lavalle: chat IA abierto desde un sub-modo top-down ('lavalle' → al cerrar volvés ahí)
  let newsQuest = null;   // F2 cine: {topic, answer} cuando el linyera te mandó a buscar noticias (efímero, no se guarda)
  let mundialQuest = null;   // §9 quest de los hinchas: {equipo, resultado, shown} — efímero, se resetea al salir del cine
  // QUESTS como DATO (migración v2, F1): registro DECLARATIVO — premios/penalidades/chance/mensajes son data, no
  // números sueltos. El runtime y la IA leen de acá; expuesto en window.Game.quests + worldSnapshot. La verificación
  // sigue siendo función (primitiva=código, componer=dato, modelo-de-entidades §6.97). Migrar a entidades+grafo = F2.
  // QUESTS = DATA DEL NIVEL (window.LEVEL1.quests, generado por gen-level → level-data.js). Fallback inline si no está.
  // Así la "máquina de niveles" (fabrica-niveles-ai.md) puede AUTORAR quests por nivel; las primitivas (QUEST_PRIMS) son código.
  const _qlvl = (typeof window !== 'undefined' && window.LEVEL1 && window.LEVEL1.quests) || null;
  const QUEST_DEFS = Array.isArray(_qlvl) ? Object.fromEntries(_qlvl.map(q => [q.id, q])) : (_qlvl || {
    sube:    { id:'sube',    scope:'game', giver:'oraculo', onGive:'subeGive' },
    news:    { id:'news',    scope:'run', giver:'oraculo', chance:0.35, reward:{ caramelos:3 }, penalty:{ coins:10 }, ask:'g.cine.questAsk', ok:'g.cine.questOk', lie:'g.cine.questLie', remind:'g.cine.questRemind', onGive:'newsGive', onReport:'newsReport', onHint:'newsHint' },
    mundial: { id:'mundial', scope:'run', giver:'hincha',  reward:{ caramelos:5 }, ask:'g.mundial.pregunta', back:'g.mundial.gracias', remind:'g.mundial.recorda', onGreet:'mundialGreet', onReport:'mundialReport' },
  });
  // aplica una recompensa/penalidad DECLARADA (data → efecto). 'coins' resta (tope al saldo); el resto suma. Devuelve lo aplicado.
  function applyReward(rw) { const out = {}; for (const k in (rw || {})) { if (k === 'coins') { const lost = Math.min(player.coins, rw.coins); player.coins -= lost; out.coins = lost; } else { player[k] = (player[k] || 0) + rw[k]; out[k] = rw[k]; } } return out; }
  // PRIMITIVAS de quest (código; el FLUJO lo decide el registro = data, §6.97). Devuelven {line} o null.
  const QUEST_PRIMS = {
    newsGive() { const ns = (typeof window !== 'undefined' && window.NOTICIAS) || []; if (!ns.length) return null; const p = ns[(Math.random() * ns.length) | 0]; newsQuest = { topic: p.topic, answer: p.answer }; return { line: T(QUEST_DEFS.news.ask, { topic: p.topic }) }; },
    newsReport(msg) { if (!newsQuest) return null; const m = newsMatch(msg, newsQuest.answer);
      if (m.shared >= 1) { applyReward(QUEST_DEFS.news.reward); newsQuest = null; return { line: T(QUEST_DEFS.news.ok) }; }
      if (m.words >= 2) { const out = applyReward(QUEST_DEFS.news.penalty); newsQuest = null; return { line: T(QUEST_DEFS.news.lie, { n: out.coins }) }; }
      return null; },   // muy vago → sigue esperando
    newsHint() { return newsQuest ? T(QUEST_DEFS.news.remind, { topic: newsQuest.topic }) : null; },   // recordatorio (pista)
    // §9 mundial: el hincha te SALUDA (al abrir chat) → pregunta / recuerda / agradece según el estado.
    mundialGreet() {
      if (mundialQuest && mundialQuest.shown) { applyReward(QUEST_DEFS.mundial.reward); Sfx.pickup(); const line = T(QUEST_DEFS.mundial.back, { res: mundialQuest.resultado }); mundialQuest = null; return { line }; }
      if (mundialQuest) return { line: T(QUEST_DEFS.mundial.remind, { eq: mundialQuest.equipo }) };
      const eqs = Object.keys(((typeof window !== 'undefined' && window.MUNDIAL && window.MUNDIAL.equipos) || {}));
      if (!eqs.length) return { line: T('g.mundial.nodata') };
      const eq = pickEquipoJugoso(eqs); mundialQuest = { equipo: eq, resultado: window.MUNDIAL.equipos[eq], shown: false };
      return { line: T(QUEST_DEFS.mundial.ask, { eq }) };
    },
    // si ya tenés el dato del guarda, cualquier mensaje al hincha = te agradece + premio.
    mundialReport() { if (mundialQuest && mundialQuest.shown) { applyReward(QUEST_DEFS.mundial.reward); Sfx.pickup(); const line = T(QUEST_DEFS.mundial.back, { res: mundialQuest.resultado }); mundialQuest = null; return { line }; } return null; },
    // TARJETA SUBE (subte.md §2.6): si viste el tótem sin stock y todavía no tenés la tarjeta, un linyera te
    // REGALA la suya (ellos caminan / viajan de arriba) → arista del grafo (map + ticker + checkpoint).
    subeGive() {
      const st = historiaState();
      if (!st.subeSeen || st.subeGot) return null;
      addItem('sube'); Sfx.pickup();
      applyEdge('sube_tarjeta', 'subeGot');
      return { line: T('g.sube.linyeraGive') };
    },
  };
  // RUNTIME genérico: el dispatch se decide por DATA (giver/chance/scope); las primitivas son código.
  const Quests = {
    activeId(id) { return id === 'news' ? !!newsQuest : id === 'mundial' ? !!mundialQuest : false; },
    // intenta DAR una quest cuyo giver matchea el tipo de NPC (según el registro). Devuelve {id,line} o null.
    maybeGive(giverKind) { for (const id in QUEST_DEFS) { const q = QUEST_DEFS[id]; if (q.giver !== giverKind || this.activeId(id) || !q.onGive) continue; if (q.chance != null && Math.random() >= q.chance) continue; const r = QUEST_PRIMS[q.onGive] && QUEST_PRIMS[q.onGive](); if (r) return { id, ...r }; } return null; },
    // reporte/verificación contra la quest activa de ese giver. Devuelve {id,line} o null.
    report(giverKind, msg) { for (const id in QUEST_DEFS) { const q = QUEST_DEFS[id]; if (q.giver !== giverKind || !this.activeId(id) || !q.onReport) continue; const r = QUEST_PRIMS[q.onReport] && QUEST_PRIMS[q.onReport](msg); if (r) return { id, ...r }; } return null; },
    // SALUDO del giver al abrir el chat (pregunta/recuerda/agradece). Devuelve {id,line} o null.
    greet(giverKind) { for (const id in QUEST_DEFS) { const q = QUEST_DEFS[id]; if (q.giver !== giverKind || !q.onGreet) continue; const r = QUEST_PRIMS[q.onGreet] && QUEST_PRIMS[q.onGreet](); if (r) return { id, ...r }; } return null; },
    // PISTA derivada de una quest activa de ese giver (unifica quests + grafo en getHint). Devuelve {id,title,text} o null.
    hintFor(giverKind) { for (const id in QUEST_DEFS) { const q = QUEST_DEFS[id]; if (q.giver !== giverKind || !this.activeId(id) || !q.onHint) continue; const t = QUEST_PRIMS[q.onHint] && QUEST_PRIMS[q.onHint](); if (t) return { id, title: id, text: t }; } return null; },
  };
  let mundialApproach = null;   // §9: {npc, homeX} cuando un hincha se ACERCA a agradecerte tras el dato del guarda
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
  let lastT = 0, running = false, msgUntil = 0, msgSkippable = false, shakeUntil = 0, time = 0, transCd = 0;

  // RF-7: tras la tormenta estos edificios se derrumban (no son refugio ni salida). Quedan clausurados.
  let arcadeGame = null, superGame = null, vinilosGame = null, spinoffGame = null, tiendaGame = null, teloGame = null, bodegonGame = null, lavalleGame = null;
  // F3 TRUCO PvP humano (specs/truco.md §F3): match host-autoritativo sobre el whisper del salón.
  let trucoPvpGame = null, trucoPeer = null, trucoHbT = 0, trucoKeyHeld = {}, trucoWdT = 0;
  // MESAS server-authoritative (specs/multijugador.md): tableWait = mientras esperás el pareo en una mesa del bodegón.
  // truco6 = {seatToPid, pidToSeat} (host) o {host} (guest). El lobby lo hace el SERVER (no más invitaciones P2P).
  let truco6Game = null, truco6 = null, tableWait = null;
  let globoGame = null;     // MAPA A: el globo del mundo (satélites + bases) — sala de situación del búnker
  let obeliscoGame = null;  // Lavalle E2: la plaza del Obelisco (tras pasar el corte)
  let subteGame = null, subteReturn = 'street';   // subte.md §4: la estación (sub-modo top-down); dónde volvés al salir
  let plazaGame = null;   // subte.md §10 / F4: PLAZA DE MAYO (arranque del Nivel 2), llegás en subte a Catedral
  let finaleGame = null;  // subte.md §10.1: cinemática de cierre del Nivel 2 (liberación sanmartiniana) → pantalla de fin
  let bunkerMapaGame = null; // MAPA B: el plano del búnker (construir desde la entrada de tu base)
  // EL MAPA (specs/mapa-juego.md): [TAB] automap; fog of war por salas visitadas (persistido)
  let mapaZoom = null, mapaFrontier = null, mapaClickHeld = false, visitedRooms = new Set([0]);
  let mapaCursor = null, mapaKb = false, mapaMouse = { x: -1, y: -1 };   // cursor de teclado en el mapa (flechas + Enter)
  try { const a = JSON.parse(localStorage.getItem('ts_visited') || '[]'); visitedRooms = new Set([0].concat(a.filter(n => Number.isInteger(n)))); } catch (e) {}
  function saveVisited() { try { localStorage.setItem('ts_visited', JSON.stringify([...visitedRooms])); } catch (e) {} }
  let lavalleSpawn = null;  // al volver de un mini-juego, re-spawn EN su punto (no en la entrada)
  let piqueteGame = null;   // Fase 2 Lavalle: mini-juego co-op "Aguantar el corte" (mesa 'corte')
  let sogaGame = null;      // Lavalle: mini-juego co-op "La soga" (mesa 'soga')
  let bomboGame = null;     // Lavalle: mini-juego co-op "Bombo & cumbia" (mesa 'bombo')
  let ollaGame = null;      // Lavalle: mini-juego co-op "Reparto de la olla" (mesa 'olla')
  let pancaGame = null;     // Lavalle: mini-juego co-op "Pintar la pancarta" (mesa 'pancarta')
  const AI_BOTS = ['Pino', 'Coya', 'Tito', 'Nano', 'Beto'];
  // WATCHDOG de reconexión (deuda F3): un jugador que cierra la pestaña deja de mandar Salon.pos → el relay lo poda
  // (~35s) → desaparece de Salon.getPeers(). En 1v1 cerramos el match ('left'); en a6 lo reemplaza la IA (sigue).
  function trucoPeerGone(pid) { try { const ps = Salon.getPeers && Salon.getPeers(); return !!ps && !ps.has(pid); } catch (e) { return false; } }
  // NIVEL-AI en EL MOTOR REAL (rooms-swap): se guarda el juego principal, se cargan las salas generadas, y al
  // llegar a la meta (o morir/escapar) se RESTAURA todo. spinoffLevel gatea tormenta/quests/save/muerte.
  let spinoffLevel = false, spinoffSave = null, spinoffReward = null, spinoffName = '';
  let spinoffReturnRoom = null;   // si el nivel generado vino de un VECINO: al GANAR quedás en el interior real del edificio (no la calle)
  // EDIFICIOS CLAUSURADOS (specs/edificios-clausurados-historias.md): a qué edificio ya entraste (2ª visita = directo a la oferta)
  const entradoEdif = {};
  // estado del VECINO por edificio (told/storyCount/active) — PERSISTENTE (sobrevive recarga/save) → reabrir es coherente
  const vecinoState = {};
  // cache de TEMAS de nivel autorados por la IA (clave = edif:storyId): cache-first como las tiendas → entrás AL TOQUE
  // con el estático y la IA enriquece en background; la PRÓXIMA vez que pasás, el nivel ya entra rico (sin esperar).
  const histThemeCache = {};
  // CÁMARAS que "ven" los dólares cuando disparás (post-tormenta): burbuja con la SERIE (real o TRUCHA → AFIP).
  // legalBlindUntil: si tiráste un dólar de serie BUENA, los ROBOTS (drones) no te ven hasta este momento (legal).
  let dollarBubbles = [], shotsSeen = 0, legalBlindUntil = 0;
  let ambientBubbles = [], ambientCd = 5;   // NPCs VIVOS: chusmean entre ellos y de lo que hiciste (globitos)
  let cineNoticias = [];   // noticias que muestra la pantalla del cine (varias, del banco /noticias, filtradas por piso)
  let salonLive = null, salonPollT = 0, salonBeatT = 0, playtimeT = 300000;   // MULTIJUGADOR F1: mundo vivo (count/byRoom/ticker) + cadencia de latido
  let cartelBoard = null, cartelPollT = 0, cartelMsg = null, cartelMsgT = 0;   // CARTELES C1: tablón del piso actual (banco server) + el cartel que estás leyendo
  let dcState = null, dcPollT = 0, dcCinemaT = 0;   // DATACENTER D1/D2: estado GLOBAL + la cinemática del endgame (al 100%)
  let escortNudgeT = 0;   // el compañero (linyera/Guido) te RECUERDA a dónde ir cada tanto + en cada sala
  let cineArchive = null;  // {day, noticias} cuando el GUARDA te vendió una FUNCIÓN VIEJA (otro día); null = día de hoy
  let guardaFreeUsed = false;  // la 1ª función vieja del run es gratis; después se cobra (más viejo más caro)
  let guardaAsk = {};          // día → precio ya regateado (si no está, vale el base); se resetea al salir del cine
  let gaveBeers = false, borrachosFed = 0, borrachosHappy = false, moneyRecovered = false, fifaWon = false, stunUntil = 0, stunPending = false;
  let bunkerUnlocked = false, loopCount = 0;        // tótem → búnker; loopCount = día del loop
  let chinoFrontOpen = false, decayAcc = 0;         // loop de supervivencia (post-tormenta)
  // REGLAS del nivel como DATA (§6.97): el motor las compone, el nivel las declara (window.LEVEL1.rules).
  // La máquina de niveles podrá ajustar dificultad sin tocar código. Fallback inline = los números de v1.
  const RULES = (typeof window !== 'undefined' && window.LEVEL1 && window.LEVEL1.rules) || {};
  // supervivencia: drena -3 hp/30s; al dormir/revivir hp full; conserva 30-70% monedas.
  const SURV = Object.assign({ decayEverySec: 30, decayHp: 3, fullHp: 100, sleepCoinKeepMin: 0.3, sleepCoinKeepMax: 0.7 }, RULES.survival || {});
  const MAXHP = (RULES.player && RULES.player.maxHp) || 100;                 // tope de vida (curaciones nunca pasan de acá)
  const TRUCO_LOSE = (RULES.combat && RULES.combat.trucoLosePenalty) || 25;   // lo que te saca perder el truco
  // DÓLARES como DATA (§6.97: el mecanismo es código, el CONTENIDO es dato → autorable por la máquina de niveles).
  const DOLLARS = Object.assign({ truchaChance: 0.4, blindMs: 4000,
    origins: ['g.dollar.o.cueva', 'g.dollar.o.valija', 'g.dollar.o.armas', 'g.dollar.o.afa', 'g.dollar.o.cartel', 'g.dollar.o.ilegal', 'g.dollar.o.monopoly'] }, RULES.dollars || {});
  let trucoWon = false;                             // ganar el truco abre una puerta al chino (se consume al cruzar)
  let trucoEverWon = false;                          // ¿alguna vez le ganaste al tahúr? (para el HITO; NO se consume)
  let armado = false;                               // espejo de n.armado: compraste fierro criollo (lo lee el grafo de historia)
  let tesoroTaken = false;                           // reclamaste el TESORO de los linyeras en el búnker (premio del edificio, 1×)
  let chinoEntered = false;                           // entraste al chino post-tormenta por CUALQUIER puerta (lo lee el grafo: arista chino_back)
  // GATE DEL CUEVERO (specs/cuevero-gate-truco.md): el cuevero "real" no te vende ni dispara la tormenta hasta tener
  // el mensaje del tahúr (cueveroUnlocked). Se gana ganándole al truco vos mismo (ruta B) o mandando a Guido (ruta A).
  let cueveroUnlocked = false;                        // tenés el "te perdono" del tahúr → el cuevero vende → estalla la tormenta
  let tahurDiscovered = false;                        // entraste a la trastienda del tahúr (precondición para que Guido te siga)
  let guidoSummoned = false;                          // elegiste "tengo contactos" → un linyera te manda con Guido
  let guidoRecruited = false;                         // hiciste la cadena linyera→Guido (te lo presentaron)
  let guidoFollowing = false;                         // Guido te acompaña a desbaratar al tahúr (auto-win en la trastienda)
  // TRUCO "DE A 6" (ruta B): el tahúr te reta a 3 vs 3 → reclutás 2 compañeros que te SIGUEN y se juega de a 6.
  let trucoSeisOffered = false;                       // el tahúr ya te propuso jugar de a 6 (andá a buscar equipo)
  let trucoSeisActive = false;                        // partido de a 6 EN CURSO (el duelo tuyo se resuelve con los de tu equipo)
  const trucoMatesRec = {};                           // id → true: compañeros de truco ya reclutados (te siguen)
  const TRUCO_MATES = { truco1: { name: 'Pino', sprite: 'linyera', skill: 0.62 }, truco2: { name: 'Coya', sprite: 'naipero', skill: 0.55 } };
  // === QUEST DEL CHIP (specs/telo-chip-quest.md) — el robot IA del telo te chipó; arco para sacártelo ===
  // La quest es DATA (un grafo lineal de pasos); el runtime `chipTry` es GENÉRICO: matchea el NPC contra `on` (rol/
  // sprite/tag/nombre, data) y avanza al `next`. Lo único "code" son los efectos nombrados (CHIP_FX) y el comprar/usar
  // (comportamiento del quest, que el dueño habilitó como hardcode puntual). REGLA #0: nada de if-chain por paso.
  let chipped = false, chipStep = '', playingAs = 'carpo', chipEverCured = false, chipLoops = 0;
  // chipLoops = cuántas veces COMPLETASTE el arco (cura). El telo te chipa hasta 3 veces; la 4ª (chipLoops>=3) el robot
  // ya no te chipa: los 3 linyeras irrumpen, lo funden a rayos cósmicos y salís sin chip (rescate). specs/telo-chip-quest.md §6.4.
  const chipParts = {};
  let curaSceneT = 0, curaSceneIdx = -1;   // puesta en escena de la CURA: un linyera entra al telohab y le da la consola al Carpo dormido (transitorio, no se serializa)
  // Los pasos 'linyeras' y 'garbarino' NO están acá: se resuelven chateando con los 3 linyeras de la sala 'telohab'
  // (chipLinNote/Posta). La posta hace el CORTE DE ESCENA (chipBecomeGarbarino): saltás al edificio de Garbarino ya
  // controlando al vendedor y arrancás directo en 'troyano'. De acá en más, los pasos sí son data-driven por NPC.
  const CHIP_QUEST = [
    { id: 'troyano',   on: { names: ['Maxi', 'Marcos'], all: true },  next: 'consola',   msg: 'g.chip.troyanoDone', partial: 'g.chip.troyano' },
    { id: 'consola',   on: { flag: 'jubilado' },                      next: 'consola2',  msg: 'g.chip.jubilados', fx: 'jubiladosFollow' },
    { id: 'consola2',  on: { flag: 'consolaGuy' }, req: 'fifa',       next: 'cure',      msg: 'g.chip.consola',   fx: 'getConsola' },
    { id: 'cure',      on: { oracle: true },                          next: '',          msg: 'g.chip.cured',     fx: 'cureChip' },
  ];
  const CHIP_FX = {
    jubiladosFollow() { /* los 2 jubilados se vuelven companions (te siguen al arcade) — se derivan en syncCompanions cuando chipStep==='consola2' */ },
    getConsola() { addItem('consola'); },   // el flaco del Trucotron te da la consola. SEGUÍS siendo el de Garbarino (el switch a Carpo es SOLO en la cura). Los jubilados se van rezongando.
    // CURA: le diste la consola a un linyera → el juego SALTA a la habitación del telo; el linyera te la mete a la fuerza
    // (vos chipeado querías hacer estallar el sol) → boom, te dormís, te despertás con resaca y SIN chip. (gag del dueño)
    cureChip() {
      player.inventory = (player.inventory || []).filter(x => x !== 'consola'); if (player.weapon === 'consola') player.weapon = 'escupitajo';
      chipEverCured = true; chipLoops++;   // completaste el arco: a la 4ª vez (chipLoops>=3) el telo ya no te chipa, te rescatan
      const hi = rooms.findIndex(r => hasTag(r, 'telohab'));
      if (hi >= 0) { spawnIn(hi, 8); elFloor.textContent = TX(rooms[hi].name); if (Sfx.setRoomTrack) Sfx.setRoomTrack('telo'); curaSceneT = 7; curaSceneIdx = hi; }   // PUESTA EN ESCENA: el linyera entra y le da la consola al Carpo dormido (7s)
      chipReset(); flash();
    },
  };
  function chipStart() { chipped = true; chipStep = 'linyeras'; playingAs = 'carpo'; for (const k in chipParts) delete chipParts[k]; }
  function chipReset() {
    chipped = false; chipStep = ''; playingAs = 'carpo'; chipLinTalked.clear(); for (const k in chipParts) delete chipParts[k];
    // deshacer el corte de escena: el Carpo se levanta de la cama y el vendedor de Garbarino vuelve a verse (para re-jugar)
    for (const r of (typeof rooms !== 'undefined' && rooms) || []) {
      if (hasTag(r, 'telohab')) r.carpoInBed = false;
      if (hasTag(r, 'garbarino')) for (const n of r.npcs || []) if (n.sprite === 'vendedor') n.invisible = false;
    }
  }
  function chipMatch(npc, on) {
    if (on.oracle) return isOraculo(npc);
    if (on.sprite) return npc.sprite === on.sprite && (!on.tag || hasTag(room(), on.tag));
    if (on.names) return on.names.includes(npc.name);
    if (on.flag) return !!npc[on.flag];
    return false;
  }
  // prerrequisito de un paso (data): hasta no cumplirlo, el quest NO intercepta al NPC → corre su acción normal y te guía.
  // p.ej. el flaco del Trucotron (consolaGuy) NO te da la consola si no ganaste el FIFA 98: deja correr su quest 'fifa'
  // (te pide la Mega Drive del chino, te hace jugar) hasta que `fifaWon`; recién ahí el quest del chip lo intercepta.
  function chipReqOk(req) { return req === 'fifa' ? fifaWon : true; }
  // intento genérico de avanzar el quest con este NPC (se llama al tope de handleNpc). true = lo manejó el quest.
  function chipTry(npc) {
    if (!chipped) return false;
    const step = CHIP_QUEST.find(s => s.id === chipStep);
    if (!step || !chipMatch(npc, step.on)) return false;
    if (step.req && !chipReqOk(step.req)) return false;   // prereq sin cumplir → que el NPC haga lo suyo (FIFA primero)
    if (step.on.all && step.partial) {   // paso que necesita VARIOS (Maxi Y Marcos): junta de a uno hasta tenerlos todos
      chipParts[npc.name] = true;
      if (!step.on.names.every(n => chipParts[n])) { Sfx.pickup(); setMsg(T(step.partial, { who: npc.name }), '#80cbc4', 8000); return true; }
    }
    if (step.fx && CHIP_FX[step.fx]) CHIP_FX[step.fx](npc);
    chipStep = step.next; Sfx.win();
    syncCompanions();   // los compañeros del chip (jubilados que te siguen) se derivan del paso actual
    setMsg(T(step.msg), '#7CFC00', 15000);   // dialogo importante de la historia → bien LENTO para leer
    if (typeof Mensajero !== 'undefined' && Mensajero.evento) Mensajero.evento('chip_' + step.id);
    return true;
  }
  function useConsola() {   // la consola NO te la metés vos (chipeado querés estallar el sol): se la das a un LINYERA y él te la mete.
    closeInv();
    if (chipStep === 'cure') setMsg(T('g.chip.consolaGiveLinyera'), '#9be8a0', 8000);   // andá a un linyera y dásela
    else setMsg(T('g.chip.consolaNotYet'), '#ffd54f', 6000);
  }
  // pista del chip para los linyeras (saben TODO + en qué paso estás): el HintEngine la prioriza si estás chipeado.
  function chipHint() { return chipped ? T('g.chip.hint.' + chipStep) : null; }
  // OBJETIVO persistente (cartel rojo fijo arriba): qué tenés que hacer AHORA, por paso. Aclara que seguís chipeado + el cambio de PJ.
  function chipBannerText() { return chipped ? T('g.chip.obj.' + (chipStep || 'cure')) : ''; }
  // QUEST DEL CHIP, paso 'linyeras' (versión larga): en LA HABITACIÓN DEL TELO están los 3 linyeras CHATEABLES (IA,
  // personas filosofo/poeta/pechito). Charlás con cada uno (boludeo libre); cuando hablaste con LOS TRES, uno te tira la
  // posta → pasás a controlar al pibe de Garbarino. El tracking es por persona (chipLinTalked), gatillado en openChat/closeChat.
  const chipLinTalked = new Set();
  function chipLinNote(n) { if (chipped && chipStep === 'linyeras' && n && n.chiplin) chipLinTalked.add(n.persona || n.name); }
  function chipLinMaybePosta() {
    if (!(chipped && chipStep === 'linyeras' && chipLinTalked.size >= 3)) return;
    chipLinTalked.clear();
    // CORTE DE ESCENA (lo pidió el dueño, 3 veces): la posta NO te deja caminando como Carpo. Te SACA del telo y te mete
    // DENTRO del edificio de Garbarino, ya controlando al PIBE DE GARBARINO. El Carpo (vos, chipeado) queda acostado en la
    // cama del telo. De acá en más manejás al de Garbarino (NO chipeado) → directo al paso 'troyano'.
    chipBecomeGarbarino();
    setMsg(T('g.chip.linyerasPosta'), '#7CFC00', 15000);
    if (typeof Mensajero !== 'undefined' && Mensajero.evento) Mensajero.evento('chip_linyeras');
  }
  // El switch a "pibe de Garbarino": dejá al Carpo acostado en la cama del telohab, saltá al edificio de Garbarino y
  // tomá control del vendedor (lo ocultamos como NPC porque AHORA sos vos). Corte de escena duro = imposible no verlo.
  function chipBecomeGarbarino() {
    playingAs = 'garbarino'; chipStep = 'troyano';
    const hi = rooms.findIndex(r => hasTag(r, 'telohab')); if (hi >= 0) rooms[hi].carpoInBed = true;   // el Carpo queda en la cama
    const gi = rooms.findIndex(r => hasTag(r, 'garbarino'));
    if (gi >= 0) {
      const v = (rooms[gi].npcs || []).find(n => n.sprite === 'vendedor'); if (v) v.invisible = true;   // sos vos → no se dibuja al vendedor
      spawnIn(gi, v ? Math.max(1, Math.round(v.x / Level.TILE)) : 11);
      if (Sfx.setRoomTrack) Sfx.setRoomTrack('office');
    }
    flash(); syncCompanions(); syncHud();
  }

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
  // BUS DE EVENTOS en tiempo real (npcs-vivos §5.3 F4a): lo FRESCO que hiciste, para que el mundo reaccione.
  // + las IDEAS que te tiraron los linyeras se marcan HECHAS acá (chat-linyera-ux §1: "el pibe me hizo caso").
  function evlog(ev, detail) { try { if (typeof Eventos !== 'undefined') Eventos.push(ev, detail); if (typeof Ideas !== 'undefined') Ideas.check(ev, detail); } catch (e) {} }
  // ANTI-NaN (specs/estado-jugador.md §1): num() = guard fail-closed en inputs; sanePlayer() = saneador central.
  const num = (v, def) => (Number.isFinite(+v) ? +v : def);
  const PLAYER_NUMS = { hp: 50, coins: 0, caramelos: 0, ammo: 0, falopa: 0, diosa: 0, carne: 0, fiambre: 0, birras: 0, forros: 0, flores: 0, spitDmg: 14 };
  function sanePlayer() {
    if (!player) return;
    for (const k in PLAYER_NUMS) if (player[k] !== undefined && !Number.isFinite(player[k])) {
      player[k] = PLAYER_NUMS[k];
      tel('nan', { result: k }); evlog('nan', k);   // al dashboard: QUÉ campo se rompió (para cazar la fuente con datos)
    }
  }
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
    if (bodegonOn) { bodegonOn = false; if (typeof Salon !== 'undefined' && Salon.leave) Salon.leave(); }   // F2b: cortar el real-time del bodegón al reiniciar
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
    cineArchive = null; guardaFreeUsed = false; guardaAsk = {}; newsQuest = null; mundialQuest = null; mundialApproach = null; ambientBubbles = []; ambientCd = 5;   // cine/quests/chusmerío se resetean por run
    secretUnlocked = false; arcadeWon.pacman = arcadeWon.galaga = arcadeWon.frogger = false;
    gaveBeers = false; borrachosFed = 0; borrachosHappy = false; moneyRecovered = false; fifaWon = false; stunUntil = 0; stunPending = false;
    bunkerUnlocked = false;   // cada loop hay que volver a ganarse el búnker (loop "limpio")
    loopCount = 0; chinoFrontOpen = false; decayAcc = 0; trucoWon = false; trucoEverWon = false; armado = false; tesoroTaken = false; chinoEntered = false;   // loop de supervivencia, de cero
    cueveroUnlocked = false; tahurDiscovered = false; guidoSummoned = false; guidoRecruited = false; guidoFollowing = false;   // gate del cuevero, de cero
    trucoSeisOffered = false; trucoSeisActive = false; for (const k in trucoMatesRec) delete trucoMatesRec[k];   // truco de a 6, de cero
    chipReset(); chipEverCured = false; chipLoops = 0;   // quest del chip, de cero
    spinoffReturnRoom = null; for (const k in entradoEdif) delete entradoEdif[k]; for (const k in vecinoState) delete vecinoState[k];   // edificios clausurados + chusmerío del vecino, de cero
    clearCompanions();   // compañeros (linyera/Guido) que te seguían, de cero
    arcadeGame = null; superGame = null; vinilosGame = null; spinoffGame = null; tiendaGame = null; teloGame = null; bodegonGame = null; lavalleGame = null; globoGame = null; bunkerMapaGame = null; obeliscoGame = null; subteGame = null; plazaGame = null; finaleGame = null; roamingNpc = null;
    trucoPvpGame = null; trucoPeer = null; truco6Game = null; truco6 = null; tableWait = null; piqueteGame = null; sogaGame = null; bomboGame = null; ollaGame = null; pancaGame = null;   // mesas/partidas multijugador, de cero
    peerChatFrom = null;
    ninjaRunT = -99; ninjaRunRoom = -1;
    dollarBubbles = []; shotsSeen = 0; legalBlindUntil = 0;
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
      v: 2, current, px: p.x, py: p.y,
      player: { hp: p.hp, ammo: p.ammo, coins: p.coins, forros: p.forros, flores: p.flores, caramelos: p.caramelos,
        birras: p.birras, carne: p.carne, fiambre: p.fiambre, diosa: p.diosa, falopa: p.falopa,
        spitDmg: p.spitDmg, hasMegaDrive: !!p.hasMegaDrive, hasCementoTicket: !!p.hasCementoTicket,
        inventory: (p.inventory || ['escupitajo']).slice(), weapon: p.weapon || 'escupitajo' },
      flags: { stormed, bought, hasVale, challengeForVale, secretUnlocked, gaveBeers, borrachosFed,
        borrachosHappy, moneyRecovered, fifaWon, bunkerUnlocked, loopCount, chinoFrontOpen, trucoWon, trucoEverWon, armado, tesoroTaken, chinoEntered,
        cueveroUnlocked, tahurDiscovered, guidoSummoned, guidoRecruited, guidoFollowing, trucoSeisOffered,
        chipped, chipStep, playingAs, chipEverCured, chipLoops, chipParts: { ...chipParts },
        entrado: { ...entradoEdif }, vecino: JSON.parse(JSON.stringify(vecinoState)), trucoMates: { ...trucoMatesRec } },
      arcadeWon: { pacman: arcadeWon.pacman, galaga: arcadeWon.galaga, frogger: arcadeWon.frogger },
      // RF-4: estado anclado por POSICIÓN (sala, x), no por índice de array → robusto a reordenar entidades.
      // El pickup/npc se identifica por su x en la sala (su "id" natural), no por su lugar en el array.
      pickups: states.map(s => s.pickups.filter(pk => pk.taken).map(pk => Math.round(pk.x))),
      npcs: rooms.map(rm => (rm.npcs || []).filter(n => n.falopaTaken || n.limosnaTaken).map(n => ({ x: Math.round(n.x), f: !!n.falopaTaken, l: !!n.limosnaTaken }))),
      oracleMem,   // memoria de los linyeras por identidad (agent.memory)
    };
  }
  // restore(snap): reconstruye el mundo (reset) y le aplica el snapshot. true si cargó.
  function restore(snap) {
    if (!snap || (snap.v !== 1 && snap.v !== 2) || typeof snap.current !== 'number') return false;
    reset();                                              // mundo fresco + defaults
    current = Math.max(0, Math.min(rooms.length - 1, snap.current));
    Object.assign(player, snap.player || {});
    sanePlayer();   // anti-NaN: un save contaminado (NaN→null en JSON) no revive el bug
    if (!Array.isArray(player.inventory) || !player.inventory.length) player.inventory = ['escupitajo'];   // saneo inventario
    if (!WEAPONS[player.weapon]) player.weapon = 'escupitajo';
    player.x = snap.px; player.y = snap.py; player.vx = player.vy = 0; player.alive = true;
    const f = snap.flags || {};
    stormed = !!f.stormed; bought = !!f.bought; hasVale = !!f.hasVale; challengeForVale = !!f.challengeForVale;
    secretUnlocked = !!f.secretUnlocked; gaveBeers = !!f.gaveBeers; borrachosFed = f.borrachosFed | 0;
    borrachosHappy = !!f.borrachosHappy; moneyRecovered = !!f.moneyRecovered; fifaWon = !!f.fifaWon;
    bunkerUnlocked = !!f.bunkerUnlocked; loopCount = f.loopCount | 0; chinoFrontOpen = !!f.chinoFrontOpen;
    trucoWon = !!f.trucoWon; trucoEverWon = !!f.trucoEverWon; armado = !!f.armado; tesoroTaken = !!f.tesoroTaken; chinoEntered = !!f.chinoEntered;
    cueveroUnlocked = !!f.cueveroUnlocked; tahurDiscovered = !!f.tahurDiscovered; guidoSummoned = !!f.guidoSummoned; guidoRecruited = !!f.guidoRecruited; guidoFollowing = !!f.guidoFollowing;
    trucoSeisOffered = !!f.trucoSeisOffered; trucoSeisActive = false; for (const k in trucoMatesRec) delete trucoMatesRec[k]; if (f.trucoMates) Object.assign(trucoMatesRec, f.trucoMates);
    chipReset(); chipped = !!f.chipped; chipStep = f.chipStep || ''; playingAs = f.playingAs || 'carpo'; chipEverCured = !!f.chipEverCured; chipLoops = f.chipLoops | 0; if (f.chipParts) Object.assign(chipParts, f.chipParts);   // quest del chip
    for (const k in entradoEdif) delete entradoEdif[k]; if (f.entrado) Object.assign(entradoEdif, f.entrado);
    for (const k in vecinoState) delete vecinoState[k]; if (f.vecino && typeof f.vecino === 'object') Object.assign(vecinoState, JSON.parse(JSON.stringify(f.vecino)));
    const aw = snap.arcadeWon || {}; arcadeWon.pacman = !!aw.pacman; arcadeWon.galaga = !!aw.galaga; arcadeWon.frogger = !!aw.frogger;
    if (snap.pickups) {
      if (snap.v >= 2) states.forEach((s, i) => { const xs = snap.pickups[i] || []; s.pickups.forEach(pk => { if (xs.includes(Math.round(pk.x))) pk.taken = true; }); });   // por posición (RF-4)
      else states.forEach((s, i) => s.pickups.forEach((pk, j) => { if (snap.pickups[i]) pk.taken = !!snap.pickups[i][j]; }));   // legacy por índice (saves v1)
    }
    if (snap.npcs) {
      if (snap.v >= 2) rooms.forEach((rm, i) => { const arr = snap.npcs[i] || []; (rm.npcs || []).forEach(n => { const d = arr.find(o => o.x === Math.round(n.x)); if (d) { n.falopaTaken = d.f; n.limosnaTaken = d.l; } }); });
      else rooms.forEach((rm, i) => (rm.npcs || []).forEach((n, j) => { const d = snap.npcs[i] && snap.npcs[i][j]; if (d) { n.falopaTaken = d.f; n.limosnaTaken = d.l; } }));
    }
    for (const k in oracleMem) delete oracleMem[k];   // restaurá la memoria de los linyeras del snapshot
    if (snap.oracleMem) Object.assign(oracleMem, snap.oracleMem);
    if (stormed) Sfx.startHum();
    updateCam(); elFloor.textContent = TX(rooms[current].name);
    placeRoamingOraculo(Math.floor((player.x + player.w / 2) / Level.TILE));
    syncCompanions();   // re-derivá los compañeros (linyera/Guido) desde los flags restaurados
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
    if (spinoffLevel) return;   // no guardamos mientras estás en el nivel-AI generado (es efímero)
    if ((state !== 'playing' && state !== 'chat') || typeof SaveStore === 'undefined' || !SaveStore.write) return;
    if (t - lastSave < 5000) return;
    lastSave = t;
    const snap = serialize(); if (snap) SaveStore.write(snap);
  }
  // ── CHECKPOINTS POR HITO (specs/guardar-partida.md): cada arista del grafo guarda un snapshot aparte del
  // autosave; morir post-búnker ofrece "⏪ volver al último hito" en vez de perder la partida entera.
  // Modo HARDCORE (⚙ Opciones, ts_hardcore) = permadeath clásico. F3: viaja con tu nick (patrón barrio-mem).
  const CHK_KEY = 'ts_checkpoint_v1';
  const isHardcore = () => { try { return localStorage.getItem('ts_hardcore') === '1'; } catch (e) { return false; } };
  function loadCheckpoint() { try { const c = JSON.parse(localStorage.getItem(CHK_KEY) || 'null'); return (c && c.snap && c.snap.v) ? c : null; } catch (e) { return null; } }
  // título del hito en el idioma del jugador (busca la arista viva; fallback al título guardado)
  function chkTitle(chk) {
    const e = ((typeof Historia !== 'undefined' && Historia.edges) || []).find(x => x.id === (chk && chk.edge));
    const en = typeof I18n !== 'undefined' && I18n.short && I18n.short() === 'en';
    return (e && ((en && e.title_en) || e.title)) || (chk && chk.title) || '';
  }
  let chkPostT = 0;
  function saveCheckpoint(edgeId) {
    try {
      // en sub-modos (ej. el juramento pasa DENTRO de Lavalle) serialize() da null → usamos el último autosave
      // (≤5s viejo; los flags que viven en localStorage —juramento, piqueteWon— quedan afuera del snap igual)
      const snap = serialize() || (typeof SaveStore !== 'undefined' && SaveStore.read ? SaveStore.read() : null);
      if (!snap) return;
      const edges = (typeof Historia !== 'undefined' && Historia.edges) || [];
      const e = edges.find(x => x.id === edgeId);
      const chk = { edge: edgeId, title: (e && e.title) || edgeId, ts: Date.now(), snap };
      localStorage.setItem(CHK_KEY, JSON.stringify(chk));
      // F3: cross-device por nick (fire-and-forget, debounced 30s — patrón Eventos.sync)
      const now = Date.now();
      if (now - chkPostT > 30000) { chkPostT = now;
        try { fetch(CHK_PROXY + '/checkpoint', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nick: playerNick(), chk }), keepalive: true }).catch(() => {}); } catch (e2) {}
      }
    } catch (e) {}
  }
  const CHK_PROXY = 'https://llm-tormenta-solar.cybercirujas.club';
  // F3 (arranque): si el server tiene un checkpoint MÁS NUEVO con tu nick → bajarlo; y si no hay autosave
  // local pero sí checkpoint (dispositivo nuevo) → el checkpoint SE VUELVE el save (aparece CONTINUAR solo).
  function syncCheckpoint() {
    try {
      fetch(CHK_PROXY + '/checkpoint?nick=' + encodeURIComponent(playerNick())).then(r => (r.ok ? r.json() : null)).then(d => {
        if (!d || !d.chk || !d.chk.snap) return;
        const loc = loadCheckpoint();
        if (!loc || (d.chk.ts || 0) > (loc.ts || 0)) localStorage.setItem(CHK_KEY, JSON.stringify(d.chk));
        const cur = loadCheckpoint();
        if (cur && typeof SaveStore !== 'undefined' && !SaveStore.has() && SaveStore.write) {
          SaveStore.write(cur.snap);
          const b = document.getElementById('continueBtn'); if (b) b.classList.remove('hidden');
        }
      }).catch(() => {});
    } catch (e) {}
  }

  function setMsg(t, c, ms = 3000) {
    elMsg.textContent = t; elMsg.style.color = c || '#ff5252'; elMsg.style.opacity = '1';
    const mul = (typeof Config !== 'undefined' && Config.msgMs) ? Config.msgMs : 1;   // duración configurable
    msgUntil = performance.now() + ms * mul;
    msgSkippable = ms >= 2500;   // los carteles (narrativos/transición) se saltan con E/click; solo los toasts fugaces (<2.5s) no
  }
  // saltar el cartel narrativo (E o click izq), además del timeout. true si había uno y lo cerró (consume el input).
  function dismissMsg() {
    if (!msgSkippable || performance.now() >= msgUntil) return false;
    msgUntil = 0; msgSkippable = false; elMsg.style.opacity = '0';
    return true;
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
      if (d.gate && !gateMet(d.gate)) continue;   // gating declarativo: puerta oculta hasta cumplir su `gate` (ex ifs por-id)
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
    if (bodegonOn) { const pe = nearestPeer(); if (pe) { openPeerChat(pe); return; } }   // F2b.2: en el bodegón, E cerca de otro jugador = chat privado
    if (dcCinemaT > performance.now() && hasTag(room(), 'datacenter')) { dcCinemaT = 0; return; }   // D2: [E] cierra la cinemática del endgame
    const it = nearestInteract();
    if (!it) { if (hasTag(room(), 'carteles')) tryReadCartel(); return; }   // CARTELES C1: si no hay nada cerca y estás bajo un cartel → leerlo
    if (it.kind === 'door') {
      if (stormed && it.d.collapsesOnStorm) { setMsg(TL('g.ruina'), '#b0a0a0', 4500); return; }
      const h = DOOR_HANDLERS[it.d.id];   // puerta con handler propio (lanza sub-modo / bloquea); si no, transición normal
      if (h && h(it.d)) return;           // handled (lanzó o bloqueó); si devolvió false → cae a transition
      transition(it.d);
    }
    else if (it.kind === 'npc') handleNpc(it.n);
    else if (it.kind === 'machine') handleMachine(it.m);
    else if (it.kind === 'cuevero') handleCuevero(it.c);
  }
  function launchArcade(game, opts) { arcadeGame = Arcade.create(game, opts); state = 'arcade'; tel('arcade', { result: game }); evlog('arcade', game); elPrompt.classList.add('hidden'); elHud.classList.add('hidden'); elFloor.classList.add('hidden'); if (elChipBanner) elChipBanner.classList.add('hidden'); }
  // REGISTRO de puertas con HANDLER propio (lanzan sub-modo o bloquean con condición). El handler devuelve true si
  // manejó la puerta (lanzó/bloqueó) o false para caer a la transición normal. La puerta DECLARA su id (data).
  const DOOR_HANDLERS = {
    // BOCA DEL SUBTE (subte.md §3-4): bajás a la ESTACIÓN de Florida (Línea B).
    subteb: () => { enterSubte('florida'); return true; },
    super: () => { if (!stormed) enterSuper(); else if (chinoFrontOpen) { chinoFrontOpen = false; enterSuper(true); } else setMsg(T('g.super.barricada'), '#ff5252', 6500); return true; },
    chinoback: () => { enterSuper(); return true; },   // entrada de servicio desde el refugio
    chinotruco: () => { if (trucoWon) { trucoWon = false; enterSuper(); } else setMsg(T('g.truco.doorLocked'), '#ffd54f', 5200); return true; },
    vinilos: () => { enterVinilos(); return true; },
    // DEPÓSITO de la galería (F3, llave 🔑 kind:'key'): puerta VISIBLE pero cerrada; con la llave (del gurú) la abrís
    // UNA vez → botín (se consume la llave). Gateada por `{not:{flag:'depositoOpen'}}` → desaparece tras saquearla.
    deposito: () => {
      if (player.inventory && player.inventory.includes('llave')) {
        consumeItem('llave'); try { localStorage.setItem('ts_deposito_open', '1'); } catch (e) {}
        const coins = 120, ammo = 40, caramelos = 15;
        player.coins = (player.coins || 0) + coins; player.ammo = (player.ammo || 0) + ammo; player.caramelos = (player.caramelos || 0) + caramelos;
        addItem('birra'); addItem('birra');   // + un par de BIRRAS 🍺 (buff temporal) en el botín
        if (typeof Sfx !== 'undefined' && Sfx.pickup) Sfx.pickup(); syncHud();
        setMsg(T('g.deposito.open', { coins, ammo, caramelos }), '#7CFC00', 6500);
      } else { setMsg(T('g.deposito.locked'), '#ff9800', 5000); if (typeof Sfx !== 'undefined' && Sfx.empty) Sfx.empty(); }
      return true;
    },
    cambio: () => { if (!stormed) { setMsg(TL('g.cambio.cola'), '#ffd54f', 4500); return true; } return false; },          // pre-tormenta la cola no te deja; post → transición
    abandonado: () => { if (!borrachosHappy) { setMsg(TL('g.abandonado'), '#ffd54f', 4800); return true; } return false; },  // borrachines bloquean hasta el regalo
  };
  // REGISTRO de acciones de NPC (verbo declarativo `action` → handler). El entity DECLARA su action (data); el motor
  // la despacha por el registro (§6.97 primitiva=código, componer=dato). Agregar una mecánica = sumar acá un verbo.
  // Las que lanzan SUB-MODOS (truco/frogger) son lanzadores: arman el módulo y cambian de estado.
  const NPC_ACTIONS = {
    frogger: () => { challengeForVale = true; setMsg(T('g.frogger.start'), '#ff2e88', 1000); launchArcade('frogger'); },
    truco:   () => {
      if (guidoFollowing && !cueveroUnlocked) { guidoBeatsTahur(); return; }   // ruta A: Guido juega y gana por vos
      // RUTA A en curso (elegiste "tengo contactos"): el tahúr NO te ofrece de a 6 — ya estás en la cadena de Guido.
      // Te recuerda que vayas a buscarlo/traerlo. (Bug: antes ofrecía de a 6 aunque hubieras elegido los contactos.)
      if (!cueveroUnlocked && guidoSummoned) { setMsg(T('g.truco.goGuido'), '#ffd54f', 8000); return; }
      // ruta B "de a 6": el tahúr juega 3 vs 3. Si no se ofreció aún, lo propone; si falta equipo, te manda a buscarlo;
      // con 2 compañeros reclutados → se juega de a 6 (tu duelo real + los de tus compañeros por skill).
      if (!cueveroUnlocked) {
        const team = Object.keys(trucoMatesRec).length;
        if (!trucoSeisOffered) { trucoSeisOffered = true; setMsg(T('g.truco.seisOffer'), '#ffd54f', 9000); syncCompanions(); return; }
        if (team < 2) { setMsg(T('g.truco.seisNeed', { n: 2 - team }), '#ffd54f', 8000); return; }
        trucoSeisActive = true; setMsg(T('g.truco.seisSit'), '#ffd54f', 1200); launchArcade('truco', { opp: 'tahur' }); return;
      }
      setMsg(T('g.truco.sit'), '#ffd54f', 1000); launchArcade('truco', { opp: 'tahur' });   // ya destrabado → 1v1 por flores
    },
    guido:   n => handleGuido(n),
    mate:    n => recruitMate(n),
    companion: n => { setMsg(TX(n.dialog) || '...', '#aef0c0', 3500); Sfx.pickup(); },
    vecino:  n => handleVecino(n),
    chori:   () => redeemChori(),
    shop:    n => buyFromShop(n),
    tienda:  n => enterTienda(n),
    borracho: n => giveBorracho(n),
    lujo:    n => handleLujo(n),
    totem:   n => grabTotem(n),
    tesoro:  n => grabTesoro(n),
    loop:    n => doLoop(n),
    limosna: n => giveLimosna(n),
    iorio:   n => giveIorio(n),
    armas:   n => buyArmas(n),
    chat:    n => openChat(n),
    guarda:  n => guardaCine(n),
    fifa:    () => playFifa(),
    compu:   () => openCarteles(),   // CARTELES C1: la computadora del tablón → overlay para fijar/ver carteles
    datacenter: () => openDatacenter(),   // DATACENTER D1: la computadora del datacenter → overlay para aportar partes
    mundoai: () => openMundoAI(),   // QUEST MUNDO-AI: la MÁQUINA DE MUNDOS del gurú → overlay para generar un mundo por seed
    globo:   () => enterGlobo(),   // MAPA A: la sala de situación del búnker → el globo con satélites/bases
    plano:   () => enterBunkerMapa(),   // MAPA B: el plano del búnker → construir tu búnker (grilla + radar)
    moza:    n => handleMoza(n),
  };
  // MAPA DEL MUNDO (specs/mapas-satelites-bunkers.md): sub-modo GLOBO que gira (satélites rebeldes + bases).
  function enterGlobo() {
    if (typeof Globo === 'undefined' || !Globo.create) return false;
    globoGame = Globo.create({ satDown: satDown() }); state = 'globo';
    if (typeof Input !== 'undefined' && Input.clear) Input.clear();
    elPrompt.classList.add('hidden'); elHud.classList.add('hidden'); elFloor.classList.add('hidden'); if (elChipBanner) elChipBanner.classList.add('hidden'); elMsg.textContent = '';
    return true;
  }
  // LAVALLE E2 (specs/lavalle.md): pasaste el corte → la plaza del Obelisco. Al salir volvés al piquete.
  const satDown = () => { try { return localStorage.getItem('ts_sat_down') === '1'; } catch (e) { return false; } };
  function enterObelisco() {
    if (typeof Obelisco === 'undefined' || !Obelisco.create) return false;
    obeliscoGame = Obelisco.create({ stormed, satDown: satDown() }); state = 'obelisco';
    if (!lsFlag('ts_obelisco_visto')) applyEdge('obelisco_llegada', 'obeliscoLlegado');   // GRAFO (E4)
    evlog('hito', 'llegó al Obelisco');   // momento memorable (memoria del barrio)
    if (typeof Input !== 'undefined' && Input.clear) Input.clear();
    elPrompt.classList.add('hidden'); elHud.classList.add('hidden'); elFloor.classList.add('hidden'); if (elChipBanner) elChipBanner.classList.add('hidden'); elMsg.textContent = '';
    return true;
  }
  // LA ESTACIÓN DE SUBTE (subte.md §4): bajás por una boca → andén top-down. returnTo = dónde volvés al salir.
  function enterSubte(station, returnTo) {
    if (typeof Subte === 'undefined' || !Subte.create) return false;
    if (returnTo) subteReturn = returnTo;   // en un VIAJE (travel:X) no lo pisamos: conservás dónde volvés a la superficie
    const available = ['florida'];          // estaciones jugables que YA existen
    if (lsFlag('ts_sat_down')) { available.push('lavalle'); available.push('catedral'); }   // tras herir al satélite: Lavalle + Catedral (→ Plaza de Mayo, Nivel 2)
    subteGame = Subte.create({ station, subeReady: lsFlag('ts_sube_charged'), available,
      hasBoleto: !!(player.inventory && player.inventory.includes('boleto')), coins: player.coins || 0, boletoPrice: 20 }); state = 'subte';
    evlog('hito', 'bajó al subte (' + station + ')');
    if (typeof Input !== 'undefined' && Input.clear) Input.clear();
    elPrompt.classList.add('hidden'); elHud.classList.add('hidden'); elFloor.classList.add('hidden'); if (elChipBanner) elChipBanner.classList.add('hidden'); elMsg.textContent = '';
    return true;
  }
  // PLAZA DE MAYO (subte.md §10 / F4): salís del subte en Catedral → la plaza circular (arranque del Nivel 2).
  function enterPlaza() {
    if (typeof Plaza === 'undefined' || !Plaza.create) return false;
    // Nivel 2 (arco sanmartiniano): el requisito de la victoria es el CHIP DEL LIBERTADOR (tumba de San Martín),
    // no el datacenter comunitario. Solo pasamos si ya ganaste antes (para el estado "ya liberado").
    plazaGame = Plaza.create({ won2: lsFlag('ts_nivel2_win') }); state = 'plaza';
    applyEdge('plaza_llegada', 'enPlaza');   // GRAFO F4c: hito reconocido → map + checkpoint + ticker
    evlog('hito', 'llegó a Plaza de Mayo');
    if (typeof Input !== 'undefined' && Input.clear) Input.clear();
    elPrompt.classList.add('hidden'); elHud.classList.add('hidden'); elFloor.classList.add('hidden'); if (elChipBanner) elChipBanner.classList.add('hidden'); elMsg.textContent = '';
    return true;
  }
  // MAPA B (specs/mapas-satelites-bunkers.md F2): el plano del búnker — construís módulos desde la entrada de tu base.
  function enterBunkerMapa() {
    if (typeof BunkerMapa === 'undefined' || !BunkerMapa.create) return false;
    bunkerMapaGame = BunkerMapa.create({ player, threats: () => {
      const out = [];   // enemigos VIVOS por sala (radar REAL) — states[i].enemies es el estado vivo del mundo
      for (let i = 0; i < rooms.length; i++) { const st = states && states[i]; if (!st) continue;
        const n = (st.enemies || []).filter(e => e && e.alive).length;
        if (n) out.push({ f: i / rooms.length, n, name: TX(rooms[i].name) }); }
      return out;
    } }); state = 'bunkermapa';
    if (typeof Input !== 'undefined' && Input.clear) Input.clear();
    elPrompt.classList.add('hidden'); elHud.classList.add('hidden'); elFloor.classList.add('hidden'); if (elChipBanner) elChipBanner.classList.add('hidden'); elMsg.textContent = '';
    return true;
  }
  function handleNpc(n) {
    if (n && chipTry(n)) return;   // QUEST DEL CHIP: si estás chipeado y este NPC avanza el arco, lo maneja el quest
    const fn = n && NPC_ACTIONS[n.action];
    if (fn) fn(n);
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
  // LA RUBIA del bodegón + el ROPERO (gag recurrente, specs/multijugador.md §3.2.2): te invita a "probar tragos en la
  // puerta de atrás"; si le decís que SÍ (2da E), aparece un ropero de 2 metros y te raja del bar. Single-player, canned.
  let mozaInvited = false;
  function handleMoza(n) {
    Sfx.pickup();
    if (!mozaInvited) { mozaInvited = true; setMsg(T('g.moza.invite'), '#ff8fc8', 6000); return; }
    mozaInvited = false;
    if (typeof Telo !== 'undefined' && Telo.create) { enterTelo(); return; }   // aceptás → entrás al TELO de lujo (sub-modo top-down)
    flash(); Sfx.hurt(); ejectToStreet(T('g.moza.ropero'));                     // fallback (sin el sub-modo): el ropero directo
  }
  function enterTelo() {
    teloGame = Telo.create(chipLoops); state = 'telo'; flash();   // chipLoops≥3 → el robot ya no te chipa: te RESCATAN (telo.js)
    if (Sfx.setRoomTrack) Sfx.setRoomTrack('telo');   // 🎵 música de telo bien grasa (chiptune lento)
    elPrompt.classList.add('hidden'); elHud.classList.add('hidden'); elFloor.classList.add('hidden'); if (elChipBanner) elChipBanner.classList.add('hidden'); elMsg.textContent = '';
  }
  // T2: el bodegón se ve de ARRIBA (sub-modo top-down): mesas + peers online sentados + la rubia en el mostrador.
  function enterBodegon() {
    if (typeof Bodegon === 'undefined' || !Bodegon.create) return false;   // sin el sub-modo → cae al side-scroller (degradación)
    bodegonGame = Bodegon.create(); state = 'bodegon';
    elPrompt.classList.add('hidden'); elHud.classList.add('hidden'); elFloor.classList.add('hidden'); if (elChipBanner) elChipBanner.classList.add('hidden'); elMsg.textContent = '';
    return true;
  }
  // LAVALLE (specs/lavalle.md E1.5): el piquete se ve TOP-DOWN (sub-modo); sin el módulo → cae al side-scroller (sala 52).
  function enterLavalle(intro) {
    if (typeof Lavalle === 'undefined' || !Lavalle.create) return false;
    lavalleGame = Lavalle.create({ intro, allWon: piqueteAllWon(), stormed, won: loadPiqueteWon(), juramento: lsFlag('ts_juramento'), subteUnlocked: lsFlag('ts_sat_down'), spawn: lavalleSpawn }); lavalleSpawn = null; state = 'lavalle';
    // MULTIJUGADOR (specs/lavalle-multijugador.md F1): Lavalle es un ESPACIO aparte del bodegón; te ves con los otros
    // que están en el piquete. Aditivo: sin red, queda la postal single-player.
    if (typeof Salon !== 'undefined' && Salon.enabled && Salon.join) Salon.join(playerNick(), 'carpo', () => {}, 'lavalle');
    if (typeof Input !== 'undefined' && Input.clear) Input.clear();   // soltar teclas apretadas al entrar (si no, entrás y salís al toque)
    elPrompt.classList.add('hidden'); elHud.classList.add('hidden'); elFloor.classList.add('hidden'); if (elChipBanner) elChipBanner.classList.add('hidden'); elMsg.textContent = '';
    return true;
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
  // === ARMAS + INVENTARIO (specs/inventario-armas.md) — las armas son DATA; player.inventory guarda los ids, player.weapon = la equipada ===
  const WEAPONS = {
    // post-tormenta el escupitajo escupe DÓLARES (apaciguan a la gente): se muestra como "Dólares 💵" (stormEmoji/stormLabel).
    escupitajo: { id: 'escupitajo', emoji: '💦', label: 'g.wpn.escupitajo', stormEmoji: '💵', stormLabel: 'g.wpn.dolares' },
    viola:      { id: 'viola',      emoji: '🎸', label: 'g.wpn.viola' },         // premio del tesoro: dispara RISAS (apacigua a cualquiera)
    // FIERRO CRIOLLO genérico (compat saves viejas): va al inventario pero el Carpo NO lo equipa — gag pacifista.
    fierro:     { id: 'fierro',     emoji: '🪢', label: 'g.wpn.fierro', noEquip: true, refuse: 'g.wpn.refuse' },
    // ARMAS CRIOLLAS (specs/inventario-armas.md §6): se compran al armero, pero el Carpo SOLO las usa en los SUEÑOS
    // (niveles generados, ctx:'dream'); en la calle real se niega (refuse). Cada una pega x3 contra UN tipo de bicho.
    rebenque:   { id: 'rebenque',   emoji: '🪢', label: 'g.wpn.rebenque',   ctx: 'dream', effectiveVs: ['pacman'],          dmgMul: 3, baseDmg: 14 },
    boleadoras: { id: 'boleadoras', emoji: '🔗', label: 'g.wpn.boleadoras', ctx: 'dream', effectiveVs: ['dron', 'galaga'],  dmgMul: 3, baseDmg: 14 },
    facon:      { id: 'facon',      emoji: '🔪', label: 'g.wpn.facon',      ctx: 'dream', effectiveVs: ['peaton'],          dmgMul: 3, baseDmg: 16 },
    fal:        { id: 'fal',        emoji: '🔫', label: 'g.wpn.fal',        ctx: 'dream', effectiveVs: ['cuevero'],         dmgMul: 3, baseDmg: 18 },
    // CONSOLA (quest del chip): no es arma, es ÍTEM USABLE → "usar" hackea el chip. F2: el use es DATA (kind:'fn').
    consola:    { id: 'consola',    emoji: '🎮', label: 'g.wpn.consola', use: { kind: 'fn', fn: 'useConsola' } },
    // ITEMS DE PIQUETE (premios de los mini-juegos co-op de Lavalle). F2 (specs/inventario-armas.md §F2): el CHORIPÁN
    // es COMIDA → "usar" desde [I] te cura (efecto DATA-driven kind:'heal') y se CONSUME. Los demás quedan de flavor.
    chori:      { id: 'chori',      emoji: '🌭', label: 'g.wpn.chori',   use: { kind: 'heal', amount: 30 } },   // olla → comida (+vida)
    fernet:     { id: 'fernet',     emoji: '🥤', label: 'g.wpn.fernet',  use: { kind: 'heal', amount: 25 } },   // pancarta → Fernet con Coca (+vida)
    mortero:    { id: 'mortero',    emoji: '🎆', label: 'g.wpn.mortero', use: { kind: 'ammo', amount: 25 } },    // bombo → prendés el mortero (+munición)
    palo:       { id: 'palo',       emoji: '🏏', label: 'g.wpn.palo',    noEquip: true },
    molotov:    { id: 'molotov',    emoji: '🧨', label: 'g.wpn.molotov', noEquip: true },
    // TARJETA SUBE (quest del subte, specs/subte.md §2.6): coleccionable; la cargás en el tótem del chino.
    sube:       { id: 'sube',       emoji: '💳', label: 'g.wpn.sube',    noEquip: true },
    // BOLETO de subte (F3, specs/inventario-armas.md §7 kind:'ticket'): lo VENDE el boletero; pasás el molinete UNA vez
    // (se consume ahí, no se equipa). Alternativa de un uso a la SUBE. El kind 'ticket' de [I] es informativo (se usa en el molinete).
    boleto:     { id: 'boleto',     emoji: '🎫', label: 'g.wpn.boleto',  noEquip: true, use: { kind: 'ticket' } },
    // LLAVE del depósito (F3, kind:'key'): te la da el gurú con el tesoro; abre la puerta gateada del DEPÓSITO en la
    // galería (se consume al abrir). El kind 'key' de [I] es informativo (se usa en la puerta). specs/inventario-armas.md §7.2.
    llave:      { id: 'llave',      emoji: '🔑', label: 'g.wpn.llave',   noEquip: true, use: { kind: 'key' } },
    // BIRRA (F3, kind:'buff'): la birra del Carpo → te envalentonás por unos segundos (BUFF temporal con timer). Data:
    // use.buffs = lista de efectos, use.secs = duración. Se consume. specs/inventario-armas.md §7.3.
    birra:      { id: 'birra',      emoji: '🍺', label: 'g.wpn.birra',   noEquip: true, use: { kind: 'buff', buffs: ['speed', 'regen', 'shield'], secs: 8 } },
  };
  // BUFFS temporales (Inventario F3, kind:'buff'). Efectos con timer en segundos (decrementan por dt, sin reloj de pared →
  // se pausan en los sub-modos). `tickBuffs` deriva los flags que leen player.js (speedMul/shielded) + cura con 'regen'.
  const BUFF_META = { speed: { emoji: '🏃' }, regen: { emoji: '💚' }, shield: { emoji: '🛡️' } };
  const BUFF_REGEN = 6;   // vida/seg del buff 'regen'
  function tickBuffs(dt) {
    if (!player) return;
    if (!player.buffs || !player.buffs.length) { player.speedMul = 1; player.shielded = false; return; }
    for (const x of player.buffs) x.t -= dt;
    player.buffs = player.buffs.filter(x => x.t > 0);
    const has = b => player.buffs.some(x => x.b === b);
    player.speedMul = has('speed') ? 1.4 : 1;
    player.shielded = has('shield');
    if (has('regen') && player.hp < MAXHP) player.hp = Math.min(MAXHP, player.hp + BUFF_REGEN * dt);
  }
  const isDream = () => spinoffLevel;   // los niveles GENERADOS son "los sueños del Carpo": ahí SÍ usa el fierro criollo
  function wpnEmoji(id) { const w = WEAPONS[id]; if (!w) return '💦'; return (stormed && w.stormEmoji) ? w.stormEmoji : w.emoji; }
  function wpnLabel(id) { const w = WEAPONS[id]; if (!w) return ''; return T((stormed && w.stormLabel) ? w.stormLabel : w.label); }
  function addItem(id) { if (!player.inventory) player.inventory = ['escupitajo']; if (!player.inventory.includes(id)) player.inventory.push(id); }
  function equipWeapon(id) { const w = WEAPONS[id]; if (w && !w.noEquip && !w.use && player.inventory && player.inventory.includes(id)) { player.weapon = id; return true; } return false; }
  function consumeItem(id) { if (player.inventory) player.inventory = player.inventory.filter(x => x !== id); if (player.weapon === id) player.weapon = 'escupitajo'; syncHud(); }
  // F2 (specs/inventario-armas.md §F2): USAR un ítem no-arma. El efecto es DATA (`w.use = {kind,...}`): 'heal' (comida →
  // +vida, se consume), 'ammo' (+munición, se consume), 'fn' (llama una función nombrada, ej. la consola del chip).
  // Aditivo: cualquier ítem futuro es puro dato — no toca esta función.
  function useItem(id) {
    const w = WEAPONS[id]; if (!w || !w.use || !player.inventory || !player.inventory.includes(id)) return;
    const u = (typeof w.use === 'string') ? { kind: 'fn', fn: w.use } : w.use;   // compat con el formato viejo (string)
    if (u.kind === 'fn') { const fn = { useConsola }[u.fn]; if (fn) fn(); return; }
    if (u.kind === 'heal') {
      if (player.hp >= MAXHP) { setMsg(T('g.inv.full'), '#FFD54F', 3500); return; }   // no lo malgastás si ya estás al full
      const before = player.hp; player.hp = Math.min(MAXHP, player.hp + (u.amount || 20));
      consumeItem(id); if (typeof Sfx !== 'undefined' && Sfx.pickup) Sfx.pickup(); closeInv();
      setMsg(T('g.inv.ate', { item: wpnLabel(id), n: player.hp - before }), '#7CFC00', 4000); return;
    }
    if (u.kind === 'ammo') {
      player.ammo = (player.ammo || 0) + (u.amount || 20); consumeItem(id);
      if (typeof Sfx !== 'undefined' && Sfx.pickup) Sfx.pickup(); closeInv();
      setMsg(T('g.inv.usedAmmo', { item: wpnLabel(id), n: u.amount || 20 }), '#7CFC00', 4000); return;
    }
    if (u.kind === 'ticket') {   // el boleto no se "usa" desde acá: se mete en el molinete del subte (y ahí se consume). Informativo.
      closeInv(); setMsg(T('g.inv.ticket'), '#9be8a0', 5000); return;
    }
    if (u.kind === 'key') {      // la llave se usa en la puerta gateada (ahí se consume). Informativo.
      closeInv(); setMsg(T('g.inv.key'), '#9be8a0', 5000); return;
    }
    if (u.kind === 'buff') {     // BUFF temporal: aplica/refresca los efectos con timer y consume el ítem
      const secs = u.secs || 10, list = u.buffs || (u.buff ? [u.buff] : []);
      if (!player.buffs) player.buffs = [];
      for (const b of list) { const ex = player.buffs.find(x => x.b === b); if (ex) { ex.t = Math.max(ex.t, secs); ex.t0 = Math.max(ex.t0 || secs, secs); } else player.buffs.push({ b, t: secs, t0: secs }); }
      tickBuffs(0); consumeItem(id); if (typeof Sfx !== 'undefined' && Sfx.pickup) Sfx.pickup(); closeInv();
      setMsg(T('g.inv.buff', { item: wpnLabel(id), secs }), '#7CFC00', 4000); return;
    }
  }
  function openInv() {
    const ov = document.getElementById('invmenu'), body = document.getElementById('invBody');
    if (!ov || !body) return;   // headless / sin overlay → no traba
    const inv = player.inventory || ['escupitajo'];
    let html = '<div class="end-stats-title">' + T('g.inv.title') + '</div>';
    if (!inv.length) html += '<div style="opacity:.85">' + T('g.inv.empty') + '</div>';
    else { html += '<div style="display:flex;flex-direction:column;gap:.4em;margin-top:.5em">';
      for (const id of inv) { const w = WEAPONS[id]; if (!w) continue; const eq = player.weapon === id;
        const badge = w.use ? '<span style="color:#9be8a0">' + T('g.inv.use') + '</span>'                  // ítem usable (consola)
          : w.ctx === 'dream' ? (eq ? '<span style="color:#7CFC00">' + T('g.inv.equipped') + '</span>' : '<span style="color:#c9a0ff">' + T(isDream() ? 'g.inv.equip' : 'g.inv.dream') + '</span>')   // criolla: equipable solo en sueños
          : w.noEquip ? '<span style="opacity:.7">' + T('g.inv.kept') + '</span>'                          // fierro genérico: guardado (gag pacifista)
          : eq ? '<span style="color:#7CFC00">' + T('g.inv.equipped') + '</span>' : '<span style="opacity:.7">' + T('g.inv.equip') + '</span>';
        html += '<button class="inv-opt" data-id="' + id + '" style="text-align:left;padding:.6em .9em;font:inherit;cursor:pointer' + (eq ? ';outline:2px solid #7CFC00' : '') + '">' +
          wpnEmoji(id) + ' ' + wpnLabel(id) + '  ' + badge + '</button>';
      }
      html += '</div>'; }
    body.innerHTML = html;
    const btns = body.querySelectorAll ? body.querySelectorAll('.inv-opt') : null;
    if (btns && btns.forEach) btns.forEach(b => b.addEventListener('click', () => {
      const id = b.getAttribute('data-id'), w = WEAPONS[id];
      if (w && w.use) { useItem(id); return; }              // F2: ÍTEM usable (comida cura / consola hackea / etc.) — efecto DATA
      if (w && w.ctx === 'dream') {   // ARMA CRIOLLA: solo se usa en los SUEÑOS (niveles generados); en la calle real, el Carpo se niega.
        if (isDream()) { player.weapon = id; Sfx.pickup(); setMsg(T('g.wpn.dreamOk', { arma: wpnLabel(id) }), '#7CFC00', 6000); openInv(); syncHud(); }
        else { closeInv(); setMsg(T('g.wpn.dreamOnly'), '#9be8a0', 8000); }
        return;
      }
      if (w && w.noEquip) { closeInv(); setMsg(T(w.refuse), '#9be8a0', 8000); return; }   // el Carpo se niega a la violencia (no equipa el fierro)
      if (equipWeapon(id)) { Sfx.pickup(); openInv(); syncHud(); }
    }));
    ov.classList.remove('hidden');
  }
  function closeInv() { const ov = document.getElementById('invmenu'); if (ov) ov.classList.add('hidden'); }
  function toggleInv() { const ov = document.getElementById('invmenu'); if (ov && ov.classList.contains('hidden')) openInv(); else closeInv(); }

  function grabTesoro(n) {
    if (!bunkerUnlocked) { setMsg(T('g.tesoro.noGuru'), '#ffd54f', 5000); return; }   // (en el búnker ya sos gurú; red de seguridad)
    if (tesoroTaken) { setMsg(T('g.tesoro.empty'), '#aef0c0', 4000); return; }
    applyEdge('tesoro', 'tesoroTaken');   // por el GRAFO: hito → ticker + checkpoint + evlog (v294)
    player.coins += 150; player.ammo += 40; player.spitDmg = 24;   // escupís más fuerte (14→24), para todo el run
    addItem('viola');   // el gurú te da la VIOLA (a la mochila); NO la auto-equipa: por defecto seguís con los DÓLARES (specs/inventario-armas.md)
    if (!lsFlag('ts_deposito_open')) addItem('llave');   // + la LLAVE 🔑 del depósito de la galería (si no lo saqueaste ya)
    Sfx.win();
    setMsg(T('g.tesoro.viola'), '#7CFC00', 10000);
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
    mozaInvited = false;   // salir/entrar al bodegón resetea el gag de la rubia
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
  // === COMPAÑEROS que te SIGUEN cruzando salas (follow cross-room) ===
  // Un compañero es un NPC REAL (mismo truco que roamingNpc): viaja con vos — se saca de la sala vieja y se mete en
  // la nueva pegado a vos en cada transición; el loop de `follow` lo camina hacia vos dentro de la sala. Se DERIVAN de
  // FLAGS (sobreviven save/restore: en restore() y en cada transición llamamos syncCompanions()).
  const companions = [];   // [{ id, name, sprite, follow, companion, followOff, x, y, dialog }]
  function removeCompanionNpc(c) { for (const rm of rooms) { const i = (rm.npcs || []).indexOf(c); if (i >= 0) rm.npcs.splice(i, 1); } }
  function placeCompanionInRoom(c) {   // lo (re)ubica pegado a vos en la sala actual
    removeCompanionNpc(c);
    const rm = rooms[current]; if (!rm) return;
    const w = rm.w || 20, pcTile = Math.round((player.x + player.w / 2) / Level.TILE);
    const tx = Math.max(1, Math.min(w - 2, pcTile + (c.__side || -2)));
    c.x = tx * Level.TILE + Level.TILE / 2; c.y = rm.gTop * Level.TILE;
    (rm.npcs = rm.npcs || []).push(c);
  }
  function setCompanion(id, active, spec) {
    let c = companions.find(x => x.id === id);
    if (active && !c) {
      c = { id, companion: true, follow: true, action: spec.action || 'companion', __side: spec.side || -2, followOff: spec.followOff != null ? spec.followOff : -30,
            name: spec.name, sprite: spec.sprite, dialog: spec.dialog, x: 0, y: 0 };
      companions.push(c); placeCompanionInRoom(c);
      if (spec.join) setMsg(spec.join, '#7CFC00', 5500);
    } else if (!active && c) {
      removeCompanionNpc(c); companions.splice(companions.indexOf(c), 1);
      if (spec && spec.bye) setMsg(spec.bye, '#aef0c0', 4000);
    }
  }
  // ensambla los compañeros que CORRESPONDEN según los flags (idempotente). Llamar tras cambiar flags / transicionar.
  function syncCompanions() {
    if (typeof Level === 'undefined') return;
    // ruta A: el linyera te ESCOLTA hasta Guido (desde "tengo contactos" hasta que lo reclutás)
    setCompanion('linyera', guidoSummoned && !guidoRecruited && !cueveroUnlocked,
      { name: 'Linyera', sprite: 'linyera', side: -2, followOff: -34, dialog: T('g.guido.escortLinyera'), join: T('g.guido.escortJoin') });
    // ruta A: Guido te ESCOLTA hasta la mesa del tahúr (desde que te sigue hasta destrabar al cuevero)
    setCompanion('guido', guidoFollowing && !cueveroUnlocked,
      { name: 'Guido', sprite: 'guido', side: 2, followOff: 32, dialog: T('g.guido.escortGuido'), join: T('g.guido.escortGuidoJoin') });
    // ruta B "de a 6": cada compañero de truco reclutado te SIGUE hasta la mesa (a un costado distinto, no se amontonan)
    let i = 0;
    for (const id of Object.keys(TRUCO_MATES)) {
      const m = TRUCO_MATES[id], side = i === 0 ? -3 : 3, off = i === 0 ? -44 : 44; i++;
      setCompanion(id, !!trucoMatesRec[id] && !cueveroUnlocked,
        { name: m.name, sprite: m.sprite, side, followOff: off, dialog: T('g.truco.mateFollow', { name: m.name }), join: T('g.truco.mateJoin', { name: m.name }) });
    }
    // (los 3 linyeras del paso 'linyeras' NO son companions: viven en la sala 'telohab' como NPCs chateables — ver chipLinNote.)
    // paso 'consola2': los 2 JUBILADOS te SIGUEN hasta el arcade (donde el flaco te da la consola). Al pasar a 'cure' se van rezongando.
    const chipJub = chipped && chipStep === 'consola2';
    const JUBS = [{ name: T('g.chip.jubTec'), sprite: 'viejo' }, { name: T('g.chip.jubCommo'), sprite: 'mujer' }];
    JUBS.forEach((j, k) => setCompanion('chipjub' + k, chipJub,
      { name: j.name, sprite: j.sprite, action: 'companion', side: k === 0 ? -3 : 3, followOff: k === 0 ? -44 : 44,
        dialog: T('g.chip.jubFollow'), join: k === 0 ? T('g.chip.jubFollowJoin') : undefined, bye: k === 0 ? T('g.chip.jubBye') : undefined }));
  }
  function clearCompanions() { for (const c of companions.slice()) removeCompanionNpc(c); companions.length = 0; }
  // VOZ del escort: el linyera/Guido no te sigue mudo — te dice A DÓNDE ir, en cada sala y cada tanto, con voz criolla.
  function activeEscort() { return companions.find(c => c.id === 'linyera' || c.id === 'guido'); }
  function escortNudge() {
    const c = activeEscort(); if (!c) return;
    const r = room(); let key;
    if (c.id === 'linyera') {                                                  // el linyera te lleva hasta GUIDO (EducaciónIT)
      if ((r.npcs || []).some(n => n.action === 'guido')) key = 'g.guido.nudgeTalk';      // ya estás con Guido → hablalo
      else if (r.theme === 'office' && !hasTag(r, 'garbarino')) key = 'g.guido.nudgeUp';  // estás en EducaciónIT → seguí subiendo
      else key = 'g.guido.nudgeGo';                                                        // andá a EducaciónIT
    } else {                                                                   // Guido te lleva a la MESA del tahúr (trastienda)
      if (hasTag(r, 'truco')) key = 'g.guido.nudgeSit';                                    // en la trastienda → sentate a la mesa
      else key = 'g.guido.nudgeTable';                                                     // llevame a la mesa del tahúr
    }
    setMsg(T(key), '#9be8a0', 5200); escortNudgeT = performance.now() + 12000;             // reprograma el recordatorio
  }
  function resetLoopResources() {            // cajones de falopa y limosnas se renuevan cada loop
    for (const rm of rooms) for (const n of rm.npcs || []) { n.falopaTaken = false; n.limosnaTaken = false; }
  }
  function reviveToPreviousLoop() {
    loopCount = Math.max(0, loopCount - 1);
    player.alive = true; player.hp = SURV.fullHp; decayAcc = 0; player.falopa = 0;
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
  // Mientras la IA piensa (2-11s, latencia-chat.md) la línea de espera CICLA iconos del mundo — así se ve
  // que está esperando y no colgado (chat-linyera-ux §2). DATA: solo iconos, sin i18n.
  const THINK_ICONS = ['☀️', '⛈️', '🍷', '🥩', '💾', '🤖'];
  function chatThinking() {
    const div = chatLine('sys', THINK_ICONS[0] + ' ·');
    let i = 0;
    const iv = setInterval(() => { i++; div.textContent = THINK_ICONS[i % THINK_ICONS.length] + ' ' + '·'.repeat(1 + (i % 3)); }, 400);
    return { remove() { clearInterval(iv); div.remove(); } };
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
    tesoroTaken:      v => tesoroTaken = v,
    chinoEntered:     v => chinoEntered = v,
    hasMegaDrive:     v => { if (player) player.hasMegaDrive = v; },
    hasCementoTicket: v => { if (player) player.hasCementoTicket = v; },
    cueveroUnlocked:  v => cueveroUnlocked = v,
    tahurDiscovered:  v => tahurDiscovered = v,
    guidoFollowing:   v => guidoFollowing = v,
    // QUEST DE LAVALLE (specs/nivel-1/lugares/lavalle-quest.md): progresión de ZONA → localStorage (sobrevive loops)
    piqueteCampeon:   v => { try { localStorage.setItem('ts_piq_campeon', v ? '1' : ''); } catch (e) {} },
    juramento:        v => { try { localStorage.setItem('ts_juramento', v ? '1' : ''); } catch (e) {} },
    obeliscoLlegado:  v => { try { localStorage.setItem('ts_obelisco_visto', v ? '1' : ''); } catch (e) {} },
    sateliteHerido:   v => { try { localStorage.setItem('ts_sat_down', v ? '1' : ''); } catch (e) {} },
    // QUEST DE LA TARJETA SUBE (specs/subte.md §2.6): flags en localStorage (como el piquete, sobreviven loops)
    subeGot:          v => { try { localStorage.setItem('ts_sube_got', v ? '1' : ''); } catch (e) {} },
    subeReady:        v => { try { localStorage.setItem('ts_sube_charged', v ? '1' : ''); } catch (e) {} },
    enPlaza:          v => { try { localStorage.setItem('ts_en_plaza', v ? '1' : ''); } catch (e) {} },
    // NIVEL 2 (arco sanmartiniano, specs/subte.md §10.1): el CHIP del Libertador y la LIBERACIÓN están EN EL GRAFO
    sanmartinChip:    v => { try { localStorage.setItem('ts_sanmartin_chip', v ? '1' : ''); } catch (e) {} },
    nivel2Win:        v => { try { localStorage.setItem('ts_nivel2_win', v ? '1' : ''); } catch (e) {} },
  };
  const lsFlag = k => { try { return localStorage.getItem(k) === '1'; } catch (e) { return false; } };
  // lectura de flags por nombre (paralelo a FLAG_SETTERS) → lo usa el gate declarativo de las puertas (F4)
  const FLAG_GETTERS = {
    stormed: () => stormed, bunkerUnlocked: () => bunkerUnlocked, secretUnlocked: () => secretUnlocked,
    trucoWon: () => trucoWon, borrachosHappy: () => borrachosHappy, chinoFrontOpen: () => chinoFrontOpen,
    cueveroUnlocked: () => cueveroUnlocked, tahurDiscovered: () => tahurDiscovered,
    depositoOpen: () => lsFlag('ts_deposito_open'),   // depósito de la galería ya saqueado (oculta la puerta)
  };
  // evalúa el componente `gate` de una puerta (cond declarativa: flag/item + all/any/not). Reemplaza los
  // ifs por-id de visibilidad (secret/cemento/bunker/chinoback). Versión acotada del evalCond del SDD §6.96.
  function gateMet(g) {
    if (!g) return true;
    if (g.item) return !!(player && player[g.item]);
    if (g.has) return !!(player && player.inventory && player.inventory.includes(g.has));   // gate por ÍTEM del inventario (ej. llave 🔑)
    if (g.flag) { const get = FLAG_GETTERS[g.flag]; return get ? !!get() : false; }
    if (g.all) return g.all.every(gateMet);
    if (g.any) return g.any.some(gateMet);
    if (g.not) return !gateMet(g.not);
    return true;
  }
  function applyEdge(id, fallbackFlag) {
    const edges = (typeof Historia !== 'undefined' && Historia.edges) ? Historia.edges : [];
    const e = edges.find(x => x.id === id);
    if (typeof Mensajero !== 'undefined') Mensajero.evento(id);   // "qué acaba de pasar" (capa aditiva)
    if (typeof Salon !== 'undefined' && Salon.enabled) Salon.beat(currentAt(), id);   // MULTIJUGADOR F1: hito anónimo al ticker del "Cine EN VIVO"
    tel('quest', { result: id });   // métrica: qué quest/arista de la historia se completó (dashboard)
    evlog('hito', id);   // al bus de eventos (los NPC comentan lo fresco)
    if (e && e.sets) { for (const k in e.sets) if (FLAG_SETTERS[k]) FLAG_SETTERS[k](!!e.sets[k]); saveCheckpoint(id); return true; }
    if (fallbackFlag && FLAG_SETTERS[fallbackFlag]) { FLAG_SETTERS[fallbackFlag](true); saveCheckpoint(id); }   // grafo ausente → red de seguridad
    return false;
  }
  function historiaState() {
    return {
      stormed, borrachosHappy, bunkerUnlocked, chinoFrontOpen, trucoWon, fifaWon, armado, chinoEntered, tesoroTaken,
      hasMegaDrive: !!(player && player.hasMegaDrive),
      hasCementoTicket: !!(player && player.hasCementoTicket),
      cueveroUnlocked, tahurDiscovered, guidoSummoned, guidoRecruited, guidoFollowing,
      vecinoSeen: Object.keys(entradoEdif).length > 0,
      // quest de Lavalle (persistida en localStorage — ver FLAG_SETTERS)
      piqueteCampeon: piqueteAllWon() || lsFlag('ts_piq_campeon'),
      juramento: lsFlag('ts_juramento'),
      obeliscoLlegado: lsFlag('ts_obelisco_visto'),
      sateliteHerido: lsFlag('ts_sat_down'),
      // quest de la tarjeta SUBE (subte.md §2.6): seed en el tótem → un linyera te la da → la cargás
      subeSeen: lsFlag('ts_sube_seen'),
      subeGot: lsFlag('ts_sube_got'),
      subeReady: lsFlag('ts_sube_charged'),
      enPlaza: lsFlag('ts_en_plaza'),
      sanmartinChip: lsFlag('ts_sanmartin_chip'),   // Nivel 2: tenés el chip del Libertador (grafo)
      nivel2Win: lsFlag('ts_nivel2_win'),           // Nivel 2: ganaste (liberación sanmartiniana)
      sleptOnce: loopCount > 0,
    };
  }
  // lugar actual → tag del grafo (para la cercanía del oráculo)
  const AT_TAGS = ['bunker', 'cueva', 'cemento', 'cambio', 'arcade', 'super', 'galeria', 'edificio'];   // lugares del grafo
  function currentAt() {
    const r = room();
    for (const t of (r && r.tags) || []) if (AT_TAGS.includes(t)) return t;   // por TAG de sala (data)
    const n = (r && r.name) || '';   // fallback al nombre (back-compat para salas sin tag)
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
  // ECOSISTEMA (premisa v2: nada hardcodeado, todo es DATO que la IA usa para ser inteligente). Snapshot vivo del
  // mundo a partir del estado + las APIs (noticias/mundial/propaganda). Se expone en window.Game.world y se le pasa
  // como GROUNDING a los NPC IA para que "sepan" qué pasa (cine, Mundial, quests, tu progreso) sin inventar.
  function worldSnapshot() {
    const W = (typeof window !== 'undefined') ? window : {};
    const ns = W.NOTICIAS || [], topic = t => ns.find(n => n.topic === t);
    return {
      stormed, borrachosHappy, bunkerUnlocked, trucoEverWon, chinoEntered, loopCount,
      diosa: !!(player && player.diosa), armado,
      // NIVEL 2 (arco sanmartiniano): el subte, la Plaza, el chip del Libertador, la liberación — los oráculos LO SABEN
      sateliteHerido: lsFlag('ts_sat_down'), subeReady: lsFlag('ts_sube_charged'),
      enPlaza: lsFlag('ts_en_plaza'), sanmartinChip: lsFlag('ts_sanmartin_chip'), nivel2Win: lsFlag('ts_nivel2_win'),
      questRegistry: Object.keys(QUEST_DEFS),   // todas las quests declaradas (data) — la IA las conoce genéricamente
      quests: {
        news: newsQuest ? { topic: newsQuest.topic } : null,
        mundial: mundialQuest ? { equipo: mundialQuest.equipo, shown: mundialQuest.shown } : null,
      },
      cine: { topics: ns.map(n => n.topic), mundialTabla: (topic('mundial-tabla') || {}).headline || null, mundial: (topic('mundial') || {}).headline || null },
      mundialEquipos: Object.keys((W.MUNDIAL && W.MUNDIAL.equipos) || {}).length,
      propaganda: [...new Set((W.PROPAGANDA || []).map(c => c.cat))],
      carteles: propagandaSample(),   // muestra de marcas que el oráculo puede recomendar
    };
  }
  // 2-3 carteles de propaganda al azar (marcas FALSAS del banco) → el oráculo los puede RECOMENDAR ("probate el
  // choripán de X"). Todo conectado: el linyera "sabe" de los carteles-ai (son los oráculos de la Matrix).
  function propagandaSample() {
    const list = ((typeof window !== 'undefined' && window.PROPAGANDA) || []).filter(c => c.cat !== 'tip' && c.cat !== 'clima');
    const out = [], seen = new Set();
    for (let i = 0; i < 30 && out.length < 3 && out.length < list.length; i++) { const p = list[(Math.random() * list.length) | 0]; if (p && !seen.has(p.brand)) { seen.add(p.brand); out.push(p); } }
    return out;
  }
  // versión TEXTO compacta para el grounding del LLM (en es; el modelo responde en el idioma del juego).
  function worldBrief() {
    const s = worldSnapshot(), b = [];
    b.push(s.stormed ? 'ya pasó la TORMENTA SOLAR (apagón, todo glitcheado y hostil)' : 'todavía no pasó la tormenta solar');
    const props = propagandaSample();
    if (props.length) b.push('en los carteles del barrio se promociona (PODÉS recomendárselos al jugador con humor, ej. "probate el…"): ' + props.map(p => p.brand + ' (' + p.slogan + ')').join(', '));
    if (s.cine.mundialTabla) b.push('en el CINE pasan el Mundial — ' + s.cine.mundialTabla);
    if (s.quests.news) b.push('mandaste al jugador a traer noticia de "' + s.quests.news.topic + '"');
    if (s.quests.mundial && !s.quests.mundial.shown) b.push('un hincha del cine espera saber cómo salió ' + s.quests.mundial.equipo);
    if (s.trucoEverWon) b.push('ya le ganó al tahúr al truco');
    if (s.chinoEntered) b.push('ya entró al super chino tras la tormenta');
    if (s.bunkerUnlocked) b.push('ya es gurú (búnker abierto)');
    if (s.loopCount > 0) b.push('lleva ' + s.loopCount + ' día(s) en el loop de supervivencia');
    // NIVEL 2 (arco sanmartiniano) — los oráculos SABEN dónde está parado el jugador y lo pueden guiar/comentar
    if (s.nivel2Win) b.push('EL JUGADOR YA GANÓ EL NIVEL 2: armó la Pirámide de Mayo con el CHIP DE SAN MARTÍN y arrancó el "proceso sanmartiniano de liberación mundial" — San Martín nos liberó del yugo de la IA');
    else if (s.sanmartinChip) b.push('el jugador TIENE EL CHIP DEL LIBERTADOR (de la tumba de San Martín, en la Catedral): le falta armarlo en la PIRÁMIDE DE MAYO (centro de la plaza, sostené [E]) para liberar al mundo');
    else if (s.enPlaza) b.push('el jugador llegó a PLAZA DE MAYO (Nivel 2): la IA tomó el satélite. Solo el CHIP DE SAN MARTÍN —en su TUMBA, dentro de la CATEDRAL— puede activar la Pirámide de Mayo y liberarnos. Guialo hacia la tumba');
    else if (s.sateliteHerido) b.push('el jugador hirió al satélite: apareció una BOCA DE SUBTE en el piquete de Lavalle → baja, viaja a CATEDRAL y llega a PLAZA DE MAYO (el Nivel 2)');
    // F4a (npcs-vivos §5.3): lo FRESCO — últimos movimientos del jugador (bus de eventos) + qué hacen OTROS jugadores
    if (typeof Eventos !== 'undefined' && Eventos.last) { const evs = Eventos.last(5); if (evs.length) b.push('ÚLTIMOS MOVIMIENTOS del jugador, en orden (lo más reciente al final; comentalo con tu voz si viene al caso): ' + evs.map(e => e.ev + (e.detail ? ' "' + e.detail + '"' : '')).join(' → ')); }
    if (salonLive && Array.isArray(salonLive.ticker) && salonLive.ticker.length) b.push('en el BARRIO, OTROS jugadores hicieron hace poco: ' + salonLive.ticker.slice(-3).map(x => x.ev).join(', '));
    if (typeof Eventos !== 'undefined' && Eventos.memoriaVieja) { const mm = Eventos.memoriaVieja(4); if (mm.length) b.push('MEMORIA DEL BARRIO (cosas que el jugador hizo en OTROS momentos/días — podés recordárselas con nostalgia): ' + mm.map(e => e.ev + (e.detail ? ' "' + e.detail + '"' : '')).join(', ')); }
    return 'ESTADO DEL JUEGO (datos reales del ecosistema, todo está conectado; usalo con tu voz si viene al caso, NO inventes rutas ni datos): ' + b.join('; ') + '.';
  }
  // ---- NPCs VIVOS: chusmerío ambiente (globitos) — los NPC se hablan entre ellos / te tiran data de lo que hiciste.
  // Las líneas se TEMPLAN con el estado vivo (worldSnapshot) → "saben" lo que pasó. (Ver specs/npcs-vivos.md)
  function ambientPool(s) {
    // BASE = banco vivo del proxy (gen-chusmerio.mjs, IA → API, no hardcode). Fallback estático en js/chusmerio.js.
    const L = ((typeof window !== 'undefined' && window.CHUSMERIO) || []).slice();
    // + líneas DERIVADAS del estado vivo (computadas del ecosistema/worldSnapshot, no contenido fijo):
    if (!s.borrachosHappy) L.push(T('g.viva.borra'));
    if (s.trucoEverWon) L.push(T('g.viva.truco'));
    if (s.chinoEntered) L.push(T('g.viva.chino'));
    if (s.bunkerUnlocked) L.push(T('g.viva.guru'));
    if (s.diosa) L.push(T('g.viva.diosa'));
    // F4d: memoria del barrio — los NPC recuerdan lo que hiciste OTROS días ("¿te acordás cuando…?")
    if (typeof Eventos !== 'undefined' && Eventos.memoriaVieja) for (const e of Eventos.memoriaVieja(3))
      L.push(T('g.viva.memoria', { d: e.detail || e.ev }));
    // F4a: chusme de lo RECIÉN hecho (bus de eventos — los NPC 'vieron' lo que acabás de hacer)
    if (typeof Eventos !== 'undefined' && Eventos.recent) for (const e of Eventos.recent(120000).slice(-3)) {
      if (e.ev === 'hito') L.push(T('g.viva.hito', { d: e.detail }));
      else if (e.ev === 'minijuego') L.push(T('g.viva.mini'));
      else if (e.ev === 'charla') L.push(T('g.viva.charla', { d: e.detail }));
      else if (e.ev === 'muerte') L.push(T('g.viva.muerte'));
    }
    L.push(T(s.stormed ? 'g.viva.storm' : 'g.viva.calm'));
    if (s.carteles && s.carteles.length) L.push(T('g.viva.cartel', { b: s.carteles[0].brand }));
    if (s.cine && s.cine.mundialTabla) L.push(T('g.viva.cine'));
    if (s.quests.mundial && !s.quests.mundial.shown) L.push(T('g.viva.hincha', { eq: s.quests.mundial.equipo }));
    return L.length ? L : [T('g.viva.pucho')];   // el flavor sale del banco/estático; esto es red de seguridad
  }
  // ── NPCs VIVOS F4b (npcs-vivos §5.3): DRIVES — deambulan, van a chusmear con otro, y a veces TE BUSCAN si hiciste
  // algo notable (sienten la necesidad). Solo decorativos/oráculos: NUNCA los de quest/tienda/want/follow.
  // ESTADO DE MOVIMIENTO por NPC (pedido del dueño): `mov` es un componente DECLARATIVO (data, 3 patas del schema).
  //   mov:false           → NUNCA se mueve (colas, músico, porteros de tiendas/cueva)
  //   mov:{tras:'flag'}   → se LIBERA cuando el quest pasó (ej. borrachines tras borrachosHappy = quest hecho)
  //   mov:{hasta:'flag'}  → se mueve HASTA que el flag se prende (ej. vecinos: tras la tormenta quedan de guardia)
  //   sin mov             → heurística: decorativos/oráculos sí; quest/tienda/want no. SIEMPRE vuelven a su lugar (homeX).
  function canMove(n) {
    if (!n || n.invisible || n.follow || n.sells || n.arsenal || n.tienda || n.jubilado) return false;   // estructurales
    if (n.mov !== undefined && n.mov !== null) {
      if (n.mov === false || n.mov === 'nunca') return false;
      if (typeof n.mov === 'object') { const fl = historiaState();
        if (n.mov.tras && !fl[n.mov.tras]) return false;
        if (n.mov.hasta && fl[n.mov.hasta]) return false; }
      return true;
    }
    return n.ambient !== false && !n.want && !n.vecino && (!n.action || n.action === 'chat');
  }
  const wanderOk = canMove;
  let seekCd = 0;   // cooldown global del "te busca" (que no te persigan todos a la vez)
  function clampNx(r, x) { return Math.max(Level.TILE * 1.2, Math.min(((r.w || 24) - 1.5) * Level.TILE, x)); }
  // F4c (npcs-vivos §5.3): DIÁLOGO NPC↔NPC por IA — dos oráculos que se cruzan IMPROVISAN un intercambio real
  // (con el estado vivo del mundo como grounding). Barato: cache localStorage por PAR y por DÍA + tope 2/sesión +
  // cooldown 3 min. Sin IA/red → cae al pool del chusmerío (aditivo). La respuesta usa la voz del PRIMERO (persona).
  let dlgBudget = 2, dlgCdT = 0;
  function oracleDialogue(a, b) {
    if (typeof AI === 'undefined' || !AI.chat) return false;
    let key = null, cached = null;
    try { const day = new Date().toISOString().slice(0, 10); key = 'ts_dlg_' + [a.persona, b.persona].sort().join('_') + '_' + day; cached = localStorage.getItem(key); } catch (e) {}
    if (cached) { showDialogue(a, b, cached); return true; }
    if (dlgBudget <= 0 || performance.now() < dlgCdT) return false;
    dlgBudget--; dlgCdT = performance.now() + 180000;
    const prompt = 'Improvisá un intercambio de DOS líneas cortas (máx 12 palabras cada una) entre VOS y tu amigo ' +
      (TX(b.name) || 'otro linyera') + ', chusmeando lo último que hizo el jugador. Formato EXACTO, dos líneas:\nYO: ...\nEL: ...';
    AI.chat(a.persona || 'filosofo', prompt, [], worldBrief()).then(reply => {
      if (!reply) return;
      try { if (key) localStorage.setItem(key, String(reply).slice(0, 300)); } catch (e) {}
      showDialogue(a, b, reply);
    }).catch(() => {});
    return true;
  }
  function showDialogue(a, b, raw) {
    const lines = String(raw).split('\n').map(x => x.replace(/^\s*["“]?(YO|EL|ÉL|ELLA|[A-ZÁÉÍÓÚÑ][\wáéíóúñ .]{0,18})\s*[:—-]\s*/i, '').replace(/["”]\s*$/, '').trim()).filter(x => x && x.length > 2).slice(0, 2);
    if (!lines.length) return;
    ambientBubbles.push({ npc: a, text: lines[0].slice(0, 110), from: time, until: time + 5.5 });
    if (lines[1]) ambientBubbles.push({ npc: b, text: lines[1].slice(0, 110), from: time + 2.2, until: time + 8 });
  }
  function updateDrives(r, dt) {
    seekCd -= dt;
    const ns = (r.npcs || []).filter(wanderOk);
    for (const n of ns) {
      if (n.homeX == null) { n.homeX = n.x; n.wCd = 2 + Math.random() * 8; }
      if (n.wTarget != null) {                                        // caminando hacia su objetivo
        const dx = n.wTarget - n.x;
        if (Math.abs(dx) < 6) {                                        // llegó
          if (n.wSeek) { ambientBubbles.push({ npc: n, text: n.wSeek, from: time, until: time + 5.4 }); n.wSeek = null; }
          else if (n.wChusme) {
            n.wChusme = false;
            const cerca = ns.find(o => o !== n && Math.abs(o.x - n.x) < 130);
            // F4c: dos ORÁCULOS cerca (y vos a distancia de leerlo) → improvisan por IA; si no, el pool de chusmerío
            if (!(cerca && n.oracle && cerca.oracle && n.persona && cerca.persona && Math.abs(player.x - n.x) < 620 && oracleDialogue(n, cerca)))
              ambientCd = Math.min(ambientCd, 0.4);
          }
          n.wTarget = null; n.wCd = 5 + Math.random() * 9;
        } else n.x += Math.sign(dx) * Math.min(42 * dt, Math.abs(dx));
        continue;
      }
      n.wCd -= dt; if (n.wCd > 0) continue;
      const fresh = (typeof Eventos !== 'undefined' && Eventos.fresh) ? Eventos.fresh(45000) : null;
      const roll = Math.random();
      if (fresh && n.oracle && seekCd <= 0 && Math.abs(player.x - n.x) < 900) {
        // TE BUSCA: pasó algo notable hace poco → el oráculo camina hacia vos y te lo comenta (globito)
        seekCd = 45; n.wTarget = clampNx(r, player.x + (Math.random() < 0.5 ? -46 : 46));
        n.wSeek = T('g.viva.seek', { d: fresh.detail || fresh.ev });
      } else if (roll < 0.3) {
        // va a CHUSMEAR: camina hasta otro NPC elegible cercano; al llegar arranca el mini-diálogo del chusmerío
        const others = ns.filter(o => o !== n && Math.abs(o.x - n.x) < 600);
        if (others.length) { const o = others[(Math.random() * others.length) | 0]; n.wTarget = clampNx(r, o.x + (o.x > n.x ? -52 : 52)); n.wChusme = true; }
        else n.wCd = 4;
      } else if (Math.abs(n.x - n.homeX) > 95) n.wTarget = n.homeX;   // quedó lejos → SIEMPRE vuelve a su lugar
      else if (roll < 0.85) n.wTarget = clampNx(r, n.homeX + (Math.random() * 140 - 70));   // deambula cerca de su lugar
      else n.wCd = 3 + Math.random() * 5;                              // se queda pancho
    }
  }
  function eligibleNpcs(r) {   // NPCs vivos: participa del chusmerío si el componente `ambient` no es false (declarativo)
    return (r.npcs || []).filter(n => { if (n.invisible || !n.name || n.ambient === false) return false; const sx = n.x - cam.x; return sx > 30 && sx < 770; });
  }
  // RELAY social: rumores ATRIBUIDOS (el chusme fluye de un NPC fuente → el que lo repite → vos). Derivados del estado
  // vivo (data) — cada uno tiene una FUENTE (el NPC que "sabe") y un claim sobre lo que hiciste. (npcs-vivos §4, grafo social)
  const ROLE_NAMES = { borracho:'el borrachín', tahur:'el tahúr', chino:'el chino', linyeras:'los linyeras', gondola:'el de la góndola', vendedor:'el vendedor de armas', guarda:'el guarda del cine', vecina:'la vecina' };
  function rumorPool(s) {
    const R = [], add = (key, txt, cond) => { if (cond) R.push({ key, src: ROLE_NAMES[key] || key, txt }); };
    add('borracho', T('g.rumor.borracho'), !s.borrachosHappy);
    add('tahur', T('g.rumor.tahur'), s.trucoEverWon);
    add('chino', T('g.rumor.chino'), s.chinoEntered);
    add('linyeras', T('g.rumor.linyeras'), s.bunkerUnlocked);
    add('gondola', T('g.rumor.gondola'), s.diosa);
    add('vendedor', T('g.rumor.vendedor'), s.armado);
    add('guarda', T('g.rumor.guarda'), s.quests.mundial && s.quests.mundial.shown);
    add('vecina', T('g.rumor.vecina', { b: (s.carteles && s.carteles[0] && s.carteles[0].brand) || '' }), s.carteles && s.carteles.length);
    return R;
  }
  function spawnAmbient() {
    const ns = eligibleNpcs(room()); if (!ns.length) return;
    const s = worldSnapshot(), pool = ambientPool(s), rumors = rumorPool(s), a = ns[(Math.random() * ns.length) | 0];
    const soc = a.social || {};
    // GOSSIP de RIVAL (grafo social, aristas `rival`): hablás mal del que no bancás.
    let aText = null;
    if (soc.rival && soc.rival.length && Math.random() < 0.4) { const rk = soc.rival[(Math.random() * soc.rival.length) | 0]; aText = T('g.rivalGossip', { who: ROLE_NAMES[rk] || rk }); }
    // RELAY por ARISTAS: el NPC relayea un rumor de alguien que CONOCE (social.knows); si no tiene grafo, cualquiera.
    if (!aText && rumors.length && Math.random() < 0.5) {
      let cand = rumors.filter(r => !String(a.name || '').toLowerCase().includes(String(r.src).replace(/^(el|la|los) /, '').split(' ')[0]));   // no se auto-cita
      if (soc.knows && soc.knows.length) { const known = cand.filter(r => soc.knows.includes(r.key)); if (known.length) cand = known; }   // prioriza lo que conoce (arista)
      if (cand.length) { const r = cand[(Math.random() * cand.length) | 0]; aText = T('g.relay', { src: r.src, txt: r.txt }); }
    }
    if (!aText) aText = pool[(Math.random() * pool.length) | 0];
    const wasChusme = /me dijo|no le creas|told me/.test(aText);   // ¿fue chusme/gossip? → el otro reacciona
    ambientBubbles.push({ npc: a, text: aText, from: time, until: time + 4.8 });
    const others = ns.filter(n => n !== a && Math.abs(n.x - a.x) < 240);   // si hay otro cerca → le CONTESTA (mini-diálogo)
    if (others.length && Math.random() < 0.65) {
      const c = others[(Math.random() * others.length) | 0];
      const reply = wasChusme ? T('g.relayReply') : pool[(Math.random() * pool.length) | 0];
      ambientBubbles.push({ npc: c, text: reply, from: time + 1.7, until: time + 6.4 });
    }
  }
  function drawBubble(cx, topY, text) {
    ctx.save(); ctx.font = '10px monospace';
    const lines = wrapLines(ctx, text, 150, 3), w = Math.min(160, Math.max(...lines.map(l => ctx.measureText(l).width)) + 14), h = 8 + lines.length * 12;
    const x = cx - w / 2, y = topY - h;
    ctx.fillStyle = 'rgba(12,15,22,0.92)'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#9fd3ff'; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = '#9fd3ff'; ctx.beginPath(); ctx.moveTo(cx - 4, y + h); ctx.lineTo(cx + 4, y + h); ctx.lineTo(cx, y + h + 5); ctx.fill();   // colita
    ctx.fillStyle = '#dfe8f4'; ctx.textAlign = 'center';
    lines.forEach((ln, i) => ctx.fillText(ln, cx, y + 11 + i * 12));
    ctx.restore();
  }
  const isHincha = n => !!(n && n.persona === 'hincha');   // §9: los dos hinchas del piso Deportes (quest del Mundial)
  const isCine = r => !!(r && ((r.tags && r.tags.includes('cine')) || /Cine/.test(r.name || '')));   // CINE por TAG (data), no por nombre (fallback regex)
  const hasTag = (r, t) => !!(r && r.tags && r.tags.includes(t));   // ¿la sala tiene este tag? (data, no regex de nombre)
  // el hincha pregunta con onda: sesga a Argentina (60%) o a equipos JUGOSOS si están; si no, random.
  function pickEquipoJugoso(eqs) {
    const arg = eqs.find(e => /argentin/i.test(e));
    if (arg && Math.random() < 0.6) return arg;
    const jugosos = eqs.filter(e => /brazil|brasil|france|francia|spain|españa|england|inglaterra|germany|alemania|portugal|netherlands|holanda|uruguay|austria|algeria|jordan/i.test(e));
    if (jugosos.length && Math.random() < 0.7) return jugosos[(Math.random() * jugosos.length) | 0];
    return eqs[(Math.random() * eqs.length) | 0];
  }
  // el hincha te pregunta por un equipo random del Mundial; si ya conseguiste el dato (guarda) te agradece + premio.
  function hinchaGreeting() { const r = Quests.greet('hincha'); if (r) chatLine('npc', r.line); }   // §9: el runtime arma el saludo (pregunta/recuerda/agradece)
  // F2 cine: verificá lo que el jugador reporta vs la noticia real (palabras significativas compartidas).
  const _nw = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 3);
  function newsMatch(report, answer) { const a = new Set(_nw(answer)); const r = _nw(report); return { shared: r.filter(w => a.has(w)).length, words: r.length }; }
  function getHint(level) {
    // QUEST DEL CHIP: los linyeras SABEN que estás chipeado y en qué paso vas → pista de máxima prioridad (no te la
    // tiran toda: el texto por paso es una PISTA). specs/telo-chip-quest.md + directiva "los linyeras saben todo".
    if (chipped) { const h = chipHint(); if (h) return { id: 'chip', title: 'chip', text: h, level: level | 0 }; }
    // UNIFICACIÓN grafo+quests: una quest activa del oráculo es pista de MÁXIMA prioridad (recordatorio).
    const q = Quests.hintFor('oraculo'); if (q) return { ...q, level: level | 0 };
    if (typeof HintEngine === 'undefined') return null;
    return HintEngine.next(historiaState(), { at: currentAt(), insistencia: level });
  }
  function showHint(level) { const h = getHint(level); if (h) chatLine('npc', '💡 ' + h.text); }

  function openChat(n) {
    if (typeof AI === 'undefined') { setMsg(TX(n.dialog) || '“...”', '#aef0c0', 4000); return; }
    chipLinNote(n);   // QUEST DEL CHIP: hablar con un linyera de la habitación cuenta (al hablar con los 3 → posta)
    chatNpc = n; chatBusy = false; hintAsks = 0;
    const key = memKey(n);
    chatHistory = (key && oracleMem[key]) ? oracleMem[key].slice() : [];   // retoma su memoria por identidad
    elChatTitle.textContent = '💬 ' + (TX(n.name) || T('chat.title'));
    elChatLog.innerHTML = '';
    chatLine('sys', AI.mode() === 'offline' ? T('g.chat.offline') : T('g.chat.online', { mode: AI.mode() }));
    if (n.dialog) chatLine('npc', TX(n.dialog));
    if (chatHistory.length) chatLine('sys', T('g.chat.remembers'));   // se acuerda de vos (tiene memoria previa)
    if (isOraculo(n)) showHint(0);   // el linyera arranca con una pista críptica (nivel 0)
    if (isHincha(n)) hinchaGreeting();   // §9: te pregunta por un equipo / te recuerda / te agradece
    state = 'chat';
    if (typeof Input !== 'undefined' && Input.clear) Input.clear();   // soltar teclas de movimiento (si no, al enfocar el input se pierden los keyup → teclas trabadas)
    elPrompt.classList.add('hidden'); elChat.classList.remove('hidden');
    setTimeout(() => elChatInput && elChatInput.focus(), 30);
  }
  function closeChat() {
    elChat.classList.add('hidden'); elChatInput.value = ''; chatNpc = null; peerChat = null;
    if (typeof Input !== 'undefined' && Input.clear) Input.clear();   // al volver al juego, soltar teclas que quedaron apretadas mientras tipeabas ("se movía solo")
    const from = peerChatFrom; peerChatFrom = null;
    if (state === 'chat') {
      // Lavalle: el chat con el linyera peronista se abrió DESDE el piquete top-down → volvés ahí (lavalleGame sigue vivo)
      if (chatReturnTo === 'lavalle' && lavalleGame) { chatReturnTo = null; state = 'lavalle'; }
      // T2b: si el chat privado se abrió DESDE el bodegón top-down → volvés ahí (no al side-scroller)
      else if (from === 'bodegon' && hasTag(room(), 'bodegon') && enterBodegon()) { /* de vuelta en el bodegón */ }
      else { chatReturnTo = null; state = 'playing'; }
    }
    chipLinMaybePosta();   // QUEST DEL CHIP: si ya hablaste con los 3 linyeras de la habitación → la posta (sos el de Garbarino)
  }
  // F2b.2 — CHAT PRIVADO 1-a-1 con otro jugador del bodegón (te acercás + E). Reusa el panel #chat pero el mensaje
  // va por el salón (Salon.whisper) SOLO al destinatario, no a la IA. Texto efímero, sin historial guardado.
  function openPeerChat(peer, from) {
    if (typeof Salon === 'undefined' || !Salon.whisper) return;
    peerChatFrom = from || null;   // T2b: 'bodegon' → al cerrar volvés al top-down
    peerChat = { pid: peer.pid, nick: peer.nick || T('g.bodegon.someone') }; chatNpc = null; chatBusy = false;
    elChatTitle.textContent = '🔒 ' + peerChat.nick;
    elChatLog.innerHTML = ''; chatLine('sys', T('g.bodegon.privAwith', { nick: peerChat.nick }));
    state = 'chat'; if (typeof Input !== 'undefined' && Input.clear) Input.clear();
    elPrompt.classList.add('hidden'); elChat.classList.remove('hidden');
    setTimeout(() => elChatInput && elChatInput.focus(), 30);
  }
  function peerChatSend() {
    const msg = (elChatInput.value || '').trim(); if (!msg || !peerChat) return;
    elChatInput.value = ''; chatLine('you', msg);
    if (typeof Salon !== 'undefined' && Salon.whisper) Salon.whisper(peerChat.pid, msg);
  }
  // whisper ENTRANTE (otro jugador te habló en privado): si tenés el chat abierto con él → lo agregás; si no, aviso.
  function onPeerWhisper(d) {
    if (!d || !d.msg) return;
    // F3 TRUCO PvP: los mensajes del protocolo viajan por el MISMO whisper (JSON con t:'tk-*'). Ruteo primero.
    if (d.msg.charAt(0) === '{') { let m = null; try { m = JSON.parse(d.msg); } catch (e) {} if (m && typeof m.t === 'string') {
      if (m.t.indexOf('tk-') === 0) { handleTrucoNet(d.from, d.fromNick, m); return; }
      if (m.t.indexOf('t6-') === 0) { handleTruco6(d.from, d.fromNick, m); return; }
      if (m.t.indexOf('lv-') === 0) { handlePiquete(d.from, m); return; }   // Fase 2: estado del "Aguantar el corte"
      if (m.t.indexOf('lv2-') === 0) { handleSoga(d.from, m); return; }      // "La soga": tirón / estado
      if (m.t.indexOf('lv3-') === 0) { handleBombo(d.from, m); return; }      // "Bombo & cumbia": tap / estado
      if (m.t.indexOf('lv4-') === 0) { handleOlla(d.from, m); return; }       // "Reparto de la olla": servir / estado
      if (m.t.indexOf('lv5-') === 0) { handlePancarta(d.from, m); return; }   // "Pintar la pancarta": estado
    } }
    if (peerChat && peerChat.pid === d.from) { chatLine('npc', d.msg); return; }
    // T2b fix: NO tenés el chat abierto con él → AUTO-ABRIR el panel con su mensaje (antes era un toast del HUD, que
    // en el bodegón top-down está oculto → no veías nada). Solo si no estás en otra pantalla bloqueante.
    if (state === 'bodegon' || state === 'playing' || state === 'lavalle') {
      if (state === 'lavalle') chatReturnTo = 'lavalle';
      openPeerChat({ pid: d.from, nick: d.fromNick || T('g.bodegon.someone') }, state === 'bodegon' ? 'bodegon' : (state === 'lavalle' ? 'lavalle' : null));
      chatLine('npc', d.msg);
    } else setMsg(T('g.bodegon.privFrom', { nick: d.fromNick || T('g.bodegon.someone') }), '#aef0c0', 5000);
  }

  // ===== TRUCO PvP — MESAS server-authoritative + transporte de la PARTIDA (specs/truco.md §F3/§14, multijugador) =====
  // El LOBBY (parear) lo hace el SERVER (/salon/table → table-update/start/end). La PARTIDA ya arrancada viaja por
  // whisper (host↔guests), igual que antes. Ver specs/multijugador.md.
  function myPid() { return (typeof Salon !== 'undefined' && Salon.pid) ? Salon.pid : 'me'; }
  function sendTk(pid, obj) { if (typeof Salon !== 'undefined' && Salon.whisper && pid) Salon.whisper(pid, JSON.stringify(obj)); }
  function peerNickOf(pid) { try { const p = Salon.getPeers().get(pid); if (p && p.nick) return p.nick; } catch (e) {} return T('g.bodegon.someone'); }
  function hideHudForMatch() { trucoHbT = 0; trucoWdT = 5; elPrompt.classList.add('hidden'); elHud.classList.add('hidden'); elFloor.classList.add('hidden'); if (elChipBanner) elChipBanner.classList.add('hidden'); }
  function trucoTap(k) { const d = Input.keys[k]; if (d && !trucoKeyHeld[k]) { trucoKeyHeld[k] = true; return true; } if (!d) trucoKeyHeld[k] = false; return false; }

  // --- el SERVER parea: table-update (esperando) / table-start (arranca con seats+seed) / table-end ---
  function onTable(m) {
    if (!m) return;
    if (m.kind === 'update') { if (tableWait && tableWait.table === m.table) tableWait.seats = (m.seats || []).length; return; }
    if (m.kind === 'start') {
      if (trucoPvpGame || truco6Game || piqueteGame || sogaGame || bomboGame || ollaGame || pancaGame || !(m.seats || []).includes(myPid())) return;   // no soy de esta mesa / ya jugando
      tableWait = null;
      tel('minigame', { result: m.table });   // métrica: qué juego se jugó (dashboard)
      if (m.table === '1v1') startTrucoPvp(m.seats, m.seed);
      else if (m.table === 'corte') startPiquete(m.seats, m.seed);
      else if (m.table === 'soga') startSoga(m.seats, m.seed);
      else if (m.table === 'bombo') startBombo(m.seats, m.seed);
      else if (m.table === 'olla') startOlla(m.seats, m.seed);
      else if (m.table === 'pancarta') startPancarta(m.seats, m.seed);
      else startTruco6(m.seats, m.seed);
    }
    // 'end': la mesa se cortó mientras esperabas → seguís en la espera (otro se puede sentar)
  }
  function sitAtTable(table) {   // te sentaste a una mesa (bodegón/lavalle) → al server + a esperar el pareo
    if (trucoPvpGame || truco6Game || piqueteGame || sogaGame || bomboGame || ollaGame || pancaGame || tableWait) return;
    tableWait = { table, seats: 1 };
    if (typeof Salon !== 'undefined' && Salon.tableSit) Salon.tableSit(table, () => {});
    Sfx.pickup && Sfx.pickup();
  }
  function leaveTableWait() { if (!tableWait) return; const tbl = tableWait.table; tableWait = null; if (typeof Salon !== 'undefined' && Salon.tableLeave) Salon.tableLeave(tbl); }
  function drawTableWait(W, H) {
    if (!tableWait) return;
    ctx.fillStyle = 'rgba(0,0,0,0.74)'; ctx.fillRect(0, H / 2 - 50, W, 100); ctx.textAlign = 'center';
    const cap = tableWait.table === '1v1' ? 2 : 6;
    ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 16px monospace'; ctx.fillText(T('g.table.waiting', { table: tableWait.table, n: tableWait.seats, cap }), W / 2, H / 2 - 12);
    ctx.fillStyle = '#cfe8c0'; ctx.font = '13px monospace'; ctx.fillText(T('g.table.waitHint'), W / 2, H / 2 + 18);
  }

  // --- arranque del match 1v1 (el server ya nos pareó: seats=[host,guest], seed común) ---
  function startTrucoPvp(seats, seed) {
    if (typeof TrucoPvp === 'undefined' || !TrucoPvp.create) return;
    const mySeat = seats.indexOf(myPid()); if (mySeat < 0) return;
    const peerPid = seats[1 - mySeat], role = mySeat === 0 ? 'host' : 'guest';
    trucoPeer = peerPid;
    trucoPvpGame = TrucoPvp.create({ role, myNick: playerNick(), peerNick: peerNickOf(peerPid), seed, send: o => sendTk(peerPid, o) });
    state = 'trucopvp'; hideHudForMatch();
  }
  function handleTrucoNet(fromPid, fromNick, m) {   // SOLO mensajes de la PARTIDA en curso (el lobby lo hace el server)
    if (trucoPvpGame && fromPid === trucoPeer) trucoPvpGame.onNet(m);
  }

  // --- arranque del match de a 6 (seats=humanos por orden de llegada; host=seats[0]; el resto lo llena la IA) ---
  function buildNicks6(seats) { const nicks = []; seats.forEach((p, k) => { nicks[k] = (p === myPid()) ? playerNick() : peerNickOf(p); }); for (let s = seats.length; s < 6; s++) nicks[s] = AI_BOTS[s % AI_BOTS.length]; return nicks; }
  function startTruco6(seats, seed) {
    if (typeof TrucoPvp6 === 'undefined' || !TrucoPvp6.create) return;
    const mySeat = seats.indexOf(myPid()); if (mySeat < 0) return;
    const nicks = buildNicks6(seats);
    if (mySeat === 0) {   // HOST: corre la partida + maneja los asientos IA
      const seatToPid = {}, pidToSeat = {}, ai = [];
      seats.forEach((p, k) => { seatToPid[k] = p; pidToSeat[p] = k; ai[k] = false; });
      for (let s = seats.length; s < 6; s++) ai[s] = true;
      truco6 = { seatToPid, pidToSeat };
      const humanSeats = seats.map((p, k) => k).filter(k => seatToPid[k] !== myPid());
      truco6Game = TrucoPvp6.create({ role: 'host', mySeat: 0, nicks, ai, seed, humanSeats, pushView: (seat, v) => sendTk(seatToPid[seat], { t: 't6-view', v }) });
    } else {              // GUEST: refleja la vista del host
      const hostPid = seats[0]; truco6 = { host: hostPid };
      truco6Game = TrucoPvp6.create({ role: 'guest', mySeat, nicks, sendAct: o => sendTk(hostPid, o) });
    }
    state = 'trucopvp6'; hideHudForMatch();
  }
  function seatOfPid(pid) { return (truco6 && truco6.pidToSeat && truco6.pidToSeat[pid] != null) ? truco6.pidToSeat[pid] : null; }
  function handleTruco6(fromPid, fromNick, m) {   // SOLO mensajes de la PARTIDA en curso
    if (!truco6Game) return;
    if (m.t === 't6-view') { truco6Game.onView && truco6Game.onView(m.v); return; }   // guest
    const seat = seatOfPid(fromPid); if (seat == null) return;                          // host: solo asientos conocidos
    if (m.t === 't6-act') truco6Game.onAct(seat, m.a);
    else if (m.t === 't6-hello') truco6Game.onHello(seat);
    else if (m.t === 't6-bye') truco6Game.onBye(seat);
  }
  // Fase 2 Lavalle: "Aguantar el corte". host = seats[0] simula y transmite lv-state; los guests renderizan.
  function startPiquete(seats, seed) {
    if (typeof Piquete === 'undefined' || !Piquete.create) return;
    const host = seats[0], role = (myPid() === host) ? 'host' : 'guest';
    lavalleGame = null;   // dejamos el piquete top-down; al terminar volvemos a Lavalle
    piqueteGame = Piquete.create({ role, seats, myPid: myPid(), seed, sendState: (pid, obj) => sendTk(pid, obj) });
    state = 'piquete'; hideHudForMatch();
  }
  function handlePiquete(fromPid, m) {
    if (!piqueteGame) return;
    if (m.t === 'lv-state' && !piqueteGame.isHost) piqueteGame.applyState(m);
    else if (m.t === 'lv-ray' && piqueteGame.isHost) piqueteGame.onRay();   // guest disparó el rayo solar a Robocop
  }
  // Lavalle: "La soga" (tug of war co-op). host = seats[0]; guests mandan lv2-pull, host transmite lv2-state.
  function startSoga(seats, seed) {
    if (typeof Soga === 'undefined' || !Soga.create) return;
    const host = seats[0], role = (myPid() === host) ? 'host' : 'guest';
    lavalleGame = null;
    sogaGame = Soga.create({ role, seats, myPid: myPid(), hostPid: host, seed, sendState: (pid, obj) => sendTk(pid, obj) });
    state = 'soga'; hideHudForMatch();
  }
  function handleSoga(fromPid, m) {
    if (!sogaGame) return;
    if (m.t === 'lv2-pull' && sogaGame.isHost) sogaGame.onPull();     // host: tirón de un guest
    else if (m.t === 'lv2-state' && !sogaGame.isHost) sogaGame.applyState(m);   // guest: estado del host
  }
  // Lavalle: "Bombo & cumbia" (ritmo co-op). host suma el aguante global; guests mandan lv3-tap, host transmite lv3-state.
  function startBombo(seats, seed) {
    if (typeof Bombo === 'undefined' || !Bombo.create) return;
    const host = seats[0], role = (myPid() === host) ? 'host' : 'guest';
    lavalleGame = null;
    bomboGame = Bombo.create({ role, seats, myPid: myPid(), hostPid: host, seed, sendState: (pid, obj) => sendTk(pid, obj) });
    state = 'bombo'; hideHudForMatch();
  }
  function handleBombo(fromPid, m) {
    if (!bomboGame) return;
    if (m.t === 'lv3-tap' && bomboGame.isHost) bomboGame.onTap(m);
    else if (m.t === 'lv3-state' && !bomboGame.isHost) bomboGame.applyState(m);
  }
  // Lavalle: "Reparto de la olla" (reacción co-op). host sirve; guests mandan lv4-serve, host transmite lv4-state.
  function startOlla(seats, seed) {
    if (typeof Olla === 'undefined' || !Olla.create) return;
    const host = seats[0], role = (myPid() === host) ? 'host' : 'guest';
    lavalleGame = null;
    ollaGame = Olla.create({ role, seats, myPid: myPid(), hostPid: host, seed, sendState: (pid, obj) => sendTk(pid, obj) });
    state = 'olla'; hideHudForMatch();
  }
  function handleOlla(fromPid, m) {
    if (!ollaGame) return;
    if (m.t === 'lv4-serve' && ollaGame.isHost) ollaGame.onServe(m);
    else if (m.t === 'lv4-state' && !ollaGame.isHost) ollaGame.applyState(m);
  }
  // Lavalle: "Pintar la pancarta" (colaborativo). host pinta bajo cada pincel (pos por Salon.pos) + transmite lv5-state.
  function startPancarta(seats, seed) {
    if (typeof Pancarta === 'undefined' || !Pancarta.create) return;
    const host = seats[0], role = (myPid() === host) ? 'host' : 'guest';
    lavalleGame = null;
    pancaGame = Pancarta.create({ role, seats, myPid: myPid(), hostPid: host, seed, sendState: (pid, obj) => sendTk(pid, obj) });
    state = 'pancarta'; hideHudForMatch();
  }
  function handlePancarta(fromPid, m) {
    if (pancaGame && !pancaGame.isHost && m.t === 'lv5-state') pancaGame.applyState(m);
  }
  // RECOMPENSA de los mini-juegos del piquete: ganar da un ÍTEM de piquete al inventario + marca el juego como ganado.
  // Ganar los 5 abre la barricada (piqueteAllWon → Fase 2). Se persiste en localStorage.
  const PIQUETE_GAMES = ['corte', 'soga', 'bombo', 'olla', 'pancarta'];
  function loadPiqueteWon() { try { return JSON.parse(localStorage.getItem('ts_piqueteWon') || '{}') || {}; } catch (e) { return {}; } }
  function savePiqueteWon(w) { try { localStorage.setItem('ts_piqueteWon', JSON.stringify(w)); } catch (e) {} }
  function piqueteAllWon() { const w = loadPiqueteWon(); return PIQUETE_GAMES.every(g => w[g]); }
  function pReward(res, gameKey, itemId) {
    if (res !== 'win') return '';
    const antes = piqueteAllWon();
    const w = loadPiqueteWon(); w[gameKey] = true; savePiqueteWon(w);
    evlog('minijuego', gameKey);
    if (!antes && piqueteAllWon()) applyEdge('piquete_juegos', 'piqueteCampeon');   // GRAFO: ganaste los 5 (E4)
    addItem(itemId); player.flores = (player.flores || 0) + 2;
    let extra = piqueteAllWon() ? (' ' + T('g.piquete.allWon')) : '';
    return ' ' + T('g.piquete.reward', { item: T(WEAPONS[itemId].label) }) + extra;
  }
  async function chatSend() {
    if (peerChat) return peerChatSend();   // F2b.2: chat PRIVADO con otro jugador → va por el salón, no a la IA
    if (chatBusy || !chatNpc) return;
    if (typeof AI !== 'undefined' && AI.setStormed) AI.setStormed(stormed);   // pool pre/post según la tormenta

    const msg = (elChatInput.value || '').trim();
    if (!msg) return;
    elChatInput.value = ''; chatLine('you', msg);
    // CINE: si el linyera te mandó a buscar una noticia, tu mensaje es el REPORTE → runtime de quests lo corrobora.
    // (si estás CHIPEADO, los linyeras de la habitación NO hablan del cine/Mundial: solo del chip.)
    if (isOraculo(chatNpc) && !chipped) { const r = Quests.report('oraculo', msg); if (r) { chatLine('npc', r.line); return; } }
    // §9: al hincha, si ya conseguiste el resultado en el guarda, te agradece + premio (runtime).
    if (isHincha(chatNpc)) { const r = Quests.report('hincha', msg); if (r) { chatLine('npc', r.line); return; } }
    chatHistory.push({ role: 'user', content: msg });
    chatBusy = true;
    const thinking = chatThinking();   // iconos animados mientras espera la IA (chat-linyera-ux §2)
    // linyera oráculo: cada repregunta sube el spoiler (0→3); la pista se le pasa como GROUNDING a la IA
    // (la dice con su voz, no inventa ruta). Si la respuesta sale LOCAL, la mostramos explícita (garantía).
    const ground = isOraculo(chatNpc) ? getHint(Math.min(++hintAsks, 3)) : null;
    let groundTxt = (ground && ground.text) || (isHincha(chatNpc) && mundialQuest ? T('g.mundial.ground', { eq: mundialQuest.equipo }) : null);
    // ECOSISTEMA: el oráculo "sabe" el estado vivo del mundo (datos, no hardcode) → grounding extra.
    // CHIPEADO: en la habitación del telo, el linyera SOLO te boludea con el chip/la IA/el sol — nada del cine ni el Mundial.
    if (isOraculo(chatNpc)) groundTxt = [groundTxt, chipped ? T('g.chip.chatGround') : worldBrief()].filter(Boolean).join(' · ');
    // IDEAS que quedaron picando con ESTE NPC (chat-linyera-ux §1): "vos le sugeriste el cine y no te contestó /
    // te hizo caso" — el NPC se acuerda aunque hayas cerrado el chat sin responderle.
    const mk = memKey(chatNpc);
    if (!chipped && typeof Ideas !== 'undefined') { const ig = Ideas.groundFor(mk); if (ig) groundTxt = [groundTxt, ig].filter(Boolean).join(' · '); }
    let reply;
    try { reply = await AI.chat(chatNpc.persona || 'filosofo', msg, chatHistory, groundTxt); }
    catch (e) { reply = T('g.chat.error'); }
    thinking.remove();
    chatLine('npc', reply);
    chatHistory.push({ role: 'assistant', content: reply });
    sessChats++;   // "Tu partida": cuántas veces charlaste
    // métrica: ¿el chat dio IA real o cayó al pool? + con qué MOTOR (para ver tu "v1 chat no anda")
    tel('chat', { engine: engineUsed, result: (typeof AI !== 'undefined' && AI.lastFallback && AI.lastFallback()) ? 'fallback' : (typeof AI !== 'undefined' && AI.lastSource ? AI.lastSource() : 'ai') });
    evlog('charla', chatNpc && (chatNpc.persona || chatNpc.name));
    if (mk) oracleMem[mk] = chatHistory.slice(-12);   // guardá su memoria (cap 12 turnos)
    if (mk && typeof Ideas !== 'undefined') Ideas.scan(mk, reply);   // ¿te tiró una idea? queda PICANDO (§1)
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
    // CINE: el linyera a veces te manda al cine a buscar un topic → runtime decide (chance/giver desde el registro).
    // CHIPEADO: los linyeras de la habitación del telo NO te mandan al cine — solo el chip (suprimir el giver de noticias).
    if (isOraculo(chatNpc) && !chipped) { const g = Quests.maybeGive('oraculo'); if (g) chatLine('npc', g.line); }
    chatBusy = false;
    if (elChatInput) elChatInput.focus();
  }
  // ARSENAL por defecto si el nivel no trae data (paridad con v1: un solo fierro, +40 munición/+20 vida por 15).
  const ARSENAL_FALLBACK = [{ key: 'facon', cost: 15, ammo: 40, hp: 20 }];
  let armasNpc = null;   // el misterioso con el que estás negociando (para el menú)
  function buyArmas(n) {
    // el misterioso de la galería: con la tormenta, las armas eléctricas no sirven → fierro criollo.
    // Ahora abre un MENÚ (como el guarda): elegís UN fierro del arsenal (data del nivel) y te armás.
    if (!stormed) { setMsg(T('g.armas.preStorm'), '#9fd3ff', 5000); return; }
    if (n.armado) { setMsg(T('g.armas.done'), '#aef0c0', 3000); return; }
    armasNpc = n; openArmas();
  }
  function openArmas() {
    const ov = document.getElementById('armasmenu'), body = document.getElementById('armasBody');
    if (!ov || !body || !armasNpc) return;
    const arsenal = (armasNpc.arsenal && armasNpc.arsenal.length) ? armasNpc.arsenal : ARSENAL_FALLBACK;
    let html = '<div class="end-stats-title">' + T('g.armas.menuTitle') + '</div>';
    html += '<div style="text-align:center;margin:.3em 0 .7em;opacity:.85">' + T('g.armas.menuSub', { c: (player.coins || 0) }) + '</div>';
    html += '<div style="display:flex;flex-direction:column;gap:.4em">';
    for (let i = 0; i < arsenal.length; i++) {
      const a = arsenal[i], can = (player.coins || 0) >= a.cost;
      const nm = T('g.armas.fierro.' + a.key), bonus = '+' + a.ammo + ' 🔫 +' + a.hp + ' ❤️';
      html += '<button class="armas-buy" data-i="' + i + '"' + (can ? '' : ' disabled') + ' style="display:flex;justify-content:space-between;align-items:center;gap:.6em;padding:.6em .9em;font:inherit;cursor:' + (can ? 'pointer' : 'not-allowed') + ';opacity:' + (can ? '1' : '.45') + '"><span>⚔️ ' + nm + ' <small style="opacity:.7">' + bonus + '</small></span> <b>' + a.cost + ' 🪙</b></button>';
    }
    html += '</div>';
    body.innerHTML = html;
    body.querySelectorAll('.armas-buy').forEach(b => b.addEventListener('click', () => pickArma(arsenal[+b.getAttribute('data-i')])));
    ov.classList.remove('hidden');
  }
  function closeArmas() { const ov = document.getElementById('armasmenu'); if (ov) ov.classList.add('hidden'); }
  function pickArma(a) {
    if (!a || !armasNpc) return;
    if ((player.coins || 0) < a.cost) { setMsg(T('g.armas.noCoins', { cost: a.cost }), '#ff5252', 4000); Sfx.empty(); return; }
    player.coins -= a.cost; armasNpc.armado = true; applyEdge('armas', 'armado');
    player.ammo += a.ammo; player.hp = Math.min(MAXHP, player.hp + a.hp);
    // suma el arma ESPECÍFICA comprada (rebenque/boleadoras/facón/FAL) al inventario; en la calle no la usa, en los sueños SÍ.
    addItem(WEAPONS[a.key] ? a.key : 'fierro');
    closeArmas();
    setMsg(T('g.armas.bought', { fierro: T('g.armas.fierro.' + a.key), ammo: a.ammo, hp: a.hp }) + ' ' + T('g.wpn.dreamHint'), '#7CFC00', 8500); Sfx.pickup();
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
    player.coins = Math.floor(player.coins * (SURV.sleepCoinKeepMin + Math.random() * (SURV.sleepCoinKeepMax - SURV.sleepCoinKeepMin)));  // monedas: te queda algo (parcial, aleatorio)
    player.hp = SURV.fullHp; player.alive = true; decayAcc = 0;             // descansás: arrancás el día lleno
    chinoFrontOpen = false; flash();
    const bh = bunkerHarvest();   // F3 (mapas): mientras dormís, TU BÚNKER PRODUCE (huerta/depósito/catre/defensa)
    setMsg(T('g.loop.sleep', { n: loopCount }) + (bh ? ' ' + bh : ''), '#7CFC00', bh ? 10000 : 8000);
  }
  // F3 (specs/mapas-satelites-bunkers.md): lo que construiste en EL PLANO produce al dormir el loop.
  function bunkerHarvest() {
    // F4: los búnkers de TODAS las zonas producen (índice ts_bunker_zones + compat con el viejo ts_bunker_v1)
    let mods = []; try {
      const zonas = JSON.parse(localStorage.getItem('ts_bunker_zones') || '[]') || [];
      for (const z of zonas) mods = mods.concat(JSON.parse(localStorage.getItem('ts_bunker_z_' + z) || '[]') || []);
      if (!zonas.includes('florida')) mods = mods.concat(JSON.parse(localStorage.getItem('ts_bunker_v1') || '[]') || []);
    } catch (e) {}
    const c = k => mods.filter(m => m && m.id === k).length;
    const car = c('huerta') * 2, mon = c('deposito') * 3, extra = c('catre') * 5 + c('defensa') * 5;
    if (!car && !mon && !extra) return '';
    if (car) player.caramelos = (player.caramelos || 0) + car;
    if (mon) player.coins = (player.coins || 0) + mon;
    if (extra) player.coins = (player.coins || 0) + extra;   // catres alquilados + defensa que ahuyenta chorros → changa
    return T('g.bmapa.harvest', { c: car, m: mon + extra });
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
  function enterSuper(raid) { if (stormed) applyEdge('chino_back', 'chinoEntered'); superGame = Super.create({ player, gaveBeers, stormed, raid: !!raid }); state = 'super'; if (typeof Sfx !== 'undefined' && Sfx.setRoomTrack) Sfx.setRoomTrack('chino'); elPrompt.classList.add('hidden'); elHud.classList.add('hidden'); elFloor.classList.add('hidden'); if (elChipBanner) elChipBanner.classList.add('hidden'); elMsg.textContent = ''; }
  // NIVEL-AI en EL MOTOR REAL: te colaste a la trastienda del chino → la IA GENERA un nivel-plataforma, pasa la
  // RED (Playable), y lo cargamos en EL motor (rooms-swap). Si por lo que sea no es jugable, abortamos al juego
  // normal (NUNCA un nivel roto). Al llegar a la meta / morir / escapar → endSpinoffLevel restaura todo.
  // lo que el jugador HABLÓ con los linyeras/bots (mensajes suyos de oracleMem) → el oráculo "sabe de él"
  function playerChatTopics() {
    const out = [];
    for (const k in oracleMem) for (const m of (oracleMem[k] || [])) if (m && m.role === 'user' && m.content) out.push(String(m.content).slice(0, 120));
    return out.slice(-8);
  }
  // ARMAS CRIOLLAS (inventario-armas §6): garantiza que el sueño tenga A QUIÉN pegarle con el fierro criollo que tengas.
  // Cada arma criolla pega ×3 contra UN tipo de bicho (rebenque→pacman, boleadoras→dron/galaga, facón→peaton, FAL→cuevero),
  // pero una sala de un solo "vibe" puede no spawnear ese tipo. Acá, por cada arma criolla que TENÉS, si su tipo "contra" no
  // aparece, swapeo un enemigo al azar a ese tipo (no toca geometría → la RED no se altera). Así el arma criolla sirve.
  function ensureCriolloTargets(model) {
    if (!model || !model.rooms) return;
    const targets = [];
    for (const id of (player.inventory || [])) { const w = WEAPONS[id]; if (w && w.ctx === 'dream' && Array.isArray(w.effectiveVs)) for (const ty of w.effectiveVs) if (!targets.includes(ty)) targets.push(ty); }
    if (!targets.length) return;
    const enemies = [];
    for (const r of model.rooms) for (const e of (r.entities || [])) if (e.tipo === 'enemy' && e.combat) enemies.push(e);
    if (!enemies.length) return;
    const present = new Set(enemies.map(e => e.combat.type));
    const pool = enemies.slice();
    for (const ty of targets) {
      if (present.has(ty)) continue;
      const idx = (Math.random() * pool.length) | 0, e = pool.splice(idx, 1)[0]; if (!e) break;
      e.combat.type = ty; present.add(ty);
    }
  }
  // construye+valida+swapea un nivel generado. Devuelve true si entró; false si no era jugable (la RED).
  function loadGenLevel(gen, returnRoom) {
    if (!gen) return false;
    ensureCriolloTargets(gen.model);   // armas criollas en sueños: que el nivel spawnee el tipo "contra" del arma que tenés
    let genRooms = null; try { genRooms = Mundo.fromModel(gen.model); } catch (e) {}
    const playable = (typeof Playable === 'undefined') || Playable.checkLevel(gen.model).ok;   // LA RED
    const hasGoal = genRooms && genRooms.some(r => r.goal);
    if (!genRooms || !genRooms.length || !genRooms[0].playerStart || !hasGoal || !playable) return false;
    spinoffReturnRoom = (returnRoom != null) ? returnRoom : null;   // vecino: al GANAR quedás en el interior del edificio
    spinoffSave = { rooms, states, current, px: player.x, py: player.y, vx: player.vx, vy: player.vy, hp: player.hp };
    spinoffReward = gen.reward || { caramelos: 4 }; spinoffName = gen.name || gen.model.nombre;
    rooms = genRooms;
    states = rooms.map(r => ({ enemies: r.enemies.map(Enemies.create), pickups: r.pickups.map(p => ({ ...p, taken: false })) }));
    // el nivel generado es un mundo HOSTIL en sí (terror del vecino / raid del chino): los enemigos ya están ACTIVOS
    // y te persiguen (sin esto quedaban hostile=false → quietos, como reportó el dueño). El despertar es la tormenta.
    for (const st of states) for (const e of st.enemies) { e.hostile = true; e.dormant = false; }
    current = 0; const s = rooms[0].playerStart; player.x = s.x; player.y = s.y; player.vx = player.vy = 0;
    spinoffLevel = true; state = 'playing'; transCd = 0.4; roamingNpc = null; updateCam();
    elHud.classList.remove('hidden'); elFloor.classList.remove('hidden'); elFloor.textContent = TX(rooms[0].name);
    flash();   // beat visual al CAER en el nivel generado (que no aparezca de golpe)
    setMsg(T('g.nivelai.enter', { name: spinoffName }), '#e0b0ff', 5500);
    tel('nivelai', { theme: gen.theme, mode: 'level' });
    return true;
  }
  function launchNivelAI() {
    const back = () => { state = 'playing'; elHud.classList.remove('hidden'); elFloor.classList.remove('hidden'); };
    if (typeof NivelAI === 'undefined' || !NivelAI.generateLevel || typeof Mundo === 'undefined') { back(); return; }
    flash();   // beat visual: salís del súper (vista de arriba) y te colás al fondo → no es un corte seco al nivel
    // ~40% de las veces, si charlaste con los linyeras, el ORÁCULO te INVENTA un nivel a tu medida (async, lo arma la IA)
    const chats = playerChatTopics();
    if (chats.length >= 2 && NivelAI.requestOraculo && Math.random() < 0.4) {
      back(); setMsg(T('g.nivelai.oraculo'), '#e0b0ff', 8000);   // mientras la IA piensa, esperás en lo del chino
      NivelAI.requestOraculo(chats, theme => {
        if (spinoffLevel || state !== 'playing') return;   // ya entraste a otro lado / cambió el estado
        if (!(theme && loadGenLevel(NivelAI.generateLevel(theme)))) loadGenLevel(NivelAI.generateLevel());   // fallback: tema normal
      });
      return;
    }
    // TEMA FIJO: si la IA está disponible le pedimos que AUTORE la geometría (async); si está caída, requestGeometry
    // llama cb(null) al toque (circuit breaker) y caemos a la geometría procedural — instantáneo, nunca se cuelga.
    if (NivelAI.requestGeometry) {
      back(); setMsg(T('g.nivelai.shaping'), '#e0b0ff', 8000);
      NivelAI.requestGeometry(null, theme => {
        if (spinoffLevel || state !== 'playing') return;     // ya entraste a otro lado / cambió el estado
        if (!loadGenLevel(NivelAI.generateLevel(theme || undefined))) { back(); setMsg(T('g.nivelai.fail'), '#ff5252', 4000); }
      });
      return;
    }
    if (!loadGenLevel(NivelAI.generateLevel())) { back(); setMsg(T('g.nivelai.fail'), '#ff5252', 4000); }
  }
  // QUEST MUNDO-AI (specs/quest-mundo-ai.md 2.A): un MUNDO por SEED — el motor genera DATA (Mundo.fromModel) determinista.
  // MISMO seed = MISMO mundo (compartible). v1 entra SIEMPRE (generación por seed, sin depender de la IA); el /mundo-ai
  // (tema por prompt) es enriquecimiento opcional. `theme` = tema autorado por IA (opcional). Reusa loadGenLevel + la RED.
  let lastMundoSeed = 0;
  // v2: si hay IA disponible, le pedimos que autore el TEMA (flavor+beats) de ESE seed (`NivelAI.requestMundo`,
  // cacheado por seed en el proxy → mismo seed siempre trae el mismo tema). Best-effort y NUNCA bloquea: si la IA
  // está caída/tarda (circuit breaker), entra igual con el tema 100% procedural-por-seed (`generateLevel` sync).
  function launchMundoAI(seed, prompt) {
    if (typeof NivelAI === 'undefined' || !NivelAI.generateLevel || typeof Mundo === 'undefined' || !rooms || !player) return false;
    if (typeof seed !== 'number' || !isFinite(seed)) seed = (Math.random() * 1e9) | 0;
    seed = Math.abs(seed | 0) || 1;
    closeMundoAI();
    const enter = theme => {
      if (spinoffLevel || state !== 'playing') return;   // ya entraste a otro lado / cambió el estado
      const gen = NivelAI.generateLevel(theme || undefined, seed);
      if (loadGenLevel(gen)) { lastMundoSeed = seed; setMsg(T('g.mundoai.enter', { seed }), '#e0b0ff', 7000); }
      else setMsg(T('g.nivelai.fail'), '#ff5252', 4000);
    };
    if (NivelAI.requestMundo) { setMsg(T('g.mundoai.shaping', { seed }), '#e0b0ff', 8000); NivelAI.requestMundo(seed, prompt, enter); }
    else enter(null);
    return true;
  }
  function openMundoAI() {
    const ov = document.getElementById('mundoai'); if (!ov) return;   // headless → no-op
    const note = document.getElementById('mundoai-note'); if (note) note.textContent = lastMundoSeed ? T('g.mundoai.last', { seed: lastMundoSeed }) : '';
    const inp = document.getElementById('mundoai-seed'); if (inp) inp.value = '';
    const pin = document.getElementById('mundoai-prompt'); if (pin) pin.value = '';
    ov.classList.remove('hidden'); if (inp && inp.focus) try { inp.focus(); } catch (e) {}
  }
  function closeMundoAI() { const ov = document.getElementById('mundoai'); if (ov) ov.classList.add('hidden'); }
  // salir del nivel generado: restaura el juego principal exactamente como estaba. outcome: win/dead/flee.
  function endSpinoffLevel(outcome) {
    if (!spinoffLevel || !spinoffSave) { spinoffLevel = false; return; }
    const sv = spinoffSave;
    rooms = sv.rooms; states = sv.states; current = sv.current;
    player.x = sv.px; player.y = sv.py; player.vx = sv.vx; player.vy = sv.vy;
    if (!player.alive || player.hp <= 0) { player.alive = true; player.hp = Math.max(20, Math.min(MAXHP, sv.hp)); }   // morir en el nivel bonus NO te mata el run
    spinoffLevel = false; spinoffSave = null; state = 'playing'; transCd = 0.4; roamingNpc = null; updateCam();
    { const w = WEAPONS[player.weapon]; if (w && w.ctx === 'dream') player.weapon = 'escupitajo'; }   // el sueño terminó: el Carpo guarda el fierro criollo (no lo usa despierto)
    elFloor.textContent = TX(rooms[current].name);
    if (outcome === 'win') {
      for (const k in (spinoffReward || {})) player[k] = (player[k] || 0) + (spinoffReward[k] || 0);
      const rw = spinoffReward || {}; const rwTxt = rw.caramelos ? rw.caramelos + ' 🍬' : (rw.coins || 0) + ' 🪙';
      if (spinoffReturnRoom != null && rooms[spinoffReturnRoom]) {   // VECINO: quedás en el interior REAL del edificio (RF-6)
        current = Math.max(0, Math.min(rooms.length - 1, spinoffReturnRoom));
        const r = rooms[current]; player.x = 2 * Level.TILE; player.y = r.gTop * Level.TILE - player.h; player.vx = player.vy = 0; player.alive = true;
        updateCam(); elFloor.textContent = TX(r.name);
        setMsg(T('g.vecino.inside', { name: TX(r.name), reward: rwTxt }), '#c8b0d8', 8000); Sfx.win();
      } else {
        setMsg(T('g.nivelai.win', { name: spinoffName, reward: rwTxt }), '#7CFC00', 6000); Sfx.win();
      }
    } else setMsg(T(outcome === 'dead' ? 'g.nivelai.back' : 'g.nivelai.flee'), '#e0b0ff', 4500);
    spinoffReturnRoom = null;
  }
  function enterVinilos() { vinilosGame = Vinilos.create({ player }); state = 'vinilos'; elPrompt.classList.add('hidden'); elHud.classList.add('hidden'); elFloor.classList.add('hidden'); if (elChipBanner) elChipBanner.classList.add('hidden'); elMsg.textContent = ''; Sfx.startEighties(); }
  // TIENDA GENERADA (galería de la cueva): le hablás al local → entrás a su interior generado por IA (rubro = dato del
  // NPC). Aditivo: si falta NivelAI/Tienda, cae al menú plano de siempre (buyFromShop). Ver specs/tiendas-generadas.md.
  function enterTienda(n) {
    if (typeof NivelAI === 'undefined' || !NivelAI.generateShop || typeof Tienda === 'undefined') { buyFromShop(n); return; }
    const tdef = n.tienda || {};
    // CACHE-FIRST: abre AL TOQUE con lo que haya (surtido autorado por IA si está cacheado, si no el molde estático).
    const ai = NivelAI.shopCache ? NivelAI.shopCache(tdef.tipo) : null;
    const scene = NivelAI.generateShop(tdef.tipo, tdef.base, ai);
    if (!scene || !scene.wares || !scene.wares.length) { buyFromShop(n); return; }
    tiendaGame = Tienda.create(scene, { player, maxHp: MAXHP });
    state = 'tienda'; flash(); elPrompt.classList.add('hidden'); elHud.classList.add('hidden'); elFloor.classList.add('hidden'); if (elChipBanner) elChipBanner.classList.add('hidden'); elMsg.textContent = '';
    tel('tienda', { tipo: scene.id, ai: !!ai });
    // si no estaba cacheado, la IA autora el surtido en background → la PRÓXIMA visita ya entra enriquecida
    if (!ai && NivelAI.requestShop) NivelAI.requestShop(tdef.tipo, () => {});
  }
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
    const cost = num(sh.cost, Infinity), amount = num(sh.amount, 0);   // anti-NaN: ítem malformado = INCOMPRABLE (no rompe la economía)
    if (have < cost) { setMsg(T('g.shop.noFunds', { cost, cur, have }), '#ff5252', 3000); Sfx.empty(); return; }
    if (sh.pay === 'caramelos') player.caramelos -= cost; else if (sh.pay === 'forros') player.forros -= cost; else player.coins -= cost;
    sh.stock--;
    let txt;
    if (sh.kind === 'ammo') { player.ammo += amount; txt = T('g.shop.ammo', { n: amount }); }
    else if (sh.kind === 'health') { player.hp = Math.min(MAXHP, player.hp + amount); txt = T('g.shop.health', { n: amount }); }
    else { player.ammo += 30; player.hp = Math.min(MAXHP, player.hp + 25); txt = T('g.shop.amuleto'); }
    setMsg(T('g.shop.bought', { txt, cost, cur }), '#7CFC00', 3500); Sfx.pickup();
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
      if (!cueveroUnlocked) { cueveroBusy(c); return; }   // GATE: hasta desbaratar al tahúr no te vende
      bought = true;
      setMsg(T('g.cuevero.real', { dialog: TX(c.dialog) }), '#ff5252', 7000);
      triggerStorm();
    } else {
      setMsg(c.dialog, '#ffd54f', 4800);
    }
  }
  // --- GATE DEL CUEVERO (specs/cuevero-gate-truco.md) ---
  // El cuevero está "ocupado, con dramas con el tahúr": tira una línea del pool + abre el menú de 3 opciones.
  function cueveroBusy(c) {
    Sfx.pickup();
    setMsg(TL('g.cuevero.busy'), '#ffd54f', 4600);   // pool i18n "ocupado con el tahúr"
    openCuevero(c);
  }
  function openCuevero(c) {
    const ov = document.getElementById('cueveromenu'), body = document.getElementById('cueveroBody');
    if (!ov || !body) return;   // sin overlay (headless): el gate igual bloquea la venta (RF-8)
    let html = '<div class="end-stats-title">' + T('g.cuevero.menuTitle') + '</div>';
    html += '<div style="text-align:center;margin:.3em 0 .7em;opacity:.85">' + T('g.cuevero.menuSub') + '</div>';
    html += '<div style="display:flex;flex-direction:column;gap:.4em">';
    for (const k of ['a', 'b', 'c']) {
      html += '<button class="cuevero-opt" data-k="' + k + '" style="text-align:left;padding:.6em .9em;font:inherit;cursor:pointer">' + T('g.cuevero.opt' + k.toUpperCase()) + '</button>';
    }
    html += '</div>';
    body.innerHTML = html;
    const btns = body.querySelectorAll ? body.querySelectorAll('.cuevero-opt') : null;
    if (btns && btns.forEach) btns.forEach(b => b.addEventListener('click', () => pickCuevero(b.getAttribute('data-k'))));
    ov.classList.remove('hidden');
  }
  function closeCuevero() { const ov = document.getElementById('cueveromenu'); if (ov) ov.classList.add('hidden'); }
  function pickCuevero(k) {
    closeCuevero(); Sfx.pickup();
    if (k === 'a') startRutaContactos();
    else if (k === 'b') setMsg(T('g.cuevero.bGo'), '#ffd54f', 7000);   // ruta propia: andá vos a ganarle al truco
    else setMsg(T('g.cuevero.cBye'), '#9fd3ff', 5000);                 // dead-end (humor), no cambia nada
  }
  // RUTA A — "tengo contactos": aparece un linyera que te ESCOLTA (camina con vos cruzando salas) hasta Guido.
  function startRutaContactos() {
    guidoSummoned = true;
    setMsg(T('g.cuevero.linyera'), '#7CFC00', 9000);
    syncCompanions();   // el linyera se te pega y te lleva hasta EducaciónIT (follow cross-room)
  }
  // GUIDO (EducaciónIT): el de los cursos que "sabe jugar al truco". Sólo entra a la cadena si viniste por la ruta A.
  function handleGuido(n) {
    Sfx.pickup();
    if (cueveroUnlocked) { setMsg(T('g.guido.done'), '#aef0c0', 4000); return; }   // ya está resuelto
    if (!guidoSummoned)  { setMsg(TX(n.dialog) || T('g.guido.hi'), '#aef0c0', 4500); return; }   // no viniste por la cadena → saludo normal
    if (!guidoRecruited) {            // primera vez tras el linyera: te lo presentan y el linyera se esfuma
      guidoRecruited = true;
      setMsg(T('g.guido.recruit'), '#ffd54f', 9000);
      syncCompanions();              // el linyera ya te trajo → se va
      return;
    }
    if (guidoFollowing) { setMsg(T('g.guido.coming'), '#7CFC00', 4000); return; }
    if (tahurDiscovered) {            // ya sabés dónde está el tahúr → Guido te ACOMPAÑA (camina con vos)
      guidoFollowing = true;
      setMsg(T('g.guido.follow'), '#7CFC00', 7000);
      syncCompanions();              // Guido se levanta y te sigue
    } else {                         // todavía no descubriste al tahúr → volvé más tarde (+ pista)
      setMsg(T('g.guido.later'), '#ffd54f', 7000);
    }
  }
  // RUTA B "de a 6": reclutás un compañero de truco (te SIGUE cruzando salas, como Guido). Sólo tras el reto del tahúr.
  function recruitMate(n) {
    Sfx.pickup();
    const id = n.mate && n.mate.id;
    if (!id || !TRUCO_MATES[id]) { setMsg(TX(n.dialog) || '...', '#aef0c0', 3500); return; }
    if (cueveroUnlocked) { setMsg(T('g.truco.mateDone'), '#aef0c0', 4000); return; }
    // ruta A ya elegida (vas con Guido): el de-a-6 es la OTRA ruta → el compañero lo reconoce (no te manda al tahúr en vano)
    if (guidoSummoned || guidoFollowing) { setMsg(T('g.truco.mateGuido', { name: TRUCO_MATES[id].name }), '#9fb4c4', 6000); return; }
    if (!trucoSeisOffered) { setMsg(T('g.truco.mateEarly'), '#9fb4c4', 5000); return; }   // todavía no te retaron de a 6
    if (trucoMatesRec[id]) { setMsg(T('g.truco.mateAlready', { name: TRUCO_MATES[id].name }), '#aef0c0', 3500); return; }
    trucoMatesRec[id] = true;
    setMsg(T('g.truco.mateJoin', { name: TRUCO_MATES[id].name }), '#7CFC00', 6000);
    syncCompanions();   // el compañero se suma y te sigue hasta la mesa
  }
  // resuelve el partido DE A 6 (3 vs 3): tu duelo ya se jugó (youWon); cada compañero juega el suyo por su skill.
  // Gana el equipo con 2 de 3 duelos. Devuelve { teamWon, won, lost }.
  function resolveTrucoSeis(youWon) {
    let won = youWon ? 1 : 0;
    for (const id of Object.keys(trucoMatesRec)) { if (Math.random() < (TRUCO_MATES[id] ? TRUCO_MATES[id].skill : 0.5)) won++; }
    const total = 1 + Object.keys(trucoMatesRec).length;   // 3 normalmente
    return { teamWon: won >= Math.ceil((total + 1) / 2), won, lost: total - won, total };
  }
  // Guido le gana al tahúr (auto-win cinemático) y te pasa el "te perdono" para el cuevero.
  function guidoBeatsTahur() {
    guidoFollowing = false; trucoEverWon = true;
    applyEdge('truco', 'trucoWon');                 // ganar el truco (vía Guido) TAMBIÉN abre la puerta al chino (igual que 1v1 / de a 6)
    applyEdge('cuevero_gate', 'cueveroUnlocked');   // destraba al cuevero vía grafo
    syncCompanions();   // Guido cumplió → se va
    flash(); Sfx.win();
    setMsg(T('g.guido.beats'), '#7CFC00', 9000);
    tel('cuevero_gate', { route: 'guido' });
  }
  // === EL VECINO de los edificios clausurados (specs/edificios-clausurados-historias.md) ===
  // Post-tormenta te flashea HISTORIAS de terror del edificio de al lado; tras un par, te ofrece "¿querés pasar?"
  // → la máquina de niveles GENERA un nivel con la última historia como semilla; al ganarlo quedás en el interior real.
  // Pool COMPARTIDO de historias (sabor de terror reusable por edificio); el texto va en i18n (g.vecino.tale.<id>).
  const VECINO_STORIES = [
    { id: 'juguetes',  motif: '🧸', style: 'climb',  props: ['🧸', '🪆', '🎈', '🚪', '🕯️', '🃏'], palette: { floor: '#1c1622', floor2: '#241c2c', wall: '#3e2e4e', accent: '#c060a0' } },
    { id: 'llorona',   motif: '👧', style: 'climb',  props: ['👧', '💧', '🚪', '🕯️', '🪞', '🩸'], palette: { floor: '#14181f', floor2: '#1b2029', wall: '#2e3a4a', accent: '#7fd0ff' } },
    { id: 'filicidio', motif: '🔪', style: 'climb',  props: ['🔪', '🩸', '🚪', '🛏️', '🕯️', '🪓'], palette: { floor: '#1f1414', floor2: '#281a1a', wall: '#4a2e2e', accent: '#ff5252' } },
    { id: 'fiesta',    motif: '🎉', style: 'aisles', props: ['🎉', '🍷', '🪩', '🔊', '🎈', '💀'], palette: { floor: '#1a1622', floor2: '#221c2c', wall: '#4a2e5a', accent: '#ff5da2' } },
    { id: 'fantasma',  motif: '👻', style: 'wall',   props: ['👻', '🕯️', '🚪', '🪞', '⛓️', '🕸️'], palette: { floor: '#16181c', floor2: '#1d2026', wall: '#343a44', accent: '#aef0ff' } },
    { id: 'gato',      motif: '🐈‍⬛', style: 'climb', props: ['🐈‍⬛', '🕯️', '🪦', '🚪', '🕸️', '🌑'], palette: { floor: '#171717', floor2: '#1f1f1f', wall: '#383838', accent: '#9c88c0' } },
  ];
  const VECINO_GHOST_LINES = { es: ['no deberías estar acá', 'andate mientras puedas', 'te estábamos esperando', 'shhh', '¿escuchaste eso?', 'quedate un ratito más...'],
                               en: ['you shouldn\'t be here', 'leave while you can', 'we were waiting for you', 'shhh', 'did you hear that?', 'stay a little longer...'] };
  function vecinoLang() { return (typeof I18n !== 'undefined' && I18n.short && I18n.short() === 'en') ? 'en' : 'es'; }
  // banco VIVO de la IA (window.HISTORIAS_VECINO, lo trae js/historias-vecino.js del proxy) para ESTE edificio
  function liveStoriesFor(edif) {
    const bank = (typeof window !== 'undefined' && window.HISTORIAS_VECINO) || [];
    return bank.filter(s => s && s.id && (s.es || s.en) && (s.edif === edif || !s.edif));
  }
  // paletas de TERROR (10, hues distintos) + props tenebrosos: para que cada historia VIVA tenga un look PROPIO y
  // temático (no un molde genérico random). Determinístico por historia (hash) → consistente y distinto entre relatos.
  const HORROR_PALETTES = [
    { floor: '#1c1622', floor2: '#241c2c', wall: '#3e2e4e', accent: '#c060a0' },  // violeta
    { floor: '#14181f', floor2: '#1b2029', wall: '#2e3a4a', accent: '#7fd0ff' },  // azul frío
    { floor: '#1f1414', floor2: '#281a1a', wall: '#4a2e2e', accent: '#ff5252' },  // rojo sangre
    { floor: '#16181c', floor2: '#1d2026', wall: '#343a44', accent: '#aef0ff' },  // gris fantasma
    { floor: '#171717', floor2: '#1f1f1f', wall: '#383838', accent: '#9c88c0' },  // negro
    { floor: '#1a1d12', floor2: '#22271a', wall: '#3a4424', accent: '#a8d860' },  // verde enfermo
    { floor: '#201810', floor2: '#2a2014', wall: '#4e3a20', accent: '#ffb84d' },  // ámbar viejo
    { floor: '#1d1218', floor2: '#261820', wall: '#4a2438', accent: '#ff6ec7' },  // rosa carne
    { floor: '#101a1a', floor2: '#162424', wall: '#244a48', accent: '#4dd6c8' },  // agua podrida
    { floor: '#181420', floor2: '#20182c', wall: '#382a52', accent: '#b388ff' },  // índigo
  ];
  const HORROR_PROPS = ['🕯️', '🚪', '🪞', '🕸️', '⛓️', '🩸', '🪦', '🌑', '💀', '🦇', '🕷️', '🪤'];
  function hashStr(str) { let h = 0; str = String(str); for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return Math.abs(h); }
  // visuales PROPIOS de una historia viva: paleta (hash → 1 de 10) + props = su motif + 5 props de terror rotados por el seed
  function motifVisuals(s) {
    const seed = hashStr(s.id || (s.es && s.es.gancho) || s.motif || 'x');
    const motif = s.motif || '👻', props = [motif];
    for (let i = 0; i < 5; i++) props.push(HORROR_PROPS[(seed + i * 7) % HORROR_PROPS.length]);
    return { palette: HORROR_PALETTES[seed % HORROR_PALETTES.length], props, motif, style: s.style };
  }
  function vecinoGancho(s) {
    if (s.live) { const L = s[vecinoLang()] || s.es || s.en || {}; return L.gancho || s.id; }
    return T('g.vecino.gancho.' + s.id);
  }
  // banco COMPARTIDO: prefiere el vivo de la IA para el edificio; si no hay red, el estático (robusto). Sin repetir.
  function pickVecinoStory(n, edif) {
    n.told = n.told || [];
    const live = liveStoriesFor(edif).map(s => ({ ...s, live: true }));
    const all = live.length ? live : VECINO_STORIES, key = s => (s.live ? 'live:' : '') + s.id;
    let pool = all.filter(s => !n.told.includes(key(s)));
    if (!pool.length) { n.told = []; pool = all.slice(); }
    const s = pool[(Math.random() * pool.length) | 0];
    n.told.push(key(s));
    return s;
  }
  function vecinoTale(s, edif) {
    if (s.live) { const L = s[vecinoLang()] || s.es || s.en || {}; return (L.tale || '').replace(/\{edif\}/g, T('g.vecino.edif.' + edif)); }
    return T('g.vecino.tale.' + s.id, { edif: T('g.vecino.edif.' + edif) });
  }
  // historia → TEMA ad-hoc para generateLevel (paleta/props/style del relato; nombre = el gancho)
  function themeFromStory(s, edif) {
    const gancho = vecinoGancho(s), intro = vecinoTale(s, edif);
    const vis = (s.palette && s.props) ? s : motifVisuals(s);   // historia VIVA → look PROPIO (paleta+props determinísticos por relato)
    return {
      id: 'historia-' + s.id, motif: s.motif || vis.motif,
      name: { es: gancho, en: gancho }, intro: { es: intro, en: intro },
      palette: s.palette || vis.palette, props: s.props || vis.props,
      npc: { emoji: s.motif || vis.motif, lines: VECINO_GHOST_LINES },
      goal: { es: T('g.vecino.exit'), en: T('g.vecino.exit') }, reward: { caramelos: 5 },
      style: s.style || vis.style, decor: ['cartel', 'caja', 'barril', 'tacho', 'escombros', 'mueble_roto'],
    };
  }
  let vecinoNpc = null, vecinoEdif = null;
  // El NPC del vecino se reconstruye en cada carga de nivel; el chusmerío (told/storyCount/activeStory) vive en
  // vecinoState[edif] (PERSISTENTE). hydrate = seedear el NPC desde el estado guardado; persist = volcarlo tras mutar.
  function hydrateVecino(n, edif) {
    if (n.__vhyd) return; n.__vhyd = true;
    const st = vecinoState[edif];
    if (st) { n.told = Array.isArray(st.told) ? st.told.slice() : []; n.storyCount = st.storyCount | 0; n.activeStory = st.active || null; }
  }
  function persistVecino(n, edif) {
    vecinoState[edif] = { told: Array.isArray(n.told) ? n.told.slice() : [], storyCount: n.storyCount | 0, active: n.activeStory || null };
  }
  function handleVecino(n) {
    Sfx.pickup();
    const edif = (n.vecino && n.vecino.edificio) || 'edu';
    if (!stormed) { setMsg(TX(n.dialog) || T('g.vecino.preStorm'), '#9fb4c4', 4500); return; }   // pre-tormenta: ambiental
    hydrateVecino(n, edif);
    n.storyCount = (n.storyCount || 0) + 1;
    const s = pickVecinoStory(n, edif); n.activeStory = s;
    persistVecino(n, edif);
    // sin la máquina de niveles → igual chusmea (aditivo, nunca rompe la calle)
    if (typeof NivelAI === 'undefined' || !NivelAI.generateLevel || typeof Mundo === 'undefined') { setMsg(vecinoTale(s, edif), '#c8b0d8', 8000); return; }
    // 1ª historia (y nunca entraste): teaser por mensaje; de la 2ª en más (o si ya entraste) → abre la oferta
    if (n.storyCount < 2 && !entradoEdif[edif]) { setMsg(T('g.vecino.teaser', { tale: vecinoTale(s, edif) }), '#c8b0d8', 8000); return; }
    openVecino(n, edif);
  }
  function openVecino(n, edif) {
    const ov = document.getElementById('vecinomenu'), body = document.getElementById('vecinoBody');
    vecinoNpc = n; vecinoEdif = edif;
    if (!ov || !body) { passToBuilding(n, edif); return; }   // headless / sin overlay → pasás directo (no te traba)
    const s = n.activeStory;
    let html = '<div class="end-stats-title">' + T('g.vecino.menuTitle', { edif: T('g.vecino.edif.' + edif) }) + '</div>';
    html += '<div style="margin:.4em 0 .8em;opacity:.92;line-height:1.45">' + vecinoTale(s, edif) + '</div>';
    html += '<div style="display:flex;flex-direction:column;gap:.4em">';
    html += '<button class="vecino-opt" data-k="pasa" style="text-align:left;padding:.6em .9em;font:inherit;cursor:pointer">' + T('g.vecino.optPass', { gancho: vecinoGancho(s) }) + '</button>';
    html += '<button class="vecino-opt" data-k="otra" style="text-align:left;padding:.6em .9em;font:inherit;cursor:pointer">' + T('g.vecino.optMore') + '</button>';
    html += '</div>';
    body.innerHTML = html;
    const btns = body.querySelectorAll ? body.querySelectorAll('.vecino-opt') : null;
    if (btns && btns.forEach) btns.forEach(b => b.addEventListener('click', () => pickVecino(b.getAttribute('data-k'))));
    ov.classList.remove('hidden');
  }
  function closeVecino() { const ov = document.getElementById('vecinomenu'); if (ov) ov.classList.add('hidden'); }
  function pickVecino(k) {
    if (k === 'pasa') { closeVecino(); passToBuilding(vecinoNpc, vecinoEdif); return; }
    const s = pickVecinoStory(vecinoNpc, vecinoEdif); vecinoNpc.activeStory = s; vecinoNpc.storyCount = (vecinoNpc.storyCount || 0) + 1;   // otra historia → swap y reabrir
    persistVecino(vecinoNpc, vecinoEdif);
    Sfx.pickup(); openVecino(vecinoNpc, vecinoEdif);
  }
  // aceptar pasar → genera el nivel desde la última historia (IA opcional, fallback estático) → al ganar, interior real
  function passToBuilding(n, edif) {
    hydrateVecino(n, edif);
    const s = n.activeStory || pickVecinoStory(n, edif);
    n.activeStory = s; persistVecino(n, edif);
    const interior = (n.vecino && n.vecino.interior);
    entradoEdif[edif] = true;
    applyEdge('vecino');   // grafo/Mensajero: "entraste a un edificio clausurado" (vecinoSeen es derivado de entradoEdif)
    // CACHE-FIRST (como las tiendas): entrás AL TOQUE con el tema (IA-cacheado si ya pasaste, si no el estático) → sin
    // los segundos de espera. Si NO había cache, la IA enriquece EN BACKGROUND y la PRÓXIMA vez que pasás entra rico.
    const ckey = edif + ':' + s.id, cached = histThemeCache[ckey];
    const theme = cached || themeFromStory(s, edif);
    flash(); tel('vecino', { edif, story: s.id, ai: !!cached });
    if (!loadGenLevel(NivelAI.generateLevel(theme), interior)) { setMsg(T('g.nivelai.fail'), '#ff5252', 4000); return; }
    if (!cached && NivelAI.requestHistoria) {   // enriquecé para la próxima (no bloquea la entrada de ahora)
      NivelAI.requestHistoria(edif, vecinoGancho(s), aiTheme => { if (aiTheme) histThemeCache[ckey] = aiTheme; });
    }
  }
  function redeemChori() {
    if (hasVale) {
      hasVale = false; player.hp = Math.min(MAXHP, player.hp + 40);
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
    evlog('sala', (rooms[d.to] || {}).name || d.to);
    if (typeof d.to === 'number') { visitedRooms.add(d.to); saveVisited(); }   // fog of war del mapa
    if (d.to == null || !rooms[d.to]) { setMsg(T('g.trans.locked'), '#ffd54f', 3000); return; }   // puerta sin destino → NO romper (defensa)
    current = d.to;
    player.x = d.at.x - player.w/2; player.y = d.at.y - player.h;
    player.vx = 0; player.vy = 0;
    transCd = 0.35;
    updateCam();
    const r = room();
    elFloor.textContent = TX(r.name);
    cartelBoard = null; cartelPollT = 0; cartelMsg = null;   // CARTELES C1: el tablón se recarga por piso (no arrastrar el anterior)
    syncBodegon(r);   // MULTIJUGADOR F2b: entrar/salir del bodegón conecta/desconecta el real-time (SSE)
    if (hasTag(r, 'bodegon') && enterBodegon()) return;   // T2: el bodegón se ve TOP-DOWN (sub-modo); si no hay sub-modo, sigue side-scroller
    if (hasTag(r, 'truco')) tahurDiscovered = true;   // entraste a la trastienda → descubriste al tahúr (gate del cuevero)
    companions.forEach(placeCompanionInRoom); syncCompanions();   // los compañeros cruzan la puerta CON vos (follow cross-room)
    // ruta A: si el LINYERA te está escoltando y llegaste a la sala de Guido → te avisa "ahí está, hablale" y listo
    if (companions.some(c => c.id === 'linyera') && (r.npcs || []).some(n => n.action === 'guido')) { setMsg(T('g.guido.escortArrived'), '#7CFC00', 7000); escortNudgeT = performance.now() + 12000; }
    else if (activeEscort()) escortNudge();   // en cualquier otra sala, el escort te VUELVE a guiar (a dónde ir desde acá)
    if (typeof Mensajero !== 'undefined' && Mensajero.callar) Mensajero.callar();   // corta TTS al cambiar de sala
    if (!isCine(r)) {   // saliste del cine → función vieja, regateo y quest del Mundial vuelven como estaban
      if (mundialApproach) mundialApproach.npc.x = mundialApproach.homeX;   // el hincha vuelve a su lugar
      cineArchive = null; guardaAsk = {}; mundialQuest = null; mundialApproach = null;
    }
    if (isCine(r)) cineNoticias = pickNoticias(r);   // CINE: varias noticias del piso (Deportes/Mundo/Tecno…); se leen en pantalla, [R] las lee en voz alta
    // música por sala: metal (Cemento) · telo/dance (secret) · CUMBIA VILLERA random-por-piso en el edificio abandonado
    // (borrachines) y la cueva/galería (rock/concrete) · si no, la música normal. En niveles-AI (spinoff) no metemos villera.
    if (!spinoffLevel && (hasTag(r, 'edificio') || r.theme === 'rock' || r.theme === 'concrete') && Sfx.setVillera) Sfx.setVillera(current);
    else Sfx.setRoomTrack(r.theme === 'cemento' ? 'metal' : r.theme === 'secret' ? (hasTag(r,'truco') ? 'telo' : 'dance') : null);
    Sfx.setAmbient(ambientFor(r));   // cama de ambiente por zona (capa aparte de la música)
    if (spinoffLevel) setMsg(T('g.nivelai.room', { name: TX(r.name) }), '#e0b0ff', 2500);   // cruzando salas del nivel generado
    else if (current === 0 && stormed) { flash(); setMsg(T('g.trans.streetStorm'), '#ff5252', 6500); }
    else if (isCine(r)) setMsg(T('g.trans.cine'), '#9fd3ff', 5000);   // CINE de noticias (antes que arcade)
    else if (current === 0) setMsg(T('g.trans.street'), '#4FC3F7', 2500);
    else if (r.theme === 'cambio') { flash(); setMsg(stormed ? T('g.trans.cambioStorm') : T('g.trans.cambioFull'), stormed ? '#ff5252' : '#ffd54f', 6000); }
    else if (r.theme === 'cemento') setMsg(T('g.trans.cemento'), '#ff5252', 5500);
    else if (r.theme === 'lujo') setMsg(T('g.trans.lujo'), '#ffd54f', 5000);
    else if (r.theme === 'ruina') setMsg(T('g.trans.ruina'), '#b0a0a0', 5000);
    else if (r.theme === 'office') setMsg(hasTag(r,'garbarino') ? T('g.trans.garbarino') : T('g.trans.edu'), '#80cbc4', 4000);
    else if (r.theme === 'arcade') setMsg(stormed ? T('g.trans.arcadeStorm') : T('g.trans.arcade'), stormed ? '#ff5252' : '#ff2e88', 4000);
    else if (hasTag(r, 'bodegon')) setMsg(T(Salon.inBodegon && Salon.inBodegon() ? 'g.bodegon.live' : 'g.bodegon.solo'), '#ffcf6e', 5000);
    else if (r.theme === 'shop') setMsg(T('g.trans.shop'), '#ffd54f', 3500);
    else if (/[Bb][úu]nker/.test(r.name)) setMsg(T('g.trans.bunker'), '#7CFC00', 7000);
    else if (r.theme === 'secret') setMsg(hasTag(r,'truco') ? T('g.trans.trucoStore') : T('g.trans.secretStore'), '#d8c8b0', 5500);
    else if (r.cueveros && r.cueveros.length) setMsg(T('g.trans.cueveros'), '#7CFC00', 5500);
    else setMsg(T('g.trans.deeper'), '#9fb4c4', 3000);
  }
  // zona → cama de ambiente (calle/viento/cueva/recital); null = sin ambiente
  // CINE multi-piso: cada piso muestra noticias de SU categoría (topics). El linyera te manda al piso del topic.
  // topics por PISO del cine, keyeado por TAG de sala (data). El piso declara su tag (cine,deportes…); esto mapea.
  const CINE_FLOOR_TOPICS = {
    deportes: ['mundial', 'mundial-tabla', 'mundial-goleadores', 'primera-b', 'bochas'],
    mundo: ['mundo', 'guerra', 'argentina', 'paises-bajos', 'arabe'],
    tecno: ['videojuegos', 'ia'], finanzas: ['finanzas', 'crypto'], colombofilia: ['colombofila'],
    consolas: ['consolas-retro'], openrouter: ['openrouter'],
  };
  function cineTopicsFor(r) {
    for (const t of (r && r.tags) || []) if (CINE_FLOOR_TOPICS[t]) return CINE_FLOOR_TOPICS[t];   // por TAG (data)
    const name = (r && r.name) || (typeof r === 'string' ? r : '');   // fallback al nombre (back-compat)
    for (const k in CINE_FLOOR_TOPICS) if (new RegExp(k, 'i').test(name)) return CINE_FLOOR_TOPICS[k];
    return null;   // sin filtro
  }
  // todas las noticias del piso, deduplicadas por topic, máx 6. Si el guarda te vendió una función vieja
  // (cineArchive), salen de ese día; si no, del día de hoy (window.NOTICIAS).
  function pickNoticias(r) {
    const ns = (cineArchive && cineArchive.noticias) || (typeof window !== 'undefined' && window.NOTICIAS) || [];
    const t = cineTopicsFor(r);
    // piso CON tópico → SOLO sus topics, AUNQUE el banco esté flaco (si no hay, devuelve [] → "sin novedades de ese tópico").
    // ANTES caía a `ns` (todas) cuando el pool estaba vacío → los pisos sin su tópico mostraban TODOS lo mismo (Mundial repetido
    // en mundo/tecno/consolas/…). Cada piso respeta su categoría: nunca muestra la de otro piso. Piso SIN tópico → cualquiera.
    const pool = t ? ns.filter(n => t.includes(n.topic)) : ns;
    const seen = new Set(), out = [];
    for (const n of pool) { if (seen.has(n.topic)) continue; seen.add(n.topic); out.push(n); if (out.length >= 6) break; }
    return out;
  }
  function wrapLines(ctx, text, maxW, cap) {
    const words = String(text).split(/\s+/), lines = []; let line = '';
    for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
    if (line) lines.push(line); return lines.slice(0, cap || 8);
  }
  // CARTELES de propaganda del cine: un panel arriba del cartel con marca+slogan FALSO estilo BsAs, ROTANDO por rubro
  // (window.PROPAGANDA lo trae js/propaganda.js: banco vivo del proxy o estático). Cambia cada ~7s, distinto por cartel.
  function questMarker(x, y) {   // §9: ❗ que rebota sobre el NPC al que tenés que ir
    const b = Math.sin(time * 6) * 3;
    ctx.save(); ctx.textAlign = 'center'; ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#0c0f16'; ctx.fillText('❗', x + 1, y + b + 1);
    ctx.fillStyle = '#ffd54f'; ctx.fillText('❗', x, y + b);
    ctx.restore();
  }
  const _catCol = { comida: '#e8743b', ropa: '#d65ad6', electronica: '#3bb0e8', bizarro: '#7CFC00', tip: '#ffd54f', clima: '#7fd0ff', juego: '#ff5da2' };
  function drawCartelProp(d, img) {
    const list = (typeof window !== 'undefined' && window.PROPAGANDA) || [];
    if (!list.length) return;
    const cx = d.x - cam.x, topY = d.feetY - cam.y - img.height;
    const i = (Math.floor(time / 7) + (d.x | 0)) % list.length, p = list[(i % list.length + list.length) % list.length];
    if (!p) return;
    const W = 96, col = _catCol[p.cat] || '#ffd54f';   // angosto y ALTO (no pisa la pantalla central) → ocupa para arriba
    ctx.save();
    ctx.font = 'bold 10px monospace';
    const brand = wrapLines(ctx, p.brand, W - 10, 2);
    ctx.font = '9px monospace';
    const slog = wrapLines(ctx, '“' + p.slogan + '”', W - 10, 4);
    const H = 8 + brand.length * 12 + 3 + slog.length * 11 + 6;
    const x = cx - W / 2, y = topY - H - 8;
    ctx.fillStyle = '#0c0f16'; ctx.fillRect(x - 2, y - 2, W + 4, H + 4);
    ctx.fillStyle = '#161c28'; ctx.fillRect(x, y, W, H);
    ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, W, H);
    ctx.fillStyle = col; ctx.fillRect(cx - 1.5, y + H, 3, topY - (y + H));   // poste que baja al cartel
    ctx.textAlign = 'center';
    let yy = y + 13;
    ctx.font = 'bold 10px monospace'; ctx.fillStyle = col;
    for (const ln of brand) { ctx.fillText(ln, cx, yy); yy += 12; }
    yy += 2; ctx.font = '9px monospace'; ctx.fillStyle = '#cdd6e4';
    for (const ln of slog) { ctx.fillText(ln, cx, yy); yy += 11; }
    ctx.restore();
  }
  function drawCineScreen(r) {
    const ns = cineNoticias, pad = 16, W = 360;
    const cx = (r.w * Level.TILE) / 2 - cam.x, colW = W - pad * 2;
    ctx.save();
    // pre-medir: cuántas líneas ocupa cada noticia → alto DINÁMICO (que "entre todo")
    const perItem = ns.length <= 1 ? 7 : 3;
    ctx.font = '12px monospace';
    const items = ns.map(n => ({ topic: String(n.topic || '').toUpperCase(), lines: wrapLines(ctx, n.headline || '', colW, perItem) }));
    const bodyH = items.reduce((a, it) => a + 16 + it.lines.length * 15 + 8, 0);
    const H = Math.min(330, 34 + (ns.length ? bodyH : 30) + 14);
    const sy = 1.05 * Level.TILE - cam.y, left = cx - W / 2;
    ctx.fillStyle = '#06080d'; ctx.fillRect(left - 10, sy - 10, W + 20, H + 20);   // marco
    ctx.fillStyle = '#0d1626'; ctx.fillRect(left, sy, W, H);                        // pantalla
    ctx.strokeStyle = '#2f5a8f'; ctx.lineWidth = 2; ctx.strokeRect(left, sy, W, H);
    const cat = (String(r.name).split('—')[1] || '').trim();   // piso: Deportes / Mundo / Tecno…
    ctx.textAlign = 'center';
    ctx.fillStyle = cineArchive ? '#ffb74d' : '#b38bd6'; ctx.font = 'bold 12px monospace';
    ctx.fillText((cineArchive ? '📼 FUNCIÓN VIEJA ' + humanDay(cineArchive.day) + ' · ' : '🎬 CINE · ') + cat.toUpperCase(), cx, sy + 17);
    if (!ns.length) { ctx.fillStyle = '#5a6a7a'; ctx.font = '13px monospace'; ctx.fillText(T('g.cine.noTopic', { cat: (cat || '').toUpperCase() }), cx, sy + H / 2); ctx.restore(); return; }
    ctx.textAlign = 'left';
    const maxY = sy + H - 16;
    let y = sy + 34;
    for (const it of items) {
      if (y > maxY - 12) break;
      ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 12px monospace'; ctx.fillText('📰 ' + it.topic, left + pad, y); y += 16;
      ctx.fillStyle = '#eef4ff'; ctx.font = '12px monospace';
      for (const ln of it.lines) { if (y > maxY) break; ctx.fillText(ln, left + pad, y); y += 15; }
      y += 8;   // separación entre noticias
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = '#7fa6cf'; ctx.font = '11px monospace'; ctx.fillText(T('g.cine.read'), cx, sy + H - 6);
    ctx.restore();
  }
  // === MULTIJUGADOR F2b — BODEGÓN real-time (specs/multijugador.md §3.2) ===
  // Te conectás al entrar (Salon.join → SSE), ves a los OTROS jugadores moverse (interpolados) con su nick + emote +
  // frase preset. Capa aditiva: sin red/EventSource, el bodegón queda single-player (los mozos canned + el gag rubia).
  const BODEGON_EMOTES = ['', '🍻', '🤝', '💃', '🎸'];   // teclas 1-4 → emote sobre la cabeza
  let bodegonOn = false, myEmote = 0, myEmoteT = 0, mySay = -1, mySayT = 0;
  function syncBodegon(r) {
    const want = hasTag(r, 'bodegon');
    if (want && !bodegonOn) { bodegonOn = true; if (typeof Salon !== 'undefined' && Salon.enabled && Salon.join) Salon.join(playerNick(), 'carpo', () => {}); }
    else if (!want && bodegonOn) { bodegonOn = false; myEmote = 0; mySay = -1; if (typeof Salon !== 'undefined' && Salon.leave) Salon.leave(); }
  }
  function myTileX() { return Math.round(((player.x + player.w / 2) / TILE) * 10) / 10; }
  // NOMBRE DE USUARIO (specs/nombre-usuario.md): el jugador elige un nombre BASE + el juego le agrega SIEMPRE un sufijo
  // random de 3 chars (estable, persistido) → cada uno tiene su nick único en el multijugador (bodegón/carteles).
  function nickSuffix() {
    try { let s = localStorage.getItem('ts_nick_sfx'); if (!s || !/^[a-z0-9]{3}$/i.test(s)) { s = (Math.random().toString(36) + '000').slice(2, 5).toUpperCase(); localStorage.setItem('ts_nick_sfx', s); } return s; }
    catch (e) { const id = (typeof Salon !== 'undefined' && Salon.pid) ? Salon.pid : 'xxx'; return String(id).slice(-3).toUpperCase(); }
  }
  function nickBase() { try { return (localStorage.getItem('ts_nick') || '').trim() || 'Carpo'; } catch (e) { return 'Carpo'; } }
  function setNickBase(v) {
    let raw = String(v || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
    // CROSS-DEVICE (guardar-partida.md F3 / barrio-mem): el sufijo ·XYZ es PARTE de tu identidad. Si tipeás tu
    // nick COMPLETO ("Carpo·A3F", también vale "Carpo#A3F"), adoptamos ese sufijo en vez de sortear uno nuevo →
    // en el celu sos EL MISMO y el server te encuentra el checkpoint y la memoria. (Sin sufijo = como siempre.)
    const m = raw.match(/^(.+?)[·#]\s*([a-z0-9]{3})$/i);
    if (m && m[1].trim()) { raw = m[1].trim(); try { localStorage.setItem('ts_nick_sfx', m[2].toUpperCase()); } catch (e) {} }
    const clean = raw.slice(0, 12);
    try { localStorage.setItem('ts_nick', clean); } catch (e) {}
    return clean || 'Carpo';
  }
  function playerNick() { return nickBase() + '·' + nickSuffix(); }
  // el peer MÁS CERCANO (dentro de ~1.3 tiles) para abrir chat privado con E
  function nearestPeer() {
    if (!bodegonOn || typeof Salon === 'undefined' || !Salon.getPeers) return null;
    const peers = Salon.getPeers(); if (!peers || !peers.size) return null;
    const px = (player.x + player.w / 2) / TILE; let best = null, bd = 1.3;
    for (const p of peers.values()) { const d = Math.abs((p.rx != null ? p.rx : p.x) - px); if (d < bd) { bd = d; best = p; } }
    return best;
  }
  function bodegonEmote(i) {   // emote propio + se lo mando a los demás (en el próximo pos)
    if (!bodegonOn) return; myEmote = i; myEmoteT = performance.now();
    if (typeof Salon !== 'undefined' && Salon.pos) Salon.pos(myTileX(), player.vx, i); Sfx.pickup();
  }
  function bodegonPhrase(i) {   // frase PRESET (índice) → globo público para todos
    if (!bodegonOn) return; mySay = i; mySayT = performance.now();
    if (typeof Salon !== 'undefined' && Salon.say) Salon.say(i); Sfx.pickup();
  }
  // globo de diálogo cortito (peer o propio) sobre una cabeza, en coords de pantalla
  function drawHeadBubble(sx, topY, txt, col) {
    ctx.font = '9px monospace'; const w = Math.min(150, ctx.measureText(txt).width + 12);
    ctx.fillStyle = 'rgba(20,16,10,0.9)'; ctx.strokeStyle = col || '#ffcf6e'; ctx.lineWidth = 1;
    const bx = sx - w / 2, by = topY - 16;
    ctx.fillRect(bx, by, w, 14); ctx.strokeRect(bx, by, w, 14);
    ctx.fillStyle = col || '#ffe2a8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, sx, by + 7);
    ctx.textBaseline = 'alphabetic';
  }
  function drawBodegonPeers(r) {
    const peers = (typeof Salon !== 'undefined' && Salon.getPeers) ? Salon.getPeers() : null;
    const floorTop = r.gTop * TILE, f = Art.hero, now = Date.now();
    if (peers) for (const p of peers.values()) {
      if (p.rx == null) p.rx = p.x; p.rx += (p.x - p.rx) * 0.2;   // interpolación suave hacia la última pos recibida
      const feetX = p.rx * TILE, sx = feetX - cam.x, sy = floorTop - cam.y;
      const moving = Math.abs(p.vx || 0) > 12;
      const frame = moving ? f.run[Math.floor(performance.now() / 90) % f.run.length] : f.idle[0];
      ctx.save(); ctx.globalAlpha = 0.92;
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(sx, sy, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
      if ((p.vx || 0) < 0) { ctx.translate(sx, 0); ctx.scale(-1, 1); ctx.translate(-sx, 0); }
      ctx.drawImage(frame, sx - 16, sy - 44); ctx.restore();
      ctx.fillStyle = '#ffe2a8'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
      ctx.fillText(p.nick || T('g.bodegon.someone'), sx, sy - 48);
      if (p.emote && now - (p.emoteT || 0) < 2500) { ctx.font = '16px serif'; ctx.fillText(BODEGON_EMOTES[p.emote] || '', sx, sy - 58); }
      if (p.say != null && now - (p.sayT || 0) < 4000) drawHeadBubble(sx, sy - 58, T('g.bodegon.phrase.' + p.say), '#ffcf6e');
    }
    // MI propio emote/frase sobre el Carpo (feedback local)
    const psx = player.x + player.w / 2 - cam.x, psy = player.y - cam.y;
    if (myEmote && performance.now() - myEmoteT < 2500) { ctx.fillStyle = '#fff'; ctx.font = '16px serif'; ctx.textAlign = 'center'; ctx.fillText(BODEGON_EMOTES[myEmote] || '', psx, psy - 6); }
    if (mySay >= 0 && performance.now() - mySayT < 4000) drawHeadBubble(psx, psy - 6, T('g.bodegon.phrase.' + mySay), '#aef0c0');
  }
  // MULTIJUGADOR F1: la pantalla del piso "EN VIVO" muestra el MUNDO VIVO (cuántos juegan ahora, en qué zona, ticker
  // de hitos). Sin salon-server / sin red → "modo offline". Mismo marco que drawCineScreen.
  function drawSalonScreen(r) {
    const pad = 16, W = 360, cx = (r.w * Level.TILE) / 2 - cam.x, H = 300;
    const sy = 1.05 * Level.TILE - cam.y, left = cx - W / 2;
    ctx.save();
    ctx.fillStyle = '#06080d'; ctx.fillRect(left - 10, sy - 10, W + 20, H + 20);
    ctx.fillStyle = '#0d1626'; ctx.fillRect(left, sy, W, H);
    ctx.strokeStyle = '#7CFC00'; ctx.lineWidth = 2; ctx.strokeRect(left, sy, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#7CFC00'; ctx.font = 'bold 13px monospace'; ctx.fillText('📡 ' + T('g.salon.title'), cx, sy + 18);
    const d = salonLive;
    if (!d) { ctx.fillStyle = '#5a6a7a'; ctx.font = '13px monospace'; ctx.fillText(T('g.salon.offline'), cx, sy + H / 2); ctx.restore(); return; }
    ctx.fillStyle = '#eef4ff'; ctx.font = 'bold 22px monospace'; ctx.fillText(T('g.salon.count', { n: d.count || 0 }), cx, sy + 50);
    ctx.textAlign = 'left';
    let y = sy + 78;
    const zones = Object.entries(d.byRoom || {}).sort((a, b) => b[1] - a[1]).slice(0, 5);
    ctx.fillStyle = '#9fd3ff'; ctx.font = 'bold 11px monospace'; ctx.fillText(T('g.salon.where'), left + pad, y); y += 16;
    ctx.font = '12px monospace'; ctx.fillStyle = '#cfe0f0';
    const tr = (k, fb) => { const s = T(k); return (s && s !== k) ? s : fb; };   // T() devuelve la clave si falta → fallback
    for (const [z, n] of zones) { ctx.fillText('· ' + n + '  ' + tr('g.salon.zone.' + z, z), left + pad, y); y += 15; }
    if (!zones.length) { ctx.fillStyle = '#5a6a7a'; ctx.fillText(T('g.salon.alone'), left + pad, y); y += 15; }
    y += 8;
    const tick = (d.ticker || []).slice(-5).reverse();
    if (tick.length) {
      ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 11px monospace'; ctx.fillText(T('g.salon.ticker'), left + pad, y); y += 16;
      ctx.font = '11px monospace'; ctx.fillStyle = '#e0e8f0';
      for (const t of tick) { if (y > sy + H - 14) break; ctx.fillText('› ' + tr('g.salon.ev.' + t.ev, T('g.salon.ev.x')), left + pad, y); y += 14; }
    }
    ctx.restore();
  }
  // ===== CARTELES COLABORATIVOS C1 (specs/construccion-colaborativa.md) — el TABLÓN compartido. La computadora (NPC
  // action:'compu') abre un overlay para FIJAR un cartel; el render dibuja los carteles del piso como rects empaquetados
  // con el nick; al pasar por abajo, [E] lo LEE (y si no es tuyo, lo CONSUME → desaparece). Capa aditiva: sin red, "offline".
  const CARTEL_COLS = 8, CARTEL_ROWS = 3;   // grilla de empaquetado (cap 24 = COLS×ROWS); el server asigna el slot
  function cartelFloorOf(r) { return hasTag(r, 'carteles-a') ? 'carteles-1' : hasTag(r, 'carteles-b') ? 'carteles-2' : null; }
  // celda (en coords de MUNDO) de un slot: la pared del fondo, arriba del piso. Devuelve {x0,x1,y0,y1,cx,cy}.
  function cartelCell(r, slot) {
    const left = 2.4 * TILE, right = (r.w - 2.4) * TILE, span = right - left;
    const cw = span / CARTEL_COLS, ch = 30, gap = 6;
    const col = slot % CARTEL_COLS, row = (slot / CARTEL_COLS | 0) % CARTEL_ROWS;
    const top = r.gTop * TILE - 188;
    const x0 = left + col * cw + 3, x1 = left + (col + 1) * cw - 3, y0 = top + row * (ch + gap), y1 = y0 + ch;
    return { x0, x1, y0, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  }
  function cartelPoll(r) {
    if (typeof Carteles === 'undefined' || !Carteles.enabled) return;
    const now = performance.now(); if (now < cartelPollT) return; cartelPollT = now + 5000;
    const floor = cartelFloorOf(r); if (!floor) return;
    Carteles.list(floor, d => { if (d && Array.isArray(d.signs)) cartelBoard = { floor, ...d }; });
  }
  function drawCarteles(r) {
    const floor = cartelFloorOf(r); if (!floor) return;
    const offline = (typeof Carteles === 'undefined' || !Carteles.enabled);
    const near = offline ? null : cartelSignNear(r);
    // marco/título del tablón
    const tx = (r.w * TILE) / 2 - cam.x, ty = r.gTop * TILE - 210 - cam.y;
    ctx.fillStyle = '#caa46a'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
    ctx.fillText('📋 ' + T('g.cartel.boardTitle'), tx, ty);
    if (offline || !cartelBoard || cartelBoard.floor !== floor) {
      ctx.fillStyle = '#5a6a7a'; ctx.font = '11px monospace';
      ctx.fillText(T(offline ? 'g.cartel.offline' : 'g.cartel.loading'), tx, ty + 18);
      return;
    }
    for (const s of cartelBoard.signs || []) {
      const c = cartelCell(r, s.slot), sx0 = c.x0 - cam.x, sy0 = c.y0 - cam.y, w = c.x1 - c.x0, h = c.y1 - c.y0;
      const isNear = near && near.id === s.id;
      ctx.fillStyle = s.ai ? '#1d2336' : '#2a2118';
      ctx.fillRect(sx0, sy0, w, h);
      ctx.strokeStyle = isNear ? '#ffd54f' : (s.ai ? '#5566aa' : '#7a5a32'); ctx.lineWidth = isNear ? 2.5 : 1.5;
      ctx.strokeRect(sx0, sy0, w, h);
      // chincheta + nick (el TEXTO no se ve hasta leer)
      ctx.fillStyle = '#d33'; ctx.beginPath(); ctx.arc(sx0 + w / 2, sy0 + 4, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = isNear ? '#fff' : '#cdbb99'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
      ctx.fillText((s.ai ? '🤖 ' : '') + (s.nick || '—').slice(0, 12), sx0 + w / 2, sy0 + 18);
    }
    if (near) {   // estás abajo de un cartel: prompt para leer
      const c = cartelCell(r, near.slot);
      ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
      ctx.fillText(T(near.author === Carteles.pid ? 'g.cartel.readMine' : 'g.cartel.readPrompt'), c.cx - cam.x, c.y1 - cam.y + 13);
    }
    // contador del piso
    ctx.fillStyle = '#8a96a4'; ctx.font = '10px monospace'; ctx.textAlign = 'center';
    ctx.fillText(T('g.cartel.count', { used: cartelBoard.used | 0, cap: cartelBoard.cap | 0 }), tx, r.gTop * TILE - 196 - cam.y);
    // cartel recién LEÍDO (overlay grande, unos segundos)
    if (cartelMsg && performance.now() < cartelMsgT) drawCartelRead();
  }
  // el cartel más cercano al jugador dentro del alcance de lectura (para resaltar + [E])
  function cartelSignNear(r) {
    if (!cartelBoard || !cartelBoard.signs) return null;
    const pcx = player.x + player.w / 2, pcy = player.y;
    let best = null, bd = 1e9;
    for (const s of cartelBoard.signs) {
      const c = cartelCell(r, s.slot);
      if (pcx < c.x0 - 14 || pcx > c.x1 + 14) continue;   // tenés que estar DEBAJO de la columna del cartel
      const d = Math.abs(pcy - c.cy);
      if (d < bd && d < 150) { bd = d; best = s; }
    }
    return best;
  }
  function tryReadCartel() {
    if (typeof Carteles === 'undefined' || !Carteles.enabled) return false;
    const r = room(); if (!cartelFloorOf(r)) return false;
    const s = cartelSignNear(r); if (!s) return false;
    Carteles.read(s.id, d => {
      if (!d) { cartelBoard = null; cartelPollT = 0; return; }   // ya no estaba → re-poll
      cartelMsg = { nick: d.nick, text: d.text, ai: d.ai, mine: d.mine }; cartelMsgT = performance.now() + 7000;
      Sfx.pickup && Sfx.pickup();
      if (d.consumed && cartelBoard) cartelBoard.signs = (cartelBoard.signs || []).filter(x => x.id !== s.id);   // se borró → sacalo del tablón local ya
      cartelPollT = 0;
    });
    return true;
  }
  function drawCartelRead() {
    const m = cartelMsg; if (!m) return;
    const W2 = 380, H2 = 130, x = (W - W2) / 2, y = (H - H2) / 2 - 20;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.86)'; ctx.fillRect(x - 8, y - 8, W2 + 16, H2 + 16);
    ctx.fillStyle = m.ai ? '#1d2336' : '#2a2118'; ctx.fillRect(x, y, W2, H2);
    ctx.strokeStyle = '#ffd54f'; ctx.lineWidth = 2; ctx.strokeRect(x, y, W2, H2);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 12px monospace';
    ctx.fillText('📋 ' + (m.ai ? '🤖 ' : '') + (m.nick || '—') + (m.mine ? ' ' + T('g.cartel.yours') : ''), x + W2 / 2, y + 22);
    ctx.fillStyle = '#f0e8d8'; ctx.font = '14px monospace';
    const words = String(m.text || '').split(' '), lines = []; let cur = '';
    for (const w of words) { const cand = cur ? cur + ' ' + w : w; if ((ctx.measureText(cand).width || 0) > W2 - 36 && cur) { lines.push(cur); cur = w; } else cur = cand; }
    if (cur) lines.push(cur);
    lines.slice(0, 4).forEach((ln, i) => ctx.fillText(ln, x + W2 / 2, y + 50 + i * 20));
    ctx.fillStyle = m.mine ? '#9fd3ff' : '#9be8a0'; ctx.font = '10px monospace';
    ctx.fillText(T(m.mine ? 'g.cartel.readMineNote' : 'g.cartel.consumedNote'), x + W2 / 2, y + H2 - 12);
    ctx.restore();
  }
  // overlay de la COMPUTADORA: fijar un cartel + ver los míos
  function openCarteles() {
    const ov = document.getElementById('cartelmenu'); if (!ov) return;
    state = 'compu'; elPrompt.classList.add('hidden');
    refreshCartelMenu();
    ov.classList.remove('hidden');
    setTimeout(() => { const inp = document.getElementById('cartelText'); if (inp) inp.focus(); }, 30);
  }
  function closeCarteles() { const ov = document.getElementById('cartelmenu'); if (ov) ov.classList.add('hidden'); if (state === 'compu') state = 'playing'; }
  function refreshCartelMenu(note) {
    const body = document.getElementById('cartelBody'); if (!body) return;
    const floor = cartelFloorOf(room()) || 'carteles-1';
    const offline = (typeof Carteles === 'undefined' || !Carteles.enabled);
    const max = (typeof Carteles !== 'undefined' && Carteles.maxLen) || 80;
    let html = '<div class="end-stats-title">' + T('g.cartel.menuTitle') + '</div>';
    html += '<div style="text-align:center;margin:.2em 0 .7em;opacity:.85;font-size:.9em">' + T('g.cartel.menuSub') + '</div>';
    if (offline) {
      html += '<div style="text-align:center;color:#ff9e9e;padding:.6em">' + T('g.cartel.offline') + '</div>';
    } else {
      html += '<textarea id="cartelText" maxlength="' + max + '" rows="2" placeholder="' + T('g.cartel.placeholder') + '" style="width:100%;box-sizing:border-box;font:inherit;padding:.5em;background:#10202e;color:#cde8ff;border:1.5px solid #4FC3F7;resize:none"></textarea>';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;margin:.4em 0 .7em"><small id="cartelCount" style="opacity:.7">0/' + max + '</small><button id="cartelPin" style="font:inherit;padding:.45em 1.1em;cursor:pointer;background:#163a16;color:#9be8a0;border:1.5px solid #3cdc5a">📌 ' + T('g.cartel.pin') + '</button></div>';
    }
    if (note) html += '<div style="text-align:center;margin:.2em 0 .6em;color:' + (note.ok ? '#9be8a0' : '#ff9e9e') + '">' + note.text + '</div>';
    html += '<div id="cartelMine" style="margin-top:.5em"><div style="opacity:.7;font-size:.85em">' + T('g.cartel.mineLoading') + '</div></div>';
    body.innerHTML = html;
    const ta = document.getElementById('cartelText'), cnt = document.getElementById('cartelCount'), pin = document.getElementById('cartelPin');
    if (ta && cnt) ta.addEventListener('input', () => { cnt.textContent = ta.value.length + '/' + max; });
    if (pin) pin.addEventListener('click', () => submitCartel(floor));
    if (!offline) Carteles.mine(d => {
      const el = document.getElementById('cartelMine'); if (!el) return;
      const signs = (d && d.signs) || [];
      let h = '<div style="opacity:.8;font-size:.85em;margin-bottom:.3em">' + T('g.cartel.mineTitle', { n: signs.length }) + '</div>';
      if (!signs.length) h += '<div style="opacity:.5;font-size:.85em">' + T('g.cartel.mineEmpty') + '</div>';
      for (const s of signs) h += '<div style="font-size:.85em;padding:.25em .4em;border-left:2px solid #7a5a32;margin-bottom:.25em;opacity:.9">“' + escapeHtml(s.text) + '” <small style="opacity:.6">· ' + (s.floor === floor ? T('g.cartel.here') : s.floor) + '</small></div>';
      el.innerHTML = h;
    });
  }
  function submitCartel(floor) {
    const ta = document.getElementById('cartelText'); if (!ta) return;
    const text = (ta.value || '').trim();
    if (!text) { refreshCartelMenu({ ok: false, text: T('g.cartel.empty') }); return; }
    const pin = document.getElementById('cartelPin'); if (pin) pin.disabled = true;
    Carteles.post(floor, playerNick(), text, res => {
      if (res && res.ok) {
        refreshCartelMenu({ ok: true, text: T('g.cartel.pinned') }); cartelPollT = 0;
        if (typeof Mensajero !== 'undefined' && Mensajero.evento) Mensajero.evento('cartel_pin');
      } else {
        const err = (res && res.error) || 'net';
        refreshCartelMenu({ ok: false, text: T('g.cartel.err.' + (['full', 'rate', 'empty'].includes(err) ? err : 'net')) });
      }
    });
  }
  function escapeHtml(s) { return String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  // ===== DATACENTER COLABORATIVO GLOBAL D1 (specs/construccion-colaborativa.md) — todos aportan PARTES (plata/caramelos)
  // a un datacenter ÚNICO (estado server). El render dibuja una MAQUETA de racks que crece con el progreso global; la
  // computadora (NPC action:'datacenter') abre el catálogo de partes. Capa aditiva: sin red, "offline" (ves la maqueta cacheada).
  function dcPoll(r) {
    if (typeof Datacenter === 'undefined' || !Datacenter.enabled) return;
    const now = performance.now(); if (now < dcPollT) return; dcPollT = now + 5000;
    Datacenter.get(d => { if (d && d.parts) { dcState = d; dcMaybeEndgame(d); } });
  }
  // D2 — ENDGAME: cuando el datacenter llega al 100% (evento GLOBAL), la comunidad voltea a la IA del satélite → cinemática
  // (pago de g.win.text). Se ve UNA vez por jugador y por temporada (localStorage). El estado global lo da el server (done).
  function dcSeenKey(s) { return 'ts_dc_seen_s' + (s || 1); }
  function dcMaybeEndgame(d) {
    if (!d || !d.done) return;
    let seen = false; try { seen = localStorage.getItem(dcSeenKey(d.season)) === '1'; } catch (e) {}
    if (seen) return;
    try { localStorage.setItem(dcSeenKey(d.season), '1'); } catch (e) {}
    dcCinemaT = performance.now() + 14000; Sfx.win && Sfx.win();
    if (typeof Mensajero !== 'undefined' && Mensajero.evento) Mensajero.evento('dc_done');
  }
  function drawDatacenter(r) {
    const offline = (typeof Datacenter === 'undefined' || !Datacenter.enabled);
    const cx = (r.w * TILE) / 2 - cam.x, top = r.gTop * TILE - cam.y;
    // título + barra global
    ctx.fillStyle = '#7fd4ff'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
    ctx.fillText('🖥️ ' + T('g.dc.title'), cx, top - 196);
    if (offline || !dcState) {
      ctx.fillStyle = '#5a6a7a'; ctx.font = '11px monospace';
      ctx.fillText(T(offline ? 'g.dc.offline' : 'g.dc.loading'), cx, top - 176);
      drawDcRacks(r, 0); return;
    }
    const prog = Math.max(0, Math.min(1, dcState.progress || 0));
    // barra
    const bw = 320, bx = cx - bw / 2, by = top - 184, bh = 16;
    ctx.fillStyle = '#0a1420'; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = dcState.done ? '#7CFC00' : '#2e90ff'; ctx.fillRect(bx, by, bw * prog, bh);
    ctx.strokeStyle = '#3a5366'; ctx.lineWidth = 1.5; ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = '#eaf4ff'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
    ctx.fillText(Math.floor(prog * 100) + '%' + (dcState.done ? ' ✓' : ''), cx, by + 12);
    ctx.fillStyle = '#8aa0b4'; ctx.font = '10px monospace';
    ctx.fillText(T('g.dc.builtBy', { n: dcState.contributors || 0 }) + '  ·  ' + T('g.dc.season', { s: dcState.season || 1 }), cx, by + 30);
    drawDcRacks(r, prog);
    if (dcCinemaT > performance.now()) drawDcCinema();   // D2: cinemática del endgame (100%)
  }
  // D2 — la cinemática del endgame: pantalla completa, la comunidad volteó a la IA del satélite (pago de g.win.text).
  function drawDcCinema() {
    ctx.save();
    ctx.fillStyle = 'rgba(2,6,14,0.92)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#7CFC00'; ctx.font = 'bold 22px monospace';
    ctx.fillText('🛰️💥 ' + T('g.dc.endTitle'), W / 2, 70);
    ctx.fillStyle = '#eaf4ff'; ctx.font = '14px monospace';
    const words = T('g.dc.endText').split(' '), lines = []; let cur = '';
    for (const w of words) { const cand = cur ? cur + ' ' + w : w; if ((ctx.measureText(cand).width || 0) > W - 120 && cur) { lines.push(cur); cur = w; } else cur = cand; }
    if (cur) lines.push(cur);
    lines.forEach((ln, i) => ctx.fillText(ln, W / 2, 110 + i * 22));
    ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 12px monospace';
    ctx.fillText(T('g.dc.endSeason'), W / 2, H - 54);
    ctx.fillStyle = '#9be8a0'; ctx.font = 'bold 12px monospace';
    ctx.fillText(T('g.dc.contPrompt'), W / 2, H - 30);
    ctx.restore();
  }
  // la MAQUETA: una fila de racks que se van "encendiendo" (llenando de luces) según el progreso global.
  function drawDcRacks(r, prog) {
    const N = 10, top = r.gTop * TILE - cam.y, baseY = top - 30, rackW = 26, gap = 8;
    const totalW = N * rackW + (N - 1) * gap, x0 = (r.w * TILE) / 2 - cam.x - totalW / 2;
    const lit = Math.round(prog * N);
    for (let i = 0; i < N; i++) {
      const x = x0 + i * (rackW + gap), on = i < lit, h = 64;
      ctx.fillStyle = on ? '#16324a' : '#10171f'; ctx.fillRect(x, baseY - h, rackW, h);
      ctx.strokeStyle = on ? '#2e90ff' : '#26323e'; ctx.lineWidth = 1.5; ctx.strokeRect(x, baseY - h, rackW, h);
      for (let u = 0; u < 6; u++) {   // "servidores" (lucecitas) — verdes si el rack está encendido
        const uy = baseY - h + 6 + u * 9;
        ctx.fillStyle = on ? (((i + u + (performance.now() / 400 | 0)) % 4) ? '#3cdc5a' : '#1d7a33') : '#1b242e';
        ctx.fillRect(x + 4, uy, rackW - 8, 4);
      }
    }
  }
  function openDatacenter() {
    const ov = document.getElementById('dcmenu'); if (!ov) return;
    state = 'compu'; elPrompt.classList.add('hidden');   // reusa el estado 'compu' (bloquea movimiento mientras el overlay está abierto)
    refreshDcMenu();
    ov.classList.remove('hidden');
  }
  function closeDatacenter() { const ov = document.getElementById('dcmenu'); if (ov) ov.classList.add('hidden'); if (state === 'compu') state = 'playing'; }
  function refreshDcMenu(note) {
    const body = document.getElementById('dcBody'); if (!body) return;
    const offline = (typeof Datacenter === 'undefined' || !Datacenter.enabled);
    const parts = (typeof Datacenter !== 'undefined' && Datacenter.PARTS) || [];
    let html = '<div class="end-stats-title">' + T('g.dc.menuTitle') + '</div>';
    html += '<div style="text-align:center;margin:.2em 0 .6em;opacity:.85;font-size:.9em">' + T('g.dc.menuSub') + '</div>';
    const prog = dcState ? Math.floor((dcState.progress || 0) * 100) : 0;
    html += '<div style="text-align:center;margin:.2em 0 .7em;color:#7fd4ff">' + T('g.dc.progress', { p: prog, n: dcState ? (dcState.contributors || 0) : 0 }) + '</div>';
    if (offline) { html += '<div style="text-align:center;color:#ff9e9e;padding:.6em">' + T('g.dc.offline') + '</div>'; }
    else {
      html += '<div style="display:flex;flex-direction:column;gap:.35em">';
      for (const p of parts) {
        const have = p.pay === 'coins' ? (player.coins || 0) : (player.caramelos || 0);
        const cur = dcState && dcState.parts ? (dcState.parts[p.id] || 0) : 0, cap = dcState && dcState.caps ? (dcState.caps[p.id] || 0) : 0;
        const full = cap && cur >= cap, can = have >= p.cost && !full;
        const payIco = p.pay === 'coins' ? '🪙' : '🍬';
        html += '<button class="dc-buy" data-id="' + p.id + '"' + (can ? '' : ' disabled') + ' style="display:flex;justify-content:space-between;align-items:center;gap:.6em;padding:.5em .8em;font:inherit;cursor:' + (can ? 'pointer' : 'not-allowed') + ';opacity:' + (can ? '1' : '.5') + ';background:#10202e;color:#cde8ff;border:1.5px solid #2e90ff">';
        html += '<span>' + p.emoji + ' ' + T('g.dc.part.' + p.id) + ' <small style="opacity:.6">' + cur + '/' + cap + (full ? ' ' + T('g.dc.partFull') : '') + '</small></span> <b>' + p.cost + ' ' + payIco + '</b></button>';
      }
      html += '</div>';
    }
    if (note) html += '<div style="text-align:center;margin:.5em 0 .2em;color:' + (note.ok ? '#9be8a0' : '#ff9e9e') + '">' + note.text + '</div>';
    body.innerHTML = html;
    body.querySelectorAll('.dc-buy').forEach(b => b.addEventListener('click', () => contributePart(b.getAttribute('data-id'))));
  }
  function contributePart(id) {
    const parts = (typeof Datacenter !== 'undefined' && Datacenter.PARTS) || [];
    const p = parts.find(x => x.id === id); if (!p) return;
    const have = p.pay === 'coins' ? (player.coins || 0) : (player.caramelos || 0);
    if (have < p.cost) { refreshDcMenu({ ok: false, text: T(p.pay === 'coins' ? 'g.dc.noCoins' : 'g.dc.noCandy') }); Sfx.empty && Sfx.empty(); return; }
    Datacenter.contribute(id, res => {
      if (res && res.ok) {
        if (p.pay === 'coins') player.coins -= p.cost; else player.caramelos -= p.cost;   // el pago lo descuenta el cliente al confirmar el server
        dcState = res; syncHud(); Sfx.pickup && Sfx.pickup();
        if (typeof Mensajero !== 'undefined' && Mensajero.evento) Mensajero.evento('dc_contribute');
        refreshDcMenu({ ok: true, text: T(res.done ? 'g.dc.doneNote' : 'g.dc.thanks', { part: T('g.dc.part.' + id) }) });
      } else {
        const err = (res && res.error) || 'net';
        if (res && res.parts) { dcState = res; dcMaybeEndgame(res); }   // el server mandó el estado actualizado igual (p.ej. partfull/complete)
        refreshDcMenu({ ok: false, text: T('g.dc.err.' + (['rate', 'partfull', 'complete'].includes(err) ? err : 'net')) });
      }
    });
  }
  // [R] (o botón táctil): leé TODAS las noticias en voz alta. Mensajero.hablar usa la voz del navegador y, si no
  // hay (Chromium/Linux), cae al TTS del servidor (espeak-ng vía WebAudio) — con acento según el idioma del juego.
  function cineRead() {
    const ns = cineNoticias; if (!ns.length) return;
    const txt = ns.map(n => String(n.topic) + '. ' + String(n.headline)).join('. ');
    if (typeof Mensajero !== 'undefined' && Mensajero.hablar) Mensajero.hablar(txt);
    setMsg(T('g.cine.reading'), '#9fd3ff', 1600);
  }
  // EL GUARDA del cine: abre un MENÚ para ELEGIR la función vieja (otro día). La 1ª del run es GRATIS; después,
  // más viejo = más caro (precio base = días para atrás). PERO le REGATEÁS: baja de a 1 hasta un PISO, así las
  // muy viejas (precio alto) las negociás hasta dejarlas al mismo precio que las otras. Archivo de 7 días.
  const HAGGLE_FLOOR = 2;   // piso del regateo: el guarda no baja de acá (las viejas caras convergen a esto)
  function humanDay(d) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || ''); return m ? (m[3] + '/' + m[2]) : (d || ''); }
  function guardaBase(day, today) { return Math.max(1, Math.round((Date.parse(today) - Date.parse(day)) / 86400000)); }   // precio base: días para atrás = más viejo más caro
  function guardaAskOf(day, today) { return (guardaAsk[day] != null) ? guardaAsk[day] : guardaBase(day, today); }   // precio actual (ya regateado o base)
  function guardaCine(n) { openGuarda(); }
  function openGuarda() {
    const ov = document.getElementById('guardamenu'), body = document.getElementById('guardaBody');
    if (!ov || !body) return;
    const dias = ((typeof window !== 'undefined' && window.NOTI_DIAS) || []).slice().sort();   // asc
    const today = dias[dias.length - 1], old = dias.slice(0, -1).reverse();   // viejos, más reciente primero
    const free = !guardaFreeUsed;
    let html = '<div class="end-stats-title">' + T('g.cine.guardaTitle') + '</div>';
    html += '<div style="text-align:center;margin:.3em 0 .7em;opacity:.85">' + T('g.cine.guardaSub', { c: (player.caramelos || 0) }) + '</div>';
    // §9: si un hincha te pidió un resultado, el guarda te lo pone en la pantalla (gratis, es parte de la quest)
    if (mundialQuest && !mundialQuest.shown) {
      html += '<button class="guarda-mundial" style="display:block;width:100%;margin-bottom:.5em;padding:.6em .9em;font:inherit;cursor:pointer;border:1.5px solid #4FC3F7;background:#10202e;color:#cde8ff">📣 ' + T('g.mundial.guardaBtn', { eq: mundialQuest.equipo }) + '</button>';
    }
    if (!old.length) html += '<div style="text-align:center;opacity:.7;margin:1em 0">' + T('g.cine.guardaNone') + '</div>';
    else {
      html += '<div style="display:flex;flex-direction:column;gap:.4em">';
      for (const day of old) {
        const ask = free ? 0 : guardaAskOf(day, today), can = free || (player.caramelos || 0) >= ask;
        const price = ask === 0 ? T('g.cine.free') : (ask + ' 🍬');
        const canHag = !free && ask > HAGGLE_FLOOR;   // se puede regatear hasta el piso
        html += '<div style="display:flex;gap:.4em;align-items:stretch">';
        html += '<button class="guarda-day" data-day="' + day + '"' + (can ? '' : ' disabled') + ' style="flex:1;display:flex;justify-content:space-between;padding:.6em .9em;font:inherit;cursor:' + (can ? 'pointer' : 'not-allowed') + ';opacity:' + (can ? '1' : '.45') + '">📼 ' + humanDay(day) + ' <b>' + price + '</b></button>';
        if (canHag) html += '<button class="guarda-hag" data-day="' + day + '" style="padding:.6em .7em;font:inherit;cursor:pointer" title="' + T('g.cine.haggle') + '">🤝</button>';
        html += '</div>';
      }
      html += '</div>';
    }
    body.innerHTML = html;
    body.querySelectorAll('.guarda-day').forEach(b => b.addEventListener('click', () => pickGuardaDay(b.getAttribute('data-day'))));
    body.querySelectorAll('.guarda-hag').forEach(b => b.addEventListener('click', () => guardaRegatear(b.getAttribute('data-day'))));
    const mb = body.querySelector('.guarda-mundial'); if (mb) mb.addEventListener('click', guardaMundial);
    ov.classList.remove('hidden');
  }
  // §9: el guarda te CAMBIA LA PANTALLA con el resultado que te pidió el hincha → volvé y te agradece.
  function guardaMundial() {
    if (!mundialQuest) { closeGuarda(); return; }
    mundialQuest.shown = true;
    cineNoticias = [{ topic: '⚽ ' + String(mundialQuest.equipo).toUpperCase(), headline: mundialQuest.resultado }];   // pantalla = el partido
    closeGuarda();
    // un hincha del piso se te ACERCA a agradecerte (tu visión). Si no hay hincha cerca, queda el flujo de hablarle.
    const h = (room().npcs || []).find(n => isHincha(n));
    if (h) mundialApproach = { npc: h, homeX: h.x };
    setMsg(T('g.mundial.guardaOk', { eq: mundialQuest.equipo }), '#ffd54f', 5500); Sfx.pickup();
  }
  function guardaRegatear(day) {
    const dias = ((typeof window !== 'undefined' && window.NOTI_DIAS) || []).slice().sort(), today = dias[dias.length - 1];
    const ask = guardaAskOf(day, today);
    if (ask <= HAGGLE_FLOOR) { setMsg(T('g.cine.haggleFloor'), '#ffd54f', 2800); return; }   // no baja más
    guardaAsk[day] = ask - 1;
    setMsg(T(guardaAsk[day] <= HAGGLE_FLOOR ? 'g.cine.haggleFloor' : 'g.cine.haggleOk', { n: guardaAsk[day] }), '#9fd3ff', 2600);
    Sfx.pickup(); openGuarda();   // re-render con el precio nuevo
  }
  function closeGuarda() { const ov = document.getElementById('guardamenu'); if (ov) ov.classList.add('hidden'); }
  function pickGuardaDay(day) {
    const dias = ((typeof window !== 'undefined' && window.NOTI_DIAS) || []).slice().sort(), today = dias[dias.length - 1];
    const cost = guardaFreeUsed ? num(guardaAskOf(day, today), Infinity) : 0;   // anti-NaN fail-closed
    if ((player.caramelos || 0) < cost) { setMsg(T('g.cine.guardaPoor', { n: cost }), '#ff5252', 3500); return; }
    player.caramelos -= cost; guardaFreeUsed = true; closeGuarda();
    setMsg(T('g.cine.guardaWait'), '#9fd3ff', 1500);
    (window.fetchNoticiasDay ? window.fetchNoticiasDay(day) : Promise.resolve([])).then(ns => {
      cineArchive = { day, noticias: ns || [] };
      cineNoticias = pickNoticias(room());
      setMsg(T('g.cine.guardaOk', { day: humanDay(day) }), '#ffd54f', 5000); Sfx.pickup();
    });
  }
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
  // CÁMARAS + AFIP: cada dólar disparado genera una burbuja con su SERIE (siempre "buena" o "trucha" + número) y a
  // veces una 2ª línea de "origen detectado". EFECTO en los ROBOTS: serie BUENA = legal → los drones NO te ven unos
  // segundos (legalBlindUntil). Serie TRUCHA = ilegal → te siguen disparando (sin alivio).
  function dollarSerie() { const L = 'ABCDEFGHKL'[(Math.random() * 10) | 0]; let n = ''; for (let i = 0; i < 8; i++) n += (Math.random() * 10) | 0; return L + ' ' + n; }
  function spawnDollarBubble(x, y) {
    const trucha = Math.random() < DOLLARS.truchaChance, serie = dollarSerie();
    const lines = [T(trucha ? 'g.dollar.fake' : 'g.dollar.real', { s: serie })];
    // 2ª línea (siempre si trucha; a veces si buena): AFIP / origen detectado (lista = DATA del nivel)
    if (trucha || Math.random() < 0.6) {
      const O = DOLLARS.origins || [];
      lines.push(trucha && Math.random() < 0.5 ? T('g.dollar.afip')
        : T(O[(Math.random() * O.length) | 0] || 'g.dollar.o.ilegal', { n: 100 + ((Math.random() * 900) | 0) }));
    }
    // ¿hay una CÁMARA en la sala que lo vea? → la burbuja sale EN la cámara y le prende el LED (verde=legal, rojo=trucha)
    let bx = x, by = y - 14;
    const cams = (room().decor || []).filter(d => d.type === 'camara');
    if (cams.length) {
      let cm = cams[0]; for (const c of cams) if (Math.abs(c.x - x) < Math.abs(cm.x - x)) cm = c;
      cm._flash = 1.0; cm._flashCol = trucha ? '#ff5252' : '#7CFC00';
      bx = cm.x; by = cm.feetY - 66;
    }
    dollarBubbles.push({ x: bx, y: by, life: 2.8, trucha, lines });
    if (dollarBubbles.length > 6) dollarBubbles.shift();
    if (!trucha) legalBlindUntil = (typeof performance !== 'undefined' ? performance.now() : Date.now()) + DOLLARS.blindMs;   // serie buena = legal → drones ciegos
  }
  function updateDollarBubbles(dt) {
    for (let i = dollarBubbles.length - 1; i >= 0; i--) { const b = dollarBubbles[i]; b.life -= dt; b.y -= 12 * dt; if (b.life <= 0) dollarBubbles.splice(i, 1); }
    for (const d of (room().decor || [])) if (d._flash > 0) d._flash -= dt;   // LED de las cámaras
  }
  function drawDollarBubbles() {
    ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
    for (const b of dollarBubbles) {
      const a = Math.min(1, b.life / 0.6), x = b.x - cam.x, y0 = b.y - cam.y;
      let w = 0; for (const ln of b.lines) w = Math.max(w, (ctx.measureText(ln).width || 0));
      w += 12; const boxH = b.lines.length * 12 + 4;
      ctx.globalAlpha = a * 0.85; ctx.fillStyle = b.trucha ? '#3a0d0d' : '#0d2a12'; ctx.fillRect(x - w / 2, y0 - 11, w, boxH);
      ctx.globalAlpha = a; ctx.fillStyle = b.trucha ? '#ff7a7a' : '#9fe89f';
      b.lines.forEach((ln, i) => ctx.fillText(ln, x, y0 - 1 + i * 12));
      ctx.globalAlpha = 1;
    }
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
    if (curaSceneT > 0) { curaSceneT -= dt; if (curaSceneT <= 0) curaSceneIdx = -1; }   // se apaga sola la escena de la cura
    const r = room(), s = st();

    player.stunned = performance.now() < stunUntil;
    if (stunPending && !player.stunned) { stunPending = false; setMsg(T('g.truco.freed'), '#ffd54f', 5000); }   // el tahúr frena a las minas: "déjenlo al pibe"
    player.dollarMode = stormed;   // post-tormenta el Carpo escupe DÓLARES (apaciguan a la gente)
    player.canShoot = (stormed || spinoffLevel) && playingAs !== 'garbarino';   // PRE-tormenta no dispara; y el pibe de Garbarino tampoco (no es el Carpo)
    tickBuffs(dt);   // BUFFS temporales (birra): decrementa timers + setea speedMul/shielded que lee player.update
    player.update(dt, r, cam);
    // las CÁMARAS ven cada dólar disparado → burbuja con la serie (real/trucha)
    if ((player.shots || 0) > shotsSeen) { shotsSeen = player.shots; if (player.lastShot && player.lastShot.kind === 'dollar') spawnDollarBubble(player.lastShot.x, player.lastShot.y); }
    updateDollarBubbles(dt);
    // LAVALLE (E1.5): caminás al borde IZQUIERDO de Florida → PASÁS solo al piquete (NO hay puerta; uno no cruza a otra calle por una puerta)
    if (current === 0 && transCd <= 0 && !spinoffLevel && (player.x + player.w / 2) < 1.7 * Level.TILE && enterLavalle()) return;   // post-tormenta también: el piquete AGUANTA (E3)

    // LOOP de supervivencia: tras la tormenta la vida se gasta (SURV.decayHp cada SURV.decayEverySec s). Comé o te morís.
    // En el NIVEL-AI generado NO drena (es un nivel bonus aparte del loop de supervivencia).
    if (stormed && !spinoffLevel) {
      decayAcc += dt;
      while (decayAcc >= SURV.decayEverySec) { decayAcc -= SURV.decayEverySec; player.hp -= SURV.decayHp; if (player.hp <= 0) { player.hp = 0; player.alive = false; } }
    }
    if (!player.alive || player.hp <= 0) {
      if (spinoffLevel) { endSpinoffLevel('dead'); return; }              // morir en el nivel bonus → volvés sano al juego
      if (stormed && loopCount > 0) { reviveToPreviousLoop(); return; }   // morís → volvés al loop anterior
      die(); return;
    }
    updateCam();

    const dronesBlind = (typeof performance !== 'undefined' ? performance.now() : Date.now()) < legalBlindUntil;   // serie buena = legal → drones ciegos
    Enemies.update(s.enemies, dt, r, player, dronesBlind);
    Bullets.update(dt, r, s.enemies, player, dmg => player.hurt(dmg));
    Particles.update(dt);

    // pickups (en el EDIFICIO se REGENERAN: la escalera siempre tiene loot que vuelve a aparecer ~12 s después)
    const regenRoom = hasTag(r, 'edificio');
    for (const p of s.pickups) {
      if (p.taken) { if (regenRoom) { p.respawn = (p.respawn || 0) - dt; if (p.respawn <= 0) p.taken = false; } continue; }
      if (Math.abs(player.x+player.w/2 - p.x) < 22 && Math.abs(player.y+player.h - p.y) < 40) {
        p.taken = true; if (regenRoom) p.respawn = 12; Sfx.pickup();
        if (p.type === 'ammo') { player.ammo += p.amount; setMsg(T('g.shop.ammo', { n: p.amount }), '#FFD54F', 1100); }
        else if (p.type === 'coins') { player.coins += p.amount; setMsg(T('g.shop.coins', { n: p.amount }), '#FFC107', 1100); }
        else { player.hp = Math.min(MAXHP, player.hp + p.amount); setMsg(T('g.shop.health', { n: p.amount }), '#7CFC00', 1100); }
      }
    }
    // pinchos (hazard): obstáculo de los niveles generados. Daño al contacto (player.hurt ya tiene su cooldown).
    // ADITIVO: si la sala no tiene hazards (todas las hechas a mano), este loop no corre.
    if (r.hazards && r.hazards.length) {
      const px = player.x + player.w/2, py = player.y + player.h;
      for (const hz of r.hazards) {
        if (px > hz.x - hz.w/2 && px < hz.x + hz.w/2 && py > hz.y - 14 && py <= hz.y + 8) {
          player.hurt(hz.dmg); if (player.vy >= 0) player.vy = -360;   // te pincha y te rebota un poco
          break;
        }
      }
    }
    // POZO: te caés por un hueco del piso → daño + reaparecés en lugar seguro (solo salas generadas con pozos, aditivo)
    if (r._hasPit && player.y > r.pixH + 6) {
      player.hurt(16);
      player.x = 2 * Level.TILE; player.y = r.gTop * Level.TILE - player.h; player.vx = player.vy = 0;
    }
    // cumbia del músico: suena cuando pasás cerca (y antes de la tormenta)
    let nearMusico = false;
    for (const n of r.npcs || []) {
      if (n.sprite === 'musico' && Math.abs(player.x+player.w/2 - n.x) < 240) { nearMusico = true; break; }
    }
    Sfx.setCumbia((nearMusico || hasTag(r, 'lavalle')) && !stormed);   // §lavalle.md: en el piquete, cumbia al palo

    // vendedor que te sigue (Garbarino): camina hacia vos y siempre quiere venderte algo
    for (const n of r.npcs || []) {
      if (!n.follow) continue;
      const off = (n.followOff != null) ? n.followOff : -26;   // los compañeros caminan a un costado distinto (no se amontonan)
      const target = player.x + player.w/2 + off;
      if (Math.abs(target - n.x) > 4) n.x += Math.sign(target - n.x) * Math.min(95*dt, Math.abs(target - n.x));
      n.upCd = (n.upCd || 0) - dt;
      if (n.upCd <= 0 && n.lines) { setMsg(TX(n.lines[(Math.random()*n.lines.length)|0]), '#80cbc4', 2800); n.upCd = 3.5 + Math.random()*2.5; }
    }
    // NPCs VIVOS: cada tanto un NPC tira un globito (chusmea lo que hiciste / le contesta a otro). Templado con estado.
    ambientCd -= dt;
    if (ambientCd <= 0) { ambientCd = 7 + Math.random() * 8; spawnAmbient(); }
    if (ambientBubbles.length) ambientBubbles = ambientBubbles.filter(b => b.until > time && (r.npcs || []).includes(b.npc));
    updateDrives(r, dt);   // F4b: los NPC se mueven solos (deambular / chusmear / buscarte)
    // §9: el hincha SE ACERCA a agradecerte tras el dato del guarda; al llegar, premio + se vuelve a su lugar.
    if (mundialApproach && (r.npcs || []).includes(mundialApproach.npc)) {
      const h = mundialApproach.npc, target = player.x + player.w/2 - 22;
      if (Math.abs(target - h.x) > 6) h.x += Math.sign(target - h.x) * Math.min(110 * dt, Math.abs(target - h.x));
      else {
        applyReward(QUEST_DEFS.mundial.reward); setMsg(T('g.mundial.gracias', { res: mundialQuest ? mundialQuest.resultado : '' }), '#ffd54f', 5000); Sfx.pickup();
        h.x = mundialApproach.homeX; mundialQuest = null; mundialApproach = null;   // vuelve a su lugar
      }
    }

    // melee de peatones ya aplicado en Enemies.update; salida:
    if (r.theme === 'cambio' && stormed && r.goal) {
      if (Math.hypot(player.x+player.w/2 - r.goal.x, player.y+player.h - r.goal.y) < 40) win();
    }
    // META del NIVEL-AI generado → ganás el nivel bonus y volvés al juego con el souvenir
    if (spinoffLevel && r.goal) {
      if (Math.hypot(player.x+player.w/2 - r.goal.x, player.y+player.h - r.goal.y) < 44) { endSpinoffLevel('win'); return; }
    }
    syncHud();
  }

  function syncHud() {
    elHp.textContent = Math.max(0, Math.floor(player.hp));
    // QUEST DEL CHIP: el sprite del jugador pasa a ser el PIBE DE GARBARINO (player.asGarbarino → player.js draw).
    player.asGarbarino = (playingAs === 'garbarino');
    // ARMA CRIOLLA equipada (en sueños): el disparo lleva su daño base + a qué tipo de bicho le pega x3 (lo aplica fx.js).
    { const w = WEAPONS[player.weapon]; player.weaponCombat = (w && w.effectiveVs) ? { eff: w.effectiveVs, mul: w.dmgMul || 2, dmg: w.baseDmg || 14 } : null; }
    if (elWeapon) elWeapon.textContent = chipped ? (playingAs === 'garbarino' ? '💼' : '🤖') : wpnEmoji(player.weapon || 'escupitajo');
    // cartel rojo FIJO arriba con el objetivo actual del chip (persistente → siempre sabés que seguís chipeado + qué hacer)
    if (elChipBanner) { if (chipped) { elChipBanner.textContent = chipBannerText(); elChipBanner.classList.remove('hidden'); } else elChipBanner.classList.add('hidden'); }
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
      // A0-DEEP: PROP ANCLA del nivel generado (set-piece del relato) → emoji GRANDE con glow, parado en el piso.
      if (d.type === 'anchor' && d.emoji) {
        const ax = d.x - cam.x, ay = d.feetY - cam.y;
        ctx.save();
        ctx.shadowBlur = 16; ctx.shadowColor = 'rgba(224,176,255,0.7)';
        ctx.font = '34px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillText(d.emoji, ax, ay - 2);
        ctx.restore();
        continue;
      }
      const img = Art.decor[d.type];
      if (img) ctx.drawImage(img, d.x - cam.x - img.width/2, d.feetY - cam.y - img.height);
      if (img && d.type === 'cartel' && d.ad) drawCartelProp(d, img);   // propaganda rotativa: el cartel DECLARA que es superficie publicitaria (componente `ad`), no por regex de sala
      if (d.type === 'camara' && d._flash > 0) {   // LED de la cámara cuando "ve" un dólar (verde=legal, rojo=trucha)
        const lx = d.x - cam.x - 2, ly = d.feetY - cam.y - 63, a = Math.min(1, d._flash);
        ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = d._flashCol || '#7CFC00';
        ctx.beginPath(); ctx.arc(lx, ly, 3, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.5; ctx.beginPath(); ctx.arc(lx, ly, 7, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }
    // QUEST DEL CHIP: el Carpo (chipeado) quedó ACOSTADO en la cama del telo mientras vos controlás al pibe de Garbarino.
    if (r.carpoInBed) {
      const bed = (r.decor || []).find(d => d.type === 'catre');
      if (bed && Art.hero && Art.hero.idle) {
        const f = Art.hero.idle[0];
        ctx.save();
        ctx.translate(bed.x - cam.x, bed.feetY - cam.y - 12); ctx.rotate(-Math.PI / 2);
        ctx.drawImage(f, -f.width / 2, -f.height / 2); ctx.restore();
        ctx.font = '13px serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
        ctx.fillText('💤🤖', bed.x - cam.x + 16, bed.feetY - cam.y - 26);
        label(T('g.chip.carpoBed'), bed.x - cam.x, bed.feetY - cam.y - 42, '#ff6b9d');
      }
    }
    // QUEST DEL CHIP — PUESTA EN ESCENA DE LA CURA: un linyera entró al telohab y le da la consola al Carpo dormido;
    // el Carpo se incorpora y la activa → curado. Transitorio (curaSceneT), se dibuja sobre la cama del telohab.
    if (curaSceneT > 0 && current === curaSceneIdx) {
      const bed = (r.decor || []).find(d => d.type === 'catre');
      if (bed) {
        const bx = bed.x - cam.x, by = bed.feetY - cam.y, woke = curaSceneT < 4;   // a los ~3s el Carpo se despierta y agarra la consola
        ctx.save();
        if (!woke && Art.hero && Art.hero.idle) {   // todavía dormido en la cama (hero acostado, como carpoInBed)
          const f = Art.hero.idle[0]; ctx.translate(bx, by - 12); ctx.rotate(-Math.PI / 2); ctx.drawImage(f, -f.width / 2, -f.height / 2);
        }
        ctx.restore();
        ctx.font = '20px serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
        ctx.fillText('🧙‍♂️', bx - 30, by - 6);                                   // el linyera al lado de la cama
        ctx.font = '15px serif'; ctx.fillText(woke ? '🎮⚡' : '🎮', bx - 12, by - 22);   // le da/activa la consola
        ctx.font = '15px serif'; ctx.fillText(woke ? '😵‍💫' : '💤', bx + 16, by - 24);    // el Carpo: dormido → se despierta
        label(T(woke ? 'g.chip.curaScene2' : 'g.chip.curaScene1'), bx, by - 44, '#9be8a0');
      }
    }
    if (hasTag(r, 'cine-live')) {       // MULTIJUGADOR F1: pantalla del MUNDO VIVO (refresca cada ~4s)
      if (typeof Salon !== 'undefined' && Salon.enabled && performance.now() > salonPollT) { salonPollT = performance.now() + 4000; Salon.live(d => { salonLive = d; }); }
      drawSalonScreen(r);
    } else if (hasTag(r, 'carteles')) { cartelPoll(r); drawCarteles(r); }   // CARTELES C1: el TABLÓN compartido (poll ~5s)
    else if (hasTag(r, 'datacenter')) { dcPoll(r); drawDatacenter(r); }   // DATACENTER D1: la maqueta global (poll ~5s)
    else if (isCine(r)) drawCineScreen(r);   // pantalla de noticias del CINE (F1b)
    if (hasTag(r, 'bodegon') && bodegonOn) drawBodegonPeers(r);   // MULTIJUGADOR F2b: los OTROS jugadores en el bodegón

    // pozos (hazard kind 'pit') — el piso ya está calado (se ve el fondo); oscurecemos el hueco + postes rojos al borde
    for (const pit of r.pits || []) {
      const fy = r.gTop * TILE - cam.y, x0 = pit.x0 - cam.x;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x0, fy, pit.x1 - pit.x0, (r.h - r.gTop) * TILE);
      ctx.fillStyle = '#ff5252'; ctx.fillRect(x0 - 2, fy, 3, 7); ctx.fillRect(pit.x1 - cam.x - 1, fy, 3, 7);
      ctx.restore();
    }
    // pinchos (hazard) de los niveles generados — triángulos metálicos en el piso (no colisionan como sólido)
    for (const hz of r.hazards || []) {
      const x0 = hz.x - hz.w/2 - cam.x, fy = hz.y - cam.y, n = Math.max(2, Math.round(hz.w / 12)), sw = hz.w / n;
      ctx.save(); ctx.fillStyle = '#b0bec5'; ctx.strokeStyle = '#37474f'; ctx.lineWidth = 1;
      for (let i = 0; i < n; i++) { const sx = x0 + i*sw; ctx.beginPath(); ctx.moveTo(sx, fy); ctx.lineTo(sx + sw/2, fy - 17); ctx.lineTo(sx + sw, fy); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      ctx.restore();
    }

    // puertas
    for (const d of r.doors) {
      if (d.gate && !gateMet(d.gate)) continue;   // gating declarativo (ex ifs por-id) — render
      const img = Art.items[d.art] || Art.items.door;   // F4: el art YA es la key de Art (ex DOOR_ART)
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
      // RF-7: edificios derrumbados tras la tormenta (tablones sobre la puerta) — atributo del modelo (F4)
      if (stormed && d.collapsesOnStorm) {
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
    // META del NIVEL-AI generado (el motor solo dibuja portal en theme 'cambio'; acá lo dibujamos a mano)
    if (spinoffLevel && r.goal) {
      const gx = r.goal.x - cam.x, gy = r.goal.y - cam.y;
      if (Art.portal && Art.portal.length) {   // PORTAL real (el mismo art que la salida del cambio)
        const pf = Art.portal[Math.floor(time * 8) % Art.portal.length];
        ctx.drawImage(pf, gx - pf.width / 2, gy - pf.height);
      } else { ctx.fillStyle = '#e0b0ff'; ctx.beginPath(); ctx.arc(gx, gy - 24, 22, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#e0b0ff'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center'; ctx.fillText('▶ ' + (r.goal.label || 'SALIR'), gx, gy - 46);
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
      // el vendedor de armas se REVELA post-tormenta: de tipo común (???) a un trajeado siniestro que da miedo
      const stormSeller = stormed && n.sprite === 'misterioso';
      const img = (stormSeller && Art.npc.misterioso_storm) || Art.npc[n.sprite] || Art.npc.civil1;
      ctx.drawImage(img, n.x - cam.x - img.width/2, n.y - cam.y - img.height);
      label(stormSeller ? T('g.armas.sellerStorm') : TX(n.name), n.x - cam.x, n.y - cam.y - img.height - 4, stormSeller ? '#ff5252' : '#aef0c0');
      // §9 marcador de quest: ❗ sobre el GUARDA (andá por el dato) o el HINCHA (andá a contarle)
      if (mundialQuest) {
        const wantGuarda = !mundialQuest.shown && n.action === 'guarda';
        const wantHincha = mundialQuest.shown && !mundialApproach && isHincha(n);
        if (wantGuarda || wantHincha) questMarker(n.x - cam.x, n.y - cam.y - img.height - 18);
      }
      // NPCs VIVOS: globito de chusmerío sobre la cabeza (si este NPC tiene uno activo)
      const bub = ambientBubbles.find(b => b.npc === n && b.from <= time);
      if (bub) drawBubble(n.x - cam.x, n.y - cam.y - img.height - 8, bub.text);
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
    drawDollarBubbles();   // cámaras: serie del dólar (real/trucha → AFIP)
    // ninjas yéndose al pogo cuando Iorio toca (solo en Cemento, ~4s tras dar la falopa)
    if (current === ninjaRunRoom && time - ninjaRunT < 4.2) drawNinjaRunners(time - ninjaRunT);
    if (typeof Ads !== 'undefined') Ads.draw(ctx, current, cam, W, H);   // publicidad (capa aditiva, ver specs/publicidad.md)

    drawLight(r);
    drawPost();
    if (r.theme === 'secret' || r.theme === 'cemento') drawSmoke();
    updatePrompt();
    // MINIMAPA del HUD (v327): strip compacto de la manzana (orientación sin abrir el mapa). Aditivo + guardado.
    if (typeof Mapa !== 'undefined' && Mapa.drawMini && state === 'playing' && !spinoffLevel) {
      if (!Mapa.model && Mapa.build && rooms) Mapa.build(rooms);
      if (Mapa.model) { const rc = rooms[current]; Mapa.drawMini(ctx, 8, H - 42, 150, 34, { current, t: time,
        px01: rc ? (player.x + player.w / 2) / (rc.w * Level.TILE) : 0.5, online: (salonLive && salonLive.count) || 0 }); }
    }

    // BUFFS activos (birra): emoji + barra decreciente, arriba a la IZQUIERDA del canvas (lejos del ⚙ y del HUD)
    if (state === 'playing' && player.buffs && player.buffs.length) {
      let bx = 8;
      for (const b of player.buffs) {
        const meta = BUFF_META[b.b] || { emoji: '✨' }, frac = Math.max(0, Math.min(1, b.t / (b.t0 || b.t || 1)));
        ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(bx, 6, 26, 30);
        ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#fff';
        ctx.fillText(meta.emoji, bx + 13, 24);
        ctx.fillStyle = '#7CFC00'; ctx.fillRect(bx + 2, 30, 22 * frac, 3);
        bx += 30;
      }
    }
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
        : a === 'guarda' ? T('g.prompt.guarda')
        : a === 'guido' ? T('g.prompt.talk', { name: TX(it.n.name) })
        : a === 'vecino' ? (stormed ? T('g.prompt.vecinoStorm') : T('g.prompt.talk', { name: TX(it.n.name) }))
        : a === 'loop' ? T('g.prompt.loop')
        : T('g.prompt.talk', { name: TX(it.n.name) });
    }
    else if (it.kind === 'machine') {
      const m = it.m;
      if (stormed) txt = T('g.prompt.machinePossessed');
      else if (m.game === 'pacman' || m.game === 'galaga') txt = T('g.prompt.machinePay', { name: m.name, price: machinePrice(m) });
      else txt = T('g.prompt.machine', { name: m.name });
    }
    else if (stormed && it.d.collapsesOnStorm) txt = T('g.prompt.collapsed');
    else txt = TX(it.d.label);
    elPrompt.innerHTML = '<span class="key">E</span>' + txt;
    elPrompt.classList.remove('hidden');
  }

  // ---- fin ----
  // resumen de la partida para la pantalla de fin: números + checklist de hitos.
  function gameStats(won) {
    let items = 0;
    if (states) for (const s of states) for (const pk of s.pickups) if (pk.taken) items++;
    // HITOS separados en PRIMARIAS (la cadena principal hacia el portal: cada una pide la anterior) vs SECUNDARIAS
    // (sueltas, no anidadas a la principal). Directiva del dueño 2026-06-28. tier: 'P' | 'S'.
    const hitos = [
      { k: 'g.hito.tormenta',  done: stormed,                              tier: 'P' },   // estalla la tormenta
      { k: 'g.hito.truco',     done: trucoEverWon,                         tier: 'P' },   // gate del cuevero (truco)
      { k: 'g.hito.iorio',     done: chinoEntered,                         tier: 'P' },   // entraste al chino
      { k: 'g.hito.portal',    done: !!won,                                tier: 'P' },   // el portal (ganar)
      { k: 'g.hito.edificio',  done: borrachosHappy,                       tier: 'S' },   // arco del edificio abandonado
      { k: 'g.hito.bunker',    done: bunkerUnlocked,                       tier: 'S' },
      { k: 'g.hito.tesoro',    done: tesoroTaken,                          tier: 'S' },
      { k: 'g.hito.fifa',      done: fifaWon,                              tier: 'S' },
      { k: 'g.hito.megadrive', done: !!(player && player.hasMegaDrive),    tier: 'S' },
      { k: 'g.hito.cemento',   done: !!(player && player.hasCementoTicket), tier: 'S' },
      { k: 'g.hito.armado',    done: armado,                               tier: 'S' },
      { k: 'g.hito.chip',      done: chipEverCured,                        tier: 'S' },   // te sacaste el chip del robot del telo
    ];
    return { coins: (player && player.coins) | 0, days: loopCount, items, hitos,
      prim: hitos.filter(h => h.tier === 'P'), sec: hitos.filter(h => h.tier === 'S'),
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
    html += '</div>' + hitosHtml(s);
    elEndStats.innerHTML = html;
  }
  // checklist de hitos AGRUPADO: PRIMARIAS (la cadena principal) + SECUNDARIAS (sueltas). Directiva del dueño.
  function hitosHtml(s) {
    const grp = (title, arr) => '<li class="hito-grp">' + title + '</li>' + arr.map(h =>
      '<li class="' + (h.done ? 'done' : 'miss') + '">' + (h.done ? '✓' : '·') + ' ' + T(h.k) + '</li>').join('');
    return '<ul class="end-hitos">' + grp(T('g.stats.primarias'), s.prim) + grp(T('g.stats.secundarias'), s.sec) + '</ul>';
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
    if (window.__gameVersion) html += row('🏷️', T('g.version'), window.__gameVersion);   // versión del juego (cache-bust)
    html += '</div>' + hitosHtml(s);
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
    // ✊ RESPAWN PERONISTA (estado-jugador.md §2): sin el búnker descubierto NO hay game over — la muchachada del
    // piquete te levanta ("te teletransportaste como un RAYO SOLAR"). El save NO se borra.
    if (!bunkerUnlocked && typeof Lavalle !== 'undefined' && Lavalle.create) { respawnPiquete(); return; }
    state = 'dead'; running = false; Sfx.stopHum(); Sfx.stopAmbient();
    tel('death', { engine: engineUsed });
    evlog('muerte', '');
    if (typeof SaveStore !== 'undefined' && SaveStore.clear) SaveStore.clear();   // moriste de verdad: guardado a la basura
    elEndTitle.textContent = T('g.die.title'); elEndTitle.style.color = '#ff5252';
    elEndText.innerHTML = T('g.die.text'); renderStats(false);
    // guardar-partida.md: si hay CHECKPOINT (y no jugás hardcore) → "⏪ volver al último hito".
    // OJO: el checkpoint NO se re-escribe al morir (no hay farmeo de muerte).
    const hitoBtn = document.getElementById('hitoBtn');
    if (hitoBtn) {
      const chk = !isHardcore() && loadCheckpoint();
      hitoBtn.classList.toggle('hidden', !chk);
      if (chk) hitoBtn.textContent = T('g.chk.btn', { t: chkTitle(chk) });
    }
    showEnd();
  }
  function toggleMapa() {
    if (typeof Mapa === 'undefined' || !Mapa.build) return;
    if (state === 'mapa') {   // cerrar: restaurar el HUD
      state = 'playing';
      elHud.classList.remove('hidden'); elFloor.classList.remove('hidden');
      if (elChipBanner && chipped) elChipBanner.classList.remove('hidden');
      return;
    }
    if (!Mapa.model) Mapa.build(rooms);
    backfillVisited();   // v297: las quests HECHAS delatan dónde estuviste (partidas de antes del registro)
    visitedRooms.add(current); mapaZoom = null;
    mapaFrontier = (typeof HintEngine !== 'undefined') ? new Set(HintEngine.frontier(historiaState()).map(e => e.id)) : new Set();
    elHud.classList.add('hidden'); elFloor.classList.add('hidden'); elPrompt.classList.add('hidden');
    if (elChipBanner) elChipBanner.classList.add('hidden'); elMsg.textContent = '';
    state = 'mapa';
  }
  // BACKFILL de visitadas (guardar el camino, v297): cada quest HECHA del grafo marca su sala Y la cadena de
  // salas que llevan hasta ahí (parent del BFS del mapa). Para las partidas anteriores al registro ts_visited.
  function backfillVisited() {
    try {
      if (typeof Mapa === 'undefined' || !Mapa.model || typeof Historia === 'undefined') return;
      const flags = historiaState();
      const isDone = e => e.sets && Object.keys(e.sets).every(k => flags[k]);
      let added = false;
      for (const fino of [true, false]) {
        const qs = Mapa.model.questAt(Historia.edges, fino);
        for (const k in qs) {
          if (k.startsWith('sm:') || !qs[k].some(isDone)) continue;
          let i = +k;
          while (Number.isInteger(i) && !visitedRooms.has(i)) { visitedRooms.add(i); added = true; i = Mapa.model.nodes[i] ? Mapa.model.nodes[i].parent : null; }
        }
      }
      if (added) saveVisited();
    } catch (e) {}
  }
  function respawnPiquete() {
    player.hp = 50; player.alive = true; decayAcc = 0;                   // te levantan, no te curan entero
    addItem('chori');                                                     // te convidan un chori 🌭
    tel('death', { result: 'piquete' }); evlog('hito', 'lo levantó la muchachada del piquete');
    if (!enterLavalle(T('g.morir.piquete'))) { state = 'playing'; transCd = 0.5; }   // sin módulo → sigue donde estaba
  }
  // pantalla de fin del NIVEL 2 (tras la cinemática de cierre, o directo si no está el módulo)
  function showWin2End() {
    elEndTitle.textContent = T('g.win2.title'); elEndTitle.style.color = '#7CFC00';
    elEndText.innerHTML = T('g.win2.text'); renderStats(true);
    const hitoBtn = document.getElementById('hitoBtn'); if (hitoBtn) hitoBtn.classList.add('hidden');
    state = 'dead'; running = false; showEnd();
  }
  function showEnd() {
    elEnd.classList.remove('hidden'); elHud.classList.add('hidden'); if (elChipBanner) elChipBanner.classList.add('hidden');
    elPrompt.classList.add('hidden'); elFloor.classList.add('hidden');
  }

  // ---- loop ----
  let lastBeat = 0, freezeReported = false, saneT = 0;
  function loop(t) {
    if (!running) return;
    // TODO el cuerpo va en try/finally: los `return` de las transiciones (subte→Plaza, finale, etc.) y CUALQUIER
    // excepción NO deben saltarse el `requestAnimationFrame` → así el loop NUNCA se cuelga ("se cuelga" del dueño).
    try {
    lastBeat = (typeof performance !== 'undefined' ? performance.now() : Date.now());   // latido para el watchdog de freeze
    if (freezeReported) freezeReported = false;                                          // se recuperó del freeze
    const dt = Math.min(0.04, (t - lastT)/1000) || 0; lastT = t;
    if (t > saneT) { saneT = t + 1000; sanePlayer(); }   // anti-NaN: autocura 1×/seg (y avisa al dashboard)
    autosave(t);
    // MULTIJUGADOR F1: latido de presencia cada ~5s mientras jugás (dónde estás) → "Cine EN VIVO" + métrica online.
    // Late en CUALQUIER estado de juego (intro cerrada), no solo 'playing' → así en sub-modos (Lavalle/bodegón/arcade)
    // no caés de la cuenta de "jugando ahora".
    if (elIntro && elIntro.classList.contains('hidden') && typeof Salon !== 'undefined' && Salon.enabled && t > salonBeatT) {
      // reporta DÓNDE estás: los mini-juegos y sub-modos como su propio 'sala' → el dashboard ve quién juega a qué
      const MINI = { piquete: 'aguantar-corte', soga: 'la-soga', bombo: 'bombo', olla: 'olla', pancarta: 'pancarta', trucopvp: 'truco-1v1', trucopvp6: 'truco-6', arcade: 'arcade', bodegon: 'bodegon', lavalle: 'lavalle' };
      salonBeatT = t + 5000; Salon.beat(MINI[state] || currentAt());
      if (t > playtimeT) { playtimeT = t + 300000; tel('playtime', {}); }   // 1 tick = 5 min jugados (métrica didáctica)
      // F4a: refresco LENTO del mundo vivo (ticker de otros jugadores) para el grounding de los NPC, esté donde esté
      if (performance.now() > salonPollT + 56000) { salonPollT = performance.now() - 4000 + 60000; Salon.live(d => { if (d) salonLive = d; }); } }
    if (state === 'playing' && bodegonOn && typeof Salon !== 'undefined' && Salon.pos) Salon.pos(myTileX(), player.vx);   // F2b: posteo MI pos (el cliente throttlea ~160ms)
    if (state === 'playing' && activeEscort() && t > escortNudgeT) escortNudge();   // el escort te RECUERDA a dónde ir cada ~12s
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
          } else if (trucoSeisActive && !cueveroUnlocked) {   // RUTA B "DE A 6": tu duelo + los de tus 2 compañeros (3 vs 3)
            trucoSeisActive = false;
            const r6 = resolveTrucoSeis(res === 'win');
            player.flores = (player.flores || 0) + flores;
            if (r6.teamWon) {
              applyEdge('truco', 'trucoWon'); trucoEverWon = true;
              applyEdge('cuevero_gate', 'cueveroUnlocked'); syncCompanions();   // ganaste de a 6 → destraba al cuevero; el equipo se va
              setMsg(T('g.truco.seisWin', { won: r6.won, lost: r6.lost }), '#7CFC00', 9000);
              tel('cuevero_gate', { route: 'seis', won: r6.won });
            } else {
              player.hp = Math.max(1, player.hp - TRUCO_LOSE);
              setMsg(T('g.truco.seisLose', { won: r6.won, lost: r6.lost }), '#ff5252', 7500);
            }
          } else if (res === 'win') {   // EL TAHÚR (antro), 1v1 ya destrabado: flores + las minas te afanan + abre la puerta al chino
            player.flores = (player.flores || 0) + flores;
            const robbed = Math.min(player.coins, 25 + (Math.random()*35|0));
            player.coins -= robbed; stunUntil = performance.now() + 2000; stunPending = true;   // las minas te rodean y te afanan (gag); el tahúr te libera al toque
            applyEdge('truco', 'trucoWon'); trucoEverWon = true;   // abre la puerta (se consume) + marca el hito (permanente)
            const firstWin = !cueveroUnlocked; applyEdge('cuevero_gate', 'cueveroUnlocked');   // (compat) el tahúr "te perdona" → destraba al cuevero
            setMsg(T(firstWin ? 'g.truco.winGate' : 'g.truco.win', { n: robbed }), '#ff5252', firstWin ? 9000 : 7000);
            if (firstWin) tel('cuevero_gate', { route: 'propia' });
          }
          else { player.hp = Math.max(1, player.hp - TRUCO_LOSE); setMsg(T('g.truco.lose'), '#ff5252', 6800); }
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
          else { player.hp = Math.min(MAXHP, player.hp + 20); setMsg(T('g.galaga.win'), '#7CFC00', 4000); }
        } else setMsg(T('g.arcade.gameover'), '#9fd3ff', 2800);
        checkSecret();
      }
    } else if (state === 'super' && superGame) {
      superGame.update(dt); superGame.draw(ctx, W, H);
      if (superGame.done) {
        const to = superGame.exitTo, charged = superGame.subeCharged; superGame = null;
        if (typeof Sfx !== 'undefined' && Sfx.setRoomTrack) Sfx.setRoomTrack(null);   // salís del chino → corta el oriental y vuelve la música normal
        if (charged && !lsFlag('ts_sube_edge')) { try { localStorage.setItem('ts_sube_edge', '1'); } catch (e) {} applyEdge('sube_carga', 'subeReady'); }   // cargaste la SUBE → arista (map/ticker/checkpoint)
        if (to === 'nivelai') { launchNivelAI(); }   // te colaste a la trastienda → NIVEL-AI generado
        else {
          state = 'playing'; transCd = 0.35;
          elHud.classList.remove('hidden'); elFloor.classList.remove('hidden');
          if (to === 'cueva') enterCuevaFromSecret();
          else setMsg(T('g.super.leave'), '#FFC107', 3000);
        }
      }
    } else if (state === 'spinoff' && spinoffGame) {
      spinoffGame.update(dt); spinoffGame.draw(ctx, W, H);
      if (spinoffGame.done) {
        spinoffGame = null; state = 'playing'; transCd = 0.35;
        elHud.classList.remove('hidden'); elFloor.classList.remove('hidden');
        setMsg(T('g.nivelai.back'), '#e0b0ff', 4000);
      }
    } else if (state === 'vinilos' && vinilosGame) {
      vinilosGame.update(dt); vinilosGame.draw(ctx, W, H);
      if (vinilosGame.done) {
        vinilosGame = null; state = 'playing'; transCd = 0.35;
        elHud.classList.remove('hidden'); elFloor.classList.remove('hidden'); Sfx.stopEighties();
        setMsg(T('g.vinilos.leave'), '#e0b0ff', 2500);
      }
    } else if (state === 'tienda' && tiendaGame) {
      tiendaGame.update(dt); tiendaGame.draw(ctx, W, H);
      if (tiendaGame.done) {
        tiendaGame = null; state = 'playing'; transCd = 0.35; flash();
        elHud.classList.remove('hidden'); elFloor.classList.remove('hidden');
        setMsg(T('g.tienda.leave'), '#ff9ec7', 2500);
      }
    } else if (state === 'telo' && teloGame) {
      teloGame.update(dt); teloGame.draw(ctx, W, H);
      if (teloGame.done) {
        const gotChipped = teloGame.chipped, gotAway = teloGame.escaped, gotRescued = teloGame.rescued; teloGame = null; flash();
        if (Sfx.setRoomTrack) Sfx.setRoomTrack(null);   // corta la música de telo al volver al bar
        // te chipó el robot → arranca la QUEST en 'linyeras'. specs/telo-chip-quest.md.
        // RESCATE (4ª vez, ya hiciste 3 loops): los linyeras funden al robot → salís SIN chip (como un escape).
        if (gotChipped && !chipped) chipStart();
        // ESCAPASTE → seguís de joda en el bodegón top-down. TE CHIPARON → caés a LA HABITACIÓN DEL TELO (sala real con los 3 linyeras).
        if (!gotChipped && hasTag(room(), 'bodegon') && enterBodegon()) { /* de vuelta en el bodegón */ }
        else {
          state = 'playing'; transCd = 0.35; elHud.classList.remove('hidden'); elFloor.classList.remove('hidden');
          if (gotChipped) { const hi = rooms.findIndex(r => hasTag(r, 'telohab')); if (hi >= 0) { spawnIn(hi, 8); elFloor.textContent = TX(rooms[hi].name); if (Sfx.setRoomTrack) Sfx.setRoomTrack('telo'); } }   // misma habitación → misma música grasa
        }
        setMsg(T(gotChipped ? 'g.chip.wakeRoom' : gotRescued ? 'g.telo.rescued' : gotAway ? 'g.telo.escaped' : 'g.telo.leave'), gotChipped ? '#9be8a0' : gotRescued ? '#9be8a0' : '#ff8fc8', gotChipped ? 13000 : gotRescued ? 10000 : gotAway ? 6000 : 3000);
      }
    } else if (state === 'bunkermapa' && bunkerMapaGame) {            // MAPA B: el plano del búnker (construir)
      bunkerMapaGame.update(dt); bunkerMapaGame.draw(ctx, W, H);
      if (bunkerMapaGame.done) { bunkerMapaGame = null; state = 'playing'; transCd = 0.4; elHud.classList.remove('hidden'); elFloor.classList.remove('hidden'); }
    } else if (state === 'globo' && globoGame) {                      // MAPA A: el globo del mundo (sala de situación)
      globoGame.update(dt); globoGame.draw(ctx, W, H);
      if (globoGame.done) { globoGame = null; state = 'playing'; transCd = 0.4; elHud.classList.remove('hidden'); elFloor.classList.remove('hidden'); }
    } else if (state === 'mapa') {                                    // EL MAPA [TAB]: automap DOOM (mundo pausado)
      const r0 = room();
      // el mouse desactiva el cursor de teclado (y viceversa): mientras movés el mouse, manda el mouse
      if (Input.mouse.x !== mapaMouse.x || Input.mouse.y !== mapaMouse.y) { mapaMouse = { x: Input.mouse.x, y: Input.mouse.y }; mapaKb = false; }
      const mmx = mapaKb && mapaCursor ? mapaCursor.x : Input.mouse.x, mmy = mapaKb && mapaCursor ? mapaCursor.y : Input.mouse.y;
      const mapaSt = { current, t: time, px01: r0 ? (player.x + player.w / 2) / (r0.w * Level.TILE) : 0.5,
        visited: visitedRooms, edges: (typeof Historia !== 'undefined' && Historia.edges) || [], flags: historiaState(),
        frontier: mapaFrontier, stormed, mx: mmx, my: mmy, kb: mapaKb,
        online: (salonLive && salonLive.count) || 0, live: (salonLive && salonLive.byRoom) || {},
        piquete: loadPiqueteWon(), facil: lsFlag('ts_ayuda_facil'),
        dream: spinoffLevel ? ((r0 && TX(r0.name)) || '💤') : null,
        subteStats: (() => { try { return JSON.parse(localStorage.getItem('ts_subte_stats') || '{}'); } catch (e) { return {}; } })(),
        subteReach: { Florida: true, Lavalle: lsFlag('ts_sat_down') },   // estaciones accesibles (Florida siempre; Lavalle tras el satélite)
        zoom: mapaZoom, sub: null };
      Mapa.draw(ctx, W, H, mapaSt);
      // CURSOR POR TECLADO (v327): las flechas mueven caja-a-caja (target más cercano en esa dirección); Enter = activar
      const applyHit = hit => { if (hit && hit.tab) mapaZoom = hit.tab === 'ss' ? 'ss' : hit.tab === 'sky' ? 'sky' : hit.tab === 'subte' ? 'subte' : null;
        else if (typeof mapaZoom === 'number') mapaZoom = null; else if (hit && hit.anchor != null) mapaZoom = hit.anchor; };
      const navDir = dir => { mapaKb = true; const list = (Mapa.targets && Mapa.targets(W, H, mapaSt)) || [];
        if (!list.length) return; if (!mapaCursor) { mapaCursor = { x: list[0].x, y: list[0].y }; return; }
        let best = null, bd = Infinity;
        for (const tg of list) { const dx = tg.x - mapaCursor.x, dy = tg.y - mapaCursor.y;
          let ok, prim, cross;
          if (dir === 'left') { ok = dx < -3; prim = -dx; cross = Math.abs(dy); } else if (dir === 'right') { ok = dx > 3; prim = dx; cross = Math.abs(dy); }
          else if (dir === 'up') { ok = dy < -3; prim = -dy; cross = Math.abs(dx); } else { ok = dy > 3; prim = dy; cross = Math.abs(dx); }
          if (!ok) continue; const score = prim + cross * 2.2; if (score < bd) { bd = score; best = tg; } }
        if (best) mapaCursor = { x: best.x, y: best.y }; };
      if (trucoTap('arrowleft') || trucoTap('a')) navDir('left');
      if (trucoTap('arrowright') || trucoTap('d')) navDir('right');
      if (trucoTap('arrowup') || trucoTap('w')) navDir('up');
      if (trucoTap('arrowdown') || trucoTap('s')) navDir('down');
      if (trucoTap('enter') && mapaKb && mapaCursor) applyHit(Mapa.hitTest(W, H, mapaSt));
      // Z: dentro de un edificio = zoom a ESE edificio; en la calle no hace nada (el click manda, v300)
      if (trucoTap('z')) mapaZoom = (mapaZoom == null && current !== 0) ? Mapa.groupAt(current) : null;
      if (trucoTap('1')) mapaZoom = 'sky';                                             // [1] la cuadra (skyline, v301)
      if (trucoTap('2')) mapaZoom = null;                                              // [2] la manzana (cajones)
      if (trucoTap('3')) mapaZoom = 'ss';                                              // [3] los subsuelos
      if (trucoTap('4')) mapaZoom = 'subte';                                           // [4] el subte (preview, v306)
      // CLICK: pestaña de vista / edificio = zoom / con zoom de edificio abierto = volver (v293/v298)
      if (Input.mouse.down && !mapaClickHeld) { mapaClickHeld = true; mapaKb = false;
        applyHit(Mapa.hitTest && Mapa.hitTest(W, H, { zoom: mapaZoom, mx: Input.mouse.x, my: Input.mouse.y, visited: visitedRooms }));
      } else if (!Input.mouse.down) mapaClickHeld = false;
      if (trucoTap('escape')) { if (mapaZoom != null) mapaZoom = null; else toggleMapa(); }   // Esc: primero sale del zoom/vista
    } else if (state === 'obelisco' && obeliscoGame) {                // Lavalle E2: la plaza del Obelisco
      obeliscoGame.update(dt); obeliscoGame.draw(ctx, W, H);
      if (obeliscoGame.done) {
        const res = obeliscoGame.result; obeliscoGame = null;
        if (res === 'satwin') {   // E3: LO HERISTE → hito histórico + premio + gancho al datacenter
          applyEdge('satelite_herido', 'sateliteHerido');   // GRAFO (E4): setea ts_sat_down + evlog hito + Mensajero
          player.flores = (player.flores || 0) + 10; player.caramelos = (player.caramelos || 0) + 10;
          // subte.md §7: tras herir al satélite te MANDAN al subte → aparecés en la ESTACIÓN DE LAVALLE (Línea C).
          if (typeof Salon !== 'undefined' && Salon.leave) Salon.leave();
          if (enterSubte('lavalle', 'street')) { setMsg(T('g.obelisco.satWin'), '#7CFC00', 8000); return; }
        }
        const m = res === 'satlose' ? T('g.obelisco.satLose') : null;
        if (!enterLavalle(m)) { if (m) setMsg(m, '#ff8f8f', 8000); state = 'playing'; transCd = 0.4; elHud.classList.remove('hidden'); elFloor.classList.remove('hidden'); }
      }
    } else if (state === 'subte' && subteGame) {                      // subte.md §4: la estación (andén top-down)
      subteGame.update(dt);
      const buy = subteGame.purchase; if (buy) { player.coins = Math.max(0, (player.coins || 0) - buy.spent); addItem('boleto'); syncHud(); }   // BOLETO: le compraste al boletero → cobrás + al inventario
      if (subteGame.boletoUsed) { consumeItem('boleto'); }             // BOLETO: lo metiste en el molinete → se consume
      subteGame.draw(ctx, W, H);
      if (subteGame.done) {
        const ex = subteGame.exitTo; subteGame = null;
        if (typeof Input !== 'undefined' && Input.clear) Input.clear();
        if (ex && ex.indexOf('travel:') === 0) {   // F3: VIAJASTE a otra estación → contás el pasaje y reaparecés allá
          const dest = ex.slice(7);
          try { const s = JSON.parse(localStorage.getItem('ts_subte_stats') || '{}'); const nm = dest === 'lavalle' ? 'Lavalle' : dest === 'florida' ? 'Florida' : 'Catedral'; s[nm] = s[nm] || { usos: 0, gasto: 0 }; s[nm].usos++; s[nm].gasto += 10; localStorage.setItem('ts_subte_stats', JSON.stringify(s)); } catch (e) {}
          if (dest === 'catedral') { enterPlaza(); setMsg(T('g.subte.traveled'), '#7ff3ff', 4000); return; }   // F4: Catedral = PLAZA DE MAYO (Nivel 2)
          enterSubte(dest); setMsg(T('g.subte.traveled'), '#7ff3ff', 4000); return;
        }
        state = 'playing'; transCd = 0.4;
        elHud.classList.remove('hidden'); elFloor.classList.remove('hidden');
        current = 0; const ps = rooms[0]; player.x = 5 * Level.TILE; player.y = ps.gTop * Level.TILE - player.h; player.vx = player.vy = 0;
        updateCam(); elFloor.textContent = TX(rooms[0].name); Sfx.setAmbient(ambientFor(rooms[0]));
        setMsg(T('g.subte.back'), '#7ff3ff', 3000);
      }
    } else if (state === 'plaza' && plazaGame) {                      // F4: PLAZA DE MAYO (Nivel 2, circular)
      plazaGame.update(dt); plazaGame.draw(ctx, W, H);
      if (plazaGame.chipEdge) applyEdge('sanmartin_chip', 'sanmartinChip');   // GRAFO (one-shot): tomaste el chip del Libertador → mapa/ticker/checkpoint/grounding
      if (plazaGame.done) {
        const ex = plazaGame.exitTo; plazaGame = null; if (typeof Input !== 'undefined' && Input.clear) Input.clear();
        if (ex === 'win2') {   // NIVEL 2: chip del Libertador → Pirámide → señal a los satélites → LIBERACIÓN SANMARTINIANA
          applyEdge('nivel2_liberacion', 'nivel2Win');   // GRAFO: armaste la Pirámide → liberación (mapa/ticker/checkpoint/grounding)
          tel('win', { result: 'nivel2' }); evlog('hito', 'armó el dispositivo anti-IA con el chip de San Martín (Nivel 2)');
          if (typeof Finale !== 'undefined' && Finale.create) { finaleGame = Finale.create(); state = 'finale'; elMsg.textContent = ''; return; }   // cinemática de cierre → luego showEnd
          showWin2End(); return;
        }
        enterSubte('catedral', 'street');   // volvés a la boca (Catedral) → estación → superficie
      }
    } else if (state === 'finale' && finaleGame) {                    // §10.1: cinemática de cierre del Nivel 2
      finaleGame.update(dt); finaleGame.draw(ctx, W, H);
      if (finaleGame.done) { finaleGame = null; if (typeof Input !== 'undefined' && Input.clear) Input.clear(); showWin2End(); return; }
    } else if (state === 'lavalle' && lavalleGame) {                  // E1.5: el piquete top-down
      lavalleGame.update(dt); lavalleGame.draw(ctx, W, H);
      const lc = lavalleGame.openChatNpc;                             // [E] sobre el linyera peronista → chat IA (vuelve a Lavalle)
      if (lc) { chatReturnTo = 'lavalle'; openChat({ name: lc.name, persona: lc.persona }); }
      const lp = lavalleGame.openPeerChat;                            // [E] sobre un jugador ONLINE → chat privado (whisper), vuelve a Lavalle
      if (lp && lp.pid) { chatReturnTo = 'lavalle'; openPeerChat({ pid: lp.pid, nick: lp.nick || peerNickOf(lp.pid) }, 'lavalle'); }
      if (lavalleGame.juramentoDone && !lsFlag('ts_juramento')) applyEdge('piquete_juramento', 'juramento');   // GRAFO (E4)
      if (lavalleGame.joinSubte) {   // [E] en la boca del subte de Lavalle → bajás a la ESTACIÓN LAVALLE (Línea C)
        if (typeof Salon !== 'undefined' && Salon.leave) Salon.leave();
        lavalleGame = null; enterSubte('lavalle', 'street'); return;
      }
      if (lavalleGame.joinCorte) sitAtTable('corte');                 // [E] en la barricada → armar "Aguantar el corte" (server parea)
      if (lavalleGame.joinSoga) sitAtTable('soga');                   // [E] abajo-izq → "La soga"
      if (lavalleGame.joinBombo) sitAtTable('bombo');                 // [E] abajo-der → "Bombo & cumbia"
      if (lavalleGame.joinOlla) sitAtTable('olla');                   // [E] en la olla → "Reparto de la olla"
      if (lavalleGame.joinPanca) sitAtTable('pancarta');              // [E] a la derecha → "Pintar la pancarta"
      if (tableWait) drawTableWait(W, H);                             // overlay "esperando compañeros…"
      if (lavalleGame.done) {
        if (tableWait) leaveTableWait();                              // si salís de Lavalle mientras esperabas → cancelá la mesa
        if (typeof Salon !== 'undefined' && Salon.leave) Salon.leave();   // salir del espacio 'lavalle'
        if (typeof Input !== 'undefined' && Input.clear) Input.clear();   // soltar teclas al volver a la calle (evita seguir caminando/re-trigger)
        if (lavalleGame.exitTo === 'obelisco') { lavalleGame = null; if (enterObelisco()) return; }   // E2: cruzaste el corte
        lavalleGame = null; state = 'playing'; transCd = 0.6;
        elHud.classList.remove('hidden'); elFloor.classList.remove('hidden');
        current = 0; const ps = rooms[0]; player.x = 5 * Level.TILE; player.y = ps.gTop * Level.TILE - player.h; player.vx = player.vy = 0;   // de vuelta en Florida, despejado del trigger izq
        updateCam(); elFloor.textContent = TX(rooms[0].name); Sfx.setAmbient(ambientFor(rooms[0]));
        setMsg(T('g.lavalle.back'), '#4FC3F7', 3000);
      }
    } else if (state === 'bodegon' && bodegonGame) {
      if (tableWait) {                                                // esperando que el server paree la mesa (1v1 / 6)
        bodegonGame.draw(ctx, W, H); drawTableWait(W, H);
        if (trucoTap('escape')) leaveTableWait();
      } else {
        bodegonGame.update(dt); bodegonGame.draw(ctx, W, H);
        const cp = bodegonGame.invitePid; if (cp) openPeerChat({ pid: cp, nick: peerNickOf(cp) }, 'bodegon');   // E sobre un peer → chat privado directo
        const tbl = bodegonGame.sitTable; if (tbl) sitAtTable(tbl);   // E en una mesa → al server a esperar el pareo
        if (bodegonGame.done) {
          const toTelo = bodegonGame.goTelo; bodegonGame = null;
          if (toTelo) { enterTelo(); }                                // la rubia te lleva al telo
          else {                                                      // salir del bodegón → bajás al cine (8º "EN VIVO")
            state = 'playing'; transCd = 0.35; elHud.classList.remove('hidden'); elFloor.classList.remove('hidden');
            const d = rooms[current] && rooms[current].doorById && rooms[current].doorById['down']; if (d) transition(d);
          }
        }
      }
    } else if (state === 'piquete' && piqueteGame) {                    // Fase 2 Lavalle: "Aguantar el corte" (co-op)
      piqueteGame.update(dt); piqueteGame.draw(ctx, W, H);
      if (piqueteGame.done) {
        const res = piqueteGame.result; piqueteGame = null;
        lavalleSpawn = { x: 9, y: 5 };
        const m = T(res === 'win' ? 'g.piquete.won' : res === 'lose' ? 'g.piquete.lost' : 'g.piquete.left') + pReward(res, 'corte', 'molotov');
        if (enterLavalle(m)) { /* de vuelta al piquete top-down (muestra el resultado) */ } else { setMsg(m, res === 'win' ? '#7CFC00' : '#ffcf6e', 6500); state = 'playing'; transCd = 0.4; elHud.classList.remove('hidden'); elFloor.classList.remove('hidden'); }
      }
    } else if (state === 'soga' && sogaGame) {                           // Lavalle: "La soga" (tug of war co-op)
      sogaGame.update(dt); sogaGame.draw(ctx, W, H);
      if (sogaGame.done) {
        const res = sogaGame.result; sogaGame = null;
        lavalleSpawn = { x: 2.6, y: 11 };
        const m = T(res === 'win' ? 'g.soga.won' : res === 'lose' ? 'g.soga.lost' : 'g.soga.left') + pReward(res, 'soga', 'birra');   // la soga da una BIRRA 🍺 (buff)
        if (enterLavalle(m)) { /* de vuelta al piquete (muestra el resultado) */ } else { setMsg(m, res === 'win' ? '#7CFC00' : '#ffcf6e', 6500); state = 'playing'; transCd = 0.4; elHud.classList.remove('hidden'); elFloor.classList.remove('hidden'); }
      }
    } else if (state === 'bombo' && bomboGame) {                         // Lavalle: "Bombo & cumbia" (ritmo co-op)
      bomboGame.update(dt); bomboGame.draw(ctx, W, H);
      if (bomboGame.done) {
        const res = bomboGame.result; bomboGame = null;
        lavalleSpawn = { x: 15.4, y: 11 };
        const m = T(res === 'win' ? 'g.bombo.won' : res === 'lose' ? 'g.bombo.lost' : 'g.bombo.left') + pReward(res, 'bombo', 'mortero');
        if (enterLavalle(m)) { /* de vuelta al piquete (muestra el resultado) */ } else { setMsg(m, res === 'win' ? '#7CFC00' : '#ffcf6e', 6500); state = 'playing'; transCd = 0.4; elHud.classList.remove('hidden'); elFloor.classList.remove('hidden'); }
      }
    } else if (state === 'olla' && ollaGame) {                          // Lavalle: "Reparto de la olla" (reacción co-op)
      ollaGame.update(dt); ollaGame.draw(ctx, W, H);
      if (ollaGame.done) {
        const res = ollaGame.result; ollaGame = null;
        lavalleSpawn = { x: 4.5, y: 9.6 };
        const m = T(res === 'win' ? 'g.olla.won' : res === 'lose' ? 'g.olla.lost' : 'g.olla.left') + pReward(res, 'olla', 'chori');
        if (enterLavalle(m)) { /* de vuelta al piquete (muestra el resultado) */ } else { setMsg(m, res === 'win' ? '#7CFC00' : '#ffcf6e', 6500); state = 'playing'; transCd = 0.4; elHud.classList.remove('hidden'); elFloor.classList.remove('hidden'); }
      }
    } else if (state === 'pancarta' && pancaGame) {                     // Lavalle: "Pintar la pancarta" (colaborativo)
      pancaGame.update(dt); pancaGame.draw(ctx, W, H);
      if (pancaGame.done) {
        const res = pancaGame.result; pancaGame = null;
        lavalleSpawn = { x: 13.5, y: 9.6 };
        const m = T(res === 'win' ? 'g.pancarta.won' : res === 'lose' ? 'g.pancarta.lost' : 'g.pancarta.left') + pReward(res, 'pancarta', 'fernet');
        if (enterLavalle(m)) { /* de vuelta al piquete (muestra el resultado) */ } else { setMsg(m, res === 'win' ? '#7CFC00' : '#ffcf6e', 6500); state = 'playing'; transCd = 0.4; elHud.classList.remove('hidden'); elFloor.classList.remove('hidden'); }
      }
    } else if (state === 'trucopvp6' && truco6Game) {
      truco6Game.update(dt); truco6Game.draw(ctx, W, H);
      trucoHbT -= dt; if (trucoHbT <= 0) { trucoHbT = 4; if (typeof Salon !== 'undefined' && Salon.pos) Salon.pos(11, 0); }
      // watchdog (host): un humano que se fue → lo toma la IA y la partida sigue
      trucoWdT -= dt; if (trucoWdT <= 0) { trucoWdT = 5; if (truco6 && truco6.seatToPid) for (const s in truco6.seatToPid) { const pid = truco6.seatToPid[s]; if (trucoPeerGone(pid)) { truco6Game.onBye(+s); delete truco6.pidToSeat[pid]; delete truco6.seatToPid[s]; } } }
      if (truco6Game.done) {
        const res = truco6Game.result, flores = truco6Game.floresDelta || 0, wasHost = !!(truco6 && truco6.seatToPid); truco6Game = null;
        if (wasHost && truco6.seatToPid) for (const s in truco6.seatToPid) sendTk(truco6.seatToPid[s], { t: 't6-bye' });   // cerrar a los humanos (en fin normal ya terminaron por la vista; en abandono → 'left')
        truco6 = null;
        if (res === 'win') { player.flores = (player.flores || 0) + flores; setMsg(T('g.truco6.youWin', { n: flores }), '#7CFC00', 6000); sessTrucoW++; }
        else if (res === 'left') setMsg(T('g.truco6.ended'), '#ffcf6e', 5000);
        else { setMsg(T('g.truco6.youLose'), '#ff5252', 5000); sessTrucoL++; }
        if (hasTag(room(), 'bodegon') && enterBodegon()) { /* de vuelta en el bodegón */ }
        else { state = 'playing'; transCd = 0.35; elHud.classList.remove('hidden'); elFloor.classList.remove('hidden'); }
      }
    } else if (state === 'trucopvp' && trucoPvpGame) {
      trucoPvpGame.update(dt); trucoPvpGame.draw(ctx, W, H);
      trucoHbT -= dt; if (trucoHbT <= 0) { trucoHbT = 4; if (typeof Salon !== 'undefined' && Salon.pos) Salon.pos(11, 0); }   // mantené viva mi presencia (si no, el relay me poda)
      trucoWdT -= dt; if (trucoWdT <= 0) { trucoWdT = 5; if (trucoPeer && trucoPeerGone(trucoPeer)) trucoPvpGame.onNet({ t: 'tk-bye' }); }   // watchdog: el rival se fue → cerrar
      if (trucoPvpGame.done) {
        const res = trucoPvpGame.result, flores = trucoPvpGame.floresDelta || 0; trucoPvpGame = null; trucoPeer = null;
        if (res === 'win') { player.flores = (player.flores || 0) + flores; setMsg(T('g.trucopvp.youWin', { n: flores }), '#7CFC00', 6000); sessTrucoW++; }
        else if (res === 'left') setMsg(T('g.trucopvp.rivalLeft'), '#ffcf6e', 5000);
        else { setMsg(T('g.trucopvp.youLose'), '#ff5252', 5000); sessTrucoL++; }
        // volver al bodegón top-down (el salón NUNCA se desconectó). Si ya no estoy en la sala bodegón → playing.
        if (hasTag(room(), 'bodegon') && enterBodegon()) { /* de vuelta en el bodegón */ }
        else { state = 'playing'; transCd = 0.35; elHud.classList.remove('hidden'); elFloor.classList.remove('hidden'); }
      }
    } else {
      update(dt); render();
    }
    } catch (e) {
      if (typeof console !== 'undefined' && console.error) console.error('[ts] loop error (' + state + '):', e);
      try { tel('error', { where: 'loop:' + state, msg: String((e && e.message) || e).slice(0, 200) }); } catch (_) {}
    } finally {
      if (running) requestAnimationFrame(loop);   // SIEMPRE re-agenda (salvo game-over que pone running=false)
    }
  }
  // borra el PROGRESO persistido (flags de historia/quests, piquete, subte, Nivel 2, mapa visitado, búnker, checkpoints)
  // para arrancar una partida NUEVA de cero. CONSERVA settings/prefs: idioma, nick, debug, hardcore, SUSCRIPCIÓN, engine,
  // config, tracker, ayuda. Fix del dueño: "REINTENTAR" tras ganar el Nivel 2 no reseteaba (heredaba los hitos/flags de debug).
  const KEEP_ON_RESET = new Set(['ts_config', 'ts_debug', 'ts_engine', 'ts_hardcore', 'ts_lang', 'ts_nick', 'ts_nick_sfx', 'ts_sid', 'ts_sub_code', 'ts_ui_tracker', 'ts_ayuda_facil']);
  function clearProgress() {
    try { for (const k of Object.keys(localStorage)) if (/^ts_/.test(k) && !KEEP_ON_RESET.has(k)) localStorage.removeItem(k); } catch (e) {}
    try { if (typeof SaveStore !== 'undefined' && SaveStore.clear) SaveStore.clear(); } catch (e) {}
    visitedRooms = new Set([0]);
  }
  function start() {
    if (typeof Eventos !== 'undefined' && Eventos.sync) Eventos.sync(playerNick());   // memoria del barrio cross-device (F4d+)
    clearProgress();   // partida NUEVA de cero (ENTRAR / REINTENTAR): borra el progreso persistido, conserva settings
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
  // saltar el cartel narrativo con CLICK IZQ (además de E/timeout). Se agrega DESPUÉS de Input.bind → corre 2º, así
  // si saltó un cartel consume el disparo (Input.mouse.down=false) y ese click no escupe.
  if (canvas && canvas.addEventListener) canvas.addEventListener('mousedown', e => {
    if (e.button === 0 && state === 'playing') dismissMsg();   // click izq también salta el cartel (post-tormenta además dispara; pre-tormenta ya no dispara)
  });
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
    const gm = document.getElementById('guardamenu');
    if (e.key === 'Escape' && gm && !gm.classList.contains('hidden')) { e.preventDefault(); closeGuarda(); return; }
    const am = document.getElementById('armasmenu');
    if (e.key === 'Escape' && am && !am.classList.contains('hidden')) { e.preventDefault(); closeArmas(); return; }
    const cm = document.getElementById('cueveromenu');
    if (e.key === 'Escape' && cm && !cm.classList.contains('hidden')) { e.preventDefault(); closeCuevero(); return; }
    const vm = document.getElementById('vecinomenu');
    if (e.key === 'Escape' && vm && !vm.classList.contains('hidden')) { e.preventDefault(); closeVecino(); return; }
    const im = document.getElementById('invmenu');
    if (e.key === 'Escape' && im && !im.classList.contains('hidden')) { e.preventDefault(); closeInv(); return; }
    const ctm = document.getElementById('cartelmenu');
    if (e.key === 'Escape' && ctm && !ctm.classList.contains('hidden')) { e.preventDefault(); closeCarteles(); return; }
    const dcm = document.getElementById('dcmenu');
    if (e.key === 'Escape' && dcm && !dcm.classList.contains('hidden')) { e.preventDefault(); closeDatacenter(); return; }
    if (e.key === 'Escape' && spinoffLevel && state === 'playing') { e.preventDefault(); endSpinoffLevel('flee'); return; }   // salir del nivel-AI
    if (e.key === 'Tab' && (state === 'playing' || state === 'mapa')) { e.preventDefault(); toggleMapa(); return; }   // EL MAPA (specs/mapa-juego.md)
    if (e.target && /^(input|textarea)$/i.test(e.target.tagName)) return;   // escribiendo (chat) → no gatillar
    const k = e.key.toLowerCase();
    if (k === 'e') { if (dismissMsg()) return; interact(); }   // E salta el cartel narrativo si hay uno; si no, interactúa
    else if (k === 'r' && state === 'playing' && isCine(room()) && cineNoticias.length) cineRead();   // CINE: [R] leer todas en voz alta
    else if (k === 'm') { const on = Sfx.toggleMusic(); setMsg(on ? T('g.music.on') : T('g.music.off'), '#9fd3ff', 1200); }
    else if (k === 'p' && (state === 'playing')) { if (myst && myst.classList.contains('hidden')) showMyStats(); else closeMyStats(); }   // "Tu partida"
    else if (k === 'i' && (state === 'playing')) toggleInv();   // INVENTARIO (armas equipables)
    else if (bodegonOn && state === 'playing' && /^[1-8]$/.test(k)) {   // BODEGÓN F2b: 1-4 emote, 5-8 frase preset
      const n = +k; if (n <= 4) bodegonEmote(n); else bodegonPhrase(n - 5);
    }
  });
  document.getElementById('startBtn').addEventListener('click', start);
  document.getElementById('restartBtn').addEventListener('click', start);
  // VERSIÓN del juego visible (specs/version-visible.md): se LEE del cache-bust `?v=N` de un <script> ya cargado
  // (single source of truth: lo que muestra es exactamente el bundle que corrió; no hay constante que mantener).
  try {
    const sc = document.querySelector('script[src*="?v="]'), m = sc && sc.src.match(/[?&]v=([0-9]+)/), ver = m ? ('v' + m[1]) : '';
    const gv = document.getElementById('gameVersion'); if (gv && ver) gv.textContent = 'TORMENTA SOLAR · ' + ver;
    const ov = document.getElementById('optVersion'); if (ov && ver) ov.textContent = (typeof T === 'function' ? T('g.version') : 'Versión') + ': ' + ver;
    window.__gameVersion = ver;
  } catch (e) {}
  { const b = document.getElementById('myStatsClose'); if (b) b.addEventListener('click', closeMyStats); }
  { const b = document.getElementById('guardaClose'); if (b) b.addEventListener('click', closeGuarda); }
  { const b = document.getElementById('armasClose'); if (b) b.addEventListener('click', closeArmas); }
  { const b = document.getElementById('cueveroClose'); if (b) b.addEventListener('click', closeCuevero); }
  { const b = document.getElementById('vecinoClose'); if (b) b.addEventListener('click', closeVecino); }
  { const b = document.getElementById('invClose'); if (b) b.addEventListener('click', closeInv); }
  { const b = document.getElementById('cartelClose'); if (b) b.addEventListener('click', closeCarteles); }
  { const b = document.getElementById('dcClose'); if (b) b.addEventListener('click', closeDatacenter); }
  // QUEST MUNDO-AI: la máquina de mundos (generar por seed)
  { const c = document.getElementById('mundoai-close'); if (c) c.addEventListener('click', closeMundoAI);
    const go = document.getElementById('mundoai-go'), rnd = document.getElementById('mundoai-rand'), inp = document.getElementById('mundoai-seed'), pin = document.getElementById('mundoai-prompt');
    const parse = () => { const v = (inp && inp.value || '').trim(); if (!v) return null; const n = parseInt(v.replace(/[^0-9]/g, ''), 10); return isFinite(n) ? n : null; };
    const prompt = () => (pin && pin.value || '').trim();
    if (go) go.addEventListener('click', () => launchMundoAI(parse(), prompt()));
    if (rnd) rnd.addEventListener('click', () => launchMundoAI(null, prompt()));
    if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') launchMundoAI(parse(), prompt()); }); }
  if (typeof Salon !== 'undefined' && Salon.onWhisper) Salon.onWhisper(onPeerWhisper);   // F2b.2: recibir chats privados del bodegón
  if (typeof Salon !== 'undefined' && Salon.onTable) Salon.onTable(onTable);             // MESAS: el server parea (table-update/start/end)
  document.getElementById('chat-send').addEventListener('click', chatSend);
  document.getElementById('chat-close').addEventListener('click', closeChat);
  elChatInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); chatSend(); }
    else if (e.key === 'Escape') { e.preventDefault(); closeChat(); }   // (el handler global también lo cubre si pierde foco)
  });

  // NOMBRE DE USUARIO (specs/nombre-usuario.md): input en ⚙ Opciones; guarda el base y muestra el nick final (+sufijo) en vivo.
  (function () {
    const inp = typeof document !== 'undefined' && document.getElementById ? document.getElementById('opt-nick') : null;
    const prev = document.getElementById('opt-nick-preview'); if (!inp) return;
    const showPrev = () => { if (prev) prev.textContent = (typeof T === 'function' ? T('opt.nickIs') : 'Tu nick:') + ' ' + playerNick() + ' — ' + (typeof T === 'function' ? T('opt.nickSyncHint') : ''); };
    try { inp.value = nickBase(); } catch (e) {}
    showPrev();
    inp.addEventListener('input', () => { setNickBase(inp.value); showPrev(); });
    inp.addEventListener('blur', () => { setNickBase(inp.value); });   // al salir, normalizá (no reescribimos el input para no molestar mientras tipea)
  })();
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
  // "⏪ VOLVER AL ÚLTIMO HITO" en la pantalla de muerte (guardar-partida.md F1) + toggle HARDCORE (F2).
  (function () {
    if (typeof document === 'undefined' || !document.getElementById) return;
    const hb = document.getElementById('hitoBtn');
    if (hb) hb.addEventListener('click', () => {
      const chk = loadCheckpoint(); if (!chk) return;
      tel('death', { result: 'hito_return' });   // métrica: cuánta gente usa el checkpoint (Grafana)
      hb.classList.add('hidden');
      continueGame(chk.snap);
      setMsg(T('g.chk.loaded', { t: chkTitle(chk) }), '#7CFC00', 6000);
    });
    const ay = document.getElementById('opt-ayuda');
    if (ay) {
      const facil = () => { try { return localStorage.getItem('ts_ayuda_facil') === '1'; } catch (e) { return false; } };
      const refresh = () => { ay.textContent = facil() ? (typeof T === 'function' ? T('opt.ayudaFacil') : 'FÁCIL 🡒 todo marcado') : (typeof T === 'function' ? T('opt.ayudaDificil') : 'DIFÍCIL'); };
      refresh();
      ay.addEventListener('click', () => { try { localStorage.setItem('ts_ayuda_facil', facil() ? '' : '1'); } catch (e) {} refresh(); });
    }
    const hc = document.getElementById('opt-hardcore');
    if (hc) {
      const refresh = () => { hc.textContent = isHardcore() ? 'ON 💀' : 'OFF'; };
      refresh();
      hc.addEventListener('click', () => { try { localStorage.setItem('ts_hardcore', isHardcore() ? '' : '1'); } catch (e) {} refresh(); });
    }
    syncCheckpoint();   // F3: en la INTRO — dispositivo nuevo con tu nick → baja el checkpoint y aparece CONTINUAR
    // 🐛 TAB DEBUG (specs/debug-tab.md): botones que setean flags para saltar a un estado sin jugar todo.
    // Oculto salvo ts_debug (botón 🐛) o ?debug=1. Registro DATA: cada acción setea flags/player que el juego YA entiende.
    (function () {
      const wrap = document.getElementById('opt-debug-wrap'), toggle = document.getElementById('opt-debug-toggle'), dmsg = document.getElementById('opt-debug-msg');
      if (!wrap || !wrap.querySelectorAll || !wrap.classList) return;   // headless/e2e: sin DOM real → no-op
      const lsOn = k => { try { localStorage.setItem(k, '1'); } catch (e) {} };
      let metalDbg = false;   // toggle del botón debug "tocar el tema heavy"
      const on = () => { try { return localStorage.getItem('ts_debug') === '1' || /[?&]debug=1/.test(location.search); } catch (e) { return false; } };
      const say = t => { if (dmsg) dmsg.textContent = t; };
      const DEBUG_ACTIONS = {
        piquete:     () => { try { localStorage.setItem('ts_piqueteWon', JSON.stringify({ corte: 1, soga: 1, bombo: 1, olla: 1, pancarta: 1 })); localStorage.setItem('ts_piq_campeon', '1'); } catch (e) {} return 'Piquete: 5/5 juegos ganados'; },
        juramento:   () => { lsOn('ts_juramento'); return 'Juramento hecho (barricada abierta)'; },
        satelite:    () => { lsOn('ts_juramento'); lsOn('ts_obelisco_visto'); lsOn('ts_sat_down'); return 'Satélite herido — la boca del subte ya está en el piquete (o usá "Bajar al subte YA")'; },
        subteYa:     () => { if (!rooms || !player) return 'empezá una partida primero'; lsOn('ts_sube_seen'); lsOn('ts_sube_got'); lsOn('ts_sube_charged'); addItem('sube'); const ov = document.getElementById('options'); if (ov) ov.classList.add('hidden'); enterSubte('lavalle', 'street'); return 'Bajaste a la estación Lavalle 🚇'; },
        plazaYa:     () => { if (!rooms || !player) return 'empezá una partida primero'; lsOn('ts_sat_down'); const ov = document.getElementById('options'); if (ov) ov.classList.add('hidden'); enterPlaza(); return 'Fuiste a PLAZA DE MAYO 🏛️'; },
        tormenta:    () => { stormed = true; if (typeof FLAG_SETTERS !== 'undefined') FLAG_SETTERS.stormed(true); return 'Tormenta: mundo post-apagón (aplica al reentrar la sala)'; },
        bunker:      () => { bunkerUnlocked = true; return 'Búnker desbloqueado (sos gurú)'; },
        chino:       () => { chinoFrontOpen = true; chinoEntered = true; return 'Chino abierto (frente + trasera)'; },
        subeSeen:    () => { lsOn('ts_sube_seen'); return 'Tótem SUBE visto (arrancó la quest de la tarjeta)'; },
        subeGot:     () => { lsOn('ts_sube_got'); if (player) addItem('sube'); return 'Tenés la tarjeta SUBE 💳 (si estás en partida)'; },
        subeCharged: () => { lsOn('ts_sube_got'); lsOn('ts_sube_charged'); if (player) addItem('sube'); return 'SUBE cargada (pasás los molinetes)'; },
        rico:        () => { if (!player) return 'empezá una partida primero'; player.coins = (player.coins || 0) + 100; player.caramelos = (player.caramelos || 0) + 50; addItem('birra'); syncHud(); return '+100 🪙  +50 🍬  +1 🍺 (birra: buff en [I])'; },
        vida:        () => { if (!player) return 'empezá una partida primero'; player.hp = MAXHP; player.alive = true; syncHud(); return 'Vida full'; },
        viola:       () => { if (!player) return 'empezá una partida primero'; addItem('viola'); return 'Viola 🎸 al inventario'; },
        deposito:    () => { if (!rooms || !player) return 'empezá una partida primero'; try { localStorage.removeItem('ts_deposito_open'); } catch (e) {} addItem('llave'); const gi = rooms.findIndex(r => (r.tags || []).includes('galeria')); const ov = document.getElementById('options'); if (ov) ov.classList.add('hidden'); if (gi >= 0) spawnIn(gi, 33); return 'Te di la 🔑 llave + te dejé al lado del depósito 🔒 (apretá E)'; },
        mundoai:     () => { if (!rooms || !player) return 'empezá una partida primero'; const ov = document.getElementById('options'); if (ov) ov.classList.add('hidden'); openMundoAI(); return 'Máquina de mundos 🌀 abierta (poné una semilla)'; },
        metal:       () => { if (typeof Sfx === 'undefined') return 'sin audio'; Sfx.init(); metalDbg = !metalDbg; Sfx.setRoomTrack(metalDbg ? 'metal' : null); return metalDbg ? 'Tocando el tema HEAVY CRIOLLO 🎸 (así suena en Cemento). Apretá de nuevo para parar.' : 'Metal off 🎸'; },
        mapa:        () => { if (!rooms) return 'empezá una partida primero'; for (let i = 0; i < rooms.length; i++) visitedRooms.add(i); saveVisited(); return 'Mapa: todas las salas marcadas visitadas'; },
        wipe:        () => { try { if (typeof SaveStore !== 'undefined' && SaveStore.clear) SaveStore.clear(); for (const k of Object.keys(localStorage)) if (/^ts_/.test(k) && k !== 'ts_debug' && k !== 'ts_nick' && k !== 'ts_nick_sfx' && k !== 'ts_lang') localStorage.removeItem(k); } catch (e) {} return 'Partida + flags borrados (recargá o Restablecer)'; },
      };
      const refreshVis = () => wrap.classList.toggle('hidden', !on());
      refreshVis();
      if (toggle) toggle.addEventListener('click', () => { try { localStorage.setItem('ts_debug', on() ? '' : '1'); } catch (e) {} refreshVis(); });
      const btns = wrap.querySelectorAll('[data-dbg]');
      if (btns && btns.forEach) btns.forEach(btn => btn.addEventListener('click', () => {
        const fn = DEBUG_ACTIONS[btn.getAttribute('data-dbg')];
        if (fn) { try { say('✓ ' + fn()); } catch (e) { say('✗ ' + e.message); } }
      }));
    })();
  })();

  // API mínima para la capa de guardado (js/save.js). El estado sigue privado: solo exponemos
  // el snapshot y el "continuar". Sin esta capa, el juego anda igual (nadie llama a esto).
  if (typeof window !== 'undefined') window.Game = Object.assign(window.Game || {}, { serialize, continueGame, world: worldSnapshot, quests: () => QUEST_DEFS, questRuntime: Quests, actions: () => Object.keys(NPC_ACTIONS),
    // superficie de prueba (e2e) del nivel-AI en el motor real (rooms-swap): lanzar / consultar / salir
    __nivelai: { launch: launchNivelAI, end: endSpinoffLevel, active: () => spinoffLevel, room: () => rooms[current], player: () => player },
    // superficie de prueba (e2e) de la QUEST MUNDO-AI (specs/quest-mundo-ai.md §0): entrar por seed, consultar, salir
    __mundoai: { launch: launchMundoAI, end: endSpinoffLevel, active: () => spinoffLevel, room: () => rooms[current], lastSeed: () => lastMundoSeed },
    // superficie de prueba (e2e) del GATE del cuevero (specs/cuevero-gate-truco.md): ruta A (Guido) y ruta B (vos)
    // superficie de prueba (e2e) de los CHECKPOINTS por hito (guardar-partida.md)
    __chk: { save: saveCheckpoint, load: loadCheckpoint },
    // superficie de prueba (e2e) de los BUFFS temporales (Inventario F3 kind:'buff', specs/inventario-armas.md §7.3)
    __buff: { give: id => addItem(id), use: id => useItem(id), tick: dt => tickBuffs(dt),
      state: () => player && ({ buffs: (player.buffs || []).map(b => b.b), speedMul: player.speedMul, shielded: player.shielded, hp: player.hp, inv: (player.inventory || []).slice() }) },
    __gate: {
      flags: () => ({ cueveroUnlocked, tahurDiscovered, guidoSummoned, guidoRecruited, guidoFollowing, bought, stormed }),
      cuevero: () => handleCuevero({ outcome: 'real', dialog: 'test' }),   // hablar al cuevero que cambia
      pick: k => pickCuevero(k),                                           // elegir A/B/C en el menú
      guido: () => handleGuido({ dialog: 'test' }),                        // hablar con Guido
      discoverTahur: () => { tahurDiscovered = true; },                   // entrar a la trastienda
      sitTahur: () => NPC_ACTIONS.truco({}),                              // sentarse a la mesa (Guido juega si te sigue)
      // follow cross-room: compañeros activos (ids) + si están en la sala actual (los movemos al transicionar)
      companions: () => companions.map(c => c.id),
      compInRoom: () => (rooms[current] && rooms[current].npcs || []).filter(n => n.companion).map(n => n.id),
      go: to => transition({ to, at: { x: 3 * Level.TILE, y: rooms[to].gTop * Level.TILE } }),   // transicionar a una sala
      // truco DE A 6 (ruta B): hablar al tahúr (ofrece/chequea), reclutar un compañero, ver equipo, resolver 3v3
      tahur: () => NPC_ACTIONS.truco({}),
      recruitMate: id => recruitMate({ mate: { id } }),
      mates: () => Object.keys(trucoMatesRec),
      seisOffered: () => trucoSeisOffered,
      seisResolve: youWon => resolveTrucoSeis(youWon),
    },
    // superficie de prueba (e2e) del VECINO de los edificios clausurados: contar historias → pasar → interior
    __vecino: {
      npc: (edif, interior) => ({ vecino: { edificio: edif, interior } }),
      tell: n => handleVecino(n),
      pass: n => passToBuilding(n, n.vecino && n.vecino.edificio),
      end: outcome => endSpinoffLevel(outcome),
      // banco vivo (IA): elige una historia para el edificio y devuelve si vino del banco vivo + su gancho (para tests)
      pick: edif => { const s = pickVecinoStory({ told: [] }, edif); return { id: s.id, live: !!s.live, gancho: vecinoGancho(s), tale: vecinoTale(s, edif) }; },
      state: () => ({ spinoffLevel, spinoffReturnRoom, current, entrado: { ...entradoEdif }, active: spinoffLevel, vecino: JSON.parse(JSON.stringify(vecinoState)) }),
    } });
})();
