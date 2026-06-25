# SDD — Spinoff: STARGATE (SG-1 + Atlantis), fiel al canon

- **Estado:** **Idea capturada** (dueño 2026-06-26). Diseño temprano — NO implementado. El dueño lo detalla después.
- **Relacionado:** [`modelo-de-entidades.md`](modelo-de-entidades.md) (todo es entidad data-driven → razas/planetas/
  naves son `type objects`), [`nivel-1/historia-grafo.md`](nivel-1/historia-grafo.md) (grafo de historia + grounding),
  [`carteles-ia.md`](carteles-ia.md) / `Mensajero` (NPCs con IA), [`multijugador.md`](multijugador.md) (galaxias compartidas?).

## 1. La idea (del dueño)
Un **spinoff** ambientado en el universo **Stargate**: **SG-1** y, en paralelo, **Stargate Atlantis**. Tiene que ser
**MUY FIEL al canon** en: **razas**, **planetas**, **galaxias**, **personajes que podés crear de cada raza**,
**estamento militar**, y **naves**. Encaja con la semilla narrativa de Tormenta Solar (un satélite con IA salió de
órbita, viajó por la sonda más lejana a otra galaxia, y una raza "ató" el sol) → el **Stargate** es el puente natural
entre planetas/galaxias.

## 2. Por qué encaja con el motor que ya hay
- **Stargate = la "puerta" entre niveles.** Ya tenemos puertas/`transition` entre salas y el patrón "edificio = nodo
  del grafo". Un **planeta** es un nodo/zona; el **DHD/gate** es la arista que disca a otro planeta (como las puertas
  hoy, pero con dirección = dirección de gate / 7-9 chevrons).
- **Razas/naves/personajes = `type objects` data-driven** (modelo-de-entidades): cada raza es un "tipo" con sus
  componentes (tecnología, armas, naves, hostil/aliado), instanciable. Cero hardcode.
- **NPCs con IA + grounding por grafo** (Mensajero/historia-grafo): un Goa'uld, un Asgard o un Wraith hablan en
  personaje con su lore inyectado (grounding) → fieles sin alucinar.

## 3. Canon a respetar (núcleo — ampliar con el dueño)
**Galaxias:** Vía Láctea (SG-1) · Pegaso (Atlantis) · (Ida — Asgard).
**SG-1 / Vía Láctea — razas:**
- **Tau'ri** (humanos de la Tierra, SGC — el "estamento militar": SG-1..SG-x, Comando Stargate, rangos USAF).
- **Goa'uld** (parásitos, Señores del Sistema; Jaffa como ejército + símbolo larval). **Asgard** (grises, aliados,
  tecnología clonación/naves). **Replicantes** (bichos auto-replicantes — peligro). **Tok'ra** (Goa'uld disidentes,
  aliados). **Unas**, **Ancestros/Antiguos** (los que construyeron las gates), **Ori** (ascendidos hostiles).
**Atlantis / Pegaso — razas:** **Wraith** (vampiros de vida, las "reinas" y colmenas), **Genii**, **Asurans**
(replicantes humanos), **Antiguos** (Lanteans, ciudad de Atlantis), **Travelers**, **Athosianos** (Teyla).
**Naves (fieles):** Tau'ri **Prometheus / Daedalus / BC-304**, **F-302**, **Puddle Jumper**; Goa'uld **Ha'tak**,
**Al'kesh**, **planeador de la muerte**; Asgard **O'Neill/Beliskner**; Wraith **colmena (hive)** y **dardo**;
Antiguos **Aurora**, **ciudad-nave Atlantis**.
**Personajes-tipo creables por raza:** Tau'ri (oficial USAF, científico, médico), Jaffa (guerrero, Primado),
Goa'uld (Señor del Sistema), Asgard (comandante), Tok'ra, Wraith (guardián, reina), Genii, Antiguo ascendido.

## 4. Bosquejo de gameplay (a definir con el dueño)
- **Disca el gate** a distintos **planetas** (niveles/zonas), cada uno con su bioma + raza dominante + quest.
- **Creás tu personaje** eligiendo **raza** → define stats/tech/naves/diálogo (type object).
- **Militar Tau'ri:** estructura SGC (equipos SG, misiones, briefing/grounding del comando).
- **Naves** para viajar entre **galaxias** (Vía Láctea ↔ Pegaso) — como un "mapa de galaxias".
- **NPCs IA fieles**: cada raza habla con su lore (grounding por grafo, como el linyera/oráculo).

## 5. Preguntas abiertas (para el dueño)
- ¿Spinoff **separado** (otro `level`/juego) o una **zona** dentro de Tormenta Solar (el satélite-IA llega a la
  galaxia Stargate)? · ¿Alcance F1: una galaxia (Vía Láctea/SG-1) o las dos de una? · ¿"crear personaje de cada
  raza" = selector de raza con stats, o algo más profundo (árbol tech)? · ¿foco single-player o atado a
  [`multijugador.md`](multijugador.md) (equipos SG co-op)? · Licencia/marcas: es **parodia/homenaje**, sin afiliación
  (igual que el resto del juego).
