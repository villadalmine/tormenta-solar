# EDIFICIO: Cemento (recital under)

- **Nodo id:** `cemento`  ·  **Tipo:** `edificio`  ·  **Nivel:** 1
- **Sala(s):** 12  ·  **Estado:** Implemented

## Resumen
El reducto under: **Almafuerte/Iorio** en prueba de sonido, humo y olor a asado. **Cerradura**: solo
entrás con el **`ticket_cemento`** que comprás en la disquería. Música **metal**.

## Detalle
- **Iorio**, guitarrista, bajista, baterista (flavor + chiste). **Asador** con choripán de la previa.
- Gating: la puerta en la calle **requiere `hasCementoTicket`** (si no, no aparece/usable).
- **En el LOOP, Iorio es clave:** le pedís ayuda, te pide **falopa**, y si se la das **toca Pibe
  Tigre** → los **ninjas metaleros** dejan el chino → **front del chino abierto**. Ver
  [`iorio.md`](../personajes/iorio.md) y [`../loop-supervivencia.md`](../loop-supervivencia.md).
- **Post-tormenta:** la fachada colapsa, pero **adentro Iorio sigue** (el reducto under aguanta).

## Aristas
```
calle --conecta_con--> cemento [requiere ticket_cemento]
cemento --requiere--> ticket_cemento
ticket_cemento --se_consigue_en--> disqueria
cemento --contiene--> banda_cemento
cemento --contiene--> iorio
cemento --sobrevive--> stormed [el under aguanta; Iorio es clave en el loop]
```
