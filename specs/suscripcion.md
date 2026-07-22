# SDD — Suscripción / Freemium del chat IA (free vs pago vs BYOK)

- **Estado:** **F1+F2+F3 implementados y live** (proxy 0.1.18); **falta el PAGO automático** (pasarela + webhook + email) → ver "🔜 Próxima iteración" abajo.
- **Última actualización:** 2026-06-25

> **✅ Validación externa (2026-07-21):** un review de IA pedido por el dueño (sobre "vender y masificar" el
> juego) propuso, sin conocer este SDD, casi exactamente este diseño: **freemium con la IA como capa paga**
> (~1€/mes) — NPCs con memoria que dan la sensación de mundo vivo, mercado cosmético sin ventaja, split
> gratis/pago para controlar costo de inferencia. Confirma el rumbo ya elegido acá (`rules` gratis / `llm` pago,
> §1-§3) y en [[npcs-vivos]] (chusmerío + memoria del barrio). El único gap real que señala y que sigue abierto es
> el mismo de siempre: el **pago automático** (§9.4/§9.6, ver [[pasarela-pago]]) — investigación hecha, falta que
> el dueño ejecute (abrir cuenta Mollie/Mercado Pago). La idea de "NPC que te recuerda algo puntual de hace unos
> días" ya está cerca en [[npcs-vivos]] §F4d (memoria del barrio persistente); falta el refinamiento a memoria
> **por NPC individual** que ese mismo SDD ya lista como pendiente v2.

## 🔜 ESTADO + PRÓXIMA ITERACIÓN (leer esto primero) ⭐

**Ya funciona (live):**
- ✅ **F1** entitlement por código (`X-Sub-Code` → tier pago, salta free+cupo). [[proxy-ia-deploy]]
- ✅ **F2** gasto **estimado** por código (métrica + Grafana).
- ✅ **F3** **key-por-código** de OpenRouter (`POST /provision`), store en PVC, ruteo **directo a OpenRouter con la
  key del usuario**, **gasto REAL + tope** por usuario leído de OpenRouter → todo **visible en Grafana** (fila
  "💳 Suscripciones" del dashboard `tormenta-linyera`), sin comandos.
- ✅ **El JUGADOR ve SU consumo** (proxy 0.1.20): `GET /my-sub` (auth = su propio código, sin GEN_TOKEN) →
  solo lo suyo (usage/limit/expiresAt). En ⚙ Opciones → Suscripción muestra "✓ activa · usaste $X de $Y · vence
  en Zd". Personal a la sesión con el token validado (ai.js `mySub()`).

> **⚠️ BUG CONOCIDO a investigar (2026-06-25):** el consumo (`/my-sub`) **no aparece en GitHub Pages**
> (`villadalmine.github.io`) ni en incógnito, PERO **el chat SÍ anda ahí** (el POST al proxy funciona) y en el
> **self-host SÍ se muestra** el consumo. Mismo código (v114) en los dos lados → no es caché ni el código.
> Raro: el chat (POST con `X-Session-Id`+`X-Sub-Code`) llega, pero el `GET /my-sub` (mismo proxy, mismo header)
> no se ve. **Diagnóstico pendiente** — correr en la consola (F12) de la pestaña de GitHub:
> ```js
> fetch('https://llm-tormenta-solar.cybercirujas.club/my-sub',{headers:{'X-Sub-Code':AI.getSubCode()}}).then(r=>r.text()).then(t=>alert('code='+AI.getSubCode()+'\nmy-sub='+t)).catch(e=>alert('ERROR: '+e))
> ```
> Árbol: `code` vacío → no se guardó · `ERROR/Failed to fetch` → CORS/red bloquea el GET (raro, el POST anda) ·
> `{"paid":false}` → el proxy no reconoce el código desde ese origen · `{"paid":true,"usage":...}` → el dato
> llega → es **bug del display** en `ai.js` (`showSub`/`fmtSub`). Sospecha principal: el display, o un preflight
> CORS del GET que el POST no dispara igual.
- **Operación hoy (pseudo-manual):** el dueño dispara `POST /provision {email,limit}` (1 comando) y manda el
  código por mail **a mano**. Detalle en §9.0 / §9.6 y en `ai-proxy/README.md`.

**Falta para cobrar de verdad (PRÓXIMA ITERACIÓN — el usuario lo retoma cuando quiera, NO ahora):**
- ⬜ **Pasarela de pago** → **research hecho en [`pasarela-pago.md`](pasarela-pago.md)**: recomendado **Mollie** (NL/EU, iDEAL, micropagos, webhook fácil); **Mercado Pago/dLocal** para AR (fase 2).
- ⬜ **Webhook** "pagó OK" → llama a `/provision` **solo** (así el dueño no toca nada). §9.6 paso 5.
- ⬜ **Email automático** del código (Resend/Mailgun/SES/SMTP) — §9.1.
- ⬜ **UI "Suscribirme"** (modal → pide email → deriva a la pasarela) — §9.6 paso 1-3.
- ⬜ (opc.) **DB** en vez del JSON-en-PVC si crece el volumen (§9.2).
- **Decisiones abiertas:** qué pasarela, qué email provider (§9.6 "Componentes nuevos").

---

- **Disparador:** en hora pico los modelos **free se saturan** (medido 20-51s → ahora degrada a línea temática
  por el tope de 8s, ver `latencia-chat.md`). Para los que quieran IA **siempre rápida y mejor**, ofrecer un
  **plan pago** que usa un **modelo mejor** (el dev carga crédito en OpenRouter) y **no pasa por el tier free**.

## 1. Tiers

| Tier | Quién paga la IA | Modelo | Latencia | Cómo se identifica |
|---|---|---|---|---|
| **Free** (default) | el dev (pool free) | cadena free `gemma4-free,kimi-free` | variable; degrada a línea temática en pico | nada (todos) |
| **Pago / Sub** | el dev (crédito OpenRouter pago) | modelo **premium rápido (TBD)** + memoria individual por NPC ([[npcs-vivos]] §6, Draft) | baja y estable, sin cola free | **token de entitlement** que el juego manda al proxy |
| **BYOK** | el jugador (su key) | el que elija (su riesgo) | la de su key | su API key en el navegador (ya existe) |

Regla clave: **un usuario pago NO va por el tier free** — el proxy lo rutea a un `model_name` distinto en
LiteLLM (sin los `:free` saturables).

## 2. Qué habilita el plan pago (a cerrar)

- **Modelo premium** rápido y fiable (TBD — ver §5): respuestas <3s estables, mejor calidad/coherencia.
- **Sin degradación**: no cae a la "línea temática por tormenta" salvo caída real.
- **Más memoria/contexto**: historial más largo (más turnos recordados) y/o el oráculo GraphRAG (cuando exista).
- **Memoria individual por NPC** (**F1 HECHO — v373, 2026-07-21** — ver [[npcs-vivos]] §6): cualquier NPC
  con chat (cura, referente, oráculos…) recuerda hechos puntuales del grafo CON ESE jugador vía grounding
  del chat; los oráculos del mapa principal además lo sacan en globito ambiente. 100% data-driven: un edge
  del grafo declara `"npc":"clave"` en su ficha SDD y listo (`tools/gen-historia.mjs`). Alcance acotado a
  NPCs con chat/quest (no decorativos/chusmerío puro, ver §6.1 de ese SDD). Testeado en `tests/e2e.js`.
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

- ¿La sub es **solo IA premium** o también desbloquea **gameplay** (personajes, niveles, skins)? →
  **Parcialmente resuelto (2026-07-21):** la memoria individual por NPC queda del lado IA-premium (no es
  gameplay nuevo, es más contexto para el mismo chat/chusmerío) — ver [[npcs-vivos]] §6. Gameplay puro
  (skins/personajes) sigue sin decisión.
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

#### 👉 PASO A PASO: darle una suscripción a alguien (HOY, manual)

1. **Alguien te paga** (como sea: transferencia / link / lo que arregles aparte — por ahora vos lo manejás).
2. **Le creás el código** — copiá/pegá esto en tu terminal, cambiando SOLO el email (el `TOK` lo saca solo del deploy):
   ```bash
   TOK=$(kubectl get deploy tormenta-ai-proxy -n ai -o jsonpath='{.spec.template.spec.containers[0].env[?(@.name=="GEN_TOKEN")].value}')
   curl -s -X POST https://llm-tormenta-solar.cybercirujas.club/provision \
     -H "X-Gen-Token: $TOK" -H 'Content-Type: application/json' \
     -d '{"email":"PERSONA@gmail.com","limit":2}'
   # → {"code":"TS-AB12CD34", ...}   ← ese 'code' ES la suscripción ('limit' = US$ que puede gastar, OpenRouter la corta sola)
   ```
3. **Le mandás el código** por mail/WhatsApp (a mano).
4. **La persona lo activa**: en el juego → ⚙ Opciones → Suscripción → pega el código → **Activar** → "✓ activa". Chatea premium.
5. **Vos ves cuánto gasta** en Grafana (fila "💳 Suscripciones") — sin hacer nada.

Único "comando" = el paso 2. Cuando esté el pago, ese paso lo hace **solo el webhook** y vos no tocás nada.

> Borrar/revocar un código de prueba (env codes): `POST /sub-codes {code, revoke:true}` con el mismo `X-Gen-Token`.

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

> **F3 HECHO (proxy 0.1.17, pseudo-manual SIN pago):** `POST /provision {email,limit}` (GEN_TOKEN) → crea key de
> OpenRouter con budget vía `OPENROUTER_PROVISIONING_KEY` (Secret `tormenta-or-provisioning`), genera código, guarda
> `código→{email,orKey,hash,limit}` en `/data/subs.json` (PVC Longhorn, fsGroup 1000). El sub provisionado va
> **DIRECTO a OpenRouter con SU key** (`SUB_OR_MODELS`=ids OR) → gasto y tope **reales por usuario** (probado:
> chat 1.1s tier=paid). `GET /sub-spend` (GEN_TOKEN) lee el spend por código de OpenRouter. Códigos `SUB_CODES`
> (env) siguen por LiteLLM (compartido). **Falta:** pasarela de pago + webhook + email automático (§9.1/§9.4) →
> hoy se dispara a mano y el código se manda por mail manualmente.

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
