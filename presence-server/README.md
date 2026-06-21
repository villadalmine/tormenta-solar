# 🟢 Presencia — “jugando ahora”

Backend mínimo para mostrar **cuánta gente está jugando online** en la pantalla de intro.

Es **opcional y aditivo**: el juego funciona 100% igual sin esto (si no hay endpoint, la
intro simplemente no muestra el cartelito). El cliente vive en `../js/presence.js`.

## Cómo funciona

Cada pestaña abierta manda un “latido” (`POST {id}`) cada ~12s. El backend recuerda quién
latió en los últimos ~30–60s y responde `{ "count": N }`. La intro muestra `🟢 N jugando ahora`.
No hay cuentas, ni login, ni datos personales: solo un id random por pestaña.

## Opción A — Tu infra (Node, sin dependencias)

```bash
cd presence-server
node server.js            # escucha en :8787  (PORT=3000 node server.js para otro puerto)
```

Ponelo detrás de tu reverse proxy con HTTPS (nginx/caddy) y agarrá la URL pública.
Para que quede prendido: `pm2 start server.js --name presence` o un `systemd` service.

## Opción B — Cloudflare Worker (gratis, ideal para GitHub Pages)

No necesitás servidor propio. Una vez:

```bash
npm i -g wrangler
wrangler login
cd presence-server
wrangler kv namespace create PRESENCE   # copiá el id que imprime
# pegá ese id en wrangler.toml (campo id)
wrangler deploy
```

Te queda una URL tipo `https://tormenta-presence.TUUSUARIO.workers.dev`.

## Conectar el cliente

Editá `../js/presence.js` y poné tu URL en `ENDPOINT`:

```js
const ENDPOINT = 'https://tormenta-presence.TUUSUARIO.workers.dev';
```

Subí el cache (`?v=N` en `index.html`), pusheá, y listo: la intro muestra el contador.
Si dejás `ENDPOINT = ''`, queda desactivado sin romper nada.

## Probar rápido

```bash
# con server.js corriendo:
curl -s -XPOST localhost:8787 -d '{"id":"a"}'   # {"count":1}
curl -s -XPOST localhost:8787 -d '{"id":"b"}'   # {"count":2}
```
