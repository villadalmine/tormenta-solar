# Imagen del proxy de chat IA (Node puro, SIN dependencias). Multi-arch friendly (alpine).
# Build:  docker build -t ghcr.io/villadalmine/tormenta-ai-proxy:0.1.0 ai-proxy/
# Push:   docker push ghcr.io/villadalmine/tormenta-ai-proxy:0.1.0
FROM node:20-alpine
WORKDIR /app
# espeak-ng: TTS del lado servidor (GET /tts) para navegadores sin voz (Chromium/Linux). Audio WAV → el juego lo
# reproduce por WebAudio. Es un binario chico (~2MB), sin deps de Node.
RUN apk add --no-cache espeak-ng
# sólo los archivos del proxy (no hay node_modules: cero deps) + el generador del pool (lo usa el CronJob)
COPY package.json server.js personas.js gen-pool.mjs gen-prices.mjs gen-noticias.mjs gen-propaganda.mjs gen-chusmerio.mjs ./
ENV PORT=8788
EXPOSE 8788
# usuario no-root (el nodo 'node' ya existe en la imagen oficial)
USER node
CMD ["node", "server.js"]
