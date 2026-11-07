# Servidor de partidas (WebSocket en /ws) + el juego compilado, para Fly.io.
FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
CMD ["node", "server/server.js"]
