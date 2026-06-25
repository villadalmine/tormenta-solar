# SDD — Resiliencia: Plan B cuando la infra de casa se pone lenta (+ stress testing)

- **Estado:** Draft / **backlog para iterar** (anotado, no se implementa ya)
- **Última actualización:** 2026-06-24
- **Relacionado:** `latencia-chat.md` (el tope ≤10s + línea temática), `llm-metrics.md` (métricas + bench),
  `carteles-ia.md` (pool NPU + fallback estático — **mismo patrón de degradación**), `suscripcion.md` (BYOK/pago
  como escape), `proxy-ia-deploy.md` (HAProxy G4 = el borde).

## 1. Contexto y objetivo

Me gusta el combo **juego estático en GitHub Pages + modelo corriendo en casa**: barato, dueño del fierro. Pero
**la infra de casa a veces se pone lenta**. Si un jugador entra desde GitHub y la respuesta tarda mucho, la
experiencia se cae. **El juego en GitHub NUNCA debe colgarse esperando a casa**: necesita un **Plan B** con cosas
**precacheadas** para degradar sin que se note. Y necesitamos **stress testing** para saber **cuándo** y **cuánto**
aguanta la infra antes de degradar.

## 2. Modos de falla (qué puede salir mal)

1. **Infra lenta** (no caída): responde, pero por encima del tope (>9s). Hoy → línea temática genérica.
2. **Infra saturada por carga**: varios jugadores a la vez → el **borde G4** (HAProxy en Mac mini PowerPC/OpenBSD)
   o LiteLLM/OpenRouter se encolan. **El G4 ya fue cuello** (`maxconn` bajo → se resolvió subiéndolo, pero es el
   eslabón más débil y hay que medirlo).
3. **Infra caída / sin red**: el proxy no responde. Hoy → `mode()='offline'`, BYOK u offline.
4. **OpenRouter free saturado**: aunque la infra de casa esté bien, el modelo free devuelve 429/vacío (medido:
   hasta 53% de fallback en picos). Plan B aplica igual.

## 3. Plan B — escalera de degradación (nunca colgar)

| Nivel | Situación | Qué sirve | Estado |
|---|---|---|---|
| **L0** | todo OK | respuesta IA real (cloud) | ✅ hoy |
| **L1** | timeout puntual (>9s) | **línea temática** genérica | ✅ hoy (`ai.js`) |
| **L2** | timeouts repetidos / infra lenta | **pool de respuestas precacheadas POR PERSONA** (canned, en personaje, variadas) en vez de la genérica | 🔲 **a hacer** |
| **L3** | proxy no responde / sin red | solo pool estático + BYOK como escape | ✅ parcial |

La idea nueva es **L2**: hoy el salto de "IA" a "línea genérica" es brusco. Con un **pool precacheado por persona**
(filósofo/poeta/pechito/cuevero/tahúr…), cuando la infra está lenta el linyera igual **contesta algo lindo y en
personaje** — el jugador casi no nota que no fue IA. Es el **mismo patrón que el banco de propaganda** de
`carteles-ia.md` (pool + fallback), aplicado al **chat**.

## 4. Precaching (qué se "precarga" en el juego de GitHub)

- **Pool de líneas por persona, horneado en el estático** (o `js/lang/`): N frases por linyera, variadas, que
  `ai.js` usa en L2 en vez de la genérica. Cero red. **Es lo mínimo del Plan B.**
- **Warm cache desde el proxy cuando está sano:** al cargar el juego (si el proxy responde rápido), bajar un
  lote de líneas frescas (generadas por NPU, como la propaganda) y guardarlas en `localStorage`; usarlas si más
  tarde la infra se pone lenta. Así el pool se **renueva** sin depender de casa en el momento crítico.
- **Carteles/propaganda:** ya cubierto (pool NPU + estático, `carteles-ia.md`).
- **Decisión de "entrar en modo Plan B":** el cliente ya tiene `lastTimedOut`; escalar: tras **K timeouts en la
  sesión**, pasar a **modo precacheado** por un rato (deja de pegarle al proxy, sirve del pool) y ofrecer el
  **upsell/BYOK** (`suscripcion.md`). Reintenta cada tanto para volver a L0.

## 5. Stress testing (para saber los límites reales)

**Objetivo:** encontrar la **rodilla** — a cuántos jugadores concurrentes la latencia p95 pasa el tope (9s) o
sube el error rate — **por capa**, para saber qué se rompe primero (¿el G4? ¿LiteLLM? ¿OpenRouter?).

- **Herramienta:** un script propio (Node, sin deps) o `k6`/`hey`/`vegeta`, que dispara **N requests
  concurrentes** al proxy con prompts realistas (reusar la batería de `bench.py`/`llm-metrics.md`).
- **Escenarios (de adentro hacia afuera):**
  1. **Directo a LiteLLM** (in-cluster) → mide el modelo/pool puro.
  2. **Al proxy** (in-cluster) → suma el proxy Node + rate-limit.
  3. **Por el dominio público** (atravesando el **G4/HAProxy** → Gateway) → **mide el borde G4** (el sospechoso).
- **Barrido de concurrencia:** 1, 2, 5, 10, 20, 50… medir p50/p95, error%, timeouts. Graficar dónde se cae.
- **Observabilidad:** mirar en Grafana las métricas que ya tenemos (`tormenta_ai_chat_total{outcome}`,
  histograma de latencia) **durante** el test → se ve el degrade en vivo. Cruzar con CPU/mem del pod y del G4.
- **Entregable:** una tabla "concurrencia → p95 / error%" por capa y el **número mágico**: "hasta X jugadores
  simultáneos andamos bien; arriba de eso, Plan B". Ese X calibra el umbral K del §4 y si conviene autoscaling
  (`autoscaling.enabled` del chart) o subir réplicas.

## 6. Requisitos (cuando se itere)

- **RF-1** Pool de respuestas precacheadas por persona (L2) en `ai.js`, usado ante timeouts repetidos.
- **RF-2** (opcional) Warm-cache del pool desde el proxy a `localStorage` al cargar, si el proxy está sano.
- **RF-3** Escalada a "modo Plan B" tras K timeouts/sesión + reintento periódico + upsell/BYOK.
- **RF-4** Suite de stress testing (script + escenarios por capa) y un reporte con la rodilla por capa.
- **RF-5** (según resultado) ajustar `maxconn`/timeouts del G4, réplicas/HPA del proxy, o el umbral K.

## 6.1 Perillas del borde G4 (HAProxy) — calibrar, no maximizar

- **Estado REAL (verificado 2026-06-24, corrige la nota previa):** el server sigue en **`maxconn 5`** — lo que
  se cambió antes fue solo `timeout queue` (a **120s**), que es la **perilla equivocada**. Además el `frontend
  tcp_front` tiene **`maxconn 20`** (tope global de TODOS los backends). El `cybercirujas_backend` es **1 server
  compartido** por cybercirujas.club / ha / cruzdelsur / tormenta-solar / llm-tormenta-solar.
- **Por qué mata el chat:** `maxconn 5` = solo **5 conexiones concurrentes** para todos esos hosts; el chat es
  conexión **larga** (~9s) → 5 jugadores la saturan y el 6º **encola hasta 120s** (inútil: el cliente corta a 9s).
- **Config recomendada:** `server ... maxconn 5 → 50`; `timeout queue 120s → 2s` (fast-fail al Plan B);
  `frontend maxconn 20 → 200`. Es **passthrough TCP** (sin TLS, barato) y el destino es el gateway del cluster
  (aguanta cientos) → el 5 era límite artificial. Arrancar en 50, subir según stress test.
- **DOS JUEGOS comparten el backend:** `cruzdelsur.cybercirujas.club` (online-game/galaxy, tiempo real) **y**
  `tormenta-solar`+`llm-tormenta-solar` están en el **mismo `cybercirujas_backend` (maxconn 5)** → pelean por 5
  slots. El online mantiene **1 conexión persistente por jugador** → 5 = ~5 jugadores TOTALES entre ambos.
- **El online-game usa SSE, NO WebSockets** (verificado): `GET /api/v1/notifications/stream` (text/event-stream,
  HTTP de larga vida server→cliente) + polling cada 4s. Implicancias:
  - **`timeout tunnel` NO aplica a SSE** (solo a upgrade/CONNECT). En SSE mandan `timeout client`/`timeout server`.
    El `defaults` (50s) **corta el stream a los 50s** si no hay heartbeat → EventSource reconecta (cortes cada ~50s).
  - **El G4 es `mode tcp` (SNI passthrough):** NO ve el path (`/api/v1/...` va cifrado, TLS termina en el cluster)
    → **no se puede** rutear el SSE por path acá; ese split por-path va en la capa HTTP del cluster. En el G4 solo
    se puede subir el timeout del **SNI cruzdelsur entero**.
  - **Fix recomendado: heartbeat en el SSE (`: ping` cada ~15s)** en el código del online-game → proxy-agnóstico,
    ningún intermediario lo corta, no hay que aflojar timeouts. (Belt-and-suspenders: en el G4, `timeout
    server/client 1h` en cruzdelsur_backend.)
- **Mejora (recomendada): un backend por juego** (todos al mismo VIP `192.168.178.200`, separar solo da
  presupuesto propio):
  - `cruzdelsur_backend` (online/SSE): `maxconn 200`, `timeout queue 2s`, **`timeout server 1h` + `timeout client
    1h`** (por el SSE; NO tunnel).
  - `tormenta_backend` (juego+chat): `maxconn 50`, `timeout queue 2s`.
  - `cybercirujas_backend` (web/ha resto): `maxconn 30`.
  - `frontend maxconn 20 → 400` (suma + headroom).
  - **OJO al reorganizar:** cada `use_backend X` necesita su `backend X` definido (si no, HAProxy no arranca:
    "unable to find required use_backend") y **no borres** las rutas de leloir/nodocongreso/k8s_rk1.
- **Principio:** `maxconn` no es "lo más alto posible" sino **≈ requests simultáneos que el modelo sirve dentro
  de los 9s**; más que eso mueve la cola al modelo y todos van lento. Estas perillas son **lo que calibra el
  stress test §5**.

## 6.2 Pool del linyera generado por cron — REPORTE de backends (2026-06-25)

El L2 (pool por persona) pasó de 2-3 líneas hardcodeadas a un **pool generado** (`js/linyera-pool.js`,
`tools/gen-linyera-pool.mjs`), regenerado por un **cron 1×/día** (offline/batch → que tarde y reintente da igual).
Probé 6 backends (5 frases c/u, persona filósofo, in-cluster) para elegir el generador:

| Backend | s/frase | ok | Costo | Calidad |
|---|---|---|---|---|
| **gemma4-free** (FREE, cloud) | 1.6s | **5/5** | **$0** | ✅ **Mejor** — lunfardo perfecto, variado ("se me recalibró el bocho") |
| cheap = gpt-4o-mini (PAGO) | 6.8s | 3/5 | ~$0.00004/frase | ✅ Excelente ("el sol me dejó la mente en remojo") |
| gpt-oss-free (FREE) | 2.4s | 1/5 | $0 | ⚠️ flaky (devuelve vacío) |
| local-gpu = qwen2.5:1.5b (GPU) | 1.2s | 5/5 | $0 | ❌ gibberish ("¡Qué tejedorazo!", español de España) |
| gemma2:2b (GPU directo) | 6.4s | 5/5 | $0 | ❌ gibberish ("Pata chiquita, cha!") |
| rk1-npu-local (NPU) | ~28s | timeout | $0 | ❌ (modelo chico = misma mala calidad + lentísimo) |

**Conclusión (contraintuitiva):** la **GPU/NPU NO sirve** para esto — los modelos chicos locales escupen gibberish,
no lunfardo porteño. El **ganador es `gemma4-free` corrido OFFLINE/batch**: gratis + mejor calidad. La ironía: el
modelo free que se satura EN VIVO funciona genial para un batch lento (poca carga + reintentos). `gpt-4o-mini` =
backup pago (calidad top, centavos) si el free batch no rinde.

**Proyección del cron** (~300 frases, 1×/día): con **gemma4-free = $0**; con gpt-4o-mini ≈ **$0.45/mes**. Tiempo:
gemma4-free ~5-15 min según saturación (no importa, es de noche). **GPU/NPU descartados por calidad.**

**Pendiente del generador:** gemma4-free **converge** (repite "se me tildó el bocho") → el cron rota
micro-escenarios (`SCENARIOS`) + dedup para más variedad.

**MONTADO (2026-06-25):** **Argo CronWorkflow** `tormenta-ai-proxy-pool` 1×/día (05:00), corre `gen-pool.mjs`
(en la imagen del proxy) contra LiteLLM gemma4-free → **POST `/linyera-pool`** al proxy (token `GEN_TOKEN`). El
proxy lo sirve por **`GET /linyera-pool`** (en memoria); el cliente lo trae fresco y mergea sobre el seed
horneado (`js/linyera-pool.js`) si una persona tiene ≥4. Argo elegido sobre CronJob k8s por reintentos
(`retryStrategy` 3×) + **auto-limpieza** (`podGC` + `ttlStrategy`). Opt-in `linyeraPool.cronjob.enabled`.
Probado end-to-end (30 frases/persona, lunfardo lindo).

### 6.3 (PROPUESTA) Extender el cron a frases por ENTIDAD para NPCs sin IA

Idea del usuario: el mismo cron podría generar **frases relevantes para cada personaje que NO tiene chat IA**
(borrachines, Iorio, jubilados, turista, etc.). Como **cada personaje es una ENTIDAD con atributos**
(`specs/modelo-de-entidades.md`), el generador usa esos atributos en el prompt → frases **coherentes con quién
es** cada uno. Encaja con el **Mensajero** (`carteles-ia.md`), que ya sirve mensajes por objeto: hoy los NPCs
sin IA dicen líneas hardcodeadas; con esto dirían frases generadas, variadas y fieles a su entidad. **A diseñar:**
(a) fuente de las entidades+atributos para el prompt, (b) endpoint/pool por-entidad en el proxy (extiende
`/linyera-pool` o uno nuevo), (c) wiring en `dialogos.js` para que el NPC sin IA consuma su pool.

## 7. Notas

- **No romper el principio:** el cliente jamás bloquea esperando; el tope duro (9s) y el pool garantizan respuesta
  siempre. Plan B es **transparente** (el jugador idealmente no lo nota).
- **Privacidad/medición:** reusar métricas existentes; el stress test es **sintético** (no jugadores reales) y se
  corre en ventana controlada para no ensuciar las métricas de uso real (etiquetar o correr fuera de horario).
- **Prioridad:** iterar **después** del Plan B mínimo (L2 pool) — ese ya cubre el 80% del problema "infra lenta"
  sin necesitar el stress test. El stress test dice **cuándo** se necesita, pero el pool **siempre** ayuda.
