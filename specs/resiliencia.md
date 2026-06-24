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

- **Estado actual:** `maxconn` ya se subió de **5 → 120** y `timeout queue` a 120s en una sesión previa (el
  backend `cybercirujas_backend` es **1 server compartido** por todos los hosts cybercirujas). Verificar antes de
  retocar.
- **Principio:** el chat es conexión **larga** (~8-9s). `maxconn` no debe ser "lo más alto posible" sino **≈ cuántos
  requests simultáneos el modelo sirve dentro de los 9s**. Más alto que eso → la cola se mueve al modelo y
  **todos** responden lento (peor que fast-fail al Plan B).
- **`timeout queue` corto (1-2s):** con el tope de 9s del cliente, encolar más es tirar la respuesta. Mejor
  rechazar rápido → L2/L3.
- Estas dos perillas son **lo que calibra el stress test §5**: medir la rodilla y poner `maxconn` justo por
  debajo. **Subir a ciegas puede empeorar.**

## 7. Notas

- **No romper el principio:** el cliente jamás bloquea esperando; el tope duro (9s) y el pool garantizan respuesta
  siempre. Plan B es **transparente** (el jugador idealmente no lo nota).
- **Privacidad/medición:** reusar métricas existentes; el stress test es **sintético** (no jugadores reales) y se
  corre en ventana controlada para no ensuciar las métricas de uso real (etiquetar o correr fuera de horario).
- **Prioridad:** iterar **después** del Plan B mínimo (L2 pool) — ese ya cubre el 80% del problema "infra lenta"
  sin necesitar el stress test. El stress test dice **cuándo** se necesita, pero el pool **siempre** ayuda.
