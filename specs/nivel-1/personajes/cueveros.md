# PERSONAJE: Los 3 Cueveros (arbolitos)

- **Nodo id:** `cueveros`  ·  **Tipo:** `npc`  ·  **Nivel:** 1
- **Sala(s):** 8 (Las Cuevas del dólar)  ·  **Estado:** Implemented

## Resumen
Los tres que cambian dólares. En el **hall** (sala 8) cada cuevero **te invita a pasar a SU cueva**
(`c.to` → `handleCuevero` te lleva a una sala aparte). Cada cueva (salas **35/36/37**) tiene el
**aspecto de cueva ilegal** con **gente esperando** a la que podés hablar. Dos te **rebotan**; el
tercero te **cambia... y justo ahí estalla la tormenta solar**.

## Detalle
- **Hall (sala 8):** 3 cueveros que **invitan** (no hacen el deal ahí). *"Dale, pasá pibe..."*
- **Cueva 1 (sala 35, `coins`):** rebote *"venís cargado, te marca"*. Gente: *"es para mi hijo"*, etc.
- **Cueva 2 (sala 36, `garca`):** rebote *"tenés cara de garca"*. Gente: *"vengo todos los meses"*, etc.
- **Cueva 3 (sala 37, `real`):** *"dale, vení que te los cambio..."* → te cambia y **dispara
  `stormed`**. (El "arbolito que te cagó".)
- **Gente esperando** (en las 3 cuevas): dicen cosas tipo *"todo legal, es para mi hijo"*, *"si no
  ahorro dólares el país se va a la mierda"*, *"en el peso no confío ni loco, verde o nada"*.
- Más tarde le **recuperás +60 monedas** entrando por la **puerta secreta del super**
  (`moneyRecovered`).

## Aristas
```
cuevas_dolar --contiene--> cueveros [hall: invitan]
cuevero_1 --conecta_con--> cueva_1 [sala 35]
cuevero_2 --conecta_con--> cueva_2 [sala 36]
cuevero_3 --conecta_con--> cueva_3 [sala 37]
cueva_3 --desbloquea--> stormed [el deal real]
cueva_N --contiene--> gente_esperando ["es para mi hijo / sin dólares el país se va a la mierda"]
super_chino --da--> moneyRecovered [le sacás +60 al cuevero 3]
```
