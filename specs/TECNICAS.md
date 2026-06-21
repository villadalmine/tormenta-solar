# 🧠 Técnicas — cómo se modela un nivel como grafo (game design + RAG)

Por qué hacemos fichas por edificio y por personaje, y cómo eso se vuelve un **grafo** que sirve
tanto para **diseñar** como para que una **IA/RAG** entienda el juego. Esto es lo que se usa de
verdad en la industria; abajo, los nombres y para qué sirve cada uno.

## 1. Grafo de entidades (world / entity graph)

El mundo se modela como un **grafo dirigido**: los **nodos** son entidades (lugares, NPCs, ítems,
flags) y las **aristas** son relaciones (*conecta_con*, *quiere*, *da*, *desbloquea*…). En vez de
describir todo en prosa, cada entidad declara sus relaciones y el grafo emerge solo.

- **Para qué sirve:** ver de un vistazo cómo está todo entrelazado, detectar nodos huérfanos
  (un ítem que nadie pide), callejones sin salida, o dependencias rotas.
- **En este repo:** cada ficha en `edificios/` y `personajes/` termina con un bloque `### Aristas`,
  y [`GRAFO.md`](nivel-1/GRAFO.md) las junta en un diagrama **Mermaid**.

## 2. Grafo de dependencias / quest DAG (lock-and-key)

La progresión se modela como un **DAG** (grafo dirigido **acíclico**): "para X necesitás Y". Es el
corazón del diseño **Metroidvania / aventura**: *llaves y cerraduras* (**lock & key**). Cada
"cerradura" (puerta, NPC que no te deja pasar) tiene su "llave" (ítem, flag, logro).

- Ejemplos del Nivel 1:
  - `cemento` **requiere** `ticket_cemento`, que **se_consigue_en** `disqueria`.
  - `edificio_abandonado` lo **bloquean** los `borrachines` hasta `borrachosHappy`.
  - `bunker` **requiere** `bunkerUnlocked`, que sale de robar el `totem_monos`.
- **Técnica de chequeo:** que el DAG no tenga **ciclos** (si A necesita B y B necesita A, nadie
  entra) y que **todo nodo de meta sea alcanzable** desde el inicio. Es validable automáticamente.
- **Gating:** las puertas "lanzador de modo" y las condicionales son los *gates*; los flags
  (`stormed`, `secretUnlocked`, `borrachosHappy`…) son el estado del lock.

## 3. Grafo narrativo / diálogo

La historia y las charlas se modelan como **grafos de narrativa** (state machines de historia) y
**árboles/grafos de diálogo**. Herramientas típicas de la industria: **Twine**, **ink** (Inkle),
**Yarn Spinner**, **articy:draft**. Acá los diálogos son simples (líneas random + pistas), pero el
**hint discovery** de los borrachines (hablar revela la pista) ya es un mini-grafo de estados.

## 4. Economía / sistemas (loops)

Los bucles de recursos se modelan con **Machinations** (grafos de flujo de economía): fuentes,
sumideros, conversores. En el Nivel 1: monedas (fuente: loot/FIFA; sumidero: chino/arcade),
caramelos (vuelto), el **changuito** (conversor monedas→ítems). El **loop del nivel** (refugio) es,
literalmente, un **ciclo** marcado a propósito en el grafo de progresión (el único permitido).

## 5. Knowledge graph + RAG (la parte de IA)

Un **knowledge graph** es el grafo de entidades/relaciones en formato consultable. Con
**RAG (Retrieval-Augmented Generation)** + ese grafo (**GraphRAG**), una IA puede responder
"¿de dónde saco una Diosa Tropical?" o "¿qué se rompe si toco el maletín?" **recuperando los nodos
y aristas** en vez de adivinar. Por eso las fichas son **atómicas** (un nodo por archivo) y las
aristas están **normalizadas** (`origen --verbo--> destino`): es el formato ideal para indexar.

- **Patrón:** ficha por entidad (chunk) → embeddings/índice → la IA recupera el subgrafo relevante
  → razona sobre relaciones reales. Mucho más confiable que meter todo en un prompt gigante.
- **Bonus:** el mismo grafo sirve para **QA automática** (detectar inconsistencias) y para
  **generar contenido** coherente con lo que ya existe.

## 6. Cómo lo aplicamos acá (resumen práctico)

1. **Una ficha por nodo** (`edificios/`, `personajes/`) con un bloque `### Aristas`.
2. **Vocabulario fijo** de verbos (ver `specs/README.md`) para que las aristas sean componibles.
3. **[GRAFO.md](nivel-1/GRAFO.md)** junta todo en un diagrama y una lista de aristas (el knowledge
   graph del nivel).
4. **Validaciones** (a futuro, automatizables): sin ciclos en el DAG salvo el loop marcado; todo
   ítem que alguien `quiere` tiene un `se_consigue_en`; toda meta es alcanzable.
