# SDD — Calle Lavalle (hacia el Obelisco): el piquete copado

- **Estado:** **ETAPA 1.5 HECHA y en prod (v246→v251).** Lavalle es un **sub-modo TOP-DOWN** (`js/lavalle.js`), NO una
  sala side-scroller. **E5 (chat IA) ARRANCÓ:** el linyera peronista ya es chateable. Próximo: Etapa 2 (§5).
- **Última actualización:** 2026-07-01 (v251)
- **Origen:** idea del dueño. (Reemplaza el viejo "Nivel 2 = Calle Lavalle" del truco, que se había descartado: esta es
  una visión NUEVA y concreta, desacoplada del truco — Lavalle es una **zona contigua** de la calle, no un premio.)

## 0. Implementación actual (v246→v248) — ESTO es lo que está hecho (las §2-§3 de abajo son el diseño viejo, superado)

Tras el playtest del dueño, el diseño side-scroller original (§2-§3) **se reemplazó**:
- **Lavalle = SUB-MODO TOP-DOWN** `js/lavalle.js` (patrón `bodegon.js`/`telo.js`), **no una sala** del nivel. Se ve la
  avenida **9 de Julio** DE FRENTE: **Obelisco grande** en la **Plaza de la República**, **carriles PARALELOS** a todo el
  ancho (plana y ancha — NO líneas que convergen, eso parecía un puente colgante; v249) + jacarandás en los costados,
  la **barricada** del corte (cubiertas apiladas + autos rotos + reja + **banderas** Viva Perón/argentina/Che), tachos
  al **fuego animado** + olla popular, **colectivos/autos parados** + **patrulleros** (`vehicle()`), y los **piqueteros
  de cuerpo entero** (`piquetero()`: bandana/capucha, palos, bombo, banderas; sin niños). Cumbia (`Sfx.setCumbia`).
- **ENTRADA SIN PUERTA:** uno no cruza a otra calle por una puerta. En la sala 0 hay un **cartel de calle** decor
  `lavalle_sign` (`art.js`) en la esquina; **caminás al borde IZQUIERDO de Florida y PASÁS solo** (`game.js update`:
  `current===0 && player.x < 1.7*TILE && !stormed → enterLavalle()`). Volvés caminando para ABAJO (`exitTo:'street'` →
  spawn en `x=5` de la calle). `enterLavalle()` + estado `lavalle` + dispatch en game.js, igual que el bodegón.
- **NO hay sala side-scroller** de Lavalle (la 52 que existió en v244 se eliminó; el modelo v2 volvió a **51 salas**).
- Archivos: `js/lavalle.js` (el sub-modo), `js/art.js` (`lavalle_sign` decor + obelisco), `js/game.js` (enterLavalle +
  auto-pase + dispatch), i18n `g.lavalle.*` en `game.es/en.js`. **Verificado con screenshot real (Playwright).**

- **v250 (la postal VIVE):** cumbia (todos rebotan), bombo que se toca, multitud de fondo, tachos que iluminan +
  chispas, humo de los autos rotos.
- **v251 (multitud 3 hileras + lienzo + peronista chateable):** la multitud es de **3 HILERAS** con escala/alfa por
  fila (`CROWD_ROWS`; `smallFolk(…, sc)`) → profundidad; **abanderado con bandera argentina en cada PUNTA**; **lienzo
  largo "VIVA PERÓN ×N"** colgado alto sobre la hilera de atrás (`longBanner`, no tapa a nadie); **trío del frente** con
  el **LINYERA PERONISTA** al centro = **primer NPC chateable de Lavalle** (persona `peronista`, ficha
  `nivel-1/personajes/peronista.md`; sabe TODO de Perón y todo lo lleva a Perón). El sub-modo expone `openChatNpc`
  (one-shot) y `game.js` abre el chat IA y **vuelve a Lavalle al cerrar** (`chatReturnTo`), sin recrear la escena.
  **Deuda REGLA #0:** el chat es v2 (persona=dato+memoria+grounding); la escena sigue hardcodeada (sub-modo isla).
- **Relacionado:** `js/lavalle.js` (sub-modo), `js/art.js`, `js/audio.js` (cumbia `Sfx.setCumbia`), `js/game.js`,
  `ai-proxy/personas.js` (persona `peronista`), `js/ai.js` (copia BYOK).

## 1. La visión

Estás en la esquina de **Florida y Lavalle** (la sala 0, donde arranca el juego). Si en vez de meterte en la peatonal
(derecha) **doblás a la izquierda**, entrás a **Calle Lavalle yendo hacia el Obelisco**. Y ahí está **todo cortado por
un piquete** — pero un piquete **copado, de fiesta**: tachos prendidos fuego, pancartas "**Viva Perón**", banderas del
**Che**, una **olla popular**, **pibes jugando**, **gente con armas tumberas** (pero tranqui, guardando), todo **copado**
y **cumbia al palo**. El **Obelisco** se ve al fondo, detrás de la barricada.

La idea es ir **por etapas**: primero **esta postal** (la entrada al piquete, el clima), ver cómo se siente, y después
**agregarle cosas** (pasar el piquete, llegar al Obelisco, interacciones, quests, qué onda con la tormenta, etc.).

## 2. Etapa 1 — lo que se construye AHORA (la postal del piquete)

**Objetivo:** que puedas **doblar a la izquierda** desde el arranque y **caer en el piquete**: una escena **explorable,
ambiental, no hostil**, con el clima bien porteño-piquetero y la cumbia sonando. Sin combate todavía. La calle queda
**cortada** al fondo (la barricada) → de ahí no se pasa en E1 (eso es Etapa 2: el Obelisco).

### 2.1 La entrada — "girar a la izquierda"
- La calle (sala 0) tiene `playerStart: 5` (arrancás cerca del borde izquierdo). Sumamos una **puerta al extremo
  izquierdo** (`x≈2`, label *"doblar a Lavalle (al Obelisco) →"*): caminás a la izquierda desde el spawn y entrás.
- No tiene `collapsesOnStorm` (Lavalle no se derrumba con la tormenta; es zona contigua, no un edificio).

### 2.2 La sala — "Lavalle — el piquete"
- Sala nueva `makeRoom({ name:'Lavalle — el piquete', theme:'street', tags:['lavalle'], light:1.0, w≈40 })`.
- **Orientación:** entrás por la **derecha** (puerta `out` de vuelta a la calle en `x=w-2`), `playerStart` cerca de la
  derecha; el **piquete/Obelisco** está a la **izquierda** (caminás hacia el oeste). Al **fondo izquierdo**, la
  **barricada** (no se pasa en E1) + el **Obelisco** dibujado detrás.
- **Cumbia al palo:** al entrar a una sala con tag `lavalle`, `Sfx.setCumbia(true)` (la lógica per-frame de game.js ya
  prende cumbia cerca del músico — se extiende para forzarla con el tag); al salir, vuelve la música normal.
- **No stormable**, **sin enemigos** en E1 (el piquete es festivo/copado; los "armados" son NPCs guardando, no atacan).

### 2.3 El decor del piquete (nuevo, dibujado en `art.js`)
Tipos nuevos en el objeto `decor` de `art.js` (sprites dibujados, mismo patrón que `arbol`/`tacho`/`farol`):
- **`tacho_fuego`** — tacho/barril prendido fuego (reusa la base de `tacho` + llamas animables).
- **`pancarta`** — pancarta/lienzo colgado con "**VIVA PERÓN**" (tela + texto).
- **`bandera_che`** — bandera con la cara del Che (mástil + paño rojo/negro con la silueta).
- **`olla`** — olla popular (olla grande humeante sobre fuego/ladrillos).
- **`obelisco`** — el Obelisco al fondo (alto, gris, a la izquierda, detrás de la barricada — set-piece).
- **`barricada`** — la barrera del piquete (gomas/maderas/tachos apilados que cortan la calle).
- Se reusa lo existente para densidad: `tacho`, `farol`, `parlante` (cumbia), `cartel`.

### 2.4 Los NPCs (ambientales, dialog inline ES + i18n en `level.en.js`)
- **Pibes jugando** (`nino`/`civil2`): "¡pasá la pelota!", "¡gooool, la concha de la lora!".
- **Gente copada** (`civil1/3/4`, `mujer`): "aguante el barrio, hermano 🪗", "vamo' los pibes, ¡que suene esa cumbia!".
- **La olla popular** (`mujer`/`gordo`): "¿un plato de guiso, pibe? Hay para todos."
- **Los del piquete con armas tumberas** (`linyera`/`cuevero` look + flavor): "tranqui que acá no pasa nada malo… salvo
  que quieran levantar el corte 🔧". **Copados, no hostiles.**
- **El que corta** (en la barricada): "de acá no se pasa, está todo cortado hasta el Obelisco. Volvé más tarde." →
  gancho de **Etapa 2**.

### 2.5 i18n
Todo string visible (nombre de sala, labels de puerta, dialogs) va **en español inline** en `level.js` y se traduce
agregando la entrada al **mapa ES→EN** de `js/lang/level.en.js` (`levelTx`). Paridad obligatoria.

## 3. Arquitectura / cómo se engancha (resumen para construir)
1. **`js/level.js`**: nueva `makeRoom` (al final del array, para no correr índices) + **puerta `lavalle`** en la sala 0
   (extremo izq) + **`wire(0, 'lavalle', <idx>, 'out')`** en la sección de wiring.
2. **`js/art.js`**: nuevos tipos en `decor` (§2.3).
3. **`js/audio.js`**: la cumbia ya está (`Cumbia`/`setCumbia`); no hace falta tocar audio.
4. **`js/game.js`**: en la lógica de música per-frame (`Sfx.setCumbia(nearMusico && !stormed)`), extender a
   `(nearMusico || hasTag(room(),'lavalle')) && !stormed` → cumbia al palo en el piquete.
5. **`js/lang/level.en.js`**: traducciones ES→EN de todo lo nuevo.
6. **`index.html`**: bump de cache `?v=N` (tocamos js).

## 4. Verificación (E1)
- `node tests/e2e.js` (carga + todas las salas + sub-modos) + `tests/web-smoke.mjs` (render real).
- Paridad i18n ES/EN.
- Manual: arrancar → caminar a la izquierda → entrar a Lavalle → ver el piquete (tachos en llamas, pancartas, banderas,
  olla, pibes, cumbia sonando) → la barricada corta al fondo → volver a la calle (la cumbia se corta).

## 5. Roadmap — etapas siguientes (NO en E1, "luego agregamos más cosas")
- ✅ **E2 — pasar el piquete / llegar al Obelisco: HECHO (v278).** El corte se destraba GANANDO LOS 5 MINI-JUEGOS del
  piquete (v269: hueco + juramento al peronista + fiesta) → la colisión se abre, "el que corta" se corre, subís por el
  hueco → **`js/obelisco.js`**: Plaza de la República de noche, Obelisco gigante con pintada, la Marcha de fondo, el
  SATÉLITE REBELDE con ojo rojo cruzando el cielo, y el CUIDADOR ([E], 4 líneas, gancho de E3).
- ✅ **E3 — la tormenta acá: HECHO (v279).** El piquete AGUANTA (entrada post-tormenta + aurora glitch, la fiesta
  sigue = refugio festivo). Y en el Obelisco: **PELEA contra el SATÉLITE REBELDE** (telegrafía rayo rojo, 3 ❤️, rayo
  solar [E]) → herirlo = hito + premio + gancho al DATACENTER (el golpe final es colaborativo, D2). `ts_sat_down`.
- **E4 — interacciones/quests:** la olla popular (dar/recibir comida), los pibes (un picadito), los del corte (un
  favor), conexión con la economía (forros/flores/caramelos) y el grafo de historia.
- **E5 — chat IA:** algún personaje del piquete chateable (oráculo del barrio) que sepa del corte y del Obelisco.

## 6. Deuda / TBD
- El tono es **homenaje/parodia cariñosa** (como el resto del juego con Florida y Lavalle): sin afiliación política
  real, es color porteño. Mantener liviano y festivo.
- Balance de densidad de decor (que no tape al jugador ni rompa el salto). La RED (`Playable`) valida transitabilidad si
  se suman plataformas; en E1 el piso es plano (sin saltos obligatorios).
- Música: hoy `setCumbia` es global (corta la otra música). Está bien para E1; si en el futuro se quiere cumbia + SFX
  finos, se revisa.
