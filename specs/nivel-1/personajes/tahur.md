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

## Aristas
```
trastienda_truco --contiene--> tahur
tahur --quiere--> partida_truco
tahur --da--> robo_guita [si perdés]
secretUnlocked --desbloquea--> trastienda_truco
```
