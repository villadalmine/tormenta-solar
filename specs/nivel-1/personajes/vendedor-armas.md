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

## Aristas
```
galeria --contiene--> vendedor_armas
vendedor_armas --requiere--> stormed [solo vende con la tormenta]
vendedor_armas --vende--> fierro_criollo [rebenque/boleadoras/facón/FAL → +munición +vida]
```
