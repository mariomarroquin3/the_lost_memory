import { addFragment, completePuzzle, increaseGlobalSync, spendComputePower, type GameState } from '../gameState';

export const ROOM_1_ID = 'room-1-security';
export const ROOM_1_FRAGMENT = 'Identidad';

/** Resultado de validar el registro anómalo de la estación de seguridad. */
export interface Room1PuzzleResult {
  solved: boolean;
  message: string;
}

/**
 * Resuelve la primera sala sin acoplarla al Canvas.
 * La UI HTML puede llamar esta función desde un panel de limpieza de datos.
 */
export function solveRoom1Security(state: GameState, selectedRecord: number, anomalousRecord: number): Room1PuzzleResult {
  if (selectedRecord !== anomalousRecord) {
    spendComputePower(state, 5);
    return { solved: false, message: 'Registro incorrecto. La anomalía sigue activa.' };
  }

  completePuzzle(state, ROOM_1_ID);
  addFragment(state, ROOM_1_FRAGMENT);
  increaseGlobalSync(state, 5);
  return { solved: true, message: 'Registro anómalo eliminado. Fragmento de Identidad recuperado.' };
}
