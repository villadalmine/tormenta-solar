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
