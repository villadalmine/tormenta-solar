#!/usr/bin/env bash
# deploy.sh — build + deploy + verify de TORMENTA SOLAR (proxy|web), en un solo comando.
# Encapsula TODO lo que esta sesión hicimos a mano (y rompimos): release names, namespaces, values-prod SIEMPRE
# (sin --reuse-values), y el genToken LEÍDO solo del release actual (mata el gotcha del 403). Ver specs/deploy-pipeline.md.
#
#   deploy/deploy.sh proxy 0.1.28      # build + deploy del proxy con ese tag
#   deploy/deploy.sh web 0.1.32        # idem web
#   deploy/deploy.sh proxy             # sin tag = usa el tag actual del kaniko-build.yaml (re-deploy)
#   DRY_RUN=1 deploy/deploy.sh web 0.1.32   # valida el helm (--dry-run), NO buildea ni aplica
#
# IMPORTANTE: el build clona `main` de GitHub → COMMITEÁ Y PUSHEÁ el código ANTES de correr esto.
set -euo pipefail
cd "$(dirname "$0")/.."   # raíz del repo

COMP="${1:?uso: deploy.sh <proxy|web> [tag]   (DRY_RUN=1 para validar sin aplicar)}"
TAG="${2:-}"
NS=ai
DRY="${DRY_RUN:-}"

case "$COMP" in
  proxy) RELEASE=tormenta-ai;  CHART=ai-proxy/chart; VALUES=ai-proxy/chart/values-prod.yaml
         BUILD=ai-proxy/kaniko-build.yaml; IMG=tormenta-ai-proxy;   DEPLOY=tormenta-ai-proxy; NEEDS_TOKEN=1 ;;
  web)   RELEASE=tormenta-web; CHART=web/chart;      VALUES=web/chart/values-prod.yaml
         BUILD=web/kaniko-build.yaml;       IMG=tormenta-solar-web;  DEPLOY=tormenta-web;      NEEDS_TOKEN=0 ;;
  *) echo "✗ componente inválido: '$COMP' (usá proxy|web)"; exit 1 ;;
esac

# tag: si no se pasó, leer el actual del kaniko-build.yaml
# grep -m1 (NO `| head -1`): con pipefail, head cerrando antes mata a grep por SIGPIPE → exit 141 (visto 2026-07-03)
if [ -z "$TAG" ]; then TAG=$(grep -m1 -oE "$IMG:[0-9.]+" "$BUILD" | cut -d: -f2 || true); fi
[ -z "$TAG" ] && { echo "✗ no pude determinar el tag"; exit 1; }
echo "▶ $COMP → tag $TAG   (release $RELEASE, ns $NS)${DRY:+   [DRY_RUN]}"

# genToken: SIEMPRE re-leído del release actual (no se tipea, no se commitea). Mata el gotcha del 403.
SETS=(--set "image.tag=$TAG")
if [ "$NEEDS_TOKEN" = 1 ]; then
  TOK=$(helm get values "$RELEASE" -n "$NS" -o json 2>/dev/null \
    | python3 -c 'import json,sys;print((json.load(sys.stdin).get("linyeraPool") or {}).get("genToken",""))' 2>/dev/null || true)
  if [ -n "$TOK" ]; then SETS+=(--set "linyeraPool.genToken=$TOK"); echo "  ✓ genToken recuperado del release (len ${#TOK})"
  else echo "  ⚠ sin genToken previo (¿primer deploy?) → pasalo a mano con --set linyeraPool.genToken=..."; fi
fi

if [ -n "$DRY" ]; then
  echo "  · helm upgrade --dry-run (validación, sin aplicar)..."
  helm upgrade "$RELEASE" "$CHART" -n "$NS" -f "$VALUES" "${SETS[@]}" --dry-run >/dev/null
  echo "✓ DRY_RUN OK — el helm renderiza bien (release/values/genToken correctos). No se buildeó ni aplicó."
  exit 0
fi

# 1) fijar el tag en el kaniko-build.yaml (queda para commitear)
sed -i -E "s|($IMG:)[0-9.]+|\1$TAG|g" "$BUILD"

# 2) build (Kaniko vía Argo, ns kaniko) — clona main, por eso el código tiene que estar pusheado
echo "  · build (Kaniko)..."
WF=$(kubectl create -f "$BUILD" -o name | sed 's#.*/##')
# Esperamos el Succeeded del WORKFLOW; pero si el controlador de Argo está SATURADO (muchos workflows en el ns kaniko),
# el estado del objeto puede ATRASARSE aunque el build haya terminado bien → el wait colgaría 15min y "no hay deploy".
# Por eso: si el wait falla por timeout/estado, caemos a chequear el POD del build (el trabajo REAL). Si el pod terminó
# OK, seguimos; si no, abortamos con error claro. (Lección del incidente 2026-06-28, ver specs/deploy-pipeline.md.)
if kubectl wait "workflow/$WF" -n kaniko --for=jsonpath='{.status.phase}'=Succeeded --timeout=420s 2>/dev/null; then
  echo "  ✓ build $WF OK"
else
  echo "  ⚠ el workflow no marcó Succeeded a tiempo (¿controlador saturado?). Chequeo el POD del build..."
  POD=$(kubectl -n kaniko get pods -l "workflows.argoproj.io/workflow=$WF" -o name 2>/dev/null | head -1)
  PH=$(kubectl -n kaniko get "$POD" -o jsonpath='{.status.phase}' 2>/dev/null)
  if [ "$PH" = "Succeeded" ]; then echo "  ✓ el pod del build terminó OK ($PH) — el estado del workflow venía atrasado. Sigo."; \
  else echo "  ✗ el build NO terminó OK (pod: ${PH:-desconocido}). Abortando (no hay deploy)."; exit 1; fi
fi

# 3) helm upgrade (SIEMPRE -f values-prod, sin --reuse-values)
echo "  · helm upgrade..."
helm upgrade "$RELEASE" "$CHART" -n "$NS" -f "$VALUES" "${SETS[@]}" >/dev/null
# Forzar SIEMPRE un rollout fresco: la web reusa el mismo tag (0.1.94), así que sin esto helm no detecta cambios y
# los nodos quedan con la imagen cacheada (IfNotPresent). restart + pullPolicy:Always = el rebuild propaga seguro.
# Para el proxy (tag inmutable que ya cambia) es redundante pero inofensivo.
kubectl rollout restart "deploy/$DEPLOY" -n "$NS" >/dev/null
kubectl rollout status "deploy/$DEPLOY" -n "$NS" --timeout=180s

# 4) smoke del proxy (health), best-effort
if [ "$COMP" = proxy ]; then
  curl -fsS --max-time 10 https://llm-tormenta-solar.cybercirujas.club/health >/dev/null 2>&1 \
    && echo "  ✓ smoke /health OK" || echo "  ⚠ smoke /health no respondió (puede ser red/Zscaler)"
fi
echo "✓ $COMP $TAG desplegado (no olvides commitear el bump de $BUILD)"
