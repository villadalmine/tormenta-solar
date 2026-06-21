# EDIFICIO: Casa de Cambio Oficial (la SALIDA)

- **Nodo id:** `casa_cambio`  ·  **Tipo:** `edificio`  ·  **Nivel:** 1
- **Sala(s):** 13  ·  **Estado:** Implemented

## Resumen
La casa de cambio oficial, **repleta de gente** sacando número. **Antes de la tormenta no podés
entrar** (la cola no te deja). **Después**, adentro se abre el **PORTAL** = pasar de nivel. Es la
**única salida hacia adelante**.

## Detalle
- Pre-tormenta: intentar entrar tira mensajes de "está hasta las pelotas / hacé la cola".
- Cajeros + ~10 personas en la cola (flavor del quilombo cambiario).
- Post-tormenta (`stormed`): pánico, y en el fondo aparece el **portal** (`goal`). Tocarlo = `win()`.
- Contrapunto del **búnker/loop**: el portal avanza, el búnker te deja en el bucle.

## Aristas
```
calle --conecta_con--> casa_cambio
casa_cambio --bloquea--> entrada [hasta stormed]
stormed --desbloquea--> portal [en casa_cambio]
casa_cambio --da--> WIN [tocar el portal]
casa_cambio --contiene--> elenco_cola_cambio
```
