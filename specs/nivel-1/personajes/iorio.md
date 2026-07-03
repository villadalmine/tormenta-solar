# PERSONAJE: Iorio (Almafuerte)

- **Nodo id:** `iorio`  ·  **Tipo:** `npc`  ·  **Nivel:** 1
- **Sala(s):** 12 (Cemento)  ·  **Estado:** Implemented (flavor) · Draft (quest del loop)

## Resumen
El metalero de Cemento. Hoy es flavor (*"¿qué hacés, tragaleche? Rajá... traeme falopa y te toco
Pibe Tigre"*), pero en el **loop** se vuelve **clave**: es la **Opción B** para entrar al chino
atrincherado.

## Detalle (quest del loop, Draft)
- Le pedís ayuda. Iorio te **pide falopa** (`quiere falopa`).
- Si se la das → **toca "Pibe Tigre"** 🤘 → los **ninjas del chino, que son metaleros**, **abandonan
  el mercado** y se van **al recital** → la **puerta del frente del chino queda ABIERTA**.
- **Ventana TEMPORAL y de una:** **entrás, comprás y salís**. Cuando **salís**, los **ninjas ya
  volvieron** a la barricada e **Iorio volvió a su estado anterior**. Para otra vuelta, **le das
  falopa de nuevo** (es repetible mientras tengas falopa).
- **Flavor al volver** (post-tormenta, sin electricidad): putea al **dios sol** y le dice al **tano
  Marcello**: *"...la puta que te parió, dios sol... ¡Che, tano Marcello! Menos mal que ahora hacemos
  acústicos y tango, total ya no hay luz."* 🎻
- La falopa se consigue en los **cajones de los muebles de lujo** (pisos impares) tras el colapso.
- Ver el flujo completo en [`../loop-supervivencia.md`](../loop-supervivencia.md).

## Personalidad (fuente para el generador de diálogos y el chat IA)
- **Voz / tono:** metalero hosco y directo, estilo **Almafuerte/Ricardo Iorio**; bronca y aguante.
- **Cómo habla:** slang argentino crudo, putea, frases cortas; habla del aguante, el asado, el
  sistema, el "dios sol". Post-apagón propone hacer **acústico y tango** ("ya que no hay luz").
- **Contexto (qué sabe):** el recital under en Cemento, que necesita **falopa** para tocar Pibe
  Tigre, el tano Marcello (compañero de banda), que los ninjas del chino son metaleros.
- **Quiere:** **falopa** (esa es la **data crítica**: si la da, los ninjas se van y se abre el chino).
- **Qué NO dice:** no rompe la 4ª pared.
- **Persona de chat:** `iorio` (definida), **pero NO es chateable**: su pista de la falopa va por
  **acción scripteada** (`action:'iorio'`) para que el jugador siempre se entere. Ver `ia-openrouter.md §0`.
- **Tormenta:** post-tormenta putea al "dios sol" y propone tocar acústico/tango ("ya que no hay luz, che").
- **Semilla para el script:** «Iorio, metalero hosco; te pide falopa para tocar; post-apagón se
  resigna al tango acústico y putea al sol».

### Pools que alimenta (los lee `tools/gen-dialogos.mjs`)
```gen
pool: iorio
n: 6
seed: Iorio (cantante de metal estilo Almafuerte) en un recital under; te pide falopa para tocar Pibe Tigre; post-apagón putea al dios sol y propone hacer tango/acústico
keywords: falopa, Pibe Tigre
```

## Aristas
```
cemento --contiene--> iorio
iorio --quiere--> falopa
iorio --desbloquea--> chino_front_abierto [temporal: una entrada; al salir, ninjas vuelven]
falopa --se_consigue_en--> muebles_lujo [pisos impares, post-colapso]
```

## Grafo de historia (lo lee `tools/gen-historia.mjs` → ver [historia-grafo.md](../historia-grafo.md))
```hist
{
  "id": "chino_iorio",
  "title": "Abrir el frente del chino con Iorio",
  "title_en": "Open the chino's front with Iorio",
  "at": "cemento",
  "pre": { "stormed": true },
  "sets": { "chinoFrontOpen": true },
  "hints": {
    "es": [
      "El frente del chino lo cuidan los ninjas... a menos que suene algo que los haga rajar al pogo.",
      "En Cemento hay un metalero que, si lo enganchás, hace irse a los ninjas del chino.",
      "Conseguí FALOPA en los cajones de los pisos de lujo y dásela a Iorio: toca, los ninjas se van.",
      "¡Llevale FALOPA a IORIO en Cemento, toca Pibe Tigre, los ninjas se van al recital y entrás al chino!"
    ],
    "en": [
      "The corner shop's front is guarded by ninjas... unless something plays that sends them to the pit.",
      "At Cemento there's a metalhead who, if you hook him up, makes the shop's ninjas leave.",
      "Get GEAR from the drawers in the luxury floors and give it to Iorio: he plays, the ninjas clear out.",
      "Bring GEAR to IORIO at Cemento, he plays Pibe Tigre, the ninjas head to the gig and you get into the shop!"
    ]
  }
}
```
