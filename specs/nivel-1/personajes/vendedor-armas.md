# PERSONAJE: El Misterioso de las armas (fierro criollo)

- **Nodo id:** `vendedor_armas`  ·  **Tipo:** `npc`  ·  **Nivel:** 1
- **Sala(s):** 6 (Galería — Subsuelo 1)  ·  **Estado:** Implemented

## Resumen
Un personaje **misterioso** en la galería de las cuevas. **Antes de la tormenta** te chamuya pero no
te vende nada. **Cuando colapsa el espacio-tiempo** y las **armas eléctricas dejan de andar**, abre
un trapo en el piso y te vende **fierro criollo medieval**: **rebenque, boleadoras, facón y un FAL de
Malvinas**.

## Detalle
- `action:'armas'`. Pre-tormenta: *"guardá la guita, con la luz todavía andando las eléctricas te
  alcanzan; volvé cuando se pudra todo"*.
- Post-tormenta (`stormed`): por **15 monedas** te arma → **+40 munición, +20 vida** (representa el
  arsenal). *"Las eléctricas no andan con la tormenta, pibe. Llevate fierro criollo de verdad."* ⚔️🇦🇷
- Compra **única** (flag `n.armado`).
- **Simplificación (MVP):** los 4 fierros son **flavor + un bonus de munición/vida**; no cambian el
  sistema de combate (sigue el escupitajo). Un sistema de armas real (melee/cuerpo a cuerpo, daño por
  arma) queda como futuro.

## Personalidad (fuente para el generador de diálogos y el chat IA)
- **Voz / tono:** misterioso, susurrante, vendedor de la galería; tono de "vení que tengo algo".
- **Cómo habla:** slang porteño bajo perfil, frases cortas; con la tormenta se pone épico-criollo
  ("las eléctricas no andan, llevate fierro de verdad").
- **Contexto (qué sabe):** que post-colapso las armas eléctricas no sirven; vende **fierro criollo**:
  rebenque, boleadoras, facón, un FAL de Malvinas.
- **Quiere:** venderte el arsenal (15 monedas).
- **Qué NO dice:** pre-tormenta no vende ("volvé cuando se pudra todo"); no rompe la 4ª pared.
- **Persona de chat:** `vendedor_armas` (definible). Hoy es **shop** (acción).
- **Semilla para el script:** «misterioso de la galería que, tras la tormenta, vende armas medievales
  criollas porque las eléctricas no andan».

## Aristas
```
galeria --contiene--> vendedor_armas
vendedor_armas --requiere--> stormed [solo vende con la tormenta]
vendedor_armas --vende--> fierro_criollo [rebenque/boleadoras/facón/FAL → +munición +vida]
```

## Grafo de historia (lo lee `tools/gen-historia.mjs` → ver [historia-grafo.md](../historia-grafo.md))
```hist
{
  "id": "armas",
  "title": "Comprar fierro criollo (con la tormenta, las eléctricas no andan)",
  "at": "galeria",
  "pri": 23,
  "pre": { "stormed": true },
  "sets": { "armado": true },
  "hints": {
    "es": [
      "Con la luz cortada, lo eléctrico no sirve. Hay un misterioso que tiene fierro de otra época...",
      "En la galería hay un tipo que, con la tormenta, vende armas que SÍ funcionan sin luz.",
      "Hablá con el misterioso de la galería y comprale fierro criollo (rebenque/facón/FAL): +munición +vida.",
      "¡Andá al misterioso de la GALERÍA y comprá el FIERRO CRIOLLO! Te suma munición y vida, dale."
    ],
    "en": [
      "With the power down, electric stuff is useless. There's a mysterious guy with old-school iron...",
      "In the gallery there's a guy who, with the storm, sells weapons that DO work without power.",
      "Talk to the mysterious guy in the gallery and buy criollo steel (whip/facón/FAL): +ammo +life.",
      "Go to the mysterious guy in the GALLERY and buy the CRIOLLO STEEL! It adds ammo and life, come on."
    ]
  }
}
```
