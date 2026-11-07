export type World = 'real' | 'inverted';
export type Encoding = 'none' | 'rep3' | 'parity';
export type Ending = 'lia' | 'new-genesis' | 'lost';

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
}

export interface PublicState extends SharedState {
  channelActive: boolean;
  fragments: number;
}

export type Action =
  | { type: 'pos'; room: number }
  | { type: 'reveal-comms' }
  | { type: 'solve'; id: string }
  | { type: 'signal'; message: string; encoding: Encoding }
  | { type: 'verify'; code: string }
  | { type: 'ending'; choice: Ending };

export const WORLDS: World[];
export const ROOMS: Record<World, string[]>;
export const FRAGMENT_ROOMS: string[];
export const CHANNEL_NOISE: number;
export function randomCode(length: number, rand?: () => number): string;
export function createState(seed?: number): SharedState;
export function channelActive(state: SharedState): boolean;
export function fragmentCount(state: SharedState): number;
export function encodeSymbol(symbol: string, encoding: Encoding): number[];
export function decodeSymbol(bits: number[], encoding: Encoding): string;
export function transmit(
  message: string,
  encoding: Encoding,
  noise: number,
  rand?: () => number,
): { received: string; sentBits: number[]; receivedBits: number[]; flipped: number };
export function sanitizeMessage(text: unknown): string;
export function reduce(state: SharedState, world: World, action: Action): boolean;
export function publicState(state: SharedState): PublicState;
