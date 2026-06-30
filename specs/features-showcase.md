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
  motor real** (rooms-swap). 9 temas surreales + uno **inventado por IA**.
- **La RED (`js/playable.js`):** un **validador de jugabilidad** valida que el nivel sea **transitable** ANTES de
  cargarlo. Reglas: **R1** puerta no tapada · **R2** spawn no enterrado · **R3** meta no enterrada · **R4
  reachability** (BFS de superficies parables con **física de salto real** — se trepa ≤3 tiles, apex ~3.9: ¿se LLEGA
  a la meta/puertas saltando?). La IA puede proponer 100 layouts; **solo los válidos llegan**. Bucle: IA propone
  DATOS → schema + Playable → si falla, **auto-repara** (fallback procedural) → `Mundo.fromModel`.
  - *Anécdota mostrable:* la red **caza un bug que metió un humano** (el del ascensor) — regresión en `tests/playable.mjs`.
- **La IA autora la GEOMETRÍA COMPLETA, no solo el tema:** la IA diseña como DATA las **plataformas** (escalera
  trepable), los **enemigos** (posición + tipo: peatón/dron/pacman/galaga/cuevero) y los **obstáculos** —
  **pinchos** (dañan al tocar) y **pozos** (huecos en el piso que hay que saltar). Todo pasa por la red: **R4**
  reachability (incl. cruzar huecos saltando, ≤2 tiles), **R5** (ningún obstáculo sobre spawn/meta/puerta). Si la
  IA propone algo imposible (un muro infranqueable, dos pozos pegados), la red lo caza y **auto-repara**.
  Creatividad geométrica de la IA **sin niveles rotos**. Test `tests/geometria.js`.
- **Tema "ORÁCULO" (personalizado):** la IA **inventa un nivel a tu medida** según **lo que charlaste con los
  linyeras** (`oracleMem` → `/nivel-ai` con tus mensajes) — name/intro/frases + **style + geometría**. Memoria → mundo.
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
- **Multijugador (cine de Lavalle):** el **8º piso EN VIVO** muestra el **mundo vivo** (cuántos juegan AHORA, en qué
  zona, ticker de hitos; relay in-memory `/salon`). El **9º piso es un BODEGÓN porteño REAL-TIME**: subís y **te
  encontrás con OTROS jugadores** moviéndose en vivo (SSE, interpolados), con su nick, **emotes** (🍻🤝💃🎸) y **frases
  preset** porteñas (sin chat libre → sin moderación). Y el gag de la **rubia y el ropero** (te invita a la trastienda,
  le decís que sí y un patova de dos metros te raja a la vereda). Relay sin autoridad con **degradación total** (sin red
  = bar single-player, nadie nota). Ver `specs/multijugador.md`.
- **Truco PvP humano-vs-humano:** en el bodegón te acercás a otro jugador real sentado en una mesa → **[E] lo invitás
  a jugar al truco** → si acepta, juegan una **partida completa** (envido, flor, truco/retruco/vale cuatro, mejor de 3)
  uno contra el otro, con premio en **flores**. Es **host-autoritativo** (uno corre la partida y valida; el rival nunca
  ve tus cartas) y viaja por el mismo canal del salón, sin servidor de juego aparte. Ver `specs/truco.md §13`.
- **Truco de a 6 (3v3) con relleno de IA:** una mesa "TRUCO 6" en el bodegón → te sentás → se arma un **truco de a 6**
  con los jugadores reales que se sumen y **bots de IA** que completan los asientos vacíos (jugable solo o con gente,
  escala a 6 humanos). Con la **regla de la casa**: la primera ronda la juegan todos (gana la carta más alta), la
  segunda es 1v1 contra el de enfrente, y al llegar a 10 puntos vuelve a jugar todos. Premio en flores al equipo
  ganador; si alguien se va, lo reemplaza la IA y la partida sigue. Ver `specs/truco.md §14`.
- **El Tablón colaborativo (construcción asincrónica, à la Death Stranding):** 2 pisos del cine donde una **computadora**
  te deja **fijar un cartel corto** para el próximo jugador que pase. El cartel **vive en el server hasta que OTRO lo
  LEE** (te parás debajo, **[E]**) → te muestra el texto y **se borra** (consumo-en-lectura). Se dibujan **empaquetados**
  en la pared con la chincheta + el nick (el texto no se ve hasta leer). Banco **server-side en PVC** (un cartel espera
  horas a su lector), cupo + rate-limit + censura básica. **Construís el mundo entre todos, sin verse en vivo.** Ver
  `specs/construccion-colaborativa.md` (C1).
- **El Datacenter colaborativo GLOBAL (meta de comunidad):** otro piso del cine donde **toda la comunidad** construye un
  datacenter para **voltear a la IA del satélite** (el endgame sembrado en `g.win.text`). Aportás **partes** (CPU/GPU/
  disco/red/enfriamiento/energía — DATA, pagás con plata o caramelos del juego) y el **estado es GLOBAL y único**
  (server-side en PVC): la sala dibuja una **maqueta de racks que se encienden** con el progreso de TODOS, con barra y
  "lo arman N jugadores". Anti-grief por diseño: **contribuir solo SUMA** (no se sabotea) + cupos por parte + rate-limit
  → es colaborativo de verdad, uno solo no lo termina. Ver `specs/construccion-colaborativa.md` (D1).

## 4. MECÁNICAS con vuelta de tuerca (satíricas, data-driven)
- **Dólares como arma (post-tormenta):** el Carpo (homenaje a Pappo: melena, birra) **escupe dólares**; a la GENTE
  la **apaciguan** (se tira a juntar guita, no la matás), a las MÁQUINAS las daña. **Cámaras de seguridad** leen la
  **serie** del billete: **buena = legal** (los robots no te ven unos segundos) / **trucha = te siguen disparando**;
  burbuja con "origen detectado" (valija de Kristina, estafa de la AFA, drogas del cartel, Monopoly…). Contenido en
  `rules.dollars` (DATA). Ver `specs/nivel-1/personajes/protagonista.md`.
- **Inventario + la viola que dispara risas:** las armas son **DATA** (registro `WEAPONS`); tenés un **inventario** y
  equipás una con **[I]** (el HUD muestra cuál). El **tesoro del búnker** (cuando sos gurú) te da la **🎸 viola de Les
  Luthiers que dispara RISAS** — apacigua a **cualquiera**, hasta los voladores, muertos de risa 😂 (no los mata). El
  inventario y el arma equipada **persisten en el guardado**. Ver `specs/inventario-armas.md`.
- **El telo, el CHIP y el cambio de personaje:** la "rubia" del bodegón te lleva a un telo (sub-modo top-down) que es
  una **trampa de la IA**: salta un **robot** que te quiere clavar un **chip**. Si escapás, zafás; si te atrapa, caés
  **chipeado** a la habitación con **3 linyeras** (chat IA groundeado SOLO al chip) que te tiran la posta → **CORTE DE
  ESCENA**: te teletransportás al edificio y **pasás a controlar al pibe de Garbarino** (el Carpo queda dormido en la
  cama). Quest data-driven (`CHIP_QUEST`, grafo de pasos + runtime genérico): troyano (Maxi+Marcos) → **consola** (con
  **prereq de ganar el FIFA 98**) → un linyera te **cura**. **Rejugable hasta 3 veces**; a la **4ª** los linyeras
  irrumpen y funden al robot a **rayos cósmicos** (rescate). Ver `specs/telo-chip-quest.md`.
- **La caja del chino:** mini-juego de **pago con vuelto en caramelos**, el chino **inventa "inflación"** y te
  quiere cagar; discutís o salen **ninjas**. Tunables = DATA (`CHINO`). Ver `specs/nivel-1/personajes/chino.md`.
- **El gate del cuevero (truco):** el cuevero que dispara la tormenta **no te vende de una** — está ocupado con el
  tahúr y se abre un **menú de 3 caminos**: pedir ayuda (un linyera te lleva con **Guido**, que juega al truco y le
  gana por vos), arreglártelas vos (le ganás al **truco** real), o irte (dead-end con humor). Recién con el "te
  perdono" del tahúr el cuevero vende y **estalla la tormenta**: el arranque del caos pasa a ser el **final de una
  cadena**, no el atajo del primer minuto. Ver `specs/cuevero-gate-truco.md`.
- **El vecino de los edificios clausurados (historias → nivel):** post-tormenta, al lado de cada edificio clausurado
  hay un **vecino** que te **flashea historias de terror** del edificio (juguetes diabólicos, la llorona, filicidios,
  fiestas eternas, fantasmas). Iterás el chusmerío y te ofrece **"¿querés pasar y ver qué pasó con XXX?"** → la
  **máquina de niveles genera un nivel** con esa última historia como semilla, y al ganarlo **quedás en el interior
  real** del edificio. Contenido **vivo e infinito** sobre lugares antes muertos: las **historias mismas las escribe
  la IA** (un gancho + un relato corto, propios de cada edificio, ES/EN, banco vivo servido por API y refrescado a
  diario) con banco estático de respaldo; y el **nivel** también lo autora la IA, todo con fallback. **El nivel REFLEJA
  la historia:** entrás **al toque** (cache-first), cada relato tiene su **look propio** (paleta + props derivados de su
  motif) y hasta los **enemigos y peligros cambian según el tema** — una casa del *slasher* te tira melee denso, una
  *embrujada* se llena de voladores, el *karaoke de la mafia* trae tiradores, el piso de una embrujada **cede en pozos**.
  Ver `specs/edificios-clausurados-historias.md`.
- **El edificio:** subís **saltando** una escalera de incendios **o** por ascensor (dos caminos); items que
  **regeneran**. **Truco** criollo real (motor puro testeado, cantos + voces). Arcade (Pac-Man/Galaga/Frogger).
- **Tiendas generadas (galería de la cueva):** le hablás a un local (sex-shop, comida rara, masajes, tenebroso) y
  **entrás a su interior generado**; la **IA autora el surtido** — nombre, clientela, productos **y la economía**
  (precio + potencia, **clampados** a rango sano: la IA *sugiere*, el cliente *clampa*, la moneda queda del molde).
  El surtido autorado se **cachea por rubro y persiste** (localStorage), con fallback estático. Ver
  `specs/tiendas-generadas.md`.

## 4.b RESILIENCIA: si la GPU se cae, NO se para nada → modo estático
- **Premisa (dueño):** *"si se me va al tacho la GPU, no se puede parar todo, tiene que ir al modo estático de
  datos"*. Toda feature de IA **degrada a estático** cuando el upstream (litellm → gemma4 en GPU/Ollama) no está.
- **Circuit breaker (`js/nivelai.js`):** si una llamada a `/nivel-ai` falla o tarda (timeout **6s**), se **abre el
  circuito 90s** (`aiDownUntil`) → `requestOraculo`/`enrich` caen a **estático AL TOQUE** (sin esperar timeouts).
  Cuando la GPU vuelve, se cierra solo. Por eso un pod *pending* por GPU no "tilda" la generación de niveles.
- **Niveles normales = síncronos** (estático + procedural); la IA solo **enriquece** el texto (fire-and-forget).
  Solo el tema **oráculo** espera la IA — y con el breaker + fallback a tema normal, nunca cuelga.
- **Banks + fallback** (noticias/propaganda/chusmerío) y **pool local del chat** siguen el mismo principio.

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
