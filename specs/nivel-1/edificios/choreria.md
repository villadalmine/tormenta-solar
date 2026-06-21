# EDIFICIO: Chorería de Florida

- **Nodo id:** `choreria`  ·  **Tipo:** `edificio`  ·  **Nivel:** 1
- **Sala(s):** 5  ·  **Estado:** Implemented

## Resumen
El puesto de choripán. Canjeás el **vale** que ganás en el Frogger por un **choripán** que te da
**+vida**. Cerradura simple con su llave (`vale_chori`).

## Detalle
- **Parrillero** (`action:'chori'`): si tenés `vale_chori`, te da el choripán (+40 vida). Si no,
  te manda a ganárselo al Frogger.
- **Post-tormenta:** colapsa → ruinas (RF-7).

## Aristas
```
calle --conecta_con--> choreria
choreria --contiene--> parrillero
choreria --da--> choripan [requiere vale_chori]
vale_chori --se_consigue_en--> arcade [ganar Frogger]
stormed --bloquea--> choreria [ruinas]
```
