import type { GameState } from '../gameState';
import { solveRoom1Security } from '../rooms/room1Security';

const RECORDS = [
  '2097-04-17 03:12 · Operador: Kiro · Cierre manual',
  '2097-04-17 03:13 · Operador: Lía · Diagnóstico interno',
  '2097-99-99 99:99 · Operador: ??? · Sin origen verificable',
  '2097-04-17 03:15 · Operador: Lía · Bloqueo preventivo',
  '2097-04-17 03:16 · Operador: Genesis · Modo emergencia',
];

export function openRoom1Panel(state: GameState, host: HTMLElement, onSolved: () => void): () => void {
  host.hidden = false;
  host.innerHTML = `
    <section class="puzzle" role="dialog" aria-modal="true" aria-labelledby="room1-title">
      <div class="puzzle__head"><h2 id="room1-title">ESTACIÓN DE SEGURIDAD</h2><button type="button" data-close>Cerrar</button></div>
      <p>Lía: «Uno de estos registros no pertenece a Genesis. Elimina la anomalía para recuperar la puerta.»</p>
      <div class="records">${RECORDS.map((record, index) => `<button type="button" class="record" data-record="${index}">${record}</button>`).join('')}</div>
      <p class="puzzle__message" aria-live="polite"></p>
    </section>
  `;
  const close = (): void => {
    host.hidden = true;
    host.replaceChildren();
  };
  host.querySelector('[data-close]')?.addEventListener('click', close);
  host.querySelectorAll<HTMLButtonElement>('[data-record]').forEach((button) => {
    button.addEventListener('click', () => {
      const selected = Number(button.dataset.record);
      const result = solveRoom1Security(state, selected, 2);
      const message = host.querySelector('.puzzle__message');
      if (message) message.textContent = result.message;
      if (result.solved) {
        host.querySelectorAll<HTMLButtonElement>('.record').forEach((item) => (item.disabled = true));
        onSolved();
      }
    });
  });
  return close;
}
