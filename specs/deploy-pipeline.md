# SDD — Pipeline de deploy con Argo Workflow (en vez de helm upgrade a mano)

- **Estado:** **F1 + F2 (script) IMPLEMENTADOS** (`deploy/deploy.sh`, 2026-06-25). Resuelve el dolor real: ~16
  `helm upgrade` a mano esta sesión, con bugs recurrentes (gotcha de `--reuse-values`/genToken vacío → 403, typo de
  `schedules`, olvidar un `--set`, confundir release/ns). **F3 (deploy como Argo Workflow) RE-MARCADO por el dueño
  2026-07-02 — es EL bloqueante para que algo que no sea la laptop pueda deployar (auto-fix, hermes, Telegram): §3.1.**
- **Última actualización:** 2026-07-02 (§3.1: el bloqueante del deploy.sh local + diseño concreto de F3).
- **Relacionado:** `deploy/deploy.sh` (el script), `ai-proxy/kaniko-build.yaml` (build Argo), `proxy-ia-deploy.md`,
  `web/kaniko-build.yaml`, [[proxy-helm-gentoken]] (el gotcha que esto mata), repo `infra`
  (`infra/diskpressure-rk1-nvme-2026-06-27.md`, el incidente de disco que motivó §5).

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
3. **F3 (pendiente — RE-MARCADO por el dueño 2026-07-02, ver §3.1)** WorkflowTemplate `tormenta-deploy`
   in-cluster + **Argo Events** (webhook GitHub) → deploy **automático on-push** (build solo del componente que
   cambió). El script (F2) ya da el 80% del valor manual; F3 es el CI/CD real.

## 3.1 EL BLOQUEANTE (dueño, 2026-07-02): "se usa deploy.sh en vez de Argo Workflow"

**El punto:** hoy TODO deploy pasa por `deploy.sh proxy <tag>` corrido en **la máquina del dev** (necesita el repo,
`kubectl`, `helm` y las credenciales locales). El build YA es un Workflow de Argo (kaniko), pero el **helm upgrade +
rollout + smoke NO** — y eso es exactamente lo que **bloquea que nada dentro del cluster pueda deployar**:

| Qué se destraba con F3 (deploy = WorkflowTemplate in-cluster) |
|---|
| **Autoplay QA F3b cierra el loop entero**: reporte → prompt → hermes-agent arregla → PR → **deploy SOLO** (hoy el auto-fix muere en "esperá que el dueño corra deploy.sh") |
| **hermes-agent / bot de Telegram** pueden shipear una versión ("deployá proxy 0.1.84") sin la laptop |
| **Deploy on-push real** (Argo Events + webhook GitHub): pusheás a main → build+deploy del componente que cambió |
| **Rollback de UNA línea**: `argo submit … -p tag=0.1.82` desde cualquier lado |
| El dueño puede deployar **desde el celu** (kubectl remoto/UI de Argo), sin entorno de dev |

**Diseño concreto (aterrizado sobre lo que ya hay):**
- `deploy/workflowtemplate-deploy.yaml`: WorkflowTemplate `tormenta-deploy` (ns `ai`), params `component=proxy|web`
  + `tag`. Pasos = LOS MISMOS del script: (1) build kaniko (ya existe como spec — se inlinea como template o se
  dispara el workflow de `kaniko-build.yaml`), (2) `helm upgrade -f values-prod.yaml --set image.tag={{tag}}`
  (imagen `dtzar/helm-kubectl`), (3) `kubectl rollout status` + smoke `/health`.
- **genToken sin humano:** en vez del truco del script (re-leer del release), el paso deploy corre IN-CLUSTER →
  puede leer el Secret o hacer el mismo `helm get values` con su ServiceAccount. Cero tipeo, mismo resultado.
- **RBAC mínimo:** ServiceAccount `tormenta-deployer` (ns `ai`): get/list/patch de deployments/configmaps/secrets/
  services + create de workflows en ns `kaniko`. Nada de cluster-admin.
- **Storage:** hereda las reglas de §5 (PVC longhorn-nvme + GC total).
- `deploy.sh` NO muere: queda como wrapper (`argo submit`/`kubectl create` del template + follow de logs) y como
  fallback si Argo está caído.
- **Regla de seguridad:** quién puede disparar el template = quién tiene RBAC para crear Workflows en ns `ai`
  (hermes-agent sí; el webhook de GitHub firma con secret). El deploy sigue saliendo SOLO de `main` pusheado.

## 5. Storage en PVC + auto-borrado (regla del dueño, 2026-06-27) ✅ HECHO

**Regla:** todo build de Argo debe usar **PVC (`longhorn-nvme`), NADA de disco local del nodo**, y **borrar TODO al
terminar** (pods, PVC, Workflow). Motivo: el nodo de build `srv-rk1-nvme-01` tiene root en una **SD de 29 GB**; basura
en disco local lo llena → `DiskPressure` → evictions en cascada (incidente 2026-06-27, ver repo `infra`).

Implementado en `ai-proxy/kaniko-build.yaml` + `web/kaniko-build.yaml`:
- **Workspace en PVC:** `volumeClaimTemplates[workspace]` con `storageClassName: longhorn-nvme` (3Gi). El contexto
  del build vive en Longhorn/NVMe, no en el nodo. Sin `emptyDir`/`hostPath`; Kaniko sin `--cache` en disco local.
- **`podGC.strategy: OnWorkflowCompletion`** → borra los pods del build apenas termina (libera lo efímero del nodo).
- **`volumeClaimGC.strategy: OnWorkflowCompletion`** → borra el PVC `workspace` apenas termina (éxito **o** fallo).
- **`ttlStrategy`:** `secondsAfterSuccess: 600` (el objeto Workflow se va a los 10 min) · `secondsAfterFailure: 86400`.
- El **registry destino** ya está en `longhorn-nvme` (no local-path). El `helm upgrade` no toca disco local.

**Invariantes (checklist al tocar el pipeline):** sin `emptyDir`/`hostPath` para workspace/cache · `podGC` +
`volumeClaimGC` en `OnWorkflowCompletion` · workspace y registry en `longhorn-nvme` · imágenes de runtime pesadas
pineadas a un nodo con headroom (no a -01 por inercia; ver `hermes-agent`→`-04` en el repo `infra`).

## 6. Incidente 2026-06-28 — el workflow no marca `Succeeded` a tiempo → "no hay deploy"
**Síntoma:** un `deploy.sh web` se "colgó": el build de Kaniko **terminó OK** (imagen pusheada al registry) pero el
**objeto Workflow se quedó en `Running`** ~12 min, así que el `kubectl wait ...=Succeeded` de `deploy.sh` esperaba y el
**helm/rollout nunca corría → sin deploy**. **Causa raíz:** el **controlador de Argo estaba saturado** — el ns `kaniko`
es **compartido** y el CI/CD del repo **`online-game`** dejó varios workflows (`cicd-online-game-*`) acumulados (los
**`Failed` se retienen 1 día** por `secondsAfterFailure: 86400`, igual que los nuestros, para debug). Con ese backlog,
la **propagación del estado** del workflow se atrasó. El build estuvo bien; lo que falló fue el *status*.
**Fixes:** (a) **`deploy.sh` endurecido** — si el `wait Succeeded` (ahora 420s) no llega, **cae a chequear el POD del
build**: si el pod terminó `Succeeded`, sigue (el estado venía atrasado); si no, **aborta con error claro** (nunca un
deploy silencioso a medias). (b) **Higiene del ns compartido:** los workflows terminados viejos hay que purgarlos
(`kubectl -n kaniko delete wf <terminados>`); los nuestros (`tormenta-*`) ya se autolimpian (TTL 10min + GC), el churn
es del CI de `online-game`. **A futuro:** bajar `secondsAfterFailure` del CI de `online-game` (o un `cron` de limpieza de
workflows terminados), y/o **separar namespaces** por proyecto para que un pipeline no sature el controlador del otro.

## 4. Mi lectura

- **F1 es el quick-win:** mover los valores a `values-prod.yaml` + `helm upgrade -f` (sin `--reuse-values`)
  elimina HOY la fuente de los bugs de deploy (el `--set 'schedule=...'`, el genToken, etc.). **Lo haría ya.**
- **F2 (WorkflowTemplate)** encadena build→deploy→verify en un flujo reproducible — coherente con que el cron y
  el build ya son Argo. Versatilidad: reintentos, GC, logs, parámetros.
- **F3 (auto on-push)** es lo más lindo (CI/CD real) pero necesita Argo Events + webhook — vale para cuando haya
  ritmo de cambios; con F1+F2 manual ya estás cómodo.
