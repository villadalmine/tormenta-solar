// worker.js — la MISMA presencia pero como Cloudflare Worker (gratis, sin servidor propio).
// Ideal si publicás el juego en GitHub Pages: el Worker hace de backend.
// Usa un KV namespace (binding PRESENCE): cada latido escribe una key con TTL y contamos las vivas.
//
// Deploy con wrangler (ver README de esta carpeta). La URL que te queda
// (https://....workers.dev) va en js/presence.js -> ENDPOINT.
export default {
  async fetch(req, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    let id = null;
    try { id = (await req.json()).id; } catch (e) { /* consulta sin latido */ }
    // expirationTtl mínimo de KV es 60s: el jugador cuenta como online ~1 min tras su último latido.
    if (id) await env.PRESENCE.put('p:' + String(id).slice(0, 64), '1', { expirationTtl: 60 });

    const list = await env.PRESENCE.list({ prefix: 'p:' });
    return new Response(JSON.stringify({ count: list.keys.length }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  },
};
