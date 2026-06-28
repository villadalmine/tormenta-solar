# Versión del juego visible

**Estado:** Implementado (v222). **Origen:** pedido del dueño (2026-06-28) — mostrar la **versión del juego en alguna
parte** para saber qué versión estás jugando (útil al reportar bugs: "lo veo en la v220 pero no en la v221").

## 1. Problema
El juego se versiona con el cache-bust `?v=N` (en TODOS los `<script>`/`<link>` de `index.html`, se bumpea en cada
release). Pero **no se ve en ningún lado**: el dueño/jugador no sabe si el navegador ya agarró la versión nueva (el HTML
es no-cache, pero los `.js` se cachean por `?v=`). Saber la versión activa ayuda a confirmar deploys y a reportar bugs.

## 2. Diseño (single source of truth: el propio `?v=N`)
**No** se agrega una constante de versión aparte (se desincronizaría con el `?v=N`). Se **lee la versión en runtime del
`?v=` de un `<script>`** ya cargado — así la versión mostrada es EXACTAMENTE la del bundle que corrió, sin nada que
mantener. `gameVersion()` busca un `<script src="...?v=N">` y parsea `N`.

```js
function gameVersion() {
  const s = document.querySelector('script[src*="?v="]');
  const m = s && s.src.match(/[?&]v=([0-9]+)/);
  return m ? ('v' + m[1]) : '';
}
```

## 3. Dónde se muestra
- **Pantalla de intro** (`#gameVersion`): una líneta discreta abajo (la ves cada vez que cargás → confirmás el deploy).
- **Panel de Opciones** (`⚙`): la versión, para chequear mid-game sin recargar.
- **"Tu partida"** (`[P]`): junto a las métricas (ya muestra el motor v1/v2; sumar la versión es natural).
Todo en el **cliente** (game.js setea el texto al iniciar). Sin i18n compleja: el número es universal (label "Versión/Version").

## 4. Implementación
- `index.html`: `<span id="gameVersion">` en la intro (cerca de la línea de GitHub) + en el panel de Opciones.
- `game.js`: `gameVersion()` + al bootear, setear `#gameVersion`/`#optVersion` y sumarlo al render de "Tu partida".
- Se **bumpea solo** con el release (es el `?v=N`).

## 5. Tests
- `web-smoke.mjs`: la intro muestra `v<N>` (no vacío).
