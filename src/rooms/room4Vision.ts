import type { GameState } from '../gameState';
import { solveRoomPuzzle } from './roomHelpers';
export const ROOM_4_ID = 'room-4-vision';
export function solveRoom4Vision(state: GameState, selectedPattern: string): boolean {
  return solveRoomPuzzle(state, ROOM_4_ID, 'Percepción', selectedPattern === 'coherent-image', 5, 5);
}
