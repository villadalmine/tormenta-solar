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

## Personalidad (fuente para el generador de diálogos y el chat IA)
- **El del chori:** parrillero/canchero del arcade; te reta al Frogger por un vale de choripán. Slang,
  buena onda, hambre de gloria.
- **El flaco del Trucotron:** nerd retro del fondo oscuro; no juega "con peleles", quiere torneo de
  **FIFA 98** si traés una **Mega Drive**.
- **Dueños de Pac-Man/Galaga:** extorsivos, te cobran ficha cada vez más cara ("acá nada es gratis").
- **Qué NO dice:** no rompen la 4ª pared.
- **Personas de chat:** definibles (`chori`, `trucotron`), pero su data clave (vale / FIFA) va por
  **acción scripteada**.
- **Semilla para el script:** «pibes de arcade ochentoso: el del chori, el nerd del Trucotron, los
  dueños extorsivos de las máquinas».

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
