import { completePuzzle, increaseGlobalSync, spendComputePower, type GameState } from '../gameState';

export interface PromptPuzzle {
  id: string;
  requiredTerms: string[];
}

export function solvePromptPuzzle(state: GameState, puzzle: PromptPuzzle, selectedTerms: string[]): boolean {
  const expected = [...puzzle.requiredTerms].sort();
  const actual = [...new Set(selectedTerms)].sort();
  const solved = expected.length === actual.length && expected.every((term, index) => term === actual[index]);
  if (!solved) {
    spendComputePower(state, 10);
    return false;
  }
  completePuzzle(state, puzzle.id);
  increaseGlobalSync(state, 10);
  return true;
}
