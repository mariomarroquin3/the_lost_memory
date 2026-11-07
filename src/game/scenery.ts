// Escenografía propia de El Rescate del Contexto: props dibujados por código con la técnica de Proyecto 21
// (rectángulos de 1 px en lienzos pequeños). Cada sala tiene su material; el Mundo Invertido no es un espejo.
// Al importarse, registra sus sprites en SPRITE_SIZE y SPRITES.
import { SPRITE_SIZE, type Thing } from '../p21/tilemap';
import { SPRITES } from '../p21/tiles';

type Rect = (x: number, y: number, w: number, h: number, color: string) => void;

let seed = 11;
const rnd = (): number => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};
const ri = (n: number): number => (rnd() * n) | 0;
const pick = <V>(list: V[]): V => list[ri(list.length)];

function disc(R: Rect, cx: number, cy: number, r: number, color: string): void {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) R(cx + x, cy + y, 1, 1, color);
}

const CYAN = '#00e5ff';
const VIOLET = '#a46cff';
const RED = '#ff1744';
const ORANGE = '#f7931a';

const PROPS: Record<string, [number, number, (R: Rect) => void]> = {
  // ---------------- Mobiliario propio de Genesis (sustituye al de Proyecto 21) ----------------
  term: [20, 24, (R) => {
    R(2, 14, 16, 10, '#2a2836');
    R(2, 14, 16, 1, '#4e4968');
    R(0, 0, 20, 14, '#3a3650');
    R(1, 1, 18, 11, '#06121a');
    R(0, 12, 20, 2, '#4e4968');
    R(5, 18, 10, 2, '#1b1824');
  }],
  aiconsole: [36, 22, (R) => {
    R(0, 8, 36, 14, '#2a2836');
    R(0, 8, 36, 2, '#4e4968');
    R(4, 0, 28, 9, '#3a3650');
    R(5, 1, 26, 7, '#06121a');
    for (let x = 4; x < 32; x += 4) R(x, 13, 2, 2, '#1b1824');
  }],
  rewardlevers: [36, 20, (R) => {
    R(0, 10, 36, 10, '#2a2836');
    R(0, 10, 36, 2, '#4e4968');
    for (const [x, c] of [[5, '#f7931a'], [16, '#e0b23c'], [27, '#00e5ff']] as Array<[number, string]>) {
      R(x + 1, 2, 2, 10, '#8d95a1');
      R(x, 0, 4, 3, c);
      R(x - 1, 14, 6, 3, '#1b1824');
      R(x + 1, 15, 2, 1, c);
    }
  }],
  assembly: [36, 20, (R) => {
    R(0, 8, 36, 12, '#2a2836');
    R(0, 8, 36, 2, '#4e4968');
    for (let x = 3; x < 33; x += 8) { R(x, 2, 6, 6, '#1b1824'); R(x + 1, 3, 4, 4, '#163a44'); }
    R(0, 14, 36, 2, '#14121c');
  }],
  queryterm: [26, 18, (R) => {
    R(0, 8, 26, 10, '#3a2f26');
    R(0, 8, 26, 2, '#5a4a3a');
    R(4, 0, 18, 9, '#2a2836');
    R(5, 1, 16, 6, '#06121a');
    R(2, 12, 10, 4, '#e9e3d6');
    R(3, 13, 6, 1, '#7a6b5a');
  }],
  datachip: [10, 10, (R) => {
    R(1, 1, 8, 8, '#1b1824');
    R(2, 2, 6, 6, '#3a3650');
    R(3, 3, 4, 4, '#00e5ff');
    for (const k of [2, 5]) { R(0, k + 1, 1, 1, '#8d95a1'); R(9, k + 1, 1, 1, '#8d95a1'); R(k + 1, 0, 1, 1, '#8d95a1'); R(k + 1, 9, 1, 1, '#8d95a1'); }
  }],
  // Pared de luces del otro lado: pared morada cubierta de raíces, letras pintadas en cian.
  alphabetInv: [72, 16, (R) => {
    R(0, 0, 72, 16, '#1c1530');
    R(0, 0, 72, 1, '#2c2248');
    for (let row = 0; row < 3; row++) {
      R(1, 1 + row * 5, 70, 1, '#3a1f4a');
      for (let i = 0; i < 9; i++) {
        if (row === 2 && i === 8) continue;
        R(3 + i * 8, 2 + row * 5, 2, 1, '#2a2240');
        R(2 + i * 8, 4 + row * 5, 4, 1, '#7fe9ff');
      }
    }
    for (const x of [0, 17, 40, 63]) { R(x, 0, 1, 16, '#5b2a4a'); R(x + 1, 6, 1, 5, '#5b2a4a'); }
  }],
  // Muro falso: panel de servicio distinto a la pared, con juntas que dejan pasar luz y una rejilla.
  falsewall: [16, 32, (R) => {
    R(0, 0, 16, 32, '#3b3a4c');
    R(1, 1, 14, 30, '#2b2a38');
    R(0, 0, 16, 1, '#00e5ff');
    R(0, 31, 16, 1, '#00e5ff');
    R(0, 0, 1, 32, '#00e5ff');
    R(15, 0, 1, 32, '#00e5ff');
    for (const [x, y] of [[2, 2], [13, 2], [2, 29], [13, 29]]) R(x, y, 1, 1, '#8a86a8');
    R(3, 6, 10, 8, '#0c0a12');
    for (let y = 7; y < 14; y += 2) R(4, y, 8, 1, '#4e4968');
    for (let y = 18; y < 27; y += 3) { R(3, y, 4, 2, '#f7931a'); R(9, y, 4, 2, '#f7931a'); R(7, y, 2, 2, '#14121a'); }
  }],
  vent: [16, 10, (R) => {
    R(0, 0, 16, 10, '#2a2836');
    R(1, 1, 14, 8, '#0c0a12');
    for (let y = 2; y < 9; y += 2) R(2, y, 12, 1, '#4e4968');
  }],
  portal: [36, 34, (R) => {
    R(0, 0, 36, 34, '#2a2836');
    R(2, 2, 32, 30, '#0c0a12');
    R(2, 2, 32, 2, '#4e4968');
    R(6, 6, 24, 24, '#120f22');
  }],
  genesisdesk: [56, 22, (R) => {
    R(0, 6, 56, 16, '#d9dde2');
    R(0, 6, 56, 2, '#ffffff');
    R(0, 18, 56, 4, '#8d95a1');
    R(0, 12, 56, 1, '#00e5ff');
    R(6, 0, 14, 7, '#2a2836');
    R(7, 1, 12, 5, '#06121a');
    R(38, 2, 8, 5, '#3a3650');
  }],
  logo: [48, 32, (R) => {
    for (let a = 0; a < 64; a++) {
      const t = (a / 64) * Math.PI * 2;
      R(24 + Math.round(Math.cos(t) * 20), 16 + Math.round(Math.sin(t) * 13), 1, 1, '#1f3a44');
      R(24 + Math.round(Math.cos(t) * 12), 16 + Math.round(Math.sin(t) * 8), 1, 1, '#1f3a44');
    }
    R(22, 8, 4, 16, '#163040');
    R(16, 14, 16, 4, '#163040');
  }],
  bench: [32, 12, (R) => {
    R(0, 2, 32, 5, '#3a3650');
    R(0, 2, 32, 1, '#4e4968');
    R(2, 7, 2, 5, '#1b1824');
    R(28, 7, 2, 5, '#1b1824');
  }],
  turnstile: [12, 18, (R) => {
    R(0, 4, 12, 14, '#8d95a1');
    R(0, 4, 12, 2, '#d9dde2');
    R(2, 8, 8, 2, '#3a3650');
    R(4, 0, 4, 4, '#2a2836');
    R(5, 1, 2, 2, '#ff1744');
  }],
  cablefloor: [24, 8, (R) => {
    let y = 4;
    for (let x = 0; x < 24; x++) { R(x, y, 1, 2, '#14121c'); if (x % 5 === 2) y += y > 3 ? -1 : 1; }
    R(10, 2, 3, 3, '#2a2836');
  }],
  emstrip: [12, 4, (R) => {
    R(0, 0, 12, 4, '#2a2836');
    R(1, 1, 10, 2, '#5a1c1c');
  }],
  // ---------------- Sala 1 · Estación de seguridad ----------------
  conveyor: [64, 18, (R) => {
    R(0, 6, 64, 8, '#2e333a');
    R(0, 6, 64, 1, '#68707c');
    R(0, 13, 64, 1, '#1b1e23');
    for (let x = 2; x < 64; x += 8) R(x, 14, 4, 4, '#3a4048');
    R(0, 14, 2, 4, '#4a515c');
    R(62, 14, 2, 4, '#4a515c');
  }],
  archway: [28, 32, (R) => {
    R(0, 4, 5, 28, '#4a515c');
    R(23, 4, 5, 28, '#4a515c');
    R(0, 0, 28, 6, '#5d6571');
    R(0, 0, 28, 1, '#8d95a1');
    R(1, 4, 1, 28, '#68707c');
    R(24, 4, 1, 28, '#68707c');
    R(11, 1, 6, 3, '#1b1e23');
    R(13, 2, 2, 1, '#ff4d4d');
    R(2, 10, 1, 6, '#c46a0c');
    R(25, 10, 1, 6, '#c46a0c');
  }],
  monitorwall: [48, 16, (R) => {
    R(0, 0, 48, 16, '#16141b');
    for (let i = 0; i < 6; i++) {
      const x = 1 + (i % 3) * 16;
      const y = 1 + Math.floor(i / 3) * 8;
      R(x, y, 14, 6, '#0d1a14');
      if (i === 4) { R(x + 3, y + 1, 1, 5, '#2a2230'); R(x + 4, y + 2, 2, 1, '#2a2230'); }
    }
  }],
  seccam: [10, 8, (R) => {
    R(1, 0, 2, 3, '#3a4048');
    R(1, 2, 8, 4, '#8d95a1');
    R(1, 2, 8, 1, '#b5bcc6');
    R(7, 3, 2, 2, '#1b1e23');
  }],
  counterFallen: [32, 16, (R) => {
    R(0, 4, 32, 9, '#5a3724');
    R(0, 4, 32, 2, '#7a4f33');
    R(2, 13, 4, 3, '#3a2316');
    R(26, 13, 4, 3, '#3a2316');
    R(6, 7, 20, 1, '#3a2316');
    R(30, 0, 2, 5, '#4a515c');
  }],
  sign: [16, 12, (R) => {
    R(0, 0, 16, 12, '#e0b23c');
    R(1, 1, 14, 10, '#1b1622');
    R(2, 2, 12, 8, '#e0b23c');
    R(7, 3, 2, 4, '#1b1622');
    R(7, 8, 2, 1, '#1b1622');
  }],
  railcam: [10, 8, (R) => {
    R(0, 0, 10, 1, '#4e4680');
    R(1, 2, 8, 4, '#6a63a8');
    R(1, 2, 8, 1, '#8a83c8');
    R(7, 3, 2, 2, '#15112a');
  }],
  morselamp: [10, 6, (R) => {
    R(0, 0, 10, 2, '#3a4048');
    R(1, 2, 8, 4, '#5a2a1c');
  }],
  swivel: [12, 12, (R) => {
    R(2, 2, 8, 5, '#2e333a');
    R(2, 2, 8, 1, '#4a515c');
    R(5, 7, 2, 3, '#1b1e23');
    R(1, 10, 10, 2, '#1b1e23');
    R(9, 0, 3, 4, '#2e333a');
  }],
  // ---------------- Sala 2 · Laboratorio congelado ----------------
  frozenpipe: [48, 12, (R) => {
    R(0, 2, 48, 3, '#5d6571');
    R(0, 7, 48, 3, '#5d6571');
    R(0, 2, 48, 1, '#8d95a1');
    for (const x of [6, 22, 37]) { R(x, 1, 7, 10, '#9fd3f0'); R(x, 1, 7, 1, '#e8f6ff'); R(x + 2, 4, 2, 4, '#c8e8fa'); }
  }],
  icicles: [16, 8, (R) => {
    R(0, 0, 16, 2, '#cfe3f0');
    for (const [x, h] of [[1, 5], [4, 3], [7, 7], [10, 4], [13, 6]]) R(x, 2, 2, h, '#b9d8ec');
  }],
  frostwin: [24, 12, (R) => {
    R(0, 0, 24, 12, '#3d566b');
    R(1, 1, 22, 10, '#8a96a3');
    R(11, 1, 2, 10, '#3d566b');
    R(1, 1, 22, 2, '#e8f4fb');
    R(1, 8, 4, 3, '#e8f4fb');
    R(18, 7, 5, 4, '#e8f4fb');
  }],
  iceblock: [16, 16, (R) => {
    R(0, 2, 16, 14, '#7fb3d6');
    R(0, 2, 16, 2, '#d6ecfa');
    R(2, 5, 2, 7, '#bfe0f5');
    R(9, 7, 4, 2, '#5d93b8');
    R(5, 9, 1, 1, '#e05252');
  }],
  trainer: [32, 22, (R) => {
    R(0, 4, 32, 18, '#3a4552');
    R(0, 4, 32, 2, '#5d6b7a');
    R(3, 7, 26, 9, '#05070a');
    let y = 8;
    for (let x = 4; x < 28; x++) { R(x, y, 1, 1, '#2f5a6a'); if (x % 3 === 0 && y < 14) y++; }
    R(0, 0, 32, 4, '#cfe3f0');
    R(4, 18, 6, 2, '#2e333a');
    R(22, 18, 6, 2, '#2e333a');
  }],
  whiteboard: [32, 16, (R) => {
    R(0, 0, 32, 16, '#8d95a1');
    R(1, 1, 30, 13, '#d9dde2');
    for (const [x, y] of [[4, 11], [7, 10], [9, 9], [12, 9], [15, 7], [18, 7], [21, 5], [24, 5], [27, 3], [16, 3]]) R(x, y, 1, 1, '#2c4a8a');
    for (let i = 0; i < 25; i++) R(3 + i, 12 - Math.floor(i / 2.7), 1, 1, '#e05252');
    R(10, 2, 1, 6, '#5a5066');
    R(0, 14, 32, 2, '#5d6571');
  }],
  guardian: [16, 28, (R) => {
    R(4, 0, 8, 7, '#7a838f');
    R(4, 0, 8, 1, '#cfe3f0');
    R(5, 3, 2, 1, '#2a3038');
    R(9, 3, 2, 1, '#2a3038');
    R(2, 7, 12, 11, '#5d6571');
    R(1, 7, 4, 2, '#e8f4fb');
    R(11, 7, 4, 2, '#e8f4fb');
    R(6, 10, 4, 4, '#1b1e23');
    R(7, 11, 2, 2, '#2a3038');
    R(0, 9, 2, 8, '#4a515c');
    R(14, 9, 2, 8, '#4a515c');
    R(4, 18, 3, 8, '#4a515c');
    R(9, 18, 3, 8, '#4a515c');
    R(3, 26, 4, 2, '#2e333a');
    R(9, 26, 4, 2, '#2e333a');
  }],
  warmpatch: [16, 12, (R) => {
    R(0, 0, 16, 12, '#3d566b');
    R(1, 1, 14, 10, '#4a5a66');
    R(1, 10, 14, 1, '#6b5a44');
  }],
  // ---------------- Sala 3 · Laberinto de recuerdos ----------------
  filecab: [16, 26, (R) => {
    R(0, 0, 16, 26, '#3f444d');
    R(0, 0, 16, 1, '#737b88');
    for (let y = 2; y < 24; y += 6) { R(1, y, 14, 5, '#5d6470'); R(1, y, 14, 1, '#737b88'); R(6, y + 2, 4, 1, '#b5bcc6'); R(2, y + 1, 3, 2, pick(['#cfc5ae', '#e9e3d6'])); }
  }],
  filecabOpen: [16, 26, (R) => {
    R(0, 0, 16, 26, '#3f444d');
    R(0, 0, 16, 1, '#737b88');
    for (let y = 2; y < 24; y += 6) { R(1, y, 14, 5, '#5d6470'); R(6, y + 2, 4, 1, '#b5bcc6'); }
    R(0, 14, 16, 4, '#2a2e35');
    R(1, 12, 3, 4, '#cfc5ae');
    R(5, 11, 3, 5, '#e9e3d6');
    R(9, 12, 4, 4, '#c46a0c');
  }],
  corkboard: [32, 16, (R) => {
    R(0, 0, 32, 16, '#5a3a28');
    R(1, 1, 30, 14, '#a67c52');
    const cards: Array<[number, number]> = [[3, 2], [12, 4], [22, 2], [6, 10], [18, 10], [26, 9]];
    for (let i = 1; i < cards.length; i++) {
      const [ax, ay] = cards[i - 1];
      const [bx, by] = cards[i];
      for (let k = 0; k <= 10; k++) R(Math.round(ax + 2 + ((bx - ax) * k) / 10), Math.round(ay + 1 + ((by - ay) * k) / 10), 1, 1, '#c0262f');
    }
    for (const [x, y] of cards) { R(x, y, 5, 4, '#e9e3d6'); R(x + 1, y + 1, 3, 1, '#7a6b5a'); R(x + 2, y, 1, 1, '#e05252'); }
  }],
  memcore: [18, 28, (R) => {
    R(1, 22, 16, 6, '#2e333a');
    R(1, 22, 16, 1, '#5d6571');
    R(2, 0, 14, 4, '#2e333a');
    R(3, 4, 12, 18, '#123a48');
    R(3, 4, 1, 18, '#3d8fa8');
    R(14, 4, 1, 18, '#0b2630');
  }],
  typewriter: [14, 16, (R) => {
    R(3, 8, 8, 8, '#4a3a2a');
    R(3, 8, 8, 1, '#6b5640');
    R(0, 2, 14, 6, '#2c2a30');
    R(0, 2, 14, 1, '#4a4652');
    for (let x = 1; x < 13; x += 2) R(x, 4, 1, 1, '#cfc5ae');
    for (let x = 2; x < 12; x += 2) R(x, 6, 1, 1, '#cfc5ae');
    R(3, 0, 8, 2, '#e9e3d6');
  }],
  desklamp: [10, 12, (R) => {
    R(2, 10, 6, 2, '#2e333a');
    R(4, 4, 2, 6, '#4a515c');
    R(1, 0, 8, 4, '#3a4a3a');
    R(2, 3, 6, 1, '#ffd978');
  }],
  symbols: [36, 8, (R) => {
    R(0, 0, 36, 8, '#1b1622');
    for (const x of [2, 11, 20, 29]) R(x, 1, 6, 6, '#241c2c');
  }],
  // ---------------- Sala 4 · Túnel de energía ----------------
  lightpad: [16, 16, (R) => {
    R(1, 1, 14, 14, '#10232a');
    R(1, 1, 14, 1, '#0f5560');
    R(1, 14, 14, 1, '#0f5560');
  }],
  robotarm: [16, 24, (R) => {
    R(2, 20, 12, 4, '#2e333a');
    R(2, 20, 12, 1, '#5d6571');
    R(6, 10, 4, 10, '#c46a0c');
    R(6, 10, 1, 10, '#e0902a');
    R(5, 8, 6, 3, '#4a515c');
    R(7, 2, 3, 7, '#c46a0c');
    R(9, 0, 6, 3, '#4a515c');
    R(13, 3, 2, 2, '#4a515c');
  }],
  datacube: [8, 8, (R) => {
    R(0, 1, 8, 7, '#1f5a6a');
    R(0, 1, 8, 1, '#3d8fa8');
    R(3, 3, 2, 2, CYAN);
  }],
  stepcounter: [40, 12, (R) => {
    R(0, 0, 40, 12, '#1b1e23');
    R(1, 1, 38, 10, '#05070a');
  }],
  fibers: [48, 10, (R) => {
    R(0, 1, 48, 2, '#0f3a44');
    R(0, 4, 48, 2, '#14402a');
    R(0, 7, 48, 2, '#0f3a44');
  }],
  // ---------------- Sala 5 · Cámara de simulación ----------------
  bigscreen: [44, 18, (R) => {
    R(0, 0, 44, 18, '#2a2a32');
    R(2, 2, 40, 13, '#0b0e12');
    R(20, 15, 4, 3, '#2a2a32');
  }],
  citymodel: [48, 30, (R) => {
    R(0, 10, 48, 20, '#2e333a');
    R(0, 10, 48, 2, '#5d6571');
    R(2, 12, 44, 16, '#1d2a22');
    R(2, 19, 44, 3, '#3a3a40');
    for (let x = 4; x < 46; x += 6) R(x, 20, 3, 1, '#e0b23c');
    R(6, 2, 12, 15, '#d9dde2');
    R(10, 5, 4, 1, '#e05252');
    R(11, 4, 2, 3, '#e05252');
    R(6, 2, 12, 1, '#ffffff');
    R(30, 6, 12, 11, '#5d6571');
    R(33, 0, 3, 7, '#4a515c');
    R(38, 2, 3, 5, '#4a515c');
    R(32, 9, 8, 2, '#e0b23c');
    R(22, 22, 4, 4, '#8d95a1');
    R(23, 21, 2, 1, CYAN);
  }],
  projector: [10, 6, (R) => {
    R(3, 0, 4, 2, '#3a4048');
    R(0, 2, 10, 4, '#5d6571');
    R(7, 3, 2, 2, '#e8f4fb');
  }],
  tape: [64, 4, (R) => {
    for (let x = 0; x < 64; x += 4) { R(x, 1, 2, 2, '#e0b23c'); R(x + 2, 1, 2, 2, '#1b1622'); }
  }],
  authconsole: [24, 18, (R) => {
    R(0, 6, 24, 12, '#3a3a40');
    R(0, 6, 24, 2, '#5d6571');
    R(2, 0, 20, 7, '#1b1e23');
    R(3, 1, 18, 5, '#10202a');
    R(4, 2, 10, 1, '#8fb3cc');
    R(4, 4, 6, 1, '#e05252');
    R(15, 9, 5, 4, '#c0262f');
    R(3, 10, 8, 1, '#cfc5ae');
  }],
  // ---------------- Cuarto de comunicación real ----------------
  bulb: [6, 14, (R) => {
    R(2, 0, 2, 8, '#1b1622');
    R(1, 8, 4, 2, '#5d6571');
    R(1, 10, 4, 4, '#ffd978');
  }],
  thermos: [6, 10, (R) => {
    R(1, 0, 4, 2, '#2e333a');
    R(0, 2, 6, 8, '#2c6a4a');
    R(0, 2, 1, 8, '#4c9a6a');
    R(1, 5, 4, 1, '#cfc5ae');
  }],
  notebook: [12, 8, (R) => {
    R(0, 1, 12, 7, '#8e2a2a');
    R(1, 1, 10, 6, '#e9e3d6');
    R(2, 2, 6, 1, '#7a6b5a');
    R(2, 4, 7, 1, '#7a6b5a');
    R(6, 1, 1, 7, '#8e2a2a');
  }],
  scope: [16, 14, (R) => {
    R(0, 2, 16, 12, '#4a4652');
    R(0, 2, 16, 1, '#6e6a72');
    R(2, 4, 9, 7, '#06120a');
    R(12, 5, 2, 2, '#c46a0c');
    R(12, 9, 2, 2, '#8d95a1');
  }],
  protocol: [12, 14, (R) => {
    R(0, 0, 12, 14, '#e9e3d6');
    R(1, 1, 10, 2, '#1b1622');
    for (let y = 4; y < 13; y += 2) { R(1, y, 2, 1, '#1b1622'); R(4, y, 1, 1, '#1b1622'); R(6, y, 3 + (y % 3), 1, '#7a6b5a'); }
  }],
  // ---------------- La Grieta ----------------
  rift: [12, 16, (R) => {
    R(5, 0, 2, 16, '#e8f4fb');
    R(4, 3, 1, 5, '#c8b8ff');
    R(7, 9, 1, 5, '#c8b8ff');
    R(3, 0, 1, 2, '#6a63a8');
    R(8, 12, 1, 4, '#6a63a8');
  }],
  twinscreens: [36, 14, (R) => {
    R(0, 0, 17, 14, '#3a4048');
    R(19, 0, 17, 14, '#2a2648');
    R(1, 1, 15, 11, '#0b0e12');
    R(20, 1, 15, 11, '#0b0a1d');
    for (const [x, h] of [[3, 3], [6, 7], [9, 9], [12, 4]]) R(x, 12 - h, 2, h, ORANGE);
    for (const [x, h] of [[22, 8], [25, 2], [28, 5], [31, 9]]) R(x, 12 - h, 2, h, VIOLET);
  }],
  balance: [24, 22, (R) => {
    R(10, 4, 4, 16, '#5d6571');
    R(6, 19, 12, 3, '#2e333a');
    R(1, 5, 22, 2, '#8d95a1');
    R(0, 7, 1, 6, '#5d6571');
    R(23, 7, 1, 6, '#5d6571');
    R(0, 12, 7, 2, '#4a515c');
    R(17, 12, 7, 2, '#4a515c');
    R(2, 9, 3, 3, ORANGE);
    R(19, 9, 3, 3, VIOLET);
    R(11, 1, 2, 3, '#e8f4fb');
  }],
  mirrorBroken: [12, 16, (R) => {
    R(0, 0, 12, 16, '#4a3a2a');
    R(1, 1, 10, 14, '#4e5a6a');
    for (let i = 0; i < 8; i++) R(2 + i, 3 + i, 1, 1, '#1b1e23');
    R(6, 2, 1, 6, '#1b1e23');
    R(3, 9, 2, 3, '#a46cff');
  }],
  floatshard: [8, 8, (R) => {
    R(2, 0, 3, 3, '#5d6571');
    R(1, 3, 5, 3, '#4a515c');
    R(5, 4, 3, 4, '#3a2b7a');
    R(6, 5, 1, 1, VIOLET);
  }],
  // ---------------- Sala 6 · Archivo de datos ----------------
  servercol: [16, 32, (R) => {
    R(1, 0, 14, 32, '#15112a');
    R(1, 0, 14, 1, '#3d2e85');
    for (let y = 2; y < 30; y += 3) R(2, y, 12, 2, '#1d1838');
  }],
  floatcab: [14, 16, (R) => {
    R(0, 0, 14, 16, 'rgba(90,70,200,.35)');
    R(0, 0, 14, 1, 'rgba(180,160,255,.8)');
    R(0, 0, 1, 16, 'rgba(180,160,255,.5)');
    for (const y of [3, 9]) { R(2, y, 10, 4, 'rgba(60,40,140,.6)'); R(5, y + 2, 4, 1, 'rgba(200,190,255,.8)'); }
  }],
  holotable: [40, 22, (R) => {
    R(4, 14, 32, 8, '#1d1838');
    R(4, 14, 32, 1, '#3d2e85');
    R(0, 2, 40, 12, 'rgba(0,229,255,.12)');
    R(0, 2, 40, 1, 'rgba(0,229,255,.6)');
    for (let y = 4; y < 13; y += 2) R(2, y, 36, 1, 'rgba(120,200,255,.25)');
  }],
  shredder: [16, 18, (R) => {
    R(0, 4, 16, 14, '#241c2c');
    R(0, 4, 16, 1, '#4a3a5a');
    R(2, 6, 12, 3, '#05030a');
    R(3, 7, 10, 1, RED);
    for (let x = 2; x < 14; x += 2) R(x, 10, 1, 6, '#3a2e48');
    R(4, 0, 8, 4, '#e9e3d6');
  }],
  holodoc: [10, 12, (R) => {
    R(0, 0, 10, 12, 'rgba(180,160,255,.3)');
    R(0, 0, 10, 1, 'rgba(220,210,255,.8)');
    for (let y = 3; y < 11; y += 2) R(1, y, 3 + ri(6), 1, 'rgba(220,210,255,.6)');
    R(6, 3, 3, 1, 'rgba(255,23,68,.8)');
  }],
  equity: [20, 22, (R) => {
    R(9, 3, 2, 16, 'rgba(0,229,255,.6)');
    R(5, 19, 10, 3, '#1d1838');
    R(1, 4, 18, 1, 'rgba(0,229,255,.8)');
    R(0, 5, 1, 5, 'rgba(0,229,255,.5)');
    R(19, 5, 1, 5, 'rgba(0,229,255,.5)');
    R(0, 10, 6, 2, 'rgba(0,229,255,.5)');
    R(14, 8, 6, 2, 'rgba(0,229,255,.5)');
  }],
  citymap: [32, 14, (R) => {
    R(0, 0, 32, 14, '#15112a');
    R(1, 1, 30, 12, '#0b0a1d');
    R(2, 2, 9, 5, 'rgba(76,196,122,.6)');
    R(12, 2, 8, 9, 'rgba(255,23,68,.55)');
    R(21, 4, 9, 7, 'rgba(224,178,60,.55)');
    R(2, 8, 9, 4, 'rgba(76,196,122,.4)');
  }],
  // ---------------- Sala 7 · Galería de visión ----------------
  mirrorTall: [14, 18, (R) => {
    R(0, 0, 14, 18, '#4e4680');
    R(1, 1, 12, 16, '#221d45');
    R(2, 2, 1, 6, '#8a83c8');
  }],
  pixframe: [14, 12, (R) => {
    R(0, 0, 14, 12, '#c9a45a');
    R(1, 1, 12, 10, '#0b0a1d');
  }],
  glasspane: [16, 28, (R) => {
    R(0, 0, 16, 26, 'rgba(160,190,255,.12)');
    R(0, 0, 16, 1, 'rgba(200,220,255,.6)');
    R(0, 0, 1, 26, 'rgba(200,220,255,.35)');
    R(15, 0, 1, 26, 'rgba(200,220,255,.35)');
    for (let i = 0; i < 6; i++) R(4 + i, 14 - i * 2, 1, 2, 'rgba(230,240,255,.35)');
    R(0, 26, 16, 2, '#3d3866');
  }],
  stopsign: [12, 12, (R) => {
    R(3, 0, 6, 12, '#c0262f');
    R(0, 3, 12, 6, '#c0262f');
    R(1, 1, 10, 10, '#c0262f');
    R(2, 5, 8, 2, '#ece3d6');
  }],
  claim: [18, 12, (R) => {
    R(0, 0, 18, 12, '#2a2648');
    R(1, 1, 16, 10, '#0b0a1d');
    R(2, 2, 12, 1, '#c8b8ff');
    R(2, 4, 9, 1, '#c8b8ff');
    R(2, 8, 14, 2, '#3a1020');
    R(2, 8, 14, 2, '#ff1744');
  }],
  // ---------------- Sala 8 · Biblioteca en llamas ----------------
  tallshelf: [16, 30, (R) => {
    R(0, 0, 16, 30, '#2a1838');
    R(0, 0, 16, 1, '#5a3a7a');
    for (let y = 2; y < 28; y += 6) {
      R(1, y + 5, 14, 1, '#3a2a4a');
      for (let x = 1; x < 15; x += 2) { const h = 2 + ri(3); R(x, y + 5 - h, 1, h, pick(['#6b4c8f', '#3e6f80', VIOLET, '#2c4a8a', '#8e2a2a'])); }
    }
  }],
  fire: [12, 14, () => undefined],
  holobook: [12, 8, (R) => {
    R(0, 2, 5, 5, 'rgba(200,190,255,.55)');
    R(7, 2, 5, 5, 'rgba(200,190,255,.55)');
    R(5, 3, 2, 4, 'rgba(120,100,220,.7)');
    R(1, 3, 3, 1, 'rgba(0,229,255,.9)');
    R(8, 4, 3, 1, 'rgba(255,106,26,.9)');
  }],
  attention: [48, 12, (R) => {
    R(0, 0, 48, 12, '#140e22');
    for (let i = 0; i < 6; i++) R(2 + i * 8, 1, 6, 3, '#2a2048');
  }],
  wordblock: [24, 8, (R) => {
    for (const [x, c] of [[0, '#3e6f80'], [9, '#6b4c8f'], [17, '#8e2a2a']] as Array<[number, string]>) {
      R(x, 2, 7, 6, c);
      R(x, 2, 7, 1, '#e8e2ff');
      R(x + 1, 4, 4, 1, '#e8e2ff');
    }
  }],
  // ---------------- Sala 9 · Centro de conexiones MCP ----------------
  mcpconsole: [40, 26, (R) => {
    R(2, 12, 36, 14, '#1d1838');
    R(2, 12, 36, 2, '#3d2e85');
    R(6, 0, 28, 12, '#15112a');
    R(7, 1, 26, 10, '#0b0a1d');
    R(6, 16, 28, 6, 'rgba(0,229,255,.18)');
    for (let x = 8; x < 32; x += 3) R(x, 18, 2, 1, 'rgba(0,229,255,.6)');
  }],
  port: [10, 10, (R) => {
    disc(R, 5, 5, 4, '#2a2048');
    disc(R, 5, 5, 2, '#05030a');
  }],
  toolholo: [12, 12, () => undefined],
  micdoor: [16, 14, (R) => {
    R(0, 0, 16, 14, '#241c2c');
    R(5, 2, 6, 7, '#5d6571');
    for (let y = 3; y < 8; y += 2) R(6, y, 4, 1, '#2e333a');
    R(7, 9, 2, 3, '#4a515c');
    R(12, 9, 3, 4, '#c0262f');
    R(12, 7, 3, 2, '#8d95a1');
  }],
  jsonterm: [16, 22, (R) => {
    R(0, 10, 16, 12, '#1d1838');
    R(0, 10, 16, 1, '#3d2e85');
    R(1, 0, 14, 11, '#15112a');
    R(2, 1, 12, 9, '#05030a');
    R(3, 2, 2, 1, '#e0b23c');
    R(4, 4, 6, 1, CYAN);
    R(4, 6, 8, 1, '#c8b8ff');
    R(3, 8, 2, 1, '#e0b23c');
  }],
  // ---------------- Sala 10 · Núcleo de Genesis ----------------
  fragslot: [12, 8, (R) => {
    R(1, 1, 10, 6, '#0b0a1d');
    R(1, 1, 10, 1, '#123a48');
    R(1, 6, 10, 1, '#123a48');
    R(0, 2, 1, 4, '#123a48');
    R(11, 2, 1, 4, '#123a48');
  }],
  redcrack: [24, 10, () => undefined],
  infrascreen: [24, 14, (R) => {
    R(0, 0, 24, 14, '#15112a');
    R(1, 1, 22, 12, '#05030a');
    R(3, 3, 5, 5, '#e9e3d6');
    R(5, 4, 1, 3, '#e05252');
    R(4, 5, 3, 1, '#e05252');
    R(11, 3, 2, 8, '#e0b23c');
    R(15, 5, 2, 6, '#e0b23c');
    R(19, 7, 2, 4, '#e05252');
  }],
  pedestal: [12, 14, (R) => {
    R(2, 4, 8, 10, '#2a2638');
    R(0, 2, 12, 3, '#3d3866');
    R(0, 2, 12, 1, '#6a63a8');
    R(1, 12, 10, 2, '#15112a');
  }],
  // ---------------- Cuarto de comunicación invertido ----------------
  floatbulb: [6, 8, (R) => {
    R(1, 0, 4, 2, '#3d3866');
    R(0, 2, 6, 5, '#c8f4ff');
    R(1, 7, 4, 1, '#8ad8ea');
  }],
  roots: [16, 26, (R) => {
    for (const sx of [2, 7, 12]) {
      let x = sx;
      for (let y = 0; y < 18 + ri(8); y++) { R(x, y, 2, 1, pick(['#3b1530', '#5a1f45', '#2a1238'])); if (rnd() < 0.35) x += rnd() < 0.5 ? -1 : 1; }
    }
  }],
  liascreen: [24, 12, (R) => {
    R(0, 0, 24, 12, '#15112a');
    R(1, 1, 22, 10, '#03141a');
  }],
  goo: [24, 12, (R) => {
    R(3, 3, 18, 7, 'rgba(40,10,30,.75)');
    R(1, 5, 22, 4, 'rgba(40,10,30,.75)');
    for (let i = 0; i < 4; i++) R(ri(20), 2 + ri(8), 3 + ri(5), 1, 'rgba(110,30,70,.7)');
  }],
};

for (const [name, [w, h, draw]] of Object.entries(PROPS)) {
  SPRITE_SIZE[name] = [w, h];
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d')!;
  seed = name.length * 977 + name.charCodeAt(0) * 31;
  draw((x, y, ww, hh, color) => {
    g.fillStyle = color;
    g.fillRect(x, y, ww, hh);
  });
  SPRITES[name] = canvas;
}

// ---------- animaciones y luces ----------

export interface SceneLight { x: number; y: number; inner: number; r: number; tint?: string }

const MORSE = [1, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0]; // largo-corto-corto y pausa

/** Decoración que se queda quieta: menos movimiento en pantalla. */
const STATIC_PROPS = new Set(['logo', 'conveyor', 'monitorwall', 'robotarm', 'fibers', 'servercol', 'scope', 'bigscreen', 'rift']);

/** Dibuja la parte animada de un prop. Devuelve false si el prop no tiene animación propia. */
export function animateProp(g: CanvasRenderingContext2D, thing: Thing, x: number, y: number, t: number, solved: boolean): boolean {
  if (STATIC_PROPS.has(thing.sprite)) return false;
  const px = (xx: number, yy: number, w: number, h: number, c: string): void => {
    g.fillStyle = c;
    g.fillRect(x + xx, y + yy, w, h);
  };
  switch (thing.sprite) {
    case 'term':
    case 'aiconsole':
    case 'queryterm': {
      const [sx, sy, sw, sh] = thing.sprite === 'term' ? [1, 1, 18, 11] : thing.sprite === 'aiconsole' ? [5, 1, 26, 7] : [5, 1, 16, 6];
      const inv = thing.room.startsWith('i') || thing.room.startsWith('comms-inv') || thing.room === 'transition';
      const ink = inv ? VIOLET : CYAN;
      const rows = Math.floor(sh / 2);
      for (let i = 0; i < rows; i++) {
        const len = ((i * 7 + Math.floor(t * 2) + thing.x) % (sw - 3)) + 2;
        px(sx + 1, sy + 1 + i * 2, len, 1, i === rows - 1 && Math.floor(t * 3) % 2 ? '#ffffff' : ink);
      }
      if (thing.sprite === 'aiconsole') for (let i = 0; i < 7; i++) px(5 + i * 4, 13, 1, 1, Math.sin(t * 3 + i) > 0.3 ? ink : '#2a2836');
      return true;
    }
    case 'assembly': {
      const step = Math.floor(t * 1.5) % 4;
      for (let i = 0; i < 4; i++) px(4 + i * 8, 3, 4, 4, i === step ? CYAN : '#163a44');
      px(((t * 20) % 36), 14, 3, 2, ORANGE);
      return true;
    }
    case 'rewardlevers':
      for (const [k, xx] of [[0, 6], [1, 17], [2, 28]]) px(xx, 15, 2, 1, Math.sin(t * 2 + k * 2) > 0 ? '#ffffff' : '#3a3650');
      return true;
    case 'datachip': {
      const a = 0.5 + Math.abs(Math.sin(t * 3 + thing.x)) * 0.5;
      px(3, 3, 4, 4, `rgba(0,229,255,${a.toFixed(2)})`);
      if (Math.sin(t * 2 + thing.y) > 0.8) px(4, -2, 2, 1, '#ffffff');
      return true;
    }
    case 'portal': {
      for (let r = 0; r < 3; r++) {
        const k = (t * 8 + r * 4) % 12;
        px(18 - k, 18 - k, k * 2, 1, 'rgba(164,108,255,.7)');
        px(18 - k, 18 + k, k * 2, 1, 'rgba(0,229,255,.7)');
      }
      return true;
    }
    case 'emstrip':
      px(1, 1, 10, 2, Math.floor(t * 1.5) % 2 ? '#ff4d4d' : '#5a1c1c');
      return true;
    case 'turnstile':
      px(5, 1, 2, 2, Math.floor(t * 2) % 2 ? RED : '#3a1020');
      return true;
    case 'logo': {
      const a = 0.25 + Math.abs(Math.sin(t * 0.8)) * 0.35;
      g.fillStyle = `rgba(0,229,255,${a.toFixed(2)})`;
      g.fillRect(x + 22, y + 8, 4, 16);
      g.fillRect(x + 16, y + 14, 16, 4);
      return true;
    }
    case 'conveyor': {
      const off = Math.floor(t * 12) % 8;
      for (let i = -1; i < 9; i++) px(i * 8 + off, 7, 2, 1, '#4a515c');
      const items = ['#8d95a1', '#c46a0c', '#e0b23c', '#5d6571'];
      for (let i = 0; i < 4; i++) {
        const ix = ((t * 12 + i * 17) % 72) - 6;
        if (ix < 0 || ix > 58) continue;
        px(ix, 3, 6, 4, items[i]);
        px(ix, 3, 6, 1, '#d9dde2');
      }
      return true;
    }
    case 'archway': {
      const yy = 6 + (Math.floor(t * 16) % 24);
      px(5, yy, 18, 1, 'rgba(255,60,60,.55)');
      px(13, 2, 2, 1, Math.floor(t * 3) % 2 ? '#ff4d4d' : '#5a1c1c');
      return true;
    }
    case 'monitorwall': {
      for (let i = 0; i < 6; i++) {
        const sx = 1 + (i % 3) * 16;
        const sy = 1 + Math.floor(i / 3) * 8;
        if (i === 4) continue;
        const glitch = Math.sin(t * 7 + i * 3) > 0.92;
        for (let k = 0; k < 6; k++) px(sx + ((k * 5 + Math.floor(t * 20) + i) % 14), sy + (k % 6), 1, 1, glitch ? '#ff4d4d' : 'rgba(180,230,200,.5)');
        if (i === 1) px(sx + 5, sy + 2, 3, 3, '#2a3a30');
      }
      return true;
    }
    case 'seccam':
    case 'railcam': {
      px(2, 3, 1, 1, Math.floor(t * 2) % 2 ? RED : '#3a1020');
      return true;
    }
    case 'morselamp': {
      const on = MORSE[Math.floor(t * 4) % MORSE.length];
      px(1, 2, 8, 4, on ? '#ffb070' : '#5a2a1c');
      return true;
    }
    case 'guardian':
      px(7, 11, 2, 2, solved ? CYAN : Math.sin(t * 2) > 0.8 ? '#3a4552' : '#2a3038');
      if (solved) { px(5, 3, 2, 1, CYAN); px(9, 3, 2, 1, CYAN); }
      return true;
    case 'memcore': {
      for (let i = 0; i < 5; i++) {
        const fx = 4 + ((i * 3 + Math.floor(t * 2)) % 10);
        const fy = 5 + ((i * 7 + Math.floor(t * 9)) % 16);
        px(fx, fy, 1, 3, solved ? '#e8fbff' : CYAN);
      }
      return true;
    }
    case 'desklamp':
      px(2, 3, 6, 1, Math.sin(t * 13 + thing.x) > 0.95 ? '#6b5a30' : '#ffd978');
      return true;
    case 'symbols': {
      const active = Math.floor(t * 1.5) % 4;
      const col = (i: number): string => (i === active ? ['#ffd978', CYAN, '#e05252', '#4cc47a'][i] : '#3a2e48');
      px(4, 2, 2, 1, col(0)); px(3, 3, 4, 1, col(0)); px(2, 5, 6, 1, col(0));
      px(12, 2, 4, 4, col(1)); px(13, 3, 2, 2, '#241c2c');
      px(23, 1, 2, 6, col(2)); px(21, 3, 6, 2, col(2));
      px(32, 1, 1, 1, col(3)); px(31, 2, 3, 3, col(3)); px(32, 5, 1, 1, col(3));
      return true;
    }
    case 'lightpad': {
      const on = Math.sin(t * 2 + thing.x * 0.05 + thing.y * 0.03) > -0.2;
      px(2, 2, 12, 12, on ? 'rgba(0,229,255,.16)' : 'rgba(0,0,0,0)');
      if (on) px(2, 7, 12, 1, 'rgba(0,229,255,.5)');
      return true;
    }
    case 'robotarm':
      px(11, 1, 2, 1, Math.floor(t * 2 + thing.x) % 2 ? ORANGE : '#5a3a10');
      return true;
    case 'stepcounter': {
      const n = String(Math.floor(t * 7) % 1000).padStart(3, '0');
      g.fillStyle = '#4cc47a';
      g.font = '7px monospace';
      g.textAlign = 'left';
      g.fillText(`PASOS ${n}`, x + 3, y + 9);
      return true;
    }
    case 'fibers': {
      for (let i = 0; i < 3; i++) {
        const fx = (t * (30 + i * 9) + i * 15) % 52 - 2;
        px(fx, 1 + i * 3, 3, 2, i === 1 ? '#4cc47a' : CYAN);
      }
      return true;
    }
    case 'bigscreen': {
      const hue = [ORANGE, CYAN, '#8fd18f'][Math.floor(thing.x / 50) % 3];
      for (let i = 0; i < 6; i++) px(4 + i * 6, 12 - ((i * 3 + Math.floor(t * 2)) % 8), 4, 1 + ((i * 3 + Math.floor(t * 2)) % 8), hue);
      if (Math.sin(t * 5 + thing.x) > 0.95) px(2, 2 + Math.floor(rndT(t) * 12), 40, 1, 'rgba(255,23,68,.7)');
      return true;
    }
    case 'citymodel': {
      const danger = Math.sin(t * 0.7) > 0.3 && !solved;
      px(8, 8, 2, 2, danger ? '#3a3a40' : '#ffd978');
      px(14, 8, 2, 2, danger ? '#3a3a40' : '#ffd978');
      const rx = 4 + ((t * 10) % 40);
      px(rx, 20, 3, 2, danger ? ORANGE : CYAN);
      return true;
    }
    case 'bulb':
      px(1, 10, 4, 4, Math.sin(t * 17) > 0.97 ? '#6b5a30' : '#ffd978');
      return true;
    case 'scope': {
      for (let i = 0; i < 9; i++) px(2 + i, 7 + Math.round(Math.sin(t * 6 + i * 0.9) * 2), 1, 1, '#4cc47a');
      return true;
    }
    case 'rift': {
      const a = 0.5 + Math.sin(t * 3 + thing.y * 0.1) * 0.3;
      px(4, 0, 4, 16, `rgba(232,244,251,${a.toFixed(2)})`);
      return true;
    }
    case 'servercol': {
      for (let i = 0; i < 9; i++) {
        const on = Math.sin(t * (2 + (i % 3)) + thing.x * 0.3 + i * 1.7) > 0.3;
        px(4 + (i % 2) * 6, 3 + i * 3, 1, 1, on ? (i % 4 === 0 ? CYAN : VIOLET) : '#2a2350');
      }
      return true;
    }
    case 'holotable': {
      for (let r = 0; r < 5; r++) {
        const bad = (r + Math.floor(t * 0.8)) % 4 === 0;
        px(3, 4 + r * 2, 10 + ((r * 7) % 20), 1, bad ? 'rgba(255,23,68,.9)' : 'rgba(0,229,255,.7)');
      }
      return true;
    }
    case 'shredder':
      px(3, 7, 10, 1, Math.floor(t * 4) % 2 ? RED : '#7a1020');
      return true;
    case 'mirrorTall': {
      const s = Math.sin(t * 0.8 + thing.x);
      px(4, 6, 6, 9, s > 0.6 ? 'rgba(255,23,68,.35)' : 'rgba(200,190,255,.12)');
      if (s > 0.6) { px(6, 7, 2, 7, '#05030a'); px(5, 7, 4, 1, '#05030a'); }
      return true;
    }
    case 'pixframe': {
      const res = Math.floor(t * 0.7 + thing.x) % 3 === 0 ? 2 : 1;
      for (let yy = 0; yy < 10; yy += res * 2) for (let xx = 0; xx < 12; xx += res * 2) {
        const v = Math.sin(xx * 0.9 + yy * 1.3 + thing.x) > 0;
        px(1 + xx, 1 + yy, res * 2, res * 2, v ? VIOLET : '#ff6aa0');
      }
      if (Math.floor(t * 2 + thing.x) % 9 === 0) px(6, 5, 1, 1, CYAN);
      return true;
    }
    case 'stopsign':
      if (Math.sin(t * 1.4) > 0.5) { px(2, 5, 8, 2, '#c0262f'); px(3, 5, 2, 2, '#4cc47a'); px(7, 5, 2, 2, '#4cc47a'); }
      return true;
    case 'claim': {
      const pct = 97 + (Math.floor(t * 3) % 3);
      g.fillStyle = '#ffffff';
      g.font = '5px monospace';
      g.textAlign = 'left';
      g.fillText(`${pct}%`, x + 6, y + 10);
      return true;
    }
    case 'tallshelf':
    case 'fire': {
      const base = thing.sprite === 'fire' ? 13 : 29;
      const w = thing.sprite === 'fire' ? 12 : 16;
      for (let i = 0; i < w; i += 1) {
        const h = 2 + Math.floor((Math.sin(t * 9 + i * 1.9 + thing.x) + 1) * (thing.sprite === 'fire' ? 5 : 3));
        px(i, base - h, 1, h, i % 3 === 0 ? VIOLET : '#ff6a1a');
        px(i, base - h, 1, 1, '#ffd23a');
      }
      return true;
    }
    case 'attention': {
      const words = 6;
      const focus = Math.floor(t * 0.8) % words;
      for (let i = 0; i < words; i++) {
        if (i === focus) continue;
        const a = 0.25 + 0.6 * Math.abs(Math.sin(i * 2.1 + focus));
        const x0 = 5 + focus * 8;
        const x1 = 5 + i * 8;
        const steps = Math.abs(x1 - x0);
        for (let k = 0; k <= steps; k += 2) {
          const xx = x0 + (x1 - x0) * (k / steps);
          const yy = 5 + Math.sin((k / steps) * Math.PI) * 5;
          px(Math.round(xx), Math.round(yy), 1, 1, `rgba(0,229,255,${a.toFixed(2)})`);
        }
      }
      px(2 + focus * 8, 1, 6, 3, '#ff6a1a');
      return true;
    }
    case 'mcpconsole': {
      for (let i = 0; i < 4; i++) px(9, 2 + i * 2, 4 + ((i * 5 + Math.floor(t * 2)) % 18), 1, i === 1 ? '#e0b23c' : '#c8b8ff');
      return true;
    }
    case 'port': {
      const on = Math.sin(t * 2.5 + thing.x * 0.2) > 0;
      if (on) { px(0, 4, 1, 2, '#e8e2ff'); px(9, 4, 1, 2, '#e8e2ff'); px(4, 0, 2, 1, '#e8e2ff'); px(4, 9, 2, 1, '#e8e2ff'); }
      if (thing.label === 'Puerto sin cable') px(4, 4, 2, 2, Math.floor(t * 4) % 4 === 0 ? '#ffffff' : '#2a2048');
      return true;
    }
    case 'toolholo': {
      const ok = Math.sin(t * 0.9 + thing.x) > -0.4;
      const c = ok ? CYAN : RED;
      const k = Math.floor(thing.x / 30) % 4;
      px(1, 1, 10, 10, ok ? 'rgba(0,229,255,.15)' : 'rgba(255,23,68,.15)');
      if (k === 0) { px(3, 3, 6, 6, c); px(4, 4, 4, 1, '#05030a'); px(4, 6, 1, 1, '#05030a'); px(7, 6, 1, 1, '#05030a'); }
      else if (k === 1) { px(3, 3, 6, 2, c); px(3, 6, 6, 2, c); px(3, 9, 6, 1, c); }
      else if (k === 2) { px(5, 2, 2, 8, c); px(2, 5, 8, 2, c); }
      else { px(3, 4, 6, 5, c); px(4, 5, 4, 1, '#05030a'); px(4, 2, 4, 2, c); }
      return true;
    }
    case 'fragslot': {
      const lit = solved;
      px(3, 3, 6, 2, lit ? CYAN : `rgba(0,229,255,${(0.1 + Math.abs(Math.sin(t + thing.x)) * 0.2).toFixed(2)})`);
      return true;
    }
    case 'redcrack': {
      const a = 0.4 + Math.abs(Math.sin(t * 2 + thing.x)) * 0.6;
      g.fillStyle = `rgba(255,23,68,${a.toFixed(2)})`;
      let yy = 4;
      for (let xx = 0; xx < 24; xx++) {
        g.fillRect(x + xx, y + yy, 1, 1);
        if ((xx * 7 + thing.x) % 5 === 0) yy += xx % 2 ? 1 : -1;
        yy = Math.max(1, Math.min(8, yy));
      }
      return true;
    }
    case 'infrascreen':
      if (Math.sin(t * 3 + thing.x) > 0.7) px(1, 1, 22, 12, 'rgba(255,23,68,.25)');
      return true;
    case 'floatbulb':
      px(0, 2, 6, 5, Math.sin(t * 2 + thing.x) > 0.6 ? '#ffffff' : '#c8f4ff');
      return true;
    case 'liascreen': {
      const msg = 'SATO, SI LEES ESTO';
      const n = Math.floor(t * 4) % (msg.length + 8);
      g.fillStyle = CYAN;
      g.font = '4px monospace';
      g.textAlign = 'left';
      g.fillText(msg.slice(0, Math.min(n, msg.length)), x + 2, y + 7);
      return true;
    }
    default:
      return false;
  }
}

function rndT(t: number): number {
  const v = Math.sin(t * 91.7) * 43758.5453;
  return v - Math.floor(v);
}

/** Luz que emite un prop (coordenadas de pantalla del centro del prop). */
export function propLight(thing: Thing, x: number, y: number, t: number): SceneLight | null {
  if (STATIC_PROPS.has(thing.sprite)) return null;
  switch (thing.sprite) {
    case 'term': return { x, y: y - 2, inner: 3, r: 50, tint: 'rgba(0,229,255,.14)' };
    case 'aiconsole': return { x, y, inner: 4, r: 60, tint: 'rgba(0,229,255,.14)' };
    case 'queryterm': return { x, y, inner: 3, r: 48, tint: 'rgba(0,229,255,.12)' };
    case 'assembly': return { x, y, inner: 3, r: 44, tint: 'rgba(0,229,255,.12)' };
    case 'rewardlevers': return { x, y, inner: 3, r: 40, tint: 'rgba(247,147,26,.10)' };
    case 'datachip': return { x, y, inner: 2, r: 30, tint: 'rgba(0,229,255,.22)' };
    case 'portal': return { x, y: y + 18, inner: 4, r: 56, tint: 'rgba(164,108,255,.16)' };
    case 'emstrip': return { x, y: y + 16, inner: 3, r: 40, tint: 'rgba(255,60,60,.12)' };
    case 'genesisdesk': return { x, y, inner: 4, r: 56, tint: 'rgba(0,229,255,.08)' };
    case 'logo': return { x, y, inner: 6, r: 50, tint: 'rgba(0,229,255,.06)' };
    case 'morselamp': return MORSE[Math.floor(t * 4) % MORSE.length] ? { x, y: y + 16, inner: 3, r: 46, tint: 'rgba(255,120,60,.22)' } : null;
    case 'archway': return { x, y, inner: 3, r: 40, tint: 'rgba(255,60,60,.12)' };
    case 'monitorwall': return { x, y: y + 16, inner: 4, r: 54, tint: 'rgba(160,230,190,.10)' };
    case 'memcore': return { x, y, inner: 4, r: 60, tint: 'rgba(0,229,255,.2)' };
    case 'desklamp': return { x, y: y + 6, inner: 3, r: 42, tint: 'rgba(255,200,110,.2)' };
    case 'lightpad': return { x, y, inner: 2, r: 20, tint: 'rgba(0,229,255,.08)' };
    case 'fibers': return { x, y: y + 12, inner: 3, r: 46, tint: 'rgba(0,229,255,.10)' };
    case 'bigscreen': return { x, y: y + 18, inner: 4, r: 62, tint: 'rgba(170,200,255,.12)' };
    case 'citymodel': return { x, y, inner: 3, r: 40, tint: 'rgba(247,147,26,.08)' };
    case 'bulb': return { x, y: y + 12, inner: 4, r: 70, tint: 'rgba(255,190,90,.22)' };
    case 'scope': return { x, y, inner: 2, r: 24, tint: 'rgba(76,196,122,.12)' };
    case 'rift': return { x, y, inner: 3, r: 30, tint: 'rgba(232,244,251,.10)' };
    case 'servercol': return { x, y, inner: 2, r: 30, tint: 'rgba(164,108,255,.10)' };
    case 'holotable': return { x, y, inner: 4, r: 56, tint: 'rgba(0,229,255,.14)' };
    case 'shredder': return { x, y, inner: 2, r: 30, tint: 'rgba(255,23,68,.14)' };
    case 'pixframe': return { x, y: y + 12, inner: 2, r: 30, tint: 'rgba(164,108,255,.10)' };
    case 'claim': return { x, y: y + 12, inner: 2, r: 34, tint: 'rgba(255,23,68,.10)' };
    case 'tallshelf': return { x, y: y + 12, inner: 3, r: 40, tint: 'rgba(255,106,26,.16)' };
    case 'fire': return { x, y, inner: 3, r: 50, tint: 'rgba(255,106,26,.24)' };
    case 'mcpconsole': return { x, y, inner: 4, r: 64, tint: 'rgba(0,229,255,.14)' };
    case 'port': return { x, y: y + 8, inner: 2, r: 22, tint: 'rgba(232,226,255,.08)' };
    case 'toolholo': return { x, y, inner: 2, r: 26, tint: 'rgba(0,229,255,.12)' };
    case 'redcrack': return { x, y, inner: 2, r: 26, tint: 'rgba(255,23,68,.12)' };
    case 'floatbulb': return { x, y, inner: 3, r: 44, tint: 'rgba(160,240,255,.18)' };
    case 'liascreen': return { x, y: y + 12, inner: 3, r: 36, tint: 'rgba(0,229,255,.12)' };
    case 'glasspane': return null;
    default: return null;
  }
}
