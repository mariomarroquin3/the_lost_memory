export type World = 'real' | 'inverted';
export type Encoding = 'none' | 'rep3';
export type Ending = 'lia' | 'new-genesis' | 'lost';
export type BossPhase = 'idle' | 'fight' | 'defeated';

export interface BossVector { x: number; y: number }
export interface BossPosition { x: number; y: number; at: number }
export interface BossState {
  active: boolean;
  phase: BossPhase;
  startedAt: number;
  legs: boolean[];
  hits: Record<World, number | null>;
  wounded: Record<World, boolean>;
  /** Ciclo de la parada en la que cada jugador ya disparó. */
  fired: Record<World, number | null>;
  lastCycle: number | null;
  damage?: number;
  failures: number;
  hintLevel: number;
  webHitAt: Record<World, number>;
  positions: Record<World, BossPosition>;
}

export interface Signal {
  id: string;
  from: World;
  to: World;
  sent: string;
  received: string;
  encoding: Encoding;
  bits: number;
  flipped: number;
  at: number;
}

export interface SharedState {
  seed: number;
  solved: string[];
  commsRevealed: Record<World, boolean>;
  verifyCodes: Record<World, string>;
  verified: Record<World, boolean>;
  signals: Signal[];
  positions: Record<World, number>;
  connected: Record<World, boolean>;
  ending: Ending | null;
  alert: number;
  channelOpeningSeen: boolean;
  mode: 'coop' | 'solo';
  boss: BossState;
}

export interface PublicState extends SharedState {
  channelActive: boolean;
  fragments: number;
}

export type Action =
  | { type: 'pos'; room: number }
  | { type: 'reveal-comms' }
  | { type: 'mark-channel-opening-seen' }
  | { type: 'boss-start' }
  | { type: 'boss-fire'; stop: number; raw: BossVector; unit: BossVector }
  | { type: 'boss-web-hit' }
  | { type: 'debug-boss' }
  | { type: 'boss-pos'; x: number; y: number }
  | { type: 'solve'; id: string }
  | { type: 'signal'; message: string; encoding: Encoding }
  | { type: 'verify'; code: string }
  | { type: 'ending'; choice: Ending };

export const WORLDS: World[];
export const ROOMS: Record<World, string[]>;
export const FRAGMENT_ROOMS: string[];
export const CHANNEL_NOISE: number;
export const BOSS_ROUTE: Array<{ x: number; y: number }>;
export const BOSS_WALK_MS: number;
export const BOSS_STOP_MS: number;
export const BOSS_CYCLE_MS: number;
export const BOSS_ROUNDS: number;
export function bossInitial(): BossState;
export function bossArenaPosition(startedAt: number, now?: number): { x: number; y: number; stop: number; cycle: number; vulnerable: boolean; remaining: number };
export function randomCode(length: number, rand?: () => number): string;
export const CLOCK: { offset: number };
export function bossTargetPair(legs: boolean[], stop: number): number;
export function createState(seed?: number, mode?: 'coop' | 'solo'): SharedState;
export function channelActive(state: SharedState): boolean;
export function fragmentCount(state: SharedState): number;
export const WALL: string;
export function transmit(
  message: string,
  encoding: Encoding,
  noise: number,
  rand?: () => number,
): { received: string; flashes: number; wrong: number };
export function sanitizeMessage(text: unknown): string;
export function reduce(state: SharedState, world: World, action: Action): boolean;
export function publicState(state: SharedState): PublicState;
