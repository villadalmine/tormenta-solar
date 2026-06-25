# SDD — Pipeline de deploy con Argo Workflow (en vez de helm upgrade a mano)

- **Estado:** Diseño (para implementar). Resuelve dolor real: ~12 `helm upgrade` a mano esta sesión, con
  bugs recurrentes (el gotcha de `--reuse-values`, el typo de `schedules`, olvidar un `--set`).
- **Última actualización:** 2026-06-25
- **Relacionado:** `ai-proxy/kaniko-build.yaml` (build ya es Argo), `proxy-ia-deploy.md`, `web/kaniko-build.yaml`.

## 1. Objetivo

Hoy el deploy es **manual y frágil**: `kubectl create -f kaniko-build.yaml` (build) → esperar → `helm upgrade
... --set image.tag=X --set linyeraPool.genToken=... --set ...` (deploy). Con **mil flags** que hay que repetir
(si te olvidás uno, o usás `--reuse-values`, se rompe). **Cron ya es siempre Argo; el deploy también debería.**
Meta: **un Workflow de Argo que hace build → helm upgrade → verificar rollout**, reproducible, una sola fuente.

## 2. Diseño

```
WorkflowTemplate "tormenta-deploy" (params: component=proxy|web, tag)
  paso 1  build    → Kaniko (lo que ya hace kaniko-build.yaml, como template)
  paso 2  deploy   → contenedor con helm+kubectl: helm upgrade -f values-prod.yaml --set image.tag={{tag}}
  paso 3  verify   → kubectl rollout status (+ smoke: curl /health, /metrics)
```

- **Fin del `--set` infinito + el gotcha de `--reuse-values`:** los valores de prod (genToken via secret,
  `linyeraPool.cronjob.*`, `metrics.*`, `upstream.model`, gateway, etc.) viven en un **`values-prod.yaml`**
  (committeado; el `genToken` por `valueFrom` secret, no en claro) → `helm upgrade -f values-prod.yaml` SIEMPRE
  (sin `--reuse-values`). **Esto solo ya elimina la fragilidad** que nos mordió toda la sesión.
- **RBAC:** un ServiceAccount con permiso de `helm upgrade` (get/patch deployments, configmaps, cronworkflows,
  secrets) en ns `ai`. Imagen con `helm`+`kubectl` (ej. `alpine/helm` o `dtzar/helm-kubectl`).
- **Disparo:**
  - **Manual** (fase 1): `argo submit --from workflowtemplate/tormenta-deploy -p component=proxy -p tag=0.1.12`.
  - **Auto por git push** (fase 2): **Argo Events** (Sensor + EventSource webhook de GitHub) → al pushear a
    `main`, dispara build+deploy del/los componentes que cambiaron.
  - **Por tag de release** (fase 2 alt): push de un tag `vX.Y` dispara el deploy.

## 3. Fases

1. **F1** `values-prod.yaml` (committeado, genToken via secret) + `helm upgrade -f` a mano → **ya mata el gotcha**.
2. **F2** WorkflowTemplate `tormenta-deploy` (build→upgrade→verify) + RBAC + imagen helm/kubectl. Disparo manual.
3. **F3** Argo Events (webhook GitHub) → deploy automático on-push. Opcional: build solo si cambió el componente.

## 4. Mi lectura

- **F1 es el quick-win:** mover los valores a `values-prod.yaml` + `helm upgrade -f` (sin `--reuse-values`)
  elimina HOY la fuente de los bugs de deploy (el `--set 'schedule=...'`, el genToken, etc.). **Lo haría ya.**
- **F2 (WorkflowTemplate)** encadena build→deploy→verify en un flujo reproducible — coherente con que el cron y
  el build ya son Argo. Versatilidad: reintentos, GC, logs, parámetros.
- **F3 (auto on-push)** es lo más lindo (CI/CD real) pero necesita Argo Events + webhook — vale para cuando haya
  ritmo de cambios; con F1+F2 manual ya estás cómodo.
