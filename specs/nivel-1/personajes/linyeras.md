# PERSONAJE: Los Linyeras

- **Nodo id:** `linyera` (familia de NPCs)  ·  **Tipo:** `npc`  ·  **Nivel:** 1
- **Sala(s):** 14–33 (edificio abandonado) + 34 (búnker)  ·  **Estado:** Implemented (gurú/búnker), Draft (lore)

## Resumen
Los linyeras son **la escoria que la sociedad descartó** y, por eso mismo, **los que sobreviven** al
colapso. Tienen **3 roles** distintos en el edificio abandonado, y **cada uno dice cosas diferentes**
(nada de diálogo repetido). Filosofía: el que renunció a todo es el más libre (Diógenes porteño).

## Roles

### 1) El guardián de las JOYAS (pisos de lujo, impares)
Está en cada **piso impar** cuidando el depto. Si **tocás las joyas**, **sale** y te suelta su
filosofía y **te raja a la calle** (no te deja afanar nada). Líneas (`LINYERA_LINES`, una al azar):
- *“¡Pará, pibe! No toques eso. Vos solo, loco... esto puede afectar el espacio-temporal y me
  convierto DE VUELTA en millonario. ¡Y yo NO quiero laburaaar! Corréte, que me tapás el sol.” 🌞*
- *“Dejá el maletín ahí, maestro. Yo ya fui rico, fue un garrón. Ahora: panza al sol y cero
  quilombo. Corréte que me hacés sombra.” 🌞*
- *“¿Las joyas? Mías, de cuando era millonario. Las tocás y se rompe todo de nuevo. Andá, andá.” ✨*
- *“No, no, no. Esa guita está enchastrada con el espacio-tiempo. La agarrás y mañana tengo que ir a
  laburar. Ni en pedo, pibe.” 💼*

### 2) Los 20 linyeras / el GURÚ (piso 19)
Al intentar robar el **tótem de 3 monos** (Monkey Island), aparecen **20 linyeras** y, en vez de
echarte, te **consagran gurú** y te abren el **búnker** del piso 20. Línea canónica:
- *“¡Encontraste a nuestro dios de Monkey Island! Sos nuestro GURÚ. La puerta del PISO 20 es tuya:
  te lleva a nuestro BÚNKER, el lugar más seguro. Queda SIEMPRE abierta para vos.” 🗝️🛖*

### 3) Los tirados de los pisos pares (ruina)
En **cada piso par** hay **2–4 linyeras tirados** (mezcla de sprites `yonqui` y `linyera`), en
**posiciones que cambian por piso**, entre **muebles rotos** distintos. **Cada uno dice una frase
distinta** del pool `RUINA_LINES` (18 líneas), variando por piso e índice. Ejemplos:
- *“...andá pasando, pibe... acá no hay nada... nada...” 💀*
- *“La tele anda... si la mirás de costado y entrecerrás los ojos.” 📺*
- *“No uses ese baño, pibe, hace una semana que chorrea.” 🚽*
- *“Yo era gerente de banco, ¿sabés? Mirame ahora.” 💼*
- *“Si ves a un linyera con un tótem de monos... ese es el jefe.” 🐵* (guiño que conecta con el gurú)

### 4) Los del BÚNKER (sala 34)
Tranquilos, te tratan de **gurú**. Uno es **el catre**: `action:'loop'` → te quedás en el **loop**
(reinicia el nivel). Otros dos te recuerdan que la salida real es el portal de la Casa de Cambio.

## Reglas de variación (anti-repetición)
- **Frase distinta por NPC**: índice `(n*5 + i*7) % RUINA_LINES.length` (piso `n`, linyera `i`).
- **Posición rotada por piso**: `xs[(i + (n>>1)) % xs.length]`.
- **Mueble roto distinto por piso**: `roto[(n*5 + k*3) % roto.length]`.
- **Sprite mezclado**: `linyera` si `(n+i)%3==0`, si no `yonqui`.
- Mantener este criterio: **si agrego contenido, agrego variantes**, no repito.

## Aristas
```
edificio_abandonado --contiene--> linyera [guardián de joyas, pisos impares]
linyera --bloquea--> joyas [te raja a la calle / ejectToStreet]
edificio_abandonado --contiene--> linyera [tirados, pisos pares · 2-4 por piso, variados]
totem_monos --desbloquea--> bunkerUnlocked [los 20 linyeras te hacen gurú]
bunker --contiene--> linyera [del búnker]
linyera_catre --da--> loop [action:'loop']
```
