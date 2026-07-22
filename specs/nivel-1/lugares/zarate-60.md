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
timón), Campana campeón, y te dan **EL TROFEO 🏆**.

**EL TROFEO A CASA (v366 — cierra el hook "con ese trofeo después vemos qué hacés"):** el trofeo se ganó PARA
Campana, así que vuelve a Campana: se lo **mostrás al TANO** (el hincha viejo de la calle del estadio) → se le
empañan los ojos y te manda a la **VITRINA de la sede del club** → lo **depositás** [E]: queda **expuesto para
siempre** (cada vez que volvés a Campana, ahí brilla), la banda te festeja y el club te nombra **socio honorario**
(+80 🪙). El coleccionable se transforma en un pedazo permanente del mundo.

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

```hist
{
  "id": "trofeo_tano",
  "title": "El trofeo a casa: se lo mostrás al Tano en Campana",
  "title_en": "The trophy comes home: you show it to el Tano in Campana",
  "at": "plaza",
  "npc": "violeta",
  "pre": { "regataWon": true },
  "sets": { "trofeoTano": true },
  "hints": {
    "es": [
      "Ese trofeo no se ganó para vos. Hay alguien que tiene que verlo.",
      "El trofeo es DE CAMPANA: volvé a Campana (el maquinista de Villa Ballester te lleva).",
      "En la calle del estadio de Campana anda el TANO, el hincha viejo del termo. Él tiene que ver esto.",
      "Con el trofeo 🏆 encima, apretá [E] frente al TANO en Campana: mostráselo."
    ],
    "en": [
      "That trophy wasn't won for you. Someone has to see it.",
      "The trophy belongs to CAMPANA: go back to Campana (the Villa Ballester engineer takes you).",
      "On Campana's stadium street you'll find el TANO, the old fan with the thermos. He has to see this.",
      "With the trophy 🏆 on you, press [E] in front of el TANO in Campana: show it to him."
    ]
  }
}
```

```hist
{
  "id": "trofeo_vitrina",
  "title": "El trofeo queda en la vitrina del club — socio honorario",
  "title_en": "The trophy goes in the club's trophy case — honorary member",
  "at": "plaza",
  "pre": { "trofeoTano": true },
  "sets": { "trofeoVitrina": true },
  "terminal": true,
  "hints": {
    "es": [
      "Hay un estante vacío esperando algo que brille.",
      "El Tano dijo que el trofeo va DERECHO a la vitrina de la sede, en Campana.",
      "La vitrina de la SEDE de Villa Dálmine está en la misma calle del estadio, cerca de la estación.",
      "Con el trofeo 🏆 y la bendición del Tano, apretá [E] en la VITRINA de la sede: dejalo en casa."
    ],
    "en": [
      "There's an empty shelf waiting for something shiny.",
      "El Tano said the trophy goes STRAIGHT to the clubhouse trophy case, in Campana.",
      "Villa Dálmine's CLUBHOUSE case is on the stadium street itself, near the station.",
      "With the trophy 🏆 and el Tano's blessing, press [E] at the clubhouse CASE: bring it home."
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

## Implementación (v366 — EL TROFEO A CASA)

- **`js/campana.js`:** `create(opts)` gana `{trofeo, tanoDone, enVitrina}`. Con trofeo, el **1er [E] al TANO**
  es el beat guionado (patrón del cura v358; después chat IA normal) → one-shot `tanoEdge`. Edificio nuevo
  **SEDE V. DÁLMINE** con vitrina (`vitrina = {x:3.2, y:9.4}`, cerca de la estación): [E] deposita → one-shot
  `vitrinaEdge` + festejo (`celebrateT` 7s: banda salta + banner). Con `enVitrina` el 🏆 se dibuja SIEMPRE
  (glow + placa dentro del vidrio — la placa a `sy2-2`, a `+12` pisaba el canto). Guardas: vitrina sin Tano →
  "la llave la tiene él"; vitrina llena → mensaje contemplativo, sin re-disparo.
- **`js/game.js`:** `enterCampana` pasa los opts (trofeo = inventario ∧ !ts_trofeo_vitrina); dispatch:
  `tanoEdge` → `applyEdge('trofeo_tano')`; `vitrinaEdge` → `applyEdge('trofeo_vitrina')` + saca `trofeo_remo`
  del inventario + **+80 🪙** + `tel('win',{result:'vitrina'})`. Flags `ts_trofeo_tano`/`ts_trofeo_vitrina`
  en FLAG_SETTERS + historiaState + worldSnapshot. Debug `trofeoYa`.
- **Grafo 42:** aristas `trofeo_tano` (pre regataWon) y `trofeo_vitrina` (pre trofeoTano, terminal);
  `regata_timonel` dejó de ser terminal. e2e `trofeo-vitrina:ok` + verificación Chromium real caminando.
