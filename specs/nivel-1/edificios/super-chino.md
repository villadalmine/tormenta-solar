# EDIFICIO: Super chino (vista de arriba)

- **Nodo id:** `super_chino`  ·  **Tipo:** `edificio` / `modo`  ·  **Nivel:** 1
- **Sala(s):** modo `super` (se lanza desde la calle)  ·  **Estado:** Implemented

## Resumen
El supermercado chino, en **vista de arriba**. El **proveedor de ítems** del nivel: de acá salen
casi todas las cosas que piden los borrachines y la Mega Drive. Tiene **changuito**, **caja**,
**ninjas** y una **puerta secreta a la cueva**.

## Detalle
- **Changuito:** agarrás de las góndolas **sin pagar** → se acumula → **pagás en la CAJA**.
- El **chino** cobra **solo monedas** y **da el vuelto en caramelos**; **no acepta caramelos** como
  pago (se enoja). Si rajás sin pagar, salen **2 ninjas samurái** de la puerta oscura de la familia
  y te echan **sin la mercadería**.
- Góndolas: **Diosa Tropical**, carne, fiambre, golosinas, limpieza/bazar y **Mega Drive** (CONSOLAS).
- **Puerta secreta** → te lleva a la **cueva del dólar** (`enterCuevaFromSecret`, +60 monedas la 1ª
  vez). Los borrachines te soplan esta pista al hacerte VIP.
- **Post-tormenta / LOOP:** el super se **atrinchera** — **barricadas de fuego**, **granadas** y
  **ninjas** en el **frente** → **no entrás por adelante**. Pero es **donde se compra la comida** que
  te mantiene vivo en el loop. Dos formas de entrar (ver [`../loop-supervivencia.md`](../loop-supervivencia.md)):
  - **(A) Puerta trasera:** la puerta secreta super↔cueva es la **entrada de servicio** desde el
    refugio (cueva del dólar / "búnker del cuevero").
  - **(B) Iorio:** darle **falopa** a Iorio en Cemento → toca Pibe Tigre → los **ninjas metaleros se
    van** → el **frente** del chino queda abierto.

## Aristas
```
calle --conecta_con--> super_chino
super_chino --conecta_con--> cuevas_dolar [secreta · entrada de servicio en el loop]
super_chino --vende--> comida [post-colapso, restaura vida]
super_chino --bloquea--> entrada_frente [barricada: ninjas + fuego + granadas, post stormed]
iorio --desbloquea--> chino_front_abierto [falopa → Pibe Tigre → ninjas se van]
super_chino --vende--> diosa_tropical
super_chino --vende--> carne
super_chino --vende--> fiambre
super_chino --vende--> mega_drive
super_chino --vende--> golosinas
super_chino --da--> caramelos [vuelto]
super_chino --da--> moneyRecovered [+60 al volver por la cueva]
super_chino --contiene--> chino
chino --bloquea--> salida_sin_pagar [ninjas samurái]
```

## Grafo de historia (lo lee `tools/gen-historia.mjs` → ver [historia-grafo.md](../historia-grafo.md))
```hist
{
  "id": "megadrive",
  "title": "Comprar una Mega Drive (para el torneo de FIFA)",
  "title_en": "Buy a Mega Drive (for the FIFA tournament)",
  "at": "super",
  "pri": 20,
  "pre": {},
  "sets": { "hasMegaDrive": true },
  "hints": {
    "es": [
      "Hay un torneo esperando una maquinita que ya nadie usa... ¿no la viste en alguna góndola?",
      "En el super chino, en la sección CONSOLAS, hay algo que sirve para un torneo del arcade.",
      "Comprale al chino una MEGA DRIVE (sección CONSOLAS) y llevala al TRUCOTRON del arcade para el FIFA.",
      "¡Que compres la MEGA DRIVE en el super (CONSOLAS) y la lleves al arcade para el torneo de FIFA, dale!"
    ],
    "en": [
      "There's a tournament waiting on a little machine nobody uses anymore... seen it on a shelf?",
      "At the Chinese supermarket, in the CONSOLES aisle, there's something for an arcade tournament.",
      "Buy a MEGA DRIVE from the Chino (CONSOLES aisle) and take it to the TRUCOTRON at the arcade for the FIFA.",
      "Buy the MEGA DRIVE at the supermarket (CONSOLES) and take it to the arcade for the FIFA tournament!"
    ]
  }
}
```

El chino tiene **dos entradas** tras la tormenta: el frente (lo abre Iorio → [iorio.md](../personajes/iorio.md))
y la **puerta trasera** desde la cueva (entrada de servicio, no necesita a nadie). Esta arista es la segunda:
```hist
{
  "id": "chino_back",
  "title": "Entrar al chino por la puerta trasera (desde la cueva)",
  "title_en": "Enter the chino through the back door (from the cave)",
  "at": "cueva",
  "pre": { "stormed": true, "chinoFrontOpen": false },
  "sets": { "chinoEntered": true },
  "hints": {
    "es": [
      "El frente del chino está cerrado a cal y canto... pero los negocios siempre tienen otra puerta.",
      "Hay una entrada de servicio al chino, abajo, al fondo de la cueva. No por la calle.",
      "En la cueva, andá hasta el FONDO a la derecha: ahí hay una puerta trasera al chino.",
      "¡Metete por la PUERTA TRASERA del chino, al fondo de la CUEVA a la derecha! No hace falta Iorio."
    ],
    "en": [
      "The shop's front is shut tight... but businesses always have another door.",
      "There's a service entrance to the shop down in the back of the cueva. Not from the street.",
      "In the cueva, head all the way to the BACK on the right: there's a back door into the shop.",
      "Go in through the shop's BACK DOOR, at the far right of the CUEVA! You don't need Iorio."
    ]
  }
}
```

## Quest de la tarjeta SUBE (specs/subte.md §2.6)

El **tótem RECARGA SUBE** del chino se quedó sin tarjetas → te manda a buscar una. Un **linyera** (que camina o
viaja de arriba) te REGALA la suya; después la **cargás** en el tótem. Dos aristas:
```hist
{
  "id": "sube_tarjeta",
  "title": "Conseguir una tarjeta SUBE (un linyera tiene una)",
  "title_en": "Get a SUBE card (a bum has one)",
  "at": "calle",
  "pre": { "subeSeen": true },
  "sets": { "subeGot": true },
  "hints": {
    "es": [
      "El tótem del chino se quedó sin tarjetas... alguien por acá seguro tiene una tirada.",
      "Los linyeras viajan de arriba o caminan: alguno tendrá una SUBE que ya no usa.",
      "Preguntale a un LINYERA por una tarjeta SUBE: te la regala, total ellos no la usan.",
      "¡Chamuyá a un LINYERA y pedile la tarjeta SUBE! Te la da de una, dale."
    ],
    "en": [
      "The chino's totem ran out of cards... someone around here surely has one lying around.",
      "The bums ride for free or walk: one of them must have a SUBE they don't use.",
      "Ask a BUM for a SUBE card: he'll give you his, they don't use it anyway.",
      "Chat up a BUM and ask for the SUBE card! He hands it over, come on."
    ]
  }
}
```
```hist
{
  "id": "sube_carga",
  "title": "Cargar la SUBE en el tótem del chino",
  "title_en": "Top up the SUBE at the chino's totem",
  "at": "super",
  "pre": { "subeGot": true },
  "sets": { "subeReady": true },
  "terminal": true,
  "hints": {
    "es": [
      "Ya tenés la tarjeta... pero sin saldo no vas a ningún lado.",
      "Volvé al TÓTEM del chino: ahora que tenés la SUBE, te la carga.",
      "En el super chino, andá al TÓTEM RECARGA SUBE y cargale $10 a tu tarjeta.",
      "¡Volvé al TÓTEM del chino y cargá la SUBE ($10)! Queda lista para el subte."
    ],
    "en": [
      "You've got the card now... but with no balance you're going nowhere.",
      "Back to the chino's TOTEM: now that you have the SUBE, it'll top it up.",
      "At the Chinese supermarket, go to the SUBE RECHARGE TOTEM and load $10 onto your card.",
      "Back to the chino's TOTEM and top up the SUBE ($10)! Ready for the subte."
    ]
  }
}
```
