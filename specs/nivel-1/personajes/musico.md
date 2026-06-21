# PERSONAJE: El Músico

- **Nodo id:** `musico`  ·  **Tipo:** `npc`  ·  **Nivel:** 1
- **Sala(s):** 0 (calle)  ·  **Estado:** Implemented

## Resumen
El músico callejero. Detalle de ambiente con efecto real: cuando **pasás cerca** (y antes de la
tormenta), **suena la cumbia** (`Sfx.setCumbia`). No tiene quest.

## Detalle
- *"Una moneda y te toco una cumbia, maestro."* 🎶
- La música cambia dinámicamente por proximidad: es un mini-sistema de **audio espacial** por zona.

## Aristas
```
calle --contiene--> musico
musico --da--> cumbia [al pasar cerca, pre-tormenta]
```
