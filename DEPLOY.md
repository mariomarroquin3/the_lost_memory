# Deploy: Fly.io (servidor de partidas) + Vercel (juego)

El multijugador necesita un servidor Node con WebSocket que guarda las partidas en memoria.
Vercel solo sirve archivos estáticos y no mantiene WebSockets, así que:

- **Fly.io**: corre `server/server.js` (partidas en `/ws`). También sirve el juego, así que con Fly basta.
- **Vercel** (opcional): sirve el juego compilado y se conecta al servidor de Fly con `VITE_WS_URL`.

## 1. Fly.io

1. Instala la CLI: https://fly.io/docs/flyctl/install/ y entra con `fly auth login`.
2. En la carpeta del proyecto (ya están `Dockerfile`, `.dockerignore` y `fly.toml`):
   ```bash
   fly launch --no-deploy --copy-config
   ```
   Si el nombre `rescate-contexto` está ocupado, elige otro; queda escrito en `fly.toml`.
3. Publica:
   ```bash
   fly deploy
   fly scale count 1
   ```
   Una sola máquina: las partidas viven en memoria y dos máquinas no se verían entre sí.
4. Prueba `https://<tu-app>.fly.dev`: el juego completo ya funciona ahí, con multijugador.

Logs: `fly logs`. Si cambias código, vuelve a correr `fly deploy`.

## 2. Vercel (opcional, solo el frontend)

1. Importa el repo en https://vercel.com/new (detecta Vite; `vercel.json` ya fija `npm run build` y `dist`).
2. En *Settings → Environment Variables* añade:
   ```
   VITE_WS_URL = wss://<tu-app>.fly.dev/ws
   ```
3. Redeploy. La variable se lee al compilar, así que cualquier cambio necesita otro deploy.

Sin `VITE_WS_URL` el juego intenta conectarse a su propio dominio (`/ws`), que es lo que pasa en local y en Fly.

## Local

```bash
npm install
npm run dev          # juego + servidor de partidas en http://localhost:5173
npm run build && npm start   # como en producción, http://localhost:8787
```
