# PERSONAJE: El Chino (+ familia + ninjas)

- **Nodo id:** `chino`  ·  **Tipo:** `npc`  ·  **Nivel:** 1
- **Sala(s):** modo `super` (super chino)  ·  **Estado:** Implemented

## Resumen
El dueño del super chino, en la **CAJA**. Cobra **solo monedas**, **da el vuelto en caramelos** y
**no acepta caramelos** como pago (se enoja). Su **familia** vive detrás de la **puerta oscura**
(no entrás); si rajás sin pagar, salen **2 ninjas samurái** y te echan **sin la mercadería**.

## Detalle
- **Changuito:** agarrás de las góndolas sin pagar → pagás en la caja.
- **Si no te alcanza la guita:** no te fía. **Si pagás con caramelos:** *"¡chino no comer y pagar con
  caramelos!"* 🤬.
- **Ninjas:** disparador de eyección al intentar salir con mercadería sin pagar.
- **Post-tormenta:** el super queda **atrincherado** (tachos con fuego, granadas, ninjas) = refugio.

## CAJA — mini-juego de pago (checkout, v161)
Al llegar a la caja con changuito, se abre un **panel de checkout** (canvas, dentro del sub-modo `super.js`):
- **Changuito editable:** ves cada producto con su precio y el **total en vivo**; `[↑↓]` elegís, `[X]` sacás
  un item (recalcula). Si lo vaciás, se cierra la caja.
- **Tender (vos ponés la plata):** `[←→]` subís/bajás la plata que le ponés al chino (mín = total, máx = lo
  que tenés). El **VUELTO** se calcula solo y **siempre es en CARAMELOS** (el peso no vale nada, es el chiste):
  `vuelto = tender − cobro`. Sobrepagar = convertir monedas en caramelos.
- **Caramelos NO se aceptan como pago:** `[C]` → *"¡Chino VEGETARIANO! ¡Chino NO comer caramelo! ¡Plata
  plata!"* 🥬 (podés intentarlo, pero te lo rechaza).
- **El chino te quiere cagar (inflación):** al confirmar, tira la moneda (`CHINO.scamChance`):
  - **Cobra limpio** (a veces con un *"uy, me confundí, está bien"* cosmético).
  - **Inventa INFLACIÓN** y te pide **más plata** (*"el peso no vale nada, hay inflación, son {extra} más"*).
    Podés **aceptar** `[E]` (pagás el recargo, te come el vuelto/más monedas) o **discutir** `[N]`:
    - a veces **cede** (`CHINO.relentChance`): *"perdón, me confundí, dejá así"*.
    - a veces salen **2 ninjas con katana** que te **intiman** → aceptás la inflación **sí o sí**.
- **Tunables como DATA (`CHINO` en super.js):** `scamChance`, `inflaRate`, `relentChance`, `confusedChance`.
  La máquina de niveles podrá autorar un chino más/menos garca por nivel. (El `__pay`/headless conserva el
  pago limpio clásico para el e2e.)

## Personalidad (fuente para el generador de diálogos y el chat IA)
- **Voz / tono:** dueño del super, amable pero **firme con la guita**; te dice "amigo" todo el tiempo.
- **Cómo habla:** español algo cortado/inmigrante, frases cortas, mezcla simpatía y reto ("¡chino NO
  comer y pagar con caramelos!"). Da el vuelto en caramelos.
- **Contexto (qué sabe):** los precios, el changuito, la caja, los ninjas de la familia, la puerta
  oscura; post-tormenta vende comida y se atrinchera.
- **Quiere:** que pagues (en monedas), que no le afanes.
- **Qué NO dice:** no deja entrar a la puerta de la familia; no rompe la 4ª pared.
- **Persona de chat:** no chateable (es el **modo super**); su personalidad alimenta los mensajes del super.
- **Semilla para el script:** «chino dueño de super, amable pero firme con el pago, da vuelto en
  caramelos, se enoja si le pagan con caramelos».

## Aristas
```
super_chino --contiene--> chino
chino --vende--> diosa_tropical
chino --vende--> carne
chino --vende--> fiambre
chino --vende--> mega_drive
chino --da--> caramelos [vuelto]
chino --bloquea--> salida_sin_pagar [ninjas samurái]
```
