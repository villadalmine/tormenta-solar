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

## Aristas
```
trastienda_truco --contiene--> tahur
tahur --quiere--> partida_truco
tahur --da--> robo_guita [si perdés]
secretUnlocked --desbloquea--> trastienda_truco
ganar_truco --desbloquea--> chinotruco [puerta al chino, se consume al cruzar, repetible]
chinotruco --conecta_con--> super_chino
```
