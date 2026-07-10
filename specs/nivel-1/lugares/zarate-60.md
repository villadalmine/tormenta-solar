# ZÁRATE Y EL 60 — la otra punta del río (v363-v365)

Arco post-Nivel 2 que completa el mapa Campana↔Zárate (subte.md §12 era Campana; esto es la orilla de enfrente).
Dos maneras de encarar el norte, con moraleja de viajero del conurbano:

1. **EL 60 (el gag):** el tren Belgrano Norte te deja "cerca" de **Puente Saavedra** — cerca es un decir: la
   parte final es **a pie por las calles** (Av. Maipú, el cruce de la General Paz). En la parada tomás **el
   mítico 60 ramal Zárate**… y el viaje es TAN largo que te dormís y **te volvés a despertar donde empezaste**
   (la cama del búnker — el loop te reclama). Logro/gag, no progreso.
2. **EL CHEVALLIER (el lujo):** por la **Línea A** llegás a **ONCE (Plaza Miserere)** y ahí tomás el **rápido a
   Zárate**: un viaje DE LUJO — podés **caminar por el bus** con **aire acondicionado** y servicio de a bordo.
   Te baja en la **costanera de Zárate**.

En Zárate: te clavás unos **choris de la costanera**, pasás por el **club Arsenal**, y en el **club de remo**
hay TORNEO: **Campana vs Zárate en botes de competición** — y Campana le va ganando **en todas las
combinaciones** (single, doble par, cuatro, ocho). Para la ÚLTIMA carrera (el ocho, la que da el campeonato)
al equipo de Campana **le falta el TIMONEL**… y ahí entrás vos: **timoneás la final** (mini-juego de ritmo y
timón), Campana campeón, y te dan **EL TROFEO 🏆** (qué se hace con el trofeo: se verá — hook abierto, pedido
del dueño "con ese trofeo después vemos qué hacés").

```hist
{
  "id": "bondi60_loop",
  "title": "El 60 a Zárate: el viaje tan largo que te devuelve al principio",
  "title_en": "Bus 60 to Zárate: the ride so long it returns you to the start",
  "at": "plaza",
  "pre": { "nivel2Win": true },
  "sets": { "bondi60": true },
  "terminal": true,
  "hints": {
    "es": [
      "Dicen que hay un colectivo que va tan lejos que llega al principio.",
      "El tren BELGRANO NORTE (desde Retiro) te deja cerca de Puente Saavedra. Cerca… es un decir.",
      "Caminá desde la estación hasta PUENTE SAAVEDRA y esperá el 60 RAMAL ZÁRATE en la parada.",
      "Subite al 60 en Puente Saavedra [E]: el viaje es tan largo que… mejor descubrilo vos."
    ],
    "en": [
      "They say there's a bus that goes so far it arrives at the beginning.",
      "The BELGRANO NORTE train (from Retiro) leaves you near Puente Saavedra. Near… so to speak.",
      "Walk from the station to PUENTE SAAVEDRA and wait for the 60 ZÁRATE BRANCH at the stop.",
      "Board the 60 at Puente Saavedra [E]: the ride is so long that… better find out yourself."
    ]
  }
}
```

```hist
{
  "id": "zarate_llegada",
  "title": "El Chevallier de lujo: Once → la costanera de Zárate",
  "title_en": "The luxury Chevallier: Once → Zárate's riverside",
  "at": "plaza",
  "pre": { "nivel2Win": true },
  "sets": { "enZarate": true },
  "hints": {
    "es": [
      "Hay una manera VIP de ir al norte, y sale de donde llega la Línea A.",
      "Tomá la LÍNEA A del subte hasta ONCE (Plaza Miserere).",
      "En Once está la plataforma del CHEVALLIER: el rápido a Zárate, un viaje de lujo con aire acondicionado.",
      "Subite al CHEVALLIER en Once [E]: caminá por el bus si querés — te baja en la COSTANERA de Zárate."
    ],
    "en": [
      "There's a VIP way north, and it leaves from where Line A ends.",
      "Take subway LINE A to ONCE (Plaza Miserere).",
      "At Once you'll find the CHEVALLIER platform: the Zárate express, a luxury ride with A/C.",
      "Board the CHEVALLIER at Once [E]: walk around the bus if you like — it drops you at Zárate's RIVERSIDE."
    ]
  }
}
```

```hist
{
  "id": "regata_timonel",
  "title": "La regata: timoneás la final y Campana es campeón (el trofeo)",
  "title_en": "The regatta: you cox the final and Campana takes the title (the trophy)",
  "at": "plaza",
  "pre": { "enZarate": true },
  "sets": { "regataWon": true },
  "terminal": true,
  "hints": {
    "es": [
      "En el río hay un campeonato por definirse, y falta alguien en un bote.",
      "En la costanera de Zárate, pasá por el CLUB DE REMO: hay torneo Campana vs Zárate.",
      "Campana ganó todas las combinaciones, pero para la FINAL del ocho les falta el TIMONEL.",
      "Ofrecete de TIMONEL en el club de remo [E]: marcá el ritmo (¡BOGA!), esquivá las boyas y ganá la final 🏆."
    ],
    "en": [
      "On the river a championship hangs in the balance, and a boat is missing someone.",
      "At Zárate's riverside, stop by the ROWING CLUB: it's Campana vs Zárate tournament day.",
      "Campana won every class, but for the eights FINAL they're missing the COXSWAIN.",
      "Volunteer as COX at the rowing club [E]: call the stroke (¡BOGA!), dodge the buoys and win the final 🏆."
    ]
  }
}
```

## Implementación (v363-v365)

- **v363 el 60:** `tren.js` special `belgrano` (ramal "Belgrano Norte" desde Retiro): salida "a PUENTE SAAVEDRA
  (a pie)" → `js/saavedra.js` (calles: Av. Maipú → el puente sobre la Gral. Paz → la PARADA del 60; el 60 llega
  animado, [E] = subirse) → secuencia del viaje eterno ("2 horas después… 4 horas… Zzz") → game.js: arista
  `bondi60_loop` + **spawnIn(búnker)** (la cama del loop — "te volvés a despertar donde empezaste").
- **v364 Once + Chevallier:** `subte.js` gana ONCE (Línea A, celeste, `surface:'once'`, mismo gate `ts_linea_c`)
  → `js/once.js` (hall Plaza Miserere: kiosco, santería — Once es Once —, plataforma CHEVALLIER) → `js/chevallier.js`
  = EL VIAJE DE LUJO: interior del micro CAMINABLE (pasillo + asientos + ventanillas con paisaje que scrollea +
  dispenser de cortadito de a bordo + chapa "AIRE ACONDICIONADO") → baja en la costanera → arista `zarate_llegada`.
- **v365 Zárate + la regata:** `js/zarate.js` (costanera: el río, puesto de CHORIS, el club ARSENAL, el CLUB DE
  REMO con el tablero del torneo — Campana ganó single/doble/cuatro… falta la final del ocho) → [E] en el club =
  te reclutan de timonel → `js/regata.js` (mini-juego: [E] al ritmo = BOGA acelera, A/D timonea esquivando boyas;
  el bote de Zárate aprieta al final) → ganás → arista `regata_timonel` + ítem **trofeo_remo 🏆** (sin `use`:
  coleccionable — el hook "después vemos qué hacés" queda anotado en backlog).
- Flags: `ts_bondi60`, `ts_en_zarate`, `ts_regata` (FLAG_SETTERS + historiaState + worldSnapshot). Grafo 40.
