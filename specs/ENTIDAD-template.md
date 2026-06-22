# <EDIFICIO|PERSONAJE>: <nombre>

- **Nodo id:** `<slug>`  ·  **Tipo:** `edificio | zona | npc`  ·  **Nivel:** <n>
- **Sala(s):** <índice real, ej. 8>  ·  **Estado:** Draft | Approved | Implemented

## Resumen
Una o dos líneas: qué es y para qué sirve en el nivel.

## Detalle
Mecánica / contenido. Para personajes: qué quiere, qué da. Para edificios: qué hay adentro, qué se
puede hacer, estado post-tormenta (ruina/refugio/salida).

## Personalidad (solo personajes — fuente para el generador de diálogos y el chat IA)
Este bloque es la **fuente única** de la voz del personaje: de acá salen los pools del script
(`tools/gen-dialogos.mjs`) y el `persona` del chat (`js/ai.js` + `ai-proxy/personas.js`).
- **Voz / tono:** …
- **Cómo habla:** slang, muletillas, largo de frases.
- **Contexto (qué sabe):** …
- **Quiere / obsesión:** …
- **Qué NO dice (límites):** lo que está fuera de su rol; nunca rompe la 4ª pared ni admite ser IA.
- **Persona de chat:** `id` (o "no chateable — su data crítica va por acción scripteada").
- **Semilla para el script:** «descripción de 1 línea que usa `gen-dialogos`».

## Aristas
> Una relación por línea, formato `origen --verbo--> destino [condición]`.
> Verbos válidos: conecta_con, contiene, requiere, desbloquea, bloquea, quiere, da, vende,
> se_consigue_en (ver `specs/README.md`).

```
<slug> --conecta_con--> <otro> [secreta|condicional]
<slug> --da--> <item|flag>
```
