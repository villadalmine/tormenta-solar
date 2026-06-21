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
  el mercado** para ir al recital → la **puerta del frente del chino queda ABIERTA**.
- La falopa se consigue en los **cajones de los muebles de lujo** (pisos impares) tras el colapso.
- Ver el flujo completo en [`../loop-supervivencia.md`](../loop-supervivencia.md).

## Aristas
```
cemento --contiene--> iorio
iorio --quiere--> falopa
iorio --desbloquea--> chino_front_abierto [toca Pibe Tigre → ninjas se van]
falopa --se_consigue_en--> muebles_lujo [pisos impares, post-colapso]
```
