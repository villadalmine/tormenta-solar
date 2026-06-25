# SDD — Quest PREMIUM: mundo aleatorio generado on-the-fly por IA

- **Estado:** **Idea capturada** (dueño 2026-06-26). Diseño temprano — NO implementado. Activación TBD.
- **Relacionado:** [`modelo-de-entidades.md`](modelo-de-entidades.md) (motor data-driven `Mundo.fromModel` → carga un
  mundo desde DATOS), [`suscripcion.md`](suscripcion.md) (gating premium), [`ia-openrouter.md`](ia-openrouter.md) /
  [`proxy-ia-deploy.md`](proxy-ia-deploy.md) (el modelo lo sirve el proxy), [`spinoff-stargate.md`](spinoff-stargate.md)
  (los "mundos random" = planetas que discás).

## 1. La idea (del dueño)
Un **quest** (cómo se activa: TBD; **obvio que con el plan PREMIUM**) que te lleva a un **mundo aleatorio creado
on-the-fly**: o sea **la IA "codea" el mundo** y vos **accedés** a jugarlo. Cada vez, un mundo distinto generado por IA.
Pregunta del dueño: **¿se puede hacer algo así?** → **Sí.** Hay dos sabores (de seguro→potente):

## 2. ¿Se puede? Sí — dos formas

### 2.A — IA genera DATOS del mundo (RECOMENDADO, seguro, ya casi listo)
El motor **ya es data-driven**: `Mundo.fromModel(window.LEVEL1)` arma un nivel entero desde un **JSON** (salas, NPCs,
enemigos, puertas, items) validado contra `levels/level.schema.json`. → El quest premium le pide al **modelo** (vía el
proxy) que **genere ESE JSON** (un mundo nuevo: bioma, salas, enemigos, loot, un objetivo) → el juego lo **carga como
nivel** y lo jugás. **La IA no ejecuta código: produce DATOS**, y el motor existente los corre. Cero riesgo de seguridad,
y reusa todo lo construido. El "mundo lo codeó la IA" = la IA escribió el **modelo** del mundo.
- **Cómo:** endpoint `POST /mundo-ai` (premium) → el proxy llama al modelo con el **schema** + una semilla/tema →
  devuelve JSON → se **valida contra el schema** (si no valida, se rechaza/re-pide) → `Mundo.fromModel(json)` →
  entrás. Determinismo opcional por **seed** (mismo seed = mismo mundo, para compartir).
- **Premium:** gateado por `X-Sub-Code` (suscripcion.md). El free no genera (cuesta tokens); el premium sí.

### 2.B — IA genera CÓDIGO que corre en tu máquina (potente, necesita sandbox/confianza)
"La IA codea el código en tu máquina local y vos accedés" en sentido literal:
- **En el browser:** el modelo devuelve **JS** y el juego lo ejecuta con `new Function(...)` en un **sandbox** (un
  Web Worker / iframe aislado, sin acceso al DOM principal ni a credenciales). Potente (mecánicas nuevas, no solo
  datos) pero **ejecutar código de un modelo es riesgoso** → hay que **sandboxear fuerte** y, idealmente, **validar/
  limitar la API** que el código puede tocar. Sólo premium + con disclaimer.
- **En "tu máquina" de verdad (self-host/desktop):** un **agente con acceso a filesystem** (MCP/Claude Code-like)
  escribe archivos del mundo en tu disco y el juego los levanta. Esto es **fuera del browser** (otra topología) —
  encaja si hay una app local/agente, no en GitHub Pages.

## 3. Recomendación
Arrancar por **2.A (datos)**: es seguro, reusa el motor data-driven y el proxy/premium que ya existen, y entrega el
99% de la sensación ("un mundo nuevo que armó la IA cada vez"). **2.B (código)** queda como fase avanzada con sandbox.
El **validar-contra-schema** es la pieza clave: garantiza que el mundo de la IA sea jugable y no rompa el juego.

## 4. Preguntas abiertas (para el dueño)
- ¿Cómo se **activa** el quest? (un NPC, un item, el stargate del spinoff, un botón premium). · ¿Tema libre o el
  jugador elige (terror/espacio/medieval)? · ¿Mundo **efímero** (una corrida) o **guardable/compartible** por seed? ·
  ¿Objetivo del mundo (sobrevivir/llegar a la salida/matar al boss)? · ¿Qué modelo (calidad vs costo) genera el JSON? ·
  ¿2.B alguna vez, o nos quedamos en 2.A (datos) por seguridad?
