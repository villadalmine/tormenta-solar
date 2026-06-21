# SPEC: El loop — supervivencia (Nivel 1)

- **Estado:** Draft (diseño; lo único que ya existe en código es la puerta secreta super→cueva)
- **Nivel:** 1 — Florida y Lavalle
- **Última actualización:** 2026-06-21

## 1. Objetivo del loop
Quedarse en el refugio (en vez de salir por el portal) tiene una **meta: SOBREVIVIR**. Tu **vida baja
con el tiempo**; para no morir tenés que **salir a comprar comida al chino**. Pero el mundo colapsó y
el chino está atrincherado: conseguir **comida** (y la **plata** para pagarla, y la forma de
**entrar**) es el juego del loop. Termina cuando **vos** decidís irte por el **portal** de la Casa de
Cambio.

## 1.1 El loop SOLO existe después de la tormenta (storm-gated)
**Importante:** la supervivencia arranca **recién con la tormenta solar** (`stormed`). Antes de eso:
- El **búnker está inerte**: solo hay **linyeras y el catre**. **Dormir no hace nada** (no hay caos
  del que refugiarse). *(Implementado v=38: el catre chequea `stormed`.)*
- Podés desbloquear el búnker (tótem) antes de la tormenta, pero **no pasa nada** hasta que estalle.

Con `stormed = true`, el mundo queda en **caos permanente** y arranca el ciclo de abajo. **Dormir en
el catre = pasa un DÍA**, pero **el caos sigue igual** (NO es un reset limpio del nivel; el mundo
post-tormenta persiste).

## 2. La vida decae (post-tormenta)
- **Decisión:** la vida baja **−3 cada 30 segundos** (tiempo real), una vez estallada la tormenta.
- **Comida del chino** restaura vida → es la única forma de compensar el desgaste.
- Si la vida llega a **0**: **morís** y **volvés al loop anterior** (día `loopCount − 1`), no es un
  game-over seco.

## 3. Entrar al chino (está atrincherado)
Tras la tormenta, el **super chino** se **atrinchera**: **ninjas samurái**, **barricadas de fuego**
y **granadas** en el **frente**. **No entrás por adelante.** Hay **dos formas**:

### Opción A — La puerta trasera (refugio → chino)
La **puerta secreta del chino** (la misma que conecta super↔cueva) es la **entrada de servicio**:
desde el **búnker del cuevero** (la **cueva del dólar**, sala 8 — tu refugio) entrás al chino **por
atrás**, esquivando la barricada. Comprás comida y volvés.
> Hoy esa puerta existe en una sola dirección (`enterCuevaFromSecret`, super→cueva). **Falta** el
> sentido inverso (cueva→chino) y el modo "comprar comida".

### Opción B — Iorio y el Pibe Tigre (ventana TEMPORAL, repetible)
Vas a **Cemento** y le pedís ayuda a **Iorio**. Le das **falopa** → **toca "Pibe Tigre"** 🤘 → los
**ninjas (metaleros) abandonan el chino** y se van **al recital**, dejando la **puerta del chino
abierta**. Pero es una **ventana corta y de una**:
- **Entrás, comprás y salís.** Cuando salís, **los ninjas YA volvieron** a la barricada e **Iorio
  volvió a su estado anterior** (puteando al dios sol). Si querés otra vuelta, **le das falopa de
  nuevo** (por eso la falopa es un recurso que gastás).
- Flavor de Iorio al volver: *"...la puta que te parió, dios sol... ¡Che, tano Marcello! Menos mal
  que ahora hacemos acústicos y tango, total ya no hay luz."* 🎻 (post-tormenta no hay electricidad).
Ver [`personajes/iorio.md`](personajes/iorio.md).

## 4. Recursos (de dónde sale todo)

### Falopa (para Iorio)
Cuando la tormenta **colapsa** todo, los **muebles de lujo** de los pisos impares pasan a tener
**cajones llenos de falopa**. La juntás de ahí. **Se acaba**: hay **10 pisos de lujo**, debería
alcanzarte. Recurso **finito** → tensión de supervivencia.
- **Decisión:** la **falopa se RESETEA en cada loop** (cada día volvés a tener los cajones llenos).

### Monedas (para pagar la comida)
- Salen de las **cajas fuertes** de los linyeras y del **inodoro** de los baños.
- **Decisión:** las **monedas NO se resetean del todo** entre loops — queda una cantidad **parcial y
  aleatoria** (a veces más, a veces menos). No es ni reset total ni persistencia total.
- Los **linyeras eran millonarios** que se quedaron sin laburo y se **cansaron del sistema**; guardan
  esas cosas porque **para ellos no valen nada**. Al **hablarles** te **cuentan su historia** (lo
  grandes que eran), **se ponen a llorar** arrepentidos de la vida citadina, y te dicen *"che, pibe,
  mirá ahí tengo plata"* → vas **sacando monedas**. Ver [`personajes/linyeras.md`](personajes/linyeras.md).

## 5. El bucle (resumen)
```
vida baja → necesitás COMIDA → para comprarla necesitás MONEDAS (linyeras: cajas fuertes / inodoro)
          → para ENTRAR al chino: (A) puerta trasera del refugio  ó  (B) FALOPA → Iorio toca → los
            ninjas se van → front abierto
          → comprás comida → vida sube → ... hasta que salís por el PORTAL (fin del loop)
```

## 6. Requisitos funcionales (Draft salvo lo marcado)
- **RF-L0** *(implementado v=38)* — el loop **solo existe post-`stormed`**; pre-tormenta el catre no
  hace nada.
- **RF-L1** — la vida **decae −3 cada 30 s** (tiempo real) una vez `stormed`.
- **RF-L2** — el chino **vende comida** que restaura vida (post-colapso).
- **RF-L3** — el **frente** del chino queda **barricado** (ninjas/fuego/granadas) tras `stormed`.
- **RF-L4** — **puerta trasera** cueva↔chino usable como entrada de servicio.
- **RF-L5** — **falopa**: ítem en los cajones de lujo (~10 pisos). **Se resetea cada loop.**
- **RF-L6** — **Iorio**: falopa → toca Pibe Tigre → ninjas se van → front abierto **por una entrada**;
  al **salir**, los ninjas vuelven e Iorio vuelve a su estado. **Repetible** con más falopa.
- **RF-L7** — **monedas** en cajas fuertes / inodoro. Entre loops quedan en cantidad **parcial y
  aleatoria** (ni reset total ni persistencia total).
- **RF-L8** — **dormir en el catre = pasa un día** (`loopCount++`); el mundo sigue en caos (no reset
  limpio). El loop **termina** cuando vas al **portal**.
- **RF-L9** — si la **vida llega a 0**: **morís y volvés al loop anterior** (`loopCount − 1`).

## 7. Estados y flags
| Flag | Tipo | Nota |
|---|---|---|
| `player.hp` | int | **decae −3 / 30 s** post-`stormed`; 0 → volver al loop anterior |
| `falopa` | int | ítem; **se resetea cada loop** |
| `comida` | int/acción | lo que comprás en el chino para subir vida |
| `chinoFrontOpen` | bool | Iorio tocó → front abierto **temporal** (se cierra al salir) |
| `loopCount` / `dia` | int | día del loop (dormir lo sube; morir lo baja 1) |

## 8. Aristas
```
loop --requiere--> sobrevivir
vida --decae_con--> dias
chino --vende--> comida [post-colapso]
comida --da--> vida
chino --bloquea--> entrada_frente [ninjas + fuego + granadas, post stormed]
cueva_dolar --conecta_con--> chino [puerta trasera / entrada de servicio]
muebles_lujo --da--> falopa [finita, ~10 pisos]
iorio --quiere--> falopa
iorio --desbloquea--> chino_front_abierto [toca Pibe Tigre → los ninjas metaleros se van]
linyera --da--> monedas [cajas fuertes / inodoro, "mirá ahí tengo plata"]
monedas --paga--> comida
```

## 9. Preguntas abiertas (lo resuelto quedó arriba)
- **Q2 — comida:** ¿ítem que comprás y comés cuando querés, o comer = recuperar al instante en la
  caja del chino? *(pendiente)*
- **Q6 — balance:** ¿10 pisos de falopa alcanzan por loop? ¿cuánta plata da cada linyera / inodoro?
  ¿cuánta vida da una comida vs. el −3/30 s? *(a tunear al implementar)*

> Resueltas: vida −3/30 s (Q1) · falopa resetea, plata parcial-aleatoria (Q3) · Iorio temporal y
> repetible (Q4) · muerte = volver al loop anterior (Q5).
