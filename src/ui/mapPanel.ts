import type { GameState } from '../gameState';
import { ROOM_NAMES } from '../rooms/roomNames';

export function openMapPanel(state: GameState, host: HTMLElement, onClose: () => void): void {
  host.hidden = false;

  const roomCards = Array.from({ length: 10 }, (_, index) => {
    const room = index + 1;
    const isFound = Boolean(state.fragments[index]);
    const isCurrent = state.currentRoom === room;
    const isLocked = room > state.currentRoom && !isFound;
    const roomName = ROOM_NAMES[index] ?? 'Sector Desconocido';
    const fragmentName = state.fragments[index] ?? '???';

    return `
      <div class="map-room ${isCurrent ? 'map-room--current' : ''} ${isFound ? 'map-room--found' : ''} ${isLocked ? 'map-room--locked' : ''}">
        <div class="map-room__header">
          <span class="map-room__num">#${String(room).padStart(2, '0')}</span>
          <span class="map-room__badge">${isCurrent ? 'AQUÍ' : isFound ? 'OK' : 'LOCK'}</span>
        </div>
        <strong class="map-room__name">${roomName}</strong>
        <span class="map-room__fragment">${isFound ? `[${fragmentName}]` : 'MEMORIA PERDIDA'}</span>
      </div>
    `;
  }).join('');

  host.innerHTML = `
    <section class="map-overlay" role="dialog" aria-modal="true" aria-labelledby="map-title">
      <div class="map-overlay__head">
        <div>
          <h2 id="map-title">MAPA DEL COMPLEJO GENESIS // 2097</h2>
          <p class="map-overlay__sub">ESQUEMA DE RED Y PROTOCOLO DE AISLAMIENTO</p>
        </div>
        <button type="button" class="btn-retro" data-map-close>Cerrar (Esc)</button>
      </div>

      <div class="map-grid">
        ${roomCards}
      </div>

      <div class="map-legend">
        <span class="legend-item"><i class="dot dot--orange"></i> Naranja: Estás aquí</span>
        <span class="legend-item"><i class="dot dot--green"></i> Verde: Fragmento recuperado</span>
        <span class="legend-item"><i class="dot dot--red"></i> Rojo: Acceso bloqueado</span>
      </div>
    </section>
  `;

  host.querySelector('[data-map-close]')?.addEventListener('click', () => {
    host.hidden = true;
    host.replaceChildren();
    onClose();
  }, { once: true });
}
