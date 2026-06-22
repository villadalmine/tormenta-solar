# 🌞 TORMENTA SOLAR — Nivel 1: Florida y Lavalle

Un **run-and-gun 2D** ambientado en la peatonal de **Calle Florida y Lavalle, Buenos Aires**,
con humor argentino. Una tormenta solar rasgó el espacio-tiempo; explorás la city, bajás a
las **cuevas del dólar** (cambio ilegal), estalla todo y escapás por un **portal temporal**.

Hecho en **JavaScript vanilla + HTML5 Canvas**, sin build, sin dependencias, sin assets
externos: **todo el arte y la música son procedurales** (se dibujan/sintetizan por código).

## 🕹️ Jugá online

👉 **[villadalmine.github.io/tormenta-solar](https://villadalmine.github.io/tormenta-solar/)**

(Se juega en el navegador, no instala nada. Probado en Chrome/Firefox de escritorio.)

---

## ▶️ Cómo correr (local)

No necesita instalar nada. Serví la carpeta con cualquier server estático:

```bash
python3 -m http.server 8000
# abrí http://localhost:8000
```

> Conviene servirlo (no abrir el `index.html` con `file://`) para que anden bien el audio
> y el cacheo. El audio arranca recién cuando hacés click en **ENTRAR A LA PEATONAL**
> (política de autoplay de los navegadores).

Probado en Chrome/Firefox de escritorio. Canvas **800×448**, que **se auto-escala para llenar
la ventana** manteniendo la proporción (`js/fit.js`) — no hace falta hacer zoom en el navegador.

---

## 🎮 Controles

| Acción | Tecla |
|---|---|
| Correr | `A` / `D` o `←` / `→` |
| Saltar | `W` o `Espacio` |
| Apuntar | Mouse |
| Disparar (escupitajo) | Click izquierdo (mantené) |
| Usar puerta / hablar / comprar | `E` |
| Música on/off | `M` |
| Opciones (fuente, duración del texto) | `O` o el botón **⚙** |

**Minijuegos vista de arriba** (super chino, disquería): moverse con `WASD`/flechas,
`E` interactuar (agarrar de la góndola / pagar en la caja), `Esc` salir. En el super, los
caramelos **no** se aceptan como pago (el chino se enoja).

---

## 🗺️ Recorrido y contenido

La calle (sala 0) conecta con todos los edificios. **38 salas** en total.

### En la calle
- **EducaciónIT** (pisos 4/8/9): saludás a Maxi (Java), Guido, los dos CEOs Sebastián y
  tomás unos mates con Marcos. Ascensor entre pisos.
- **Arcade de Lavalle**: máquinas jugables — **Pac-Man** (con frutitas/power-pellets),
  **Galaga**, **Frogger** (ganás un vale de choripán) y **TRUCOTRON**. Ganándole a todas
  se abre una **puerta secreta** al fondo (sala de humo → trastienda del truco).
- **Chorería**: canjeás el vale por un choripán (+vida).
- **Garbarino**: electrónica carísima; un vendedor pesado te persigue.
- **Cemento**: recital under, Almafuerte en prueba de sonido + Iorio, humo y olor a asado.
  Entrás con el **ticket** que comprás en la disquería.
- **Casa de Cambio Oficial**: está *hasta las pelotas*, no podés entrar... hasta que la
  tormenta rompe el espacio-tiempo y **adentro se abre el PORTAL** (el final del juego).
- **Edificio abandonado** (20 pisos): lo custodian **3 borrachines** (ver abajo).
- **Super chino** (vista de arriba): **changuito** real — agarrás de las góndolas (Diosa
  Tropical, carne, fiambre, golosinas, una **Mega Drive**…) y **todo queda sin pagar** hasta
  que pasás por la **CAJA**. El chino cobra en monedas y **da el vuelto en caramelos**; si no
  te alcanza la guita **no te lo fía** y **no acepta caramelos** (“¡chino no comer y pagar con
  caramelos!”). Si intentás **rajar sin pagar**, de la **puerta oscura** (donde vive la familia
  del chino) salen **dos ninjas samurái** y te echan **sin la mercadería**. Tiene una **puerta
  secreta** que da a la cueva.

### Abajo (la galería → las cuevas)
- **Galería / Sótano** (subsuelos 1 y 2): tiendas raras (sex-shop, comida dudosa, masajista,
  un personaje tenebroso que te vende un amuleto).
- **Las Cuevas del dólar**: **3 cueveros**. Dos te rebotan; el tercero te cambia... y
  **justo ahí estalla la tormenta solar**. Hay una **disquería** (vinilos) que te da el
  ticket de Cemento.
- **Sala secreta** (humo, naiperos) → **trastienda del truco** con el Tahúr (si perdés te
  roba la guita y te tiran las bailarinas encima).

### Los 3 borrachines + edificio abandonado
Los tres borrachines de la calle **tienen cada uno algo distinto en la mano** (vino, cerveza,
porro) y custodian su edificio: **no te dejan pasar** hasta que cada uno reciba **el regalo que
se le antoja** — y **no es lo que tienen en la mano**. Tampoco te lo dicen de una: al hablarles
(`E`) **siempre te tiran cosas al azar** y, en una de esas, sueltan **la pista** de qué comprarle.
Cuando le acercás lo que quiere, **lo detecta**, te lo agradece y **deja de pedirte cosas**.

| Borrachín | Tiene en la mano | Quiere de regalo | Se consigue en |
|---|---|---|---|
| El del vino 🍷 | vino | un **sándwich de fiambre** | super chino → góndola FIAMBRES |
| El de la cerveza 🍺 | cerveza | una **Diosa Tropical** 🍹 (el vinito dulce) | super chino → góndola DIOSAS |
| El del porro 🌬️ | porro (con bajón) | un **cacho de carne** | super chino → garca de CARNES |

Con los tres contentos **saltan de alegría**, te hacen **socio VIP** “por alimentar a las clases
bajas de forma desinteresada”, **abren el edificio** y te soplan el secreto del super→cueva. El
edificio tiene **20 pisos** (ascensor):

- Los **impares son de lujo**: un **depto top** con cocina, baño, **living con un tele
  buenísima**, maniquí de moda, **joyas** y un **maletín lleno de dólares**. Podés saquear unas
  monedas... pero cuando vas por el maletín o las joyas **sube un linyera filósofo** (un Diógenes
  de Florida) y te frena: *“No toques eso, pibe, afecta el espacio-temporal y me convierto de
  vuelta en millonario... ¡y yo no quiero laburar! Corréte, que me tapás el sol.”* 🌞
- Los **pares están destruidos**: escombros y gente tirada / yonquis durmiendo.

### El final
Tras la tormenta, volvés a la superficie, entrás a la **Casa de Cambio Oficial** (ahora
abierta) y tocás el **portal** del fondo. Fin del nivel.

---

## 💰 Economía e inventario

- **Monedas**: plata principal (comprar en el chino, jugar a las máquinas). **El chino solo
  cobra en monedas** (caramelos NO).
- **Caramelos**: el **vuelto** del chino (no se paga con ellos).
- **Changuito (inventario virtual)**: lo que agarrás en el super queda **sin pagar** hasta la
  CAJA. Si te vas sin pagar, los **ninjas** te lo sacan.
- **Diosa Tropical / Carne / Fiambre**: los regalos de los borrachines (HUD: `🍹·🥩·🥓`).
- **Munición / Vida**: estándar.
- Flags de progreso: `hasMegaDrive`, `hasCementoTicket`, `gaveBeers`, `borrachosHappy`,
  `fifaWon`, `moneyRecovered`, `secretUnlocked`, `stormed`.

## 🎵 Música (chiptune procedural)
Tango "Mi Buenos Aires querido" de fondo; **cumbia** cerca del músico; **eighties** en la
disquería; **metal** en Cemento; **dance** en la sala secreta y **música de telo** en la
trastienda del truco.

---

## 🧱 Estructura del código

Sin bundler: los `<script>` se cargan en orden de dependencia desde `index.html`.

| Archivo | Qué hace |
|---|---|
| `js/audio.js` | SFX + música chiptune (WebAudio), sin archivos |
| `js/art.js` | **Todo** el arte procedural (sprites, tiles, fachadas, fondos) en canvas offscreen |
| `js/input.js` | Teclado + mouse |
| `js/fx.js` | Partículas, balas/escupitajos |
| `js/level.js` | Salas (tilemaps), colisión por tiles, física, datos del nivel y wiring de puertas |
| `js/player.js` | Protagonista: correr, saltar, apuntar, escupir |
| `js/enemies.js` | Enemigos (peatones, drones, máquinas poseídas) |
| `js/arcade.js` | Minijuegos overlay: pacman, galaga, frogger, truco, fighter |
| `js/super.js` | Super chino (vista de arriba) |
| `js/vinilos.js` | Disquería (vista de arriba) |
| `js/game.js` | Loop principal, estados, cámara, iluminación, tormenta, HUD, loop de supervivencia |
| `js/dialogos.js` | Pools de diálogo (generados por IA, modo A). Si falta, los NPCs usan su pool propio |
| `js/ai.js` | Chat con NPC vía IA (modo B): proxy / BYOK / local. Capa aditiva, graceful |

**Capas aditivas** (no tocan el core; el juego anda igual sin ellas):
`js/config.js` (⚙ opciones), `js/presence.js` (jugando ahora), `js/fit.js` (auto-escalado de pantalla).

**Cache-busting:** todos los `src` llevan `?v=N` en `index.html`. **Al cambiar cualquier
JS/CSS hay que subir ese número** (si no, el navegador sirve la versión vieja). Actual: **`v=45`**.

---

## 🟢 “Jugando ahora” (presencia online)

La intro puede mostrar un cartelito **🟢 N jugando ahora**. Es una **capa aditiva** (`js/presence.js`)
que no toca el juego: cada pestaña manda un latido a un endpoint que cuenta a los activos.

- **Sin endpoint configurado, no muestra nada** (el juego anda 100% igual). Por eso funciona
  en GitHub Pages aunque no tengas backend.
- Para activarlo levantás un endpoint mínimo (Node propio **o** un Cloudflare Worker gratis) y
  pegás su URL en `js/presence.js → ENDPOINT`. Todo explicado en
  **[`presence-server/`](presence-server/README.md)**.
- No pide login ni guarda datos personales: solo un id random por pestaña, con TTL de ~30s.

---

## 🔁 Loop de supervivencia (después de la tormenta)

Cuando estalla la tormenta podés **escapar por el portal** (Casa de Cambio) **o quedarte en el loop**.
En el loop la meta es **sobrevivir**: la **vida baja con el tiempo** y hay que **comer en el chino**,
que quedó **atrincherado** (ninjas + fuego + granadas en el frente). Entrás por la **puerta trasera**
(desde la cueva) o conseguís que **Iorio** toque (le das **falopa** de los cajones de lujo) para que
los ninjas se vayan. La **plata** sale de los **linyeras** (ex-millonarios que lloran su historia).
Dormís en el **catre del búnker** para pasar un día. Tras la tormenta, los edificios que **no** son
refugio (EducaciónIT, arcade, chorería, Garbarino) quedan **clausurados** (tablones + "derrumbado").
Todo el diseño está en **[`specs/nivel-1/loop-supervivencia.md`](specs/nivel-1/loop-supervivencia.md)**.

---

## 🤖 Diálogos y chat con IA (OpenRouter)

Dos capas **opcionales y aditivas** (el juego anda 100% sin ellas):

- **Modo A — diálogos pre-generados:** `tools/gen-dialogos.mjs` genera pools de diálogo variados
  (slang porteño) con un modelo **`:free`** de OpenRouter y los escribe en `js/dialogos.js` (estático,
  cero costo/latencia en runtime). Los NPCs leen de ahí con **fallback** a sus líneas propias.
  Key en `tools/openrouter.key` (gitignored) o `OPENROUTER_API_KEY`. Correr: `npm run gen:dialogos`.
- **Modo B — chat en vivo:** hablás con un NPC (el **linyera filósofo** de la calle). Prioridad:
  **proxy del dev** (`ai-proxy/`, vos pagás) → **BYOK** (el jugador pega **su** API key en ⚙ Opciones,
  queda en su navegador) → **local** (líneas predefinidas si no hay nada o si la IA tarda/falla).

> ⚠️ **Seguridad:** nunca se pone la key del dev en el cliente (cualquiera gastaría tu cuota). Por eso:
> **proxy** (key server-side) **o BYOK** (key del jugador, sólo en su navegador). Detalle y política
> de prioridad en **[`specs/ia-openrouter.md`](specs/ia-openrouter.md)** y **[`ai-proxy/`](ai-proxy/README.md)**.

---

## 📐 Diseño (Spec-Driven Development)

Cada parte del nivel está documentada como **grafo de entidades** en **[`specs/`](specs/README.md)**:
una ficha por edificio y por personaje, un [GRAFO](specs/nivel-1/GRAFO.md) (Mermaid + aristas) y specs
de sistemas (loop, conexiones secretas, configuración, IA). Ver también [`specs/TECNICAS.md`](specs/TECNICAS.md).

### Cómo está armado un nivel
`Level.build()` devuelve un array de salas (`makeRoom(spec)`). Las salas se conectan con
`wire(salaA, puertaA, salaB, puertaB)`. Algunas puertas son "lanzadores de modo" (super,
vinilos) y no se cablean: las maneja `game.js` abriendo el minijuego correspondiente. Las
puertas que dibujan una fachada de edificio necesitan una entrada en `DOOR_ART` (game.js)
que mapee el `art` de la puerta al sprite en `Art.items`.

---

## 🧪 Tests

Hay **dos niveles** de test, que cubren cosas distintas:

### 1. e2e headless — lógica + assets (rápido, sin navegador)

```bash
node tests/e2e.js
```

Levanta el juego con un DOM/Canvas/AudioContext **mockeado**, carga los scripts en el mismo orden
que `index.html`, corre el game loop, hace una **auditoría de assets** (todo sprite/decor de cada
sala existe en `Art`) y arranca los sub-modos. Atrapa el bug de "pantalla en blanco" por sprite
faltante. **No ve render ni CSS ni layout** (está mockeado), así que no detecta cosas visuales.

### 2. web smoke — navegador REAL (Playwright + Chromium)

```bash
npm install
npx playwright install chromium
node tests/web-smoke.mjs        # o: npm run test:web
```

Sirve la carpeta y abre el juego en un **Chromium real** en varias resoluciones (1366 / 1920 /
1280). Verifica lo que el headless **no puede ver**:

- **0 errores** de consola / excepciones de JS,
- el **botón ENTRAR** está **entero dentro del viewport** (no cortado) ← este test agarra el bug
  del panel que se salía de pantalla,
- el panel de intro no recorta contenido sin scroll,
- tras apretar ENTRAR el **canvas dibuja** (no queda en blanco),
- y guarda **screenshots** en `tests/screenshots/`.

Corre **solo en GitHub Actions** en cada push (ahí hay navegador) vía
[`.github/workflows/web-smoke.yml`](.github/workflows/web-smoke.yml); localmente solo si instalás
Chromium con los comandos de arriba.

> **Regla:** correr `node tests/e2e.js` antes de dar por terminado cualquier cambio y **subir
> `?v=N`** en `index.html`. Si tocás CSS/HTML/layout, además el **web smoke** (lo corre el CI).

---

## 📜 Estado y próximos pasos

Ver **[ROADMAP.md](ROADMAP.md)**. Historial de versiones en **[CHANGELOG.md](CHANGELOG.md)**.

## 🚀 Publicar

Cómo subir el repo y dejarlo jugable online (GitHub Pages), paso a paso:
**[PUBLICAR.md](PUBLICAR.md)**.

## 📄 Licencia
**GNU General Public License v3.0** (GPLv3) — ver [LICENSE](LICENSE).
Software libre: podés usarlo, estudiarlo, modificarlo y compartirlo; las obras derivadas
deben mantenerse bajo la misma licencia.

Copyright © 2026 villadalmine.

## Créditos
Juego y dirección creativa: el autor. Programación asistida con Claude Code.
Hecho con humor porteño. Aguante.
