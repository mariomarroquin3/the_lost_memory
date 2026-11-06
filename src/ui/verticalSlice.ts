import type { GameState } from '../gameState';
import { solvePromptPuzzle } from '../puzzles/promptPuzzle';
import { solveRoom2Archives } from '../rooms/room2Archives';
import { solveRoom3FrozenLab } from '../rooms/room3FrozenLab';

type ClosePanel = () => void;

function shell(title: string, body: string): string {
  return `
    <section class="puzzle crt-panel" role="dialog" aria-modal="true">
      <div class="puzzle__head">
        <h2>${title}</h2>
        <button type="button" class="btn-retro" data-close>Cerrar (Esc)</button>
      </div>
      ${body}
      <p class="puzzle__message" aria-live="polite"></p>
    </section>
  `;
}

function finish(host: HTMLElement, close: ClosePanel, message: string, solved: boolean): void {
  const status = host.querySelector<HTMLElement>('.puzzle__message');
  if (status) status.textContent = message;
  if (solved) host.querySelectorAll('button').forEach((button) => (button.disabled = true));
  if (solved) window.setTimeout(close, 1200);
}

export function openRoom2Panel(state: GameState, host: HTMLElement, onChanged: () => void): ClosePanel {
  host.hidden = false;
  host.innerHTML = shell('ARCHIVO DE DATOS // BIBLIOTECA DIGITAL', `
    <div class="control-log">
      <span class="log-label">ADA (ARCHIVISTA DE GENESIS):</span>
      <p>«El Alucinador alteró la línea temporal de los archivos. Reconstruye la secuencia cronológica auténtica para validar el fragmento de la Verdad.»</p>
    </div>
    <div class="connection-grid">
      ${['a', 'b', 'c'].map((key) => `
        <label>
          <span>Archivo ${key.toUpperCase()}:</span>
          <select data-key="${key}" class="late-room__select">
            <option value="">-- Seleccionar marca de tiempo --</option>
            <option>2097-04-17 03:12</option>
            <option>2097-04-17 03:13</option>
            <option>2097-04-17 03:15</option>
            <option>2097-99-99 99:99</option>
          </select>
        </label>
      `).join('')}
    </div>
    <button type="button" class="btn-terminal" data-solve>Reconstruir secuencia cronológica</button>
  `);

  const close = (): void => { host.hidden = true; host.replaceChildren(); };
  host.querySelector('[data-close]')?.addEventListener('click', close);
  host.querySelector('[data-solve]')?.addEventListener('click', () => {
    const answer: Record<string, string> = {};
    host.querySelectorAll<HTMLSelectElement>('select[data-key]').forEach((select) => (answer[select.dataset.key!] = select.value));
    const solved = solveRoom2Archives(state, answer);
    finish(host, close, solved ? 'Secuencia verificada. Fragmento Verdad recuperado.' : 'La cronología es inconsistente. Compute Power -7.', solved);
    onChanged();
  });
  return close;
}

export function openRoom3Panel(state: GameState, host: HTMLElement, onChanged: () => void): ClosePanel {
  host.hidden = false;
  host.innerHTML = shell('LABORATORIO CONGELADO // RED NEURONAL', `
    <div class="control-log">
      <span class="log-label">SIMULACIÓN DR. ROSEN (ML CORE):</span>
      <p>«Un modelo de IA sin contexto o entrenado con ruido alucina patrones destructivos. Selecciona los componentes esenciales para entrenar la red correctamente.»</p>
    </div>
    <div class="prompt-choices">
      ${['contexto', 'datos completos', 'ruido', 'memoria', 'azar'].map((term) => `
        <label class="prompt-choice-label">
          <input type="checkbox" value="${term}">
          <span>${term.toUpperCase()}</span>
        </label>
      `).join('')}
    </div>
    <button type="button" class="btn-terminal" data-solve>Compilar modelo de red neuronal</button>
  `);

  const close = (): void => { host.hidden = true; host.replaceChildren(); };
  host.querySelector('[data-close]')?.addEventListener('click', close);
  host.querySelector('[data-solve]')?.addEventListener('click', () => {
    const selected = [...host.querySelectorAll<HTMLInputElement>('input:checked')].map((input) => input.value);
    const solved = solvePromptPuzzle(state, { id: 'room-3-frozen-lab', requiredTerms: ['contexto', 'datos completos'] }, selected);
    if (solved && !state.fragments.includes('Aprendizaje')) state.fragments.push('Aprendizaje');
    finish(host, close, solved ? 'Entrenamiento exitoso. Fragmento Aprendizaje recuperado.' : 'El modelo sobreajustó con ruido. Compute Power -10.', solved);
    onChanged();
  });
  return close;
}
