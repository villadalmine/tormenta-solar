# EDIFICIO: Galería + Sótano (bajada a la cueva)

- **Nodo id:** `galeria`, `sotano`  ·  **Tipo:** `edificio`  ·  **Nivel:** 1
- **Sala(s):** 6 (Subsuelo 1), 7 (Subsuelo 2)  ·  **Estado:** Implemented

## Resumen
La galería trucha y su sótano: el **camino de bajada** desde la calle hasta las **Cuevas del
dólar**. Tiendas raras de color en el medio.

## Detalle
- **Subsuelo 1 (galería):** sex-shop "El Subte", "Comida rara" (locales `action:'shop'`).
- **Subsuelo 2 (sótano):** "Masajes Felices" y un personaje **tenebroso** que te vende un amuleto.
- Es **pasillo de conexión**: calle → galería → sótano → cuevas.
- **Post-tormenta:** parte de la red "a la sombra" que **sobrevive** (refugio), no colapsa.

## Aristas
```
calle --conecta_con--> galeria
galeria --conecta_con--> sotano
sotano --conecta_con--> cuevas_dolar
galeria --contiene--> tiendas_raras
sotano --contiene--> tenebroso_amuleto
```
