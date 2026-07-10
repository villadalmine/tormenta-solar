// gen-ia-tune.mjs — AUTOTUNE REACTIVO (specs/ia-costos.md §6): corre DESPUÉS del scout diario (2º paso del
// workflow). Si el scout detectó un modelo mejor/más barato para el patrón `chat`, lo prueba PUNTA A PUNTA y
// recién ahí cambia la cadena — con rollback automático si la verificación falla.
//
//   Guardarraíles (pedido del dueño "reactivo pero seguro"):
//   1. Solo toca la cadena ANÓNIMA (AI_MODEL). El premium (SUB_*) NO se autotunea.
//   2. El candidato tiene que haber APROBADO `chat` en los últimos TUNE_CONSECUTIVE scouts (default 2) — una
//      corrida buena no alcanza (gemma4-paid un día voló y al otro colgaba).
//   3. CANARY directo (3 prompts reales contra LiteLLM, AHORA, no esta mañana) antes de aplicar.
//   4. Aplica por POST /ia-chain (override runtime, PVC) y VERIFICA por el /chat REAL del proxy (4 requests):
//      ≥3/4 sin fallback → queda; si no → ROLLBACK a la cadena anterior. Todo queda en /ia-reports + Telegram
//      (alerta informativa TormentaIACadenaCambiada). El baseline env AI_MODEL nunca se pierde (reset vuelve ahí).
//
//   AI_BASE_URL/AI_API_KEY (canary LiteLLM) · PROXY_URL=http://tormenta-ai-proxy · GEN_TOKEN · AUTOTUNE=1
//   TUNE_CONSECUTIVE=2 · TUNE_BASELINE=claude-sonnet (el titular confiable que SIEMPRE queda de respaldo)
const AI_BASE = (process.env.AI_BASE_URL || 'http://litellm-proxy:4000/v1').replace(/\/+$/, '');
const AI_KEY = (process.env.AI_API_KEY || '').trim();
const PROXY = (process.env.PROXY_URL || 'http://tormenta-ai-proxy').replace(/\/+$/, '');
const TOKEN = process.env.GEN_TOKEN || '';
const ENABLED = !/^(0|false|off)$/i.test(process.env.AUTOTUNE || '1');
const CONSEC = +process.env.TUNE_CONSECUTIVE || 2;
const BASELINE = (process.env.TUNE_BASELINE || 'claude-sonnet').split(',').map(x => x.trim()).filter(Boolean);

async function jget(u) { const r = await fetch(u); if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); }
async function jpost(u, body) { const r = await fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-gen-token': TOKEN }, body: JSON.stringify(body) }); return { ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) }; }
async function report(rep) { const r = await jpost(PROXY + '/ia-report', Object.assign({ kind: 'tune', ts: Date.now() }, rep)); console.error('reporte tune →', r.status); }

if (!ENABLED) { console.error('AUTOTUNE off'); await report({ action: 'off' }); process.exit(0); }

// 1) historial de scouts: el candidato tiene que venir aprobando `chat` CONSEC veces seguidas
const reps = (await jget(PROXY + '/ia-reports')).reports || [];
const scouts = reps.filter(x => x.kind === 'scout' && x.rank && x.rank.chat);
if (scouts.length < CONSEC) { console.error('sin historial suficiente (' + scouts.length + '/' + CONSEC + ')'); await report({ action: 'skip', why: 'historial insuficiente (' + scouts.length + '/' + CONSEC + ' scouts)' }); process.exit(0); }
const last = scouts[scouts.length - 1];
const passedNow = last.rank.chat.filter(x => x.pass);
const consistent = passedNow.filter(c => scouts.slice(-CONSEC).every(s => (s.rank.chat || []).some(x => x.model === c.model && x.pass)));
if (!consistent.length) { console.error('ningún candidato consistente'); await report({ action: 'skip', why: 'ningún modelo aprobó chat ' + CONSEC + ' scouts seguidos' }); process.exit(0); }

// 2) cadena deseada: el mejor consistente + el titular de respaldo (BASELINE) — nunca una cadena vacía/sin red
const top = consistent.sort((a, b) => b.score - a.score)[0];
const current = (await jget(PROXY + '/ia-chain')).effective || [];
const desired = [...new Set([top.model, ...BASELINE, ...current])].slice(0, 3);
if (current[0] === desired[0]) { console.error('noop: el titular ya es', current[0]); await report({ action: 'noop', chain: current, why: top.model + ' ya es el titular' }); process.exit(0); }

// 3) CANARY directo (ahora, contra LiteLLM): 3 prompts del patrón chat — el scout fue esta mañana, esto es AHORA
const CANARY = [
  ['Sos un linyera filósofo de la calle Florida, porteño y cálido. Pasó una tormenta solar. No rompas personaje.', 'che, qué onda el cielo hoy?'],
  ['Sos Doña Rosa, del comedor de la Villa 31: madraza, rioplatense.', 'doña rosa, cómo viene la olla?'],
  ['Sos un maquinista de tren bonachón de Villa Ballester.', 'maestro, a qué hora sale el próximo?'],
];
let canaryOk = 0; const canaryMs = [];
for (const [sys, user] of CANARY) {
  const t0 = Date.now(); const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 9500);
  try {
    const r = await fetch(AI_BASE + '/chat/completions', { method: 'POST', signal: ctrl.signal,
      headers: { Authorization: 'Bearer ' + AI_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: top.model, temperature: 0.8, max_tokens: 150, messages: [{ role: 'system', content: sys }, { role: 'user', content: user }] }) });
    clearTimeout(to); const j = await r.json();
    const txt = j.choices?.[0]?.message?.content || '';
    if (r.ok && txt && /\b(que|con|los|una|ch[ée]|vos|acá|dale|mirá)\b/i.test(txt)) canaryOk++;
    canaryMs.push(Date.now() - t0);
  } catch (e) { clearTimeout(to); canaryMs.push(Date.now() - t0); }
}
console.error('canary', top.model, '→', canaryOk + '/3', canaryMs.join('ms, ') + 'ms');
if (canaryOk < 3) { await report({ action: 'skip', why: 'canary falló AHORA (' + canaryOk + '/3) aunque el scout aprobaba', model: top.model, canaryMs }); process.exit(0); }

// 4) APLICAR el override + VERIFICAR punta a punta por el /chat REAL del proxy
const prev = current;
const ap = await jpost(PROXY + '/ia-chain', { chat: desired, reason: 'autotune: ' + top.model + ' aprobó chat ' + CONSEC + ' scouts + canary 3/3 (score ' + top.score + ')' });
if (!ap.ok) { console.error('no pude aplicar', ap.status); await report({ action: 'error', why: 'POST /ia-chain ' + ap.status }); process.exit(1); }
console.error('override aplicado →', desired.join(','));

let e2eOk = 0; const e2eMs = [];
for (const msg of ['hola, todo bien?', 'qué me recomendás hacer?', 'contame algo del barrio', 'cómo está el día?']) {
  const t0 = Date.now();
  try {
    const r = await fetch(PROXY + '/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Session-Id': 'ia-tune-canary' },
      body: JSON.stringify({ npc: 'filosofo', message: msg }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.reply && !j.fallback) e2eOk++;
    e2eMs.push(Date.now() - t0);
  } catch (e) { e2eMs.push(Date.now() - t0); }
}
console.error('punta a punta →', e2eOk + '/4', e2eMs.join('ms, ') + 'ms');

if (e2eOk >= 3) {
  await report({ action: 'applied', from: prev, to: desired, model: top.model, canaryMs, e2e: e2eOk + '/4', e2eMs,
    why: top.model + ' consistente en ' + CONSEC + ' scouts, canary 3/3, punta a punta ' + e2eOk + '/4 — cadena cambiada (baseline env intacto; rollback automático si el health se degrada)' });
  console.error('✓ APLICADO');
} else {
  const rb = prev.length ? await jpost(PROXY + '/ia-chain', { chat: prev, reason: 'rollback: verificación punta a punta falló (' + e2eOk + '/4)' })
    : await jpost(PROXY + '/ia-chain', { reset: true, reason: 'rollback a baseline' });
  await report({ action: 'rollback', from: prev, to: desired, e2e: e2eOk + '/4', why: 'la verificación punta a punta falló → cadena restaurada (' + (rb.ok ? 'ok' : 'ERROR') + ')' });
  console.error('✗ ROLLBACK', rb.status);
  process.exit(0);
}
