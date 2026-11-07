// Partidas multijugador por WebSocket: un jugador por mundo y estado compartido en el servidor.
import { WebSocketServer } from 'ws';
import { createState, publicState, reduce, WORLDS } from '../src/shared/reducer.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const sessions = new Map();

function newCode() {
  let code = '';
  do {
    code = Array.from({ length: 4 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
  } while (sessions.has(code));
  return code;
}

function broadcast(session) {
  const payload = JSON.stringify({ type: 'state', state: publicState(session.state) });
  for (const world of WORLDS) {
    const socket = session.sockets[world];
    if (socket && socket.readyState === socket.OPEN) socket.send(payload);
  }
}

function send(socket, message) {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
}

/** Engancha el servidor de partidas a un servidor HTTP existente, en la ruta /ws. */
export function attachLobby(httpServer) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    if (!request.url || !request.url.startsWith('/ws')) return;
    wss.handleUpgrade(request, socket, head, (ws) => wss.emit('connection', ws, request));
  });

  wss.on('connection', (ws) => {
    let session = null;
    let world = null;
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(String(raw)); } catch { return; }

      if (msg.type === 'join') {
        const wanted = WORLDS.includes(msg.world) ? msg.world : null;
        let code = typeof msg.code === 'string' ? msg.code.toUpperCase().trim() : '';
        if (!code) {
          code = newCode();
          sessions.set(code, { code, state: createState(), sockets: { real: null, inverted: null }, emptySince: 0 });
        }
        const target = sessions.get(code);
        if (!target) {
          send(ws, { type: 'error', message: `No existe la partida ${code}.` });
          return;
        }
        // Elegir mundo: el pedido si está libre (o si es una reconexión), si no el que quede libre.
        const free = WORLDS.filter((w) => !target.sockets[w] || target.sockets[w].readyState !== ws.OPEN);
        const chosen = wanted && free.includes(wanted) ? wanted : free[0];
        if (!chosen) {
          send(ws, { type: 'error', message: `La partida ${code} ya tiene dos jugadores.` });
          return;
        }
        session = target;
        world = chosen;
        session.sockets[world] = ws;
        session.state.connected[world] = true;
        session.emptySince = 0;
        send(ws, { type: 'welcome', code, world });
        broadcast(session);
        return;
      }

      if (msg.type === 'action' && session && world) {
        if (reduce(session.state, world, msg.action)) broadcast(session);
      }
    });

    ws.on('close', () => {
      if (!session || !world) return;
      if (session.sockets[world] === ws) {
        session.sockets[world] = null;
        session.state.connected[world] = false;
        broadcast(session);
        if (!session.sockets.real && !session.sockets.inverted) session.emptySince = Date.now();
      }
    });
  });

  // Latido para detectar desconexiones y limpieza de partidas abandonadas (2 h).
  const timer = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.isAlive) { ws.terminate(); continue; }
      ws.isAlive = false;
      ws.ping();
    }
    const now = Date.now();
    for (const [code, s] of sessions) {
      if (s.emptySince && now - s.emptySince > 2 * 60 * 60 * 1000) sessions.delete(code);
    }
  }, 15000);
  timer.unref?.();

  return wss;
}
