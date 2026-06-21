// server.js — proxy de CHAT con IA para "Tormenta Solar" (modo B). Node puro, sin dependencias.
// Guarda la API key de OpenRouter (NUNCA va al cliente), arma el prompt con la persona, llama a un
// modelo :free, y devuelve { reply }. Rate-limit simple por IP.
//
//   OPENROUTER_API_KEY=sk-or-... node server.js        (PORT=8788 por defecto)
//
// Después poné la URL pública en js/ai.js -> ENDPOINT.
import http from 'http';
import { buildMessages } from './personas.js';

const KEY = (process.env.OPENROUTER_API_KEY || '').trim();
const PORT = process.env.PORT || 8788;
const MODELS = process.env.OPENROUTER_MODEL ? [process.env.OPENROUTER_MODEL] : [
  'meta-llama/llama-3.3-70b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
  'deepseek/deepseek-chat-v3-0324:free',
];
if (!KEY) { console.error('Falta OPENROUTER_API_KEY'); process.exit(1); }

const RATE = new Map();                 // ip -> [timestamps] (máx 12 por minuto)
function allowed(ip) {
  const now = Date.now();
  const hits = (RATE.get(ip) || []).filter(t => now - t < 60000);
  if (hits.length >= 12) { RATE.set(ip, hits); return false; }
  hits.push(now); RATE.set(ip, hits); return true;
}

async function ask(messages) {
  for (const model of MODELS) {
    try {
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, temperature: 0.9, max_tokens: 220 }),
      });
      if (r.status === 429 || r.status === 404) continue;   // saturado / no existe → próximo modelo
      if (!r.ok) throw new Error('OpenRouter ' + r.status);
      const d = await r.json();
      const reply = d.choices?.[0]?.message?.content;
      if (reply) return reply.trim();
    } catch (e) { /* prueba el siguiente modelo */ }
  }
  throw new Error('todos los modelos free fallaron');
}

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  if (req.method !== 'POST') { res.writeHead(405); return res.end('POST'); }

  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '?').split(',')[0].trim();
  if (!allowed(ip)) { res.writeHead(429, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ reply: '“Pará, pará... dejame respirar un cacho y seguimos, ¿dale?” 😮‍💨' })); }

  let body = '';
  req.on('data', c => { body += c; if (body.length > 8000) req.destroy(); });
  req.on('end', async () => {
    let npc, message, history;
    try { ({ npc, message, history } = JSON.parse(body || '{}')); } catch (e) {}
    if (!message) { res.writeHead(400, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ reply: '“¿Eh? No te escuché, pibe.”' })); }
    try {
      const reply = await ask(buildMessages(npc, message, history));
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ reply }));
    } catch (e) {
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ reply: '“Se me fue la idea... el sol me quema el bocho. Repetime.” 🌞' }));
    }
  });
}).listen(PORT, () => console.log('ai-proxy escuchando en :' + PORT));
