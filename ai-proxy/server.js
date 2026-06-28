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

// SALÓN — multijugador F1 (specs/multijugador.md): presencia EN VIVO para el piso "Cine EN VIVO". Relay liviano,
// in-memory (se pierde al reiniciar = ok, es social). POST /salon/beat {pid,sala,ev?} · GET /salon/live →
// {count, byRoom, ticker}. (El bodegón real-time F2 irá a un salon-server SSE dedicado; esto es el prototipo F1.)
const SALON = new Map();            // pid -> { sala, ts }
let SALON_TICK = [];                // ring de hitos recientes anónimos: [{ ev, ts }]
const SALON_TTL = 35000;            // un jugador cuenta "jugando ahora" 35s tras su último beat
function salonPrune() { const now = Date.now(); for (const [k, v] of SALON) if (now - v.ts > SALON_TTL) SALON.delete(k); }
// IP REAL del cliente (detrás de HAProxy/Cilium): X-Forwarded-For (1ª) → X-Real-IP → socket. Para VALIDAR sesiones (admin).
function clientIp(req) { const xff = (req.headers['x-forwarded-for'] || '').split(',')[0].trim(); return xff || req.headers['x-real-ip'] || (req.socket && req.socket.remoteAddress) || '?'; }

// BODEGÓN F2b (real-time): sala-instancia -> { peers: Map<pid,estado>, subs: Set<res SSE> }. Matchmaking simple:
// llena la 1ª sala con lugar (para que la gente SE ENCUENTRE), si no abre otra. Prune de peers viejos (sin pos 20s).
const BODEGON = new Map(); const BODEGON_CAP = 6, BODEGON_TTL = 20000; let BODEGON_SEQ = 0;
function bodegonRoom(id) { let r = BODEGON.get(id); if (!r) { r = { peers: new Map(), subs: new Set(), streams: new Map() }; BODEGON.set(id, r); } return r; }
function bodegonJoin() { bodegonPrune(); for (const [id, r] of BODEGON) if (r.peers.size < BODEGON_CAP) return id; const id = 'bodegon-' + (++BODEGON_SEQ); bodegonRoom(id); return id; }
function bodegonBroadcast(r, ev, data) { const line = 'event: ' + ev + '\ndata: ' + JSON.stringify(data) + '\n\n'; for (const s of r.subs) { try { s.write(line); } catch (e) { r.subs.delete(s); } } }
function bodegonLeave(roomId, pid) { const r = BODEGON.get(roomId); if (r && r.peers.delete(pid)) bodegonBroadcast(r, 'peer-leave', { pid }); }
function bodegonPrune() { const now = Date.now(); for (const [id, r] of BODEGON) { for (const [pid, p] of r.peers) if (now - p.ts > BODEGON_TTL) { r.peers.delete(pid); bodegonBroadcast(r, 'peer-leave', { pid }); } if (r.peers.size === 0 && r.subs.size === 0) BODEGON.delete(id); } }
setInterval(bodegonPrune, 8000);
// TOPE DURO de latencia: el linyera no puede tardar >10s. Cortamos el upstream a 8s; el cliente espera 9s.
const UPSTREAM_TIMEOUT = +process.env.UPSTREAM_TIMEOUT_MS || 8000;    // presupuesto TOTAL del CHAT (tope duro, tiempo real)
const PER_MODEL_TIMEOUT = +process.env.PER_MODEL_TIMEOUT_MS || 4000;  // tope POR modelo → entran 2 intentos en 8s
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
function incChat(model, backend, outcome) {
  const k = `model="${model}",backend="${backend}",outcome="${outcome}"`;
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
const GAME_EVENTS = new Set(['session', 'storm', 'truco', 'death', 'win', 'error', 'engine_fallback', 'chat', 'freeze']);
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

async function ask(messages, opts = {}) {
  const deadline = Date.now() + (opts.gen ? GEN_TIMEOUT : UPSTREAM_TIMEOUT);   // gen no es tiempo real → más holgado
  let timedOut = false;
  const direct = !!opts.orKey;                           // F3: sub con key propia → DIRECTO a OpenRouter (su gasto/tope)
  const base = direct ? OR_BASE : BASE;
  const authKey = direct ? opts.orKey : KEY;
  // gen (contenido del dueño): cadena de PAGO confiable directa (sin los free lentos que se comían el tiempo)
  const chain = direct ? SUB_OR_MODELS : (opts.gen ? GEN_MODELS : (opts.sub ? SUB_MODELS : activeChain()));
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
        body: JSON.stringify({ model, messages, temperature: 0.9, max_tokens: opts.maxTokens || 120, ...(opts.user ? { user: opts.user } : {}) }),
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
      const reply = d.choices?.[0]?.message?.content;
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
    const bodegones = [...BODEGON.entries()].map(([room, r]) => ({ room, peers: [...r.peers.values()].map(p => ({ pid: p.pid, nick: p.nick, ip: p.ip || '?', edadSeg: Math.round((now - p.ts) / 1000) })), streams: r.streams.size }));
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
  if (req.url === '/salon/join' && req.method === 'POST') {
    let pb = ''; req.on('data', c => { pb += c; if (pb.length > 1000) req.destroy(); });
    req.on('end', () => { try {
      const d = JSON.parse(pb || '{}'); const pid = String(d.pid || '').slice(0, 48); if (!pid) { res.writeHead(400); return res.end('no pid'); }
      const nick = String(d.nick || '').slice(0, 16).replace(/[<>]/g, ''); const avatar = (String(d.avatar || 'civil').slice(0, 12)).replace(/[^a-z0-9_]/gi, '');
      const room = bodegonJoin(); const r = bodegonRoom(room);
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
    for (const p of r.peers.values()) if (p.pid !== pid) res.write('event: peer-pos\ndata: ' + JSON.stringify({ pid: p.pid, nick: p.nick, avatar: p.avatar, x: p.x, vx: p.vx }) + '\n\n');
    r.subs.add(res); if (pid) r.streams.set(pid, res);   // streams: pid -> res, para DIRIGIR mensajes privados (whisper)
    const ping = setInterval(() => { try { res.write(': ping\n\n'); } catch (e) {} }, 15000);
    req.on('close', () => { clearInterval(ping); r.subs.delete(res); if (r.streams.get(pid) === res) r.streams.delete(pid); bodegonLeave(room, pid); });
    return;
  }
  if (req.url === '/salon/whisper' && req.method === 'POST') {                       // chat PRIVADO 1-a-1 (texto libre, efímero, rate-limit)
    let pb = ''; req.on('data', c => { pb += c; if (pb.length > 800) req.destroy(); });
    req.on('end', () => { try {
      const d = JSON.parse(pb || '{}'); const pid = String(d.pid || '').slice(0, 48); const room = String(d.room || '').slice(0, 24); const to = String(d.to || '').slice(0, 48);
      const r = BODEGON.get(room); const p = r && r.peers.get(pid);
      if (p) { const now = Date.now(); if (now - (p.lastWhisper || 0) >= 700) {   // rate-limit ~1.4/s por jugador
        p.lastWhisper = now; p.ts = now;
        const msg = String(d.msg || '').replace(/[\x00-\x1f]/g, ' ').slice(0, 200).trim();
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
      if (p) { p.x = Math.max(1, Math.min(21, +d.x || p.x)); p.vx = Math.max(-260, Math.min(260, +d.vx || 0)); if (d.emote != null) { p.emote = (+d.emote || 0) % 8; p.emoteT = Date.now(); } p.ts = Date.now();
        bodegonBroadcast(r, 'peer-pos', { pid, x: p.x, vx: p.vx, emote: d.emote != null ? p.emote : undefined }); }
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
        const code = genCode();
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
      };
      // pedido de geometría (escalera trepable + obstáculos) que se le AGREGA al prompt cuando el cliente la pide
      const GEOM_ASK = en
        ? ' Also design the level GEOMETRY: add "platforms": array of 3-6 [x,y,width] forming a CLIMBABLE staircase (x from 5 to 16 left-to-right, y from 10 going UP to 5, width 2-4, each step within 3 tiles of the previous so it is jumpable), "enemies": array of 2-4 x positions (6 to 18), and "hazards": array of 0-2 [x, width, kind] where kind is "pit" (a gap in the floor you must JUMP over) or "spikes" (hurts on touch), x from 7 to 16, width 1-2.'
        : ' Diseñá también la GEOMETRÍA: agregá "platforms": array de 3-6 [x,y,ancho] que forman una ESCALERA TREPABLE (x de 5 a 16 de izq a der, y de 10 SUBIENDO a 5, ancho 2-4, cada escalón a no más de 3 tiles del anterior para que se pueda saltar), "enemies": array de 2-4 posiciones x (6 a 18), y "hazards": array de 0-2 [x, ancho, tipo] donde tipo es "pit" (un hueco en el piso que hay que SALTAR) o "spikes" (pincho que daña al tocar), x de 7 a 16, ancho 1-2.';
      // TEMA "ORÁCULO": la IA INVENTA un nivel a la medida del jugador según lo que habló con los linyeras/bots
      if (theme === 'oraculo') {
        const ctx = chats.slice(0, 8).map(s => String(s).slice(0, 120)).join(' | ') || (en ? 'we know nothing about them' : 'no sabemos nada de él');
        const osys = en ? 'You invent surreal personalized comedy levels. Reply ONLY with compact JSON.' : 'Inventás mini-niveles surrealistas y personalizados. Respondé SOLO con JSON compacto.';
        const ouser = en
          ? 'A player has been chatting with hobo street-oracles. Things they said/asked: "' + ctx + '". INVENT a surreal level theme tailored to what this player seems into (wink at it). You also DESIGN THE LEVEL GEOMETRY. Return JSON {"name": short title (max 5 words), "intro": one short sentence, "lines": array of 6 very short NPC phrases, "style": one of "wall"|"aisles"|"climb", "motif": one emoji, "props": 5 emojis space-separated, "platforms": array of 3-6 [x,y,width] forming a CLIMBABLE staircase (x from 5 to 16 left-to-right, y from 10 going UP to 5, width 2-4, each step within 3 tiles of height of the previous so it is jumpable), "enemies": array of 2-4 x positions (6 to 18), "hazards": array of 0-2 [x, width, kind] where kind is "pit" (a gap to JUMP over) or "spikes" (hurts on touch), x 7 to 16, width 1-2}.'
          : 'Un jugador viene charlando con oráculos linyera. Cosas que dijo/preguntó: "' + ctx + '". INVENTÁ un tema de nivel surreal a la MEDIDA de lo que parece interesarle (guiñá a eso). También DISEÑÁS LA GEOMETRÍA del nivel. Devolvé JSON {"name": título corto (máx 5 palabras), "intro": una frase corta, "lines": array de 6 frases de NPC muy cortas, "style": uno de "wall"|"aisles"|"climb", "motif": un emoji, "props": 5 emojis separados por espacio, "platforms": array de 3-6 [x,y,ancho] que forman una ESCALERA TREPABLE (x de 5 a 16 de izquierda a derecha, y de 10 SUBIENDO hasta 5, ancho 2-4, cada escalón a no más de 3 tiles de altura del anterior para que se pueda saltar), "enemies": array de 2-4 posiciones x (6 a 18), "hazards": array de 0-2 [x, ancho, tipo] donde tipo es "pit" (hueco para SALTAR) o "spikes" (pincho que daña al tocar), x 7 a 16, ancho 1-2}.';
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
          : 'Un vecino de Buenos Aires te cuenta una historia de terror del edificio clausurado "' + (edificio || 'el edificio') + '". El gancho de la historia: "' + (gancho || 'pasó algo terrible') + '". DISEÑÁ un mini-nivel siniestro ADENTRO de ese edificio, tematizado en esa historia, más su GEOMETRÍA. Devolvé JSON {"name": título corto y escalofriante (máx 5 palabras, jugando con el gancho), "intro": una frase corta y tétrica, "lines": array de 6 frases de fantasma/susurro MUY cortas, "style": uno de "wall"|"aisles"|"climb", "motif": un emoji tenebroso, "props": 5 emojis tenebrosos separados por espacio, "platforms": array de 3-6 [x,y,ancho] que forman una ESCALERA TREPABLE (x 5 a 16 de izq a der, y de 10 SUBIENDO hasta 5, ancho 2-4, cada escalón a no más de 3 tiles del anterior), "enemies": array de 2-4 posiciones x (6 a 18), "hazards": array de 0-2 [x, ancho, tipo] donde tipo es "pit" (hueco para SALTAR) o "spikes" (pincho que daña), x 7 a 16, ancho 1-2}.');
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
      const { reply, model, usage } = await ask(buildMessages(npc, message, history, grounding), { sub, user: sub ? subCode : undefined, orKey: rec && rec.orKey });
      const dt = Date.now() - t0; M.durMsSum += dt; M.durCount++;
      const be = backendOf(model);
      incChat(model, be, sub ? 'ai_sub' : 'ai'); obsLatency(model, be, dt / 1000);   // ← modelo/backend/tier + latencia
      if (sub) subCharge(subCode, model, usage);   // gasto US$ + tokens por código (quién gastó cuánto)
      reqLog({ sid, ip, npc: npcLbl, model, be, outcome: sub ? 'ai_sub' : 'ai', code: sub ? subShort(subCode) : undefined, usd: sub ? +costUsd(model, usage).toFixed(5) : undefined, ms: dt });
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ reply, tier: sub ? 'paid' : 'free' }));
    } catch (e) {
      const outcome = e.timedOut ? 'timeout' : 'error';
      if (!e.timedOut) M.errors++;     // timeout ya contado en ask()
      M.fallbackLines++; incChat('-', '-', outcome);
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
