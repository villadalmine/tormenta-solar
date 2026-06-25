// gen-linyera-pool.mjs — genera el POOL de respuestas del linyera (fallback cuando el free se satura).
// OFFLINE/batch: lo corre un cron 1×/día (GPU propia gratis, o gpt-4o-mini por centavos). Que tarde da igual.
// Salida: js/linyera-pool.js (window.LINYERA_POOL = { persona: [lineas...] }). El juego lo usa antes que las
// líneas hardcodeadas. Ver specs/resiliencia.md / suscripcion.md.
//
//   MODEL=cheap N=50 node tools/gen-linyera-pool.mjs        (necesita port-forward a LiteLLM en :4000)
//   MODEL=local-gpu node ...                                (tu GPU, gratis)
import fs from 'fs';

const BASE = process.env.AI_BASE || 'http://localhost:4000/v1';
const KEY = process.env.AI_KEY || 'sk-hermes-internal';
// GANADOR del bench (2026-06-25): gemma4-free OFFLINE = gratis + mejor calidad (lunfardo perfecto). La GPU/NPU
// da gibberish (modelos chicos), descartada. 'cheap' (gpt-4o-mini) = backup pago si el free no rinde.
const MODEL = process.env.MODEL || 'gemma4-free';      // 'gemma4-free' (gratis, mejor) | 'cheap' (pago backup)
const N = +(process.env.N || 30);                      // frases por persona (tras dedup)
const OUT = process.env.OUT || 'js/linyera-pool.js';

// Cada persona: una consigna para generar UNA línea corta, en personaje, para cuando el jugador habla y el
// linyera está "saturado" por la tormenta (no contesta la IA real). Lunfardo, sin mencionar IA ni API keys.
const PERSONAS = {
  filosofo: 'un filósofo linyera de Buenos Aires, sabio y melancólico, post tormenta solar',
  poeta: 'un poeta linyera que habla en verso lunfardo',
  pechito: 'un linyera bonachón y tranquilo que cuenta historias de la calle',
  cuevero: 'un cuevero (cambista ilegal) desconfiado de la cueva',
  tahur: 'un tahúr (fullero de cartas) canchero y burlón',
};
// VARIEDAD: rotamos micro-escenarios para que no converja siempre a la misma frase ("se me tildó el bocho").
const SCENARIOS = [
  'pedile que repita porque te distrajiste',
  'pedile que espere un cachito que ya volvés',
  'quejate del sol/la tormenta que te frió la cabeza',
  'mandá una metáfora rara de por qué no podés pensar ahora',
  'decile que la radio/los cables del bocho se te cortaron',
];
const ASK = (p, sc) => `Sos ${p}. La tormenta solar te dejó la cabeza distraída y no podés seguir bien la charla. `
  + `${sc}. Devolvé UNA sola frase CORTA (máx 12 palabras), en personaje, lunfardo argentino, con humor. `
  + `Sin comillas, sin explicar, sin mencionar IA ni "API key". Que sea DISTINTA y original. Solo la frase.`;

async function gen(persona) {
  const out = new Set();
  let tries = 0;
  while (out.size < N && tries < N * 3) {
    tries++;
    try {
      const r = await fetch(BASE + '/chat/completions', {
        method: 'POST', headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: MODEL, temperature: 1.1, max_tokens: 40,
          messages: [{ role: 'user', content: ASK(PERSONAS[persona], SCENARIOS[tries % SCENARIOS.length]) }] }),
      });
      if (!r.ok) { await new Promise(s => setTimeout(s, 400)); continue; }   // reintenta (offline, da igual)
      const d = await r.json();
      let t = (d.choices?.[0]?.message?.content || '').trim().replace(/^["“]|["”]$/g, '').trim();
      if (t && t.length > 6 && t.length < 120 && !/API|inteligencia artificial|modelo de leng/i.test(t)) out.add(t);
    } catch (e) { await new Promise(s => setTimeout(s, 400)); }
    process.stdout.write(`\r  ${persona}: ${out.size}/${N}   `);
  }
  process.stdout.write('\n');
  return [...out];
}

const pool = {};
for (const p of Object.keys(PERSONAS)) { console.log('generando', p, 'con', MODEL); pool[p] = await gen(p); }
const banner = `// GENERADO por tools/gen-linyera-pool.mjs (modelo: ${MODEL}, ${new Date().toISOString()}). NO editar a mano.\n`;
fs.writeFileSync(OUT, banner + 'window.LINYERA_POOL = ' + JSON.stringify(pool, null, 1) + ';\n');
console.log('OK →', OUT, '·', Object.values(pool).reduce((a, b) => a + b.length, 0), 'frases');
