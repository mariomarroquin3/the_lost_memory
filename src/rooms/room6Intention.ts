import type { GameState } from '../gameState';
import { solveRoomPuzzle } from './roomHelpers';
export const ROOM_6_ID = 'room-6-intention';
export function solveRoom6Intention(state: GameState, selectedMeaning: string): boolean {
  return solveRoomPuzzle(state, ROOM_6_ID, 'Intención', selectedMeaning === 'protect-people', 7, 5);
}
