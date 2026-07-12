---
name: tormenta-solar
description: >-
  Mapa de arquitectura del juego TORMENTA SOLAR (shooter JS vanilla + Canvas) y de su stack de IA/infra.
  Cargá esto ANTES de tocar el juego o su chat/IA para no re-indagar: módulos js/, el grafo de historia y sus
  hooks (applyEdge/HintEngine/Mensajero), el patrón de capas aditivas, los tests, y el ruteo de modelos
  (cloud/GPU/NPU) + cómo deployar el proxy. Úsalo para features de gameplay, carteles/ads, chat IA, métricas.
---

# TORMENTA SOLAR — mapa de arquitectura (para no re-indagar)

Shooter 2D estilo Doom/plataforma en **JS vanilla + HTML5 Canvas, sin build**. Se sirve estático (GitHub Pages
**y** self-host nginx en el cluster). Lo único que sale a la red es el **chat con los linyeras**.

## ⛔ REGLA #0 (la más importante — dueño, 2026-06-26): TODO en el MODELO v2 REAL, NADA hardcodeado

La premisa del juego: **todo es DATO / API / OBJETO (entidad+componentes) / MEMORIA / GRAFO**, así el **ecosistema
alimenta a la IA y la hace inteligente**. Antes de escribir CUALQUIER feature, preguntate: *¿esto es dato/entidad/
API/memoria/grafo, o lo estoy hardcodeando en game.js v1?* → **hacelo en v2.** Concretamente:
- Contenido (salas/edificios/NPC/carteles/quests) = **DATOS** (`levels/*.json` + schema, `Mundo.fromModel`), NO código.
- Comportamiento dinámico = **componentes + grafo** (quest = bundle de aristas §6.95; `cond` unificado §6.96).
- Texto/líneas = **i18n + pools/APIs** (linyera-pool, `/noticias`, `/propaganda`), NO arrays sueltos en game.js.
- Cada NPC con IA = **memoria** (`oracleMem`) + **grounding del ecosistema** (`worldSnapshot`/`worldBrief`): SABEN
  todo de todo (cine, Mundial, quests, progreso, carteles) — "oráculos de la Matrix". Sumá TODO lo nuevo al snapshot.
- Si por velocidad cableás algo en v1, **anotá la deuda** y plan de migrarlo a v2. Ver `specs/modelo-de-entidades.md`
  (F1-F4 hechos, falta F5) y la memoria `v2-engine-principios`.

## Reglas de oro del repo

- **Capa ADITIVA con `typeof` guard:** cada módulo nuevo se engancha como `if (typeof X !== 'undefined') X.algo()`.
  Si el módulo no está, **el juego anda EXACTAMENTE igual**. Mantené ese patrón (ej. `Ads`, `HintEngine`, `Mensajero`).
- **Cache-busting `?v=N`:** TODOS los `<script>`/`<link>` en `index.html` llevan `?v=N`. Al cambiar cualquier
  `.js`/`.css`, **bumpeá N en todo index.html** (`sed -i 's/?v=NN/?v=MM/g' index.html`). Hoy: **v=94**.
- **i18n ES/EN:** `js/lang/es.js`+`en.js` (UI) y `game.es.js`+`game.en.js` (juego). Texto vía `T('clave')`/`TX()`.
  `I18n.short()` → 'es'|'en'. NUNCA hardcodear texto visible; va a los lang files. El juego es 100% jugable en EN.
- **Sin dependencias** en el cliente ni en el proxy (`ai-proxy/server.js` es Node puro). No metas npm sin avisar.
- **Antes de declarar "listo":** corré `node tests/e2e.js` (headless, 16 scripts + grafo + Mensajero + sub-modos)
  y, si tocaste render/CSS/layout, `tests/web-smoke.mjs` (Chromium real, CI).

## Módulos js/ (qué hace cada uno)

- **game.js** (~62k) — máquina de estados + game loop. Dueño de los **flags** del jugador. Funciones clave:
  - `applyEdge(id, fallbackFlag)` — **punto ÚNICO** de transición del grafo (setea flags vía `FLAG_SETTERS`).
    Es el hook de "qué acaba de pasar" (llama `Mensajero.evento(id)`).
  - `historiaState()` — devuelve el objeto de flags actual (stormed, borrachosHappy, chinoFrontOpen, trucoWon,
    fifaWon, armado, chinoEntered, bunkerUnlocked, hasMegaDrive, hasCementoTicket, sleptOnce…).
  - `currentAt()` — el "lugar" lógico actual (calle/cueva/super/cemento/chino…), que matchea `edge.at`.
  - `start()` — arranque (cablea `Mensajero.init({state,at})`). `reset()` — estado inicial.
- **historia.js** — **GENERADO** por `tools/gen-historia.mjs` desde los bloques ```hist de `specs/nivel-1/**/*.md`.
  **NO editar a mano.** `Historia.edges[]`: `{id, title, at, pre:{flags}, sets:{flags}, hints:{es:[4 niveles],en:[…]}}`.
  Es el **grafo anidado** (12 aristas). Para cambiar la historia, editás los `.md` y regenerás.
- **hint-engine.js** — `HintEngine`: `frontier(state)` = aristas accionables-ahora-y-no-hechas; `next(state,{at,
  insistencia})` = próxima pista con spoiler escalado (0 críptico → 3 directo); `hintText(edge, level)`.
- **mensajero.js** — `Mensajero`: **invocación genérica agente-a-agente** para objetos con frases (carteles,
  banners, NPCs…). `pedir(ctx)→{clase:'pista'|'ambiente'|'reaccion', short, full, src}`; clasifica según
  estado+frontera+último evento. `hablar(full)`/`callar()` = TTS (speechSynthesis ES/EN) para leer al hover.
  Pool de propaganda ambiente vía `window.PROPAGANDA` (proxy `GET /propaganda`), fallback estático. Ver
  `specs/carteles-ia.md`.
- **ads.js** — `Ads`: product placement. Lee `ads/slots.json` + manifiesto (`ads/manifest.json` o
  `window.ADS_MANIFEST`); dibuja creatividades en slots anclados a salas. Métricas de impresión opt-in
  (`window.ADS_METRICS`). Ver `specs/publicidad.md`.
- **ai.js** — `AI`: chat con los linyeras. `PROXY` (proxy del dev, default), BYOK (key del jugador en
  localStorage), o offline. `chat(npc,msg,history)`. `PROXY_TIMEOUT=9s` (tope duro ≤10s). `MODELS`/`currentModel()`.
  Personas server-side en `ai-proxy/personas.js`.
- Otros: **level.js**/**level-data.js**/**mundo.js** (mapa, 38 salas; motor v2 data-driven `Mundo.fromModel`),
  **art.js** (sprites/render ~74k), **arcade.js** (pac-man/galaga/frogger/truco/fighter), **super.js** (el chino),
  **vinilos.js**, **enemies.js**, **player.js**, **audio.js** (`Sfx`), **fx.js**, **input.js**, **i18n.js**,
  **save.js** (autosave serialize/restore), **config.js**, **presence.js**.

## Tests

- `node tests/e2e.js` — headless (vm + node-canvas shim). Carga 16 scripts en orden, corre frames en cada
  sub-modo, valida el grafo+HintEngine+Mensajero, el chino, motor v2. **Si agregás un módulo js nuevo, sumalo a
  `SCRIPTS` en e2e.js.**
- `tests/web-smoke.mjs` — Playwright/Chromium real (render/CSS/layout), corre en CI.

## Stack de IA / infra (resumen — detalle en specs/ y en memoria)

- **Cluster** k3s casero. Borde: **HAProxy en Mac mini G4 / OpenBSD (PowerPC)** hace SNI passthrough → VIP
  `192.168.178.200` (Cilium **Gateway API** compartido, `cluster-gateway`). cert-manager + LE DNS-01 (acme-dns).
- **Proxy del chat** (`ai-proxy/`, Helm chart `ai-proxy/chart`, release `tormenta-ai` ns `ai`): Node puro, expone
  `/metrics` (Prometheus, etiquetado `tormenta_ai_chat_total{model,backend,outcome}` + histograma de latencia),
  `/health`. Imagen vía Kaniko/Argo (`ai-proxy/kaniko-build.yaml`, registry interno **solo resuelve en nodos rk1**).
  Dominio: `llm-tormenta-solar.cybercirujas.club`. Juego self-host: `tormenta-solar.cybercirujas.club` (chart `web/`).
- **LiteLLM** (`litellm-proxy.ai:4000`, master key `sk-…`) hace el pool. Model names: free
  (`gemma4-free` ★ el mejor, `kimi-free`, `deepseek-free`, `gemini-free`, `gpt-oss-free`…), pagos (`cheap`=valor,
  `claude-sonnet`=premium persona, `gpt-4o`), GPU (`local-gpu`=qwen2.5:1.5b; ollama-a/b tienen `gemma2:2b`),
  NPU (`rk1-npu-local`, rkllama). **Evitá modelos de razonamiento para chat** (r1, nemotron-ultra, nemotron leakea
  CoT): over-piensan y rompen personaje.
- **Ruteo por hardware** (decisión, `specs/carteles-ia.md` §0): **chat → cloud** (pago/free-tier/BYOK), NUNCA GPU
  (placas viejas lentas); **carteles inteligentes + banco de propaganda → NPU** (async/batch, pre-generado y
  cacheado); **GPU** (gemma2:2b, ~3-4s) reservada para futuro real-time corto. SSH nodo GPU: `dalmine@192.168.178.90`.
- **Métricas/monitoreo:** `specs/metricas.md` (ServiceMonitor + dashboard Grafana, label `release:
  kube-prometheus-stack`, sidecar Grafana auto-importa ConfigMaps `grafana_dashboard:"1"`). `specs/llm-metrics.md`
  (bench 4h con costo+pagos, `/stats.json`, página `/llm-metrics`, auto-reruteo). GOTCHA: `helm upgrade
  --reuse-values` **ignora defaults nuevos del chart**.

## Specs (SDD) — dónde está cada diseño

`specs/`: `carteles-ia.md` (Mensajero/carteles/NPU+GPU), `llm-metrics.md` (monitoreo modelos+costo+auto-ruteo),
`metricas.md`, `latencia-chat.md`, `suscripcion.md`, `pruebas-modelos.md`/`reporte-modelos.md` (benchmarks),
`hami-gpu-plan.md`, `seguridad.md`, `juego-self-host.md`, `proxy-ia-deploy.md`, `publicidad.md`,
`nivel-1/**` (la historia, fuente del grafo). Convención SDD: `SPEC-template.md`.

## Comandos útiles

```bash
node tests/e2e.js                                  # smoke headless (correr SIEMPRE antes de "listo")
python3 -m http.server 8000                        # servir el juego local
sed -i 's/?v=94/?v=95/g' index.html                # bump cache al cambiar js/css
helm upgrade tormenta-ai ai-proxy/chart -n ai ...  # deploy proxy (ojo --reuse-values, ver gotcha)
kubectl exec -n ai deploy/ollama-a -c ollama -- ollama list   # modelos en la GPU
```
