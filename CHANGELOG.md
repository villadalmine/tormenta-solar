# 📜 Changelog — Tormenta Solar

Todos los cambios notables del juego. Formato inspirado en
[Keep a Changelog](https://keepachangelog.com/es-ES/). Las versiones se corresponden con el
**cache-busting** (`?v=N` en `index.html`): subir `v` = release nuevo.

El juego es 100% estático; se publica en
[villadalmine.github.io/tormenta-solar](https://villadalmine.github.io/tormenta-solar/).

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
