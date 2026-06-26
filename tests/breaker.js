// tests/breaker.js — circuit breaker del CHAT (js/ai.js) + señal de salud COMPARTIDA con nivelai (window.__aiHealth).
// Verifica: un timeout del proxy ABRE el circuito; con el circuito abierto el chat NO llama al proxy (falla rápido
// al pool local); cuando el proxy vuelve, se CIERRA. Uso: node tests/breaker.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'js', 'ai.js'), 'utf8');

// ---- sandbox mínimo: ai.js es un IIFE; le damos window/fetch/localStorage/etc. ----
let fetchImpl = () => Promise.reject(new Error('init')), fetchCalls = 0;   // load-time de ai.js (linyera-pool) lo swallowea
const store = {};
const sandbox = {
  console, Math, JSON, Date, setTimeout, clearTimeout, AbortController,
  crypto: { randomUUID: () => 's-test' },
  fetch: (...a) => { fetchCalls++; return fetchImpl(...a); },
  localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
};
sandbox.window = sandbox;            // ai.js comparte salud vía window.__aiHealth
vm.createContext(sandbox);
const AI = vm.runInContext(src + '\nAI;', sandbox);

const out = [];
const ok = (c, m) => { if (!c) out.push('FAIL ' + m); };
const okResp = () => ({ ok: true, status: 200, json: async () => ({ reply: 'una respuesta de IA real' }), text: async () => '' });
const abort = () => { const e = new Error('aborted'); e.name = 'AbortError'; return Promise.reject(e); };

(async () => {
  // 1) timeout del proxy → ABRE el circuito + escribe la señal compartida
  fetchImpl = abort; fetchCalls = 0;
  let r = await AI.chat('filosofo', 'hola');
  ok(typeof r === 'string' && r.length > 0, 'tras timeout el chat igual responde (pool local)');
  ok(AI.proxyDown() === true, 'un timeout ABRE el circuito (proxyDown)');
  ok(sandbox.__aiHealth && sandbox.__aiHealth.downUntil > Date.now(), 'la señal compartida window.__aiHealth quedó marcada caída');

  // 2) circuito ABIERTO → el chat NO llama al proxy (falla rápido)
  fetchImpl = okResp; fetchCalls = 0;   // aunque el proxy "vuelva", no se intenta mientras esté abierto
  r = await AI.chat('filosofo', 'de nuevo');
  ok(fetchCalls === 0, 'con el circuito abierto el chat NO llama al proxy (0 fetch)');
  ok(typeof r === 'string' && r.length > 0, 'igual responde en personaje');

  // 3) un componente comparte la señal: nivelai-style aiDown leería lo mismo
  ok(sandbox.__aiHealth.downUntil > Date.now(), 'la señal sigue compartida (nivelai vería la IA caída)');

  // 4) recuperación: cerramos el cooldown y el proxy responde → CIERRA y usa la IA real
  sandbox.__aiHealth.downUntil = 0;
  fetchImpl = okResp; fetchCalls = 0;
  r = await AI.chat('filosofo', 'volviste?');
  ok(fetchCalls === 1, 'con el circuito cerrado el chat SÍ llama al proxy');
  ok(r === 'una respuesta de IA real', 'usa la respuesta real del proxy');
  ok(AI.proxyDown() === false, 'una respuesta OK mantiene el circuito cerrado');

  if (out.length) { console.error('❌ breaker:\n' + out.join('\n')); process.exit(1); }
  console.log('✅ breaker: circuit breaker del chat + señal compartida OK (4 escenarios)');
})();
