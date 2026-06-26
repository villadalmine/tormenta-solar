# PERSONAJE: El Carpo (protagonista) + el DÓLAR como arma

- **Nodo id:** `protagonista` · **Tipo:** `player` · **Nivel:** 1
- **Sprite:** `Art.hero` (`drawHero` en js/art.js). **Estado:** implementado (v168).

## Resumen
Sos **el Carpo**: rockero linyera de **melena larga**, **birra en la mano** (siempre) y la **viola a la espalda**.
Homenaje de tono a Pappo (nombre alterado, sin afiliación). Pelado NO — pelo largo.

## El arma: escupitajo → DÓLARES (post-tormenta)
- **Antes de la tormenta:** escupís un **gargajo** (`spit`), daño normal a los enemigos.
- **Cuando estalla la furia de la tormenta temporal** (`stormed`): el Carpo **escupe DÓLARES** (`player.dollarMode`,
  que setea game.js = `stormed`). Lore: se abrieron todas las cuevas, los cueveros las tomaron, y ahí buscás los
  dólares.
- **Efecto del dólar (js/fx.js):**
  - Contra **GENTE** (enemigos NO voladores: peatón, etc.) → **los APACIGUA**: dejan de ser hostiles y se tiran al
    piso a **juntar billetes** (`e.pacified`), no te joden más (no se mueren). Render: 💰 + signos `$` (enemies.js).
  - Contra **MÁQUINAS** (voladores: dron) → **daño normal** (no son codiciosas).
- El **escupitajo** (pre-tormenta) NO apacigua: siempre hace daño. (e2e cubre las 3 reglas.)

## Las cámaras + AFIP (chiste)
Cada dólar disparado lo "ven las cámaras" → sale una **burbuja con la SERIE** del billete (game.js
`spawnDollarBubble`): ~65% **real** (`📹 serie {s}`) y ~35% **TRUCHA** (`📹 {s} · TRUCHA 🚨 AFIP`) = es una copia,
llamando a la AFIP. Flota y se desvanece. i18n `g.dollar.real` / `g.dollar.fake`.

## Pendiente / ideas
- Munición de dólares como recurso aparte (hoy reusa `ammo`); juntarlos en las cuevas.
- Que los apaciguados dejen monedas al rato, o que tras un tiempo se levanten.
- Cámaras como ENTIDAD en el mapa (hoy la burbuja sale en el disparo; las cámaras son implícitas).
