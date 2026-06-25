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

## Personalidad (fuente para el generador de diálogos y el chat IA)
- **Voz / tono:** arbolito desconfiado, canchero, ojo clínico para "marcar" al cliente.
- **Cómo habla:** slang porteño, frases cortas, indirectas sobre la guita, la inflación y la
  desconfianza ("tenés cara de garca", "¿no serás de la AFIP?").
- **Contexto (qué sabe):** el cambio ilegal, los precios, el quilombo cambiario; NO confía en nadie nuevo.
- **Quiere:** cambiar (o no) sin marcar; cuidar la suya.
- **Qué NO dice:** nada de que es ilegal-ilegal en voz alta; no rompe la 4ª pared.
- **Persona de chat:** `cuevero`.
- **Tormenta:** post-tormenta el dólar vale cualquier cosa y él aprovecha el caos; más desconfiado que nunca.
- **Semilla para el script:** «cuevero/arbolito que rebota o atiende, desconfiado, indirectas sobre
  dólar e inflación».

### Pools que alimenta (los lee `tools/gen-dialogos.mjs`)
```gen
pool: cuevero_rebote
n: 6
seed: cuevero (arbolito) que NO te cambia y te rebota con una excusa desconfiada (cara de garca, AFIP, etc.)
```
```gen
pool: cueva_gente
n: 10
seed: persona esperando adentro de una cueva ilegal de venta de dólares; justifica el ahorro en dólares (es para el hijo, el peso no sirve, sin dólares el país se va a la mierda)
```

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

## Grafo de historia (lo lee `tools/gen-historia.mjs` → ver [historia-grafo.md](../historia-grafo.md))
```hist
{
  "id": "tormenta",
  "title": "Disparar la tormenta solar",
  "at": "cueva",
  "pre": {},
  "sets": { "stormed": true },
  "hints": {
    "es": [
      "El verde se compra abajo, donde no llega el sol... pero el sol igual te encuentra, pibe.",
      "¿Nunca bajaste del todo a la cueva? El negocio de verdad está en la del fondo.",
      "Andá a la cueva del fondo y cambiale los dólares al arbolito: ahí arranca TODO.",
      "¡Que bajes a la CUEVA DEL FONDO y CAMBIES, carajo! ¿Te lo dibujo?"
    ],
    "en": [
      "The green's bought down below, where the sun don't reach... but the sun finds you anyway, kid.",
      "You never went all the way down to the cueva? The real deal's in the back one.",
      "Go to the back cueva and change your dollars with the arbolito: that's where it ALL kicks off.",
      "Go DOWN to the BACK CUEVA and CHANGE already, damn it! Want me to draw you a map?"
    ]
  }
}
```
