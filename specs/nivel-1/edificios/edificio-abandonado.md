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
- **Pisos impares (lujo):** depto top (cocina, baño, living con tele, joyas, **maletín de dólares**).
  Un **linyera** cuida las **joyas**: si las **tocás (E)**, sale, te suelta su filosofía
  (*"corréte que me tapás el sol"*) y **te raja a la calle** (`ejectToStreet`). Loot: monedas.
- **Pisos pares (ruina) — con VARIANTES (cada piso distinto):**
  - **Muebles rotos** que cambian por piso, de un pool: `escombros`, `tele_rota`, `bano_roto`
    (con agua chorreando), `mueble_roto`, `sillon_roto`, `barril`, `caja`. Posiciones que rotan.
  - **2–4 linyeras tirados** (mezcla `yonqui`/`linyera`) en **posiciones distintas por piso**, y
    **cada uno dice una frase distinta** (pool `RUINA_LINES`, 18 líneas). Ver
    [`personajes/linyeras.md`](../personajes/linyeras.md) para las reglas de variación.
  - Pickup: vida.
- **Piso 19:** además del depto, el **tótem sagrado de 3 monos** (`totem_monos`, Monkey Island).
  Robarlo (`action:'totem'`) → **20 linyeras** te hacen **gurú** → `bunkerUnlocked`.
- **Piso 20:** **puerta secreta** al **BÚNKER** (sala 34), solo visible/usable con `bunkerUnlocked`.
  El búnker = lugar más seguro, sin enemigos; adentro, el **catre** (`action:'loop'`) dispara el
  **loop** (reinicia el nivel; `loopCount` persiste). Ver `conexiones-secretas-y-refugios.md`.
- **Post-tormenta:** **sobrevive** (nadie lo quiere) → refugio.

## Aristas
```
calle --conecta_con--> edificio_abandonado [bloqueado por borrachines]
borrachines --bloquea--> edificio_abandonado [hasta borrachosHappy]
borrachines --desbloquea--> edificio_abandonado [si 3 contentos]
edificio_abandonado --contiene--> linyera [guardián joyas (impares) + tirados (pares)]
linyera --bloquea--> joyas [te raja a la calle]
edificio_abandonado --contiene--> totem_monos [piso 19]
totem_monos --desbloquea--> bunkerUnlocked
edificio_abandonado --conecta_con--> bunker [secreta, requiere bunkerUnlocked, piso 20]
bunker --da--> loop
```
