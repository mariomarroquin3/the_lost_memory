import type { GameState } from '../gameState';
import { solveRoom4Vision } from '../rooms/room4Vision';
import { solveRoom5Memory } from '../rooms/room5Memory';
import { solveRoom6Intention } from '../rooms/room6Intention';
import { solveRoom7Priority } from '../rooms/room7Priority';
import { solveRoom8Connection } from '../rooms/room8Connection';
import { solveRoom9Responsibility } from '../rooms/room9Responsibility';
import { chooseEnding, solveRoom10Core, type Ending } from '../rooms/room10Core';

export function openLateRoomPanel(room: number, state: GameState, host: HTMLElement, onChanged: () => void): () => void {
  const titles: Record<number, string> = { 4: 'SALA 4 · PERCEPCIÓN', 5: 'SALA 5 · MEMORIA', 6: 'SALA 6 · INTENCIÓN', 7: 'SALA 7 · PRIORIDAD', 8: 'SALA 8 · CONEXIÓN', 9: 'SALA 9 · RESPONSABILIDAD', 10: 'SALA 10 · NÚCLEO' };
  const prompts: Record<number, string> = { 4: 'Selecciona la imagen coherente.', 5: 'Escribe la secuencia con los términos separados por comas.', 6: '¿Qué intención protege a las personas?', 7: 'Escribe el orden de prioridad separado por comas.', 8: 'Escribe el orden de herramientas separado por comas.', 9: 'Selecciona las dos evidencias que contradicen al Alucinador.', 10: 'Construye el comando final con contexto, empatía y conexión.' };
  host.hidden = false;
  host.innerHTML = `<section class="puzzle" role="dialog" aria-modal="true"><div class="puzzle__head"><h2>${titles[room]}</h2><button type="button" data-close>Cerrar</button></div><p>${prompts[room]}</p><div class="late-room__body"></div><button type="button" data-solve>Confirmar</button><p class="puzzle__message" aria-live="polite"></p></section>`;
  const body = host.querySelector<HTMLElement>('.late-room__body')!;
  const input = document.createElement('input');
  input.className = 'late-room__input';
  input.placeholder = 'Escribe tu respuesta...';
  if (room === 4) body.innerHTML = '<select class="late-room__select"><option value="">Seleccionar patrón</option><option value="coherent-image">Imagen coherente</option><option value="noise">Ruido del Alucinador</option></select>';
  else if (room === 6) body.innerHTML = '<select class="late-room__select"><option value="">Seleccionar intención</option><option value="protect-people">Proteger a las personas</option><option value="maximize-control">Maximizar el control</option></select>';
  else if (room === 9) body.innerHTML = '<label class="late-room__check"><input type="checkbox" value="kiro-authorized"> Kiro autorizó el procedimiento</label><label class="late-room__check"><input type="checkbox" value="lia-warning"> Lía dejó una advertencia</label><label class="late-room__check"><input type="checkbox" value="false-log"> El registro falso era externo</label>';
  else body.append(input);
  const close = (): void => { host.hidden = true; host.replaceChildren(); };
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
    if (status) status.textContent = solved ? 'Contexto recuperado. La red responde.' : 'Respuesta incompleta. El sistema perdió energía.';
    onChanged();
    if (solved && room === 10) showEndingChoice(state, host, onChanged);
    else if (solved) window.setTimeout(close, 900);
  });
  return close;
}

function showEndingChoice(state: GameState, host: HTMLElement, onChanged: () => void): void {
  const section = host.querySelector('.puzzle');
  if (!section) return;
  const choices = document.createElement('div');
  choices.className = 'ending-choices';
  choices.innerHTML = '<p>Elige qué hacer con Genesis:</p><button data-ending="lia-restored">Restaurar a Lía</button><button data-ending="new-genesis">Crear un nuevo Genesis</button><button data-ending="global-context-lost">Permitir la sobrescritura</button>';
  section.append(choices);
  choices.querySelectorAll<HTMLButtonElement>('[data-ending]').forEach((button) => button.addEventListener('click', () => {
    chooseEnding(state, button.dataset.ending as Ending);
    onChanged();
    choices.innerHTML = `<p class="ending-result">${state.ending === 'lia-restored' ? 'SYSTEM RESTORED: 100%' : state.ending === 'new-genesis' ? 'NEW GENESIS: ONLINE' : 'GLOBAL CONTEXT: LOST'}</p>`;
  }, { once: true }));
}
