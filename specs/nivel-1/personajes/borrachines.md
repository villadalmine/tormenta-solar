# PERSONAJE: Los 3 Borrachines

- **Nodo id:** `borrachines`  ·  **Tipo:** `npc`  ·  **Nivel:** 1
- **Sala(s):** 0 (calle, frente al edificio abandonado)  ·  **Estado:** Implemented

## Resumen
Los tres que **custodian el edificio abandonado**. Cada uno **tiene algo en la mano** y **quiere de
regalo otra cosa** (no lo que tiene). Te tiran cosas al azar; la **pista** se revela hablándoles.
Cuando los 3 están contentos → `borrachosHappy`: te hacen **socio VIP**, abren el edificio y te
soplan el secreto super→cueva.

## Detalle
| Borrachín | Tiene en la mano | Quiere (regalo) | Se consigue en |
|---|---|---|---|
| Del **vino** 🍷 | vino | **fiambre** (sándwich) | super chino → góndola FIAMBRES |
| De la **cerveza** 🍺 | cerveza | **Diosa Tropical** 🍹 | super chino → góndola DIOSAS |
| Del **porro** 🌬️ | porro (bajón) | **carne** (un cacho) | super chino → garca de CARNES |

- Al hablarles, **tiran cosas random** y a veces sueltan la **pista** (`hint`). Cuando le acercás
  lo que quiere, lo **detecta**, te lo agradece y deja de pedir (`fed`).
- Son **"la escoria"** → su edificio **sobrevive** a la tormenta (nadie lo quiere) = refugio.

## Aristas
```
calle --contiene--> borrachines
borrachin_vino --quiere--> fiambre
borrachin_cerveza --quiere--> diosa_tropical
borrachin_porro --quiere--> carne
borrachines --bloquea--> edificio_abandonado [hasta borrachosHappy]
borrachines --desbloquea--> edificio_abandonado [si los 3 fed]
borrachines --da--> pista_super_cueva [al hacerte VIP]
```
