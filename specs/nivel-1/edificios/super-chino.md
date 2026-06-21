# EDIFICIO: Super chino (vista de arriba)

- **Nodo id:** `super_chino`  ·  **Tipo:** `edificio` / `modo`  ·  **Nivel:** 1
- **Sala(s):** modo `super` (se lanza desde la calle)  ·  **Estado:** Implemented

## Resumen
El supermercado chino, en **vista de arriba**. El **proveedor de ítems** del nivel: de acá salen
casi todas las cosas que piden los borrachines y la Mega Drive. Tiene **changuito**, **caja**,
**ninjas** y una **puerta secreta a la cueva**.

## Detalle
- **Changuito:** agarrás de las góndolas **sin pagar** → se acumula → **pagás en la CAJA**.
- El **chino** cobra **solo monedas** y **da el vuelto en caramelos**; **no acepta caramelos** como
  pago (se enoja). Si rajás sin pagar, salen **2 ninjas samurái** de la puerta oscura de la familia
  y te echan **sin la mercadería**.
- Góndolas: **Diosa Tropical**, carne, fiambre, golosinas, limpieza/bazar y **Mega Drive** (CONSOLAS).
- **Puerta secreta** → te lleva a la **cueva del dólar** (`enterCuevaFromSecret`, +60 monedas la 1ª
  vez). Los borrachines te soplan esta pista al hacerte VIP.
- **Post-tormenta / LOOP:** el super se **atrinchera** — **barricadas de fuego**, **granadas** y
  **ninjas** en el **frente** → **no entrás por adelante**. Pero es **donde se compra la comida** que
  te mantiene vivo en el loop. Dos formas de entrar (ver [`../loop-supervivencia.md`](../loop-supervivencia.md)):
  - **(A) Puerta trasera:** la puerta secreta super↔cueva es la **entrada de servicio** desde el
    refugio (cueva del dólar / "búnker del cuevero").
  - **(B) Iorio:** darle **falopa** a Iorio en Cemento → toca Pibe Tigre → los **ninjas metaleros se
    van** → el **frente** del chino queda abierto.

## Aristas
```
calle --conecta_con--> super_chino
super_chino --conecta_con--> cuevas_dolar [secreta · entrada de servicio en el loop]
super_chino --vende--> comida [post-colapso, restaura vida]
super_chino --bloquea--> entrada_frente [barricada: ninjas + fuego + granadas, post stormed]
iorio --desbloquea--> chino_front_abierto [falopa → Pibe Tigre → ninjas se van]
super_chino --vende--> diosa_tropical
super_chino --vende--> carne
super_chino --vende--> fiambre
super_chino --vende--> mega_drive
super_chino --vende--> golosinas
super_chino --da--> caramelos [vuelto]
super_chino --da--> moneyRecovered [+60 al volver por la cueva]
super_chino --contiene--> chino
chino --bloquea--> salida_sin_pagar [ninjas samurái]
```
