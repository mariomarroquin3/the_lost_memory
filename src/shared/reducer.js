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

/** Ruta compartida de la araña. Las coordenadas son locales a una sala de 288x192. */
export const BOSS_ROUTE = [
  // Lejos de la esquina superior derecha, donde el HUD tapa la sala.
  { x: 56, y: 80 },
  { x: 184, y: 80 },
  { x: 184, y: 144 },
  { x: 56, y: 144 },
];
export const BOSS_WALK_MS = 4_000;
export const BOSS_STOP_MS = 6_000;
export const BOSS_CYCLE_MS = BOSS_WALK_MS + BOSS_STOP_MS;
export const BOSS_ROUNDS = BOSS_ROUTE.length;

/** Posición determinista de la araña y estado de su parada actual. */
/**
 * Reloj compartido: el cliente guarda aquí la diferencia con el reloj del servidor
 * (llega en cada mensaje de estado) para que la araña esté en el mismo sitio en los dos PCs.
 */
export const CLOCK = { offset: 0 };

/** Par de patas que recibe el golpe en una parada: el de esa parada o, si ya cayó, el primero vivo. */
export function bossTargetPair(legs, stop) {
  if (legs[stop * 2] || legs[stop * 2 + 1]) return stop;
  for (let i = 0; i < legs.length / 2; i++) if (legs[i * 2] || legs[i * 2 + 1]) return i;
  return -1;
}

export function bossArenaPosition(startedAt, now = Date.now() + CLOCK.offset) {
  const start = Number.isFinite(startedAt) ? startedAt : now;
  const elapsed = Math.max(0, now - start);
  const cycle = Math.floor(elapsed / BOSS_CYCLE_MS);
  const phase = elapsed % BOSS_CYCLE_MS;
  const stop = cycle % BOSS_ROUTE.length;
  const from = BOSS_ROUTE[stop];
  const to = BOSS_ROUTE[(stop + 1) % BOSS_ROUTE.length];
  if (phase >= BOSS_WALK_MS) {
    return { x: to.x, y: to.y, stop, cycle, vulnerable: true, remaining: BOSS_CYCLE_MS - phase };
  }
  const t = phase / BOSS_WALK_MS;
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    stop,
    cycle,
    vulnerable: false,
    remaining: BOSS_WALK_MS - phase,
  };
}

export function bossInitial() {
  return {
    active: false,
    phase: 'idle',
    startedAt: 0,
    legs: [true, true, true, true, true, true, true, true],
    hits: { real: null, inverted: null },
    wounded: { real: false, inverted: false },
    fired: { real: null, inverted: null },
    lastCycle: null,
    // Aciertos acumulados contra el par de patas actual (en cooperativo hacen falta 2, de quien sea).
    damage: 0,
    failures: 0,
    hintLevel: 0,
    webHitAt: { real: 0, inverted: 0 },
    positions: {
      real: { x: 84, y: 112, at: 0 },
      inverted: { x: 204, y: 112, at: 0 },
    },
  };
}

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

export function createState(seed = Math.floor(Math.random() * 1e9), mode = 'coop') {
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
    mode,
    boss: bossInitial(),
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

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function isSolo(state) {
  return state.mode === 'solo';
}

function ensureBossState(state) {
  // Las partidas guardadas antes del combate en canvas siguen cargando.
  if (state.mode === undefined) state.mode = 'coop';
  if (state.boss && Array.isArray(state.boss.legs) && state.boss.legs.length === 8
    && state.boss.hits && state.boss.wounded && state.boss.fired
    && state.boss.webHitAt && state.boss.positions?.real && state.boss.positions?.inverted) return;
  state.boss = bossInitial();
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
  ensureBossState(state);
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
    case 'boss-start': {
      if (state.boss.active || state.boss.phase === 'defeated') return false;
      if (!state.solved.includes('i10') || fragmentCount(state) < 10) return false;
      state.boss = {
        ...bossInitial(),
        positions: state.boss.positions,
        startedAt: Date.now(),
        active: true,
        phase: 'fight',
      };
      return true;
    }
    case 'boss-fire': {
      const boss = state.boss;
      if (!boss.active || boss.phase !== 'fight') return false;
      const stop = Number(action.stop);
      const raw = action.raw;
      const unit = action.unit;
      const arena = bossArenaPosition(boss.startedAt);
      if (!Number.isInteger(stop) || stop !== arena.stop || !arena.vulnerable) return false;
      if (boss.fired[world] === arena.cycle) return false;
      if (boss.lastCycle !== arena.cycle) {
        boss.lastCycle = arena.cycle;
        boss.hits = { real: null, inverted: null };
        boss.wounded = { real: false, inverted: false };
        boss.fired = { real: null, inverted: null };
      }
      if (boss.fired[world] === arena.cycle) return false;
      const player = boss.positions[world];
      const expectedRaw = {
        x: Math.round((arena.x - player.x) / 16),
        y: Math.round((arena.y - player.y) / 16),
      };
      if (!raw || !Number.isInteger(raw.x) || !Number.isInteger(raw.y)
        || (raw.x === 0 && raw.y === 0)
        || Math.abs(raw.x - expectedRaw.x) > 1
        || Math.abs(raw.y - expectedRaw.y) > 1) {
        boss.fired[world] = arena.cycle;
        boss.failures += 1;
        boss.hintLevel = Math.min(3, Math.floor(boss.failures / 2));
        state.alert = Math.min(95, state.alert + 5);
        return true;
      }
      if (!unit || !finiteNumber(unit.x) || !finiteNumber(unit.y)) {
        boss.fired[world] = arena.cycle;
        boss.failures += 1;
        boss.hintLevel = Math.min(3, Math.floor(boss.failures / 2));
        state.alert = Math.min(95, state.alert + 5);
        return true;
      }
      const rawLength = Math.hypot(raw.x, raw.y);
      const valid = Math.abs(Math.hypot(unit.x, unit.y) - 1) <= 0.02
        && Math.abs(unit.x - raw.x / rawLength) <= 0.02
        && Math.abs(unit.y - raw.y / rawLength) <= 0.02;
      boss.fired[world] = arena.cycle;
      if (!valid) {
        boss.failures += 1;
        boss.hintLevel = Math.min(3, Math.floor(boss.failures / 2));
        state.alert = Math.min(95, state.alert + 5);
        return true;
      }
      boss.hits[world] = stop;
      boss.wounded[world] = true;
      // Cada acierto arranca una pata, dispare quien dispare y en la parada que sea.
      boss.damage = 0;
      const pair = bossTargetPair(boss.legs, stop);
      if (pair >= 0) {
        const leg = boss.legs[pair * 2] ? pair * 2 : pair * 2 + 1;
        boss.legs[leg] = false;
      }
      boss.wounded = { real: false, inverted: false };
      if (boss.legs.every((leg) => !leg)) {
        boss.active = false;
        boss.phase = 'defeated';
      }
      return true;
    }
    case 'debug-boss': {
      // Solo para probar (botón visible con ?debug en la URL): deja la partida lista para el jefe.
      for (const w of WORLDS) for (const id of ROOMS[w]) if (FRAGMENT_ROOMS.includes(id) && !state.solved.includes(id)) state.solved.push(id);
      state.commsRevealed = { real: true, inverted: true };
      state.verified = { real: true, inverted: true };
      state.channelOpeningSeen = true;
      state.alert = Math.min(95, 5 + fragmentCount(state) * 9);
      return true;
    }
    case 'boss-web-hit': {
      if (!state.boss.active) return false;
      const now = Date.now();
      if (now - state.boss.webHitAt[world] < 2_000) return false;
      state.boss.webHitAt[world] = now;
      state.alert = Math.min(95, state.alert + 2);
      return true;
    }
    case 'boss-pos': {
      if (!state.boss.active) return false;
      const x = Number(action.x);
      const y = Number(action.y);
      const previous = state.boss.positions[world];
      const now = Date.now();
      if (!finiteNumber(x) || !finiteNumber(y) || x < 16 || x > 272 || y < 16 || y > 176) return false;
      if (previous && now - previous.at < 100) return false;
      state.boss.positions[world] = { x, y, at: now };
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
      if (!state.solved.includes('i10') || state.boss.phase !== 'defeated') return false;
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
