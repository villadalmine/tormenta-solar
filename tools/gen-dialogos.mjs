// gen-dialogos.mjs — MODO A: pre-genera los pools de diálogo con OpenRouter (modelo free)
// y los escribe en js/dialogos.js (estático, se commitea). NO corre en producción.
//
// Uso:
//   1) Conseguí una API key en https://openrouter.ai/keys
//   2) Ponela en la env  OPENROUTER_API_KEY=...   o en el archivo  tools/openrouter.key  (1 línea).
//      (tools/openrouter.key está en .gitignore: NUNCA se sube.)
//   3) node tools/gen-dialogos.mjs        (opcional: OPENROUTER_MODEL=otro/modelo:free)
import { readFileSync, existsSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'js', 'dialogos.js');
const KEYFILE = path.join(ROOT, 'tools', 'openrouter.key');
// si pasás OPENROUTER_MODEL se usa ese; si no, prueba esta lista (rota si uno está rate-limited)
const MODELS = process.env.OPENROUTER_MODEL ? [process.env.OPENROUTER_MODEL] : [
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemma-2-9b-it:free',
  'mistralai/mistral-7b-instruct:free',
  'meta-llama/llama-3.1-8b-instruct:free',
  'qwen/qwen-2.5-7b-instruct:free',
];
const THROTTLE = +(process.env.THROTTLE_MS || 4000);   // pausa entre pedidos (respeta el límite por minuto)
const sleep = ms => new Promise(r => setTimeout(r, ms));

const KEYSRC = process.env.OPENROUTER_API_KEY ? 'env OPENROUTER_API_KEY'
  : (existsSync(KEYFILE) ? 'tools/openrouter.key' : 'ninguna');
let KEY = (process.env.OPENROUTER_API_KEY || (existsSync(KEYFILE) ? readFileSync(KEYFILE, 'utf8') : '')).trim();
// tolerar que peguen "OPENROUTER_API_KEY=sk-..." o con comillas, o varias líneas
KEY = KEY.split(/\r?\n/)[0].replace(/^OPENROUTER_API_KEY\s*=\s*/i, '').replace(/^["']|["']$/g, '').trim();
if (!KEY) {
  console.error('❌ Falta la API key. Poné OPENROUTER_API_KEY=... en el entorno o escribila (sola) en tools/openrouter.key');
  process.exit(1);
}
console.log('Key:', KEY.length + ' chars (' + KEY.slice(0, 7) + '…' + KEY.slice(-4) + ') — de ' + KEYSRC);
if (!KEY.startsWith('sk-or-')) console.log('⚠️  Ojo: las keys de OpenRouter empiezan con "sk-or-". Revisá que sea la correcta (no la de otro servicio).');

const SYSTEM = `Sos guionista de un videojuego de humor argentino ("TORMENTA SOLAR", en la peatonal Florida y Lavalle, Buenos Aires). Escribís diálogos CORTOS (1-2 frases) en SLANG PORTEÑO, con humor, frescos y variados, sin insultos gratuitos de más. Devolvés SIEMPRE y SOLO un array JSON de strings (sin texto extra, sin markdown). Cada string es una línea lista para mostrar; podés cerrar con un emoji.`;

// cada job: clave de pool, cuántas líneas, descripción del personaje/situación, y ejemplos de tono
const JOBS = [
  { key:'borracho_vino', n:8, desc:'Borrachín con un VINO en la mano que QUIERE (sin decirlo directo) un sándwich de FIAMBRE. Te tira/encaja algo random y suelta una frase.',
    fewshot:['Te escupe un poco de tinto sin querer. “Este edificio era un banco, ¿sabés? Ahora el banco soy yo.” 🍷','Te alcanza media empanada fría. “Tomá, convidá... che, ¿un sanguche no tenés?”'] },
  { key:'borracho_cerveza', n:8, desc:'Borrachín con una CERVEZA en la mano que quiere una DIOSA TROPICAL (vino dulce de fruta). Tira algo random + frase.',
    fewshot:['Te encaja un posavasos empapado. “¿Vos tomaste alguna vez una Diosa Tropical? Es poesía, pibe.” 🍺'] },
  { key:'borracho_porro', n:8, desc:'Borrachín fumando PORRO, con bajón/munchies, que quiere un cacho de CARNE. Tira algo random + frase.',
    fewshot:['Te pasa el humo en la cara. “Uh, qué bajón, hermano... ¿no tenés un cachito de carne por ahí?” 🌬️'] },
  { key:'linyera_ruina', n:10, desc:'Linyera tirado en un piso destruido de un edificio abandonado, entre muebles rotos. Frase resignada/absurda.',
    fewshot:['“...andá pasando, pibe... acá no hay nada... nada de nada...” 💀','“La tele esa anda, eh. Si la mirás de costado y entrecerrás los ojos.” 📺'] },
  { key:'linyera_llanto', n:8, desc:'Linyera que ERA millonario, se cansó del sistema y dejó todo; te cuenta su historia, se pone a llorar y te dice que agarres la plata que guarda (caja fuerte / inodoro).',
    fewshot:['“Yo tenía TRES deptos en Puerto Madero... tres. (se quiebra) Agarrá del inodoro, total ya no me sirve...” 😭'] },
  { key:'cola_dolar', n:10, desc:'Persona haciendo la cola eterna en la Casa de Cambio Oficial. Queja sobre la espera y el dólar.',
    fewshot:['“Saqué número a las cinco de la mañana, ¿eh? No me vengan a correr.” 🎫'] },
  { key:'cueva_gente', n:10, desc:'Persona esperando adentro de una cueva ilegal de venta de dólares. Justifica el ahorro en dólares (es para el hijo, el peso no sirve, etc.).',
    fewshot:['“Todo legal, ¿eh? Es para mi hijo, para cuando sea grande.” 👶','“Si no ahorro en dólares, este país se va a la mierda, te lo firmo.” 🇦🇷'] },
  { key:'cuevero_rebote', n:6, desc:'Cuevero (arbolito) que NO te cambia y te rebota con una excusa desconfiada.',
    fewshot:['“Tenés cara de garca, no te ofendas. Pero acá no te cambio nada.”'] },
  { key:'iorio', n:6, desc:'Iorio (cantante de metal, estilo Almafuerte) en un recital under. Te pide falopa para tocar; post-apagón putea al sol y propone hacer tango/acústico.',
    fewshot:['“¿Qué hacés, tragaleche? Traeme falopa y te toco Pibe Tigre, dale.” 🤘'] },
];

async function chat(model, messages) {
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + KEY,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://villadalmine.github.io/tormenta-solar',
      'X-Title': 'Tormenta Solar gen-dialogos',
    },
    body: JSON.stringify({ model, messages, temperature: 1.05, max_tokens: 1000 }),
  });
  if (!r.ok) { const e = new Error('OpenRouter ' + r.status); e.code = r.status; e.body = (await r.text()).slice(0, 160); throw e; }
  const d = await r.json();
  return d.choices?.[0]?.message?.content || '';
}
// reintenta con backoff ante 429/5xx; si un modelo no afloja, rota al siguiente de MODELS
async function chatRetry(messages) {
  let last;
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try { return { text: await chat(model, messages), model }; }
      catch (e) {
        last = e;
        if (e.code === 429 || e.code >= 500) {
          if (attempt < 2) { const w = 5000 * (attempt + 1); process.stdout.write('(429 espero ' + (w/1000) + 's) '); await sleep(w); continue; }
          process.stdout.write('(rota modelo) ');   // agotó reintentos con este modelo
        } else { throw e; }   // 401/400: no tiene sentido reintentar
        break;
      }
    }
  }
  throw last;
}

function parseArray(txt) {
  const a = txt.indexOf('['), b = txt.lastIndexOf(']');
  if (a < 0 || b < 0) throw new Error('respuesta sin array JSON: ' + txt.slice(0, 120));
  return JSON.parse(txt.slice(a, b + 1)).map(String).map(s => s.trim()).filter(Boolean);
}

console.log('Modelos:', MODELS.join(', '), '\n');
const out = {}, usados = new Set();
let i = 0;
for (const job of JOBS) {
  process.stdout.write('· ' + job.key.padEnd(18) + ' ');
  const user = `Personaje/situación: ${job.desc}\nEjemplos del TONO (no los repitas, son solo de referencia):\n${job.fewshot.map(s => '- ' + s).join('\n')}\n\nGenerá ${job.n} líneas NUEVAS, distintas entre sí y de los ejemplos. Solo el array JSON.`;
  try {
    const { text, model } = await chatRetry([{ role: 'system', content: SYSTEM }, { role: 'user', content: user }]);
    out[job.key] = parseArray(text); usados.add(model);
    console.log('✓ ' + out[job.key].length + ' líneas (' + model.split('/').pop() + ')');
  } catch (e) {
    console.log('✗ falló (' + (e.code ? e.code + ' ' + (e.body || '') : e.message).slice(0, 90) + ') — dejo los ejemplos');
    out[job.key] = job.fewshot;
  }
  if (++i < JOBS.length) await sleep(THROTTLE);   // respiro entre pedidos
}

const banner = `// dialogos.js — GENERADO por tools/gen-dialogos.mjs (modelos: ${[...usados].join(', ') || 'ninguno (todo falló)'}).\n` +
  `// No editar a mano. Regenerá con:  node tools/gen-dialogos.mjs\n`;
writeFileSync(OUT, banner + 'const Dialogos = ' + JSON.stringify(out, null, 2) + ';\n');
const ok = Object.values(out).filter((v, k) => v.length > (JOBS[k] ? JOBS[k].fewshot.length : 0)).length;
console.log('\n✓ Escrito ' + path.relative(ROOT, OUT) + ' (' + Object.keys(out).length + ' pools)');
if (usados.size === 0) console.log('⚠️  Todos los modelos free estaban saturados (429). Reintentá en un rato, o probá OPENROUTER_MODEL=<otro:free>, o sumá unos créditos en OpenRouter para subir el límite.');
