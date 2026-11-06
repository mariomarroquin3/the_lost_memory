/**
 * Estado único de progreso de The Lost Memory.
 * Mantenerlo centralizado evita que las salas creen estados incompatibles.
 */
export interface GameState {
  currentRoom: number;
  fragments: string[];
  computePower: number;
  globalSyncPercent: number;
  unlockedDoors: string[];
  completedPuzzles: string[];
  ending: 'lia-restored' | 'new-genesis' | 'global-context-lost' | null;
}

export const MAX_COMPUTE_POWER = 100;

export const initialGameState = (): GameState => ({
  currentRoom: 1,
  fragments: [],
  computePower: MAX_COMPUTE_POWER,
  globalSyncPercent: 5,
  unlockedDoors: [],
  completedPuzzles: [],
  ending: null,
});

export function createGameState(): GameState {
  return initialGameState();
}

export function addFragment(state: GameState, fragment: string): void {
  if (!state.fragments.includes(fragment)) state.fragments.push(fragment);
}

export function spendComputePower(state: GameState, amount = 5): void {
  state.computePower = Math.max(0, Math.min(MAX_COMPUTE_POWER, state.computePower - amount));
}

export function increaseGlobalSync(state: GameState, amount: number): void {
  state.globalSyncPercent = Math.max(0, Math.min(100, state.globalSyncPercent + amount));
}

export function completePuzzle(state: GameState, puzzleId: string): void {
  if (!state.completedPuzzles.includes(puzzleId)) state.completedPuzzles.push(puzzleId);
}
