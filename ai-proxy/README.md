# 🤖 ai-proxy — chat con IA (modo B)

Proxy mínimo para que en el juego puedas **chatear con un NPC** (un linyera filósofo, etc.) usando
un modelo `:free` de OpenRouter. **Opcional y aditivo**: sin proxy, el chat responde con líneas
predefinidas (`js/ai.js` cae a "canned") y el juego anda igual.

La **API key vive sólo acá** (nunca en el cliente). Las **personas** (system prompts) también, así no
se pueden inyectar desde afuera. Ver `personas.js`.

## Opción A — Tu infra (Node, sin dependencias)
```bash
cd ai-proxy
OPENROUTER_API_KEY=sk-or-... node server.js     # escucha en :8788
```
Ponelo detrás de tu HTTPS (nginx/caddy) y agarrá la URL pública.

## Opción B — Cloudflare Worker (gratis, ideal para GitHub Pages)
```bash
npm i -g wrangler
cd ai-proxy
wrangler secret put OPENROUTER_API_KEY      # pegás tu key (no se commitea)
wrangler deploy
```
Te queda `https://tormenta-ai.TUUSUARIO.workers.dev`.

## Conectar el cliente
En `../js/ai.js` poné tu URL:
```js
const ENDPOINT = 'https://tormenta-ai.TUUSUARIO.workers.dev';
```
Subí el cache (`?v=N`), pusheá, y el NPC chateable contesta con IA. Si dejás `ENDPOINT=''`, usa las
líneas predefinidas.

## Protocolo
`POST` con `{ npc, message, history }` → `{ reply }`. `npc` elige la persona (`filosofo`, `cuevero`,
`iorio`…). `history` es `[{role:'user'|'assistant', content}]` (se recorta a los últimos 8). El server
tiene **rate-limit** por IP (12/min) y topes de longitud.

## Probar
```bash
curl -s -XPOST localhost:8788 -H 'Content-Type: application/json' \
  -d '{"npc":"filosofo","message":"¿qué opinás del dólar?"}'
```
