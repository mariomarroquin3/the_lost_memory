interface BossShot {
  duration: number;
  visual: 'web' | 'direction' | 'threat';
  label: string;
  lines: string[];
}

const SHOTS: BossShot[] = [
  {
    duration: 10_000,
    visual: 'web',
    label: 'TOMA 1 // LA RED SOBRE LÍA',
    lines: [
      'LÍA: Los diez fragmentos despertaron al Alucinador.',
      'LÍA: Su red falsa cubre mi núcleo de memoria.',
      'SATO: ¿Cómo rompemos esa red?',
      'LÍA: Conservad la dirección correcta.',
    ],
  },
  {
    duration: 10_000,
    visual: 'direction',
    label: 'TOMA 2 // DIRECCIÓN, NO TAMAÑO',
    lines: [
      'LÍA: Un vector grande y su versión pequeña pueden apuntar igual.',
      'LÍA: Divide cada número entre la longitud del vector.',
      'SATO: La longitud es raíz de x² más y².',
      'LÍA: Pasad el vector y apuntad el escudo.',
    ],
  },
  {
    duration: 10_000,
    visual: 'threat',
    label: 'TOMA 3 // LA ÚLTIMA DEFENSA',
    lines: [
      'ALUCINADOR: La dirección también puede llevaros al vacío.',
      'LÍA: Si falla el escudo, la red avanzará.',
      'SATO: Cada uno ve la pata que ataca al otro. A la vez.',
      'LÍA: Romped sus ocho patas y recuperaré mi memoria.',
    ],
  },
];

const wait = (ms: number): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, ms));

async function typeLine(target: HTMLElement, text: string, signal: AbortSignal): Promise<void> {
  target.textContent = '';
  for (const character of text) {
    if (signal.aborted) return;
    target.textContent += character;
    await wait(18);
  }
}

function markup(): string {
  return `
    <section class="boss-opening" role="dialog" aria-modal="true" aria-label="Jefe final">
      <div class="boss-opening__stage" data-boss-stage>
        <div class="boss-opening__core" aria-hidden="true"></div>
        <div class="boss-opening__web" aria-hidden="true"></div>
        <div class="boss-opening__spider" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      </div>
      <div class="boss-opening__copy">
        <p class="boss-opening__label" data-boss-label></p>
        <p class="boss-opening__line" data-boss-line aria-live="polite"></p>
      </div>
      <button type="button" class="boss-opening__skip" data-boss-skip>Omitir · Esc</button>
    </section>`;
}

/** Reproduce la escena previa del jefe y permite omitirla con Escape. */
export async function playBossOpening(host: HTMLElement, onLine?: (line: string) => void): Promise<void> {
  host.hidden = false;
  host.setAttribute('aria-busy', 'true');
  host.innerHTML = markup();
  const stage = host.querySelector<HTMLElement>('[data-boss-stage]');
  const label = host.querySelector<HTMLElement>('[data-boss-label]');
  const line = host.querySelector<HTMLElement>('[data-boss-line]');
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
  host.querySelector('[data-boss-skip]')?.addEventListener('click', finish);

  const run = async (): Promise<void> => {
    for (const shot of SHOTS) {
      if (finished) return;
      stage.dataset.shot = shot.visual;
      label.textContent = shot.label;
      const lineDuration = Math.max(900, Math.floor(shot.duration / shot.lines.length));
      const started = performance.now();
      for (const shotLine of shot.lines) {
        if (finished) return;
        onLine?.(shotLine);
        await typeLine(line, shotLine, controller.signal);
        await wait(Math.max(250, lineDuration - shotLine.length * 18));
      }
      const remaining = shot.duration - (performance.now() - started);
      if (remaining > 0) await wait(remaining);
    }
    finish();
  };
  void run();
  await completed;
}
