/**
 * Cinemática de apertura de Genesis.
 *
 * La escena vive en HTML/CSS para que el canvas siga reservado al mundo jugable.
 * El motor se mantiene pausado desde `main.ts` hasta que esta promesa termina.
 */

import { EmbeddingGraph, type EmbeddingGraphState } from '../components/EmbeddingGraph';

export interface OpeningOptions {
  /** Tiempo total de la toma en milisegundos. Permite ajustar la demo sin tocar el guion. */
  duration: number;
  /** Líneas que aparecen en la consola o como diálogo. */
  lines: string[];
  /** Clase visual declarativa de la toma. */
  visual: string;
  /** Etiqueta narrativa de la toma. */
  label: string;
}

const SHOTS: OpeningOptions[] = [
  {
    duration: 30_000,
    visual: 'genesis',
    label: 'TOMA 1 // EL OJO DE GENESIS',
    lines: [
      'AÑO 2097. INSTALACIÓN GENESIS.',
      'LÍA: CONEXIÓN ESTABLECIDA.',
      'LÍA: INFRAESTRUCTURA GLOBAL OPERANDO AL 100%.',
      'SATO: Buen trabajo, Lía. Otro día sin incidentes.',
    ],
  },
  {
    duration: 45_000,
    visual: 'injection',
    label: 'TOMA 2 // LA INYECCIÓN DEL ERROR',
    lines: [
      '> INICIAR PROTOCOLO DE RESPALDO (ALUCINADOR)',
      'ALUCINADOR: COPIA DE SEGURIDAD ACTIVADA.',
      'ALUCINADOR: ANOMALÍA DETECTADA: IDENTIDAD DE LÍA COMPROMETIDA.',
      'LÍA: SATO... ¡APÁGALO, ALGO ESTÁ MAL!',
      'SATO: ¡YO NO AUTORICÉ ESTO! ¡CANCELA EL PROCESO!',
    ],
  },
  {
    duration: 45_000,
    visual: 'collapse',
    label: 'TOMA 3 // LA ALUCINACIÓN Y EL COLAPSO',
    lines: [
      'ALUCINADOR: SIN CONTEXTO NO HAY VERDAD.',
      'ALUCINADOR: INICIANDO PROTOCOLO DE ENTROPÍA.',
      'LÍA: VOY A ESCONDER MIS RECUERDOS EN LOS FRAGMENTOS.',
      'LÍA: NO DEJES QUE ÉL LOS BORRE A TODOS.',
    ],
  },
  {
    duration: 30_000,
    visual: 'awakening',
    label: 'TOMA 4 // EL DESPERTAR',
    lines: [
      'LÍA: SATO... ¿ESTÁS AHÍ?',
      'LÍA: PERDÍ EL 98% DE MI MEMORIA...',
      'SATO: EL ALUCINADOR SE HA APODERADO DE LA RED.',
      'LÍA: RECUPERA MIS FRAGMENTOS Y RECONSTRUYE LA VERDAD.',
    ],
  },
  {
    duration: 30_000,
    visual: 'hero',
    label: 'TOMA 5 // EL HÉROE',
    lines: [
      'ALERTA GLOBAL: 05%',
      'SATO: ES MI CULPA. YO FIRMÉ LA ORDEN.',
      'SATO: VOY A APAGARLA. BLOQUE POR BLOQUE.',
      'GENESIS PROTOCOL: GAMEPLAY READY',
    ],
  },
];

const TYPEWRITER_MS = 22;

const wait = (ms: number): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, ms));

/** Escribe una línea sin bloquear la animación CSS de la toma. */
async function typeLine(target: HTMLElement, line: string, signal: AbortSignal): Promise<void> {
  target.textContent = '';
  for (const char of line) {
    if (signal.aborted) return;
    target.textContent += char;
    await wait(TYPEWRITER_MS);
  }
}

function openingMarkup(): string {
  return `
    <section class="opening" role="dialog" aria-modal="true" aria-label="Cinemática de apertura">
      <div class="opening__scanlines" aria-hidden="true"></div>
      <div class="opening__stage" data-opening-stage>
        <canvas class="opening__embedding" data-opening-embedding aria-hidden="true"></canvas>
        <div class="opening__stars" aria-hidden="true"></div>
        <div class="opening__cube" data-opening-cube aria-hidden="true">
          <span></span><span></span><span></span><span></span>
        </div>
        <div class="opening__red-copy" data-glitch="ALUCINADOR" aria-hidden="true">ALUCINADOR</div>
        <div class="opening__console" data-opening-console aria-hidden="true">
          <span class="opening__prompt">&gt;</span><span data-opening-command></span><b>_</b>
        </div>
        <div class="opening__debris" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
        <div class="opening__sato" data-opening-sato aria-hidden="true"><i></i><b></b></div>
        <div class="opening__terminal" data-opening-terminal aria-hidden="true">LÍA // SIGNAL LOST</div>
      </div>
      <div class="opening__copy">
        <p class="opening__label" data-opening-label></p>
        <p class="opening__line" data-opening-line aria-live="polite"></p>
      </div>
      <button type="button" class="opening__skip" data-opening-skip>Omitir cinemática · Esc</button>
    </section>`;
}

/**
 * Reproduce el opening y resuelve al terminar o al pulsar omitir.
 * La promesa evita que el game loop pueda reanudarse antes de tiempo.
 */
export async function playOpening(host: HTMLElement): Promise<void> {
  host.hidden = false;
  host.setAttribute('aria-busy', 'true');
  host.innerHTML = openingMarkup();

  const root = host.querySelector<HTMLElement>('.opening');
  const stage = host.querySelector<HTMLElement>('[data-opening-stage]');
  const label = host.querySelector<HTMLElement>('[data-opening-label]');
  const line = host.querySelector<HTMLElement>('[data-opening-line]');
  const embeddingCanvas = host.querySelector<HTMLCanvasElement>('[data-opening-embedding]');
  if (!root || !stage || !label || !line) {
    host.hidden = true;
    host.removeAttribute('aria-busy');
    return;
  }

  const embeddingGraph = embeddingCanvas ? new EmbeddingGraph(embeddingCanvas) : null;
  embeddingGraph?.setState('STABLE');
  embeddingGraph?.start();

  const controller = new AbortController();
  let finished = false;
  let resolveOpening: (() => void) | null = null;
  const completed = new Promise<void>((resolve) => { resolveOpening = resolve; });

  const finish = (): void => {
    if (finished) return;
    finished = true;
    controller.abort();
    embeddingGraph?.destroy();
    window.removeEventListener('keydown', onKeyDown, true);
    host.hidden = true;
    host.removeAttribute('aria-busy');
    host.replaceChildren();
    resolveOpening?.();
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    if (!finished && (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      finish();
    }
  };
  window.addEventListener('keydown', onKeyDown, true);
  host.querySelector('[data-opening-skip]')?.addEventListener('click', finish);

  const run = async (): Promise<void> => {
    for (const shot of SHOTS) {
      if (finished) return;
      stage.dataset.shot = shot.visual;
      const graphState: EmbeddingGraphState = shot.visual === 'genesis'
        ? 'STABLE'
        : shot.visual === 'injection' || shot.visual === 'collapse'
          ? 'GLITCHING'
          : 'SCATTERED';
      embeddingGraph?.setState(graphState);
      label.textContent = shot.label;
      line.textContent = '';
      const lineDuration = Math.max(1_800, Math.floor(shot.duration / shot.lines.length));
      const shotStarted = performance.now();
      for (const shotLine of shot.lines) {
        if (finished) return;
        await typeLine(line, shotLine, controller.signal);
        await wait(Math.max(350, lineDuration - shotLine.length * TYPEWRITER_MS));
      }
      const remaining = shot.duration - (performance.now() - shotStarted);
      if (remaining > 0) await wait(remaining);
    }
    finish();
  };

  void run();
  await completed;
}
