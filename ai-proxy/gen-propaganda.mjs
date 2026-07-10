// gen-propaganda.mjs — Argo CronWorkflow: genera CARTELES de propaganda FALSOS estilo Buenos Aires por rubro
// (comida/ropa/electronica/bizarro) con un modelo (gemma4-paid) y los postea al proxy (POST /propaganda → banco
// del CINE). A diferencia de las noticias, acá el modelo SÍ inventa (es el punto: marcas fake con humor porteño).
// Node puro, sin deps.
//   PROP_POST_URL=http://tormenta-ai-proxy/propaganda  GEN_TOKEN=...  AI_BASE_URL=...  AI_API_KEY=...  node gen-propaganda.mjs
const POST_URL = process.env.PROP_POST_URL || '';
const TOKEN = process.env.GEN_TOKEN || '';
const AI_BASE = (process.env.AI_BASE_URL || 'http://litellm-proxy:4000/v1').replace(/\/+$/, '');
const AI_KEY = (process.env.AI_API_KEY || process.env.AI_KEY || '').trim();
let MODEL = process.env.PROP_MODEL || 'gemma4-paid';
// AUTOTUNE banco (specs/ia-costos.md §6): si el tuner eligió un modelo para el patrón `banco`, usarlo.
// ADITIVO: si el proxy no responde o no hay override → queda el env de siempre. IA_CHAIN_URL viene del chart.
try { const _c = await (await fetch(process.env.IA_CHAIN_URL || 'http://tormenta-ai-proxy/ia-chain')).json();
  if (_c && Array.isArray(_c.effectiveBanco) && _c.effectiveBanco[0]) { MODEL = _c.effectiveBanco[0]; console.error('modelo banco por autotune:', MODEL); }
} catch (e) {}


const RUBROS = {
  comida: 'comida (parrillas, pizzerías, empanadas, heladerías, bares de Buenos Aires)',
  ropa: 'ropa (jeans, camperas, zapatillas, outlets tipo Once / Av. Avellaneda / La Salada)',
  electronica: 'electrónica (celulares, TVs, audio, cargadores — medio truchos, tipo Garbarino/cueva)',
  bizarro: 'negocios BIZARROS e inventados (rubros absurdos: ovnis, brujería, interdimensional, remís a Marte)',
};

async function pedir(cat, desc) {
  try {
    const r = await fetch(AI_BASE + '/chat/completions', { method: 'POST', headers: { Authorization: 'Bearer ' + AI_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, temperature: 1.0, max_tokens: 500, messages: [
        { role: 'system', content: 'Sos un creativo publicitario PORTEÑO. Inventás marcas FALSAS y graciosas de Buenos Aires, creíbles pero con humor. NO uses marcas reales registradas.' },
        { role: 'user', content: `Dame 8 marcas FALSAS del rubro ${desc}. Cada una: "brand" (nombre corto) y "slogan" (máx 8 palabras, tono porteño). Devolvé SOLO un array JSON: [{"brand":"...","slogan":"..."}]. Sin texto extra, sin markdown.` }] }) });
    if (!r.ok) return [];
    let t = (await r.json()).choices?.[0]?.message?.content || '';
    const m = t.match(/\[[\s\S]*\]/);             // extraé el array aunque venga con ```json o texto
    if (!m) return [];
    const arr = JSON.parse(m[0]);
    return (Array.isArray(arr) ? arr : []).map(x => ({ cat, brand: String(x.brand || '').slice(0, 40).trim(), slogan: String(x.slogan || '').slice(0, 60).trim() }))
      .filter(x => x.brand && x.slogan);
  } catch (e) { console.error('rubro', cat, 'falló:', e.message); return []; }
}

const carteles = [];
if (AI_KEY) for (const [cat, desc] of Object.entries(RUBROS)) { const c = await pedir(cat, desc); carteles.push(...c); }

// CLIMA en varias ciudades (open-meteo, sin key, NO usa modelo) → cartel 'clima' con datos reales. (cartel-ai del dueño)
try {
  const cities = [['BsAs', -34.6, -58.4], ['Madrid', 40.4, -3.7], ['Tokio', 35.7, 139.7], ['NY', 40.7, -74.0], ['Doha', 25.3, 51.5]];
  const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + cities.map(c => c[1]).join(',') + '&longitude=' + cities.map(c => c[2]).join(',') + '&current=temperature_2m';
  const arr = await (await fetch(url)).json();
  const parts = (Array.isArray(arr) ? arr : [arr]).map((x, i) => { const t = x?.current?.temperature_2m; return t == null ? null : `${cities[i][0]} ${Math.round(t)}°`; }).filter(Boolean);
  if (parts.length) carteles.push({ cat: 'clima', brand: '🌡️ CLIMA', slogan: parts.join(' · ') });
} catch (e) { console.error('clima falló:', e.message); }

console.error('carteles=' + carteles.length + ' por rubro=' + JSON.stringify(Object.fromEntries(Object.keys(RUBROS).map(c => [c, carteles.filter(x => x.cat === c).length]))));

if (POST_URL && TOKEN) {
  const res = await fetch(POST_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-gen-token': TOKEN }, body: JSON.stringify({ carteles }) });
  console.error('POST', POST_URL, '->', res.status);
  process.exit(res.ok ? 0 : 1);
} else {
  console.log(JSON.stringify({ carteles }, null, 1));   // modo prueba (sin POST)
}
