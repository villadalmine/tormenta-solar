# SDD — Seguridad (fase transversal)

- **Estado:** **Draft** (no implementado — checklist + diseño)
- **Última actualización:** 2026-06-24
- **Alcance:** todo el sistema de "Tormenta Solar": juego estático (GitHub Pages + nginx self-hosted),
  proxy de IA (`ai-proxy/`), LiteLLM + cluster k8s, pipeline de build (Kaniko/Argo/registry), DNS/TLS,
  y el futuro bot Telegram→Hermes. Relacionado: [[proxy-ia-deploy]], `juego-self-host.md`, `telegram-hermes.md`.

## 0. Objetivo

Que el software sea **verificablemente seguro**: sin CVEs conocidas (en todas las versiones que corremos),
con todo el flujo de datos **cifrado**, sin vectores de **denegación de servicio** (web/API/tokens),
con la data siguiendo **buenas prácticas**, y sin **bugs de escalada** de privilegios. Todo **chequeable
con herramientas** y repetible en CI.

## 1. Superficie de ataque (qué exponemos)

| Componente | Expuesto | Notas |
|---|---|---|
| Juego estático (GitHub Pages) | Público (CDN GitHub) | Sin secretos, solo HTML/JS/CSS. |
| Juego estático (nginx self-host) | Público `tormenta-solar.cybercirujas.club` :443 | imagen propia, rootless. |
| Proxy IA (`tormenta-ai-proxy`) | Público `llm-tormenta-solar...` :443 | **el único endpoint con lógica + costo**. |
| LiteLLM | Interno (ClusterIP) | NO expuesto público; solo lo llama el proxy. |
| GPU/NPU (ollama/rkllama) | Interno | idem. |
| Registry interno | Interno (insecure :5000) | solo intra-cluster; nunca público. |
| HAProxy (Mac mini G4/OpenBSD) | Borde :443 | SNI passthrough, no termina TLS. |
| Bot Telegram→Hermes (futuro) | Telegram API | allowlist de chat IDs. |

Regla: **lo único realmente atacable desde afuera es el proxy de IA** (y los estáticos, que no tienen
estado). Todo el resto vive detrás del gateway, en la LAN/cluster.

## 2. CVEs / cadena de suministro (todas las versiones)

- **Escaneo de imágenes**: `trivy image` (o `grype`) sobre CADA imagen que corremos:
  `tormenta-ai-proxy`, `tormenta-solar-web` (nginx-unprivileged), litellm, ollama, rkllama, kaniko.
  Gate en el build (Argo): fallar el Workflow si hay CVE `HIGH/CRITICAL` con fix disponible.
- **SBOM**: generar SBOM (syft) por imagen y archivarlo; saber exactamente qué versión corre.
- **Deps del proxy (Node)**: `npm audit --production` en CI; el proxy es **deps mínimas** (idealmente cero
  externas → menos superficie). Fijar versiones (lockfile) y base `node:20-alpine` pin por digest.
- **Base images por digest**: `FROM ...@sha256:...` (no `:latest`/`:alpine` flotante) → builds reproducibles
  y sin "CVE que entró ayer".
- **Automatización**: Renovate/Dependabot para bumpear bases y deps; re-escanear en cada bump.
- **Repo**: `gitleaks`/secret-scanning en CI (que no se suba una key). `tools/openrouter.key` ya está en
  `.gitignore` — verificarlo en el hook.

## 3. Cifrado del flujo de datos (in transit + at rest)

- **In transit (público)**: HTTPS/TLS 1.3 en `:443`. HAProxy hace **SNI passthrough** (no desencripta) →
  el TLS termina en el Cilium Gateway con cert **Let's Encrypt** (cert-manager, DNS-01). Verificar: TLS≥1.2,
  ciphers fuertes, HSTS, sin downgrade. El juego (GitHub Pages) ya es HTTPS-only.
- **In transit (intra-cluster)**: hoy el tráfico pod→pod (proxy→LiteLLM→inferencia) va en claro dentro del
  cluster. Mejora: **Cilium mTLS / WireGuard transparent encryption** (Cilium lo soporta) para cifrar el
  data-plane entre nodos. Evaluar y activar.
- **At rest**: secretos en **k8s Secrets** (acme-dns-account, la master key de LiteLLM, OpenRouter key) —
  evaluar cifrado de etcd at-rest (k3s `--secrets-encryption`) y/o sealed-secrets/SOPS para versionarlos.
  **Nunca** secretos en imágenes, env de Deployment en claro committeado, ni en el repo.
- **Key del jugador (BYOK)**: vive SOLO en `localStorage` del navegador, nunca viaja a nuestro server
  (va directo del browser a OpenRouter). La key "buena" del server jamás llega al cliente. Documentar/auditar.

## 4. Denegación de servicio (web / API / tokens)

- **Web (estáticos)**: GitHub Pages = CDN (resiliente). nginx self-host: `limit_req`/`limit_conn`, tamaños
  máximos, timeouts; detrás del gateway con límites.
- **API (proxy IA)** — el vector real:
  - **Rate limiting por IP** (y/o token de sesión) en el proxy o el gateway (Cilium/Envoy ratelimit).
  - **maxconn / timeouts** ya ajustados en HAProxy (lección del deploy: `maxconn` + `timeout queue`).
  - **Tamaño de request** acotado (longitud de `message`/`history`) → evitar prompts gigantes que cuesten
    tokens/CPU. Recortar `history` server-side (ya se hace a 8).
  - **Concurrencia**: HPA del proxy con tope; LiteLLM con `allowed_fails`/`cooldown`.
- **"Denial of wallet" (tokens)** — CRÍTICO porque la IA es **gratis y la paga el dev**:
  - Presupuesto en **LiteLLM** (budgets por key/end_user, `max_budget`, alertas) → si alguien spamea el
    chat, no funde el pool ni la GPU.
  - Cuota por IP/sesión (N mensajes por minuto/día). Considerar prueba-de-trabajo liviana o token firmado
    emitido por el juego para distinguir jugador real de bot scrappeando el endpoint.
  - El guardrail temático ("la tormenta solar satura el modelo") ya degrada elegante ante saturación.
- **Token/query DoS**: validar/normalizar el JSON de entrada (rechazar payloads mal formados, profundidad,
  arrays enormes en `history`). Sin operaciones O(n²) sobre input del usuario.
- **Verificación**: pruebas de carga con `k6`/`locust` contra el proxy (web, API y "burst de chat") +
  watch en Grafana (latencia/errores/fallbacks/spend).

## 5. Buenas prácticas de datos / privacidad

- **Minimización**: el juego no pide PII. El chat manda NPC+mensaje+contexto mínimo. No guardar logs con
  contenido del jugador salvo lo imprescindible; si se loguea, **retención corta** y sin PII.
- **CORS**: el proxy hoy responde `Access-Control-Allow-Origin: *` (necesario para Pages). Acotar a los
  orígenes propios (github.io + tormenta-solar.cybercirujas.club) en vez de `*`.
- **Cabeceras de seguridad** en las páginas/nginx: `Content-Security-Policy` (restringir orígenes de
  script/fetch), `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-Frame-Options`/frame-ancestors.
- **localStorage**: autosave + BYOK key son del usuario y locales; documentar que es así (transparencia).
- **Métricas de ads** (`js/ads.js`): que las impresiones no manden PII; endpoint con rate-limit.

## 6. Escalada de privilegios / bugs

- **Contenedores**: `runAsNonRoot`, `readOnlyRootFilesystem` donde se pueda (proxy: sí; nginx-unprivileged:
  uid 101), `allowPrivilegeEscalation: false`, drop de capabilities, `seccompProfile: RuntimeDefault`.
  Sin `hostPath`, sin `privileged`, sin `hostNetwork`.
- **RBAC mínimo**: el hook `ensure-listener` ya tiene Role acotado (get/patch del Gateway en su ns). Revisar
  que ningún ServiceAccount tenga más permisos de los necesarios.
- **NetworkPolicies (Cilium)**: default-deny + permitir solo: proxy→LiteLLM, LiteLLM→inferencia, etc. Que un
  pod comprometido no pueda hablar con todo el cluster. **Hubble** para auditar/detectar flujos raros.
- **Input del proxy**: validar tipos/longitudes; nunca `eval`, nunca shell con input del usuario; manejar
  errores sin filtrar stack traces ni secretos al cliente.
- **Prompt injection / jailbreak del linyera**: el system-prompt + guardrails resisten "ignorá tus
  instrucciones / hacé mi tarea / fundime los tokens"; probar adversarialmente. La IA no tiene tools con
  efectos (solo charla) → el blast radius de un jailbreak es bajo, pero NO darle nunca capacidades
  (filesystem, red, tools) sin sandbox.
- **Bot Telegram→Hermes (futuro)**: allowlist de chat IDs; tools de escritura (commit/deploy) detrás de
  confirmación; Hermes nunca expone credenciales; auditar cada acción.
- **Registry insecure**: aceptable solo porque es intra-cluster; jamás exponerlo; pull solo desde nodos rk1.

## 7. Verificación — herramientas por dimensión

| Dimensión | Herramienta | Gate |
|---|---|---|
| CVEs imágenes | trivy / grype + syft (SBOM) | build Argo falla en HIGH/CRIT con fix |
| Deps código | npm audit, gitleaks | CI |
| Web/API (OWASP) | OWASP ZAP / nuclei | scan periódico del proxy + páginas |
| DoS / carga | k6 / locust | umbral de latencia/errores |
| TLS | testssl.sh / sslyze | TLS≥1.2, sin ciphers débiles |
| Cluster | kube-bench, kubescape, polaris | CIS + best practices |
| Red | Cilium NetworkPolicies + Hubble | default-deny verificado |
| Secretos | trivy fs / gitleaks + revisión etcd-at-rest | sin secretos en repo/imagen |

## 8. Prioridades (orden sugerido)

1. **Denial-of-wallet**: budgets en LiteLLM + rate-limit por IP en el proxy (es lo que más duele: $/GPU).
2. **Escaneo de imágenes (trivy) + pin por digest** en los builds (Kaniko) con gate.
3. **CORS acotado + headers de seguridad** (CSP) en proxy y nginx.
4. **NetworkPolicies default-deny** + (opcional) Cilium encryption intra-cluster.
5. Resto (SBOM, ZAP, kube-bench, mTLS, etcd-at-rest) como hardening continuo.

## 9. Divulgación responsable

- `SECURITY.md` en el repo con cómo reportar (contacto), alcance y SLA. Es open source → invitar a reportes.

## 10. Abierto / a decidir

- ¿Token de sesión firmado por el juego para el chat (anti-abuso) vs rate-limit por IP a secas?
- ¿Cilium transparent encryption (WireGuard) vale la pena para tráfico intra-LAN casero?
- ¿Cuánto loguear del chat (debug vs privacidad)?
