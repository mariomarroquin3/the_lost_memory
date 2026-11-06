import { addFragment, completePuzzle, increaseGlobalSync, spendComputePower, type GameState } from '../gameState';

export function solveRoomPuzzle(state: GameState, roomId: string, fragment: string, valid: boolean, penalty: number, syncGain: number): boolean {
  if (!valid) {
    spendComputePower(state, penalty);
    return false;
  }
  completePuzzle(state, roomId);
  addFragment(state, fragment);
  increaseGlobalSync(state, syncGain);
  return true;
}
