import type { GameState } from '../gameState';
import { solveConnectionPuzzle } from '../puzzles/connectionPuzzle';

export const ROOM_2_ID = 'room-2-archives';
export const ROOM_2_FRAGMENT = 'Verdad';

const puzzle = {
  id: ROOM_2_ID,
  connections: { 'archivo-a': '2097-04-17 03:12', 'archivo-b': '2097-04-17 03:13', 'archivo-c': '2097-04-17 03:15' },
};

export function solveRoom2Archives(state: GameState, answer: Record<string, string>): boolean {
  const solved = solveConnectionPuzzle(state, puzzle, answer);
  if (solved && !state.fragments.includes(ROOM_2_FRAGMENT)) state.fragments.push(ROOM_2_FRAGMENT);
  return solved;
}
