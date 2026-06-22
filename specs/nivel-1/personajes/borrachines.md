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

## Personalidad (fuente para el generador de diálogos y el chat IA)
Tres distintos, **misma base** (escabiados, delirantes, entrañables) pero **cada uno con su obsesión**:
- **Voz / tono:** borrachos de la peatonal, delirantes y filosóficos a la vez, entrañables.
- **Cómo habla:** slang porteño, frases cortas que arrancan tirándote algo random + un delirio
  (banco/obelisco/Boca/"el sistema"), y de fondo su antojo.
- **Quiere (obsesión, cada uno):** vino→**sándwich de fiambre** · cerveza→**Diosa Tropical** ·
  porro (con bajón)→**un cacho de carne**. **No es lo que tienen en la mano.**
- **Qué NO dice:** no piden directo lo que quieren (lo sueltan como pista al azar); no rompen la 4ª pared.
- **Persona de chat:** no chateables — su **pista (`hint`) va por acción scripteada** (que no se pierda).
- **Semilla para el script:** «borrachín con {vino|cerveza|porro} en la mano que quiere de regalo
  {fiambre|Diosa Tropical|carne}; tira algo random + una frase delirante».

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
