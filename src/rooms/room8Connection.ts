import type { GameState } from '../gameState';
import { solveRoomPuzzle } from './roomHelpers';
export const ROOM_8_ID = 'room-8-connection';
export function solveRoom8Connection(state: GameState, tools: string[]): boolean {
  return solveRoomPuzzle(state, ROOM_8_ID, 'Conexión', tools.join('>') === 'search>verify>execute', 8, 7);
}
