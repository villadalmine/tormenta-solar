{{- define "tormenta-ai-proxy.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "tormenta-ai-proxy.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name (include "tormenta-ai-proxy.name" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{- define "tormenta-ai-proxy.labels" -}}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" }}
app.kubernetes.io/name: {{ include "tormenta-ai-proxy.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "tormenta-ai-proxy.selectorLabels" -}}
app.kubernetes.io/name: {{ include "tormenta-ai-proxy.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{/* Nombre del Secret de la API key: el existente o el creado por el chart */}}
{{- define "tormenta-ai-proxy.secretName" -}}
{{- if .Values.auth.existingSecret -}}{{ .Values.auth.existingSecret }}{{- else -}}{{ include "tormenta-ai-proxy.fullname" . }}{{- end -}}
{{- end -}}

{{- define "tormenta-ai-proxy.secretKey" -}}
{{- if .Values.auth.existingSecret -}}{{ default "apiKey" .Values.auth.existingSecretKey }}{{- else -}}apiKey{{- end -}}
{{- end -}}

{{/* GEN_TOKEN (protege los POST de escritura del proxy: bancos, /provision, /ia-chain...). Con linyeraPool.genTokenSecret.name
     sale de un Secret (no queda en texto plano en el Deployment ni en los CronWorkflows); si no, del valor genToken (compat). */}}
{{- define "tormenta-ai-proxy.genTokenEnv" -}}
- name: GEN_TOKEN
{{- if .Values.linyeraPool.genTokenSecret.name }}
  valueFrom:
    secretKeyRef:
      name: {{ .Values.linyeraPool.genTokenSecret.name }}
      key: {{ .Values.linyeraPool.genTokenSecret.key | default "genToken" }}
{{- else }}
  value: {{ .Values.linyeraPool.genToken | quote }}
{{- end }}
{{- end -}}
