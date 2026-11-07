// Sato en Proyecto 21: 16x16 en vista cenital, con cuatro direcciones y dos pasos.
// Copiado de Proyecto 21: mismo personaje en los dos mundos.
/** Traje opcional: colores que cambian y puntos sueltos encima del sprite. */
export interface Costume {
  palette: Record<string, string>;
  marks?: { front?: [number, number, string][]; back?: [number, number, string][]; side?: [number, number, string][] };
}

export type Facing = 'down' | 'up' | 'left' | 'right';
export type SatoFrames = Record<Facing, HTMLCanvasElement[]>;

/** k contorno, h pelo o gorro, s piel, S sombra de piel, e ojos, o chaqueta, O borde de chaqueta, y detalle, j pantalón, w zapatos. */
export const SATO_PALETTE: Record<string, string> = {
  k: '#1a1420', h: '#2b2233', s: '#f2c9a0', S: '#c9926a', e: '#1a1420', o: '#f7931a', O: '#c46a0c', y: '#fff1c9',
  j: '#3b5a9a', w: '#e8e2d6',
};
const FRONT = [
  '................', '.....kkkkkk.....', '....khhhhhhk....', '...khhhhhhhhk...', '...khsssssshk...', '...ksessssesk...',
  '...kssssssssk...', '....kssSSssk....', '...kOooooooOk...', '..kOoooyyoooOk..', '..ksOooooooOsk..', '...kOooooooOk...',
  '...kjjjjjjjjk...',
];
const BACK = [
  '................', '.....kkkkkk.....', '....khhhhhhk....', '...khhhhhhhhk...', '...khhhhhhhhk...', '...khhhhhhhhk...',
  '...khhhhhhhhk...', '....khhhhhhk....', '...kOooooooOk...', '..kOOooooooOOk..', '..ksOooooooOsk..', '...kOooooooOk...',
  '...kjjjjjjjjk...',
];
const SIDE = [
  '................', '.....kkkkk......', '....khhhhhk.....', '...khhhhhhhk....', '...khhhhssssk...', '...khhhssesk....',
  '...khhsssssk....', '....khsSSsk.....', '....kOooook.....', '...kOoooooOk....', '...kOoooosk.....', '....kOoooOk.....',
  '....kjjjjjk.....',
];
const LEGS_A = ['...kjjk..kjjk...', '...kwwk..kwwk...', '................'];
const LEGS_B = ['....kjjkkjjk....', '....kwwkkwwk....', '................'];
const SIDE_A = ['....kjjkjjk.....', '....kwwkwwk.....', '................'];
const SIDE_B = ['...kjjk.kjjk....', '...kwwk.kwwk....', '................'];

function make(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!);
  return canvas;
}

/** Dibuja filas de letras con la paleta y encima los puntos sueltos del traje ([x, y, color]). */
function fromRows(rows: string[], palette: Record<string, string>, marks: [number, number, string][] = []): HTMLCanvasElement {
  return make(rows[0].length, rows.length, (g) => {
    const dot = (x: number, y: number, color: string) => {
      g.fillStyle = color;
      g.fillRect(x, y, 1, 1);
    };
    rows.forEach((row, y) => [...row].forEach((ch, x) => palette[ch] && dot(x, y, palette[ch])));
    marks.forEach(([x, y, color]) => dot(x, y, color));
  });
}

function mirror(source: HTMLCanvasElement): HTMLCanvasElement {
  return make(source.width, source.height, (g) => {
    g.translate(source.width, 0);
    g.scale(-1, 1);
    g.drawImage(source, 0, 0);
  });
}

/** Los cuadros de Sato con un traje puesto (sin traje, el de siempre). También viste a los fundadores en los recuerdos. */
export function satoFrames(costume?: Pick<Costume, 'palette' | 'marks'>): SatoFrames {
  const palette = { ...SATO_PALETTE, ...costume?.palette };
  const marks = costume?.marks ?? {};
  const front = (legs: string[]) => fromRows([...FRONT, ...legs], palette, marks.front);
  const back = (legs: string[]) => fromRows([...BACK, ...legs], palette, marks.back);
  const right = [fromRows([...SIDE, ...SIDE_A], palette, marks.side), fromRows([...SIDE, ...SIDE_B], palette, marks.side)];
  return {
    down: [front(LEGS_A), front(LEGS_B)],
    up: [back(LEGS_A), back(LEGS_B)],
    right,
    left: right.map(mirror),
  };
}
