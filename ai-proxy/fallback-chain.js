// fallback-chain.js — a qué cadena vuelve el auto-rollback cuando el health sale crítico.
// Antes volvía al env (AI_MODEL), que puede ser caro. Ahora: lo más barato que ande, sin pasar de `cheap`.
// Puro (sin I/O) para poder testearlo: recibe los contadores del proxy y devuelve la cadena + un aviso.

// Escalón de precio (menor = más barato). Un modelo sin escalón cuenta como CARO (nunca se elige de gusto).
export const TIERS = { 'gemma4-paid': 1, cheap: 2, 'claude-sonnet': 3 }   // sin gemma4-free: el chat es todo pago (decisión 2026-07-09);
export const MAX_TIER = TIERS.cheap;      // techo del rollback
const MIN_TRIES = 5;                      // menos intentos que esto = sin datos → se asume sano
const MIN_OK_RATE = 0.5;

export function tierOf(model, tiers = TIERS) { return model in tiers ? tiers[model] : 99; }

// attempts: { 'model="x",result="ok"': n } (el ATTEMPT del proxy). Devuelve { tries, okRate, healthy }.
export function healthOf(model, attempts) {
  let ok = 0, bad = 0;
  for (const k in attempts) {
    if (!k.startsWith(`model="${model}",`)) continue;
    if (k.includes('result="ok"')) ok += attempts[k]; else bad += attempts[k];
  }
  const tries = ok + bad, okRate = tries ? ok / tries : 1;
  return { tries, okRate, healthy: tries < MIN_TRIES || okRate >= MIN_OK_RATE };
}

// candidates: modelos a considerar. Devuelve { chain, warn }. prices (MODEL_PRICES) desempata dentro de un escalón.
export function pickFallbackChain({ candidates, attempts = {}, tiers = TIERS, prices = {}, max = 2 }) {
  const price = m => (prices[m] ? (+prices[m].in || 0) + (+prices[m].out || 0) : 0);
  const rows = [...new Set(candidates)].map(m => ({ m, tier: tierOf(m, tiers), ...healthOf(m, attempts) }))
    .sort((a, b) => a.tier - b.tier || price(a.m) - price(b.m));
  const healthy = rows.filter(r => r.healthy);
  const cheapOk = healthy.filter(r => r.tier <= MAX_TIER);
  if (cheapOk.length) return { chain: cheapOk.slice(0, max).map(r => r.m), warn: null };
  if (healthy.length) return { chain: healthy.slice(0, 1).map(r => r.m),
    warn: `NADA barato sano (techo "cheap"): cae a ${healthy[0].m}, MÁS CARO — revisar ya` };
  return { chain: rows.filter(r => r.tier <= MAX_TIER).slice(0, max).map(r => r.m),
    warn: 'NINGÚN modelo sano: se deja lo más barato igual — revisar ya' };
}
