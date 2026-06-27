// gen-historias.mjs — Argo CronWorkflow: la IA AUTORA el TEXTO de las historias de terror del VECINO de los
// edificios clausurados (edificios-clausurados-historias.md §8, deuda "banco vivo"). Por edificio y por idioma pide
// micro-relatos siniestros {gancho, tale} → arma {id,edif,motif,style,es,en} y los postea al proxy (POST /historias →
// banco VIVO). El juego (game.js) los prefiere sobre su banco estático; si la IA cae, el estático sigue funcionando.
// Node puro, sin deps. Mismo molde que gen-propaganda.mjs / gen-chusmerio.mjs.
//   HIST_POST_URL=http://tormenta-ai-proxy/historias  GEN_TOKEN=...  AI_BASE_URL=...  AI_API_KEY=...  node gen-historias.mjs
const POST_URL = process.env.HIST_POST_URL || '';
const TOKEN = process.env.GEN_TOKEN || '';
const AI_BASE = (process.env.AI_BASE_URL || 'http://litellm-proxy:4000/v1').replace(/\/+$/, '');
const AI_KEY = (process.env.AI_API_KEY || process.env.AI_KEY || '').trim();
const MODEL = process.env.HIST_MODEL || 'gemma4-paid';
const PER = Math.max(2, Math.min(8, parseInt(process.env.HIST_PER || '4', 10)));   // historias por edificio y por idioma

// los 4 edificios clausurados (collapsesOnStorm), con su sabor para anclar al relato
const EDIFICIOS = {
  edu:      { es: 'un instituto de computación (EducaciónIT) abandonado: aulas, máquinas viejas, cables',
              en: 'an abandoned computer school (EducaciónIT): classrooms, old machines, cables' },
  arcade:   { es: 'un salón de arcades/fichines clausurado: máquinas muertas, fichas, neón roto',
              en: 'a condemned arcade hall: dead cabinets, tokens, broken neon' },
  choris:   { es: 'una chorería/parrilla cerrada: humo viejo, grasa, heladeras apagadas',
              en: 'a shuttered grill/choripán joint: old smoke, grease, dead fridges' },
  garbarino: { es: 'un local de electrodomésticos (Garbarino) vaciado: TVs apagadas, cajas, estática',
               en: 'a gutted appliance store (Garbarino): dead TVs, boxes, static' },
};
const STYLES = ['wall', 'aisles', 'climb'];        // los que entiende la máquina de niveles (game.js themeFromStory)

async function pedir(edif, lang) {
  const ctx = EDIFICIOS[edif][lang], en = lang === 'en';
  const sys = en
    ? 'You are a teller of short, eerie urban horror tales from Buenos Aires. Creepy, restrained, no gore-for-gore. Reply ONLY with a JSON array, no markdown.'
    : 'Sos un contador de historias de terror urbano de Buenos Aires, breves y siniestras. Inquietante, sobrio, sin gore gratuito. Respondé SOLO con un array JSON, sin markdown.';
  const usr = en
    ? `Give me ${PER} SHORT horror stories a neighbor tells about ${ctx}. Each: "gancho" (a 2-5 word hook/title), "tale" (2-3 eerie sentences, max 45 words), "motif" (one spooky emoji), "style" (one of "wall","aisles","climb"). Reply ONLY a JSON array: [{"gancho":"...","tale":"...","motif":"...","style":"..."}]. No extra text.`
    : `Dame ${PER} historias de terror CORTAS que un vecino cuenta sobre ${ctx}. Cada una: "gancho" (un título/gancho de 2 a 5 palabras), "tale" (2-3 frases siniestras, máx 45 palabras), "motif" (un emoji tenebroso), "style" (uno de "wall","aisles","climb"). Respondé SOLO un array JSON: [{"gancho":"...","tale":"...","motif":"...","style":"..."}]. Sin texto extra.`;
  try {
    const r = await fetch(AI_BASE + '/chat/completions', { method: 'POST', headers: { Authorization: 'Bearer ' + AI_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, temperature: 1.0, max_tokens: 700, messages: [{ role: 'system', content: sys }, { role: 'user', content: usr }] }) });
    if (!r.ok) return [];
    const t = (await r.json()).choices?.[0]?.message?.content || '';
    const m = t.match(/\[[\s\S]*\]/);
    if (!m) return [];
    const arr = JSON.parse(m[0]);
    return (Array.isArray(arr) ? arr : []).map(x => ({
      gancho: String(x.gancho || '').slice(0, 50).trim(),
      tale: String(x.tale || '').slice(0, 280).trim(),
      motif: (String(x.motif || '').trim().match(/\p{Emoji}/u) || ['👻'])[0],
      style: STYLES.includes(x.style) ? x.style : STYLES[(Math.random() * STYLES.length) | 0],
    })).filter(x => x.gancho && x.tale);
  } catch (e) { console.error('edif', edif, lang, 'falló:', e.message); return []; }
}

const historias = [];
if (AI_KEY) for (const edif of Object.keys(EDIFICIOS)) {
  const [es, en] = await Promise.all([pedir(edif, 'es'), pedir(edif, 'en')]);
  const n = Math.min(es.length, en.length);                               // zip por índice (cada objeto lleva ambos idiomas)
  for (let i = 0; i < n; i++) historias.push({
    id: edif + '-' + i, edif, motif: es[i].motif || en[i].motif, style: es[i].style,
    es: { gancho: es[i].gancho, tale: es[i].tale }, en: { gancho: en[i].gancho, tale: en[i].tale },
  });
}

console.error('historias=' + historias.length + ' por edificio=' + JSON.stringify(Object.fromEntries(Object.keys(EDIFICIOS).map(e => [e, historias.filter(h => h.edif === e).length]))));

if (POST_URL && TOKEN) {
  const res = await fetch(POST_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-gen-token': TOKEN }, body: JSON.stringify({ historias }) });
  console.error('POST', POST_URL, '->', res.status);
  process.exit(res.ok ? 0 : 1);
} else {
  console.log(JSON.stringify({ historias }, null, 1));   // modo prueba (sin POST)
}
