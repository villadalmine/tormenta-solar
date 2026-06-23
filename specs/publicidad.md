# SPEC: Publicidad / product placement en el juego (monetización por espacios)

- **Estado:** **MVP implementado (v=73–77)** — capa `js/ads.js` con formatos **afiche/poster**, **pantalla**
  (`screen`, animado), **fachada** y **góndola** (product placement en `super.js`) + `ads/slots.json` +
  `ads/manifest.json` de ejemplo + **métricas de impresión** cliente (v=77, opt-in por endpoint). Pendiente:
  imágenes pixel-procesadas, manifiesto remoto y el **endpoint server** de métricas (contrato en §5). El Draft
  de abajo sigue siendo la guía.

> **Métricas (v=77, cliente):** `js/ads.js` cuenta una impresión por slot **a lo sumo cada 5s** (no por
> frame) y, **solo si `window.ADS_METRICS` apunta a un endpoint**, hace `flush` cada 30s y al ocultar/cerrar
> la pestaña (`sendBeacon`). Sin endpoint, **cero red** (default). Contrato del endpoint a implementar
> (reusando `presence-server/`): `POST {ADS_METRICS}` body `{"views": { "<slotId>": <n>, … }, "ts": <ms>}`;
> el server agrega por slot/campaña. `Ads.stats()` devuelve los conteos en memoria (debug).
- **Nivel:** transversal (cualquier nivel; se estrena en Nivel 1)
- **Última actualización:** 2026-06-23

## 1. Contexto y objetivo

El juego es 100% estático, gratis y open source (GPLv3), publicado en GitHub Pages. La idea es
**monetizarlo vendiendo espacios publicitarios DENTRO del mundo** —no banners pop-up, sino
**product placement** que se sienta parte de Florida y Lavalle: **afiches y carteles**, **vidrieras
de locales**, **pantallas** (la TV de plasma, las marquesinas, las pantallas del arcade), el **kiosko**
de revistas, **fachadas de edificios** (como ya pasa con "EducaciónIT", que es una marca real), y
**productos en la góndola** del super chino. Una marca paga y *aparece en el juego*.

**Principio rector:** la publicidad **no puede romper ni la estética ni la jugabilidad**. Nada de
pop-ups, nada de pausar el juego, nada de tracking invasivo. Toda creatividad pasa por un "filtro
porteño/CRT" (pixel-art, paleta del juego) para que parezca **decoración del mundo**, no un banner
pegado encima. Si molesta al jugador, no sirve ni para el jugador ni para la marca.

**Objetivo de diseño:** que se puedan **vender, cargar y rotar** campañas **sin tocar el código del
core** (los `js/*.js` del juego) y **sin recompilar** — igual que `presence.js` manda latidos a un
endpoint configurable y, si no hay endpoint, el juego anda idéntico. Ver [[configuracion]] y el patrón
aditivo de `presence.js`/`fit.js`/`save.js`.

## 2. Modelo del mundo (lo que ya existe)

- **Decoración por sala:** cada sala declara `decor: [{ t:'<tipo>', x:<tile> }]` y `render()` dibuja
  `Art.decor[t]` (canvas pre-renderizado por `mk(w,h,fn)`). Tipos ya existentes que son **superficies
  publicitables naturales**: `cartel` (44×50), `tvplasma` (64×70, tiene "pantalla"), `kiosko` (88×100,
  revistas/tapas), `maniqui` (vidriera de moda), `parlante`, y las **vidrieras con marco** de los locales.
- **Fachadas de edificio:** se dibujan con `DOOR_ART[d.art] → Art.items[<x>]` (sprite de fachada) +
  el `label` de la puerta. "EducaciónIT", "Garbarino", "Cemento", "Casa de Cambio" ya son **rótulos de
  marca** sobre puertas → el formato "edificio sponsoreado" **ya existe de hecho**.
- **Pantallas del arcade:** las máquinas (`Art.machines`) tienen pantallas; un "juego patrocinado" o un
  intersticial en la máquina es un slot.
- **Góndola del super chino** (`super.js`): productos por sector (DIOSAS/CARNES/FIAMBRES…) → un producto
  de marca real es **product placement literal**.
- **Capa aditiva, precedente claro:** `presence.js` (latidos a `ENDPOINT` configurable; sin endpoint =
  no muestra nada y el juego anda igual), `fit.js`, `save.js`. **Dependencia en un solo sentido**: la capa
  depende del juego, el juego NO depende de la capa. Misma estrategia que [[soporte mobile]] del ROADMAP.
- **i18n:** `I18n.t()`/catálogos por idioma → el **texto** de una publicidad puede ser bilingüe (es/en).

## 3. Diseño / narrativa — el inventario de formatos (slots)

Cada **formato** es un tipo de espacio vendible, ordenado de menor a mayor presencia (y precio):

| Formato | Dónde | Cómo se ve | Intrusividad |
|---|---|---|---|
| **Afiche / cartel** | paredes, calle, túneles | imagen pixel sobre `cartel` o un decor `adPoster` nuevo | baja (fondo) |
| **Vidriera / marquesina** | frente de un local | logo + colores de marca en la vidriera | baja-media |
| **Pantalla** | `tvplasma`, marquesina LED, pantalla del arcade | creatividad **animada/rotativa** (loop corto) | media |
| **Kiosko (tapa)** | el kiosko de revistas | "tapa" de revista de la marca | baja |
| **Producto en góndola** | super chino | un ítem real reskineado (lata/caja con marca) | media (lo agarrás) |
| **Fachada de edificio** | una puerta de la calle | el edificio entero pasa a ser "Local de la marca" | alta (es un lugar) |
| **Marca-personaje / local jugable** *(premium)* | un NPC o un mini-local patrocinado | personaje/escena con la marca, **siempre dentro de la ficción** | alta |

**Reglas de no-intrusión (innegociables):**
- Nada que **pause, tape la acción o pida un click** durante el juego. El único lugar con CTA/links
  aceptable es **fuera del gameplay**: la intro, la pantalla de opciones o la de fin (donde ya hay links).
- Toda creatividad **respeta la paleta y el pixel-art** (se rasteriza/dithering al estilo del juego).
- **Densidad acotada por sala** (ej. máx. 1–2 slots ocupados por sala) para no convertir Florida en
  Times Square (salvo que *esa* sea la gracia de una zona "sponsoreada" puntual).
- **Coherencia con el tono:** el humor porteño manda; una marca que entra tiene que bancarse el contexto
  (cueva del dólar, linyeras, etc.). Esto se aclara en el contrato, no en el código.

## 4. Arquitectura técnica — capa aditiva `js/ads.js`

Tres piezas, ninguna en el core:

**(a) Inventario de SLOTS (`ads/slots.json`, data versionada con el juego).** Lista de espacios
disponibles, derivable/validable contra las salas reales:
```jsonc
// cada slot: id estable, sala (índice REAL de Level.build()), ancla y formato
{ "id": "calle-afiche-1", "room": 0, "x": 30, "format": "poster", "w": 64, "h": 80 }
{ "id": "arcade-pantalla", "room": 4, "x": 12, "format": "screen", "anim": true }
{ "id": "chino-gondola-diosas", "room": "super", "format": "product", "sector": "DIOSAS" }
```
El slot **reusa un decor existente** (ej. el `cartel`) o un decor nuevo y neutro `adSurface` (un marco
vacío que sin campaña se dibuja como cartel genérico del juego: *"ESPACIO PUBLICITARIO — tu marca acá"*).

**(b) MANIFIESTO de campañas (`ENDPOINT` configurable, igual que presence).** Las **creatividades** NO
viven en el repo del core: salen de un manifiesto **local (`ads/manifest.json`) o remoto** (URL en
`Config`/`presence`-style). Cada campaña:
```jsonc
{
  "slot": "calle-afiche-1",
  "img": "https://cdn.x/marca.png",         // o data-uri / sprite pixel
  "alt": { "es": "Tomá Cumbia Cola", "en": "Drink Cumbia Cola" },  // i18n + accesibilidad
  "from": "2026-07-01", "to": "2026-07-31", // ventana de pauta
  "weight": 3,                               // rotación ponderada si varias compiten por el slot
  "link": "https://marca.x"                  // SOLO se usa fuera del gameplay (intro/fin)
}
```

**(c) RENDER (`js/ads.js`, capa aditiva).** Al cargar, baja el manifiesto (cacheado), resuelve qué
campaña va en cada slot (ventana de fechas + rotación por `weight`), **lazy-loadea** las imágenes y las
dibuja sobre el slot en `render()` (hook aditivo: un único punto de extensión, p. ej. `Ads.draw(ctx,
room, cam)` llamado al final del render si `typeof Ads !== 'undefined'`). Las creatividades se
**pre-procesan al estilo** (downscale + paleta) una vez y se cachean en un canvas offscreen.

- **Sin manifiesto / sin endpoint → placeholders del juego.** Los slots se ven como decoración normal
  (cartel genérico / pantalla apagada). **El juego anda idéntico**, como presence sin endpoint.
- **Un solo seam en el core:** exponer el hook de render (1 línea, guardada por `typeof`). Igual que el
  seam de Input para mobile o el de `SaveStore` para el guardado. El core no sabe qué es una publicidad.

**Licencia:** el core es **GPLv3**. Las **creatividades y el manifiesto de campañas viven afuera**
(carpeta `ads/` gitignoreable, o repo/endpoint propio): así no se commitean marcas en el repo público ni
se mezcla material con copyright de terceros con la licencia del juego.

## 5. Medición y modelo de negocio

- **Métricas (agregadas, sin datos personales):** impresiones por slot (= veces que se entró a la sala
  con la campaña activa), **tiempo visible** y "en pantalla" (el slot dentro del viewport/cámara), y
  clicks **solo** desde los CTA fuera del juego (intro/fin). **Reusa el backend de `presence.js`** (mismo
  patrón: POST a un endpoint, in-memory/KV) → no hay que inventar infra nueva. Ver `presence-server/`.
- **Empaquetado de venta (tiers):** `poster` < `kiosko` < `screen` < `gondola` < `fachada` < `personaje`.
  Cobro por **CPM/CPV** (sobre impresiones del backend) o **fijo mensual por slot/zona**, con
  **exclusividad por zona** opcional (ej. "la cueva entera es de la marca X este mes").
- **Self-serve:** como el manifiesto es data, una marca nueva = editar/Subir el JSON (o un mini panel que
  lo escriba) **sin release del juego**. Cache-busting solo si cambia `ads.js`, no las campañas.

## 6. Requisitos funcionales

- **RF-1:** Existe un **inventario de slots** declarado en data (`ads/slots.json`), cada uno anclado a una
  **sala real** y un **formato**; validable (la sala/decor existe).
- **RF-2:** Existe una capa **`js/ads.js` aditiva** que, dado un **manifiesto** (local o remoto), resuelve
  campaña→slot (fechas + rotación por `weight`) y la dibuja **al estilo** sobre el slot en `render()`.
- **RF-3:** **Sin manifiesto/endpoint, el juego es idéntico** (placeholders/decor normal). `ads.js` **no**
  está en el `SCRIPTS` del e2e (igual que presence/fit/save) y el core no depende de él.
- **RF-4:** El texto de las campañas es **i18n** (`alt.{es,en}`) y sirve también de **accesibilidad**.
- **RF-5:** Ningún formato **pausa, tapa la acción ni exige click** en gameplay; los **CTA/links** solo
  aparecen **fuera del juego** (intro/opciones/fin).
- **RF-6:** Las **métricas** (impresión/tiempo visible) se reportan al **endpoint estilo presence**, **sin
  datos personales**, y son opt-out por `Config`.
- **RF-7:** Las creatividades/manifiesto viven **fuera del repo GPL** (no se commitea material de marcas).

## 7. Estados y flags

No agrega flags de **gameplay** (no toca la historia ni el loop). Solo **configuración**: URL del
manifiesto + flag de opt-out de métricas en [[configuracion]] (`Config`, localStorage), y el endpoint de
medición (reusa el de `presence`). El grafo de historia ([[historia-grafo]]) **no se entera**.

## 8. Criterios de aceptación

- **e2e:** con `ads.js` ausente o sin manifiesto, el boot + auditoría de assets de los 38 cuartos es
  **idéntico** (la publicidad no rompe el render headless). `ads.js` fuera de `SCRIPTS`.
- **Validación de slots:** un chequeo (estilo auditoría de assets) confirma que **cada slot apunta a una
  sala/decor existente** y que ningún formato desconocido se cuela.
- **web-smoke:** con un manifiesto de prueba, las creatividades de prueba **se dibujan** sobre los slots y
  **no hay errores de consola**; sin manifiesto, la pantalla es la de siempre.
- **No-intrusión:** ninguna campaña introduce overlays/pausas durante `state==='playing'`.

## 9. Privacidad, contenido y legal

- **Privacidad:** solo conteos **agregados** (impresiones/tiempo), nunca PII; banner de aviso mínimo si
  algún día se agregan cookies/IDs (hoy no hace falta). Opt-out en Opciones.
- **Contenido:** **moderación previa** de cada campaña (que no choque con el tono ni sea ilegal/ofensiva);
  consentimiento escrito de la marca para aparecer en *este* contexto (cueva del dólar, etc.).
- **Marcas reales que ya aparecen** (EducaciónIT, Garbarino, Iorio/Almafuerte, Mega Drive, FIFA…): hoy son
  **homenaje/sátira**; convertirlas en pauta paga requiere **acuerdo explícito** con cada una. El spec
  separa "easter egg homenaje" de "slot publicitario vendido".
- **Licencia:** ver §4 — el material de marcas no entra al repo GPL.

## 10. Preguntas abiertas (resolver antes de implementar)

1. **¿Manifiesto local o remoto primero?** Local (`ads/manifest.json`, simple, sin backend) vs remoto
   (rotar/vender sin tocar archivos). Recomendado: **arrancar local**, dejar el seam remoto listo.
2. **¿Formatos del MVP?** Propuesta mínima: **afiche + pantalla + fachada** (los tres reusan seams que ya
   existen). Góndola/personaje quedan para una fase 2.
3. **¿Estilo de creatividad?** ¿Se exige pixel-art entregado por la marca, o el pipeline auto-procesa
   (downscale + paleta + dithering) cualquier PNG? Esto define el laburo de `ads.js`.
4. **¿Medición propia o nada al principio?** ¿Reusar `presence-server` para impresiones desde el día 1, o
   lanzar sin métricas y agregarlas cuando haya demanda?
5. **¿Densidad y zonas exclusivas?** ¿Cuántos slots por sala como máximo y qué zonas se ofrecen como
   "exclusivas" (toda la cueva, todo el arcade)?
6. **¿Política con marcas reales ya presentes?** ¿Se las contacta para formalizar, se las deja como
   homenaje no-pago, o se las reemplaza por marcas ficticias vendibles?

---

> Relacionados: [[configuracion]] (URL del manifiesto + opt-out), `presence.js`/`presence-server`
> (mismo patrón aditivo + backend de conteo), [[idiomas]] (texto de campañas i18n), [[historia-grafo]]
> (la publicidad NO toca el gameplay), y la sección **Soporte mobile** del ROADMAP (mismo principio:
> capa aparte, dependencia en un solo sentido, el core no se entera).
