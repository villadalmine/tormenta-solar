// gen-ia-modeladd.mjs — OPCIÓN B del cierre de loop (specs/ia-costos.md §7): agrega un modelo a LiteLLM EN
// CALIENTE (POST /model/new con la master key) para PROBARLO YA sin merge. ⚠️ LiteLLM del cluster corre SIN DB
// (config por ConfigMap): el hot-add NO persiste un reinicio del pod — lo DURABLE es el PR de la opción A
// (gen-ia-propose.mjs). Pensado para dispararse a mano: argo submit --from workflowtemplate/tormenta-ia-model-add.
//
//   MODEL_ALIAS=v4-mini MODEL_ID=deepseek/deepseek-v4-mini  AI_BASE_URL=... AI_API_KEY=<master>  node gen-ia-modeladd.mjs
const AI_BASE = (process.env.AI_BASE_URL || 'http://litellm-proxy:4000/v1').replace(/\/v1$/, '').replace(/\/+$/, '');
const KEY = (process.env.AI_API_KEY || '').trim();
const alias = (process.env.MODEL_ALIAS || '').trim();
const modelId = (process.env.MODEL_ID || '').trim();
if (!alias || !modelId || !KEY) { console.error('faltan MODEL_ALIAS / MODEL_ID / AI_API_KEY'); process.exit(1); }

const r = await fetch(AI_BASE + '/model/new', {
  method: 'POST', headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ model_name: alias, litellm_params: { model: 'openrouter/' + modelId, api_key: 'os.environ/OPENROUTER_API_KEY' } }),
});
const d = await r.json().catch(() => ({}));
if (!r.ok) { console.error('✗ LiteLLM /model/new →', r.status, JSON.stringify(d).slice(0, 300)); console.error('(si LiteLLM corre sin DB, el hot-add no está soportado: usá la opción A — el PR)'); process.exit(1); }
console.error('✓ agregado EN CALIENTE:', alias, '→ openrouter/' + modelId);
console.error('⚠️ NO persiste reinicios del pod de LiteLLM. Para hacerlo permanente: opción A (PR al repo infra).');
// smoke: una respuesta corta por el alias nuevo
try {
  const t = await fetch(AI_BASE + '/v1/chat/completions', { method: 'POST', headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: alias, max_tokens: 30, messages: [{ role: 'user', content: 'decí hola en castellano rioplatense' }] }) });
  const j = await t.json();
  console.error('smoke:', t.status, (j.choices?.[0]?.message?.content || '').slice(0, 80));
} catch (e) { console.error('smoke falló:', e.message); }
