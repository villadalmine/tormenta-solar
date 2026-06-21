# 📐 Specs — Spec-Driven Development (SDD)

Acá vive el **diseño** del juego, separado del código. La idea del SDD: **primero se escribe
el spec** (qué tiene que pasar y por qué), se acuerda, y recién después se implementa. El spec
es la **fuente de verdad**; el código es una consecuencia. Sirve para dejar **bien claro cada
parte de cada nivel** sin tener que leer el código para entender la intención.

## Cómo se organiza

```
specs/
  README.md            ← esto (convención + índice)
  SPEC-template.md     ← plantilla para arrancar un spec nuevo
  nivel-1/             ← specs del Nivel 1 (Florida y Lavalle)
    conexiones-secretas-y-refugios.md
```

Un spec por **feature o sistema** (no uno gigante por nivel). Se agrupan por nivel en su carpeta.

## Ciclo de vida (campo `Estado`)

- **Draft** — escrito, en discusión. Puede cambiar.
- **Approved** — acordado, listo para implementar. No se toca sin revisar el spec.
- **Implemented** — ya está en el código. El spec queda como documentación de la intención.
- **Superseded** — reemplazado por otro spec (linkear cuál).

## Reglas

1. Cambió la intención → **se actualiza el spec primero**, después el código.
2. Cada spec termina con **criterios de aceptación** verificables (idealmente algo que el e2e
   pueda chequear: `node tests/e2e.js`).
3. Las cosas sin resolver van en **Preguntas abiertas**, no se inventan en el código.
4. Los specs referencian salas por su **índice real** (`Level.build()` devuelve el array) para
   que no haya ambigüedad.

## Índice

| Spec | Nivel | Estado |
|---|---|---|
| [Conexiones secretas y refugios](nivel-1/conexiones-secretas-y-refugios.md) | 1 | Draft |
