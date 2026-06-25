// server.js — proxy de CHAT con IA para "Tormenta Solar" (modo B). Node puro, sin dependencias.
// Guarda la API key de OpenRouter (NUNCA va al cliente), arma el prompt con la persona, llama a un
// modelo :free, y devuelve { reply }. Rate-limit simple por IP.
//
//   OPENROUTER_API_KEY=sk-or-... node server.js        (PORT=8788 por defecto)
//
// Después poné la URL pública en js/ai.js -> ENDPOINT.
import http from 'http';
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
// TOPE DURO de latencia: el linyera no puede tardar >10s. Cortamos el upstream a 8s; el cliente espera 9s.
const UPSTREAM_TIMEOUT = +process.env.UPSTREAM_TIMEOUT_MS || 8000;    // presupuesto TOTAL (tope duro)
const PER_MODEL_TIMEOUT = +process.env.PER_MODEL_TIMEOUT_MS || 4000;  // tope POR modelo → entran 2 intentos en 8s
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
  // Reservo el ÚLTIMO slot para la RED PAGA (si hay): así el pago siempre cierra la cadena (candado B),
  // y el resto del presupuesto va a los free mejor-rankeados. Si no hay pago, todo free.
  const nFree = paid.length ? Math.max(1, CHAIN_MAX - 1) : CHAIN_MAX;
  const chain = free.slice(0, nFree);
  if (paid.length) chain.push(paid[0]);
  return chain;
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

async function ask(messages) {
  const deadline = Date.now() + UPSTREAM_TIMEOUT;        // presupuesto TOTAL (tope duro)
  let timedOut = false;
  for (const model of activeChain()) {                   // cadena (auto-pilot F2 o estática): si el 1º no contesta, prueba el 2º
    const left = deadline - Date.now();
    if (left <= 500) break;                              // sin tiempo → cortar y caer a la línea temática
    // modelo PAGO sin presupuesto del día → saltarlo (no se gasta): el chat cae al pool del cliente
    if (PAID_MODELS.has(model) && paidLeft() <= 0) { incAttempt(model, 'paid_budget'); continue; }
    const slice = Math.min(left, PER_MODEL_TIMEOUT);     // tope POR modelo (deja tiempo para el siguiente)
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), slice);
    try {
      const r = await fetch(BASE + '/chat/completions', {
        method: 'POST', signal: ctrl.signal,
        headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, temperature: 0.9, max_tokens: 120 }),
      });
      clearTimeout(to);
      if (r.status === 429 || r.status === 404) { incAttempt(model, r.status === 429 ? 'http_429' : 'http_404'); continue; }   // saturado / no existe → próximo
      if (!r.ok) { incAttempt(model, 'http_other'); throw new Error('OpenRouter ' + r.status); }
      const d = await r.json();
      const reply = d.choices?.[0]?.message?.content;
      if (reply) { incAttempt(model, 'ok'); if (PAID_MODELS.has(model)) paidHit(); return { reply: reply.trim(), model }; }   // ← qué modelo ganó (si fue pago, descuenta del presupuesto)
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  if (req.method === 'GET' && (req.url === '/health' || req.url === '/healthz')) { res.writeHead(200); return res.end('ok'); }   // probe k8s
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
  if (req.method === 'GET' && req.url === '/ranking') {                            // F2: mejor/más-barato (juego/landing/Grafana)
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' });
    return res.end(JSON.stringify({ autopilot: AUTOPILOT, chain: activeChain(), models: ranking(), updated: Date.now() }));
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
      `# HELP tormenta_ai_unique_sessions_today Session-ids distintos vistos hoy (usuarios aprox)\n# TYPE tormenta_ai_unique_sessions_today gauge\ntormenta_ai_unique_sessions_today ${UNIQ.sids.size}\n` +
      `# HELP tormenta_ai_unique_ips_today IPs remotas distintas vistas hoy (real con PROXY protocol)\n# TYPE tormenta_ai_unique_ips_today gauge\ntormenta_ai_unique_ips_today ${UNIQ.ips.size}\n`;
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
  if (req.method !== 'POST') { res.writeHead(405); return res.end('POST'); }

  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '?').split(',')[0].trim();
  const sid = (req.headers['x-session-id'] || '').toString().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || null;
  const key = sid || ip;                 // detrás del G4 la ip colapsa → llaveamos por session-id del cliente
  seenToday(sid, ip);                    // únicos del día (usuarios)
  // ráfaga (12/min) → "pará un cacho" (no es el cupo del día, es anti-spam instantáneo)
  if (!allowed(key)) { incChat('-', '-', 'ratelimited'); res.writeHead(429, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ reply: '“Pará, pará... dejame respirar un cacho y seguimos, ¿dale?” 😮‍💨' })); }
  // CUPO DEL DÍA agotado → NO se llama al upstream (no se quema token): mensaje en personaje + upsell.
  // capped:true → el cliente muestra esto (y puede abrir BYOK/suscripción), no cae al pool genérico.
  if (dailyLeft(key) <= 0) {
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
    let npc, message, history;
    try { ({ npc, message, history } = JSON.parse(body || '{}')); } catch (e) {}
    if (!message) { res.writeHead(400, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ reply: '“¿Eh? No te escuché, pibe.”' })); }
    dailyHit(key);                      // cuenta este chat contra el cupo del día (sea IA o fallback)
    M.requests++; const t0 = Date.now();
    const npcLbl = cleanLbl(npc, 24);
    try {
      const { reply, model } = await ask(buildMessages(npc, message, history));
      const dt = Date.now() - t0; M.durMsSum += dt; M.durCount++;
      const be = backendOf(model);
      incChat(model, be, 'ai'); obsLatency(model, be, dt / 1000);   // ← qué modelo/backend + latencia, por uso
      reqLog({ sid, ip, npc: npcLbl, model, be, outcome: 'ai', ms: dt });   // cruce fino en Loki (qué hace cada sesión/ip)
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ reply }));
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
