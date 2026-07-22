# SPEC: Configuración del juego (opciones / accesibilidad)

- **Estado:** ✅ **v2 COMPLETO (v379, 2026-07-22)** — fuente + timing del texto + `uiScale` + volumen +
  presets, todo implementado.
- **Alcance:** transversal (todos los niveles)
- **Última actualización:** 2026-07-22
- **Ya en código:** `js/config.js` (capa aditiva) + panel **⚙ Opciones** (botón en el stage o tecla **O**)
  con **tamaño de fuente** (`--ui-font-scale`), **tamaño de los paneles** (`uiScale` → `--ui-scale`,
  `transform:scale()` en `.panel`), **volumen** (`Config.get('volume')` → `Sfx.setVolume()`), **duración
  del texto** (`Config.msgMs`), **aparición/desaparición** con fundido (`--ui-msg-fade`), y **3 presets**
  (Chico/Normal/Grande) que combinan `fontScale`+`uiScale`+`msgMs` en un click. Persiste en `localStorage`.
  **Decisiones tomadas frente al draft original (§2/§8):** `uiScale` quedó `0.8–1.3` (no 0.8–1.2, para
  alinear con el rango de `fontScale`); **un solo `volume`** (no `musicVol`/`sfxVol` separados) — el motor
  de audio no tiene buses separados de música/SFX (son decenas de `createGain()` independientes que
  conectaban cada uno directo a `destination`), así que separar hubiera sido un refactor grande y riesgoso
  para una mejora marginal; se optó por UN master gain (`Sfx` ahora tiene un único `master` que TODO
  atraviesa antes de `destination`) que sí es seguro y cubre el caso de uso real ("bajar/subir todo").

## 1. Objetivo
Centralizar los parámetros **tweakables** de UX/legibilidad en un solo lugar (`Config`), para poder
ajustar cosas como el **tamaño de la fuente** o **cuánto tarda en aparecer/desaparecer el texto** sin
tocar código disperso. **Capa aditiva** (mismo criterio que `fit.js`/`presence.js`): no ensucia el
core ni rompe el juego si está ausente.

## 2. Parámetros (v2, HECHO)
| Clave | Qué controla | Default | Rango |
|---|---|---|---|
| `fontScale` | escala de la fuente del HUD / mensajes / overlays | `1.0` | 0.7–1.3 |
| `msgMs` | **multiplica** cuánto **dura** un mensaje en pantalla (sobre el `ms` de `setMsg`) | `1.0` | 0.5–2.0 |
| `msgFade` | cuánto tarda en **aparecer/desaparecer** (fundido in/out, ms) | `150` | 0–600 |
| `uiScale` | escala de los **PANELES** (Opciones, diálogos) vía `transform:scale()` — separado de `fontScale` | `1.0` | 0.8–1.3 |
| `volume` | volumen general (un solo master gain en `Sfx`, cubre música + SFX + ambiente) | `1.0` | 0–1 |

**Presets** (`Config.preset(name)`, botones Chico/Normal/Grande en el panel): combinan varios valores en
un click — `grande = {fontScale:1.3, uiScale:1.3, msgMs:1.5}`, `chico = {fontScale:0.8, uiScale:0.85,
msgMs:0.75}`, `default` = los defaults de arriba.

> Extensible: se agregan claves sin tocar el resto.

## 3. Cómo se conecta al juego (el seam)
- **Fuente / escala:** `Config` setea una **CSS custom property** en `:root` (ej. `--ui-font-scale`);
  el CSS del HUD/overlays usa `calc()` sobre esa variable. Cambiar el valor **reescala todo** sin
  tocar el render. (Esto es ortogonal al `fit.js`, que escala el `#stage` entero.)
- **Duración del texto:** `setMsg(text, color, ms)` ya recibe `ms`. `Config.msgMs` lo **multiplica en
  un único punto** (wrapper de `setMsg`). El `msgFade` controla la transición CSS de opacidad del
  `#msg` para que **aparezca/desaparezca suave** en vez de corte seco.
- **Panel:** `Config` setea `--ui-scale` en `:root`; `.panel` (`css/style.css`) usa
  `transform: scale(var(--ui-scale, 1))` — escala el panel de Opciones/diálogos ENTERO (texto+botones+
  padding juntos) en vez de threadear una segunda CSS var por cada regla, más robusto y menos superficie
  para meter la pata en una regla olvidada.
- **Volumen:** `js/audio.js` (`Sfx`) tiene un `master` (`GainNode`) único: `ensure()` lo crea una vez y
  TODAS las fuentes de sonido (SFX, música chiptune, hum de tormenta, ambiente) conectan ahí en vez de
  directo a `destination`. `Sfx.setVolume(v)`/`Sfx.getVolume()`; `Config.apply()` llama
  `Sfx.setVolume(cfg.volume)` (guardado en `masterVol` aunque el `AudioContext` no exista todavía, por si
  el volumen se toca antes del primer sonido).

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

## 7. Requisitos funcionales
- ✅ **RF-C1** — `fontScale` reduce/agranda la fuente de HUD/mensajes/overlays.
- ✅ **RF-C2** — `msgMs` ajusta cuánto **dura** un mensaje en pantalla.
- ✅ **RF-C3** — `msgFade` hace que el texto **aparezca/desaparezca con fundido** (no corte seco).
- ✅ **RF-C4** — la config **persiste** en localStorage y se aplica al cargar.
- ✅ **RF-C5** — panel de **Opciones** en la intro / tecla `O`, con botones +/− (sin preview en vivo tipo
  slider arrastrable — mismo patrón que ya tenía `fontScale`/`msgMs`, consistente).
- ✅ **RF-C6** (v2) — `uiScale` escala los paneles, separado de `fontScale`.
- ✅ **RF-C7** (v2) — `volume` controla el audio general (un master gain).
- ✅ **RF-C8** (v2) — presets Chico/Normal/Grande.

## 8. Preguntas resueltas
- ¿`fontScale` separado de `uiScale`? → **Sí, separados** — `fontScale` solo texto (rules `calc()`
  puntuales), `uiScale` el panel entero (`transform:scale`).
- ¿Presets? → **Sí, 3** (Chico/Normal/Grande), ver §2.
- ¿`musicVol`/`sfxVol` separados? → **No** — un solo `volume` (ver nota de decisión en el header, motor
  de audio sin buses separados; separarlos hubiera sido un refactor grande para un caso de uso marginal).

## 9. Test + gotcha del harness
`tests/e2e.js` sección "CONFIG": defaults, `set()`, clamp fuera de rango, `preset()`, `reset()`, y que
`Sfx.getVolume()` quede sincronizado tras `Config.set('volume', …)`. **Gotcha real que apareció al sumar
`config.js` al sandbox headless**: el mock de `style` en `tests/e2e.js` era un objeto plano `{}` sin
`setProperty`/`getPropertyValue` (nunca hacía falta porque `config.js` no estaba cargado ahí) — `Config.apply()`
tiraba `TypeError: r.setProperty is not a function`. Se arregló el mock (`withListeners`) para que `style`
tenga un `setProperty`/`getPropertyValue`/`removeProperty` mínimos. **Verificación visual real** (Playwright
ad-hoc, no quedó en el repo): capturas del panel en Chico/Normal/Grande — encontró y corrigió un overflow
real de los botones de preset (`.opt-btn` tiene `width:26px` fijo, muy angosto para "Chico"/"Grande"; se
agregó `.opt-preset { width:auto; padding:0 8px; font-size:11px }`).
