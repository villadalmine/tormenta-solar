# tormenta-web — Helm chart

Despliega el **proxy de chat IA** del juego en cualquier Kubernetes. El proxy guarda la API key
server-side, arma el prompt con la **persona** del NPC (linyera, cuevero, etc.) y **routea a un endpoint
OpenAI-compatible** — por defecto **tu LiteLLM** (que ya hace pool de keys / GPU / fallback), o OpenRouter
directo. El juego (en GitHub Pages) sólo apunta `js/ai.js → const PROXY` a la URL de este servicio.

## 1) Imagen
```bash
docker build -t ghcr.io/TU-USUARIO/tormenta-web:0.1.0 ai-proxy/
docker push  ghcr.io/TU-USUARIO/tormenta-web:0.1.0
```
(es Node puro sin dependencias; la imagen es mínima.)

## 2) Deploy (apuntando a tu LiteLLM)
Por defecto el chart apunta a `http://litellm-proxy.ai.svc.cluster.local:4000/v1` con el modelo `default`.
Sólo falta la **API key del upstream** (para LiteLLM = su **master key**, p.ej. `sk-…`):

```bash
helm upgrade --install tormenta-ai ai-proxy/chart -n ai \
  --set image.repository=ghcr.io/TU-USUARIO/tormenta-web \
  --set auth.apiKey=sk-…
```
Mejor aún, sin pasar la key por CLI: creá un Secret y referencialo:
```bash
kubectl -n ai create secret generic tormenta-ai-key --from-literal=apiKey=sk-…
helm upgrade --install tormenta-ai ai-proxy/chart -n ai \
  --set image.repository=ghcr.io/TU-USUARIO/tormenta-web \
  --set auth.existingSecret=tormenta-ai-key --set auth.existingSecretKey=apiKey
```

## 3) Modelo (qué LLM usa)
`--set upstream.model=<nombre que tu LiteLLM conoce>`:
- `default` / `free` / `gpt-oss-free` → modelos free vía OpenRouter (los que ya tenés en LiteLLM).
- **`local-gpu`** → tu **Ollama en GPU** (qwen2.5) — "usar mi GPU".
- **`rk1-npu-local`** → tu **pool de NPUs** (RK1, round-robin).

## 4) Exponerlo al juego
El juego está en GitHub Pages (afuera del cluster), así que el proxy necesita una **URL pública**:
```bash
helm ... --set ingress.enabled=true \
  --set ingress.className=traefik \
  --set 'ingress.hosts[0].host=tormenta-ai.tudominio.com' \
  --set 'ingress.hosts[0].paths[0].path=/' \
  --set 'ingress.hosts[0].paths[0].pathType=Prefix'
```
Después: `js/ai.js → const PROXY = 'https://tormenta-ai.tudominio.com'`.

## Notas
- OpenRouter directo (sin LiteLLM): `--set upstream.baseUrl=https://openrouter.ai/api/v1 --set upstream.model=openrouter/openai/gpt-oss-20b:free` + `auth.apiKey=<tu OPENROUTER_API_KEY>`.
- Rate-limit simple por IP (12/min) ya viene en el proxy. CORS abierto (`*`).
- Health: `GET /health`. Autoscaling: `--set autoscaling.enabled=true`.
- El **pool de keys / GPU / fallback / batching** lo resuelve **LiteLLM**, no este proxy (ver
  `specs/ia-routing-infra.md`). Este proxy sólo: oculta la key, pone la persona, y traduce el formato.
