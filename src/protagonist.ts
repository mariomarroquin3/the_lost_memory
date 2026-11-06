/** Identidad jugable centralizada para mantener consistente el nombre de Kiro. */
export const PROTAGONIST_NAME = 'Kiro';

export interface Protagonist {
  name: typeof PROTAGONIST_NAME;
  currentRoom: number;
}

export const createProtagonist = (currentRoom = 1): Protagonist => ({
  name: PROTAGONIST_NAME,
  currentRoom,
});
