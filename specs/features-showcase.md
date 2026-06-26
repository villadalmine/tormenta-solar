# SHOWCASE — técnicas interesantes de TORMENTA SOLAR (fuente para la página /info y /tech)

> **Para qué es este doc:** TORMENTA SOLAR **no es "un jueguito" nomás** — abajo hay un montón de técnicas que
> vale la pena mostrar. Este SDD cataloga **todos los features/técnicas** para después armar la página de **info**
> (qué es) y **tech** (cómo funciona el stack). Cada ítem: **qué es** + **por qué es interesante** + **dónde vive**.
> Mantener actualizado cuando se suma algo grande.

## 1. Motor v2 DATA-DRIVEN (todo es objeto + componentes + grafo)
- **Qué:** el juego corre desde un **modelo de datos** (`levels/nivel-1.json`) que un loader (`js/mundo.js`,
  `Mundo.fromModel`) convierte en salas. Las entidades son **componentes** (`interact`, `combat`, `ad`, `social`,
  `ambient`…), no clases rígidas. Pipeline: `js/level.js` (autor) → `tools/gen-level.js` → JSON validado contra
  **`levels/level.schema.json`** → motor.
- **Por qué interesante:** *"todo es API, todo es objeto, todo tiene memoria, todo tiene grafo"* → un nivel nuevo =
  cambiar datos, no código. **Test de PARIDAD v1≡v2** (`tests/parity.mjs`) garantiza que el motor data-driven da
  EXACTO lo mismo que el hardcodeado. Ver `specs/modelo-de-entidades.md`.
- **Despacho por REGISTRY (§6.97):** `NPC_ACTIONS`, `DOOR_HANDLERS`, `QUEST_DEFS/QUEST_PRIMS` — cero `if/else` por
  tipo. **Regla:** *primitiva = código, composición = dato*. Balance también es dato (`rules.survival/player/combat/dollars`).

## 2. La MÁQUINA DE NIVELES por IA + la RED de jugabilidad (lo más novedoso)
- **Qué:** te colás a la trastienda del chino (en el raid) → **se GENERA un nivel** (`js/nivelai.js`) y lo corre **EL
  motor real** (rooms-swap). 7 temas surreales + uno **inventado por IA**.
- **La RED (`js/playable.js`):** un **validador de jugabilidad** valida que el nivel sea **transitable** (puertas no
  tapadas, spawn/meta alcanzables) ANTES de cargarlo. La IA puede proponer 100 layouts; **solo los válidos llegan**.
  Bucle: IA propone DATOS → schema + Playable → si falla, re-pide/auto-repara → `Mundo.fromModel`.
  - *Anécdota mostrable:* la red **caza un bug que metió un humano** (el del ascensor) — regresión en `tests/playable.mjs`.
- **Tema "ORÁCULO" (personalizado):** la IA **inventa un nivel a tu medida** según **lo que charlaste con los
  linyeras** (`oracleMem` → `/nivel-ai` con tus mensajes). La IA elige hasta el **`style`/layout**. Memoria → mundo.
- **Por qué interesante:** generación procedural + IA + **validación formal** = creatividad sin niveles rotos.
  Ver `specs/fabrica-niveles-ai.md`.

## 3. IA del CHAT: oráculos con MEMORIA, grounding del ecosistema y banks vivos
- **Oráculos de la Matrix:** los linyeras chatean por IA (`js/ai.js` + proxy `ai-proxy/`), **recuerdan** lo que
  hablaste (`oracleMem`, agent.memory) y **saben del mundo** (grounding: `worldSnapshot`/`worldBrief` les pasa tu
  progreso + carteles + Mundial → contestan con contexto real).
- **NPCs vivos:** chusmerío ambiente con **globitos** templados por el estado del juego + **grafo social**
  (`entity.social` knows/rival) → relayean rumores ("me dijo X que vos…"). Ver `specs/npcs-vivos.md`.
- **Banks vivos (todo-API):** noticias del cine (Google News + ESPN Mundial), propaganda de marcas, chusmerío —
  **bancos JSON-en-PVC** que llenan **crons** y sirve el proxy, con **fallback estático**. TTS server (espeak-ng)
  para navegadores sin voz.

## 4. MECÁNICAS con vuelta de tuerca (satíricas, data-driven)
- **Dólares como arma (post-tormenta):** el Carpo (homenaje a Pappo: melena, birra) **escupe dólares**; a la GENTE
  la **apaciguan** (se tira a juntar guita, no la matás), a las MÁQUINAS las daña. **Cámaras de seguridad** leen la
  **serie** del billete: **buena = legal** (los robots no te ven unos segundos) / **trucha = te siguen disparando**;
  burbuja con "origen detectado" (valija de Kristina, estafa de la AFA, drogas del cartel, Monopoly…). Contenido en
  `rules.dollars` (DATA). Ver `specs/nivel-1/personajes/protagonista.md`.
- **La caja del chino:** mini-juego de **pago con vuelto en caramelos**, el chino **inventa "inflación"** y te
  quiere cagar; discutís o salen **ninjas**. Tunables = DATA (`CHINO`). Ver `specs/nivel-1/personajes/chino.md`.
- **El edificio:** subís **saltando** una escalera de incendios **o** por ascensor (dos caminos); items que
  **regeneran**. **Truco** criollo real (motor puro testeado, cantos + voces). Arcade (Pac-Man/Galaga/Frogger).

## 5. INFRA reproducible: proxy IA propio, métricas y deploy
- **Proxy de IA propio (`ai-proxy/`, Node puro, sin deps):** cadena de modelos con **tope de latencia**, tier free
  vs **suscripción paga** (BYOK / código), ruteo por hardware (cloud/GPU/NPU). Helm + Argo CronWorkflows + kaniko.
- **Métricas Prometheus → Grafana:** uso real del chat (modelo/backend/outcome + latencia), banks (`eco_bank`),
  métricas del juego. `deploy/deploy.sh` reproducible (maneja el `genToken`).
- **Tests + CI:** `tests/e2e.js` (lógica + auditoría de assets + sub-modos), `tests/levels.mjs` (schema),
  `tests/parity.mjs` (v1≡v2), **`tests/playable.mjs`** (jugabilidad), `tests/web-smoke.mjs` (Chromium real).
  i18n ES/EN completo. Cache-busting `?v=N`.

## 6. Pendiente para la PÁGINA (TODO de presentación)
- Armar **`/info`** (qué es: sátira de Florida/Lavalle, homenaje a los linyeras, ficción) y **`/tech`** (este
  catálogo, con diagramas del pipeline data-driven + la máquina de niveles + la red + el stack IA/k8s).
- Idealmente, **auto-generar** parte de `/tech` desde los SDD (mantener una sola fuente de verdad).
