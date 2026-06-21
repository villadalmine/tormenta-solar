# EDIFICIO: Garbarino (electrónica)

- **Nodo id:** `garbarino`  ·  **Tipo:** `edificio`  ·  **Nivel:** 1
- **Sala(s):** 11  ·  **Estado:** Implemented

## Resumen
La casa de electrónica carísima. Un **vendedor pesado** que te **persigue** por el local intentando
venderte cosas. Color/humor, sin quest.

## Detalle
- **Vendedor** (`follow:true`): camina hacia el jugador y suelta chamuyos de venta cada par de
  segundos.
- **Post-tormenta:** colapsa → ruinas (RF-7).

## Aristas
```
calle --conecta_con--> garbarino
garbarino --contiene--> vendedor_garbarino
stormed --bloquea--> garbarino [ruinas]
```
