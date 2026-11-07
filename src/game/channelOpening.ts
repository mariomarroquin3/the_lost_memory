/** Cinemática breve que confirma el canal entre los dos mundos. */

interface ChannelShot {
  duration: number;
  visual: 'signal' | 'split' | 'clue' | 'interference';
  label: string;
  lines: string[];
}

const SHOTS: ChannelShot[] = [
  {
    duration: 12_000,
    visual: 'signal',
    label: 'TOMA 1 // LA PARED QUE RECUERDA',
    lines: [
      'LÍA: Este es el canal de emergencia que dejé antes del colapso.',
      'LÍA: Lo oculté para que el Alucinador no pudiera cortarlo.',
      'SATO: ¿La pared conecta nuestras dos salas?',
      'LÍA: Conecta lo que todavía podemos recordar.',
    ],
  },
  {
    duration: 13_000,
    visual: 'split',
    label: 'TOMA 2 // NINGUNA MITAD BASTA',
    lines: [
      'LÍA: Partí mis recuerdos entre los dos mundos.',
      'LÍA: Ninguna mitad contiene contexto suficiente para salvarme.',
      'LÍA: La verdad solo puede reconstruirse entre los dos.',
      'SATO: Entonces cada señal será una pieza del recuerdo.',
    ],
  },
  {
    duration: 12_000,
    visual: 'clue',
    label: 'TOMA 3 // LA PISTA AL OTRO LADO',
    lines: [
      'LÍA: Cada sala necesita un dato del otro lado.',
      'LÍA: Buscad el chip brillante en el suelo y leedlo con E.',
      'LÍA: Mandad mensajes cortos; repetidlos si llegan con errores.',
      'SATO: Si nos perdemos, seguiremos la línea del panel.',
    ],
  },
  {
    duration: 8_000,
    visual: 'interference',
    label: 'TOMA 4 // INTERFERENCIA',
    lines: [
      'ALUCINADOR: Una letra basta para cambiar lo que creéis saber.',
      'ALUCINADOR: Repetid vuestra verdad. Yo escucharé cada intento.',
      'LÍA: No le deis una mitad aislada. Reconstruid el contexto.',
      'LÍA: Canal abierto. Ahora, encontrad el primer fragmento.',
    ],
  },
];

const SYMBOLS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const TYPEWRITER_MS = 18;

const wait = (ms: number): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, ms));

async function typeLine(target: HTMLElement, text: string, signal: AbortSignal): Promise<void> {
  target.textContent = '';
  for (const character of text) {
    if (signal.aborted) return;
    target.textContent += character;
    await wait(TYPEWRITER_MS);
  }
}

function markup(): string {
  const bulbs = [...SYMBOLS].map((symbol, index) =>
    `<i class="channel-opening__bulb" data-bulb="${symbol}" style="--i:${index}">${symbol}</i>`,
  ).join('');
  return `
    <section class="channel-opening" role="dialog" aria-modal="true" aria-label="Canal abierto">
      <div class="channel-opening__stage" data-channel-stage>
        <div class="channel-opening__grid" aria-hidden="true">${bulbs}</div>
        <div class="channel-opening__link" aria-hidden="true"></div>
        <div class="channel-opening__chip" aria-hidden="true">S1 4 5 10</div>
        <div class="channel-opening__status" data-channel-status aria-hidden="true">CANAL ABIERTO</div>
      </div>
      <div class="channel-opening__copy">
        <p class="channel-opening__label" data-channel-label></p>
        <p class="channel-opening__line" data-channel-line aria-live="polite"></p>
      </div>
      <button type="button" class="channel-opening__skip" data-channel-skip>Omitir · Esc</button>
    </section>`;
}

/** Reproduce la confirmación del canal y resuelve al terminar o al omitirla. */
export async function playChannelOpening(host: HTMLElement): Promise<void> {
  host.hidden = false;
  host.setAttribute('aria-busy', 'true');
  host.innerHTML = markup();

  const stage = host.querySelector<HTMLElement>('[data-channel-stage]');
  const label = host.querySelector<HTMLElement>('[data-channel-label]');
  const line = host.querySelector<HTMLElement>('[data-channel-line]');
  if (!stage || !label || !line) {
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
  host.querySelector('[data-channel-skip]')?.addEventListener('click', finish);

  const run = async (): Promise<void> => {
    for (const shot of SHOTS) {
      if (finished) return;
      stage.dataset.shot = shot.visual;
      label.textContent = shot.label;
      line.textContent = '';
      const lineDuration = Math.max(900, Math.floor(shot.duration / shot.lines.length));
      const shotStarted = performance.now();
      for (const shotLine of shot.lines) {
        if (finished) return;
        await typeLine(line, shotLine, controller.signal);
        await wait(Math.max(250, lineDuration - shotLine.length * TYPEWRITER_MS));
      }
      const remaining = shot.duration - (performance.now() - shotStarted);
      if (remaining > 0) await wait(remaining);
    }
    finish();
  };

  void run();
  await completed;
}
