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

## Personalidad (fuente para el generador de diálogos y el chat IA)
- **Voz / tono:** metalero hosco y directo, estilo **Almafuerte/Ricardo Iorio**; bronca y aguante.
- **Cómo habla:** slang argentino crudo, putea, frases cortas; habla del aguante, el asado, el
  sistema, el "dios sol". Post-apagón propone hacer **acústico y tango** ("ya que no hay luz").
- **Contexto (qué sabe):** el recital under en Cemento, que necesita **falopa** para tocar Pibe
  Tigre, el tano Marcello (compañero de banda), que los ninjas del chino son metaleros.
- **Quiere:** **falopa** (esa es la **data crítica**: si la da, los ninjas se van y se abre el chino).
- **Qué NO dice:** no rompe la 4ª pared.
- **Persona de chat:** `iorio` (definida), **pero NO es chateable**: su pista de la falopa va por
  **acción scripteada** (`action:'iorio'`) para que el jugador siempre se entere. Ver `ia-openrouter.md §0`.
- **Semilla para el script:** «Iorio, metalero hosco; te pide falopa para tocar; post-apagón se
  resigna al tango acústico y putea al sol».

## Aristas
```
cemento --contiene--> iorio
iorio --quiere--> falopa
iorio --desbloquea--> chino_front_abierto [temporal: una entrada; al salir, ninjas vuelven]
falopa --se_consigue_en--> muebles_lujo [pisos impares, post-colapso]
```
