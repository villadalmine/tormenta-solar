// 06-ia — el CHAT con IA responde: free ≤10s (IA real o fallback TEMÁTICO = WARN, es el diseño), premium tier:paid
// (solo si QA_SUB_CODE está seteado — nunca hardcodear códigos en el repo). Cuida la billetera: máx 3 requests.
import { suite, PROXY } from './lib.mjs';
const s = suite('06-ia');
async function chat(headers, body) {
  const t0 = Date.now();
  const r = await fetch(PROXY + '/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  return { ms: Date.now() - t0, status: r.status, json: await r.json().catch(() => null) };
}
try {
  const f = await chat({ 'X-Session-Id': 'qa-autoplay' }, { npc: 'filosofo', message: 'hola', history: [] });
  s.log('free: ' + f.ms + 'ms status ' + f.status);
  s.check('free responde 200 con {reply}', f.status === 200 && f.json && typeof f.json.reply === 'string');
  s.check('free respeta el tope ≤11s', f.ms <= 11000, f.ms + 'ms');
  if (f.json && f.json.fallback) s.warn('free cayó al fallback temático', 'saturación del pool (diseño OK, ver latencia-chat.md)');
  const code = process.env.QA_SUB_CODE;
  if (code) {
    const p = await chat({ 'X-Sub-Code': code }, { npc: 'peronista', message: 'hola', history: [] });
    s.check('premium responde tier:paid sin fallback', p.status === 200 && p.json && p.json.tier === 'paid' && !p.json.fallback, JSON.stringify(p.json).slice(0, 100));
  } else s.warn('premium salteado', 'sin QA_SUB_CODE en el entorno');
} catch (e) { s.check('suite corre sin excepción', false, e.message); }
s.finish();
