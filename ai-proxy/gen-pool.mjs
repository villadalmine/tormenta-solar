// gen-pool.mjs — genera el POOL del linyera (fallback cuando el free se satura) y lo PUBLICA en el proxy.
// Lo corre un CronJob 1×/día (OFFLINE/batch → que tarde y reintente da igual). Node puro, sin deps.
// Ganador del bench (specs/resiliencia.md §6.2): gemma4-free offline = gratis + mejor calidad lunfardo.
//
//   AI_BASE=http://litellm-proxy:4000/v1  AI_KEY=sk-hermes-internal  MODEL=gemma4-free  N=30 \
//   POOL_POST_URL=http://tormenta-ai-proxy/linyera-pool  GEN_TOKEN=...  node gen-pool.mjs
import { ROSTER } from './personas.js';                    // FUENTE ÚNICA del contexto de cada personaje (§6.3)

const BASE = (process.env.AI_BASE || 'http://litellm-proxy:4000/v1').replace(/\/+$/, '');
const KEY = process.env.AI_KEY || 'sk-hermes-internal';
const MODEL = process.env.MODEL || 'gemma4-free';
const N = +(process.env.N || 30);                          // frases objetivo por persona (tras dedup)
const POST_URL = process.env.POOL_POST_URL || '';         // si vacío: imprime el JSON (modo prueba)
const TOKEN = process.env.GEN_TOKEN || '';

// el pool de SATURACIÓN del chat es para los CHATEABLES (cuando la IA no contesta a tiempo, dicen una línea
// de "pará que me distraje"). Se arma desde el ROSTER (contexto de cada uno) → fuente única, sin duplicar.
const PERSONAS = Object.fromEntries(
  Object.entries(ROSTER).filter(([, e]) => e.chateable).map(([k, e]) => [k, e.contexto])
);
// rotamos micro-escenarios para que no converja siempre a la misma frase
const SCENARIOS = [
  'pedile que repita porque te distrajiste',
  'pedile que espere un cachito que ya volves',
  'quejate del sol/la tormenta que te frio la cabeza',
  'manda una metafora rara de por que no podes pensar ahora',
  'decile que la radio/los cables del bocho se te cortaron',
];
const ASK = (p, sc) => `Sos ${p}, post tormenta solar. La tormenta te dejo distraido y no podes seguir bien la `
  + `charla. ${sc}. Devolve UNA sola frase CORTA (max 12 palabras), en personaje, lunfardo argentino, con humor. `
  + `Sin comillas, sin explicar, sin mencionar IA ni "API key". Que sea DISTINTA y original. Solo la frase.`;

async function gen(persona) {
  const out = new Set(); let tries = 0;
  while (out.size < N && tries < N * 4) {
    tries++;
    try {
      const r = await fetch(BASE + '/chat/completions', {
        method: 'POST', headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: MODEL, temperature: 1.1, max_tokens: 40,
          messages: [{ role: 'user', content: ASK(PERSONAS[persona], SCENARIOS[tries % SCENARIOS.length]) }] }),
      });
      if (!r.ok) { await sleep(400); continue; }
      const d = await r.json();
      let t = (d.choices?.[0]?.message?.content || '').trim().replace(/^["“]|["”]$/g, '').trim();
      if (t && t.length > 6 && t.length < 120 && !/API|inteligencia artificial|modelo de leng/i.test(t)) out.add(t);
    } catch (e) { await sleep(400); }
  }
  console.error(`  ${persona}: ${out.size}`);
  return [...out];
}
const sleep = ms => new Promise(s => setTimeout(s, ms));

const pool = {};
for (const p of Object.keys(PERSONAS)) { console.error('generando', p, 'con', MODEL); pool[p] = await gen(p); }
const total = Object.values(pool).reduce((a, b) => a + b.length, 0);
console.error('total frases:', total);

if (POST_URL && TOKEN) {
  const r = await fetch(POST_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-gen-token': TOKEN }, body: JSON.stringify({ pool }) });
  console.error('POST', POST_URL, '->', r.status);
  process.exit(r.ok ? 0 : 1);
} else {
  console.log(JSON.stringify({ pool }, null, 1));   // modo prueba: imprime
}
