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

---

## Producción (k8s) — deploy y SECRETS  📌 (no olvidar)

Deploy SIEMPRE con el values de prod (sin `--reuse-values`, que dropea defaults):
```bash
helm upgrade tormenta-ai ai-proxy/chart -n ai -f ai-proxy/chart/values-prod.yaml \
  --set image.tag=<TAG> --set linyeraPool.genToken=<GEN_TOKEN>
```

**Secrets (ns `ai`) — qué es cada uno:**
| Secret / fuente | Env en el pod | Para qué |
|---|---|---|
| `tormenta-ai-key` (key `apiKey`) | `AI_API_KEY` | key del upstream (LiteLLM master `sk-…`) |
| `--set linyeraPool.genToken=…` | `GEN_TOKEN` | protege `POST /linyera-pool`, `/precios`, `/sub-codes`, `/provision` |
| **`tormenta-or-provisioning` (key `provisioningKey`)** | `OPENROUTER_PROVISIONING_KEY` | **Provisioning Key de OpenRouter** → crea keys-por-código (suscripción F3) |

**Crear/rotar la provisioning key** (OpenRouter → Settings → **Provisioning API Keys**):
```bash
kubectl create secret generic tormenta-or-provisioning -n ai \
  --from-literal=provisioningKey='sk-or-v1-...'      # rotar: kubectl delete secret ... && create de nuevo
```
> Es una key **poderosa** (crea keys y gasta crédito). Va SOLO como Secret, nunca commiteada. NO imprimir su valor.

## Suscripción / códigos (specs/suscripcion.md §9)

- **F1 entitlement (live):** un código válido en header `X-Sub-Code` → tier pago (salta free+cupo, cadena `SUB_MODELS`).
  Emitir: env `SUB_CODES` (coma-separado, por `--set extraEnv[N]…`) o `POST /sub-codes` `{code}` (GEN_TOKEN; runtime).
- **F2 gasto estimado (live):** `tormenta_ai_sub_usage_total{code}` (volumen) + `tormenta_ai_sub_cost_usd{code}` +
  `tormenta_ai_sub_tokens_total{code}` (tokens×precio) → Grafana "quién gastó cuánto".
- **F3 key-por-código (pseudo-manual, sin pago):** `POST /provision {email,limit}` (GEN_TOKEN) → crea una key de
  OpenRouter con budget, guarda `código→key` (JSON en PVC) y devuelve el código (lo mandás por mail a mano). El sub
  con key provisionada va **directo a OpenRouter con SU key** (gasto+tope reales por usuario). `GET /sub-spend`
  (GEN_TOKEN) lee el gasto por código desde OpenRouter. Requiere el Secret `tormenta-or-provisioning`.
