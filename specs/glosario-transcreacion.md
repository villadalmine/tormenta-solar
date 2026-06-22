# Glosario de transcreación (es-AR → en)

- **Estado:** vivo — fuente única de las decisiones de transcreación es-AR → inglés.
- **Última actualización:** 2026-06-22 (cache `v=60`)
- **Para qué:** que el inglés del juego sea **consistente** (el mismo término porteño se transcrea siempre
  igual) y que el **humor porteño no se rompa**. Lo usan: los catálogos a mano (`js/lang/*.en.js`), el
  generador de diálogos (`tools/gen-dialogos.mjs`, system prompt `en`) y el chat IA en vivo
  (`js/ai.js`, `LANG_DIRECTIVE.en`). Ver [`idiomas.md`](idiomas.md) y [`ia-openrouter.md`](ia-openrouter.md).

## Regla de oro

**Transcrear, no traducir literal.** Se busca el equivalente de *registro y chiste* en inglés
(slang callejero, actitud), no la palabra exacta. `es-AR` es la fuente; si una línea no tiene un
equivalente que cause la misma gracia, se reescribe. El objetivo es que un angloparlante **se ría de lo
mismo**, no que entienda una traducción.

## Nombres propios — se DEJAN igual (no se traducen)

Lugares, marcas, bandas y guiños culturales que son parte de la identidad del juego:

> Florida · Lavalle · Obelisco · Boca · Puerto Madero · **EducaciónIT** · **Garbarino** · **Cemento** ·
> **Iorio** · **Almafuerte** · **Diosa Tropical** · **Pibe Tigre** · **Mega Drive** · **FIFA 98** ·
> **Malvinas** · **Monkey Island** · **truco** · **envido** · **choripán** · **arbolito** · **cuevero** ·
> **cueva** · **福 / 超市** (los caracteres chinos del super) · **God Save the Queen** (título de tema).

Las **iniciales de los palos del truco** (E/B/O/C = espada/basto/oro/copa) también quedan: son del dominio.

## Mapeo canónico de términos

| es-AR | inglés (canónico) | nota |
|---|---|---|
| pibe / flaco / loco | kid / pal / man | "kid" es el default para el narrador/NPCs hacia el jugador |
| che / hermano / maestro | man / brother / mate | informal, cálido |
| guita / plata | cash / money | nunca "dough" salvo chiste puntual |
| monedas | coins | moneda del juego |
| caramelos | candy | vuelto del chino |
| forros | rubbers | "moneda" del truco (doble sentido, se conserva el chiste) |
| falopa / merca | gear / dope | la que se le da a Iorio |
| linyera | bum | el Diógenes de Florida y los de los pisos en ruina |
| garca | crook | el que te encaja carne/fiambre en el super |
| el chino / super chino | the Chino / Chinese supermarket / corner shop | "Chino" como personaje, "corner shop" para el local |
| changuito | cart | carrito del super |
| góndola | shelf / crate | "shelf" en el super, "crate" (cajón) en la disquería |
| disquería | record shop | |
| caja (registradora) | till | la CAJA del chino |
| hasta las pelotas / hasta la teta | packed solid / all hell (out there) | "lleno" / "un caos" |
| aguante | Aguante | se deja como grito; si hace falta, "hell yeah" |
| ¡Quiero! / ¡No quiero! (truco) | I'm in! / I fold | cantos del truco |
| parda (truco) | tie | empate de mano |
| tahúr | (card) sharp | el rival del truco |
| ¿sabés qué? / andá a saber | you know what? / who knows | muletillas |

## Registro y tono

- **Voz del narrador y los NPCs:** callejera, canchera, frases cortas. Inglés coloquial, no formal.
- **Puntuación:** comillas tipográficas `“ ”` en español; en inglés comillas rectas `" "` (en JS van
  escapadas, `\"` o usando comillas simples externas). Los emojis se conservan tal cual.
- **No** se neutraliza el humor ni se "explica el chiste"; si un juego de palabras no cruza, se cambia por
  otro que sí.

## Cómo se mantiene sincronizado

- **Catálogos a mano** (`js/lang/game.en.js`, `level.en.js`, `es.js`/`en.js`): al agregar una clave nueva
  en español, transcrear el inglés siguiendo este glosario. Paridad de claves obligatoria (hoy 263/263 +
  level map; ver `idiomas.md`).
- **Diálogos generados** (`Dialogos.en`): el system prompt `en` de `gen-dialogos.mjs` ya pide transcrear y
  conservar nombres propios. Para completar/regenerar un pool puntual sin tocar el resto:
  `OPENROUTER_LANGS=en OPENROUTER_ONLY=<pool> node tools/gen-dialogos.mjs`.
- **Chat IA en vivo** (`js/ai.js`): `LANG_DIRECTIVE.en` se agrega al system prompt con la misma regla.
