// Arte de Proyecto 21 (sprites.ts) adaptado: suelos, paredes, puertas y muebles dibujados por código.
// El mapa ya no es global: drawMap recibe el mapa de cada mundo.
import { SPRITE_SIZE, T, type Door, type FloorStyle, type TileMap, type WallStyle } from './tilemap';


type Rect = (x: number, y: number, w: number, h: number, color: string) => void;

function make(w: number, h: number, draw: (rect: Rect, g: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d')!;
  draw((x, y, ww, hh, color) => {
    g.fillStyle = color;
    g.fillRect(x, y, ww, hh);
  }, g);
  return canvas;
}

// Azar con semilla: el mismo dibujo en cada carga.
let seed = 1;
const srand = (s: number): void => {
  seed = (Math.abs(s) % 2147483646) + 1;
};
const rnd = (): number => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};
const ri = (n: number): number => (rnd() * n) | 0;
const pick = <V>(list: V[]): V => list[ri(list.length)];

function disc(R: Rect, cx: number, cy: number, r: number, color: string): void {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) R(cx + x, cy + y, 1, 1, color);
}
function ring(R: Rect, cx: number, cy: number, r: number, color: string): void {
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      const d = x * x + y * y;
      if (d <= r * r + r * 0.6 && d >= (r - 1) * (r - 1) - (r - 1) * 0.4) R(cx + x, cy + y, 1, 1, color);
    }
  }
}
function fromRows(rows: string[], palette: Record<string, string>): HTMLCanvasElement {
  return make(rows[0].length, rows.length, (R) =>
    rows.forEach((row, y) => [...row].forEach((ch, x) => palette[ch] && R(x, y, 1, 1, palette[ch]))),
  );
}
// ---------- suelos ----------

function flagstones(R: Rect, base: string, mortar: string, hi: string, lo: string): void {
  R(0, 0, 16, 16, mortar);
  const blocks = [[0, 0, 9, 7], [10, 0, 6, 7], [0, 8, 5, 8], [6, 8, 10, 8]];
  for (const [x, y, w, h] of blocks) {
    R(x, y, w, h, base);
    R(x, y, w, 1, hi);
    R(x, y + h - 1, w, 1, lo);
    if (rnd() < 0.5) R(x + 1 + ri(Math.max(1, w - 2)), y + 2 + ri(Math.max(1, h - 3)), 1, 1, lo);
  }
}

const FLOORS: Record<string, (R: Rect) => void> = {
  // Tablas verticales en tono miel, para que no se confundan con las paredes.
  wood: (R) => {
    R(0, 0, 16, 16, '#b07a45');
    for (let i = 0; i < 4; i++) {
      const x = i * 4;
      R(x, 0, 1, 16, '#c48c52');
      R(x + 3, 0, 1, 16, '#8a5a30');
      R(x, (i * 7 + ri(4)) % 16, 3, 1, '#8a5a30');
    }
    if (rnd() < 0.4) R(1 + ri(3) * 4, 2 + ri(11), 1, 2, '#9c6a3b');
  },
  parquet: (R) => {
    for (let by = 0; by < 2; by++) {
      for (let bx = 0; bx < 2; bx++) {
        const x = bx * 8;
        const y = by * 8;
        const upright = (bx + by) % 2 === 0;
        R(x, y, 8, 8, '#5e3b25');
        for (let k = 0; k < 4; k++) {
          const color = k % 2 ? '#6b4430' : '#734a33';
          if (upright) R(x + k * 2, y, 2, 8, color);
          else R(x, y + k * 2, 8, 2, color);
        }
        R(x, y + 7, 8, 1, '#40271a');
        R(x + 7, y, 1, 8, '#40271a');
      }
    }
  },
  stone: (R) => flagstones(R, '#4b4654', '#2f2b36', '#5a5464', '#3c3844'),
  stoneDark: (R) => flagstones(R, '#34303c', '#1f1c25', '#403b49', '#2a2631'),
  grate: (R) => {
    R(0, 0, 16, 16, '#24222b');
    for (let i = 0; i < 16; i += 4) {
      R(i, 0, 1, 16, '#353240');
      R(0, i, 16, 1, '#353240');
    }
    R(0, 0, 16, 1, '#45414f');
    R(0, 0, 1, 16, '#45414f');
    for (const [x, y] of [[1, 1], [14, 1], [1, 14], [14, 14]]) R(x, y, 1, 1, '#6a6577');
  },
  checker: (R) => {
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) R(x * 8, y * 8, 8, 8, (x + y) % 2 ? '#3c8579' : '#dcd5c6');
    R(0, 7, 16, 1, '#a79f8f');
    R(7, 0, 1, 16, '#a79f8f');
    R(0, 15, 16, 1, '#a79f8f');
    R(15, 0, 1, 16, '#a79f8f');
  },
  concrete: (R) => {
    R(0, 0, 16, 16, '#5b5650');
    for (let i = 0; i < 9; i++) R(ri(16), ri(16), 1, 1, pick(['#4f4a44', '#68625a', '#534e48']));
    if (rnd() < 0.15) {
      R(4, 6, 5, 3, '#46423d');
      R(5, 5, 3, 5, '#46423d');
    }
    R(0, 15, 16, 1, '#4c4843');
    R(15, 0, 1, 16, '#4c4843');
  },
  concreteDark: (R) => {
    R(0, 0, 16, 16, '#3b3836');
    for (let i = 0; i < 9; i++) R(ri(16), ri(16), 1, 1, pick(['#33302e', '#47433f']));
    R(0, 15, 16, 1, '#2e2b29');
    R(15, 0, 1, 16, '#2e2b29');
  },
  vault: (R) => {
    R(0, 0, 16, 16, '#59606b');
    R(0, 0, 16, 1, '#7d8591');
    R(0, 0, 1, 16, '#7d8591');
    R(0, 15, 16, 1, '#3a4048');
    R(15, 0, 1, 16, '#3a4048');
    for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]]) {
      R(x, y, 1, 1, '#a2aab5');
      R(x, y + 1, 1, 1, '#3a4048');
    }
  },
  tech: (R) => {
    R(0, 0, 16, 16, '#16121d');
    R(0, 15, 16, 1, '#1f1a28');
    R(15, 0, 1, 16, '#1f1a28');
    if (rnd() < 0.5) {
      const y = 3 + ri(10);
      R(0, y, 7 + ri(9), 1, '#3d2a14');
      R(6, y, 1, 1, '#f7931a');
    }
    if (rnd() < 0.4) R(3 + ri(10), 0, 1, 6 + ri(10), '#3d2a14');
  },
};

// Suelos propios de cada sala de El Rescate del Contexto.
Object.assign(FLOORS, {
  cracked: (R: Rect) => {
    R(0, 0, 16, 16, '#2e2b33');
    for (const [x, y] of [[0, 0], [8, 0], [0, 8], [8, 8]]) {
      R(x, y, 7, 7, pick(['#4a4650', '#46424c', '#4e4a55']));
      R(x, y, 7, 1, '#57525e');
    }
    if (rnd() < 0.45) { let x = ri(12) + 2; for (let y = 1; y < 15; y += 2) { R(x, y, 1, 2, '#24212a'); x += ri(3) - 1; } }
    if (rnd() < 0.3) R(ri(14), ri(14), 2, 1, '#6b5a44');
  },
  ice: (R: Rect) => {
    R(0, 0, 16, 16, '#9ebdd4');
    for (let i = 0; i < 4; i++) R(ri(12), ri(16), 3 + ri(6), 1, '#c4dbea');
    if (rnd() < 0.5) { let y = ri(10) + 3; for (let x = 0; x < 16; x += 2) { R(x, y, 2, 1, '#7a9db8'); y += ri(3) - 1; } }
    if (rnd() < 0.6) R(ri(15), ri(15), 1, 1, '#ffffff');
    R(0, 15, 16, 1, '#86a7c0');
  },
  archive: (R: Rect) => {
    R(0, 0, 16, 16, '#3a2f26');
    R(0, 0, 16, 1, '#2c241e');
    R(0, 0, 1, 16, '#2c241e');
    R(8, 8, 8, 8, '#362b23');
    if (rnd() < 0.25) R(ri(12), 3 + ri(10), 4, 2, '#cfc5ae');
  },
  fiber: (R: Rect) => {
    R(0, 0, 16, 16, '#0a0c12');
    R(1, 1, 14, 14, '#161b24');
    R(1, 1, 14, 1, '#1f2632');
    R(1, 14, 14, 1, '#0f5560');
    if (rnd() < 0.5) R(2 + ri(12), 3 + ri(10), 1, 1, pick(['#00e5ff', '#4cc47a']));
  },
  stage: (R: Rect) => {
    R(0, 0, 16, 16, '#17161d');
    R(0, 0, 16, 1, '#201f28');
    R(0, 8, 16, 1, '#201f28');
    if (rnd() < 0.35) R(ri(12), ri(14), 4, 1, '#2b2a36');
  },
  holo: (R: Rect) => {
    R(0, 0, 16, 16, '#0b0a1d');
    R(0, 0, 16, 1, '#241b52');
    R(0, 0, 1, 16, '#241b52');
    if (rnd() < 0.3) R(0, 0, 1, 1, '#00e5ff');
    if (rnd() < 0.25) R(3 + ri(10), 3 + ri(10), 2, 1, '#3a2b7a');
  },
  glass: (R: Rect) => {
    R(0, 0, 16, 16, '#110f24');
    for (let i = 0; i < 16; i++) R(i, (i * 2 + 3) % 16, 1, 1, '#221d45');
    if (rnd() < 0.4) for (let i = 0; i < 5; i++) R(9 + i, 12 - i * 2, 1, 2, '#2f2862');
    R(15, 0, 1, 16, '#1a1638');
    R(0, 15, 16, 1, '#1a1638');
  },
  ash: (R: Rect) => {
    R(0, 0, 16, 16, '#151018');
    for (let i = 0; i < 6; i++) R(ri(15), ri(15), 1 + ri(2), 1, pick(['#241c26', '#2c2230', '#3a2e38']));
    if (rnd() < 0.35) R(ri(15), ri(15), 1, 1, pick(['#ff6a1a', '#a46cff']));
  },
  circuit: (R: Rect) => {
    R(0, 0, 16, 16, '#0d0a1b');
    const y = 2 + ri(12);
    R(0, y, 8 + ri(8), 1, '#2b2060');
    const x = 2 + ri(12);
    R(x, 0, 1, 6 + ri(10), '#2b2060');
    R(x - 1, y - 1, 3, 3, '#3d2e85');
    if (rnd() < 0.3) R(x, y, 1, 1, '#e8e2ff');
  },
  lobby: (R: Rect) => {
    R(0, 0, 16, 16, '#1d1c26');
    R(0, 0, 16, 1, '#272534');
    R(0, 0, 1, 16, '#272534');
    R(1, 1, 6, 1, '#2c2a3a');
    if (rnd() < 0.15) R(2 + ri(12), 2 + ri(12), 1, 1, '#1f3a44');
  },
  plates: (R: Rect) => {
    R(0, 0, 16, 16, '#2a2a30');
    R(0, 0, 16, 1, '#3a3a42');
    R(0, 15, 16, 1, '#1c1c22');
    for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]]) R(x, y, 1, 1, '#4a4a54');
    if (rnd() < 0.3) R(0, 7, 16, 2, '#3a3218');
  },
  void: (R: Rect) => {
    R(0, 0, 16, 16, '#09060f');
    for (let i = 0; i < 3; i++) R(ri(16), ri(16), 1, 1, pick(['#2a1840', '#1c1230', '#3d1430']));
    if (rnd() < 0.3) { let x = ri(10); for (let y = ri(6); y < 16; y++) { R(x, y, 1, 1, '#2e0f22'); if (rnd() < 0.4) x++; } }
  },
});

const floorCache = new Map<string, HTMLCanvasElement>();
function floorTile(style: FloorStyle, x: number, y: number): HTMLCanvasElement {
  const variant = ((x * 7 + y * 13) ^ (x * y)) & 3;
  const key = style + variant;
  let tile = floorCache.get(key);
  if (!tile) {
    srand(variant * 977 + style.length * 31);
    tile = make(16, 16, FLOORS[style]);
    floorCache.set(key, tile);
  }
  return tile;
}

// ---------- paredes: cara frontal ----------

function bricks(R: Rect, mortar: string, brick: string, top: string): void {
  R(0, 0, 16, 16, mortar);
  for (let row = 0; row < 4; row++) {
    const off = row % 2 ? 4 : 0;
    for (let x = -off; x < 16; x += 8) {
      R(x + 1, row * 4, 7, 3, brick);
      R(x + 1, row * 4, 7, 1, top);
    }
  }
}

const WALLS: Record<string, (R: Rect) => void> = {
  wallpaper: (R) => {
    R(0, 0, 16, 16, '#3e5a4b');
    for (let x = 1; x < 16; x += 4) R(x, 0, 1, 12, '#4d6d5a');
    for (let x = 3; x < 16; x += 4) R(x, 4, 1, 1, '#c9a45a');
    R(0, 12, 16, 4, '#5a3a28');
    R(0, 12, 16, 1, '#8b5d3d');
  },
  brick: (R) => bricks(R, '#4a2a25', '#6b3d34', '#7f4b40'),
  brickDark: (R) => bricks(R, '#241d24', '#3b2f39', '#4a3c47'),
  woodpanel: (R) => {
    R(0, 0, 16, 16, '#5a3724');
    for (let x = 0; x < 16; x += 4) R(x, 2, 1, 11, '#432819');
    R(0, 0, 16, 2, '#7a4f33');
    R(0, 13, 16, 3, '#3a2316');
    R(0, 13, 16, 1, '#7a4f33');
  },
  panel: (R) => {
    R(0, 0, 16, 16, '#2c3340');
    R(0, 0, 16, 1, '#3d4657');
    R(7, 0, 1, 16, '#1d222b');
    R(15, 0, 1, 16, '#1d222b');
    R(2, 3, 4, 1, '#3d4657');
    R(9, 3, 4, 1, '#3d4657');
    R(0, 13, 16, 3, '#20252e');
  },
  steel: (R) => {
    R(0, 0, 16, 16, '#4a515c');
    R(0, 0, 16, 1, '#68707c');
    R(0, 7, 16, 1, '#3a4048');
    R(0, 8, 16, 1, '#5d6571');
    for (const [x, y] of [[2, 2], [13, 2], [2, 11], [13, 11]]) R(x, y, 1, 1, '#8d95a1');
    R(0, 14, 16, 2, '#2e333a');
  },
  tiles: (R) => {
    R(0, 0, 16, 16, '#bab2a3');
    for (let y = 0; y < 3; y++) for (let x = 0; x < 4; x++) R(x * 4, y * 4, 3, 3, '#e9e3d6');
    R(0, 12, 16, 4, '#2f6f65');
    R(0, 12, 16, 1, '#4c968a');
  },
};

Object.assign(WALLS, {
  concreteWall: (R: Rect) => {
    R(0, 0, 16, 16, '#4d4953');
    R(0, 0, 16, 1, '#625d68');
    R(0, 7, 16, 1, '#3d3a43');
    R(4, 2, 2, 4, '#433f48');
    R(0, 12, 16, 4, '#2b2830');
    for (let x = 0; x < 16; x += 4) R(x, 12, 2, 1, '#c46a0c');
  },
  glasswall: (R: Rect) => {
    R(0, 0, 16, 16, '#1a2230');
    R(1, 1, 14, 10, '#22304a');
    R(3, 2, 1, 7, '#3a4e70');
    R(5, 2, 1, 3, '#3a4e70');
    R(0, 11, 16, 1, '#00e5ff');
    R(0, 12, 16, 4, '#12151e');
  },
  pipesWall: (R: Rect) => {
    R(0, 0, 16, 16, '#24222a');
    R(0, 2, 16, 3, '#4a4652');
    R(0, 2, 16, 1, '#6e6a72');
    R(0, 7, 16, 2, '#5a3a28');
    R(11, 0, 2, 12, '#3a3842');
    R(0, 12, 16, 4, '#18161c');
    R(0, 12, 16, 1, '#e0b23c');
  },
  frost: (R: Rect) => {
    R(0, 0, 16, 16, '#5d7f99');
    R(0, 0, 16, 2, '#cfe3f0');
    R(3, 2, 2, 2, '#cfe3f0');
    R(10, 2, 3, 3, '#cfe3f0');
    R(11, 5, 1, 2, '#e8f4fb');
    R(4, 4, 1, 2, '#e8f4fb');
    R(0, 7, 16, 1, '#4a6a83');
    R(0, 12, 16, 4, '#3d566b');
    R(0, 12, 16, 1, '#a9c8dd');
  },
  cabinets: (R: Rect) => {
    R(0, 0, 16, 16, '#4b505a');
    for (const y of [1, 6]) { R(1, y, 14, 4, '#5d6470'); R(1, y, 14, 1, '#737b88'); R(6, y + 2, 4, 1, '#b5bcc6'); R(2, y + 1, 3, 1, '#cfc5ae'); }
    R(0, 11, 16, 5, '#2e323a');
    R(0, 11, 16, 1, '#5d6470');
  },
  tunnel: (R: Rect) => {
    R(0, 0, 16, 16, '#101318');
    R(0, 3, 16, 1, '#0f5560');
    R(0, 6, 16, 1, '#1f5a33');
    R(0, 9, 16, 1, '#0f5560');
    R(0, 12, 16, 4, '#0a0c10');
    R(0, 12, 16, 1, '#2a3340');
  },
  screens: (R: Rect) => {
    R(0, 0, 16, 16, '#1c1a22');
    R(1, 1, 6, 5, '#233a30');
    R(9, 1, 6, 5, '#1f2b3a');
    R(1, 7, 6, 4, '#1f2b3a');
    R(9, 7, 6, 4, '#2a2230');
    R(2, 2, 3, 1, '#4cc47a');
    R(10, 3, 4, 1, '#8fb3cc');
    R(0, 12, 16, 4, '#131118');
  },
  servers: (R: Rect) => {
    R(0, 0, 16, 16, '#15112a');
    R(1, 0, 6, 12, '#1d1838');
    R(9, 0, 6, 12, '#1d1838');
    for (let y = 1; y < 12; y += 2) { R(2, y, 4, 1, '#2a2350'); R(10, y, 4, 1, '#2a2350'); }
    R(5, 3, 1, 1, '#a46cff');
    R(13, 7, 1, 1, '#a46cff');
    R(3, 9, 1, 1, '#00e5ff');
    R(0, 12, 16, 4, '#0d0a1b');
  },
  mirror: (R: Rect) => {
    R(0, 0, 16, 16, '#2a2648');
    R(1, 1, 14, 10, '#3d3866');
    for (let i = 0; i < 6; i++) R(3 + i, 9 - i, 1, 1, '#6a63a8');
    R(11, 2, 1, 4, '#8a83c8');
    R(0, 12, 16, 4, '#171430');
    R(0, 12, 16, 1, '#4e4680');
  },
  burning: (R: Rect) => {
    R(0, 0, 16, 16, '#1a1226');
    for (const y of [1, 6]) {
      R(0, y + 4, 16, 1, '#3a2a4a');
      for (let x = 1; x < 15; x += 2) R(x, y + 4 - (1 + ri(3)), 1, 1 + ri(3), pick(['#6b4c8f', '#3e6f80', '#a46cff', '#2c4a8a']));
    }
    R(0, 12, 16, 4, '#2a1218');
    R(2, 12, 2, 1, '#ff6a1a');
    R(9, 13, 3, 1, '#ff6a1a');
    R(13, 12, 1, 1, '#ffd23a');
  },
  ports: (R: Rect) => {
    R(0, 0, 16, 16, '#150f26');
    ring(R, 8, 6, 4, '#4e4680');
    R(7, 5, 3, 3, '#05030a');
    R(0, 12, 16, 4, '#0d0a1b');
    R(0, 12, 16, 1, '#3d2e85');
  },
  vines: (R: Rect) => {
    R(0, 0, 16, 16, '#110b17');
    let x = 3;
    for (let y = 0; y < 14; y++) { R(x, y, 2, 1, '#3b1530'); x += ri(3) - 1; x = Math.max(0, Math.min(14, x)); }
    x = 11;
    for (let y = 0; y < 10; y++) { R(x, y, 1, 1, '#5a1f45'); x += ri(3) - 1; x = Math.max(0, Math.min(15, x)); }
    R(0, 12, 16, 4, '#0b0710');
    R(0, 12, 16, 1, '#2a1238');
  },
  coreWall: (R: Rect) => {
    R(0, 0, 16, 16, '#0a0814');
    let y = 2;
    for (let x = 0; x < 16; x++) { R(x, y, 1, 1, '#0f5560'); if (rnd() < 0.4) y += rnd() < 0.5 ? -1 : 1; y = Math.max(0, Math.min(10, y)); }
    R(0, 12, 16, 4, '#06050c');
    R(0, 12, 16, 1, '#123a48');
  },
});

const wallCache = new Map<WallStyle, HTMLCanvasElement>();
function wallFace(style: WallStyle): HTMLCanvasElement {
  let tile = wallCache.get(style);
  if (!tile) {
    srand(style.length * 97 + style.charCodeAt(0));
    tile = make(16, 16, WALLS[style]);
    wallCache.set(style, tile);
  }
  return tile;
}

// Borde superior de los muros: placas oscuras con una costura de luz, como un laboratorio sellado.
const capTile = make(16, 16, (R) => {
  R(0, 0, 16, 16, '#14121c');
  R(0, 0, 16, 1, '#1e1b2a');
  R(0, 7, 16, 1, '#0e0c14');
  R(7, 0, 1, 7, '#0e0c14');
  R(3, 11, 1, 1, '#1f3a44');
  R(12, 3, 1, 1, '#1f3a44');
});

// ---------- puertas: compuertas deslizantes con luz de estado ----------

const threshold = make(16, 16, (R) => {
  R(0, 0, 16, 16, '#1a1824');
  R(0, 0, 16, 1, '#2e2a3e');
  for (let x = 1; x < 16; x += 3) R(x, 7, 1, 2, '#2e2a3e');
});

/** Compuerta en una pared frontal; side 0 es la hoja izquierda y 1 la derecha. */
function doorFace(side: number, locked: boolean, _seal: boolean): HTMLCanvasElement {
  return make(16, 16, (R) => {
    R(0, 0, 16, 16, '#0c0a12');
    if (!locked) {
      // Abierta: las hojas se han recogido dentro del muro.
      R(side === 0 ? 0 : 13, 0, 3, 16, '#3a3650');
      R(side === 0 ? 2 : 13, 0, 1, 16, '#00e5ff');
      R(0, 14, 16, 2, '#1a1824');
      return;
    }
    R(0, 0, 16, 16, '#3a3650');
    R(0, 0, 16, 2, '#4e4968');
    R(side === 0 ? 15 : 0, 0, 1, 16, '#16131f');
    for (let y = 4; y < 14; y += 3) R(side === 0 ? 2 : 3, y, 11, 1, '#2c2940');
    if (side === 0) {
      R(9, 6, 5, 4, '#1b1824');
      R(10, 7, 3, 2, '#ff1744');
    } else {
      R(2, 6, 5, 4, '#1b1824');
      R(3, 7, 3, 2, '#ff1744');
    }
  });
}

/** Compuerta en una pared lateral, vista desde arriba. */
function doorSide(locked: boolean): HTMLCanvasElement {
  return make(16, 16, (R) => {
    R(0, 0, 16, 16, '#1a1824');
    R(7, 0, 2, 16, '#2e2a3e');
    if (locked) {
      R(4, 0, 8, 16, '#3a3650');
      R(4, 0, 1, 16, '#4e4968');
      R(7, 0, 2, 16, '#16131f');
      R(6, 6, 4, 4, '#1b1824');
      R(7, 7, 2, 2, '#ff1744');
    } else {
      R(0, 0, 1, 16, '#00e5ff');
      R(15, 0, 1, 16, '#00e5ff');
    }
  });
}

// Abismo dentro de una sala: estructuras suspendidas sobre el vacío.
const pitTile = make(16, 16, (R) => {
  srand(77);
  R(0, 0, 16, 16, '#040309');
  for (let i = 0; i < 4; i++) R(ri(16), ri(16), 1, 1, pick(['#1c1236', '#0f2a36', '#2a0f22']));
});
const pitLip = make(16, 16, (R) => {
  R(0, 0, 16, 2, '#2a2638');
  R(0, 2, 16, 1, '#0f0c18');
  R(0, 3, 16, 3, 'rgba(0,0,0,.6)');
});

export function drawMap(target: HTMLCanvasElement, map: TileMap, locked: (door: Door) => boolean): void {
  target.width = map.GW * T;
  target.height = map.GH * T;
  const g = target.getContext('2d')!;
  g.fillStyle = '#0b0910';
  g.fillRect(0, 0, target.width, target.height);
  const cell = map.cell;
  for (let y = 0; y < map.GH; y++) {
    for (let x = 0; x < map.GW; x++) {
      const c = cell(x, y);
      if (c.t === 0) continue;
      const room = map.rooms[c.room];
      const px = x * T;
      const py = y * T;
      const half = room.split && x - room.c * 18 >= 9 ? room.split : null;
      const floor = half ? half.floor : room.floor;
      const wall = half ? half.wall : room.wall;
      if (c.t === 4) {
        g.drawImage(pitTile, px, py);
        if (cell(x, y - 1).t === 2) g.drawImage(pitLip, px, py);
        continue;
      }
      if (c.t === 2) {
        g.drawImage(floorTile(floor, x, y), px, py);
        if (cell(x, y + 1).t === 4) {
          g.fillStyle = 'rgba(0,229,255,.18)';
          g.fillRect(px, py + 15, 16, 1);
        }
        const up = cell(x, y - 1);
        if (up.t === 1 || (up.t === 3 && up.face)) {
          g.fillStyle = 'rgba(0,0,0,.28)';
          g.fillRect(px, py, 16, 3);
        }
        if (cell(x - 1, y).t === 1) {
          g.fillStyle = 'rgba(0,0,0,.18)';
          g.fillRect(px, py, 2, 16);
        }
      } else if (c.t === 1) {
        const face = cell(x, y + 1).t === 2;
        g.drawImage(face ? wallFace(wall) : capTile, px, py);
        // Una franja de luz recorre la base de los muros.
        if (face && (x + y) % 7 === 0) { g.fillStyle = 'rgba(0,229,255,.35)'; g.fillRect(px + 3, py + 14, 10, 1); }
      } else {
        const door = map.doors[c.door];
        const shut = locked(door);
        if (door.hidden && shut) {
          // Pared falsa: se ve igual que la pared de alrededor.
          g.drawImage(door.dir === 'v' && c.face ? wallFace(wall) : capTile, px, py);
          continue;
        }
        if (door.dir === 'h') g.drawImage(doorSide(shut), px, py);
        else if (c.face) {
          const side = door.tiles.filter((t) => t[2]).findIndex((t) => t[0] === x);
          g.drawImage(doorFace(side, shut, false), px, py);
        } else g.drawImage(threshold, px, py);
      }
    }
  }
}

const BOOKS = ['#8e2a2a', '#2c4a8a', '#1f7a43', '#c46a0c', '#6b4c8f', '#b39c74', '#3e6f80', '#7a2f52'];

const DRAW: Record<string, (R: Rect) => void> = {
  bookshelf: (R) => {
    R(0, 0, 16, 28, '#3a2418');
    R(1, 2, 14, 25, '#1d120c');
    R(0, 0, 16, 2, '#6b4430');
    for (let s = 0; s < 3; s++) {
      const base = 2 + s * 8 + 7;
      R(1, base, 14, 1, '#5a3724');
      let x = 1;
      while (x < 15) {
        const w = 1 + ri(2);
        const h = 4 + ri(3);
        if (rnd() < 0.1) {
          x += 1;
          continue;
        }
        R(x, base - h, Math.min(w, 15 - x), h, pick(BOOKS));
        x += w;
      }
    }
  },
  rack: (R) => {
    R(0, 0, 16, 28, '#121418');
    R(1, 1, 14, 26, '#2a2f38');
    R(1, 1, 14, 1, '#3c4350');
    for (let i = 0; i < 6; i++) {
      const y = 3 + i * 4;
      R(2, y, 12, 3, '#191d24');
      R(3, y + 1, 6, 1, '#323946');
    }
    R(1, 26, 14, 2, '#0c0d10');
  },
  desk: (R) => {
    R(0, 4, 32, 6, '#8f5d3e');
    R(0, 4, 32, 1, '#a8714d');
    R(0, 10, 32, 2, '#5a3724');
    R(1, 12, 3, 6, '#432819');
    R(28, 12, 3, 6, '#432819');
    R(19, 12, 9, 5, '#6b4430');
    R(22, 14, 3, 1, '#c9a45a');
    R(5, 3, 8, 4, '#f1e7d5');
    R(6, 4, 6, 1, '#9d93a9');
    R(6, 5, 4, 1, '#9d93a9');
    R(22, 0, 2, 5, '#2b2233');
    R(20, 0, 6, 2, '#e0b23c');
  },
  table: (R) => {
    R(0, 3, 32, 8, '#e9e3d6');
    for (let x = 0; x < 32; x += 4) for (let y = 3; y < 11; y += 4) if (((x + y) / 4) % 2 < 1) R(x, y, 2, 2, '#c94a4a');
    R(0, 11, 32, 2, '#c94a4a');
    R(2, 13, 2, 5, '#5a3724');
    R(28, 13, 2, 5, '#5a3724');
  },
  readtable: (R) => {
    R(0, 3, 24, 6, '#6b4430');
    R(0, 3, 24, 1, '#8f5d3e');
    R(1, 9, 2, 7, '#432819');
    R(21, 9, 2, 7, '#432819');
    R(14, 0, 2, 4, '#2b2233');
    R(12, 0, 6, 2, '#4cc47a');
    R(4, 2, 6, 3, '#8e2a2a');
  },
  chair: (R) => {
    R(1, 0, 10, 7, '#6b4430');
    R(1, 0, 10, 1, '#8f5d3e');
    R(0, 7, 12, 3, '#8f5d3e');
    R(1, 10, 2, 4, '#432819');
    R(9, 10, 2, 4, '#432819');
  },
  armchair: (R) => {
    R(2, 0, 14, 10, '#7a2f52');
    R(2, 0, 14, 2, '#94406a');
    R(0, 6, 4, 10, '#5e2340');
    R(14, 6, 4, 10, '#5e2340');
    R(3, 9, 12, 6, '#94406a');
    R(1, 16, 2, 2, '#2b1a12');
    R(15, 16, 2, 2, '#2b1a12');
  },
  plant: (R) => {
    R(3, 15, 8, 7, '#b5562f');
    R(3, 15, 8, 1, '#d06a3e');
    R(4, 21, 6, 1, '#7a3a20');
    const leaves = [[6, 2, 2, 13], [2, 5, 4, 3], [8, 4, 4, 3], [1, 9, 5, 3], [8, 8, 5, 3], [4, 0, 6, 3]];
    leaves.forEach(([x, y, w, h], i) => R(x, y, w, h, i % 2 ? '#2f8a4c' : '#1f6a39'));
  },
  crate: (R) => {
    R(0, 0, 16, 16, '#7a5232');
    R(1, 1, 14, 14, '#9a6a40');
    R(1, 1, 14, 1, '#b07c4c');
    for (let i = 0; i < 14; i++) {
      R(1 + i, 1 + i, 1, 1, '#6a4528');
      R(14 - i, 1 + i, 1, 1, '#6a4528');
    }
  },
  boxes: (R) => {
    R(0, 8, 18, 14, '#a07a4c');
    R(0, 8, 18, 1, '#c09a68');
    R(8, 8, 2, 14, '#c9b28a');
    R(3, 0, 13, 9, '#b48a58');
    R(3, 0, 13, 1, '#d0a874');
    R(8, 0, 2, 9, '#d8c29a');
  },
  barrel: (R) => {
    R(1, 0, 12, 18, '#3c5a7a');
    R(0, 2, 14, 14, '#4a6d91');
    R(0, 4, 14, 1, '#2b415a');
    R(0, 12, 14, 1, '#2b415a');
    R(3, 0, 8, 2, '#2b415a');
    R(4, 6, 6, 4, '#e0b23c');
  },
  generator: (R) => {
    R(0, 4, 32, 18, '#4b5d3a');
    R(0, 4, 32, 1, '#62784c');
    R(0, 21, 32, 3, '#2a3320');
    for (let x = 3; x < 14; x += 3) R(x, 8, 1, 10, '#36452a');
    R(17, 7, 12, 10, '#2a3320');
    disc(R, 23, 12, 3, '#d9cfb8');
    R(23, 10, 1, 3, '#c94a4a');
    R(4, 0, 4, 5, '#555555');
    R(3, 0, 6, 1, '#777777');
  },
  workbench: (R) => {
    R(0, 4, 32, 5, '#9a6a40');
    R(0, 4, 32, 1, '#b8834f');
    R(0, 9, 32, 2, '#5a3724');
    R(1, 11, 3, 7, '#432819');
    R(28, 11, 3, 7, '#432819');
    R(2, 15, 28, 1, '#432819');
    R(22, 0, 7, 5, '#5d6470');
    R(24, 0, 3, 2, '#2b2f37');
    R(5, 2, 9, 2, '#c0c4cb');
    R(5, 1, 2, 4, '#c94a4a');
  },
  stove: (R) => {
    R(0, 2, 16, 20, '#d8d2c4');
    R(0, 2, 16, 1, '#f1ece2');
    R(0, 0, 16, 4, '#2b2f37');
    disc(R, 4, 2, 1, '#555555');
    disc(R, 11, 2, 1, '#555555');
    R(2, 8, 12, 10, '#1e1e24');
    R(3, 9, 10, 2, '#3a3a44');
    R(2, 6, 12, 1, '#9a948a');
  },
  fridge: (R) => {
    R(0, 0, 16, 30, '#a8c8c2');
    R(0, 0, 16, 1, '#c8e2dc');
    R(1, 11, 14, 1, '#7a9a94');
    R(12, 4, 2, 5, '#e9e3d6');
    R(12, 14, 2, 8, '#e9e3d6');
    R(3, 3, 4, 4, '#f7931a');
    R(4, 4, 2, 2, '#fff1c9');
    R(0, 28, 16, 2, '#5a6f6b');
  },
  counter: (R) => {
    R(0, 4, 16, 16, '#6b4430');
    R(0, 2, 16, 3, '#dcd5c6');
    R(2, 7, 12, 11, '#5a3724');
    R(7, 11, 2, 1, '#c9a45a');
    R(3, 2, 10, 2, '#8a9aa8');
    R(7, 0, 2, 2, '#c0c4cb');
  },
  cookiejar: (R) => {
    R(1, 2, 6, 8, '#cfe6ef');
    R(2, 0, 4, 2, '#c94a4a');
    R(2, 5, 2, 2, '#8f5d3e');
    R(4, 7, 2, 2, '#8f5d3e');
  },
  cabinet: (R) => {
    R(0, 0, 16, 26, '#555b66');
    R(0, 0, 16, 1, '#737a86');
    for (let i = 0; i < 3; i++) {
      R(1, 2 + i * 8, 14, 7, '#666d79');
      R(6, 4 + i * 8, 4, 1, '#c0c4cb');
      R(5, 6 + i * 8, 6, 1, '#d8cfa8');
    }
  },
  lamp: (R) => {
    R(0, 0, 10, 6, '#e0b23c');
    R(1, 0, 8, 1, '#ffd978');
    R(4, 6, 2, 18, '#2b2233');
    R(1, 24, 8, 2, '#2b2233');
  },
  console: (R) => {
    R(0, 10, 36, 14, '#2a2f38');
    R(0, 10, 36, 1, '#3c4350');
    R(2, 0, 32, 12, '#121418');
    R(3, 1, 30, 10, '#1b1406');
    for (let i = 0; i < 24; i++) R(4 + (i % 8) * 4, 2 + ((i / 8) | 0) * 3, 3, 2, '#5a3a12');
    for (let x = 4; x < 32; x += 3) R(x, 15, 2, 2, '#4a5059');
    R(30, 19, 3, 2, '#f7931a');
  },
  coins: (R) => {
    for (const [x, y] of [[0, 4], [4, 2], [8, 4], [5, 5], [11, 3], [2, 1]]) {
      R(x, y, 5, 3, '#e0b23c');
      R(x + 1, y, 3, 1, '#ffe08a');
      R(x, y + 2, 5, 1, '#a8811f');
    }
  },
  gold: (R) => {
    for (const [x, y] of [[0, 5], [6, 5], [12, 5], [3, 1], [9, 1]]) {
      R(x, y, 6, 4, '#e0b23c');
      R(x, y, 6, 1, '#ffe08a');
      R(x, y + 3, 6, 1, '#a8811f');
    }
  },
  atril: (R) => {
    R(7, 9, 2, 11, '#432819');
    R(3, 20, 10, 2, '#432819');
    R(0, 4, 16, 6, '#5a3724');
    R(1, 2, 7, 6, '#f1e7d5');
    R(8, 2, 7, 6, '#e6dac3');
    R(8, 2, 1, 6, '#b39c74');
    for (let y = 3; y < 7; y++) {
      R(2, y, 5, 1, y % 2 ? '#9d93a9' : '#f1e7d5');
      R(9, y, 5, 1, y % 2 ? '#9d93a9' : '#e6dac3');
    }
  },
  whitepaper: (R) => {
    R(7, 9, 2, 11, '#432819');
    R(3, 20, 10, 2, '#432819');
    R(0, 4, 16, 6, '#5a3724');
    R(1, 2, 14, 6, '#f4f0e6');
    R(7, 2, 1, 6, '#c9c0ad');
    R(3, 3, 3, 3, '#f7931a');
    R(4, 4, 1, 1, '#fff1c9');
    for (let y = 3; y < 7; y++) R(9, y, 5, 1, y % 2 ? '#9d93a9' : '#f4f0e6');
    R(0, 8, 2, 4, '#8d95a1');
    R(14, 8, 2, 4, '#8d95a1');
  },
  terminal: (R) => {
    R(0, 0, 16, 11, '#2b2f37');
    R(1, 1, 14, 9, '#0d1a12');
    R(2, 3, 8, 1, '#4cc47a');
    R(2, 5, 11, 1, '#2f8a4c');
    R(2, 7, 6, 1, '#4cc47a');
    R(6, 11, 4, 3, '#2b2f37');
    R(1, 14, 14, 8, '#3c4350');
    R(1, 14, 14, 1, '#555d6b');
    R(3, 17, 10, 2, '#2b2f37');
  },
  rug: (R) => {
    R(0, 0, 48, 32, '#6e2424');
    R(2, 2, 44, 28, '#8e2f2f');
    R(4, 4, 40, 24, '#6e2424');
    R(6, 6, 36, 20, '#a43b3b');
    for (let x = 8; x < 40; x += 6) R(x, 15, 3, 2, '#e0b23c');
    for (let x = 0; x < 48; x += 3) {
      R(x, 0, 1, 1, '#e0b23c');
      R(x, 31, 1, 1, '#e0b23c');
    }
  },
  hazard: (R) => {
    R(0, 0, 64, 12, '#e0b23c');
    for (let x = -12; x < 64; x += 8) for (let y = 0; y < 12; y++) R(x + y, y, 4, 1, '#1b1622');
  },
  photo: (R) => {
    R(0, 0, 12, 10, '#c9a45a');
    R(1, 1, 10, 8, '#3e6f80');
    R(2, 5, 8, 4, '#2f5a3e');
    R(4, 2, 2, 3, '#f2c9a0');
    R(7, 3, 2, 2, '#f2c9a0');
  },
  clock: (R) => {
    R(0, 0, 10, 14, '#5a3724');
    disc(R, 5, 4, 3, '#f1e7d5');
    R(5, 2, 1, 3, '#1b1622');
    R(5, 4, 2, 1, '#1b1622');
    R(4, 9, 2, 4, '#c9a45a');
  },
  graffiti: (R) => {
    const c = '#a85d1c';
    R(4, 1, 2, 10, c);
    R(4, 1, 6, 2, c);
    R(4, 5, 6, 2, c);
    R(4, 9, 7, 2, c);
    R(9, 2, 2, 3, c);
    R(10, 6, 2, 3, c);
    R(6, 0, 1, 12, c);
    R(8, 0, 1, 12, c);
  },
  pipes: (R) => {
    R(0, 1, 48, 3, '#5d6470');
    R(0, 1, 48, 1, '#7d8591');
    R(0, 6, 48, 3, '#4a6d91');
    R(0, 6, 48, 1, '#6d93b8');
    R(10, 0, 3, 10, '#3a4048');
    R(36, 0, 3, 10, '#3a4048');
  },
  toolwall: (R) => {
    R(0, 0, 32, 12, '#8f6a3e');
    for (let x = 2; x < 32; x += 3) for (let y = 2; y < 12; y += 3) R(x, y, 1, 1, '#5a3f22');
    R(3, 2, 2, 8, '#c0c4cb');
    R(2, 2, 4, 2, '#c0c4cb');
    R(10, 3, 6, 2, '#5d6470');
    R(12, 3, 2, 7, '#8f5d3e');
    R(20, 2, 2, 8, '#c94a4a');
    R(25, 2, 4, 3, '#e0b23c');
    R(26, 5, 2, 5, '#c0c4cb');
  },
  dial: (R) => {
    disc(R, 13, 13, 12, '#3a4048');
    disc(R, 13, 13, 11, '#c9a45a');
    disc(R, 13, 13, 9, '#5a3724');
    ring(R, 13, 13, 7, '#f1e7d5');
    disc(R, 13, 13, 2, '#e0b23c');
    R(13, 3, 1, 9, '#f1e7d5');
    for (const [x, y] of [[13, 2], [21, 5], [24, 13], [21, 21], [13, 24], [5, 21], [2, 13], [5, 5]]) R(x, y, 1, 1, '#1b1622');
  },
  fusebox: (R) => {
    R(0, 0, 16, 14, '#3a4048');
    R(1, 1, 14, 12, '#5d6470');
    for (let i = 0; i < 4; i++) {
      R(2 + i * 3, 3, 2, 4, '#1b1622');
      R(2 + i * 3, i % 2 ? 3 : 5, 2, 2, '#e05252');
    }
    R(2, 9, 12, 2, '#e0b23c');
  },
  alarm: (R) => {
    R(1, 3, 6, 5, '#2b2f37');
    R(2, 1, 4, 3, '#5a1c1c');
  },
  deposit: (R) => {
    R(0, 0, 40, 14, '#3a4048');
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 2; y++) {
        R(1 + x * 8, 1 + y * 7, 7, 6, '#7d8591');
        R(1 + x * 8, 1 + y * 7, 7, 1, '#a2aab5');
        R(6 + x * 8, 3 + y * 7, 1, 2, '#e0b23c');
      }
    }
  },
  vault: (R) => {
    R(0, 0, 36, 34, '#2e333a');
    disc(R, 18, 17, 16, '#4a515c');
    disc(R, 18, 17, 14, '#7d8591');
    disc(R, 18, 17, 12, '#5d6570');
    ring(R, 18, 17, 9, '#a2aab5');
    disc(R, 18, 17, 3, '#e0b23c');
    R(17, 5, 2, 25, '#a2aab5');
    R(6, 16, 25, 2, '#a2aab5');
    for (let a = 0; a < 12; a++) {
      R(18 + Math.round(Math.cos((a / 12) * 6.283) * 15), 17 + Math.round(Math.sin((a / 12) * 6.283) * 15), 1, 1, '#c0c4cb');
    }
  },
  // --- la única PC que funciona ---
  pc: (R) => {
    R(2, 12, 20, 12, '#3a3442');
    R(2, 12, 20, 1, '#55505e');
    R(3, 0, 18, 13, '#16181d');
    R(4, 1, 16, 10, '#06140b');
    R(9, 13, 6, 2, '#16181d');
    R(4, 17, 16, 4, '#24222b');
    for (let x = 5; x < 19; x += 2) R(x, 18, 1, 1, '#4a4652');
    R(20, 14, 1, 1, '#4cc47a');
  },
  // --- pistas y retos ---
  bust: (R) => {
    R(1, 14, 10, 8, '#6e685f');
    R(1, 14, 10, 1, '#857e74');
    R(2, 9, 8, 5, '#c9c0ad');
    R(3, 1, 6, 8, '#d8cfbd');
    R(3, 1, 6, 1, '#ece4d4');
    R(2, 2, 2, 3, '#8a9a5a');
    R(8, 2, 2, 3, '#8a9a5a');
    R(4, 4, 1, 1, '#6e685f');
    R(7, 4, 1, 1, '#6e685f');
  },
  poster: (R) => {
    R(0, 0, 16, 14, '#e9e3d6');
    R(1, 1, 14, 3, '#f7931a');
    R(3, 6, 10, 2, '#1b1622');
    R(3, 9, 7, 1, '#9d93a9');
    R(3, 11, 9, 1, '#9d93a9');
  },
  levers: (R) => {
    R(0, 8, 32, 10, '#3a4048');
    R(0, 8, 32, 1, '#5d6470');
    for (let i = 0; i < 4; i++) {
      R(3 + i * 7, 10, 4, 6, '#1b1622');
      R(4 + i * 7, 2, 2, 10, '#a2aab5');
      R(3 + i * 7, 0, 4, 3, '#c94a4a');
    }
  },
  cooler: (R) => {
    R(0, 0, 24, 28, '#8d95a1');
    R(0, 0, 24, 1, '#a2aab5');
    R(2, 2, 20, 18, '#b8c8d0');
    R(3, 3, 18, 16, '#d8e4ea');
    R(5, 8, 12, 2, '#9fb2bc');
    R(2, 22, 20, 4, '#5d6470');
  },
  bone: (R) => {
    R(2, 2, 8, 2, '#e9e3d6');
    R(0, 0, 3, 3, '#e9e3d6');
    R(0, 3, 3, 3, '#d8cfbd');
    R(9, 0, 3, 3, '#e9e3d6');
    R(9, 3, 3, 3, '#d8cfbd');
  },
  padlock: (R) => {
    R(2, 0, 6, 2, '#8d95a1');
    R(2, 0, 1, 5, '#8d95a1');
    R(0, 4, 10, 6, '#c9a45a');
    R(0, 4, 10, 1, '#e0c27a');
    R(4, 6, 2, 2, '#3a2a18');
  },
  simon: (R) => {
    R(0, 0, 20, 20, '#2b2f37');
    R(2, 2, 7, 7, '#8e2a2a');
    R(11, 2, 7, 7, '#2c4a8a');
    R(2, 11, 7, 7, '#a8811f');
    R(11, 11, 7, 7, '#1f6a39');
  },
  led: (R) => {
    R(0, 0, 6, 6, '#2b2f37');
    R(1, 1, 4, 4, '#3a1414');
  },
  alphabet: (R) => {
    // Pared pintada: tres filas de letras con un cable y un foco apagado sobre cada una.
    R(0, 0, 72, 16, '#3b2f2a');
    R(0, 0, 72, 1, '#4d3e36');
    for (let row = 0; row < 3; row++) {
      R(1, 1 + row * 5, 70, 1, '#1d1714');
      for (let i = 0; i < 9; i++) {
        if (row === 2 && i === 8) continue;
        R(3 + i * 8, 2 + row * 5, 2, 1, '#55483f');
        R(2 + i * 8, 4 + row * 5, 4, 1, '#d8cbb4');
      }
    }
  },
  relic: (R) => {
    // Cajita de exhibición con un ₿ naranja: cada coleccionable usa la misma.
    R(0, 2, 10, 8, '#6b4a2b');
    R(0, 2, 10, 1, '#8a6a40');
    R(1, 3, 8, 6, '#2a1d14');
    R(3, 4, 4, 4, '#f7931a');
    R(4, 5, 2, 2, '#fff1c9');
    R(2, 0, 6, 2, '#9fd8ff');
  },
  binary: (R) => {
    // Panel de pared: marco metálico, cuatro filas de cinco focos apagados y una etiqueta abajo.
    R(0, 0, 32, 22, '#2a2e36');
    R(0, 0, 32, 1, '#4a515c');
    R(1, 1, 30, 20, '#15181d');
    for (let row = 0; row < 4; row++) for (let i = 0; i < 5; i++) R(4 + i * 5, 3 + row * 4, 3, 2, '#2c3a30');
    R(10, 19, 12, 2, '#d8cbb4');
  },
  note: (R) => {
    R(0, 0, 10, 8, '#f1e7d5');
    R(1, 2, 7, 1, '#9d93a9');
    R(1, 4, 6, 1, '#9d93a9');
    R(1, 6, 5, 1, '#9d93a9');
  },
  // --- daños ---
  shelfFallen: (R) => {
    R(0, 2, 30, 12, '#3a2418');
    R(1, 3, 28, 10, '#1d120c');
    R(0, 2, 30, 1, '#6b4430');
    for (let x = 2; x < 28; x += 3) R(x, 5 + ri(5), 2, 2, pick(BOOKS));
    R(3, 12, 4, 2, pick(BOOKS));
    R(14, 0, 3, 2, pick(BOOKS));
    R(24, 12, 5, 2, pick(BOOKS));
  },
  rackFallen: (R) => {
    R(0, 3, 30, 11, '#121418');
    R(1, 4, 28, 9, '#2a2f38');
    for (let i = 0; i < 6; i++) R(2 + i * 4, 5, 3, 7, '#191d24');
    R(4, 1, 2, 2, '#3a414d');
    R(18, 0, 3, 3, '#3a414d');
    R(26, 13, 4, 1, '#0c0d10');
  },
  rubble: (R) => {
    const bits = [[2, 6, 6, 5], [7, 3, 6, 7], [12, 5, 6, 6], [0, 9, 20, 3], [9, 1, 3, 3], [15, 8, 4, 3]];
    bits.forEach(([x, y, w, h], i) => {
      R(x, y, w, h, i % 2 ? '#5b5650' : '#6e685f');
      R(x, y, w, 1, '#857e74');
    });
    R(5, 4, 1, 3, '#7a4f33');
    R(14, 2, 1, 4, '#5d6470');
  },
  emlight: (R) => {
    R(0, 0, 10, 6, '#2b2f37');
    R(1, 1, 8, 4, '#4a2020');
  },
  cable: (R) => {
    R(5, 0, 2, 4, '#1b1622');
    R(6, 4, 1, 4, '#1b1622');
    R(5, 8, 1, 3, '#1b1622');
    R(6, 11, 1, 3, '#1b1622');
    R(5, 14, 3, 2, '#c46a0c');
  },
  crack: (R) => {
    const c = 'rgba(8,5,12,.55)';
    R(0, 4, 4, 1, c);
    R(4, 5, 3, 1, c);
    R(7, 4, 3, 1, c);
    R(10, 5, 1, 1, c);
    R(11, 6, 3, 1, c);
    R(6, 6, 1, 3, c);
    R(5, 9, 1, 1, c);
    R(9, 2, 1, 2, c);
    R(14, 7, 2, 1, c);
  },
  debris: (R) => {
    R(1, 4, 3, 2, '#6e685f');
    R(5, 2, 2, 2, '#857e74');
    R(8, 5, 3, 2, '#5b5650');
    R(3, 6, 1, 1, '#857e74');
    R(10, 1, 1, 1, '#6e685f');
  },
  glass: (R) => {
    for (const [x, y] of [[0, 3], [3, 1], [5, 4], [8, 2], [2, 5], [7, 0]]) R(x, y, 2, 1, 'rgba(190,230,240,.7)');
  },
  papers: (R) => {
    R(0, 2, 6, 4, '#d9cfb8');
    R(5, 0, 6, 5, '#e9e3d6');
    R(6, 1, 4, 1, '#9d93a9');
    R(6, 3, 3, 1, '#9d93a9');
    R(3, 5, 6, 3, '#cfc5ae');
  },
  puddle: (R) => {
    R(3, 1, 13, 6, 'rgba(40,60,90,.55)');
    R(1, 3, 18, 3, 'rgba(40,60,90,.55)');
    R(6, 2, 4, 1, 'rgba(160,190,230,.35)');
  },
};


export const SPRITES: Record<string, HTMLCanvasElement> = {};
Object.keys(SPRITE_SIZE).forEach((name, i) => {
  const [w, h] = SPRITE_SIZE[name];
  srand(i * 131 + 7);
  SPRITES[name] = make(w, h, DRAW[name] ?? (() => undefined));
});
