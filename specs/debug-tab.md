# SDD — TAB DEBUG en ⚙ Opciones (desbloquear acciones para probar sin jugar todo)

- **Estado:** ✅ **IMPLEMENTADO (v313, 2026-07-04).** Pestaña 🐛 oculta en ⚙ (botón dev / `?debug=1`) con 14
  botones que setean flags para saltar a un estado. `DEBUG_ACTIONS` en game.js (data-driven). Verificado.
- **La idea (dueño):** *"¿puede haber un tab debug en el setting, solo por ahora, para que algunas acciones se
  desbloqueen — por ejemplo la del piquete? ¿y cuál más puede ser?"*
- **Para qué:** llegar a un estado del juego SIN jugar los 20 minutos hasta ahí (playtest del dueño, y sirve al
  Autoplay QA como seams). Reusa lo que ya existe: casi todos los "logros" son **flags en localStorage**
  (`ts_juramento`, `ts_sat_down`, `ts_sube_*`…) o campos del player — setearlos = desbloquear.

## 1. Dónde y cómo
- **Pestaña "🐛 DEBUG"** en ⚙ Opciones (`index.html`), **oculta por default** — se muestra sólo si
  `localStorage.ts_debug === '1'` (lo prende un botón discreto en Opciones, o `?debug=1` en la URL). Así no le
  aparece a un jugador normal.
- Cada acción = un **botón** que setea el/los flag(s) y avisa (toast). La mayoría son flags de localStorage →
  **aplican al (re)empezar o al instante** según el flag (los de historia se leen en `historiaState()` cada frame).
- **100% aditivo**: el panel sólo escribe flags que el juego ya entiende; sin flags nuevos, sin tocar la lógica.

## 2. Acciones (el catálogo — DATA, fácil de ampliar)

### 2.1 Saltar tramos de la historia (setean flags del grafo)
| Botón | Qué setea | Te deja en |
|---|---|---|
| **Piquete ganado** | `ts_piqueteWon` = los 5 juegos | podés jurar → Obelisco sin ganar los mini-juegos |
| **Juramento hecho** | `ts_juramento` | la barricada abierta, listo para el Obelisco |
| **Satélite herido** | `ts_sat_down` | arco del piquete terminado (→ estación Lavalle) |
| **Tormenta ya cayó** | `stormed` (flag runtime) | el mundo post-tormenta (loop, armas, chino atrincherado) |
| **Búnker desbloqueado** | `bunkerUnlocked` | sos gurú (evita el permadeath temprano) |
| **Chino abierto** | `chinoFrontOpen` / `chinoEntered` | entrar al chino sin Iorio |

### 2.2 Subte / SUBE (lo nuevo)
| Botón | Qué setea |
|---|---|
| **Ver el tótem SUBE** | `ts_sube_seen` (arranca la quest de la tarjeta) |
| **Tengo la tarjeta SUBE** | agrega item `sube` + `ts_sube_got` |
| **SUBE cargada** | `ts_sube_charged` (pasás los molinetes de la estación) |

### 2.3 Recursos del jugador (para probar compras/economía)
| Botón | Efecto |
|---|---|
| **+100 monedas / +50 caramelos** | `player.coins/caramelos += …` |
| **Vida full** | `player.hp = maxHp` |
| **Dar la viola / un arma** | `addItem(...)` |

### 2.4 Utilidad
| Botón | Efecto |
|---|---|
| **Ayuda del mapa FÁCIL** | atajo al toggle `ts_ayuda_facil` (ya existe) |
| **Marcar TODO el mapa visitado** | `ts_visited` = todas las salas (ver el mapa completo) |
| **BORRAR partida / flags** | limpia el save + los `ts_*` (empezar de cero de verdad) |

## 3. Implementación (chico)
- `index.html`: la pestaña `#opt-debug` (oculta) con los botones (data-action).
- `game.js`: un `DEBUG_ACTIONS = { piquete(){…}, juramento(){…}, … }` (registro DATA) + un listener que
  despacha por `data-action`. Los que tocan `player` corren en vivo; los de historia setean el flag y refrescan.
- Gate: mostrar la pestaña sólo con `ts_debug` (botón "modo dev" en ⚙, o `?debug=1`).
- i18n mínimo (es/en) — o sin traducir (es panel de dev).

## 4. Notas
- **Sólo por ahora** (dueño): es un panel de desarrollo/QA, no una feature del juego. Cuando el juego esté cerrado
  se puede esconder del todo (o dejarlo tras `ts_debug`).
- Sinergia con **Autoplay QA**: las suites 03-historia/04-lavalle ya plantan flags por localStorage; el mismo
  catálogo `DEBUG_ACTIONS` documenta QUÉ flag desbloquea cada cosa (fuente única).
- **Seguridad:** son flags del cliente (localStorage) — un jugador podría prenderlos igual desde la consola. No es
  un problema (no hay nada server-authoritative que dependa de estos flags; el multiplayer y los bancos no).
