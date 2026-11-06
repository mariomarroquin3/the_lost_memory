import type { GameState } from '../gameState';
import { solveRoom1Security } from '../rooms/room1Security';

const RECORDS = [
  '2097-04-17 03:12 · Operador: Kiro · Cierre manual de estación',
  '2097-04-17 03:13 · Operador: Lía · Diagnóstico interno de red',
  '2097-99-99 99:99 · Operador: ??? · Sin firma criptográfica [ANOMALÍA]',
  '2097-04-17 03:15 · Operador: Lía · Bloqueo preventivo de puertos',
  '2097-04-17 03:16 · Operador: Genesis · Protocolo de emergencia',
];

export function openRoom1Panel(state: GameState, host: HTMLElement, onSolved: () => void): () => void {
  host.hidden = false;
  host.innerHTML = `
    <section class="puzzle crt-panel" role="dialog" aria-modal="true" aria-labelledby="room1-title">
      <div class="puzzle__head">
        <h2 id="room1-title">ESTACIÓN DE SEGURIDAD // CONTROL DE ACCESO</h2>
        <button type="button" class="btn-retro" data-close>Cerrar (Esc)</button>
      </div>

      <div class="control-log">
        <span class="log-label">CANAL DE COMUNICACIÓN ABIERTO:</span>
        <p>Lía: «Sato... o Kiro... Uno de estos registros no pertenece a Genesis. El Alucinador inyectó datos residuales para bloquear la salida. Identifica y purga el registro falso.»</p>
      </div>

      <div class="records">
        ${RECORDS.map((record, index) => `
          <button type="button" class="record" data-record="${index}">
            <code>[LOG #${String(index + 1).padStart(2, '0')}]</code> ${record}
          </button>
        `).join('')}
      </div>

      <p class="puzzle__message" aria-live="polite">Selecciona el registro anómalo para recuperar el control de la compuerta.</p>
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
        button.style.borderColor = '#4cc47a';
        button.style.background = '#15291b';
        onSolved();
        window.setTimeout(close, 1200);
      } else {
        button.style.borderColor = '#ff1744';
        button.style.background = '#281116';
      }
    });
  });

  return close;
}
