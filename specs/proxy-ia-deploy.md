# SDD — Deploy del proxy de IA (Helm chart) y cómo se usa

Estado: **vigente**. Cubre cómo se buildea, deploya y expone el proxy de IA del juego
(`ai-proxy/`) en el cluster k8s casero, para que los jugadores en GitHub Pages tengan IA
usando el pool/GPU del dev sin poner su propia key. Complementa `ia-routing-infra.md` (el
diseño del routing) — acá va lo operativo del chart.

## 1. Arquitectura del deploy

```
Jugador (GitHub Pages, https)
   │  fetch POST /chat   (CORS: Access-Control-Allow-Origin *)
   ▼
https://llm-tormenta-solar.cybercirujas.club          (DNS A → IP pública WAN)
   │  router :443 → HAProxy (Mac mini, SNI passthrough)
   ▼
cluster-gateway VIP 192.168.178.200:443               (Cilium Gateway API; TLS termina acá)
   │  listener HTTPS por hostname  +  HTTPRoute (host → Service)
   ▼
Service tormenta-ai-proxy (ns ai) :80 → pod :8788     (Node, ai-proxy/server.js)
   │  upstream
   ▼
LiteLLM  http://litellm-proxy.ai:4000/v1  (pool de keys / fallback / GPU)
```

Decisiones clave:
- **Mismo gateway, misma VIP** que el resto (cruzdelsur, etc.): `cluster-gateway`
  (192.168.178.200). No se crea un Gateway dedicado (`gateway.create=false`). Cada hostname
  nuevo solo **agrega un listener HTTPS** al gateway compartido (hook Job idempotente).
- **TLS Let's Encrypt por DNS-01 / acme-dns** (no expone `:80`). Issuers `letsencrypt-prod` /
  `letsencrypt-staging` y secret `acme-dns-account` **ya existen** en el cluster (los creó
  `online-game`) → se **reusan** (`letsencrypt.enabled=false`).
- **Upstream = LiteLLM**, no OpenRouter directo: LiteLLM ya hace el pool de keys, fallback y
  ruteo a GPU/NPU. El proxy solo agrega CORS, personas y el guardrail de timeout.

## 2. Dominios

| Dominio | Para qué | Quién lo sirve |
|---|---|---|
| `llm-tormenta-solar.cybercirujas.club` | **el proxy de IA** (este chart) | Service `tormenta-ai-proxy` |
| `tormenta-solar.cybercirujas.club` | **el juego** (estático) — SDD aparte | GitHub Pages / a definir |

## 3. Build de la imagen (Kaniko + Argo Workflows)

`ai-proxy/kaniko-build.yaml` — Workflow en ns `kaniko`, nodo arm64 `srv-rk1-nvme-01`, clona el
repo público y buildea `ai-proxy/Dockerfile`. Mismo patrón que `online-game-kaniko.yaml`.

```sh
kubectl create -f ai-proxy/kaniko-build.yaml
kubectl wait workflow -l app=tormenta-ai-proxy-build -n kaniko \
  --for=jsonpath='{.status.phase}'=Succeeded --timeout=900s
# imagen: registry.registry:5000/ai/tormenta-ai-proxy:0.1.0
```
Bumpear el tag (`:0.1.1`, …) al cambiar `server.js`/`personas.js`; editar el `--destination`
del Workflow y el `image.tag` del deploy.

## 4. Prerequisitos manuales (una vez, fuera del chart)

Un secret con credenciales y registros DNS no van al repo en claro → se hacen a mano:

### 4.1 acme-dns (un registro por dominio)
```sh
curl -s -X POST https://auth.acme-dns.io/register   # corré 1 vez por dominio; guardá el JSON
# → {"username","password","fulldomain":"<sub>.auth.acme-dns.io","subdomain":"<sub>", ...}
```
Armá `acme-dns-account.json` keyado por hostname (podés sumar al que ya tenés de cruzdelsur):
```json
{
  "llm-tormenta-solar.cybercirujas.club": { "username":"…","password":"…","fulldomain":"<sub1>.auth.acme-dns.io","subdomain":"<sub1>","allowfrom":[] },
  "tormenta-solar.cybercirujas.club":     { "username":"…","password":"…","fulldomain":"<sub2>.auth.acme-dns.io","subdomain":"<sub2>","allowfrom":[] }
}
```
Actualizá el **mismo** secret (no hace falta uno nuevo; acme-dns-account sirve para N dominios):
```sh
kubectl create secret generic acme-dns-account -n cert-manager \
  --from-file=credentials.json=acme-dns-account.json \
  --dry-run=client -o yaml | kubectl apply --server-side -f -
```

### 4.2 DNS en Namecheap (Advanced DNS, Host = sin el dominio)
| Type | Host | Value |
|---|---|---|
| A | `llm-tormenta-solar` | IP pública WAN (la misma de cruzdelsur) |
| A | `tormenta-solar` | misma IP pública |
| CNAME | `_acme-challenge.llm-tormenta-solar` | `<sub1>.auth.acme-dns.io.` |
| CNAME | `_acme-challenge.tormenta-solar` | `<sub2>.auth.acme-dns.io.` |

Verificá la delegación antes de emitir: `dig _acme-challenge.llm-tormenta-solar.cybercirujas.club CNAME +short`.

### 4.3 HAProxy (SNI passthrough en la Mac mini)
Sumar la regla del hostname nuevo al backend que ya apunta a la VIP del gateway:
`llm-tormenta-solar.cybercirujas.club → 192.168.178.200:443` (mismo backend que cruzdelsur).

### 4.4 Secret de la key del upstream (LiteLLM master key)
```sh
kubectl -n ai create secret generic tormenta-ai-key --from-literal=apiKey=sk-…
```

## 4.5 Gotchas reales del deploy (vistos al levantarlo)

- **Pull del registry interno**: `registry.registry:5000` solo lo resuelve containerd en los
  nodos `rk1` (no en `super6c`). El pod arranca con `nodeSelector kubernetes.io/hostname=srv-rk1-nvme-01`
  (donde corre hermes y se buildeó la imagen). Alternativa portable: buildear también en GitHub
  Actions → ghcr.io (cualquier nodo pullea), como online-game; el registry local es solo más rápido.
- **runAsNonRoot**: el Dockerfile usa `USER node` (no numérico) → k8s no puede verificar no-root.
  El chart setea `securityContext.runAsUser/Group: 1000` (UID del user `node` en node:20-alpine).
- **HAProxy (Mac mini)**: el `cybercirujas_backend` es UN server con `maxconn 5` + `timeout queue 5s`
  compartido por TODOS los hosts cybercirujas. Las requests largas del chat (LLM, 5-30s) se encolan
  y mueren a los 5s. Fix: subir `maxconn` (~100) y `timeout queue` (~120s) en ese backend. El
  `timeout server/client` (50s) ya estaba bien; el asesino era la cola.
- **Modelo**: `default` (nemotron) es de *reasoning* y FILTRA el pensamiento en la respuesta → usar
  `gemma4-free` (gemma-4-31b:free, igual familia que la UI), que sale limpio y en personaje.

## 5. Deploy del chart

```sh
helm upgrade --install tormenta-ai ai-proxy/chart -n ai \
  --set fullnameOverride=tormenta-ai-proxy \
  --set image.repository=registry.registry:5000/ai/tormenta-ai-proxy --set image.tag=0.1.0 \
  --set auth.existingSecret=tormenta-ai-key --set auth.existingSecretKey=apiKey \
  --set upstream.model=default \
  --set gateway.enabled=true --set gateway.tls.enabled=true --set gateway.ensureListener.enabled=true \
  --set gateway.host=llm-tormenta-solar.cybercirujas.club
```
- `gateway.tls.issuer`: arrancá con `letsencrypt-staging` para no quemar rate-limit; cuando el
  cert valida, flip a `letsencrypt-prod` (`--set gateway.tls.issuer=letsencrypt-prod` +
  `kubectl delete secret tormenta-ai-tls -n gateway` para re-emitir).
- El hook Job agrega el listener HTTPS al `cluster-gateway` (idempotente, no-op si ya está).
- Verificar: `kubectl get certificate tormenta-ai-tls -n gateway` → `READY=True`.

## 6. El modelo (la cadena free)

El código del juego (`js/ai.js`) usa, con la key del usuario en el browser, una cadena free de
OpenRouter (`google/gemma-4-26b-a4b-it:free` + fallbacks). Para los jugadores sin key, el proxy
manda al LiteLLM con `upstream.model`:
- **`default`** (recomendado para arrancar): cadena free robusta del LiteLLM (nemotron → … →
  paid-final). Anda bien y no falla. **No requiere tocar LiteLLM.**
- **`tormenta-free`** (opcional, "misma cadena que el código"): agregar un `model_name` dedicado
  al LiteLLM (gemma-4:free → gpt-oss:free → llama70b:free) — **aditivo, vía el rol de Ansible de
  `infra-ai`**, NO hot-patch del configmap compartido (sirve a Hermes/OpenClaw/Holmes).
- GPU local (`local-gpu`) / NPU (`rk1-npu-local`): se evalúan en un SDD aparte de pruebas.

## 7. Conectar el juego

Cuando el cert esté `READY` y HAProxy enrute, en `js/ai.js`:
```js
const PROXY = 'https://llm-tormenta-solar.cybercirujas.club';
```
Bump de cache (`?v=N`) en `index.html`. El proxy ya manda `Access-Control-Allow-Origin: *`, así
que GitHub Pages lo llama sin problema. La key del usuario (BYOK) sigue funcionando como override.

## 8. Pendiente / próximos SDD

- SDD del **hosting del juego** en `tormenta-solar.cybercirujas.club`.
- SDD de **pruebas de modelos** (Ollama GPU vs NPU RK1 vs pool OpenRouter) para elegir el de
  mejor relación calidad/latencia/costo para el linyera.
