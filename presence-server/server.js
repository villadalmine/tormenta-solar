// server.js — endpoint de presencia mínimo para "jugando ahora".
// Node puro, SIN dependencias. Guarda en memoria quién latió en los últimos TTL ms.
//
//   node server.js            # escucha en :8787
//   PORT=3000 node server.js  # otro puerto
//
// Después poné esa URL pública en js/presence.js -> ENDPOINT.
// (Si lo ponés detrás de nginx/caddy con HTTPS, usá esa URL https.)
const http = require('http');

const TTL = 30000;            // un jugador cuenta como "online" 30s después de su último latido
const PORT = process.env.PORT || 8787;
const seen = new Map();       // id -> timestamp del último latido

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');

  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  let body = '';
  req.on('data', c => { body += c; if (body.length > 1024) req.destroy(); });
  req.on('end', () => {
    const now = Date.now();
    let id = null;
    try { id = JSON.parse(body || '{}').id; } catch (e) { /* GET o body vacío: solo consulta */ }
    if (id) seen.set(String(id).slice(0, 64), now);
    for (const [k, t] of seen) if (now - t > TTL) seen.delete(k);  // limpia los vencidos
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ count: seen.size }));
  });
});

server.listen(PORT, () => console.log('presence escuchando en :' + PORT));
