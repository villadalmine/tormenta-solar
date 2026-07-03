#!/usr/bin/env bash
# deploy-argo.sh — lanza el deploy COMO WORKFLOW in-cluster (deploy-pipeline.md §3.1) y sigue el resultado.
# El trabajo real lo hace el WorkflowTemplate tormenta-deploy (deploy/argo/workflowtemplate-deploy.yaml):
# build kaniko → helm -f values-prod → rollout → smoke → rollback automático si falla → reporte a /deploy-log
# (si falla, la alerta llega SOLA a Telegram — no hace falta quedarse mirando esto).
#
#   deploy/deploy-argo.sh proxy 0.1.84     # deploy del proxy con ese tag
#   deploy/deploy-argo.sh web              # web con el tag actual del kaniko-build.yaml
#
# IMPORTANTE: igual que deploy.sh, el build clona `main` → COMMITEÁ Y PUSHEÁ ANTES.
# deploy.sh (local) sigue siendo el fallback si Argo está caído.
set -euo pipefail

COMP="${1:?uso: deploy-argo.sh <proxy|web> [tag]}"
TAG="${2:-}"
case "$COMP" in proxy|web) ;; *) echo "✗ componente inválido: '$COMP' (proxy|web)"; exit 1 ;; esac

WF=$(kubectl create -n ai -o name -f - <<EOF | sed 's#.*/##'
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: tormenta-deploy-$COMP-
  namespace: ai
spec:
  workflowTemplateRef:
    name: tormenta-deploy
  arguments:
    parameters:
      - name: component
        value: "$COMP"
      - name: tag
        value: "$TAG"
EOF
)
echo "▶ workflow $WF lanzado (ns ai) — sigo los logs..."

# logs en vivo del paso principal (best-effort: el pod puede tardar en arrancar)
for i in $(seq 1 30); do
  POD=$(kubectl -n ai get pods -l "workflows.argoproj.io/workflow=$WF" -o name 2>/dev/null | head -1)
  [ -n "$POD" ] && break; sleep 2
done
[ -n "${POD:-}" ] && kubectl -n ai logs -f "$POD" -c main 2>/dev/null || echo "  (sin logs en vivo; espero el resultado)"

# veredicto
kubectl wait "workflow/$WF" -n ai --for=jsonpath='{.status.phase}'=Succeeded --timeout=300s 2>/dev/null \
  && { echo "✓ deploy OK ($WF)"; exit 0; }
PH=$(kubectl -n ai get "workflow/$WF" -o jsonpath='{.status.phase}' 2>/dev/null || echo '?')
echo "✗ deploy terminó en estado: $PH — hubo rollback automático; la alerta sale sola a Telegram."
echo "  detalle: kubectl -n ai get workflow $WF -o yaml | less"
exit 1
