# EDIFICIO: Las Cuevas del dólar (+ Disquería)

- **Nodo id:** `cuevas_dolar`  ·  **Tipo:** `edificio`  ·  **Nivel:** 1
- **Sala(s):** 8 (Subsuelo 3)  ·  **Estado:** Implemented

## Resumen
El cambio ilegal: **3 cueveros**. Dos te rebotan, el tercero te cambia... y **justo ahí estalla la
tormenta solar**. Es el punto de quiebre de la historia. También está la **disquería**.

## Detalle
- El hall (sala 8) es la **antesala**: cada cuevero **te invita a pasar a su cueva** (salas
  **35/36/37**), que tienen aspecto de cueva ilegal con **gente esperando** (*"es para mi hijo"*,
  *"sin dólares el país se va a la mierda"*). Ver [`../personajes/cueveros.md`](../personajes/cueveros.md).
- **Cueva 1 (`coins`)** y **Cueva 2 (`garca`)**: no te cambian, te rebotan con excusas.
- **Cueva 3 (`real`)**: *"dale, vení que te los cambio"* → te cambia y **dispara `stormed`**
  (el espacio-tiempo se parte).
- **Disquería** (modo `vinilos`, puerta `vinilos`): comprás un vinilo → **`ticket_cemento`**.
- **Conexión secreta:** el **super chino** desemboca acá por una puerta secreta
  (`enterCuevaFromSecret`), y la primera vez **le recuperás +60 monedas** al cuevero que te cagó
  (`moneyRecovered`).
- **Post-tormenta / LOOP — el "búnker del cuevero":** es el **corazón del refugio** (red ilegal "a
  la sombra", no colapsa). Desde acá entrás al **chino por la puerta trasera** (entrada de servicio)
  para comprar comida sin cruzar la barricada del frente. Ver
  [`../loop-supervivencia.md`](../loop-supervivencia.md).

## Aristas
```
sotano --conecta_con--> cuevas_dolar
cuevas_dolar --conecta_con--> disqueria
super_chino --conecta_con--> cuevas_dolar [secreta]
cuevas_dolar --contiene--> cueveros
cuevero_3 --desbloquea--> stormed
disqueria --da--> ticket_cemento
super_chino --da--> moneyRecovered [+60 al volver por la cueva]
```
