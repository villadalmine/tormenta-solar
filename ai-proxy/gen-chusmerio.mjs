// gen-chusmerio.mjs — Argo CronWorkflow: GENERA frases de CHUSMERÍO ambiente (npcs-vivos.md) con un modelo
// (gemma4-paid) y las postea al proxy (POST /chusmerio → banco). Los NPC del juego las rotan en globitos.
// Acá el modelo SÍ inventa (es flavor porteño sobre el mundo del juego). Node puro, sin deps.
// Bilingüe (ES/EN, mismo molde que gen-historias.mjs): pide las 24 líneas en los DOS idiomas en paralelo y
// postea {lineas, lineasEn} — lineasEn es ADITIVO, un proxy/cliente viejo que no lo lea sigue andando igual.
//   CHUSME_POST_URL=http://tormenta-ai-proxy/chusmerio  GEN_TOKEN=...  AI_BASE_URL=...  AI_API_KEY=...  node gen-chusmerio.mjs
const POST_URL = process.env.CHUSME_POST_URL || '';
const TOKEN = process.env.GEN_TOKEN || '';
const AI_BASE = (process.env.AI_BASE_URL || 'http://litellm-proxy:4000/v1').replace(/\/+$/, '');
const AI_KEY = (process.env.AI_API_KEY || process.env.AI_KEY || '').trim();
let MODEL = process.env.CHUSME_MODEL || 'gemma4-paid';
// AUTOTUNE banco (specs/ia-costos.md §6): si el tuner eligió un modelo para el patrón `banco`, usarlo.
// ADITIVO: si el proxy no responde o no hay override → queda el env de siempre. IA_CHAIN_URL viene del chart.
try { const _c = await (await fetch(process.env.IA_CHAIN_URL || 'http://tormenta-ai-proxy/ia-chain')).json();
  if (_c && Array.isArray(_c.effectiveBanco) && _c.effectiveBanco[0]) { MODEL = _c.effectiveBanco[0]; console.error('modelo banco por autotune:', MODEL); }
} catch (e) {}

async function pedir(lang) {
  const en = lang === 'en';
  const sys = en
    ? 'You are a chatty, streetwise Buenos Aires drifter. Short lines, Argentine humor, gossipy tone.'
    : 'Sos un linyera chusmoso y canchero de Buenos Aires. Hablás en slang porteño, frases cortas con humor.';
  const usr = en
    ? 'Make up 24 SHORT lines (max 12 words) of GOSSIP that characters in the game "Tormenta Solar" '
      + '(Florida & Lavalle, Buenos Aires) would say to each other on the street, like an offhand remark. Game-world '
      + 'topics: the SOLAR STORM (a rebel AI satellite), the CHINESE-RUN CORNER STORE, the CINEMA showing the World '
      + 'Cup, fake AD POSTERS, the DRUNKS, the CARD SHARP, the philosopher DRIFTERS, the money-changers on the corner. '
      + 'Buenos-Aires-English tone, gossipy, humorous. Reply ONLY a JSON array of strings, no markdown or extra text.'
    : 'Inventá 24 frases CORTAS (máx 12 palabras) de CHUSMERÍO que los personajes del juego "Tormenta Solar" '
      + '(Florida y Lavalle, Buenos Aires) se dirían entre ellos en la calle, tipo comentario al pasar. Temas del mundo del '
      + 'juego: la TORMENTA SOLAR (un satélite con IA que se rebeló), el SUPER CHINO, el CINE donde pasan el Mundial, los '
      + 'CARTELES de propaganda trucha, los BORRACHINES, el TAHÚR del truco, los LINYERAS filósofos, los arbolitos del dólar. '
      + 'Tono PORTEÑO con humor, chusmoso. Devolvé SOLO un array JSON de strings, sin markdown ni texto extra.';
  try {
    const r = await fetch(AI_BASE + '/chat/completions', { method: 'POST', headers: { Authorization: 'Bearer ' + AI_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, temperature: 1.0, max_tokens: 700, messages: [{ role: 'system', content: sys }, { role: 'user', content: usr }] }) });
    if (!r.ok) return [];
    const t = (await r.json()).choices?.[0]?.message?.content || '';
    const m = t.match(/\[[\s\S]*\]/);
    if (!m) return [];
    return (JSON.parse(m[0]) || []).filter(x => typeof x === 'string').map(x => x.trim().slice(0, 90)).filter(Boolean);
  } catch (e) { console.error('chusmerio gen (' + lang + ') falló:', e.message); return []; }
}

let lineas = [], lineasEn = [];
if (AI_KEY) [lineas, lineasEn] = await Promise.all([pedir('es'), pedir('en')]);

console.error('chusmerio lineas=' + lineas.length + ' lineasEn=' + lineasEn.length);

if (POST_URL && TOKEN && lineas.length) {
  const res = await fetch(POST_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-gen-token': TOKEN }, body: JSON.stringify({ lineas, lineasEn }) });
  console.error('POST', POST_URL, '->', res.status);
  process.exit(res.ok ? 0 : 1);
} else {
  console.log(JSON.stringify({ lineas, lineasEn }, null, 1));   // modo prueba
}
