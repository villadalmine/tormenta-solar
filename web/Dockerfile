# Imagen estática del juego: nginx (rootless) sirviendo los archivos del juego.
# Contexto de build = raíz del repo (para copiar index.html + las carpetas runtime).
# Build con Kaniko/Argo (web/kaniko-build.yaml) → registry interno.
FROM nginxinc/nginx-unprivileged:alpine

# nginx-unprivileged corre como uid 101 y escucha en :8080 (no necesita root).
# config que NO cachea los .html (para que agarren los ?v=N nuevos; GitHub Pages ya lo hace)
COPY web/nginx-default.conf /etc/nginx/conf.d/default.conf
COPY index.html /usr/share/nginx/html/
COPY css        /usr/share/nginx/html/css
COPY js         /usr/share/nginx/html/js
COPY info       /usr/share/nginx/html/info
COPY mobile     /usr/share/nginx/html/mobile
COPY ads        /usr/share/nginx/html/ads
COPY levels     /usr/share/nginx/html/levels

EXPOSE 8080
