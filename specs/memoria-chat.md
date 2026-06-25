# SDD — Memoria del chat de los linyeras (hoy localStorage → a futuro DB)

- **Estado:** **Para analizar** (NO implementar ahora). El usuario decidió: **no seguir con localStorage** a largo
  plazo; pensar una memoria **persistente** más adelante. Este doc deja el estado actual + las opciones.
- **Última actualización:** 2026-06-25
- **Relacionado:** `suscripcion.md` (identidad/login = prerequisito de la DB), `ia-openrouter.md` (el chat),
  `proxy-ia-deploy.md` (el proxy es stateless), `modelo-de-entidades.md` (memoria por identidad de personaje).

## 1. Cómo funciona HOY (verificado en el código)

La memoria "los linyeras se acuerdan de vos" vive **en el navegador del jugador**, NO en el servidor:

- **`oracleMem`** (`js/game.js`): objeto en memoria, **por identidad de linyera** (`memKey` = `persona || name`),
  tope **últimos 12 turnos** (`chatHistory.slice(-12)`).
- **Persistencia:** se guarda en **`localStorage`** vía el sistema de save del juego (está en el snapshot
  `serialize()` → `oracleMem`; `restore()` lo recarga; partida nueva lo borra: "los linyeras te olvidan").
- **El proxy es STATELESS:** en cada mensaje el **cliente le manda el historial** (`AI.chat(persona, msg,
  chatHistory)` → `buildMessages` usa los últimos 8). El proxy **no guarda** nada de la conversación.
- **Consecuencia:** un **redeploy del proxio NO afecta** la memoria del chat (está en el browser). Lo único que
  reinicia el proxy es el **pool de frases de saturación** (`LINYERA_POOL`, RAM del proxy) — cosa **distinta**,
  cubierta por el seed horneado + el cron.

## 2. Límites del enfoque actual (por qué el usuario quiere cambiarlo)

- **Por navegador/dispositivo:** no te sigue entre la compu y el celu, ni entre navegadores.
- **Se pierde** si el jugador limpia el navegador, juega en incógnito, o empieza partida nueva.
- **No hay vista global** para el dev (no se puede analizar "de qué hablan con los linyeras") — y tampoco
  debería sin consentimiento (privacidad).

## 3. Opciones a futuro (a analizar)

1. **DB-backed por identidad de jugador** (lo que el usuario imagina): el historial vive en una **base de datos**
   server-side, keyed por un **id de jugador**. Requiere:
   - **Identidad/login** (hoy no hay; lo más liviano: un token anónimo por jugador en localStorage que indexa su
     memoria en la DB; lo "completo": login real — ver `suscripcion.md`).
   - **DB**: misma decisión que el pool (`carteles-ia.md §5.2`): **SQLite/Postgres sobre PVC** servido por el
     proxy, o reusar una DB del cluster. Tabla `chat_mem(player_id, persona, turns_json, updated)`.
   - **Privacidad:** guardar conversaciones server-side = datos personales → consentimiento, retención, borrado.
     Acotar (sin PII innecesaria), TTL, opt-out.
   - **El proxy deja de ser stateless** para el chat (hoy lo es) → más estado a operar.
2. **Híbrido:** localStorage como cache rápido + sync a la DB cuando hay login (lo mejor de ambos).
3. **Seguir con localStorage** (lo actual) — descartado por el usuario para el largo plazo.

## 4. Decisión

- **Ahora:** queda como está (localStorage). **No se implementa** la DB todavía.
- **Cuando se retome:** arrancar por la **identidad** (token anónimo es el paso más barato) + elegir la DB
  (probable SQLite-en-PVC vía el proxy, como el pool) + el modelo de privacidad. Cae natural junto a
  `suscripcion.md` (si hay cuentas pagas, ya hay identidad).
