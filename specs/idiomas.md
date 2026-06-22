# SPEC: Idiomas / i18n (soporte multi-idioma, empezando por inglés)

- **Estado:** **Fase 1 implementada (v=54)** · Fase 2 (narración inline de `game.js`) pendiente
- **Alcance:** transversal (todos los niveles, UI + diálogos + IA)
- **Última actualización:** 2026-06-22
- **Idioma fuente (default):** `es-AR` (español rioplatense, slang porteño) · **primer idioma nuevo:** `en`

## 0. Estado de implementación (qué ya anda en v=54)

**✅ Fase 1 — base + UI + pools + IA:**
- `js/i18n.js` (runtime, capa aditiva): `I18n.t(key, params)` con fallback **idioma → es-AR → clave**,
  `I18n.dict(pool)` (lee `Dialogos[es|en][pool]`, cae a `es`), `I18n.apply()` (recorre `[data-i18n]` /
  `[data-i18n-attr]`), `I18n.set(lang)`. Resolución `?lang` → `localStorage(ts_lang)` → `navigator` → `es-AR`.
- `js/lang/es.js` + `js/lang/en.js`: catálogo de la **UI estática** (intro, HUD, opciones, fin, chat).
  **Paridad 29/29 claves** (verificado). El inglés es **transcreación** (ej. "ENTRAR A LA PEATONAL" →
  "HIT THE STREET", no literal).
- `index.html`: `data-i18n` / `data-i18n-attr` en toda la UI estática + **selector de idioma** en ⚙ Opciones
  (`#opt-lang`) + scripts cargados (`lang/*`, `i18n.js`) en `v=54`.
- `js/dialogos.js`: reestructurado a `Dialogos[es|en][pool]` (es lleno, **en vacío hasta generarlo**).
  `js/level.js` `_D/_Dp` leen vía `I18n.dict` (sin I18n → caen a `Dialogos.es` → fallback hardcodeado).
- `js/ai.js`: el chat responde en el **idioma activo** agregando una **directiva de transcreación** al
  system prompt (mantené el humor porteño, no traduzcas literal) + **canned en inglés** (`FALLBACK_EN`).
- `tools/gen-dialogos.mjs`: **multi-idioma** (`OPENROUTER_LANGS=es,en`), escribe `Dialogos[lang][pool]`,
  preserva los idiomas que no se regeneran, prompt de transcreación para `en`.

**⏳ Fase 2 — pendiente:** los **cientos de `setMsg`/prompts/textos de fin** hardcodeados en `game.js`
(narración del juego) y los `dialog`/`hint`/`want`/`name` fijos de `level.js` siguen en español. Hay
que extraerlos a claves del catálogo (`t(...)`) — es un refactor mecánico grande. Hasta que se haga,
en modo `en` la UI/chrome y el chat IA están en inglés, pero la narración inline sigue en español.

## 0.1 Cómo generar los diálogos de NPCs en inglés (correr el script)
El inglés de los **pools** (`Dialogos.en`) se genera con IA (modo A), no se escribe a mano:
```bash
# key en tools/openrouter.key (1 línea) o env OPENROUTER_API_KEY
OPENROUTER_LANGS=es,en node tools/gen-dialogos.mjs   # genera ambos (o OPENROUTER_LANGS=en para solo inglés)
```
Reescribe `js/dialogos.js` con `Dialogos.en` lleno (transcreado del español, no traducido). Subí `?v=N`.
Mientras `Dialogos.en` esté vacío, en inglés los NPCs caen automáticamente a las líneas en español.

## 1. Contexto y objetivo

Esto es **del juego**, no de la documentación: que un angloparlante pueda **jugarlo en inglés**. Hoy
**todo el texto está hardcodeado en español** y desparramado: markup de `index.html` (intro, opciones,
HUD), mensajes de `game.js` (`setMsg`, prompts, fin), nombres/`dialog`/`hint`/`want` de los NPCs en
`level.js`, los pools generados (`js/dialogos.js`), y las personas + líneas canned de `js/ai.js`. No
hay forma de cambiar de idioma.

El objetivo es poder **servir el juego en varios idiomas** (arrancando por **inglés**) de manera
**agnóstica y consistente**: ningún string de cara al usuario vive "suelto" en la lógica, hay **una
sola fuente por idioma**, y agregar un idioma nuevo es **agregar un catálogo**, sin tocar el core.

Mismo ethos que `config.js`/`fit.js`/`presence.js`: **capa aditiva** (`js/i18n.js`). Si el módulo no
está o falta una clave, el juego **no se rompe** (cae al idioma default y, en última instancia, a la
clave). El e2e headless sigue válido.

## 2. El problema de fondo: esto NO es traducir, es *transcrear*

El juego **es** humor porteño. Traducir literal `"corréte que me tapás el sol"` o `"todo hasta la
teta, pibe"` mata el chiste. **Lo importante es que los chistes conserven el humor porteño y no se
rompan en la traducción.** Decisión de diseño central:

- **`es-AR` es la fuente de verdad del *contenido*** (la voz, los chistes, las pistas).
- Cada idioma nuevo es un **locale autoral**, no una traducción automática: se **transcrea** el tono
  (buscar el equivalente cultural, no la palabra). La IA (modo A, `gen-dialogos`) puede tirar un
  **primer borrador** en inglés, pero el tono se **cura a mano**.
- Se mantiene un **glosario por idioma** (términos recurrentes con su transcreación fija) para que el
  locale sea **consistente** consigo mismo: ej. `falopa`, `linyera`, `chino`, `cueva/cuevero`,
  `arbolito`, `birra`, `fiambre`, `boludo`. Un mismo término se traduce **siempre igual** dentro del
  locale.
- **Nombres propios y anclas culturales** (Florida, Lavalle, Obelisco, **Iorio**, Cemento,
  **EducaciónIT**, "Casa de Cambio") **se conservan**; si hace falta, se glosa al pasar. La decisión
  conservar/traducir es **por término**, anotada en el glosario.

> Regla: el `en` no tiene que sonar "traducido del español"; tiene que sonar como **el mismo juego
> escrito por un porteño que habla inglés**. Slang callejero equivalente, no diccionario. La voz de
> cada personaje en otros idiomas se define en su ficha (ver `ENTIDAD-template.md` → "Voz en otros
> idiomas") y la regla dura está en `ia-openrouter.md`.

## 3. Qué texto hay que internacionalizar (inventario)

Tres clases, cada una con su mecanismo:

| Clase | Dónde vive hoy | Mecanismo i18n |
|---|---|---|
| **UI estática** (intro, opciones, HUD labels, botones, fin) | markup de `index.html` | `data-i18n="clave"` + `I18n.apply()` |
| **Mensajes dinámicos** (`setMsg`, prompts, COLLAPSED, narrador del loop, textos de fin) | strings sueltos en `game.js` | `t('clave', {params})` |
| **Contenido de NPCs** (nombres, `dialog`, `hint`, `want`, personas y canned de IA, pools) | `level.js`, `ai.js`, `dialogos.js` | catálogo + pools **por idioma** |

Lo que **NO** se internacionaliza: los **specs** (`specs/*`, son internos), los **comentarios de
código**, los **slugs/flags/keywords** internos, y los **bloques `gen`** de las fichas (que son
instrucciones para el generador, no texto de juego).

## 4. Diseño / arquitectura (el seam)

### 4.1 Runtime mínimo — `js/i18n.js` (NUEVO, capa aditiva)
```
I18n.DEFAULT = 'es-AR'
I18n.SUPPORTED = ['es-AR', 'en']
I18n.lang                       // idioma activo (resuelto al cargar)
I18n.t(key, params?)            // lookup con fallback; interpola {name}
I18n.set(lang)                  // cambia idioma, persiste, re-aplica UI
I18n.apply(root=document)       // recorre [data-i18n] y setea textContent/attrs
I18n.dict(pool)                 // devuelve el pool de diálogos del idioma activo
```
- **Catálogo de UI** por idioma: `js/lang/es.js`, `js/lang/en.js`. Cada uno define un objeto plano
  `LANG_ES = { 'intro.title': 'TORMENTA SOLAR', 'hud.life': 'VIDA', 'opt.font': 'Tamaño de la fuente',
  'msg.collapsed': 'Clausurado por la tormenta', ... }`. **Mismas claves en todos los idiomas.**
- **Fallback chain** en `t()`: **idioma activo → DEFAULT (`es-AR`) → la clave cruda**. Nunca devuelve
  vacío → una clave faltante se ve (y se detecta en el test de paridad), pero **no rompe la UI**.
- **Interpolación** simple: `t('shop.change', {n: 5})` con `"te quedan {n} caramelos"`.

### 4.2 UI estática sin español hardcodeado
- En `index.html`, cada texto lleva `data-i18n="clave"` (y `data-i18n-attr="placeholder:clave"` para
  atributos como placeholders/titles). El markup deja de tener el idioma "horneado" en la lógica;
  el texto inicial puede quedar como contenido de respaldo, pero **`I18n.apply()` lo pisa** al cargar.
- `apply()` corre al boot y de nuevo cada vez que se cambia el idioma → cambia **sin recargar**.
- `<html lang>` se setea dinámicamente (`document.documentElement.lang = I18n.lang`).

### 4.3 Mensajes dinámicos de `game.js`
- Reemplazar los strings literales por `t('clave', params)`. Un punto único ya existe (`setMsg`), así
  que el cambio es **mecánico**: extraer cada literal a una clave del catálogo. El **color/ms** no
  cambian. (Las pistas — `hint` — siguen siendo capa scripteada, sólo que su **texto** sale del
  catálogo/pool del idioma; ver §6.)

### 4.4 Contenido de NPCs y pools por idioma
- Los **pools generados** pasan a ser **por idioma**: `js/dialogos.es.js` y `js/dialogos.en.js`
  (o un único `Dialogos = { es:{...}, en:{...} }`). `I18n.dict(pool)` devuelve el del idioma activo;
  si no existe ese idioma, cae al default. El helper `_D/_Dp` de `level.js` pasa a leer vía `I18n`.
- **Nombres / `dialog` / `hint` / `want` fijos de NPCs**: las claves van al catálogo de UI (no son
  pools de variantes). Ej. `npc.iorio.name`, `npc.iorio.hint`.
- **IA (`ai.js`)**: las **personas** (system prompts) y las **líneas canned** se guardan por idioma;
  el system prompt **instruye al modelo a responder en el idioma activo** conservando la voz porteña
  del personaje, y se le pasa `I18n.lang`. Ver §6 e `ia-openrouter.md`.

### 4.5 El generador (`tools/gen-dialogos.mjs`) multi-idioma
- Cada bloque ` ```gen ` puede declarar `lang:` (o el script corre **una pasada por idioma de
  `SUPPORTED`**). La `seed`/`keywords` se pueden escribir **por idioma** en la ficha (sección
  `## Personalidad` con subsecciones por idioma) o dejar que el modelo transcree desde el español con
  una instrucción de "no traduzcas literal, buscá el equivalente en slang callejero del idioma destino
  conservando el chiste".
- Salida: `js/dialogos.<lang>.js`. Igual que hoy, se **commitean** (cero IA en runtime).

## 5. Resolución del idioma (orden) y persistencia

1. **Query string** `?lang=en` (para compartir/testear un idioma puntual).
2. **Elección del jugador** en ⚙ Opciones, guardada en `localStorage` (`ts_lang`) — **vos podés poner
   el que quieras** y manda sobre el auto-detect.
3. **`navigator.language`** del browser (auto): `es-*` → `es-AR`; **cualquier otro idioma que el juego
   NO soporte** (fr, de, pt sin catálogo, etc.) → **inglés**.
4. **Inglés** (`FALLBACK_LANG`): si no se puede detectar nada, English como default internacional.

> **Regla pedida:** el juego arranca en **inglés** salvo que el browser diga explícitamente español (o
> que vos elijas otro en Opciones). Así un idioma no soportado **siempre cae en inglés**, no en español.
> Ojo: `DEFAULT = es-AR` sigue siendo el **catálogo fuente** (fallback de `t()` para claves faltantes),
> distinto del idioma *resuelto* para mostrar.

UI: un selector de **Idioma / Language** en ⚙ Opciones (junto a fuente/timing). Cambiarlo llama
`I18n.set()` → re-aplica la UI **en vivo** (sin recargar) y persiste. Ver `configuracion.md`.

## 6. Reglas de consistencia (lo que mantiene todo "agnóstico")

1. **Cero string de cara al usuario hardcodeado en JS**: siempre `t()` o un pool. (Lint/e2e lo vigila.)
2. **Paridad de claves**: toda clave existe en **todos** los idiomas. El e2e falla si `en` tiene
   claves que `es` no, o viceversa.
3. **Fallback nunca-vacío**: idioma → default → clave. Una clave faltante degrada, no rompe.
4. **Las PISTAS siguen garantizadas** (igual que en `ia-openrouter.md`): el `hint`/`action` se entrega
   siempre; lo único i18n es **de qué catálogo/pool sale el texto**. La IA en vivo sigue siendo flavor.
5. **Slang transcreado, no traducido**; **un término = una transcreación** por idioma (glosario).
6. **Nombres propios/anclas culturales** se conservan salvo decisión explícita en el glosario.
7. **Un idioma = un catálogo + sus pools**. Agregar `pt-BR` mañana = agregar `js/lang/pt.js` +
   `js/dialogos.pt.js` + entrada en `SUPPORTED`, **sin tocar el core**.

## 7. Estados y flags
- `I18n.lang` (string), persistido en `localStorage` `ts_lang`.
- `document.documentElement.lang` espejado.
- Sin estado de juego nuevo: el idioma es **presentación**, no afecta mecánica (igual criterio que la
  IA: cero efecto en flags/outcomes/vida).

## 8. Implementación (propuesta, por capas — orden sugerido)
1. `js/i18n.js` + `js/lang/es.js` con **todas** las claves de la UI estática (extraídas de
   `index.html`) → `data-i18n` en el markup → `I18n.apply()` al boot. *(El juego sigue en español,
   pero ya keyado.)*
2. Extraer los literales de `game.js` (`setMsg`/prompts/fin/COLLAPSED) a claves → `t()`.
3. Mover `dialog`/`hint`/`want`/nombres de `level.js` y personas/canned de `ai.js` a claves/pools.
4. `js/lang/en.js` (transcreación curada) + glosario.
5. `gen-dialogos.mjs` multi-idioma → `js/dialogos.es.js` / `js/dialogos.en.js`.
6. Selector de idioma en ⚙ Opciones + resolución (`?lang`/localStorage/navigator).
7. Bump `?v=N`, `node tests/e2e.js`, web smoke con `?lang=en`.

> Todo aditivo: `i18n.js` se carga **antes** de `level.js`/`game.js` (como `dialogos.js` y `config.js`).
> Si `I18n` no está (e2e sin el script), `_D/t` caen a los literales/pools default → el e2e no cambia.

## 9. Requisitos funcionales (Draft)
- **RF-L1** — `I18n.t(key, params)` resuelve con fallback **idioma → default → clave**; interpola.
- **RF-L2** — la **UI estática** se internacionaliza por `data-i18n` y se aplica al boot y al cambiar.
- **RF-L3** — cambiar de idioma en ⚙ Opciones **re-renderiza la UI en vivo** y **persiste** (`ts_lang`).
- **RF-L4** — resolución del idioma: `?lang` → localStorage → `navigator.language` → default.
- **RF-L5** — los **pools de diálogo** y las **personas/canned de IA** existen **por idioma**; la IA en
  vivo responde en el idioma activo **conservando la voz porteña** del personaje.
- **RF-L6** — **paridad de claves** entre todos los idiomas (verificable por test).
- **RF-L7** — **ningún** string de cara al usuario queda hardcodeado en JS (todo vía `t()`/pool).
- **RF-L8** — sin el módulo `i18n.js` (o sin una clave), el juego **funciona** en el idioma default.

## 10. Criterios de aceptación (idealmente chequeables por e2e)
- **Paridad:** un test compara las claves de `es` vs `en` y **falla** si difieren.
- **Sin faltantes en runtime:** bootear con `?lang=en` no deja ningún `data-i18n`/`t()` sin resolver
  (no aparece una clave cruda en pantalla). Web smoke con `?lang=en` y revisión de consola.
- **Pools por idioma:** `Dialogos.en.<pool>` (o `dialogos.en.js`) existe para cada pool que usa el juego.
- **Default robusto:** sin `i18n.js`, `node tests/e2e.js` sigue verde (los literales/pools default).
- **Vivo:** cambiar el idioma en Opciones cambia el HUD/intro **sin recargar**.

## 11. Preguntas abiertas
- ¿Catálogo en **`js/lang/*.js`** (un objeto JS, sin fetch, sin CORS, encaja con el "todo estático")
  o **`.json`** cargado con `fetch` (más estándar i18n, pero suma una request y CORS en `file://`)?
  → propuesta: **`.js`** por coherencia con el resto (`dialogos.js`, `config.js`).
- ¿`Dialogos` único `{es,en}` o **archivos por idioma** (`dialogos.en.js`) cargados según el idioma?
  → propuesta: archivos por idioma para no inflar el bundle inicial (cargar sólo el activo).
- ¿Qué idiomas después de `en`? (¿`pt-BR`?) — el diseño es agnóstico, es agregar catálogos.
- ¿Se traducen los **nombres propios** o se conservan todos? (definir el glosario término por término).
- ¿La transcreación al inglés la genera primero el modelo (borrador) y se cura, o se escribe a mano?
- ¿Formato de números/moneda (`U$D`) — `Intl` o se deja literal? (hoy no hay fechas/monedas reales).
- RTL (árabe/hebreo) queda **fuera de alcance** por ahora (sólo LTR).

## 12. Relación con otros specs
- **`configuracion.md`** — el selector de idioma vive en ⚙ Opciones (misma capa `config`/localStorage).
- **`ia-openrouter.md`** — personas/canned/pools por idioma; el chat responde en el idioma activo
  **conservando el humor porteño**; las pistas siguen garantizadas por la capa scripteada (sólo cambia
  el catálogo del texto). La regla de transcreación de la voz de cada personaje vive ahí y en
  `ENTIDAD-template.md` (Personalidad → "Voz en otros idiomas").
- **`README.md` de specs** — agregar esta ficha al índice transversal.
