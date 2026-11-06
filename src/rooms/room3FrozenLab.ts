import type { GameState } from '../gameState';
import { solveConnectionPuzzle } from '../puzzles/connectionPuzzle';

export const ROOM_3_ID = 'room-3-frozen-lab';
export const ROOM_3_FRAGMENT = 'Aprendizaje';

const puzzle = {
  id: ROOM_3_ID,
  connections: { 'entrada-a': 'capa-oculta-1', 'entrada-b': 'capa-oculta-2', salida: 'clasificador' },
};

export function solveRoom3FrozenLab(state: GameState, answer: Record<string, string>): boolean {
  const solved = solveConnectionPuzzle(state, puzzle, answer);
  if (solved && !state.fragments.includes(ROOM_3_FRAGMENT)) state.fragments.push(ROOM_3_FRAGMENT);
  return solved;
}
