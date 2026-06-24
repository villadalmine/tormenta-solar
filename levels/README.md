# `levels/` — el juego como DATA (modelo v2)

Acá viven los **niveles declarados como datos** (modelo data-driven). Es la base de la migración a v2
descrita en [`specs/modelo-de-entidades.md`](../specs/modelo-de-entidades.md). **Todavía NO se consume en
runtime** (v1 = `js/level.js` sigue siendo el motor por default); esto es el esqueleto para arrancar **F1**.

## Archivos
- **`level.schema.json`** — el **JSON Schema** (draft 2020-12) del modelo (decisión **D8**). Define la forma
  de un nivel: `rooms[]` (cada sala con su geometría y `entities[]`), `buildings[]` (agrupación + atributos
  transversales: `facade`, `gate`, `collapsesOnStorm`, `ambient`), y —opcionales, para fases posteriores—
  `quests[]`, `abilities[]`, `eventos[]`. **Todo es una entidad + componentes.** Sirve de **guardrails** para
  que una IA edite contenido sin romper (RF-12/RF-20).
- **`example.json`** — un nivel mínimo (2 salas, 8 entidades) que **valida** contra el schema. Plantilla de
  referencia: muestra `marker`/`npc`/`decor`/`sign`/`door` con `link` (wiring), `gate`, `interact`,
  `lifecycle.appearsWhen` y `pickup`.
- **`nivel-1.json`** — el **Nivel 1 entero como data** (38 salas, 487 entidades), **generado** del
  `Level.build()` real por `tools/gen-level.js` (fiel por construcción, re-ejecutable: `node tools/gen-level.js`).
  Valida contra el schema; 71 links de puerta, 0 rotos. **No se consume en runtime todavía** (espera a F2:
  `buildWorld`).

## MVP de F1 (lo único requerido al principio)
Esqueleto **físico**: `rooms` (id + `w` + `platforms` + `entities`), entidades
`door`/`npc`/`decor`/`machine`/`pickup`/`enemy`/`cuevero`/`marker`, con `render`, `interact.action`
(referencia a un verbo del registry), `link` (ex `wire`), `gate` (`cond`), e **ids estables**. Objetivo:
que un futuro `buildWorld(model)` reproduzca las 38 salas actuales (**test de paridad** v1≡v2).

Los componentes ricos (`ai`, `agent`, `story`, `dialogue`, `quest`, `ability`, `ad`) están en el schema pero
son **opcionales**: se cuelgan en fases posteriores (§6½–§6.96 del SDD).

## Estado: F1 + F2 hechas
- **F1:** `levels/nivel-1.json` generado y validado (arriba).
- **F2:** `js/mundo.js` (`Mundo.fromModel(model)` = `buildWorld`, función pura) reconstruye el nivel desde
  la data, y **`node tests/parity.mjs`** verifica **paridad v1≡v2** (las 38 salas coinciden: geometría,
  posiciones, doors+wiring). `mundo.js` **NO** está en `index.html` todavía → el runtime sigue en v1 (F3 = el
  toggle). Si tocás `level.js`, regenerá (`node tools/gen-level.js`) y corré la paridad.

## Validación
- **Ya corre:** `node tests/levels.mjs` — un **mini-validador de JSON Schema sin dependencias** (cubre el
  subset que usa el schema) que valida cada `levels/*.json` contra `level.schema.json`. Trae un **self-test
  negativo** (confirma que de verdad detecta errores). Hoy valida `example.json`; cuando F1 agregue
  `nivel-1.json`, lo valida solo.
- **Pendiente (F1):** la **auditoría de cobertura** (que cada `action`/`render.sprite`/`effect` referenciado
  exista en su registry, como la auditoría de assets de hoy) e **integrarlo al e2e/CI**.
