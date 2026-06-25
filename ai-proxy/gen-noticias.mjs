// gen-noticias.mjs — Argo CronWorkflow: trae NOTICIAS por topic y las publica al proxy (banco /noticias).
// CLAVE (cine-noticias.md §3.1): el FETCH lo hace ESTE cron (código), NO un modelo. Node puro, sin deps.
// Fuente F1: GOOGLE NEWS RSS (búsqueda por topic, PÚBLICO sin key, español AR) → titular real, cubre TODO
// (fútbol/Mundial, Argentina, mundo, etc.) y refresca cada corrida. fetch() de Node sigue el 302 solo.
// Fútbol con RESULTADO exacto = opt-in NEWS_SPORTS (TheSportsDB, key de prueba).
//
//   NEWS_POST_URL=http://tormenta-ai-proxy/noticias  GEN_TOKEN=...  node gen-noticias.mjs
const POST_URL = process.env.NEWS_POST_URL || '';
const TOKEN = process.env.GEN_TOKEN || '';

// topic → query de Google News (en español, región AR). El titular = la "noticia" que se le lleva al linyera.
const TOPICS = JSON.parse(process.env.NEWS_TOPICS || JSON.stringify({
  mundo: 'noticias del mundo', mundial: 'mundial futbol resultado', 'primera-b': 'primera b nacional argentina',
  videojuegos: 'videojuegos', guerra: 'guerra conflicto', argentina: 'argentina noticias',
  'paises-bajos': 'países bajos holanda', arabe: 'arabia mundo árabe', ia: 'inteligencia artificial',
  bochas: 'bochas liga',
  finanzas: 'bolsa acciones mercado financiero', colombofila: 'colombofilia palomas mensajeras competencia',
  'consolas-retro': 'consolas retro coleccionistas precio 8 bits 16 bits',
}));

function decode(s) {
  return String(s).replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).trim();
}
async function gnewsTop(q) {
  try {
    const url = 'https://news.google.com/rss/search?q=' + encodeURIComponent(q) + '&hl=es-419&gl=AR&ceid=AR:es';
    const r = await fetch(url, { headers: { Accept: 'application/xml' } });   // Node fetch sigue el 302 solo
    if (!r.ok) return null;
    const xml = await r.text();
    const items = xml.split('<item>').slice(1);              // saltea el <title> del canal (va antes del 1er item)
    for (const it of items) {
      const m = it.match(/<title>(.*?)<\/title>/s);
      if (!m) continue;
      let t = decode(m[1]).replace(/\s+-\s+[^-]+$/, '').trim();   // saca " - Fuente" del final
      if (t.length > 8) return { headline: t.slice(0, 160), answer: t.slice(0, 160) };
    }
    return null;
  } catch (e) { return null; }
}

const noticias = [];
for (const [topic, q] of Object.entries(TOPICS)) {
  const n = await gnewsTop(q);
  if (n) noticias.push({ topic, ...n, ts: Date.now() });
}

// "Captura por IA NPC" (opcional): un modelo FIEL rephrasea el TITULAR de display. El `answer` queda CRUDO
// (el titular real, lo que el linyera verifica). Validado (2026-06-25): GPU/NPU NO sirven (GPU inventa datos,
// NPU caída) → gemma4-paid. Corre 1×/día, así que el costo/latencia da igual. Si falla, queda el crudo.
const SUM_MODEL = process.env.NEWS_SUMMARIZE_MODEL || '';
const AI_BASE = (process.env.AI_BASE_URL || 'http://litellm-proxy:4000/v1').replace(/\/+$/, '');
const AI_KEY = (process.env.AI_API_KEY || process.env.AI_KEY || '').trim();
async function capturar(headline) {
  try {
    const r = await fetch(AI_BASE + '/chat/completions', { method: 'POST', headers: { Authorization: 'Bearer ' + AI_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: SUM_MODEL, temperature: 0.4, max_tokens: 40, messages: [
        { role: 'system', content: 'Resumí el titular a UNA frase corta, FIEL y clara en español rioplatense (máx 12 palabras). NO inventes ni agregues datos que no estén en el titular. Solo la frase, sin comillas.' },
        { role: 'user', content: headline }] }) });
    if (!r.ok) return null;
    const t = (await r.json()).choices?.[0]?.message?.content;
    return t ? t.trim().replace(/^["']+|["']+$/g, '').slice(0, 140) : null;
  } catch (e) { return null; }
}
if (SUM_MODEL && AI_KEY) for (const n of noticias) { const c = await capturar(n.headline); if (c) n.headline = c; }   // answer queda crudo (fiel)

// CRYPTO (CoinGecko, sin key) — DESPUÉS del resumen para que los NÚMEROS no se toquen. Precio real BTC/ETH.
try {
  const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true', { headers: { Accept: 'application/json' } });
  if (r.ok) { const d = await r.json(), fmt = c => `US$${Math.round(c.usd).toLocaleString('es-AR')} (${c.usd_24h_change >= 0 ? '+' : ''}${(+c.usd_24h_change).toFixed(1)}%)`;
    if (d.bitcoin && d.ethereum) noticias.push({ topic: 'crypto', headline: `Bitcoin ${fmt(d.bitcoin)} · Ethereum ${fmt(d.ethereum)}`, answer: `BTC ${Math.round(d.bitcoin.usd)} / ETH ${Math.round(d.ethereum.usd)}`, ts: Date.now() }); }
} catch (e) {}

// OPENROUTER — modelos + precios (API pública sin key). Unos populares con su US$/1M (NO se resume: son datos).
try {
  const r = await fetch('https://openrouter.ai/api/v1/models', { headers: { Accept: 'application/json' } });
  if (r.ok) { const ms = (await r.json()).data || [], pop = ['openai/gpt-4o-mini', 'google/gemini-2.5-flash-lite', 'anthropic/claude-sonnet-4.5', 'deepseek/deepseek-v4-flash', 'google/gemma-4-31b-it'];
    const parts = pop.map(id => { const m = ms.find(x => x.id === id); if (!m) return null; const p = (+m.pricing?.prompt + +m.pricing?.completion) * 1e6; return `${id.split('/').pop()} $${p.toFixed(2)}`; }).filter(Boolean);
    if (parts.length) noticias.push({ topic: 'openrouter', headline: 'Modelos OpenRouter (US$/1M): ' + parts.join(' · '), answer: parts[0], ts: Date.now() }); }
} catch (e) {}

// FÚTBOL con RESULTADO exacto (opt-in): NEWS_SPORTS="mundial:4406,primera-b:4391" → TheSportsDB (key prueba '3').
// Pisa/agrega el topic con un answer numérico ("2-1"). Best-effort: si falla, queda lo de Google News.
const SPORTS = (process.env.NEWS_SPORTS || '').split(',').map(s => s.trim()).filter(Boolean);
for (const pair of SPORTS) {
  const [topic, id] = pair.split(':');
  if (!topic || !id) continue;
  try {
    const r = await fetch('https://www.thesportsdb.com/api/v1/json/3/eventspastleague.php?id=' + id);
    if (!r.ok) continue;
    const ev = ((await r.json()).events || [])[0];
    if (ev && ev.intHomeScore != null && ev.intAwayScore != null) {
      const i = noticias.findIndex(n => n.topic === topic);
      const item = { topic, headline: `${ev.strHomeTeam} ${ev.intHomeScore}-${ev.intAwayScore} ${ev.strAwayTeam}`, answer: `${ev.intHomeScore}-${ev.intAwayScore}`, ts: Date.now() };
      if (i >= 0) noticias[i] = item; else noticias.push(item);
    }
  } catch (e) {}
}

console.error('noticias=' + noticias.length + ' topics=' + noticias.map(n => n.topic).join(','));

if (POST_URL && TOKEN) {
  const res = await fetch(POST_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-gen-token': TOKEN }, body: JSON.stringify({ noticias }) });
  console.error('POST', POST_URL, '->', res.status);
  process.exit(res.ok ? 0 : 1);
} else {
  console.log(JSON.stringify({ noticias }, null, 1));   // modo prueba (sin POST)
}
