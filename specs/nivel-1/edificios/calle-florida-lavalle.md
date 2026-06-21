# EDIFICIO/ZONA: Calle Florida y Lavalle

- **Nodo id:** `calle`  ·  **Tipo:** `zona` (hub)  ·  **Nivel:** 1
- **Sala(s):** 0  ·  **Estado:** Implemented

## Resumen
La peatonal: el **hub** del nivel. Desde acá se entra a todos los edificios. Acá **estalla la
tormenta** (`stormable`) y, tras eso, acá se ve el colapso de la city.

## Detalle
- Arranca el jugador (`playerStart`). Decorado con árboles, faroles, kiosko, mesa de ajedrez.
- Tiene la **cola de la Casa de Cambio** (~15 NPCs de fondo) y al **músico** (cumbia al pasar).
- Los **3 borrachines** están sobre la calle, custodiando la puerta del edificio abandonado.
- **Post-tormenta:** la calle entra en pánico; las puertas de los edificios no-refugio quedan en
  ruinas (RF-7 del spec de refugios), y se habilita el portal en la Casa de Cambio.

## Aristas
```
calle --conecta_con--> educacionit
calle --conecta_con--> arcade
calle --conecta_con--> choreria
calle --conecta_con--> garbarino
calle --conecta_con--> cemento [requiere ticket_cemento]
calle --conecta_con--> galeria
calle --conecta_con--> casa_cambio
calle --conecta_con--> edificio_abandonado [bloqueado por borrachines]
calle --conecta_con--> super_chino
calle --contiene--> borrachines
calle --contiene--> musico
calle --contiene--> elenco_cola_cambio
bunker --da--> loop [reinicia: volvés a la calle]
```
