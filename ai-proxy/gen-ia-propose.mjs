// gen-ia-propose.mjs — OPCIÓN A del cierre de loop (specs/ia-costos.md §7): cuando el scout encuentra un modelo
// NUEVO barato en el catálogo (no registrado en LiteLLM), este paso abre un PR al REPO INFRA (villadalmine/infra)
// agregándolo al model_list del role de LiteLLM. GitOps puro: el dueño aprueba el PR y aplica con ansible
// (--tags ai-litellm-proxy); después el scout de la mañana lo bencha y el autotune lo adopta SOLO si aprueba.
// Todo por API REST de GitHub (el pod no tiene git). Node puro, sin deps.
//
//   Modo AUTO (sin params): toma el mejor candidato de `paraAgregar` del último scout.
//   Modo MANUAL: MODEL_ID=deepseek/deepseek-v4-mini [MODEL_ALIAS=v4-mini] node gen-ia-propose.mjs
//
//   GH_TOKEN=... (secret github-pr-token) · PROXY_URL=http://tormenta-ai-proxy · INFRA_REPO=villadalmine/infra
const GH_TOKEN = (process.env.GH_TOKEN || '').trim();
const PROXY = (process.env.PROXY_URL || 'http://tormenta-ai-proxy').replace(/\/+$/, '');
const REPO = process.env.INFRA_REPO || 'villadalmine/infra';
const FILE = process.env.INFRA_FILE || 'roles/install-litellm-proxy/tasks/main.yml';
const ANCHOR = '          model_list:\n';
const API = 'https://api.github.com';
const HDR = { Authorization: 'Bearer ' + GH_TOKEN, Accept: 'application/vnd.github+json', 'User-Agent': 'tormenta-ia-propose', 'Content-Type': 'application/json' };

if (!GH_TOKEN) { console.error('falta GH_TOKEN'); process.exit(1); }
async function gh(method, path, body) {
  const r = await fetch(API + path, { method, headers: HDR, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(method + ' ' + path + ' → ' + r.status + ' ' + (d.message || ''));
  return d;
}
async function jget(u) { const r = await fetch(u); if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); }
async function reportar(rep) { try { await fetch(PROXY + '/ia-report', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-gen-token': process.env.GEN_TOKEN || '' }, body: JSON.stringify(Object.assign({ kind: 'tune', ts: Date.now() }, rep)) }); } catch (e) {} }

// 1) el candidato: manual por env, o AUTO del último scout (paraAgregar = baratos del catálogo NO registrados)
let modelId = (process.env.MODEL_ID || '').trim(), fromScout = null;
if (!modelId) {
  const reps = (await jget(PROXY + '/ia-reports')).reports || [];
  const scouts = reps.filter(x => x.kind === 'scout' && Array.isArray(x.paraAgregar) && x.paraAgregar.length);
  if (!scouts.length) { console.error('sin candidatos nuevos en los scouts — nada que proponer'); process.exit(0); }
  fromScout = scouts[scouts.length - 1].paraAgregar.slice().sort((a, b) => a.usdM - b.usdM)[0];
  modelId = fromScout.id;
}
const alias = (process.env.MODEL_ALIAS || modelId.split('/').pop().replace(/:free$/, '-free').replace(/[^\w.-]/g, '-')).slice(0, 40);

// 2) ¿ya está registrado en LiteLLM? ¿o ya hay un PR abierto? → no duplicar
try { const mm = (await jget(PROXY + '/ia-models')).map || {};
  const norm = x => String(x || '').toLowerCase().replace(/[.\-]/g, '');
  if (mm[alias] || Object.values(mm).some(v => norm(v) === norm(modelId))) { console.error(alias + ' / ' + modelId + ' ya está en LiteLLM — nada que proponer'); process.exit(0); }
} catch (e) {}
const branch = 'ia/add-' + alias.replace(/[^a-z0-9.-]/gi, '-').toLowerCase();
const abiertos = await gh('GET', `/repos/${REPO}/pulls?state=open&head=${REPO.split('/')[0]}:${branch}`);
if (abiertos.length) { console.error('ya hay un PR abierto para ' + alias + ': ' + abiertos[0].html_url); process.exit(0); }

// 3) leer el archivo del repo, insertar el bloque después de `model_list:` (ancla única, indent del ConfigMap)
const repoInfo = await gh('GET', `/repos/${REPO}`);
const base = repoInfo.default_branch || 'main';
const ref = await gh('GET', `/repos/${REPO}/git/ref/heads/${base}`);
const file = await gh('GET', `/repos/${REPO}/contents/${FILE}?ref=${base}`);
const contenido = Buffer.from(file.content, 'base64').toString('utf8');
if (!contenido.includes(ANCHOR)) { console.error('no encontré el ancla model_list: en ' + FILE); process.exit(1); }
if (contenido.includes('model_name: ' + alias + '\n')) { console.error(alias + ' ya está en el archivo — nada que hacer'); process.exit(0); }
const bloque = ANCHOR +
  `            # ── propuesto por ia-scout (${new Date().toISOString().slice(0, 10)}): candidato barato del catálogo — ver PR ──\n` +
  `            - model_name: ${alias}\n` +
  `              litellm_params:\n` +
  `                model: openrouter/${modelId}\n` +
  `                api_key: os.environ/OPENROUTER_API_KEY\n`;
const nuevo = contenido.replace(ANCHOR, bloque);

// 4) branch + commit + PR
await gh('POST', `/repos/${REPO}/git/refs`, { ref: 'refs/heads/' + branch, sha: ref.object.sha });
await gh('PUT', `/repos/${REPO}/contents/${FILE}`, {
  message: `ai: agregar ${alias} (${modelId}) al model_list de LiteLLM — propuesto por ia-scout de tormenta-solar`,
  content: Buffer.from(nuevo, 'utf8').toString('base64'), sha: file.sha, branch,
});
const pr = await gh('POST', `/repos/${REPO}/pulls`, {
  title: `🤖 ia-scout: agregar ${alias} (${modelId}) a LiteLLM`,
  head: branch, base,
  body: `El **scout diario** de TORMENTA SOLAR encontró este candidato **barato** en el catálogo de OpenRouter y no está registrado en LiteLLM:\n\n` +
    `| | |\n|---|---|\n| **model_name propuesto** | \`${alias}\` |\n| **modelo real** | \`${modelId}\` |\n` +
    (fromScout ? `| **precio (blended)** | $${fromScout.usdM}/M tok ${fromScout.free ? '(free)' : ''} |\n` : '') +
    `| **origen** | reporte del scout — https://llm-tormenta-solar.cybercirujas.club/ia-reports |\n\n` +
    `**Para aplicar tras el merge:**\n\`\`\`bash\nansible-playbook playbooks/bootstrap.yml --tags ai-litellm-proxy\n\`\`\`\n` +
    `(el role fuerza el rollout de LiteLLM al cambiar el ConfigMap)\n\n` +
    `**Qué pasa después:** el scout de la mañana siguiente lo banchmarkea con los estándares por patrón ` +
    `(specs/ia-costos.md §1 del repo shooter) y el **autotune lo adopta SOLO si aprueba 2 scouts seguidos + ` +
    `canary + verificación punta a punta** — con rollback automático. Si no aprueba, no pasa nada.\n\n` +
    `⚠️ Alternativa para PROBARLO YA sin merge: el WorkflowTemplate \`tormenta-ia-model-add\` (opción B) lo agrega ` +
    `en caliente a LiteLLM — pero NO persiste reinicios del pod (LiteLLM sin DB): lo durable es este PR.\n\n` +
    `🤖 Generado con [Claude Code](https://claude.com/claude-code)`,
});
console.error('✓ PR abierto: ' + pr.html_url);
await reportar({ propose: { action: 'pr', alias, model: modelId, pr: pr.html_url } });
console.log(pr.html_url);
