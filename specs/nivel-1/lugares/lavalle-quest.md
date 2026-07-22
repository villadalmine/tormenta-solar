# QUEST: Calle Lavalle — el piquete, el Obelisco y el satélite (E4)

- **Nodo id:** `lavalle-quest`  ·  **Tipo:** `quest`  ·  **Nivel:** 1
- **Lugar:** sub-modo Lavalle (`js/lavalle.js`) + el Obelisco (`js/obelisco.js`)  ·  **Estado:** Implemented (v280)

El arco completo de Lavalle como CADENA del grafo (specs/lavalle.md E1-E3): ganar los 5 mini-juegos del piquete →
jurarle lealtad al General con el linyera peronista (se abre la barricada) → cruzar a la Plaza de la República →
volver con la TORMENTA activa y herir al SATÉLITE REBELDE con el rayo solar. Los flags persisten en localStorage
(sobreviven loops — es progresión de zona, no del loop diario).

```hist
{
  "id": "piquete_juegos",
  "title": "Ganar los 5 mini-juegos del piquete",
  "title_en": "Win the 5 picket mini-games",
  "at": "calle",
  "pre": {},
  "sets": { "piqueteCampeon": true },
  "hints": {
    "es": [
      "Dicen que a la izquierda de la esquina hay fiesta, fuego y juegos… y un premio para el que gane TODO.",
      "En el piquete de Lavalle hay 5 desafíos (el corte, la soga, el bombo, la olla, la pancarta). Ganalos.",
      "Doblá a la IZQUIERDA en la calle → el piquete. Ganá los 5 mini-juegos ([E] en la barricada, abajo a los costados, la olla y la derecha).",
      "¡Andá a LAVALLE (borde izquierdo de la calle) y GANÁ LOS 5 MINI-JUEGOS del piquete! Cada punto con [E]: corte, soga, bombo, olla y pancarta."
    ],
    "en": [
      "They say left of the corner there's a party, fire and games… and a prize for whoever wins it ALL.",
      "The Lavalle picket has 5 challenges (the blockade, the tug, the drum, the pot, the banner). Win them.",
      "Turn LEFT on the street → the picket. Win the 5 mini-games ([E] at the barricade, bottom sides, the pot and the right).",
      "GO TO LAVALLE (left edge of the street) and WIN THE 5 MINI-GAMES! Each spot with [E]: blockade, tug, drum, pot and banner."
    ]
  }
}
```

```hist
{
  "id": "piquete_juramento",
  "title": "El juramento al General (se abre la barricada)",
  "title_en": "The oath to the General (the barricade opens)",
  "at": "lavalle",
  "pre": { "piqueteCampeon": true },
  "sets": { "juramento": true },
  "hints": {
    "es": [
      "Ganaste todo… y ahora la barricada tiene un hueco que brilla. Alguien espera una palabra tuya.",
      "El piquete te reconoce: subí al hueco del corte. El linyera peronista tiene una pregunta para vos.",
      "Subí al HUECO de la barricada (arriba, centro) y apretá [E]: el juramento de lealtad al General.",
      "¡Andá al HUECO del corte (arriba al centro del piquete) y apretá [E] para JURAR! Arranca la Marcha y se abre el paso."
    ],
    "en": [
      "You won it all… now the barricade has a glowing gap. Someone awaits a word from you.",
      "The picket knows you: go up to the gap. The Peronist hobo has a question for you.",
      "Go up to the GAP in the barricade (top center) and press [E]: the oath of loyalty to the General.",
      "GO TO THE GAP (top center of the picket) and press [E] to SWEAR! The March plays and the way opens."
    ]
  }
}
```

```hist
{
  "id": "obelisco_llegada",
  "title": "Cruzar el corte: la Plaza de la República",
  "title_en": "Cross the picket line: Plaza de la República",
  "at": "lavalle",
  "pre": { "juramento": true },
  "sets": { "obeliscoLlegado": true },
  "hints": {
    "es": [
      "Del otro lado del corte, algo enorme y blanco toca el cielo.",
      "El paso está abierto: seguí derecho por el hueco, hacia arriba.",
      "Cruzá el HUECO de la barricada caminando hacia ARRIBA: llegás a la Plaza de la República, al pie del Obelisco.",
      "¡SUBÍ por el hueco del corte y CRUZÁ! Del otro lado te espera el OBELISCO (y hablá con el cuidador)."
    ],
    "en": [
      "On the other side of the blockade, something huge and white touches the sky.",
      "The way is open: go straight through the gap, upward.",
      "Cross the barricade GAP walking UP: you reach Plaza de la República, at the foot of the Obelisk.",
      "GO UP through the gap and CROSS! The OBELISK awaits on the other side (talk to the keeper)."
    ]
  }
}
```

```hist
{
  "id": "satelite_herido",
  "title": "Herir al satélite rebelde (el rayo solar)",
  "title_en": "Wound the rogue satellite (the solar ray)",
  "at": "lavalle",
  "pre": { "obeliscoLlegado": true, "stormed": true },
  "sets": { "sateliteHerido": true },
  "hints": {
    "es": [
      "El cuidador lo dijo: cuando la tormenta pegue de nuevo, acá pasa algo grande. Mirá el cielo.",
      "Con la TORMENTA activa, volvé al Obelisco: el puntito rojo ya no está tan lejos…",
      "Post-tormenta, cruzá el corte de nuevo: el SATÉLITE bajó. Esquivá su rayo rojo y devolvele con [E].",
      "¡Con la tormenta ACTIVA andá al OBELISCO y PELEÁ: esquivá el rayo rojo telegrafiado y fritalo con [E], el RAYO SOLAR!"
    ],
    "en": [
      "The keeper said it: when the storm hits again, something big happens here. Watch the sky.",
      "With the STORM active, return to the Obelisk: the red dot isn't so far anymore…",
      "Post-storm, cross the blockade again: the SATELLITE came down. Dodge its red beam and fire back with [E].",
      "With the storm ACTIVE go to the OBELISK and FIGHT: dodge the telegraphed red beam and fry it with [E], the SOLAR RAY!"
    ]
  }
}
```

## Puente al NIVEL 2 (specs/subte.md §7/§10) — el subte lleva a PLAZA DE MAYO

Tras herir al satélite, la muchachada te manda a la Casa Rosada; la boca del subte de Lavalle aparece en el
piquete y viajás (Catedral/Línea D) a **Plaza de Mayo**, el arranque del Nivel 2.
```hist
{
  "id": "plaza_llegada",
  "title": "Llegar a Plaza de Mayo (el Nivel 2)",
  "title_en": "Reach Plaza de Mayo (Level 2)",
  "at": "lavalle",
  "pre": { "sateliteHerido": true },
  "sets": { "enPlaza": true },
  "hints": {
    "es": [
      "Con el satélite herido, la muchachada te manda a la Casa Rosada… ¿cómo llegás?",
      "Apareció una boca de subte en el piquete: bajá y viajá.",
      "En el piquete hay una BOCA DE SUBTE (Línea C). Bajá, viajá hasta CATEDRAL y salís en Plaza de Mayo.",
      "¡Bajá al SUBTE en el piquete, viajá a CATEDRAL (Línea D) y aparecés en PLAZA DE MAYO — el Nivel 2!"
    ],
    "en": [
      "With the satellite wounded, the crowd sends you to the Casa Rosada… how do you get there?",
      "A subte entrance appeared in the picket: go down and travel.",
      "There's a SUBTE ENTRANCE in the picket (Line C). Go down, ride to CATEDRAL and come up at Plaza de Mayo.",
      "Take the SUBTE at the picket, ride to CATEDRAL (Line D) and you arrive at PLAZA DE MAYO — Level 2!"
    ]
  }
}
```

En Plaza de Mayo (Nivel 2, arco sanmartiniano): entrás a la TUMBA DE SAN MARTÍN (Catedral) → tomás el CHIP DEL
LIBERTADOR → lo armás en la PIRÁMIDE DE MAYO → señal a los satélites → liberación mundial. (specs/subte.md §10.1)
```hist
{
  "id": "escarapela",
  "title": "Repicar la campana del Cabildo → la escarapela (French & Beruti)",
  "title_en": "Ring the Cabildo bell → the cockade (French & Beruti)",
  "at": "plaza",
  "pre": { "enPlaza": true },
  "sets": { "escarapela": true },
  "hints": {
    "es": [
      "En la Plaza de Mayo, el CABILDO (oeste) guarda algo del 25 de Mayo de 1810.",
      "Entrá al Cabildo y tocá la CAMPANA de la torre.",
      "Al repicar caen ESCARAPELAS celestes y blancas — agarrá una.",
      "Con la escarapela, al salir aparecen los granaderos y DOMINGO FRENCH y ANTONIO BERUTI: hablales [E] (te cuentan de Mayo de 1810)."
    ],
    "en": [
      "At Plaza de Mayo, the CABILDO (west) holds something from May 25th, 1810.",
      "Enter the Cabildo and ring the tower BELL.",
      "As it rings, blue-and-white COCKADES fall — grab one.",
      "With the cockade, on your way out the grenadiers appear with DOMINGO FRENCH and ANTONIO BERUTI: talk to them [E] (they tell you about May 1810)."
    ]
  }
}
```
```hist
{
  "id": "sanmartin_chip",
  "title": "Conseguir el CHIP del Libertador (tumba de San Martín)",
  "title_en": "Get the Liberator's CHIP (San Martín's tomb)",
  "at": "plaza",
  "pre": { "enPlaza": true },
  "sets": { "sanmartinChip": true },
  "hints": {
    "es": [
      "En Plaza de Mayo, la IA tomó el satélite. ¿Con qué la volteás?",
      "Una Madre te dijo: solo el CHIP DE SAN MARTÍN puede activar la Pirámide.",
      "Entrá a la CATEDRAL (norte de la plaza): adentro está la TUMBA DE SAN MARTÍN.",
      "En la tumba de San Martín, caminá hasta el sarcófago y [E]: tomá el CHIP AI DEL LIBERTADOR."
    ],
    "en": [
      "At Plaza de Mayo, the AI seized the satellite. What can take it down?",
      "A Mother told you: only SAN MARTÍN'S CHIP can power the Pyramid.",
      "Enter the CATHEDRAL (north of the plaza): San Martín's TOMB is inside.",
      "In San Martín's tomb, walk up to the sarcophagus and [E]: take the LIBERATOR'S AI CHIP."
    ]
  }
}
```
```hist
{
  "id": "nivel2_liberacion",
  "title": "Armar la Pirámide → liberación sanmartiniana (ganar el Nivel 2)",
  "title_en": "Arm the Pyramid → San Martín liberation (win Level 2)",
  "at": "plaza",
  "pre": { "sanmartinChip": true },
  "sets": { "nivel2Win": true, "lineaC": true },
  "hints": {
    "es": [
      "Tenés el chip del Libertador. ¿Dónde se arma el dispositivo anti-IA?",
      "La PIRÁMIDE DE MAYO (centro de la plaza) es el dispositivo. Llevá el chip ahí.",
      "Parate en la Pirámide y SOSTENÉ [E]: la señal de San Martín tiene que vencer a la IA.",
      "¡Sostené [E] en la Pirámide hasta que el haz suba a los satélites — proceso sanmartiniano de liberación mundial!"
    ],
    "en": [
      "You have the Liberator's chip. Where do you arm the anti-AI device?",
      "The PIRÁMIDE DE MAYO (center of the plaza) is the device. Bring the chip there.",
      "Stand at the Pyramid and HOLD [E]: San Martín's signal must overpower the AI.",
      "Hold [E] at the Pyramid until the beam rises to the satellites — San Martín process of worldwide liberation!"
    ]
  }
}
```

Ganar el Nivel 2 habilita la **Línea C** entera del subte (une Retiro ↔ Constitución). Desde cualquier estación
podés viajar a **Constitución**, la gran terminal del Roca (hall, molinetes de tren, locales — por ahora mock).
Es el arranque de la expansión de la red ferroviaria (subte.md §11).

```hist
{
  "id": "constitucion_llegada",
  "title": "Llegar a la terminal Constitución (Línea C, tren Roca)",
  "title_en": "Reach Constitución terminal (Line C, Roca railway)",
  "at": "plaza",
  "pre": { "lineaC": true },
  "sets": { "enConstitucion": true },
  "terminal": true,
  "hints": {
    "es": [
      "Ganaste el Nivel 2: se habilitó la LÍNEA C. Bajá al subte.",
      "En el andén, con la SUBE, abrí el menú de viaje.",
      "Viajá a CONSTITUCIÓN: la escalera de esa estación sube a la terminal del Roca.",
      "Recorré el hall de Constitución: el reloj, los molinetes del tren, los locales (mock por ahora)."
    ],
    "en": [
      "You beat Level 2: LINE C is now open. Head down to the subway.",
      "On the platform, with the SUBE, open the travel menu.",
      "Travel to CONSTITUCIÓN: that station's stairs lead up to the Roca terminal.",
      "Explore the Constitución hall: the clock, the train turnstiles, the shops (mock for now)."
    ]
  }
}
```

La Línea C también te lleva a **Retiro** (la otra cabecera). A diferencia de Constitución, de Retiro **salís a la
calle** y, siguiendo las vías de la **Línea San Martín**, llegás a la **Villa 31** (Barrio Padre Mugica), donde una
**referente te contrata para el comedor popular** y podés visitar la **iglesia del Padre Mugica** (subte.md §11 E2-E4).

```hist
{
  "id": "retiro_llegada",
  "title": "Llegar a la terminal Retiro (Línea C)",
  "title_en": "Reach Retiro terminal (Line C)",
  "at": "plaza",
  "pre": { "lineaC": true },
  "sets": { "enRetiro": true },
  "hints": {
    "es": [
      "La Línea C también va a RETIRO. Bajá al subte y viajá.",
      "En el andén, con la SUBE, abrí el menú de viaje y elegí Retiro.",
      "La escalera de Retiro sube a la terminal del Mitre (bóveda de hierro).",
      "Desde Retiro podés SALIR A LA CALLE: seguí las vías de la San Martín."
    ],
    "en": [
      "Line C also goes to RETIRO. Head down and travel.",
      "On the platform, with the SUBE, open the travel menu and pick Retiro.",
      "Retiro's stairs lead up to the Mitre terminal (iron vault).",
      "From Retiro you can EXIT TO THE STREET: follow the San Martín tracks."
    ]
  }
}
```

```hist
{
  "id": "villa31_llegada",
  "title": "Llegar a la Villa 31 (por la Línea San Martín)",
  "title_en": "Reach Villa 31 (via the San Martín line)",
  "at": "plaza",
  "pre": { "enRetiro": true },
  "sets": { "enVilla31": true },
  "hints": {
    "es": [
      "Salí de Retiro a la calle.",
      "Seguí las vías de la Línea San Martín hacia abajo.",
      "Atrás de Retiro está la VILLA 31 (Barrio Padre Mugica).",
      "Entrá a la Villa 31: hay un comedor popular y la iglesia del Padre Mugica."
    ],
    "en": [
      "Exit Retiro to the street.",
      "Follow the San Martín tracks downward.",
      "Behind Retiro is VILLA 31 (Padre Mugica neighborhood).",
      "Enter Villa 31: there's a soup kitchen and Padre Mugica's church."
    ]
  }
}
```

```hist
{
  "id": "comedor_contratado",
  "title": "El comedor popular de la Villa 31 te contrata",
  "title_en": "The Villa 31 soup kitchen hires you",
  "at": "plaza",
  "npc": "comedor",
  "pre": { "enVilla31": true },
  "sets": { "comedorHired": true },
  "hints": {
    "es": [
      "En la Villa 31, buscá el COMEDOR POPULAR (la olla humeante).",
      "Acercate a la REFERENTE del comedor y apretá [E].",
      "Te contrata para dar una mano en la olla.",
      "Charlá con la referente (y con el CURA de la iglesia del Padre Mugica) — hablan con IA."
    ],
    "en": [
      "In Villa 31, find the SOUP KITCHEN (the steaming pot).",
      "Walk up to the kitchen's community leader and press [E].",
      "She hires you to lend a hand at the pot.",
      "Chat with her (and with the PRIEST at Padre Mugica's church) — they run on AI."
    ]
  }
}
```

Una vez contratada, arranca la **jornada del comedor**: agarrás un plato de la olla y se lo servís a cada vecino de
la cola. Al servir a todos, la referente te lo agradece y te paga una **changa** (recompensa).

```hist
{
  "id": "comedor_jornada",
  "title": "Servir la jornada del comedor popular",
  "title_en": "Serve a shift at the soup kitchen",
  "at": "plaza",
  "npc": "comedor",
  "pre": { "comedorHired": true },
  "sets": { "comedorJornada": true },
  "terminal": true,
  "hints": {
    "es": [
      "Ya te contrataron: ahora hay que servir la olla.",
      "Parate en la OLLA y apretá [E] para agarrar un plato.",
      "Llevale el plato a cada vecino de la COLA y apretá [E].",
      "Serví a todos los vecinos: la referente te paga la changa."
    ],
    "en": [
      "You're hired: now serve the pot.",
      "Stand at the POT and press [E] to grab a plate.",
      "Take the plate to each neighbor in the QUEUE and press [E].",
      "Serve everyone in line: the leader pays you for the shift."
    ]
  }
}
```

La **ODISEA A CAMPANA** (subte.md §12): en Villa Ballester el maquinista está pasado de copa y el tren a Campana no
sale. La vuelta: tomás el **tren rojo de la San Martín** (piquete de la UBA en Ciudad Universitaria), te **colás al
Monumental** (clásico River-Boca) y **robás una bandera de Boca**; se la das al maquinista → **sobrio** → te lleva
**gratis a Campana**: la escalinata, la banda violeta, **Villa Dálmine vs CADU** en Mitre y Puccini, el mejor chori,
**4 goles**, y un **satélite de la IA** que abre un **portal** que te devuelve al búnker del loop.

```hist
{
  "id": "clasico_trapo",
  "title": "Colarse al Monumental y robar el trapo de Boca",
  "title_en": "Sneak into the Monumental and steal the Boca flag",
  "at": "plaza",
  "pre": { "lineaC": true },
  "sets": { "bocaTrapo": true },
  "hints": {
    "es": [
      "El maquinista de Villa Ballester no maneja borracho… pero algo lo puede despabilar.",
      "Tomá el TREN ROJO de la San Martín en Retiro: hay un piquete de la UBA en Ciudad Universitaria.",
      "Al lado del piquete está el MONUMENTAL: River-Boca. Colate.",
      "Del lado visitante hay una BANDERA DE BOCA al alcance: manoteála [E]."
    ],
    "en": [
      "The Villa Ballester driver won't drive drunk… but something might snap him out of it.",
      "Take the RED San Martín train at Retiro: there's a UBA picket at Ciudad Universitaria.",
      "Right next to the picket is the MONUMENTAL: River-Boca. Sneak in.",
      "On the away side there's a BOCA FLAG within reach: snatch it [E]."
    ]
  }
}
```

```hist
{
  "id": "campana_llegada",
  "title": "El maquinista sobrio te lleva a Campana",
  "title_en": "The sobered-up driver takes you to Campana",
  "at": "plaza",
  "pre": { "bocaTrapo": true },
  "sets": { "enCampana": true },
  "hints": {
    "es": [
      "Tenés el trapo de Boca. ¿A quién le puede cambiar el día?",
      "Volvé a VILLA BALLESTER (tren del Mitre desde Retiro).",
      "Dale el trapo al MAQUINISTA de la parrilla [E].",
      "Se le pasa el pedo de golpe y te lleva GRATIS a CAMPANA."
    ],
    "en": [
      "You have the Boca flag. Whose day could it make?",
      "Head back to VILLA BALLESTER (Mitre train from Retiro).",
      "Give the flag to the DRIVER at the grill [E].",
      "He sobers up on the spot and takes you to CAMPANA FOR FREE."
    ]
  }
}
```

```hist
{
  "id": "dalmine_portal",
  "title": "4 goles de Villa Dálmine → el satélite → el portal al búnker",
  "title_en": "4 Villa Dálmine goals → the satellite → the portal to the bunker",
  "at": "plaza",
  "pre": { "enCampana": true },
  "sets": { "dalmineGritado": true },
  "terminal": true,
  "hints": {
    "es": [
      "En Campana, seguí a la banda violeta.",
      "Entrá al estadio de MITRE Y PUCCINI: juegan Villa Dálmine vs CADU.",
      "En el entretiempo clavate EL chori; en el 2º tiempo GRITÁ cada gol [E].",
      "Al 4º gol cae un SATÉLITE de la IA y el portal te devuelve al búnker del loop."
    ],
    "en": [
      "In Campana, follow the violet crowd.",
      "Enter the MITRE Y PUCCINI stadium: Villa Dálmine vs CADU.",
      "At halftime devour THE chori; in the 2nd half SHOUT every goal [E].",
      "On the 4th goal an AI SATELLITE falls and the portal drops you back at the loop bunker."
    ]
  }
}
```

En la Villa 31 también está **la abuela Coca** (no puede caminar hasta la olla) y el **mandado del cura**: llevarle
un plato → la **bendición** (estampita 🙏, buff de escudo+sanación). Y el comedor tiene **rondas**: al completar la
jornada, [E] en la olla renueva la cola (rejugable, cada ronda paga la changa).

```hist
{
  "id": "cura_bendicion",
  "title": "El mandado del cura: un plato para la abuela Coca → la bendición",
  "title_en": "The priest's errand: a plate for grandma Coca → the blessing",
  "at": "plaza",
  "npc": "cura",
  "pre": { "enVilla31": true },
  "sets": { "curaBendicion": true },
  "terminal": true,
  "hints": {
    "es": [
      "En la Villa 31, el cura de la capilla tiene algo para pedirte.",
      "Hablale al CURA [E]: la abuela Coca no puede llegar a la olla.",
      "Agarrá un PLATO de la olla y llevalo a la casa del fondo a la derecha.",
      "Entregale el plato a la ABUELA COCA y volvé al cura: te da su BENDICIÓN (estampita 🙏, usala con [I])."
    ],
    "en": [
      "In Villa 31, the chapel priest has something to ask you.",
      "Talk to the PRIEST [E]: grandma Coca can't reach the pot.",
      "Grab a PLATE from the pot and take it to the house at the back right.",
      "Deliver the plate to GRANDMA COCA and return to the priest: he gives you his BLESSING (holy card 🙏, use with [I])."
    ]
  }
}
```
