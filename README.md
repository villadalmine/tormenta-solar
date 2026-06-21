# 🌞 TORMENTA SOLAR — Nivel 1: Florida y Lavalle

Un **run-and-gun 2D** ambientado en la peatonal de **Calle Florida y Lavalle, Buenos Aires**,
con humor argentino. Una tormenta solar rasgó el espacio-tiempo; explorás la city, bajás a
las **cuevas del dólar** (cambio ilegal), estalla todo y escapás por un **portal temporal**.

Hecho en **JavaScript vanilla + HTML5 Canvas**, sin build, sin dependencias, sin assets
externos: **todo el arte y la música son procedurales** (se dibujan/sintetizan por código).

---

## ▶️ Cómo correr

No necesita instalar nada. Serví la carpeta con cualquier server estático:

```bash
python3 -m http.server 8000
# abrí http://localhost:8000
```

> Conviene servirlo (no abrir el `index.html` con `file://`) para que anden bien el audio
> y el cacheo. El audio arranca recién cuando hacés click en **ENTRAR A LA PEATONAL**
> (política de autoplay de los navegadores).

Probado en Chrome/Firefox de escritorio. Canvas 960×540.

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

**Minijuegos vista de arriba** (super chino, disquería): moverse con `WASD`/flechas,
`E` interactuar (agarrar de la góndola / pagar en la caja), `Esc` salir. En el super, los
caramelos **no** se aceptan como pago (el chino se enoja).

---

## 🗺️ Recorrido y contenido

La calle (sala 0) conecta con todos los edificios. **34 salas** en total.

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
edificio tiene **20 pisos** (ascensor): los **impares son de lujo** (la mejor moda, vacíos, podés
saquear monedas) y los **pares están destruidos** (escombros y gente tirada / yonquis durmiendo).

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
| `js/game.js` | Loop principal, estados, cámara, iluminación, tormenta, HUD |

**Cache-busting:** todos los `src` llevan `?v=N` en `index.html`. **Al cambiar cualquier
JS/CSS hay que subir ese número** (si no, el navegador sirve la versión vieja). Actual: **`v=31`**.

### Cómo está armado un nivel
`Level.build()` devuelve un array de salas (`makeRoom(spec)`). Las salas se conectan con
`wire(salaA, puertaA, salaB, puertaB)`. Algunas puertas son "lanzadores de modo" (super,
vinilos) y no se cablean: las maneja `game.js` abriendo el minijuego correspondiente. Las
puertas que dibujan una fachada de edificio necesitan una entrada en `DOOR_ART` (game.js)
que mapee el `art` de la puerta al sprite en `Art.items`.

---

## 🧪 Tests (headless, sin navegador)

```bash
node tests/e2e.js
```

`tests/e2e.js` levanta el juego entero con un DOM/Canvas/AudioContext mockeado, carga los
11 scripts **en el mismo orden que `index.html`**, corre el game loop, hace una
**auditoría de assets** (verifica que todo sprite referenciado por cada sala exista en `Art`)
y arranca los 7 sub-modos. Atrapa el bug típico de "pantalla en blanco" por sprite faltante.

> **Regla:** correr `node tests/e2e.js` antes de dar por terminado cualquier cambio, y
> **subir `?v=N`** en `index.html`.

---

## 📜 Estado y próximos pasos

Ver **[ROADMAP.md](ROADMAP.md)**.

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
