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
| Free (no pagó, no BYOK) | sin inferencia: el **juego** usa su `fallback` (no llega al gateway, o el gateway responde 402) |
| Pago/suscripción, uso normal, plan global con margen | modelo **externo barato** |
| Pago, usuario **abusa** (supera su budget del plan global) | **GPU propia (vLLM)** |
| Carga global **baja** (GPU ociosa) | **GPU propia** para todos los pagos (ahorra plan externo) |
| BYOK | la **key del jugador** (no toca ni plan ni GPU del dev) |

Los umbrales (qué es "abuso": tokens/día, req/min; qué es "carga baja": % GPU/cola) son **config del
gateway/LiteLLM**, no del juego.

## 4. Kubernetes (lo que define este SDD; pendiente de detallar)

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
- **RF-5:** **Free** nunca llega a gastar inferencia (usa fallback del juego); **BYOK** no toca recursos del dev.
- **RF-6 (no-coupling):** Nada de esto cambia la **lógica del juego**; e2e/web-smoke no se enteran.

## 7. Preguntas abiertas

1. **¿Gateway = LiteLLM solo, o Envoy AI Gateway + LiteLLM como router?** (LiteLLM solo es más simple para
   empezar; Envoy AI Gw suma políticas/observabilidad enterprise.)
2. **Modelo en la GPU:** ¿cuál entra en la VRAM del dueño y da latencia aceptable? (define quantización.)
3. **Definición de "abuso"** y de "carga baja": métricas y umbrales concretos.
4. **Privacidad:** ¿se loguean prompts? (recomendado: NO; sólo conteos agregados, como `presence`/`ads`.)
5. **¿Local-player option?** Si el JUGADOR tiene GPU, ¿se le ofrece correr su propio modelo (Ollama/vLLM
   local = gratis/privado)? Ya estaba anotado como "modo C" en [ia-openrouter.md](ia-openrouter.md).

---

> Relacionados: [ia-openrouter.md](ia-openrouter.md) (la cadena proxy/BYOK/local y `ai-proxy/`),
> [modelo-de-entidades.md §6.9](modelo-de-entidades.md) (tiers freemium + atributo `ai` por entidad),
> [publicidad.md §5](publicidad.md) y `presence-server/` (el patrón de métricas que se reusa).
