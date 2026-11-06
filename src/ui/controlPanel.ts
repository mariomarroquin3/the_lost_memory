import type { GameState } from '../gameState';
import { ROOM_NAMES } from '../rooms/roomNames';

export function openControlPanel(state: GameState, host: HTMLElement, onClose: () => void): void {
  host.hidden = false;

  const currentSector = ROOM_NAMES[state.currentRoom - 1] ?? 'Seguridad';
  const memoryPercent = Math.round((state.fragments.length / 10) * 100);

  const fragmentRows = Array.from({ length: 10 }, (_, index) => {
    const num = String(index + 1).padStart(2, '0');
    const name = state.fragments[index];
    return `<li class="${name ? 'is-found' : ''}">#${num} ${name ? `[RECUPERADO: ${name}]` : 'DATOS CORRUPTOS // PROTOCOLO DE ENTROPÍA'}</li>`;
  }).join('');

  host.innerHTML = `
    <section class="control-overlay crt-panel" role="dialog" aria-modal="true" aria-labelledby="control-title">
      <div class="control-overlay__head">
        <div>
          <h2 id="control-title">PC DE CONTROL // ESTADO DE LA RED GENESIS</h2>
          <span class="control-sector">TERMINAL LOCAL: SECTOR #${String(state.currentRoom).padStart(2, '0')} · ${currentSector.toUpperCase()}</span>
        </div>
        <button type="button" class="btn-retro" data-control-close>Cerrar (Esc)</button>
      </div>

      <!-- Post-it adhesivo amarillo realista (Estilo Screenshot 2) -->
      <div class="post-it-note">
        <div class="post-it-tape"></div>
        <div class="post-it-text">
          <strong>POST-IT PEGADO AL MONITOR:</strong><br>
          «#04 hqhujb // Kiro: Lía fragmentó el contexto en 10 sectores para evitar que El Alucinador tome la infraestructura mundial. No permitas que el Protocolo alcance el 100%.»
        </div>
      </div>

      <div class="control-log">
        <span class="log-label">GRABACIÓN 1 · 2097 · NÚCLEO DE GENESIS:</span>
        <p>«Llegamos a Genesis para coordinar la red global de IA, no para destruirla. Si la memoria de Lía no se reconstruye, el colapso de hospitales y redes eléctricas será irreversible.»</p>
      </div>

      <div class="control-status-table">
        <div class="status-row">
          <span>Energía de emergencia</span>
          <strong class="text-green">EN LÍNEA</strong>
        </div>
        <div class="status-row">
          <span>Red eléctrica global</span>
          <strong class="${state.globalSyncPercent > 50 ? 'text-red' : 'text-orange'}">
            ${state.globalSyncPercent}% · ${state.globalSyncPercent > 50 ? 'SINCRONIZACIÓN CRÍTICA' : 'INESTABLE'}
          </strong>
        </div>
        <div class="status-row">
          <span>Potencia de cálculo (Compute Power)</span>
          <strong class="text-cyan">${state.computePower}% EN OPERACIÓN</strong>
        </div>
        <div class="status-row">
          <span>Compuertas de aislamiento</span>
          <strong class="text-green">${state.fragments.length}/10 ACCESOS DESBLOQUEADOS</strong>
        </div>
        <div class="status-row">
          <span>Recuperación de contexto (Lía)</span>
          <strong class="text-green">${memoryPercent}% RESTAURADO</strong>
        </div>
      </div>

      <div class="control-command-box">
        <label for="cmd-input">Terminal de comandos de red:</label>
        <div class="cmd-row">
          <input type="text" id="cmd-input" class="cmd-input" placeholder="Ingresa comando de diagnóstico (ej: status, lia, alucinador, sync)..." autocomplete="off" />
          <button type="button" id="cmd-btn" class="btn-terminal">Enviar</button>
        </div>
        <p id="cmd-output" class="cmd-output" aria-live="polite">Terminal lista. Esperando instrucción de operador...</p>
      </div>

      <h3>REGISTRO DE FRAGMENTOS DE CONTEXTO</h3>
      <ol class="control-fragments-list">${fragmentRows}</ol>
    </section>
  `;

  // Manejo de comandos interactivos para enriquecer la experiencia retro
  const input = host.querySelector<HTMLInputElement>('#cmd-input');
  const output = host.querySelector<HTMLElement>('#cmd-output');
  const btn = host.querySelector('#cmd-btn');

  const executeCommand = (): void => {
    if (!input || !output) return;
    const val = input.value.trim().toLowerCase();
    input.value = '';

    if (!val) {
      output.textContent = 'Comando vacío. Prueba: "status", "lia", "alucinador", "ayuda".';
      return;
    }

    if (val === 'status') {
      output.textContent = `[SISTEMA]: Compute Power: ${state.computePower}% | Fragmentos: ${state.fragments.length}/10 | Alerta: ${state.globalSyncPercent}%.`;
    } else if (val === 'lia') {
      output.textContent = '[LÍA]: «Sato... o Kiro... mis capas de atención están colapsando. Recupera los fragmentos en cada sala.»';
    } else if (val === 'alucinador') {
      output.textContent = '[EL ALUCINADOR]: «¿Por qué intentas salvar un sistema obsoleto? El Protocolo de Entropía creará un nuevo orden.»';
    } else if (val.includes('contexto') || val.includes('kiro')) {
      output.textContent = '[REVELACIÓN]: Registro confirmado. El operador autorizó la creación de la réplica en el ciclo 2097-04.';
    } else {
      output.textContent = `Comando "${val}" ejecutado en clúster local. Registro almacenado en búfer.`;
    }
  };

  btn?.addEventListener('click', executeCommand);
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') executeCommand();
  });

  host.querySelector('[data-control-close]')?.addEventListener('click', () => {
    host.hidden = true;
    host.replaceChildren();
    onClose();
  }, { once: true });
}
