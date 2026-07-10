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
    '<div class="kv">últimas horas: <b>' + (w.chats || 0) + '</b> charlas con NPCs · <b>' + (w.fallbackPct || 0) + '%</b> falladas' +
    ' &nbsp;|&nbsp; hoy: <b>' + (d.paidCalls || 0) + '/' + (d.paidCap || 0) + '</b> respuestas pagas (' + (d.paidUsedPct || 0) + '%) ≈ <b>US$' + (d.estCostUsd || 0) + '</b>' +
    (d.subRealCostUsd ? ' · suscripciones US$' + d.subRealCostUsd : '') + '</div>' + (r.note ? '<div class="muted">' + esc(nice(r.note)) + '</div>' : '');
}
function repScout(r) {
  let h = '<div class="hd"><span class="kind">🔭 prueba diaria de modelos</span><span class="hora">' + hora(r.ts) + '</span></div>' +
    '<div class="muted">se prueban todos los modelos del pool con los estándares de cada flujo del juego:</div>';
  for (const pat of ['chat', 'gen', 'banco']) {
    const rk = (r.rank && r.rank[pat]) || [];
    h += '<table class="rk"><tr><th>' + patTag(pat) + ' — aprobaron</th><th>velocidad</th><th>precio $/M</th></tr>';
    if (rk.length) h += rk.slice(0, 4).map(x => '<tr><td>' + esc(x.model) + '</td><td>' + ((x.p95Ms || 0) / 1000).toFixed(1) + 's</td><td>' + (x.priceUsdM == null ? '?' : '$' + x.priceUsdM) + '</td></tr>').join('');
    else h += '<tr><td colspan="3" class="muted">ninguno pasó el estándar HOY en la prueba — el juego sigue andando con su modelo actual (mirá el chequeo de salud)</td></tr>';
    h += '</table>';
  }
  if (r.paraAgregar && r.paraAgregar.length) h += '<div class="muted">modelos nuevos baratos del catálogo (para que el dueño evalúe agregar): ' + r.paraAgregar.map(x => esc(x.id) + ' ($' + x.usdM + '/M)').join(', ') + '</div>';
  return h;
}
function repTune(r) {
  const one = (p, o) => o ? ('<div style="margin:.2rem 0"><b>' + patTag(p) + '</b> ' + pill(o.action || '?') +
    (o.to ? ' → ahora usa <code>' + esc((o.to || []).join(', ')) + '</code>' : '') +
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

  // 2) QUÉ FLUJO DEL JUEGO usa QUÉ MODELO, ahora mismo
  try {
    const ch = await (await fetch(PROXY + '/ia-chain')).json();
    const fila = (p, models) => '<div style="margin:.45rem 0"><b>' + PAT[p].icon + ' ' + esc(PAT[p].nombre) + '</b> → <code>' + esc(models) + '</code>' +
      '<br><span class="muted">cubre: ' + esc(PAT[p].cubre) + '</span>' +
      '<br><span class="muted">estándar: ' + esc(PAT[p].criterio) + '</span></div>';
    $('cadena').innerHTML = '<b>Qué modelo usa cada parte del juego, AHORA:</b>' +
      fila('chat', (ch.effective || []).join(' → ')) +
      fila('gen', (ch.effectiveGen || []).join(' → ')) +
      fila('banco', ch.effectiveBanco ? ch.effectiveBanco.join(' → ') : 'el configurado de cada cron (el optimizador todavía no eligió uno mejor)') +
      (ch.override ? '<div class="muted" style="margin-top:.4rem">⚙️ hay un cambio del optimizador activo — motivo: ' + esc(ch.override.reason || '') + ' (' + hora(ch.override.ts) + '). Si la salud se degrada, se revierte solo.</div>'
        : '<div class="muted" style="margin-top:.4rem">sin cambios del optimizador: corriendo con la configuración base.</div>');
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
