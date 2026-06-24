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
