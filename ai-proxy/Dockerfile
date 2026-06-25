# Imagen del proxy de chat IA (Node puro, SIN dependencias). Multi-arch friendly (alpine).
# Build:  docker build -t ghcr.io/villadalmine/tormenta-ai-proxy:0.1.0 ai-proxy/
# Push:   docker push ghcr.io/villadalmine/tormenta-ai-proxy:0.1.0
FROM node:20-alpine
WORKDIR /app
# sólo los archivos del proxy (no hay node_modules: cero deps) + el generador del pool (lo usa el CronJob)
COPY package.json server.js personas.js gen-pool.mjs gen-prices.mjs ./
ENV PORT=8788
EXPOSE 8788
# usuario no-root (el nodo 'node' ya existe en la imagen oficial)
USER node
CMD ["node", "server.js"]
