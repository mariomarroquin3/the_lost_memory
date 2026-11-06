import { completePuzzle, increaseGlobalSync, spendComputePower, type GameState } from '../gameState';

export interface ConnectionPuzzle {
  id: string;
  connections: Record<string, string>;
}

export function solveConnectionPuzzle(state: GameState, puzzle: ConnectionPuzzle, answer: Record<string, string>): boolean {
  const solved = Object.keys(puzzle.connections).every((source) => answer[source] === puzzle.connections[source]);
  if (!solved) {
    spendComputePower(state, 7);
    return false;
  }
  completePuzzle(state, puzzle.id);
  increaseGlobalSync(state, 5);
  return true;
}
