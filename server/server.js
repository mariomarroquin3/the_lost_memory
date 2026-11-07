// Servidor de producción: sirve la carpeta dist/ y las partidas por WebSocket en /ws.
// Uso: npm run build && npm start   (puerto en la variable PORT, 8787 por defecto)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { attachLobby } from './lobby.js';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const port = Number(process.env.PORT) || 8787;
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
};

const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent((req.url || '/').split('?')[0])).replace(/^([/\\])+/, '');
  let file = join(root, path || 'index.html');
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
  } catch {
    file = join(root, 'index.html');
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('Ejecuta primero: npm run build');
  }
});

attachLobby(server);
server.listen(port, () => console.log(`El Rescate del Contexto en http://localhost:${port}`));
