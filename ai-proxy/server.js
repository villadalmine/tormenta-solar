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
// TOPE DURO de latencia: el linyera no puede tardar >10s. Cortamos el upstream a 8s; el cliente espera 9s.
const UPSTREAM_TIMEOUT = +process.env.UPSTREAM_TIMEOUT_MS || 8000;    // presupuesto TOTAL (tope duro)
const PER_MODEL_TIMEOUT = +process.env.PER_MODEL_TIMEOUT_MS || 4000;  // tope POR modelo → entran 2 intentos en 8s
// Métricas prometheus (para Grafana): requests, timeouts, errores y suma/cuenta de duración (→ latencia media).
const M = { requests: 0, timeouts: 0, errors: 0, fallbackLines: 0, durMsSum: 0, durCount: 0 };
const MODEL_ENV = process.env.AI_MODEL || process.env.OPENROUTER_MODEL;
const MODELS = MODEL_ENV ? MODEL_ENV.split(',').map(s => s.trim()).filter(Boolean) : [
  'meta-llama/llama-3.3-70b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
  'deepseek/deepseek-chat-v3-0324:free',
];
if (!KEY) { console.error('Falta AI_API_KEY (o OPENROUTER_API_KEY)'); process.exit(1); }

const RATE = new Map();                 // ip -> [timestamps] (máx 12 por minuto)
function allowed(ip) {
  const now = Date.now();
  const hits = (RATE.get(ip) || []).filter(t => now - t < 60000);
  if (hits.length >= 12) { RATE.set(ip, hits); return false; }
  hits.push(now); RATE.set(ip, hits); return true;
}

async function ask(messages) {
  const deadline = Date.now() + UPSTREAM_TIMEOUT;        // presupuesto TOTAL (tope duro)
  let timedOut = false;
  for (const model of MODELS) {                          // cadena: si el 1º no contesta, prueba el 2º
    const left = deadline - Date.now();
    if (left <= 500) break;                              // sin tiempo → cortar y caer a la línea temática
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
      if (r.status === 429 || r.status === 404) continue;   // saturado / no existe → próximo modelo
      if (!r.ok) throw new Error('OpenRouter ' + r.status);
      const d = await r.json();
      const reply = d.choices?.[0]?.message?.content;
      if (reply) return reply.trim();
    } catch (e) {
      clearTimeout(to);
      if (e.name === 'AbortError') { M.timeouts++; timedOut = true; continue; }  // este tardó → probá el siguiente
      /* otro error → probá el siguiente modelo */
    }
  }
  throw new Error(timedOut ? 'upstream timeout' : 'todos los modelos fallaron');
}

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  if (req.method === 'GET' && (req.url === '/health' || req.url === '/healthz')) { res.writeHead(200); return res.end('ok'); }   // probe k8s
  if (req.method === 'GET' && req.url === '/metrics') {                            // prometheus → Grafana
    const avg = M.durCount ? (M.durMsSum / M.durCount) : 0;
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end(
      `# HELP tormenta_ai_requests_total Chat requests al proxy del linyera\n# TYPE tormenta_ai_requests_total counter\ntormenta_ai_requests_total ${M.requests}\n` +
      `# HELP tormenta_ai_timeouts_total Requests que pasaron el tope de ${UPSTREAM_TIMEOUT}ms\n# TYPE tormenta_ai_timeouts_total counter\ntormenta_ai_timeouts_total ${M.timeouts}\n` +
      `# HELP tormenta_ai_errors_total Errores de upstream (no timeout)\n# TYPE tormenta_ai_errors_total counter\ntormenta_ai_errors_total ${M.errors}\n` +
      `# HELP tormenta_ai_fallback_lines_total Respuestas servidas con línea local (timeout/error)\n# TYPE tormenta_ai_fallback_lines_total counter\ntormenta_ai_fallback_lines_total ${M.fallbackLines}\n` +
      `# HELP tormenta_ai_latency_ms_avg Latencia media (ms) de las respuestas con IA\n# TYPE tormenta_ai_latency_ms_avg gauge\ntormenta_ai_latency_ms_avg ${avg.toFixed(0)}\n`);
  }
  if (req.method !== 'POST') { res.writeHead(405); return res.end('POST'); }

  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '?').split(',')[0].trim();
  if (!allowed(ip)) { res.writeHead(429, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ reply: '“Pará, pará... dejame respirar un cacho y seguimos, ¿dale?” 😮‍💨' })); }

  let body = '';
  req.on('data', c => { body += c; if (body.length > 8000) req.destroy(); });
  req.on('end', async () => {
    let npc, message, history;
    try { ({ npc, message, history } = JSON.parse(body || '{}')); } catch (e) {}
    if (!message) { res.writeHead(400, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ reply: '“¿Eh? No te escuché, pibe.”' })); }
    M.requests++; const t0 = Date.now();
    try {
      const reply = await ask(buildMessages(npc, message, history));
      M.durMsSum += Date.now() - t0; M.durCount++;
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ reply }));
    } catch (e) {
      if (e.message !== 'upstream timeout') M.errors++;     // timeout ya contado en ask()
      M.fallbackLines++;
      // línea TEMÁTICA de timeout (combina con el cliente): la tormenta saturó el modelo
      const line = e.message === 'upstream timeout'
        ? '“⚡ La tormenta solar saturó el modelo... se colgó y corté. Tirámelo de nuevo, pibe.”'
        : '“Se me fue la idea... el sol me quema el bocho. Repetime.” 🌞';
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ reply: line }));
    }
  });
}).listen(PORT, () => console.log('ai-proxy escuchando en :' + PORT + ' → upstream ' + BASE + ' (modelos: ' + MODELS.join(', ') + ')'));
