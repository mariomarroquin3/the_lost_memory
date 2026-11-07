// Mapa en cuadrícula al estilo de Proyecto 21: salas de 18 x 12 baldosas de 16 px,
// puertas entre salas vecinas y objetos colocados por sala. Aquí se construye uno por mundo.

export const T = 16;
/** Cada sala mide 18 x 12 baldosas, contando sus paredes. */
export const CW = 18;
export const CH = 12;

export type FloorStyle =
  | 'wood' | 'parquet' | 'stone' | 'stoneDark' | 'grate' | 'checker' | 'concrete' | 'concreteDark' | 'vault' | 'tech'
  // Ambientación de El Rescate del Contexto
  | 'cracked' | 'ice' | 'archive' | 'fiber' | 'stage' | 'holo' | 'glass' | 'ash' | 'circuit' | 'void' | 'lobby' | 'plates';
export type WallStyle = 'wallpaper' | 'brick' | 'brickDark' | 'woodpanel' | 'panel' | 'steel' | 'tiles'
  | 'concreteWall' | 'glasswall' | 'pipesWall' | 'frost' | 'cabinets' | 'tunnel' | 'screens' | 'servers' | 'mirror' | 'burning' | 'ports' | 'vines' | 'coreWall';

/** Atmósfera de una sala: color de la oscuridad, partículas y luz de Sato. */
export interface Mood {
  /** Color de la oscuridad (r,g,b) y cuánto tapa (0-1). */
  shade: [number, number, number, number];
  motes: 'dust' | 'snow' | 'spores' | 'embers' | 'data' | 'ash';
  /** Tinte de la luz de Sato. */
  glow: string;
  /** Destellos rojos del Alucinador (relámpagos del otro lado). */
  lightning?: boolean;
}

export interface MapRoom {
  id: string;
  c: number;
  r: number;
  floor: FloorStyle;
  wall: WallStyle;
  dark?: boolean;
  mood?: Mood;
  /** Mitad derecha con otro material (la Grieta). */
  split?: { floor: FloorStyle; wall: WallStyle };
  /** Vacíos dentro de la sala, en baldosas [x, y, ancho, alto]: no se pueden pisar. */
  pits?: Array<[number, number, number, number]>;
}

export interface Door {
  a: string;
  b: string;
  /** h: puerta en la pared lateral (a a la izquierda); v: en la pared de abajo (a arriba). */
  dir: 'h' | 'v';
  /** Condición para abrirla (id de sala resuelta o 'hidden'). Sin gate, siempre abierta. */
  gate?: string;
  /** Pared falsa: cerrada se dibuja como pared. */
  hidden?: boolean;
  tiles: Array<[number, number, boolean]>;
}

export type Anim = 'rack' | 'alarm' | 'gen' | 'console' | 'pc' | 'spark' | 'emlight' | 'lights' | 'relic' | 'core' | 'led';

export interface Thing {
  room: string;
  sprite: string;
  x: number;
  y: number;
  w: number;
  h: number;
  wall?: boolean;
  flat?: boolean;
  solid?: [number, number, number, number] | null;
  anim?: Anim;
  /** Lo que pasa al pulsar E: id que interpreta el juego (main:2, clue, hidden-panel, switch, info). */
  act?: string;
  label?: string;
  info?: { title: string; text: string };
}

export interface ThingDef {
  wall?: boolean;
  flat?: boolean;
  solid?: [number, number, number, number] | null;
  anim?: Anim;
  act?: string;
  label?: string;
  info?: [string, string];
}

/** Tamaño de cada sprite (mismo orden que en Proyecto 21 para conservar sus dibujos). */
export const SPRITE_SIZE: Record<string, [number, number]> = {
  bookshelf: [16, 28], rack: [16, 28], desk: [32, 18], table: [32, 18], readtable: [24, 16], chair: [12, 14],
  armchair: [18, 18], plant: [14, 22], crate: [16, 16], boxes: [18, 22], barrel: [14, 18], generator: [32, 24],
  workbench: [32, 18], stove: [16, 22], fridge: [16, 30], counter: [16, 20], cookiejar: [8, 10], cabinet: [16, 26],
  lamp: [10, 26], console: [36, 24], bear: [34, 24], coins: [16, 8], gold: [18, 10], atril: [16, 22],
  whitepaper: [16, 22], terminal: [16, 22], rug: [48, 32], hazard: [64, 12], photo: [12, 10], clock: [10, 14],
  graffiti: [16, 12], pipes: [48, 10], toolwall: [32, 12], dial: [26, 26], fusebox: [16, 14], alarm: [8, 8],
  deposit: [40, 14], vault: [36, 34], pc: [24, 24], shelfFallen: [30, 14], rackFallen: [30, 14], rubble: [20, 12],
  emlight: [10, 6], cable: [12, 16], crack: [16, 10], debris: [12, 8], glass: [10, 6], papers: [12, 8], puddle: [20, 8],
  bust: [12, 22], poster: [16, 14], levers: [32, 18], cooler: [24, 28], bone: [12, 6], padlock: [10, 10],
  simon: [20, 20], led: [6, 6], alphabet: [72, 16], note: [10, 8], binary: [32, 22], relic: [10, 10],
};

/** 0 vacío, 1 pared, 2 suelo, 3 puerta, 4 abismo dentro de una sala. */
export interface Cell {
  t: 0 | 1 | 2 | 3 | 4;
  room: number;
  door: number;
  face: boolean;
}

export interface TileMap {
  GW: number;
  GH: number;
  rooms: MapRoom[];
  doors: Door[];
  things: Thing[];
  cell(x: number, y: number): Cell;
  roomAt(px: number, py: number): number;
  roomIndex(id: string): number;
  /** Centro de una sala en píxeles. */
  center(id: string): { x: number; y: number };
  add(room: string, sprite: string, x: number, y: number, def?: ThingDef): void;
}

const VOID: Cell = { t: 0, room: -1, door: -1, face: false };

export function buildMap(cols: number, rows: number, rooms: MapRoom[], doors: Array<Omit<Door, 'tiles'>>): TileMap {
  const GW = cols * CW;
  const GH = rows * CH;
  const grid: Cell[] = Array.from({ length: GW * GH }, () => ({ ...VOID }));
  const cell = (x: number, y: number): Cell => (x < 0 || y < 0 || x >= GW || y >= GH ? VOID : grid[y * GW + x]);
  const roomIndex = (id: string): number => rooms.findIndex((room) => room.id === id);
  const byId = (id: string): MapRoom => rooms[roomIndex(id)];

  rooms.forEach((room, i) => {
    for (let y = 0; y < CH; y++) {
      for (let x = 0; x < CW; x++) {
        const c = grid[(room.r * CH + y) * GW + room.c * CW + x];
        c.room = i;
        c.t = x === 0 || y === 0 || x === CW - 1 || y === CH - 1 ? 1 : 2;
      }
    }
    for (const [px, py, pw, ph] of room.pits ?? []) {
      for (let y = py; y < py + ph; y++) for (let x = px; x < px + pw; x++) grid[(room.r * CH + y) * GW + room.c * CW + x].t = 4;
    }
  });

  const fullDoors: Door[] = doors.map((d) => ({ ...d, tiles: [] }));
  fullDoors.forEach((door, di) => {
    const a = byId(door.a);
    const b = byId(door.b);
    if (door.dir === 'h') {
      const y0 = a.r * CH + 5;
      for (const y of [y0, y0 + 1]) for (const x of [a.c * CW + CW - 1, b.c * CW]) door.tiles.push([x, y, false]);
    } else {
      const x0 = a.c * CW + 8;
      for (const x of [x0, x0 + 1]) {
        door.tiles.push([x, a.r * CH + CH - 1, false]);
        door.tiles.push([x, b.r * CH, true]);
      }
    }
    for (const [x, y, face] of door.tiles) Object.assign(cell(x, y), { t: 3, door: di, face });
  });

  const things: Thing[] = [];
  const add = (room: string, sprite: string, x: number, y: number, def: ThingDef = {}): void => {
    const rm = byId(room);
    const [w, h] = SPRITE_SIZE[sprite];
    let solid: Thing['solid'] = def.solid;
    if (def.wall || def.flat) solid = solid ?? null;
    else if (solid === undefined) solid = [0, Math.max(0, h - 8), w, Math.min(8, h)];
    things.push({
      room, sprite, x: rm.c * CW * T + x, y: rm.r * CH * T + y, w, h,
      wall: def.wall, flat: def.flat, solid, anim: def.anim, act: def.act, label: def.label,
      info: def.info && { title: def.info[0], text: def.info[1] },
    });
  };

  return {
    GW, GH, rooms, doors: fullDoors, things, cell, roomIndex, add,
    roomAt: (px, py) => cell(Math.floor(px / T), Math.floor(py / T)).room,
    center: (id) => {
      const r = byId(id);
      return { x: r.c * CW * T + (CW * T) / 2, y: r.r * CH * T + (CH * T) / 2 + 24 };
    },
  };
}
