# PERSONAJE: Iorio (Almafuerte)

- **Nodo id:** `iorio`  ·  **Tipo:** `npc`  ·  **Nivel:** 1
- **Sala(s):** 12 (Cemento)  ·  **Estado:** Implemented (flavor) · Draft (quest del loop)

## Resumen
El metalero de Cemento. Hoy es flavor (*"¿qué hacés, tragaleche? Rajá... traeme falopa y te toco
Pibe Tigre"*), pero en el **loop** se vuelve **clave**: es la **Opción B** para entrar al chino
atrincherado.

## Detalle (quest del loop, Draft)
- Le pedís ayuda. Iorio te **pide falopa** (`quiere falopa`).
- Si se la das → **toca "Pibe Tigre"** 🤘 → los **ninjas del chino, que son metaleros**, **abandonan
  el mercado** y se van **al recital** → la **puerta del frente del chino queda ABIERTA**.
- **Ventana TEMPORAL y de una:** **entrás, comprás y salís**. Cuando **salís**, los **ninjas ya
  volvieron** a la barricada e **Iorio volvió a su estado anterior**. Para otra vuelta, **le das
  falopa de nuevo** (es repetible mientras tengas falopa).
- **Flavor al volver** (post-tormenta, sin electricidad): putea al **dios sol** y le dice al **tano
  Marcello**: *"...la puta que te parió, dios sol... ¡Che, tano Marcello! Menos mal que ahora hacemos
  acústicos y tango, total ya no hay luz."* 🎻
- La falopa se consigue en los **cajones de los muebles de lujo** (pisos impares) tras el colapso.
- Ver el flujo completo en [`../loop-supervivencia.md`](../loop-supervivencia.md).

## Aristas
```
cemento --contiene--> iorio
iorio --quiere--> falopa
iorio --desbloquea--> chino_front_abierto [temporal: una entrada; al salir, ninjas vuelven]
falopa --se_consigue_en--> muebles_lujo [pisos impares, post-colapso]
```
