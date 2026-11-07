// Estado compartido de la partida. Lo usan el servidor (Node) y el modo individual (navegador),
// así ambos validan el progreso con la misma lógica.

export const WORLDS = ['real', 'inverted'];

/** Salas de cada mundo, en el orden del pasillo. La 0 es el cuarto de comunicación oculto. */
export const ROOMS = {
  real: ['comms-real', 'r1', 'r2', 'r3', 'r4', 'r5'],
  inverted: ['comms-inverted', 'transition', 'i6', 'i7', 'i8', 'i9', 'i10'],
};

/** Salas que entregan un fragmento de contexto. */
export const FRAGMENT_ROOMS = ['r1', 'r2', 'r3', 'r4', 'r5', 'i6', 'i7', 'i8', 'i9', 'i10'];

/** Ruido por bit del canal real entre mundos. */
export const CHANNEL_NOISE = 0.08;

const HEX = '0123456789ABCDEF';

export function randomCode(length, rand = Math.random) {
  let out = '';
  for (let i = 0; i < length; i++) out += HEX[Math.floor(rand() * 16)];
  return out;
}

export function createState(seed = Math.floor(Math.random() * 1e9)) {
  let s = seed >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    seed,
    solved: [],
    commsRevealed: { real: false, inverted: false },
    verifyCodes: { real: randomCode(4, rand), inverted: randomCode(4, rand) },
    verified: { real: false, inverted: false },
    signals: [],
    positions: { real: 1, inverted: 1 },
    connected: { real: false, inverted: false },
    ending: null,
    alert: 5,
  };
}

export function channelActive(state) {
  return state.verified.real && state.verified.inverted;
}

export function fragmentCount(state) {
  return FRAGMENT_ROOMS.filter((id) => state.solved.includes(id)).length;
}

// ---------- Codificación de las señales luminosas ----------

const toBits = (symbol) => {
  const v = HEX.indexOf(symbol);
  return [3, 2, 1, 0].map((b) => (v >> b) & 1);
};

export function encodeSymbol(symbol, encoding) {
  const bits = toBits(symbol);
  if (encoding === 'rep3') return bits.flatMap((b) => [b, b, b]);
  if (encoding === 'parity') return [...bits, bits.reduce((a, b) => a ^ b, 0)];
  return bits;
}

export function decodeSymbol(bits, encoding) {
  let data = bits;
  if (encoding === 'rep3') {
    data = [0, 1, 2, 3].map((i) => (bits[i * 3] + bits[i * 3 + 1] + bits[i * 3 + 2] >= 2 ? 1 : 0));
  } else if (encoding === 'parity') {
    data = bits.slice(0, 4);
    const parity = data.reduce((a, b) => a ^ b, 0);
    if (parity !== bits[4]) return '?';
  }
  return HEX[data.reduce((acc, b) => acc * 2 + b, 0)];
}

/** Envía un mensaje por un canal con ruido y devuelve lo que llega al otro lado. */
export function transmit(message, encoding, noise, rand = Math.random) {
  const sentBits = [];
  const receivedBits = [];
  let received = '';
  for (const symbol of message) {
    const bits = encodeSymbol(symbol, encoding);
    const noisy = bits.map((b) => (rand() < noise ? 1 - b : b));
    sentBits.push(...bits);
    receivedBits.push(...noisy);
    received += decodeSymbol(noisy, encoding);
  }
  const flipped = sentBits.filter((b, i) => b !== receivedBits[i]).length;
  return { received, sentBits, receivedBits, flipped };
}

export function sanitizeMessage(text) {
  return String(text ?? '').toUpperCase().replace(/[^0-9A-F]/g, '').slice(0, 8);
}

// ---------- Reductor ----------

/**
 * Aplica una acción de un jugador. Devuelve true si el estado cambió.
 * @param {ReturnType<typeof createState>} state
 * @param {'real'|'inverted'} world
 * @param {any} action
 */
export function reduce(state, world, action) {
  if (!action || typeof action !== 'object' || !WORLDS.includes(world)) return false;
  const other = world === 'real' ? 'inverted' : 'real';

  switch (action.type) {
    case 'pos': {
      const room = Number(action.room);
      if (!Number.isInteger(room) || room < 0 || room > 6) return false;
      state.positions[world] = room;
      return true;
    }
    case 'reveal-comms': {
      if (state.commsRevealed[world]) return false;
      state.commsRevealed[world] = true;
      return true;
    }
    case 'solve': {
      const id = String(action.id);
      if (!ROOMS[world].includes(id) || state.solved.includes(id)) return false;
      state.solved.push(id);
      state.alert = Math.min(95, 5 + fragmentCount(state) * 9);
      return true;
    }
    case 'signal': {
      if (!state.commsRevealed[world]) return false;
      const message = sanitizeMessage(action.message);
      if (!message) return false;
      const encoding = ['none', 'rep3', 'parity'].includes(action.encoding) ? action.encoding : 'none';
      const result = transmit(message, encoding, CHANNEL_NOISE);
      state.signals.push({
        id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
        from: world,
        to: other,
        sent: message,
        received: result.received,
        encoding,
        bits: result.sentBits.length,
        flipped: result.flipped,
        at: Date.now(),
      });
      if (state.signals.length > 60) state.signals.splice(0, state.signals.length - 60);
      return true;
    }
    case 'verify': {
      // El jugador de "world" confirma el código que recibió del otro mundo.
      const code = sanitizeMessage(action.code);
      if (code !== state.verifyCodes[other] || state.verified[other]) return false;
      state.verified[other] = true;
      const commsId = other === 'real' ? 'comms-real' : 'comms-inverted';
      if (!state.solved.includes(commsId)) state.solved.push(commsId);
      return true;
    }
    case 'ending': {
      if (!state.solved.includes('i10')) return false;
      if (!['lia', 'new-genesis', 'lost'].includes(action.choice)) return false;
      state.ending = action.choice;
      return true;
    }
    default:
      return false;
  }
}

/** Vista del estado que se envía a cada jugador. */
export function publicState(state) {
  return { ...state, channelActive: channelActive(state), fragments: fragmentCount(state) };
}
