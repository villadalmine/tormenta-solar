# SPEC: Tiendas generadas por IA (entrás a la tienda del NPC según su TIPO)

- **Estado:** **IMPLEMENTADA (v191 P1 + v192 P2)** — entrás al interior generado + compra + surtido por rubro, y la
  **IA autora el surtido** (name/intro/clientela/productos) vía `/nivel-ai theme:'shop'` con **caché por rubro** +
  fallback estático (`SHOP_RUBROS`, `js/tienda.js`, `NivelAI.generateShop`/`requestShop`). Aplica a los 4 locales de
  la galería (sex-shop, comida rara, masajes, tenebroso). Pendiente fino: que la IA autore también la economía (hoy
  anclada) y persistir la caché en localStorage/banco del proxy.
- **Nivel:** transversal (Nivel 1 primero; cualquier NPC-tienda)
- **Última actualización:** 2026-06-26
- **Relacionado:** `fabrica-niveles-ai.md` (la máquina de niveles — se REUSA el generador), `modelo-de-entidades.md`
  (el NPC gana un componente `tienda`), `publicidad.md` (góndolas/product placement dentro del local),
  `carteles-ia.md` (ruteo de modelos: esto es contenido pre-generable → NPU/cacheable), `resiliencia.md`
  (fallback estático si la IA está caída).

## 1. Contexto y objetivo

Hoy las "tiendas" del juego son **un NPC parado** con un menú/línea: le hablás y comprás **un** ítem (`sells`) o
elegís de una lista (`arsenal`). Es plano. La idea del dueño:

> "Todas las personas que tienen tiendas (NO los cueveros): cuando le ponés **hablar**, te **metés adentro de su
> tienda**. La tienda la genera el **generador de niveles**, pero acá no es un *nivel* sino el **tipo de tienda** que
> tiene como atributo el NPC al que accedés. Ese NPC tiene en su atributo **qué tipo de tienda es**, y la IA con eso
> **genera una tienda con personas y cosas relacionadas**, nomás para ver qué podés comprar ahí."

Esto encaja con el norte (§REGLA #0): **todo es dato + grafo + IA**. La tienda deja de ser un menú hardcodeado y pasa
a ser un **interior generado** (data-driven, autorado por IA, validado), poblado con NPCs y mercadería **coherentes
con el rubro**. Reusa la maquinaria de la máquina de niveles, pero el "molde" es el **rubro de la tienda**, no un
tema de plataformas, y el objetivo es **browsear/comprar**, no llegar a una meta.

> **ALCANCE (dueño, 2026-06-26):** el target son los **locales de la GALERÍA de la cueva** — **sex-shop "El Subte"**,
> **comida rara**, **masajes felices**, **el tenebroso** (salas 6 y 7). NO entran acá: el **chino/súper** (lógica
> propia), **Garbarino** y **el guarda** (menús propios), ni **EducaciónIT** (marca real / chat IA). Los **cueveros**
> tampoco (es otra cosa). O sea: las "tiendas raras" del subsuelo son las que pasan a ser **interiores generados**.

## 2. Modelo del mundo (lo que ya existe)

- **NPCs-tienda actuales** (`js/level.js`, todos NO-cueveros):
  - Galería subsuelo (sala 6): **Sex-shop "El Subte"** (`erotica`), **Comida rara** (`comida`), **??? armas**
    (`misterioso`/`arsenal`).
  - Sótano (sala 7): **Masajes Felices** (`masajes`), **??? tenebroso** (`sells:{kind:'mystery'}`).
  - **Garbarino** (sala 11): Smart TV / celular (`recepcionista`).
  - **El Guarda** (sala arcade): vende funciones viejas por caramelos (`action:'guarda'`, menú propio).
  - **EducaciónIT** (salas 1-3 del edificio): `secretaria` (hoy es `action:'chat'`, persona IA — caso aparte, ver §7).
  - **El chino / súper** (`super.js`): el ÚNICO interior de tienda real hoy (sub-modo top-down con góndolas + caja).
- **Excluidos:** los **cueveros** (cambio de dólares) — siguen con su flujo actual (`handleCuevero`, invitación a la
  cueva). Lo pidió el dueño explícito.
- **Maquinaria reusable:**
  - `NivelAI.generate(themeId)` → **escena top-down contenida** (`{name,intro,palette,W,H,props,npcs,goal,reward}`),
    hoy usada por el sub-modo **Spinoff** (`js/spinoff.js`). **Este es el molde más cercano a una tienda** (vista de
    arriba, paredes, props, NPCs) — se adapta a "tienda" sacándole la meta y sumándole **ítems comprables**.
  - `super.js` (`Super.create`) = precedente de **interior de tienda jugable**: caja, góndolas, comprar = pagar →
    efecto (curar/ammo). El interior de tienda generado puede **calcar su loop de compra**.
  - Proxy `POST /nivel-ai` (`ai-proxy/server.js`): ya autora texto+geometría con `BRIEF` por tema y **fallback
    estático**. Se le agrega un modo `shop`.

## 3. Diseño / narrativa

- Le hablás al dueño de la tienda → **una cortina/puerta se abre** y **entrás al local** (sub-modo contenido, vista
  de arriba como el Spinoff/súper). No es teletransporte: un **beat** (flash + línea del dueño "pasá, pasá").
- Adentro: el local está **temáticamente poblado** según el **rubro** (`tienda.tipo`): NPCs (clientes/empleados) y
  **mercadería en góndolas/mostrador**, todo autorado por la IA a partir del rubro. Ej.:
  - `verduleria` → cajones de fruta/verdura, un verdulero gritando ofertas, una señora eligiendo tomates.
  - `electronica` → estantes con tele/celular/consola truchos, un vendedor chamuyero, un técnico atrás.
  - `farmacia` → mostrador con remedios, una farmacéutica, alguien tosiendo en la cola.
  - `disqueria`, `ferreteria`, `kiosco`, `sex-shop`, `masajes`, etc. (cada NPC declara su rubro).
- **Objetivo: VER QUÉ PODÉS COMPRAR.** Te acercás a un ítem → prompt con precio → comprás (paga monedas/caramelos
  según el rubro) → efecto (cura/ammo/loop/ítem). Salís por la puerta cuando quieras. **Cero combate** (es una
  tienda, no un nivel); los NPCs son ambientales (chusmean, ofertan) vía `Mensajero`.
- **La gracia mostrable:** cada vez que entrás, la IA puede **variar** el surtido y la clientela del rubro → el local
  "vive". Pero el **rubro** lo fija el NPC (no inventa cualquier cosa): coherencia garantizada.

## 4. Requisitos funcionales

- **RF-1 — Componente `tienda` en el NPC (DATA):** un NPC-tienda declara `tienda: { tipo, pay?, base? }`:
  - `tipo` (string, ej. `'verduleria'`): el rubro; **lo usa la IA** para poblar.
  - `pay` (`'coins'|'caramelos'`, opcional): moneda del rubro (default `coins`).
  - `base` (opcional): ítems "ancla" garantizados (lo que ya vendía: `sells`/`arsenal` migran acá) para que SIEMPRE
    haya algo comprable aunque la IA falle. Schema en `levels/level.schema.json` (`interact.tienda`).
- **RF-2 — "Hablar" entra a la tienda:** para un NPC con `tienda`, la acción de interactuar (E) **abre el interior**
  (no el chat/menú plano). Registro de acciones: `NPC_ACTIONS.tienda` → `enterTienda(n)`.
- **RF-3 — El generador produce el INTERIOR (reuso):** `NivelAI.generateShop(tipo, base)` (nuevo, hermano de
  `generate()`): devuelve una **escena de tienda** `{ name, intro, palette, W, H, props, npcs[], wares[] }` donde
  `wares[]` = ítems comprables `{ x, y, label, give:{item,amount}, cost, pay, emoji }`. Reusa el layout top-down del
  Spinoff. **Sin meta, sin enemigos.**
- **RF-4 — IA autora el surtido + la clientela (best-effort):** `POST /nivel-ai { theme:'shop', tipo, lang }` →
  `{ name, intro, npcLines[], wares[] }` (nombres de productos del rubro + precios sugeridos + frases de clientes).
  El cliente **sanea** (precios a rango, ≤N wares, recorta strings) — mismo patrón que `sanitizePlatforms`. **Fallback
  estático**: si la IA está caída (circuit breaker `window.__aiHealth`) o el rubro no matchea, usa `base` + un molde
  por rubro horneado en `THEMES_SHOP` (DATA). Nunca se cuelga (RF de `resiliencia.md`).
- **RF-5 — Loop de compra:** dentro de la tienda, acercarte a un `ware` muestra precio; comprar descuenta `pay` y
  aplica `give` (calca `super.js`). Stock opcional por ware. Salís por la puerta → volvés EXACTO a donde estabas
  (snapshot, como `endSpinoffLevel`). **Cero efecto** sobre el run si no comprás.
- **RF-6 — Aditivo y resiliente:** si `NivelAI`/`Mundo` no están, o la IA falla, el NPC cae a su **menú plano actual**
  (`sells`/`arsenal`) — el juego anda igual. La feature es una **capa** sobre lo que ya existe.
- **RF-7 — Caché por rubro:** el surtido generado se puede **cachear** (localStorage / banco en el proxy, como la
  propaganda) para no pegarle a la IA cada vez y abrir la tienda al instante; se refresca en background.

## 5. Estados y flags

- Sub-modo nuevo: `state = 'tienda'` (o reusar `spinoffLevel`/Spinoff con un flag `shopMode`). Snapshot/restore como
  el nivel-AI (`spinoffSave`). No drena tormenta, no autosave mientras estás adentro, salir restaura.
- Sin flags de historia nuevos (comprar puede setear los mismos que hoy: ej. `armado` si el rubro es armas — el
  `base`/ware lleva su `applyEdge` opcional).
- `tienda.tipo` y `wares` son **datos**, no estado global.

## 6. Criterios de aceptación

- **CA-1:** un NPC con `tienda:{tipo:'verduleria'}` → al interactuar entra a un interior con ≥1 NPC ambiental y ≥1
  ware comprable coherente con el rubro (e2e: `enterTienda` → escena con `wares.length>0`).
- **CA-2:** comprar un ware descuenta la moneda correcta y aplica el efecto; salir restaura el run exacto (e2e, calca
  el test del nivel-AI).
- **CA-3:** con la IA caída (fetch mockeado a timeout) la tienda **igual abre** con el surtido `base`/estático
  (test estilo `breaker.js`/`geometria.js`).
- **CA-4:** sin `NivelAI` o sin `tienda` en el NPC, el comportamiento viejo (`sells`/`arsenal`) **no cambia**
  (paridad / e2e existentes verdes).
- **CA-5:** los **cueveros NO** entran a este flujo (siguen con `handleCuevero`).

## 7. Preguntas abiertas

- **EducaciónIT (`secretaria`):** ✅ **RESUELTO (dueño):** queda como **chat** (marca real). NO es tienda generada.
  Igual **Garbarino**, **el guarda** y el **chino/súper** quedan con su comportamiento propio. El sistema aplica
  **solo a los locales raros de la galería** (sex-shop, comida rara, masajes, tenebroso). Ver ALCANCE en §1.
- **¿Vista top-down (como Spinoff/súper) o lateral (como el nivel-AI)?** Propuesta: **top-down** (es browsear, no
  plataformear; menos riesgo de jugabilidad, no necesita `Playable`).
- **¿El chino/súper se migra a este sistema?** Es el precedente; podría volverse `tienda:{tipo:'super-chino'}` y unificar.
  Por ahora **queda aparte** (tiene lógica propia: raid, ninjas, trastienda→nivel-AI).
- **Economía:** ¿precios autorados por IA o anclados por `base`? Propuesta: **IA sugiere, cliente clampa** a un rango
  por rubro (evita "tele a 1 moneda").
- **Persistencia del surtido:** ¿se regenera cada visita (vivo) o se fija por día/loop? Propuesta: **regenera con caché**
  (vivo pero rápido). 
- **Rubros iniciales:** definir el set de `tipo` y su molde estático (`THEMES_SHOP`): verduleria, electronica,
  farmacia, disqueria, ferreteria, kiosco, sex-shop, masajes, ropa-trucha… (migrar los NPCs actuales a un `tipo`).

## 8. Bocetos de datos (no normativo)

```js
// NPC con el componente tienda (DATA, en level.js / levels/*.json)
{ name:'Verdulería La Económica', sprite:'verdulero', x:14, action:'tienda',
  tienda:{ tipo:'verduleria', pay:'coins',
           base:[ { label:'cajón de fruta', give:{item:'health',amount:10}, cost:6 } ] } }

// lo que devuelve NivelAI.generateShop('verduleria', base) (escena top-down)
{ name:'Verdulería La Económica', intro:'Huele a fruta madura y a yuyo.',
  palette:{...}, W:18, H:11,
  npcs:[ {emoji:'🧓', lines:['¡lleve el kilo!','tomate de oferta']}, {emoji:'🧑‍🌾', lines:['fresco, casero']} ],
  wares:[ { x:5,y:6, emoji:'🍅', label:'tomates', give:{item:'health',amount:8}, cost:5, pay:'coins' },
          { x:9,y:6, emoji:'🍌', label:'bananas', give:{item:'health',amount:12}, cost:7, pay:'coins' } ] }
```
