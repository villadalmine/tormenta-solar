# PERSONAJE: Los 3 Cueveros (arbolitos)

- **Nodo id:** `cueveros`  ·  **Tipo:** `npc`  ·  **Nivel:** 1
- **Sala(s):** 8 (Las Cuevas del dólar)  ·  **Estado:** Implemented

## Resumen
Los tres que cambian dólares en la cueva. Dos te **rebotan**; el tercero te **cambia... y justo ahí
estalla la tormenta solar**. Es el **punto de quiebre** de la historia del nivel.

## Detalle
- **Cuevero 1 (`coins`):** *"venís cargado de monedas, eso te marca, no te cambio"*. Rebote.
- **Cuevero 2 (`garca`):** *"tenés cara de garca, andá a otro lado"*. Rebote.
- **Cuevero 3 (`real`):** *"dale, vení que te los cambio, tranqui..."* → te cambia y **dispara
  `stormed`**. (Es "el arbolito que te cagó".)
- Más tarde le **recuperás +60 monedas** entrando por la **puerta secreta del super**
  (`moneyRecovered`, los borrachines te soplan el dato).

## Aristas
```
cuevas_dolar --contiene--> cueveros
cuevero_3 --desbloquea--> stormed
super_chino --da--> moneyRecovered [le sacás +60 al cuevero 3]
```
