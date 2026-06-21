# EDIFICIO: Cemento (recital under)

- **Nodo id:** `cemento`  ·  **Tipo:** `edificio`  ·  **Nivel:** 1
- **Sala(s):** 12  ·  **Estado:** Implemented

## Resumen
El reducto under: **Almafuerte/Iorio** en prueba de sonido, humo y olor a asado. **Cerradura**: solo
entrás con el **`ticket_cemento`** que comprás en la disquería. Música **metal**.

## Detalle
- **Iorio**, guitarrista, bajista, baterista (flavor + chiste). **Asador** con choripán de la previa.
- Gating: la puerta en la calle **requiere `hasCementoTicket`** (si no, no aparece/usable).
- **Post-tormenta:** colapsa → ruinas (RF-7).

## Aristas
```
calle --conecta_con--> cemento [requiere ticket_cemento]
cemento --requiere--> ticket_cemento
ticket_cemento --se_consigue_en--> disqueria
cemento --contiene--> banda_cemento
stormed --bloquea--> cemento [ruinas]
```
