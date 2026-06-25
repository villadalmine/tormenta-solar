# SDD — Pipeline de deploy con Argo Workflow (en vez de helm upgrade a mano)

- **Estado:** **F1 + F2 (script) IMPLEMENTADOS** (`deploy/deploy.sh`, 2026-06-25). Resuelve el dolor real: ~16
  `helm upgrade` a mano esta sesión, con bugs recurrentes (gotcha de `--reuse-values`/genToken vacío → 403, typo de
  `schedules`, olvidar un `--set`, confundir release/ns). **F3 (Argo Events on-push) pendiente.**
- **Última actualización:** 2026-06-25
- **Relacionado:** `deploy/deploy.sh` (el script), `ai-proxy/kaniko-build.yaml` (build Argo), `proxy-ia-deploy.md`,
  `web/kaniko-build.yaml`, [[proxy-helm-gentoken]] (el gotcha que esto mata).

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

1. **F1 ✅ HECHO** `values-prod.yaml` committeado + `helm upgrade -f values-prod.yaml` (sin `--reuse-values`).
2. **F2 ✅ HECHO (script):** [`deploy/deploy.sh`](../deploy/deploy.sh) `<proxy|web> [tag]` hace **build (Kaniko) →
   helm upgrade → rollout → smoke** en un comando. Encapsula lo que rompimos toda la sesión:
   - **release/ns/chart/values fijos por componente** (proxy=`tormenta-ai`, web=`tormenta-web`, ambos ns `ai`).
   - **`-f values-prod.yaml` SIEMPRE** (nunca `--reuse-values`).
   - **genToken auto:** lo **re-lee del release actual** (`helm get values … | jq genToken`) y lo re-pasa con
     `--set` → **mata el gotcha del 403** sin tipearlo ni crear un Secret.
   - **`DRY_RUN=1`** valida el helm (`--dry-run`) sin buildear ni aplicar (probado proxy+web 2026-06-25).
   - *(El `argo` CLI no está instalado → el build sigue por `kubectl create -f kaniko-build.yaml`, que el script hace.)*
   - **Pre-requisito:** el código tiene que estar **pusheado a `main`** antes (el build clona main).
3. **F3 (pendiente)** WorkflowTemplate `tormenta-deploy` in-cluster + **Argo Events** (webhook GitHub) → deploy
   **automático on-push** (build solo del componente que cambió). El script (F2) ya da el 80% del valor manual;
   F3 es el CI/CD real para cuando haya ritmo de cambios.

## 4. Mi lectura

- **F1 es el quick-win:** mover los valores a `values-prod.yaml` + `helm upgrade -f` (sin `--reuse-values`)
  elimina HOY la fuente de los bugs de deploy (el `--set 'schedule=...'`, el genToken, etc.). **Lo haría ya.**
- **F2 (WorkflowTemplate)** encadena build→deploy→verify en un flujo reproducible — coherente con que el cron y
  el build ya son Argo. Versatilidad: reintentos, GC, logs, parámetros.
- **F3 (auto on-push)** es lo más lindo (CI/CD real) pero necesita Argo Events + webhook — vale para cuando haya
  ritmo de cambios; con F1+F2 manual ya estás cómodo.
