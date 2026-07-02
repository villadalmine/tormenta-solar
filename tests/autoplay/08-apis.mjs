// 08-apis — los ENDPOINTS del ecosistema contestan con la forma esperada (sin navegador, puro fetch).
import { suite, PROXY } from './lib.mjs';
const s = suite('08-apis');
async function get(path, checkFn, name) {
  try { const r = await fetch(PROXY + path, { signal: AbortSignal.timeout(10000) }); const j = await r.json().catch(() => null);
    s.check(name || path, r.status === 200 && checkFn(j), 'status=' + r.status);
  } catch (e) { s.check(name || path, false, e.message); }
}
try { const r = await fetch(PROXY + '/health'); s.check('/health = ok', (await r.text()).includes('ok')); } catch (e) { s.check('/health = ok', false, e.message); }
await get('/salon/live', j => j && typeof j.count === 'number' && Array.isArray(j.ticker), '/salon/live {count,ticker}');
await get('/propaganda', j => j && Array.isArray(j.carteles), '/propaganda banco');
await get('/noticias', j => j && Array.isArray(j.noticias), '/noticias banco');
await get('/ranking', j => j && Array.isArray(j.chain), '/ranking cadena de modelos');
await get('/carteles?floor=carteles-1', j => j && Array.isArray(j.signs), '/carteles tablón');
await get('/datacenter', j => j && j.parts, '/datacenter estado global');
await get('/barrio-mem?nick=qa%C2%B7probe', j => j && Array.isArray(j.mem), '/barrio-mem memoria x nick');
try { const r = await fetch(PROXY + '/metrics'); const t = await r.text();
  s.check('/metrics con players_online + chat_total', t.includes('tormenta_players_online') && t.includes('tormenta_ai_chat_total'));
} catch (e) { s.check('/metrics', false, e.message); }
s.finish();
