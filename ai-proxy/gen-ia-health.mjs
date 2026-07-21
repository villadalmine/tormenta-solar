// gen-ia-health.mjs — Argo CronWorkflow cada 6h (specs/ia-costos.md §2): ¿CÓMO VIENE la IA? Lee /metrics del proxy,
// calcula el DELTA vs el snapshot anterior (fallback %, timeouts %, budget pago usado, gasto estimado) y publica
// el reporte (POST /ia-report, GEN_TOKEN). El proxy expone los valores como gauges → PrometheusRule → Telegram.
// Node puro, sin deps (patrón gen-prices.mjs).
//
//   METRICS_URL=http://tormenta-ai-proxy/metrics  REPORTS_URL=http://tormenta-ai-proxy/ia-reports
//   REPORT_POST_URL=http://tormenta-ai-proxy/ia-report  GEN_TOKEN=...  node gen-ia-health.mjs
const METRICS_URL = process.env.METRICS_URL || 'http://tormenta-ai-proxy/metrics';
const REPORTS_URL = process.env.REPORTS_URL || METRICS_URL.replace(/\/metrics$/, '/ia-reports');
const POST_URL = process.env.REPORT_POST_URL || METRICS_URL.replace(/\/metrics$/, '/ia-report');
const TOKEN = process.env.GEN_TOKEN || '';
// precio blended estimado del modelo de chat activo (claude-sonnet ≈ $3in/$15out → con 150 tok out y ~2.5k in,
// ~US$0.01 por respuesta). Ajustable por env sin redeploy del script.
const COST_PER_PAID = +process.env.COST_PER_PAID_USD || 0.010;

function num(text, name) { const m = new RegExp('^' + name + '(?:\\{[^}]*\\})? (\\S+)$', 'm').exec(text); return m ? +m[1] : 0; }
function sumLabeled(text, name, filter) {
  let t = 0; const re = new RegExp('^' + name + '\\{([^}]*)\\} (\\S+)$', 'gm'); let m;
  while ((m = re.exec(text))) { if (!filter || filter(m[1])) t += +m[2]; }
  return t;
}

const r = await fetch(METRICS_URL); if (!r.ok) { console.error('metrics', r.status); process.exit(1); }
const tx = await r.text();

const now = {
  requests: num(tx, 'tormenta_ai_requests_total'),
  fallbacks: num(tx, 'tormenta_ai_fallback_lines_total'),
  timeouts: num(tx, 'tormenta_ai_timeouts_total'),
  errors: num(tx, 'tormenta_ai_errors_total'),
  paidToday: num(tx, 'tormenta_ai_paid_calls_today'),
  paidCap: num(tx, 'tormenta_ai_paid_budget_daily'),
  subCodes: num(tx, 'tormenta_ai_sub_codes'),
  subRealCost: sumLabeled(tx, 'tormenta_ai_sub_real_cost_usd'),
  chatAi: sumLabeled(tx, 'tormenta_ai_chat_total', l => /outcome="(ai|ai_sub)"/.test(l)),
  chatBad: sumLabeled(tx, 'tormenta_ai_chat_total', l => /outcome="(timeout|error|fallback)/.test(l)),
};

// snapshot anterior (el último reporte health guardado) → delta de la ventana (~6h). Counters pueden resetear
// con un redeploy del proxy → si el delta da negativo, la ventana es "desde el reinicio" (se usa el valor actual).
let prev = null;
try { const rr = await fetch(REPORTS_URL); if (rr.ok) { const list = (await rr.json()).reports || []; prev = list.filter(x => x.kind === 'health').pop() || null; } } catch (e) {}
const d = (k) => { const v = now[k] - ((prev && prev.raw && prev.raw[k]) || 0); return v >= 0 ? v : now[k]; };

const win = { requests: d('requests'), fallbacks: d('fallbacks'), timeouts: d('timeouts'), errors: d('errors'), chatAi: d('chatAi'), chatBad: d('chatBad') };
const total = win.chatAi + win.chatBad;
const fallbackPct = total > 0 ? Math.round(win.chatBad * 100 / total) : 0;
const paidUsedPct = now.paidCap > 0 ? Math.round(now.paidToday * 100 / now.paidCap) : 0;
const estCost = +(now.paidToday * COST_PER_PAID).toFixed(3);   // gasto estimado del DÍA (pool compartido)

const verdict = (fallbackPct >= 50 || paidUsedPct >= 100) ? 'critical'
  : (fallbackPct >= 20 || paidUsedPct >= 80) ? 'warn' : 'ok';

const report = {
  kind: 'health', ts: Date.now(), verdict,
  window: { chats: total, ok: win.chatAi, bad: win.chatBad, fallbackPct, timeouts: win.timeouts, errors: win.errors },
  day: { paidCalls: now.paidToday, paidCap: now.paidCap, paidUsedPct, estCostUsd: estCost, subRealCostUsd: +now.subRealCost.toFixed(3), subCodes: now.subCodes },
  raw: now,   // snapshot para el delta del próximo run
  note: verdict === 'ok' ? 'todo en orden' :
    (fallbackPct >= 20 ? `fallback ${fallbackPct}% en la ventana — revisar la cadena de modelos (specs/ia-costos.md §1)` :
      `budget pago al ${paidUsedPct}% — considerar subir PAID_DAILY_CAP o abaratar la cadena`),
};

// VIGÍA (infra-76): gasto de TODA la cuenta OpenRouter (galaxy/hermes/openclaw/holmes/leloir + el juego, TODAS
// las apps del dueño). El proxy consulta OR con la provisioning key y devuelve el delta vs el run anterior (~6h)
// → estimado US$/día. Solo sube a 'warn' (nunca 'critical': el rollback de cadena es para la salud del CHAT).
const OR_DAY_WARN = +process.env.OR_DAY_WARN_USD || 3;
if (POST_URL && TOKEN) {
  try {
    const rr = await fetch(POST_URL.replace(/\/ia-report$/, '/or-spend'), { headers: { 'x-gen-token': TOKEN } });
    if (rr.ok) {
      const cuenta = await rr.json();
      report.day.cuentaOrDiaUsd = cuenta.dayEstUsd || 0;
      report.day.cuentaOrMesUsd = cuenta.monthTotal || 0;
      report.day.cuentaOrTotalUsd = cuenta.total || 0;
      // POR APP (no por etiqueta de key) y POR MODELO: quién gasta qué, claro.
      report.day.cuentaOrTop = (cuenta.byApp || []).slice(0, 4).map(x => ({ key: x.app, usd: x.usdDay }));
      report.day.cuentaOrModelos = (cuenta.byModel || []).slice(0, 4).map(x => ({ modelo: x.model, usa: x.usa, usd: x.usd }));
      if ((cuenta.dayEstUsd || 0) >= OR_DAY_WARN) {
        if (report.verdict === 'ok') report.verdict = 'warn';
        report.note = (report.note === 'todo en orden' ? '' : report.note + ' · ') +
          `la cuenta OpenRouter ENTERA (todas las apps, no solo el juego) va a ~US$${cuenta.dayEstUsd}/día — top: ` +
          report.day.cuentaOrTop.map(k => `${k.key} US$${k.usd}`).join(' · ');
      }
    }
  } catch (e) { console.error('or-spend:', e.message); }
}

console.error(`health: ${report.verdict} · chats=${total} fallback=${fallbackPct}% · pago=${now.paidToday}/${now.paidCap} (${paidUsedPct}%) ≈ US$${estCost} · cuenta≈US$${report.day.cuentaOrDiaUsd || '?'}/día`);

// GUARDIÁN del autotune (§6): si la salud es CRÍTICA y hay un override de cadena activo → rollback al baseline
// env (la cadena conocida-buena de values-prod). Reactivo también para deshacer.
if (verdict === 'critical' && POST_URL && TOKEN && !/^(0|false|off)$/i.test(process.env.AUTOTUNE || '1')) {
  try {
    const ch = await (await fetch(POST_URL.replace(/\/ia-report$/, '/ia-chain'))).json();
    if (ch.override) {
      const rb = await fetch(POST_URL.replace(/\/ia-report$/, '/ia-chain'), { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-gen-token': TOKEN }, body: JSON.stringify({ reset: true, reason: 'auto-rollback del health: salud crítica con override activo' }) });
      report.note += ' · AUTO-ROLLBACK del override de cadena → baseline env (' + (rb.ok ? 'hecho' : 'FALLÓ') + ')';
      console.error('⛑️ auto-rollback del override →', rb.status);
    }
  } catch (e) { console.error('rollback check:', e.message); }
}

if (POST_URL && TOKEN) {
  const res = await fetch(POST_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-gen-token': TOKEN }, body: JSON.stringify(report) });
  console.error('POST', POST_URL, '->', res.status);
  process.exit(res.ok ? 0 : 1);
} else {
  console.log(JSON.stringify(report, null, 1));   // modo prueba
}
