# PERSONAJE: NPCs del Arcade (el del chori / el del Trucotron)

- **Nodo id:** `npc_chori`, `npc_trucotron`  ·  **Tipo:** `npc`  ·  **Nivel:** 1
- **Sala(s):** 4 (arcade)  ·  **Estado:** Implemented

## Resumen
Dos quest-givers dentro del arcade. Uno te da un **vale de choripán** si ganás el Frogger; el otro
te corre un **torneo de FIFA** si trajiste una **Mega Drive**.

## Detalle
- **El del chori** (`action:'frogger'`): te manda a jugar **Frogger**; si ganás → **`vale_chori`**
  (se canjea en la chorería por un choripán +vida).
- **El flaco del Trucotron** (`action:'fifa'`, flag `consolaGuy`): si tenés **`mega_drive`** (la comprás
  en el super, sección CONSOLAS), jugás el **torneo de FIFA 98** → `fifaWon` + **30 monedas**. Si no, te
  manda a conseguir la consola.
  - **Doble rol — QUEST DEL CHIP (`specs/telo-chip-quest.md`):** este mismo flaco es el `consolaGuy` que
    le da la **consola retro** al pibe de Garbarino para correr el troyano. **Prereq (v231):** NO te la da
    si antes no **ganaste el FIFA 98** (`fifaWon`); mientras tanto el quest del chip no lo intercepta y corre
    su `action:'fifa'` normal (te pide la Mega Drive). Recién con el FIFA ganado entrega la consola.
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

## Grafo de historia (lo lee `tools/gen-historia.mjs` → ver [historia-grafo.md](../historia-grafo.md))
```hist
{
  "id": "fifa",
  "title": "Ganar el torneo de FIFA 98 (con la Mega Drive)",
  "at": "arcade",
  "pri": 21,
  "pre": { "hasMegaDrive": true },
  "sets": { "fifaWon": true },
  "hints": {
    "es": [
      "Hay un flaco en el fondo del arcade que solo juega si le traés su consola...",
      "Al del TRUCOTRON le pica el FIFA: con la consola justa, te arma un torneo.",
      "Llevá la Mega Drive al TRUCOTRON del arcade y ganale el torneo de FIFA 98: +30 monedas.",
      "¡Enchufá la MEGA DRIVE en el TRUCOTRON y GANÁ el FIFA 98! Te llevás 30 monedas, listo."
    ],
    "en": [
      "There's a guy in the back of the arcade who'll only play if you bring him his console...",
      "The TRUCOTRON guy's itching for FIFA: with the right console he sets up a tournament.",
      "Take the Mega Drive to the TRUCOTRON at the arcade and win the FIFA 98 tournament: +30 coins.",
      "Plug the MEGA DRIVE into the TRUCOTRON and WIN FIFA 98! You pocket 30 coins, done."
    ]
  }
}
```
