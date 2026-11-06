import type { GameState } from '../gameState';
import { solveRoomPuzzle } from './roomHelpers';
export const ROOM_9_ID = 'room-9-responsibility';
export function solveRoom9Responsibility(state: GameState, evidence: string[]): boolean {
  return solveRoomPuzzle(state, ROOM_9_ID, 'Responsabilidad', evidence.includes('kiro-authorized') && evidence.includes('lia-warning'), 10, 8);
}
