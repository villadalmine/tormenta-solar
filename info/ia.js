const PROXY = 'https://llm-tormenta-solar.cybercirujas.club';
const $ = id => document.getElementById(id);
const fecha = ts => new Date(ts).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const hora = ts => new Date(ts).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pill = v => '<span class="pill ' + esc(v) + '">' + esc(v) + '</span>';

function repHealth(r) {
  const w = r.window || {}, d = r.day || {};
  return '<div class="hd"><span class="kind">🩺 health</span>' + pill(r.verdict || '?') + '<span class="hora">' + hora(r.ts) + '</span></div>' +
    '<div class="kv">ventana: <b>' + (w.chats || 0) + '</b> chats · fallback <b>' + (w.fallbackPct || 0) + '%</b> · timeouts <b>' + (w.timeouts || 0) + '</b>' +
    ' &nbsp;|&nbsp; día: pago <b>' + (d.paidCalls || 0) + '/' + (d.paidCap || 0) + '</b> (' + (d.paidUsedPct || 0) + '%) ≈ <b>US$' + (d.estCostUsd || 0) + '</b>' +
    (d.subRealCostUsd ? ' · subs US$' + d.subRealCostUsd : '') + '</div>' + (r.note ? '<div class="muted">' + esc(r.note) + '</div>' : '');
}
function repScout(r) {
  let h = '<div class="hd"><span class="kind">🔭 scout</span><span class="hora">' + hora(r.ts) + '</span></div>';
  if (r.recs) h += '<div class="kv">' + r.recs.map(esc).join(' &nbsp;·&nbsp; ') + '</div>';
  for (const pat of ['chat', 'gen', 'banco']) {
    const rk = (r.rank && r.rank[pat]) || []; if (!rk.length) continue;
    h += '<table class="rk"><tr><th>' + pat + ' — aprueban</th><th>p95</th><th>$/M</th><th>score</th></tr>' +
      rk.slice(0, 4).map(x => '<tr><td>' + esc(x.model) + '</td><td>' + (x.p95Ms || 0) + 'ms</td><td>' + (x.priceUsdM == null ? '?' : x.priceUsdM) + '</td><td>' + (x.score || 0) + '</td></tr>').join('') + '</table>';
  }
  if (r.paraAgregar && r.paraAgregar.length) h += '<div class="muted">candidatos nuevos (catálogo OR, dominio del dueño): ' + r.paraAgregar.map(x => esc(x.id) + ' ($' + x.usdM + '/M)').join(', ') + '</div>';
  return h;
}
function repTune(r) {
  const one = (p, o) => o ? ('<b>' + p + '</b> ' + pill(o.action || '?') + (o.to ? ' → <code>' + esc((o.to || []).join(', ')) + '</code>' : '') + (o.e2e ? ' (punta a punta ' + esc(o.e2e) + ')' : '') + (o.why ? ' <span class="muted">' + esc(o.why) + '</span>' : '')) : '';
  // formato viejo (solo chat) o nuevo (por patrón)
  if (r.action) return '<div class="hd"><span class="kind">⚙️ tune</span>' + pill(r.action) + '<span class="hora">' + hora(r.ts) + '</span></div><div class="kv">' + esc(r.why || '') + '</div>';
  return '<div class="hd"><span class="kind">⚙️ tune</span><span class="hora">' + hora(r.ts) + '</span></div><div class="kv">' + ['chat', 'gen', 'banco'].map(p => one(p, r[p])).filter(Boolean).join('<br>') + '</div>';
}

(async () => {
  try {
    const ch = await (await fetch(PROXY + '/ia-chain')).json();
    $('cadena').innerHTML = '<b>Cadenas efectivas AHORA:</b> ' +
      'chat → <code>' + esc((ch.effective || []).join(', ')) + '</code> · gen → <code>' + esc((ch.effectiveGen || []).join(', ')) + '</code>' +
      ' · banco → <code>' + esc(ch.effectiveBanco ? ch.effectiveBanco.join(', ') : '(env de cada cron)') + '</code>' +
      (ch.override ? '<br><span class="muted">override del autotune activo — motivo: ' + esc(ch.override.reason || '') + ' (' + hora(ch.override.ts) + ')</span>'
        : '<br><span class="muted">sin override: corriendo con el baseline de values-prod</span>');
  } catch (e) { $('cadena').innerHTML = '<span class="muted">no pude leer /ia-chain (' + esc(e.message) + ')</span>'; }
  try {
    const d = await (await fetch(PROXY + '/ia-reports')).json();
    const reps = (d.reports || []).slice().sort((a, b) => (b.ts || 0) - (a.ts || 0));
    if (!reps.length) { $('estado').textContent = 'todavía no hay reportes (los crons corren cada 6h / diario 6:15).'; return; }
    $('estado').textContent = reps.length + ' reportes.';
    const byDay = {};
    for (const r of reps) { const k = new Date(r.ts).toISOString().slice(0, 10); (byDay[k] = byDay[k] || []).push(r); }
    let h = '';
    for (const k of Object.keys(byDay).sort().reverse()) {
      h += '<div class="day"><h3>' + fecha(byDay[k][0].ts) + '</h3>';
      for (const r of byDay[k]) h += '<div class="rep">' + (r.kind === 'health' ? repHealth(r) : r.kind === 'scout' ? repScout(r) : repTune(r)) + '</div>';
      h += '</div>';
    }
    $('dias').innerHTML = h;
  } catch (e) { $('estado').textContent = 'no pude leer /ia-reports: ' + e.message; }
})();
