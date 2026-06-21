# <EDIFICIO|PERSONAJE>: <nombre>

- **Nodo id:** `<slug>`  ·  **Tipo:** `edificio | zona | npc`  ·  **Nivel:** <n>
- **Sala(s):** <índice real, ej. 8>  ·  **Estado:** Draft | Approved | Implemented

## Resumen
Una o dos líneas: qué es y para qué sirve en el nivel.

## Detalle
Personalidad / mecánica / contenido. Para personajes: qué quiere, qué da, tono del diálogo.
Para edificios: qué hay adentro, qué se puede hacer, estado post-tormenta (ruina/refugio/salida).

## Aristas
> Una relación por línea, formato `origen --verbo--> destino [condición]`.
> Verbos válidos: conecta_con, contiene, requiere, desbloquea, bloquea, quiere, da, vende,
> se_consigue_en (ver `specs/README.md`).

```
<slug> --conecta_con--> <otro> [secreta|condicional]
<slug> --da--> <item|flag>
```
