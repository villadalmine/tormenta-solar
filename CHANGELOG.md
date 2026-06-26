# 📜 Changelog — Tormenta Solar

Todos los cambios notables del juego. Formato inspirado en
[Keep a Changelog](https://keepachangelog.com/es-ES/). Dos canales de versión:
- **`vN`** = releases del juego, atados al **cache-busting** (`?v=N` en `index.html`): subir `v` = release nuevo.
- **`infra-N`** = cambios de **infraestructura / sitio / deploy** (proxy, self-host, páginas, modelos) que
  NO tocan los archivos del juego, por eso no bumpean `?v`.

El juego es 100% estático; se publica en
[villadalmine.github.io/tormenta-solar](https://villadalmine.github.io/tormenta-solar/).

---

## 🔭 Próximamente — Roadmap (SDDs draft, sin implementar)

- **Rotación en LiteLLM** (`specs/pruebas-modelos.md §2.7`): `gemma2:2b` en la GPU como primario
  (+ `keep_alive`) con **fallback a `gemma4-free`** (OpenRouter) si la GPU se apaga. El usuario lo itera aparte.
- **Pago de la suscripción** (research hecho en `specs/pasarela-pago.md`): falta enganchar una pasarela
  (**Mollie** NL/EU · Mercado Pago/dLocal AR) → webhook → `/provision`. El entitlement por código YA está (ver
  infra-2..6). *(Métricas reales y suscripción por código: HECHO, ver entradas de abajo.)*
- **Bot de Telegram → Hermes** para manejar el juego desde el chat (`specs/telegram-hermes.md`).
- **Zona multijugador** (`specs/multijugador.md`, idea): cruzarte en tiempo real con otros jugadores +
  interactuar / quests co-op, reusando el SSE/presencia de `online-game`. Diseño temprano.
- **Spinoff STARGATE** (`specs/spinoff-stargate.md`, idea 2026-06-26): SG-1 + Atlantis, fiel al canon (razas,
  planetas, galaxias, naves, militar Tau'ri, personajes por raza). El stargate = puerta entre niveles/galaxias.
  Diseño temprano, NO implementado.
- **Quest del Mundial: los dos hinchas + el guarda** (`specs/cine-noticias.md §9`, idea 2026-06-26): dos NPCs IA en
  el piso Mundial te preguntan por un equipo random; pedís el resultado al guarda (te cambia la pantalla) y volvés a
  que te agradezcan. Requiere **poblar TODOS los resultados del Mundial 1×/día** (ESPN scoreboard). NO implementado.
- **Cine: news EN VIVO horario + Villa Dálmine** (`specs/cine-noticias.md §7.1`, idea 2026-06-25): 2º cron `0 * * * *`
  en modo live-only (sports+crypto) + **`POST /noticias` con merge por topic** (hoy reemplaza todo). Y los partidos
  de **Villa Dálmine** (team id `137785`, Primera B **Nacional**; TheSportsDB la etiqueta mal como "Metropolitana"
  → traer POR EQUIPO con `eventslast.php?id=137785`, no por liga). **NO implementado** — retomar.
- **Seguridad** (`specs/seguridad.md`): fase transversal — sin CVEs (todas las versiones), flujo cifrado,
  anti-DoS web/API/tokens (incl. "denial of wallet"), buenas prácticas de datos, anti-escalada. Con checklist
  de herramientas (trivy, ZAP, k6, kube-bench, Hubble, gitleaks) y prioridades.
- *(Opcional)* más GPU para correr `gemma3:4b` (mejor calidad, hoy 65s por el slice de 4GB); `tormenta-free`
  (cadena exacta del código) en LiteLLM.

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
