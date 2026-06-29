// gen-carteles.mjs — Argo CronWorkflow (construccion-colaborativa.md C2): la IA del SALÓN deja CARTELES en el Tablón.
// Genera frases CORTAS (sabor + pistas del juego) con un modelo y las postea al proxy (POST /carteles/ai con GEN_TOKEN).
// El server las marca ai:true y respeta el CUPO de la IA (30% del piso) → siempre queda lugar para los jugadores. Node puro.
//   CARTELES_POST_URL=http://tormenta-ai-proxy/carteles/ai  GEN_TOKEN=...  AI_BASE_URL=...  AI_API_KEY=...  node gen-carteles.mjs
const POST_URL = process.env.CARTELES_POST_URL || '';
const TOKEN = process.env.GEN_TOKEN || '';
const AI_BASE = (process.env.AI_BASE_URL || 'http://litellm-proxy:4000/v1').replace(/\/+$/, '');
const AI_KEY = (process.env.AI_API_KEY || process.env.AI_KEY || '').trim();
const MODEL = process.env.CARTELES_MODEL || 'gemma4-paid';
const FLOORS = ['carteles-1', 'carteles-2'];
const PER_FLOOR = +(process.env.CARTELES_AI_PER_FLOOR || 4);   // cuántos intenta por piso (el server igual capa al 30%)

const PROMPT = 'Inventá ' + (PER_FLOOR * 2) + ' carteles MUY CORTOS (máximo 70 caracteres CADA UNO) para un TABLÓN '
  + 'comunitario del juego "Tormenta Solar" (Florida y Lavalle, Buenos Aires). Son mensajes que un linyera del salón le '
  + 'deja al próximo jugador que pase: pistas con humor, ánimo, o datos del mundo del juego (la TORMENTA SOLAR causada por '
  + 'un satélite con IA, el SUPER CHINO, el TRUCO con el tahúr, el CINE con el Mundial, el DATACENTER que arman entre todos '
  + 'para voltear a la IA, los arbolitos del dólar, la rubia del bodegón que es un robot). Tono PORTEÑO, cálido, breve. '
  + 'Devolvé SOLO un array JSON de strings (sin markdown, sin texto extra).';

let frases = [];
if (AI_KEY) {
  try {
    const r = await fetch(AI_BASE + '/chat/completions', { method: 'POST', headers: { Authorization: 'Bearer ' + AI_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, temperature: 1.0, max_tokens: 600, messages: [
        { role: 'system', content: 'Sos un linyera querido y canchero de Buenos Aires que deja carteles cortos en un tablón del barrio. Slang porteño, breve, buena onda.' },
        { role: 'user', content: PROMPT }] }) });
    if (r.ok) {
      const t = (await r.json()).choices?.[0]?.message?.content || '';
      const m = t.match(/\[[\s\S]*\]/);
      if (m) frases = (JSON.parse(m[0]) || []).filter(x => typeof x === 'string').map(x => x.trim().slice(0, 80)).filter(Boolean);
    }
  } catch (e) { console.error('carteles gen falló:', e.message); }
}
console.error('carteles IA frases=' + frases.length);

// repartí las frases entre los pisos (el server descarta las que excedan el cupo IA del piso)
const signs = [];
frases.forEach((text, i) => signs.push({ floor: FLOORS[i % FLOORS.length], nick: 'El Salón', text }));

if (POST_URL && TOKEN && signs.length) {
  const res = await fetch(POST_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-gen-token': TOKEN }, body: JSON.stringify({ signs }) });
  let body = ''; try { body = await res.text(); } catch (e) {}
  console.error('POST', POST_URL, '->', res.status, body);
  process.exit(res.ok ? 0 : 1);
} else {
  console.log(JSON.stringify({ signs }, null, 1));   // modo prueba
}
