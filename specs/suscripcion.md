# SDD — Suscripción / Freemium del chat IA (free vs pago vs BYOK)

- **Estado:** **Draft** (diseño; no implementado)
- **Última actualización:** 2026-06-24
- **Disparador:** en hora pico los modelos **free se saturan** (medido 20-51s → ahora degrada a línea temática
  por el tope de 8s, ver `latencia-chat.md`). Para los que quieran IA **siempre rápida y mejor**, ofrecer un
  **plan pago** que usa un **modelo mejor** (el dev carga crédito en OpenRouter) y **no pasa por el tier free**.

## 1. Tiers

| Tier | Quién paga la IA | Modelo | Latencia | Cómo se identifica |
|---|---|---|---|---|
| **Free** (default) | el dev (pool free) | cadena free `gemma4-free,kimi-free` | variable; degrada a línea temática en pico | nada (todos) |
| **Pago / Sub** | el dev (crédito OpenRouter pago) | modelo **premium rápido (TBD)** | baja y estable, sin cola free | **token de entitlement** que el juego manda al proxy |
| **BYOK** | el jugador (su key) | el que elija (su riesgo) | la de su key | su API key en el navegador (ya existe) |

Regla clave: **un usuario pago NO va por el tier free** — el proxy lo rutea a un `model_name` distinto en
LiteLLM (sin los `:free` saturables).

## 2. Qué habilita el plan pago (a cerrar)

- **Modelo premium** rápido y fiable (TBD — ver §5): respuestas <3s estables, mejor calidad/coherencia.
- **Sin degradación**: no cae a la "línea temática por tormenta" salvo caída real.
- **Más memoria/contexto**: historial más largo (más turnos recordados) y/o el oráculo GraphRAG (cuando exista).
- **Rate-limit más alto** que el free (que hoy es 12/min por IP).
- (Opcional) personajes/voz extra, o features de juego — definir si la sub es solo-IA o también gameplay.
- **Precio:** ~1 €/mes (idea inicial). TBD.

## 3. Cómo cambia la lógica de LiteLLM

Hoy el proxy manda `AI_MODEL="gemma4-free,kimi-free"` (cadena free) para **todos**. Con tiers:

- **El proxy elige el `model_name` según el tier del request:**
  - free → `gemma4-free,kimi-free` (como hoy).
  - pago → `tormenta-paid` (nuevo model_name en LiteLLM, modelos **pagos**, sin `:free`).
- **`tormenta-paid` en LiteLLM** (aditivo): apunta a un modelo pago (TBD) con la **key paga** del dev
  (`os.environ/OPENROUTER_PAID_KEY` o la misma con crédito). Su propia cadena de fallback pago, **sin tocar**
  los model_names free de los otros agentes.
- **Budget/control de costo:** LiteLLM `max_budget` por la key/tier paga + alertas (que un abuso no funda la
  tarjeta). Métrica de gasto por `end_user` (ya soportado).
- El proxy NO expone qué key usa; el jugador nunca ve nada de esto.

## 4. Entitlement (cómo el proxy sabe que sos pago)

- El juego (cliente) guarda un **token de suscripción** (tras pagar) y lo manda al proxy en cada chat
  (`{ npc, message, history, sub: "<token>" }` o header `Authorization`).
- El proxy **valida** el token (firma/JWT con secret server-side, o lista en KV/DB) → si válido y vigente →
  usa `tormenta-paid`; si no → free.
- El token **nunca** da acceso a la key real; solo habilita el ruteo pago. Revocable/expirable.

## 5. El modelo pago (TBD — candidatos)

Rápidos, baratos y buenos para el linyera (criollo + memoria), vía OpenRouter con crédito:
- `google/gemini-flash-1.5` / `gemini-2.0-flash` — muy rápido, barato, multilingüe.
- `openai/gpt-4o-mini` — rápido, barato, sólido.
- `anthropic/claude-haiku` — rápido, buena prosa.
- `deepseek/deepseek-v3` (pago) — barato y capaz.
- A elegir por **latencia + calidad criollo + costo/1M tokens**; correr el mismo banco (`pruebas-modelos.md`).

## 6. Upsell (cuando el free falla seguido)

- El cliente ya sabe cuándo hubo timeout (`lastTimedOut`) y el proxy expone `tormenta_ai_timeouts_total`.
- Si a un jugador se le corta **N veces seguidas** (p.ej. 2-3 en la sesión), el chat ofrece **suave**:
  *"⚡ La tormenta satura el modelo gratis. Con el plan pago el linyera te contesta al toque, sin esperas."* +
  link a pagar. No intrusivo, en clima del juego.
- Métrica de conversión: cuántos ven el upsell vs cuántos pagan (Grafana).

## 7. Pago (mecanismo — TBD)

- Stripe / Ko-fi / Mercado Pago / Lemon Squeezy → al pagar, backend emite el **token de entitlement**.
- Mínimo viable: un endpoint que, dado el pago confirmado (webhook), firma un JWT con vencimiento.
- Hosting del backend de pagos: mismo cluster (otro pod) o un SaaS de pagos que haga el webhook.

## 8. Pendientes / decisiones

- ¿La sub es **solo IA premium** o también desbloquea **gameplay** (personajes, niveles, skins)?
- Elegir el **modelo pago** (§5) con datos.
- Mecanismo de **pago** y de **token** (§4, §7).
- ¿Free sigue teniendo IA (degradada) o en pico el free pasa 100% a líneas locales y la IA es "feature pago"?
  (Decisión de producto: hoy el free igual intenta IA y degrada elegante — mantenerlo así es lo más amable.)

## 9. Diseño CODE-BASED (idea del usuario, 2026-06-25) — el camino elegido

> **F1 HECHO (proxy 0.1.15, cliente v112):** entitlement por código MANUAL. Códigos válidos por env `SUB_CODES`
> (+ `POST /sub-codes` con GEN_TOKEN en runtime; secretos → NO se commitean). Header `X-Sub-Code` en el chat →
> tier PAGO: salta free+cupo, va directo a `SUB_MODELS` (gemma4-paid,claude-sonnet) sin candados. `GET /sub-check`
> valida. Métrica `tormenta_ai_sub_usage_total{code}` (volumen por código, hash corto) + `tormenta_ai_sub_codes`.
> Cliente: Settings "Suscripción" pega/activa el código (ai.js `setSubCode`/`checkSub`, header), i18n ES/EN.
> **Falta (fases siguientes):** §9.1 email `/request-code`, §9.2 DB (hoy in-memory + env), §9.4 pago, key-por-código (§9.3 B).

Entitlement por **código** que el jugador pide y pega en Settings. **El pago real va DESPUÉS**; primero el
mecanismo de código + DB + métricas (emisión manual/gratis al principio).

### 9.0 Operación TEMPORAL (fase manual) + cómo se rastrean los códigos

> **Esto es temporal** — hasta tener email (§9.1) + DB (§9.2) + pago (§9.4). Hoy los códigos se emiten a mano.

**Emitir un código (dos formas):**
- **Durable (recomendado, sobrevive reinicios del pod) — env del proxy:** se redeploya agregando el código a
  `SUB_CODES` (lista separada por coma). Los códigos son **secretos → NO se commitean**; van por `--set`:
  ```
  helm upgrade tormenta-ai ai-proxy/chart -n ai -f ai-proxy/chart/values-prod.yaml \
    --set image.tag=<TAG> --set linyeraPool.genToken=<TOK> \
    --set 'extraEnv[11].name=SUB_CODES' --set 'extraEnv[11].value=COD1\,COD2'
  ```
- **Efímero (al instante, se PIERDE si el pod reinicia) — API protegida por GEN_TOKEN:**
  ```
  curl -X POST https://llm-tormenta-solar.cybercirujas.club/sub-codes \
    -H 'X-Gen-Token: <TOK>' -H 'Content-Type: application/json' -d '{"code":"OTRO"}'
  # revocar: -d '{"code":"OTRO","revoke":true}'
  ```
- **Usar:** el jugador pega el código en ⚙ Opciones → Suscripción → Activar (se guarda en su localStorage
  `ts_sub_code` y se manda en cada chat por el header `X-Sub-Code`).

**¿Cómo sabe el sistema QUIÉN/qué sesión usa un código? (estado actual, honesto):**
- **El código NO está atado a una persona ni a una sesión** — es un secreto **compartible**: cualquiera que lo
  tenga y lo pegue obtiene el tier pago. (Atarlo a una persona = flujo email→código §9.1 + DB code↔email §9.2,
  **pendiente**.)
- **Sesión:** el header `X-Sub-Code` (el código) es **independiente** del `X-Session-Id` (la sesión del browser,
  que se usa para el cupo del free). Un mismo código puede usarse desde varias sesiones/dispositivos.
- **Trazabilidad que SÍ hay hoy:**
  - **Volumen por código:** métrica `tormenta_ai_sub_usage_total{code="<hash corto>"}` → en Grafana ves
    **cuánto se usa cada código** (para detectar uno que se disparó / se compartió de más).
  - **Cruce fino:** el proxy loguea por request (`reqLog` → Loki) `{code, sid, ip, npc, model}` → podés ver
    **qué sesiones/IPs usaron cada código** (si un código aparece en 50 IPs, se filtró).
- **Lo que falta para aislar por usuario de verdad:** (a) **key de OpenRouter por código** (§9.3 opción B) →
  costo y **límite/budget por código**, revocable sin tocar a los demás; (b) **DB + email** (§9.1/§9.2) para
  atar código↔persona y un estado `paid/revoked`; (c) **pago** (§9.4) que flippea el estado.

### 9.1 Flujo
1. **Settings → "Pedir código"**: el jugador pone su **email** → backend genera un código y se lo **manda por
   mail**. (Por eso se guarda el email: porque al pedirlo te lo envía ahí.)
2. **Una lógica valida si pagó o no** (al principio: manual / gratis; cuando haya pago, lo decide el pago).
3. **Settings → "Pegar código"**: el jugador escribe el código → queda guardado (localStorage) y el cliente lo
   **manda en cada request** del chat.
4. **El proxy**, con un código válido y pago, **rutea al MODELO PAGO** usando **la API key del dev** (la que ya
   tenés). El código mapea **qué key usar** → así mañana podés darle a un código **otra api key** (rotás/segmentás
   sin compartirla; es todo local).

### 9.2 Base de datos (usuarios pagos)
`paid_users(code, email, api_key_id, status, created_at, last_used)` — `status` ∈ pending|paid|revoked;
`api_key_id` = cuál key del dev usa ese código. Misma decisión de DB que el resto (SQLite-en-PVC vía el proxy,
o reusar Postgres). El proxy: nuevo endpoint `POST /request-code` (email→genera+manda+guarda pending) y, en el
chat, valida el código contra la DB → si paid, rutea al modelo pago con su `api_key_id`.

### 9.3 Métricas por CÓDIGO (clave: saber quién consume mucho)
- **Label `code`** (o un hash corto del código / `app` id) en `tormenta_ai_chat_total{...,code="..."}` → en
  Grafana ves **qué código consume más**. OJO cardinalidad: si hay muchos códigos, hashear/acotar o usar la
  opción B.
- **Costo — dos vías (la B la sugiere el usuario, suele ser mejor):**
  - **A) Prometheus / LiteLLM spend** con el label `code`. Simple, pero sin aislar el gasto real por código.
  - **B) Una API key de OpenRouter POR código** (o por grupo): el proxy rutea ese código por SU key, y el dev
    **fetchea el spend por key desde la API de OpenRouter**. Ventajas: **costo aislado por código** + podés
    **ponerle límite/budget a cada key** (cap por usuario) + responde nativo "quién gasta". Es el `api_key_id`
    de la DB. **Recomendado para el costo/límites**; el label `code` en Prometheus queda para el **volumen** de
    queries (barato si hay pocos pagos).

### 9.4 Pago (después)
Cuando se ponga: desde Settings → derivar a una **página de pago** (TBD: Mercado Pago / Stripe / link). El pago
exitoso flippea `status` a `paid` en la DB. Hasta entonces, emisión manual.

### 9.6 Arquitectura del flujo de PAGO (diseño, 2026-06-25)

**Flujo completo (lo que querés):**
1. **UI:** ⚙ Opciones → botón **"Suscribirme"** → abre una **ventana/modal nueva** (o página hosteada).
2. La modal pide el **EMAIL** (para mandarte el código ahí) → botón "Pagar".
3. **Deriva a la PASARELA** de pago (pasando el email/un id de orden).
4. **Pago OK** → la pasarela pega un **WEBHOOK** al backend de billing.
5. **Backend (webhook):**
   a. Verifica el pago (firma del webhook).
   b. **Crea una KEY de OpenRouter** (`POST /api/v1/keys`) con `label=<email>` y `limit=<budget>` (tope US$/mes).
   c. **Genera un CÓDIGO** y guarda el mapeo `code → openrouter_key` (+ email, status, paid_at).
   d. **Manda el CÓDIGO por EMAIL**.
6. **Usuario:** mira el mail → pega el código en Settings → Activar → el proxy lo valida (DB) → rutea premium
   **con SU key** de OpenRouter.
7. **Gasto:** se lee de OpenRouter por key (`GET /api/v1/key`) → "el email/key X gastó US$ Y"; **el budget de la
   key lo CAPEA solo** (un usuario no puede gastar más que su tope, sin que toques nada).

**El almacenamiento (tu duda — la parte clave):**
- **Lo MÍNIMO que hay que guardar: `code → openrouter_key_hash`** (el proxy tiene que resolver el código a su key).
- **Tu intuición es correcta:** el "registro de quién pagó y cuánto gasta" puede **vivir en OpenRouter** — el
  **label de la key = el email**, y el **spend se lee de su API**. Así la DB local es **mínima** (solo el mapeo
  `code↔key`) y NO duplicás el gasto ni tenés que sumarlo vos. OpenRouter es la fuente de verdad + el cap.
- **Opciones de DB en casa:** **SQLite-en-PVC** (lo más simple: 1 archivo en Longhorn; Node 22 trae `node:sqlite`
  nativo, sin dependencias) · **reusar el Postgres** de online-game (robusto, compartido) · KV/Redis.
- **Recomendación:** un **servicio de "billing" separado** (cold path) que tenga la DB + el webhook + el email +
  el provisioning de OpenRouter, y que le **pase al proxy los códigos válidos↔keys** (igual que el cron le pasa
  el pool del linyera). Así el **proxy (hot path) queda simple** y el billing es un servicio aparte que casi no
  corre. DB: **SQLite-en-PVC para arrancar** (esto es bajo volumen), Postgres si querés robustez/compartir.

**Componentes nuevos (dependencias de infra a resolver):**
- **Email transaccional** para mandar el código: Resend / Mailgun / SES (free tier) o un SMTP propio.
- **Pasarela + webhook:** **Mercado Pago** (AR, lo más natural para vos) o Stripe / Lemon Squeezy / Ko-fi.
- **Provisioning de OpenRouter** (`POST /keys`, `GET /key`) con la **provisioning key** del dev.
- **DB en casa** (SQLite-en-PVC o Postgres).

**Privacidad/seguridad:** el email es PII → guardar lo mínimo y seguro; los **datos de la tarjeta NUNCA tocan tu
infra** (los maneja la pasarela, vos solo recibís el webhook "pagó OK"); el código y la provisioning key son secretos.

### 9.5 Mi lectura
- El **código + email + DB + key-por-código** es un diseño limpio y desacoplado del pago (podés arrancar
  emitiendo códigos a mano para probar el modelo pago vos/amigos). 
- **Recomendado: opción B** (key de OpenRouter por código) para costo+límites por usuario, y el **label `code`**
  en métricas solo para volumen. Así "qué código consume mucho" lo ves por **las dos** (volumen en Grafana,
  US$ en OpenRouter), y podés **capar** un código que se dispara sin tocar a los demás.
- **Pendiente de infra:** servicio de **email** (SMTP/API) para mandar el código; el endpoint `/request-code` +
  la DB en el proxy; crear/rotar keys de OpenRouter vía su API (o a mano al principio).
