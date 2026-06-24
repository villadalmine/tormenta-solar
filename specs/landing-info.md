# SPEC: Landing `/info` — página linda del juego + presencia en redes

- **Estado:** **Draft** (diseño — no implementado)
- **Nivel:** transversal (marketing / sitio)
- **Última actualización:** 2026-06-24

## 1. Contexto y objetivo

Una **página de presentación linda** del juego, en **GitHub Pages**, en la **misma URL + `/info`**
(`villadalmine.github.io/tormenta-solar/info`). Objetivo: que sirva para **compartir en redes** (preview
lindo al pegar el link), contar **de qué trata**, mostrar que **se actualiza siempre**, que tiene **mejoras
basadas en personajes / momentos de la historia / puzzles-enigmas**, que está **lleno de IA dinámica**, qué
**tecnología** usa, y **por qué te atrapa**. Es la portada/landing de marketing, separada del juego pero
linkeada con él.

## 2. Hosting y URL (sin build, 100% estático)

- **`/info/index.html`** → GitHub Pages lo sirve en `…/tormenta-solar/info`. CSS propio (`info/info.css`),
  imágenes en `info/img/`. Cero build, igual que el resto.
- **Link bidireccional:** la intro del juego linkea a `/info` ("¿Qué es esto?") y la landing tiene un CTA
  grande **"▶ JUGAR"** → `../` (el juego). También botón a GitHub (ya existe el repo linkeado).
- Reusa la **presencia "jugando ahora"** (`presence.js`) si se quiere mostrar el contador en la landing.

## 3. Estructura de la página (secciones)

1. **Hero:** título **TORMENTA SOLAR**, tagline (ej. *"Comprás dólares en Florida y Lavalle… y el sol se
   apaga"*), un **GIF/screenshot** del juego, CTA **JUGAR** + **GitHub**, badge "open source · GPLv3".
2. **¿De qué va?** pitch corto: shooter 2D de humor porteño; arranca comprando verdes en la cueva, estalla
   una **tormenta solar**, y el barrio se vuelve un quilombo del que tenés que sobrevivir y entender.
3. **El protagonista** (§5): el **linyera excéntrico** de Florida y Lavalle — perfil bajo, sucio, no le
   importa la apariencia, ve el sistema desde afuera. Con homenaje a personajes reales (links).
4. **Personajes:** el **linyera-oráculo** (te tira pistas), **Iorio** (metal en Cemento), los **cueveros**
   (arbolitos), el **Tahúr** (truco), el **chino** y sus ninjas, los **3 borrachines**, etc.
5. **Momentos de la historia:** la **tormenta solar**, el **loop de supervivencia**, las dos rutas al chino,
   el **búnker de los linyeras**, el **portal final** (salto temporal).
6. **Puzzles / enigmas:** el **grafo de historia** (qué destraba qué), pistas escaladas, **quests** y
   **mejoras** que desbloqueás (Metroidvania: volvés con algo nuevo y se abren puertas).
7. **IA dinámica:** chateás con NPCs (con tu voz porteña), un **oráculo que entiende tu partida**
   (GraphRAG), objetos/zonas que **se mutan solos** de forma razonada, y diálogos generados. Modelo
   **data-driven** que permite **temporadas / contenido nuevo** sin recompilar.
8. **Tech (comentá todo lo que usamos):** **JS vanilla + HTML5 Canvas sin build**, **i18n ES/EN**
   (transcreación del humor), **modelo de entidades data-driven** (motor v2), **grafo de historia +
   HintEngine**, **IA por OpenRouter / BYOK / vLLM self-host**, **música chiptune procedural**, **mobile/touch**,
   **guardado en localStorage**, **tests en CI** (e2e + paridad + web-smoke). Todo **open source**.
9. **Por qué te atrapa:** humor porteño, **rejugabilidad** (cada vuelta cambia), **contenido vivo** (la
   semana de nuevos quests), secretos, y un mundo que reacciona.
10. **Novedades / siempre actualizado** (§4 abajo): últimas entradas del CHANGELOG.
11. **Footer:** GPLv3, link al repo, créditos, (opcional) contador "jugando ahora".

## 4. Redes sociales + SEO (el preview lindo)

- **Open Graph + Twitter Card** en el `<head>`: `og:title`, `og:description`, `og:image`
  (`info/img/og.png`, 1200×630, un screenshot con el título), `og:url`, `twitter:card=summary_large_image`.
  → al pegar el link en WhatsApp/Twitter/Discord/Telegram aparece la tarjeta con imagen.
- **Meta** `description`, `theme-color`, favicon. Idioma `es` (y quizá una versión `en`).
- **"Siempre se actualiza":** sección **Novedades** alimentada del `CHANGELOG.md` — un mini script
  (estilo `gen-historia`/`gen-level`) que toma las últimas N entradas del changelog y las escribe en
  `info/novedades.html`/JSON. Así la landing "se actualiza sola" en cada release. (O, mínimo, un link al
  CHANGELOG.) Cuadra con el patrón del repo (data → generador → artefacto).

## 5. El protagonista: un linyera excéntrico real de Buenos Aires (investigación)

El pedido: el personaje principal = un **linyera famoso/excéntrico** de Buenos Aires (Florida y Lavalle),
**perfil bajo, sucio, que no le importa la apariencia**, que ve la vida desde afuera. Candidatos reales
(con fuentes; **decisión del dueño** cuál se usa como homenaje, §7):

- **"Pechito" (Alejandro Ferreiro)** — *el linyera más famoso de Buenos Aires*, elocuente y querido, tema
  de un documental ("Pechito, hijo de la vida"). Encaja perfecto con el tono (perfil bajo, sabiduría de
  calle). Fuente: [loqueva.com](https://loqueva.com/pechito-hijo-de-la-vida-el-documental-del-linyera-mas-famoso-de-buenos-aires/).
- **Dante A. Linyera** (Francisco Bautista Rímoli, 1903-1938) — poeta/periodista lunfardo, anarquista,
  vivió en la pobreza; usó *"Linyera"* como nombre. Tiene Wikipedia:
  [es.wikipedia.org/wiki/Dante_A._Linyera](https://es.wikipedia.org/wiki/Dante_A._Linyera). Buen **homenaje
  literario** (le da nombre y voz al personaje).
- **Diógenes y el Linyera** — la mítica tira de Clarín (un linyera de plaza filósofo + su perro). El juego
  YA le guiña con el "linyera filósofo / Diógenes". Ref cultural:
  [buenosaires.gob.ar/diogenes-y-el-linyera](https://buenosaires.gob.ar/diogenes-y-el-linyera).
- **Guiño de TONO (no es linyera): Pappo** (Norberto "Pappo" Napolitano) — actitud anti-sistema, descuidado,
  sin vueltas; sirve como **vibra/actitud** del personaje, no como su identidad.

> **Recomendación:** protagonista = **"El Linyera de Florida"**, homenaje a **Pechito** (el real famoso) con
> nombre/voz inspirados en **Dante A. Linyera** y el guiño a **Diógenes y el Linyera** (que ya está en el
> juego). Actitud con un toque **Pappo**. En la landing va una línea + link de Wikipedia. (Hoy el jugador es
> un porteño genérico comprando dólares; re-tematizarlo como este linyera es una decisión de lore, §7.)

## 6. Estética y criterios de aceptación

- **Estética** coherente con el juego: pixel/CRT, paleta retro, fuente monospace, humor porteño.
- **Responsive** (se ve bien en celu) y **liviana** (imágenes optimizadas).
- **Criterios:** carga estática en GitHub Pages en `/info`; **OG/Twitter válidas** (probar con el validador
  de cada red); link bidireccional juego↔landing; la sección Novedades refleja el último release.

## 7. Decisiones abiertas

1. **¿Qué personaje real** como homenaje del protagonista? (Pechito / Dante A. Linyera / mix — §5). ¿Y se
   **re-tematiza el jugador** en el juego o sólo en la landing?
2. **Novedades:** ¿autogeneradas del CHANGELOG (script) o link simple? (Recomendado: script, mantiene el
   "siempre actualizado" sin laburo manual.)
3. **Imagen OG:** ¿un screenshot del juego, o un arte dedicado del linyera protagonista?
4. **¿Versión en inglés** de la landing (`/info/en`)? El juego ya es bilingüe.

---

> Relacionados: la intro de `index.html` (link bidireccional), `presence.js` (contador opcional),
> `CHANGELOG.md` (fuente de "Novedades"), [modelo-de-entidades.md](modelo-de-entidades.md) (la IA dinámica /
> contenido vivo que se promociona), [idiomas.md](idiomas.md) (landing bilingüe).
