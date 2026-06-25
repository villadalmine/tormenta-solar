// gen-noticias.mjs — Argo CronWorkflow: trae NOTICIAS por topic y las publica al proxy (banco /noticias).
// CLAVE (cine-noticias.md §3.1): el FETCH lo hace ESTE cron (código), NO un modelo. Node puro, sin deps.
// Fuente F1: GOOGLE NEWS RSS (búsqueda por topic, PÚBLICO sin key, español AR) → titular real, cubre TODO
// (fútbol/Mundial, Argentina, mundo, etc.) y refresca cada corrida. fetch() de Node sigue el 302 solo.
// Fútbol con RESULTADO exacto = opt-in NEWS_SPORTS (TheSportsDB, key de prueba).
//
//   NEWS_POST_URL=http://tormenta-ai-proxy/noticias  GEN_TOKEN=...  node gen-noticias.mjs
const POST_URL = process.env.NEWS_POST_URL || '';
const TOKEN = process.env.GEN_TOKEN || '';

// topic → query de Google News (en español, región AR). El titular = la "noticia" que se le lleva al linyera.
const TOPICS = JSON.parse(process.env.NEWS_TOPICS || JSON.stringify({
  mundo: 'noticias del mundo', mundial: 'mundial futbol resultado', 'primera-b': 'primera b nacional argentina',
  videojuegos: 'videojuegos', guerra: 'guerra conflicto', argentina: 'argentina noticias',
  'paises-bajos': 'países bajos holanda', arabe: 'arabia mundo árabe', ia: 'inteligencia artificial',
  bochas: 'bochas liga',
}));

function decode(s) {
  return String(s).replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).trim();
}
async function gnewsTop(q) {
  try {
    const url = 'https://news.google.com/rss/search?q=' + encodeURIComponent(q) + '&hl=es-419&gl=AR&ceid=AR:es';
    const r = await fetch(url, { headers: { Accept: 'application/xml' } });   // Node fetch sigue el 302 solo
    if (!r.ok) return null;
    const xml = await r.text();
    const items = xml.split('<item>').slice(1);              // saltea el <title> del canal (va antes del 1er item)
    for (const it of items) {
      const m = it.match(/<title>(.*?)<\/title>/s);
      if (!m) continue;
      let t = decode(m[1]).replace(/\s+-\s+[^-]+$/, '').trim();   // saca " - Fuente" del final
      if (t.length > 8) return { headline: t.slice(0, 160), answer: t.slice(0, 160) };
    }
    return null;
  } catch (e) { return null; }
}

const noticias = [];
for (const [topic, q] of Object.entries(TOPICS)) {
  const n = await gnewsTop(q);
  if (n) noticias.push({ topic, ...n, ts: Date.now() });
}

// FÚTBOL con RESULTADO exacto (opt-in): NEWS_SPORTS="mundial:4406,primera-b:4391" → TheSportsDB (key prueba '3').
// Pisa/agrega el topic con un answer numérico ("2-1"). Best-effort: si falla, queda lo de Google News.
const SPORTS = (process.env.NEWS_SPORTS || '').split(',').map(s => s.trim()).filter(Boolean);
for (const pair of SPORTS) {
  const [topic, id] = pair.split(':');
  if (!topic || !id) continue;
  try {
    const r = await fetch('https://www.thesportsdb.com/api/v1/json/3/eventspastleague.php?id=' + id);
    if (!r.ok) continue;
    const ev = ((await r.json()).events || [])[0];
    if (ev && ev.intHomeScore != null && ev.intAwayScore != null) {
      const i = noticias.findIndex(n => n.topic === topic);
      const item = { topic, headline: `${ev.strHomeTeam} ${ev.intHomeScore}-${ev.intAwayScore} ${ev.strAwayTeam}`, answer: `${ev.intHomeScore}-${ev.intAwayScore}`, ts: Date.now() };
      if (i >= 0) noticias[i] = item; else noticias.push(item);
    }
  } catch (e) {}
}

console.error('noticias=' + noticias.length + ' topics=' + noticias.map(n => n.topic).join(','));

if (POST_URL && TOKEN) {
  const res = await fetch(POST_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-gen-token': TOKEN }, body: JSON.stringify({ noticias }) });
  console.error('POST', POST_URL, '->', res.status);
  process.exit(res.ok ? 0 : 1);
} else {
  console.log(JSON.stringify({ noticias }, null, 1));   // modo prueba (sin POST)
}
