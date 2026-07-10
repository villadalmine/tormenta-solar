// server.js — proxy de CHAT con IA para "Tormenta Solar" (modo B). Node puro, sin dependencias.
// Guarda la API key de OpenRouter (NUNCA va al cliente), arma el prompt con la persona, llama a un
// modelo :free, y devuelve { reply }. Rate-limit simple por IP.
//
//   OPENROUTER_API_KEY=sk-or-... node server.js        (PORT=8788 por defecto)
//
// Después poné la URL pública en js/ai.js -> ENDPOINT.
import http from 'http';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { buildMessages } from './personas.js';

// Upstream configurable: por defecto OpenRouter directo, pero podés apuntarlo a tu LiteLLM (u otro
// endpoint OpenAI-compatible) que ya hace pool de keys / GPU / fallback. Para LiteLLM:
//   AI_BASE_URL=http://litellm-proxy.ai.svc.cluster.local:4000/v1  AI_API_KEY=sk-hermes-internal  AI_MODEL=default
const BASE = (process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/+$/, '');
const KEY = (process.env.AI_API_KEY || process.env.OPENROUTER_API_KEY || '').trim();
const PORT = process.env.PORT || 8788;
const GEN_TOKEN = (process.env.GEN_TOKEN || '').trim();   // protege POST /linyera-pool (que el cron escriba, no cualquiera)
let LINYERA_POOL = null, LINYERA_POOL_TS = 0;             // pool de saturación del linyera (lo llena el CronJob 1×/día)

// --- OpenRouter DINÁMICO (specs/openrouter-dinamico.md F1 precios + F3 novedades) ---
// El proxy SOLO guarda y sirve; un Argo CronWorkflow (gen-prices.mjs) hace el fetch de /api/v1/models y
// postea acá (POST /precios). Sirve precios → /metrics + /precios, y novedades → /novedades. Sin key en el cliente.
let OR_PRICES = {}, OR_NEWS = [], OR_TS = 0;   // poblado por el CronWorkflow vía POST /precios
// NOTICIAS del CINE (cine-noticias.md): banco de titulares por topic, lo llena un cron (gen-noticias.mjs) que
// FETCHEA (código, no modelo) y postea acá. El juego lo lee en GET /noticias (pantalla del cine + linyera).
// PERSISTE en JSON-en-PVC (como SUBS_STORE): el cron corre 1×/día, así que si NO se guardara, cada redeploy/restart
// del proxy dejaría el banco vacío hasta las 9am (la pantalla del cine quedaría "sin señal"). Se carga al arrancar.
let NOTICIAS = [], NOTICIAS_TS = 0;                 // día ACTUAL (último) — compat con GET /noticias
let NOTI_DAYS = {};                                 // ARCHIVO: { 'YYYY-MM-DD': {noticias:[...], ts} } — el guarda del cine vende funciones viejas
const NOTICIAS_STORE = process.env.NOTICIAS_STORE || '/data/noticias.json';
const NOTI_KEEP_DAYS = 7;                            // ring acotado: 7 días, entra el nuevo y se cae el más viejo (no "basura forever")
function notiSyncLatest() { const ds = Object.keys(NOTI_DAYS).sort(), last = ds[ds.length - 1]; if (last) { NOTICIAS = NOTI_DAYS[last].noticias || []; NOTICIAS_TS = NOTI_DAYS[last].ts || 0; } else { NOTICIAS = []; NOTICIAS_TS = 0; } }
function notiPrune() { const ds = Object.keys(NOTI_DAYS).sort(); while (ds.length > NOTI_KEEP_DAYS) delete NOTI_DAYS[ds.shift()]; }
function loadNoticias() {
  try { const d = JSON.parse(fs.readFileSync(NOTICIAS_STORE, 'utf8'));
    if (d && d.days && typeof d.days === 'object') NOTI_DAYS = d.days;                                  // formato nuevo (archivo por día)
    else if (d && Array.isArray(d.noticias)) NOTI_DAYS = { [new Date(d.ts || Date.now()).toISOString().slice(0, 10)]: { noticias: d.noticias, ts: d.ts || Date.now() } };   // legacy → 1 día
    notiPrune(); notiSyncLatest();
  } catch (e) {}
}
function saveNoticias() { try { fs.mkdirSync(NOTICIAS_STORE.replace(/\/[^/]*$/, '') || '/', { recursive: true }); fs.writeFileSync(NOTICIAS_STORE, JSON.stringify({ days: NOTI_DAYS })); } catch (e) { console.error('noticias store save:', e.message); } }
loadNoticias();
// PROPAGANDA del CINE (carteles-ia.md): banco de carteles FALSOS estilo BsAs por rubro (comida/ropa/electronica/bizarro),
// lo llena un cron (gen-propaganda.mjs, IA) y el juego lo rota en los carteles del cine (GET /propaganda). Persiste en PVC.
let PROPAGANDA = [];
const PROPAGANDA_STORE = process.env.PROPAGANDA_STORE || '/data/propaganda.json';
function loadPropaganda() { try { const d = JSON.parse(fs.readFileSync(PROPAGANDA_STORE, 'utf8')); if (d && Array.isArray(d.carteles)) PROPAGANDA = d.carteles; } catch (e) {} }
function savePropaganda() { try { fs.mkdirSync(PROPAGANDA_STORE.replace(/\/[^/]*$/, '') || '/', { recursive: true }); fs.writeFileSync(PROPAGANDA_STORE, JSON.stringify({ carteles: PROPAGANDA })); } catch (e) { console.error('propaganda store save:', e.message); } }
loadPropaganda();
// MUNDIAL (cine-noticias.md §9): mapa equipo→último resultado de TODOS los que jugaron, para la quest de los hinchas.
// Lo llena el cron (gen-noticias.mjs, ESPN scoreboard día por día). GET /mundial. Persiste en PVC.
let MUNDIAL = {};
const MUNDIAL_STORE = process.env.MUNDIAL_STORE || '/data/mundial.json';
function loadMundial() { try { const d = JSON.parse(fs.readFileSync(MUNDIAL_STORE, 'utf8')); if (d && d.equipos && typeof d.equipos === 'object') MUNDIAL = d.equipos; } catch (e) {} }
function saveMundial() { try { fs.mkdirSync(MUNDIAL_STORE.replace(/\/[^/]*$/, '') || '/', { recursive: true }); fs.writeFileSync(MUNDIAL_STORE, JSON.stringify({ equipos: MUNDIAL })); } catch (e) { console.error('mundial store save:', e.message); } }
loadMundial();
// CHUSMERÍO del barrio (npcs-vivos.md): banco de frases ambiente que los NPC se dicen entre ellos. Lo genera un
// cron con IA (gen-chusmerio.mjs) y el juego las rota en globitos. Persiste en PVC (reproducible).
let CHUSMERIO = [], CHUSMERIO_TS = 0;
const CHUSMERIO_STORE = process.env.CHUSMERIO_STORE || '/data/chusmerio.json';
function loadChusmerio() { try { const d = JSON.parse(fs.readFileSync(CHUSMERIO_STORE, 'utf8')); if (d && Array.isArray(d.lineas)) { CHUSMERIO = d.lineas; CHUSMERIO_TS = d.ts || 0; } } catch (e) {} }
function saveChusmerio() { try { fs.mkdirSync(CHUSMERIO_STORE.replace(/\/[^/]*$/, '') || '/', { recursive: true }); fs.writeFileSync(CHUSMERIO_STORE, JSON.stringify({ lineas: CHUSMERIO, ts: CHUSMERIO_TS })); } catch (e) { console.error('chusmerio store save:', e.message); } }
loadChusmerio();

// HISTORIAS del VECINO (edificios-clausurados-historias.md §8): banco VIVO de relatos de terror por edificio que
// AUTORA la IA (gen-historias.mjs). El juego los flashea y, si pasás, los usa de semilla del nivel. GET /historias →
// banco; el cliente cae al banco ESTÁTICO (game.js) si no hay. Cada historia: {id,edif,motif,style,es:{gancho,tale},en:{...}}.
let HISTORIAS = [], HISTORIAS_TS = 0;
const HISTORIAS_STORE = process.env.HISTORIAS_STORE || '/data/historias.json';
function loadHistorias() { try { const d = JSON.parse(fs.readFileSync(HISTORIAS_STORE, 'utf8')); if (d && Array.isArray(d.historias)) { HISTORIAS = d.historias; HISTORIAS_TS = d.ts || 0; } } catch (e) {} }
function saveHistorias() { try { fs.mkdirSync(HISTORIAS_STORE.replace(/\/[^/]*$/, '') || '/', { recursive: true }); fs.writeFileSync(HISTORIAS_STORE, JSON.stringify({ historias: HISTORIAS, ts: HISTORIAS_TS })); } catch (e) { console.error('historias store save:', e.message); } }
loadHistorias();

// CARTELES COLABORATIVOS (specs/construccion-colaborativa.md C1) — tablón compartido tipo Death Stranding: dejás un
// cartel corto en un piso del cine; DURA hasta que OTRO jugador lo lee (consumo-en-lectura) → se borra y libera el slot.
// Banco MUTABLE por el jugador (a diferencia de los otros, que son crones IA), PERSISTE en PVC (un cartel espera horas a
// su lector). 2 pisos: floor 'carteles-1' / 'carteles-2', cada uno con `CARTELES_CAP` celdas (grilla empaquetada).
let CARTELES = [];   // [{ id, floor, slot, author(pid|'ai'), nick, text, ts }]
const CARTELES_STORE = process.env.CARTELES_STORE || '/data/carteles.json';
const CARTELES_CAP = +(process.env.CARTELES_CAP || 24);    // celdas por piso (empaquetado)
const CARTELES_FLOORS = ['carteles-1', 'carteles-2'];
const CARTELES_MAXLEN = 80;                                 // chars por cartel (corto a propósito)
const CARTELES_PRUNE_MS = 7 * 24 * 3600 * 1000;            // poda carteles > 7 días (que no tranquen slots)
const CARTELES_RATE_MS = 20000;                            // 1 cartel cada 20s por pid (anti-spam)
const cartelLast = new Map();                              // pid -> ts del último POST
// lista negra mínima (anti-abuso v1; el consumo-en-lectura ya limita la exposición a 1 lector). Censura, no rechaza.
const CARTEL_BAN = /\b(put[oa]s?|forr[oa]s?|trolo|negro de mierda|n[ai]zi|hitler|kill yourself|kys)\b/gi;
let CARTEL_SEQ = 0;
function loadCarteles() { try { const d = JSON.parse(fs.readFileSync(CARTELES_STORE, 'utf8')); if (d && Array.isArray(d.signs)) CARTELES = d.signs; } catch (e) {} }
function saveCarteles() { try { fs.mkdirSync(CARTELES_STORE.replace(/\/[^/]*$/, '') || '/', { recursive: true }); fs.writeFileSync(CARTELES_STORE, JSON.stringify({ signs: CARTELES })); } catch (e) { console.error('carteles store save:', e.message); } }
function cartelesPrune() { const now = Date.now(), before = CARTELES.length; CARTELES = CARTELES.filter(s => now - (s.ts || 0) < CARTELES_PRUNE_MS); if (CARTELES.length !== before) saveCarteles(); }
function cartelClean(t) { return String(t || '').replace(/[\x00-\x1f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, CARTELES_MAXLEN).replace(CARTEL_BAN, m => '*'.repeat(m.length)); }
function cartelFreeSlot(floor) { const used = new Set(CARTELES.filter(s => s.floor === floor).map(s => s.slot)); for (let i = 0; i < CARTELES_CAP; i++) if (!used.has(i)) return i; return -1; }
loadCarteles(); cartelesPrune(); setInterval(cartelesPrune, 3600 * 1000).unref?.();

// DATACENTER COLABORATIVO GLOBAL (specs/construccion-colaborativa.md D1) — un ÚNICO objeto de toda la comunidad. Aportás
// PARTES (pagás con plata/caramelos en el cliente) → el server suma el contador global. Todos ven el mismo estado. Cuando
// llega a 100% (suma ponderada vs objetivo) se DESTRUYE la IA del satélite (endgame, D2). Persiste en PVC, PERMANENTE.
// Catálogo de partes = DATA: {max} = cupo por parte, {w} = peso en el progreso (gpu pesa más). El cliente tiene los precios.
const DC_PARTS = { cpu: { max: 60, w: 1 }, gpu: { max: 40, w: 3 }, disco: { max: 50, w: 1 }, red: { max: 30, w: 1 }, enfriamiento: { max: 20, w: 2 }, energia: { max: 20, w: 2 } };
// ── DEPLOY LOG (deploy-pipeline.md §3.1): el Workflow de deploy reporta acá su resultado → métrica
// tormenta_deploy_failed → PrometheusRule → Telegram. El dueño NO tiene que mirar: si falla, le llega.
const DEPLOYLOG_STORE = process.env.DEPLOYLOG_STORE || '/data/deploylog.json';
let DEPLOYLOG = { last: {}, hist: [] };            // last[component]={tag,status,wf,ts} · hist cap 100
function loadDeployLog() { try { const d = JSON.parse(fs.readFileSync(DEPLOYLOG_STORE, 'utf8')); if (d && d.last) DEPLOYLOG = d; } catch (e) {} }
function saveDeployLog() { try { fs.mkdirSync(DEPLOYLOG_STORE.replace(/\/[^/]*$/, '') || '/', { recursive: true }); fs.writeFileSync(DEPLOYLOG_STORE, JSON.stringify(DEPLOYLOG)); } catch (e) { console.error('deploylog save:', e.message); } }
loadDeployLog();
// IA/COSTOS (specs/ia-costos.md): reportes de los crons ia-health (6h) e ia-scout (diario) → PVC + gauges.
const IAREPORTS_STORE = process.env.IAREPORTS_STORE || '/data/ia-reports.json';
let IA_REPORTS = [];                                // últimos 60 (health + scout)
let IA_HEALTH = null;                               // el último health → gauges en /metrics → PrometheusRule → Telegram
let IA_TUNE_TS = 0;                                 // último cambio del override (aplicar o reset) → alerta informativa
function loadIaReports() { try { const d = JSON.parse(fs.readFileSync(IAREPORTS_STORE, 'utf8')); if (Array.isArray(d)) { IA_REPORTS = d; IA_HEALTH = d.filter(x => x.kind === 'health').pop() || null; } } catch (e) {} }
function saveIaReports() { try { fs.mkdirSync(IAREPORTS_STORE.replace(/\/[^/]*$/, '') || '/', { recursive: true }); fs.writeFileSync(IAREPORTS_STORE, JSON.stringify(IA_REPORTS)); } catch (e) { console.error('ia-reports save:', e.message); } }
loadIaReports();
// AUTOTUNE (specs/ia-costos.md §6): override RUNTIME de la cadena ANÓNIMA del chat, aplicado por el workflow
// ia-tune (scout→canary→aplicar→verificar punta a punta→rollback si falla). El env AI_MODEL queda como BASELINE
// (reset vuelve ahí). NO toca SUB_MODELS/SUB_OR_MODELS (el premium del dueño no se autotunea).
const IACHAIN_STORE = process.env.IACHAIN_STORE || '/data/ia-chain.json';
let IA_CHAIN = null;                                // { chat:[...], reason, ts, prev:[...] } | null = usar env
function loadIaChain() { try { const d = JSON.parse(fs.readFileSync(IACHAIN_STORE, 'utf8')); if (d && ((Array.isArray(d.chat) && d.chat.length) || (Array.isArray(d.gen) && d.gen.length) || (Array.isArray(d.banco) && d.banco.length))) IA_CHAIN = d; } catch (e) {} }
function saveIaChain() { try { fs.mkdirSync(IACHAIN_STORE.replace(/\/[^/]*$/, '') || '/', { recursive: true }); if (IA_CHAIN) fs.writeFileSync(IACHAIN_STORE, JSON.stringify(IA_CHAIN)); else { try { fs.unlinkSync(IACHAIN_STORE); } catch (e) {} } } catch (e) { console.error('ia-chain save:', e.message); } }
loadIaChain();
// ── CHECKPOINTS por nick (guardar-partida.md F3): el último hito de tu partida viaja entre dispositivos.
// Mismo patrón que barrio-mem: banco PVC + LRU + anti-spam. Cap 32KB por snapshot, 500 nicks (~16MB máx).
const CHECKPOINT_STORE = process.env.CHECKPOINT_STORE || '/data/checkpoints.json';
let CHECKPOINTS = {};                                      // nick -> { chk:{edge,title,ts,snap}, up:ts }
const CHK_POST_GAP = {};                                   // anti-spam: 1 POST cada 25s por nick
function loadCheckpoints() { try { CHECKPOINTS = JSON.parse(fs.readFileSync(CHECKPOINT_STORE, 'utf8')) || {}; } catch (e) { CHECKPOINTS = {}; } }
function saveCheckpoints() { try { fs.mkdirSync(CHECKPOINT_STORE.replace(/\/[^/]*$/, '') || '/', { recursive: true }); fs.writeFileSync(CHECKPOINT_STORE, JSON.stringify(CHECKPOINTS)); } catch (e) { console.error('checkpoints save:', e.message); } }
loadCheckpoints();
// ── MUNDO-AI (quest-mundo-ai.md §0, v2): la IA autora el TEMA (flavor + geometría opcional) de un mundo por SEED.
// Cacheado por seed (PVC + LRU 500, como los otros bancos): el MISMO seed SIEMPRE devuelve el MISMO tema (incluso el
// autorado por IA) → sigue siendo compartible aunque enriquezca. Sin esto, 2 pedidos del mismo seed podrían traer
// temas distintos (la IA no es determinista) y "mismo seed = mismo mundo" se rompería para el que lo comparte.
const MUNDO_STORE = process.env.MUNDO_STORE || '/data/mundo-ai.json';
let MUNDO_CACHE = {};                                       // seed(string) -> { j, ts }
function loadMundoCache() { try { MUNDO_CACHE = JSON.parse(fs.readFileSync(MUNDO_STORE, 'utf8')) || {}; } catch (e) { MUNDO_CACHE = {}; } }
function saveMundoCache() { try { fs.mkdirSync(MUNDO_STORE.replace(/\/[^/]*$/, '') || '/', { recursive: true }); fs.writeFileSync(MUNDO_STORE, JSON.stringify(MUNDO_CACHE)); } catch (e) { console.error('mundo-ai store save:', e.message); } }
function mundoCacheSet(seed, j) {
  MUNDO_CACHE[seed] = { j, ts: Date.now() };
  const keys = Object.keys(MUNDO_CACHE);
  if (keys.length > 500) { keys.sort((a, b) => MUNDO_CACHE[a].ts - MUNDO_CACHE[b].ts); for (const k of keys.slice(0, keys.length - 500)) delete MUNDO_CACHE[k]; }
  saveMundoCache();
}
loadMundoCache();
// ── QA REPORTE (autoplay-qa.md §2.2/F2): el CronWorkflow tormenta-autoplay publica acá su veredicto →
// métrica tormenta_qa_failed → PrometheusRule → Telegram + el prompt de auto-fix queda legible sin kubectl.
const QA_STORE = process.env.QA_STORE || '/data/qa.json';
let QA = null;                                     // { ok, meta, results, md, prompt, ts }
function loadQa() { try { QA = JSON.parse(fs.readFileSync(QA_STORE, 'utf8')); } catch (e) {} }
function saveQa() { try { fs.mkdirSync(QA_STORE.replace(/\/[^/]*$/, '') || '/', { recursive: true }); fs.writeFileSync(QA_STORE, JSON.stringify(QA)); } catch (e) { console.error('qa store save:', e.message); } }
loadQa();
const DC_STORE = process.env.DATACENTER_STORE || '/data/datacenter.json';
const DC_RATE_MS = 8000;                          // 1 aporte cada 8s por pid (que sea COLABORATIVO, no lo termina uno solo)
const DC_SEASON_MULT = 0.25;                      // cada temporada (D2) sube los cupos un 25% → "se reinicia a una v2 más cara"
const dcLast = new Map();                         // pid -> ts del último aporte
let DATACENTER = { season: 1, parts: {}, contributors: {}, done: false, doneAt: 0, ts: 0 };
for (const k in DC_PARTS) DATACENTER.parts[k] = 0;
function dcEffMax(k) { return Math.round(DC_PARTS[k].max * (1 + DC_SEASON_MULT * ((DATACENTER.season || 1) - 1))); }   // cupo de la TEMPORADA actual
function dcTotal() { let s = 0; for (const k in DC_PARTS) s += dcEffMax(k) * DC_PARTS[k].w; return s; }
function loadDatacenter() { try { const d = JSON.parse(fs.readFileSync(DC_STORE, 'utf8')); if (d && d.parts) { DATACENTER.season = d.season || 1; for (const k in DC_PARTS) DATACENTER.parts[k] = +d.parts[k] || 0; DATACENTER.contributors = d.contributors || {}; DATACENTER.done = !!d.done; DATACENTER.doneAt = d.doneAt || 0; DATACENTER.ts = d.ts || 0; } } catch (e) {} }
function saveDatacenter() { try { fs.mkdirSync(DC_STORE.replace(/\/[^/]*$/, '') || '/', { recursive: true }); fs.writeFileSync(DC_STORE, JSON.stringify(DATACENTER)); } catch (e) { console.error('datacenter store save:', e.message); } }
function dcProgress() { let s = 0; for (const k in DC_PARTS) s += Math.min(DATACENTER.parts[k] || 0, dcEffMax(k)) * DC_PARTS[k].w; return s / dcTotal(); }
function dcState() {
  const top = Object.entries(DATACENTER.contributors).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([pid, n]) => ({ pid: pid.slice(-4), n }));
  const caps = {}; for (const k in DC_PARTS) caps[k] = dcEffMax(k);
  return { season: DATACENTER.season || 1, parts: DATACENTER.parts, caps, progress: dcProgress(), done: !!DATACENTER.done, doneAt: DATACENTER.doneAt || 0, contributors: Object.keys(DATACENTER.contributors).length, top, updated: DATACENTER.ts };
}
// arranca una TEMPORADA NUEVA (D2): sube de season (cupos +25%), resetea partes/contribuyentes, done→false. Lo dispara el dueño/cron.
function dcNewSeason() { DATACENTER.season = (DATACENTER.season || 1) + 1; for (const k in DC_PARTS) DATACENTER.parts[k] = 0; DATACENTER.contributors = {}; DATACENTER.done = false; DATACENTER.doneAt = 0; DATACENTER.ts = Date.now(); saveDatacenter(); }
loadDatacenter();
// CARTELES de la IA (C2): cuántos puede dejar la IA por piso = 30% del cupo (siempre queda lugar para jugadores).
const CARTELES_AI_MAX = Math.max(1, Math.floor(CARTELES_CAP * 0.30));

// SALÓN — multijugador F1 (specs/multijugador.md): presencia EN VIVO para el piso "Cine EN VIVO". Relay liviano,
// in-memory (se pierde al reiniciar = ok, es social). POST /salon/beat {pid,sala,ev?} · GET /salon/live →
// {count, byRoom, ticker}. (El bodegón real-time F2 irá a un salon-server SSE dedicado; esto es el prototipo F1.)
const SALON = new Map();            // pid -> { sala, ts }
let SALON_TICK = [];                // ring de hitos recientes anónimos: [{ ev, ts }]
const SALON_TTL = 35000;            // un jugador cuenta "jugando ahora" 35s tras su último beat
const MINIGAME_STARTS = {};         // métrica: contador de partidas iniciadas por mini-juego (corte/1v1/6)
function salonPrune() { const now = Date.now(); for (const [k, v] of SALON) if (now - v.ts > SALON_TTL) SALON.delete(k); }
// IP REAL del cliente (detrás de HAProxy/Cilium): X-Forwarded-For (1ª) → X-Real-IP → socket. Para VALIDAR sesiones (admin).
function clientIp(req) { const xff = (req.headers['x-forwarded-for'] || '').split(',')[0].trim(); return xff || req.headers['x-real-ip'] || (req.socket && req.socket.remoteAddress) || '?'; }

// BODEGÓN F2b (real-time): sala-instancia -> { peers: Map<pid,estado>, subs: Set<res SSE> }. Matchmaking simple:
// llena la 1ª sala con lugar (para que la gente SE ENCUENTRE), si no abre otra. Prune de peers viejos (sin pos 20s).
const BODEGON = new Map(); const BODEGON_CAP = 6, BODEGON_TTL = 20000; let BODEGON_SEQ = 0;
// MESAS de truco SERVER-AUTHORITATIVE (specs/multijugador.md): el server PAREA a los jugadores (rendezvous) y emite
// table-start; la partida en sí vive en los clientes (whisper host↔guests). Caps: 1v1=2, 6=6. El 6 arranca por
// cuenta regresiva (≥2 jugadores) o al llenarse. Tras emitir table-start, la mesa se VACÍA (queda libre para otra).
// ESPACIOS (specs/lavalle-multijugador.md §1): cada espacio tiene su POOL de rooms y su set de mesas. Retro-compat:
// sin `space` → 'bodegon' (comportamiento actual). 'lavalle' = el piquete co-op ("Aguantar el corte", cap 6).
const SPACE_TABLES = { bodegon: { '1v1': 2, '6': 6 }, lavalle: { corte: 6, soga: 6, bombo: 6, olla: 6, pancarta: 6 } };
const TABLE_CAP = { '1v1': 2, '6': 6, corte: 6, soga: 6, bombo: 6, olla: 6, pancarta: 6 }; const TABLE_COUNTDOWN = 8000;
// cuenta regresiva POR mesa: las co-op de Lavalle arrancan RÁPIDO (3s, jugables solo) — el truco de 6 espera más para juntar gente
const CD_MS = { '6': 8000, corte: 3000, soga: 3000, bombo: 3000, olla: 3000, pancarta: 3000 };
const CD_TABLES = new Set(['6', 'corte', 'soga', 'bombo', 'olla', 'pancarta']);   // mesas que arrancan por cuenta regresiva o al llenarse (las demás = solo al llenarse)
const CD_MIN = { '6': 2, corte: 1, soga: 1, bombo: 1, olla: 1, pancarta: 1 };     // mínimo de jugadores para arrancar por cuenta regresiva (co-op = arranca solo)
const mkTable = () => ({ seats: new Map(), state: 'waiting', startAt: 0 });
function bodegonRoom(id, space) {
  let r = BODEGON.get(id);
  if (!r) { space = space || id.split('-')[0] || 'bodegon'; const tdef = SPACE_TABLES[space] || SPACE_TABLES.bodegon;
    const tables = {}; for (const nm in tdef) tables[nm] = mkTable();
    r = { peers: new Map(), subs: new Set(), streams: new Map(), space, tables }; BODEGON.set(id, r); }
  return r;
}
function bodegonJoin(space) { space = SPACE_TABLES[space] ? space : 'bodegon'; bodegonPrune();
  for (const [id, r] of BODEGON) if (r.space === space && r.peers.size < BODEGON_CAP) return id;
  const id = space + '-' + (++BODEGON_SEQ); bodegonRoom(id, space); return id; }
function bodegonBroadcast(r, ev, data) { const line = 'event: ' + ev + '\ndata: ' + JSON.stringify(data) + '\n\n'; for (const s of r.subs) { try { s.write(line); } catch (e) { r.subs.delete(s); } } }
const tableView = t => ({ seats: [...t.seats.values()].map(s => ({ pid: s.pid, nick: s.nick })), state: t.state });
function tableSit(r, name, pid, nick) {
  const t = r.tables[name]; if (!t || t.state === 'playing') return;
  if (!t.seats.has(pid) && t.seats.size >= TABLE_CAP[name]) return;        // mesa llena
  t.seats.set(pid, { pid, nick, ts: Date.now() });
  if (CD_TABLES.has(name) && t.seats.size >= (CD_MIN[name] || 2) && !t.startAt) t.startAt = Date.now() + (CD_MS[name] || TABLE_COUNTDOWN);
  bodegonBroadcast(r, 'table-update', { table: name, ...tableView(t) });
  tableMaybeStart(r, name);
}
function tableLeavePid(r, name, pid) {
  const t = r.tables[name]; if (!t || !t.seats.has(pid)) return false;
  t.seats.delete(pid);
  if (t.seats.size < (CD_MIN[name] || 2)) t.startAt = 0;
  bodegonBroadcast(r, 'table-update', { table: name, ...tableView(t) });
  return true;
}
function tableMaybeStart(r, name) {
  const t = r.tables[name]; if (!t || t.state !== 'waiting') return;
  const n = t.seats.size, cap = TABLE_CAP[name];
  const ready = CD_TABLES.has(name) ? (n >= cap || (n >= (CD_MIN[name] || 2) && t.startAt && Date.now() >= t.startAt)) : (n >= cap);
  if (!ready) return;
  const seats = [...t.seats.keys()], seed = (Math.random() * 1e9) | 0;     // orden de llegada (Map lo preserva)
  MINIGAME_STARTS[name] = (MINIGAME_STARTS[name] || 0) + 1;                // métrica: cuántas partidas de cada mini-juego arrancaron
  bodegonBroadcast(r, 'table-start', { table: name, host: seats[0], seats, seed });
  t.seats.clear(); t.startAt = 0;                                         // mesa libre para la próxima (la partida ya vive en los clientes)
  bodegonBroadcast(r, 'table-update', { table: name, ...tableView(t) });
}
function bodegonDropFromTables(r, pid) { for (const name in r.tables) tableLeavePid(r, name, pid); }
function bodegonLeave(roomId, pid) { const r = BODEGON.get(roomId); if (r) { bodegonDropFromTables(r, pid); if (r.peers.delete(pid)) bodegonBroadcast(r, 'peer-leave', { pid }); } }
function bodegonPrune() { const now = Date.now(); for (const [id, r] of BODEGON) { for (const [pid, p] of r.peers) if (now - p.ts > BODEGON_TTL) { bodegonDropFromTables(r, pid); r.peers.delete(pid); bodegonBroadcast(r, 'peer-leave', { pid }); } if (r.peers.size === 0 && r.subs.size === 0) BODEGON.delete(id); } }
setInterval(bodegonPrune, 8000);
setInterval(() => { for (const r of BODEGON.values()) for (const nm in r.tables) if (CD_TABLES.has(nm)) tableMaybeStart(r, nm); }, 1000);   // cuenta regresiva (mesa 6 / corte)
// TOPE DURO de latencia: el linyera no puede tardar >10s. Cortamos el upstream a 8s; el cliente espera 9s.
const UPSTREAM_TIMEOUT = +process.env.UPSTREAM_TIMEOUT_MS || 8000;    // presupuesto TOTAL del CHAT (tope duro, tiempo real)
const PER_MODEL_TIMEOUT = +process.env.PER_MODEL_TIMEOUT_MS || 4000;  // tope POR modelo → entran 2 intentos en 8s
// tope de tokens de la respuesta del CHAT: MÁS CORTO = más rápido y confiable (las personas piden frases cortas
// igual). Con 220 el modelo pago escribía largo y pasaba el PER_MODEL_TIMEOUT → timeout. 150 ≈ 3-4 frases y ~3-4s.
const CHAT_MAX_TOKENS = +process.env.CHAT_MAX_TOKENS || 150;
// GENERACIÓN del dueño (niveles/tiendas/historias, opts.gen): NO es el chat en tiempo real. Antes usaba la misma
// cadena free-first → los free lentos se comían el presupuesto y el PAGO (al final) ni se probaba → caía a estático
// aunque hubiera pago. Fix: gen usa SOLO el/los modelo(s) pago confiables (estadísticamente mejores), con más tiempo.
const GEN_MODELS = (process.env.GEN_MODELS || 'gemma4-paid').split(',').map(s => s.trim()).filter(Boolean);
const GEN_TIMEOUT = +process.env.GEN_TIMEOUT_MS || 16000;             // presupuesto TOTAL de gen (más holgado que el chat)
const GEN_PER_MODEL = +process.env.GEN_PER_MODEL_MS || 14000;         // un modelo de 31B tarda varios seg en escupir el JSON
// Métricas prometheus (para Grafana): requests, timeouts, errores y suma/cuenta de duración (→ latencia media).
const M = { requests: 0, timeouts: 0, errors: 0, fallbackLines: 0, durMsSum: 0, durCount: 0 };
// Métricas ETIQUETADAS por uso (qué modelo/backend/resultado). Labels acotados (sin PII).
const CHAT = {};                       // 'model="..",backend="..",outcome=".."' -> count
const LAT_BUCKETS = [0.5, 1, 2, 3, 4, 5, 6, 8, 10];
const LAT = {};                        // 'model|backend' -> { c:[...], inf, sum, n }
function backendOf(model) {            // model_name → backend (OpenRouter / GPU / NPU)
  if (!model) return '-';
  const m = model.toLowerCase();
  if (m.includes('npu') || m.includes('rk1')) return 'npu';
  if (m.includes('gpu') || m.includes('linyera') || /gemma2|qwen2\.5|llama3\.|mistral-nemo/.test(m)) return 'gpu';
  if (m.includes('paid') || m.includes('gpt-4o') || m.includes('haiku') || m.includes('gemini')) return 'openrouter-paid';
  return 'openrouter';                 // *-free, etc.
}
function incChat(model, backend, outcome, persona) {
  const k = `model="${model}",backend="${backend}",outcome="${outcome}",persona="${cleanLbl(persona || '-', 20)}"`;
  CHAT[k] = (CHAT[k] || 0) + 1;
}
// Intentos POR modelo de la cadena (llm-metrics F1): result ∈ ok|timeout|http_429|http_404|http_other|empty.
// Así sabemos QUÉ free se está cayendo (antes los fallos iban a model="-").
const ATTEMPT = {};
function incAttempt(model, result) {
  const k = `model="${model}",result="${result}"`;
  ATTEMPT[k] = (ATTEMPT[k] || 0) + 1;
}
function obsLatency(model, backend, sec) {
  const k = `${model}|${backend}`;
  const h = LAT[k] || (LAT[k] = { c: new Array(LAT_BUCKETS.length).fill(0), inf: 0, sum: 0, n: 0 });
  h.sum += sec; h.n += 1;
  let placed = false;
  for (let i = 0; i < LAT_BUCKETS.length; i++) { if (sec <= LAT_BUCKETS[i]) { h.c[i] += 1; placed = true; break; } }
  if (!placed) h.inf += 1;
}
// Métricas de USO DEL JUEGO (telemetría del cliente, agregada, SIN PII). Labels acotados por whitelist
// para que no explote la cardinalidad. Sirve para "¿cuántos en v1 vs v2?" + funnel (storm/truco/win/death).
const GAME = {};                          // 'event="..",engine="..",result="..",lang=".."' -> count
const GAME_EVENTS = new Set(['session', 'storm', 'truco', 'death', 'win', 'error', 'engine_fallback', 'chat', 'freeze', 'minigame', 'quest', 'arcade', 'playtime', 'nan']);
const cleanLbl = (v, max) => String(v == null ? '' : v).replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, max || 16);
function incGame(ev) {
  const e = cleanLbl(ev && ev.e, 24);
  if (!GAME_EVENTS.has(e)) return;        // solo eventos conocidos (anti-cardinalidad / anti-abuso)
  const k = `event="${e}",engine="${cleanLbl(ev.engine)}",result="${cleanLbl(ev.result)}",lang="${cleanLbl(ev.lang, 4)}"`;
  GAME[k] = (GAME[k] || 0) + 1;
}
const MODEL_ENV = process.env.AI_MODEL || process.env.OPENROUTER_MODEL;
const MODELS = MODEL_ENV ? MODEL_ENV.split(',').map(s => s.trim()).filter(Boolean) : [
  'meta-llama/llama-3.3-70b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
  'deepseek/deepseek-chat-v3-0324:free',
];
if (!KEY) { console.error('Falta AI_API_KEY (o OPENROUTER_API_KEY)'); process.exit(1); }

const RATE = new Map();                 // ip -> [timestamps] (máx 12 por minuto)

// --- CUPO POR SESIÓN/DÍA (anti-DoS + anti-quema de tokens) ---------------------------
// OJO con la IP: detrás del G4 (HAProxy en mode tcp / SNI passthrough) el pod ve SIEMPRE la IP del
// edge, no la del jugador (en tcp no hay X-Forwarded-For). Por eso el cupo se llavea por el
// session-id del cliente (header X-Session-Id, UUID estable en su localStorage) con fallback a IP.
// Esto frena loops/spam honestos; el tope DURO de plata es PAID_DAILY_CAP (independiente de sesión).
// Cuando se pasa el cupo: NO se llama al upstream (no se quema NI un token) y se sirve un mensaje EN
// PERSONAJE que ofrece esperar, traer tu propia API key (BYOK) o suscribirte.
const DAILY_CAP = +process.env.DAILY_CAP || 40;          // chats/día por sesión (0 = sin tope)
const DAY = new Map();                                    // key(sid|ip) -> { day:'YYYY-MM-DD', n }
const dayKey = () => new Date().toISOString().slice(0, 10);
function dailyRec(k) {
  const d = dayKey(); let r = DAY.get(k);
  if (!r || r.day !== d) { r = { day: d, n: 0 }; DAY.set(k, r); }
  return r;
}
function dailyLeft(k) { return DAILY_CAP <= 0 ? Infinity : Math.max(0, DAILY_CAP - dailyRec(k).n); }
function dailyHit(k) { dailyRec(k).n++; }

// Únicos del día (para "¿cuántos usuarios tengo?"): contamos session-ids e IPs DISTINTAS hoy.
// Van como GAUGE (size del Set), NUNCA como label → cero cardinalidad/PII. El cruce fino
// "qué hace cada IP/sesión" sale del LOG estructurado por request (a Loki), no de las métricas.
const UNIQ = { day: dayKey(), sids: new Set(), ips: new Set() };
function seenToday(sid, ip) {
  const d = dayKey();
  if (UNIQ.day !== d) { UNIQ.day = d; UNIQ.sids = new Set(); UNIQ.ips = new Set(); }
  if (sid && UNIQ.sids.size < 200000) UNIQ.sids.add(sid);          // tope de memoria por las dudas
  if (ip && ip !== '?' && UNIQ.ips.size < 200000) UNIQ.ips.add(ip);
}

// --- PRESUPUESTO PAGO GLOBAL (tope DURO de gasto) -------------------------------------
// Solo los modelos PAGOS cuestan plata. Limitamos cuántas respuestas pagas/día en TOTAL
// (sumando a todos los jugadores). Si se agota, el chat NO llama al pago: cae al pool (el free
// igual se intenta). Así el techo de gasto está GARANTIZADO pase lo que pase con el tráfico.
const PAID_MODELS = new Set((process.env.PAID_MODELS || 'cheap,paid-final').split(',').map(s => s.trim()).filter(Boolean));
const PAID_DAILY_CAP = +process.env.PAID_DAILY_CAP || 600;   // respuestas pagas/día (todos los users; 0 = sin pago)
let PAID = { day: dayKey(), n: 0 };
function paidRoll() { const d = dayKey(); if (PAID.day !== d) PAID = { day: d, n: 0 }; return PAID; }
function paidLeft() { return PAID_DAILY_CAP <= 0 ? 0 : Math.max(0, PAID_DAILY_CAP - paidRoll().n); }
function paidHit() { paidRoll().n++; }

// --- SUSCRIPCIÓN por CÓDIGO (suscripcion.md §9 F1) -----------------------------------
// Entitlement MANUAL: códigos válidos por env SUB_CODES (+ POST /sub-codes con GEN_TOKEN en runtime).
// Un código válido en el header X-Sub-Code → tier PAGO: salta el free y el cupo del free, va DIRECTO a la
// cadena paga (SUB_MODELS) → siempre IA real rápida, sin pool. Email/DB/pago/key-por-código = fases que siguen.
const SUB_CODES = new Set((process.env.SUB_CODES || '').split(',').map(s => s.trim()).filter(Boolean));
// Los códigos agregados en RUNTIME (POST /sub-codes) PERSISTEN en PVC → sobreviven reinicios/redeploys (antes eran
// solo en memoria y cada restart los borraba, matando las suscripciones manuales). Se fusionan con los del env.
const SUBCODES_STORE = process.env.SUBCODES_STORE || '/data/subcodes.json';
function loadSubCodes() { try { const a = JSON.parse(fs.readFileSync(SUBCODES_STORE, 'utf8')); if (Array.isArray(a)) a.forEach(c => c && SUB_CODES.add(String(c))); } catch (e) {} }
function saveSubCodes() { try { fs.mkdirSync(SUBCODES_STORE.replace(/\/[^/]*$/, '') || '/', { recursive: true }); fs.writeFileSync(SUBCODES_STORE, JSON.stringify([...SUB_CODES])); } catch (e) { console.error('subcodes store save:', e.message); } }
loadSubCodes();
const SUB_MODELS = (process.env.SUB_MODELS || 'gemma4-paid,claude-sonnet').split(',').map(s => s.trim()).filter(Boolean);
const SUB_USAGE = {};                          // code(corto) -> count (volumen por código; cardinalidad = #códigos)
const SUB_COST = {};                           // code(corto) -> US$ acumulado (gasto por código)
const SUB_TOK = {};                            // code(corto) -> tokens acumulados
const subShort = c => (c || '').slice(0, 12).replace(/[^a-zA-Z0-9_-]/g, '');
function isSub(code) {                                    // env (compartido) o provisionado (key propia, no vencido)
  if (!code) return false;
  if (SUB_CODES.has(code)) return true;
  const r = STORE[code];
  return !!r && (!r.expiresAt || r.expiresAt > Date.now());   // vencido → ya no es pago
}
function subHit(code) { const k = subShort(code) || '-'; SUB_USAGE[k] = (SUB_USAGE[k] || 0) + 1; }
// Precios US$/1M tokens {in,out} de los modelos PAGOS que usamos (para estimar gasto por código). Override
// por env MODEL_PRICES (JSON). Estimación: tokens del usage × precio → cuánto gastó cada usuario que pagó.
let MODEL_PRICES = { 'gemma4-paid': { in: 0.12, out: 0.35 }, 'claude-sonnet': { in: 3, out: 15 } };
try { if (process.env.MODEL_PRICES) MODEL_PRICES = Object.assign(MODEL_PRICES, JSON.parse(process.env.MODEL_PRICES)); } catch (e) {}
function costUsd(model, usage) {               // US$ estimado de una respuesta (0 si no sé el precio del modelo)
  const p = MODEL_PRICES[model]; if (!p || !usage) return 0;
  return (usage.prompt_tokens || 0) / 1e6 * p.in + (usage.completion_tokens || 0) / 1e6 * p.out;
}
function subCharge(code, model, usage) {       // acumula gasto + tokens del código (por uso pago)
  const k = subShort(code) || '-';
  SUB_COST[k] = (SUB_COST[k] || 0) + costUsd(model, usage);
  SUB_TOK[k] = (SUB_TOK[k] || 0) + ((usage && usage.total_tokens) || 0);
}

// --- MEMORIA DEL BARRIO cross-device (npcs-vivos F4d+): lo notable que hizo un jugador, POR NICK ------
// GET /barrio-mem?nick=X → {mem:[{ev,detail,t}]} · POST /barrio-mem {nick, mem:[...]} (merge, cap 30/nick).
// El nick ya es público en el salón (peers) → misma postura de privacidad. PVC + LRU de 4000 nicks. ADITIVO.
const BARRIOMEM_STORE = process.env.BARRIOMEM_STORE || '/data/barriomem.json';
let BARRIOMEM = {};                                        // nick -> { mem:[...], up:ts }
const BM_POST_GAP = {};                                    // anti-spam: 1 POST cada 20s por nick
function loadBarrioMem() { try { BARRIOMEM = JSON.parse(fs.readFileSync(BARRIOMEM_STORE, 'utf8')) || {}; } catch (e) { BARRIOMEM = {}; } }
function saveBarrioMem() { try { fs.mkdirSync(BARRIOMEM_STORE.replace(/\/[^/]*$/, '') || '/', { recursive: true }); fs.writeFileSync(BARRIOMEM_STORE, JSON.stringify(BARRIOMEM)); } catch (e) { console.error('barriomem save:', e.message); } }
loadBarrioMem();
const bmNick = n => String(n == null ? '' : n).replace(/[^\wáéíóúñÁÉÍÓÚÑ·.-]/g, '').slice(0, 24);
function bmMerge(nick, incoming) {
  const cur = (BARRIOMEM[nick] && BARRIOMEM[nick].mem) || [];
  const seen = new Set(cur.map(e => e.ev + '|' + e.t));
  for (const e of (Array.isArray(incoming) ? incoming : []).slice(0, 30)) {
    if (!e || !e.ev) continue;
    const clean = { ev: String(e.ev).slice(0, 24), detail: String(e.detail == null ? '' : e.detail).slice(0, 48), t: +e.t || Date.now() };
    if (!seen.has(clean.ev + '|' + clean.t)) { cur.push(clean); seen.add(clean.ev + '|' + clean.t); }
  }
  cur.sort((a, b) => a.t - b.t);
  BARRIOMEM[nick] = { mem: cur.slice(-30), up: Date.now() };
  const nicks = Object.keys(BARRIOMEM);                    // LRU: si nos pasamos de 4000 nicks, vuelan los más viejos
  if (nicks.length > 4000) { nicks.sort((a, b) => (BARRIOMEM[a].up || 0) - (BARRIOMEM[b].up || 0)); for (const n of nicks.slice(0, nicks.length - 4000)) delete BARRIOMEM[n]; }
  saveBarrioMem();
}

// --- F3: key-por-código (OpenRouter provisioning) + store JSON-en-PVC (suscripcion.md §9.6) ----------
// El proxy crea una key de OpenRouter POR código (con budget) y la guarda en un archivo JSON (PVC). Un sub con
// key provisionada va DIRECTO a OpenRouter con SU key → gasto y tope reales por usuario. Sin DB ni deps (Node20).
const OR_BASE = 'https://openrouter.ai/api/v1';
const PROV_KEY = (process.env.OPENROUTER_PROVISIONING_KEY || '').trim();   // Secret tormenta-or-provisioning
const SUB_OR_MODELS = (process.env.SUB_OR_MODELS || 'google/gemma-4-31b-it,anthropic/claude-sonnet-4.5').split(',').map(s => s.trim()).filter(Boolean);
const SUBS_STORE = process.env.SUBS_STORE || '/data/subs.json';            // mapeo código→key (PVC)
const DEFAULT_SUB_LIMIT = +process.env.SUB_LIMIT_USD || 1;                 // budget US$ por key (tope por usuario)
const SUB_TTL_DAYS = +process.env.SUB_TTL_DAYS || 30;                      // vencimiento del código (1 mes)
let STORE = {};                                                            // { code: {email, orKey, hash, limit, createdAt} }
function loadStore() { try { STORE = JSON.parse(fs.readFileSync(SUBS_STORE, 'utf8')) || {}; } catch (e) { STORE = {}; } }
function saveStore() { try { fs.mkdirSync(SUBS_STORE.replace(/\/[^/]*$/, '') || '/', { recursive: true }); fs.writeFileSync(SUBS_STORE, JSON.stringify(STORE)); } catch (e) { console.error('subs store save:', e.message); } }
loadStore();
const genCode = () => 'TS-' + [...crypto.getRandomValues(new Uint8Array(7))].map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
async function orCreateKey(label, limitUsd) {        // POST /keys con la provisioning key → {key, hash}
  if (!PROV_KEY) throw new Error('falta OPENROUTER_PROVISIONING_KEY');
  const r = await fetch(OR_BASE + '/keys', { method: 'POST', headers: { 'Authorization': 'Bearer ' + PROV_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: label, limit: limitUsd }) });
  if (!r.ok) throw new Error('OR createKey ' + r.status + ' ' + (await r.text().catch(() => '')).slice(0, 200));
  const d = await r.json();
  return { key: d.key, hash: d.data && d.data.hash };
}
async function orKeyInfo(hash) {                     // GET /keys/{hash} → usage/limit (gasto real)
  if (!PROV_KEY || !hash) return null;
  const r = await fetch(OR_BASE + '/keys/' + hash, { headers: { 'Authorization': 'Bearer ' + PROV_KEY } });
  if (!r.ok) return null;
  return (await r.json()).data || null;
}
// Poller: cada 5 min refresca el gasto REAL por código desde OpenRouter → a /metrics (Grafana lo muestra
// solo, sin comandos). Así "quién pagó cuánto gasta" se LEE en el dashboard, no por curl.
let SUB_REAL = {};                                   // code -> { usage(US$), limit(US$), disabled }
async function refreshSpend() {
  for (const [code, r] of Object.entries(STORE)) {
    try { const info = await orKeyInfo(r.hash); if (info) SUB_REAL[code] = { usage: +info.usage || 0, limit: +r.limit || 0, disabled: !!info.disabled }; } catch (e) {}
  }
}
if (PROV_KEY) { refreshSpend(); setInterval(refreshSpend, 5 * 60 * 1000).unref?.(); }

// Log estructurado por request (JSON a stdout) → promtail/Loki. Acá SÍ va el detalle fino
// (session-id, ip, npc, modelo, resultado) para cruzar "qué hace cada sesión/IP" sin inflar
// la cardinalidad de Prometheus. Si la ip real llega (PROXY protocol), queda registrada igual.
function reqLog(o) { try { console.log(JSON.stringify({ t: Date.now(), kind: 'chat', ...o })); } catch (e) {} }

// --- F2 ModelScorer (openrouter-dinamico §5): arma la cadena "más barato-bueno" sola -----------------
// Cruza señales REALES que ya tenemos: disponibilidad (ATTEMPT: ok vs 429/timeout/...), latencia (LAT)
// y precio (OR_PRICES, del cron). Candados de llm-metrics §12: PISO fijo (FLOOR nunca falta), PAGO siempre
// ÚLTIMO (red), HISTÉRESIS (recalcula como mucho 1×/CHAIN_TTL, no por request → no flapea), OVERRIDE
// (AUTOPILOT off → usa la cadena estática AI_MODEL). Default OFF: no cambia el ruteo salvo que lo prendas.
const CANDIDATES = (process.env.CANDIDATES || '').split(',').map(s => s.trim()).filter(Boolean);
const AUTOPILOT = /^(1|true|on|yes)$/i.test(process.env.AUTOPILOT || '');
const FLOOR = (process.env.FLOOR_MODEL || MODELS[0] || '').trim();    // modelo que NUNCA puede faltar de la cadena
const CHAIN_TTL = +process.env.CHAIN_TTL_MS || 60000;                 // histéresis: no recalcular más de 1×/min
const CHAIN_MAX = +process.env.CHAIN_MAX || 3;                        // tope de largo (presupuesto de tiempo)
const PAID_IN_CHAIN = +process.env.PAID_IN_CHAIN || 1;               // cuántos pagos entran al final (cheap-first + premium de respaldo)
function priceOf(m) {                                                 // US$/token (prompt+completion); free → 0
  const p = OR_PRICES[m];                                             // best-effort (match directo por model_name)
  return p ? (+p.prompt || 0) + (+p.completion || 0) : 0;
}
function statsOf(m) {
  let ok = 0, bad = 0;
  for (const k in ATTEMPT) { if (!k.startsWith(`model="${m}",`)) continue; if (k.includes('result="ok"')) ok += ATTEMPT[k]; else bad += ATTEMPT[k]; }
  const tries = ok + bad, okRate = tries ? ok / tries : 0.5;         // sin datos → neutro
  let lsum = 0, ln = 0;
  for (const k in LAT) { if (k.split('|')[0] === m) { lsum += LAT[k].sum; ln += LAT[k].n; } }
  const avgMs = ln ? (lsum / ln) * 1000 : 0;
  const paid = PAID_MODELS.has(m), price = priceOf(m);
  // score sólo para ORDENAR los free entre sí: prioriza disponibilidad, penaliza latencia (y precio si lo hay)
  const score = okRate - Math.min(avgMs, 8000) / 8000 * 0.4 - price * 1e5;
  return { model: m, okRate, avgMs, price, free: !paid, paid, tries, score };
}
let _chain = null, _chainTs = 0;
function buildChain() {
  const cands = CANDIDATES.length ? CANDIDATES : MODELS;
  const stats = cands.map(statsOf);
  const free = stats.filter(s => !s.paid).sort((a, b) => b.score - a.score).map(s => s.model);   // mejor-disponible primero
  if (FLOOR && !PAID_MODELS.has(FLOOR) && !free.includes(FLOOR)) free.push(FLOOR);                // PISO: nunca falta
  const paid = stats.filter(s => s.paid).sort((a, b) => a.price - b.price).map(s => s.model);     // pago: más barato primero
  // Reservo los ÚLTIMOS slots para la RED PAGA (hasta PAID_IN_CHAIN): el pago cierra la cadena (candado B),
  // más barato primero (gemma4-paid) y un premium de respaldo (claude-sonnet). El resto va a los free.
  const nPaid = Math.min(paid.length, PAID_IN_CHAIN);
  const nFree = Math.max(1, CHAIN_MAX - nPaid);
  return [...free.slice(0, nFree), ...paid.slice(0, nPaid)].slice(0, CHAIN_MAX);
}
function activeChain() {                                              // la que usa ask()
  if (IA_CHAIN && IA_CHAIN.chat && IA_CHAIN.chat.length) return IA_CHAIN.chat;   // AUTOTUNE: override runtime (verificado punta a punta por ia-tune)
  if (!AUTOPILOT) return MODELS;                                      // override: cadena estática AI_MODEL
  const now = Date.now();
  if (!_chain || now - _chainTs > CHAIN_TTL) { _chain = buildChain(); _chainTs = now; }   // histéresis
  return _chain;
}
function ranking() {                                                  // para /ranking + métricas (best/cheapest)
  const cands = CANDIDATES.length ? CANDIDATES : MODELS;
  return cands.map(statsOf).sort((a, b) => (a.paid - b.paid) || (b.score - a.score));
}
function allowed(ip) {
  const now = Date.now();
  const hits = (RATE.get(ip) || []).filter(t => now - t < 60000);
  if (hits.length >= 12) { RATE.set(ip, hits); return false; }
  hits.push(now); RATE.set(ip, hits); return true;
}

// Cuando OpenRouter tira 429 por "free-models-per-day/min" el límite es de la CUENTA del dev (todos los free
// comparten esa cuota), NO del modelo puntual. Entonces probar otro free es al pedo: bloqueamos TODOS los free
// hasta el reset y vamos derecho al pago/pool. Esto ahorra latencia con muchos usuarios jugando.
let FREE_BLOCKED_UNTIL = 0;
async function read429(r) {
  try {
    const body = await r.text();
    const perDay = /free-models-per-day/i.test(body);
    const perMin = /free-models-per-min/i.test(body);
    const account = perDay || perMin;                       // límite de CUENTA (no del modelo)
    let resetMs = 0;
    const m = body.match(/X-RateLimit-Reset"?\s*:\s*"?(\d{12,})/i);   // viene en ms (epoch) en metadata.headers
    if (m) resetMs = +m[1];
    if (perDay) { if (!resetMs || resetMs < Date.now()) resetMs = Date.now() + 30 * 60000; resetMs = Math.min(resetMs, Date.now() + 3 * 3600000); } // cap 3h
    else if (perMin) { resetMs = Date.now() + 90000; }      // per-min se libera solo en ~1 min
    return { account, perDay, resetMs };
  } catch (e) { return { account: false, perDay: false, resetMs: 0 }; }
}

// El modelo a veces escribe MÁS que max_tokens y OpenRouter lo corta A MITAD DE FRASE ("responden largo y se
// corta", reporte del dueño 2026-07-02). Si el finish fue por length → recortamos a la última frase COMPLETA
// (nunca mostrar el tajo); si no hay dónde cortar prolijo, puntos suspensivos honestos. Solo chat (no gen/JSON).
function tidyReply(text, finish) {
  let t = String(text).trim();
  if (finish !== 'length') return t;
  let cut = -1;
  for (const ch of ['.', '!', '?', '…']) cut = Math.max(cut, t.lastIndexOf(ch));
  if (cut >= 0 && /["”»)]/.test(t[cut + 1] || '')) cut++;          // el signo cierra comillas → llevalas
  if (cut >= Math.floor(t.length * 0.4)) return t.slice(0, cut + 1);
  return t + '…';
}

async function ask(messages, opts = {}) {
  const deadline = Date.now() + (opts.gen ? GEN_TIMEOUT : UPSTREAM_TIMEOUT);   // gen no es tiempo real → más holgado
  let timedOut = false;
  const direct = !!opts.orKey;                           // F3: sub con key propia → DIRECTO a OpenRouter (su gasto/tope)
  const base = direct ? OR_BASE : BASE;
  const authKey = direct ? opts.orKey : KEY;
  // gen (contenido del dueño): cadena de PAGO confiable directa (sin los free lentos que se comían el tiempo)
  const genChain = (IA_CHAIN && IA_CHAIN.gen && IA_CHAIN.gen.length) ? IA_CHAIN.gen : GEN_MODELS;   // autotune del patrón gen (specs/ia-costos.md §6)
  const chain = direct ? SUB_OR_MODELS : (opts.gen ? genChain : (opts.sub ? SUB_MODELS : activeChain()));
  for (const model of chain) {                           // cadena: si el 1º no contesta, prueba el 2º
    const left = deadline - Date.now();
    if (left <= 500) break;                              // sin tiempo → cortar y caer a la línea temática
    const isPaid = PAID_MODELS.has(model);
    // modelo PAGO sin presupuesto del día → saltarlo (sub no se capa; direct va con la key del usuario; gen = generación
    // de contenido del DUEÑO —niveles/tiendas— que SIEMPRE debe caer al pago si el free falla, sin cap)
    if (!direct && !opts.sub && !opts.gen && isPaid && paidLeft() <= 0) { incAttempt(model, 'paid_budget'); continue; }
    // free con la cuota de CUENTA agotada → no lo probamos (direct no aplica: key propia)
    if (!direct && !isPaid && Date.now() < FREE_BLOCKED_UNTIL) { incAttempt(model, 'free_blocked'); continue; }
    const slice = Math.min(left, opts.gen ? GEN_PER_MODEL : PER_MODEL_TIMEOUT);   // gen: más tiempo por modelo (JSON largo)
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), slice);
    try {
      const r = await fetch(base + '/chat/completions', {
        method: 'POST', signal: ctrl.signal,
        headers: { 'Authorization': 'Bearer ' + authKey, 'Content-Type': 'application/json', ...(direct ? { 'X-Title': 'Tormenta Solar' } : {}) },
        // 220 tokens de aire (antes 120: cortaba seguido a mitad de frase); las personas ya piden frases CORTAS
        body: JSON.stringify({ model, messages, temperature: 0.9, max_tokens: opts.maxTokens || 220, ...(opts.user ? { user: opts.user } : {}) }),
      });
      clearTimeout(to);
      if (r.status === 429) {
        const info = await read429(r);                     // ¿es límite de CUENTA (free-models-per-day) o del modelo?
        incAttempt(model, info.account ? 'http_429_acct' : 'http_429');
        if (info.account && !isPaid && info.resetMs > Date.now()) FREE_BLOCKED_UNTIL = Math.max(FREE_BLOCKED_UNTIL, info.resetMs);  // bloquea TODOS los free
        continue;                                           // → próximo (los free se saltean solos; queda el pago)
      }
      if (r.status === 404) { incAttempt(model, 'http_404'); continue; }   // no existe → próximo
      if (!r.ok) { incAttempt(model, 'http_other'); throw new Error('OpenRouter ' + r.status); }
      const d = await r.json();
      let reply = d.choices?.[0]?.message?.content;
      if (reply && !opts.gen) reply = tidyReply(reply, d.choices?.[0]?.finish_reason);   // chat: nunca mostrar el corte a mitad de frase
      if (reply) { incAttempt(model, 'ok'); if (!opts.sub && !direct && PAID_MODELS.has(model)) paidHit(); return { reply: reply.trim(), model, usage: d.usage }; }   // ← qué modelo ganó (+ tokens para el gasto por código)
      incAttempt(model, 'empty');                            // 200 pero sin texto → próximo modelo
    } catch (e) {
      clearTimeout(to);
      if (e.name === 'AbortError') { incAttempt(model, 'timeout'); M.timeouts++; timedOut = true; continue; }  // este tardó → probá el siguiente
      /* otro error (ya contado http_other) → probá el siguiente modelo */
    }
  }
  const err = new Error(timedOut ? 'upstream timeout' : 'todos los modelos fallaron');
  err.timedOut = timedOut;
  throw err;
}

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // OJO: estos headers custom (X-Session-Id cupo, X-Sub-Code suscripción) DEBEN estar acá o el navegador
  // bloquea el POST cross-origin en el preflight → el chat caía al pool. Es CORS, no el modelo.
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-Id, X-Sub-Code');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Max-Age', '86400');   // cachea el preflight 1 día (menos OPTIONS)
  // HEADERS DE SEGURIDAD (specs/seguridad.md §4): es una API (JSON/audio), no sirve HTML interactivo → CSP mínimo +
  // anti-sniff + anti-frame. No tocan el CORS de arriba (que el juego necesita para el POST cross-origin).
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  if (req.method === 'GET' && (req.url === '/health' || req.url === '/healthz')) { res.writeHead(200); return res.end('ok'); }   // probe k8s
  // TTS del servidor (espeak-ng) → WAV. Para navegadores SIN voz (Chromium/Linux): el juego pide el audio y lo
  // reproduce por WebAudio (el mismo canal que la música, que sí suena). GET ?text=...&lang=es|en. Texto acotado.
  if (req.method === 'GET' && req.url.startsWith('/tts')) {
    const u = new URL(req.url, 'http://x');
    const text = (u.searchParams.get('text') || '').slice(0, 600).trim();
    const voice = (u.searchParams.get('lang') || 'es').toLowerCase().startsWith('en') ? 'en-us' : 'es-419';
    if (!text) { res.writeHead(400); return res.end('no text'); }
    try {
      const ng = spawn('espeak-ng', ['-v', voice, '-s', '160', '-p', '35', '--stdout']);   // grave+criollo, lee de stdin (sin shell = sin inyección)
      const chunks = [];
      ng.stdout.on('data', d => chunks.push(d));
      ng.on('error', () => { try { res.writeHead(500); res.end('tts-err'); } catch (e) {} });
      ng.on('close', () => { try { res.writeHead(200, { 'Content-Type': 'audio/wav', 'Cache-Control': 'public, max-age=86400' }); res.end(Buffer.concat(chunks)); } catch (e) {} });
      ng.stdin.on('error', () => {}); ng.stdin.write(text); ng.stdin.end();
    } catch (e) { res.writeHead(500); res.end('tts-spawn'); }
    return;
  }
  if (req.method === 'GET' && req.url === '/linyera-pool') {                       // pool de saturación (lo trae el cliente)
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600' });
    return res.end(JSON.stringify({ pool: LINYERA_POOL || {}, updated: LINYERA_POOL_TS }));
  }
  if (req.method === 'GET' && req.url === '/precios') {                            // precios de modelos (OpenRouter)
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600' });
    return res.end(JSON.stringify({ prices: OR_PRICES, updated: OR_TS }));
  }
  if (req.method === 'GET' && req.url === '/novedades') {                          // modelos interesantes (landing/juego)
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=1800' });
    return res.end(JSON.stringify({ models: OR_NEWS, updated: OR_TS }));
  }
  if (req.method === 'GET' && req.url === '/mundial') {                             // equipos del Mundial → quest de los hinchas
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600' });
    return res.end(JSON.stringify({ equipos: MUNDIAL }));
  }
  if (req.method === 'GET' && req.url === '/chusmerio') {                           // banco de frases ambiente (NPCs vivos)
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600' });
    return res.end(JSON.stringify({ lineas: CHUSMERIO, updated: CHUSMERIO_TS }));
  }
  if (req.method === 'GET' && req.url === '/propaganda') {                          // banco de carteles del CINE
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600' });
    return res.end(JSON.stringify({ carteles: PROPAGANDA, updated: PROPAGANDA.length ? Date.now() : 0 }));
  }
  if (req.method === 'GET' && req.url === '/historias') {                           // banco VIVO de historias del VECINO
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600' });
    return res.end(JSON.stringify({ historias: HISTORIAS, updated: HISTORIAS_TS }));
  }
  if (req.method === 'GET' && req.url === '/salon/live') {                          // SALÓN F1: el mundo VIVO para el cine
    salonPrune();
    const byRoom = {}; for (const v of SALON.values()) byRoom[v.sala || '?'] = (byRoom[v.sala || '?'] || 0) + 1;
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify({ count: SALON.size, byRoom, ticker: SALON_TICK.slice(-12) }));
  }
  if (req.method === 'GET' && req.url.startsWith('/salon/debug')) {                 // ADMIN: VALIDAR que las sesiones son REALES (pid, sala, IP, edad). Token-gated.
    const tok = new URL(req.url, 'http://x').searchParams.get('token') || req.headers['x-gen-token'] || '';
    if (!GEN_TOKEN || tok !== GEN_TOKEN) { res.writeHead(403); return res.end('forbidden'); }
    salonPrune(); bodegonPrune(); const now = Date.now();
    const sesiones = [...SALON.entries()].map(([pid, v]) => ({ pid, sala: v.sala, ip: v.ip || '?', edadSeg: Math.round((now - v.ts) / 1000) }));
    const bodegones = [...BODEGON.entries()].map(([room, r]) => ({ room, space: r.space || 'bodegon', peers: [...r.peers.values()].map(p => ({ pid: p.pid, nick: p.nick, ip: p.ip || '?', edadSeg: Math.round((now - p.ts) / 1000) })), streams: r.streams.size,
      mesas: Object.fromEntries(Object.entries(r.tables || {}).map(([n, t]) => [n, { state: t.state, seats: [...t.seats.values()].map(s => s.nick) }])) }));
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify({ jugandoAhora: SALON.size, sesiones, bodegones, nota: 'presencia REAL: cada sesión = un navegador que mandó /salon/beat en los últimos 35s. Sin simulación.' }, null, 2));
  }
  if (req.method === 'POST' && req.url === '/salon/beat') {                         // SALÓN F1: latido de presencia + hito opcional
    let pb = '';
    req.on('data', c => { pb += c; if (pb.length > 2000) req.destroy(); });
    req.on('end', () => {
      try { const d = JSON.parse(pb || '{}'); const pid = String(d.pid || '').slice(0, 48);
        if (pid) { SALON.set(pid, { sala: String(d.sala || '?').slice(0, 24), ts: Date.now(), ip: clientIp(req) });   // ip para validar sesiones REALES (GET /salon/debug)
          if (d.ev) { SALON_TICK.push({ ev: String(d.ev).slice(0, 40), ts: Date.now() }); if (SALON_TICK.length > 30) SALON_TICK = SALON_TICK.slice(-30); } }
        salonPrune();
        res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ count: SALON.size }));
      } catch (e) { res.writeHead(400); res.end('bad'); }
    });
    return;
  }
  // ===== SALÓN F2b — BODEGÓN real-time (specs/multijugador.md §3.2). Relay SSE SIN autoridad: el server solo
  // retransmite posiciones/emotes/frases entre los de la MISMA sala-instancia (cap 6). In-memory, efímero (se pierde
  // al reiniciar = ok, social). Sin chat libre → emotes + frases PRESET (índice), sin moderación. =====
  if (req.method === 'GET' && req.url.startsWith('/barrio-mem')) {                  // memoria cross-device: leer por nick
    const nick = bmNick(new URL(req.url, 'http://x').searchParams.get('nick'));
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify({ mem: (nick && BARRIOMEM[nick] && BARRIOMEM[nick].mem) || [] }));
  }
  if (req.method === 'POST' && req.url === '/barrio-mem') {                          // memoria cross-device: sync (merge)
    let pb = ''; req.on('data', c => { pb += c; if (pb.length > 8000) req.destroy(); });
    req.on('end', () => { try {
      const d = JSON.parse(pb || '{}'); const nick = bmNick(d.nick);
      if (!nick) { res.writeHead(400); return res.end('no nick'); }
      const now = Date.now(); if (now - (BM_POST_GAP[nick] || 0) < 20000) { res.writeHead(429); return res.end('slow down'); }
      BM_POST_GAP[nick] = now; bmMerge(nick, d.mem);
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: true, n: BARRIOMEM[nick].mem.length }));
    } catch (e) { res.writeHead(400); res.end('bad'); } });
    return;
  }
  if (req.url === '/salon/join' && req.method === 'POST') {
    let pb = ''; req.on('data', c => { pb += c; if (pb.length > 1000) req.destroy(); });
    req.on('end', () => { try {
      const d = JSON.parse(pb || '{}'); const pid = String(d.pid || '').slice(0, 48); if (!pid) { res.writeHead(400); return res.end('no pid'); }
      const nick = String(d.nick || '').slice(0, 16).replace(/[<>]/g, ''); const avatar = (String(d.avatar || 'civil').slice(0, 12)).replace(/[^a-z0-9_]/gi, '');
      const space = SPACE_TABLES[d.space] ? d.space : 'bodegon';   // §espacios: 'bodegon' (default) | 'lavalle'
      const room = bodegonJoin(space); const r = bodegonRoom(room, space);
      r.peers.set(pid, { pid, nick, avatar, x: 11, vx: 0, emote: 0, emoteT: 0, ts: Date.now(), ip: clientIp(req) });
      bodegonBroadcast(r, 'peer-join', { pid, nick, avatar, x: 11 });
      const peers = [...r.peers.values()].filter(p => p.pid !== pid).map(p => ({ pid: p.pid, nick: p.nick, avatar: p.avatar, x: p.x, vx: p.vx }));
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ room, peers, cap: BODEGON_CAP }));
    } catch (e) { res.writeHead(400); res.end('bad'); } });
    return;
  }
  if (req.url.startsWith('/salon/stream') && req.method === 'GET') {                 // SSE: eventos de la sala-instancia
    const u = new URL(req.url, 'http://x'); const room = String(u.searchParams.get('room') || '').slice(0, 24); const pid = String(u.searchParams.get('pid') || '').slice(0, 48);
    const r = BODEGON.get(room); if (!r) { res.writeHead(404); return res.end('no room'); }
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.write('retry: 3000\n\n');
    // AUTO-REJOIN: si el SSE reconecta (o llega antes que el /join) y el pid NO está en peers → re-agregarlo. Antes, al
    // reconectar el stream, el close borraba el peer y no volvía → "los jugadores no se ven" + el truco no pareaba.
    if (pid && !r.peers.has(pid)) { r.peers.set(pid, { pid, nick: '', avatar: 'carpo', x: 11, vx: 0, emote: 0, emoteT: 0, ts: Date.now(), ip: clientIp(req) }); bodegonBroadcast(r, 'peer-join', { pid, nick: '', avatar: 'carpo', x: 11 }); }
    for (const p of r.peers.values()) if (p.pid !== pid) res.write('event: peer-pos\ndata: ' + JSON.stringify({ pid: p.pid, nick: p.nick, avatar: p.avatar, x: p.x, vx: p.vx }) + '\n\n');
    r.subs.add(res); if (pid) r.streams.set(pid, res);   // streams: pid -> res, para DIRIGIR mensajes privados (whisper)
    const ping = setInterval(() => { try { res.write(': ping\n\n'); } catch (e) {} }, 15000);
    // al cerrar el stream: sacar el sub/stream, PERO NO el peer (lo maneja el TTL prune o /salon/leave). Así un reconnect
    // del EventSource no te hace desaparecer para todos.
    req.on('close', () => { clearInterval(ping); r.subs.delete(res); if (r.streams.get(pid) === res) r.streams.delete(pid); });
    return;
  }
  if (req.url === '/salon/whisper' && req.method === 'POST') {                       // chat PRIVADO 1-a-1 (texto libre) + protocolo del TRUCO PvP (vistas JSON), efímero, rate-limit
    let pb = ''; req.on('data', c => { pb += c; if (pb.length > 1400) req.destroy(); });   // cap subido: las vistas del truco son JSON
    req.on('end', () => { try {
      const d = JSON.parse(pb || '{}'); const pid = String(d.pid || '').slice(0, 48); const room = String(d.room || '').slice(0, 24); const to = String(d.to || '').slice(0, 48);
      const r = BODEGON.get(room); const p = r && r.peers.get(pid);
      if (p) { const now = Date.now(); if (now - (p.lastWhisper || 0) >= 250) {   // rate-limit ~4/s (el truco empuja vistas por turno)
        p.lastWhisper = now; p.ts = now;
        const msg = String(d.msg || '').replace(/[\x00-\x1f]/g, ' ').slice(0, 900).trim();
        const dst = r.streams.get(to);   // SOLO al destinatario (privado)
        if (msg && dst) { try { dst.write('event: whisper\ndata: ' + JSON.stringify({ from: pid, fromNick: p.nick, msg }) + '\n\n'); } catch (e) {} }
      } }
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{}');
    } catch (e) { res.writeHead(400); res.end('bad'); } });
    return;
  }
  if (req.url === '/salon/pos' && req.method === 'POST') {                           // latido + posición (cliente ~6/s), retransmite
    let pb = ''; req.on('data', c => { pb += c; if (pb.length > 600) req.destroy(); });
    req.on('end', () => { try {
      const d = JSON.parse(pb || '{}'); const pid = String(d.pid || '').slice(0, 48); const room = String(d.room || '').slice(0, 24);
      const r = BODEGON.get(room); const p = r && r.peers.get(pid);
      if (p) { p.x = Math.max(1, Math.min(21, +d.x || p.x)); p.vx = Math.max(-260, Math.min(260, +d.vx || 0));
        if (d.y != null) p.y = Math.max(1, Math.min(14, +d.y || p.y));   // top-down: posición REAL (x,y) → peers que caminan (14 cubre bodegón y lavalle)
        if (d.emote != null) { p.emote = (+d.emote || 0) % 8; p.emoteT = Date.now(); } p.ts = Date.now();
        bodegonBroadcast(r, 'peer-pos', { pid, x: p.x, y: p.y, vx: p.vx, emote: d.emote != null ? p.emote : undefined }); }
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{}');
    } catch (e) { res.writeHead(400); res.end('bad'); } });
    return;
  }
  if (req.url === '/salon/table' && req.method === 'POST') {                         // MESAS server-authoritative: sentarse/levantarse → table-update/start
    let pb = ''; req.on('data', c => { pb += c; if (pb.length > 400) req.destroy(); });
    req.on('end', () => { try {
      const d = JSON.parse(pb || '{}'); const pid = String(d.pid || '').slice(0, 48); const room = String(d.room || '').slice(0, 24);
      const r = BODEGON.get(room); const p = r && r.peers.get(pid);
      const name = (r && r.tables && r.tables[d.table]) ? d.table : null;   // acepta cualquier mesa del ESPACIO (bodegón: 1v1/6 · lavalle: corte)
      if (r && p && name) { p.ts = Date.now();
        if (d.action === 'sit') tableSit(r, name, pid, p.nick);
        else if (d.action === 'leave') tableLeavePid(r, name, pid);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{}');
    } catch (e) { res.writeHead(400); res.end('bad'); } });
    return;
  }
  if (req.url === '/salon/say' && req.method === 'POST') {                           // frase PRESET (índice) → globo público para todos
    let pb = ''; req.on('data', c => { pb += c; if (pb.length > 400) req.destroy(); });
    req.on('end', () => { try {
      const d = JSON.parse(pb || '{}'); const pid = String(d.pid || '').slice(0, 48); const room = String(d.room || '').slice(0, 24);
      const r = BODEGON.get(room); const p = r && r.peers.get(pid);
      if (p) { p.ts = Date.now(); bodegonBroadcast(r, 'say', { pid, i: Math.max(0, Math.min(31, +d.i || 0)) }); }   // i = índice de la frase preset (el cliente la traduce)
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{}');
    } catch (e) { res.writeHead(400); res.end('bad'); } });
    return;
  }
  if (req.url === '/salon/leave' && req.method === 'POST') {
    let pb = ''; req.on('data', c => { pb += c; if (pb.length > 400) req.destroy(); });
    req.on('end', () => { try { const d = JSON.parse(pb || '{}'); bodegonLeave(String(d.room || '').slice(0, 24), String(d.pid || '').slice(0, 48)); } catch (e) {}
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{}'); });
    return;
  }
  // ===== CARTELES COLABORATIVOS (construccion-colaborativa.md C1) — tablón compartido por piso, cupo + consumo-en-lectura.
  if (req.method === 'GET' && req.url.startsWith('/carteles/mine')) {                // los MÍOS activos (para la computadora)
    const u = new URL(req.url, 'http://x'); const pid = String(u.searchParams.get('pid') || '').slice(0, 48);
    cartelesPrune();
    const mine = CARTELES.filter(s => s.author === pid).map(s => ({ id: s.id, floor: s.floor, slot: s.slot, text: s.text, ts: s.ts }));
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify({ signs: mine }));
  }
  if (req.method === 'GET' && req.url.startsWith('/carteles')) {                     // tablón de un piso (SIN el texto: se revela al LEER)
    const u = new URL(req.url, 'http://x'); const floor = String(u.searchParams.get('floor') || '').slice(0, 24);
    cartelesPrune();
    const signs = CARTELES.filter(s => s.floor === floor).map(s => ({ id: s.id, slot: s.slot, nick: s.nick, ai: !!s.ai, ts: s.ts }));   // SIN text (consumo-en-lectura)
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify({ cap: CARTELES_CAP, used: signs.length, signs }));
  }
  if (req.method === 'POST' && req.url === '/carteles/read') {                       // CONSUMO: lo lee OTRO → devuelve el texto y lo BORRA
    let pb = ''; req.on('data', c => { pb += c; if (pb.length > 400) req.destroy(); });
    req.on('end', () => { try {
      const d = JSON.parse(pb || '{}'); const pid = String(d.pid || '').slice(0, 48); const id = String(d.id || '').slice(0, 40);
      const i = CARTELES.findIndex(s => s.id === id);
      if (i < 0) { res.writeHead(404); return res.end(JSON.stringify({ gone: true })); }
      const s = CARTELES[i];
      const consume = s.author !== pid;   // si lo lee OTRO (no el autor) → se consume y desaparece
      if (consume) { CARTELES.splice(i, 1); saveCarteles(); }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ id: s.id, nick: s.nick, text: s.text, ai: !!s.ai, consumed: consume, mine: !consume }));
    } catch (e) { res.writeHead(400); res.end('bad'); } });
    return;
  }
  if (req.method === 'POST' && req.url === '/carteles') {                            // CREAR un cartel (cupo + rate-limit)
    let pb = ''; req.on('data', c => { pb += c; if (pb.length > 600) req.destroy(); });
    req.on('end', () => { try {
      const d = JSON.parse(pb || '{}'); const pid = String(d.pid || '').slice(0, 48);
      const floor = String(d.floor || '').slice(0, 24); const nick = String(d.nick || '').slice(0, 16).replace(/[<>]/g, '') || 'Anónimo';
      const text = cartelClean(d.text);
      if (!pid || !CARTELES_FLOORS.includes(floor)) { res.writeHead(400); return res.end(JSON.stringify({ error: 'bad' })); }
      if (!text) { res.writeHead(400); return res.end(JSON.stringify({ error: 'empty' })); }
      const now = Date.now();
      if (now - (cartelLast.get(pid) || 0) < CARTELES_RATE_MS) { res.writeHead(429); return res.end(JSON.stringify({ error: 'rate' })); }
      cartelesPrune();
      const slot = cartelFreeSlot(floor);
      if (slot < 0) { res.writeHead(409); return res.end(JSON.stringify({ error: 'full' })); }
      const sign = { id: (now.toString(36) + (++CARTEL_SEQ).toString(36)), floor, slot, author: pid, nick, text, ts: now };
      CARTELES.push(sign); saveCarteles(); cartelLast.set(pid, now);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, id: sign.id, slot }));
    } catch (e) { res.writeHead(400); res.end('bad'); } });
    return;
  }
  // C2 — la IA del salón deja carteles (cron gen-carteles.mjs). Protegido por GEN_TOKEN. Cupo IA = 30% de cada piso (así
  // SIEMPRE queda lugar para jugadores). Acepta un BATCH {signs:[{floor,nick,text}]}; va llenando slots libres hasta el cupo.
  if (req.method === 'POST' && req.url === '/carteles/ai') {
    if (!GEN_TOKEN || (req.headers['x-gen-token'] || '') !== GEN_TOKEN) { res.writeHead(403); return res.end('forbidden'); }
    let pb = ''; req.on('data', c => { pb += c; if (pb.length > 20000) req.destroy(); });
    req.on('end', () => { try {
      const d = JSON.parse(pb || '{}'); const signs = Array.isArray(d.signs) ? d.signs : [];
      cartelesPrune(); let added = 0; const now = Date.now();
      for (const s of signs) {
        const floor = String(s.floor || '').slice(0, 24); if (!CARTELES_FLOORS.includes(floor)) continue;
        const aiOnFloor = CARTELES.filter(x => x.floor === floor && x.ai).length;
        if (aiOnFloor >= CARTELES_AI_MAX) continue;                        // cupo IA del piso lleno → no pisar a los jugadores
        const text = cartelClean(s.text); if (!text) continue;
        const slot = cartelFreeSlot(floor); if (slot < 0) continue;        // piso lleno
        const nick = String(s.nick || 'El Salón').slice(0, 16).replace(/[<>]/g, '') || 'El Salón';
        CARTELES.push({ id: (now.toString(36) + (++CARTEL_SEQ).toString(36)), floor, slot, author: 'ai', ai: true, nick, text, ts: now });
        added++;
      }
      if (added) saveCarteles();
      res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ ok: true, added, aiCap: CARTELES_AI_MAX }));
    } catch (e) { res.writeHead(400); res.end('bad json'); } });
    return;
  }
  // ===== DATACENTER COLABORATIVO GLOBAL (construccion-colaborativa.md D1) — estado compartido por toda la comunidad.
  if (req.method === 'GET' && req.url === '/datacenter') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify(dcState()));
  }
  if (req.method === 'POST' && req.url === '/datacenter/contribute') {              // sumar UNA parte (valida catálogo + cupo + rate)
    let pb = ''; req.on('data', c => { pb += c; if (pb.length > 400) req.destroy(); });
    req.on('end', () => { try {
      const d = JSON.parse(pb || '{}'); const pid = String(d.pid || '').slice(0, 48); const part = String(d.part || '');
      if (!pid || !DC_PARTS[part]) { res.writeHead(400); return res.end(JSON.stringify({ error: 'bad' })); }
      if (DATACENTER.done) { res.writeHead(423); return res.end(JSON.stringify({ error: 'complete', ...dcState() })); }   // D2: temporada cerrada (esperá la nueva)
      const now = Date.now();
      if (now - (dcLast.get(pid) || 0) < DC_RATE_MS) { res.writeHead(429); return res.end(JSON.stringify({ error: 'rate' })); }
      if ((DATACENTER.parts[part] || 0) >= dcEffMax(part)) { res.writeHead(409); return res.end(JSON.stringify({ error: 'partfull', ...dcState() })); }
      DATACENTER.parts[part] = (DATACENTER.parts[part] || 0) + 1;
      DATACENTER.contributors[pid] = (DATACENTER.contributors[pid] || 0) + 1;
      DATACENTER.ts = now; dcLast.set(pid, now);
      if (!DATACENTER.done && dcProgress() >= 1) { DATACENTER.done = true; DATACENTER.doneAt = now; }   // D2: ¡COMPLETO! → endgame (la comunidad voltea a la IA)
      saveDatacenter();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, ...dcState() }));
    } catch (e) { res.writeHead(400); res.end('bad'); } });
    return;
  }
  // D2 — arrancar una TEMPORADA NUEVA (cupos +25%, reset). Protegido por GEN_TOKEN (lo dispara el dueño/cron cuando todos vieron el final).
  if (req.method === 'POST' && req.url === '/datacenter/season') {
    if (!GEN_TOKEN || (req.headers['x-gen-token'] || '') !== GEN_TOKEN) { res.writeHead(403); return res.end('forbidden'); }
    dcNewSeason();
    res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ ok: true, ...dcState() }));
  }
  // DEPLOY LOG (deploy-pipeline.md §3.1): el Workflow tormenta-deploy reporta ok/failed acá (GEN_TOKEN).
  if (req.method === 'POST' && req.url === '/deploy-log') {
    if (!GEN_TOKEN || (req.headers['x-gen-token'] || '') !== GEN_TOKEN) { res.writeHead(403); return res.end('forbidden'); }
    let pb = ''; req.on('data', c => { pb += c; if (pb.length > 2000) req.destroy(); });
    req.on('end', () => { try {
      const d = JSON.parse(pb || '{}');
      const comp = String(d.component || '').replace(/[^a-z0-9-]/g, '').slice(0, 16);
      const status = d.status === 'ok' ? 'ok' : 'failed';
      if (!comp) { res.writeHead(400); return res.end('bad'); }
      const rec = { component: comp, tag: String(d.tag || '').slice(0, 24), status, wf: String(d.wf || '').slice(0, 64), detail: String(d.detail || '').slice(0, 200), ts: Date.now() };
      DEPLOYLOG.last[comp] = rec; DEPLOYLOG.hist.push(rec); DEPLOYLOG.hist = DEPLOYLOG.hist.slice(-100); saveDeployLog();
      console.log('[deploy-log]', comp, rec.tag, status, rec.wf);
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: true }));
    } catch (e) { res.writeHead(400); res.end('bad'); } });
    return;
  }
  if (req.method === 'GET' && req.url === '/deploy-log') {                          // historial (auditoría, sin token: no hay secretos)
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify(DEPLOYLOG));
  }
  // IA/COSTOS (specs/ia-costos.md): los crons ia-health/ia-scout postean sus reportes acá (GEN_TOKEN).
  if (req.method === 'POST' && req.url === '/ia-report') {
    if (!GEN_TOKEN || (req.headers['x-gen-token'] || '') !== GEN_TOKEN) { res.writeHead(403); return res.end('forbidden'); }
    let pb = ''; req.on('data', c => { pb += c; if (pb.length > 200000) req.destroy(); });
    req.on('end', () => { try {
      const d = JSON.parse(pb || '{}');
      if (d.kind !== 'health' && d.kind !== 'scout' && d.kind !== 'tune') { res.writeHead(400); return res.end('bad kind'); }
      d.ts = d.ts || Date.now();
      IA_REPORTS.push(d); IA_REPORTS = IA_REPORTS.slice(-60); saveIaReports();
      if (d.kind === 'health') IA_HEALTH = d;
      console.log('[ia-report]', d.kind, d.verdict || '', (d.recs || []).join(' | ') || (d.note || ''));
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: true }));
    } catch (e) { res.writeHead(400); res.end('bad'); } });
    return;
  }
  if (req.method === 'GET' && req.url === '/ia-reports') {                           // historial salud+scout (sin secretos)
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify({ reports: IA_REPORTS }));
  }
  // AUTOTUNE (§6): aplicar/resetear el override de la cadena anónima (GEN_TOKEN; lo usa el workflow ia-tune).
  if (req.method === 'POST' && req.url === '/ia-chain') {
    if (!GEN_TOKEN || (req.headers['x-gen-token'] || '') !== GEN_TOKEN) { res.writeHead(403); return res.end('forbidden'); }
    let pb = ''; req.on('data', c => { pb += c; if (pb.length > 4000) req.destroy(); });
    req.on('end', () => { try {
      const d = JSON.parse(pb || '{}');
      if (d.reset) { const prev = IA_CHAIN; IA_CHAIN = null; saveIaChain(); IA_TUNE_TS = Date.now();
        console.log('[ia-chain] RESET → baseline env', MODELS.join(','), d.reason ? '(' + d.reason + ')' : '');
        res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ ok: true, effective: activeChain(), prev: prev && prev.chat })); }
      const clean = a => Array.isArray(a) ? a.map(x => String(x).trim()).filter(x => /^[\w\/.:-]{2,64}$/.test(x)).slice(0, 4) : [];
      const chat = clean(d.chat), gen = clean(d.gen), banco = clean(d.banco);
      if (!chat.length && !gen.length && !banco.length) { res.writeHead(400); return res.end('bad chain'); }
      const cur = IA_CHAIN || {};   // cambio POR PATRÓN: lo no enviado se conserva
      IA_CHAIN = { chat: chat.length ? chat : (cur.chat || []), gen: gen.length ? gen : (cur.gen || []), banco: banco.length ? banco : (cur.banco || []),
        reason: String(d.reason || '').slice(0, 200), ts: Date.now(),
        prev: { chat: activeChain(), gen: (cur.gen && cur.gen.length) ? cur.gen : GEN_MODELS, banco: cur.banco || [] } };
      saveIaChain(); IA_TUNE_TS = IA_CHAIN.ts;
      console.log('[ia-chain] override → chat:' + IA_CHAIN.chat.join(',') + ' gen:' + IA_CHAIN.gen.join(',') + ' banco:' + IA_CHAIN.banco.join(','), '(', IA_CHAIN.reason, ')');
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: true, effective: activeChain() }));
    } catch (e) { res.writeHead(400); res.end('bad'); } });
    return;
  }
  if (req.method === 'GET' && req.url === '/ia-chain') {                              // cadena efectiva + override (auditable)
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify({ env: MODELS, envGen: GEN_MODELS, override: IA_CHAIN, effective: activeChain(),
      effectiveGen: (IA_CHAIN && IA_CHAIN.gen && IA_CHAIN.gen.length) ? IA_CHAIN.gen : GEN_MODELS,
      effectiveBanco: (IA_CHAIN && IA_CHAIN.banco && IA_CHAIN.banco.length) ? IA_CHAIN.banco : null }));
  }
  // CHECKPOINTS por nick (guardar-partida.md F3): leer / subir el último hito de tu partida.
  if (req.method === 'GET' && req.url.startsWith('/checkpoint')) {
    const nick = bmNick(new URL(req.url, 'http://x').searchParams.get('nick'));
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify({ chk: (nick && CHECKPOINTS[nick] && CHECKPOINTS[nick].chk) || null }));
  }
  if (req.method === 'POST' && req.url === '/checkpoint') {
    let pb = ''; req.on('data', c => { pb += c; if (pb.length > 32000) req.destroy(); });   // cap 32KB (snapshot típico: 3-15KB)
    req.on('end', () => { try {
      const d = JSON.parse(pb || '{}'); const nick = bmNick(d.nick);
      const chk = d.chk;
      if (!nick || !chk || !chk.snap || !chk.snap.v) { res.writeHead(400); return res.end('bad'); }
      const now = Date.now();
      if (CHK_POST_GAP[nick] && now - CHK_POST_GAP[nick] < 25000) { res.writeHead(429); return res.end('slow'); }
      CHK_POST_GAP[nick] = now;
      CHECKPOINTS[nick] = { chk: { edge: String(chk.edge || '').slice(0, 48), title: String(chk.title || '').slice(0, 80), ts: +chk.ts || now, snap: chk.snap }, up: now };
      const nicks = Object.keys(CHECKPOINTS);              // LRU 500 nicks (~16MB máx en PVC)
      if (nicks.length > 500) nicks.sort((a, b) => (CHECKPOINTS[a].up || 0) - (CHECKPOINTS[b].up || 0)).slice(0, nicks.length - 500).forEach(k => delete CHECKPOINTS[k]);
      saveCheckpoints();
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: true }));
    } catch (e) { res.writeHead(400); res.end('bad'); } });
    return;
  }
  // QA REPORTE (autoplay-qa.md F2): el cron nocturno publica el veredicto de las suites (GEN_TOKEN).
  if (req.method === 'POST' && req.url === '/qa/reporte') {
    if (!GEN_TOKEN || (req.headers['x-gen-token'] || '') !== GEN_TOKEN) { res.writeHead(403); return res.end('forbidden'); }
    let pb = ''; req.on('data', c => { pb += c; if (pb.length > 200000) req.destroy(); });
    req.on('end', () => { try {
      const d = JSON.parse(pb || '{}');
      QA = { ok: !!d.ok, meta: d.meta || {}, results: Array.isArray(d.results) ? d.results : [],
             md: String(d.md || '').slice(0, 20000), prompt: String(d.prompt || '').slice(0, 20000), ts: Date.now() };
      saveQa();
      console.log('[qa/reporte]', QA.ok ? 'VERDE' : 'FALLÓ', QA.results.length + ' suites');
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: true }));
    } catch (e) { res.writeHead(400); res.end('bad'); } });
    return;
  }
  if (req.method === 'GET' && req.url === '/qa/reporte') {                          // legible sin kubectl (sin secretos)
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify(QA || { ok: null, msg: 'sin corridas todavía' }));
  }
  if (req.method === 'GET' && req.url.startsWith('/noticias')) {                    // banco de noticias del CINE (+ archivo de 7 días)
    const u = new URL(req.url, 'http://x'), dias = Object.keys(NOTI_DAYS).sort();
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' });
    const day = u.searchParams.get('day');                                          // ?day=YYYY-MM-DD → función vieja (la pide el guarda)
    if (day && NOTI_DAYS[day]) return res.end(JSON.stringify({ noticias: NOTI_DAYS[day].noticias, updated: NOTI_DAYS[day].ts, day, dias }));
    return res.end(JSON.stringify({ noticias: NOTICIAS, updated: NOTICIAS_TS, dias }));   // default = día actual + lista de días disponibles
  }
  if (req.method === 'GET' && req.url === '/ranking') {                            // F2: mejor/más-barato (juego/landing/Grafana)
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' });
    return res.end(JSON.stringify({ autopilot: AUTOPILOT, chain: activeChain(), models: ranking(), updated: Date.now() }));
  }
  // suscripción: el cliente valida su código al pegarlo en Settings (no expone nada del backend)
  if (req.method === 'GET' && req.url.startsWith('/sub-check')) {
    const code = (req.headers['x-sub-code'] || '').toString();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ paid: isSub(code) }));
  }
  // mi consumo: el JUGADOR ve SU propio uso (gasto/tope/vencimiento) con SU código como auth. Solo lo suyo,
  // sin GEN_TOKEN (el código es la llave). Personal a la sesión que tiene el token validado.
  if (req.method === 'GET' && req.url.startsWith('/my-sub')) {
    const code = (req.headers['x-sub-code'] || '').toString().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    if (!isSub(code)) return res.end(JSON.stringify({ paid: false }));
    const r = STORE[code], real = SUB_REAL[code];
    return res.end(JSON.stringify({ paid: true, provisioned: !!r,
      usage: real ? real.usage : null, limit: r ? r.limit : null, expiresAt: r ? r.expiresAt : null }));
  }
  // F3: PROVISIONAR un código con KEY de OpenRouter propia + budget (GEN_TOKEN). {email, limit?} → {code}.
  // Pseudo-manual: vos lo disparás y mandás el código por mail a mano. Guarda código→key en el store (PVC).
  if (req.method === 'POST' && req.url === '/provision') {
    if (!GEN_TOKEN || (req.headers['x-gen-token'] || '') !== GEN_TOKEN) { res.writeHead(403); return res.end('forbidden'); }
    let pb = '';
    req.on('data', c => { pb += c; if (pb.length > 10000) req.destroy(); });
    req.on('end', async () => {
      try {
        const d = JSON.parse(pb || '{}');
        const email = (d.email || '').toString().trim().slice(0, 120);
        const limit = +d.limit || DEFAULT_SUB_LIMIT;
        if (!email) { res.writeHead(400); return res.end('email requerido'); }
        // código: el dueño puede pasar uno PROPIO (ej. TS-PREMIUM-...) para provisionarlo con su key OpenRouter; si no, autogenera.
        const code = (d.code || '').toString().trim().replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64) || genCode();
        if (STORE[code] && STORE[code].orKey && !d.force) { res.writeHead(409, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'code ya provisionado (usá force:true para recrear la key)', code })); }
        const { key, hash } = await orCreateKey(email + ' · ' + code, limit);   // label = email+código (OpenRouter sabe de quién es)
        const expiresAt = Date.now() + SUB_TTL_DAYS * 86400000;                 // vence en 1 mes
        STORE[code] = { email, orKey: key, hash, limit, createdAt: Date.now(), expiresAt };
        saveStore();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ code, email, limit, hash, expiresAt }));       // ← el código se lo mandás al usuario
      } catch (e) { res.writeHead(502, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: e.message })); }
    });
    return;
  }
  // F3: GASTO por código (GEN_TOKEN) — lee el spend REAL de OpenRouter por key. "quién pagó cuánto gasta".
  if (req.method === 'GET' && req.url === '/sub-spend') {
    if (!GEN_TOKEN || (req.headers['x-gen-token'] || '') !== GEN_TOKEN) { res.writeHead(403); return res.end('forbidden'); }
    (async () => {
      const out = [];
      for (const [code, r] of Object.entries(STORE)) {
        const info = await orKeyInfo(r.hash);
        out.push({ code, email: r.email, limit: r.limit, usage: info ? info.usage : null, disabled: info ? info.disabled : null,
          expiresAt: r.expiresAt || null, expired: !!(r.expiresAt && r.expiresAt <= Date.now()) });
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ subs: out }));
    })();
    return;
  }
  // emisión MANUAL de códigos (protegido por GEN_TOKEN). En runtime; persistencia real = DB (fase siguiente).
  if (req.method === 'POST' && req.url === '/sub-codes') {
    if (!GEN_TOKEN || (req.headers['x-gen-token'] || '') !== GEN_TOKEN) { res.writeHead(403); return res.end('forbidden'); }
    let pb = '';
    req.on('data', c => { pb += c; if (pb.length > 10000) req.destroy(); });
    req.on('end', () => {
      try { const d = JSON.parse(pb || '{}'); const code = (d.code || '').toString().trim();
        if (!code) { res.writeHead(400); return res.end('no code'); }
        if (d.revoke) SUB_CODES.delete(code); else SUB_CODES.add(code);
        saveSubCodes();   // PERSISTE en PVC → sobrevive reinicios/redeploys
        res.writeHead(200); res.end(JSON.stringify({ ok: true, codes: SUB_CODES.size }));
      } catch (e) { res.writeHead(400); res.end('bad json'); }
    });
    return;
  }
  if (req.method === 'GET' && req.url === '/metrics') {                            // prometheus → Grafana
    const avg = M.durCount ? (M.durMsSum / M.durCount) : 0;
    let out =
      `# HELP tormenta_ai_requests_total Chat requests al proxy del linyera\n# TYPE tormenta_ai_requests_total counter\ntormenta_ai_requests_total ${M.requests}\n` +
      `# HELP tormenta_ai_timeouts_total Requests que pasaron el tope de ${UPSTREAM_TIMEOUT}ms\n# TYPE tormenta_ai_timeouts_total counter\ntormenta_ai_timeouts_total ${M.timeouts}\n` +
      `# HELP tormenta_ai_errors_total Errores de upstream (no timeout)\n# TYPE tormenta_ai_errors_total counter\ntormenta_ai_errors_total ${M.errors}\n` +
      `# HELP tormenta_ai_fallback_lines_total Respuestas servidas con línea local (timeout/error)\n# TYPE tormenta_ai_fallback_lines_total counter\ntormenta_ai_fallback_lines_total ${M.fallbackLines}\n` +
      (IA_HEALTH ? `# HELP tormenta_ia_health_verdict Último health (0 ok, 1 warn, 2 critical)\n# TYPE tormenta_ia_health_verdict gauge\ntormenta_ia_health_verdict ${IA_HEALTH.verdict === 'critical' ? 2 : IA_HEALTH.verdict === 'warn' ? 1 : 0}\n` +
        `# HELP tormenta_ia_health_fallback_pct Fallback %% de la última ventana de 6h\n# TYPE tormenta_ia_health_fallback_pct gauge\ntormenta_ia_health_fallback_pct ${(IA_HEALTH.window && IA_HEALTH.window.fallbackPct) || 0}\n` +
        `# HELP tormenta_ia_health_paid_used_pct Budget pago usado del día (%%)\n# TYPE tormenta_ia_health_paid_used_pct gauge\ntormenta_ia_health_paid_used_pct ${(IA_HEALTH.day && IA_HEALTH.day.paidUsedPct) || 0}\n` +
        `# HELP tormenta_ia_health_est_cost_usd Gasto estimado del día (pool compartido, US$)\n# TYPE tormenta_ia_health_est_cost_usd gauge\ntormenta_ia_health_est_cost_usd ${(IA_HEALTH.day && IA_HEALTH.day.estCostUsd) || 0}\n` +
        `# HELP tormenta_ia_health_ts Timestamp del último health\n# TYPE tormenta_ia_health_ts gauge\ntormenta_ia_health_ts ${IA_HEALTH.ts || 0}\n` : '') +
      `# HELP tormenta_ia_chain_override Override runtime de la cadena de chat activo (0=baseline env)\n# TYPE tormenta_ia_chain_override gauge\ntormenta_ia_chain_override ${IA_CHAIN ? 1 : 0}\n` +
      `# HELP tormenta_ia_tune_last_change_ts Último cambio del autotune (ms epoch)\n# TYPE tormenta_ia_tune_last_change_ts gauge\ntormenta_ia_tune_last_change_ts ${IA_TUNE_TS || (IA_CHAIN && IA_CHAIN.ts) || 0}\n` +
      `# HELP tormenta_ai_latency_ms_avg Latencia media (ms) de las respuestas con IA\n# TYPE tormenta_ai_latency_ms_avg gauge\ntormenta_ai_latency_ms_avg ${avg.toFixed(0)}\n`;
    // chat_total etiquetado: qué modelo/backend/resultado por uso
    out += `# HELP tormenta_ai_chat_total Usos del chat por modelo/backend/resultado\n# TYPE tormenta_ai_chat_total counter\n`;
    const chatKeys = Object.keys(CHAT);
    if (!chatKeys.length) out += `tormenta_ai_chat_total{model="-",backend="-",outcome="none"} 0\n`;
    for (const k of chatKeys) out += `tormenta_ai_chat_total{${k}} ${CHAT[k]}\n`;
    // histograma de latencia por modelo/backend
    out += `# HELP tormenta_ai_chat_latency_seconds Latencia del chat con IA\n# TYPE tormenta_ai_chat_latency_seconds histogram\n`;
    for (const [k, h] of Object.entries(LAT)) {
      const [model, backend] = k.split('|'); const lbl = `model="${model}",backend="${backend}"`;
      let cum = 0;
      for (let i = 0; i < LAT_BUCKETS.length; i++) { cum += h.c[i]; out += `tormenta_ai_chat_latency_seconds_bucket{${lbl},le="${LAT_BUCKETS[i]}"} ${cum}\n`; }
      cum += h.inf;
      out += `tormenta_ai_chat_latency_seconds_bucket{${lbl},le="+Inf"} ${cum}\n`;
      out += `tormenta_ai_chat_latency_seconds_sum{${lbl}} ${h.sum.toFixed(3)}\n`;
      out += `tormenta_ai_chat_latency_seconds_count{${lbl}} ${h.n}\n`;
    }
    // intentos por modelo de la cadena (qué free se cae)
    out += `# HELP tormenta_ai_model_attempts_total Intentos por modelo de la cadena y su resultado\n# TYPE tormenta_ai_model_attempts_total counter\n`;
    const attKeys = Object.keys(ATTEMPT);
    if (!attKeys.length) out += `tormenta_ai_model_attempts_total{model="-",result="none"} 0\n`;
    for (const k of attKeys) out += `tormenta_ai_model_attempts_total{${k}} ${ATTEMPT[k]}\n`;
    // uso del JUEGO (engine v1/v2, storm, truco, death, win, error...)
    out += `# HELP tormenta_game_events_total Eventos de uso del juego (engine v1/v2 + funnel)\n# TYPE tormenta_game_events_total counter\n`;
    const gameKeys = Object.keys(GAME);
    if (!gameKeys.length) out += `tormenta_game_events_total{event="none",engine="",result="",lang=""} 0\n`;
    for (const k of gameKeys) out += `tormenta_game_events_total{${k}} ${GAME[k]}\n`;
    // CUPO/PRESUPUESTO: gasto pago de hoy + topes → Grafana "¿cuánto del techo de $ consumí?" y abuso
    out +=
      `# HELP tormenta_ai_paid_calls_today Respuestas pagas servidas hoy (cuenta contra el presupuesto)\n# TYPE tormenta_ai_paid_calls_today gauge\ntormenta_ai_paid_calls_today ${paidRoll().n}\n` +
      `# HELP tormenta_ai_paid_budget_daily Tope diario de respuestas pagas\n# TYPE tormenta_ai_paid_budget_daily gauge\ntormenta_ai_paid_budget_daily ${PAID_DAILY_CAP}\n` +
      `# HELP tormenta_ai_daily_cap Cupo de chats/día por sesión\n# TYPE tormenta_ai_daily_cap gauge\ntormenta_ai_daily_cap ${DAILY_CAP}\n` +
      `# HELP tormenta_ai_free_blocked_seconds Segundos hasta que la cuota free de la CUENTA se libera (0 = free OK)\n# TYPE tormenta_ai_free_blocked_seconds gauge\ntormenta_ai_free_blocked_seconds ${Math.max(0, Math.round((FREE_BLOCKED_UNTIL - Date.now()) / 1000))}\n` +
      `# HELP tormenta_ai_unique_sessions_today Session-ids distintos vistos hoy (usuarios aprox)\n# TYPE tormenta_ai_unique_sessions_today gauge\ntormenta_ai_unique_sessions_today ${UNIQ.sids.size}\n` +
      `# HELP tormenta_ai_unique_ips_today IPs remotas distintas vistas hoy (real con PROXY protocol)\n# TYPE tormenta_ai_unique_ips_today gauge\ntormenta_ai_unique_ips_today ${UNIQ.ips.size}\n` +
      `# HELP tormenta_ai_sub_codes Códigos de suscripción válidos (pagos)\n# TYPE tormenta_ai_sub_codes gauge\ntormenta_ai_sub_codes ${SUB_CODES.size}\n`;
    // JUGADORES ONLINE (presencia REAL, Grafana "quién está jugando"): latido /salon/beat + conexiones al relay en vivo.
    salonPrune(); bodegonPrune();
    const bySpace = {}; for (const r of BODEGON.values()) bySpace[r.space || 'bodegon'] = (bySpace[r.space || 'bodegon'] || 0) + r.peers.size;
    // DÓNDE están (didáctica del online): agrupo los latidos por 'sala' (calle/cueva/lavalle/lavalle:corte/bodegon/…).
    const bySala = {}; const salaKey = s => String(s || '?').slice(0, 24).replace(/[\n"\\]/g, ''); for (const v of SALON.values()) { const k = salaKey(v.sala); bySala[k] = (bySala[k] || 0) + 1; }
    // mesas de mini-juego ESPERANDO ahora (lobby abierto), por juego
    const waiting = {}; for (const r of BODEGON.values()) for (const nm in r.tables) if (r.tables[nm].seats.size > 0) waiting[nm] = (waiting[nm] || 0) + r.tables[nm].seats.size;
    out +=
      `# HELP tormenta_players_online Jugadores con latido de presencia en los últimos ${Math.round(SALON_TTL / 1000)}s\n# TYPE tormenta_players_online gauge\ntormenta_players_online ${SALON.size}\n` +
      `# HELP tormenta_players_realtime Jugadores conectados al relay en vivo (SSE), por espacio\n# TYPE tormenta_players_realtime gauge\n` +
      `tormenta_players_realtime{space="bodegon"} ${bySpace.bodegon || 0}\n` +
      `tormenta_players_realtime{space="lavalle"} ${bySpace.lavalle || 0}\n` +
      `# HELP tormenta_players_by_sala Jugadores online por lugar donde están (último beat)\n# TYPE tormenta_players_by_sala gauge\n` +
      (Object.keys(bySala).length ? Object.entries(bySala).map(([k, n]) => `tormenta_players_by_sala{sala="${k}"} ${n}\n`).join('') : `tormenta_players_by_sala{sala="none"} 0\n`) +
      `# HELP tormenta_minigame_lobby Jugadores sentados en un lobby de mini-juego ahora, por juego\n# TYPE tormenta_minigame_lobby gauge\n` +
      `tormenta_minigame_lobby{game="1v1"} ${waiting['1v1'] || 0}\n` +
      `tormenta_minigame_lobby{game="6"} ${waiting['6'] || 0}\n` +
      `tormenta_minigame_lobby{game="corte"} ${waiting.corte || 0}\n` +
      `# HELP tormenta_minigame_starts_total Partidas de mini-juego iniciadas desde el arranque del proxy, por juego\n# TYPE tormenta_minigame_starts_total counter\n` +
      `tormenta_minigame_starts_total{game="1v1"} ${MINIGAME_STARTS['1v1'] || 0}\n` +
      `tormenta_minigame_starts_total{game="6"} ${MINIGAME_STARTS['6'] || 0}\n` +
      `tormenta_minigame_starts_total{game="corte"} ${MINIGAME_STARTS.corte || 0}\n`;
    // DEPLOYS (deploy-pipeline.md §3.1): 1 = el último deploy de ese componente FALLÓ → PrometheusRule → Telegram.
    out += `# HELP tormenta_deploy_failed 1 si el último deploy del componente falló (0 = ok)\n# TYPE tormenta_deploy_failed gauge\n`;
    const dlComps = Object.keys(DEPLOYLOG.last);
    if (!dlComps.length) out += `tormenta_deploy_failed{component="none"} 0\n`;
    for (const c of dlComps) out += `tormenta_deploy_failed{component="${c}"} ${DEPLOYLOG.last[c].status === 'failed' ? 1 : 0}\n`;
    out += `# HELP tormenta_deploy_last_ts Epoch ms del último deploy reportado por componente\n# TYPE tormenta_deploy_last_ts gauge\n`;
    for (const c of dlComps) out += `tormenta_deploy_last_ts{component="${c}"} ${DEPLOYLOG.last[c].ts}\n`;
    // AUTOPLAY QA (autoplay-qa.md F2): 1 = la última corrida nocturna del bot falló → alerta a Telegram
    out += `# HELP tormenta_qa_failed 1 si la última corrida del Autoplay QA falló (0 = verde, -1 = sin corridas)\n# TYPE tormenta_qa_failed gauge\ntormenta_qa_failed ${QA ? (QA.ok ? 0 : 1) : -1}\n`;
    if (QA) out += `# HELP tormenta_qa_last_ts Epoch ms de la última corrida del Autoplay QA\n# TYPE tormenta_qa_last_ts gauge\ntormenta_qa_last_ts ${QA.ts}\n`;
    // BANCOS DEL ECOSISTEMA (observabilidad: ¿están poblados y frescos? → Grafana/alertas). age_seconds = frescura.
    const ageS = ts => ts ? Math.round((Date.now() - ts) / 1000) : -1;
    out +=
      `# HELP tormenta_eco_bank_items Items en cada banco de contenido del ecosistema\n# TYPE tormenta_eco_bank_items gauge\n` +
      `tormenta_eco_bank_items{bank="noticias"} ${NOTICIAS.length}\n` +
      `tormenta_eco_bank_items{bank="noticias_dias"} ${Object.keys(NOTI_DAYS).length}\n` +
      `tormenta_eco_bank_items{bank="propaganda"} ${PROPAGANDA.length}\n` +
      `tormenta_eco_bank_items{bank="chusmerio"} ${CHUSMERIO.length}\n` +
      `tormenta_eco_bank_items{bank="historias"} ${HISTORIAS.length}\n` +
      `tormenta_eco_bank_items{bank="mundial_equipos"} ${Object.keys(MUNDIAL).length}\n` +
      `# HELP tormenta_eco_bank_age_seconds Antigüedad de la última actualización del banco (-1 = nunca)\n# TYPE tormenta_eco_bank_age_seconds gauge\n` +
      `tormenta_eco_bank_age_seconds{bank="noticias"} ${ageS(NOTICIAS_TS)}\n` +
      `tormenta_eco_bank_age_seconds{bank="chusmerio"} ${ageS(CHUSMERIO_TS)}\n` +
      `tormenta_eco_bank_age_seconds{bank="historias"} ${ageS(HISTORIAS_TS)}\n`;
    // volumen de chats por CÓDIGO de suscripción (suscripcion.md §9.3: quién consume más; cardinalidad = #códigos)
    out += `# HELP tormenta_ai_sub_usage_total Chats servidos por código de suscripción\n# TYPE tormenta_ai_sub_usage_total counter\n`;
    const subKeys = Object.keys(SUB_USAGE);
    if (!subKeys.length) out += `tormenta_ai_sub_usage_total{code="-"} 0\n`;
    for (const k of subKeys) out += `tormenta_ai_sub_usage_total{code="${k}"} ${SUB_USAGE[k]}\n`;
    // GASTO estimado US$ + tokens por código (suscripcion.md §9.3: quién pagó cuánto gasta)
    out += `# HELP tormenta_ai_sub_cost_usd US$ estimado gastado por código (tokens × precio del modelo pago)\n# TYPE tormenta_ai_sub_cost_usd counter\n`;
    const costKeys = Object.keys(SUB_COST);
    if (!costKeys.length) out += `tormenta_ai_sub_cost_usd{code="-"} 0\n`;
    for (const k of costKeys) out += `tormenta_ai_sub_cost_usd{code="${k}"} ${SUB_COST[k].toFixed(6)}\n`;
    out += `# HELP tormenta_ai_sub_tokens_total Tokens (total) consumidos por código\n# TYPE tormenta_ai_sub_tokens_total counter\n`;
    for (const k of Object.keys(SUB_TOK)) out += `tormenta_ai_sub_tokens_total{code="${k}"} ${SUB_TOK[k]}\n`;
    // GASTO REAL por código (de OpenRouter, refrescado por el poller) + su tope → Grafana sin comandos
    out += `# HELP tormenta_ai_sub_real_cost_usd Gasto REAL US$ por código (leído de OpenRouter)\n# TYPE tormenta_ai_sub_real_cost_usd gauge\n`;
    const realKeys = Object.keys(SUB_REAL);
    if (!realKeys.length) out += `tormenta_ai_sub_real_cost_usd{code="-"} 0\n`;
    for (const c of realKeys) out += `tormenta_ai_sub_real_cost_usd{code="${subShort(c)}"} ${(SUB_REAL[c].usage || 0).toFixed(6)}\n`;
    out += `# HELP tormenta_ai_sub_limit_usd Tope US$ por código (budget de su key)\n# TYPE tormenta_ai_sub_limit_usd gauge\n`;
    for (const c of realKeys) out += `tormenta_ai_sub_limit_usd{code="${subShort(c)}"} ${SUB_REAL[c].limit || 0}\n`;
    out += `# HELP tormenta_ai_sub_provisioned Códigos con key propia provisionada (F3)\n# TYPE tormenta_ai_sub_provisioned gauge\ntormenta_ai_sub_provisioned ${Object.keys(STORE).length}\n`;
    // F2 ModelScorer: score/disponibilidad/latencia/precio por candidato + posición en la cadena (best/cheapest)
    const rk = ranking();
    out += `# HELP tormenta_ai_model_score Score del ModelScorer por candidato (mayor = mejor para rutear)\n# TYPE tormenta_ai_model_score gauge\n`;
    for (const s of rk) out += `tormenta_ai_model_score{model="${s.model}",free="${s.free}"} ${s.score.toFixed(4)}\n`;
    out += `# HELP tormenta_ai_model_okrate Tasa de respuestas ok por candidato (disponibilidad real)\n# TYPE tormenta_ai_model_okrate gauge\n`;
    for (const s of rk) out += `tormenta_ai_model_okrate{model="${s.model}"} ${s.okRate.toFixed(4)}\n`;
    const chain = activeChain();
    out += `# HELP tormenta_ai_chain_position Posición del modelo en la cadena activa (1=primero; 0=fuera)\n# TYPE tormenta_ai_chain_position gauge\n`;
    for (const s of rk) out += `tormenta_ai_chain_position{model="${s.model}"} ${chain.indexOf(s.model) + 1}\n`;
    // precios de OpenRouter (US$/token) de los candidatos → Grafana precios en el tiempo
    out += `# HELP tormenta_openrouter_price_usd Precio US$/token de modelos candidatos (OpenRouter)\n# TYPE tormenta_openrouter_price_usd gauge\n`;
    for (const [id, p] of Object.entries(OR_PRICES)) {
      out += `tormenta_openrouter_price_usd{model="${id}",kind="prompt"} ${p.prompt}\n`;
      out += `tormenta_openrouter_price_usd{model="${id}",kind="completion"} ${p.completion}\n`;
    }
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end(out);
  }
  // el CronWorkflow de precios postea acá (protegido por GEN_TOKEN): {prices, news}.
  if (req.method === 'POST' && req.url === '/precios') {
    if (!GEN_TOKEN || (req.headers['x-gen-token'] || '') !== GEN_TOKEN) { res.writeHead(403); return res.end('forbidden'); }
    let pb = '';
    req.on('data', c => { pb += c; if (pb.length > 100000) req.destroy(); });
    req.on('end', () => {
      try { const d = JSON.parse(pb || '{}'); if (d.prices) OR_PRICES = d.prices; if (Array.isArray(d.news)) OR_NEWS = d.news; OR_TS = Date.now(); res.writeHead(200); res.end('ok'); }
      catch (e) { res.writeHead(400); res.end('bad json'); }
    });
    return;
  }
  // el cron de noticias (gen-noticias.mjs) postea acá (GEN_TOKEN): {noticias:[{topic,headline,answer,ts}]}.
  if (req.method === 'POST' && req.url === '/noticias') {
    if (!GEN_TOKEN || (req.headers['x-gen-token'] || '') !== GEN_TOKEN) { res.writeHead(403); return res.end('forbidden'); }
    let pb = '';
    req.on('data', c => { pb += c; if (pb.length > 200000) req.destroy(); });
    req.on('end', () => {
      // ARCHIVO por día (ring de 7): el cron escribe el día de HOY (pisa si ya corrió hoy) y poda los > 7 días.
      // Un POST vacío NO toca nada (corrida fallida no debe dejar el cine "sin señal").
      try { const d = JSON.parse(pb || '{}'); if (Array.isArray(d.noticias)) {
        if (d.noticias.length) {
          const day = (/^\d{4}-\d{2}-\d{2}$/.test(d.day || '') ? d.day : new Date().toISOString().slice(0, 10));
          const incoming = d.noticias.slice(0, 100);
          if (d.merge) {                          // LIVE: actualiza SOLO esos topics, conserva el resto del día
            const by = new Map((NOTI_DAYS[day]?.noticias || []).map(n => [n.topic, n]));
            for (const n of incoming) by.set(n.topic, n);
            NOTI_DAYS[day] = { noticias: [...by.values()].slice(0, 100), ts: Date.now() };
          } else { NOTI_DAYS[day] = { noticias: incoming, ts: Date.now() }; }   // run diario: reemplaza el día
          notiPrune(); notiSyncLatest(); saveNoticias();
        }
        res.writeHead(200); return res.end(d.noticias.length ? 'ok' : 'empty-ignored'); } res.writeHead(400); res.end('bad'); }
      catch (e) { res.writeHead(400); res.end('bad json'); }
    });
    return;
  }
  // el cron de noticias postea los equipos del Mundial acá (GEN_TOKEN): {equipos:{Equipo:"X-Y vs Z"}}. Vacío no pisa.
  if (req.method === 'POST' && req.url === '/mundial') {
    if (!GEN_TOKEN || (req.headers['x-gen-token'] || '') !== GEN_TOKEN) { res.writeHead(403); return res.end('forbidden'); }
    let pb = '';
    req.on('data', c => { pb += c; if (pb.length > 100000) req.destroy(); });
    req.on('end', () => {
      try { const d = JSON.parse(pb || '{}'); if (d.equipos && typeof d.equipos === 'object') {
        const n = Object.keys(d.equipos).length; if (n) { MUNDIAL = d.equipos; saveMundial(); }
        res.writeHead(200); return res.end(n ? 'ok' : 'empty-ignored'); } res.writeHead(400); res.end('bad'); }
      catch (e) { res.writeHead(400); res.end('bad json'); }
    });
    return;
  }
  // el cron de chusmerío (gen-chusmerio.mjs) postea acá (GEN_TOKEN): {lineas:["..."]}. Sobrescribe; vacío no pisa.
  if (req.method === 'POST' && req.url === '/chusmerio') {
    if (!GEN_TOKEN || (req.headers['x-gen-token'] || '') !== GEN_TOKEN) { res.writeHead(403); return res.end('forbidden'); }
    let pb = '';
    req.on('data', c => { pb += c; if (pb.length > 100000) req.destroy(); });
    req.on('end', () => {
      try { const d = JSON.parse(pb || '{}'); if (Array.isArray(d.lineas)) {
        if (d.lineas.length) { CHUSMERIO = d.lineas.filter(x => typeof x === 'string').slice(0, 200); CHUSMERIO_TS = Date.now(); saveChusmerio(); }
        res.writeHead(200); return res.end(d.lineas.length ? 'ok' : 'empty-ignored'); } res.writeHead(400); res.end('bad'); }
      catch (e) { res.writeHead(400); res.end('bad json'); }
    });
    return;
  }
  // el cron de propaganda (gen-propaganda.mjs) postea acá (GEN_TOKEN): {carteles:[{cat,brand,slogan}]}. Sobrescribe; vacío no pisa.
  if (req.method === 'POST' && req.url === '/propaganda') {
    if (!GEN_TOKEN || (req.headers['x-gen-token'] || '') !== GEN_TOKEN) { res.writeHead(403); return res.end('forbidden'); }
    let pb = '';
    req.on('data', c => { pb += c; if (pb.length > 100000) req.destroy(); });
    req.on('end', () => {
      try { const d = JSON.parse(pb || '{}'); if (Array.isArray(d.carteles)) {
        if (d.carteles.length) { PROPAGANDA = d.carteles.slice(0, 200); savePropaganda(); }
        res.writeHead(200); return res.end(d.carteles.length ? 'ok' : 'empty-ignored'); } res.writeHead(400); res.end('bad'); }
      catch (e) { res.writeHead(400); res.end('bad json'); }
    });
    return;
  }
  // el cron de historias (gen-historias.mjs, IA) postea acá (GEN_TOKEN): {historias:[{id,edif,motif,style,es,en}]}. Vacío no pisa.
  if (req.method === 'POST' && req.url === '/historias') {
    if (!GEN_TOKEN || (req.headers['x-gen-token'] || '') !== GEN_TOKEN) { res.writeHead(403); return res.end('forbidden'); }
    let pb = '';
    req.on('data', c => { pb += c; if (pb.length > 200000) req.destroy(); });
    req.on('end', () => {
      try { const d = JSON.parse(pb || '{}'); if (Array.isArray(d.historias)) {
        if (d.historias.length) { HISTORIAS = d.historias.slice(0, 200); HISTORIAS_TS = Date.now(); saveHistorias(); }
        res.writeHead(200); return res.end(d.historias.length ? 'ok' : 'empty-ignored'); } res.writeHead(400); res.end('bad'); }
      catch (e) { res.writeHead(400); res.end('bad json'); }
    });
    return;
  }
  // el CronJob publica el pool del linyera acá (protegido por GEN_TOKEN). Reemplaza el pool en memoria.
  if (req.method === 'POST' && req.url === '/linyera-pool') {
    if (!GEN_TOKEN || (req.headers['x-gen-token'] || '') !== GEN_TOKEN) { res.writeHead(403); return res.end('forbidden'); }
    let pb = '';
    req.on('data', c => { pb += c; if (pb.length > 200000) req.destroy(); });
    req.on('end', () => {
      try {
        const d = JSON.parse(pb || '{}');
        if (d && d.pool && typeof d.pool === 'object') { LINYERA_POOL = d.pool; LINYERA_POOL_TS = Date.now(); res.writeHead(200); return res.end('ok'); }
        res.writeHead(400); res.end('bad pool');
      } catch (e) { res.writeHead(400); res.end('bad json'); }
    });
    return;
  }
  // ingest de telemetría del juego (cliente → proxy). Acotado: máx 50 eventos por request, body chico.
  if (req.method === 'POST' && req.url === '/game-metrics') {
    let gb = '';
    req.on('data', c => { gb += c; if (gb.length > 16000) req.destroy(); });
    req.on('end', () => {
      try { const d = JSON.parse(gb || '{}'); if (Array.isArray(d.events)) for (const ev of d.events.slice(0, 50)) incGame(ev); } catch (e) {}
      res.writeHead(204); res.end();
    });
    return;
  }
  // NIVEL-AI: la "máquina de hacer chorizos". El cliente manda {theme,lang} cuando te colás a la trastienda
  // del chino; la IA AUTORA el texto del nivel surreal (nombre + intro + frases de NPC en tonada chino-porteña).
  // Si el modelo falla, devolvemos {} y el cliente usa SU contenido estático (mismo patrón que los bancos).
  if (req.method === 'POST' && req.url === '/nivel-ai') {
    let nb = '';
    req.on('data', c => { nb += c; if (nb.length > 2000) req.destroy(); });
    req.on('end', async () => {
      let theme = '', lang = 'es', chats = [], wantGeom = false;
      try { const b = JSON.parse(nb || '{}'); theme = b.theme; lang = b.lang; chats = Array.isArray(b.chats) ? b.chats : []; wantGeom = !!b.geometry; } catch (e) {}
      theme = String(theme || '').replace(/[^a-z0-9-]/g, '').slice(0, 32);
      const en = lang === 'en';
      // saneo grueso server-side de la GEOMETRÍA autorada por la IA (el cliente la re-valida con la RED + auto-repara)
      const parseGeom = (j, out) => {
        if (Array.isArray(j.platforms)) {
          const ps = j.platforms.map(p => Array.isArray(p) ? p.slice(0, 3).map(Number) : null).filter(p => p && p.every(n => isFinite(n))).slice(0, 8);
          if (ps.length) out.platforms = ps;
        }
        if (Array.isArray(j.enemies)) {
          const es = j.enemies.map(e => Array.isArray(e) ? Number(e[0]) : Number(e && e.x != null ? e.x : e)).filter(n => isFinite(n)).slice(0, 5);
          if (es.length) out.enemies = es;
        }
        if (Array.isArray(j.hazards)) {   // pinchos/pozos: [x, ancho, "pit"|"spikes"]
          const hs = j.hazards.map(h => {
            if (Array.isArray(h)) return [Number(h[0]), Number(h[1]), /pit|pozo/i.test(String(h[2])) ? 'pit' : 'spikes'];
            if (h && typeof h === 'object') return [Number(h.x), Number(h.w != null ? h.w : h.width), /pit|pozo/i.test(String(h.kind || h.type)) ? 'pit' : 'spikes'];
            return null;
          }).filter(h => h && isFinite(h[0]) && isFinite(h[1])).slice(0, 4);
          if (hs.length) out.hazards = hs;
        }
        // A0-DEEP (1): BEATS = secuencia de salas-momento del relato {name, anchor, enemy}. El cliente las sanea + valida.
        if (Array.isArray(j.beats)) {
          const bs = j.beats.map(b => (b && typeof b === 'object')
            ? { name: String(b.name || b.n || '').slice(0, 28), anchor: String(b.anchor || b.a || '').slice(0, 4), enemy: String(b.enemy || b.en || '').slice(0, 12), haz: String(b.haz || b.hazard || '').slice(0, 8) }
            : null).filter(b => b && (b.name || b.anchor)).slice(0, 3);
          if (bs.length) out.beats = bs;
        }
      };
      // A0-DEEP (1): pedido de BEATS (salas = momentos del relato) que se agrega al prompt del oráculo/historia.
      const BEATS_ASK = en
        ? ' Also add "beats": array of 2-3 objects {"name": short room name (max 4 words, a MOMENT of the story, e.g. "the entrance", "the stairs", "the locked door"), "anchor": ONE emoji set-piece for that room, "enemy": one of "peaton"|"dron"|"pacman"|"galaga"|"cuevero"} — make them a SEQUENCE that tells the story room by room.'
        : ' Agregá también "beats": array de 2-3 objetos {"name": nombre corto de la sala (máx 4 palabras, un MOMENTO de la historia, ej. "la entrada", "la escalera", "la puerta cerrada"), "anchor": UN emoji set-piece de esa sala, "enemy": uno de "peaton"|"dron"|"pacman"|"galaga"|"cuevero"} — que sean una SECUENCIA que cuente la historia sala por sala.';
      // pedido de geometría (escalera trepable + obstáculos) que se le AGREGA al prompt cuando el cliente la pide
      const GEOM_ASK = en
        ? ' Also design the level GEOMETRY: add "platforms": array of 3-6 [x,y,width] forming a CLIMBABLE staircase (x from 5 to 16 left-to-right, y from 10 going UP to 5, width 2-4, each step within 3 tiles of the previous so it is jumpable), "enemies": array of 2-4 x positions (6 to 18), and "hazards": array of 0-2 [x, width, kind] where kind is "pit" (a gap in the floor you must JUMP over) or "spikes" (hurts on touch), x from 7 to 16, width 1-2.'
        : ' Diseñá también la GEOMETRÍA: agregá "platforms": array de 3-6 [x,y,ancho] que forman una ESCALERA TREPABLE (x de 5 a 16 de izq a der, y de 10 SUBIENDO a 5, ancho 2-4, cada escalón a no más de 3 tiles del anterior para que se pueda saltar), "enemies": array de 2-4 posiciones x (6 a 18), y "hazards": array de 0-2 [x, ancho, tipo] donde tipo es "pit" (un hueco en el piso que hay que SALTAR) o "spikes" (pincho que daña al tocar), x de 7 a 16, ancho 1-2.';
      // TEMA "ORÁCULO": la IA INVENTA un nivel a la medida del jugador según lo que habló con los linyeras/bots
      if (theme === 'oraculo') {
        const ctx = chats.slice(0, 8).map(s => String(s).slice(0, 120)).join(' | ') || (en ? 'we know nothing about them' : 'no sabemos nada de él');
        const osys = en ? 'You invent surreal personalized comedy levels. Reply ONLY with compact JSON.' : 'Inventás mini-niveles surrealistas y personalizados. Respondé SOLO con JSON compacto.';
        const ouser = (en
          ? 'A player has been chatting with hobo street-oracles. Things they said/asked: "' + ctx + '". INVENT a surreal level theme tailored to what this player seems into (wink at it). You also DESIGN THE LEVEL GEOMETRY. Return JSON {"name": short title (max 5 words), "intro": one short sentence, "lines": array of 6 very short NPC phrases, "style": one of "wall"|"aisles"|"climb", "motif": one emoji, "props": 5 emojis space-separated, "platforms": array of 3-6 [x,y,width] forming a CLIMBABLE staircase (x from 5 to 16 left-to-right, y from 10 going UP to 5, width 2-4, each step within 3 tiles of height of the previous so it is jumpable), "enemies": array of 2-4 x positions (6 to 18), "hazards": array of 0-2 [x, width, kind] where kind is "pit" (a gap to JUMP over) or "spikes" (hurts on touch), x 7 to 16, width 1-2}.'
          : 'Un jugador viene charlando con oráculos linyera. Cosas que dijo/preguntó: "' + ctx + '". INVENTÁ un tema de nivel surreal a la MEDIDA de lo que parece interesarle (guiñá a eso). También DISEÑÁS LA GEOMETRÍA del nivel. Devolvé JSON {"name": título corto (máx 5 palabras), "intro": una frase corta, "lines": array de 6 frases de NPC muy cortas, "style": uno de "wall"|"aisles"|"climb", "motif": un emoji, "props": 5 emojis separados por espacio, "platforms": array de 3-6 [x,y,ancho] que forman una ESCALERA TREPABLE (x de 5 a 16 de izquierda a derecha, y de 10 SUBIENDO hasta 5, ancho 2-4, cada escalón a no más de 3 tiles de altura del anterior para que se pueda saltar), "enemies": array de 2-4 posiciones x (6 a 18), "hazards": array de 0-2 [x, ancho, tipo] donde tipo es "pit" (hueco para SALTAR) o "spikes" (pincho que daña al tocar), x 7 a 16, ancho 1-2}.') + BEATS_ASK;
        try {
          const { reply } = await ask([{ role: 'system', content: osys }, { role: 'user', content: ouser }], { maxTokens: 420, gen: true });
          const m = String(reply || '').replace(/```json|```/g, '').match(/\{[\s\S]*\}/);
          const j = m ? JSON.parse(m[0]) : {};
          const out = {};
          if (j.name) out.name = String(j.name).slice(0, 60);
          if (j.intro) out.intro = String(j.intro).slice(0, 160);
          if (Array.isArray(j.lines) && j.lines.length) out.lines = j.lines.slice(0, 8).map(s => String(s).slice(0, 40));
          if (j.style) out.style = String(j.style).slice(0, 12);
          if (j.motif) out.motif = String(j.motif).slice(0, 4);
          if (j.props) out.props = String(j.props).slice(0, 60);
          parseGeom(j, out);   // GEOMETRÍA autorada por la IA
          res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(out));
        } catch (e) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{}'); }
        return;
      }
      // TIENDA generada (galería de la cueva): la IA autora el SURTIDO del rubro (nombre/intro/clientela + productos).
      // La economía (precios/efectos) la ancla el cliente; acá sólo nombres+sabor. Ver specs/tiendas-generadas.md.
      if (theme === 'shop') {
        const tipo = String((() => { try { return JSON.parse(nb || '{}').tipo; } catch (e) { return ''; } })() || '').replace(/[^a-z0-9-]/g, '').slice(0, 24);
        const SHOP_BRIEF = {
          'sexshop': en ? 'a seedy underground sex-shop in a Buenos Aires gallery' : 'un sex-shop under-de una galería porteña, medio cabaretero',
          'comida-rara': en ? 'a sketchy street-food stall selling food of dubious origin, cheap and filling' : 'un puesto de comida rara de dudoso origen, barato y que llena',
          'masajes': en ? 'a "happy massage" parlor, oil and pan-flute, no questions asked' : 'un local de masajes felices, aceitito y pan flauta, sin preguntas',
          'tenebroso': en ? 'a creepy occult stall: black candles, amulets, a hooded seller' : 'un puesto tenebroso ocultista: velas negras, amuletos, un encapuchado',
        };
        const sb = SHOP_BRIEF[tipo] || SHOP_BRIEF['comida-rara'];
        const ssys = en ? 'You stock tiny absurd shops. Reply ONLY with compact JSON, no prose.' : 'Surtís tienditas absurdas. Respondé SOLO con JSON compacto, sin prosa.';
        const suser = en
          ? 'Shop: ' + sb + '. Return JSON {"name": short funny shop name (max 4 words), "intro": one short sentence (the vibe walking in), "lines": array of 4 VERY short customer/clerk phrases, "products": array of 5 items {"label": product name (max 4 words), "emoji": one emoji, "cost": price as a small integer 2-30, "amount": how strong it is, small integer 5-50} — funny and on-theme}.'
          : 'Tienda: ' + sb + '. Devolvé JSON {"name": nombre corto y gracioso (máx 4 palabras), "intro": una frase corta (la onda al entrar), "lines": array de 4 frases MUY cortas de cliente/vendedor, "products": array de 5 ítems {"label": nombre del producto (máx 4 palabras), "emoji": un emoji, "cost": precio como entero chico 2-30, "amount": qué tan fuerte es, entero chico 5-50} — graciosos y del rubro}.';
        const pint = (v, lo, hi) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : null; };   // entero saneado o null
        try {
          const { reply } = await ask([{ role: 'system', content: ssys }, { role: 'user', content: suser }], { maxTokens: 360, gen: true });
          const m = String(reply || '').replace(/```json|```/g, '').match(/\{[\s\S]*\}/);
          const j = m ? JSON.parse(m[0]) : {};
          const out = {};
          if (j.name) out.name = String(j.name).slice(0, 60);
          if (j.intro) out.intro = String(j.intro).slice(0, 160);
          if (Array.isArray(j.lines) && j.lines.length) out.lines = j.lines.slice(0, 6).map(s => String(s).slice(0, 40));
          // productos: nombre+emoji + ECONOMÍA SUGERIDA (cost/amount, ya saneada a entero/rango; el cliente re-clampa por kind)
          if (Array.isArray(j.products) && j.products.length) out.products = j.products.slice(0, 8)
            .map(p => { const o = { label: String((p && p.label) || p || '').slice(0, 28), emoji: String((p && p.emoji) || '🛍️').slice(0, 4) };
              const c = pint(p && p.cost, 2, 30); if (c != null) o.cost = c; const a = pint(p && p.amount, 1, 60); if (a != null) o.amount = a; return o; })
            .filter(p => p.label);
          res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(out));
        } catch (e) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{}'); }
        return;
      }
      // HISTORIA del VECINO (edificios clausurados): la IA flashea un mini-nivel de TERROR desde la "última historia"
      // que el vecino te contó (gancho) anclada al edificio. Mismo formato que el oráculo (texto + geometría).
      // Ver specs/edificios-clausurados-historias.md.
      if (theme === 'historia') {
        let edificio = '', gancho = '';
        try { const b = JSON.parse(nb || '{}'); edificio = String(b.edificio || '').slice(0, 24); gancho = String(b.gancho || '').slice(0, 80); } catch (e) {}
        const hsys = en ? 'You design tiny SURREAL HORROR levels from a neighbor\'s ghost story. Reply ONLY with compact JSON.' : 'Diseñás mini-niveles de TERROR surrealista a partir de la historia de fantasmas de un vecino. Respondé SOLO con JSON compacto.';
        const huser = (en
          ? 'A neighbor in Buenos Aires tells a horror story about the condemned building "' + (edificio || 'the building') + '". The hook of the story: "' + (gancho || 'something terrible happened') + '". DESIGN a creepy little level INSIDE that building, themed on that story, plus its GEOMETRY. Return JSON {"name": short eerie title (max 5 words, riff on the hook), "intro": one short creepy sentence, "lines": array of 6 VERY short ghost/whisper phrases, "style": one of "wall"|"aisles"|"climb", "motif": one spooky emoji, "props": 5 spooky emojis space-separated, "platforms": array of 3-6 [x,y,width] forming a CLIMBABLE staircase (x 5 to 16 left-to-right, y from 10 going UP to 5, width 2-4, each step within 3 tiles of the previous), "enemies": array of 2-4 x positions (6 to 18), "hazards": array of 0-2 [x, width, kind] where kind is "pit" (a gap to JUMP over) or "spikes" (hurts on touch), x 7 to 16, width 1-2}.'
          : 'Un vecino de Buenos Aires te cuenta una historia de terror del edificio clausurado "' + (edificio || 'el edificio') + '". El gancho de la historia: "' + (gancho || 'pasó algo terrible') + '". DISEÑÁ un mini-nivel siniestro ADENTRO de ese edificio, tematizado en esa historia, más su GEOMETRÍA. Devolvé JSON {"name": título corto y escalofriante (máx 5 palabras, jugando con el gancho), "intro": una frase corta y tétrica, "lines": array de 6 frases de fantasma/susurro MUY cortas, "style": uno de "wall"|"aisles"|"climb", "motif": un emoji tenebroso, "props": 5 emojis tenebrosos separados por espacio, "platforms": array de 3-6 [x,y,ancho] que forman una ESCALERA TREPABLE (x 5 a 16 de izq a der, y de 10 SUBIENDO hasta 5, ancho 2-4, cada escalón a no más de 3 tiles del anterior), "enemies": array de 2-4 posiciones x (6 a 18), "hazards": array de 0-2 [x, ancho, tipo] donde tipo es "pit" (hueco para SALTAR) o "spikes" (pincho que daña), x 7 a 16, ancho 1-2}.') + BEATS_ASK;
        try {
          const { reply } = await ask([{ role: 'system', content: hsys }, { role: 'user', content: huser }], { maxTokens: 440, gen: true });
          const m = String(reply || '').replace(/```json|```/g, '').match(/\{[\s\S]*\}/);
          const j = m ? JSON.parse(m[0]) : {};
          const out = {};
          if (j.name) out.name = String(j.name).slice(0, 60);
          if (j.intro) out.intro = String(j.intro).slice(0, 160);
          if (Array.isArray(j.lines) && j.lines.length) out.lines = j.lines.slice(0, 8).map(s => String(s).slice(0, 40));
          if (j.style) out.style = String(j.style).slice(0, 12);
          if (j.motif) out.motif = String(j.motif).slice(0, 4);
          if (j.props) out.props = String(j.props).slice(0, 60);
          parseGeom(j, out);   // GEOMETRÍA autorada por la IA
          res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(out));
        } catch (e) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{}'); }
        return;
      }
      const BRIEF = {
        'super-rasca': en ? 'a filthy run-down dive Chinese mini-market, sticky and dim' : 'un súper chino RASCA, mugriento, pegoteado y a media luz',
        'taller-esclavo': en ? 'a clandestine sweatshop where people weave clothes in slave mode' : 'un taller clandestino donde se teje ropa en modo esclavo',
        'comida-podrida': en ? 'a market with the cold chain broken: rotten, moldy, stinky food' : 'un mercado con la cadena de frío rota: comida podrida, con moho y olor',
        'muralla-skate': en ? 'skateboarding down the Great Wall of China dodging stuff' : 'andar en skate por la Muralla China esquivando cosas',
        'feria-trucha': en ? 'a mega knockoff/counterfeit fair (fake brands, bags, sneakers)' : 'una mega-feria de marcas truchas (carteras, championes, copias)',
        'fabrica-petardos': en ? 'a clandestine fireworks/gunpowder warehouse' : 'una fábrica clandestina de petardos y pólvora',
        'karaoke-mafia': en ? 'an underground mafia KTV karaoke with private rooms' : 'un karaoke KTV clandestino de la mafia con reservados',
        'lavadero-billetes': en ? 'a laundromat that launders actual money: drums spinning full of dollar bills' : 'un lavadero que lava plata de verdad: tambores girando llenos de billetes',
        'farmacia-vencida': en ? 'a dodgy pharmacy full of expired meds and weird homemade syrups' : 'una farmacia trucha con remedios vencidos y jarabes caseros raros',
      };
      const brief = BRIEF[theme] || BRIEF['super-rasca'];
      const sys = en
        ? 'You design tiny surreal comedy levels. Reply ONLY with compact JSON, no prose.'
        : 'Diseñás mini-niveles surrealistas de comedia. Respondé SOLO con JSON compacto, sin prosa.';
      const user = (en
        ? 'Theme: ' + brief + '. Return JSON {"name": short funny level name (max 5 words), "intro": one short sentence, "lines": array of 6 VERY short NPC phrases (max 5 words each) in a broken Chinese-Argentine accent}.'
        : 'Tema: ' + brief + '. Devolvé JSON {"name": nombre de nivel corto y gracioso (máx 5 palabras), "intro": una frase corta, "lines": array de 6 frases de NPC MUY cortas (máx 5 palabras c/u) en tonada chino-porteña rota}.')
        + (wantGeom ? GEOM_ASK : '');
      try {
        const { reply } = await ask([{ role: 'system', content: sys }, { role: 'user', content: user }], { maxTokens: wantGeom ? 420 : 260, gen: true });
        const m = String(reply || '').replace(/```json|```/g, '').match(/\{[\s\S]*\}/);
        const j = m ? JSON.parse(m[0]) : {};
        const out = {};
        if (j.name) out.name = String(j.name).slice(0, 60);
        if (j.intro) out.intro = String(j.intro).slice(0, 160);
        if (Array.isArray(j.lines) && j.lines.length) out.lines = j.lines.slice(0, 8).map(s => String(s).slice(0, 40));
        if (wantGeom) parseGeom(j, out);   // GEOMETRÍA autorada por la IA para el tema fijo
        res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(out));
      } catch (e) {
        res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{}');   // cliente usa su fallback estático
      }
    });
    return;
  }
  // MUNDO-AI (quest-mundo-ai.md §0, v2): la Máquina de Mundos del gurú pide {seed, prompt?, lang} → la IA autora
  // el TEMA de ESE mundo (flavor + geometría opcional), CACHEADO por seed (mundoCacheSet/MUNDO_CACHE) para que el
  // mismo seed SIEMPRE traiga el mismo tema. FREE por ahora (sin gate de suscripción). Best-effort: si la IA falla
  // o el seed no está cacheado y no hay tiempo, {} → el cliente cae al mundo 100% procedural-por-seed (nunca se cuelga).
  if (req.method === 'POST' && req.url === '/mundo-ai') {
    let mb = '';
    req.on('data', c => { mb += c; if (mb.length > 1000) req.destroy(); });
    req.on('end', async () => {
      let seed = '', prompt = '', lang = 'es';
      try { const b = JSON.parse(mb || '{}'); seed = String(b.seed || '').replace(/[^0-9]/g, '').slice(0, 12); prompt = String(b.prompt || '').slice(0, 140); lang = b.lang; } catch (e) {}
      if (!seed) { res.writeHead(400); return res.end('bad seed'); }
      const cached = MUNDO_CACHE[seed];
      if (cached) { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(cached.j)); }   // MISMO seed → MISMO tema (compartible)
      const ipKey = clientIp(req);
      if (!allowed(ipKey)) { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end('{}'); }   // ráfaga → fallback silencioso (nunca rompe el flujo)
      const en = lang === 'en';
      const sys = en ? 'You design a whole surreal comedy WORLD in JSON. Reply ONLY with compact JSON, no prose.' : 'Diseñás un MUNDO surrealista de comedia entero en JSON. Respondé SOLO con JSON compacto, sin prosa.';
      const ask_ = prompt ? (en ? 'The player asked for a world about: "' + prompt + '". ' : 'El jugador pidió un mundo sobre: "' + prompt + '". ') : (en ? 'Surprise them with something absurd and Buenos-Aires-flavored. ' : 'Sorprendelo con algo absurdo y con sabor porteño. ');
      const user = ask_ + (en
        ? 'Return JSON {"name": short world title (max 5 words), "intro": one short sentence, "lines": array of 6 VERY short NPC phrases, "style": one of "wall"|"aisles"|"climb"|"shelves"|"rooftop", "motif": one emoji, "props": 5 emojis space-separated, "beats": array of 2-3 {"name": short room name (max 4 words), "anchor": one emoji set-piece, "enemy": one of "peaton"|"dron"|"pacman"|"galaga"|"cuevero"} forming a story sequence}.'
        : 'Devolvé JSON {"name": título corto del mundo (máx 5 palabras), "intro": una frase corta, "lines": array de 6 frases de NPC muy cortas, "style": uno de "wall"|"aisles"|"climb"|"shelves"|"rooftop", "motif": un emoji, "props": 5 emojis separados por espacio, "beats": array de 2-3 {"name": nombre corto de sala (máx 4 palabras), "anchor": un emoji set-piece, "enemy": uno de "peaton"|"dron"|"pacman"|"galaga"|"cuevero"} formando una secuencia narrativa}.');
      try {
        const { reply } = await ask([{ role: 'system', content: sys }, { role: 'user', content: user }], { maxTokens: 380, gen: true });
        const m = String(reply || '').replace(/```json|```/g, '').match(/\{[\s\S]*\}/);
        const j = m ? JSON.parse(m[0]) : {};
        const out = {};
        if (j.name) out.name = String(j.name).slice(0, 60);
        if (j.intro) out.intro = String(j.intro).slice(0, 160);
        if (Array.isArray(j.lines) && j.lines.length) out.lines = j.lines.slice(0, 8).map(s => String(s).slice(0, 40));
        if (j.style) out.style = String(j.style).slice(0, 12);
        if (j.motif) out.motif = String(j.motif).slice(0, 4);
        if (j.props) out.props = String(j.props).slice(0, 60);
        if (Array.isArray(j.beats)) {
          const bs = j.beats.map(b => (b && typeof b === 'object')
            ? { name: String(b.name || '').slice(0, 28), anchor: String(b.anchor || '').slice(0, 4), enemy: String(b.enemy || '').slice(0, 12) }
            : null).filter(b => b && (b.name || b.anchor)).slice(0, 3);
          if (bs.length) out.beats = bs;
        }
        mundoCacheSet(seed, out);   // se cachea SIEMPRE (incluso vacío): el próximo pedido del mismo seed no vuelve a pagar el modelo
        res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(out));
      } catch (e) {
        // ask() tiró (todos los modelos fallaron/timeout): se cachea IGUAL como {} — si no, un seed compartido durante
        // una caída de la IA podría "cambiar" más tarde (otro jugador lo pide y sí sale con flavor) y dejar de ser el
        // MISMO mundo. Prioridad: compartible > eventualmente enriquecido. (Se puede limpiar el archivo a mano si hace falta.)
        mundoCacheSet(seed, {});
        res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{}');   // cliente cae al mundo procedural-por-seed
      }
    });
    return;
  }
  if (req.method !== 'POST') { res.writeHead(405); return res.end('POST'); }

  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '?').split(',')[0].trim();
  const sid = (req.headers['x-session-id'] || '').toString().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || null;
  const subCode = (req.headers['x-sub-code'] || '').toString().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  const sub = isSub(subCode);            // tier PAGO: salta free + cupo, va directo a la cadena paga
  const key = sid || ip;                 // detrás del G4 la ip colapsa → llaveamos por session-id del cliente
  seenToday(sid, ip);                    // únicos del día (usuarios)
  // ráfaga (12/min) → "pará un cacho" (no es el cupo del día, es anti-spam instantáneo). Los SUB también
  // (anti-abuso de la key), pero podríamos subirles el límite más adelante.
  if (!allowed(key)) { incChat('-', '-', 'ratelimited'); res.writeHead(429, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ reply: '“Pará, pará... dejame respirar un cacho y seguimos, ¿dale?” 😮‍💨' })); }
  // CUPO DEL DÍA agotado → mensaje + upsell. Los SUB NO se capan (pagaron) → se saltan este chequeo.
  if (!sub && dailyLeft(key) <= 0) {
    incChat('-', '-', 'capped');
    res.writeHead(429, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      reply: '“⚡ Pará, flaco... te pasaste: la tormenta solar se me recalentó de tanto que la apretaste a preguntas. Por hoy yo cierro el bocho. Si querés seguir chamuyando YA, traete tu propia API key o hacete una suscripción conmigo y no paramos más, viste.”',
      capped: true,
    }));
  }

  let body = '';
  req.on('data', c => { body += c; if (body.length > 8000) req.destroy(); });
  req.on('end', async () => {
    let npc, message, history, grounding;
    try { ({ npc, message, history, grounding } = JSON.parse(body || '{}')); } catch (e) {}
    if (!message) { res.writeHead(400, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ reply: '“¿Eh? No te escuché, pibe.”' })); }
    if (sub) subHit(subCode); else dailyHit(key);   // sub → volumen por código; free → cupo del día
    M.requests++; const t0 = Date.now();
    const npcLbl = cleanLbl(npc, 24);
    try {
      const rec = sub ? STORE[subCode] : null;          // si el código tiene key propia → directo a OpenRouter
      const { reply, model, usage } = await ask(buildMessages(npc, message, history, grounding), { sub, user: sub ? subCode : undefined, orKey: rec && rec.orKey, maxTokens: CHAT_MAX_TOKENS });
      const dt = Date.now() - t0; M.durMsSum += dt; M.durCount++;
      const be = backendOf(model);
      incChat(model, be, sub ? 'ai_sub' : 'ai', npcLbl); obsLatency(model, be, dt / 1000);   // ← modelo/backend/tier + latencia
      if (sub) subCharge(subCode, model, usage);   // gasto US$ + tokens por código (quién gastó cuánto)
      reqLog({ sid, ip, npc: npcLbl, model, be, outcome: sub ? 'ai_sub' : 'ai', code: sub ? subShort(subCode) : undefined, usd: sub ? +costUsd(model, usage).toFixed(5) : undefined, ms: dt });
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ reply, tier: sub ? 'paid' : 'free' }));
    } catch (e) {
      const outcome = e.timedOut ? 'timeout' : 'error';
      if (!e.timedOut) M.errors++;     // timeout ya contado en ask()
      M.fallbackLines++; incChat('-', '-', outcome, npcLbl);
      reqLog({ sid, ip, npc: npcLbl, model: '-', be: '-', outcome, ms: Date.now() - t0 });
      // línea TEMÁTICA de timeout (combina con el cliente): la tormenta saturó el modelo
      const line = e.timedOut
        ? '“⚡ La tormenta solar saturó el modelo... se colgó y corté. Tirámelo de nuevo, pibe.”'
        : '“Se me fue la idea... el sol me quema el bocho. Repetime.” 🌞';
      // fallback:true → el cliente sirve SU pool por persona (variado) en vez de esta línea genérica
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ reply: line, fallback: true }));
    }
  });
}).listen(PORT, () => console.log('ai-proxy escuchando en :' + PORT + ' → upstream ' + BASE + ' (modelos: ' + MODELS.join(', ') + ')'));
