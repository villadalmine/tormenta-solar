// gen-prices.mjs — Argo CronWorkflow: lee /api/v1/models de OpenRouter (PÚBLICO) y publica al proxy
// los PRECIOS de los candidatos + las NOVEDADES. Cron = siempre Argo (versatilidad). Node puro, sin deps.
// Ver specs/openrouter-dinamico.md (F1 precios + F3 novedades).
//
//   OR_MODELS_URL=...  PRICES_POST_URL=http://tormenta-ai-proxy/precios  GEN_TOKEN=...  node gen-prices.mjs
const URL = process.env.OR_MODELS_URL || 'https://openrouter.ai/api/v1/models';
const POST_URL = process.env.PRICES_POST_URL || '';
const TOKEN = process.env.GEN_TOKEN || '';
const CANDIDATES = (process.env.OR_PRICE_MODELS || [
  'google/gemma-4-31b-it:free', 'google/gemma-4-26b-a4b-it:free', 'openai/gpt-oss-20b:free',
  'moonshotai/kimi-k2.6:free', 'google/gemini-2.0-flash-001', 'openai/gpt-4o-mini', 'openai/gpt-4o',
].join(',')).split(',').map(s => s.trim()).filter(Boolean);

const r = await fetch(URL, { headers: { 'Accept': 'application/json' } });
if (!r.ok) { console.error('OpenRouter /models', r.status); process.exit(1); }
const models = (await r.json()).data || [];

const prices = {};
for (const m of models) {
  if (!CANDIDATES.includes(m.id)) continue;
  const p = m.pricing || {};
  prices[m.id] = { prompt: +p.prompt || 0, completion: +p.completion || 0, name: m.name || m.id, free: p.prompt === '0' && p.completion === '0' };
}
// NOVEDADES: modelos FREE más nuevos (created desc), top 8 — "modelos interesantes para que uses"
const news = models.filter(m => (m.pricing || {}).prompt === '0').sort((a, b) => (b.created || 0) - (a.created || 0)).slice(0, 8)
  .map(m => ({ id: m.id, name: m.name, ctx: m.context_length || 0, desc: String(m.description || '').slice(0, 160) }));

console.error('precios=' + Object.keys(prices).length + ' novedades=' + news.length + ' (de ' + models.length + ' modelos)');

if (POST_URL && TOKEN) {
  const res = await fetch(POST_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-gen-token': TOKEN }, body: JSON.stringify({ prices, news }) });
  console.error('POST', POST_URL, '->', res.status);
  process.exit(res.ok ? 0 : 1);
} else {
  console.log(JSON.stringify({ prices, news }, null, 1));   // modo prueba
}
