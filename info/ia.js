// ia.js — la página de IA (info/ia.html): estado real + reportes POR DÍA, hablando en términos del JUEGO
// (NPCs, carteles, cine, niveles…), no en jerga técnica. Externo por el CSP del self-host (script-src 'self').
const PROXY = 'https://llm-tormenta-solar.cybercirujas.club';

// LOS TRES PATRONES traducidos al JUEGO: qué flujo del juego usa cada uno (specs/ia-costos.md §1)
const PAT = {
  chat: { icon: '💬', nombre: 'Chat con los NPCs (IA en vivo)',
    cubre: 'los personajes con IA que te contestan al momento: linyeras-oráculo, Pechito, French y Beruti, Doña Rosa, el cura, el maquinista, la estudiante, el Tano…',
    criterio: 'tiene que responder SIEMPRE y rápido (menos de ~8s), en castellano y en personaje — acá la confiabilidad vale más que el precio' },
  gen: { icon: '🏗️', nombre: 'Generación de contenido (niveles, tiendas, mundos)',
    cubre: 'los niveles que crea la IA (trastienda del chino, edificios del vecino), las tiendas de la cueva, la Máquina de Mundos por semilla, las historias del vecino',
    criterio: 'tiene que devolver JSON válido y usable (hasta 14s está bien: se genera de a poco y se cachea) — el precio bajo importa' },
  banco: { icon: '🪧', nombre: 'Textos de ambiente por cron (carteles · CINE · chusmerío)',
    cubre: 'los carteles vivos del barrio, la propaganda, las noticias y la cartelera del CINE, el chusmerío que se dicen los NPCs de fondo, las frases del linyera — se generan de madrugada y quedan guardadas',
    criterio: 'humor rioplatense corto; la velocidad NO importa (corre de noche) — gana EL MÁS BARATO que escriba bien' },
};

let MODELMAP = {};   // model_name (LiteLLM) → modelo REAL (p.ej. claude-sonnet → anthropic/claude-sonnet-4.5), de GET /ia-models
let PRICES = {};     // catálogo real de OpenRouter (GET /precios, lo baja un cron cada 6h)
const _norm = x => String(x || '').toLowerCase().replace(/[.\-]/g, '');
const priceOf = n => { const real = MODELMAP[n] || n; let p = PRICES[real];
  if (!p) { for (const k in PRICES) if (_norm(k) === _norm(real)) { p = PRICES[k]; break; } }
  if (!p) return null; return +(((+p.prompt || 0) + 3 * (+p.completion || 0)) / 4 * 1e6).toFixed(2); };
const modelTag = n => { const u = MODELMAP[n]; const pr = priceOf(n); const extra = [u && u !== n ? u : null, pr != null ? (pr === 0 ? 'gratis' : '$' + pr + '/M') : null].filter(Boolean).join(' · ');
  return extra ? n + ' <span class="muted">(' + extra + ')</span>' : n; };
const chainTag = arr => (arr || []).map(m => modelTag(esc(m))).join(' → ');

const $ = id => document.getElementById(id);
const fecha = ts => new Date(ts).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const hora = ts => new Date(ts).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pill = v => '<span class="pill ' + esc(v) + '">' + esc(v === 'skip' ? 'sin cambios' : v === 'noop' ? 'ya estaba bien' : v === 'applied' ? 'CAMBIÓ' : v === 'rollback' ? 'volvió atrás' : v) + '</span>';
const patTag = p => (PAT[p] ? PAT[p].icon + ' ' + PAT[p].nombre : p);
const nice = w => String(w || '').replace(/ningún modelo aprobó/i, 'sin cambios (todo sigue andando) — ningún candidato NUEVO aprobó').replace(/nadie aprobó/i, 'sin candidato nuevo que apruebe');

function repHealth(r) {
  const w = r.window || {}, d = r.day || {};
  return '<div class="hd"><span class="kind">🩺 chequeo de salud</span>' + pill(r.verdict || '?') + '<span class="hora">' + hora(r.ts) + '</span></div>' +
    '<div class="kv">últimas horas: <b>' + (w.chats || 0) + '</b> charlas con NPCs · <b>' + (w.fallbackPct || 0) + '%</b> falladas</div>' +
    '<div class="kv">cupo del pool COMPARTIDO (jugadores sin código): <b>' + (d.paidCalls || 0) + '/' + (d.paidCap || 0) + '</b> respuestas pagas hoy (' + (d.paidUsedPct || 0) + '%) ≈ <b>US$' + (d.estCostUsd || 0) + '</b>' +
    ' &nbsp;|&nbsp; suscripciones (códigos premium): <b>US$' + (d.subRealCostUsd || 0) + '</b> gastados</div>' +
    (d.cuentaOrDiaUsd != null ? '<div class="kv">💳 la cuenta OpenRouter ENTERA (todas las apps): <b>~US$' + d.cuentaOrDiaUsd + '/día</b>' +
      (d.cuentaOrMesUsd ? ' · <b>US$' + d.cuentaOrMesUsd + '</b> este mes' : '') + '</div>' +
      ((d.cuentaOrTop || []).length ? '<div class="kv" style="margin-left:1rem">quién gasta (por app, hoy): ' + d.cuentaOrTop.map(k => '<b>' + esc(k.key) + '</b> US$' + k.usd).join(' · ') + '</div>' : '') +
      ((d.cuentaOrModelos || []).length ? '<div class="kv" style="margin-left:1rem">por modelo (2 días): ' + d.cuentaOrModelos.map(m => esc(m.modelo.split('/').pop()) + ' US$' + m.usd + (m.usa ? ' <span class="muted">(' + esc(m.usa) + ')</span>' : '')).join(' · ') + '</div>' : '') : '') +
    '<div class="muted">ojo: si jugás con tu código premium, tu gasto se cuenta en "suscripciones" — NO consume el cupo compartido (por eso puede decir 0/' + (d.paidCap || 2000) + ' aunque hayas chateado un montón).</div>' +
    (r.note ? '<div class="muted">' + esc(nice(r.note)) + '</div>' : '');
}
function repScout(r) {
  let h = '<div class="hd"><span class="kind">🔭 prueba diaria de modelos</span><span class="hora">' + hora(r.ts) + '</span></div>' +
    '<div class="muted">se prueban todos los modelos del pool con los estándares de cada flujo del juego:</div>';
  for (const pat of ['chat', 'gen', 'banco']) {
    const rk = (r.rank && r.rank[pat]) || [];
    h += '<table class="rk"><tr><th>' + patTag(pat) + ' — aprobaron</th><th>velocidad</th><th>precio $/M</th></tr>';
    const fmtP = v => v == null ? '?' : v === 0 ? 'gratis' : '$' + v;
    if (rk.length) h += rk.slice(0, 4).map(x => { const pv = x.priceUsdM != null ? x.priceUsdM : priceOf(x.model);   // reportes viejos sin precio → se calcula EN VIVO
      return '<tr><td>' + modelTag(esc(x.model)) + '</td><td>' + ((x.p95Ms || 0) / 1000).toFixed(1) + 's</td><td>' + fmtP(pv) + '</td></tr>'; }).join('');
    else h += '<tr><td colspan="3" class="muted">ninguno pasó el estándar HOY en la prueba — el juego sigue andando con su modelo actual (mirá el chequeo de salud)</td></tr>';
    h += '</table>';
  }
  if (r.paraAgregar && r.paraAgregar.length) h += '<div class="muted">modelos nuevos baratos del catálogo (para que el dueño evalúe agregar): ' + r.paraAgregar.map(x => esc(x.id) + ' ($' + x.usdM + '/M)').join(', ') + '</div>';
  return h;
}
function repTune(r) {
  const one = (p, o) => o ? ('<div style="margin:.2rem 0"><b>' + patTag(p) + '</b> ' + pill(o.action || '?') +
    (o.to ? ' → ahora usa <code>' + chainTag(o.to) + '</code>' : '') +
    (o.e2e ? ' <span class="muted">(probado punta a punta: ' + esc(o.e2e) + ' charlas reales OK)</span>' : '') +
    (o.why ? ' <span class="muted">' + esc(nice(o.why)) + '</span>' : '') + '</div>') : '';
  if (r.action) return '<div class="hd"><span class="kind">⚙️ optimizador</span>' + pill(r.action) + '<span class="hora">' + hora(r.ts) + '</span></div><div class="kv">' + esc(nice(r.why || '')) + '</div>';
  return '<div class="hd"><span class="kind">⚙️ optimizador (elige el modelo de cada flujo)</span><span class="hora">' + hora(r.ts) + '</span></div><div class="kv">' + ['chat', 'gen', 'banco'].map(p => one(p, r[p])).filter(Boolean).join('') + '</div>';
}

(async () => {
  // 1) EL ESTADO REAL primero (del último chequeo): que un "sin cambios" del optimizador no parezca una falla
  try {
    const d0 = await (await fetch(PROXY + '/ia-reports')).json();
    window.__reports = (d0.reports || []);
    const hs = window.__reports.filter(r => r.kind === 'health');
    const h = hs[hs.length - 1];
    const el = document.createElement('div'); el.className = 'chain';
    if (h && h.verdict === 'ok') el.innerHTML = '<b style="color:#7CFC00">✅ La IA del juego ANDA BIEN</b> <span class="muted">— último chequeo ' + hora(h.ts) + ': ' + ((h.window && h.window.fallbackPct) || 0) + '% de charlas falladas, gasto del día ≈ US$' + ((h.day && h.day.estCostUsd) || 0) + '. Lo de abajo es el historial de optimización: "sin cambios" = todo sigue igual, NO es una falla.</span>';
    else if (h) el.innerHTML = '<b style="color:' + (h.verdict === 'critical' ? '#ff5252' : '#FFB300') + '">' + (h.verdict === 'critical' ? '🚨 La IA está con problemas' : '⚠️ La IA anda, con avisos') + '</b> <span class="muted">— ' + esc(nice(h.note || '')) + ' (' + hora(h.ts) + ')</span>';
    else el.innerHTML = '<span class="muted">todavía sin chequeos de salud (corren cada 6 horas)</span>';
    document.querySelector('.wrap').insertBefore(el, $('cadena'));
  } catch (e) {}

  // 2) QUÉ FLUJO DEL JUEGO usa QUÉ MODELO, ahora mismo (con el modelo REAL de OpenRouter entre paréntesis)
  try {
    try { MODELMAP = (await (await fetch(PROXY + '/ia-models')).json()).map || {}; } catch (e) {}
    try { PRICES = (await (await fetch(PROXY + '/precios')).json()).prices || {}; } catch (e) {}
    const ch = await (await fetch(PROXY + '/ia-chain')).json();
    const fila = (icon, nombre, modelsHtml, cubre, criterio) => '<div style="margin:.45rem 0"><b>' + icon + ' ' + esc(nombre) + '</b> → <code>' + modelsHtml + '</code>' +
      (cubre ? '<br><span class="muted">cubre: ' + esc(cubre) + '</span>' : '') +
      (criterio ? '<br><span class="muted">estándar: ' + esc(criterio) + '</span></div>' : '</div>');
    $('cadena').innerHTML = '<b>Qué modelo usa cada parte del juego, AHORA</b> <span class="muted">(entre paréntesis, el modelo real detrás del alias)</span>:' +
      fila(PAT.chat.icon, PAT.chat.nombre, chainTag(ch.effective), PAT.chat.cubre, PAT.chat.criterio) +
      fila('💎', 'Suscriptores (premium)', chainTag(ch.subModels), 'los que cargaron su código en Opciones: siempre la cadena de primera calidad, sin cupos', 'NO se autotunea — estabilidad ante todo (se cambia a mano en values-prod)') +
      '<div class="muted" style="margin:.2rem 0 .45rem 1.5rem">🧠 <b>próximamente (premium, en diseño, todavía NO vive):</b> memoria individual — los oráculos y los personajes de misión (Iorio, el cura, el tahúr, los borrachines…) van a acordarse de hechos puntuales CON VOS, no solo la memoria de barrio genérica que hoy ven todos.</div>' +
      fila(PAT.gen.icon, PAT.gen.nombre, chainTag(ch.effectiveGen), PAT.gen.cubre, PAT.gen.criterio) +
      fila(PAT.banco.icon, PAT.banco.nombre, ch.effectiveBanco ? chainTag(ch.effectiveBanco) : (modelTag('gemma4-paid') + ' <span class="muted">(carteles/propaganda/chusmerío/historias)</span> · ' + modelTag('gemma4-free') + ' <span class="muted">(frases del linyera)</span>'), PAT.banco.cubre, PAT.banco.criterio + (ch.effectiveBanco ? '' : ' · hoy cada cron usa su modelo configurado; cuando el optimizador encuentre uno más barato que apruebe, lo levantan todos solos')) +
      (ch.override ? '<div class="muted" style="margin-top:.4rem">⚙️ hay un cambio del optimizador activo — motivo: ' + esc(ch.override.reason || '') + ' (' + hora(ch.override.ts) + '). Si la salud se degrada, se revierte solo.</div>'
        : '<div class="muted" style="margin-top:.4rem">sin cambios del optimizador: corriendo con la configuración base.</div>');
    // 2b) LOS ROBOTS QUE CORREN SOLOS: toda la infra de IA/crons, para que se entienda el ecosistema completo
    const robots = [
      ['🗞️', 'Noticias del barrio + cartelera del CINE', 'todos los días 9:00 (+ el ticker EN VIVO cada hora)', 'la IA escribe los titulares y lo que pasan en el cine; el juego los muestra en carteles y noticieros'],
      ['🪧', 'Carteles vivos + propaganda', 'carteles cada 6h · propaganda 4:00', 'los carteles del barrio y la vía pública que cambian solos'],
      ['🗣️', 'Chusmerío entre los NPCs', 'todos los días 4:30', 'las frases que se dicen los personajes de fondo entre ellos'],
      ['🧔', 'Frases del linyera (pool offline)', 'todos los días (madrugada)', 'el banco de respuestas que usan los NPCs si la IA en vivo no está'],
      ['🏚️', 'Historias del vecino', 'todos los días 4:45', 'los relatos de los edificios clausurados'],
      ['💱', 'Precios del catálogo de modelos', 'cada 6h', 'baja los precios reales de OpenRouter (los usa el optimizador para el costo-beneficio)'],
      ['🩺', 'Chequeo de salud de la IA', 'cada 6h (a los :30)', 'mide charlas falladas, gasto y budget — si algo anda mal, alerta sola a Telegram y revierte cambios'],
      ['🔭⚙️', 'Prueba de modelos + optimizador', 'todos los días 6:15', 'banchmarkea el pool con los estándares de cada flujo y cambia el modelo SOLO si lo prueba de punta a punta (con vuelta atrás automática)'],
    ];
    const rb = document.createElement('div'); rb.className = 'chain';
    rb.innerHTML = '<b>🤖 Los robots que corren solos (los crons de la infra):</b>' +
      robots.map(r => '<div style="margin:.35rem 0"><b>' + r[0] + ' ' + esc(r[1]) + '</b> <span class="muted">· ' + esc(r[2]) + '</span><br><span class="muted">' + esc(r[3]) + '</span></div>').join('') +
      '<div style="margin-top:.55rem"><b>🎮 El fierro propio (GPU/NPU):</b><br>' +
      '<span class="muted">· <b>GPU NVIDIA</b> (' + modelTag('local-gpu') + '): hoy <b>DESHABILITADA por mantenimiento</b> (apagada a propósito — el juego NO la necesita: el chat siempre fue por la nube). Cuando está prendida se usa para inferencia local corta y pruebas.<br>' +
      '· <b>NPUs RK1</b> (' + modelTag('rk1-npu-local') + '): pensadas para pre-generar los textos batch (carteles/propaganda) sin gastar nube.<br>' +
      '· El optimizador las <b>excluye a propósito</b> de las pruebas diarias (pueden estar apagadas); nada del juego se rompe si no están.</span></div>' +
      '<div class="muted" style="margin-top:.4rem">La ruta de cada mensaje: jugador → proxy propio (k8s en casa) → LiteLLM (el pool de modelos) → la nube (OpenRouter). El jugador también puede traer su propia key (BYOK). Y si TODO falla, el juego no se rompe: los NPCs caen a un modo estático con frases pre-generadas. El detalle capa por capa está en <a href="tech.html">Cómo funciona</a>.</div>';
    $('cadena').after(rb);
  } catch (e) { $('cadena').innerHTML = '<span class="muted">no pude leer la configuración (' + esc(e.message) + ')</span>'; }

  // 3) los reportes POR DÍA
  try {
    const reps = (window.__reports || []).slice().sort((a, b) => (b.ts || 0) - (a.ts || 0));
    if (!reps.length) { $('estado').textContent = 'todavía no hay reportes (los crons corren cada 6h / diario 6:15).'; return; }
    $('estado').textContent = reps.length + ' reportes:';
    const byDay = {};
    for (const r of reps) { const k = new Date(r.ts).toISOString().slice(0, 10); (byDay[k] = byDay[k] || []).push(r); }
    let h = '';
    for (const k of Object.keys(byDay).sort().reverse()) {
      h += '<div class="day"><h3>' + fecha(byDay[k][0].ts) + '</h3>';
      for (const r of byDay[k]) h += '<div class="rep">' + (r.kind === 'health' ? repHealth(r) : r.kind === 'scout' ? repScout(r) : repTune(r)) + '</div>';
      h += '</div>';
    }
    $('dias').innerHTML = h;
  } catch (e) { $('estado').textContent = 'no pude leer los reportes: ' + e.message; }
})();
