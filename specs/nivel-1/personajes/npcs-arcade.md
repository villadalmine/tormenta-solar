# PERSONAJE: NPCs del Arcade (el del chori / el del Trucotron)

- **Nodo id:** `npc_chori`, `npc_trucotron`  ·  **Tipo:** `npc`  ·  **Nivel:** 1
- **Sala(s):** 4 (arcade)  ·  **Estado:** Implemented

## Resumen
Dos quest-givers dentro del arcade. Uno te da un **vale de choripán** si ganás el Frogger; el otro
te corre un **torneo de FIFA** si trajiste una **Mega Drive**.

## Detalle
- **El del chori** (`action:'frogger'`): te manda a jugar **Frogger**; si ganás → **`vale_chori`**
  (se canjea en la chorería por un choripán +vida).
- **El flaco del Trucotron** (`action:'fifa'`): si tenés **`mega_drive`** (la comprás en el super,
  sección CONSOLAS), jugás el **torneo de FIFA 98** → `fifaWon` + **30 monedas**. Si no, te manda a
  conseguir la consola.
- Los **dueños** de las máquinas (Pac-Man/Galaga) te cobran ficha cada vez más cara (flavor).

## Aristas
```
arcade --contiene--> npc_chori
arcade --contiene--> npc_trucotron
npc_chori --da--> vale_chori [si ganás Frogger]
vale_chori --se_consigue_en--> arcade
npc_trucotron --requiere--> mega_drive
npc_trucotron --da--> fifaWon [+30 monedas]
mega_drive --se_consigue_en--> super_chino
```
