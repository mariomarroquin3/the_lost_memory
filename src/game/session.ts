import { createState, publicState, reduce, type Action, type PublicState, type World } from '../shared/reducer.js';

export type Mode = 'coop' | 'solo';

/** Conexión con la partida: por WebSocket (cooperativo) o local (modo individual). */
export interface Session {
  readonly mode: Mode;
  world: World;
  code: string;
  state: PublicState;
  online: boolean;
  dispatch(action: Action): void;
  onChange(listener: () => void): void;
  /** Solo en modo individual: cambia de dimensión. */
  switchWorld?(): void;
}

const SOLO_KEY = 'rescate-solo-v1';
const COOP_KEY = 'rescate-coop-v1';

class Emitter {
  private listeners: Array<() => void> = [];
  onChange(listener: () => void): void { this.listeners.push(listener); }
  protected emit(): void { this.listeners.forEach((l) => l()); }
}

export class SoloSession extends Emitter implements Session {
  readonly mode = 'solo' as const;
  code = 'SOLO';
  online = true;
  world: World = 'real';
  private raw = createState();
  state: PublicState = publicState(this.raw);

  constructor(fresh: boolean) {
    super();
    if (!fresh) {
      try {
        const saved = JSON.parse(localStorage.getItem(SOLO_KEY) ?? 'null');
        if (saved?.raw?.solved) { this.raw = saved.raw; this.world = saved.world ?? 'real'; }
      } catch { /* sin guardado */ }
    }
    this.raw.connected = { real: true, inverted: true };
    this.state = publicState(this.raw);
  }

  dispatch(action: Action): void {
    if (reduce(this.raw, this.world, action)) this.commit();
  }

  switchWorld(): void {
    this.world = this.world === 'real' ? 'inverted' : 'real';
    this.commit();
  }

  private commit(): void {
    this.state = publicState(this.raw);
    try { localStorage.setItem(SOLO_KEY, JSON.stringify({ raw: this.raw, world: this.world })); } catch { /* ignorar */ }
    this.emit();
  }
}

export class CoopSession extends Emitter implements Session {
  readonly mode = 'coop' as const;
  world: World = 'real';
  code = '';
  online = false;
  state: PublicState = publicState(createState(1));
  private socket: WebSocket | null = null;
  private ready = false;
  private retry = 0;

  /** Abre la partida. Resuelve con el mundo asignado o falla con un mensaje legible. */
  connect(code: string, world: World | null): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const open = (): void => {
        const proto = location.protocol === 'https:' ? 'wss' : 'ws';
        const socket = new WebSocket(`${proto}://${location.host}/ws`);
        this.socket = socket;
        socket.onopen = () => {
          this.retry = 0;
          socket.send(JSON.stringify({ type: 'join', code: this.code || code, world: this.ready ? this.world : world }));
        };
        socket.onmessage = (event) => {
          const msg = JSON.parse(String(event.data));
          if (msg.type === 'welcome') {
            this.code = msg.code;
            this.world = msg.world;
            this.online = true;
            this.ready = true;
            try { localStorage.setItem(COOP_KEY, JSON.stringify({ code: this.code, world: this.world })); } catch { /* ignorar */ }
            if (!settled) { settled = true; resolve(); }
          } else if (msg.type === 'state') {
            this.state = msg.state;
            this.emit();
          } else if (msg.type === 'error') {
            if (!settled) { settled = true; reject(new Error(msg.message)); }
          }
        };
        socket.onclose = () => {
          this.online = false;
          this.emit();
          if (!settled) { settled = true; reject(new Error('No se pudo conectar con el servidor de partidas.')); return; }
          // Reconexión automática a la misma partida y el mismo mundo.
          this.retry = Math.min(this.retry + 1, 5);
          window.setTimeout(open, 500 * this.retry);
        };
      };
      open();
    });
  }

  dispatch(action: Action): void {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify({ type: 'action', action }));
  }
}

export function lastCoop(): { code: string; world: World } | null {
  try { return JSON.parse(localStorage.getItem(COOP_KEY) ?? 'null'); } catch { return null; }
}

export function hasSoloSave(): boolean {
  try { return Boolean(localStorage.getItem(SOLO_KEY)); } catch { return false; }
}
