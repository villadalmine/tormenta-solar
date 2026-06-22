# EDIFICIO: Casa de Cambio Oficial (la SALIDA)

- **Nodo id:** `casa_cambio`  ·  **Tipo:** `edificio`  ·  **Nivel:** 1
- **Sala(s):** 13  ·  **Estado:** Implemented

## Resumen
La casa de cambio oficial, **repleta de gente** sacando número. **Antes de la tormenta no podés
entrar** (la cola no te deja). **Después**, adentro se abre el **PORTAL** = pasar de nivel. Es la
**única salida hacia adelante**.

## Detalle
- Pre-tormenta: intentar entrar tira mensajes de "está hasta las pelotas / hacé la cola".
- Cajeros + ~10 personas en la cola (flavor del quilombo cambiario).
- Post-tormenta (`stormed`): pánico, y en el fondo aparece el **portal** (`goal`). Tocarlo = `win()`.
- Contrapunto del **búnker/loop**: el portal avanza, el búnker te deja en el bucle.

## Aristas
```
calle --conecta_con--> casa_cambio
casa_cambio --bloquea--> entrada [hasta stormed]
stormed --desbloquea--> portal [en casa_cambio]
casa_cambio --da--> WIN [tocar el portal]
casa_cambio --contiene--> elenco_cola_cambio
```

## Grafo de historia (lo lee `tools/gen-historia.mjs` → ver [historia-grafo.md](../historia-grafo.md))
```hist
{
  "id": "portal",
  "title": "Escapar por el portal (fin del nivel)",
  "at": "cambio",
  "pre": { "stormed": true },
  "sets": { "won": true },
  "terminal": true,
  "hints": {
    "es": [
      "Cuando todo se apague, la salida está donde antes no entrabas ni en pedo.",
      "Con la tormenta, la Casa de Cambio Oficial se vacía y adentro pasa algo raro al fondo.",
      "Post-tormenta, metete en la Casa de Cambio Oficial: al fondo se abre el PORTAL. Tocalo.",
      "¡Después de la tormenta, ENTRÁ A LA CASA DE CAMBIO y TOCÁ EL PORTAL del fondo para salir del nivel!"
    ],
    "en": [
      "When everything goes dark, the way out is where you couldn't get in before for the life of you.",
      "With the storm, the Official Exchange House empties and something weird happens in the back.",
      "After the storm, get into the Official Exchange House: a PORTAL opens in the back. Touch it.",
      "After the storm, GO INTO THE EXCHANGE HOUSE and TOUCH THE PORTAL in the back to leave the level!"
    ]
  }
}
```
