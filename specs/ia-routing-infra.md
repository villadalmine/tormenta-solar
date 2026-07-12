# SPEC: Infra de IA — routing self-hosted (vLLM / LiteLLM / AI Gateway / k8s)

- **Estado:** **Draft** (infra pura — **NO influye en la lógica del juego**)
- **Nivel:** transversal / backend
- **Última actualización:** 2026-06-24

## 1. Contexto y objetivo

El juego corre en la máquina del dueño, que tiene **GPU/CPU/RAM**. La idea: **rutear** los pedidos de IA
(chat de NPCs, entidades `agent:llm`, oráculo) según **quién los hace** (pagó suscripción / BYOK / gratis) y
según **la carga y el uso**, abaratando costo y usando la **GPU propia** cuando conviene. En concreto:

- Por defecto, los pedidos pagos van a modelos **externos baratos** (los `:free`/cheap que ya se rotan).
- Si un usuario **abusa** del chat y se come el **plan global** del dev → ese usuario **pasa a la GPU propia**
  (vLLM) en vez de seguir quemando el plan externo.
- Si la **carga global es baja** → usar **siempre la GPU** (gratis para el dev, mejor latencia/privacidad).
- Todo **medido** (tokens, latencia, costo por usuario/feature) para **tomar decisiones**.

> **Acoplamiento con el juego = mínimo y explícito (§5):** el juego habla con **UN** endpoint
> OpenAI-compatible (el gateway) y **expone buenas métricas**. Toda la complejidad (vLLM, routing, k8s,
> budgets) vive **detrás** del gateway. El juego no sabe ni le importa qué modelo lo atendió.

## 2. Cómo se llama esto (la teoría / el stack)

- **LLM/AI Gateway:** una puerta única (OpenAI-compatible) que hace **routing, rate-limiting, budgets,
  auth y observabilidad**. Candidatos: **Envoy AI Gateway**, **LiteLLM Proxy**, Kong AI Gateway.
- **Self-hosted inference:** **vLLM** (servidor de inferencia en GPU, alto throughput, OpenAI-compatible).
- **Router multi-backend:** **LiteLLM** (normaliza N proveedores a la API de OpenAI; **virtual keys**,
  **budgets por usuario**, **rate limits**, **fallbacks**, **tags/routing**). Puede ser el gateway mismo.
- **Orquestación:** **Kubernetes** + **NVIDIA GPU Operator** (scheduling en GPU), **autoscaling**
  (**KEDA**/HPA por cola/latencia), escalado a cero cuando no se usa.
- **Observabilidad:** **OpenTelemetry** + **Prometheus/Grafana** (tokens, latencia p50/p95, costo, errores)
  por **usuario / feature / modelo**.
- **Patrón de decisión:** **policy-based routing** + **token budgeting** + **overflow/fallback routing**
  (cuando se excede un presupuesto o sube la carga, cambia el destino).

## 3. Diseño (capas)

### 3.0 Resumen en una tabla (quién juega → qué token → a dónde va)
| Jugador | ¿Quién paga? | Token que usa | A dónde va el pedido | Si se satura |
|---|---|---|---|---|
| **Free** (no paga) | el dev (vos) | **pool del dev** (varias keys + GPU, en el server) | gateway → keys free / tu GPU | respuestas canned (el juego sigue) |
| **Suscripción** (€1/mes) | el jugador → al dev | **pool del dev** (server) | gateway → modelo barato / tu GPU | canned, con prioridad |
| **BYOK** (su propia key) | el jugador → a OpenRouter | **su** key (la pega en la UI) | directo a OpenRouter | lo banca él ⚠️ (disclaimer free-tier) |

**Dónde viven los tokens:** el **pool del dev** y la **GPU** están en el **servidor/gateway, NUNCA en el
cliente** (la UI no los ve). El **único token en la UI** es el del propio jugador (**BYOK**, opcional).

```
Juego  ──(OpenAI-compatible, 1 endpoint, manda: tier + feature + identidad)──▶  AI GATEWAY
                                                                                  │  (auth, rate-limit,
                                                                                  │   budgets, routing,
                                                                                  │   métricas)
              ┌───────────────────────────────────────────────────────────────┘
              ▼                         ▼                          ▼
        externo :free/cheap       vLLM en GPU propia        canned/local (free tier)
        (default pago)            (abuso / carga baja)       (sin acceso)
```

### Política de routing (ejemplo, parametrizable)
| Situación | Destino |
|---|---|
| Free (no pagó, no BYOK) — **hoy** | **POOL del dev** (keys free-tier + GPU). Decisión actual "free = todo" (modelo-de-entidades §6.9). Si se satura/abusa → fallback canned. *(A futuro se puede gatear free→estático: es config.)* |
| Pago/suscripción, uso normal, plan global con margen | modelo **externo barato** (del pool) |
| Pago, usuario **abusa** (supera su budget del plan global) | **GPU propia (vLLM)** |
| Carga global **baja** (GPU ociosa) | **GPU propia** para todos los pagos (ahorra plan externo) |
| BYOK | la **key del jugador** (no toca ni plan ni GPU del dev) |

Los umbrales (qué es "abuso": tokens/día, req/min; qué es "carga baja": % GPU/cola) son **config del
gateway/LiteLLM**, no del juego.

### 3.5 Concurrencia / paralelización (el miedo a la latencia con muchos jugando)
**Regla de oro: la paralelización NO va en el cliente con varios tokens — va SERVER-SIDE en el gateway.**
El juego sigue mandando a UN solo endpoint; el gateway resuelve la concurrencia con tres mecanismos:

1. **Pool de KEYS + load-balancing (LiteLLM router):** el gateway tiene **varias API keys** (de OpenRouter
   u otros) como "deployments" del mismo modelo y reparte los requests (least-busy / round-robin). N keys ≈
   N× el rate-limit del free tier, repartido. Si una key da **429**, **fallback automático** a la siguiente.
   → Los **free** usan el **pool del dev** (no una sola key); el cliente NO ve ni tiene esas keys.
2. **GPU propia con CONTINUOUS BATCHING (vLLM):** vLLM está hecho para **muchos requests concurrentes en
   una GPU** (los batchea sobre la marcha). Es el mejor amortiguador de concurrencia: una GPU sola aguanta
   varias charlas a la vez. Entra al pool como un backend más.
3. **Overflow + timeouts → fallback:** si el pool externo está rate-limited, **reroutea a la GPU**; si todo
   está saturado, **timeout corto → el juego usa su `fallback` canned** (nunca cuelga). + **respuestas
   CORTAS** (el guardrail "amigo linyera" ya las acota) = menos tokens, más throughput, menos latencia.

**Dónde viven los tokens (importante):**
- El **pool del dev** (varias keys + GPU) vive **en el gateway/servidor**, NUNCA en el cliente. Por eso en
  la UI no se cargan: son secretos del backend. La "paralelización con varios tokens" es **config del
  gateway**, transparente para el juego.
- El **token de la UI** (hoy, uno solo) es **BYOK** = la key del PROPIO jugador (un jugador = una key, no
  necesita pool). Va directo a OpenRouter, lo paga él.
- ⚠️ **Disclaimer (a mostrar en la UI):** si ponés tu propia key y es **free tier**, corrés vos el riesgo de
  **rate-limit / latencia** (no hay pool que te cubra).
- **GPU "token" propio:** un jugador con GPU local (Ollama/vLLM propio) sería **otra fuente**, aparte —
  apunta a su `localhost`, no al pool del dev. (Encaja como "modo C local", futuro.)

**Multi-token EN LA UI (diferido, opcional):** dejar que un jugador cargue **varias** keys para auto-rotar
del lado cliente es un caso de nicho (sirve poco: un jugador no genera tanta concurrencia). Si se hace,
sería **más adelante**, y la rotación/paralelización "de verdad" igual conviene server-side. El seam de
`AI` ya soporta una key; agregar un array es menor cuando se decida.

## 4. Kubernetes — estado REAL + chart del proxy

> **Ya existe un LiteLLM corriendo** en el cluster del dueño (`infra-ai`): ns **`ai`**, service
> **`litellm-proxy:4000`** (OpenAI-compatible), master key `sk-…`. Hace **pool de keys**
> (varias `OPENROUTER_API_KEY` por tenant), **GPU** (`ollama` en `ai`, modelo `local-gpu`), **pool de NPUs**
> (`rk1-npu-local`, round-robin) y **fallback chains** entre modelos free/pago. → El gateway de §2/§3 **es
> este LiteLLM**; no hay que montar uno nuevo.

**El proxy del juego = un shim chico** (oculta la key, pone la persona del NPC, traduce el formato) que
**routea a ese LiteLLM**. Se despliega con un **Helm chart** (`ai-proxy/chart/`, ver su README):
- `ai-proxy/server.js` ahora tiene upstream **configurable** (`AI_BASE_URL` + `AI_API_KEY` + `AI_MODEL`):
  por defecto el chart apunta a `litellm-proxy.ai.svc:4000/v1` con modelo `default` (o `local-gpu` para GPU,
  `rk1-npu-local` para las NPUs).
- Dockerfile + chart (Deployment/Service/Ingress/HPA/Secret) **probados con `helm lint`/`template`**.
- El juego (GitHub Pages) sólo pone la URL del Ingress en `js/ai.js → PROXY`.

*(Detalle de manifests del LiteLLM = repo `infra-ai` `roles/install-litellm-proxy`. Lo de abajo queda como
referencia genérica de un gateway desde cero, por si se monta aparte.)*

## 4b. Kubernetes (referencia genérica, si se monta un gateway desde cero)

- **vLLM Deployment** en nodo con GPU (`nodeSelector`/`tolerations`, GPU Operator); modelo que **entre en
  la VRAM** disponible (elegir tamaño/quantización según la GPU del dueño).
- **LiteLLM/Gateway Deployment** (stateless) + config de virtual keys, budgets, fallbacks, tags.
- **Autoscaling**: KEDA por profundidad de cola/latencia; **scale-to-zero** de vLLM cuando no hay tráfico
  (para no tener la GPU ocupada al pedo).
- **Ingress/TLS**, secrets (keys externas), NetworkPolicy.
- **Observabilidad**: ServiceMonitor (Prometheus) + dashboards Grafana; alertas por budget/latencia.
- *(Detalle de manifests/Helm = TODO de este SDD cuando se implemente.)*

## 5. Lo ÚNICO que el juego debe dar (el contrato con la infra)

1. **Hablar con un solo endpoint** OpenAI-compatible (configurable, hoy es el `ai-proxy/`; mañana el
   gateway). Ya existe el seam: `AI.chat()` → proxy/BYOK/local. Sólo cambia la URL.
2. En cada request, mandar **metadata de routing**: `tier` (sub/byok/free), `feature`/`entityId`, y
   opcional el `model` testeado (del atributo `ai` de la entidad, ver
   [modelo-de-entidades §6.9](modelo-de-entidades.md)).
3. **Exponer buenas métricas del lado cliente** (latencia percibida, qué feature, si cayó a `fallback`,
   errores) — reusando el **event log / trazabilidad** ([modelo-de-entidades §6½B](modelo-de-entidades.md))
   y el patrón de métricas de [`ads`](publicidad.md)/`presence`. Con eso el dueño **juega y toma decisiones**
   (qué feature conviene full-AI, qué modelo, dónde rerutear).

> Es decir: **el juego no implementa nada de routing**. Implementa (a) un endpoint configurable y (b)
> métricas. El resto es este SDD de infra, que se puede construir/cambiar sin tocar el juego.

## 6. Requisitos funcionales

- **RF-1:** El juego pega a **un endpoint OpenAI-compatible configurable**; cambiar de `ai-proxy` a gateway
  es sólo config (sin cambios de lógica).
- **RF-2:** El request lleva `tier` + `feature/entityId` (+ `model` opcional) para que el gateway rutee.
- **RF-3:** El gateway hace **routing por política** (externo barato / GPU propia / rechazo free),
  **budgets por usuario** y **fallback/overflow**; los umbrales son **config**, no código del juego.
- **RF-4:** **Métricas** por usuario/feature/modelo (tokens, latencia, costo, errores) en Prometheus/Grafana,
  y el **cliente** expone latencia percibida + uso de fallback.
- **RF-5:** **Free** usa el **pool del dev** (keys free-tier + GPU) — decisión "free=todo" actual; cae a
  `fallback` solo si se satura. **BYOK** usa la key del jugador (no toca el pool del dev). *(Gatear free→
  estático en el futuro = config, no código.)*
- **RF-6 (no-coupling):** Nada de esto cambia la **lógica del juego**; e2e/web-smoke no se enteran.
- **RF-7 (concurrencia, §3.5):** la paralelización es **server-side**: **pool de keys** con load-balancing +
  fallback en 429, **GPU con continuous batching** (vLLM), y **overflow + timeout→fallback**. El cliente
  manda a **un** endpoint y NO tiene las keys del pool. La UI sigue con **una** key (BYOK); multi-token en la
  UI es **diferido/opcional** (la paralelización real va en el gateway).

## 7. Preguntas abiertas

1. **¿Gateway = LiteLLM solo, o Envoy AI Gateway + LiteLLM como router?** (LiteLLM solo es más simple para
   empezar; Envoy AI Gw suma políticas/observabilidad enterprise.)
2. **Modelo en la GPU:** ¿cuál entra en la VRAM del dueño y da latencia aceptable? (define quantización.)
3. **Definición de "abuso"** y de "carga baja": métricas y umbrales concretos.
4. **Privacidad:** ¿se loguean prompts? (recomendado: NO; sólo conteos agregados, como `presence`/`ads`.)
5. **¿Local-player option?** Si el JUGADOR tiene GPU, ¿se le ofrece correr su propio modelo (Ollama/vLLM
   local = gratis/privado)? Ya estaba anotado como "modo C" en [ia-openrouter.md](ia-openrouter.md).
6. **¿Cuántas keys en el pool y de qué proveedores?** (varias free de OpenRouter + GPU; definir el mínimo
   para la concurrencia esperada.)
7. **¿Cuándo gatear el free?** Hoy "free=todo" via el pool; si el costo/latencia aprieta, definir el umbral
   para degradar free→canned (es config del gateway + el `tier` por entidad de §6.9).
8. **Multi-token en la UI:** ¿se implementa alguna vez (rotación client-side para BYOK) o queda siempre
   server-side? + disclaimer de free-tier BYOK (§3.5).

---

> Relacionados: [ia-openrouter.md](ia-openrouter.md) (la cadena proxy/BYOK/local y `ai-proxy/`),
> [modelo-de-entidades.md §6.9](modelo-de-entidades.md) (tiers freemium + atributo `ai` por entidad),
> [publicidad.md §5](publicidad.md) y `presence-server/` (el patrón de métricas que se reusa).
