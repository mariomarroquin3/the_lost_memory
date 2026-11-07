// Partidas multijugador por WebSocket: un jugador por mundo y estado compartido en el servidor.
import { WebSocketServer } from 'ws';
import { BOSS_ROUNDS, createState, publicState, reduce, WORLDS } from '../src/shared/reducer.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const sessions = new Map();
/** Máquina que atiende (en Fly.io). Si los dos jugadores ven ids distintos, hay más de una máquina. */
const SERVER_ID = (process.env.FLY_MACHINE_ID || 'local').slice(0, 4);

function newCode() {
  let code = '';
  do {
    code = Array.from({ length: 4 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
  } while (sessions.has(code));
  return code;
}

function broadcast(session) {
  // `now` permite a los clientes sincronizar su reloj con el del servidor (posición de la araña).
  const payload = JSON.stringify({ type: 'state', state: publicState(session.state), now: Date.now() });
  for (const world of WORLDS) {
    const socket = session.sockets[world];
    if (socket && socket.readyState === socket.OPEN) socket.send(payload);
  }
}

/** Rehace una partida perdida (reinicio o deploy del servidor) con el estado que guarda el cliente. */
function restore(code, snap) {
  if (!snap || typeof snap !== 'object' || !Number.isFinite(snap.seed) || !Array.isArray(snap.solved)) return null;
  const state = createState(snap.seed);
  const bool2 = (v) => ({ real: Boolean(v?.real), inverted: Boolean(v?.inverted) });
  state.solved = snap.solved.filter((id) => typeof id === 'string').slice(0, 20);
  state.commsRevealed = bool2(snap.commsRevealed);
  state.verified = bool2(snap.verified);
  if (typeof snap.verifyCodes?.real === 'string' && typeof snap.verifyCodes?.inverted === 'string') {
    state.verifyCodes = { real: snap.verifyCodes.real.slice(0, 4), inverted: snap.verifyCodes.inverted.slice(0, 4) };
  }
  if (Array.isArray(snap.signals)) state.signals = snap.signals.slice(-60).filter((x) => x && typeof x.id === 'string');
  if (['lia', 'new-genesis', 'lost'].includes(snap.ending)) state.ending = snap.ending;
  if (Number.isFinite(snap.alert)) state.alert = Math.max(5, Math.min(95, snap.alert));
  // Sin esto, tras un reinicio la escena del canal se volvía a reproducir.
  state.channelOpeningSeen = Boolean(snap.channelOpeningSeen);
  if (snap.boss && typeof snap.boss === 'object' && Number.isFinite(snap.boss.startedAt)
    && Array.isArray(snap.boss.legs) && snap.boss.legs.length === 8
    && snap.boss.hits && snap.boss.wounded) {
    const b = snap.boss;
    const phase = ['idle', 'fight', 'defeated'].includes(b.phase) ? b.phase : 'idle';
    const stop = (value) => Number.isInteger(value) && value >= 0 && value < BOSS_ROUNDS ? value : null;
    const cycle = (value) => Number.isInteger(value) && value >= 0 ? value : null;
    const point = (p, fallback) => Number.isFinite(p?.x) && Number.isFinite(p?.y)
      ? { x: Math.max(16, Math.min(272, p.x)), y: Math.max(16, Math.min(176, p.y)), at: Number.isFinite(p.at) ? p.at : 0 }
      : fallback;
    state.boss = {
      ...state.boss,
      active: Boolean(b.active) && phase === 'fight',
      phase,
      legs: b.legs.map(Boolean),
      startedAt: b.startedAt,
      hits: { real: stop(b.hits.real), inverted: stop(b.hits.inverted) },
      wounded: { real: Boolean(b.wounded.real), inverted: Boolean(b.wounded.inverted) },
      fired: { real: cycle(b.fired?.real), inverted: cycle(b.fired?.inverted) },
      lastCycle: cycle(b.lastCycle),
      failures: Number.isInteger(b.failures) && b.failures >= 0 ? b.failures : 0,
      hintLevel: Number.isInteger(b.hintLevel) ? Math.max(0, Math.min(3, b.hintLevel)) : 0,
      webHitAt: { real: Number.isFinite(b.webHitAt?.real) ? b.webHitAt.real : 0, inverted: Number.isFinite(b.webHitAt?.inverted) ? b.webHitAt.inverted : 0 },
      positions: {
        real: point(b.positions?.real, state.boss.positions.real),
        inverted: point(b.positions?.inverted, state.boss.positions.inverted),
      },
    };
  }
  const session = { code, state, sockets: { real: null, inverted: null }, tokens: { real: null, inverted: null }, emptySince: 0 };
  sessions.set(code, session);
  return session;
}

const token = () => Math.random().toString(36).slice(2, 12);

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
          sessions.set(code, { code, state: createState(), sockets: { real: null, inverted: null }, tokens: { real: null, inverted: null }, emptySince: 0 });
        }
        const target = sessions.get(code) ?? restore(code, msg.resume);
        if (!target) {
          send(ws, { type: 'error', message: `No existe la partida ${code}.` });
          return;
        }
        // Elegir mundo: el pedido si está libre (o si es una reconexión), si no el que quede libre.
        const free = WORLDS.filter((w) => !target.sockets[w] || target.sockets[w].readyState !== ws.OPEN);
        // Reconexión con su ficha: recupera su mundo aunque la conexión vieja siga colgada.
        const mine = wanted && msg.token && (target.tokens[wanted] === msg.token || !target.tokens[wanted]) ? wanted : null;
        const chosen = mine ?? (wanted && free.includes(wanted) ? wanted : free[0]);
        if (!chosen) {
          send(ws, { type: 'error', message: `La partida ${code} ya tiene dos jugadores.` });
          return;
        }
        session = target;
        world = chosen;
        const old = session.sockets[world];
        if (old && old !== ws) {
          // Otra pestaña o PC entró con el mismo mundo: se avisa a la vieja para que no intente volver.
          try { if (old.readyState === old.OPEN) old.send(JSON.stringify({ type: 'kicked' })); old.close(); } catch { /* ya cerrada */ }
        }
        session.sockets[world] = ws;
        if (!session.tokens[world] || session.tokens[world] !== msg.token) session.tokens[world] = token();
        session.state.connected[world] = true;
        session.emptySince = 0;
        send(ws, { type: 'welcome', code, world, token: session.tokens[world], server: SERVER_ID });
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
