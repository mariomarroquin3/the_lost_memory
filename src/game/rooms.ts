import type { World } from '../shared/reducer.js';
import { batchCode, room1Data, room2Data, room3Data, room4Data, room5Data, room6Data, room7Data, room8Data, room9Data } from './puzzleData';

export interface RoomInfo {
  id: string;
  name: string;
  short: string;
  fragment?: string;
}

export const ROOM_INFO: Record<World, RoomInfo[]> = {
  real: [
    { id: 'comms-real', name: 'Sala de comunicaciones', short: 'COM' },
    { id: 'hall', name: 'Recepción', short: 'REC' },
    { id: 'r1', name: 'La cinta que aprende', short: 'S1', fragment: 'pesos' },
    { id: 'r2', name: 'Entrena al guardián', short: 'S2', fragment: 'ejemplos' },
    { id: 'r3', name: 'El archivo por significado', short: 'S3', fragment: 'significado' },
    { id: 'r4', name: 'La línea de montaje', short: 'S4', fragment: 'algoritmo' },
    { id: 'r5', name: 'El agente y su recompensa', short: 'S5', fragment: 'recompensa' },
  ],
  inverted: [
    { id: 'comms-inverted', name: 'Sala de comunicaciones', short: 'COM' },
    { id: 'transition', name: 'Puerta de transición', short: 'PT' },
    { id: 'i6', name: 'Detective de datos', short: 'S6', fragment: 'datos' },
    { id: 'i7', name: 'La galería de la duda', short: 'S7', fragment: 'duda' },
    { id: 'i8', name: 'Las palabras que faltan', short: 'S8', fragment: 'atención' },
    { id: 'i9', name: 'La puerta que escucha', short: 'S9', fragment: 'herramientas' },
    { id: 'i10', name: 'El presupuesto de contexto', short: 'S10', fragment: 'contexto' },
  ],
};

export const FRAGMENT_ORDER = ['r1', 'r2', 'r3', 'r4', 'r5', 'i6', 'i7', 'i8', 'i9', 'i10'];

export const WORLD_NAME: Record<World, string> = { real: 'MUNDO REAL', inverted: 'MUNDO INVERTIDO' };

export function fragmentName(id: string): string {
  for (const world of ['real', 'inverted'] as World[]) {
    const room = ROOM_INFO[world].find((r) => r.id === id);
    if (room?.fragment) return room.fragment;
  }
  return '';
}

/**
 * Pista física que hay en la sala `roomId` de `world`. Casi todas sirven a una sala del otro mundo.
 */
/** Sala → sala del otro mundo donde está la pista que necesita. */
export const NEEDS: Record<string, { world: World; room: string }> = {
  r1: { world: 'inverted', room: 'transition' },
  r2: { world: 'inverted', room: 'i6' },
  r3: { world: 'inverted', room: 'i7' },
  r4: { world: 'inverted', room: 'i8' },
  r5: { world: 'inverted', room: 'i9' },
  i6: { world: 'real', room: 'r2' },
  i7: { world: 'real', room: 'r3' },
  i8: { world: 'real', room: 'r4' },
  i9: { world: 'real', room: 'r5' },
};

/** Gráfica pequeña del escáner con las lecturas falsas rodeadas en rojo. */
function scannerPlot(readings: Array<{ id: number; x: number; y: number; fake: boolean }>): string {
  const W = 280, H = 170, L = 24, B = 18;
  const ymax = Math.max(...readings.map((p) => p.y)) + 3;
  const ymin = Math.min(0, ...readings.map((p) => p.y)) - 1;
  const sx = (x: number): number => L + (x / 11) * (W - L - 8);
  const sy = (y: number): number => H - B - ((y - ymin) / (ymax - ymin)) * (H - B - 8);
  const pts = readings.map((p) => {
    const ring = p.fake ? `<circle cx="${sx(p.x)}" cy="${sy(p.y)}" r="8" fill="none" stroke="#e05252" stroke-width="2"/>` : '';
    return `${ring}<rect x="${sx(p.x) - 3}" y="${sy(p.y) - 3}" width="6" height="6" fill="${p.fake ? '#e05252' : '#f7931a'}"/><text x="${sx(p.x) + 6}" y="${sy(p.y) - 5}" fill="#ece3d6" font-size="10" font-family="monospace">${p.id}</text>`;
  }).join('');
  const ticks = [0, 2, 4, 6, 8, 10].map((x) => `<text x="${sx(x) - 3}" y="${H - 5}" fill="#9d93a9" font-size="9" font-family="monospace">${x}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="max-width:100%;background:#0b0910;border:1px solid #2a2236;display:block;margin:8px 0">${ticks}<text x="2" y="12" fill="#9d93a9" font-size="9" font-family="monospace">peso</text>${pts}</svg>`;
}

export function clueFor(world: World, roomId: string, seed: number): { title: string; body: string; extra?: string; send?: string } | null {
  if (world === 'inverted') {
    switch (roomId) {
      case 'transition': {
        const d = room1Data(seed);
        const fakes = d.readings.filter((p) => p.fake).sort((a, b) => a.id - b.id);
        return {
          title: 'Registro del escáner',
          body: `Lote <b>${batchCode(seed)}</b>. Lecturas inyectadas por el Alucinador: <b>nº ${fakes.map((p) => p.id).join(', ')}</b>. No sirven para calibrar. (Sirve a la Sala 1 del Mundo Real)`,
          send: `S1 ${fakes.map((p) => p.id).join(' ')}`,
          extra: `${scannerPlot(d.readings)}<p class="rp-small">Las marcadas en rojo son las falsas: ${fakes.map((p) => `nº ${p.id} (tamaño ${p.x}, peso ${p.y.toFixed(1)})`).join(' · ')}. El otro jugador ve los mismos números junto a cada punto de su gráfica.</p>`,
        };
      }
      case 'i6': {
        const d = room2Data(seed);
        return {
          title: 'Tarjeta de prueba T6',
          body: `Tarjeta encontrada en el suelo: rasgo X = ${d.hiddenX} de 15 · rasgo Y = ${d.hiddenY} de 15. (Examen sorpresa de la Sala 2 del Mundo Real)`,
          send: `S2 ${d.hiddenX} ${d.hiddenY}`,
        };
      }
      case 'i7': {
        const d = room3Data(seed);
        return {
          title: 'Señal interceptada',
          body: `La pregunta correcta del archivo es la número ${d.question.id}. (Sala 3 del Mundo Real)`,
          send: `S3 ${d.question.id}`,
        };
      }
      case 'i8': {
        const d = room4Data(seed);
        return {
          title: 'Diagrama de la línea de montaje',
          body: `Orden correcto de los módulos: ${d.ops.map((o) => o.glyph).join(' → ')} dentro de un bucle. (Sala 4 del Mundo Real)`,
          send: `S4 ${d.ops.map((o) => o.glyph).join(' ')}`,
        };
      }
      case 'i9': {
        const d = room5Data(seed);
        return {
          title: 'Norma de seguridad hospitalaria',
          body: `Peso de SEGURIDAD mínimo: ${d.minSafety}. Peso de ENERGÍA máximo: ${d.maxEnergy}. (Sala 5 del Mundo Real)`,
          send: `S5 ${d.minSafety} ${d.maxEnergy}`,
        };
      }
      case 'i10':
        return { title: 'Grabación de Lía', body: '«Sato, cuando llegues aquí, decide qué es Genesis. No por mí: por ellos.»' };
      default:
        return null;
    }
  }
  switch (roomId) {
    case 'r1':
      return {
        title: 'Informe del guardián',
        body: 'El modelo del guardián se entrenó SOLO con tarjetas del Mundo Real. Nadie probó cómo se comporta en el otro lado.',
      };
    case 'r2': {
      const d = room6Data(seed);
      return { title: 'Censo físico de accesos', body: `El archivo en papel tiene exactamente ${d.unique} personas distintas. (Sala 6 del Mundo Invertido)`, send: `S6 ${d.unique}` };
    }
    case 'r3': {
      const d = room7Data(seed);
      return {
        title: 'Archivo en papel',
        body: `Documento sellado: confirma la afirmación número ${d.realOnly + 1} del Alucinador. (Sala 7 del Mundo Invertido)`,
        send: `S7 ${d.realOnly + 1}`,
      };
    }
    case 'r4': {
      const d = room8Data(seed);
      return { title: 'Plano eléctrico', body: `El generador que hay que apagar es el ${d.target}. (Sala 8 del Mundo Invertido)`, send: `S8 ${d.target}` };
    }
    case 'r5': {
      const d = room9Data(seed);
      return { title: 'Etiqueta de mantenimiento', body: `La puerta de mantenimiento es la P-${d.door}. (Sala 9 del Mundo Invertido)`, send: `S9 P${d.door}` };
    }
    default:
      return null;
  }
}
