# 📐 Specs — Spec-Driven Development (SDD)

Acá vive el **diseño** del juego, separado del código. La idea del SDD: **primero se escribe
el spec** (qué tiene que pasar y por qué), se acuerda, y recién después se implementa. El spec
es la **fuente de verdad**; el código es una consecuencia. Sirve para dejar **bien claro cada
parte de cada nivel** sin tener que leer el código para entender la intención.

## Cómo se organiza

```
specs/
  README.md                 ← esto (convención + vocabulario de grafo + índice)
  SPEC-template.md          ← plantilla de spec de sistema/feature
  ENTIDAD-template.md       ← plantilla de "ficha de entidad" (edificio o personaje)
  TECNICAS.md               ← técnicas de game design usadas (grafo de entidades, RAG, quest DAG…)
  nivel-1/                  ← Nivel 1 (Florida y Lavalle)
    GRAFO.md                ← el grafo del nivel: nodos + aristas + diagrama Mermaid (el mapa RAG)
    conexiones-secretas-y-refugios.md   ← spec de sistema (el loop, el búnker)
    edificios/              ← una ficha por edificio/zona (nodos "lugar")
    personajes/             ← una ficha por personaje clave (nodos "npc") + elenco de fondo
```

Hay dos clases de documento:
- **Specs de sistema/feature** (plantilla `SPEC-template.md`): una mecánica que cruza varios nodos
  (ej. el loop/refugio).
- **Fichas de entidad** (plantilla `ENTIDAD-template.md`): un **nodo** del grafo — un **edificio** o
  un **personaje**. Cada ficha declara sus **aristas** (con qué se conecta), que es lo que alimenta
  el [GRAFO](nivel-1/GRAFO.md).

## Vocabulario del grafo (nodos y aristas)

Todo el nivel se modela como un **grafo dirigido** de entidades. Mantener este vocabulario fijo
hace que las fichas sean componibles (y que un grafo/RAG se pueda generar automático).

**Nodos** (`tipo`): `zona` · `edificio` · `sala` · `npc` · `item` · `flag` · `modo` (sub-juego).

**Aristas** (verbo, de origen → destino):

| Arista | Significado |
|---|---|
| `conecta_con` | hay una puerta entre dos lugares (anotar si es `secreta` / `condicional`) |
| `contiene` | un lugar tiene dentro un npc / item / máquina |
| `requiere` | para entrar/usar hace falta un flag o item |
| `desbloquea` | al cumplir algo, se setea un flag / se abre un lugar |
| `bloquea` | impide el paso hasta cierta condición |
| `quiere` | un npc desea un item (quest) |
| `da` | un npc/lugar entrega un item o flag |
| `vende` | intercambio por monedas |
| `se_consigue_en` | dónde sale un item (inverso útil para el RAG) |

> Las fichas terminan con un bloque **`### Aristas`** en una línea por relación, formato
> `origen --verbo--> destino [condición]`. Eso es lo que se copia al GRAFO.

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

**Transversal**
- [TECNICAS.md](TECNICAS.md) — cómo se modela esto en game dev (grafo de entidades, quest DAG, RAG).
- [configuracion.md](configuracion.md) — opciones/accesibilidad (fuente, duración del texto, volumen).
- [ia-openrouter.md](ia-openrouter.md) — IA (OpenRouter, modelo free) para diálogos/contenido (Draft).
- [ia-routing-infra.md](ia-routing-infra.md) — **infra** de IA: routing self-hosted (vLLM/LiteLLM/AI Gateway/k8s) por tier (pago/BYOK/free) + uso/carga → GPU propia. NO toca el juego (sólo pide buenas métricas) (Draft).
- [idiomas.md](idiomas.md) — i18n / soporte multi-idioma (inglés), transcreación del humor porteño (impl. completo v=59).
- [glosario-transcreacion.md](glosario-transcreacion.md) — fuente única de las decisiones es-AR → inglés (términos, nombres propios, tono).
- [publicidad.md](publicidad.md) — monetización por product placement (afiches/pantallas/fachadas/góndola), capa aditiva tipo `presence` (Draft).
- [landing-info.md](landing-info.md) — landing `/info` en GitHub Pages (presentación + redes/OG + "siempre actualizado" del CHANGELOG); protagonista = linyera excéntrico real de BA (Pechito/Dante A. Linyera) (Draft).
- [modelo-de-entidades.md](modelo-de-entidades.md) — **modelo de objetos único + motor data-driven** ("todo es un objeto": edificio/maceta/personaje/cartel). Component + Type Object + data-driven (NO ECS), idempotencia, IA acotada + asistente GraphRAG, meta-progresión, quests (DAG), abilities, freemium, coexistencia v1/v2 por fases. **Diseño ACORDADO, listo para F1** (Draft). Schema concreto en [`levels/level.schema.json`](../levels/level.schema.json) (+ `levels/example.json`).

**Nivel 1 — sistemas**
| Spec | Estado |
|---|---|
| [GRAFO del Nivel 1](nivel-1/GRAFO.md) | Draft |
| [Grafo de historia + motor de pistas](nivel-1/historia-grafo.md) | Fase 1 COMPLETA (v=64) |
| [Conexiones secretas y refugios](nivel-1/conexiones-secretas-y-refugios.md) | Parcial. impl. |
| [El loop — supervivencia](nivel-1/loop-supervivencia.md) | Draft |

**Nivel 1 — fichas de entidad:** ver [`nivel-1/edificios/`](nivel-1/edificios/) y
[`nivel-1/personajes/`](nivel-1/personajes/). El índice completo de nodos está en el
[GRAFO](nivel-1/GRAFO.md).
