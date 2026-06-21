# EDIFICIO: Edificio abandonado de los borrachines (+ búnker)

- **Nodo id:** `edificio_abandonado`  ·  **Tipo:** `edificio`  ·  **Nivel:** 1
- **Sala(s):** 14–33 (pisos 1–20). Piso `n` = sala `13+n`  ·  **Estado:** Implemented (búnker: Draft)

## Resumen
El edificio de 20 pisos que **custodian los 3 borrachines**. Cerrado hasta hacerte **socio VIP**
(`borrachosHappy`). Impares = **lujo**, pares = **ruina**. En el piso 19 está el **tótem de 3 monos**
que abre el **búnker** del piso 20 (refugio / loop).

## Detalle
- **Gating:** los borrachines **bloquean** la entrada hasta darles los 3 regalos → `borrachosHappy`
  → edificio abierto + pista del super→cueva.
- **Pisos impares (lujo):** depto top (cocina, baño, living con tele, joyas, **maletín de dólares**)
  cuidado por un **linyera filósofo** que te frena (*"corréte que me tapás el sol"*). Loot: monedas.
- **Pisos pares (ruina):** escombros, yonquis tirados.
- **Piso 19:** además del depto, el **tótem sagrado de 3 monos** (Monkey Island). Robarlo →
  **20 linyeras** te hacen **gurú** → `bunkerUnlocked`.
- **Piso 20:** **puerta secreta** al **BÚNKER** (cuando `bunkerUnlocked`). El búnker = lugar más
  seguro; adentro, el **loop** (reinicia el nivel). Ver `conexiones-secretas-y-refugios.md`.
- **Post-tormenta:** **sobrevive** (nadie lo quiere) → refugio.

## Aristas
```
calle --conecta_con--> edificio_abandonado [bloqueado por borrachines]
borrachines --bloquea--> edificio_abandonado [hasta borrachosHappy]
borrachines --desbloquea--> edificio_abandonado [si 3 contentos]
edificio_abandonado --contiene--> linyera
edificio_abandonado --contiene--> totem_monos [piso 19]
totem_monos --desbloquea--> bunkerUnlocked
edificio_abandonado --conecta_con--> bunker [secreta, requiere bunkerUnlocked, piso 20]
bunker --da--> loop
```
