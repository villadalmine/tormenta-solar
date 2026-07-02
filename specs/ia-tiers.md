# SDD — Tiers de IA del chat: Free / Premium / BYOK (quién paga, qué key, a dónde va, cómo se trackea)

- **Estado:** **LIVE.** Documenta cómo funciona HOY el ruteo del chat con los NPC (ai-proxy). Fuente única para no
  reinventarlo. (El dueño pidió dejarlo claro por escrito — 2026-07-01.)
- **Relacionado:** `ai-proxy/server.js` (`ask()`, `isSub()`, `/provision`, `/sub-codes`), `specs/suscripcion.md`
  (flujo de suscripción), `specs/ia-routing-infra.md` (visión infra), memoria [[subcodes-persisten]].

## 0. Los TRES tiers (resumen)

| Tier | ¿Quién paga? | Qué key usa | A dónde pega | Se trackea | Cómo se activa |
|---|---|---|---|---|---|
| **Free / anónimo** (default, sin código) | el dueño | **key compartida** del dev (`AI_API_KEY`=hermes) | **LiteLLM** (`litellm-proxy.ai:4000`) → cadena **free → pago** | agregado (no por usuario) | nada: es el default |
| **Premium** (código `TS-PREMIUM-…`) | el dueño (lo regala) | **key PROPIA de OpenRouter por código** (provisionada) | **OpenRouter DIRECTO** | **por código** (gasto real US$/tokens) | pegar el código en ⚙ Opciones → suscripción |
| **BYOK** (bring-your-own-key) | el jugador | **su** key de OpenRouter | **OpenRouter DIRECTO** | por sesión (es su gasto) | pegar `sk-or-…` en ⚙ Opciones |

**Regla de oro:** lo que se quiere **trackear por usuario** (Premium) va **DIRECTO a OpenRouter con una key propia**
(así OpenRouter reporta el gasto de ESA key). El anónimo NO se trackea por usuario (no tiene key propia) → va por
LiteLLM con la key compartida.

## 1. Free / anónimo (default)

- **Sin código ni key** → el proxy usa `AI_BASE_URL` = **LiteLLM** con `AI_API_KEY` (hermes) y la cadena estática
  `AI_MODEL = gemma4-free, gemma4-paid, claude-sonnet`.
- **Orden: FREE primero, PAGO nuestro como red.** `ask()` prueba `gemma4-free`; si se satura/timeout, cae a
  `gemma4-paid` (barato, nuestra key) y, en última instancia, `claude-sonnet`. Objetivo: **que SIEMPRE conteste**.
- **AUTOPILOT debe estar OFF** (`AUTOPILOT=0`). Con `AUTOPILOT=1` la cadena dinámica metía **2+ modelos free adelante**
  y con `PER_MODEL_TIMEOUT=6s` / `UPSTREAM_TIMEOUT=10.5s` **nunca llegaba al pago** → el anónimo caía a la línea
  canned. Con OFF usa `AI_MODEL` (1 free + pago asegurado). **Este fue un bug real (2026-07-01).**
- **Tope de plata:** `PAID_DAILY_CAP` (respuestas pagas/día de TODOS los anónimos; default 600). Si se agota, el free
  que falle cae a la línea canned (el juego sigue).
- **Métricas:** agregadas — `tormenta_ai_chat_total{model,backend,outcome}`, `tormenta_ai_paid_calls_today`. No hay
  desglose por usuario (es anónimo, no hay con qué).

## 2. Premium (código `TS-PREMIUM-…`) — OpenRouter DIRECTO, trackable por usuario

**La idea:** el dueño **crea** códigos premium **con la MANAGER key** (`OPENROUTER_PROVISIONING_KEY`, la key admin de
OpenRouter que puede crear sub-keys). Cada código queda atado a una **key propia de OpenRouter con budget** → el que lo
usa va **DIRECTO a OpenRouter con esa key** → **OpenRouter trackea su gasto**. El dueño reparte esos códigos.

- **Crear un código premium** (con su propia key):
  ```
  POST /provision   (header X-Gen-Token: <GEN_TOKEN>)
  { "email": "para-quien@…", "code": "TS-PREMIUM-XXXX", "limit": 2 }
  ```
  - `code` opcional: si lo pasás, provisiona **ese** código (ej. `TS-PREMIUM-…`); si no, autogenera `TS-<hex>`.
  - `limit` = budget US$ de la key (default `SUB_LIMIT_USD`). `force:true` para recrear la key de un código existente.
  - Crea la key en OpenRouter (`POST /keys` con la manager key) y la guarda en `STORE` (`/data/subs.json`, PVC).
- **Uso:** el jugador pega el código en ⚙ Opciones. El cliente lo manda en el header `X-Sub-Code`. El proxy:
  `isSub(code)` → `rec = STORE[code]` → si tiene `orKey` → **ask() DIRECTO a OpenRouter (`OR_BASE`) con esa key** y la
  cadena `SUB_OR_MODELS` (slugs reales de OpenRouter). **NO pasa por LiteLLM.**
- **Vencimiento:** `expiresAt` = `SUB_TTL_DAYS` (30 días). Vencido → deja de ser pago (cae a free).
- **Métricas por código:** `tormenta_ai_sub_real_cost_usd{code}` (gasto real leído de OpenRouter cada 5 min),
  `tormenta_ai_sub_limit_usd{code}`, `tormenta_ai_sub_provisioned`, `tormenta_ai_sub_usage_total{code}`.
- **OJO — dos sub-tipos** (histórico): un código en el **env `SUB_CODES`** o agregado por `POST /sub-codes` **NO tiene
  key propia** → usa la **compartida (hermes/LiteLLM)** con `SUB_MODELS`. Es "premium" pero **no trackeable por usuario**
  y "usa hermes". Para tracking real, el código debe estar **provisionado** (en `STORE` con `orKey`). **Preferir siempre
  provisionar.** Los `POST /sub-codes` **persisten** en `/data/subcodes.json` desde infra-47 (antes se perdían en cada
  redeploy → rompía las suscripciones; ver [[subcodes-persisten]]).

## 3. BYOK (el jugador pone su propia key)

- El jugador pega `sk-or-…` (su key de OpenRouter) en ⚙ Opciones. **Vive SOLO en su navegador** (localStorage), nunca
  toca el server.
- El cliente (`js/ai.js`) va **DIRECTO a OpenRouter** con esa key (o el proxy la reenvía como `orKey`, `direct=true`).
  **Su gasto, su tope, su riesgo** (disclaimer de free-tier). No consume el plan del dueño.
- Trackeo: es de él (lo ve en su cuenta de OpenRouter).

## 4. Diagrama de decisión (en `ask()` / el `/chat`)

```
¿header X-Sub-Code válido?  ── sí ──▶ ¿STORE[code].orKey?
        │ no                              ├─ sí → OpenRouter DIRECTO con la key del código   (PREMIUM trackable)
        ▼                                 └─ no → LiteLLM (hermes) con SUB_MODELS            (premium sin tracking)
¿el cliente mandó su orKey (BYOK)? ── sí ─────────────────▶ OpenRouter DIRECTO con la key del jugador  (BYOK)
        │ no
        ▼
FREE/anónimo → LiteLLM (hermes) → AI_MODEL: gemma4-free → gemma4-paid → claude-sonnet   (free primero, pago red)
```

## 5. Runbook — "no anda el pago / premium"

1. `curl -s $PROXY/metrics | grep -E "sub_codes|sub_provisioned"` — cuántos códigos válidos/provisionados hay.
2. Si tu código no figura → re-provisionarlo (`POST /provision` con el mismo `code`) o re-agregarlo (`POST /sub-codes`).
   **Los redeploys ya NO borran los sub-codes** (persisten en PVC), pero un código nunca provisionado no tiene key
   propia (usa hermes).
3. Probar en vivo: `curl -X POST $PROXY/chat -H 'X-Sub-Code: <código>' -d '{"npc":"peronista","message":"hola"}'`
   → debe devolver `"tier":"paid"` (no `"fallback":true`).
4. Si el **anónimo** cae siempre a fallback → chequear `AUTOPILOT=0` y que `gemma4-paid` esté en `AI_MODEL`.

## 5.1 ✅ CERRADO (2026-07-02) — era SATURACIÓN TRANSITORIA, no un bug (no se tocó nada)

Re-diagnóstico con el sistema andando (regla del dueño: entender POR QUÉ, no tocar sin probar):
- **`gemma4-paid` vía LiteLLM responde OK** (test in-cluster: 200 en 2.7s) y el **camino ANÓNIMO completo anda 3/3
  con IA real** (free 429/timeout → cae a `gemma4-paid` → ok en 5.9-9.6s, DENTRO del tope duro ≤10s de
  `latencia-chat.md`). Es el comportamiento DISEÑADO.
- El "colgado" del 2026-07-01 fue el modo de falla **conocido y documentado** (`latencia-chat.md §1`): LiteLLM/
  upstream **saturado en hora pico** (se midió 20-50s por respuesta en esas ventanas). Transitorio.
- Lo que SÍ era bug y ya se arregló: `AUTOPILOT=1` metía 2+ free adelante y el pago nunca entraba (fix v281 de esta
  serie: `AUTOPILOT=0`, cadena estática free→pago).
- **Observabilidad para la próxima:** el dashboard nuevo `tormenta-gpu-modelos` muestra LiteLLM en vivo (in-flight,
  latencia p95, req/min) + `attempts por modelo/result` → si vuelve a saturarse, se VE ahí (no hay que adivinar).
- **NO se tocó la config de LiteLLM** (regla: no tocar sin probar localmente).

## 6. Deuda / a futuro
- Unificar: que TODO código premium sea provisionado (deprecar el `SUB_CODES` env/manual que usa hermes).
- Autoservicio real (pasarela de pago → `/provision` automático). Hoy el dueño crea y reparte a mano.
- Anónimo por OpenRouter directo (con una key compartida del dev) en vez de LiteLLM, si se quiere trackear también el
  free por modelo sin depender de LiteLLM.
