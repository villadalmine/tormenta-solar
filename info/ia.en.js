// ia.en.js — English version of the AI page (info/ia.en.html). Same logic as ia.js, translated strings.
// External file because of the self-host CSP (script-src 'self').
const PROXY = 'https://llm-tormenta-solar.cybercirujas.club';

// THE THREE PATTERNS translated to the GAME (specs/ia-costos.md §1)
const PAT = {
  chat: { icon: '💬', nombre: 'Chat with the NPCs (live AI)',
    cubre: 'the AI characters that answer you in real time: the bum-oracles, Pechito, French & Beruti, Doña Rosa, the priest, the train driver, the student, el Tano…',
    criterio: 'it must ALWAYS answer, fast (under ~8s), in Spanish and in character — here reliability matters more than price' },
  gen: { icon: '🏗️', nombre: 'Content generation (levels, shops, worlds)',
    cubre: 'the AI-generated levels (the Chinese shop back room, the neighbor buildings), the cave shops, the seed-based World Machine, the neighbor stories',
    criterio: 'it must return valid, usable JSON (up to 14s is fine: generated in the background and cached) — low price matters' },
  banco: { icon: '🪧', nombre: 'Ambient texts via cron (posters · CINEMA · gossip)',
    cubre: 'the living street posters, the propaganda, the news and the CINEMA billboard, the background gossip NPCs tell each other, the bum phrase bank — generated overnight and stored',
    criterio: 'short witty Argentine Spanish; speed does NOT matter (runs at night) — the CHEAPEST one that writes well wins' },
};

let MODELMAP = {};   // LiteLLM model_name → REAL model (e.g. claude-sonnet → anthropic/claude-sonnet-4.5), from GET /ia-models
let PRICES = {};     // real OpenRouter catalog prices (GET /precios, refreshed by a cron every 6h)
const _norm = x => String(x || '').toLowerCase().replace(/[.\-]/g, '');
const priceOf = n => { const real = MODELMAP[n] || n; let p = PRICES[real];
  if (!p) { for (const k in PRICES) if (_norm(k) === _norm(real)) { p = PRICES[k]; break; } }
  if (!p) return null; return +(((+p.prompt || 0) + 3 * (+p.completion || 0)) / 4 * 1e6).toFixed(2); };
const modelTag = n => { const u = MODELMAP[n]; const pr = priceOf(n); const extra = [u && u !== n ? u : null, pr != null ? (pr === 0 ? 'free' : '$' + pr + '/M') : null].filter(Boolean).join(' · ');
  return extra ? n + ' <span class="muted">(' + extra + ')</span>' : n; };
const chainTag = arr => (arr || []).map(m => modelTag(esc(m))).join(' → ');

const $ = id => document.getElementById(id);
const fecha = ts => new Date(ts).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const hora = ts => new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pill = v => '<span class="pill ' + esc(v) + '">' + esc(v === 'skip' ? 'no changes' : v === 'noop' ? 'already fine' : v === 'applied' ? 'CHANGED' : v === 'rollback' ? 'rolled back' : v) + '</span>';
const patTag = p => (PAT[p] ? PAT[p].icon + ' ' + PAT[p].nombre : p);
const nice = w => String(w || '')
  .replace(/sin cambios — la cadena actual sigue andando; ningún candidato NUEVO aprobó (\d+) scouts seguidos/i, 'no changes — the current chain keeps working; no NEW candidate passed $1 scouts in a row')
  .replace(/ningún modelo aprobó/i, 'no changes (everything keeps working) — no NEW candidate passed')
  .replace(/sin cambios: falta historial/i, 'no changes: not enough history yet')
  .replace(/sin cambios — sin candidato nuevo consistente/i, 'no changes — no consistent new candidate')
  .replace(/todo en orden/i, 'all good');

function repHealth(r) {
  const w = r.window || {}, d = r.day || {};
  return '<div class="hd"><span class="kind">🩺 health check</span>' + pill(r.verdict || '?') + '<span class="hora">' + hora(r.ts) + '</span></div>' +
    '<div class="kv">last hours: <b>' + (w.chats || 0) + '</b> NPC chats · <b>' + (w.fallbackPct || 0) + '%</b> failed</div>' +
    '<div class="kv">SHARED pool quota (players without a code): <b>' + (d.paidCalls || 0) + '/' + (d.paidCap || 0) + '</b> paid replies today (' + (d.paidUsedPct || 0) + '%) ≈ <b>US$' + (d.estCostUsd || 0) + '</b>' +
    ' &nbsp;|&nbsp; subscriptions (premium codes): <b>US$' + (d.subRealCostUsd || 0) + '</b> spent</div>' +
    (d.cuentaOrDiaUsd != null ? '<div class="kv">💳 the WHOLE OpenRouter account (every app): <b>~US$' + d.cuentaOrDiaUsd + '/day</b>' +
      (d.cuentaOrMesUsd ? ' · <b>US$' + d.cuentaOrMesUsd + '</b> this month' : '') + '</div>' +
      ((d.cuentaOrTop || []).length ? '<div class="kv" style="margin-left:1rem">who spends (by app, today): ' + d.cuentaOrTop.map(k => '<b>' + esc(k.key) + '</b> US$' + k.usd).join(' · ') + '</div>' : '') +
      ((d.cuentaOrModelos || []).length ? '<div class="kv" style="margin-left:1rem">by model (2 days): ' + d.cuentaOrModelos.map(m => esc(m.modelo.split('/').pop()) + ' US$' + m.usd + (m.usa ? ' <span class="muted">(' + esc(m.usa) + ')</span>' : '')).join(' · ') + '</div>' : '') : '') +
    '<div class="muted">note: if you play with a premium code, your spend is counted under "subscriptions" — it does NOT consume the shared quota (that\'s why it can read 0/' + (d.paidCap || 2000) + ' even if you chatted a lot).</div>' +
    (r.note ? '<div class="muted">' + esc(nice(r.note)) + '</div>' : '');
}
function repScout(r) {
  let h = '<div class="hd"><span class="kind">🔭 daily model tryout</span><span class="hora">' + hora(r.ts) + '</span></div>' +
    '<div class="muted">every model in the pool is tested against the standards of each game flow:</div>';
  for (const pat of ['chat', 'gen', 'banco']) {
    const rk = (r.rank && r.rank[pat]) || [];
    h += '<table class="rk"><tr><th>' + patTag(pat) + ' — passed</th><th>speed</th><th>price $/M</th></tr>';
    const fmtP = v => v == null ? '?' : v === 0 ? 'free' : '$' + v;
    if (rk.length) h += rk.slice(0, 4).map(x => { const pv = x.priceUsdM != null ? x.priceUsdM : priceOf(x.model);
      return '<tr><td>' + modelTag(esc(x.model)) + '</td><td>' + ((x.p95Ms || 0) / 1000).toFixed(1) + 's</td><td>' + fmtP(pv) + '</td></tr>'; }).join('');
    else h += '<tr><td colspan="3" class="muted">none passed the standard TODAY in the tryout — the game keeps running on its current model (see the health check)</td></tr>';
    h += '</table>';
  }
  if (r.paraAgregar && r.paraAgregar.length) h += '<div class="muted">new cheap models from the catalog (for the owner to consider adding): ' + r.paraAgregar.map(x => esc(x.id) + ' ($' + x.usdM + '/M)').join(', ') + '</div>';
  return h;
}
function repTune(r) {
  const one = (p, o) => o ? ('<div style="margin:.2rem 0"><b>' + patTag(p) + '</b> ' + pill(o.action || '?') +
    (o.to ? ' → now uses <code>' + chainTag(o.to) + '</code>' : '') +
    (o.e2e ? ' <span class="muted">(verified end-to-end: ' + esc(o.e2e) + ' real chats OK)</span>' : '') +
    (o.why ? ' <span class="muted">' + esc(nice(o.why)) + '</span>' : '') + '</div>') : '';
  if (r.action) return '<div class="hd"><span class="kind">⚙️ optimizer</span>' + pill(r.action) + '<span class="hora">' + hora(r.ts) + '</span></div><div class="kv">' + esc(nice(r.why || '')) + '</div>';
  return '<div class="hd"><span class="kind">⚙️ optimizer (picks each flow\'s model)</span><span class="hora">' + hora(r.ts) + '</span></div><div class="kv">' + ['chat', 'gen', 'banco'].map(p => one(p, r[p])).filter(Boolean).join('') + '</div>';
}

(async () => {
  // 1) THE REAL STATUS first (from the latest check): so a "no changes" from the optimizer doesn't look like a failure
  try {
    const d0 = await (await fetch(PROXY + '/ia-reports')).json();
    window.__reports = (d0.reports || []);
    const hs = window.__reports.filter(r => r.kind === 'health');
    const h = hs[hs.length - 1];
    const el = document.createElement('div'); el.className = 'chain';
    if (h && h.verdict === 'ok') el.innerHTML = '<b style="color:#7CFC00">✅ The game\'s AI is RUNNING FINE</b> <span class="muted">— last check ' + hora(h.ts) + ': ' + ((h.window && h.window.fallbackPct) || 0) + '% failed chats, day\'s spend ≈ US$' + ((h.day && h.day.estCostUsd) || 0) + '. Below is the optimization history: "no changes" = everything stays the same, NOT a failure.</span>';
    else if (h) el.innerHTML = '<b style="color:' + (h.verdict === 'critical' ? '#ff5252' : '#FFB300') + '">' + (h.verdict === 'critical' ? '🚨 The AI is having trouble' : '⚠️ The AI runs, with warnings') + '</b> <span class="muted">— ' + esc(nice(h.note || '')) + ' (' + hora(h.ts) + ')</span>';
    else el.innerHTML = '<span class="muted">no health checks yet (they run every 6 hours)</span>';
    document.querySelector('.wrap').insertBefore(el, $('cadena'));
  } catch (e) {}

  // 2) WHICH GAME FLOW uses WHICH MODEL, right now (with the real OpenRouter model in parentheses)
  try {
    try { MODELMAP = (await (await fetch(PROXY + '/ia-models')).json()).map || {}; } catch (e) {}
    try { PRICES = (await (await fetch(PROXY + '/precios')).json()).prices || {}; } catch (e) {}
    const ch = await (await fetch(PROXY + '/ia-chain')).json();
    const fila = (icon, nombre, modelsHtml, cubre, criterio) => '<div style="margin:.45rem 0"><b>' + icon + ' ' + esc(nombre) + '</b> → <code>' + modelsHtml + '</code>' +
      (cubre ? '<br><span class="muted">covers: ' + esc(cubre) + '</span>' : '') +
      (criterio ? '<br><span class="muted">standard: ' + esc(criterio) + '</span></div>' : '</div>');
    $('cadena').innerHTML = '<b>Which model each part of the game uses, RIGHT NOW</b> <span class="muted">(in parentheses, the real model behind the alias)</span>:' +
      fila(PAT.chat.icon, PAT.chat.nombre, chainTag(ch.effective), PAT.chat.cubre, PAT.chat.criterio) +
      fila('💎', 'Subscribers (premium)', chainTag(ch.subModels), 'players who loaded their code in Settings: always the top-quality chain, no quotas', 'NOT autotuned — stability above all (changed by hand in values-prod)') +
      fila(PAT.gen.icon, PAT.gen.nombre, chainTag(ch.effectiveGen), PAT.gen.cubre, PAT.gen.criterio) +
      fila(PAT.banco.icon, PAT.banco.nombre, ch.effectiveBanco ? chainTag(ch.effectiveBanco) : (modelTag('gemma4-paid') + ' <span class="muted">(posters/propaganda/gossip/stories)</span> · ' + modelTag('gemma4-free') + ' <span class="muted">(bum phrase bank)</span>'), PAT.banco.cubre, PAT.banco.criterio + (ch.effectiveBanco ? '' : ' · today each cron uses its configured model; once the optimizer finds a cheaper one that passes, they all pick it up on their own')) +
      (ch.override ? '<div class="muted" style="margin-top:.4rem">⚙️ an optimizer change is active — reason: ' + esc(ch.override.reason || '') + ' (' + hora(ch.override.ts) + '). If health degrades, it reverts on its own.</div>'
        : '<div class="muted" style="margin-top:.4rem">no optimizer changes: running on the base configuration.</div>');
    // 2b) THE ROBOTS THAT RUN ON THEIR OWN
    const robots = [
      ['🗞️', 'Neighborhood news + CINEMA billboard', 'daily 9:00 (+ the LIVE ticker every hour)', 'the AI writes the headlines and what the cinema is showing; the game displays them on posters and newscasts'],
      ['🪧', 'Living posters + propaganda', 'posters every 6h · propaganda 4:00', 'the street posters that change on their own'],
      ['🗣️', 'Gossip between NPCs', 'daily 4:30', 'the lines background characters say to each other'],
      ['🧔', 'Bum phrase bank (offline pool)', 'daily (early morning)', 'the reply bank NPCs use if the live AI is unavailable'],
      ['🏚️', 'Neighbor stories', 'daily 4:45', 'the tales of the condemned buildings'],
      ['💱', 'Model catalog prices', 'every 6h', 'fetches real OpenRouter prices (the optimizer uses them for cost-benefit)'],
      ['🩺', 'AI health check', 'every 6h (at :30)', 'measures failed chats, spend and budget — if something is off, it alerts Telegram on its own and reverts changes'],
      ['🔭⚙️', 'Model tryout + optimizer', 'daily 6:15', 'benchmarks the pool against each flow\'s standards and switches models ONLY after verifying end-to-end (with automatic rollback)'],
    ];
    const rb = document.createElement('div'); rb.className = 'chain';
    rb.innerHTML = '<b>🤖 The robots that run on their own (the infra crons):</b>' +
      robots.map(r => '<div style="margin:.35rem 0"><b>' + r[0] + ' ' + esc(r[1]) + '</b> <span class="muted">· ' + esc(r[2]) + '</span><br><span class="muted">' + esc(r[3]) + '</span></div>').join('') +
      '<div style="margin-top:.55rem"><b>🎮 Our own hardware (GPU/NPU):</b><br>' +
      '<span class="muted">· <b>NVIDIA GPU</b> (' + modelTag('local-gpu') + '): currently <b>DISABLED for maintenance</b> (switched off on purpose — the game does NOT need it: chat always went through the cloud). When on, it serves short local inference and testing.<br>' +
      '· <b>RK1 NPUs</b> (' + modelTag('rk1-npu-local') + '): meant to pre-generate the batch texts (posters/propaganda) without cloud spend.<br>' +
      '· The optimizer <b>excludes them on purpose</b> from the daily tryouts (they may be off); nothing in the game breaks without them.</span></div>' +
      '<div class="muted" style="margin-top:.4rem">Each message\'s route: player → our own proxy (k8s at home) → LiteLLM (the model pool) → the cloud (OpenRouter). Players can also bring their own key (BYOK). And if EVERYTHING fails, the game doesn\'t break: NPCs fall back to a static mode with pre-generated lines. The layer-by-layer detail is in <a href="tech.en.html">How it works</a>.</div>';
    $('cadena').after(rb);
  } catch (e) { $('cadena').innerHTML = '<span class="muted">couldn\'t read the configuration (' + esc(e.message) + ')</span>'; }

  // 3) the reports BY DAY
  try {
    const reps = (window.__reports || []).slice().sort((a, b) => (b.ts || 0) - (a.ts || 0));
    if (!reps.length) { $('estado').textContent = 'no reports yet (crons run every 6h / daily 6:15).'; return; }
    $('estado').textContent = reps.length + ' reports:';
    const byDay = {};
    for (const r of reps) { const k = new Date(r.ts).toISOString().slice(0, 10); (byDay[k] = byDay[k] || []).push(r); }
    let h = '';
    for (const k of Object.keys(byDay).sort().reverse()) {
      h += '<div class="day"><h3>' + fecha(byDay[k][0].ts) + '</h3>';
      for (const r of byDay[k]) h += '<div class="rep">' + (r.kind === 'health' ? repHealth(r) : r.kind === 'scout' ? repScout(r) : repTune(r)) + '</div>';
      h += '</div>';
    }
    $('dias').innerHTML = h;
  } catch (e) { $('estado').textContent = 'couldn\'t read the reports: ' + e.message; }
})();
