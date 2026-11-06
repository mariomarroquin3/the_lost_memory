import type { GameState } from '../gameState';
import { solveRoomPuzzle } from './roomHelpers';
export const ROOM_5_ID = 'room-5-memory';
export function solveRoom5Memory(state: GameState, sequence: string[]): boolean {
  return solveRoomPuzzle(state, ROOM_5_ID, 'Memoria', sequence.join('>') === 'signal>voice>door>context', 7, 5);
}
