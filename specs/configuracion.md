# SPEC: Configuración del juego (opciones / accesibilidad)

- **Estado:** Draft
- **Alcance:** transversal (todos los niveles)
- **Última actualización:** 2026-06-21

## 1. Objetivo
Centralizar los parámetros **tweakables** de UX/legibilidad en un solo lugar (`Config`), para poder
ajustar cosas como el **tamaño de la fuente** o **cuánto tarda en aparecer/desaparecer el texto** sin
tocar código disperso. **Capa aditiva** (mismo criterio que `fit.js`/`presence.js`): no ensucia el
core ni rompe el juego si está ausente.

## 2. Parámetros (v1)
| Clave | Qué controla | Default | Rango |
|---|---|---|---|
| `fontScale` | escala de la fuente del HUD / mensajes / overlays | `1.0` | 0.7–1.3 |
| `msgMs` | **multiplica** cuánto **dura** un mensaje en pantalla (sobre el `ms` de `setMsg`) | `1.0` | 0.5–2.0 |
| `msgFade` | cuánto tarda en **aparecer/desaparecer** (fundido in/out, ms) | `150` | 0–600 |
| `uiScale` | escala general del HUD (separable de la fuente) | `1.0` | 0.8–1.2 |
| `musicVol` / `sfxVol` | volumen | `1.0` | 0–1 |

> Extensible: se agregan claves sin tocar el resto.

## 3. Cómo se conecta al juego (el seam)
- **Fuente / escala:** `Config` setea una **CSS custom property** en `:root` (ej. `--ui-font-scale`);
  el CSS del HUD/overlays usa `calc()` sobre esa variable. Cambiar el valor **reescala todo** sin
  tocar el render. (Esto es ortogonal al `fit.js`, que escala el `#stage` entero.)
- **Duración del texto:** `setMsg(text, color, ms)` ya recibe `ms`. `Config.msgMs` lo **multiplica en
  un único punto** (wrapper de `setMsg`). El `msgFade` controla la transición CSS de opacidad del
  `#msg` para que **aparezca/desaparezca suave** en vez de corte seco.
- **Volumen:** `audio.js` lee `Config.musicVol/sfxVol`.

## 4. Persistencia
- Se guarda en **localStorage** (`ts_config`) y se carga al iniciar. Sin datos guardados → defaults.
- Es **per-dispositivo**, no requiere backend.

## 5. UI (panel de Opciones)
- Overlay de **Opciones** accesible desde la **intro** (botón "Opciones") y/o con una tecla (ej. `O`),
  con sliders/botones y **preview en vivo**.
- **Mínimo viable:** aunque no haya UI, los valores se tocan por `Config` + localStorage y se aplican.

## 6. Implementación (propuesta, capa aditiva)
- `js/config.js` (NUEVO): objeto `Config` con defaults + `load()/save()` (localStorage) + `apply()`
  que setea las CSS vars y deja `Config.msgMs` disponible.
- `css/style.css`: usar `var(--ui-font-scale, 1)` en los `font-size` del HUD/overlays; transición de
  opacidad en `#msg` con `var(--ui-msg-fade, 150ms)`.
- `game.js`: en `setMsg`, multiplicar `ms` por `Config.msgMs` (un solo punto).
- **No** desparramar lecturas de config por el core: **un módulo, un seam**. Y que el e2e siga válido
  (si `Config` no está, defaults).

## 7. Requisitos funcionales (Draft)
- **RF-C1** — `fontScale` reduce/agranda la fuente de HUD/mensajes/overlays.
- **RF-C2** — `msgMs` ajusta cuánto **dura** un mensaje en pantalla.
- **RF-C3** — `msgFade` hace que el texto **aparezca/desaparezca con fundido** (no corte seco).
- **RF-C4** — la config **persiste** en localStorage y se aplica al cargar.
- **RF-C5** *(opcional)* — panel de **Opciones** en la intro / tecla `O` con preview en vivo.

## 8. Preguntas abiertas
- ¿UI completa con sliders, o por ahora solo localStorage + defaults razonables?
- ¿`fontScale` separado de `uiScale`, o un solo control?
- ¿**Presets** de accesibilidad (ej. "texto grande + lento")?
