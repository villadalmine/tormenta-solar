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
  "sets": { "nivel2Win": true },
  "terminal": true,
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
