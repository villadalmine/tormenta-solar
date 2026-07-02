# SDD — AUTOPLAY QA: un bot que JUEGA el juego por partes, en Argo, con reporte → prompt → auto-fix

- **Estado:** **Diseño (marcado por el dueño, 2026-07-02).** Nada implementado aún; este doc es el plan.
- **La idea (dueño, textual):** *"auto play game para probar si anda todo, y que corra en Argo Workflow, bien
  dividido cada pipeline para que pruebe cada parte del juego — así hilar fino qué parte anda y qué no — y generar
  reporte; si falla algo, que sirva de input para un prompt y que se auto-arregle."*
- **Relacionado:** `tests/web-smoke.mjs` (el precedente: Playwright + Chromium en GitHub Actions), `tests/e2e.js`
  (headless, 38 scripts), los diagnósticos con 2 navegadores de esta sesión (multijugador), Argo en ns `kaniko`
  (builds) y ns `ai` (crones), `hermes-agent` (el agente del cluster — candidato para el auto-fix).

## 1. Arquitectura (3 capas)

```
CronWorkflow (Argo, nightly + on-demand)
   └── DAG: una SUITE por PARTE del juego (paralelas donde se pueda)
        ├── 01-boot          ── carga, 0 pageerrors, versión, assets
        ├── 02-calle         ── caminar, interactuar, chino (comprar), arcade
        ├── 03-historia      ── el funnel del grafo: cueva → tormenta → loop → portal (win)
        ├── 04-lavalle       ── entrar, tracker, mini-juegos, juramento, obelisco, satélite
        ├── 05-multi         ── 2 navegadores: se ven, chat privado, mesa 1v1/corte parea
        ├── 06-ia            ── /chat free (cadena → IA o fallback ≤10s), premium (tier paid), personas
        ├── 07-mapas         ── globo (render+pick), plano del búnker (construir/persistir)
        └── 08-apis          ── endpoints del ecosistema: noticias/propaganda/carteles/datacenter/barrio-mem/salón
   └── 99-reporte: junta los JSON de cada suite → reporte.json + reporte.md (+ screenshots en PVC)
        └── si HAY FALLAS → arma el PROMPT DE AUTO-FIX y lo entrega (F3)
```

### Por qué dividido así
Cada suite falla o pasa POR SEPARADO → "hilar fino qué parte anda y qué no". Un fail en `05-multi` con `01-boot`
verde te dice al toque que es el salón, no el juego. Las suites 01-07 usan **Playwright/Chromium** contra **PROD**
(o `TARGET_URL` para preview); la 08 es **curl/fetch puro** (sin navegador).

## 2. Contratos

### 2.1 Cada suite (tests/autoplay/NN-nombre.mjs)
- Corre standalone: `node tests/autoplay/01-boot.mjs` (local = mismo código que en Argo).
- Emite a stdout un **JSON de veredicto** (una línea final `AUTOPLAY_RESULT {...}`):
```json
{ "suite": "04-lavalle", "ok": false, "durMs": 42000,
  "checks": [ {"name": "entrar al piquete", "ok": true},
              {"name": "tracker 5 juegos visible", "ok": true},
              {"name": "mesa corte parea (table-start)", "ok": false,
               "detail": "timeout 15s esperando table-start", "shot": "04-corte-fail.png"} ],
  "logs": ["..."], "pageErrors": ["..."] }
```
- Screenshots de cada fallo → `tests/screenshots/autoplay/` (en Argo: al PVC del reporte).
- Exit code 0 si ok, 1 si falla (para que el DAG marque el nodo rojo).

### 2.2 El reporte (99-reporte)
- `reporte.json` = array de veredictos + metadatos (fecha, versión del juego probada — la lee de `?v=` en prod,
  commit sha). `reporte.md` = humano (tabla ✓/✗ por suite y check).
- Se guarda en PVC (`/data/qa/` del ai-proxy, servido por un `GET /qa/reporte` token-gated) → visible sin kubectl.

### 2.3 El PROMPT de auto-fix (F3 — el diferencial)
Si hay fallas, el reporte se transforma en un prompt listo para un agente (plantilla):
```
Sos el mantenedor de TORMENTA SOLAR (repo villadalmine/tormenta-solar). El QA automático corrió
contra prod vXXX (commit YYY) y FALLÓ:
- Suite 04-lavalle / check "mesa corte parea": timeout 15s esperando table-start.
  pageErrors: [...] · logs: [...] · screenshot: <adjunto/URL>
Reglas: leé specs/lavalle-multijugador.md y specs/autoplay-qa.md antes de tocar; reproducí
localmente (node tests/autoplay/04-lavalle.mjs); NO toques infra que anda (regla del dueño);
arreglá la causa raíz, corré e2e + la suite, y dejá el fix en una rama qa-fix/<fecha> con PR.
```
- **Entrega del prompt (opciones, decide el dueño):** (a) `hermes-agent` del cluster lo toma directo;
  (b) se guarda en `/data/qa/prompt-<fecha>.md` y el dueño lo pega en Claude Code; (c) issue de GitHub
  con el prompt (gh CLI). **F3a arranca con (b)** (cero riesgo), (a) es la meta ("que se auto-arregle").

## 3. Cómo juega el bot (técnica por suite)
- **Driver:** Playwright headless (patrón ya probado en esta sesión: contexts separados = jugadores distintos,
  `addInitScript` para instrumentar, lectura de estado por `page.evaluate` — `window.Salon`, `window.Eventos`,
  `window.Historia`, `#prompt`, `#chat`).
- **Determinismo:** el juego expone seams que ya existen (`Game.serialize/continueGame` para plantar estados:
  p.ej. 03-historia planta `stormed:true` para probar el portal sin jugar 10 min; 04-lavalle planta
  `ts_piqueteWon` completo para probar juramento/obelisco sin ganar 5 juegos reales). Los mini-juegos se prueban
  1 de verdad (corte con failsafe) y el resto por seam.
- **Cuidado con cuotas (denial of wallet propio):** 06-ia usa `X-Session-Id: qa-…` y MÁXIMO 3 chats free +
  1 premium por corrida; nightly = 1 corrida. El resto de las suites no toca la IA.

## 4. Argo (infra)
- **Imagen:** `mcr.microsoft.com/playwright:v1.x-jammy` (node+chromium listos) + `git clone main` (mismo patrón
  que los builds kaniko). Ns `ai` (junto a los crones), PVC compartido para reporte/screenshots.
- **CronWorkflow `tormenta-autoplay`** (p.ej. 05:00 AR diario) + disparo manual (`argo submit` / kubectl create).
- **DAG:** 01→(02..08 en paralelo)→99. `activeDeadlineSeconds` por paso (que no cuelgue como el cron de carteles).
- Nada de esto toca el juego ni el proxy que anda (regla del dueño): es un consumidor externo de prod.

## 5. Fases
- **F1 — suites locales (sin Argo):** `tests/autoplay/` con 01-boot, 05-multi, 06-ia, 08-apis (las de mayor señal,
  reusan código ya probado en esta sesión) + el formato de veredicto + runner local `node tests/autoplay/run.mjs`.
- **F2 — Argo:** imagen + CronWorkflow DAG + PVC + `GET /qa/reporte` en el proxy (aditivo).
- **F3 — auto-fix:** 99-reporte genera el prompt (F3a: archivo para pegar; F3b: hermes lo toma solo).
- **F4 — suites finas:** 02-calle, 03-historia (seams), 04-lavalle completo, 07-mapas.

## 6. Deuda / notas
- Los seams de estado (continueGame/localStorage) hacen el bot RÁPIDO pero menos "humano": complementa (no
  reemplaza) el playtest del dueño.
- El multijugador de 05 crea presencia real en el salón (los jugadores verían al bot "Carpo·QA") → usar espacio
  propio o nick `QA·bot` para que se entienda.
- Flaky: la IA free puede caer a fallback legítimamente (saturación) → 06-ia marca WARN (no FAIL) si el fallback
  es temático y ≤10s (eso ES el diseño); FAIL solo si no responde o rompe formato.
