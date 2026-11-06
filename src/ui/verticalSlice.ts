import type { GameState } from '../gameState';
import { solvePromptPuzzle } from '../puzzles/promptPuzzle';
import { solveRoom2Archives } from '../rooms/room2Archives';
import { solveRoom3FrozenLab } from '../rooms/room3FrozenLab';

type ClosePanel = () => void;

function shell(title: string, body: string): string {
  return `<section class="puzzle" role="dialog" aria-modal="true"><div class="puzzle__head"><h2>${title}</h2><button type="button" data-close>Cerrar</button></div>${body}<p class="puzzle__message" aria-live="polite"></p></section>`;
}

function finish(host: HTMLElement, close: ClosePanel, message: string, solved: boolean): void {
  const status = host.querySelector<HTMLElement>('.puzzle__message');
  if (status) status.textContent = message;
  if (solved) host.querySelectorAll('button').forEach((button) => (button.disabled = true));
  if (solved) window.setTimeout(close, 900);
}

export function openRoom2Panel(state: GameState, host: HTMLElement, onChanged: () => void): ClosePanel {
  host.hidden = false;
  host.innerHTML = shell('ARCHIVO DE DATOS', `
    <p>Ada: «Ordena los registros. El Alucinador insertó una fecha imposible.»</p>
    <div class="connection-grid">
      ${['a', 'b', 'c'].map((key) => `<label>Archivo ${key.toUpperCase()}<select data-key="${key}"><option value="">Seleccionar fecha</option><option>2097-04-17 03:12</option><option>2097-04-17 03:13</option><option>2097-04-17 03:15</option><option>2097-99-99 99:99</option></select></label>`).join('')}
    </div>
    <button type="button" data-solve>Reconstruir secuencia</button>
  `);
  const close = (): void => { host.hidden = true; host.replaceChildren(); };
  host.querySelector('[data-close]')?.addEventListener('click', close);
  host.querySelector('[data-solve]')?.addEventListener('click', () => {
    const answer: Record<string, string> = {};
    host.querySelectorAll<HTMLSelectElement>('select[data-key]').forEach((select) => (answer[select.dataset.key!] = select.value));
    const solved = solveRoom2Archives(state, answer);
    finish(host, close, solved ? 'Fragmento Verdad recuperado.' : 'La secuencia no coincide. Compute Power -7.', solved);
    onChanged();
  });
  return close;
}

export function openRoom3Panel(state: GameState, host: HTMLElement, onChanged: () => void): ClosePanel {
  host.hidden = false;
  host.innerHTML = shell('LABORATORIO CONGELADO', `
    <p>Rosen: «Un sistema sin contexto aprende patrones incorrectos. Selecciona los conceptos necesarios.»</p>
    <div class="prompt-choices">
      ${['contexto', 'datos completos', 'ruido', 'memoria', 'azar'].map((term) => `<label><input type="checkbox" value="${term}"> ${term}</label>`).join('')}
    </div>
    <button type="button" data-solve>Entrenar modelo</button>
  `);
  const close = (): void => { host.hidden = true; host.replaceChildren(); };
  host.querySelector('[data-close]')?.addEventListener('click', close);
  host.querySelector('[data-solve]')?.addEventListener('click', () => {
    const selected = [...host.querySelectorAll<HTMLInputElement>('input:checked')].map((input) => input.value);
    const solved = solvePromptPuzzle(state, { id: 'room-3-frozen-lab', requiredTerms: ['contexto', 'datos completos'] }, selected);
    if (solved && !state.fragments.includes('Aprendizaje')) state.fragments.push('Aprendizaje');
    finish(host, close, solved ? 'Fragmento Aprendizaje recuperado.' : 'El modelo aprendió ruido. Compute Power -10.', solved);
    onChanged();
  });
  return close;
}
