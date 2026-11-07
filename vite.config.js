import { defineConfig } from 'vite';
import { attachLobby } from './server/lobby.js';

// En desarrollo, el mismo `npm run dev` levanta las partidas multijugador en /ws.
export default defineConfig({
  server: { host: true },
  plugins: [
    {
      name: 'rescate-multijugador',
      configureServer(server) {
        if (server.httpServer) attachLobby(server.httpServer);
      },
      configurePreviewServer(server) {
        if (server.httpServer) attachLobby(server.httpServer);
      },
    },
  ],
});
