import type { RoomMap } from './types';

export const ROOM_WIDTH = 640;
export const ROOM_HEIGHT = 384;
export const ROOM_COLS = 4;
export const ROOM_ROWS = 3;
export const MAP_WIDTH = ROOM_COLS * ROOM_WIDTH;
export const MAP_HEIGHT = ROOM_ROWS * ROOM_HEIGHT;

/** Distribución 4×3: el jugador puede avanzar lateralmente y también subir/bajar. */
export const ROOM_LAYOUT: Record<number, { col: number; row: number }> = {
  1: { col: 0, row: 0 },
  2: { col: 1, row: 0 },
  3: { col: 2, row: 0 },
  4: { col: 3, row: 0 },
  5: { col: 0, row: 1 },
  6: { col: 1, row: 1 },
  7: { col: 2, row: 1 },
  8: { col: 3, row: 1 },
  9: { col: 1, row: 2 },
  10: { col: 2, row: 2 },
};

export function roomOrigin(roomId: number): { x: number; y: number } {
  const position = ROOM_LAYOUT[roomId] ?? ROOM_LAYOUT[1];
  return { x: position.col * ROOM_WIDTH, y: position.row * ROOM_HEIGHT };
}

export function roomAtPosition(x: number, y: number): number {
  for (const [roomId, position] of Object.entries(ROOM_LAYOUT)) {
    const originX = position.col * ROOM_WIDTH;
    const originY = position.row * ROOM_HEIGHT;
    if (x >= originX && x < originX + ROOM_WIDTH && y >= originY && y < originY + ROOM_HEIGHT) return Number(roomId);
  }
  return 1;
}

export function isRoomAt(col: number, row: number): boolean {
  return Object.values(ROOM_LAYOUT).some((position) => position.col === col && position.row === row);
}

export function roomMapBounds(): Pick<RoomMap, 'width' | 'height'> {
  return { width: MAP_WIDTH, height: MAP_HEIGHT };
}
