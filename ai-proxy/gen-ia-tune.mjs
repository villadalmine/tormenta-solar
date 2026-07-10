// gen-ia-tune.mjs — AUTOTUNE REACTIVO multi-patrón (specs/ia-costos.md §6): 2º paso del workflow diario
// (scout → tune). Cubre LOS TRES consumidores de IA del ecosistema:
//   · chat  (NPCs tiempo real)                 → canary + APLICA + verificación PUNTA A PUNTA por el /chat real + rollback
//   · gen   (niveles/tiendas/historias/mundo)  → canary JSON fresco + aplica (batch, bajo riesgo)
//   · banco (carteles/CINE/noticias/chusmerío/pool — crons) → elige EL MÁS BARATO que apruebe + canary + aplica
//     (los gen-*.mjs consultan GET /ia-chain → effectiveBanco al arrancar; si no hay override usan su env)
// Guardarraíles: consistencia en TUNE_CONSECUTIVE scouts · canary AHORA · baseline env intocable (reset vuelve) ·
// el premium SUB_* NO se toca · AUTOTUNE=0 apaga · el health de 6h revierte solo si la salud se degrada.
const AI_BASE = (process.env.AI_BASE_URL || 'http://litellm-proxy:4000/v1').replace(/\/+$/, '');
const AI_KEY = (process.env.AI_API_KEY || '').trim();
const PROXY = (process.env.PROXY_URL || 'http://tormenta-ai-proxy').replace(/\/+$/, '');
const TOKEN = process.env.GEN_TOKEN || '';
const ENABLED = !/^(0|false|off)$/i.test(process.env.AUTOTUNE || '1');
const CONSEC = +process.env.TUNE_CONSECUTIVE || 2;
const BASE_CHAT = (process.env.TUNE_BASELINE || 'claude-sonnet').split(',').map(x => x.trim()).filter(Boolean);
const BASE_GEN = (process.env.TUNE_BASELINE_GEN || 'gemma4-paid').split(',').map(x => x.trim()).filter(Boolean);

async function jget(u) { const r = await fetch(u); if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); }
async function jpost(u, body) { const r = await fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-gen-token': TOKEN }, body: JSON.stringify(body) }); return { ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) }; }
async function ask(model, sys, user, maxTokens, timeoutMs) {
  const t0 = Date.now(); const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(AI_BASE + '/chat/completions', { method: 'POST', signal: ctrl.signal,
      headers: { Authorization: 'Bearer ' + AI_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, temperature: 0.8, max_tokens: maxTokens, messages: [{ role: 'system', content: sys }, { role: 'user', content: user }] }) });
    clearTimeout(to); const j = await r.json();
    return { ok: r.ok, ms: Date.now() - t0, txt: j.choices?.[0]?.message?.content || '' };
  } catch (e) { clearTimeout(to); return { ok: false, ms: Date.now() - t0, txt: '' }; }
}
const esp = t => /\b(que|con|los|una|ch[ée]|vos|acá|dale|mirá|est[áa])\b/i.test(t);
const jsonOk = t => { try { const j = JSON.parse(String(t).replace(/^```(json)?|```$/gm, '').trim()); return j && typeof j === 'object'; } catch (e) { return false; } };

const out = { kind: 'tune', ts: Date.now(), chat: { action: 'skip' }, gen: { action: 'skip' }, banco: { action: 'skip' } };
if (!ENABLED) { out.chat.action = out.gen.action = out.banco.action = 'off'; await jpost(PROXY + '/ia-report', out); console.error('AUTOTUNE off'); process.exit(0); }

const reps = (await jget(PROXY + '/ia-reports')).reports || [];
const scouts = reps.filter(x => x.kind === 'scout' && x.rank);
const chains = await jget(PROXY + '/ia-chain');

// el candidato tiene que venir aprobando el patrón en los últimos CONSEC scouts
function consistent(pat) {
  if (scouts.length < CONSEC) return [];
  const last = scouts[scouts.length - 1];
  return (last.rank[pat] || []).filter(c => c.pass && scouts.slice(-CONSEC).every(s => (s.rank[pat] || []).some(x => x.model === c.model && x.pass)));
}

// ---- CHAT: canary → aplicar → verificar por el /chat REAL → rollback si falla -------------------------------
const chatCands = consistent('chat');
if (!chatCands.length) { out.chat.why = scouts.length < CONSEC ? 'historial insuficiente' : 'nadie aprobó ' + CONSEC + ' scouts seguidos'; }
else {
  const top = chatCands.sort((a, b) => b.score - a.score)[0];
  const current = chains.effective || [];
  const desired = [...new Set([top.model, ...BASE_CHAT, ...current])].slice(0, 3);
  if (current[0] === desired[0]) { out.chat = { action: 'noop', why: top.model + ' ya es titular' }; }
  else {
    let cOk = 0; const CAN = [
      ['Sos un linyera filósofo de la calle Florida, porteño y cálido. No rompas personaje.', 'che, qué onda el cielo hoy?'],
      ['Sos Doña Rosa, del comedor de la Villa 31: madraza, rioplatense.', 'cómo viene la olla?'],
      ['Sos un maquinista de tren bonachón de Villa Ballester.', 'a qué hora sale el próximo?']];
    for (const [sy, us] of CAN) { const r = await ask(top.model, sy, us, 150, 9500); if (r.ok && esp(r.txt)) cOk++; }
    if (cOk < 3) { out.chat = { action: 'skip', why: 'canary AHORA falló (' + cOk + '/3)', model: top.model }; }
    else {
      const ap = await jpost(PROXY + '/ia-chain', { chat: desired, reason: 'autotune chat: ' + top.model + ' (' + CONSEC + ' scouts + canary 3/3)' });
      if (!ap.ok) { out.chat = { action: 'error', why: 'POST /ia-chain ' + ap.status }; }
      else {
        let e2e = 0; for (const m of ['hola, todo bien?', 'qué me recomendás?', 'contame del barrio', 'cómo está el día?']) {
          try { const r = await fetch(PROXY + '/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Session-Id': 'ia-tune-canary' }, body: JSON.stringify({ npc: 'filosofo', message: m }) });
            const j = await r.json().catch(() => ({})); if (r.ok && j.reply && !j.fallback) e2e++; } catch (e) {}
        }
        if (e2e >= 3) out.chat = { action: 'applied', from: current, to: desired, e2e: e2e + '/4' };
        else { await jpost(PROXY + '/ia-chain', { chat: current.length ? current : BASE_CHAT, reason: 'rollback chat: punta a punta ' + e2e + '/4' });
          out.chat = { action: 'rollback', to: desired, e2e: e2e + '/4' }; }
      }
    }
  }
}

// ---- GEN (niveles/tiendas/historias/mundo-ai): canary JSON fresco → aplicar ---------------------------------
const genCands = consistent('gen');
if (!genCands.length) { out.gen.why = 'sin candidato consistente'; }
else {
  const top = genCands.sort((a, b) => b.score - a.score)[0];
  const curGen = chains.effectiveGen || [];
  if (curGen[0] === top.model) { out.gen = { action: 'noop', why: top.model + ' ya es titular' }; }
  else {
    const r = await ask(top.model, 'Sos generador de niveles. Respondé SOLO JSON válido, sin markdown.', 'Generá {"name":"...","lines":["..."]} para un edificio embrujado.', 380, 14000);
    if (!(r.ok && jsonOk(r.txt))) { out.gen = { action: 'skip', why: 'canary JSON falló AHORA', model: top.model }; }
    else {
      const desired = [...new Set([top.model, ...BASE_GEN])].slice(0, 2);
      const ap = await jpost(PROXY + '/ia-chain', { gen: desired, reason: 'autotune gen: ' + top.model + ' (' + CONSEC + ' scouts + canary JSON)' });
      out.gen = ap.ok ? { action: 'applied', from: curGen, to: desired } : { action: 'error', why: 'POST ' + ap.status };
    }
  }
}

// ---- BANCO (carteles/cine/noticias/chusmerío/pool): EL MÁS BARATO que apruebe → canary → aplicar -------------
const banCands = consistent('banco');
if (!banCands.length) { out.banco.why = 'sin candidato consistente'; }
else {
  // el patrón banco pesa PRECIO primero (null/desconocido al final), después score
  const top = banCands.sort((a, b) => ((a.priceUsdM == null ? 99 : a.priceUsdM) - (b.priceUsdM == null ? 99 : b.priceUsdM)) || (b.score - a.score))[0];
  const curBanco = chains.effectiveBanco || [];
  if (curBanco[0] === top.model) { out.banco = { action: 'noop', why: top.model + ' ya es titular' }; }
  else {
    const r = await ask(top.model, 'Escribís carteles cortos con humor porteño. UNA frase, sin comillas.', 'Un cartel del cine anunciando la película de la semana.', 90, 20000);
    if (!(r.ok && esp(r.txt) && r.txt.length >= 10 && r.txt.length <= 400)) { out.banco = { action: 'skip', why: 'canary cartel falló AHORA', model: top.model }; }
    else {
      const ap = await jpost(PROXY + '/ia-chain', { banco: [top.model], reason: 'autotune banco: ' + top.model + ' — el más barato que aprueba (' + (top.priceUsdM == null ? '$?' : '$' + top.priceUsdM) + '/M)' });
      out.banco = ap.ok ? { action: 'applied', from: curBanco, to: [top.model], priceUsdM: top.priceUsdM } : { action: 'error', why: 'POST ' + ap.status };
    }
  }
}

out.why = ['chat: ' + out.chat.action, 'gen: ' + out.gen.action, 'banco: ' + out.banco.action].join(' · ');
console.error('TUNE →', out.why);
const rp = await jpost(PROXY + '/ia-report', out);
console.error('reporte →', rp.status);
process.exit(0);
