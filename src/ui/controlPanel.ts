import type { GameState } from '../gameState';

export function openControlPanel(state: GameState, host: HTMLElement, onClose: () => void): void {
  host.hidden = false;

  const currentWordNum = String(state.currentRoom).padStart(2, '0');

  host.innerHTML = `
    <section class="pc-control-modal" role="dialog" aria-modal="true" aria-labelledby="control-title">
      <h2 id="control-title" class="pc-title">PC DE CONTROL · ESTADO DE LA BÓVEDA</h2>

      <!-- Post-it pegado al monitor (Exacto a Imagen 3) -->
      <div class="pc-postit">
        Post-it pegado al monitor: <strong>"#04 hqhujb"</strong>.
      </div>

      <!-- Grabación / Log -->
      <div class="pc-recording">
        GRABACIÓN 1 · 2097 · "Llegamos a Genesis para entender la red global de IA, no para destruirla. Aquí desarmamos cada modelo hasta saber cómo funcionaba."
      </div>

      <!-- Tabla de diagnóstico con valores alineados a la derecha -->
      <div class="pc-diag-table">
        <div class="pc-diag-row">
          <span class="pc-diag-label">Energía de emergencia</span>
          <span class="pc-diag-val pc-val-green">EN LÍNEA</span>
        </div>
        <div class="pc-diag-row">
          <span class="pc-diag-label">Red eléctrica</span>
          <span class="pc-diag-val pc-val-dim">${state.globalSyncPercent > 50 ? '6/10' : '3/10'} · SIN ENERGÍA</span>
        </div>
        <div class="pc-diag-row">
          <span class="pc-diag-label">Clústeres de IA</span>
          <span class="pc-diag-val pc-val-dim">${state.fragments.length}/10 · EN LÍNEA</span>
        </div>
        <div class="pc-diag-row">
          <span class="pc-diag-label">Puertas de seguridad</span>
          <span class="pc-diag-val pc-val-dim">${state.fragments.length}/10 · SIN ENERGÍA</span>
        </div>
        <div class="pc-diag-row">
          <span class="pc-diag-label">Puerta de salida</span>
          <span class="pc-diag-val pc-val-dim">${state.fragments.length >= 10 ? '1/1 · EN LÍNEA' : '0/1 · SIN ENERGÍA'}</span>
        </div>
      </div>

      <!-- Caja de ingreso de palabra / comando (Exacto a Imagen 3) -->
      <div class="pc-input-row">
        <span class="pc-input-label">Palabra #${currentWordNum}</span>
        <div class="pc-input-wrapper">
          <input type="text" id="vault-word-input" class="pc-input-field" autocomplete="off" spellcheck="false" />
        </div>
        <button type="button" id="vault-word-btn" class="pc-btn-submit">Enviar</button>
      </div>

      <p id="pc-status-msg" class="pc-status-msg" aria-live="polite"></p>

      <!-- Botón Cerrar (Esc) abajo a la izquierda -->
      <div class="pc-footer">
        <button type="button" class="btn-green-outline" data-control-close>Cerrar (Esc)</button>
      </div>
    </section>
  `;

  const input = host.querySelector<HTMLInputElement>('#vault-word-input');
  const msg = host.querySelector<HTMLElement>('#pc-status-msg');
  const btn = host.querySelector('#vault-word-btn');

  const checkInput = (): void => {
    if (!input || !msg) return;
    const val = input.value.trim().toLowerCase();
    input.value = '';

    if (!val) {
      msg.textContent = 'Introduce un comando o palabra de fragmento.';
      return;
    }

    if (val === 'status' || val === 'estado') {
      msg.textContent = `[SISTEMA]: Compute Power ${state.computePower}% | Fragmentos ${state.fragments.length}/10.`;
    } else if (val === 'lia') {
      msg.textContent = '[LÍA]: «Sato... el Protocolo de Entropía avanza. Encuentra los 10 fragmentos.»';
    } else if (val === 'contexto' || val === 'kiro') {
      msg.textContent = '[ACCESO CONCEDIDO]: Registro K-2097 verificado.';
    } else {
      msg.textContent = `Código "${val}" procesado en el nodo central de Genesis.`;
    }
  };

  btn?.addEventListener('click', checkInput);
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') checkInput();
  });

  host.querySelector('[data-control-close]')?.addEventListener('click', () => {
    host.hidden = true;
    host.replaceChildren();
    onClose();
  }, { once: true });
}
