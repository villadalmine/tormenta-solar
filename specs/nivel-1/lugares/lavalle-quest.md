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
