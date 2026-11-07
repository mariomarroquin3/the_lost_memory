// Estado compartido de la partida. Lo usan el servidor (Node) y el modo individual (navegador),
// así ambos validan el progreso con la misma lógica.

export const WORLDS = ['real', 'inverted'];

/** Salas de cada mundo, en el orden del pasillo. La 0 es el cuarto de comunicación oculto. */
export const ROOMS = {
  real: ['comms-real', 'hall', 'r1', 'r2', 'r3', 'r4', 'r5'],
  inverted: ['comms-inverted', 'transition', 'i6', 'i7', 'i8', 'i9', 'i10'],
};

/** Salas que entregan un fragmento de contexto. */
export const FRAGMENT_ROOMS = ['r1', 'r2', 'r3', 'r4', 'r5', 'i6', 'i7', 'i8', 'i9', 'i10'];

/** Probabilidad de que una letra se encienda mal (salta a la bombilla de al lado). */
export const CHANNEL_NOISE = 0.15;

/** Bombillas de la pared de luces, en orden. */
export const WALL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const LETTERS = 'ABCDEFGHJKLMNPRSTUVWXYZ';

export function randomCode(length, rand = Math.random) {
  let out = '';
  for (let i = 0; i < length; i++) out += LETTERS[Math.floor(rand() * LETTERS.length)];
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
    channelOpeningSeen: false,
  };
}

export function channelActive(state) {
  return state.verified.real && state.verified.inverted;
}

export function fragmentCount(state) {
  return FRAGMENT_ROOMS.filter((id) => state.solved.includes(id)).length;
}

// ---------- Pared de luces ----------

/** Una letra que pasa por el canal: a veces se enciende la bombilla vecina. */
function flicker(ch, noise, rand) {
  if (ch === ' ' || rand() >= noise) return ch;
  const i = WALL.indexOf(ch);
  const j = (i + (rand() < 0.5 ? -1 : 1) + WALL.length) % WALL.length;
  return WALL[j];
}

/**
 * Envía un mensaje por la pared de luces. Con 'rep3' cada letra se enciende tres veces
 * y gana la que más se repite; si las tres salen distintas llega «?».
 */
export function transmit(message, encoding, noise, rand = Math.random) {
  let received = '';
  let flashes = 0;
  let wrong = 0;
  for (const ch of message) {
    if (ch === ' ') { received += ' '; continue; }
    if (encoding === 'rep3') {
      const tries = [flicker(ch, noise, rand), flicker(ch, noise, rand), flicker(ch, noise, rand)];
      flashes += 3;
      wrong += tries.filter((t) => t !== ch).length;
      const best = tries.find((t) => tries.filter((u) => u === t).length >= 2);
      received += best ?? '?';
    } else {
      const t = flicker(ch, noise, rand);
      flashes += 1;
      if (t !== ch) wrong += 1;
      received += t;
    }
  }
  return { received, flashes, wrong };
}

export function sanitizeMessage(text) {
  return String(text ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ').trim().slice(0, 20);
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
    case 'mark-channel-opening-seen': {
      if (state.channelOpeningSeen) return false;
      state.channelOpeningSeen = true;
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
      const encoding = action.encoding === 'rep3' ? 'rep3' : 'none';
      const result = transmit(message, encoding, CHANNEL_NOISE);
      state.signals.push({
        id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
        from: world,
        to: other,
        sent: message,
        received: result.received,
        encoding,
        bits: result.flashes,
        flipped: result.wrong,
        at: Date.now(),
      });
      if (state.signals.length > 60) state.signals.splice(0, state.signals.length - 60);
      return true;
    }
    case 'verify': {
      // El jugador de "world" confirma el código que recibió del otro mundo.
      const code = sanitizeMessage(action.code).replace(/ /g, '');
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
