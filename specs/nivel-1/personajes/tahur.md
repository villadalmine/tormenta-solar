# PERSONAJE: El Tahúr

- **Nodo id:** `tahur`  ·  **Tipo:** `npc`  ·  **Nivel:** 1
- **Sala(s):** 10 (trastienda del truco)  ·  **Estado:** Implemented

## Resumen
El naipero pesado de la trastienda secreta. Te sienta a jugar al **truco** (`action:'truco'`). Si
perdés, **te roba la guita** y te tiran las **bailarinas** encima (música de telo). Solo se llega
ganando los 3 arcades (puerta secreta).

## Detalle
- *"Sentate, pibe. Quilmes y truco. Si perdés te entregás el marrón... la bolsa de plata no."* 🃏
- Llega vía: arcade → (3 juegos ganados → `secretUnlocked`) → lugar secreto → trastienda.
- **Ganarle al truco abre una PUERTA AL CHINO:** en la trastienda hay una puerta `chinotruco`
  (gated por el flag `trucoWon`) que **cruza derecho al local del chino** (modo super). **Cada vez
  que le ganás** se vuelve a abrir; se **consume** al cruzarla. Es **otra entrada** al chino (además
  de la trasera de la cueva y la de Iorio) — útil en el loop de supervivencia.
- (Ganar igual tiene su costo: las bailarinas te afanan monedas.)

## Personalidad (fuente para el generador de diálogos y el chat IA)
- **Voz / tono:** naipero turbio y canchero, mafioso de barrio, sonrisa de costado.
- **Cómo habla:** slang porteño de timba, tono bajo y amenazante-simpático; habla de truco, apuestas,
  el marrón, las bailarinas, la música de telo.
- **Contexto (qué sabe):** la trastienda secreta, el truco, que si perdés te roba; le gusta el marrón.
- **Quiere:** que juegues y pierdas.
- **Qué NO dice:** no rompe la 4ª pared.
- **Persona de chat:** `tahur` (definible). Hoy su interacción principal es el **truco** (acción).
- **Tormenta:** post-tormenta juega igual, "las cartas no necesitan luz, pibe"; el apagón es su mejor tapadera.
- **Semilla para el script:** «tahúr de trastienda, timbero turbio y canchero, te invita al truco y
  te amenaza con humor».

## Aristas
```
trastienda_truco --contiene--> tahur
tahur --quiere--> partida_truco
tahur --da--> robo_guita [si perdés]
secretUnlocked --desbloquea--> trastienda_truco
ganar_truco --desbloquea--> chinotruco [puerta al chino, se consume al cruzar, repetible]
chinotruco --conecta_con--> super_chino
```

## Grafo de historia (lo lee `tools/gen-historia.mjs` → ver [historia-grafo.md](../historia-grafo.md))
```hist
{
  "id": "truco",
  "title": "Ganarle al tahúr (puerta al chino)",
  "at": "arcade",
  "pre": {},
  "sets": { "trucoWon": true },
  "hints": {
    "es": [
      "Atrás del arcade timbean. El que gana una de truco se gana algo más que el pozo...",
      "Hay una trastienda donde un tahúr juega al truco; ganarle abre un atajo.",
      "Ganale al tahúr en el truco (1/2/3 carta, T truco, V envido): se abre una puerta directa al chino.",
      "¡Andá a la trastienda, GANALE EL TRUCO al tahúr y cruzás derecho al chino! Eso."
    ],
    "en": [
      "Behind the arcade they gamble. Whoever wins a game of truco wins more than the pot...",
      "There's a back room where a card sharp plays truco; beating him opens a shortcut.",
      "Beat the card sharp at truco (1/2/3 card, T truco, V envido): a door straight to the shop opens.",
      "Go to the back room, BEAT the sharp at TRUCO and you cut straight to the corner shop! There."
    ]
  }
}
```
