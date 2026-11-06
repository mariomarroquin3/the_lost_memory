export type Facing = 'up' | 'down' | 'left' | 'right';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RoomMap {
  width: number;
  height: number;
  solids: Rect[];
}

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  facing: Facing;
  moving: boolean;
}

export interface CanvasGameEvents {
  onRoomChanged?: (roomId: number) => void;
  onInteract?: () => void;
}
