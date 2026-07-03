# Imagen del proxy de chat IA (Node puro, SIN dependencias). Multi-arch friendly (alpine).
# Build:  docker build -t ghcr.io/villadalmine/tormenta-ai-proxy:0.1.0 ai-proxy/
# Push:   docker push ghcr.io/villadalmine/tormenta-ai-proxy:0.1.0
FROM node:20-alpine
WORKDIR /app
# espeak-ng: TTS del lado servidor (GET /tts) para navegadores sin voz (Chromium/Linux). Audio WAV → el juego lo
# reproduce por WebAudio. Es un binario chico (~2MB), sin deps de Node.
RUN apk add --no-cache espeak-ng
# sólo los archivos del proxy (no hay node_modules: cero deps) + TODOS los generadores de los crones.
# gen-*.mjs con WILDCARD: la lista a mano dejó gen-carteles.mjs AFUERA y su cron falló en silencio durante días
# (exit 1 cada 6h, descubierto por la alerta ArgoWorkflowsFallados, 2026-07-03). Nunca más enumerar a mano.
COPY package.json server.js personas.js gen-*.mjs ./
ENV PORT=8788
EXPOSE 8788
# usuario no-root (el nodo 'node' ya existe en la imagen oficial)
USER node
CMD ["node", "server.js"]
