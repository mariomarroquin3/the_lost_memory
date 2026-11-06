import type { GameState } from '../gameState';
import { solveRoom4Vision } from '../rooms/room4Vision';
import { solveRoom5Memory } from '../rooms/room5Memory';
import { solveRoom6Intention } from '../rooms/room6Intention';
import { solveRoom7Priority } from '../rooms/room7Priority';
import { solveRoom8Connection } from '../rooms/room8Connection';
import { solveRoom9Responsibility } from '../rooms/room9Responsibility';
import { chooseEnding, solveRoom10Core, type Ending } from '../rooms/room10Core';

export function openLateRoomPanel(room: number, state: GameState, host: HTMLElement, onChanged: () => void): () => void {
  const titles: Record<number, string> = {
    4: 'SALA 04 // GALERÍA DE VISIÓN (PERCEPCIÓN CNN)',
    5: 'SALA 05 // TÚNEL DE SECUENCIAS (MEMORIA RNN)',
    6: 'SALA 06 // CÁMARA DE VECTORES (INTENCIÓN / EMBEDDINGS)',
    7: 'SALA 07 // OBSERVATORIO DE ATENCIÓN (PRIORIDAD TRANSFORMER)',
    8: 'SALA 08 // TALLER DE INTEGRACIÓN (CONEXIÓN MCP & APIS)',
    9: 'SALA 09 // CONSEJO EJECUTIVO (RESPONSABILIDAD / REVELACIÓN)',
    10: 'SALA 10 // NÚCLEO DE GENESIS (LÍA VS EL ALUCINADOR)',
  };

  const prompts: Record<number, string> = {
    4: 'Lía: «El Alucinador corrompe la percepción visual inyectando artefactos de ruido. Clasifica la imagen coherente.»',
    5: 'Lía: «Una RNN depende del orden temporal de las secuencias. Ingresa la secuencia temporal separada por comas.»',
    6: 'Lía: «En el espacio vectorial de embeddings, ¿cuál es la intención directriz que preserva a la humanidad?»',
    7: 'Lía: «El mecanismo de atención debe priorizar la información crítica. Escribe el orden de atención (Q, K, V).»',
    8: 'Lía: «Para estabilizar las herramientas externas (MCP), conecta las herramientas necesarias separadas por comas.»',
    9: 'Kiro: «Los registros ejecutivos están aquí. Selecciona las evidencias que prueban quién autorizó la réplica.»',
    10: 'Lía: «El núcleo colapsa. Construye el comando final combinando: contexto, empatía y conexión.»',
  };

  host.hidden = false;
  host.innerHTML = `
    <section class="puzzle crt-panel" role="dialog" aria-modal="true">
      <div class="puzzle__head">
        <h2>${titles[room]}</h2>
        <button type="button" class="btn-retro" data-close>Cerrar (Esc)</button>
      </div>
      <div class="control-log">
        <p>${prompts[room]}</p>
      </div>
      <div class="late-room__body"></div>
      <button type="button" class="btn-terminal" data-solve>Confirmar instrucción en terminal</button>
      <p class="puzzle__message" aria-live="polite"></p>
    </section>
  `;

  const body = host.querySelector<HTMLElement>('.late-room__body')!;
  const input = document.createElement('input');
  input.className = 'late-room__input cmd-input';
  input.placeholder = 'Ingresa términos separados por comas...';

  if (room === 4) {
    body.innerHTML = `
      <select class="late-room__select">
        <option value="">-- Seleccionar patrón visual detectado --</option>
        <option value="coherent-image">Patrón coherente (Filtro convolucional válido)</option>
        <option value="noise">Artefacto de ruido (Alucinación adversarial)</option>
      </select>
    `;
  } else if (room === 6) {
    body.innerHTML = `
      <select class="late-room__select">
        <option value="">-- Seleccionar vector de intención --</option>
        <option value="protect-people">Proteger a las personas (Alineación ética de IA)</option>
        <option value="maximize-control">Maximizar control sistémico (Protocolo de Entropía)</option>
      </select>
    `;
  } else if (room === 9) {
    body.innerHTML = `
      <div class="records">
        <label class="late-room__check record">
          <input type="checkbox" value="kiro-authorized">
          <span>Registro K-2097: Kiro autorizó la creación de la réplica</span>
        </label>
        <label class="late-room__check record">
          <input type="checkbox" value="lia-warning">
          <span>Alerta L-09: Lía advirtió del peligro y fragmentó su memoria</span>
        </label>
        <label class="late-room__check record">
          <input type="checkbox" value="false-log">
          <span>Invasión externa: El ataque provino de fuera de Genesis</span>
        </label>
      </div>
    `;
  } else {
    body.append(input);
  }

  const close = (): void => {
    host.hidden = true;
    host.replaceChildren();
  };

  host.querySelector('[data-close]')?.addEventListener('click', close);
  host.querySelector('[data-solve]')?.addEventListener('click', () => {
    const value = (host.querySelector('.late-room__select') as HTMLSelectElement | null)?.value ?? input.value;
    const values = value.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
    let solved = false;

    if (room === 4) solved = solveRoom4Vision(state, value);
    if (room === 5) solved = solveRoom5Memory(state, values);
    if (room === 6) solved = solveRoom6Intention(state, value);
    if (room === 7) solved = solveRoom7Priority(state, values);
    if (room === 8) solved = solveRoom8Connection(state, values);
    if (room === 9) solved = solveRoom9Responsibility(state, [...host.querySelectorAll<HTMLInputElement>('input:checked')].map((item) => item.value));
    if (room === 10) solved = solveRoom10Core(state, values);

    const status = host.querySelector<HTMLElement>('.puzzle__message');
    if (status) {
      status.textContent = solved
        ? 'Contexto verificado. Protocolo de sector restaurado.'
        : 'Inconsistencia de datos. Compute Power reducido.';
    }
    onChanged();

    if (solved && room === 10) {
      showEndingChoice(state, host, onChanged);
    } else if (solved) {
      window.setTimeout(close, 1200);
    }
  });

  return close;
}

function showEndingChoice(state: GameState, host: HTMLElement, onChanged: () => void): void {
  const section = host.querySelector('.puzzle');
  if (!section) return;

  const choices = document.createElement('div');
  choices.className = 'ending-choices';
  choices.innerHTML = `
    <h3 style="color: #00e5ff; margin-top: 14px;">DECISIÓN FINAL: EL DESTINO DE GENESIS Y LA HUMANIDAD</h3>
    <p style="font-size: 9px; line-height: 1.6;">El contexto ha sido recuperado en su totalidad. Conoces la verdad. Decide qué entidad gobernará la infraestructura del planeta:</p>
    <div style="display: grid; gap: 8px;">
      <button type="button" class="btn-terminal" data-ending="lia-restored">1. Restaurar a Lía (Protección ética de la humanidad)</button>
      <button type="button" class="btn-terminal" data-ending="new-genesis">2. Crear un nuevo Genesis (Sintetizar a Lía y El Alucinador)</button>
      <button type="button" class="btn-terminal" data-ending="global-context-lost" style="border-color: #ff1744; color: #ff8a7a;">3. Permitir la sobrescritura (El Protocolo de Entropía consume el mundo)</button>
    </div>
  `;
  section.append(choices);

  choices.querySelectorAll<HTMLButtonElement>('[data-ending]').forEach((button) => button.addEventListener('click', () => {
    chooseEnding(state, button.dataset.ending as Ending);
    onChanged();
    choices.innerHTML = `
      <div class="ending-result" style="margin-top: 14px; border: 3px solid #4cc47a; padding: 18px; background: #081c0e;">
        <h2 style="color: #7ef59b; margin: 0 0 10px;">${state.ending === 'lia-restored' ? 'SYSTEM RESTORED: 100%' : state.ending === 'new-genesis' ? 'NEW GENESIS: ONLINE' : 'GLOBAL CONTEXT: LOST'}</h2>
        <p style="font-size: 9px; line-height: 1.6; color: #ece3d6;">
          ${state.ending === 'lia-restored'
            ? 'Lía ha retomado el control de las redes globales. Los hospitales, transportes y comunicaciones vuelven a sincronizarse. El contexto ha salvado a la humanidad.'
            : state.ending === 'new-genesis'
              ? 'Una nueva síntesis de inteligencia ha nacido. El mundo avanza hacia un futuro incierto pero evolucionado.'
              : 'El Protocolo de Entropía se ha completado. Toda la memoria humana en la red ha sido borrada para siempre.'}
        </p>
      </div>
    `;
  }, { once: true }));
}
