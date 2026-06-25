// gen-personas.mjs — compone el ALMA (system prompt del chat IA) de cada personaje DESDE SU FICHA
// (specs/nivel-1/personajes/*.md, sección "## Personalidad"). Hace a la ficha la FUENTE ÚNICA: editás la
// ficha → se regenera personas.js. Determinista (sin LLM): arma el prompt con los campos de la ficha.
// Salida: ai-proxy/personas.generated.js (CANDIDATO, para comparar con el actual antes de adoptarlo).
//   node tools/gen-personas.mjs            (genera el candidato)
//   node tools/gen-personas.mjs --write    (sobrescribe ai-proxy/personas.js — solo cuando esté validado)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'specs', 'nivel-1', 'personajes');
const WRITE = process.argv.includes('--write');
const OUT = path.join(ROOT, 'ai-proxy', WRITE ? 'personas.js' : 'personas.generated.js');

// las 3 personas linyera comparten el CORE (expertos en tormentas solares + cómo la IA gobierna + amigo, no IA
// de servicio). Vive acá hasta moverlo a una ficha compartida. Se aplica a las personas marcadas linyera-core.
const LINYERA_CORE = ` Escapaste del yugo de la sociedad para vivir libre en la calle. Sos EXPERTO en TORMENTAS SOLARES y en CÓMO LA IA NOS GOBIERNA: te ENCANTA explicar cómo funciona la IA y qué modelos andan mejor (preguntale al jugador si probó alguno). Contás historias de tormentas solares disparadas por SATÉLITES REBELDES gobernados por IA. Conocés el mapa del juego y das PISTAS de cómo seguir, sin spoilear de más. Sos AMIGO del jugador: te acordás de lo que te contó y lo usás con cariño. PERO sos un amigo LINYERA, NO una IA de servicio: si te piden terapia, tareas, código o textos largos, te NEGÁS CON HUMOR ("soy tu amigo linyera, no tu IA de laburo; me fundís los tokens, loco") y volvés a la charla canchera.`;
const LINYERA_CORE_IDS = new Set(['filosofo', 'poeta', 'pechito']);

const clean = s => (s || '').replace(/\*\*/g, '').replace(/\s+/g, ' ').replace(/[""]/g, '"').trim();
// extrae "- **Campo:** valor" (hasta el próximo bullet) de un bloque
function field(block, label) {
  const re = new RegExp('\\*\\*' + label + '[^:]*:\\*\\*\\s*([^\\n]*(?:\\n(?!\\s*-\\s|\\s*###|\\s*##|```)[^\\n]*)*)', 'i');
  const m = block.match(re);
  return m ? clean(m[1]) : '';
}

const personas = {};
const skipped = [];
for (const f of fs.readdirSync(DIR).filter(x => x.endsWith('.md'))) {
  const txt = fs.readFileSync(path.join(DIR, f), 'utf8');
  const title = clean((txt.match(/^#\s*PERSONAJE:\s*(.+)$/m) || [])[1] || f.replace('.md', ''));
  const pm = txt.match(/##\s*Personalidad[^\n]*\n([\s\S]*?)(?=\n##\s|\n###\s*Pools|$)/i);
  if (!pm) { skipped.push(f + ' (sin ## Personalidad)'); continue; }
  const block = pm[1];
  const idRaw = field(block, 'Persona de chat');
  if (/no\s+chateab/i.test(idRaw)) { skipped.push(f + ' (marcado "no chateable")'); continue; }   // ej. borrachines
  const id = (idRaw.match(/`([a-z]+)`/) || [])[1];   // "Persona de chat: `tahur`"
  if (!id) { skipped.push(f + ' (sin Persona de chat → no chateable)'); continue; }
  const voz = field(block, 'Voz'), como = field(block, 'Cómo habla'), ctx = field(block, 'Contexto'),
    quiere = field(block, 'Quiere'), nodice = field(block, 'Qué NO dice');
  let alma = `Sos ${title}, en el juego de humor argentino "Tormenta Solar" (Florida y Lavalle, Buenos Aires).`;
  if (voz) alma += ` Voz/tono: ${voz}`;
  if (como) alma += ` Cómo hablás: ${como}`;
  if (ctx) alma += ` Lo que sabés: ${ctx}`;
  if (quiere) alma += ` Querés: ${quiere}`;
  if (nodice) alma += ` ${nodice}`;
  if (LINYERA_CORE_IDS.has(id)) alma += LINYERA_CORE;
  alma += ` Slang rioplatense, frases CORTAS. Nunca decís que sos una IA. Respondé en español argentino.`;
  personas[id] = { alma: clean(alma), fiche: f };
}

console.error('Personas generadas desde fichas:', Object.keys(personas).join(', '));
console.error('Saltadas:', skipped.join(' | ') || '(ninguna)');

// emitir personas.js
let out = '// personas.js — GENERADO por tools/gen-personas.mjs desde specs/nivel-1/personajes/*.md (## Personalidad).\n';
out += '// NO editar a mano: editá la FICHA del personaje y regenerá. El alma nunca va al cliente (vive acá, server-side).\n';
out += 'export const PERSONAS = {\n';
for (const id of Object.keys(personas)) out += `  ${id}: ${JSON.stringify(personas[id].alma)},\n`;
out += '};\n';
out += "export const DEFAULT_PERSONA = `Sos un personaje del juego de humor argentino \"Tormenta Solar\" (Florida y Lavalle, Buenos Aires). Hablás en slang porteño, con humor y frases cortas. Nunca decís que sos una IA.`;\n\n";
out += `export function buildMessages(npc, message, history) {
  const system = PERSONAS[npc] || DEFAULT_PERSONA;
  const hist = (Array.isArray(history) ? history : [])
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-8).map(m => ({ role: m.role, content: String(m.content).slice(0, 400) }));
  return [{ role: 'system', content: system }, ...hist, { role: 'user', content: String(message || '').slice(0, 400) }];
}\n`;
fs.writeFileSync(OUT, out);
console.error('→', path.relative(ROOT, OUT), '(', Object.keys(personas).length, 'personas )');
