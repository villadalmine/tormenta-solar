// gen-chusmerio.mjs — Argo CronWorkflow: GENERA frases de CHUSMERÍO ambiente (npcs-vivos.md) con un modelo
// (gemma4-paid) y las postea al proxy (POST /chusmerio → banco). Los NPC del juego las rotan en globitos.
// Acá el modelo SÍ inventa (es flavor porteño sobre el mundo del juego). Node puro, sin deps.
//   CHUSME_POST_URL=http://tormenta-ai-proxy/chusmerio  GEN_TOKEN=...  AI_BASE_URL=...  AI_API_KEY=...  node gen-chusmerio.mjs
const POST_URL = process.env.CHUSME_POST_URL || '';
const TOKEN = process.env.GEN_TOKEN || '';
const AI_BASE = (process.env.AI_BASE_URL || 'http://litellm-proxy:4000/v1').replace(/\/+$/, '');
const AI_KEY = (process.env.AI_API_KEY || process.env.AI_KEY || '').trim();
const MODEL = process.env.CHUSME_MODEL || 'gemma4-paid';

const PROMPT = 'Inventá 24 frases CORTAS (máx 12 palabras) de CHUSMERÍO que los personajes del juego "Tormenta Solar" '
  + '(Florida y Lavalle, Buenos Aires) se dirían entre ellos en la calle, tipo comentario al pasar. Temas del mundo del '
  + 'juego: la TORMENTA SOLAR (un satélite con IA que se rebeló), el SUPER CHINO, el CINE donde pasan el Mundial, los '
  + 'CARTELES de propaganda trucha, los BORRACHINES, el TAHÚR del truco, los LINYERAS filósofos, los arbolitos del dólar. '
  + 'Tono PORTEÑO con humor, chusmoso. Devolvé SOLO un array JSON de strings, sin markdown ni texto extra.';

let lineas = [];
if (AI_KEY) {
  try {
    const r = await fetch(AI_BASE + '/chat/completions', { method: 'POST', headers: { Authorization: 'Bearer ' + AI_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, temperature: 1.0, max_tokens: 700, messages: [
        { role: 'system', content: 'Sos un linyera chusmoso y canchero de Buenos Aires. Hablás en slang porteño, frases cortas con humor.' },
        { role: 'user', content: PROMPT }] }) });
    if (r.ok) {
      const t = (await r.json()).choices?.[0]?.message?.content || '';
      const m = t.match(/\[[\s\S]*\]/);
      if (m) lineas = (JSON.parse(m[0]) || []).filter(x => typeof x === 'string').map(x => x.trim().slice(0, 90)).filter(Boolean);
    }
  } catch (e) { console.error('chusmerio gen falló:', e.message); }
}

console.error('chusmerio lineas=' + lineas.length);

if (POST_URL && TOKEN && lineas.length) {
  const res = await fetch(POST_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-gen-token': TOKEN }, body: JSON.stringify({ lineas }) });
  console.error('POST', POST_URL, '->', res.status);
  process.exit(res.ok ? 0 : 1);
} else {
  console.log(JSON.stringify({ lineas }, null, 1));   // modo prueba
}
