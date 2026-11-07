import type { World } from '../shared/reducer.js';
import { COLORS, room1Data, room2Data, room3Data, room4Data, room5Data, room6Data, room7Data, room8Data, room9Data } from './puzzleData';

export interface RoomInfo {
  id: string;
  name: string;
  short: string;
  fragment?: string;
}

export const ROOM_INFO: Record<World, RoomInfo[]> = {
  real: [
    { id: 'comms-real', name: 'Sala de comunicaciones', short: 'COM' },
    { id: 'r1', name: 'La cinta que clasifica', short: 'S1', fragment: 'rasgos' },
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
 * Pista física que hay en la sala `index` de `world`. Sirve a la sala con el mismo índice del otro mundo.
 */
export function clueFor(world: World, index: number, seed: number): { title: string; body: string } | null {
  if (world === 'inverted') {
    switch (index) {
      case 1: {
        const d = room1Data(seed);
        return {
          title: 'Catálogo de rasgos autorizados',
          body: `Pieza autorizada = BORDES ≥ ${d.minEdges} · COLOR ${COLORS[d.color].name} · TEXTURA ${d.texture.toUpperCase()}. Todo lo demás es del Alucinador. (Sirve a la Sala 1 del Mundo Real)`,
        };
      }
      case 2: {
        const d = room2Data(seed);
        return {
          title: 'Tarjeta de prueba T6',
          body: `Tarjeta encontrada en el suelo: rasgo X = ${d.hiddenX} de 15 · rasgo Y = ${d.hiddenY} de 15. (Examen sorpresa de la Sala 2 del Mundo Real)`,
        };
      }
      case 3: {
        const d = room3Data(seed);
        return {
          title: 'Señal interceptada',
          body: `La pregunta correcta del archivo es la número ${d.question.id}. (Sala 3 del Mundo Real)`,
        };
      }
      case 4: {
        const d = room4Data(seed);
        return {
          title: 'Diagrama de la línea de montaje',
          body: `Orden correcto de los módulos: ${d.ops.map((o) => o.glyph).join(' → ')} dentro de un bucle. (Sala 4 del Mundo Real)`,
        };
      }
      case 5: {
        const d = room5Data(seed);
        return {
          title: 'Norma de seguridad hospitalaria',
          body: `Peso de SEGURIDAD mínimo: ${d.minSafety}. Peso de ENERGÍA máximo: ${d.maxEnergy}. (Sala 5 del Mundo Real)`,
        };
      }
      case 6:
        return { title: 'Grabación de Lía', body: '«Sato, cuando llegues aquí, decide qué es Genesis. No por mí: por ellos.»' };
      default:
        return null;
    }
  }
  switch (index) {
    case 1:
      return {
        title: 'Informe del guardián',
        body: 'El modelo del guardián se entrenó SOLO con tarjetas del Mundo Real. Nadie probó cómo se comporta en el otro lado.',
      };
    case 2: {
      const d = room6Data(seed);
      return { title: 'Censo físico de accesos', body: `El archivo en papel tiene exactamente ${d.unique} personas distintas. (Sala 6 del Mundo Invertido)` };
    }
    case 3: {
      const d = room7Data(seed);
      return {
        title: 'Archivo en papel',
        body: `Documento sellado: confirma la afirmación número ${d.realOnly + 1} del Alucinador. (Sala 7 del Mundo Invertido)`,
      };
    }
    case 4: {
      const d = room8Data(seed);
      return { title: 'Plano eléctrico', body: `El generador que hay que apagar es el ${d.target}. (Sala 8 del Mundo Invertido)` };
    }
    case 5: {
      const d = room9Data(seed);
      return { title: 'Etiqueta de mantenimiento', body: `La puerta de mantenimiento es la P-${d.door}. (Sala 9 del Mundo Invertido)` };
    }
    default:
      return null;
  }
}
