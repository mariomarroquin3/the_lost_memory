import type { GameState } from '../gameState';

export function openControlPanel(state: GameState, host: HTMLElement, onClose: () => void): void {
  host.hidden = false;
  const fragmentRows = Array.from({ length: 10 }, (_, index) => `<li class="${state.fragments[index] ? 'is-found' : ''}">#${String(index + 1).padStart(2, '0')} · ${state.fragments[index] ?? 'SIN DATOS'}</li>`).join('');
  host.innerHTML = `<section class="control-overlay" role="dialog" aria-modal="true" aria-labelledby="control-title"><div class="control-overlay__head"><h2 id="control-title">PC DE CONTROL · GENESIS</h2><button type="button" data-control-close>Cerrar (Esc)</button></div><p class="control-log">PROTOCOLO DE ENTROPÍA: ${state.globalSyncPercent >= 75 ? 'SOBRESCRITURA EN CURSO' : 'MONITOREANDO RED GLOBAL'}</p><div class="control-systems"><div><span>Compute Power</span><strong>${state.computePower}%</strong></div><div><span>Alerta global</span><strong>${state.globalSyncPercent}%</strong></div><div><span>Puertas desbloqueadas</span><strong>${state.unlockedDoors.length}</strong></div></div><h3>FRAGMENTOS DE CONTEXTO</h3><ol>${fragmentRows}</ol></section>`;
  host.querySelector('[data-control-close]')?.addEventListener('click', () => {
    host.hidden = true;
    host.replaceChildren();
    onClose();
  }, { once: true });
}
