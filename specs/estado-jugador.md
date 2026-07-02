# SDD — ESTADO DEL JUGADOR: el bug del NaN (vida/monedas/caramelos/items/loop/munición) + respawn peronista

- **Estado:** **Diseño con DIAGNÓSTICO hecho (marcado por el dueño, 2026-07-02).** Sin implementar.
- **Reporte del dueño:** *"vida/monedas/caramelos/items/loop/mun se queda a veces en NaN, no sé por qué, y es algo
  que los hace fallar a través de todo el juego. Y si me quedo sin vida SIN haber descubierto el búnker → me
  despierto en el piquete con la muchachada peronista: 'flaco, ¿qué te pasó? te teletransportaste como un rayo
  solar' — eso sí que es bien peronista."*

## 1. EL BUG DEL NaN — diagnóstico (2026-07-02, con líneas concretas)

### 1.1 El mecanismo (por qué "atraviesa todo el juego")
1. **La comparación con NaN/undefined es SIEMPRE false** → los checks de plata NO frenan la compra:
   `if (have < sh.cost) return;` (game.js:1740) — si `sh.cost` es `undefined`, `have < undefined` = false → la
   compra SIGUE → `player.coins -= undefined` → **NaN** (game.js:1741).
2. **El NaN se PROPAGA y nunca se cura:** `player.coins = Math.floor(player.coins * k)` (doLoop) mantiene NaN;
   `player.ammo += sh.amount` (1744) contagia munición; el HUD muestra "NaN".
3. **El autosave lo PERSISTE:** `JSON.stringify(NaN)` → `null` → al restaurar, `Object.assign(player, snap.player)`
   mete `null` sin sanear (restore, game.js) → `null - 5 = -5` (raro pero no NaN) o vuelve a NaN según el camino.
   → Por eso "se queda": una vez que entró, ni reiniciar lo limpia del todo.

### 1.2 Las FUENTES más probables del valor malo (dónde nace)
- **Tiendas GENERADAS por IA** (v197, `tiendas-generadas.md`): la IA sugiere `cost`/`amount` y el cliente clampa AL
  GENERAR — pero el **`ts_shopCache_v1` persistido en localStorage** puede tener ítems viejos/malformados (de
  versiones previas al clamp, o un JSON de la IA con campo faltante) → `sh.cost === undefined` en la compra.
- Mismo patrón en: **cine/guarda** (`p.cost`/`guardaAskOf`), **datacenter** (`p.cost`, game.js:2541), **arcade**
  (`robbed`, 3292), y cualquier `+=`/`-=`` con un valor que viene de banco/IA/cache sin `Number.isFinite`.
- Los `Object.assign` del **restore** no sanean números (solo inventario/weapon).

### 1.3 El FIX (diseño, 3 capas)
1. **`sanePlayer()` — el saneador central:** para cada campo numérico del jugador (`hp, coins, caramelos, ammo,
   falopa, diosa, carne, fiambre, birras, forros, flores, spitDmg…`): si `!Number.isFinite(v)` → reparar al default
   sano (hp→50, resto→0) **+ `tel('nan', { result: campo })`** (evento nuevo en la whitelist) → el dashboard
   `tormenta-jugadores` muestra QUÉ campo y CUÁNDO se rompe (encontrás la fuente real mirando métricas, como pediste).
   Se llama en: **restore()** (post-Object.assign), **1×/segundo** en el loop (autocura silenciosa), y **pre-save**
   (nunca persistir NaN).
2. **Guard en los INPUTS (fail-closed):** helper `num(v, def)` = `Number.isFinite(+v) ? +v : def`. En TODA compra:
   `const cost = num(sh.cost, Infinity)` → un ítem malformado queda **incomprable** (en vez de romper la economía);
   `amount = num(sh.amount, 0)` → no regala NaN. Aplica a: tiendas generadas, guarda del cine, datacenter, arcade.
3. **Higiene del cache:** al cargar `ts_shopCache_v1`, DESCARTAR ítems sin `cost/amount` finitos (se regeneran solos).

## 2. RESPAWN PERONISTA — "en el piquete no se muere nadie" ✊

### 2.1 Hoy
`die()` (game.js:3228): borra el save (`SaveStore.clear`) y muestra el **end screen** ("moriste de verdad"). Duro
para el jugador temprano que todavía NO tiene el búnker/loop (su red de seguridad).

### 2.2 El diseño (la idea del dueño, textual)
- **Si morís SIN `bunkerUnlocked`** (y no estás en un spinoff, que ya tiene su propia red): **NO hay game over.**
  Pantalla se funde a negro un segundo → **despertás en EL PIQUETE de Lavalle**, rodeado de la muchachada:
  > ✊ *La muchachada peronista te levanta del asfalto: **"¡Flaco! ¿Qué te pasó? Te TELETRANSPORTASTE acá como un
  > RAYO SOLAR…"** Te convidan un chori y un vaso de vino. En el piquete no se muere nadie, compañero.*
- **Efectos:** `hp = 50` (te levantan, no te curan entero), `+1 chori al inventario` (te convidan), **el save NO se
  borra**, y el hito va al bus de eventos (`evlog('hito','lo levantó la muchachada')` → los linyeras lo van a
  chusmear: "¿viste que al pibe lo levantaron en el piquete?"). Monedas: no te sacan nada — es bien peronista.
- **Si morís CON `bunkerUnlocked`:** comportamiento actual (el búnker/loop ES tu red; el game over sigue teniendo
  sentido ahí) — o, a definir por el dueño, ¿también piquete? **Default propuesto: actual.**
- **Implementación:** en `die()`, branch temprano: `if (!bunkerUnlocked && !spinoffLevel) { respawnPiquete(); return; }`
  → `respawnPiquete()` = `player.hp = 50; player.alive = true; addItem('chori'); enterLavalle(T('g.morir.piquete'))`.
  Reusa TODO lo existente (enterLavalle con intro, el ítem chori de v269, el bus de eventos). i18n ES/EN.
- **Lore-fit perfecto:** el "rayo solar" ya existe (tu arma vs Robocop/satélite) → la muchachada asume que te
  teletransportó una descarga de la tormenta. Cierra solo.

## 3. Fases
- **F1 — NaN:** `sanePlayer()` + `num()` en los 4 sitios de compra + higiene del shopCache + evento `nan` en la
  whitelist + panel "NaN por campo" en `tormenta-jugadores`. *(Verificable: forzar un ítem sin cost en el cache →
  incomprable, no NaN.)*
- **F2 — respawn peronista:** el branch en `die()` + `respawnPiquete()` + i18n + e2e (morir pre-búnker → estado
  'lavalle' con hp 50 y chori; morir post-búnker → end screen igual que hoy).

## 4. Notas
- El evento `nan` es la clave del "no sé por qué": en vez de adivinar, el dashboard va a decir QUÉ campo se rompe y
  con qué frecuencia → se caza la fuente exacta con datos.
- `sanePlayer` es red de seguridad, NO licencia para dejar inputs sin validar: las 2 capas conviven.
