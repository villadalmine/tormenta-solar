# SDD — OpenRouter dinámico: precios en tiempo real, ruteo al más barato-bueno, novedades + keys por código

- **Estado:** **Diseño (para implementar por fases).** Pago/keys NO se implementa aún (ver `suscripcion.md §9`).
- **Última actualización:** 2026-06-25
- **Relacionado:** `suscripcion.md §9` (código+email+key por código), `llm-metrics.md` (bench de calidad + auto-ruteo),
  `resiliencia.md` (pool/cron), online-game `app/services/llm.py` (transporte API-to-API reusable).

## 1. Objetivo

Que el juego sepa **en tiempo real** qué modelo de OpenRouter conviene: el **más barato que SIGUE siendo bueno**
para nosotros (cruzando **precio** con la **calidad** del bench). Además, un feed de **novedades** ("modelos
interesantes para que uses") para la landing/juego. **Todo dinámico, API-to-API, en objetos/clases.** Reusa el
patrón de online-game (transporte LLM a cualquier endpoint OpenAI-compatible + metering por usuario).

## 2. La API de OpenRouter (verificado)

- **`GET /api/v1/models`** (PÚBLICO, sin auth): 339 modelos. Cada uno: `id`, `name`, `pricing{prompt,completion}`
  (US$/token), `context_length`, `created` (ts → detectar **nuevos**), `description`, `top_provider`,
  `architecture`. → **alimenta precios Y novedades de una.** (26 modelos free hoy: `pricing.prompt == "0"`.)
- **`GET /api/v1/key`** (auth): límite/uso de la key actual. **`GET /api/v1/credits`**: saldo.
- **`POST /api/v1/keys`** (provisioning key): **crea sub-keys con límite** → una key por código (`suscripcion §9`).
- **`GET /api/v1/generation?id=`**: costo exacto de una generación.

## 3. Arquitectura (OOP, API-to-API, todo en el proxy server-side)

```
class OpenRouterClient        # wrapper de la API (la key del dev nunca sale al cliente)
  models()                    -> GET /api/v1/models   (precios + metadata)
  keyInfo() / credits()       -> uso/saldo
  createKey({limit,label})    -> POST /api/v1/keys     (key por código; suscripcion §9)
  generationCost(id)
class PriceTracker            # corre en el cron: toma models(), filtra los candidatos, calcula métricas
  snapshot()                  -> {model: {prompt, completion, free, score}}  + publica a Prometheus/proxy
class ModelScorer             # cruza PRECIO (PriceTracker) + CALIDAD (bench de llm-metrics) -> ranking
  best(tier)                  -> cadena ordenada "más barato-bueno" para el ruteo
class NewsFeed                # de models(): detecta nuevos/interesantes -> /novedades para landing/juego
```

Todo desacoplado del transporte de chat (ese ya existe: `ai-proxy/server.js ask()` + el de online-game `llm.py`).

## 4. Cron de PRECIOS (Argo CronWorkflow, mismo patrón que el pool)

- Workflow `tormenta-openrouter-precios` (ej. cada 6 h): corre `PriceTracker.snapshot()` → `GET /models` →
  extrae pricing de **los candidatos** (los "buenos para nosotros" del bench: gemma4-free, gpt-oss-free, cheap,
  claude-sonnet, …) → **publica al proxio** (`POST /precios`, como el pool) → el proxy expone:
  - `tormenta_openrouter_price_usd{model, kind="prompt|completion"}` (gauge) → Prometheus → **Grafana: precios
    en el tiempo** (ves cuándo un modelo cambió de precio o pasó a free/pago).
  - `GET /precios` (JSON) para el ruteo y la landing.
- **Por qué cron y no en vivo:** los precios cambian lento; pegarle a `/models` en cada chat es caro/innecesario.

## 5. Ruteo al MÁS BARATO-BUENO (la inteligencia)

`ModelScorer.best()` cruza **dos fuentes que ya diseñamos/tenemos**:
- **Precio** (este cron) — US$/token por modelo.
- **Calidad/disponibilidad** (`llm-metrics.md`: bench 4 h + `tormenta_ai_model_attempts_total` real) — qué tan
  bueno y disponible es para NUESTRO caso (lunfardo, memoria, latencia).

Score → la **cadena del proxy** (`AI_MODEL`) se arma sola: **el más barato que pase el umbral de calidad** primero,
con free arriba (US$0) y el pago como red. Es el **auto-pilot de `llm-metrics §12`**, ahora **con precio**. Mismos
candados (piso fijo, histéresis, sólo-free por defecto salvo tier pago, override).

## 6. NOVEDADES de modelos (landing/juego, dinámico)

- `NewsFeed` de `GET /models`: detecta **modelos nuevos** (`created` reciente) y **interesantes** (free + buen
  score del bench, o context_length grande, o de proveedores que nos sirven) → arma un feed corto curado.
- `GET /novedades` (JSON) → la **landing** (`info/`) y/o una sección del juego muestran "**modelos interesantes
  para que uses**" (con su `name`/`description`/precio). **Todo dinámico**, sin hardcodear.
- Encaja con la temática: los linyeras "saben de IA y qué modelos andan mejor" → el feed les da data real.

## 7. Suscripción / keys por código (de `suscripcion.md §9`, acá la parte OpenRouter)

- `OpenRouterClient.createKey({limit, label: code})` → **una key de OpenRouter por código** con **budget**. El
  proxy rutea ese código por su key. El **costo/límite queda aislado por usuario** y se lee de `keyInfo()` →
  responde nativo "qué código gasta cuánto". (Recomendado sobre el label `code` en Prometheus, que queda para
  volumen.) Reusa el metering por-usuario de online-game (energy/assist).

## 8. Reuso de online-game (no reinventar)

- **`app/services/llm.py`**: transporte a cualquier endpoint OpenAI-compatible (OpenRouter/LiteLLM/Ollama) con
  fallback — el patrón de `OpenRouterClient` se inspira en eso.
- **`sdd-llm-usage-metrics.md` + `sdd-assistant-metrics-energy-assist.md`**: metering de uso de LLM por usuario
  (energía/assist) — base para el budget por código.
- **`sdd-users.md`**: modelo de usuario/identidad — base para el código↔email↔key.

## 9. Fases

1. **F1** `OpenRouterClient` + cron de **precios** (`GET /models` → métricas `tormenta_openrouter_price_usd` +
   `GET /precios`). Panel Grafana de precios. *(Solo lectura, gratis, sin riesgo.)*
2. **F2 HECHO** `ModelScorer` en el proxy: cruza disponibilidad real (`tormenta_ai_model_attempts_total`) +
   latencia (`LAT`) + precio (`OR_PRICES`) → **auto-arma la cadena** (`AUTOPILOT=1`, candados: PISO fijo,
   PAGO siempre último, histéresis `CHAIN_TTL`, override por `AI_MODEL`). Expone `GET /ranking` (juego/landing)
   + métricas `tormenta_ai_model_score|okrate|chain_position` (Grafana: mejor/más-barato). CANDIDATES =
   pool free (varios → si gemma4-free se satura, otro free responde) + el pago entra solo como red.
3. **F3** `NewsFeed` → `GET /novedades` → landing/juego ("modelos interesantes"). Dinámico.
4. **F4** keys por código (provisioning) + el flujo code+email de `suscripcion §9` + pago.

## 10. Mi lectura

- **Empezar por F1** (precios) es barato y sin riesgo (`/models` es público) y ya da valor: ves precios en
  Grafana + base para el ruteo. **F3 (novedades)** sale casi gratis del mismo fetch → buen "wow" para la landing.
- **F2 (ruteo por precio×calidad)** es la inteligencia que pedís: el juego siempre va a "lo más barato que anda
  bien", con los datos reales del bench + precios. Es la convergencia natural de este SDD + `llm-metrics`.
- **Todo API-to-API y en clases** como pedís; las keys/precios viven en el proxy (server-side), nunca en el
  cliente. Reusamos el transporte y el metering de online-game en vez de reinventar.
