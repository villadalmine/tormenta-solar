# EDIFICIO: EducaciónIT

- **Nodo id:** `educacionit`  ·  **Tipo:** `edificio`  ·  **Nivel:** 1
- **Sala(s):** 1 (piso 4), 2 (piso 8), 3 (piso 9)  ·  **Estado:** Implemented

## Resumen
La empresa/escuela de tecnología, **3 pisos con ascensor**. Puro guiño/flavor: saludás a los profes
y CEOs. No tiene quest ni gating; es color y humor.

## Detalle
- **Piso 4:** recepción + **Maxi** (profe de Java, *"todo es un objeto"*).
- **Piso 8:** los **dos CEOs Sebastián**, **Guido**. (Chiste: los dos se llaman Sebastián.)
- **Piso 9:** **Marcos** y unos mates (+relax).
- Ascensor conecta los pisos.
- **Post-tormenta:** colapsa → fachada en ruinas, no se entra (RF-7).

## Aristas
```
calle --conecta_con--> educacionit
educacionit --contiene--> maxi
educacionit --contiene--> ceos_sebastian
educacionit --contiene--> guido
educacionit --contiene--> marcos
stormed --bloquea--> educacionit [ruinas]
```
