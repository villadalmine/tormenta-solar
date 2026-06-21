# EDIFICIO: Arcade de Lavalle (+ lugar secreto + trastienda)

- **Nodo id:** `arcade`  ·  **Tipo:** `edificio`  ·  **Nivel:** 1
- **Sala(s):** 4 (arcade), 9 (lugar secreto), 10 (trastienda truco)  ·  **Estado:** Implemented

## Resumen
Salón de máquinas. 4 juegos jugables; ganándolos se abre una **puerta secreta** al fondo que lleva
a la sala de humo y de ahí a la **trastienda del truco** (el Tahúr).

## Detalle
- **Máquinas:** Pac-Man, Galaga, **Frogger** (da `vale_chori`), **Trucotron**. Los dueños te cobran
  ficha (cada vez más cara).
- **El del chori** (`action:'frogger'`): te manda a jugar Frogger; si ganás, **vale de choripán**.
- **El flaco del Trucotron** (`action:'fifa'`): torneo de FIFA 98 **si tenés Mega Drive**.
- **Puerta secreta** (`secret`): se habilita ganando **Pac-Man + Galaga + Frogger**
  (`secretUnlocked`) → sala 9 (humo, naiperos) → sala 10 (**Tahúr**, truco).
- **Post-tormenta:** colapsa → ruinas (RF-7).

## Aristas
```
calle --conecta_con--> arcade
arcade --contiene--> npc_chori
arcade --contiene--> npc_trucotron
arcade --conecta_con--> lugar_secreto [secreta, requiere secretUnlocked]
lugar_secreto --conecta_con--> trastienda_truco
ganar_pacman & ganar_galaga & ganar_frogger --desbloquea--> secretUnlocked
npc_chori --da--> vale_chori [si ganás Frogger]
npc_trucotron --da--> fifaWon [requiere mega_drive]
trastienda_truco --contiene--> tahur
stormed --bloquea--> arcade [ruinas]
```
