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
const MODEL = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free';

const KEY = (process.env.OPENROUTER_API_KEY || (existsSync(KEYFILE) ? readFileSync(KEYFILE, 'utf8') : '')).trim();
if (!KEY) {
  console.error('❌ Falta la API key. Poné OPENROUTER_API_KEY=... en el entorno o escribila en tools/openrouter.key');
  process.exit(1);
}

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

async function chat(messages) {
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + KEY,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://villadalmine.github.io/tormenta-solar',
      'X-Title': 'Tormenta Solar — gen-dialogos',
    },
    body: JSON.stringify({ model: MODEL, messages, temperature: 1.05, max_tokens: 1000 }),
  });
  if (!r.ok) throw new Error('OpenRouter ' + r.status + ': ' + (await r.text()).slice(0, 200));
  const d = await r.json();
  return d.choices?.[0]?.message?.content || '';
}

function parseArray(txt) {
  const a = txt.indexOf('['), b = txt.lastIndexOf(']');
  if (a < 0 || b < 0) throw new Error('respuesta sin array JSON: ' + txt.slice(0, 120));
  return JSON.parse(txt.slice(a, b + 1)).map(String).map(s => s.trim()).filter(Boolean);
}

console.log('Modelo:', MODEL, '\n');
const out = {};
for (const job of JOBS) {
  process.stdout.write('· ' + job.key.padEnd(18) + ' ');
  const user = `Personaje/situación: ${job.desc}\nEjemplos del TONO (no los repitas, son solo de referencia):\n${job.fewshot.map(s => '- ' + s).join('\n')}\n\nGenerá ${job.n} líneas NUEVAS, distintas entre sí y de los ejemplos. Solo el array JSON.`;
  try {
    out[job.key] = parseArray(await chat([{ role: 'system', content: SYSTEM }, { role: 'user', content: user }]));
    console.log('✓ ' + out[job.key].length + ' líneas');
  } catch (e) {
    console.log('✗ falló (' + e.message + ') — dejo los ejemplos');
    out[job.key] = job.fewshot;
  }
}

const banner = `// dialogos.js — GENERADO por tools/gen-dialogos.mjs (modelo ${MODEL}).\n` +
  `// No editar a mano. Regenerá con:  node tools/gen-dialogos.mjs\n`;
writeFileSync(OUT, banner + 'const Dialogos = ' + JSON.stringify(out, null, 2) + ';\n');
console.log('\n✓ Escrito ' + path.relative(ROOT, OUT) + ' (' + Object.keys(out).length + ' pools)');
