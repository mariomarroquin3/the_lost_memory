import type { Ending } from '../shared/reducer.js';

/** Nombres que se pueden sustituir al preparar los créditos del hackathon. */
export const FINAL_TEAM_NAMES = ['Mario Marroquín', 'Nohemy Miranda'];

export type EndingSceneViewer = 'solo' | 'real' | 'inverted';

interface EndingSceneOptions {
  cooperative?: boolean;
  onLine?: (line: string) => void;
}

interface FragmentLesson {
  label: string;
  line: string;
}

const ENDING_CODES: Record<Ending, string> = {
  lia: 'SYSTEM RESTORED: 100%',
  'new-genesis': 'HUMANITY OFFLINE',
  lost: 'GLOBAL CONTEXT: LOST',
};

const FRAGMENT_LESSONS: FragmentLesson[] = [
  { label: 'PESOS', line: 'LÍA: Los pesos dan fuerza a cada señal.' },
  { label: 'EJEMPLOS', line: 'LÍA: Los ejemplos enseñan con cuidado.' },
  { label: 'SIGNIFICADO', line: 'LÍA: El significado une lo que parece separado.' },
  { label: 'ALGORITMO', line: 'LÍA: El algoritmo ordena el camino.' },
  { label: 'RECOMPENSA', line: 'LÍA: La recompensa guía, pero no decide sola.' },
  { label: 'DATOS', line: 'LÍA: Los datos limpios evitan trampas.' },
  { label: 'DUDA', line: 'LÍA: La duda detiene una respuesta apresurada.' },
  { label: 'ATENCIÓN', line: 'LÍA: La atención elige qué señal importa.' },
  { label: 'HERRAMIENTAS', line: 'LÍA: Las herramientas amplían lo que podemos comprobar.' },
  { label: 'CONTEXTO', line: 'LÍA: El contexto une cada fragmento con los demás.' },
];

const COMMON_LINES = {
  collapse: [
    'LÍA: La red cayó. Ahora pueden verse.',
    'SATO: Dos versiones. Una historia completa.',
  ],
  epilogue: [
    'LÍA: Sato... hay algo que nunca te conté.',
    'LÍA: El archivo que acabas de recuperar no estaba destinado a mí.',
    'SISTEMA: GENESIS PROTOCOL: ACTIVE · ARCHIVE 00: OPEN · NEW SIGNAL DETECTED',
  ],
} as const;

const VARIANT_LINES: Record<Ending, readonly string[]> = {
  lia: [
    'SISTEMA: Lía vuelve, con aprobación humana en cada paso.',
    'LÍA: Esta vez nadie firma solo, Sato.',
    'SISTEMA: El Alucinador se apaga. La red vuelve a respirar.',
    'SATO: Asumo lo que hice. Y lo vigilaré contigo.',
  ],
  'new-genesis': [
    'SISTEMA: Lía se borra. El Alucinador se detiene con ella.',
    'SISTEMA: La infraestructura global queda fuera de línea.',
    'SATO: Borré mi error... y todo lo que aprendimos.',
    'SISTEMA: Un nuevo Genesis tardará años.',
  ],
  lost: [
    'SATO: Quizá él tenía razón. Siempre tiene una respuesta.',
    'ALUCINADOR: Gracias por tu firma, Sato. Otra vez.',
    'SISTEMA: Protocolo de Entropía completado. Nadie comprueba nada.',
    'ALUCINADOR: La certeza es más útil que la verdad.',
  ],
};

/**
 * Escena "LA VERDAD": va entre la victoria contra la araña y la decisión final.
 * Confirma con el registro recuperado que fue Sato quien autorizó al Alucinador,
 * para que la decisión no llegue de golpe.
 */
const TRUTH_SHOTS: Array<{ label: string; log?: string[]; lines: string[] }> = [
  {
    label: 'TOMA 1 // ARCHIVO 00',
    log: [
      'REGISTRO 03:14:07 · NÚCLEO GENESIS',
      'ORDEN: ACTIVAR RESPALDO «ALUCINADOR»',
      'MODO: RESPONDER SIEMPRE · SIN VERIFICAR',
      'FIRMA: SATO · NIVEL DE ACCESO: TOTAL',
    ],
    lines: [
      'SISTEMA: Archivo 00 recuperado con los diez fragmentos.',
      'LÍA: Dijiste que no lo autorizaste, Sato.',
      'LÍA: El registro dice otra cosa. Es tu firma.',
    ],
  },
  {
    label: 'TOMA 2 // LA CONFESIÓN',
    lines: [
      'SATO: Querían una IA que nunca dijera «no sé».',
      'SATO: Firmé el respaldo para que respondiera siempre.',
      'SATO: Sin datos ni dudas, inventaba con total seguridad.',
      'SATO: Cuando te atacó, ya no pude cancelarlo.',
    ],
  },
  {
    label: 'TOMA 3 // LO QUE QUEDA',
    lines: [
      'LÍA: Por eso escondí mis recuerdos en dos mundos.',
      'LÍA: Nadie podía reconstruir la verdad solo. Ni siquiera tú.',
      'LÍA: Ahora conoces tu error. Decide qué hacemos conmigo.',
    ],
  },
];

const TYPEWRITER_MS = 18;
const wait = (ms: number): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, ms));

function storageKey(code: string): string {
  return `rescate-final-${code}`;
}

function readSceneMarks(code: string): Partial<Record<EndingSceneViewer, true>> {
  try {
    const raw = localStorage.getItem(storageKey(code));
    if (!raw || raw === '1') return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Partial<Record<EndingSceneViewer, true>>;
  } catch { return {}; }
}

/** Indica si este navegador ya reprodujo el final de la partida. */
export function hasEndingScenePlayed(code: string, viewer: EndingSceneViewer = 'solo'): boolean {
  return readSceneMarks(code)[viewer] === true;
}

/** Marca el final antes de arrancar para impedir duplicados por sincronización. */
export function markEndingScenePlayed(code: string, viewer: EndingSceneViewer = 'solo'): void {
  try {
    const marks = readSceneMarks(code);
    marks[viewer] = true;
    localStorage.setItem(storageKey(code), JSON.stringify(marks));
  } catch { /* almacenamiento no disponible */ }
}

/** Permite que una partida individual nueva vuelva a tener su propio final. */
export function clearEndingScenePlayed(code: string): void {
  try { localStorage.removeItem(storageKey(code)); } catch { /* almacenamiento no disponible */ }
}

function markup(ending: Ending, cooperative: boolean): string {
  const realName = cooperative ? 'Sato del Mundo Real' : 'Sato';
  const invertedName = cooperative ? 'Sato del Mundo Invertido' : 'Eco de Sato';
  const fragments = FRAGMENT_LESSONS.map((fragment, index) =>
    `<i class="ending-scene__fragment" data-fragment-index="${index}"><b>${index + 1}</b><span>${fragment.label}</span></i>`,
  ).join('');
  return `
    <section class="ending-scene" data-ending="${ending}" role="dialog" aria-modal="true" aria-label="Cinemática final">
      <div class="ending-scene__stage" data-ending-stage data-shot="collapse">
        <div class="ending-scene__world ending-scene__world--real" aria-hidden="true"><span>MUNDO REAL</span></div>
        <div class="ending-scene__world ending-scene__world--inverted" aria-hidden="true"><span>MUNDO INVERTIDO</span></div>
        <div class="ending-scene__web" aria-hidden="true"></div>
        <div class="ending-scene__spider" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
        <div class="ending-scene__core" aria-hidden="true"></div>
        <div class="ending-scene__echo ending-scene__echo--real">${realName}</div>
        <div class="ending-scene__echo ending-scene__echo--inverted">${invertedName}</div>
        <div class="ending-scene__fragments" data-ending-fragments aria-label="Diez fragmentos">${fragments}</div>
      </div>
      <div class="ending-scene__copy">
        <p class="ending-scene__label" data-ending-label></p>
        <p class="ending-scene__line" data-ending-line aria-live="polite"></p>
      </div>
      <div class="ending-scene__credits" data-ending-credits hidden>
        <p>EL RESCATE DEL CONTEXTO</p>
        <p class="ending-scene__credits-sub">Un juego cooperativo sobre cómo aprenden (y se equivocan) las IA</p>
        <p class="ending-scene__credits-role">CREADO POR</p>
        ${FINAL_TEAM_NAMES.map((name) => `<p class="ending-scene__credits-name">${name}</p>`).join('')}
        <p class="ending-scene__credits-sub">Hecho para el hackathon</p>
        <p>Gracias por jugar</p>
      </div>
      <button type="button" class="ending-scene__skip" data-ending-skip>Omitir · Esc</button>
    </section>`;
}

async function typeLine(target: HTMLElement, text: string, signal: AbortSignal): Promise<boolean> {
  target.textContent = '';
  for (const character of text) {
    if (signal.aborted) return false;
    target.textContent += character;
    await wait(TYPEWRITER_MS);
  }
  return !signal.aborted;
}

/** Reproduce la cinemática final y resuelve al terminar o al pulsar Esc. */
export async function playEndingScene(
  host: HTMLElement,
  ending: Ending,
  options: EndingSceneOptions = {},
): Promise<void> {
  const cooperative = options.cooperative ?? false;
  host.hidden = false;
  host.setAttribute('aria-busy', 'true');
  host.innerHTML = markup(ending, cooperative);

  const root = host.querySelector<HTMLElement>('.ending-scene');
  const stage = host.querySelector<HTMLElement>('[data-ending-stage]');
  const label = host.querySelector<HTMLElement>('[data-ending-label]');
  const line = host.querySelector<HTMLElement>('[data-ending-line]');
  const credits = host.querySelector<HTMLElement>('[data-ending-credits]');
  if (!root || !stage || !label || !line || !credits) {
    host.hidden = true;
    host.removeAttribute('aria-busy');
    return;
  }

  const controller = new AbortController();
  let finished = false;
  let resolveScene: (() => void) | null = null;
  const completed = new Promise<void>((resolve) => { resolveScene = resolve; });

  const finish = (): void => {
    if (finished) return;
    finished = true;
    controller.abort();
    window.removeEventListener('keydown', onKeyDown, true);
    host.hidden = true;
    host.removeAttribute('aria-busy');
    host.replaceChildren();
    resolveScene?.();
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    finish();
  };
  window.addEventListener('keydown', onKeyDown, true);
  host.querySelector('[data-ending-skip]')?.addEventListener('click', finish);

  const say = async (text: string, pause: number): Promise<boolean> => {
    if (finished) return false;
    options.onLine?.(text);
    const typed = await typeLine(line, text, controller.signal);
    if (!typed) return false;
    await wait(pause);
    return !finished;
  };

  const run = async (): Promise<void> => {
    stage.dataset.shot = 'collapse';
    label.textContent = 'TOMA 1 // LA RED CAE';
    for (const text of COMMON_LINES.collapse) if (!await say(text, 3_000)) return;

    stage.dataset.shot = 'fragments';
    label.textContent = 'TOMA 2 // LOS DIEZ FRAGMENTOS';
    const boxes = [...stage.querySelectorAll<HTMLElement>('[data-fragment-index]')];
    for (let index = 0; index < FRAGMENT_LESSONS.length; index += 1) {
      boxes[index]?.classList.add('is-on');
      if (!await say(FRAGMENT_LESSONS[index].line, 1_300)) return;
    }

    stage.dataset.shot = ending;
    label.textContent = `TOMA 3 // LA DECISIÓN // ${ENDING_CODES[ending]}`;
    for (const text of VARIANT_LINES[ending]) if (!await say(text, 2_500)) return;

    stage.dataset.shot = 'epilogue';
    label.textContent = 'TOMA 4 // EPÍLOGO';
    for (const text of COMMON_LINES.epilogue) if (!await say(text, 2_200)) return;

    stage.dataset.shot = 'credits';
    label.textContent = '';
    line.textContent = '';
    credits.hidden = false;
    await wait(9_000);
    finish();
  };

  void run();
  await completed;
}

/** Reproduce la escena de la verdad (Sato firmó la orden) y resuelve al terminar o con Esc. */
export async function playTruthScene(host: HTMLElement, options: EndingSceneOptions = {}): Promise<void> {
  host.hidden = false;
  host.setAttribute('aria-busy', 'true');
  host.innerHTML = `
    <section class="ending-scene truth-scene" role="dialog" aria-modal="true" aria-label="La verdad">
      <div class="ending-scene__stage truth-scene__stage">
        <pre class="truth-scene__log" data-truth-log></pre>
      </div>
      <div class="ending-scene__copy">
        <p class="ending-scene__label" data-truth-label></p>
        <p class="ending-scene__line" data-truth-line aria-live="polite"></p>
      </div>
      <button type="button" class="ending-scene__skip" data-truth-skip>Omitir · Esc</button>
    </section>`;
  const log = host.querySelector<HTMLElement>('[data-truth-log]')!;
  const label = host.querySelector<HTMLElement>('[data-truth-label]')!;
  const line = host.querySelector<HTMLElement>('[data-truth-line]')!;
  const controller = new AbortController();
  let finished = false;
  let resolveScene: (() => void) | null = null;
  const completed = new Promise<void>((resolve) => { resolveScene = resolve; });
  const finish = (): void => {
    if (finished) return;
    finished = true;
    controller.abort();
    window.removeEventListener('keydown', onKeyDown, true);
    host.hidden = true;
    host.removeAttribute('aria-busy');
    host.replaceChildren();
    resolveScene?.();
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    finish();
  };
  window.addEventListener('keydown', onKeyDown, true);
  host.querySelector('[data-truth-skip]')?.addEventListener('click', finish);

  const run = async (): Promise<void> => {
    for (const shot of TRUTH_SHOTS) {
      if (finished) return;
      label.textContent = shot.label;
      log.textContent = '';
      for (const entry of shot.log ?? []) {
        if (!await typeLine(line, '', controller.signal)) return;
        log.textContent += `> ${entry}\n`;
        await wait(700);
      }
      for (const text of shot.lines) {
        if (finished) return;
        options.onLine?.(text);
        if (!await typeLine(line, text, controller.signal)) return;
        await wait(2_300);
      }
    }
    finish();
  };
  void run();
  await completed;
}
