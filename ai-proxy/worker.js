// worker.js — el mismo proxy de chat, como Cloudflare Worker (gratis, ideal para GitHub Pages).
// La key va como SECRET (wrangler secret put OPENROUTER_API_KEY). La URL que te queda va en js/ai.js.
import { buildMessages } from './personas.js';

const MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
  'deepseek/deepseek-chat-v3-0324:free',
];

async function ask(key, messages, model0) {
  for (const model of (model0 ? [model0] : MODELS)) {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, temperature: 0.9, max_tokens: 220 }),
    });
    if (r.status === 429 || r.status === 404) continue;
    if (!r.ok) break;
    const d = await r.json();
    const reply = d.choices?.[0]?.message?.content;
    if (reply) return reply.trim();
  }
  return null;
}

export default {
  async fetch(req, env) {
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') return new Response('POST', { status: 405, headers: cors });
    let npc, message, history;
    try { ({ npc, message, history } = await req.json()); } catch (e) {}
    if (!message) return Response.json({ reply: '“¿Eh? No te escuché, pibe.”' }, { headers: cors });
    const reply = await ask(env.OPENROUTER_API_KEY, buildMessages(npc, message, history), env.OPENROUTER_MODEL);
    return Response.json({ reply: reply || '“Se me fue la idea... el sol me quema el bocho. Repetime.” 🌞' }, { headers: cors });
  },
};
