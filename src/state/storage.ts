import type { GameState } from '../gameState';

const STORAGE_KEY = 'the-lost-memory:game-state';

export function loadGameState(fallback: GameState): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<GameState>;
    return {
      ...fallback,
      ...parsed,
      fragments: Array.isArray(parsed.fragments) ? parsed.fragments : fallback.fragments,
      unlockedDoors: Array.isArray(parsed.unlockedDoors) ? parsed.unlockedDoors : fallback.unlockedDoors,
      completedPuzzles: Array.isArray(parsed.completedPuzzles) ? parsed.completedPuzzles : fallback.completedPuzzles,
    };
  } catch {
    return fallback;
  }
}

export function saveGameState(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // El juego sigue funcionando si el navegador bloquea el almacenamiento.
  }
}

export function clearGameState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // El navegador puede bloquear el almacenamiento sin impedir reiniciar la sesión.
  }
}
