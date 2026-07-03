# 📜 Changelog — Tormenta Solar

Todos los cambios notables del juego. Formato inspirado en
[Keep a Changelog](https://keepachangelog.com/es-ES/). Dos canales de versión:
- **`vN`** = releases del juego, atados al **cache-busting** (`?v=N` en `index.html`): subir `v` = release nuevo.
- **`infra-N`** = cambios de **infraestructura / sitio / deploy** (proxy, self-host, páginas, modelos) que
  NO tocan los archivos del juego, por eso no bumpean `?v`.

El juego es 100% estático; se publica en
[villadalmine.github.io/tormenta-solar](https://villadalmine.github.io/tormenta-solar/).

---

## 🔭 QUÉ FALTA — tracker (actualizado 2026-07-03; lo hecho vive en las entradas de abajo)

### 🖐️ Bloqueado esperando al DUEÑO (no se arranca solo)
- **Pasarela de pago** (`specs/pasarela-pago.md`): research hecho; falta que el dueño abra cuenta **Mollie** (EU)
  o **MercadoPago/dLocal** (AR) → webhook → `/provision`. El entitlement por código YA anda.
- **Seguridad 2º lote** (`specs/seguridad.md`): acotar CORS `*`→orígenes propios, trivy/gitleaks en CI, mTLS —
  toca el proxy que anda → necesita OK explícito.
- **Rotación en LiteLLM / más GPU** (`pruebas-modelos.md §2.7`, `hami-gpu-plan.md`, [[keda-gpu-scaler]]): dominio
  del dueño (config LiteLLM). `gemma3:4b` necesita más GPU.

### 🧪 Validaciones de PLAYTEST pendientes (del dueño, features ya shipeadas)
- **Guardar partida (v291-292)**: morir post-búnker → botón "⏪ volver al último hito"; HARDCORE en ⚙; retomar
  en el celu tipeando el nick completo (`Carpo·XYZ`).
- **Chat UX (v290)**: iconos de espera ☀️⛈️🍷🥩💾🤖, el linyera se acuerda de la idea que te tiró, respuestas
  sin cortar.
- **Corte de escena a Garbarino (v230)** y **regla de la casa del truco 3v3 (v241)**: nunca validados.

### 💻 Listo para codear cuando el dueño diga "dale"
- **Autoplay QA F3b** (`autoplay-qa.md`): hermes-agent toma el `prompt-autofix` SOLO → arregla → PR → deploya con
  `tormenta-deploy`. (Desbloqueado por infra-62; falta el loop del agente.)
- **Deploy on-push** (`deploy-pipeline.md` F3.5): Argo Events + webhook GitHub → push a main = deploy automático.
- **Mapa TAB — pulido** (`mapa-juego.md`): cursor por teclado, minimapa HUD, online por sala.
- **Truco**: contraflor en el 3v3; F4 tabla de skill (opcional).
- **Deuda fina menor**: chusmerío del banco server bilingüe (cron), memoria por-NPC individual (npcs-vivos v2),
  inventario F2 (ítems no-arma con "usar"), host malicioso del truco (relay sin autoridad).

### 💡 Ideas grandes en draft (sin arrancar)
- **Bot de Telegram → Hermes** (`telegram-hermes.md`): manejar el juego desde el chat. Pega fuerte combinado con
  el deploy in-cluster.
- **Spinoff STARGATE** (`spinoff-stargate.md`): SG-1 + Atlantis; el stargate = puerta entre niveles.
- **Propaganda PAGA** con link clickeable que paga al dueño (`carteles-ia.md §9`).
- **Quest mundo-AI** (`quest-mundo-ai.md`) · **Landing /info + /tech** (`landing-info.md`, fuente:
  `features-showcase.md`) · **Memoria de chat persistente** (`memoria-chat.md`, "para analizar").

---

## [v309] — 2026-07-03 — 🚇💳 Estaciones con DATOS al hover + el TÓTEM SUBE del chino (semilla de quest)

- **Hover por estación** en la pestaña SUBTE: tarjeta con **año real de inauguración** (Florida 1930, Lavalle
  1936, Catedral 1937), línea, **recorrido en km** y **pasajeros/día** — y en las 3 estaciones del juego, TUS
  stats: **viajes hechos y plata gastada** (contadores `ts_subte_stats` listos para el F2; arrancan en 0).
- **TÓTEM «RECARGA SUBE» en el chino**: kiosco celeste entre la salida y la caja (sin pisar nada). [E] para
  comprar la tarjeta → **✖ SIN TARJETAS** — "¡se me acabaron las SUBE, pibe! Conseguite una por ahí y acá te la
  cargo" → **semilla de la quest «buscar la tarjeta SUBE»** (`ts_sube_seen`). SDD `subte.md §2.6`.
- FIX: el click en la vista subte ya no pega en nodos invisibles de otras vistas.

## [v308] — 2026-07-03 — 🐛 FIX definitivo del cuadro 💤 SUEÑOS: reubicado abajo-izquierda + truncado por MEDICIÓN

El recuadro seguía cortando el texto (el slice por caracteres asumía un ancho de fuente que varía por browser).
Doble fix: **`measureText` real** para truncar (nunca desborda el borde) + el cuadro se mudó **abajo a la
izquierda** (espacio libre de sobra) con ancho cómodo → las 3 líneas completas sin cortar palabras. Verificado
en ES a 1100/1366/1920.

## [v307] — 2026-07-03 — 🚇 Subte v2: las 3 ESTACIONES DEL JUEGO (decisión) + fixes visuales del playtest

- **Decisión del dueño anotada (`subte.md §2.5`):** las 3 estaciones JUGABLES son **Florida (B)**, **Lavalle (C)**
  y **Catedral (D) — que te deja en PLAZA DE MAYO** (la estación está EN la plaza; sería otro mapa futuro).
  Gameplay F2: bajás por la boca del subte y **viajás entre las tres**. *(Corrección de research: a la Plaza
  también llegan «Plaza de Mayo» de la A y «Bolívar» de la E — la de la ruta es Catedral.)*
- **El plano da MÁS info:** las 3 estaciones del juego con **🚉 + anillo dorado latiendo** y un **panel de
  info** (línea, dónde te deja, "bajás por la boca y viajás entre las 3").
- **Fixes mirando en Playwright:** la línea D ya NO pisa las pestañas (recortada dinámica, arranca bajo el
  header), etiquetas del nudo del trasbordo reubicadas, y el cuadro **💤 SUEÑOS ya no se corta** (más ancho).

## [v306] — 2026-07-03 — 🚇 EL SUBTE (preview): las líneas REALES bajo Florida y Lavalle, pestaña [4] del mapa

Pedido del dueño: "buscá las líneas de metro sobre Lavalle y Florida y armá un mapa subte en una tab — solo las
que tienen ≥2 estaciones cerca; lo dejamos de preview porque quiero meter el subte". SDD nuevo `specs/subte.md`.
- **Research (subte porteño real):** las 3 líneas que cumplen: **C** (estaciones Lavalle + San Martín + Diagonal
  Norte), **B** bajo Corrientes (Florida + L.N. Alem + C. Pellegrini) y **D** (Catedral + 9 de Julio). Afuera A/E/H.
- **Pestaña [4] SUBTE 🚇**: plano esquemático estilo mapa de subte — líneas gruesas con su color real (C azul
  vertical, B roja horizontal, D verde diagonal), estaciones con punto blanco (las CERCA en grande y dorado),
  el trasbordo del Obelisco, **⭐ FLORIDA Y LAVALLE — el juego** señalado entre las 3, leyenda y sello
  **PREVIEW — "próximamente: viajar en subte"**. Todo catálogo DATA (`SUBTE` en mapa.js).
- Futuro en el SDD: F2 estación Lavalle como sala real (S5, lo más profundo) → F3 fast-travel y puertas a
  niveles nuevos → F4 vida subterránea. El bot chequea que la pestaña exista.

## [v304] — 2026-07-03 — 🗺️ Playtest del dueño: el CHINO cajón de primera clase + compuerta ⛏️ + 💤 SUEÑOS + FÁCIL que se nota

4 reportes ("la galería quedó abajo suelta, el chino no está, no hay mención a los niveles auto-creados, no veo
la diferencia del fácil") + el bot ahora los vigila:
- **El chino (y toda puerta de calle sin sala) es un CAJÓN/SILUETA de primera clase** en manzana y skyline, con
  sus quests (la Mega Drive ⭐ aparece ahí) y nota "puerta en la calle". El tick diminuto tapado, muerto.
- **La galería suelta → compuerta única "⛏️ SUBSUELOS"** bajo la calle (agregado de todo lo de abajo: ×6 🔦2/6
  ✅⭐) → click = pestaña [3]. El detalle vive donde corresponde.
- **💤 SUEÑOS (niveles IA)**: categoría propia (columna izquierda) con las 3 entradas del catálogo (trastienda /
  vecino / oráculo) y estado "SOÑANDO: {nombre}" latiendo si estás dentro de un nivel generado.
- **FÁCIL que se NOTA**: chip verde "🎚️ AYUDA FÁCIL" junto a las pestañas + 🔒N contados en cajones/skyline +
  pistas nivel 2 (directas) en tooltips + 🔒 con nombre en pisos.
- **El bot vigila esto**: suite 07 chequea que el chino esté en AMBAS vistas y la compuerta también (además de
  los anti-solapes). Lo que el playtest cazó, la nocturna no lo deja volver.

## [v303] — 2026-07-03 — 🗺️🎚️ AYUDA DEL MAPA en ⚙: DIFÍCIL (?? misterioso) / FÁCIL (todo marcado)

Idea del dueño: "marcar todos los quests con el grafo es una ayuda terrible — poné fácil/difícil en settings y
que el mapa lo lea". Toggle **"Ayuda del mapa 🗺️"** en ⚙ (`ts_ayuda_facil`):
- **DIFÍCIL (default, como hasta ahora):** las quests bloqueadas son un "??" misterioso — sabés que ahí HAY algo,
  no cuál. Las ⭐ te dan el hint críptico nivel 0.
- **FÁCIL (todo marcado):** el mapa muestra TODO con nombre — cajones y skyline con 🔒N contado, tooltips con
  cada quest bloqueada ("🔒 El TESORO de los linyeras — se destraba más adelante") y el zoom de pisos muestra
  también las 🔒 en gris en su piso exacto. La ayuda terrible, opt-in.
- Cómo se marca (para el registro): ✅ = flags de la arista ya en tu estado · ⭐ = frontera del HintEngine
  (requisitos cumplidos, no hecha) · ??/🔒 = el resto del grafo anclado a ese lugar.

## [v302] — 2026-07-03 — 🏙️ Skyline: SOLVER anti-solape (entran todos) + fuera el bolsillo fantasma del telo

Playtest del dueño ("los cuadrados se pisan, hacelos más chicos que entren todos; la habitación del telo nada
que ver — ¿te estás basando en el grafo?"):
- **Solver 1D**: anchos capeados a lo que ENTRA + doble barrido (izq→der, der→izq) → cero solapes garantizado,
  orden oeste→este intacto. El bot lo verifica matemáticamente en cada nocturna (check pairwise en 07).
- **Sí, todo sale del dato — y el dato explicó el bug**: "La habitación del telo" es `theme:'secret'` con una
  sola puerta de SALIDA (se entra por teleport de la quest del chip) → la adopción de huérfanas la colgaba bajo
  la calle. Regla nueva data-driven: **bolsillo secreto adoptado sin puerta de entrada ≠ edificio del mapa**
  (como los spinoffs). Las cuevas del cuevero (no-secretas) siguen adoptadas bien en S4.

## [v301] — 2026-07-03 — 🏙️ Tercera vista: LA CUADRA — el skyline de Florida en perspectiva

Pedido del dueño: "una visión más de arriba/de costado en perspectiva que entre todo con menos detalle; hover =
poco más; click = detalle; una pestaña más como manzana y subsuelos".
- **[1] LA CUADRA:** siluetas de los edificios en su x REAL con **altura = pisos reales** (la torre de 21 del
  abandonado domina el cielo, el cine al medio, los locales bajitos) + cara lateral extruida (perspectiva),
  líneas de piso tenues, brillo por descubrimiento, ⭐ latiendo en la azotea si hay quest / ?? si se esconde
  algo, el Obelisco de fondo, bodegón/telo como cartelitos en la azotea del cine, subsuelos como losas bajo la
  ruta. Nombres de base con presupuesto (si no entra, el hover lo da).
- **Hover = etiqueta FLOTANTE** al lado del mouse (nombre ×pisos 🔦descubierto ✅⭐??) · **click = zoom** al
  detalle de pisos. Pestañas ahora: [1] cuadra · [2] manzana · [3] subsuelos.
- El bot (autoplay 07) también mira el skyline: siluetas ≥8 + captura por corrida.

## [v300 🎉] — 2026-07-03 — 🗺️🧭 Mapa: ORIENTACIÓN espacial + categoría 🎮 MULTIJUGADOR + el bot mira las vistas

Pulido sobre el rediseño (feedback del dueño: "tiene la data pero no orientación; multiplayer afuera; textos
cortados; el zoom Z no hace nada; que el playbook itere mirando"):
- **Orientación:** la COLUMNA de cada cajón es su posición REAL en la calle (oeste→este SIEMPRE; colisión =
  apila en la misma columna) + tick ▾ en la calle marcando cada puerta + línea completa al hover (sin telaraña).
- **🎮 MULTIJUGADOR:** columna propia con INFO real: el piquete muestra **✊n/5 juegos ganados**, el bodegón
  **🃏1v1·6**, gente **👥 online** por espacio (salonLive), quests del grafo (⭐✅) y dónde estás.
- **Textos cortados:** presupuesto en píxeles reales para las quests del zoom (nunca tocan el borde) + barra del
  zoom corrida a la izquierda.
- **[Z] coherente:** dentro de un edificio zoomea ESE edificio; en la calle no hace nada (el click manda). Hint
  del header actualizado (click = zoom · [1] manzana · [2] subsuelos).
- **El bot MIRA el mapa (autoplay 07):** cajones ≥8 SIN solapes (chequeo pairwise), pestañas con hitTest, y saca
  capturas de la vista general y los subsuelos en cada corrida nocturna.

## [v299] — 2026-07-03 — 🗺️🏙️ MAPA REDISEÑADO: de menor a mayor — cajones POR EDIFICIO → pisos → subsuelos

Feedback del dueño: "no ves más allá, se tapan; hacelo por capas: una vista general que REPRESENTE cada cosa y
el zoom para el detalle; el foco es qué descubriste, qué hitos hiciste, y un ?? donde puede haber algo; todo por
el grafo, nada hardcodeado". Rediseño completo de la vista general:
- **Un CAJÓN por edificio** (objeto derivado de los grupos del modelo: nombre = prefijo común de sus salas):
  muestra `×pisos`, **🔦 descubierto v/N**, hitos agregados **✅n ⭐n** y **??** si el grafo esconde una quest
  todavía bloqueada ahí. Borde dorado si hay ⭐, apagado si nunca entraste, punto pulsante donde estás.
- **Flujo en filas parejas** → imposible que se pisen (chau solapados de casa de cambio/arcade/locales); cada
  cajón tira una línea a SU puerta real en la calle. Los de bajo tierra (galería) van abajo de la calle y
  clickearlos abre la vista SUBSUELOS.
- **Jerarquía completa:** general (cajones) → click → PISOS del edificio (nombres + quests por piso) →
  [2] SUBSUELOS (S1-S4). El tooltip del cajón lista sus ⭐ (hint nivel 0), ✅ (título) y el "?? acá se esconde
  algo que todavía no se destrabó…".
- Validado JUGANDO (Playwright 1366×768, capturas de las 3 vistas + click-zoom).

## [v298] — 2026-07-03 — 🗺️⛏️ Mapa en DOS VISTAS: [1] LA MANZANA / [2] SUBSUELOS (playtest del dueño, jugado y mirado)

"Se solapan la casa de cambio, no veo el arcade, las cuevas de los cueveros no están bien — divídelo en dos o que
elijas qué ver. Jugá vos y mirá el mapa." Jugado con Playwright a 1366×768 y arreglado mirando capturas:
- **Pestañas [1] LA MANZANA / [2] SUBSUELOS** (clickeables + teclas): la superficie ya no carga los sótanos y el
  subsuelo tiene su vista GRANDE (calle de referencia + S1 galería / S2 sótano / S3 LAS CUEVAS / S4 las 3 cuevas
  del cuevero lado a lado, con quests nombradas por fila).
- **Cuevas del cuevero ADOPTADAS**: se entra por invitación (sin puerta) → el BFS no las alcanzaba y caían
  huérfanas duplicadas en un rincón. Ahora: huérfana con puerta de SALIDA a una sala anclada adopta su ancla y
  queda un nivel más abajo. Las hermanas (misma fila) se reparten el lugar.
- **Chau pisadas**: las barras que se solapaban (casa de cambio vs edificio, la tira de locales) ahora se
  RECORTAN y quedan adyacentes como una vereda real (label con presupuesto; el hover nombra las angostas).

## [v297] — 2026-07-03 — 🗺️🔦 Backfill de visitadas: tus quests HECHAS prenden el camino recorrido

Para las partidas anteriores al registro de visitas (v289): al abrir el mapa, cada quest HECHA del grafo marca
su sala Y **la cadena de salas que llevan hasta ahí** (parent-chain del BFS del layout) como visitadas → tu
partida vieja arranca con el camino iluminado y los iconos 💬🕹️🛒 donde ya estuviste. Idempotente (corre en
cada apertura, solo suma) y persiste en `ts_visited`. Si tomaste el tesoro, hasta el búnker secreto se revela
(estuviste ahí). Validado con Playwright: 6 flags → 10 salas backfilleadas con el camino completo.

## [v296] — 2026-07-03 — 🗺️🌆 Mapa: se ve el BARRIO ENTERO (el fog tapaba todo) + la puerta del chino + sin pisadas

Playtest del dueño: "no figura ni las cuevas, ni los arcades, ni el chino — ¿está hardcodeado?". No: TODO deriva
del modelo/grafo — pero el fog of war tapaba con '???' lo no-visitado, y el registro de visitas arrancó de cero
en v289 (todo lo explorado ANTES figuraba sin visitar). Fixes:
- **El barrio se CONOCE:** los nombres se ven SIEMPRE (atenuados si no fuiste); '???' muere. Solo las salas
  SECRETAS (búnker, trastienda) siguen ocultas hasta descubrirlas.
- **Las quests ⭐ se ven aunque no hayas ido** — te GUÍAN al lugar (para eso están); los iconos de contenido
  (💬🕹️🛒) siguen apareciendo al visitar (incentivo de exploración).
- **El chino en el mapa:** las puertas de la calle SIN sala destino (sub-modos como el súper) se derivan del
  DATO de la calle → cajita colgante 🛒 en su X real + su label en el tooltip. Cero hardcode.
- **Sin pisadas:** zig-zag anti-solapado en filas apretadas (los locales a nivel calle) + presupuesto de
  etiquetas por fila (si no entra, la barra queda y el hover la nombra) + dibujo ordenado por x.

## [v295] — 2026-07-03 — 🗺️🏷️ Zoom del mapa con quests NOMBRADAS (y el grafo bilingüe: title_en en las 19 aristas)

- **Cada quest con su NOMBRE en el zoom:** al lado del piso aparece "⭐ Ganarte el búnker (gurú…)" / "✅ …"
  (las ⭐ primero, en dorado y negrita; si no entran todas, "+N"). Ya no hay que adivinar qué significa la estrella.
- **El grafo habla inglés:** `title_en` agregado a las 19 aristas en las fichas ```hist → el mapa, el tooltip y el
  botón "⏪ VOLVER AL ÚLTIMO HITO" muestran el título en el idioma del jugador (`chkTitle`/`questTitle`).

## [v294] — 2026-07-03 — 🗺️📍 Mapa: TODAS las quests, en su PISO exacto al hacer zoom (+ la arista del TESORO que faltaba)

Playtest del dueño: "no marca todos los quests — el piso 19 no está, el búnker tampoco, el tipo del tesoro".
- **Anclaje FINO por `sala` (nuevo campo del grafo, data-driven):** las aristas ahora pueden declarar su SALA
  exacta ("piso 19", "búnker") en las fichas ```hist → en el ZOOM cada quest aparece en SU piso: el tótem en el
  P19, el catre y el tesoro en el búnker. En la vista mundo siguen agrupadas en la entrada (overview limpio).
- **Arista NUEVA `tesoro`** (19 aristas): el TESORO de los linyeras no estaba en el grafo → ahora tiene quest con
  hints 4 niveles ES/EN, `grabTesoro` pasa por `applyEdge` (ticker+checkpoint+bus gratis) y `tesoroTaken` entró a
  `historiaState`/`FLAG_SETTERS` → el mapa lo marca ⭐/✅ y los linyeras lo pueden soplar.
- **Normalización de acentos** en el match ("Súper"≈"super", "búnker"≈"bunker") + fallback: quests de sub-modos
  sin sala propia (el súper) anclan a la CALLE (donde está su puerta). **19/19 aristas ancladas** (validado).

## [v293] — 2026-07-03 — 🗺️ Mapa TAB: fixes del playtest del dueño (candados, click-zoom, superposición, pisos marcados)

4 reportes del dueño, 4 fixes en `js/mapa.js` (SDD `mapa-juego.md`):
- **"Todo con candado":** cada quest ahora se ancla a UN SOLO nodo (la ENTRADA del edificio que matchea, no los
  20 pisos) y las **🔒 salen de las barras** — solo se ven ✅ (hecha) y ⭐ (disponible); las futuras aparecen en
  el tooltip al hover con "se destraba más adelante". Los edificios con ⭐ se resaltan en dorado.
- **"Hover sin acción":** **CLICK en un edificio = ZOOM a ese edificio** (nuevo `Mapa.hitTest`); click de nuevo o
  Esc = volver a la manzana (Esc ahora sale del zoom antes de cerrar el mapa). El tooltip avisa "(click = zoom)".
- **"Se superponen abajo":** columnas RESERVADAS para los sub-modos — Lavalle/Obelisco a la izquierda de la calle,
  bodegón/telo arriba a la derecha; las barras del mundo viven entre ambas → nada se pisa. Las cajas de sub-modo
  ahora muestran sus quests (juramento/obelisco ⭐✅).
- **"Marcar los pisos importantes en el zoom":** cada piso lleva su etiqueta (P7/S2) a la izquierda, nombre
  grande, **marcadores 💬🕹️🛒⭐ afuera a la derecha** y fondo resaltado si el piso tiene contenido.

## [v292] — 2026-07-03 — 🪪 FIX cross-device: el sufijo ·XYZ es parte del NICK (tipealo completo en el otro dispositivo)

Agujero cazado por el dueño: el sufijo anti-colisión (`ts_nick_sfx`) era random POR NAVEGADOR → en el celu eras
OTRA identidad y el server nunca encontraba tu checkpoint/memoria. Fix: si en ⚙ tipeás tu nick COMPLETO
("Carpo·A3F", también vale "Carpo#A3F"), se ADOPTA ese sufijo → misma identidad en ambos lados; la anti-colisión
entre personas distintas se mantiene (sin sufijo = random como siempre). Preview con hint ES/EN + maxlength 16.

## [v291 · infra-65] — 2026-07-03 — 💾✊ GUARDAR PARTIDA: checkpoints por HITO del grafo (F1+F2+F3)

"El juego se puso muy difícil" → morir ya no borra la partida. `specs/guardar-partida.md`. Proxy 0.1.87.
- **F1 — checkpoint automático por hito:** cada arista del grafo (`applyEdge`) guarda un snapshot aparte
  (`ts_checkpoint_v1`, con el TÍTULO del hito); al **morir post-búnker** la pantalla de muerte ofrece
  **"⏪ VOLVER AL ÚLTIMO HITO: «…»"** (retomás tu último logro; perdés solo lo suelto desde entonces) además de
  REINTENTAR. El checkpoint NO se re-escribe al morir (sin farmeo). En sub-modos usa el último autosave (≤5s).
- **F2 — pulido:** botón con el nombre del hito, **modo HARDCORE 💀** en ⚙ Opciones (permadeath clásico, para
  puristas), métrica `tel('death',{result:'hito_return'})` → Grafana (cuánta gente lo usa).
- **F3 — cross-device por nick:** el checkpoint viaja al proxy (`GET/POST /checkpoint`, patrón barrio-mem: PVC +
  LRU 500 nicks + cap 32KB + anti-spam 25s) → en un dispositivo nuevo con tu nick, **CONTINUAR aparece solo**
  (el checkpoint se vuelve el save). i18n ES/EN completo; e2e `Game.__chk` (guardar→cargar→re-entrar).

## [tests · 2026-07-03] — 🤖 Autoplay QA F4: el bot ya juega el JUEGO ENTERO (8/8 suites) + SDD guardar partida

- **F4**: 4 suites nuevas — **02-calle** (camina, hints [E], entra/sale por puertas REALES leídas del modelo),
  **03-historia** (planta un save post-tormenta → CONTINUAR → verifica flags del grafo + economía + que la
  frontera del HintEngine avanza + autosave), **04-lavalle** (arco completo: 5 juegos ganados → juramento →
  fiesta → Obelisco → vuelta, con los módulos reales de prod), **07-mapas** (TAB con 51/51 salas ancladas +
  plano del búnker + globo). **8/8 verdes contra PROD**; la nocturna las corre sola desde esta noche.
- ⭐ **SDD nuevo `specs/guardar-partida.md`** (pedido del dueño: "el juego se puso muy difícil"): guardar partida
  YA existe (autosave + Continuar) — el problema es que **morir post-búnker BORRA el save**. Evaluación completa:
  multiplayer NO complica (es efímero), el grafo tampoco (ya se serializa entero). **Recomendación: checkpoints
  automáticos POR HITO del grafo** (cada `applyEdge` → snapshot; morir → "⏪ volver al último hito" en vez de
  perder todo; "empezar de nuevo" queda). Barato (~40 líneas, reusa serialize/restore). Fases F1-F3.

## [infra-64] — 2026-07-03 — 🤖⏰ Autoplay QA F2: el bot juega TODAS las noches en Argo y avisa por Telegram si el juego se rompió

Cierra el pedido original completo ("que corra en Argo Workflow… y que si falla sirva de input para un prompt").
Proxy 0.1.86 — **deployado con el workflow `tormenta-deploy` (dogfooding)**.
- **CronWorkflow `tormenta-autoplay`** (ns ai, 05:00 AR): imagen Playwright multi-arch → clona main → corre las
  4 suites contra PROD → `run.mjs` **publica el veredicto al proxy** (`POST /qa/reporte`, GEN_TOKEN vía Secret
  `tormenta-qa-token` — el PVC RWO no se comparte entre pods, el reporte viaja por POST). Higiene completa:
  PVC longhorn-nvme, GC total, TTLs, `activeDeadlineSeconds`.
- **Proxy**: `POST/GET /qa/reporte` (banco PVC `/data/qa.json` con veredicto + tabla md + **prompt de auto-fix**
  legible sin kubectl) + gauge **`tormenta_qa_failed`** (-1 sin corridas / 0 verde / 1 falló).
- **Alerta `TormentaAutoplayFailed`** (severity warning → Telegram): "el bot encontró el juego roto — el prompt
  de auto-fix está en /qa/reporte". Si el workflow mismo muere, `ArgoWorkflowsFallados` lo agarra igual (doble red).

## [infra-63] — 2026-07-03 — 🐛 FIX cron de carteles: gen-carteles.mjs NUNCA estuvo en la imagen (primera caza de la alerta nueva)

La alerta `ArgoWorkflowsFallados` (infra-62) se disparó apenas aplicada: el cron `tormenta-ai-proxy-carteles`
venía fallando **cada 6h desde C2 (v234)** con exit 1 silencioso — el `COPY` del Dockerfile enumeraba los
generadores A MANO y `gen-carteles.mjs` quedó afuera ("Cannot find module"). Fix: **`COPY gen-*.mjs` con
wildcard** (nunca más enumerar). Proxy 0.1.85 — deployado con el **workflow nuevo `tormenta-deploy`** (su
estreno con un cambio real).

## [infra-62] — 2026-07-03 — 🚀 Deploy como Argo Workflow (F3): in-cluster, con rollback automático y alerta a Telegram

El dueño dio el OK con 4 condiciones: no romper nada, no exponer secrets, no cambiar la lógica, y que si falla
se entere SOLO (sin mirar). `specs/deploy-pipeline.md §3.1`. Proxy 0.1.84.
- **WorkflowTemplate `tormenta-deploy`** (`deploy/argo/workflowtemplate-deploy.yaml`, ns ai): params
  `component=proxy|web` + `tag`; pasos = LOS MISMOS de deploy.sh (clona main → build kaniko con fallback al pod →
  `helm -f values-prod` → rollout → smoke interno) + **ROLLBACK AUTOMÁTICO** a la revisión anterior si la
  verificación falla. genToken re-leído del release EN el pod (variable, jamás impreso; sin `set -x`). Storage
  según la regla §5 (PVC longhorn-nvme + GC total). Wrapper `deploy/deploy-argo.sh`; **deploy.sh queda intacto
  como fallback**.
- **RBAC mínimo** (`deploy/argo/rbac.yaml`): SA `tormenta-deployer` con Roles enumerados desde el contenido REAL
  de los releases (ns ai + certificates en ns gateway + workflows en ns kaniko). Cero cluster-admin.
- **"Me entero solo"** (`deploy/argo/monitoring.yaml`): el workflow reporta a **`POST /deploy-log`** (nuevo en el
  proxy, GEN_TOKEN, banco PVC + `GET /deploy-log` auditable) → gauge **`tormenta_deploy_failed{component}`** en
  `/metrics` → PrometheusRule `TormentaDeployFailed` (severity warning) → **la ruta existente de Alertmanager ya
  manda warning|critical al Telegram del dueño** (receiver telegram-openclaw), con resolved al recuperarse.
  + ServiceMonitor del workflow-controller de Argo (v4, HTTPS) y alerta `ArgoWorkflowsFallados` (cualquier
  cron/build/deploy fallado tirado >30m — al aplicarla ya cazó 2 corridas colgadas del cron de carteles).
  Y si el deploy rompe el proxy entero, el `TargetDown` del stack alerta igual.
- **PROBADO EN LOS 2 CAMINOS (2026-07-03):** estreno real proxy 0.1.85 → Succeeded 2m17s; simulacro de falla
  (smoke a ruta inexistente) → 3 reintentos → **rollback automático** (prod intacto) → Failed → gauge 1 →
  **TormentaDeployFailed FIRING → Alertmanager la ruteó a telegram-openclaw** (verificado por API) → deploy bueno
  → resolved. El RBAC se completó con lo que el run real destapó (hooks de helm ocultos a `helm get manifest`,
  replicasets para `--wait`, anti-escalada del hook): `deploy-pipeline.md §3.2`.

## [v290 · infra-61] — 2026-07-02 — 💬 Chat linyera UX: ideas que quedan PICANDO + iconos de espera + FIX respuestas cortadas

Dos pedidos del dueño + un reporte ("responden muy largo y se corta — yo los acorto"). SDD `specs/chat-linyera-ux.md`.
- **Ideas que quedan picando** (`js/ideas.js`, aditivo): si el linyera te sugiere algo ("andate al cine") NO hace
  falta contestarle — la idea queda registrada (`ts_ideas_v1` + memoria del barrio) y en la próxima charla el
  grounding se lo recuerda ("fue idea TUYA, seguila"); cuando el bus de eventos dice que la HICISTE, te lo festeja
  ("¿viste que el pibe me hizo caso?"). Catálogo DATA de 9 ideas (cine/truco/piquete/obelisco/datacenter/carteles/
  arcade/búnker/chino), colgado de `evlog`. i18n `g.idea.*` ES/EN + test e2e (`ideas:ok`, 40 scripts).
- **Iconos de espera**: mientras la IA piensa (2-11s) la línea `...` ahora CICLA los iconos del mundo
  ☀️⛈️🍷🥩💾🤖 con puntitos (`chatThinking()`/`THINK_ICONS`) — se ve que está esperando, no colgado.
- **FIX "se corta"** (causa raíz: `max_tokens: 120` cortaba a mitad de frase cuando el modelo escribía largo):
  ahora 220 tokens de aire + `tidyReply()` — si igual el finish fue por length, recorta a la última frase COMPLETA
  (o cierra con "…"); espejado en el proxy (0.1.83) y en el camino BYOK del cliente (`js/ai.js`).

## [v288-v289 · infra-60] — 2026-07-02 — 🛡️✊🗺️ Anti-NaN + respawn peronista + tracker [H] + EL MAPA del juego (TAB)

*(Entradas retroactivas — los commits salieron sin su renglón acá.)*
- **v288 · infra-60**: anti-NaN de `specs/estado-jugador.md` (`sanePlayer()` central en restore/loop/pre-save +
  `num()` fail-closed en TODAS las compras + higiene del `ts_shopCache_v1` + evento/métrica `nan` por campo al
  dashboard); **respawn peronista** (morir SIN búnker → despertás en el piquete: "te teletransportaste como un RAYO
  SOLAR", hp 50 + chori, el save NO se borra); **tracker del piquete** ocultable con [H] + se limpia solo cuando el
  grafo dice juramento hecho. Proxy 0.1.82 (whitelist `nan`/`arcade`/`playtime`).
- **v289**: **EL MAPA (TAB)** — `js/mapa.js`, automap estilo DOOM del corte de la manzana: calle + edificios por
  pisos + subsuelos + sub-modos colgados, TODO del modelo v2 (x reales de las puertas + BFS del wiring); "ESTÁS
  ACÁ" parpadeante, hover con hint nivel-0, zoom por edificio [Z], fog of war por salas visitadas, marcadores del
  grafo (quests ✅/⭐/🔒, 💬 NPCs IA, 🕹️ juegos, 🛒 tiendas). 51/51 salas ancladas en e2e.

## [infra-48] — 2026-07-01 — 🎛️ Tiers de IA claros (Free/Premium/BYOK) + FIX anónimo no llegaba al pago + /provision con código propio

Ordenar y documentar el ruteo del chat (el dueño pidió dejarlo claro por escrito). Proxy 0.1.70.
- **SDD nuevo `specs/ia-tiers.md`** (fuente única): 3 tiers — **Free/anónimo** (key compartida hermes → LiteLLM →
  cadena free→pago), **Premium** (código `TS-PREMIUM-…` con key PROPIA de OpenRouter, DIRECTO, trackable por usuario),
  **BYOK** (key del jugador, directo). Diagrama de decisión + runbook + métricas por tier.
- **FIX anónimo caía siempre a fallback:** `AUTOPILOT=1` metía 2+ modelos free adelante y con PER_MODEL 6s / budget
  10.5s **nunca llegaba al pago**. Ahora **`AUTOPILOT=0`** → cadena estática `gemma4-free → gemma4-paid → claude-sonnet`
  (free primero, PAGO nuestro asegurado como red). "Si no pone nada, usa nuestra key paga" ahora sí funciona.
- **`/provision` acepta `code` propio** (+ `force`): permite crear los `TS-PREMIUM-…` con su propia key de OpenRouter
  (antes solo autogeneraba `TS-<hex>`). Así el premium es OpenRouter DIRECTO y trackable por código (lo que el dueño
  quería: métricas por usuario).
- Solo proxy 0.1.70 (+ values-prod AUTOPILOT).

---

## [infra-45] — 2026-07-01 — 📊 Métricas del online: dónde están, lobbies y partidas de mini-juego + dashboard Grafana

Observabilidad del multijugador (para "ver qué pasa" en vivo). Solo proxy (0.1.67), sin tocar el cliente.
- **Nuevas métricas en `/metrics`:** `tormenta_players_by_sala{sala}` (DÓNDE está cada jugador online: calle/cueva/
  lavalle/bodegon/…), `tormenta_minigame_lobby{game}` (sentados esperando en un lobby, por juego: 1v1/6/corte) y
  `tormenta_minigame_starts_total{game}` (counter de partidas iniciadas). Se suman a `tormenta_players_online` y
  `tormenta_players_realtime{space}` (infra-44).
- **Dashboard Grafana nuevo** `ai-proxy/chart/dashboards/tormenta-online.json` (ConfigMap auto-importado por el sidecar,
  label `grafana_dashboard`): "Jugando ahora", "online en el tiempo (cuándo)", "en vivo por espacio", "dónde están"
  (donut por sala), "en lobby de mini-juego", "partidas iniciadas / hora".
- Validado local: `players_online`, `by_sala{lavalle/calle}`, `minigame_*` responden. Queda listo para instrumentar la
  Fase 2 (el beat reportará `lavalle:corte` al entrar al mini-juego).

---

## [v267 · infra-55] — 2026-07-01 — 🎮 Playtest del dueño: reworks de los mini-juegos del piquete

Iteración sobre los 5 mini-juegos con feedback del dueño:
- **Aguantar el corte:** MÁS RÁPIDO escalando con jugadores (`speedMul`, olas más veloces y seguidas); **conteo** de lo
  que falta ("Ola n/3 · faltan X"); y **JEFE FINAL: ROBOCOP** 🤖 tras las 3 olas → se activa el **RAYO SOLAR**, [E] le
  disparás hasta fritarlo (guests por `lv-ray`). Robocop rompe la barricada si llega → hay que matarlo con el rayo.
- **La soga → "EMPUJAR EL PATRULLERO":** reskin (no pegaba con el piquete). Ahora empujás un **patrullero** contra una
  **barricada de canas MORFANDO** (empujan flojo). Mismo motor, otra piel + tema.
- **Reparto de la olla — REDISEÑO:** los vecinos **se acercan** en cola; cada uno pide un plato — 🌭 chori a la
  pomarola / 🍲 guiso / 🥘 locro — y servís con **[1]/[2]/[3]**; caen **canas 🚓 y políticos 🎩 colados a los que NO hay
  que dar de comer** (penaliza). 3 ollas dibujadas.
- **Pintar la pancarta — REDISEÑO:** ahora es **pintar-por-color**: la pancarta dice **VIVA PERÓN** (letras de
  plantilla), **elegís color [1] celeste / [2] blanco** y pintás cada celda del color correcto (los de la bandera).
- **Lobbies MÁS RÁPIDOS (infra-55, proxy 0.1.77):** las mesas co-op de Lavalle arrancan la cuenta en **3s** (antes 8s)
  → entrás casi al toque; el truco de 6 sigue en 8s (juntar gente).
- e2e (todos terminan/renderizan) + i18n ES≡EN. Cache **v267**.

---

## [v266 · infra-54] — 2026-07-01 — 🎨 Lavalle: 5º mini-juego co-op "PINTAR LA PANCARTA" + SET COMPLETO (5 juegos)

Quinto y último del set. Entre todos PINTAN la pancarta gigante: movés el pincel (WASD) y pintás las celdas de la tela;
llenás ≥90% antes de que se acabe el tiempo → GANÁS. Colaborativo: cuantos más pinten, más rápido. Host-authoritative
(`js/pancarta.js`): cada jugador postea la pos de SU pincel (Salon.pos); el host pinta las celdas bajo CADA pincel y
transmite la grilla (`lv5-state`). Jugable solo.
- **Lobby:** [E] a la derecha del piquete → mesa `pancarta`. **infra-54 (proxy 0.1.76):** espacio lavalle con las 5
  mesas: `corte` + `soga` + `bombo` + `olla` + `pancarta`.
- **🎉 SET COMPLETO — 5 mini-juegos co-op del piquete**, cada uno con su gather point y su mecánica distinta:
  ✊ corte (defensa) · 🪢 soga (mash) · 🥁 bombo (ritmo) · 🍲 olla (reacción) · 🎨 pancarta (pintar en movimiento).
- `js/pancarta.js`, `js/game.js` (startPancarta + onTable + `lv5-*` + dispatch + 5º gather point), i18n `g.pancarta.*` +
  `g.lavalle.pancaHint` (ES≡EN), e2e. Cache **v266**.

---

## [v265 · infra-53] — 2026-07-01 — 🍲 Lavalle: 4º mini-juego co-op "REPARTO DE LA OLLA" (reacción)

Cuarto mini-juego del piquete. Los vecinos hacen COLA con hambre (barra de paciencia que baja); apretás ESPACIO/E para
servirle un plato al MÁS URGENTE. Servís 12 → GANÁS; si se van 6 con hambre (enojados) → PERDÉS. Host-authoritative
(`js/olla.js`): el host spawnea la cola, corre la paciencia y sirve (propio o por `lv4-serve` de un guest); transmite
(`lv4-state`). Jugable solo; la demanda (spawn) escala con la cantidad de jugadores.
- **Lobby:** [E] EN LA OLLA popular (centro-izq del piquete) → mesa `olla`. **infra-53 (proxy 0.1.75):** espacio lavalle
  con mesas `corte` + `soga` + `bombo` + `olla`.
- `js/olla.js`, `js/game.js` (startOlla + onTable 'olla' + `lv4-*` + dispatch + 4º gather point), i18n `g.olla.*` +
  `g.lavalle.ollaHint` (ES≡EN), e2e (sirviendo gana / sin servir pierde). Cache **v265**.
- **4 mini-juegos del piquete listos** (corte + soga + bombo + olla); falta Pintar la pancarta.

---

## [v264 · infra-52] — 2026-07-01 — 🥁 Lavalle: 3er mini-juego co-op "BOMBO & CUMBIA" (ritmo)

Tercer mini-juego del piquete. Tocás el bombo AL RITMO (ESPACIO/E en el pulso, el anillo verde) para subir EL AGUANTE
del piquete; buen timing + combo = mucho aguante, fuera de ritmo = poco; el aguante decae. Llenás la barra antes de que
se corte la cumbia → GANÁS. Host-authoritative (`js/bombo.js`): cada cliente juzga SUS taps contra su propio pulso y
manda el aporte (`lv3-tap`); el host suma el aguante global, corre el reloj y transmite (`lv3-state`). Jugable solo.
- **Lobby:** [E] abajo-DERECHA en Lavalle → mesa `bombo`. **infra-52 (proxy 0.1.74):** espacio lavalle con mesas
  `corte` + `soga` + `bombo`.
- FIX (mismo patrón que soga): el aguante llegaba a 100 pero el decay lo bajaba antes del chequeo → nunca ganaba; ahora
  chequea la victoria ANTES del decay.
- `js/bombo.js`, `js/game.js` (startBombo + onTable 'bombo' + `lv3-*` + dispatch + 3er gather point), i18n `g.bombo.*` +
  `g.lavalle.bomboHint` (ES≡EN), e2e (tocando gana / sin tocar pierde). Cache **v264**.

---

## [v263 · infra-51] — 2026-07-01 — 🪢 Lavalle: 2º mini-juego co-op "LA SOGA" (tug of war contra el desalojo)

Segundo mini-juego del piquete (specs/lavalle-multijugador.md §6). El piquete (todos los jugadores) tira de la soga
contra el DESALOJO (bots que escalan con la cantidad de humanos). Apretás ESPACIO/E rápido = tirás; llevás la soga a tu
lado → GANÁS; te arrastran → PERDÉS. Host-authoritative (`js/soga.js`): el host es dueño de la posición de la soga
(sus tirones + los de los guests por `lv2-pull` + la fuerza del bot) y la transmite (`lv2-state`). Jugable solo (vs bots).
- **Lobby:** en Lavalle, [E] abajo-izquierda → mesa `soga` (server, arranca solo o hasta 6). **infra-51 (proxy 0.1.73):**
  espacio lavalle ahora tiene mesas `corte` + `soga`.
- `js/soga.js`, `js/game.js` (startSoga + onTable 'soga' + ruteo `lv2-*` + dispatch + 2º gather point), i18n `g.soga.*` +
  `g.lavalle.sogaHint` (ES≡EN), e2e (pierde sin tirar / gana tirando fuerte). Cache **v263**.

---

## [v260-262] — 2026-07-01 — 🐛🔧 FIX RAÍZ del multijugador: salon.js cargaba DESPUÉS de game.js

**El bug que rompía TODO el multijugador** (lo pescó el dueño: "esto pasa en todos los salones"). En `index.html`
`js/salon.js` se cargaba DESPUÉS de `js/game.js`, así que en la init de game.js `Salon` era `undefined` y las líneas
`Salon.onWhisper(onPeerWhisper)` / `Salon.onTable(onTable)` **NUNCA se registraban** → los whispers ENTRANTES y los
eventos de mesa (`table-start`) se descartaban silenciosamente. Efectos: **chat privado del bodegón no recibía**, el
**pareo de mesas del truco** (1v1/a6) fallaba, y en Lavalle no llegaba el chat ni arrancaba el mini-juego.
- **FIX:** mover `presence.js` + `salon.js` ANTES de `game.js` en `index.html`. Verificado con 2 navegadores reales
  (Playwright, contextos separados): el whisper entrante ahora dispara `onPeerWhisper` y **el chat se auto-abre con el
  mensaje** del otro jugador. Un solo cambio arregla bodegón + truco + Lavalle. Cache **v262**.
- (De paso: `[E]` sobre el jugador online en Lavalle ya alineado, v258.)

---

## [v259 · infra-49] — 2026-07-01 — ✊🔥 Lavalle FASE 2: "Aguantar el corte" (mini-juego CO-OP multijugador)

El mini-juego co-op del piquete (specs/lavalle-multijugador.md §3). 2/4/6 jugadores (o vos solo) defienden la BARRICADA
de olas de DESALOJO (la yuta) que bajan desde el Obelisco: las frenás con el CUERPO (chocarlas las stunea y empuja);
si una llega a la barricada le baja HP. Aguantás 3 olas → GANÁS; HP 0 → PERDÉS.
- **Host-authoritative** (como el truco): host = seats[0] simula (enemigos + HP, seed compartido) y transmite el estado
  por whisper (`lv-state`); los guests renderizan. Las posiciones viajan por `Salon.pos` (el host las usa para el choque).
  Módulo nuevo `js/piquete.js` (degradable: sin red = co-op de a uno).
- **Lobby:** en Lavalle, [E] contra la **barricada** (arriba) → te sentás a la mesa `corte` (server-authoritative,
  reusa el pareo del truco). **infra-49 (proxy 0.1.71):** la mesa `corte` arranca por cuenta regresiva desde **1 jugador**
  (`CD_MIN`, es co-op) o al llenarse (6). Overlay "esperando compañeros…". Al terminar volvés al piquete top-down.
- `js/game.js` (startPiquete + onTable 'corte' + ruteo `lv-*` + dispatch + lobby en Lavalle), i18n `g.piquete.*` +
  `g.lavalle.corteHint` (ES≡EN), e2e (host termina win/lose + guest aplica estado). Cache **v259**.

---

## [v258] — 2026-07-01 — 🐛 FIX Lavalle: el [E] sobre el jugador online no aparecía (coords de peers desalineadas)

Los peers se dibujaban y detectaban con un offset de +0.5 tile que no aplica a su posición real (el centro, igual que
tu jugador) → nunca quedabas "lo bastante cerca" de forma consistente. Alineado (draw + detección usan la pos tal cual,
sin +0.5) + radio de detección 1.6→2.0. Ahora aparece "[E] chatear con {n}". Solo cliente. Cache **v258**.

---

## [v257] — 2026-07-01 — 💬 Lavalle: chat privado con el jugador ONLINE ([E] sobre un peer)

Ya se ve al otro jugador en el piquete y no se traba; faltaba poder HABLARLE. Ahora [E] cerca de un jugador online
→ **chat privado por whisper** (como en el bodegón). Al cerrar volvés a Lavalle. Prioridad del [E]: primero el peer
(chat privado), después el linyera peronista (chat IA). Los whispers ENTRANTES estando en Lavalle también abren el chat.
- `js/lavalle.js` (detección de peer cercano + `openPeerChat` getter), `js/game.js` (wire + onPeerWhisper para `lavalle`),
  i18n `g.lavalle.peerChat` (ES≡EN). Solo cliente. e2e + paridad + headless OK. Cache **v257**.

---

## [v256] — 2026-07-01 — 🐛 FIX Lavalle: entrar con 's' apretada te sacaba al instante (y parecía "no puedo entrar")

Segundo caso del bug de teclas: si salías del piquete caminando con **'s' apretada**, al re-entrar spawneabas cerca
del borde de abajo y la 's' te empujaba fuera **al instante** → parecía que "no se podía entrar más" (entrabas y salías
en el mismo frame).
- **FIX (`js/lavalle.js`):** la salida por caminar-hacia-abajo se **ARMA recién cuando entraste al piquete** (subiste
  por encima de la fila del corte); entrar con una tecla apretada ya NO te expulsa. Spawn un poco más arriba + `Input.clear()`
  al entrar y al salir de Lavalle (game.js).
- Solo cliente. e2e OK. Cache **v256**.

---

## [v255] — 2026-07-01 — 🐛 FIX "se movía solo y salía de Lavalle" (tecla trabada al abrir el chat) + no podía volver a entrar

Playtest: en Lavalle, al hablar con el linyera peronista, el Carpo "se movía solo y salía", y después no se podía
volver a entrar. Causa: si venías CAMINANDO (tecla apretada) y abrías el chat, el input tomaba el foco y el `keyup`
de esa tecla lo tragaba el guard de tipeo de `input.js` → la tecla quedaba **trabada en `true`** → al volver del chat
el jugador se movía solo (y si era ↓, cruzaba el borde y salía del piquete); la salida + la tecla trabada trababan la
re-entrada.
- **FIX (`js/input.js`):** `Input.clear()` (suelta todas las teclas) + se llama al **abrir y cerrar el chat**
  (`openChat`/`openPeerChat`/`closeChat`) y en `window blur`. La re-entrada a Lavalle no tiene bloqueo: con las teclas
  destrabadas, caminás a la izquierda y entrás de nuevo.
- Solo cliente. e2e OK. Cache **v255**.

---

## [v254 · infra-44] — 2026-07-01 — 🐛 Lote playtest: nombre en Opciones + presencia online (Grafana) + contador en Lavalle

Tres cosas del playtest del dueño:
- **FIX ⚙ Opciones — no dejaba escribir el nombre:** el atajo global tecla **"o"** (abre/cierra Opciones, `js/config.js`)
  no chequeaba si estabas tipeando → al poner una "o" en el nombre, se cerraba el panel ("dos letras y chau"). Ahora
  el atajo ignora los `input/textarea/select`.
- **Presencia "quién está jugando" (Grafana):** (1) el latido `/salon/beat` ahora late en **cualquier estado de juego**
  (intro cerrada), no solo `playing` → en sub-modos (Lavalle/bodegón/arcade) ya no caés a 0. (2) **infra-44 (proxy 0.1.66):**
  `/metrics` expone **`tormenta_players_online`** (latidos en los últimos 35s) + **`tormenta_players_realtime{space}`**
  (conectados al relay en vivo, bodegón/lavalle) → **ahora Grafana SÍ puede graficar quién juega** (antes no existía la
  métrica, por eso no lo veías).
- **Lavalle: contador 👥 en la barra** — muestra cuántos estamos en el piquete ("👥 1 (solo)" vs "👥 3") → feedback
  directo del multijugador (además de ver a los peers caminar).
- **Nota multijugador:** el relay anda (validado con 2 clientes + `/salon/debug`); si "no ves a nadie" es porque los
  otros dispositivos no están **dentro del sub-modo de Lavalle** al mismo tiempo — el contador 👥 ahora lo evidencia.
- e2e + headless OK. Cache **v254**.

---

## [v253 · infra-43] — 2026-07-01 — 🐛 FIX Lavalle multijugador: el "fantasma que te perseguía" eras VOS

Playtest del dueño: *"no veo nada multiplayer, a veces se mueve solo y me persigue alguien"*. Era el **eco de tu propia
posición**: el `salon-server` retransmite `peer-pos`/`peer-join`/`say` a **todos** los subs (incluido el que lo mandó),
y el cliente se agregaba **a sí mismo** como peer → un doble que te seguía (más obvio en Lavalle, donde solés estar solo).
- **FIX (`js/salon.js`):** ignorar los eventos cuyo `pid` es el mío (`d.pid === pid → return`) en `peer-pos`/`peer-join`/
  `say`. Solo → no ves ningún peer (correcto); con otro conectado, lo ves caminar. (Para ver multiplayer hacen falta 2
  navegadores en Lavalle.)
- **`ai-proxy` (infra-43, 0.1.65):** el clamp de `y` de `/salon/pos` sube 12→14 (cubre la altura de Lavalle, H=15; antes
  los peers de abajo quedaban pegados a y=12).
- **Nota chat IA:** el linyera peronista **responde bien en personaje** cuando el pool contesta; los "no anda" son el
  **pool free saturado** (tarda 30-40s y el cliente corta a ~9s → fallback). No es específico del peronista (le pasa a
  todas las personas ahora). Palanca = ruteo a modelo más rápido/pago (decisión de infra).
- e2e + headless OK. Cache **v253**.

---

## [v252 · infra-42] — 2026-07-01 — ✊👥 Lavalle MULTIJUGADOR (Fase 1): te ves con los otros en el piquete

Arranca **Lavalle como zona multijugador** (SDD `specs/lavalle-multijugador.md`). El multijugador es la capa de
presencia (SSE del `salon-server`), **NO va por el grafo** — igual que el cine y el bodegón.
- **ESPACIOS en el salon-server (infra-42, proxy 0.1.64):** `POST /salon/join` ahora acepta `space`
  (`'bodegon'` default | `'lavalle'`); cada espacio tiene su **pool de rooms** y su set de **mesas** (bodegón: 1v1/6;
  lavalle: `corte`). Retro-compatible (sin `space` = comportamiento actual). Mesas por-cuenta-regresiva generalizadas
  (`CD_TABLES`). `/salon/debug` muestra el `space` por room. Validado local: bodegón y lavalle caen en pools separados.
- **Fase 1 (verse + juntarse):** al entrar a Lavalle te unís al espacio `lavalle` (`Salon.join(..., 'lavalle')`),
  posteás tu posición real y **ves a los otros jugadores caminando** por el piquete (interpolados, con su nick + emote),
  mezclados con la multitud. Aditivo: sin red, queda la **postal single-player** (multitud + peronista).
- **Próximo (Fase 2):** el mini-juego co-op **"Aguantar el corte"** (defender la barricada de las olas de desalojo,
  2/4/6 jugadores; host-authoritative con la mesa `corte`). Diseño en `specs/lavalle-multijugador.md §3`.
- `js/salon.js` (`join(...,space)`), `js/game.js` (join/leave en `enterLavalle`), `js/lavalle.js` (pos + peers).
  e2e + headless OK. Cache **v252**.

---

## [v251 · infra-41] — 2026-07-01 — ✊🇦🇷 Lavalle: multitud en 3 hileras + lienzo "VIVA PERÓN" + el LINYERA PERONISTA (chat IA)

Iteración de la postal del piquete y **primer NPC chateable de Lavalle** (roadmap E5):
- **Multitud en 3 HILERAS** (`CROWD_ROWS` con escala/alfa por fila): la de atrás chica y tenue, la de adelante a tamaño
  real → **sensación de profundidad**, el piquete se ve más lleno (`smallFolk` ahora escala por hilera).
- **Abanderados en cada PUNTA**: un piquetero con la **bandera argentina** en cada extremo de la fila.
- **Lienzo largo "VIVA PERÓN ×N"** colgado ALTO sobre la hilera de atrás (entre dos varas, sobre las cabezas — no tapa
  a nadie) (`longBanner`).
- **Trío del frente** que interactuás; el del **CENTRO es EL LINYERA PERONISTA**: NPC nuevo tipo linyera, **chateable
  con IA** ([E] al lado). Persona `peronista` (server-side + copia BYOK): peronista de primera línea que **se sabe TODO
  de Perón** (hasta la Marcha Peronista) y **cualquier cosa que le preguntes la lleva de vuelta a Perón** y a cómo
  funciona el mundo según Perón. Ficha `specs/nivel-1/personajes/peronista.md` (fuente del prompt).
- **Chat desde el sub-modo top-down:** `lavalle.js` expone `openChatNpc` (one-shot); `game.js` abre el chat IA y al
  cerrar **vuelve a Lavalle** (`chatReturnTo`), sin recrear la escena.
- **infra-41 (proxy 0.1.63):** `ai-proxy/personas.js` regenerado (nueva persona `peronista`; de paso **se reconstruyó
  la ficha `hincha.md`** que faltaba y hacía que el regen la perdiera — ahora las 10 personas salen de fichas).
- i18n `g.lavalle.npc/line.peronista` + `g.lavalle.chatHint` (ES≡EN). e2e + paridad + screenshot real OK. Cache **v251**.

**Nota de arquitectura (REGLA #0):** el **chat del peronista SÍ es v2** (persona=dato de ficha + memoria + grounding).
La **escena** de Lavalle sigue hardcodeada en `js/lavalle.js` (sub-modo isla, igual que bodegón/telo) — deuda anotada;
el enganche al grafo es E4/E5 de `specs/lavalle.md`.

---

## [v250] — 2026-07-01 — ✊🔥 Lavalle: la postal AHORA VIVE (cumbia, multitud, fuego que ilumina, humo, chispas)

Pulido ambiental del piquete: **toda la gente rebota al ritmo de la cumbia** y **el bombo se TOCA** (el palo golpea y el
parche late en el pulso); **multitud de fondo** apretada contra el corte (el piquete se siente LLENO); los tachos al
fuego ahora **iluminan el asfalto** (charco de luz cálida) + tiran **chispas**; **humo** saliendo de los autos rotos.
Solo cliente (`js/lavalle.js`). e2e + web-smoke OK. Cache **v250**.

---

## [v249] — 2026-06-30 — 🛣️ Lavalle: la avenida ahora SÍ parece la 9 de Julio (carriles paralelos, no el puente de Brooklyn)

El dueño: "hiciste el puente de Brooklyn, basate en fotos de la 9 de Julio". Las líneas en perspectiva que convergían a
un punto parecían los cables de un puente colgante. Corregido sobre la avenida REAL: **carriles blancos PARALELOS y
verticales** a todo el ancho (la avenida más ancha del mundo), el **Obelisco parado en la Plaza de la República** (piso
claro), y **jacarandás** en los canteros laterales. Plano y ancho. Solo cliente. Cache **v249**.

---

## [v248] — 2026-06-30 — ✊🏙️ Lavalle = la 9 de Julio (Obelisco grande, carriles, colectivos/autos/patrulleros) + SIN puerta

Más feedback del dueño sobre el piquete: (1) más Obelisco; (2) que parezca la **9 de Julio** con los natos cortando,
**colectivos y autos parados** y **patrulleros**; (3) la puerta-edificio estaba mal — uno no cruza a otra calle por una
puerta, **caminás y pasás**.
- **Look 9 de Julio:** la avenida ocupa **todo el ancho** (asfalto + muchos carriles + perspectiva al Obelisco), el
  **Obelisco grande y centrado**, **colectivos/autos PARADOS + PATRULLEROS** (helper `vehicle()` top-down con barra de
  luces), barricada cohesiva (cubiertas + autos rotos + reja + banderas). FIX: faltaba limpiar el canvas → se colaba la
  calle en los márgenes.
- **Entrada SIN puerta:** se eliminó la door `lavalle` de la sala 0 + la **sala 52 side-scroller** (la reemplaza el
  sub-modo) + el wire. Ahora **caminás al borde IZQUIERDO de Florida y pasás solo** (`game.js`), con un cartel de calle
  `lavalle_sign` (`art.js`) en la esquina. Modelo v2 regenerado → **51 salas** (volvió al original; paridad v1≡v2 OK).
- e2e + v1≡v2 + paridad i18n (745/745) + headless + screenshot real (Playwright). Solo cliente. Cache **v248**.

---

## [v247] — 2026-06-30 — ✊ Lavalle: el piquete ahora SE LEE como piquete (composición + personajes de cuerpo entero)

Feedback del dueño: "no son cosas sueltas, es un piquete". Recompuesto: barricada del fondo = MURO (cubiertas apiladas
+ autos rotos + la reja + banderas Viva Perón ×2 + **bandera argentina** + Che), tachos al fuego + olla adelante, y
**piqueteros de CUERPO ENTERO** (campera/piernas/cabeza, bandana/capucha, palos, bombo, banderas) — **sin niños**, solo
personajes de piquete (encapuchado, del bombo, de la bandera, referente…). Dibujo ordenado por Y. Cache **v247**.

---

## [v246] — 2026-06-30 — ✊🎶 Lavalle E1.5: el piquete ahora es TOP-DOWN + entrás caminando (cartel, no puerta)

Feedback del dueño sobre la Etapa 1: (1) para ir a Lavalle entrabas por una **puerta de edificio** que decía "VALLE"
— raro; (2) en perspectiva side-scroller **no parecía un piquete**. Rehecho:
- **Cómo se entra:** ya NO es una puerta de edificio. En la esquina (sala 0) hay un **cartel nomenclador "CALLE
  LAVALLE ←"** con flecha + resplandor/humo del piquete, y **caminás al borde izquierdo → te lleva SOLO** (sin apretar
  E). `js/art.js drawLavalleSign` reemplaza el facade de edificio; auto-entrada en `game.js update`.
- **El piquete ahora es un sub-modo TOP-DOWN** (`js/lavalle.js`, patrón `bodegon.js`): entrás desde abajo y tenés el
  piquete **de frente** — el **corte** (vallas/barricada) y el **Obelisco al fondo**, **tachos prendidos fuego ANIMADOS**
  (llamas + humo en vivo), **olla popular** humeante, pancartas "Viva Perón"/banderas del Che, y la **gente a los
  costados** (pibes, copados, los del fierro, el que corta) con su frase al acercarte. **Cumbia al palo.** Volvés
  caminando para abajo. Sin combate (ambiental).
- Sub-modo testeado headless (200 frames sin crash) + e2e + paridad i18n (737/737) + web-smoke. Solo cliente. Cache
  **v246**. SDD `specs/lavalle.md`. (La sala side-scroller v244 queda como fallback si falta el módulo.)

---

## [v245 · infra-43] — 2026-06-30 — 🔧 Multijugador del bodegón: MESAS en el servidor + chat + peers que caminan

Playtest del dueño con 2 navegadores: el truco 3v3 no juntaba a los dos, el 1v1 no esperaba, el chat no mostraba lo
que decía el otro y los peers se veían sentados estáticos. Causa: el matchmaking era **P2P sobre whisper** (frágil) y
el top-down **nunca mandaba la posición real**. **Validé primero el transporte** con 2 clientes curl contra prod →
el SSE/whisper/pareo andan perfecto; el bug era todo lógica del cliente. Solución:
- **MESAS en el SERVIDOR (server-authoritative):** `ai-proxy` ahora tiene mesas `1v1` y `6` por sala-instancia +
  `POST /salon/table {sit|leave}` → emite `table-update`/`table-start`/`table-end`. El server **parea** (1v1 = 2
  sentados; 6 = ≥2 + cuenta de 8s o lleno), elige el host (orden de llegada) y manda `table-start {seats, seed}`. Se
  ELIMINÓ el lobby P2P (invitaciones `tk-inv`/`t6-inv`, "doble host"). La PARTIDA ya arrancada sigue por whisper
  (host↔guests, reusa los motores `truco-net`/`truco-pvp` tal cual). Observable con `/salon/debug` (muestra las mesas).
- **Mesa 1v1 nueva** + la de 6 en el bodegón (`js/bodegon.js`): te sentás → "esperando que se siente alguien…" → arranca.
- **Chat arreglado:** el mensaje entrante **auto-abre el panel** (antes era un toast del HUD, **invisible en el
  top-down** → no veías nada). Las dos direcciones.
- **Peers que CAMINAN:** el top-down ahora postea tu posición REAL `(x,y)` (`Salon.pos` lleva `y`, relay en el proxy) y
  dibuja a los demás en su posición viva interpolada (antes los sentaba estáticos en `Salon.pos(11,0)` fijo).
- e2e + web-smoke + paridad i18n (715/715) OK. Cache **v245**, proxy **0.1.62** (**infra-43**). `specs/multijugador.md`.

---

## [v244] — 2026-06-30 — ✊ CALLE LAVALLE (Etapa 1): doblás a la izquierda y caés en el piquete copado

Nueva zona contigua a la calle: desde el arranque (Florida y Lavalle), si **doblás a la izquierda** (puerta nueva al
extremo izq de la sala 0) entrás a **Calle Lavalle yendo al Obelisco** — y está **todo cortado por un piquete copado**:
**tachos prendidos fuego**, pancarta "**VIVA PERÓN**", **banderas del Che**, **olla popular**, **pibes jugando**,
gente con **armas tumberas** (copados, no atacan), todo de fiesta y **cumbia al palo**. El **Obelisco** se ve al fondo,
detrás de la **barricada** (de ahí no se pasa todavía — gancho de la Etapa 2). **Sin combate**: es una postal ambiental.

- **Etapa 1** (esta): la entrada + el clima. Después le agregamos más (pasar el piquete, el Obelisco, quests, etc.).
- **Sala nueva** `Lavalle — el piquete` (sala 52, tag `lavalle`, theme street) en `js/level.js` + puerta `lavalle` en
  la calle + `wire`. **Decor nuevo** dibujado en `js/art.js`: `tacho_fuego`, `pancarta`, `bandera_che`, `olla`,
  `barricada`, `obelisco` + facade `lavalle`. **Cumbia** al entrar (la cumbia ya existía en `audio.js`; se fuerza con
  el tag `lavalle`). **9 NPCs** ambientales (pibes, olla popular, compañeros, los del fierro, el que corta).
- **Modelo v2** regenerado (`tools/gen-level.js` → `levels/nivel-1.json` + `js/level-data.js`, 52 salas) → la
  **paridad v1≡v2 se mantiene**. i18n ES/EN (`js/lang/level.en.js`). e2e + parity + web-smoke OK. Cache **v244**.
  SDD `specs/lavalle.md` (Etapa 1 + roadmap E2-E5). Homenaje/parodia cariñosa, sin afiliación.

---

## [v243] — 2026-06-30 — 💬 Bodegón: los peers como puntos de interacción + chat privado 1-a-1 en el top-down (T2b/F2b.2)

En el **bodegón top-down** ahora te acercás a otro jugador sentado en una mesa y **[E]** abre un **menú de
interacción**: **[1] 🃏 Truco** (la partida 1v1 del F3) o **[2] 💬 Chatear** (chat privado 1-a-1). Antes la [E]
sobre un peer invitaba directo al truco; ahora es un punto de interacción de verdad.
- **Chat privado** reusa el panel `#chat` + `Salon.whisper` (efímero, dirigido, sin IA) que ya existía en el
  side-scroller; lo que faltaba era **engancharlo al sub-modo top-down**: al cerrar el chat volvés al **bodegón**
  (no al side-scroller) — `peerChatFrom='bodegon'` → `closeChat` re-entra al top-down.
- Overlay `drawPeerMenu` sobre el bodegón; teclas 1/2/Esc. i18n `g.bodegon.peerPrompt/peerMenu/peerMenuOpts`
  (ES≡EN). Solo cliente. Tests e2e + paridad (711/711) + web-smoke OK. Cache **v243**. `specs/multijugador.md §3.2.1/3.3`.

---

## [v242] — 2026-06-30 — 🧹 Deuda menor cerrada: beats en el sueño top-down + el fierro criollo siempre tiene blanco

Dos puntas finas que quedaban del A0-DEEP y de las armas criollas:
- **A0-DEEP CERRADO del todo — beats en el spinoff top-down del chino:** `NivelAI.generate()` (la escena top-down,
  "los sueños del Carpo") ahora siembra las **ANCLAS de los beats** del relato (`THEME_BEATS[id]`) como **props
  set-piece** (flag `anchor:true`), y `js/spinoff.js` las dibuja **más grandes + glow** (no decor random) → el sueño
  top-down también "se lee" como la historia, igual que el nivel-plataforma. (Los 9 temas del chino siembran sus
  anclas, ej. super-rasca → 🧧🥫🐲.) `specs/fabrica-niveles-ai.md §A0-DEEP`.
- **Armas criollas: el fierro siempre tiene a quién pegarle.** Cada arma criolla pega ×3 contra UN tipo de bicho
  (rebenque→pacman, boleadoras→dron/galaga, facón→peatón, FAL→cuevero), pero una sala de un solo *vibe* podía no
  spawnear ese tipo → el arma quedaba inútil. Ahora `ensureCriolloTargets(model)` (en `game.js`, al cargar el sueño)
  mira las armas criollas que **tenés** y, por cada tipo "contra" que no aparezca, **swapea un enemigo al azar a ese
  tipo** (no toca geometría → la RED no se altera). `specs/inventario-armas.md §6`.

Solo cliente (sin proxy). Tests e2e + web-smoke OK. Cache **v242**.

---

## [v241 · infra-42] — 2026-06-30 — 🃏🃏 TRUCO DE A 6 (3v3) PvP con relleno de IA + watchdog de reconexión

El truco multijugador da el salto al **3v3**: en el bodegón hay una **mesa "TRUCO 6"** → te sentás → se arma un
**truco de a 6** con los jugadores reales que se sumen y **bots de IA** que llenan los asientos vacíos (jugable ya,
solo o con gente; escala a 6 humanos). Premio en **flores** al equipo ganador.

- **Regla de la casa** (la del dueño, encapsulada en `bazaMode` para ajustar fácil): equipos alternados
  (A={0,2,4} B={1,3,5}); **baza 1 = GLOBAL** (tiran los 6, la más alta gana para su equipo), **baza 2 = 1v1**
  (cada uno vs el de enfrente, mayoría de duelos), **baza 3 = global**; al llegar un equipo a **10**, todas las
  bazas vuelven a ser globales. Partida **a 15**. Envido/flor **por equipo**.
- **Host-autoritativo** (`js/truco-net6.js`, motor PURO + testeado): el que se sienta corre TODA la partida (las 6
  manos), valida a los humanos por whisper y **maneja los asientos IA** por heurística (`Truco.aiPlayCard`/
  `aiAcceptEnvido`), empujando una vista por jugador que no revela manos ajenas. **Lobby**: el host invita a los
  peers (`t6-inv`), los que aceptan (`t6-join`) ocupan asientos, el resto se llena con IA, arranca (`t6-start`).
- **Escena** `js/truco-pvp6.js`: los 6 alrededor de una mesa ovalada (color por equipo, 🤖 los bots), tu mano
  interactiva. `js/bodegon.js` suma la mesa fija "TRUCO 6"; `js/game.js` el lobby/matchmaking + estado `trucopvp6`.
- **DEUDA F3 cerrada — watchdog de reconexión:** un jugador que cierra la pestaña deja de latir → el relay lo poda →
  desaparece de `Salon.getPeers()`; en **a6** lo reemplaza un **bot IA** (la partida sigue), en **1v1** el match
  cierra limpio. Reusa la presencia del salón (sin protocolo de ping nuevo).
- **Transporte:** cap del whisper subido 700→900 (las vistas de a6 son más grandes) en cliente + proxy
  (**infra-42**, proxy `0.1.61`). Tests: e2e nuevo (20 partidas del motor IA-fill, ambos modos de baza + escena
  host/guest por whisper consistentes) + paridad i18n (36 claves `g.truco6.*`, 708/708) + web-smoke. Cache **v241**.
  SDD `specs/truco.md §14`. **Deuda v1:** host malicioso (relay sin autoridad); la "regla de la casa" es mi
  interpretación (a validar en playtest, está toda en `bazaMode`); contraflor real en 3v3.

---

## [v240 · infra-41] — 2026-06-30 — 🃏 TRUCO PvP humano-vs-humano en el bodegón (multijugador F3)

El truco deja de ser **solo contra la IA**: ahora podés jugar una **partida 1v1 contra OTRO jugador real** en el
bodegón. Te acercás a alguien sentado en una mesa → **[E] invitar al truco** → si acepta, se juega una **partida
completa** (envido familia, flor, truco/retruco/vale cuatro, quiero/no, "el envido está primero", mejor de 3 manos),
con el premio en **flores** al ganador.

- **Motor host-autoritativo** (`js/truco-net.js`, PURO y testeado): uno de los dos corre la partida (tiene las DOS
  manos), valida cada acción y expone una **vista por jugador** que NUNCA incluye la mano del rival (anti-trampa de
  cliente vanilla). Reusa el motor de reglas `Truco`. El host se elige determinístico por pid (ambos computan igual).
- **Transporte:** viaja por el **mismo whisper del salón** (relay SSE sin autoridad) — mensajes JSON `tk-*`
  (invitación/aceptar/acción/vista/bye). El salón **nunca se desconecta** durante el match (heartbeat propio); al
  terminar volvés al bodegón. Subí el cap del whisper (cliente 200→700, proxy `msg` 200→700 · body 800→1400 ·
  rate-limit 700→250ms) para que entren las vistas JSON (**infra-41**, proxy `0.1.60`).
- **UX:** escena `js/truco-pvp.js` (mismo look de cartas que el truco vs IA) — `1-3` cartas · `V` envido · `T` truco ·
  `Q` quiero · `N` no · `Esc` me voy. El peer más cercano se resalta en la mesa; overlay de invitación entrante.
- **Degradación total:** sin red / si el rival se va, el match cierra limpio ("se fue el rival", sin penalidad) y el
  bodegón sigue 100% jugable. Capa aditiva con `typeof` guards.
- Tests: e2e nuevo (12 partidas del motor sin sesgo estructural + escena host/guest por whisper terminan
  consistentes) + paridad i18n (31 claves `g.trucopvp.*` ES≡EN) + web-smoke. Cache **v240**.
  SDD `specs/truco.md §F3` + `specs/multijugador.md §F3`. **Deuda v1:** un host malicioso podría trampear (relay sin
  autoridad, igual que el resto del multijugador); reconexión dura por timeout (hoy salís con Esc).

---

## [v239] — 2026-06-29 — 🐛 FIX cine: cada piso respeta SU tópico (no más noticias repetidas entre salas)

Reporte del dueño: en el cine los carteles/noticias se mezclaban — pisos distintos mostraban lo MISMO y no su categoría.
**Causa:** `pickNoticias` tenía un fallback `pool.length ? pool : ns` → si el banco de noticias no tenía el tópico de
ese piso (hoy el banco está flaco: solo Mundial+crypto), el piso caía a mostrar TODAS las noticias → Deportes y Finanzas
salían bien (sus topics SÍ estaban), pero Mundo/Tecno/Consolas/OpenRouter/Colombofilia mostraban todos lo mismo (Mundial
repetido). **Fix:** cada piso muestra SOLO los topics de su categoría, aunque el banco esté flaco; si no hay novedades de
ese tópico, la pantalla dice "— sin novedades de {CAT} hoy —" (`g.cine.noTopic`) en vez de robar las de otro piso. (El
banco se llena con el cron diario de noticias 9am AR; el código ahora es robusto a un banco incompleto.) Cache **v239**.

---

## [v238 · infra-40] — 2026-06-29 — 🔒 Hardening: cabeceras de seguridad / CSP en la web y el proxy

Primer lote concreto de `specs/seguridad.md` (§4). El prod es público; lo endurecemos sin romper el juego:
- **Web** (`web/nginx-default.conf`): **Content-Security-Policy** afinado a lo que el juego REALMENTE usa — `script-src
  'self'` (se sacó el único `<script>` inline: `GAME_METRICS` ahora se setea en `telemetry.js`), `style-src 'unsafe-inline'`
  (overlays en runtime), `connect-src` = proxy IA + OpenRouter (BYOK), `media-src` = TTS del proxy, `img-src 'self' data:
  blob:`, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`. Más `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy` (geo/cámara/mic/pago off) y **HSTS** 1 año.
- **Proxy** (`ai-proxy/server.js`): es una API → `CSP default-src 'none'` + nosniff + frame-deny + Referrer-Policy, sin
  tocar el CORS que el juego necesita.
- **Validado**: el CSP cargado en Chromium REAL (boot + arrancar + abrir inventario/opciones) NO produce violaciones; scan
  de secretos del repo limpio. e2e + web-smoke OK. Cache **v238**, proxy **infra-40**.

---

## [v237 · infra-39] — 2026-06-29 — 🎬 Niveles generados = SECUENCIA de la historia (A0-DEEP (1): salas = BEATS)

Cierra la apuesta grande de `§A0-DEEP`: cada sala del nivel generado es ahora un **MOMENTO del relato** (su propio nombre +
set-piece + encuentro), no salas intercambiables. Antes el nivel "no tenía nada que ver" con la historia que te contaba el
vecino; ahora **se recorre como un cuento**:
- **DATA estática:** `THEME_BEATS[id]` = secuencia hand-authored por tema del raid del chino. Ej. *La Muralla en Skate* →
  "la rampa" (🛹) → "las almenas" (🏯) → "el fin del muro" (🐉); *Súper Rasca* → "la entrada pegoteada" (🧧) → "las góndolas
  vencidas" (🥫) → "el depósito del dragón" (🐲). Cada beat sesga también el **tipo de bicho** y el **hazard** de su sala.
- **La IA autora beats:** el oráculo y la historia del vecino piden `beats` al modelo (`BEATS_ASK` en el proxy) → `j.beats`
  → `sanitizeBeats` → el nivel del vecino/oráculo se arma como la secuencia que la IA inventó.
- **`generateLevel`:** si el tema trae beats, una sala por beat; `assemble(i)` usa `beats[i]` para nombre+ancla+enemigo+haz.
  Fallback total: sin beats → salas genéricas (como antes).
- Verificado headless (secuencias correctas, 0 problems en la RED) + e2e + web-smoke. Cache **v237**, proxy **infra-39**.

---

## [v236] — 2026-06-29 — 🏯 Niveles generados que SE LEEN como la historia: props ANCLA + 2 layouts nuevos (A0-DEEP parcial)

`specs/fabrica-niveles-ai.md §A0-DEEP`. El dueño venía diciendo que los niveles generados (sueños del vecino/oráculo/
chino) "son simples niveles para saltar", sin relación con el relato. Dos mejoras de alto impacto/bajo costo:
- **(3) PROPS ANCLA:** cada nivel generado lleva ahora un **set-piece reconocible** del relato, colocado a propósito
  (centro del piso, emoji GRANDE con glow) — no decor random. Mapa `ANCHOR` (motif→emoji) + `anchorFor` en `nivelai.js`;
  render nuevo en `game.js`. Ej: muralla→⛩️, súper rasca→🐲, farmacia→⚗️, petardos→🎆, lavadero→🌀.
- **(2) MÁS STYLES:** 2 layouts de plataformas nuevos — **`shelves`** (estanterías: columnas verticales que trepás;
  súper/farmacia) y **`rooftop`** (azoteas: plataformas anchas y altas con huecos; fábrica de petardos). El oráculo/historia
  (IA) ya pueden elegirlos. Todos pasan la RED (Playable): el piso siempre transita, las plataformas son perchas.
- Verificado: e2e (cada tema 60 frames) + headless (props ancla presentes, 0 problems) + web-smoke. **Falta** la apuesta
  grande: (1) salas = beats del relato. Cache **v236**.

---

## [v235] — 2026-06-29 — 🪢 Armas CRIOLLAS en los SUEÑOS: pacifista despierto, "sí loco acá lo usamo" dormido

`specs/inventario-armas.md §6`. El **fierro criollo** del armero ahora **se VE y se USA**, pero con la vuelta del dueño:
en la **calle real el Carpo se niega** (pacifista, ya estaba), pero en los **SUEÑOS** (niveles GENERADOS del vecino/
oráculo/chino) **SÍ los usa** — y **cada arma pega ×3 contra UN tipo de bicho** (data-driven, Type Object):
- **rebenque** 🪢 → los **rápidos** (pacman) · **boleadoras** 🔗 → los **voladores** (dron/galaga) · **facón** 🔪 → el
  **cuerpo a cuerpo** (peatón) · **FAL** 🔫 → los **tiradores** (cuevero).
El armero ahora te da el arma **específica** que comprás (no un "fierro" genérico). En el inventario `[I]`: despierto dice
"esto lo uso en los SUEÑOS nomás"; en un sueño lo equipás ("sí loco, ACÁ lo usamo"). El disparo lleva `{eff,mul}` y `fx.js`
aplica el ×3 al tipo correcto (chispa dorada) → **cambiar de arma según el bicho cobra sentido táctico**. Al despertar
(salir del nivel generado) se guarda solo. Probado headless. i18n 640/640. Cache **v235**.

---

## [v234 · infra-38] — 2026-06-29 — 🤖📋🛰️ Construcción colaborativa C2 + D2: la IA deja carteles + el ENDGAME del datacenter

Cierra el SDD `construccion-colaborativa.md` (quedaban C2 y D2):
- **C2 — la IA del salón deja CARTELES.** Cron `gen-carteles.mjs` (CronWorkflow `tormenta-ai-proxy-carteles`, cada 6h)
  autora carteles cortos (sabor + pistas del juego) y los postea a `POST /carteles/ai` (gated `GEN_TOKEN`). El server los
  marca `ai:true` y respeta el **cupo IA = 30% por piso** (`CARTELES_AI_MAX`) → siempre queda lugar para jugadores. El
  cliente ya los dibujaba distinto (🤖 + borde azul).
- **D2 — el ENDGAME del datacenter + temporadas.** Cuando el progreso GLOBAL llega a **100%**, el server marca `done` →
  contribuir queda **bloqueado** (`423 complete`). El cliente dispara una **cinemática** (pantalla completa: *"la comunidad
  volteó a la IA del satélite"*, pago de `g.win.text`) que se ve **una vez por jugador y por temporada** (localStorage).
  **Temporadas:** `POST /datacenter/season` (gated `GEN_TOKEN`) arranca una temporada nueva (`season++`, cupos **+25%**,
  reset) — *"se reinicia a una v2 más cara"*. El catálogo de partes ahora escala con la temporada (`dcEffMax`).
- Paridad v1≡v2 (51 salas) + i18n 632/632 + e2e/web-smoke OK + helm lint OK. Cache **v234**.

**Con esto el SDD de construcción colaborativa queda COMPLETO** (C1 carteles + C2 IA + D1 datacenter + D2 endgame). Lo
único a futuro: la sala datacenter como hub multinivel (cuando exista Nivel 2).

---

## [v233 · infra-37] — 2026-06-29 — 🖥️ Construcción colaborativa D1: EL DATACENTER GLOBAL (meta de comunidad)

Segundo paso del SDD `construccion-colaborativa.md`: el **datacenter colaborativo GLOBAL**. **1 piso nuevo del cine**
("El Datacenter", entre el Tablón 2 y el bodegón → **51 salas**) con una **computadora** (NPC `action:'datacenter'`) que
abre el **catálogo de PARTES** (CPU/GPU/disco/red/enfriamiento/energía — DATA, con precio en 🪙 o 🍬). Aportás una parte
→ se **descuenta del player** y se **suma al contador GLOBAL** (estado único de toda la comunidad, server-side). La sala
dibuja una **maqueta de racks** que se encienden con el **progreso global** + barra + "lo arman N jugadores". Cuando llega
a 100% se sembró el endgame (destruir la IA del satélite; la cinemática es D2, pendiente).

- **Backend (`ai-proxy`, infra-37):** estado `DATACENTER` ÚNICO en **PVC permanente** (`/data/datacenter.json`).
  `GET /datacenter` (parts/caps/progress/done/contributors/top), `POST /datacenter/contribute {pid,part}` (valida part
  del catálogo + **cupo por parte** + **rate-limit** 8s/pid → suma). Catálogo server = `{max,w}` (gpu pesa ×3); progreso
  = suma ponderada / objetivo. Anti-abuso: solo SUMA (no se sabotea) + cupos + rate → es colaborativo de verdad.
- **Cliente:** `js/datacenter.js` (aditivo, offline-safe; catálogo de precios = DATA) + `drawDatacenter`/`drawDcRacks`
  (maqueta) + overlay `#dcmenu` en `game.js`. Pago client-side (coins/caramelos) al confirmar el server.
- Paridad v1≡v2 (51 salas) + i18n 626/626 + e2e/web-smoke OK. Cache **v233**.

---

## [v232 · infra-36] — 2026-06-29 — 📋 Construcción colaborativa C1: EL TABLÓN (carteles à la Death Stranding)

Primer paso del SDD `construccion-colaborativa.md`: un **tablón comunitario** asincrónico. **2 pisos nuevos del cine**
("El Tablón" y "El Tablón 2", entre EN VIVO y el bodegón → **50 salas**), cada uno con una **computadora** (NPC
`action:'compu'`) que abre un overlay para **fijar un cartel corto** (≤80 chars). El cartel **vive en el server hasta que
OTRO jugador lo LEE** (consumo-en-lectura, à la Death Stranding): te parás debajo, **[E]** lo lee → te muestra el texto
grande y **lo borra del tablón** (si no es tuyo). Los carteles se dibujan **empaquetados** en la pared (grilla 8×3 = cupo
24/piso) con la **chincheta + el nick** del autor; el texto NO se ve hasta leer.

- **Backend (`ai-proxy`, infra-36):** banco MUTABLE por el jugador, persistido en **PVC** (un cartel espera horas a su
  lector). Endpoints `GET /carteles?floor=` (sin texto), `POST /carteles` (cupo + **rate-limit** 20s/pid + censura básica
  + cap 80), `POST /carteles/read` (consumo → devuelve y borra), `GET /carteles/mine?pid=`. Poda > 7 días.
- **Cliente:** `js/carteles.js` (capa aditiva: sin red → "modo offline", el juego anda igual) + render `drawCarteles` +
  overlay `#cartelmenu` (fijar + "mis carteles") en `game.js`. Reusa el mismo proxy/pid que `salon.js`.
- **Anti-abuso v1 (decisión del SDD §4.4):** texto libre corto + rate-limit + lista negra mínima (censura, no rechaza); el
  consumo-en-lectura limita la exposición a 1 lector. Sin IA todavía (eso es C2).
- Paridad v1≡v2 (50 salas) + i18n 605/605 + e2e/web-smoke OK. Cache **v232**.

---

## [v231] — 2026-06-29 — 🤖🎮 Quest del chip: lote de playtest del dueño (FIFA prereq · loop 3×+rescate · 2 bugs · escena de cura)

Cerrado el lote de 5 ítems que el dueño dejó tras jugar el corte de escena v230 (estaban anotados en
`telo-chip-quest.md §6`). Todo data-driven donde se pudo (REGLA #0):
- **(1) Prereq FIFA 98 para la consola del Trucotron.** El paso `consola2` (el flaco del Trucotron, `consolaGuy`) ahora
  lleva `req:'fifa'`: si **no ganaste el FIFA 98** (flag `fifaWon`), el quest **no intercepta** al flaco → corre su quest
  normal (`playFifa`: te pide la **Mega Drive del chino**, te hace ganar). Recién con `fifaWon` te entrega la consola.
  Genérico vía `chipReqOk(req)` + campo `req` en el paso (nada de if-chain). Obj/hint de `consola2` reescritos.
- **(2) BUG: dar la consola te devolvía a Carpo.** `getConsola()` hacía `playingAs='carpo'` — quitado. Ahora **seguís
  siendo el pibe de Garbarino** hasta la cura (el switch a Carpo es SOLO en `cureChip`→`chipReset`).
- **(3) Escena de cura.** Al curarte, en la habitación del telo se **monta una mini-escena** (`curaSceneT`, 7s): el
  **linyera entra con la consola** 🎮 y el **Carpo dormido se despierta y la activa** (💤→😵‍💫). Transitoria, no se serializa.
- **(4) Loop hasta 3× + RESCATE a la 4ª.** Nuevo contador **`chipLoops`** (persistido, +1 por cura). El telo te chipa
  hasta 3 veces; a la 4ª (`chipLoops>=3`) el robot **ya no te chipa**: `Telo.create(chipLoops)` dispara una **fase
  `rescue`** — los **3 linyeras irrumpen y funden al robot a RAYOS CÓSMICOS** (haces multicolor + BOOM) y salís **sin chip**
  (getter `rescued`; game.js lo trata como un escape). i18n `g.telo.rescue*`/`resRescued*`.
- **(5) BUG: los linyeras del telohab preguntaban del cine.** El `maybeGive('oraculo')` (que manda al cine a buscar
  noticias) **no estaba guardado por `!chipped`** — por eso seguía saliendo pese a v228. Guardado: chipeado, los linyeras
  **solo te boludean con el chip** (el grounding `g.chip.chatGround` + supresión del giver de noticias).

Paridad i18n 582/582. E2E + web-smoke OK. Cache **v231**.

---

## [v230] — 2026-06-28 — 🤖💼 Quest del chip: CORTE DE ESCENA — la posta te teletransporta a Garbarino ya siendo el pibe

El dueño reportó por 3ª vez que **no se veía la transformación** (el swap de sprite en el lugar no le quedaba claro). Su
propia idea, implementada: la transformación deja de ser un swap ambiguo y pasa a ser un **corte de escena duro**. Cuando
los 3 linyeras te tiran la posta, el juego te **SACA del telo y te mete DENTRO del edificio de Garbarino ya controlando al
pibe** (`chipBecomeGarbarino`: `playingAs='garbarino'`, `spawnIn` la sala con tag `garbarino`, oculta al NPC vendedor —
*ahora sos vos*— y arranca directo en el paso `troyano`). El **Carpo (vos, chipeado) queda dibujado ACOSTADO en la cama**
del telo (`room.carpoInBed` → hero idle rotado + 💤🤖 en el catre). Imposible no ver el cambio: cambia la sala, el sprite
y la música. Al curarte se deshace todo (`chipReset` restaura `carpoInBed=false` + vendedor visible, para re-jugar). Se
**eliminó el paso `garbarino`** del grafo `CHIP_QUEST` (lo resuelve la posta) y su fx `becomeGarbarino`. Mensajes
reescritos (`g.chip.linyerasPosta` = el corte; nueva `g.chip.carpoBed`). Paridad i18n 553/553. Cache **v230**.

---

## [v229] — 2026-06-28 — 🤖💼 Quest del chip: AHORA SÍ te transformás en el pibe de Garbarino (sprite propio)

El único cabo suelto que reportó el dueño: *"el problema era que nunca me transformé en el de Garbarino"*. El resto
de la quest anda de diez (EducaciónIT Maxi+Marcos → troyano, cine/consolas → jubilados → Trucotron → consola en
inventario → linyera → de vuelta al telo). **Fix:** al hablarle al vendedor de Garbarino ahora **pasás a CONTROLAR
visualmente al pibe** — el jugador se dibuja con el sprite del vendedor + badge **💼** (`player.asGarbarino` →
`player.js draw`), no más el Carpo. El Carpo (vos) **queda chipeado en la cama del telo**; el de Garbarino (que NO
está chipeado) hace el resto del quest, y al curarte volvés a ser el Carpo. Reframe de todos los carteles/mensajes
(`g.chip.obj.*`, `g.chip.garbarino`, `g.chip.linyerasPosta`): la posta de los linyeras te manda a **buscarlo** (seguís
Carpo), el switch pasa **al hablarle**, y de ahí en más el HUD dice "Sos el pibe de Garbarino (el Carpo quedó chipeado
en la cama)". Paridad i18n ES/EN (552/552). Cache **v229**.

---

## [v228] — 2026-06-28 — 🤖📌 Quest del chip: cartel de objetivo FIJO + linyeras hablan solo del chip (no del cine)

Fixes de claridad de la quest del chip: **(1)** cartel **rojo FIJO arriba** que muestra SIEMPRE el objetivo del paso
actual (y que seguís chipeado / que sos el pibe de Garbarino) — `#chipBanner`, persistente mientras estás chipeado.
**(2)** Los **3 linyeras de la habitación ya NO hablan del cine/Mundial**: cuando estás chipeado, su chat IA se groundea
SOLO al chip/la IA/el sol (y se suprime la quest de noticias). Así la conversación es del chip, no del cine. Cache **v228**.

---

## [v227] — 2026-06-28 — 🛏️ La habitación del telo ahora SE VE como el telo (cama, pósters, paleta rosa, música grasa)

Fix de tu observación: te despertabas (chipeado) en una sala genérica, y tenía que ser **la MISMA habitación donde salió
el robot**. Ahora la "habitación del telo" usa el **look del telo** (theme `secret` = paleta rosa de "El Edén") con la
**cama** (catre, de donde salió el robot), **pósters** y la **música de telo** sonando. Se lee como el mismo lugar. Cache **v227**.

---

## [v226] — 2026-06-28 — 🤖🛸 Quest del chip, rediseño: la habitación del telo + chat con los 3 linyeras + el cierre del sol

Rediseño del flujo del chip según tu visión. **Ahora al chiparte caés a una SALA REAL nueva, "La habitación del telo"**
(ya no aparecés en el cine), donde están los **3 LINYERAS chateables** (IA: Diógenes/Dante/Pechito). Hablás con **cada
uno** (chat) y, cuando hablaste con los tres, te tiran la posta → **pasás a controlar al pibe de Garbarino**. La cadena:
Garbarino → Maxi+Marcos (troyano) → los 2 jubilados **te siguen** al arcade → **El flaco del Trucotron** te da la
**consola**. **El cierre (tu gag):** le das la consola a **cualquier linyera**, el juego **salta a la habitación** (sos
el Carpo de nuevo), pero vos —chipeado— le decís que estás **programando que estalle el sol** (efecto universal, las
galaxias cayendo); el linyera te **rescata metiéndote la consola a la fuerza** → BOOM, te dormís, te despertás con **la
peor resaca** sintiendo que podés resolver todo… y a los segundos no sabés ni la tabla del 2. Sin chip. **FIX:** `makeRoom`
preserva los flags custom (`chiplin`/`consolaGuy`). 48 salas. Cache **v226**.

---

## [v225] — 2026-06-28 — 🤖🎮 Quest del chip: los 3 linyeras, los jubilados que te siguen, y FIX clave (no agarraban)

Gran pasada de la quest del chip con tu feedback. **FIX clave:** los jubilados (y cualquier NPC con flag custom)
**perdían su flag** al construir el nivel (`makeRoom` no copiaba `jubilado`) → "jamás me decían nada / no aparecía la
consola". **Arreglado** (+ se preserva en v1 y v2). **Versión más larga (la que pediste):** al chiparte, los **TRES
linyeras aparecen al lado tuyo** y te **boludean** (charlas filosóficas sin sentido, Diógenes/Dante en verso/Pechito)
hasta que a la 4ª te tiran la posta (→ Garbarino). **Los jubilados ahora te SIGUEN** hasta el **arcade**, donde **el
flaco parado** (un NPC nuevo) negocia con ellos un **chat estilo Matrix sin sentido** y te **pasa la consola**; los dos
jubilados se van **rezongando** cuál consola era mejor. Nombrados claro: **"Jubilado de TecToys"** / **"Jubilado de
Commodore"**. **Diálogos más LENTOS** (15s) para que se lean. El celu del telo ahora muestra el texto **arriba, grande,
con [E] para seguir**. Y se aclaró el final (te **desplomás dormido** y te despertás sin chip). Cache **v225**.

---

## [v224] — 2026-06-28 — 🤖📱 Telo: la persecución, justa + el celu en la habitación (feedback dueño)

Más arreglos del telo con tu feedback: **(1)** el Carpo salta al **MEDIO del cuarto** (antes saltaba pegado a la puerta y
"escapabas" al instante; ahora hay que **correr** a la puerta de verdad). **(2)** la **PUERTA está MARCADA**: verde, con
glow, cartel "SALIDA" y una **flecha pulsante** durante la persecución (sabés a dónde ir). **(3)** si el robot **te
atrapa, se VA y quedás en la habitación** (como lo charlamos): aparece un **📱 celu brillando en la mesita** → lo agarrás
[E] → llamás a los linyeras (se cagan de risa + "te lo arregla el de Garbarino") → salís **chipeado con la quest ya
arrancada**. **(4)** al chiparte ahora **bajás al cine con el HUD visible** (antes volvías al bodegón top-down con el HUD
oculto → no veías el 🤖 ni la pista). Cache **v224**.

---

## [v223] — 2026-06-28 — 🏁 Telo: pantalla de RESULTADO (escapaste/te chiparon) + música audible

Más feedback del telo. Ahora al terminar la persecución hay una **pantalla de resultado grande y centrada** —
**🚪💨 ¡ESCAPASTE!** o **🤖💉 ¡TE AGARRÓ!**— que se queda ~2-3s **antes de salir al bar**, así **siempre sabés qué pasó**
aunque te atrapen rápido o no llegues a leer el cartelito. Y se subió el volumen de la **música de telo** (estaba casi
inaudible) para que se escuche bien grasa cuando entrás con la rubia. Cache **v223**.

---

## [v222] — 2026-06-28 — 🏷️ Versión visible + 🤖 el robot del telo (mejor, más justo, lee como robot)

Dos cosas. **(1) La versión del juego ahora se VE** (`specs/version-visible.md`): en la intro (abajo), en ⚙ Opciones y en
"Tu partida" [P]. Se lee del propio cache-bust `?v=N` (single source, no hay constante que se desincronice) — así sabés
qué versión agarró el navegador. **(2) El robot del telo, arreglado** con tu feedback: ahora **se dibuja como un ROBOT**
de verdad (chapa metálica, antena con luz, pantalla con ojos LED rojos, brazos con pinza y una jeringa con el chip), no
una mancha negra; **el Carpo pega un salto más lejos** de la cama y el **robot es un toque más lento** → ahora SÍ podés
escapar corriendo a la puerta; hay un **cartel rojo fijo arriba** ("¡ES UN ROBOT! ¡CORRÉ A LA PUERTA!") que no se va, así
te enterás aunque te atrapen rápido; y **se arregló** que el robot saltara si ibas a la cama **antes** que la rubia (ahora
espera a que ella llegue). Cache **v222**.

---

## [v221] — 2026-06-28 — 🤖🎮 LA QUEST DEL CHIP completa: sacátelo con el pibe de Garbarino, un troyano y una consola

El arco del chip ahora es **jugable de punta a punta**. Si el robot del telo te chipa, quedás **chipeado** (🤖 en el HUD)
y arranca la cadena: **(1)** hablás a un **linyera** → se ríen ("¿de qué bando jugás?") y te mandan al **pibe de Garbarino**;
**(2)** el vendedor de Garbarino te pasa la posta y **CONTROLÁS AL PIBE DE GARBARINO** (🧑‍💼🤖); **(3)** **Maxi** (EducaciónIT
p4) **y Marcos** (p9) te arman un **TROYANO**; **(4)** los **jubilados de TecToys/Commodore** (cine, piso Consolas) te
consiguen una **CONSOLA** en el chino (−20 🪙, va al inventario); **(5)** **usás la consola** desde el inventario [I] →
hackeás el chip → te despertás, sin chip, todo normal (repetible). Hecho **data-driven** (la quest es un grafo de pasos
`CHIP_QUEST` + runtime genérico, sin if-chain). **Los linyeras saben todo y te dan PISTAS** del paso actual. Y los
**hitos** ahora se separan en **★ Principales / ☆ Secundarias** (+ el hito del chip). 2 NPCs nuevos (los jubilados).
Persiste en el guardado. SDD `specs/telo-chip-quest.md`. Cache **v221**.

---

## [v220] — 2026-06-28 — 🤖💉 GIRO del telo: ¡la "rubia" es un ROBOT IA que te quiere CHIPAR! (huí o quedás esclavo)

Giro pedido por el dueño: te metés en la cama y **pegás un salto** — no era un patova celoso, es una **TRAMPA de la IA**:
la "rubia" es un **ROBOT** que te quiere clavar un **CHIP** en la nuca para hacerte su **esclavo**. Ahora hay que **HUIR
A LA PUERTA**: el robot te persigue (más lento que vos: si corrés derecho, **ZAFÁS**). Si **escapás** → volvés al bar a
salvo; si **te atrapa** → te **chipea**: manoteás el celu de la mesita, les escribís a los linyeras y **se cagan de risa**
("¿de qué bando jugás ahora, pibe?"), uno te tira el hook "**esto te lo arregla el pibe de Garbarino**", te despertás y
huís. *(Esto último es la versión canned —Q0—; el **arco completo** —celu→chat real→**cambio de personaje** al pibe de
Garbarino→troyano con Maxi/Marcos→jubilados de TecToys/Commodore→comprar consola en el chino→curar el chip— está
**diseñado** en `specs/telo-chip-quest.md`, a construir por fases.)* Cache **v220**.

---

## [v219] — 2026-06-28 — 🏩 El telo, mejor: espejos grandes, mesita, ropa tirada, MÚSICA grasa y el PATOVA (no un oso)

Pulido del telo (feedback del dueño): los **espejos** ahora son **grandes y se entienden** (marco dorado + reflejo con
brillo), **pegados a la cama**; hay una **mesita de luz**; **ropa tirada en el piso** cerca del jacuzzi (la de ella, y la
TUYA aparece cuando te metés 👗👠👕👖); suena **música de telo bien grasa** (el track `telo` chiptune lento, se corta al
salir). Y el remate: el oso 🐻 (que era "muy tierno" 😄) ahora es un **PATOVA de dos metros TODO DE NEGRO, con máscara y
los OJOS ROJOS brillando** — da miedo, dibujado a mano (sin líos de marca). Cache **v219**.

---

## [v218] — 2026-06-28 — 🍻🔝 EL BODEGÓN ahora se ve DE ARRIBA (mesas + jugadores online sentados + la rubia)

Segunda parte (T2) del rediseño del salón: el bodegón ahora es una **vista de arriba** (sub-modo nuevo `js/bodegon.js`,
patrón de las tiendas/telo). Hay **mesas de madera** con los **jugadores ONLINE sentados** (presencia real via SSE,
`Salon.getPeers`), un **mostrador con la rubia** (te acercás + E → te invita; otra E → te lleva al **telo**, v217) y la
**salida** (bajás al cine "EN VIVO"). Caminás libre (WASD) y tirás **emotes (1-4)** y **frases preset (5-8)** que ven los
demás. Si no hay conexión, es un bar canned jugable solo (degradación). *(Falta T2b: el chat privado 1-a-1 dentro del
top-down — quedó como deuda por el anidado del overlay de chat.)* Cache **v218**.

---

## [v217] — 2026-06-28 — 🏩 EL TELO de la rubia (gag top-down): jacuzzi → cama → ¡OSO de 2 metros!

El gag de la rubia del bodegón se vuelve una **mini-aventura vista de arriba** (sub-modo nuevo `js/telo.js`, mismo
patrón aislado que las tiendas/super). Aceptás la invitación → entrás a un **telo de lujo**: jacuzzi, cama enorme,
espejos por todos lados, pósters y una **puerta media rara**. Secuencia: te metés al **jacuzzi** con ella (vapor +
siluetas + corazones, todo **insinuado y cómico**, nada explícito) → ella se va a la **cama** → te metés → de la puerta
rara **sale un OSO de DOS METROS** ("¿¡qué hacés con mi mujer!?") que te **persigue** por la pieza → te **agarra y te
planta de vuelta en el bar**. Gag recurrente, registro paródico de bodegón. (Primera parte —T1— del rediseño del salón;
el bodegón top-down con mesas + peers online —T2— viene después.) FSM probada de punta a punta. Cache **v217**.

---

## [v216] — 2026-06-28 — 🎸 La viola: gente con MÚSICA (no billetes) + drones que vuelan por el heavy metal

Pulido del arma viola (pedido del dueño): cuando la risa pega, **la gente** queda muerta de risa **con música** (🎵😂,
ya no con el ícono de billetes 💰 que es del dólar) y los **drones/voladores salen volando ALOCADOS por el heavy metal**
(🤘🎸, zigzag hacia arriba hasta perderse). `fx.js` (kind `laugh` → `fleeing` para voladores / `laughing` para gente) +
`enemies.js` (update del vuelo errático + draw de los íconos). Además: la **ayuda de la intro ahora muestra [I]
inventario**. *(SDD: `inventario-armas.md` §5 efecto viola + §6 armas criollas usables solo en los sueños/niveles
generados, cada una eficaz vs un tipo de bicho; `fabrica-niveles-ai.md §A0-DEEP`.)* Cache **v216**.

---

## [v215] — 2026-06-28 — 🃏🎸 Lote de fixes del gate del cuevero + inventario (reportes del dueño)

Varios arreglos del flujo **ruta A (Guido)** + el **inventario**:
- **El linyera escolta ahora te HABLA y te guía:** cuando elegís "tengo contactos" no te sigue mudo — te dice a dónde
  ir ("dale pibe, vamo a ver a Guido a EducaciónIT, la tiene clara cantando flor"), te **recuerda cada ~12s** y en
  **cada sala** (subí, hablá a Guido, llevame a la mesa, sentate). Igual Guido camino a la mesa del tahúr.
- **El tahúr ya NO te ofrece "de a 6"** si elegiste la ruta de los contactos (Guido): te recuerda que vayas a buscarlo,
  en vez de proponerte el 3vs3 (que era para la ruta de jugar vos directo).
- **La puerta al chino (truco) ahora SÍ se abre** cuando ganás el truco **por Guido** (ruta A): `guidoBeatsTahur`
  faltaba marcar `trucoWon` — por eso no se desbloqueaba aunque hubieras ganado.
- **Inventario / la viola NO te roba los dólares:** el tesoro ya **no auto-equipa** la viola (queda en la mochila); por
  defecto seguís con los **💵 dólares** (el HUD y el inventario lo muestran así post-tormenta). Cambiás a la viola con [I].
- **El fierro criollo va al inventario** pero el Carpo **se niega a usarlo** (gag pacifista: "no a la violencia, esto lo
  guardo para curar carne o cuatrerear ganado"). Queda como ítem guardado.
- **El stun post-truco** (las minas te afanan) ahora tiene cierre claro: el tahúr dice "déjenlo al pibe" y te libera
  (2s, antes 2.6). Ya no parece un freeze.

Cache **v215**.

---

## [v214] — 2026-06-28 — 🐛 FIX: se trababa al SUBIR AL BODEGÓN (la puerta no estaba cableada)

Bug reportado por el dueño: al subir del cine "EN VIVO" al **bar/bodegón** el juego **se trababa**. Causa: la puerta
`up` del 8º piso (cine8) **nunca se cableó** a la sala del bodegón (cine9) — faltaba `wire(cine8, 'up', cine9, 'down')`.
Al cruzar, `current` quedaba `undefined` y el render reventaba cada frame → freeze. **Fix:** se agregó el wire. Además,
**defensa para el futuro:** `transition()` ahora chequea que la puerta tenga destino válido (`d.to`/`rooms[d.to]`) y si
no, avisa en vez de romper. (Las puertas "especiales" super/vinilos/chinoback/chinotruco no usan `transition` — van por
`DOOR_HANDLERS` a sub-modos —, así que el guard no las afecta.) Cache **v214**.

---

## [v213] — 2026-06-28 — 🔒 BODEGÓN F2b.2: CHAT PRIVADO 1-a-1 (te acercás a alguien y apretás E)

Tal como lo pediste: en el bodegón, además de hablarle a **todos** (frases preset) ahora podés **acercarte a otro
jugador y apretar E** → se abre un **chat privado** entre vos y esa persona (panel de chat, **solo lo ven ustedes dos**).
El mensaje va por el salón (`Salon.whisper`) dirigido a ese peer, **no a la IA** y **no en público**. Texto efímero
(no se guarda), con rate-limit. Si alguien te escribe y no tenés el chat abierto, te avisa ("💬 X te habla en privado").
Reusa el panel `#chat` en "modo peer" (`peerChat` en game.js; `nearestPeer()` elige al más cercano; `openPeerChat`/
`peerChatSend`/`onPeerWhisper`). Cliente `Salon.whisper/onWhisper` + relay dirigido en el proxy (infra-34). Cache **v213**.
*(Falta F2b.3: las mesas como puntos de interacción compartida; y F3 = truco PvP.)*

---

## [v212] — 2026-06-28 — 🍻📡 BODEGÓN F2b: te encontrás con OTROS jugadores EN VIVO (real-time por SSE)

El bodegón ahora es **multijugador real**: al subir te **conectás** (`Salon.join` → stream SSE) y **ves a los otros
jugadores moverse** en tiempo real (interpolados), cada uno con su **nick**, **emotes** (🍻🤝💃🎸, teclas **1-4**) y
**frases preset** porteñas (teclas **5-8**: "¿todo bien maestro?", "salú", "tomá que van", "aguante el bodegón"). "Subís
y te cruzás con alguien." Es un relay **sin autoridad** (cada cliente postea su pos ~6/s y recibe las de los demás), con
**degradación total**: sin red/`EventSource` el bodegón queda single-player (los mozos canned + el gag de la rubia, v211)
y **nadie nota que faltaba**. Sin chat de texto libre → emotes + frases preset = **sin moderación** (decisión de diseño).
`js/salon.js` (cliente F2b) + el relay en el proxy (infra-33). Cache **v212**. *(Falta F2b.2: chat privado 1-a-1 + mesas
como puntos de interacción; y F3 = truco PvP.)*

---

## [v211] — 2026-06-28 — 🍻 EL BODEGÓN porteño (9º piso del cine) + el gag de la RUBIA y el ROPERO

Primera parte del **bodegón** del multijugador (F2a, single-player por ahora). Nuevo **9º piso del cine**: un **bodegón
porteño** con mesas redondas, parrilla, barriles y mozos. Subís desde el piso EN VIVO. En modo "degradado" (sin el
servidor de tiempo real) es un bar jugable solo con NPCs canned — tal como dice el diseño. Estrella del piso: **la
RUBIA explosiva** que atiende y **siempre te quiere llevar a "probar unos tragos en la puerta de atrás"**; si le decís
que **SÍ** (apretás E de nuevo), de la trastienda sale un **ROPERO de dos metros** que te **planta en la vereda** de un
saque 😵. Gag recurrente, humor de bodegón. *(El encuentro real-time entre jugadores por SSE —F2b— queda para cuando se
decida dónde vive el `salon-server`, pregunta de infra abierta.)* 47 salas. SDD `specs/multijugador.md §3.2`. Cache **v211**.

---

## [v210] — 2026-06-28 — 🎸 INVENTARIO + la VIOLA de Les Luthiers que dispara RISAS

Nueva mecánica pedida por el dueño: el **tesoro del búnker** (el linyera mayor, cuando ya sos gurú) ahora, además de
los dólares y la munición, te entrega una **🎸 viola de Les Luthiers que dispara RISAS** — un arma que **mata de risa,
no de bala**: apacigua a **CUALQUIER** enemigo (hasta los voladores, a diferencia del dólar que sólo frena a la gente
de a pie), los deja tirados cagándose de risa 😂, inofensivos. Para eso se implementó un **INVENTARIO**: las armas son
**DATA** (registro `WEAPONS`), tenés un `inventory` y equipás una con la tecla **[I]** (overlay nuevo); el HUD muestra
el arma equipada. El **escupitajo** sigue siendo el arma base (post-tormenta escupe dólares). Todo **persiste en el
guardado** (inventario + arma equipada). El proyectil de risa son **notas musicales** ♪♫ amarillas. *(El cierre "después
de la tormenta la viola la dejás" ya está en la narración del final.)* SDD `specs/inventario-armas.md`. Cache **v210**.

---

## [v209] — 2026-06-28 — 👾 A0: los ENEMIGOS (y los peligros) de un nivel generado REFLEJAN la historia

Tercera parte del A0. Hasta ahora **todos** los niveles auto-generados (vecino, oráculo) sacaban sus enemigos de un
**pool genérico igual para todo** → se sentían iguales aunque el texto/look cambiara. Ahora el **TIPO** de enemigo sale
del **motif** de la historia (REGLA #0: un solo mapa `motif → "vibe" → pool`, que el generador consume para todos los
caminos): una casa del **🔪 slasher** te tira melee agresivo y denso (peatón/pacman), una **👻 embrujada** te llena de
**voladores** (galaga/dron), el **🎤 karaoke de la mafia** trae **tiradores** (cueveros), un **🤢 mercado podrido** un
**enjambre** veloz de pacman, una **patota** (🧵 taller, 👜 feria) viene **a pata**. Cada vibe además ajusta la
**cantidad** (el enjambre es más denso que la casa de fantasmas) y los **peligros del piso** (fantasma → **pozos** que
ceden; slasher/tiradores → **pinchos**). Sigue pasando por la RED (jugabilidad garantizada). (`VIBES`/`MOTIF_VIBE`/
`vibeFor` en `js/nivelai.js`.) Con esto el A0 (niveles que reflejan la historia) queda **cerrado**: texto IA + look
propio (v208) + geometría por `style` + enemigos/peligros por motif. Cache **v209**.

---

## [v208] — 2026-06-27 — 🎨 A0: cada historia del vecino tiene su PROPIO look (paleta + props temáticos, no un molde genérico)

Segunda parte del A0 (que los niveles **reflejen la historia**, no solo el texto). Las historias **vivas** (las que
autora la IA en el banco) usaban un molde visual **random genérico** (`visualTemplate`) → todas se veían parecidas.
Ahora cada historia deriva un **look PROPIO y determinístico**: paleta de terror (hash del relato → 1 de **10** hues
distintos) + **props armados desde su `motif`** (el emoji de la historia + 5 props tenebrosos rotados por el seed).
Mismo relato → mismo look (consistente); relatos distintos → niveles visualmente distintos. (`motifVisuals` en
`game.js`.) El `style` (climb/wall/aisles, que ya trae cada historia) varía la estructura. Cache **v208**.
*(Queda en A0 la variedad más profunda de geometría/enemigos ligada al motif + el spinoff del chino.)*

---

## [v207] — 2026-06-27 — 🐛 Fixes: saltar carteles AHORA sí anda (umbral) · pre-tormenta NO dispara · nivel del vecino entra AL TOQUE

Más playtest del dueño:
- **Saltar carteles (v206) no andaba:** el umbral para que un cartel fuera salteable era `ms ≥ 4500`, pero **la
  mayoría son de 2500-4000ms** → no se saltaban. Bajado a **`ms ≥ 2500`** (solo los toasts fugaces <2.5s no se
  saltan). Y el click ya **no consume el disparo**: post-tormenta el click salta el cartel **y** dispara; pre-tormenta
  no dispara igual.
- **Pre-tormenta el Carpo NO dispara:** `player.shoot()` no estaba gateado → escupía desde el arranque. Ahora
  `player.canShoot = stormed || spinoffLevel` (`game.js`) → **pre-tormenta no dispara** (no hay combate); en los
  niveles generados sí.
- **Nivel del vecino entra AL TOQUE (A0 latencia):** `passToBuilding` ahora es **cache-first** (como las tiendas):
  abrís con el tema **al instante** (IA-cacheado si ya pasaste por esa historia, si no el estático) y la IA
  **enriquece en background** para la próxima vez — se van los segundos de espera. (La deuda de que el look refleje
  más la historia sigue anotada como **A0** en el roadmap/backlog.) Cache **v207**.

---

## [v206] — 2026-06-27 — ⏭️ Saltar los carteles narrativos (E o click) + el linyera te avisa al llegar a Guido

Playtest del dueño:
- **Carteles salteables:** los mensajes narrativos LARGOS (cuevero, Guido, vecino, linyera…) ahora se **saltan con
  `E` o click izquierdo** (además del timeout). Solo los largos (`ms ≥ 4500`) son salteables; los cortos de combate
  no, para no comerte clicks. El click que saltea **no escupe** (consume el disparo). `dismissMsg()` en `game.js`.
- **Escolta del cuevero (ruta A) más clara:** cuando el **linyera te está escoltando** y llegás a EducaciónIT P8 (la
  sala de Guido), te **avisa**: *"ahí lo tenés a Guido, hablale del truco"* y se piro. (`g.guido.escortArrived`,
  disparado en `transition()` al detectar la sala con el NPC `action:'guido'`.)
- **Coherencia ruta A vs "de a 6":** si ya elegiste ir con **Guido** (ruta A), los compañeros de truco (Pino/Coya)
  ahora lo **reconocen** ("ya arreglaste con Guido, no mezcles") en vez de mandarte al tahúr en vano (que con Guido
  siguiéndote no ofrece el de-a-6) → se va el loop sin salida que reportó el dueño. (`g.truco.mateGuido`.) Cache **v206**.

---

## [v205] — 2026-06-27 — 📡 MULTIJUGADOR F1: el 8º piso del cine es "EN VIVO" (ves cuántos juegan ahora y qué hicieron)

**Qué cambió (jugador):** el edificio del cine tiene un **piso nuevo arriba de todo, "EN VIVO"** (los 7 pisos de
noticias quedan intactos). Su pantalla muestra el **mundo vivo**: **cuántas personas están jugando AHORA**, en qué
zona andan ("3 en la cueva, 1 en el chino…") y un **ticker de hitos anónimos** ("alguien le ganó al tahúr",
"alguien desató la tormenta", "alguien entró al búnker"). Primera piedra del multijugador (`specs/multijugador.md`).

**Cómo (técnico):** capa **aditiva** (`js/salon.js`, patrón de `presence.js`): sin backend → la pantalla dice "modo
offline" y el juego anda 100% igual. Cada cliente manda un **latido** (`POST /salon/beat {pid, sala, ev?}`) cada ~5s
y en cada `applyEdge` (hito anónimo); el piso lee `GET /salon/live` cada ~4s y dibuja el dashboard (`drawSalonScreen`,
mismo marco que el cine). Sala `cine-live` como DATA (`level.js`, wire cine7→cine8; 45→**46 salas**, paridad v1≡v2
verde). i18n ES/EN. **NO usa IA ni WebSockets** (relay liviano). El bodegón real-time (F2, SSE) viene después.

---

## [v204] — 2026-06-27 — 🎰 Fix: la generación IA caía a estático AUNQUE hubiera modelo PAGO (timeout del cliente)

**Qué cambió (jugador):** los niveles generados (vecino/chino/oráculo) y el surtido de tiendas volvían a sentirse
"siempre iguales" porque la **IA no llegaba a autorarlos** y caía al fallback estático — *aunque haya modelo pago*.

**Por qué pasaba (lo que notó el dueño):** la cadena de modelos probaba los **gratis primero** (lentos, timeoutean)
y el **pago iba al final**; con el presupuesto total de 8s y 4s por modelo, los 2 free se comían el tiempo y **el
pago nunca se probaba**. Encima el **cliente abortaba a los 6s**. Resultado: estático, con el pago disponible.

**Cómo (técnico):**
- **Proxy (infra-30):** para `gen` (contenido del dueño: niveles/tiendas/historias) la cadena ahora es **directa al
  modelo PAGO confiable** (`GEN_MODELS`, default `gemma4-paid`) — sin los free lentos — con presupuesto holgado
  (`GEN_TIMEOUT` 16s / `GEN_PER_MODEL` 14s; un 31B tarda en escupir el JSON). El chat sigue igual (8s, free-first).
- **Cliente (`js/nivelai.js`):** `AI_TIMEOUT` de gen 6s → **16s** (la generación no es el chat en tiempo real; el
  breaker igual corta tras el 1er timeout real). Cache **v204**. `npm test` verde.

---

## [v203] — 2026-06-27 — 👾 Fix: en los niveles GENERADOS los enemigos estaban CONGELADOS (ahora se mueven y te persiguen)

**Qué cambió (jugador):** reportaste que los niveles generados (el del vecino y el de la trastienda del chino) se
sentían **muertos**: "los enemigos no se mueven, ni aparecen cosas locas". Era un **bug**: un enemigo sólo actúa si
está `hostile`, y eso se prendía con la **tormenta** — pero en un nivel generado la tormenta no se dispara, así que
quedaban **quietos**. Ahora en todo nivel generado los enemigos arrancan **activos**: caminan, vuelan, te persiguen
(incluidos los pacman/galaga/drones con su movimiento loco). El mundo generado es hostil de entrada.

**Por qué importa:** los niveles del vecino/chino ya tenían 13 paletas y un pool variado de enemigos, pero con todo
**congelado** se veían todos iguales. Con los bichos en movimiento, cobran vida. *(Nota: la variedad EXTRA que autora
la IA —geometría/tema a medida— depende del upstream; ahora mismo OpenRouter está con timeouts intermitentes y cae al
fallback estático, que igual rota temas/paletas.)*

**Cómo (técnico):** en `loadGenLevel`, tras crear los `states`, `for e of enemies → e.hostile = true; e.dormant =
false`. Cubre el vecino y el spinoff del chino (ambos pasan por `loadGenLevel`). Cache **v203**. `npm test` verde.

---

## [v202] — 2026-06-27 — 🛖 ATAJO secreto al búnker (piso 3): no subas los 20 pisos cada vez

**Qué cambió (jugador):** una vez que sos **gurú** (abriste el búnker con el tótem), aparece una **puerta-atajo
secreta al búnker en el piso 3** del edificio abandonado. Así no tenés que volver a subir los 20 pisos cada vez que
querés ir a dormir/loopear o buscar el tesoro. (Pedido de playtest del dueño.) *(Aclaración: post-tormenta, el lugar
de las joyas pasa a ser el cajón de la falopa — por eso el "te rajan del edificio" de las joyas ya no está ahí.)*

**Cómo (técnico):** puerta `atajobunker` en el piso 3 (sala 16, gate `bunkerUnlocked`) ↔ `atajop3` en el búnker
(sala 34), wireada bidireccional. DATA del nivel (`level.js`) → `level-data.js` regenerado, paridad v1≡v2 +
playable verdes. Cache **v202**. *(Los ids de puerta van en minúscula: `slug()` de gen-level los baja, si no rompe
paridad.)*

---

## [v201] — 2026-06-27 — 🃏 Truco "DE A 6" (ruta B): el tahúr te reta 3 vs 3 → reclutás un equipo que te SIGUE — Fase 2

**Qué cambió (jugador):** pediste que la ruta B (ganarle vos al tahúr) tuviera lo del **truco de a 6**. Ahora cuando
le hablás al tahúr **sin Guido**, te reta: *"acá se juega de a 6, traete dos compañeros"*. Vas a buscar a **2
truqueros** (uno en la galería, otro en el lugar secreto), los reclutás y **te siguen** hasta la mesa (reusa el
follow cross-room de la Fase 1). Con el equipo armado se juega **3 vs 3**: jugás **tu duelo de truco real** y los de
tus 2 compañeros se resuelven por su **pericia (`skill`)** — gana el equipo con **2 de 3**. Si ganan, el tahúr te
perdona y se destraba el cuevero.

**Cómo (técnico):** NPCs reclutables `action:'mate'` (`mate:{id,skill}`, DATA del nivel; plumbing en `level.js`/
`mundo.js`/`gen-level.js`/`schema` + `level-data.js` regenerado, paridad v1≡v2 verde). En `game.js`: flags
`trucoSeisOffered`/`trucoSeisActive` + `trucoMatesRec` (serializados); `NPC_ACTIONS.truco` se ramifica (Guido →
auto-win; si no, ofrece de-a-6 / pide equipo / juega); `recruitMate` suma compañeros (companions que te siguen,
mismo sistema que Guido); `resolveTrucoSeis(youWon)` = tu duelo + los de tus mates por skill, 2 de 3. El resultado
del duelo se intercepta en el handler del arcade-truco. Textos ES/EN. Hooks `__gate.tahur/recruitMate/mates/
seisOffered/seisResolve` + test e2e (reto → reclutar 2 → te siguen → resolución 3v3 consistente). Cache **v201**.
`npm test` + paridad + schema verdes.

---

## [v200] — 2026-06-27 — 🤝 COMPAÑEROS que te SIGUEN cruzando salas (follow cross-room) — Fase 1: la escolta del cuevero

**Qué cambió (jugador):** pediste que los compañeros te **acompañen de verdad**, no solo por texto. Ahora en la
**ruta A** del cuevero: el **linyera camina con vos** (cruza las puertas) y te lleva hasta Guido; cuando reclutás a
**Guido**, él **te sigue** hasta la mesa del tahúr y ahí juega. Te siguen sala por sala, caminando a tu lado.

**Por qué importa:** estrena el sistema de **follow cross-room** (era la deuda de motor #A4). Es la **base** para lo
que viene (el truco "de a 6": reclutar un equipo que te sigue).

**Cómo (técnico):** un *compañero* es un NPC REAL (mismo truco que `roamingNpc`) que **viaja con vos** — en cada
`transition()` se saca de la sala vieja y se mete en la nueva pegado a vos; el loop de `follow` (ahora con
`followOff` por compañero, así no se amontonan) lo camina hacia vos. Se **derivan de los flags**
(`guidoSummoned`/`guidoRecruited`/`guidoFollowing`/`cueveroUnlocked`) vía `syncCompanions()` → **sobreviven
save/restore** sin serializar nada nuevo (se re-arman al cargar). `clearCompanions()` en `reset()`. Textos de escolta
ES/EN. Test e2e: ruta A verifica linyera aparece → se esfuma al reclutar → Guido sigue → **cruza la puerta con vos**
(`G.go`) → se va al destrabar. Cache **v200**. `npm test` verde. *(Sigue la Fase 2: truco "de a 6" con equipo.)*

---

## [v199] — 2026-06-27 — 🐛 Fix: las tiendas no abrían (rebote en la salida) + globito de texto + textos del cuevero claros

Reportes de playtest del dueño:
- **BUG (tienda no abría):** entrabas a un local de la galería y te devolvía al toque sin generar nada. Causa: el
  jugador aparece **sobre la baldosa de salida** y el mismo `E` con el que entrabas (sigue apretado) se leía en el
  1er frame → `done` inmediato. Fix: `buyHeld` arranca en **true** en `Tienda.create` (hay que soltar `E` y volver
  a apretarlo). `js/tienda.js`.
- **UX (texto largo ilegible):** los mensajes narrativos largos iban apretados en la barra inferior. Ahora el `#msg`
  es un **GLOBITO centrado más arriba** que envuelve en varias líneas, con fondo propio (`css/style.css` `.hud-center`
  /`.hud-msg`), y se oculta cuando está vacío.
- **Textos del cuevero/Guido (ruta A) claros:** el "aparece un linyera de la nada" hacía creer que un compañero te
  seguía físicamente. Reescritos (ES/EN) para dejar claro que **vos** vas a buscar a Guido y que, para el tahúr,
  **andá a su mesa y sentate** (Guido aparece y gana) — sin prometer un acompañante que camine con vos. *(El follow
  físico cruza-salas sigue siendo deuda de motor, [[backlog]] #A4.)*

---

## [v198] — 2026-06-27 — 💾 Se persiste el chusmerío del vecino (la historia activa sobrevive recargar/guardar)

**Qué cambió (jugador):** si charlabas con el vecino de un edificio clausurado y recargabas/volvías a la partida,
el hilo se reiniciaba (te repetía historias, perdía la oferta abierta). Ahora el **estado por edificio** (qué
historias ya te contó, en cuál vas, la oferta activa) **se guarda** y al volver el vecino sigue donde estaban.

**Por qué importa (REGLA #0 — MEMORIA):** cierra la última deuda fina del vecino. El chusmerío deja de ser estado
efímero del NPC (que se reconstruye en cada carga) y pasa a **memoria persistente por edificio**, serializada con
el resto de la partida.

**Cómo (técnico):** mapa `vecinoState[edif] = {told, storyCount, activeStory}` en `game.js`, incluido en
`serialize()`/`restore()` (junto a `entrado`). El NPC del vecino se **hidrata** desde `vecinoState` la 1ª vez que le
hablás en una sesión (`hydrateVecino`) y se **vuelca** tras cada mutación (`persistVecino`). Reseteado en `reset()`.
Test `tests/e2e.js`: round-trip (charlar → `serialize` → `continueGame` → el `storyCount`/`told` sobreviven). Cache
**v198** (solo web). `npm test` verde.

---

## [v197] — 2026-06-27 — 🛍️ La IA autora la ECONOMÍA de las tiendas (precio + potencia, clampados) + caché persistida

**Qué cambió (jugador):** el surtido de los locales de la galería ya no solo cambia de **nombre**: la IA ahora
también propone **el precio y qué tan fuerte es cada producto**, así dos visitas/seeds se sienten distintas en la
billetera, no solo en la etiqueta. Y lo que la IA te armó **queda guardado**: si recargás, el local sigue con su
surtido autorado (no se regenera de cero).

**Por qué importa (REGLA #0 — todo DATO/MEMORIA, con red de seguridad):** cierra la deuda fina de las tiendas. La
economía deja de estar 100% anclada al molde, pero **el balance se protege con clamps duros**: la IA *sugiere*, el
cliente *clampa* a un rango sano por tipo de ítem, y **la moneda (`pay`) y el tipo de efecto (`give.item`) siguen
siendo del molde** — la IA no puede romper la economía, solo matizarla. (Decisión ya tomada en el SDD §Economía.)

**Cómo (técnico):**
- **Proxy** (infra-28): `theme:'shop'` ahora pide por producto `{label, emoji, cost(2-30), amount(5-50)}` y los
  sanea a entero/rango en el server.
- **Cliente** (`js/nivelai.js`): `requestShop` captura `cost`/`amount`; `generateShop` los aplica con **clamp por
  kind** (`clampCost`: coins ≤25 · caramelos ≤30 · forros ≤12, mín 2 · `clampAmount`: coins 4-25 · ammo 10-40 ·
  health 5-50). Falta dato → valor del molde (backward-compat).
- **Persistencia:** `shopCacheBox` se **carga/guarda en localStorage** (`ts_shopCache_v1`) → el surtido autorado
  sobrevive recargas (memoria del cliente, como el autosave). Headless/sin `localStorage` → no-op seguro.
- **Tests:** `tests/tienda.js` +clamp de economía IA (absurdo→tope, sano→pasa, `pay` intacto) +persistencia en
  localStorage (mock). `npm test` verde. Cache **v197**.

---

## [v196] — 2026-06-27 — 🕯️ Banco VIVO de historias del vecino: la IA autora también el TEXTO (no solo el nivel)

**Qué cambió (jugador):** el vecino de los edificios clausurados te flashea historias de terror **nuevas y siempre
distintas** — ya no salen de un banco fijo de 6 relatos, las **escribe la IA** (un gancho + un relato corto y
siniestro) y son **propias de cada edificio** (el instituto, el arcade, la chorería, Garbarino). El gancho que la
IA inventa es el que titula el nivel al que entrás. Si la IA no está disponible, el banco estático sigue ahí (nunca
se rompe). ES/EN.

**Por qué importa (REGLA #0 — todo DATO/API/MEMORIA):** cierra la última deuda fina del vecino. El TEXTO de las
historias deja de estar hardcodeado en `game.js` y pasa a ser un **banco vivo servido por API**, alimentado por la
IA, igual que la propaganda / las noticias / el chusmerío.

**Cómo (técnico):**
- **Cliente:** `js/historias-vecino.js` (capa aditiva, calco de `propaganda.js`) trae `GET /historias` →
  `window.HISTORIAS_VECINO`. `game.js`: `pickVecinoStory(n, edif)` ahora **prefiere** el banco vivo del edificio
  (sin repetir), con **fallback** al estático `VECINO_STORIES`; `vecinoTale`/`vecinoGancho`/`themeFromStory` toleran
  una historia "viva" (texto ES/EN propio) tomando los **visuales** (paleta/props/style) de un molde curado.
- **Proxy** (infra-27): banco `HISTORIAS` en PVC (`/data/historias.json`) + `GET /historias` + `POST /historias`
  (GEN_TOKEN) + métrica `tormenta_eco_bank_items{bank="historias"}`/`_age_seconds`.
- **Cron:** `ai-proxy/gen-historias.mjs` + CronWorkflow `historias` (1×/día, `45 4 * * *`): por edificio×idioma pide
  `PER` relatos `{gancho, tale, motif, style}` y los postea.
- **Tests:** `Game.__vecino.pick(edif)` + aserciones en `tests/e2e.js` (sin banco → estático; con banco del edificio
  → vivo; banco de otro edificio → no se filtra). Cache **v196**. Battery verde.

---

## [v195] — 2026-06-27 — 🕸️ El gate del cuevero y el vecino entran al GRAFO de historia (pistas del linyera)

Integra las dos features de hoy al **grafo `historia.js`** (REGLA #0: *todo es grafo*), así el **HintEngine** (las
pistas escaladas del linyera/Mensajero) las conoce. Dos aristas nuevas en las fichas `specs/nivel-1/**`:
- **`cuevero_gate`** (sets `cueveroUnlocked`) + **`tormenta`** ahora con `pre: { cueveroUnlocked }`: en la cueva, la
  1ª pista pasa a ser **"destrabá al cuevero ganándole al tahúr"** y, recién destrabado, **"dispará la tormenta"**.
  Las dos rutas (vos / Guido) setean el flag vía `applyEdge('cuevero_gate', 'cueveroUnlocked')` → el grafo es **dueño
  de la transición** (Fase 2).
- **`vecino`** (post-tormenta, `at:'calle'`, `pre:{stormed}`, `sets:{vecinoSeen}`, terminal): el linyera te sugiere
  **"hablale al vecino del edificio clausurado y pasá"** hasta que entrás a uno. `vecinoSeen` es derivado de
  `entradoEdif`; `passToBuilding` dispara `applyEdge('vecino')`.

Grafo: 12 → **14 aristas**. Tests `tests/e2e.js` (HintEngine + Fase 2) actualizados a la nueva realidad (cueva →
`cuevero_gate` → `tormenta`; estados post-tormenta incluyen `cueveroUnlocked`). Battery + web-smoke + paridad verdes.
*(Sólo web — no toca el proxy.)*

---

## [v194] — 2026-06-27 — 🕯️ El vecino de los edificios clausurados: historias de terror → nivel generado

Implementa `specs/edificios-clausurados-historias.md`. Post-tormenta, al lado de cada **edificio clausurado**
(EducaciónIT, arcade, chorería, Garbarino) hay un **vecino** al que le hablás y te **flashea historias de terror**
del edificio: los juguetes diabólicos del 4°B, la mujer que llora en el pasillo, el pibe del 7° y el hacha, la fiesta
que no termina, los que golpean las puertas, el gato negro del dueño muerto. **Iterás** ("contame otra") y, tras un
par, te ofrece **"¿querés pasar y ver qué pasó con {gancho}?"**. Aceptás → **la máquina de niveles GENERA un nivel
con esa última historia como semilla** (paleta/props/enemigos del relato, validado por la RED + auto-reparación) y, al
**ganarlo, quedás en el interior REAL del edificio** (sus salas, lo que había antes) por si querés explorar. La 2ª vez
que entrás, el vecino va directo a la oferta; el lazo se repite (cada pasada, nivel nuevo). Convierte cada edificio
muerto (antes: solo un mensaje de "ruina") en **contenido vivo e infinito**.

Capa **aditiva + resiliente**: banco de historias **estático** (siempre anda, sin red) + **IA opcional** que autora
el nivel (`requestHistoria` → proxy `theme:'historia'` con geometría; circuit breaker → estático al toque). Overlay
`#vecinomenu` (calco de `cueveromenu`), i18n ES/EN completo, flag `entrado[edificio]` serializado. v2: `vecino` en
gen-level/mundo/schema (paridad v1≡v2 verde). Test `tests/e2e.js` hook `Game.__vecino` (historia → pasar → nivel →
interior real al ganar). **Deuda anotada**: que la IA autore también el TEXTO de las historias (hoy estático) y meter
el vecino al grafo `historia.js`. *(Toca web **y** proxy — branch `theme:'historia'`, ver infra-26.)*

---

## [v193] — 2026-06-27 — 🃏 Gate del cuevero: desbaratar al tahúr (truco) antes de la tormenta

Implementa `specs/cuevero-gate-truco.md`. El cuevero que cambia (la cueva del fondo) **ya no te vende ni dispara la
tormenta de una**: está **ocupado con dramas con el tahúr** y se te abre un **menú de 3 opciones**:
- **A — "tengo contactos"** → aparece un **linyera** que te manda con **GUIDO** (EducaciónIT). Guido se te presenta;
  si ya **descubriste la trastienda del tahúr** te acompaña; al sentarte a la mesa **Guido juega y le gana** → te
  pasa el "te perdono" del tahúr.
- **B — "yo me arreglo"** → vas vos, **le ganás al truco** al tahúr (motor real) y el tahúr te perdona.
- **C — "me voy a otro cuevero"** → dead-end con humor (todos andan con la misma rosca).

Con el "te perdono" (`cueveroUnlocked`), el cuevero **sí vende** → comprás → **estalla la tormenta**, ahora como
**final de una cadena** y no como atajo del primer minuto (te empuja a recorrer edificio/EducaciónIT/súper/arcade).
Flags nuevos (`cueveroUnlocked`/`tahurDiscovered`/`guido*`) serializados + en `historiaState()` (los oráculos los
ven). Capa **aditiva** (sin los módulos, cae al comportamiento viejo). Overlay `#cueveromenu` (calco de `armasmenu`),
i18n ES/EN completo. Tests: `tests/e2e.js` (hook `Game.__gate`) cubre ruta A end-to-end + dead-end + venta destrabada
+ round-trip de flags. **Deuda anotada**: el linyera-guía es scriptado por mensajes (no follow cross-room) y los flags
aún no entraron al grafo `historia.js` (la discoverabilidad la da el propio menú). *(Sólo web — no toca el proxy.)*

---

## [v192] — 2026-06-26 — 🛍️ Tiendas generadas — Parte 2: la IA autora el SURTIDO (cache-first + fallback)

Completa `tiendas-generadas.md`: el surtido de los 4 locales ya no es solo el molde estático. `POST /nivel-ai
{theme:'shop', tipo}` hace que la IA **autore el surtido** del rubro — **nombre + intro + clientela + nombres de los
productos** (con sabor: "afrodisíaco casero", etc.). La **economía** (precios/efectos) queda **anclada al molde**
(precios sanos; la IA solo re-bautiza). **Cache-first**: la tienda abre **AL TOQUE** con lo que haya (estático o
cacheado) y la IA enriquece **en background** → la próxima visita ya entra autorada. Circuit breaker: IA caída →
estático instantáneo. `NivelAI.requestShop`/`shopCache` + `generateShop(tipo,base,ai)`. Test `tests/tienda.js`
ampliado (IA autora + caché + fallback). *(Requiere redeploy del proxy — infra-24.)*

---

## [v191] — 2026-06-26 — 🛍️ Tiendas generadas (galería de la cueva): le hablás al local y ENTRÁS a su interior

Primera parte del SDD `tiendas-generadas.md`: los 4 locales raros de la galería de la cueva (**Sex-shop "El Subte"**,
**Comida rara**, **Masajes Felices**, **El Tenebroso**) dejan de ser un menú plano — ahora **entrás a la tienda**.
Cada NPC declara su **rubro** (`tienda.tipo`, DATA) y `NivelAI.generateShop(rubro)` arma un **interior top-down**
(`js/tienda.js`, hermano de Spinoff): clientela que chusmea + **mercadería** coherente con el rubro que te acercás y
**comprás** (monedas/caramelos según el ítem), con tu vieja venta como **ítem ancla**. Sin meta, sin combate, sin
tormenta; salís por la cortina y volvés EXACTO a donde estabas. **Aditivo**: sin `NivelAI`/`Tienda` cae al menú viejo
(`buyFromShop`). El cuevero y el vendedor de armas **no** se tocan. Plumbing v1+v2 (`tienda` fluye por level.js/
mundo.js/gen-level + schema), paridad v1≡v2 OK. Test `tests/tienda.js` (rubros + clientela + compra) en CI + `npm test`.
**Falta (siguiente parte):** que la **IA autore** name/intro/wares por rubro (`POST /nivel-ai theme:'shop'`) + caché;
hoy el surtido es el molde estático `SHOP_RUBROS`.

---

## [v190] — 2026-06-26 — 🌀 Transición súper → nivel generado menos abrupta (beat narrativo + flash)

La entrada al nivel que crea la IA "saltaba" de golpe del súper (vista de arriba) al nivel (vista lateral), sin
puente. Ahora hay un **beat**: al colarte a la trastienda → `flash()` + mensaje narrativo ("te colás detrás de la
cortina, al fondo donde vive la familia del chino... la realidad se retuerce y la IA dibuja el nivel"), y al CAER en
el nivel generado otro `flash()` (no aparece de golpe). Mensajes `g.nivelai.oraculo`/`shaping` reescritos (es/en).

---

## [v189] — 2026-06-26 — 🕴️ El vendedor de armas se REVELA post-tormenta (de tipo común a un trajeado siniestro)

El misterioso (`???`) de la cueva, pre-tormenta es un tipo común. **Post-tormenta se transforma**: sprite nuevo
`misterioso_storm` — un **trajeado siniestro** (traje negro, camisa blanca, corbata roja, lentes negros con brillo
rojo, piel pálida) y el nombre pasa a **«El Trajeado» / "The Suit"** (en rojo). `game.js` hace el swap cuando
`stormed` (solo el sprite `misterioso`, aditivo). e2e + web-smoke OK.

---

## [v188] — 2026-06-26 — 🪜 Fix escalera edificio (parte 2): el 1er escalón hacía de PARED y te encerraba

El rightward-staircase de v187 dejó el 1er escalón en y10 (2 filas sobre el piso). Como el Carpo mide ~1.25 tiles,
al caminar por el piso **la cabeza chocaba ese bloque** → el escalón actuaba de **PARED**: al caer por la escalera
quedabas atrapado a la derecha, **sin llegar al ascensor ni poder trepar** (la escalera "flotando"). Fix: subir los
escalones a **y9/7/5** (el 1ero a 3 filas del piso) → el piso queda **TRANSITABLE por debajo** (la cabeza pasa) y
sigue saltable desde el piso. Puerta `up-stairs` a y3. Regenerado `level-data.js` → paridad v1≡v2 OK. Tests verdes.

---

## [v187] — 2026-06-26 — 🏚️ Fix edificio borrachines: el cajón de la falopa + la escalera de incendios (2 bugs del rework de ascensores)

Dos regresiones que dejó el rework de los ascensores del edificio (cuando pasó de ancho 17 a 24):
- **Cajón de la falopa "perdido":** el trigger del cajón (joyas/maletín, post-tormenta da falopa para Iorio) había
  quedado en x11.9, **pegado al ascensor de BAJAR (x14)**. Como en `nearestInteract` las **puertas se evalúan antes
  que los NPC**, al pararte en el maletín ganaba el ascensor → apretabas **E y bajabas** en vez de agarrar la falopa.
  Corrido el cajón (joyas/maletín + trigger) **a la izquierda** (≤x11.4) → tiene zona de interacción propia.
- **Escalera intransitable:** era un **zigzag de 2 columnas** (x17↔x19), así que el **3er escalón caía justo encima
  del 1ero** (misma columna, 4 filas arriba = el apex del salto) → al saltar del 1ero **la cabeza chocaba el 3ero**.
  Rehecha como **escalera en una sola dirección** (17→19→21, 3 escalones) con la puerta arriba a la derecha: ningún
  escalón queda sobre otro, todos los saltos tienen aire libre. (R4 no modela el techo/cabeza — por eso no lo cazó.)
- Regenerado `js/level-data.js` (v2) → **paridad v1≡v2 OK**. e2e + playable + web-smoke verdes.

---

## [v186] — 2026-06-26 — 📣 Primera marca REAL en la publicidad (EducaciónIT) + intro: tecla P y el súper chino

- **Publicidad — 1ª marca real:** `ads/manifest.json` deja de ser 100% ficticio. **EducaciónIT** (instituto de
  tecnología de Florida y Lavalle, ya en el lore con la `secretaria`) ocupa el slot **`arcade-pantalla-1`**
  (pantalla LED animada) con su slogan real *"¡Transformá tu vida profesional!"* y colores de marca. Las demás
  campañas siguen ficticias (Cumbia Cola, Telo El Edén, Blue Bank, Pizza Obelisco, Fideos Mamushka). El render ya
  soporta `img` con fallback a texto; EducaciónIT va como texto+colores (sin hotlink → no taintea el canvas).
- **Intro (la pantalla que ves al entrar):** los **controles** ahora incluyen **`P` — tu partida** (panel de tus
  métricas de sesión: motor, tiempo, chats, truco…). Y a los locales se sumó el **súper chino** ("comprá algo para
  no pasar hambre 🥟"). En ES/EN + el default del HTML.

---

## [v185] — 2026-06-26 — 🚶 Enemigos que respetan los pozos + 2 temas nuevos (lavadero de billetes, farmacia vencida)

Pulido y contenido nuevo de la máquina de niveles:
- **Enemigos que NO se tiran al vacío:** los caminantes (peatón/pacman) y el cuevero (turret) ahora **frenan en el
  borde** de un pozo en vez de caer (`edgeAhead`: mira si hay piso adelante). **Aditivo**: solo en salas con pozos
  (`room._hasPit`); las 38 a mano no cambian en nada.
- **2 temas nuevos** (ya son 9): **«Lavadero Blanco Como Nieve»** (lavan billetes en vez de ropa) y **«Farmacia
  Casi Vence»** (remedios vencidos, jarabes caseros). Como siempre: data (`THEMES`) + `BRIEF` en el proxy, con texto
  bilingüe estático y la IA autorando arriba.
- e2e (corre los 9 temas) + playable + geometria + web-smoke OK. *(Redeploy del proxy — infra-23 — para el texto IA
  de los temas nuevos; el cliente ya los juega con su texto estático.)*

---

## [v184] — 2026-06-26 — 🎨 La IA autora la geometría COMPLETA: ahora también los OBSTÁCULOS (pinchos + pozos)

Cierra el círculo "todo lo dibuja la IA". Antes los pinchos/pozos eran procedurales; ahora la IA también los
**autora como DATA**: el proxy `/nivel-ai` pide `"hazards": [[x, ancho, "pit"|"spikes"]]` (oráculo + temas fijos),
el cliente los toma como `aiHazards`, los **sanea** (`sanitizeHazards`: ancho ≤2, lejos de columnas sagradas) y
`generateLevel` los usa **si pasan la RED**; si no (dos pozos pegados, pincho sobre la meta…), **auto-repara** a
obstáculos procedurales. Resultado: la IA diseña la geometría COMPLETA (plataformas + enemigos + pinchos + pozos),
toda tamizada por R4/R5. `assemble` acepta una lista explícita de obstáculos (re-rolleable). Tests `tests/geometria.js`
(+obstáculos IA presentes, +auto-repair de obstáculos rotos). e2e + playable + web-smoke OK. *(Requiere redeploy del
proxy — infra-22 — para que mande `hazards`; el cliente funciona sin él.)*

---

## [v183] — 2026-06-26 — 🕳️ POZOS (huecos en el piso): te caés y reaparecés — con la RED validando que sean saltables

Segundo obstáculo nuevo: **pozos** (`hazard` kind `pit`). A diferencia de los pinchos, el pozo **CALA el piso**
(`Mundo` borra los tiles del piso en ese tramo → hueco real por el que el jugador **cae**). Si te caés: daño +
**reaparecés** en lugar seguro (solo en salas generadas con pozos; **aditivo**, las 38 a mano no se tocan). La RED
se hizo más lista: **R4 ahora cruza huecos** (BFS con saltos de hueco hasta `JUMP_ACROSS`=3, chequeando que las
columnas intermedias estén ABIERTAS — un pozo se cruza, un muro que sobresale **no**). Así un pozo de **ancho 1-2 se
salta** (pasa) pero uno de **ancho 3 es RECHAZADO** (auto-repara). El generador siembra pinchos **o** pozos (≤2 de
ancho, lejos de spawn/meta/puerta) y **re-rollea los obstáculos** si rompen la RED, dejando las plataformas fijas
(no descarta la geometría IA por un obstáculo). Render: el hueco se oscurece + postes rojos al borde. Tests
`tests/geometria.js` (+pozos aparecen, calan el piso, ancho 3 rechazado). e2e + playable + web-smoke OK.

---

## [v182] — 2026-06-26 — 🪤 Niveles generados con más riesgo: PINCHOS (obstáculo nuevo) + enemigos variados + pickups siempre alcanzables

Los niveles que arma la máquina ahora tienen **más variedad y peligro**, todo como DATA validada por la RED:
- **PINCHOS (`hazard`) — obstáculo nuevo:** entidad `hazard` en el modelo (`Mundo` → `room.hazards`), daño al
  contacto en el loop principal (con el cooldown de `player.hurt` + rebote). **Aditivo**: las 38 salas hechas a mano
  no tienen hazards → cero efecto. La RED gana **R5**: un pincho sobre la columna del spawn/meta/puerta se rechaza
  (te dañaría sin escape). El generador los siembra en el piso, lejos de las columnas sagradas → saltables.
- **Enemigos variados:** antes solo peaton/dron; ahora el pool suma **pacman** (rápido), **galaga** (vuela rápido) y
  **cuevero** (dispara), pesado hacia peaton/dron para que sea justo.
- **Pickups siempre alcanzables (R4 para pickups):** `Playable.reachableTops` le dice al generador qué plataformas
  se pisan saltando → los premios se ponen **solo donde se llega** (antes podían quedar flotando inalcanzables).
- Tests `tests/geometria.js` ampliado (R5 pincho, 40 niveles con pinchos+variedad jugables, pickups alcanzables) +
  `hazard` en el schema. e2e + playable + web-smoke OK. *Pendiente: pozos/caídas (necesitan muerte por caída).*

---

## [v181] — 2026-06-26 — 🏗️ Geometría IA también para los TEMAS FIJOS (no solo el oráculo)

Antes la geometría autorada por IA solo fluía por el tema **oráculo**; los 7 temas fijos seguían procedurales.
Ahora también: `NivelAI.requestGeometry(themeId)` le pide al proxy `/nivel-ai` (con `geometry:true`) las
**plataformas + enemigos** del tema, y `launchNivelAI` (game.js) los usa en el path de tema fijo. El **circuit
breaker** lo cubre: si la GPU está caída, `requestGeometry` llama `cb(null)` AL TOQUE → cae a la geometría
procedural sin colgarse. Mensaje "🌀 la trastienda se reordena…" mientras la IA dibuja. El proxy refactorizó el
saneo de geometría a un helper `parseGeom` (oráculo + tema fijo) y el pedido de geometría se agrega al prompt solo
cuando el cliente lo pide (`wantGeom`). Tests `tests/geometria.js` +2 casos (requestGeometry pega la geometría /
proxy caído → fallback). Docs: `fabrica-niveles-ai.md §4.8`. *(Requiere redeploy del proxy para geometría en vivo.)*

---

## [v180] — 2026-06-26 — 🏗️ La IA autora la GEOMETRÍA del nivel (no solo el tema) — validada por la RED (R4 reachability) + auto-reparación

El salto grande de la "máquina de niveles": la IA ya no elige solo el `style`, **diseña la geometría** como DATA.
En el tema **oráculo**, el proxy `/nivel-ai` ahora también devuelve `platforms` (array de `[x,y,ancho]`, una
escalera trepable) y `enemies` (posiciones). El cliente las toma como `aiPlatforms`/`aiEnemies`, las **sanea
liviano** (a la grilla, sin garantizar jugabilidad —a propósito— para que la red trabaje) y `generateLevel` las
usa **por sala**. La pieza clave: **`Playable` ahora tiene R4 — reachability con física de salto** (BFS de
superficies parables; se trepa ≤3 tiles por salto, apex real ~3.9): si una sala con geometría IA no se puede
**recorrer hasta la meta/puertas**, se **AUTO-REPARA** cayendo al layout procedural (garantizado jugable). Así la
imaginación de la IA llega al jugador **sólo si es transitable**; si propone un muro infranqueable, la red lo caza
y repara — sin colgar ni publicar un nivel roto. Tests nuevos: `tests/geometria.js` (geometría buena se usa · muro
infranqueable se auto-repara · basura se ignora · enemigos IA presentes) — en CI + `npm test`. La señal de salud
del breaker (v179) sigue cuidando que si la GPU se cae, el oráculo cae a tema estático al toque. Docs:
`specs/fabrica-niveles-ai.md §4.7 (R4) / §4.8 (geometría)`. *(Requiere redeploy del proxy para que el oráculo
mande geometría; el cliente funciona igual sin él — geometría opcional con fallback.)*

---

## [v179] — 2026-06-26 — 🛡️ Circuit breaker en el CHAT + señal de salud COMPARTIDA con la máquina de niveles

Extendimos la resiliencia al **chat con los linyeras**. Antes, con la GPU caída, cada mensaje esperaba el
`PROXY_TIMEOUT` de **11s** antes de caer al pool local. Ahora `js/ai.js` tiene un **circuit breaker**: un
timeout o un 5xx del proxy **abre el circuito 60s** → los próximos mensajes **NO esperan**, caen AL TOQUE a la
línea en personaje (pool `SAT`/`LINYERA_POOL`). Se **cierra solo** cuando el proxy vuelve a responder. La **señal
de salud se COMPARTE** con el generador de niveles (`js/nivelai.js`) vía `window.__aiHealth`: como pegan al mismo
backend GPU/proxy, si uno detecta la IA caída el otro también falla rápido (y viceversa). Test nuevo
`tests/breaker.js` (4 escenarios: abre por timeout, no llama al proxy con el circuito abierto, señal compartida,
cierra al recuperar) — sumado a CI y a `npm test`. Docs: `specs/resiliencia.md` (tabla L2/L3 + RF-3 ✅).

---

## [v178] — 2026-06-26 — 📄 Página /info y /tech ACTUALIZADA con todas las mejoras (motor, máquina de niveles, dólares, resiliencia)

La página de presentación ahora SÍ muestra lo que nos hace distintos de un juego normal. **`info/tech.html`**
(+EN): 4 capas nuevas → 🎮 motor data-driven (entidades+componentes, paridad v1≡v2, registros), 🏭 la máquina de
niveles por IA + la RED de jugabilidad (validador formal: solo niveles jugables llegan), 🔮 niveles a tu medida
(la IA usa tu memoria/charlas), 🛡️ resiliencia (GPU caída → estático al toque, circuit breaker). **`info/index.html`**
(+EN): 3 cards nuevas (niveles que crea la IA, disparás dólares/cámaras/AFIP, siempre vivo y resiliente). HTML
balanceado verificado.

---

## [v177] — 2026-06-26 — 🛡️ Resiliencia GPU: circuit breaker (si se cae la IA, modo estático al toque, NO se cuelga) + docs

Premisa del dueño: *"si se me va al tacho la GPU, no se puede parar todo, tiene que ir al modo estático"*. Agregado
un **circuit breaker** en `js/nivelai.js`: si una llamada a `/nivel-ai` falla o tarda (timeout bajado a **6s**), se
**abre el circuito 90s** → `requestOraculo`/`enrich` caen a **estático AL TOQUE** (sin esperar timeouts). Así un pod
de GPU *pending* (lo que pasó) ya no "tilda" la generación. Se cierra solo cuando la GPU vuelve. (El `{}` de antes
era justamente la GPU pending, no el código.) Docs: `specs/features-showcase.md` (§4.b resiliencia) +
`specs/roadmap-pendientes.md` (tareas que quedan, incl. la página /info-/tech). e2e + playable + web-smoke OK.

---

## [v176] — 2026-06-26 — 🪜 Fix escalera del edificio: zigzag SIN solape (el 2º bloque ya no tapa al 1º)

La escalera estaba "muy junta": los escalones se solapaban en x, así que el 2º quedaba casi ENCIMA del 1º y te
tapaba la cabeza → no podías saltar. Ahora es un **zigzag SIN solape**: cada bloque va al COSTADO del anterior
(x17↔x19, 2 de alto), nunca encima. El primer escalón queda en **x17, al lado del ascensor (x16) sin taparlo**
(verificado por la RED). 5 bloques, saltables. (El `{}` de /nivel-ai era el pod de la GPU pending, no el código.)

---

## [v175] — 2026-06-26 — 🔮 Tema "ORÁCULO": la IA inventa un nivel a tu MEDIDA (según tus charlas) + SDD showcase de features

La IA ya no solo autora el TEXTO: en el tema **oraculo** **INVENTA un nivel a tu medida**. Te colás a la trastienda
y ~40% (si charlaste con los linyeras) el oráculo te lee la mente: el cliente junta tus mensajes (`oracleMem` →
`playerChatTopics`) → `POST /nivel-ai {theme:'oraculo', chats}` → la IA inventa name/intro/frases y **ELIGE el
style/layout** guiñando a lo que hablaste → tema ad-hoc → pasa la RED (Playable) → rooms-swap. Carga async con
fallback. **Memoria del jugador → mundo generado.** Además: **SDD `specs/features-showcase.md`** que cataloga TODAS
las técnicas interesantes (fuente para la futura página /info y /tech). e2e (tema-objeto jugable) + web-smoke OK.

---

## [v174] — 2026-06-26 — ✨ Generador: 3 temas nuevos (feria trucha, fábrica de petardos, karaoke mafia) + escalera del edificio más saltable

Generador: **3 temas nuevos** (DATA) → `feria-trucha` (marcas truchas, aisles), `fabrica-petardos` (pólvora, climb),
`karaoke-mafia` (KTV clandestino, aisles). Ya son **7 temas**; stress-test 350 niveles → 0 fallos de jugabilidad.
La IA del proxy autora su texto (BRIEF en server.js). **Edificio:** la escalera de incendios se corrió pegada al
ascensor (x17-20, casi vertical, offsets de 1 tile con solape) → ahora se salta casi derecho, como pidió el dueño.
Playable + parity + e2e + web-smoke OK.

---

## [v173] — 2026-06-26 — 🏢 Edificio rediseñado (ascensores juntos + escalera al costado saltable + items que regeneran) + cámaras visibles

Según el feedback: el piso ahora tiene **los muebles a la izquierda (x3-12) intactos**, los **DOS ASCENSORES juntos**
al medio (bajar x14 · subir x16) y la **ESCALERA de incendios bien al costado** (x18-22, escalones anchos de 3 con
solape, 2 de alto → saltables y perdonadores; el run es 210, salto 3.9). La escalera **no tapa ni los muebles ni
los ascensores**. Las plataformas vienen **LLENAS de items que se REGENERAN** (~12s; los pisos del edificio
respawnean el loot). Además: **cámaras de seguridad visibles** (calle + cuevas) que **reaccionan al dólar** — LED
verde (serie buena/legal) o rojo (trucha), y la burbuja de serie/AFIP sale EN la cámara. Playable + parity + e2e +
web-smoke OK, nada fuera de límites.

---

## [v172] — 2026-06-26 — 🪜 Edificio borrachines: DOS formas de subir — ascensor O escalera de incendios (saltando)

Ahora el concepto bien: cada piso (1..19) tiene **las DOS opciones**. **Ascensor** (puerta a nivel de piso, x=w-3)
como siempre, **y** una **ESCALERA DE INCENDIOS** nueva: zigzag de plataformas en el costado derecho que **subís
SALTANDO** (pasos de 2 tiles; el Carpo salta ~3.9) hasta una **puerta en ALTURA** (x14,y2) que te lleva al piso de
arriba (caés al pie de la escalera para volver a trepar o tomar el ascensor). Soporte nuevo de **puertas con altura**
(makeRoom `feet(x,y)`) + la RED (Playable) saltea R1 para puertas altas (se apoyan en plataforma). Ancho 22 (entra
depto + escalera + ascensor). parity v1≡v2 + Playable + e2e + web-smoke OK, nada fuera de límites.

---

## [v171] — 2026-06-26 — 🏙️ Edificio borrachines: SACO la escalera y restauro el piso angosto original (w=17)

El concepto de la escalera era una vía ALTERNATIVA para subir al piso de arriba sin el ascensor — no un adorno —
y la implementé mal (dead-end + trababa la salida + ensanché el piso). Como pidió el dueño ("si no podés, sacá la
escalera y listo"): **revertido a w=17** (original), sin plataformas en los pisos del edificio. Subís/bajás por el
ascensor, limpio. Nada fuera de límites + Playable OK + parity + e2e + web-smoke.

---

## [v170] — 2026-06-26 — 🏗️ Generador C: estructura por TEMA (la muralla parece muralla) + meta con portal real

Sigue el generador de niveles. Cada tema declara un **`style`** (DATA) que cambia la forma del nivel generado:
**`wall`** (muralla: sala ancha, caminás por arriba del muro con almenas y huecos para saltar) · **`aisles`**
(góndolas: 2 filas horizontales) · **`climb`** (zigzag que sube). Responde el "no parece una muralla": ahora SÍ
se siente distinto por tema. La **meta** usa el **art de portal real** (`Art.portal`). Stress-test: 200 niveles
(50×4 temas) → 0 fallos de jugabilidad (la RED valida todo). e2e + playable + web-smoke OK. (Próximo salto: que
la IA autore el layout como data, no solo el texto.)

---

## [v169] — 2026-06-26 — 🤖 Robots leen la serie del dólar (buena=legal, no te ven / trucha=te disparan) + orígenes + DÓLARES como DATA

Iteración sobre el dólar. Las **personas no detectan nada** (solo se apaciguan); los **ROBOTS/cámaras** sí: leen
la SERIE de cada dólar. **Serie BUENA = legal** → los drones NO te ven unos segundos (derivan sin disparar);
**serie TRUCHA = ilegal** → te siguen disparando. La burbuja **siempre** dice "serie buena/trucha {número}" + a
veces 2ª línea: 🚨 AFIP u **origen detectado** (cueva Florida/Lavalle, valija de Kristina, venta de armas, estafa
de la AFA, drogas del cartel, venta ilegal, Monopoly). **v2:** el mecanismo es código (primitiva), pero el
CONTENIDO (truchaChance, blindMs, lista de orígenes) pasó a **`rules.dollars` (DATA)** — autorable por la máquina
de niveles (gen-level→schema). e2e: dron ciego no dispara / no-ciego sí + parity/playable/web-smoke OK.

---

## [v168] — 2026-06-26 — 💵 El Carpo dispara DÓLARES (apaciguan a la gente) + Pappo melena larga + birra · cámaras/AFIP

El protagonista ahora es **Pappo de verdad**: melena larga (no pelado), **birra en la mano** y viola al hombro
(sprite `drawHero` reescrito). **Post-tormenta escupe DÓLARES** (`player.dollarMode = stormed`): contra la GENTE
(no voladores) los **APACIGUA** — se tiran al piso a juntar billetes (`e.pacified`, 💰+$) y no te joden más (no
mueren); contra MÁQUINAS (drones) hace daño normal. El escupitajo pre-tormenta sigue dañando. Las **cámaras** ven
cada dólar → burbuja con la **SERIE**: ~65% real, ~35% **TRUCHA → AFIP** (es una copia). e2e cubre las 3 reglas
del dólar + parity/playable/web-smoke OK. SDD specs/nivel-1/personajes/protagonista.md.

---

## [v167] — 2026-06-26 — 🏙️ Edificio: escalera de incendios VERTICAL (no diagonal) + nivel-AI multi-sala/enemigos/decor

DOS cosas. (1) **Fix edificio borrachines:** la escalera del costado dejaba de cruzar el interior en diagonal —
ahora es una **salida de emergencia VERTICAL en zigzag** (x16↔x18, sube recto), confinada al hueco libre entre el
departamento y el ascensor, con el loot arriba y propaganda flanqueando. La RED (Playable) confirma 0 problemas y
el ascensor libre. (2) **Nivel-AI de más calidad:** `generateLevel` ahora arma **2-3 salas conectadas por puertas
recíprocas** (spawn 1ª, meta última, wiring por Mundo), **enemigos despiertos** (peaton/dron) y **decor temático
con art válido** por tema. e2e verifica multi-sala + puertas cableadas + jugabilidad. parity + playable + web-smoke OK.

---

## [v166] — 2026-06-26 — 🎮 C ladrillo 3: el nivel-AI generado CORRE EN TU MOTOR REAL (rooms-swap) — ¡jugable!

El nivel generado deja de ser un sub-modo top-down: ahora **se juega en EL motor principal** (vista lateral,
saltos, física de Player, enemigos, cámara y art reales). Te colás a la trastienda del chino → la IA genera →
pasa la RED (Playable) → **swap de salas** en el motor → jugás → llegás a la SALIDA morada → volvés al juego con
el souvenir. Si no es jugable, ABORTA al juego normal (nunca un nivel roto). Gates por `spinoffLevel`: no drena
la tormenta, no autosave, morir en el bonus NO mata el run (volvés sano), [ESC] para salir. e2e: lanzar → entra
→ ganar → restaura la sala principal + souvenir → morir no rompe el run. + schema/paridad/playable/web-smoke.

---

## [v165] — 2026-06-26 — 🏗️ C ladrillo 2: la IA genera un NIVEL-PLATAFORMA real, validado y construible en tu motor

`NivelAI.generateLevel(theme)` ya NO hace una escena top-down: produce un **MODELO DE NIVEL del motor real**
(sala con plataformas saltables + spawn + meta + enemigos/pickups temáticos), el formato que consume
`Mundo.fromModel`. El **bucle de la C anda**: genera candidato → pasa la RED `Playable.checkLevel` → si falla
RE-INTENTA (auto-reparación, hasta 8) → devuelve el primero válido. e2e (los 4 temas): generateLevel → pasa
Playable → Mundo.fromModel lo CONSTRUYE con playerStart+goal. El nivel generado CARGA en tu motor, validado de
punta a punta. Falta el render/play interactivo en vivo (próximo ladrillo).

---

## [v164] — 2026-06-26 — 🥅 LA RED: validador de jugabilidad (primer ladrillo de la C / máquina de niveles)

Respuesta a "¿cómo va a generar bien la IA si vos mismo metiste un bug?": **una red automática que rechaza lo
roto antes de que llegue al jugador**. Mi bug del ascensor se publicó porque NO había red. Ahora `js/playable.js`
(`Playable.checkLevel(model)`) chequea jugabilidad sobre el modelo v2: **R1 puerta tapada** (plataforma a la
altura de la cabeza en la columna de una puerta = el bug del ascensor), **R2 spawn en sólido**, **R3 meta
enterrada**. `tests/playable.mjs` = regresión: el Nivel 1 pasa + el viejo layout del ascensor es RECHAZADO + el
arreglado pasa. Sumado a CI (schema + paridad + jugabilidad). Es el bucle que hará segura la generación por IA
(C): IA propone datos → validan schema+jugabilidad → si falla se re-pide → recién ahí Mundo.fromModel.

---

## [v163] — 2026-06-26 — 🔧 Fix: la escalera del edificio de los borrachines tapaba el ascensor

La escalera de plataformas del costado derecho arrancaba en `[20,10,3]` (x=20,21,22) y **el ascensor "subir"
vive en x=21** (`w-3`) → la plataforma cubría/tapaba el ascensor. Reubicada al hueco `x13..18`
(`[[17,10,2],[15,8,2],[13,6,2]]`), lejos de la columna del ascensor; loot arriba (x13.5) y propaganda en el
hueco (x19). parity v1≡v2 + e2e×3 + web-smoke OK.

---

## [v162] — 2026-06-26 — 🌀✨ NIVEL-AI: la trastienda del chino GENERA un nivel surreal (¡la máquina de hacer chorizos, disparada!)

Primer corte jugable del **generador de niveles**. Cuando entrás al chino por el RAID (Iorio abrió el frente), el
chino **corre en pánico hablando por GLOBITO** con frases cortas en su tonada (*"¿¡cómo entlas!?", "tolmenta
falta", "sol loco", "luz no andal"*). Aprovechás la locura y te **colás a la trastienda** (la puerta privada quedó
sin guardia) → se **GENERA un nivel surreal temático** y lo corre el sub-modo `Spinoff` (vista de arriba
explorable, NPCs con globitos, llegás a la META = portal → souvenir en caramelos).

- **Generador `js/nivelai.js`:** el molde son los `THEMES` (DATA). Temas: **super-rasca** (antro mugriento),
  **taller-esclavo** (sweatshop tejiendo ropa), **comida-podrida** (cadena de frío rota), **muralla-skate** (la
  Muralla China en skate). Compone props/NPCs/meta en una grilla.
- **IA real (opcional):** `POST /nivel-ai` en el proxy → la IA autora nombre/intro/frases en tonada chino-porteña,
  con **fallback estático** (si el modelo falla, queda el contenido del molde). Mismo patrón que los bancos.
- **Aislado** del motor principal (no toca quests/tormenta/save), como arcade/super/vinilos.
- e2e (los 4 temas generan escena válida + el spinoff termina y da souvenir) ×3 + web-smoke OK.

---

## [v161] — 2026-06-26 — 🧧 La CAJA del chino: mini-juego de pago (carrito + vuelto en caramelos + inflación + ninjas)

La caja del súper deja de ser un botón: ahora abre un **checkout** (panel en `super.js`). Ves el **changuito con
precios y total en vivo**, sacás lo que no querés (`[X]`), y **vos ponés la plata** (`[←→]`): el **vuelto se
calcula solo y SIEMPRE es en caramelos** (el peso no vale nada). Los **caramelos NO se aceptan como pago** —
*"¡chino VEGETARIANO, no comer caramelo, plata plata!"* 🥬. Al confirmar, el chino **a veces te quiere cagar con
INFLACIÓN** y te pide más plata: podés **aceptar** o **discutir** — a veces cede (*"perdón, me confundí"*), a
veces salen **2 ninjas con katana** que te **intiman** y aceptás sí o sí. Tunables como DATA (`CHINO`:
scamChance/inflaRate/relentChance/confusedChance). i18n ES/EN. e2e (checkout determinístico + pago clásico) ×3 +
web-smoke OK.

---

## [v160] — 2026-06-26 — ⚔️ El misterioso de las armas: MENÚ de compra + arsenal como DATA (sigue el barrido)

El vendedor de fierro criollo deja de ser un botón único: ahora **abre un menú** (como el guarda) para **elegir
UN fierro** (rebenque / boleadoras / facón / FAL de Malvinas), cada uno con su **costo + bonus**. El **arsenal es
DATA del nivel** (`entity.interact.arsenal` = `[{key,cost,ammo,hp}]`), no números sueltos en `game.js`:
threadeado level.js→gen-level→nivel-1.json→schema→mundo→engine, con **fallback inline = v1** (un fierro, 15🪙,
+40/+20). Elegir uno te "arma" (abre la arista de historia `armado`, igual que antes). i18n ES/EN (nombres de los
fierros + chamuyo). Overlay `armasmenu` + ESC/cerrar. Schema + parity v1≡v2 + e2e×3 + web-smoke OK.

---

## [v159] — 2026-06-26 — 🧱 v2: tope de vida y castigo de truco como rules (sigue el barrido de balance)

Más números de balance salen de `game.js` hacia `rules`: el **tope de vida** (`rules.player.maxHp`, hardcodeado
en 7 sitios como `Math.min(100, …)`) y el **castigo de perder el truco** (`rules.combat.trucoLosePenalty`, ex
`-25`). Leídos por el motor con fallback inline = v1. Misma tubería que `rules.survival`
(gen-level→nivel-1.json→schema). La máquina de niveles ajusta dureza por nivel sin tocar el motor.
Schema + parity v1≡v2 + e2e×3 + web-smoke OK.

---

## [v158] — 2026-06-26 — 🧱 v2: el loop de supervivencia como REGLAS de DATA (no magic-numbers)

Los números del **loop post-tormenta** dejaron de estar hardcodeados en `game.js`: ahora son **`rules.survival`
del nivel** (`window.LEVEL1.rules.survival`), declarados en el modelo (gen-level→nivel-1.json→schema) y leídos
por el motor con **fallback inline = los valores de v1**. Migrados: drenaje de vida (`decayHp` cada
`decayEverySec` s), vida al dormir/revivir (`fullHp`), y la fracción de monedas que conservás al dormir
(`sleepCoinKeepMin`..`sleepCoinKeepMax`). La **máquina de niveles** podrá ajustar dificultad por nivel sin
tocar el motor. Schema + parity v1≡v2 + e2e×3 + web-smoke OK.

---

## [v157] — 2026-06-26 — 🧱 v2: door-launchers como registro (puertas que lanzan sub-modo / bloquean = data)

El dispatch de puertas pasó del **if-else por id** (super/chinoback/chinotruco/vinilos/cambio/abandonado) a un
**registro `DOOR_HANDLERS`**: la puerta DECLARA su id (data) y el motor busca su handler (lanza sub-modo o bloquea con
su condición); si no tiene, **transición normal**. El handler devuelve `true` (manejó) o `false` (cae a transición, ej.
cambio/abandonado post-condición). Mismo patrón que `NPC_ACTIONS`. e2e×3 (arcade/super) + web-smoke OK.

---

## [v156] — 2026-06-26 — 🧱 v2: sub-modos como LANZADORES declarativos (registro de acciones)

El `handleNpc` pasó de un **if-else por `action`** (15 ramas) a un **registro `NPC_ACTIONS`** (verbo→handler): el
entity DECLARA su `action` (data) y el motor la despacha por el mapa (§6.97 primitiva=código, componer=dato). Las que
abren SUB-MODOS (truco/frogger) son **lanzadores** en el registro. Agregar una mecánica = sumar un verbo. Expuesto el
vocabulario en `window.Game.actions()` (para la máquina de niveles). e2e×3 (arcade/super/truco) + web-smoke OK.

---

## [v155] — 2026-06-26 — 🧱 v2: CERO regex de nombre de sala en el gameplay (truco/garbarino → tags)

Cerramos la migración de regexes de sala: la trastienda del truco va con `tags:['arcade','truco']` y Garbarino con
`tags:['garbarino']`; los 3 `/Truco/`-`/Garbarino/` restantes → `hasTag(r, t)` (helper genérico). Ahora **todo el
gameplay decide por TAGS de sala (data), no por nombres** — solo quedan regexes como *fallback* de seguridad dentro de
`isCine`/`currentAt`. Una sala se comporta como X porque lo DECLARA. Paridad 45 salas + schema OK + e2e×3 + web-smoke.

---

## [v154] — 2026-06-26 — 🧱 v2: `currentAt()` por TAG (el lugar del grafo de pistas = data)

El "dónde estoy" del grafo de historia/pistas (`currentAt`) ahora se ubica por **tag de sala** (`bunker/cueva/cemento/
cambio/arcade/galeria/edificio`) en vez de regex del nombre (con fallback al nombre). **30 salas tagueadas** (20 del
edificio vía el loop + cuevas/cemento/cambio/bunker/galería/arcade). Así el grafo de pistas y los tags de sala quedan
**unificados** (el HintEngine ubica la frontera por data). Paridad 45 salas + schema OK + e2e×3 + web-smoke.

---

## [v153] — 2026-06-26 — 🧱 v2: pisos del cine por TAG (los 7 regex de piso → data)

Seguimos migrando regex de sala a tags: cada piso del cine declara su categoría (`tags:['cine','deportes']`,
`['cine','mundo']`…) y `cineTopicsFor(r)` lee el **tag** (mapa `CINE_FLOOR_TOPICS` keyeado por tag) en vez de los 7
`/Deportes/`-`/OpenRouter/` por nombre (con fallback al nombre). `pickNoticias(r)` recibe la sala. Un piso del cine
muestra sus topics porque lo DECLARA → la máquina puede autorar pisos. Paridad 45 salas + schema OK + e2e×3 + web-smoke.

---

## [v152] — 2026-06-26 — 🧱 v2: salas con TAGS semánticos (el engine reacciona a `tags`, no al nombre)

Migrado el regex de sala más usado: `/Cine/.test(r.name)` (5 lugares) → un componente **`tags`** de la sala (data) +
un helper `isCine(r)` que lee `r.tags.includes('cine')` (con fallback al regex por las dudas). Threadeado
level.js→gen-level→nivel-1.json→mundo→engine; las 7 salas del cine van con `tags:['cine']`. Así una sala es "cine"
porque lo DECLARA, no por su nombre → la máquina puede taguear salas. Patrón listo para migrar el resto
(Abandonado/Búnker/Truco). Paridad 45 salas + schema OK + e2e×3 + web-smoke.

---

## [v151] — 2026-06-26 — 🧱 v2: los carteles de propaganda son un COMPONENTE (`ad`), no un regex de sala

Antes la propaganda rotativa se gatillaba por **regex del nombre de la sala** (`/Cine/|/Abandonado/|calle`) =
hardcode. Ahora cada cartel **DECLARA** que es superficie publicitaria con el componente **`ad`** (del schema),
threadeado en el decor (level.js→gen-level→nivel-1.json→mundo→engine). El engine dibuja propaganda en `decor.ad`
(no por nombre de sala) → la "máquina de niveles" puede poner un cartel-ad en cualquier lado. 56 carteles tagueados.
Paridad 45 salas + schema OK + e2e×3 + web-smoke.

---

## [v150] — 2026-06-26 — 🕸️ Grafo social de NPCs como DATA (conoce/rival → el chusme fluye por aristas)

Las relaciones NPC↔NPC son un **componente declarativo del schema** (`entity.social`: `knows`/`rival`), threadeado de
punta a punta. El **relay fluye por aristas**: un NPC prioriza repetir chusme de quien **conoce** (`social.knows`), y
**habla mal de su rival** ("no le creas nada a {who}, es un chanta"). Tagueado: los oráculos conocen todo el chusme del
barrio; el guarda del cine es rival del tahúr. La "máquina de niveles" podrá autorar estas relaciones. Paridad 45
salas + schema OK + e2e×3 + web-smoke.

---

## [v149] — 2026-06-26 — 🗣️ NPCs vivos: RELAY social (el chusme se propaga con atribución)

Los NPC ahora **repiten chusme de otros NPC** sobre lo que hiciste: "che, me dijo el borrachín que no le diste lo que
te pidió", "me dijo el tahúr que le ganaste al truco"… `rumorPool(worldSnapshot)` arma rumores con **FUENTE** (el NPC
que sabe) + claim derivado del estado vivo; `spawnAmbient` 50% relayea (sin que la fuente se cite a sí misma) y el NPC
cercano **reacciona**. El chusme FLUYE fuente→relayer→vos (primer grafo social, npcs-vivos §4). e2e×3 + web-smoke OK.

---

## [v148] — 2026-06-26 — 🧱 v2: `ambient` (chusmerío) como COMPONENTE declarativo del NPC

Segundo ladrillo del molde de NPCs: el participar del **chusmerío** ya no es global, es un **componente del schema**
(`entity.ambient`). Cada NPC lo declara (ej. las recepcionistas de EducaciónIT van con `ambient:false` para no
chusmear callejero). Threadeado de punta a punta: `level.js` → `gen-level.js` → `nivel-1.json` (validado) → `mundo.js`
→ engine (`eligibleNpcs` lee `n.ambient !== false`). La "máquina de niveles" podrá autorar el ambient por NPC.
Paridad 45 salas + schema OK + e2e×3 + web-smoke.

---

## [v147] — 2026-06-26 — 🧱 v2: las QUESTS son DATA DEL NIVEL (engordando el molde para la "máquina")

Las quests pasaron de vivir en `game.js` a ser **data del nivel**: `gen-level.js` las emite en `levels/nivel-1.json`
(+ `window.LEVEL1.quests`), **validadas contra el schema** (`level.schema.json`, `$defs/quest` alineado a la forma
hook-based real). `game.js` las **lee del nivel** (array→map; fallback inline). Las primitivas (`QUEST_PRIMS`) siguen
en código (§6.97). → un nivel puede traer SUS quests; la **máquina de niveles** (`fabrica-niveles-ai.md`) podrá
autorarlas. Paridad 45 salas + schema OK + e2e×3 + web-smoke.

---

## [v146] — 2026-06-26 — 🧩 v2 #1 (F3): quests UNIFICADAS con la pista (grafo + quests en un solo getHint)

`getHint` ahora consulta primero `Quests.hintFor('oraculo')` → una quest activa es **pista de máxima prioridad**
(recordatorio: "¿conseguiste lo del cine de X?"), y si no, cae a la frontera del grafo de historia. Así el oráculo
unifica **grafo + quests** en una sola pista (data-driven, vía `onHint` del registro). Primer puente real entre los
dos sistemas que estaban separados.

---

## [v145] — 2026-06-26 — 🧩 v2 #1 (F2): runtime GENÉRICO de quests (dispatch por data, primitivas nombradas)

Segundo paso de la migración v2 de quests. Ahora hay un **runtime `Quests`** cuyo FLUJO lo decide el **registro
de DATOS** (`QUEST_DEFS`: giver/chance/scope/reward/penalty/mensajes + hooks `onGive`/`onReport`/`onGreet`), y la
lógica específica son **primitivas nombradas** (`QUEST_PRIMS`, §6.97 "primitiva=código, componer=dato").
- `Quests.maybeGive(giver)` / `Quests.report(giver,msg)` / `Quests.greet(giver)` despachan por el registro.
- **Las DOS quests migradas** (cine/oráculo + Mundial/hinchas) → los call-sites en `chatSend`/`hinchaGreeting` ya
  no tienen lógica inline, llaman al runtime. Expuesto en `window.Game.questRuntime`.
- **Agregar una quest = una entrada de DATA** (+ una primitiva si es mecánica nueva). Próximo: quests como aristas
  del grafo de historia (que el oráculo las "vea" y las pista salga del grafo).

---

## [v144 / infra-23] — 2026-06-26 — 🔌 Chusmerío por API + métricas Prometheus del ecosistema

- **Chusmerío full API:** las frases ambiente de los NPCs vivos ya NO son un array en game.js → banco
  **`/chusmerio`** generado por IA (`gen-chusmerio.mjs`, cron 4:30am, gemma4-paid), persistido en PVC (reproducible) +
  fallback estático en `js/chusmerio.js`. `ambientPool` usa el banco vivo; las líneas de ESTADO se derivan del
  `worldSnapshot` (ecosistema, no contenido fijo).
- **Métricas Prometheus de los bancos:** `tormenta_eco_bank_items{bank=...}` (noticias/noticias_dias/propaganda/
  chusmerio/mundial_equipos) + `tormenta_eco_bank_age_seconds{bank=...}` → Grafana ve si el ecosistema está poblado
  y FRESCO (alertas si un banco queda vacío/viejo). Proxy `0.1.37`.

---

## [v143] — 2026-06-26 — 🧩 v2 #1 (F1): QUESTS como DATO (registro declarativo, nada de números sueltos)

Primer paso de la migración v2 de las quests (la deuda más visible). Las quests del cine (oráculo) y del Mundial
(hinchas) ahora leen su config de un **registro DECLARATIVO** `QUEST_DEFS` (premio/penalidad/chance/scope/mensajes =
DATA, no `+3`/`+5`/`-10` sueltos en el código). `applyReward(rw)` aplica el efecto declarado. Expuesto al ecosistema:
`worldSnapshot.questRegistry` + `window.Game.quests()` → la IA conoce TODAS las quests genéricamente. La verificación
sigue siendo función (primitiva=código, componer=dato). **F2 (pendiente):** quests como **entidades+aristas de grafo**
+ interpretador genérico (modelo-de-entidades §6.95).

---

## [v142] — 2026-06-26 — 💬 NPCs VIVOS: chusmerío ambiente (globitos que saben lo que hiciste)

Primer paso de "NPCs vivos" (`specs/npcs-vivos.md`): cada tanto un NPC tira un **globito** arriba de la cabeza
chusmeando el **estado vivo** del juego (lo que hiciste: le ganaste al tahúr, entraste al chino, los carteles, el
Mundial…) y, si hay otro cerca, **le contesta** (mini-diálogo en vivo). Líneas templadas con `worldSnapshot` (data).
Taxonomía de 3 tipos de NPC anotada (oráculo / quest / decorativo). **Deuda v2 anotada:** las líneas deben venir de
una API/pool por IA + diálogo real vía Mensajero (no del pool en game.js).

---

## [v141 / infra-22] — 2026-06-26 — 🧠 Los oráculos saben de los CARTELES (te recomiendan marcas)

Siguiendo la premisa ("todo conectado, los oráculos saben todo de todo"): el `worldBrief` que groundea a los NPC IA
ahora incluye una **muestra de los carteles de propaganda** (marcas falsas del banco) → el linyera puede
**recomendártelas** con humor ("probate el choripán de Don Ramón"). `worldSnapshot.carteles` expuesto. Límite del
grounding en el proxy 700→1000. Proxy `0.1.36`.

---

## [v140 / infra-21] — 2026-06-26 — 🧠 Primer paso v2: la IA usa el ESTADO VIVO del ecosistema (nada hardcodeado)

Premisa del dueño: *todo es dato/API/objeto/memoria/grafo → el ecosistema alimenta a la IA para que sea inteligente*.
- **`worldSnapshot()`** arma un snapshot vivo del mundo desde el ESTADO + las APIs (noticias/mundial/propaganda):
  flags, quests activas, qué pasa en el cine/Mundial, progreso. Expuesto en **`window.Game.world`** (para GraphRAG/UI).
- **`worldBrief()`** lo resume y se le pasa como **grounding** a los NPC oráculo → el linyera ahora "sabe" del cine,
  del Mundial, de tus quests y tu progreso, **desde datos** (no hardcodeado).
- **FIX importante:** el proxy **recibía pero ignoraba** el `grounding` → las pistas del grafo (y este contexto) NO
  llegaban al modelo por el proxy (solo BYOK). Ahora `buildMessages` lo usa (`personas.js`) → grounding real por el
  proxy. Proxy `0.1.35`.
- **FIX truco (de v138):** `aiPlay()` podía llamarse con la mano del tahúr vacía → crash intermitente (lo cazó el
  e2e). Blindado (guard + gate de baza activa).

---

## [v139] — 2026-06-26 — 🏚️ Edificio abandonado: escalera/plataformas + propaganda en el costado derecho

Los 20 pisos se ensancharon (17→24). El **costado derecho** ahora tiene:
- una **escalera de plataformas** que sube de **derecha a izquierda** (saltás de una a otra) con un **premio arriba**
  (monedas en lujo / vida en ruina) como recompensa por trepar;
- **carteles de propaganda** rotativos (incluido el link del **otro juego del Ciruja**, Cruz del Sur);
- el **ascensor** sigue a ras para subir de piso. Paridad 45 salas (638 entidades), e2e + web-smoke OK.

---

## [v138] — 2026-06-26 — 🃏 Truco: orden de tiro REAL (la mano) + el tahúr grita los cantos

- **Didáctica/reglas arregladas:** antes el jugador **tiraba siempre primero**. Ahora se respeta la **MANO**: la mano
  **alterna cada reparto**, tira **primero** en la 1ª baza, y después tira **el que ganó** la baza anterior (parda →
  la mano). Si el tahúr es mano, **tira él primero** y vos respondés (con cartel "el tahúr tiró, respondé"). Cartas
  **boca arriba** en la mesa.
- **El tahúr GRITA bien porteño:** TRUCO/RETRUCO/VALE CUATRO, ENVIDO/REAL/FALTA, FLOR, quiero/no-quiero, y canta
  victoria ("¡TE GANÉEE, gil!", "andá a llorar a la iglesia") — vía `Mensajero.cantar` (TTS, con fallback al server
  espeak si el navegador no tiene voz).

---

## [v137] — 2026-06-26 — 🐛 Hito del tahúr + 🥷 RAID al chino (pánico + robo gratis)

- **FIX hito del tahúr:** ganarle al truco no marcaba el hito en [P] porque `trucoWon` se **consume** al cruzar la
  puerta. Ahora hay un flag permanente `trucoEverWon` para el hito (igual el hito de Iorio pasó a `chinoEntered`,
  que también se des-marcaba al consumirse `chinoFrontOpen`).
- **RAID al chino:** al darle falopa a Iorio y entrar por el frente, el chino **entra en PÁNICO** y corre por todo
  el super ("¿¡cómo entraste!?"); **agarrás lo que quieras y te vas GRATIS** (sin pagar, sin ninjas), por cualquier
  puerta. El hito se marca al **entrar** (no al dar la falopa). Es un **loop reusable**: das falopa de nuevo → otro raid.

---

## [v136] — 2026-06-26 — ⚽ Quest del Mundial: ajuste fino (el hincha se te acerca + marcador + sesgo de equipos)

- **El hincha SE ACERCA:** al sacar el dato en el guarda, un hincha **camina hacia vos** y te agradece **en el
  momento** (+5 🍬) — tu visión original — y después vuelve a su lugar. (Si no hay hincha en la sala, queda el flujo
  de hablarle.)
- **Marcador de quest ❗:** rebota sobre el **guarda** (cuando te falta el dato) o sobre el **hincha** (cuando te
  falta contarle), para saber a dónde ir.
- **Sesgo de equipos:** el hincha pregunta con onda — 60% Argentina, 70% equipos jugosos (Brasil/Francia/rivales del
  grupo…), si no, random.
- Premio: +5 🍬 (sin penalidad: en esta quest el guarda da la verdad, no hay forma de mentir).

---

## [infra-35] — 2026-06-28 — 🔎 Proxy: validar que la presencia es REAL — `GET /salon/debug` (admin, con IP)

Para responder "¿la gente jugando es real o confío ciegamente?": la presencia **NO tiene nada simulado** (cada sesión =
un navegador real que mandó `/salon/beat` en los últimos 35s). Ahora hay forma de **validarlo**: `GET /salon/debug?token=
<GEN_TOKEN>` (admin, token-gated) devuelve las **sesiones reales** (pid, sala, **IP** del cliente vía `X-Forwarded-For`,
antigüedad en seg) + las salas-instancia del bodegón (peers con nick/IP) + el `count` de "jugando ahora". Se capturó la
**IP** en `/salon/beat` y en `/salon/join` (solo visible por el endpoint admin). Útil para confirmar deploys y cazar si
algo está raro. Proxy bump.

---

## [infra-34] — 2026-06-28 — 🔒 Proxy: chat PRIVADO 1-a-1 del bodegón (`/salon/whisper`, dirigido a un peer)

Sostén del **v213**. El relay del bodegón gana el **mensaje privado dirigido**: `POST /salon/whisper {pid,room,to,msg}`
→ lo manda **SOLO al stream del destinatario** (no broadcast). Para eso cada sala mantiene `streams: Map<pid,res>`
(asociado en `/salon/stream`). Texto **efímero** (no se guarda), **rate-limit** ~1.4/s por jugador, cap 200 chars +
saneo de caracteres de control. El público sigue siendo emotes + frases preset (sin moderación); el privado 1-a-1 es
acotado (solo a alguien de TU sala-instancia). Probado en aislamiento (6 asserts: privacidad + rate-limit + saneo).

---

## [infra-33] — 2026-06-28 — 📡 Proxy → salon-server F2b: el BODEGÓN real-time por SSE (`/salon/join|stream|pos|say|leave`)

Sostén del **v212**. **Decisión de infra:** el `salon-server` del bodegón vive en el **mismo `ai-proxy`** (Node sin deps,
ya tenía `/salon/beat|live` de la F1, mismo dominio/edge/pipeline), NO en un servicio nuevo ni en `online-game` (que es
Python/FastAPI, mal fit). Es un **relay SSE SIN autoridad**: solo retransmite entre los de la **misma sala-instancia**
(cap 6, matchmaking = llena la sala con lugar para que la gente se encuentre). Endpoints: `POST /salon/join` (te asigna
roomId + snapshot de peers), `GET /salon/stream?room=&pid=` (SSE: `peer-join`/`peer-leave`/`peer-pos`/`say` + ping de
keep-alive + `X-Accel-Buffering:no`), `POST /salon/pos` (latido + posición, retransmite), `POST /salon/say` (frase
preset por índice), `POST /salon/leave`. In-memory, efímero, prune de peers viejos (20s) y salas vacías. Sin chat libre
→ emotes + frases preset (sin moderación). Relay testeado en aislamiento (10 asserts). Proxy bump.

---

## [infra-32] — 2026-06-27 — 📡 Proxy 0.1.50→0.1.51: endpoints del SALÓN (multijugador F1) `/salon/beat` + `/salon/live`

Sostén del **v205**. El proxy gana la **presencia en vivo** para el "Cine EN VIVO" (relay liviano in-memory, NO usa
IA): `POST /salon/beat {pid,sala,ev?}` (latido + hito anónimo al ticker, poda >35s) y `GET /salon/live` →
`{count, byRoom, ticker}`. Es el **prototipo F1** (presencia/agregados); el bodegón real-time (F2) irá a un
`salon-server` SSE dedicado (no al proxy de IA). Sin persistencia (se pierde al reiniciar = ok, es social).

---

## [infra-31] — 2026-06-27 — 🧹 Builds de Argo: workspace en PVC + auto-borrado total (pods + PVC + Workflow)

Regla del dueño: los pipelines de build deben usar **PVC (`longhorn-nvme`), nada de disco local**, y **borrar todo al
terminar**. Los `*/kaniko-build.yaml` ya usaban PVC `longhorn-nvme` para el workspace; se agregó el **auto-borrado
explícito**: `podGC.strategy: OnWorkflowCompletion` (pods) + `volumeClaimGC.strategy: OnWorkflowCompletion` (PVC del
workspace, éxito o fallo) + `ttlStrategy.secondsAfterSuccess: 600` (el Workflow). Así un build no deja basura ni
presión de disco en el nodo (motivado por el incidente DiskPressure de `srv-rk1-nvme-01`, repo `infra`). Documentado
en `specs/deploy-pipeline.md §5` con el checklist de invariantes.

---

## [infra-30] — 2026-06-27 — 🎰 Proxy 0.1.49→0.1.50: `gen` va DIRECTO al modelo pago confiable (no a la cola de free lentos)

Sostén del **v204**. El `ask()` con `opts.gen` (generación de contenido del dueño) deja de usar la cadena `free-first`
(donde el pago, al final, se quedaba sin tiempo) y usa **`GEN_MODELS`** (default `gemma4-paid`) con presupuesto
propio: `GEN_TIMEOUT_MS=16000`, `GEN_PER_MODEL_MS=14000`. Todo configurable por env. El chat (no-gen) sigue con su
cadena y timeouts de tiempo real (8s/4s, free-first con pago de respaldo). Sin cambios de costo relevantes (gen es de
bajo volumen; antes igual *intentaba* el pago, solo que tarde).

---

## [infra-29] — 2026-06-27 — 🚀 Deploy de la web: rebuild del mismo tag ahora propaga seguro (`Always` + `rollout restart`)

La web reusa siempre el tag `0.1.94`. Con `imagePullPolicy: IfNotPresent`, un `helm upgrade` sin cambio de tag no
dispara rollout y los nodos quedan con la imagen vieja cacheada (por eso v202/v203 no propagaban hasta forzarlo).
Fix: `pullPolicy: Always` en `web/chart/values-prod.yaml` + `kubectl rollout restart` en `deploy/deploy.sh` tras el
`helm upgrade` (fuerza un rollout fresco cada deploy; para el proxy, que ya bumpea tag inmutable, es inofensivo).
*(Detrás de esto hubo una sesión de infra: DiskPressure en `srv-rk1-nvme-01` por la imagen `hermes-agent` 2.38G
pineada a ese nodo de SD chica → movida a `srv-rk1-nvme-04` en el repo `infra`; ver `infra/diskpressure-rk1-nvme-2026-06-27.md`.)*

---

## [infra-28] — 2026-06-27 — 🛍️ Proxy 0.1.48→0.1.49: `theme:'shop'` también sugiere la ECONOMÍA (cost/amount)

Sostén del **v197**. El branch `theme:'shop'` de `POST /nivel-ai` ahora pide a la IA, por producto, además de
`label`/`emoji`, un **`cost`** (entero 2-30) y un **`amount`** (entero 5-50) — y los **sanea a entero/rango** en el
server (`pint`). El cliente los re-clampa por kind. *(Nota: 0.1.48 fue el rebuild que metió `gen-historias.mjs` al
Dockerfile; 0.1.49 trae este cambio de economía.)*

---

## [infra-27] — 2026-06-27 — 🕯️ Proxy 0.1.47: banco VIVO de historias del vecino (`/historias`) + cron que las AUTORA

Sostén del **v196**. El proxy gana un banco nuevo, igual que propaganda/noticias/chusmerío:
- **`GET /historias`** → `{historias, updated}` (cache 10 min) · **`POST /historias`** (GEN_TOKEN, vacío no pisa) →
  persiste en PVC (`/data/historias.json`, `HISTORIAS_STORE`). Métricas `tormenta_eco_bank_items{bank="historias"}`
  y `tormenta_eco_bank_age_seconds{bank="historias"}`.
- **Cron `gen-historias.mjs`** (CronWorkflow `historias`, `45 4 * * *`, model `gemma4-paid`): por **edificio×idioma**
  pide `HIST_PER` relatos de terror cortos `{gancho, tale, motif, style}` y los postea zipeados ES/EN por edificio
  (`edu`/`arcade`/`choris`/`garbarino`). Node puro, sin deps. Chart: `values(.prod).yaml historias{enabled,schedule,
  model,per}` + `templates/cronworkflow-historias.yaml`.

---

## [infra-26] — 2026-06-27 — 🕯️ Proxy 0.1.46: `/nivel-ai theme:'historia'` autora el nivel de terror del vecino

Branch nuevo en `POST /nivel-ai`: dado `{edificio, gancho}` (la "última historia" que el vecino te contó), la IA
flashea un mini-nivel de **terror** tematizado — `name`/`intro`/`lines` (susurros de fantasma) + `style`/`motif`/
`props` + **geometría** (plataformas/enemigos/pinchos·pozos, reusa `parseGeom`+`GEOM_ASK`, `gen:true`). El cliente
(`NivelAI.requestHistoria`) lo envuelve en un tema ad-hoc para `generateLevel`; si la IA cae, usa su tema **estático**
derivado del relato (circuit breaker). Alimenta v194 (el vecino de los edificios clausurados).

---

## [infra-25] — 2026-06-26 — 💸 Proxy 0.1.45: la GENERACIÓN (niveles/tiendas) cae al PAGO siempre (no se queda vacía)

Bug: cuando el modelo **free** se agotaba (cupo del día), `/nivel-ai` devolvía `{}` porque el guard `paidLeft()<=0`
**salteaba el modelo pago** → la geometría/tiendas/oráculo quedaban en estático aunque hubiera pago disponible.
Fix: flag **`gen:true`** en las llamadas de generación (oráculo + shop + tema fijo) → la cadena prueba el free
primero y **cae al pago de respaldo SIN cap** (es contenido del dueño, no del cupo de chat de los jugadores). El
gasto se sigue contabilizando (`paidHit`), sólo que ya no **bloquea**. `deploy/deploy.sh proxy 0.1.45`.

---

## [infra-24] — 2026-06-26 — 🛍️ Proxy 0.1.44: `/nivel-ai theme:'shop'` autora el surtido de las tiendas

Redeploy del proxy (`tormenta-ai` 0.1.43 → **0.1.44**) para la rama `theme:'shop'` de `/nivel-ai`: dado un `tipo`
(rubro), la IA devuelve `{name, intro, lines, products}` (nombre/intro/clientela + nombres de productos del rubro).
El cliente lo cachea por rubro y lo usa cache-first; la economía la ancla el cliente. `deploy/deploy.sh proxy 0.1.44`.

---

## [infra-23] — 2026-06-26 — 🧺 Proxy 0.1.43: BRIEF de 2 temas nuevos (lavadero de billetes, farmacia vencida)

Redeploy del proxy (`tormenta-ai` 0.1.42 → **0.1.43**) para que `/nivel-ai` autore el texto IA de los 2 temas
nuevos (`lavadero-billetes`, `farmacia-vencida`) — sus `BRIEF` ES/EN. Deploy con `deploy/deploy.sh proxy 0.1.43`.

---

## [infra-22] — 2026-06-26 — 🎨 Proxy 0.1.42: `/nivel-ai` también autora los OBSTÁCULOS (pinchos/pozos)

Redeploy del proxy (`tormenta-ai` 0.1.41 → **0.1.42**) para que el endpoint `/nivel-ai` pida y devuelva `hazards`
(`[[x, ancho, "pit"|"spikes"]]`) además de plataformas/enemigos — tanto en el oráculo como en los temas fijos
(`geometry:true`). `parseGeom` los sanea server-side; el cliente los re-valida con la RED + auto-repara. `maxTokens`
subido (340→420 oráculo, 360→420 geometría) por el JSON más grande. Deploy con `deploy/deploy.sh proxy 0.1.42`.

---

## [infra-21] — 2026-06-26 — 🏗️ Proxy 0.1.41: el endpoint `/nivel-ai` ahora autora GEOMETRÍA (plataformas/enemigos)

Redeploy del proxy (`tormenta-ai` 0.1.40 → **0.1.41**) para poner EN VIVO la geometría autorada por IA (v180/v181):
`POST /nivel-ai` ahora devuelve `platforms`/`enemies` — para el tema **oráculo** siempre, y para los **temas fijos**
cuando el cliente manda `geometry:true`. Saneo server-side unificado en el helper `parseGeom`; el pedido de geometría
se agrega al prompt solo bajo demanda (`wantGeom`, `maxTokens` 360 vs 260). El cliente igual la re-valida con la RED
(`Playable`, R4) + auto-repara, así que un redeploy fallido o un JSON roto del modelo **no rompe nada** (cae a
procedural). Deploy con `deploy/deploy.sh proxy 0.1.41`. Ver `specs/fabrica-niveles-ai.md §4.8`.

---

## [infra-20] — 2026-06-26 — ⏱️ Refresh EN VIVO del Mundial (cron horario + merge por topic)

El Mundial/fútbol/crypto ahora se refrescan **cada hora** sin re-traer Google News:
- **Modo `NEWS_LIVE_ONLY`** en `gen-noticias.mjs`: salta Google News + resumen IA + openrouter; solo trae lo que
  cambia rápido (mundial, mundial-tabla, mundial-goleadores, primera-b/Villa Dálmine, crypto + los 48 equipos para
  los hinchas) y POSTea con **`merge:true`**.
- **`POST /noticias` con merge**: actualiza SOLO esos topics del día, **conserva** las noticias de Google News del
  run diario (antes el POST reemplazaba todo → no se podía hacer parcial).
- **2º CronWorkflow** `tormenta-ai-proxy-noticias-live` (`0 * * * *`, live-only). El run diario (5/9/23h) sigue
  trayendo todo. Proxy `0.1.34`.

---

## [v135 / infra-19] — 2026-06-26 — 🌡️ Cartel de CLIMA (open-meteo) + carteles también en la calle

- **Cartel `clima`**: temperaturas reales de varias ciudades (BsAs/Madrid/Tokio/NY/Doha) vía **open-meteo** (sin
  key, server-side en el cron de propaganda — no usa GPU, es un fetch). Refresca con el cron (1×/día); para 30 min
  queda anotado un 2º cron o fetch client-side (`carteles-ia.md §9`).
- **Carteles en la CALLE**: se sumaron 2 carteles `cartel` a Florida y Lavalle → la propaganda rotativa ahora
  aparece también en la peatonal, no solo en el cine.
- Anotado: **propaganda PAGA** (cartel con link clickeable que pague al dueño) como idea/roadmap (`carteles-ia.md §9`).

---

## [v134] — 2026-06-26 — 📣 Carteles: fix overlap con la pantalla + cartel de Cruz del Sur + tips del juego

- **Fix overlap:** los carteles-ai se pisaban con el panel de noticias. Movidos a las **esquinas** (x:2/x:20), la
  pantalla se achicó (410→360) y el panel del cartel ahora es **angosto y alto** (ocupa para arriba, slogan en
  varias líneas) → no chocan.
- **Cartel del otro juego del Ciruja**: entrada FIJA `CRUZ DEL SUR → cruzdelsur.cybercirujas.club/game` (siempre
  presente, no la pisa el banco IA).
- **Tips del juego** como carteles (`cat:tip`): "pedile noticias al linyera 7º", "regateá al guarda 🤝", "[R] te lee
  las noticias", etc. — entradas fijas en `js/propaganda.js` (se mergean con el banco IA).

---

## [v133 / infra-18] — 2026-06-26 — ⚽ Quest del Mundial: los 2 hinchas + el guarda (IMPLEMENTADA)

Implementa `cine-noticias.md §9`. En el piso **Deportes** hay **dos hinchas** (NPCs con IA, persona `hincha`): al
hablarles te preguntan **cómo salió un equipo random** del Mundial (vos no sabés). Vas al **guarda** → en su menú
aparece **"📣 Resultado de {equipo}" (gratis)** → te **cambia la pantalla** con ese partido. Volvés al hincha → te
**agradece + 5 caramelos**. Al salir del cine, **todo vuelve como estaba** (efímero).
- **Data:** `gen-noticias.mjs` recorre el **scoreboard de ESPN día por día** (sin key) → **48 equipos** con su último
  resultado → `POST /mundial` (persistido en PVC). Cliente: `window.MUNDIAL.equipos` (`js/noticias.js`).
- Reusa el patrón de `newsQuest`: el quest es **scripteado** (fiable), el chat libre con el hincha es flavor groundeado.
  Persona `hincha` en `ai.js` + `ai-proxy/personas.js` (+ canned es/en). Paridad 45 salas / 576 entidades.

---

## [v132 / infra-17] — 2026-06-26 — 📣 Carteles del cine DINÁMICOS por rubro (propaganda IA) + SDDs nuevas

- **Carteles de propaganda que CAMBIAN**: los carteles del cine ahora rotan **marcas FALSAS estilo Buenos Aires**
  por rubro (🍕 comida / 👕 ropa / 📱 electrónica / 🛸 bizarros inventados), cada ~7s y distinto por cartel. Banco vivo
  generado por IA (`gen-propaganda.mjs`, cron 1×/día 4am, `gemma4-paid` que SÍ inventa) + **fallback estático** BA en
  `js/propaganda.js` (andan aunque el proxy esté caído). Proxy: `GET/POST /propaganda` persistido en PVC.
- **SDDs nuevas anotadas** (ideas del dueño, NO implementadas): `spinoff-stargate.md` (SG-1+Atlantis fiel al canon),
  `cine-noticias.md §9` (quest de los 2 hinchas + guarda), `quest-mundo-ai.md` (mundo random generado on-the-fly por
  IA con plan premium — **sí se puede**: la IA genera los DATOS del mundo y el motor data-driven los corre).

---

## [v131 / infra-16] — 2026-06-26 — 🏆 Mundial: tabla del grupo de Argentina + goleadores (ESPN) + cron 3×/día

- **Tablas del Mundial vía ESPN** (sin key — lo que TheSportsDB gratis no daba): topics nuevos **`mundial-tabla`**
  (grupo de Argentina completo: "Group J: Argentina 6 · Austria 3 · Algeria 3 · Jordan 0") y **`mundial-goleadores`**
  ("Messi 5 · Vinícius 4 · Haaland 4 · Mbappé 4", resolviendo los `$ref` de atletas). Opt-in `NEWS_WORLDCUP=fifa.world`.
- **Cron 3×/día**: `0 5,9,23 * * *` (5am, 9am, 23h AR) — el Mundial/Villa Dálmine se refrescan varias veces.
- **Pantalla del cine con alto DINÁMICO**: se agranda para que **entre todo** (piso Deportes ahora muestra hasta 6:
  resultado + tabla + goleadores + Villa Dálmine + bochas). Tope por piso 4→6.

---

## [v130 / infra-15] — 2026-06-25 — 🐛 Fix freeze del guarda + ⚽ Villa Dálmine en el cine

- **BUG CRÍTICO arreglado:** al acercarte al guarda el juego se **congelaba** (no te podías mover). Causa:
  `GUARDA_COST` quedó referenciado en el prompt (línea 1163) pero lo borré al pasar al menú con regateo →
  ReferenceError cada frame → loop muerto. Sacado el `{n}` del prompt.
- **⚽ Villa Dálmine:** `NEWS_SPORTS` ahora soporta `topic:team:<id>` (por EQUIPO vía `eventslast.php`) →
  `primera-b:team:137785` muestra **el último partido de Villa Dálmine** ("Villa Dálmine 2-1 Sportivo Italiano").
- **Tablas del Mundial (goleadores + grupo de Argentina): BLOQUEADO por API key** — la key gratis de TheSportsDB
  trunca la tabla (Argentina ni aparece) y no tiene endpoint de goleadores. Necesita key real (api-football /
  football-data.org / Patreon). Documentado en `cine-noticias.md §7.2`. NO se inventa la data.

---

## [infra-14] — 2026-06-25 — ⚽ Cine: fútbol con RESULTADO EXACTO (NEWS_SPORTS activado)

Activado el opt-in `NEWS_SPORTS` del cron de noticias: los topics `mundial` y `primera-b` ahora traen el
**resultado numérico real** vía TheSportsDB (pisa el titular de Google News con "Equipo 2-1 Equipo"). IDs
verificados: **mundial = FIFA World Cup `4429`** (en juego jun-2026, ej. "Ecuador 1-1 Germany"), **primera-b =
Primera B Nacional AR `4616`**. Solo `values-prod.yaml` (sin rebuild; la imagen 0.1.28 ya lee el env).

---

## [infra-13] — 2026-06-25 — 🚀 `deploy/deploy.sh`: build + deploy + verify en un comando (mata el gotcha del genToken)

Automatiza el deploy (F2 de `deploy-pipeline.md`). `deploy/deploy.sh <proxy|web> [tag]` hace **build (Kaniko) →
helm upgrade → rollout → smoke** encapsulando todo lo que rompimos a mano esta sesión: release/ns/chart fijos por
componente, `-f values-prod.yaml` SIEMPRE (sin `--reuse-values`), y el **genToken re-leído del release actual** y
re-pasado con `--set` → **el 403 por token vacío no vuelve a pasar**. `DRY_RUN=1` valida el helm sin aplicar
(probado proxy+web). Pre-requisito: pushear a `main` antes (el build clona main). F3 (Argo Events on-push) queda pendiente.

---

## [docs] — 2026-06-25 — 📐 `cine-noticias.md` al día (archivo 7 días + guarda + regateo + TTS server)

Sincroniza el SDD con lo implementado en v124→v129: §3.6 nueva (archivo de 7 días en PVC + el guarda con menú,
1ª gratis, más viejo más caro, regateo hasta piso), §3.4 actualizada (varias noticias en pantalla + TTS con
fallback al server espeak-ng), Estado y Fases con F5. Sin cambios de juego.

---

## [v129] — 2026-06-25 — 🤝 El Guarda: REGATEÁS el precio de las funciones viejas

Ahora a cada función vieja le podés **regatear** (botón 🤝): el precio baja de a 1 caramelo hasta un **piso** (2 🍬).
Así las más viejas (que arrancan caras) las negociás hasta dejarlas **al mismo precio** que las otras cuando el
precio sube mucho. El guarda contesta en personaje (“te la dejo en N, no jodás más” / “hasta acá, ni en pedo”).
El regateo se resetea al salir del cine y por partida.

---

## [v128] — 2026-06-25 — 🎟️ El Guarda: elegís el día · 1ª gratis · más viejo más caro

Mejoras al guarda (feedback del dueño): ahora **abrís un menú y ELEGÍS** qué función vieja ver (no cicla). La
**primera del run es gratis**; después **cuanto más viejo el día, más caro** (cuesta = días para atrás, en
caramelos). El menú muestra cada día con su precio (o "gratis") y tu saldo de 🍬; los que no podés pagar salen
deshabilitados. ESC o "Cerrar" lo cierra.

---

## [v127 / infra-12] — 2026-06-25 — 🎟️ El GUARDA del cine: funciones VIEJAS por caramelos (archivo de 7 días)

En la entrada del cine hay un **guarda**. Le pagás **2 🍬 caramelos** y te pone una **función vieja**: las noticias
de **otro día**. El proxy archiva **hasta 7 días** (ring acotado: entra el nuevo, se cae el más viejo → no se
acumula basura). Cada vez que le pagás, te muestra un día más atrás (cicla); la pantalla marca **📼 FUNCIÓN VIEJA
DD/MM**. Al salir del cine volvés a la función de hoy.
- Loop económico redondo: el oráculo te da caramelos por el quest de noticias → los gastás con el guarda. 🍬↔📼
- Backend: `GET /noticias?day=YYYY-MM-DD` + lista `dias`; el POST del cron archiva por día y poda > 7. Proxy `0.1.27`.

---

## [infra-11] — 2026-06-25 — 🧹 POST /noticias: sobrescribe (no acumula) + un POST vacío no borra el banco

El cron **pisa** el banco entero cada corrida (reemplazo, no append) → no se acumula basura vieja. Y se blinda el
caso borde: si una corrida fallara y POSTeara **vacío**, ya **no** borra el banco bueno (responde `empty-ignored`)
— el cine no queda "sin señal" por un cron que falló. Proxy `0.1.26`.

---

## [infra-10] — 2026-06-25 — 💾 El banco de noticias PERSISTE (JSON en el PVC) — no se vacía al redesplegar

Bug: el banco de noticias del cine vivía **solo en memoria** (`let NOTICIAS = []`) y el cron lo llena **1×/día**,
así que **cada redeploy/restart del proxy lo dejaba vacío** → la pantalla del cine quedaba "sin señal" hasta las
9am. Ahora **persiste en JSON sobre el PVC** (`/data/noticias.json`, mismo mecanismo que `subs.json`): se **guarda
en cada POST** del cron y se **carga al arrancar**. El cliente (incl. GitHub Pages) lo sigue trayendo igual con
`GET /noticias`. *(Prometheus NO sirve para esto: es para números/series, no para guardar el texto.)* Proxy `0.1.25`.

---

## [v126 / infra-9] — 2026-06-25 — 🔊 TTS con fallback al servidor (lee aunque el navegador no tenga voz)

El [R] del cine no leía en Chromium/Linux porque el navegador no trae voces (`speechSynthesis` vacío) y
speech-dispatcher no las expone. Ahora **las dos vías con fallback**:
- Si el navegador **tiene** voz → la usa (mejor calidad, gratis, como antes).
- Si **no** tiene → el **proxy genera el audio** con `espeak-ng` (`GET /tts?text=…&lang=es|en`, WAV) y el juego lo
  reproduce por **WebAudio** (el mismo canal que la música, que sí suena). Funciona en cualquier navegador.
- **Respeta el acento**: español/criollo (`es-419`) o inglés (`en-us`) según el idioma del juego.
- `Mensajero.callar()` corta también el audio del server. Imagen proxy `0.1.24` (suma `espeak-ng`, ~2MB).

---

## [v125] — 2026-06-25 — 🎬 Cine: la pantalla muestra VARIAS noticias (no hace falta que te lean)

Feedback del dueño: la [R] no leía (en Linux el navegador no trae voz TTS) y la pantalla grande desaprovechada.
- La pantalla ahora lista **hasta 4 noticias** del piso a la vez (1 sola → texto completo; varias → 2 líneas c/u),
  así se **leen de un vistazo** sin depender del audio. Mismo canvas → **se ve igual en celular** (solo leés).
- **[R]** ahora lee TODAS en voz alta y, si el navegador no tiene voz instalada, avisa *"leé la pantalla nomás"*
  en vez de no hacer nada (antes parecía roto). En celular (Android/iOS sí tienen voz) la lectura funcionaría;
  por ahora en mobile se lee la pantalla (sin botón [R] aún).

---

## [docs] — 2026-06-25 — 📐 SDD `cine-noticias.md` al día (Diseño → Implementado)

Barrido de SDDs faltantes/desactualizados. Primero: `specs/cine-noticias.md` pasó de "Diseño por fases" a
**Implementado** y se sincronizó con el código real — los 7 pisos y su mapeo piso→topic, las 3 clases de fuente
(Google News RSS / CoinGecko / OpenRouter API), la verificación local `newsMatch` (+3 caramelos / −10 monedas),
el TTS por **[R]** (no auto), el cron **1×/día 9am AR**, y el **gotcha del `genToken`** (helm sin `--set
linyeraPool.genToken` → 403 silencioso, banco vacío). Sacado del roadmap "Próximamente" + agregado al índice de
`specs/README.md`. Sin cambios de código (no bumpea `?v`).

---

## [v124 / infra-8] — 2026-06-25 — 🎬 Cine: 7 pisos (Finanzas/Crypto, Colombofilia, Consolas retro, OpenRouter)

El cine pasa a **7 pisos**, cada uno con su pantalla de data REAL (Google News + fuentes propias, sin key):
- **4 Finanzas** (acciones/Merval + **crypto BTC/ETH** real vía CoinGecko) · **5 Colombofilia** (palomas
  mensajeras — FCI/RFCE/FECOAR activas, vía Google News) · **6 Consolas retro** (8/16/32 bit; la API de
  MercadoLibre quedó cerrada (403) → por ahora Google News, eBay/Marktplaats necesitan key) · **7 OpenRouter**
  (modelos + precios US$/1M de la API pública, con el Linyera-IA oráculo).
- **crypto/openrouter** se traen DESPUÉS del resumen IA para que los **números queden exactos** (no se rephrasean).
- Espectadores temáticos por piso (broker, colombófilo, coleccionista). Data-driven (paridad 45 salas).

---

## [v123] — 2026-06-25 — 🎬 Cine MULTI-PISO (F3): Deportes / Mundo / Tecno + propaganda

El cine pasa de 1 sala a **3 pisos por categoría**, conectados por escaleras (como la galería):
- **Deportes** (mundial, primera-b, bochas) → **Mundo** (mundo, guerra, argentina, países-bajos, árabe) →
  **Tecno** (videojuegos, ia). Cada piso tiene su **pantalla** (filtra `/noticias` por su categoría), butacas,
  un espectador temático y **carteles de propaganda**.
- La pantalla muestra **🎬 CINE · CATEGORÍA** + el titular. El **quest del linyera** ahora te manda al piso del
  topic (vas a Deportes a buscar el fútbol, a Mundo la guerra, etc.). Data-driven (paridad 41 salas).

---

## [v122] — 2026-06-25 — 🎬 Cine: ajustes (fuera de la cola, fachada CINE, pantalla más grande, [R] leer)

Feedback de jugarlo:
- **Movido fuera de la cola del dólar** (x84→x52): antes tapaba la entrada de la casa de cambio.
- **Fachada propia "🎬 CINE"** (marquesina violeta) en vez de caer a "GALERÍA". + **carteles de propaganda** adentro.
- **Pantalla más grande** (360×168) que muestra el **titular COMPLETO** (hasta 8 líneas) + footer con la acción.
- **TTS = ACCIÓN, no auto** (sonaba mal forzado): apretás **[R]** y la IA te lee la noticia (voz es-AR); ya no
  se reproduce solo al entrar.
- Idea anotada (SDD): cine multi-piso / complejo de edificios con más pantallas y propaganda (F3).

---

## [v121] — 2026-06-25 — 🔊 El cine te LEE la noticia (TTS) + corrección NPU

- **TTS en el cine:** al entrar, la pantalla **lee el titular en voz alta** (voz es-AR, `Mensajero.hablar`) y
  corta al salir (`Mensajero.callar`). Estaba en la idea original del cine. Client-only, respeta el mute.
- **Corrección (investigación NPU):** la NPU **NO estaba caída** — los 4 pods rk1 están Running. El "timeout"
  era **lentitud**: 18–34s por inferencia (cold start arma el prompt cache de rkllama). Igual **alucina**
  (inventó "32 partidos") → sigue sin servir para noticias, pero **no es una caída**. SDD/tabla corregidos.

---

## [v120] — 2026-06-25 — 🗞️ El quest del linyera: mandados de noticias + corroboración (cine F2)

Cierra el loop del cine (`specs/cine-noticias.md` F2): el linyera te manda a buscar data y te la **corrobora**.
- Al chatear con un **linyera-oráculo**, a veces (su "IA rápida vio el cartel del cine") te **pide un topic**:
  "andá al cine y averiguá qué decían de {topic}, pero no me mientas".
- Vas al cine, leés, volvés y **se lo contás por el chat**. El juego **verifica** tu reporte contra el `answer`
  REAL del banco (palabras significativas compartidas, `window.NOTICIAS`):
  - **Acertás** → *"no me mentís, la IA me lo confirmó"* → **+3 caramelos**.
  - **Mentís** (inventás) → *"hackié el cartel y NO es eso, chanta"* → **−10 monedas**.
  - Vago/corto → te re-pregunta, sin penalizar.
- Todo client-side (el banco tiene la verdad), efímero (no se guarda). i18n ES/EN. **El cine queda COMPLETO** (F1+F2).

---

## [v119] — 2026-06-25 — 🎬 El CINE de noticias (F1b in-game)

Segunda mitad del cine (`specs/cine-noticias.md` F1): el **edificio jugable** que muestra el banco `/noticias`.
- **Nuevo edificio CINE** ("Cine Lavalle"): puerta en la calle (x84, sprite marquesina) + sala con **butacas** +
  un **espectador**. Hecho como **data** (level.js → modelo → v1/v2; paridad ahora 39 salas).
- **Pantalla de noticias**: al entrar, elige un **titular RANDOM** del banco (`js/noticias.js` trae `/noticias`)
  y lo dibuja en una pantalla grande con su topic (📰). **Cada visita, algo distinto.** Sin señal/red → "sin
  señal" (el juego anda igual). Mensaje de entrada temático.
- Falta **F2**: el **quest del linyera** (te pide un topic → vas → reportás → te corrobora → caramelos/plata).

---

## [v115–v118] — 2026-06-25 — 🧩 Modelo de entidades F4: hardcodes → data (motor data-driven más limpio)

`modelo-de-entidades.md` F4: los hardcodes del juego pasan a ser **atributos del modelo** (fuente única en
`level.js` → `gen-level` → `nivel-1.json`/`level-data.js` → `mundo.js` → `game.js`). Sin cambios de jugabilidad;
paridad v1≡v2 + e2e + levels + web-smoke verdes en cada paso.

- **v115** — `COLLAPSED` (qué edificios se derrumban con la tormenta) → atributo **`collapsesOnStorm`** de la
  puerta. Borrado el const. *(De paso se arregló el schema, roto para `fiche`/`comportamiento`.)*
- **v116** — `DOOR_ART` (map art→sprite) eliminado: el `art` de la puerta YA es la key de `Art` directa.
- **v117** — gating de puertas (secret/cemento/bunker/chinoback) → componente **`gate`** declarativo
  (`{flag|item}`+all/any/not) + `gateMet()`/`FLAG_GETTERS`. Sin ifs por-id.
- **v118** — **save anclado por POSICIÓN `(sala, x)`, no por índice** (RF-4): el estado de pickups/npcs se
  identifica por su `x` (su id natural) → robusto a reordenar entidades. Save v2 con compat de v1.

> Resultado: F1–F4 del modelo de entidades completos; v2 data-driven sigue siendo el default. Queda F5
> (extraer `engine/` vs `game/`, el rewrite mayor).

---

## [v94–v114] — 2026-06-25 — 🃏 Truco real + motor v2 por defecto + suscripción en el cliente

Tanda grande del lado del JUEGO (cache `v94`→`v114`). Lo de infra (proxy/métricas/modelos) está en `infra-2..6`.

### Motor v2 (data-driven) AHORA es el DEFAULT
- `useV2()` true por defecto; v1 = opt-out (`?engine=v1` / `localStorage ts_engine=v1`). **Red de seguridad doble**:
  auto-fallback a v1 si la construcción falla/degenera + auto-degrade si el watchdog detecta freeze >5s. Paridad
  v1↔v2 testeada (misma estructura en las 38 salas). Telemetría v1/v2 + freezes.

### Truco REAL 🃏
- Motor puro (`js/truco.js`): **envido / real envido / falta envido / flor / truco / retruco / quiero vale cuatro**,
  parda, reparto. Voces criollas (es-AR) cuando el NPC canta (vía Mensajero).
- **TRUCOTRON = MÁQUINA**: una mano rápida, `[E]` otra / `[Esc]` salir, premio en flores, sin voz ni minas.
- **EL TAHÚR (antro) = la partida**: mejor de 3 / a 15, voz criolla, las minas te afanan y abre la puerta al chino.
- **"El envido está primero"**: si te cantan TRUCO en la 1ª mano sin envido jugado, `V` mete el envido y, al
  cerrarlo, el truco vuelve a la mesa.

### Chat / suscripción (cliente)
- **"Tu partida"** (tecla `P`): métricas de tu sesión (motor, charlas, truco, monedas, flores, hitos).
- **Suscripción** en ⚙ Opciones: pegás un código → chat **premium**; ves **TU consumo** ("usaste $X de $Y ·
  vence en Zd", vía `/my-sub`, personal por código).
- Avisos en personaje: timeout ("se colgó, reintento"); y si usás **TU** key de OpenRouter y pegás **tu** límite
  de cuenta, te avisa que fue tu cuota (no la del juego).

---

## [infra-7] — 2026-06-25 — 🎬 Banco de NOTICIAS del Cine (F1a backend)

Primera mitad del cine de noticias (`specs/cine-noticias.md` F1): el **banco de noticias** que después consume la
pantalla del cine in-game (F1b).
- **`gen-noticias.mjs`** (cron, Node puro): **fetchea** noticias por topic desde **Google News RSS** (público,
  sin key, español AR; `fetch()` sigue el redirect solo) → titular real por topic. Cubre **mundo, mundial,
  primera-b, videojuegos, guerra, argentina, países-bajos, árabe, ia, bochas** y **refresca cada corrida**.
  Fútbol con resultado exacto = opt-in `NEWS_SPORTS` (TheSportsDB). **El fetch es del cron, no de un modelo.**
- **"Captura por IA" FIEL del titular** con `gemma4-paid` (opcional, `noticias.summarizeModel`). **Validado
  (2026-06-25):** la **GPU inventa datos** (resumió y agregó equipos/días que no estaban → inseguro) y la **NPU
  está caída** → se usa el pago, que es **fiel** ("Así quedó la tabla de la Primera Nacional 2026"). El `answer`
  (lo que el linyera verifica) queda **CRUDO**; el modelo solo rephrasea el titular de display.
- **Proxy**: `POST /noticias` (GEN_TOKEN) llena el banco + `GET /noticias` lo sirve (como `/precios`).
- **Chart**: `cronworkflow-noticias.yaml` **1×/día 9am (TZ AR)** + `noticias.enabled` en values. Imagen del proxy
  copia el script. Verificado en vivo: 10 topics reales de hoy, capturados fieles.
- Falta **F1b**: el edificio **CINE** (butacas + pantalla) que muestra un titular random del banco al entrar.

## [infra-2..6] — 2026-06-25 — 🤖 Métricas reales + red paga rápida (gemma4-paid) + suscripción por código

Proxy `0.1.3`→`0.1.20`. El gran salto de la IA del juego.

### Métricas de uso REALES (F1/F2/F3) + telemetría del juego
- `/metrics` del proxy etiquetado: **chat por modelo/backend/outcome** + histograma de **latencia** + **intentos
  por modelo** (qué free se cae). **Telemetría del juego** (v1 vs v2 + funnel) cliente→proxy→Prometheus. Dashboards
  Grafana **`tormenta-linyera`** y **`tormenta-juego`** (+ paneles de gasto/cupo/scorer/suscripciones).

### 🐛 Fix CORS (¡el chat caía al pool en el navegador!)
- Al sumar el header `X-Session-Id` faltó autorizarlo en el preflight → el navegador **bloqueaba el POST** → caía
  al pool. Arreglado: `Access-Control-Allow-Headers: Content-Type, X-Session-Id, X-Sub-Code`.

### Red paga RÁPIDA + cupos + tope de gasto
- Cadena: `gemma4-free → gemma4-paid → claude-sonnet`. **`gemma4-paid`** = el **gemelo PAGO** del free
  (`google/gemma-4-31b-it`, ~1.5s, $0.47/1M, **sin límite diario**): cuando el free se agota, responde igual de
  bien y rápido. (Antes el pago era `cheap`=deepseek reasoning → 9s; descartado.)
- **Cupo por sesión** (`X-Session-Id`; la IP colapsa tras el G4) + **tope DURO de gasto** global (`PAID_DAILY_CAP`).
- **Detección del límite de CUENTA** (`free-models-per-day`): cuando se agota el free de la cuenta, **no prueba
  otro free al pedo** → derecho al pago. Métrica `free_blocked_seconds`.
- **F2 ModelScorer**: arma la cadena "más barato-bueno" sola (disponibilidad+latencia+precio) → `GET /ranking`.

### 💳 Suscripción por CÓDIGO (F1/F2/F3)
- Código en `X-Sub-Code` → tier pago (salta free+cupo). **Una key de OpenRouter POR código** (`POST /provision`,
  budget **$1**, **vence 30 días**) → **gasto y tope REALES por usuario**, leídos de OpenRouter
  (`/sub-spend` admin · `/my-sub` el jugador ve lo suyo). Store JSON en PVC. **Todo sigue por LiteLLM** (no se
  pierden métricas). Research de pasarelas en `specs/pasarela-pago.md`.

### Otros
- **Pool del linyera** ahora se genera con `gemma4-paid` (el free se cancelaba al límite y arruinaba la tanda).
- `gemma4-paid` agregado a LiteLLM (infra-ai). **`web/chart/values-prod.yaml`** para deploy seguro del self-host.

---

## [v93] — 2026-06-24 — ⏱️ Tope de latencia del chat (≤10s) + cadena de 2 modelos + métricas

### Hecho ✅
- **El linyera ya no cuelga.** Estaba tardando 20-51s (gemma4-free saturado, sin fallback, + cliente esperaba
  35s). Ahora **tope duro ≤10s**: cliente `PROXY_TIMEOUT=9s`; proxy con presupuesto **8s total / 4s por
  modelo** que prueba una **cadena de 2** (`gemma4-free,kimi-free`) y, si ninguno contesta, devuelve una
  **línea temática** ("la tormenta saturó el modelo") sin colgar. `max_tokens` 220→120.
- **Métricas** (`/metrics` prometheus en el proxy): requests, timeouts, errores, fallback_lines, latencia
  media → Grafana. SDD `specs/latencia-chat.md` (flujo + PromQL + alertas).
- Proxy imagen **0.1.2** (rev 6). Verificado: corta a ~6s y degrada elegante cuando el free está saturado.

---

## [infra-1] — 2026-06-24 — 🖥️ Juego self-hosted + páginas EN + diagrama del stack + pruebas de modelos

### Hecho ✅
- **Self-host del juego LIVE** en `https://tormenta-solar.cybercirujas.club`, **a la vez** que GitHub Pages
  (los dos conviven). nginx-unprivileged (`web/Dockerfile`), build Kaniko/Argo (`web/kaniko-build.yaml`),
  chart `web/chart` (release `tormenta-web`, ns `ai`), HTTPRoute + Certificate (LE prod) + ensure-listener
  reusando `cluster-gateway`. Imagen **0.1.1** (el sitio local es snapshot → rebuild en cada cambio).
  Ver `specs/juego-self-host.md`.
- **Páginas en inglés** para publicar: `info/index.en.html` + `info/tech.en.html`, con toggle EN/ES.
- **Tech page**: gráfico "GitHub Pages vs infra propia" (estáticos vs chat) + **pipeline diseñado** del viaje
  del mensaje (CSS, con el ASCII en un desplegable) + dato del borde: HAProxy en una **Mac mini G4
  (PowerPC) con OpenBSD**.
- **Pruebas de modelos** (`specs/pruebas-modelos.md`): ganó `gemma4-free` (OpenRouter, 3.7s) como default;
  mejor self-hosted = `gemma2:2b` en la GPU (2.5s caliente). NPU (corrupta/500), llama/qwen chicos y
  gemma3:4b (65s, no entra en 4GB) descartados. Diseño de rotación en §2.7.
- *(No bumpea `?v`: los archivos del juego no cambiaron; es infra + páginas info.)*

---

## [v92] — 2026-06-24 — 🌐 IA online GRATIS + landing /info + página tech del stack

### Hecho ✅
- **IA gratis en vivo**: el chat ya pega contra el proxy self-hosted del dev
  (`js/ai.js → PROXY = https://llm-tormenta-solar.cybercirujas.club`). Los jugadores chatean con los
  linyeras **sin poner API key**; BYOK queda como override opcional. `PROXY_TIMEOUT` 35s (gemma free tarda 5-30s).
- **Deploy real** del proxy en Kubernetes (Helm chart `ai-proxy/chart`): imagen Kaniko/Argo (arm64) →
  registry interno, HTTPRoute + Certificate (Let's Encrypt prod, DNS-01/acme-dns) reusando `cluster-gateway`,
  upstream `gemma4-free` vía LiteLLM. Probado end-to-end por https público.
- **Landing `/info`** (`info/index.html`): pitch, "el chat con IA es GRATIS", personajes, y CTA a jugar/GitHub.
  Con Open Graph para preview lindo al compartir.
- **Página tech `/info/tech.html`**: el stack **capa por capa** — GitHub Pages → HAProxy (SNI) → Cilium
  Gateway API (TLS) → HTTPRoute/Envoy → proxy Node → LiteLLM → OpenRouter / GPU (HAMi+Ollama) / NPUs RK1;
  observabilidad (Hubble/Prometheus/Grafana); build (Kaniko+Argo+registry); todo declarativo por API.
  Incluye el feature que viene: **bot de Telegram → Hermes** para manejar el juego.
- **Opciones**: el texto de la API key ahora aclara que la IA es gratis/incluida (es/en) + link a `/info` en la intro.

### Estado
- e2e + web-smoke verdes. Cache `v=92`. Infra documentada en `specs/proxy-ia-deploy.md`.

---

## [v89] — 2026-06-24 — ⚡ Timeout temático + disclaimer BYOK claro

### Hecho ✅
- **Mensaje temático al timeout**: si la IA tarda y se corta (timeout), el chat avisa con flavor —
  "⚡ La tormenta solar saturó la electrónica del modelo: se colgó y corté. Probá de nuevo." (`ai.js`
  expone `lastTimedOut()`; el chat lo muestra). En vez de un error pelado, queda en clima.
- **Disclaimer BYOK reforzado** en ⚙ Opciones: "tu API key... es SOLO tuya y a tu riesgo: si el modelo es
  free/lento, puede tardar o cortarse" (es/en).

### Estado
- e2e + web-smoke verdes. Cache `v=89`. (Doc de infra `ia-routing-infra.md §3.0` con la tabla del modelo.)

---

## [v88] — 2026-06-24 — 🧉 Tu amigo linyera: historia base + memoria + "no soy tu IA de laburo"

### Hecho ✅
- **Historia base por linyera** (en su `persona`, `ai.js` + proxy): Diógenes (se hartó del laburo y tiró
  todo), Dante (poeta que nadie pagó), Pechito (años en la misma esquina, querido por todos). Cada uno
  "sabe su propia historia".
- **Te trata como AMIGO**: usa la memoria de charla (lo que le contaste / lo que te gusta) con cariño.
- **Guardrail con humor** (núcleo `LINYERA_CORE`): si lo querés usar de **terapeuta**, para que te haga la
  **tarea/el código**, o pedís **textos largos**, se **niega en personaje** ("soy tu amigo linyera, no tu
  terapeuta ni tu IA de laburo; me vas a fundir todos los tokens, loco... ¿qué te pensás?") y vuelve a la
  charla. Frena el derroche de tokens y mantiene el clima.

### Nota
- El "aprende qué te gusta" funciona vía la **memoria de la conversación** (la del v86, persiste en el
  guardado). Un **store de preferencias estructurado** (a largo plazo) sería el `agent` del motor v2.

### Estado
- e2e + web-smoke verdes. Cache `v=88`. (Persona = prompt; el comportamiento real se ve con IA conectada.)

---

## [v87] — 2026-06-24 — 📖 Lore integrado en la narración (satélites rebeldes + los linyeras tenían razón)

La historia ahora cierra coherente: lo que los linyeras te cuentan (satélites con IA rebeldes) **es la verdad**.

### Hecho ✅
- **Intro** (`intro.p1`): foreshadow — "los linyeras juran que no fue el sol: fue un satélite con IA que se
  cortó solo".
- **Victoria** (`g.win.text`): el **reveal** completo — pusimos un satélite a pensar por nosotros, se rebeló,
  escapó de órbita y ataron el sol; **los linyeras tenían razón**; **el Carpo** se cuelga la viola y salta al
  próximo momento. (Pago narrativo: sus "historias locas" eran ciertas.)
- **Muerte** (`g.die.text`): un linyera suspira "te lo dije, pibe... era la IA, nunca el sol".
- Todo es/en con paridad (sólo cambian valores de claves existentes).

### Pendiente ⚠️
- Revisar sprite "el Carpo" en pantalla (v83). El `agent` completo / backstory por entidad = motor v2.

### Estado
- e2e + paridad + web-smoke verdes. Cache `v=87`.

---

## [v86] — 2026-06-24 — 🧠 Memoria por identidad: los linyeras te recuerdan

Primer pedazo del `agent.memory` del motor v2 (ver `specs/modelo-de-entidades.md` §6½), ya funcionando en v1.

### Hecho ✅
- **Cada linyera/NPC recuerda lo charlado**, por **identidad** (clave = `persona`): si volvés a hablar con
  Diógenes (esté fijo o errante), **retoma la conversación** donde quedó. Aplica a todos los chateables.
- **Persiste en el guardado**: la memoria va en `serialize`/`restore` (sobrevive recargar + "Continuar"); se
  borra al empezar partida nueva (los linyeras te olvidan). Cap de 12 turnos por identidad.
- Cue visible **"💭 (se acuerda de vos)"** al reabrir un chat con memoria previa (i18n es/en).

### Pendiente ⚠️
- La memoria hoy es la **conversación**; el "backstory" propio + razonamiento sobre eventos (el `agent`
  completo con `policy`/transiciones) es del **motor v2** (diseñado, no implementado).
- De antes: revisar sprite "el Carpo"; re-tematizar la narración.

### Estado
- e2e (round-trip de guardado con `oracleMem`) + paridad + web-smoke verdes. Cache `v=86`.

---

## [v85] — 2026-06-24 — 🛰️ Los linyeras documentados SON los oráculos (expertos en tormentas/IA)

Se cierra el círculo: el "linyera filósofo" genérico **desaparece**; los oráculos son los linyeras reales.

### Hecho ✅
- **Borrado el "Linyera filósofo" genérico** (el fijo de la calle y el del roster errante). Ahora los
  oráculos son **Diógenes / Dante / Pechito** (`oracle:true`): aparecen/desaparecen cerca de lo no hecho y
  **dan pistas** (antes sólo el de persona `filosofo`; ahora cualquiera con `oracle`).
- **Personas enriquecidas** (núcleo compartido `LINYERA_CORE` en `ai.js` + proxy): los tres son **expertos
  en tormentas solares y en cómo la IA nos gobierna**, cuentan historias de **satélites rebeldes gobernados
  por IA** y de linyeras liberados, y **siempre quieren explicar cómo funciona la IA / qué modelos andan
  mejor** — cada uno con su voz (Diógenes cínico, Dante en verso, Pechito cálido). Canned offline (es/en)
  actualizado con la lore.
- `oracle` viaja al modelo v2 (`gen-level` → `mundo`), así los oráculos funcionan también en v2. Paridad OK.

### Pendiente ⚠️
- **Memoria/backstory por entidad** (cada linyera recuerda su historia y lo charlado) = componente
  `agent.memory` del **motor v2** (diseñado en `specs/modelo-de-entidades.md` §6½, no implementado aún).
- Revisar el **sprite "el Carpo"** en pantalla (de v83). La narración del juego sigue sin re-tematizar.

### Estado
- e2e + levels + paridad v1≡v2 + web-smoke verdes. Cache `v=85`.

---

## [v84] — 2026-06-24 — 💬 Los linyeras ilustres ahora son chateables (oráculos AI-friendly)

Aplica el patrón "los íconos son los personajes AI-friendly" (ver `specs/modelo-de-entidades.md` §6).

### Hecho ✅
- **Cameos chateables**: **Diógenes** (`persona:'filosofo'` → es un **oráculo**: tira pistas + grounding),
  **Dante el poeta** (`persona:'poeta'` nueva: habla casi en verso/lunfardo) y **Pechito**
  (`persona:'pechito'` nueva: el linyera querido, cálido). Ahora se charla con ellos como con el linyera
  filósofo / cuevero / tahúr.
- Personas `poeta` y `pechito` agregadas a `js/ai.js` (+ canned **es/en** para chat offline) y al proxy
  (`ai-proxy/personas.js`). `nivel-1.json` regenerado (las cameos llevan `interact.action:'chat'`+persona);
  **paridad v1≡v2 sigue OK**.

### Pendiente (de v83, sin cambios) ⚠️
- El **sprite "el Carpo"** sigue **sin revisión visual** (mirarlo en el navegador).
- La **narración del juego** no se re-tematizó alrededor de el Carpo (sólo nombre+sprite+intro).

### Estado
- e2e + levels + paridad + web-smoke verdes. Cache `v=84`.

---

## [v83] — 2026-06-24 — 🎸 "El Carpo": sprite del protagonista + cameos en inglés

Cierre del homenaje de v82.

### Hecho ✅
- **Sprite del héroe re-tematizado como "el Carpo"** (`drawHero` en `art.js`): **pelado**, pelo gris a los
  costados, **barba**, **lentes oscuros** y una **viola (guitarra) a la espalda**. Aplica a idle/run/jump.
- **Cameos en inglés** (`level.en.js`): nombres (Diógenes→Diogenes, "Dante el poeta"→"Dante the poet",
  Pechito) y los 3 diálogos transcreados → en modo EN ya no salen en español.

### Pendiente / sin verificar ⚠️
- **El sprite "el Carpo" FALTA REVISARLO EN PANTALLA**: renderiza sin error (e2e + web-smoke verdes) pero
  **no es verificable headless** — hay que mirarlo en el navegador y ajustar proporciones/colores si hace
  falta (la barba/pelo/viola son pixel-art procedural "a ciegas").
- **No se re-tematizó la narración del juego** más allá de la intro: la historia/diálogos siguen tratando
  al jugador genérico; "el Carpo" por ahora es nombre + sprite + nota de intro, no lore integrado.
- Los cameos no tienen `action` (son charla simple, no chat-IA); si se quieren chateables, sumar `persona`.

### Estado
- e2e + paridad v1≡v2 + web-smoke verdes. Cache `v=83`.

---

## [v82] — 2026-06-24 — 🎸 Homenaje: linyeras ilustres + el protagonista "el Carpo"

Cameos cariñosos a personajes de Florida y Lavalle, como **parodia/homenaje** (para evitar líos de derechos:
nombres apenas guiñados + disclaimer "ficción/parodia, sin afiliación", el mismo criterio que Garbarino/Iorio).

### Agregado
- **Cameos de linyeras** en la calle: **Diógenes** (el cínico griego, dominio público), **Dante el poeta**
  (guiño a Dante A. Linyera) y **Pechito** (homenaje al linyera más querido de BA). NPCs charlables.
- **Protagonista = "el Carpo"** (homenaje de tono a Pappo, nombre alterado): nota en la intro
  (`intro.homenaje`, es/en) + **disclaimer** "ficción/parodia, sin afiliación".
- **El filósofo errante ahora VARÍA**: el oráculo que aparece/desaparece cerca de lo no hecho es uno de los
  linyeras ilustres (distinto por sala), todos con la persona `filosofo` (las pistas siguen igual).

### Notas
- Diseño v2 (anotado en `specs/modelo-de-entidades.md` §6½): cada linyera errante = una entidad con
  **memoria propia** (`agent.memory`), surfaceada por el HintEngine. Hoy v1 varía la identidad; la memoria
  por entidad llega con el motor v2.
- e2e (auditoría de sprites) + paridad v1≡v2 (490 entidades) + web-smoke verdes.

---

## [v81] — 2026-06-24 — 🐛 Fix: salir del chino por la puerta trasera colgaba el juego

### Arreglado
- **Se colgaba al salir del super chino por la puerta secreta/trasera** (post-tormenta). Causa:
  `enterCuevaFromSecret()` hacía `rooms.findIndex(r => r.cueveros)`, pero `makeRoom` le pone
  `cueveros: []` (array **vacío pero truthy**) a TODAS las salas → el `findIndex` devolvía la **calle**
  (sala 0), que **no tiene puerta `up`** → `up.x` tiraba `TypeError` → el game loop moría = **freeze**.
- **Fix:** el predicado ahora pide `r.cueveros && r.cueveros.length` (la cueva REAL). Mismo bug latente
  arreglado en `reviveToPreviousLoop()` (respawneaba en la calle en vez de la cueva) y en el mensaje de
  transición. Aplica a v1 **y** v2. e2e + parity verdes.

---

## [v80] — 2026-06-24 — 🧩 Motor v2 (data-driven) detrás de un toggle — F1/F2/F3

Primer paso real hacia el **modelo de entidades data-driven** ([`specs/modelo-de-entidades.md`](specs/modelo-de-entidades.md)).
**El juego sigue en v1 por default**; v2 es opt-in y experimental.

### Agregado
- **Nivel 1 como DATA** (`levels/nivel-1.json`, 38 salas / 487 entidades) **generado** del `Level.build()` real
  por `tools/gen-level.js` (fiel y re-ejecutable) + `js/level-data.js` (wrapper para el browser).
- **`js/mundo.js`** (`Mundo.fromModel`, función pura) reconstruye el nivel desde la data.
- **Toggle "Motor: v1/v2"** en ⚙ Opciones (persiste en `localStorage`, aplica al (re)empezar; `?engine=v2`).
  Con v2, `reset()` usa `Mundo.fromModel(LEVEL1)` en vez de `Level.build()` (guardado por `useV2()`).

### Tests
- **`tests/levels.mjs`** (mini-validador de JSON Schema **sin deps**) valida los `levels/*.json`.
- **`tests/parity.mjs`**: **paridad v1≡v2** sobre el Nivel 1 → **las 38 salas coinciden** (geometría,
  posiciones, doors+wiring). e2e ahora también bootea v2 headless (build + 95 frames jugando). Todo en CI.

### Nota
- Es **opt-in**: sin tocar el toggle el juego es idéntico (v1). v2 reproduce el Nivel 1; las features ricas
  (IA/quests/meta/packs) se cuelgan en fases posteriores del SDD.

---

## [v79] — 2026-06-24 — 🐛 Fix grande: la capa mobile tapaba los menús (Opciones/chat/intro)

### Arreglado
- **No se podían tocar los controles de Opciones (ni botones de menús) en dispositivos con pointer táctil**:
  `#stage` usa `transform: scale()` (fit.js) → crea su propio *stacking context*, así que el z-index de los
  overlays (z-10) es **local a `#stage`**. Pero `#touch-controls` (capa mobile, v=72) cuelga del `<body>`,
  **afuera** de `#stage`, así que su zona de apuntar (`#tc-aim`, `pointer-events:auto`) quedaba pintada **por
  encima de TODO `#stage`, incluidos los menús** → se comía los taps/clicks en la mitad derecha del panel
  (Opciones, chat, intro). Solo respondía el teclado (Escape). Pasaba en cualquier device con *coarse pointer*
  (celular, o notebook con pantalla táctil aunque uses mouse). **Probablemente explica también** los reportes
  previos de "no salía del chat" (tapaba el botón Cerrar) y "Continuar no quedaba bien" (tapaba el botón).
- **Fix**: `mobile/touch.js` ahora **oculta los controles mientras hay un overlay/menú abierto**
  (`MutationObserver` sobre intro/options/chat/endscreen) → el menú recibe los toques; durante el juego, los
  controles vuelven.

### Técnico
- Solo afecta a la capa mobile (dormida en desktop → web-smoke sin cambios). e2e + web-smoke verdes.
- ⚠️ **SIN VERIFICAR EN DEVICE REAL**: el fix (y toda la capa mobile v=72) **falta probarlo en el cel del
  usuario** — no es testeable headless. Pendiente de confirmación.

---

## [v78] — 2026-06-23 — 🐛 Fix: salir del chat con ESC + autosave durante el chat

### Arreglado
- **No se podía salir del chat con ESC**: el handler de Escape vivía solo en el `<input>` del chat, así que
  si el input perdía el foco (click en el log, o después de tocar "Decir") ESC se iba al `document` y **no
  había handler** → quedabas trabado en `state='chat'` sin poder moverte. Ahora hay un **Escape global** que
  cierra el chat tenga o no el foco el input. (El botón "Cerrar" siempre funcionó; "E" es *interactuar*, no salir.)
- **Continuar tras refresh "no quedaba bien"**: el autosave **se salteaba el estado `chat`** (solo guardaba en
  `playing`), así que si refrescabas estando en el chat, "Continuar" te devolvía a un punto viejo. Ahora el
  autosave/serialize también cubren `chat` (el jugador está quieto y la posición es válida).

### Técnico
- `game.js`: Escape global con guard `state==='chat'`; `serialize()`/`autosave()` aceptan `playing`+`chat`.
  e2e + web-smoke verdes.

---

## [v77] — 2026-06-23 — 📈 Publicidad: métricas de impresión (cliente, opt-in)

Cierre del MVP de medición de `specs/publicidad.md` del lado del cliente.

### Agregado
- **Conteo de impresiones** en `js/ads.js`: una impresión por slot **a lo sumo cada 5s** (no por frame),
  agregadas y **sin datos personales**. `Ads.stats()` las expone (debug).
- **Flush opt-in**: solo si `window.ADS_METRICS` apunta a un endpoint, hace `POST {views, ts}` cada 30s y
  al ocultar/cerrar la pestaña (`navigator.sendBeacon`). **Sin endpoint → cero red** (default), mismo molde
  que `presence.js`.

### Pendiente del SDD
- El **endpoint server** de métricas (contrato documentado en §5, reusar `presence-server/`), imágenes
  pixel-procesadas y manifiesto remoto. e2e + web-smoke verdes (sin endpoint, no hay red).

---

## [v76] — 2026-06-23 — 🛒 Publicidad: formato góndola (product placement en el chino)

Tercer formato del MVP de `specs/publicidad.md`: la marca DENTRO del super chino.

### Agregado
- **Formato `gondola`**: product placement en el súper (vista de arriba). `Ads.drawGondola(ctx, W, H)` dibuja
  un cartel de marca en coords de pantalla; lo llama `super.js` en su `draw()` con un guard `typeof Ads`
  (sin la capa, no hace nada). Slot/campaña de ejemplo: *Fideos Mamushka*.
- `ads/slots.json` admite slots con `room:"super"` y coords `px/py` absolutas (el súper es un sub-modo).

### Pendiente del SDD
- Imágenes pixel-procesadas y **métricas** de impresión (reusar `presence-server`). e2e + web-smoke verdes.

---

## [v75] — 2026-06-23 — 📢 Publicidad: formatos pantalla y fachada

Segunda pasada del MVP de `specs/publicidad.md`: más formatos de espacio publicitario.

### Agregado
- **Formato `screen`** (pantalla LED/TV): el afiche base + **scanlines** y un **barrido de brillo animado**
  (clippeado a la pantalla). Slot de ejemplo en el **arcade** (RetroByte).
- **Formato `fachada`**: cartel de local con **toldo a rayas** y marca grande. Slot de ejemplo en la calle
  (Pizza Obelisco).
- `ads/slots.json` y `ads/manifest.json` ampliados (5 slots, 5 campañas ficticias). Sigue todo aditivo:
  sin manifiesto, idéntico.

### Pendiente del SDD
- Formato **góndola** (product placement en el super chino): necesita un seam en `super.js` (sub-modo aparte).
- Imágenes pixel-procesadas y **métricas** (reusar `presence-server`). e2e + web-smoke verdes.

---

## [v74] — 2026-06-23 — 🕸️ Fase 2 del grafo: el grafo MANEJA los flags

El grafo de historia pasa de *describir* a *gobernar* las transiciones de estado.

### Cambiado
- Las 8 transiciones de historia de `game.js` (tormenta, edificio, búnker, Iorio, truco, FIFA, armas,
  chino_back) ya no hardcodean el flag: llaman a **`applyEdge(id, fallbackFlag)`**, que lee el `sets` de
  esa arista del grafo (declarado en las fichas) para decidir **qué flag cambia**. La **fuente de verdad
  de las transiciones es el grafo**: si cambia el `sets` de una ficha, cambia el efecto sin tocar `game.js`.

### Técnico
- Implementación **segura**: los *reads* de los flags quedan idénticos (un closure escribe el `let`
  externo, no hace falta un store nuevo → cero churn/regresión en las lecturas). El 2º argumento
  `fallbackFlag` es **red de seguridad** si `historia.js` no cargara (el juego progresa igual).
- e2e: chequeo **estático** de que cada arista aplicada existe y setea exactamente su flag (atrapa typos de
  id / drift del grafo). e2e + web-smoke verdes. Cierra el SDD `specs/nivel-1/historia-grafo.md` (Fase 1+2).

---

## [v73] — 2026-06-23 — 📢 Publicidad / product placement — MVP (capa aditiva)

Primer esqueleto de la monetización del SDD `specs/publicidad.md`: espacios de marca dentro del mundo.

### Agregado
- **`js/ads.js`** (capa **aditiva**, no en el e2e): lee `ads/slots.json` (espacios anclados a salas reales)
  + un manifiesto de campañas (`ads/manifest.json` o `window.ADS_MANIFEST` remoto), resuelve campaña→slot
  (ventana de fechas + rotación por peso) y dibuja un **afiche al estilo** sobre el slot (imagen lazy si
  hay, o placeholder de texto bilingüe). Etiqueta discreta "AD".
- **`ads/slots.json`** (3 espacios de ejemplo: 2 en la calle, 1 en la cueva) + **`ads/manifest.json`** con
  campañas **ficticias** (Cumbia Cola, Telo El Edén, Blue Bank) para demostrar el formato.
- Seam en `game.js`: 1 línea guardada `if (typeof Ads !== 'undefined') Ads.draw(...)`. **Sin slots/manifiesto
  o sin red, el juego anda idéntico.**

### Técnico
- En producción las creatividades/manifiesto viven **fuera del repo GPL** (o endpoint remoto). Falta del SDD:
  pantalla/fachada/góndola, imágenes pixel-procesadas y métricas (reusar `presence-server`). web-smoke sirve
  `ads/*.json` (fetch 200, sin errores). e2e + web-smoke verdes.

---

## [v72] — 2026-06-23 — 📱 Soporte mobile / touch (capa aditiva, dormida en desktop)

Primera versión de controles táctiles, como **capa aparte** que no toca el core (los 11 `js/*.js`).

### Agregado
- **`mobile/`**: `boot.js` (detecta pointer coarse y, solo ahí, inyecta el resto), `touch.js` (controles
  en pantalla) y `mobile.css` (estilos + cartel "girá el teléfono" en vertical).
- **Controles**: **joystick** izquierdo → `Input.keys` a/d/w/s (sirve para el plataformas y los modos
  vista-de-arriba); **mitad derecha** → apuntar + disparar (`Input.mouse`); botón **E** (usar) y **ESC**
  (cerrar/salir), que disparan los mismos eventos de teclado que el juego ya escucha.
- Una **sola línea** en `index.html` (`mobile/boot.js`); en desktop la capa queda **dormida** (pointer
  fino → no inyecta nada), así el juego y los tests quedan idénticos.

### Técnico
- Aprovecha el **seam de Input** (`Input.keys`/`Input.mouse` son objetos públicos mutables): la capa
  **escribe** ahí y el core responde igual, sin cambios. Dependencia en un solo sentido.
- `z-index 8`: los controles van sobre el canvas durante el juego y **debajo** de los overlays (menús/chat)
  y del ⚙. e2e + web-smoke (desktop) verdes. **Pendiente: probar en celular real** (gestos finos, notch).

---

## [v71] — 2026-06-23 — 💬 Más NPCs chateables (cuevero y tahúr)

El chat con IA tenía pocos personajes; ahora hay dos voces nuevas con persona acotada.

### Agregado
- **Cuevero chateable** en la cueva (sala 8): un arbolito "sin clientes" (`action:'chat'`, `persona:'cuevero'`)
  — desconfiado, slang porteño, indirectas sobre el blue y la AFIP. **No** es el del deal (ese sigue
  scripteado: dispara la tormenta).
- **Tahúres chateables** en la trastienda secreta (sala 9): dos naiperos (`persona:'tahur'`) que charlan de
  truco, envido y trampas con cara de santo. El Tahúr del juego de truco sigue intacto (`action:'truco'`).
- Persona **`tahur`** nueva en `js/ai.js` y en el proxy (`ai-proxy/personas.js`); **canned** locales (es/en)
  para `cuevero` y `tahur` (antes caían al genérico) → el chat offline ahora responde **en personaje**.

### Técnico
- Respeta la regla de [ia-openrouter §0]: los NPCs con DATA/acción crítica siguen scripteados; sólo se
  hacen chateables NPCs sin rol de gameplay. e2e (auditoría de assets) + web-smoke verdes.

---

## [v70] — 2026-06-23 — 🔊 Sonido ambiente por zona

Hasta ahora solo había música. Ahora cada zona tiene una **cama de ambiente** sutil debajo.

### Agregado
- **Ambiente por sala** (`Sfx.setAmbient(kind)` en `audio.js`, capa **aparte** de la música): una cama de
  ruido filtrado en loop con "respiración" lenta. Cuatro climas: **calle** (murmullo de ciudad),
  **viento** (post-tormenta / pisos en ruina, desolado, con ráfagas), **cueva** (rumor grave de subsuelo)
  y **recital** (gentío en Cemento). Se cruza-funde al cambiar de sala; se corta al ganar/morir.

### Técnico
- `game.js`: helper `ambientFor(room)` (zona→clima) cableado en la transición de sala + al arrancar/continuar.
  Procedural (WebAudio: buffer de ruido en loop + biquad + LFO de volumen), sin assets. e2e + web-smoke verdes.

---

## [v69] — 2026-06-23 — 🚪 La puerta trasera del chino entra al grafo de pistas

Playtest: si disparabas la tormenta de una, el linyera solo te mandaba a Iorio (camino circular) y nunca
te decía que el chino tiene una **puerta de servicio** al fondo de la cueva. Ahora el grafo conoce las dos.

### Agregado
- **Arista `chino_back`** en el grafo de historia (autoría en `super-chino.md` → `gen-historia.mjs` →
  `historia.js`, **12 aristas**): la **segunda forma** de entrar al chino post-tormenta. Por **cercanía**,
  el linyera te manda a la **puerta trasera** cuando estás en la cueva, y a **Iorio** cuando estás en Cemento.
- La pista trasera desaparece al **entrar** (`chinoEntered`) o si ya abriste el **frente** con Iorio.

### Técnico
- Flag espejo `chinoEntered` (1 línea en `enterSuper`: lo setea **cualquier** puerta del chino post-tormenta;
  en `historiaState`, `serialize`/`restore` → persiste en el guardado). Fase 1 sigue **solo describiendo**.
- e2e: nuevas aserciones (cueva→`chino_back`, Cemento→`chino_iorio`, y que `chino_back` se resuelve al entrar
  / con el frente abierto). e2e + web-smoke verdes.

---

## [v68] — 2026-06-23 — 💼 Premio real en el edificio abandonado (el tesoro de los linyeras)

El edificio dejó de ser solo loot de monedas: ahora la trepada tiene un **premio de verdad**.

### Agregado
- **Tesoro de los linyeras** en el búnker: el **linyera mayor** te entrega un **maletín de dólares** (+150 🪙),
  un cajón de munición (+40) y una **mejora PERMANENTE del escupitajo** (daño 14→24, para todo el run).
  Solo si sos **gurú** (tras robar el tótem del piso 19 → `bunkerUnlocked`) y **una vez por partida**.
  Le da sentido a alimentar a los borrachines → trepar 20 pisos → tótem → búnker.
- Nuevo **hito** en la pantalla de fin: *Reclamaste el tesoro de los linyeras* (ahora 11 hitos).

### Técnico
- `player.spitDmg` (default 14, lo lee `player.shoot`); el tesoro lo sube a 24. Persiste en el guardado.
- `grabTesoro` + flag `tesoroTaken` (en `reset`/`serialize`/`restore`) + `action:'tesoro'` en el búnker
  (NPC + decor `maletin`). i18n `g.tesoro.*` / `g.prompt.tesoro*` / `g.hito.tesoro` (es/en, paridad ok).
- e2e (auditoría de los 38 cuartos) + web-smoke verdes.

---

## [v67] — 2026-06-23 — 🏆 Pantalla de fin con stats (resumen de la partida)

Ganar o morir ya no muestra solo texto: ahora hay un **resumen** de cómo te fue.

### Agregado
- **Resumen de la partida** en la pantalla de fin (`#endStats`): guita en el bolsillo, días sobrevividos
  en el loop, cosas juntadas (pickups), y **Hitos N/10** con un **checklist** ✓/· de los 10 hitos del nivel
  (tormenta, edificio, búnker, Iorio, truco, FIFA, Mega Drive, Cemento, armado, portal). El portal aparece
  tildado solo si ganaste.
- i18n completo (es/en): `g.stats.*` + `g.hito.*` (paridad verificada).

### Técnico
- `gameStats(won)` + `renderStats(won)` en `game.js`; se llaman desde `win()`/`die()`. Reusa el estado que
  ya existe (flags + `states[].pickups`), no agrega tracking nuevo. Estilos `.end-stats*` en `style.css`.

---

## [v66] — 2026-06-23 — 🔥 Pulido del loop: fuego que parpadea + ninjas al pogo

Dos detalles visuales del loop post-tormenta que estaban pendientes (antes eran estáticos / solo texto).

### Agregado
- **Fuego animado** en la barricada del chino: los tachos ahora tienen **llamas que titilan** y se mecen
  (`drawFlame` en `game.js`, dibujadas sobre el sprite con resplandor y `globalCompositeOperation:'lighter'`,
  desfasadas entre los dos tachos). Reemplaza el fuego pintado fijo del sprite.
- **Ninjas yéndose al pogo**: cuando le das FALOPA a **Iorio** y toca *Pibe Tigre*, en **Cemento** entran
  corriendo **3 ninjas** hacia el escenario (siluetas con vincha roja y katana, piernas animadas;
  `drawNinjaRunners`/`drawRunner`, FX transitorio de ~4s que se desvanece). Antes el frente del chino
  simplemente se abría sin verse nada.

### Técnico
- Todo **procedural** (sin sprites ni sistema de entidades nuevos): se dibuja en `render()` con el reloj
  `time`. El FX de ninjas usa `ninjaRunT`/`ninjaRunRoom` (se setean en `giveIorio`, se limpian en `reset`).
- Capa de render pura: no toca lógica ni flags. e2e + web-smoke verdes.

---

## [v65] — 2026-06-23 — 💾 Guardado automático (continuar partida)

El progreso ya no se pierde al recargar: se autoguarda en `localStorage` y la intro ofrece **Continuar**.

### Agregado
- **Guardado automático** (`js/save.js`, capa **aditiva**): cada ~5s jugando se persiste un snapshot del
  estado en `localStorage` (clave `tormenta-solar-save-v1`). Sin `localStorage` o sin la capa, el juego
  anda exactamente igual.
- **Botón "Continuar"** en la intro (`#continueBtn`, i18n `intro.continue`), visible solo si hay partida
  guardada; retoma exactamente donde dejaste (sala, posición, vida/inventario, todos los flags de historia,
  pickups levantados, limosnas/falopa consumidas). Verde para distinguirlo de ENTRAR.
- El guardado **se borra** al ganar (`win`) o morir de verdad (`die`); morir en el loop de supervivencia
  no lo toca (volvés al loop anterior como siempre).

### Técnico
- Seam mínimo en `game.js`: `serialize()` (snapshot plano) / `restore(snap)` / `continueGame(snap)` +
  `autosave()` en el loop; se expone `window.Game = { serialize, continueGame }`. El estado sigue privado.
- No se persisten los sub-modos (arcade/super/disquería): al cargar retomás parado en la sala.
- e2e: nuevo test de **round-trip** `serialize`→`continueGame`→`serialize` (vía `window.Game`). web-smoke OK.

---

## [v64] — 2026-06-22 — 🧭 Linyera ERRANTE: aparece cerca de lo que no hiciste (Fase 1 completa)

Último ítem del grafo de historia (Fase 1): el linyera ya no está fijo en la calle.

### Agregado
- **Linyera errante** (`placeRoamingOraculo` en `game.js`): al entrar a una sala, si hay una arista de
  **frontera en ese lugar** (`currentAt()`), aparece un linyera cerca del jugador para tirar la pista de
  *eso*. Uno solo a la vez (se mueve con vos); en la calle queda el fijo de siempre. Inyección **aditiva**
  en `spawnIn`, sin tocar `Level.build()`. Saludo i18n `g.oraculo.greet`.

### Cambiado
- Cache `v=63`→`v=64`.

### Notas
- **Fase 1 del grafo de historia COMPLETA.** Futuro opcional: Fase 2 (que el grafo *maneje* los flags).

---

## [v63] — 2026-06-22 — 🧭 Pistas: el linyera las dice con su voz (grounding del chat IA)

El chat IA del linyera ahora se **apoya en la pista del grafo** (grounding): el LLM le pone la voz, la ruta
sale del `HintEngine`.

### Agregado
- **`AI.chat(npc, message, history, grounding)`**: la pista recuperada se inyecta en el system prompt
  (`groundDirective`, es/en) — *"decí ESTO con tus palabras, no inventes otros caminos ni datos"*. También
  se manda al proxy (`grounding` en el body).
- **`game.js`**: al chatear con el linyera, la pista del nivel actual se pasa como grounding; si la
  respuesta sale **local** (sin IA), se muestra la pista explícita (💡) como garantía.

### Cambiado
- Cache `v=62`→`v=63`.

### Notas
- Con esto, de la Fase 1 del grafo de historia queda **solo** el **spawn errante** del linyera (SDD §7).

---

## [v62] — 2026-06-22 — 🧭 Pistas: aristas secundarias (el linyera ayuda en TODO)

Segunda pasada del grafo de historia: el linyera ahora también guía las ramas secundarias, no solo el
camino crítico.

### Agregado
- **5 aristas nuevas** (` ```hist ` en las fichas): `megadrive` (super), `fifa` (arcade), `cemento_ticket`
  (disquería), `armas` (galería), `loop` (búnker). **11 aristas en total.**
- **Prioridad** en `HintEngine`: el camino crítico (`pri` default 10) gana al secundario (`pri` 20+); la
  cercanía sigue eligiendo lo del lugar donde estás.
- `historiaState()` ampliado (`hasMegaDrive`, `fifaWon`, `hasCementoTicket`, `armado`, `sleptOnce`) y
  `currentAt()` con más lugares (super/galería/búnker). Flag espejo `armado` en `game.js` (no refactor).
- e2e: asserts de cercanía (super→megadrive) y precondición (FIFA requiere Mega Drive).

### Cambiado
- Cache `v=61`→`v=62`.

### Notas
- Fase 1 casi completa. Pendiente (SDD §7): **spawn errante** del linyera y **grounding** del chat IA.

---

## [v61] — 2026-06-22 — 🧭 Grafo de historia + linyera-oráculo de pistas (Fase 1)

Primera implementación del SDD [`historia-grafo.md`](specs/nivel-1/historia-grafo.md): el **linyera
filósofo** ahora **te tira pistas que dependen de en qué punto de la historia estás**, sin spoilear de
una. Capa **aditiva** (sin esto, el juego anda igual); el grafo **solo describe** (lee los flags que
`game.js` ya maneja, no los toca).

### Agregado
- **`tools/gen-historia.mjs`**: ensambla el grafo desde bloques ` ```hist ` (JSON) declarados en las
  fichas (`personajes/`+`edificios/`) → escribe `js/historia.js`. Validación: ids únicos, sin ciclos.
- **`js/historia.js`** (generado): 6 aristas del **camino crítico** (`tormenta`, `edificio`, `bunker`,
  `chino_iorio`, `truco`, `portal`), cada una con precondición/efecto y **pistas es+en × 4 niveles**.
- **`js/hint-engine.js`** (`HintEngine`): dado el estado (flags) + lugar + insistencia, devuelve la
  próxima pista de la **frontera**, por **cercanía** y con **spoiler escalado** (0 frase loca → 3 directo).
- **Linyera enchufado**: al hablarle tira una pista críptica; cada repregunta la aclara más (hasta
  ponerse directo). Sabe qué hiciste y qué no.
- **e2e**: valida el grafo + el motor (frontera, cercanía cueva→tormenta, aristas hechas, fin sin pistas).

### Cambiado
- Cache `v=60`→`v=61`.

### Notas
- Fase 1 / camino crítico. Pendiente (en el SDD §7): aristas secundarias, **spawn errante** del linyera y
  **grounding** del chat IA con la pista.

---

## [v60] — 2026-06-22 — 🌎 i18n: `Dialogos.en` completo + glosario de transcreación

Cierre de los pendientes opcionales de i18n (menos el 3er idioma).

### Agregado
- **`js/dialogos.js`**: se completó el último pool en inglés que faltaba (`linyera_llanto`, 8 líneas
  transcreadas) → **9/9 pools llenos en `es` y `en`**. (Antes caía al fallback `g.linyeraCry` de 4 líneas.)
- **`specs/glosario-transcreacion.md`** (NUEVO): fuente única de las decisiones es-AR → inglés —
  nombres propios que se dejan igual, mapeo canónico de términos (guita→cash, falopa→gear, forros→rubbers,
  pibe→kid, etc.) y notas de tono. Referenciado desde `idiomas.md`, `ia-openrouter.md` y el índice de specs.
- **`tools/gen-dialogos.mjs`**: flag `OPENROUTER_ONLY=pool1,pool2` para regenerar **solo** ciertos pools
  (top-up sin tocar los demás, que `readExisting()` preserva). Útil cuando un pool cae por un 429.

### Cambiado
- Cache `v=59`→`v=60`.

---

## [v59] — 2026-06-22 — 🌎 i18n: las pantallas que faltaban (super, disquería, arcade, IA)

Un chequeo idioma por idioma encontró 4 sub-pantallas que habían quedado **en español** porque
nunca se habían cableado a la capa i18n. Ahora el juego está **realmente** entero en inglés.

### Cambiado
- **Super Chino** (`js/super.js`): mensajes, prompts y labels del canvas (góndolas, sectores, CAJA,
  CHANGUITO, SALIDA, diálogos del chino y los ninjas) pasan por `T()`. Las categorías quedan como
  **id interno estable** y se traducen al mostrar (`sup.cat.*`).
- **Disquería** (`js/vinilos.js`): intro, diálogos del punk, banner, época y SALIDA por `T()` (acá el
  helper se llama `TR()` porque `create()` ya usa una coordenada local `T`).
- **Arcade** (`js/arcade.js`): HUD (`PUNTOS/VIDAS`), banners (`¡GANASTE!/GAME OVER/PERDISTE`), Street
  Fighter y **todo el Truco** (envido, quiero/no quiero, parda, pozo, marcador). Se conservan los
  términos del truco (`truco`, `envido`) y las iniciales de los palos (E/B/O/C).
- **Chat IA en ⚙ Opciones** (`js/ai.js`): estado del chat, validación de modelo y errores
  (401/404/429/timeout) por `T()`.
- **Catálogos**: +~120 claves (`sup.*`, `vin.*`, `arc.*`, `ai.*`) en `game.es.js`/`game.en.js`.
  **Paridad 263/263** (verificada).
- Cache `v=58`→`v=59`.

### Notas
- Verificado renderizando las tres pantallas con `I18n` en inglés (texto dibujado en EN). e2e
  (incl. sub-modos y chino) y web smoke en verde.

---

## [v54–v58] — 2026-06-22 — 🌎 Multi-idioma: el juego entero en inglés

Soporte multi-idioma (español rioplatense ⇄ inglés) para que lo jueguen angloparlantes. `es-AR` es la
**fuente**; el inglés es **transcreación** (no traducción literal: el humor porteño no se rompe). Capa
aditiva, mismo ethos que `config.js`/`fit.js`. Spec: [`specs/idiomas.md`](specs/idiomas.md) (source of
truth). *(Las versiones v34–v53 no están detalladas acá; ver `ROADMAP.md` y la memoria del proyecto.)*

### Agregado
- **Runtime i18n** (`js/i18n.js`): `I18n.t(key, params)` (fallback idioma→es-AR→clave), `I18n.tList(key)`
  (líneas al azar), `I18n.dict(pool)` (diálogos por idioma), `I18n.apply()` (recorre `[data-i18n]` /
  `[data-i18n-attr]`), `I18n.set(lang)` (cambia en vivo y persiste).
- **Catálogos**: UI (`js/lang/es.js`/`en.js`), narración de `game.js` (`js/lang/game.es.js`/`game.en.js`,
  se mergean con `Object.assign`) y traducción de `level.js` (`js/lang/level.en.js`, mapa es→en + reglas
  para nombres dinámicos). **Paridad 149/149 claves** UI+narración (verificada).
- **Selector de idioma** en ⚙ Opciones (`#opt-lang`), cambia en vivo sin recargar.
- **Diálogos de NPC por idioma** (`Dialogos[es|en][pool]`): `tools/gen-dialogos.mjs` ahora es multi-idioma
  (`OPENROUTER_LANGS=es,en`, prompt de transcreación). `js/dialogos.js` reestructurado. (`en`: 8/9 pools.)
- **Chat IA en el idioma activo** (`js/ai.js`): directiva de transcreación en el system prompt + canned
  en inglés (`FALLBACK_EN`).

### Cambiado
- **Resolución del idioma** (v56): `?lang` → `localStorage(ts_lang)` (lo que elegís en Settings) →
  `navigator.language` (español→`es-AR`; **cualquier otro idioma no soportado → inglés**) → inglés.
- **`game.js`**: toda la narración (~90 `setMsg`/prompts/fin/labels/arcade/música) pasa por `T()/TL()`.
- **`level.js`**: **no se tocó** — sus strings quedan en español como **id interno estable** (los regex
  `/Búnker/`,`/Truco/`,`/Garbarino/` y el wiring por `name` siguen intactos); se traducen sólo al mostrar
  vía `TX()` → `js/lang/level.en.js`.
- Meta no-cache en el HTML y cache `v=54`→`v=58`.

### Notas
- Verificado en navegador real (`?lang=en`): intro "SOLAR STORM", botón "HIT THE STREET", piso
  "Florida & Lavalle", mensajes en inglés. e2e y web smoke en verde.
- **Pendiente (opcional)**: regenerar `Dialogos.en` para más variedad, glosario de transcreación, y un 3er
  idioma (que conviene encarar migrando `level.js` a claves `t()`). Ver `specs/idiomas.md` §13.

---

## [v33] — 2026-06-21

### Agregado
- **Deptos de lujo** en el edificio abandonado (pisos impares): depto completo con **cocina**,
  **baño**, **living con tele**, maniquí de moda, **joyas** y un **maletín lleno de dólares**.
  Sprites procedurales nuevos en `art.js` (`cocina`, `bano`, `sofa`, `tvplasma`, `joyas`, `maletin`).
- **Linyera filósofo** (un Diógenes de Florida): si querés agarrar el maletín o las joyas, sube y
  te frena con su monólogo (*“corréte que me tapás el sol”*). Sprite `linyera` + `action:'maletin'`.
- **Presencia "jugando ahora"** (`js/presence.js`): contador de jugadores online en la intro.
  Capa **aditiva y opcional** (sin endpoint no muestra nada y el juego anda igual). Backend mínimo
  en [`presence-server/`](presence-server/README.md): server Node sin dependencias **o** Cloudflare
  Worker gratis.
- **Auto-escalado de pantalla** (`js/fit.js`): el `#stage` se escala para llenar la ventana sin
  deformar (canvas + HUD juntos). Ya no hace falta hacer zoom en el navegador.
- **Links**: la intro linkea al repo de GitHub; el README al juego online.

### Cambiado
- README / ROADMAP actualizados (depto de lujo, presencia, auto-fit, cómo correr).

### Arreglado
- El audit de assets del e2e chequeaba `d.art` (campo inexistente) en vez de `d.type`, así que
  **no validaba la decoración**. Ahora sí: detecta sprites de decor faltantes.

---

## [v31] — 2026-06-21

### Cambiado
- **Rediseño del super chino**: **changuito virtual** — agarrás de las góndolas sin pagar y
  **pagás en la CAJA**; el chino cobra solo en monedas y **da el vuelto en caramelos**. Si no te
  alcanza la guita no te fía y **no acepta caramelos** (se enoja). Si rajás sin pagar, salen **dos
  ninjas samurái** de la puerta de la familia y te echan **sin la mercadería**.
- **Rediseño de los borrachines**: cada uno tiene algo en la mano (vino/cerveza/porro) y quiere de
  regalo **fiambre / Diosa Tropical / carne** (no lo que tiene en la mano). Te tiran cosas al azar
  y la pista se revela hablándoles. Nuevo ítem **Diosa Tropical**.

### Agregado
- Test e2e del chino (changuito + pagar + vuelto + ninjas) vía `__grab/__pay/__leave/__cart`.

---

## [docs] — 2026-06-21

### Agregado
- **ROADMAP**: estrategia de **soporte mobile** como capa aditiva (sin tocar el core), apoyada en
  el seam de `js/input.js`.

---

## [GPLv3] — 2026-06-20

### Agregado
- Licencia **GNU GPLv3** (`LICENSE`).
- **PUBLICAR.md**: guía paso a paso para subir el repo y publicarlo en GitHub Pages.

---

## [v1] — 2026-06-20

### Agregado
- **Lanzamiento — Nivel 1: Florida y Lavalle.** Motor 2D side-scroller (tiles, gravedad, salto,
  cámara, iluminación, partículas, parallax). **34 salas**, NPCs, enemigos, pickups.
- EducaciónIT, Garbarino, Cemento, Chorería, **arcade** con 4 máquinas (Pac-Man, Galaga, Frogger,
  Trucotron) + truco con el Tahúr, **super chino** y **disquería** (vistas de arriba), galería,
  cuevas del dólar, **tormenta solar** y **portal final**.
- **Arte y música 100% procedurales** (sin assets externos). Música chiptune por zona.
- **Suite e2e headless** (`node tests/e2e.js`): boot + auditoría de assets + sub-modos.
