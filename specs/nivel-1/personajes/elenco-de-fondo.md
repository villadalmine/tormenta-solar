# PERSONAJE: Elenco de fondo (flavor)

- **Nodo id:** `elenco_*`  ·  **Tipo:** `npc`  ·  **Nivel:** 1
- **Estado:** Implemented

## Resumen
Personajes de **ambiente** (sin quest ni gating): dan color, humor y vida a las salas. Se agrupan acá
para no inflar el grafo con nodos sueltos. Cada uno tiene su línea de diálogo propia.

## Catálogo
| Grupo | Sala | Quiénes | Rol |
|---|---|---|---|
| **Cola de la Casa de Cambio** | 0 y 13 | ~15 (vecina, oficinista, turista, jubilados, señora, papá+nene, don…) | El quilombo cambiario: quejas, espera eterna, "no me corran de la fila". |
| **Profes / CEOs EducaciónIT** | 1–3 | Maxi (Java), Guido, los 2 Sebastián (CEOs), Marcos (mates), recepción | Guiños tech. |
| **Banda de Cemento** | 12 | Iorio, guitarrista, bajista, baterista, asador | Recital under + asado. |
| **Naiperos del lugar secreto** | 9 | ~12 jugadores | *"Acá no viste nada, pibe."* Te empujan al fondo (al Tahúr). |
| **Tiendas raras (galería/sótano)** | 6, 7 | sex-shop, comida rara, masajista, el tenebroso del amuleto | Locales `action:'shop'`. |
| **Dueños de máquinas** | 4 | gamers | Te cobran ficha cada vez más cara. |

## Notas
- No tienen aristas de progresión (no dan ítems ni flags). Si alguno **gana** una mecánica, se le
  hace **ficha propia** y se lo saca de acá (ej. el del chori y el del Trucotron → `npcs-arcade.md`).
- Regla de variación: **cada uno con diálogo distinto** (nada repetido en la misma sala).

## Pools que alimenta (los lee `tools/gen-dialogos.mjs`)
La **cola del dólar** (la gente haciendo fila en la Casa de Cambio) tiene su pool generado:
```gen
pool: cola_dolar
n: 10
seed: persona haciendo la cola eterna en la Casa de Cambio Oficial; se queja de la espera, el número, el dólar y la inflación
```

## Aristas
```
calle --contiene--> elenco_cola_cambio
casa_cambio --contiene--> elenco_cola_cambio
educacionit --contiene--> elenco_educacionit
cemento --contiene--> banda_cemento
lugar_secreto --contiene--> naiperos
```
