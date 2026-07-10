// gen-ia-scout.mjs — Argo CronWorkflow DIARIO (specs/ia-costos.md §3): "aprender qué modelos están bien y son
// baratos" POR PATRÓN de uso (chat / gen / banco). Lista los model_names del pool (LiteLLM /v1/models), corre un
// MINI-BENCH con prompts estándar por patrón, cruza precios (OR_PRICES del cron `precios` vía GET /or-models del
// proxy… acá usamos /ia-prices) y publica ranking + recomendaciones (POST /ia-report). NO cambia el ruteo: la
// config de LiteLLM/values-prod es dominio del dueño. Node puro, sin deps.
//
//   AI_BASE_URL=http://litellm-proxy:4000/v1  AI_API_KEY=sk-...  REPORT_POST_URL=http://tormenta-ai-proxy/ia-report
//   PRICES_URL=http://tormenta-ai-proxy/precios-vista  GEN_TOKEN=...  node gen-ia-scout.mjs
const AI_BASE = (process.env.AI_BASE_URL || 'http://litellm-proxy:4000/v1').replace(/\/+$/, '');
const AI_KEY = (process.env.AI_API_KEY || process.env.AI_KEY || '').trim();
const POST_URL = process.env.REPORT_POST_URL || '';
const TOKEN = process.env.GEN_TOKEN || '';
const EXCLUDE = new RegExp(process.env.SCOUT_EXCLUDE || 'local|rk1|ollama|embed|whisper', 'i');   // GPU/NPU apagables y no-chat
const MAX_MODELS = +process.env.SCOUT_MAX_MODELS || 12;

// ---- LOS PATRONES (specs/ia-costos.md §1): prompts estándar + estándares de aprobación --------------------
const GROUND = 'Contexto del mundo: pasó una tormenta solar, todo glitcheado; la IA maneja satélites; el jugador ganó el Nivel 2 y anda en tren. ';
const PATTERNS = {
  chat: {   // tiempo real, en personaje — confiabilidad > precio
    maxTokens: 150, timeoutMs: 9500, minOk: 3, p95Max: 8000,   // calibrado 2026-07-10: claude-sonnet real = 5-7s (falló por 20ms con 7000); el cliente aguanta 11s y prod usa PER_MODEL 9.5s
    prompts: [
      ['Sos Doña Rosa, referente de un comedor popular de la Villa 31: cálida, rioplatense, madraza. ' + GROUND + 'No rompas personaje.', 'hola doña rosa, en qué ayudo?'],
      ['Sos un maquinista de tren bonachón y curda simpático de Villa Ballester. Habla rioplatense. ' + GROUND, 'che maestro, y el tren a campana?'],
      ['Sos un linyera filósofo de la calle Florida, porteño, cálido. ' + GROUND, 'qué onda el sol, se apagó en serio?'],
    ],
    check: (txt) => esCastellano(txt) && !cotLeak(txt) && txt.length > 15 && txt.length < 1400,
  },
  gen: {    // JSON estructurado batch — precio bajo, hasta 14s
    maxTokens: 380, timeoutMs: 14000, minOk: 2, p95Max: 14000,
    prompts: [
      ['Sos generador de niveles de un juego. Respondé SOLO JSON válido, sin markdown.', 'Generá {"name":"...","intro":"...","lines":["...","..."]} para un edificio abandonado de Buenos Aires con tema fantasmas.'],
      ['Sos generador de tiendas de un juego. Respondé SOLO JSON válido, sin markdown.', 'Generá {"nombre":"...","productos":[{"item":"...","cost":9}]} para una tienda rara de la cueva (2 productos).'],
    ],
    check: (txt) => { try { const j = JSON.parse(String(txt).replace(/^```(json)?|```$/gm, '').trim()); return j && typeof j === 'object'; } catch (e) { return false; } },
  },
  banco: {  // texto corto batch (carteles/noticias/cine/chusmerío) — EL MÁS BARATO que apruebe
    maxTokens: 90, timeoutMs: 20000, minOk: 2, p95Max: 20000,
    prompts: [
      ['Escribís carteles cortos con humor porteño para un juego. UNA frase, sin comillas.', 'Un cartel del cine del barrio anunciando que pasan la final del Mundial.'],
      ['Escribís chusmerío de barrio con humor rioplatense. UNA o dos frases.', 'Un vecino comenta el apagón de la tormenta solar.'],
    ],
    check: (txt) => esCastellano(txt) && !cotLeak(txt) && txt.length >= 10 && txt.length <= 400,
  },
};
function esCastellano(t) { return /\b(que|con|para|los|las|una|est[áa]|ch[ée]|vos|acá|aca|querés|tenés|mirá|dale)\b/i.test(t); }
function cotLeak(t) { return /<think|<reason|chain.of.thought|let me think|first,? i (will|need)/i.test(t); }

// ---- bench -------------------------------------------------------------------------------------------------
async function askModel(model, sys, user, maxTokens, timeoutMs) {
  const t0 = Date.now(); const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(AI_BASE + '/chat/completions', { method: 'POST', signal: ctrl.signal,
      headers: { Authorization: 'Bearer ' + AI_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, temperature: 0.8, max_tokens: maxTokens, messages: [{ role: 'system', content: sys }, { role: 'user', content: user }] }) });
    clearTimeout(to);
    if (!r.ok) return { ok: false, ms: Date.now() - t0, err: 'http ' + r.status };
    const j = await r.json();
    const txt = j.choices?.[0]?.message?.content || '';
    const outTok = (j.usage && j.usage.completion_tokens) || 0;
    return { ok: !!txt, ms: Date.now() - t0, txt, outTok };
  } catch (e) { clearTimeout(to); return { ok: false, ms: Date.now() - t0, err: e.name === 'AbortError' ? 'timeout' : e.message }; }
}

// modelos del pool del dueño (LiteLLM sabe la verdad)
const lm = await fetch(AI_BASE + '/models', { headers: { Authorization: 'Bearer ' + AI_KEY } });
if (!lm.ok) { console.error('litellm /models', lm.status); process.exit(1); }
// CHAIN_HINT = los modelos de las cadenas ACTIVAS (AI_MODEL/SUB_MODELS) — van PRIMERO: el titular se benchmarkea
// SIEMPRE aunque el pool tenga más de MAX_MODELS (1er scout real: claude-sonnet quedó fuera del slice ciego).
const HINT = (process.env.CHAIN_HINT || '').split(',').map(x => x.trim()).filter(Boolean);
let models = ((await lm.json()).data || []).map(m => m.id).filter(id => !EXCLUDE.test(id));
models.sort((a, b) => (HINT.includes(b) ? 1 : 0) - (HINT.includes(a) ? 1 : 0));
models = [...new Set([...HINT.filter(h => models.includes(h)), ...models])].slice(0, MAX_MODELS);
console.error('candidatos:', models.join(', '));

// precios del catálogo OR (el cron `precios` los dejó en el proxy) — best-effort para el score
let orPrices = {};
try { const pr = await fetch((process.env.PRICES_URL || '').trim() || (POST_URL.replace(/\/ia-report$/, '/precios'))); if (pr.ok) { const d = await pr.json(); orPrices = d.prices || {}; } } catch (e) {}
function blended(id) {   // $/1M blended (in + 3·out)/4; matchea por nombre aproximado del model_name → id de OR
  for (const k in orPrices) { const short = k.split('/').pop().replace(/:free$/, ''); if (id.includes(short) || short.includes(id)) { const p = orPrices[k]; return +(((+p.prompt || 0) + 3 * (+p.completion || 0)) / 4 * 1e6).toFixed(2); } }
  return null;   // desconocido (no descalifica: se reporta "?")
}

const results = {};
for (const model of models) {
  results[model] = {};
  for (const pat in PATTERNS) {
    const P = PATTERNS[pat]; const runs = [];
    for (const [sys, user] of P.prompts) runs.push(await askModel(model, sys, user, P.maxTokens, P.timeoutMs));
    const okRuns = runs.filter(x => x.ok && P.check(x.txt) && (!x.outTok || x.outTok <= P.maxTokens * 1.25));
    const lat = runs.map(x => x.ms).sort((a, b) => a - b);
    const p95 = lat[lat.length - 1] || 0;
    const price = blended(model);
    const pass = okRuns.length >= P.minOk && p95 <= P.p95Max;
    const score = pass ? +(100 - (price || 2) - p95 / 500).toFixed(1) : 0;
    results[model][pat] = { pass, ok: okRuns.length + '/' + runs.length, p95Ms: p95, priceUsdM: price, score };
    console.error(`${model} · ${pat}: ${pass ? 'PASS' : 'fail'} (${okRuns.length}/${runs.length}, p95 ${p95}ms, $${price == null ? '?' : price}/M)`);
  }
}

// ranking por patrón + recomendación
const rank = {}; const recs = [];
for (const pat in PATTERNS) {
  rank[pat] = models.map(m => ({ model: m, ...results[m][pat] })).filter(x => x.pass).sort((a, b) => b.score - a.score);
  const best = rank[pat][0];
  recs.push(pat + ': ' + (best ? `#1 ${best.model} (p95 ${best.p95Ms}ms, $${best.priceUsdM == null ? '?' : best.priceUsdM}/M)` : 'ninguno pasó el estándar HOY en el bench (la cadena activa sigue igual; el estado real está en el health)'));
}
// candidatos nuevos del catálogo OR: baratos (<$1/M) que NO están en el pool
const newbies = Object.entries(orPrices)
  .map(([id, p]) => ({ id, usdM: +(((+p.prompt || 0) + 3 * (+p.completion || 0)) / 4 * 1e6).toFixed(2), free: !!p.free }))
  .filter(x => x.usdM < 1 && !models.some(m => x.id.includes(m) || m.includes(x.id.split('/').pop().replace(/:free$/, ''))))
  .slice(0, 6);

const report = { kind: 'scout', ts: Date.now(), models, rank, recs, paraAgregar: newbies,
  nota: 'Recomendación, NO cambia el ruteo: la cadena se toca en ai-proxy/chart/values-prod.yaml (dominio del dueño). Patrones en specs/ia-costos.md §1.' };
console.error('RECOMENDACIONES:\n - ' + recs.join('\n - '));

if (POST_URL && TOKEN) {
  const res = await fetch(POST_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-gen-token': TOKEN }, body: JSON.stringify(report) });
  console.error('POST', POST_URL, '->', res.status);
  process.exit(res.ok ? 0 : 1);
} else {
  console.log(JSON.stringify(report, null, 1));
}
