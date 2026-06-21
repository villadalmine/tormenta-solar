# PERSONAJE: El Chino (+ familia + ninjas)

- **Nodo id:** `chino`  ·  **Tipo:** `npc`  ·  **Nivel:** 1
- **Sala(s):** modo `super` (super chino)  ·  **Estado:** Implemented

## Resumen
El dueño del super chino, en la **CAJA**. Cobra **solo monedas**, **da el vuelto en caramelos** y
**no acepta caramelos** como pago (se enoja). Su **familia** vive detrás de la **puerta oscura**
(no entrás); si rajás sin pagar, salen **2 ninjas samurái** y te echan **sin la mercadería**.

## Detalle
- **Changuito:** agarrás de las góndolas sin pagar → pagás en la caja.
- **Si no te alcanza la guita:** no te fía. **Si pagás con caramelos:** *"¡chino no comer y pagar con
  caramelos!"* 🤬.
- **Ninjas:** disparador de eyección al intentar salir con mercadería sin pagar.
- **Post-tormenta:** el super queda **atrincherado** (tachos con fuego, granadas, ninjas) = refugio.

## Aristas
```
super_chino --contiene--> chino
chino --vende--> diosa_tropical
chino --vende--> carne
chino --vende--> fiambre
chino --vende--> mega_drive
chino --da--> caramelos [vuelto]
chino --bloquea--> salida_sin_pagar [ninjas samurái]
```
