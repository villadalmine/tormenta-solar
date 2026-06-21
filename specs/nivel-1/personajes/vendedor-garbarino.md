# PERSONAJE: El Vendedor de Garbarino

- **Nodo id:** `vendedor_garbarino`  ·  **Tipo:** `npc`  ·  **Nivel:** 1
- **Sala(s):** 11 (Garbarino)  ·  **Estado:** Implemented

## Resumen
El vendedor pesado que **te persigue** por el local (`follow:true`) tirando chamuyo de venta cada
par de segundos. Color/humor, sin quest ni gating.

## Detalle
- Camina hacia el jugador y suelta líneas de venta agresiva (electrónica carísima).
- **Post-tormenta:** Garbarino colapsa → ruinas (no se entra).

## Aristas
```
garbarino --contiene--> vendedor_garbarino
stormed --bloquea--> garbarino [ruinas]
```
