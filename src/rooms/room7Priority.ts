import type { GameState } from '../gameState';
import { solveRoomPuzzle } from './roomHelpers';
export const ROOM_7_ID = 'room-7-priority';
export function solveRoom7Priority(state: GameState, orderedSignals: string[]): boolean {
  return solveRoomPuzzle(state, ROOM_7_ID, 'Prioridad', orderedSignals.join('>') === 'hospital>power>finance', 8, 7);
}
