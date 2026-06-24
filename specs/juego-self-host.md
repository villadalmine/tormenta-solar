# SDD — Self-host del juego en `tormenta-solar.cybercirujas.club`

- **Estado:** **Draft** (no implementado)
- **Última actualización:** 2026-06-24

## 1. Objetivo

Servir el juego (estático) **desde el cluster propio** en `https://tormenta-solar.cybercirujas.club`,
además de GitHub Pages. Mismo patrón self-hosted que el proxy de IA (ver `proxy-ia-deploy.md`), para que
"todo corra local" y la landing/tech page puedan decirlo con honestidad.

## 2. Estado actual (lo que YA está)

- DNS en Namecheap: `tormenta-solar` A → `81.207.69.100` (IP pública); `_acme-challenge.tormenta-solar`
  CNAME → `ed2afb40-f5d8-4a43-9a23-e7d0f2edfa22.auth.acme-dns.io` (acme-dns ya registrado y en el secret).
- HAProxy: el host ya está en las reglas SNI del `cybercirujas_backend` → VIP `192.168.178.200:443`.
- **Falta TODO lo del cluster**: imagen, Deployment/Service, HTTPRoute, Certificate, listener HTTPS.

## 2.5 Modos de acceso (GitHub Pages vs. infra propia) — documentado en la tech page

Viajan **dos cosas distintas** y conviene no confundirlas:

| | El juego (estáticos: HTML/JS/CSS) | El chat (IA) |
|---|---|---|
| **Qué es** | archivos estáticos, sin build | `fetch` POST al proxy |
| **MODO A — HOY** | **GitHub Pages** (CDN de GitHub), `villadalmine.github.io/tormenta-solar` | — |
| **MODO B — self-host** | **nginx en el cluster**, `tormenta-solar.cybercirujas.club` (HAProxy → Cilium Gateway → pod) | — |
| **Siempre** | — | **infra propia**: `llm-tormenta-solar...` → HAProxy(SNI) → Gateway(TLS) → proxy → LiteLLM → OpenRouter/GPU(HAMi+Ollama)/NPU RK1 |

**Clave:** el **chat siempre** sale por la infra self-hosted (la key y el fierro son del dev → gratis para
el jugador), **independientemente** de dónde se sirvan los estáticos. Self-hostear el juego (MODO B) hace
que "todo corra local", pero **no cambia** el camino de la IA. Migración A→B = activar el MODO B sin tocar
el cliente; decidir luego cuál es el canónico (ver §5).

Esto está graficado en `info/tech.html` (sección "¿Por dónde entra el juego?") con un diagrama CSS de dos
carriles (① estáticos: GitHub vs cluster · ② chat: siempre infra) + leyenda. Estilos en `info/info.css`
(`.access`/`.lane`/`.opt`).

## 3. Diseño propuesto

- **Imagen**: `nginx:alpine` sirviendo los estáticos del repo (`index.html`, `js/`, `css/`, `info/`, …).
  Dockerfile mínimo (`COPY . /usr/share/nginx/html`), build con **Kaniko + Argo** (igual que el proxy),
  push al registry interno `registry.registry:5000/ai/tormenta-solar-web:<tag>`.
  - Alternativa sin imagen propia: nginx con un `initContainer` que clona el repo, o un ConfigMap. La
    imagen propia es lo más alineado al patrón actual.
- **Chart Helm**: reusar la estructura de `ai-proxy/chart` (Deployment + Service + HTTPRoute + Certificate
  + hook ensure-listener). host `tormenta-solar.cybercirujas.club`, issuer `letsencrypt-prod`, reuso
  `cluster-gateway`. `nodeSelector` a un nodo `rk1` (donde resuelve el registry interno).
- **CORS / proxy IA**: el juego servido acá llama al mismo `llm-tormenta-solar...` (ya tiene CORS `*`).
- **Cache-busting**: el `?v=N` sigue igual; nginx no necesita config especial (los HTML llevan `no-cache`).

## 4. Pasos (cuando se implemente)

1. `Dockerfile.web` (nginx + estáticos) + workflow Kaniko.
2. Chart `web/chart` (o parametrizar el de ai-proxy).
3. `helm upgrade --install tormenta-web … --set gateway.host=tormenta-solar.cybercirujas.club`.
4. Verificar cert `READY` + `curl https://tormenta-solar.cybercirujas.club`.
5. Decidir canonical (¿redirige GitHub Pages → dominio propio, o conviven?).

## 5. Abierto / a decidir

- ¿El dominio propio es el canónico y GitHub Pages el espejo, o al revés? (SEO / og:url).
- ¿Build del web en GitHub Actions→ghcr también (portabilidad), como online-game?
