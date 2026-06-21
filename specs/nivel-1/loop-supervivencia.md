# SPEC: El loop — supervivencia (Nivel 1)

- **Estado:** Draft (diseño; lo único que ya existe en código es la puerta secreta super→cueva)
- **Nivel:** 1 — Florida y Lavalle
- **Última actualización:** 2026-06-21

## 1. Objetivo del loop
Quedarse en el refugio (en vez de salir por el portal) tiene una **meta: SOBREVIVIR**. Cada día del
loop tu **vida baja**; para no morir tenés que **salir a comprar comida al chino**. Pero el mundo
colapsó y el chino está atrincherado: conseguir **comida** (y la **plata** para pagarla, y la forma
de **entrar**) es el juego del loop. Termina cuando **vos** decidís irte por el **portal** de la
Casa de Cambio.

## 2. La vida decae con los días
- Tu **vida baja** a medida que pasan los **días** del loop (timer / por vuelta).
- **Comida del chino** restaura vida → es el sumidero/fuente del bucle.
- *(Sub-decisión: ¿baja por tiempo real, por "día", o por vuelta de loop? Ver §9.)*

## 3. Entrar al chino (está atrincherado)
Tras la tormenta, el **super chino** se **atrinchera**: **ninjas samurái**, **barricadas de fuego**
y **granadas** en el **frente**. **No entrás por adelante.** Hay **dos formas**:

### Opción A — La puerta trasera (refugio → chino)
La **puerta secreta del chino** (la misma que conecta super↔cueva) es la **entrada de servicio**:
desde el **búnker del cuevero** (la **cueva del dólar**, sala 8 — tu refugio) entrás al chino **por
atrás**, esquivando la barricada. Comprás comida y volvés.
> Hoy esa puerta existe en una sola dirección (`enterCuevaFromSecret`, super→cueva). **Falta** el
> sentido inverso (cueva→chino) y el modo "comprar comida".

### Opción B — Iorio y el Pibe Tigre
Vas a **Cemento** y le pedís ayuda a **Iorio**. Iorio te pide **falopa**: si se la conseguís, **toca
"Pibe Tigre"** 🤘 y **los ninjas —que son metaleros— abandonan el mercado** para ir al recital,
dejando la **puerta del chino ABIERTA** (entrás por adelante). Ver [`personajes/iorio.md`](personajes/iorio.md).

## 4. Recursos (de dónde sale todo)

### Falopa (para Iorio)
Cuando la tormenta **colapsa** todo, los **muebles de lujo** de los pisos impares pasan a tener
**cajones llenos de falopa**. La juntás de ahí. **Se acaba**: hay **10 pisos de lujo**, debería
alcanzarte. Recurso **finito** → tensión de supervivencia.

### Monedas (para pagar la comida)
- Salen de las **cajas fuertes** de los linyeras y del **inodoro** de los baños.
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

## 6. Requisitos funcionales (Draft, sin implementar)
- **RF-L1** — la vida **decae** con el tiempo/días del loop.
- **RF-L2** — el chino **vende comida** que restaura vida (post-colapso).
- **RF-L3** — el **frente** del chino queda **barricado** (ninjas/fuego/granadas) tras `stormed`.
- **RF-L4** — **puerta trasera** cueva↔chino usable como entrada de servicio.
- **RF-L5** — **falopa**: ítem **finito** en los cajones de los pisos de lujo (~10 pisos, se agota).
- **RF-L6** — **Iorio**: darle falopa → toca Pibe Tigre → ninjas se van → front del chino abierto.
- **RF-L7** — **monedas** en cajas fuertes / inodoro; los linyeras te muestran dónde (diálogo + lore).
- **RF-L8** — el loop **termina** cuando vas al **portal** (no hay que sobrevivir para siempre).

## 7. Estados y flags (propuestos)
| Flag | Tipo | Nota |
|---|---|---|
| `player.hp` | int | ya existe; ahora **decae** con los días del loop |
| `falopa` | int | ítem nuevo, finito |
| `comida` | int/acción | lo que comprás en el chino para subir vida |
| `iorioHelped` / `chinoFrontOpen` | bool | Iorio tocó → front abierto |
| `dia` | int | días sobrevividos en el loop (relación con `loopCount`) |

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

## 9. Preguntas abiertas
1. ¿La vida baja por **tiempo real**, por **"día"**, o por **vuelta de loop**? ¿Cuánto por unidad?
2. ¿La **comida** es un ítem que comprás y comés, o comer = recuperar al instante en la caja?
3. ¿La **falopa finita** se comparte entre loops o se **resetea** cada vuelta? (Coherencia con el
   "loop limpio" decidido en `conexiones-secretas-y-refugios.md`.)
4. ¿Iorio abre el chino **para siempre** o **por un rato** (los ninjas vuelven)?
5. ¿**Game over** si la vida llega a 0 en el loop? ¿Reinicia el loop o es muerte real?
6. **Balance:** ¿10 pisos de falopa alcanzan? ¿cuánta plata hay por linyera / por inodoro?
