import type { GameState } from '../gameState';

export function openMapPanel(state: GameState, host: HTMLElement, onClose: () => void): void {
  host.hidden = false;
  const rooms = Array.from({ length: 10 }, (_, index) => {
    const room = index + 1;
    const found = Boolean(state.fragments[index]);
    const current = state.currentRoom === room;
    return `<div class="map-room ${current ? 'map-room--current' : ''} ${found ? 'map-room--found' : ''}"><b>#${String(room).padStart(2, '0')}</b><span>${found ? state.fragments[index] : '???'}</span></div>`;
  }).join('');
  host.innerHTML = `<section class="map-overlay" role="dialog" aria-modal="true" aria-labelledby="map-title"><div class="map-overlay__head"><h2 id="map-title">MAPA DE GENESIS</h2><button type="button" data-map-close>Cerrar (Esc)</button></div><div class="map-grid">${rooms}</div><p class="panel-hint">Naranja: ubicación actual · Verde: fragmento recuperado · Rojo: acceso pendiente</p></section>`;
  host.querySelector('[data-map-close]')?.addEventListener('click', () => {
    host.hidden = true;
    host.replaceChildren();
    onClose();
  }, { once: true });
}
