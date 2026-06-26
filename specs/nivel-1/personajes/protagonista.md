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

## Las cámaras + AFIP + los ROBOTS (v169)
Las **PERSONAS no detectan nada** (solo se apaciguan). Las **CÁMARAS/ROBOTS** sí leen cada dólar disparado:
- **Burbuja con la SERIE** (siempre): `📹 serie buena {s}` o `📹 serie trucha {s}`. A veces una **2ª línea**:
  `🚨 llamando a la AFIP` u **origen detectado**: cueva N Florida/Lavalle · valija de Kristina · venta de armas ·
  estafa de la AFA · drogas del cartel · venta ilegal · Monopoly.
- **Efecto en los ROBOTS (drones):** serie **BUENA = legal** → los drones **NO te ven** unos segundos
  (`legalBlindUntil`): derivan sin dispararte. Serie **TRUCHA = ilegal** → **te siguen disparando** (sin alivio).
  (e2e cubre: dron ciego no dispara / dron no-ciego sí.)

### Data-driven (§6.97 — el mecanismo es código, el CONTENIDO es dato)
El **mecanismo** (apaciguar/cegar) es **código del motor** (primitiva nueva = correcto). El **contenido** vive en
**`rules.dollars`** (DATA): `truchaChance`, `blindMs` (segundos de ceguera) y la lista de **`origins`** (claves
i18n). La **máquina de niveles** puede autorar un nivel con otros orígenes/probabilidades sin tocar el motor.
Leído en game.js (`DOLLARS`) con fallback inline; emitido por gen-level → nivel-1.json → schema.

## Pendiente / ideas
- Munición de dólares como recurso aparte (hoy reusa `ammo`); juntarlos en las cuevas.
- Que los apaciguados dejen monedas al rato, o que tras un tiempo se levanten.
- Cámaras como ENTIDAD en el mapa (hoy la burbuja sale en el disparo; las cámaras son implícitas).
