# El vecino de los edificios clausurados

Post-tormenta, al lado de cada edificio clausurado (EducaciónIT, arcade, chorería, Garbarino) hay un **vecino** mudo
pre-tormenta y **chusmero** post-tormenta: te flashea **historias de terror** del edificio y, tras un par, te ofrece
**"¿querés pasar y ver qué pasó con XXX?"** → la máquina de niveles **genera un nivel** desde esa historia y, al
ganarlo, quedás en el **interior real** del edificio. Lazo infinito (cada pasada, nivel nuevo). Implementado en v194;
ver `specs/edificios-clausurados-historias.md`.

Para el GRAFO esto es una actividad **post-tormenta opcional** (terminal): el HintEngine la sugiere mientras no hayas
entrado a ningún edificio (`vecinoSeen` = entraste al menos a uno); una vez que probaste el lazo, deja de insistir.

```hist
{
  "id": "vecino",
  "title": "Pasar a un edificio clausurado (el vecino)",
  "title_en": "Get into a condemned building (the neighbor)",
  "at": "calle",
  "pri": 30,
  "pre": { "stormed": true },
  "sets": { "vecinoSeen": true },
  "terminal": true,
  "hints": {
    "es": [
      "Esos tipos parados al lado de los edificios tapiados... algo saben, y se mueren por contarlo.",
      "Al lado de cada edificio clausurado hay un vecino: te cuenta historias del lugar si le das charla.",
      "Hablale al VECINO de un edificio clausurado: te flashea historias y te deja PASAR a ver qué pasó.",
      "¡Andá a un edificio tapiado, hablale al VECINO y PASÁ! Adentro hay un nivel armado con su historia."
    ],
    "en": [
      "Those guys standing by the boarded-up buildings... they know something, and they're dying to tell it.",
      "By each condemned building there's a neighbor: he tells you stories of the place if you chat him up.",
      "Talk to the NEIGHBOR of a condemned building: he flashes stories and lets you GO IN to see what happened.",
      "Go to a boarded-up building, talk to the NEIGHBOR and GO IN! Inside there's a level built from his story."
    ]
  }
}
```
