import { addFragment, completePuzzle, increaseGlobalSync, type GameState } from '../gameState';

export const ROOM_10_ID = 'room-10-core';

export type Ending = NonNullable<GameState['ending']>;

export function solveRoom10Core(state: GameState, command: string[]): boolean {
  const expected = ['contexto', 'empatía', 'conexión'];
  const valid = expected.every((term) => command.includes(term)) && command.length === expected.length;
  if (!valid) return false;
  completePuzzle(state, ROOM_10_ID);
  addFragment(state, 'Contexto completo');
  increaseGlobalSync(state, 20);
  return true;
}

export function chooseEnding(state: GameState, ending: Ending): void {
  state.ending = ending;
  if (ending === 'lia-restored') state.globalSyncPercent = 100;
}
