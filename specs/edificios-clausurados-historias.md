# SPEC: El vecino de los edificios clausurados — historias IA → nivel generado

- **Estado:** **Implementado** (2026-06-27) — loop completo: vecino → historias → "¿pasás?" → nivel generado → interior real. Ver §8.
- **Nivel:** 1 (post-tormenta)
- **Última actualización:** 2026-06-27
- **Relacionado:** `fabrica-niveles-ai.md` (la máquina de niveles — genera el nivel desde la historia),
  `tiendas-generadas.md` (mismo patrón "le hablás → entrás a un interior generado"), `ia-openrouter.md` /
  `npcs-vivos.md` (chat IA + personas + Mensajero), `resiliencia.md` (fallback estático si la IA cae),
  `nivel-1/historia-grafo.md` (los flags post-tormenta).

## 1. Contexto y objetivo

**Observación del dueño:** cuando estalla la tormenta, **los edificios quedan clausurados/bloqueados**. Y "al lado de
cada edificio **siempre hubo un personaje parado** que no podías interactuar". La idea: **darle voz** a ese personaje
(al menos uno por edificio clausurado). Ahora es un tipo al que **le hablás** y, en el chat, **te quiere contar cosas
del edificio de al lado**: chusmeríos de la gente que vive ahí, cosas que vieron, **fantasmas, chicos que mataron a
los padres, juguetes diabólicos, la llorona, fiestas que hicieron**… cosas con las que **la IA puede flashear** sobre
lo que pasa en un edificio.

**El lazo:** charlás (iterás el chat) y él **siempre tiene "algo más"** ("esperá que tengo algo para darte") y te
salta **otra historia**. Hasta cierto punto te dice **"¿querés pasar y ver qué pasó con XXX?"** — **hilando con la
ÚLTIMA historia** que te contó. Ahí **entrás al edificio** y **la IA genera un nivel en base a esa última historia**.
Después de pasar el nivel, **quedás adentro de lo que había antes** en ese edificio (por si necesitás iterar). Una vez
que ya entraste, **la próxima vez** que le hables **te cuenta una sola historia** y te hace el "¿querés pasar?", y
sigue igual.

Esto convierte cada edificio clausurado (hoy: un mensaje de "ruina" y nada más) en **contenido vivo, infinito y
distinto**, reusando el chat IA + la máquina de niveles. Es el norte: **memoria + IA + grafo**, ahora aplicado a los
edificios muertos.

## 2. Modelo del mundo (lo que ya existe)

- **Edificios clausurados post-tormenta** (calle, sala 0, puertas `collapsesOnStorm:true`): **EducaciónIT**,
  **arcade**, **chorería**, **Garbarino**. Hoy, post-tormenta, tocar la puerta → `setMsg(TL('g.ruina'))` y nada más
  (`game.js`: `if (stormed && it.d.collapsesOnStorm) { setMsg(g.ruina); return; }`).
- **Chat IA** (`js/ai.js` + `ai-proxy/personas.js`): personas server-side, pool de saturación, circuit breaker.
  Reusable: una persona **`vecino`** (chusmero/agorero del edificio).
- **Máquina de niveles** (`js/nivelai.js`): `generateLevel(themeObjeto)` ya acepta un **tema ad-hoc** (como el
  `oraculo`) → la "última historia" se traduce a un tema y genera el nivel (mismo camino que el oráculo, validado por
  `Playable` + auto-reparación + rooms-swap, ver `fabrica-niveles-ai.md`).
- **Interiores de edificio** que ya existen (EducaciónIT pisos, arcade, Garbarino, etc.): el "quedás adentro de lo que
  había antes" puede **reusar esas salas** (volver al interior original tras el nivel generado).
- **Patrón "entrás a un interior generado"**: idéntico a `tiendas-generadas.md` (sub-modo contenido + restore).

## 3. Diseño / narrativa

### 3.1 El vecino (un NPC por edificio clausurado)
- Se **spawnea al lado de cada edificio clausurado** cuando estalla la tormenta (al menos uno por edificio). Sprite de
  vecino/linyera/viejo de barrio. Pre-tormenta puede estar (mudo, ambiental); **post-tormenta es interactuable**.
- Cada vecino **conoce SU edificio** (`vecino.edificio = 'garbarino'|'arcade'|…`) → ancla las historias a ese lugar.

### 3.2 El chat de historias (iterativo)
- Le hablás → chat IA con persona **`vecino`**, **grounded** en: el edificio (`edificio`), que **flashee terror/
  chusmerío** del menú temático (fantasmas, filicidios, juguetes diabólicos, la llorona, fiestas, lo que vieron).
- **Iterás**: cada vez que respondés/insistís, él dice **"esperá que tengo algo para darte"** y tira **otra historia**
  (variada). Las historias se **acumulan** en su memoria (`vecino.historias[]`), la última es la **"activa"**.
- A partir de N historias (o por chance creciente), aparece la oferta: **"¿querés pasar y ver qué pasó con {gancho}?"**
  donde `{gancho}` sale de la **última historia** (ej. "los juguetes del 4°B", "la pieza donde lloraba la nena").

### 3.3 Pasar → nivel generado desde la última historia
- Aceptás → **entrás al edificio** (la puerta clausurada se "abre" para vos) → **la IA genera un nivel** con la
  **última historia como semilla** (`NivelAI.generateLevel(temaDesdeHistoria)`): paleta/props/enemigos/nombre
  derivados del gancho (ej. historia de juguetes diabólicos → tema con muñecos hostiles). Mismo pipeline que el
  oráculo (validado por la RED + auto-reparación + rooms-swap).
- **Tras pasar el nivel** (llegar a la meta): **quedás adentro del interior ORIGINAL** del edificio (sus salas reales,
  ej. los pisos de EducaciónIT / Garbarino), **por si querés iterar/explorar**. (No te escupe a la calle.)

### 3.4 Segunda vez en adelante
- Una vez que **ya entraste** a ese edificio (flag por edificio), el vecino, la próxima vez, **te cuenta UNA sola
  historia** y va directo al **"¿querés pasar?"** — y se repite el lazo (cada pasada = nivel nuevo desde la nueva
  historia). El chusmerío infinito sigue, pero más corto.

## 4. Requisitos funcionales

- **RF-1 — Vecino por edificio clausurado (DATA):** cada edificio `collapsesOnStorm` tiene **≥1 NPC `vecino`** al lado
  (`action:'vecino'`, `vecino:{ edificio }`). Pre-tormenta ambiental/mudo; **post-tormenta interactuable**. Aditivo.
- **RF-2 — Chat con historias IA:** persona **`vecino`** (en `personas.js`) + grounding `{edificio, tono:'terror/
  chusmerío', menú:[fantasmas, filicidio, juguetes diabólicos, llorona, fiestas, lo-que-vieron]}`. Cada turno = otra
  historia ("esperá que tengo algo…"). **Fallback estático**: un **banco de historias por edificio** (DATA) si la IA
  está caída (circuit breaker), para que nunca quede mudo.
- **RF-3 — La última historia es la semilla:** el cliente guarda `vecino.historias[]` (las del jugador con ESE
  vecino) y marca la **activa** (la última). De ahí sale el **gancho** y el **tema** del nivel.
- **RF-4 — Oferta de pasar:** tras N historias (config, ej. 2-3) o chance creciente, el chat ofrece **"¿querés pasar
  y ver qué pasó con {gancho}?"** (opción fija, estilo el chat de opciones del cuevero / `armasmenu`).
- **RF-5 — Generar el nivel desde la historia:** aceptar → `NivelAI.generateLevel(temaDesdeHistoria(historiaActiva))`
  → RED + rooms-swap (reusa todo `fabrica-niveles-ai.md`). `temaDesdeHistoria` mapea el gancho a paleta/props/enemigos/
  nombre (o pide al proxy `theme:'historia'` con el texto, como el oráculo). Fallback: tema genérico "edificio
  embrujado".
- **RF-6 — Quedás en el interior original al ganar:** al llegar a la meta del nivel generado, en vez de volver a la
  calle, **cargás el interior REAL** del edificio (sus salas) para iterar. (Salir de ahí = volver a la calle por su
  puerta.)
- **RF-7 — Segunda visita = una historia + ¿pasás?:** flag `entrado[edificio]`; si ya entraste, el chat va directo
  (una historia → oferta). El lazo se puede repetir (cada pasada, nivel nuevo).
- **RF-8 — Aditivo / resiliente:** sin `NivelAI`/IA, el vecino igual **chusmea** (banco estático) y, si no se puede
  generar, la oferta de "pasar" cae a un nivel estático o no aparece — **nunca rompe** la calle ni el run.

## 5. Estados y flags

- `vecino.edificio` (DATA), `vecino.historias[]` + `vecino.activa` (runtime, en el NPC), `entrado[edificio]`
  (persistente, por edificio).
- Sub-modo del nivel generado = el del nivel-AI (`spinoffLevel` + snapshot), **pero al ganar** restaura al **interior
  del edificio** (no a la calle) — variante de `endSpinoffLevel` (`returnTo: 'interior-edificio'`).
- Entra al **grafo** post-tormenta: el vecino y "pasar" son nodos/aristas con `pre: { stormed }`.

## 6. Criterios de aceptación

- **CA-1:** post-tormenta, al lado de cada edificio clausurado hay un vecino interactuable (e2e: spawnea con `stormed`).
- **CA-2:** hablarle abre el chat; iterar da historias distintas; con la IA caída usa el banco estático (test estilo
  `breaker`).
- **CA-3:** tras N historias aparece "¿querés pasar y ver qué pasó con {gancho}?" enganchado a la última historia.
- **CA-4:** aceptar genera un nivel jugable (pasa `Playable`) y, al ganarlo, quedás en el interior real del edificio.
- **CA-5:** segunda visita = una historia + oferta directa. El lazo se repite con un nivel nuevo.
- **CA-6:** sin `NivelAI`/IA, la calle y el run siguen intactos (aditivo) y el vecino igual chusmea.

## 8. Implementación (2026-06-27)

Capa **aditiva** (cliente + i18n + proxy). Toca: `js/level.js` (4 vecinos DATA en la calle), `js/game.js` (todo
el flujo), `js/lang/game.{es,en}.js` (historias/ganchos/UI), `js/nivelai.js` (`requestHistoria`), `index.html`
(overlay `#vecinomenu`), `ai-proxy/server.js` (branch `theme:'historia'`). v2 plumbing: `vecino` en
`tools/gen-level.js` + `js/mundo.js` + `levels/level.schema.json` (paridad v1≡v2 verde, `level-data.js` regenerado).

- **RF-1 (vecinos DATA):** 4 NPCs en la calle (sala 0), uno por edificio `collapsesOnStorm`: `edu`(→interior sala 1),
  `arcade`(4), `choris`(5), `garbarino`(11). `action:'vecino'`, `vecino:{edificio, interior}`. Pre-tormenta tiran su
  `dialog` ambiental; post-tormenta entran al flujo.
- **RF-2 (historias):** **banco estático COMPARTIDO** de 6 relatos de terror reusables (juguetes diabólicos, la
  llorona, filicidio, fiesta eterna, fantasmas, el gato del dueño muerto) en `VECINO_STORIES` + i18n
  `g.vecino.tale.<id>` (interpola `{edif}`). Robusto sin red. 1ª charla = teaser; de la 2ª en más (o si ya entraste)
  abre la **oferta** (overlay `#vecinomenu`, calco de `cueveromenu`): muestra el relato + 2 botones **"¿querés pasar
  y ver qué pasó con {gancho}?"** / **"contame otra"** (swap del relato in-place = el chusmerío iterativo).
- **RF-3/RF-5 (la historia es la semilla):** `themeFromStory` arma un **tema ad-hoc** (paleta/props/style/nombre=gancho)
  → `NivelAI.generateLevel(tema)` (RED `Playable` + auto-reparación + rooms-swap, reusa toda la máquina). **IA opcional**
  (`requestHistoria` → proxy `theme:'historia'` con `{edificio, gancho}` → name/intro/props/lines/style + **geometría**
  autorada): si está, enriquece; si la IA cae (circuit breaker) → tema **estático** al toque. RF-8 cubierto.
- **RF-6 (interior real al ganar):** `loadGenLevel(gen, returnRoom)` guarda `spinoffReturnRoom`; `endSpinoffLevel('win')`
  carga el interior REAL del edificio (sus salas, ya en `rooms[]`) en vez de la calle. Salir = la puerta del interior.
- **RF-7 (2ª visita):** `entradoEdif[edificio]` (persistente, serializado) → ya entrado = la oferta sale directa. El
  lazo se repite (cada pasada, nivel nuevo desde una historia nueva).
- **Tests:** `tests/e2e.js` hook `Game.__vecino` (historia → pasar → nivel generado SYNC en headless → interior real
  al ganar). Battery + web-smoke + paridad verdes.

### Decisiones tomadas sobre §7 (preguntas abiertas)
- **Edificios:** los 4 `collapsesOnStorm` (el abandonado queda con su sistema propio). ✅ propuesta del SDD.
- **Gancho→tema:** **híbrido** — el cliente arma el tema estático desde el relato; el proxy (`theme:'historia'`) lo
  **enriquece** con texto+geometría si está disponible. ✅
- **Interior tras ganar:** las **salas reales** del edificio (existen para los 4). ✅
- **Vecino IA vs scriptado:** **historias estáticas (robustas) + oferta como opción fija**; la IA autora el NIVEL
  (no el texto del chat, por ahora). Deuda menor: que la IA autore también el TEXTO de las historias (banco vivo).
- **Memoria:** se guarda `entrado[edificio]`; las historias se regeneran (no se persiste la activa — deuda menor).
- **Grafo:** el vecino/"pasar" NO entraron al grafo `historia.js` todavía (deuda, igual que el gate del cuevero).

## 7. Preguntas abiertas

- **¿Qué edificios?** ¿Los 4 `collapsesOnStorm` (edu/arcade/chorería/Garbarino) o también el abandonado/cine/etc.?
  Propuesta: **los `collapsesOnStorm`** (son los "clausurados" reales). El **edificio abandonado** ya tiene su sistema
  (borrachines/pisos) → queda aparte.
- **El "gancho"→tema:** ¿lo mapea el cliente (keywords → paleta/props) o lo arma el proxy (`theme:'historia'`, texto →
  tema, como el oráculo)? Propuesta: **proxy** (más rico) con **fallback** a un mapa de keywords cliente.
- **Interior original tras ganar:** ¿siempre las salas reales del edificio, o un "interior arruinado" generado?
  Propuesta: **salas reales** (EducaciónIT/Garbarino existen); para edificios sin interior propio (chorería), un
  interior genérico arruinado.
- **¿El vecino chatea libre (IA) o es semi-scriptado** (historia → oferta)? Propuesta: **IA con grounding fuerte**
  (las historias) + las **ofertas como opciones fijas** (no depende de que el LLM "decida" ofrecerte pasar).
- **Memoria entre sesiones:** ¿se guardan las historias en el save? Propuesta: guardar **`entrado[edificio]`** y la
  **historia activa** (para reabrir coherente); el resto se regenera.
- **Tope anti-abuso:** el lazo es infinito (cada pasada = nivel). ¿Límite por loop/día o costo? Propuesta: usar el
  **cupo del chat** que ya existe + caché de historias por edificio.
